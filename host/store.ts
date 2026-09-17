import { readFileSync } from 'node:fs'
import { appendFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { DrawCommand } from '../core/commands.ts'
import { createScene } from '../core/scene.ts'
import type { Scene } from '../core/scene.ts'
import { applyOps, opsFromCommands } from '../shared/ops.ts'
import type { SceneOp } from '../shared/ops.ts'
import type { BoardDelta } from '../shared/protocol.ts'

/** 一个会话的画板：ops 流与折叠出的场景。 */
interface Board {
  readonly ops: SceneOp[]
  /** 每次 append 之后重新折叠，工具结果要用元素数。 */
  scene: Scene
}

/**
 * 每会话的 ops 流 + 折叠后的场景。进程内缓存，磁盘 append-only JSONL 持久化。
 *
 * 画板数据不进 session log：仓库外插件的事件类型不在 dsh 的已知事件表里，未知事件写不进去
 * （除非标 `ignorable`）。所以这份 JSONL 就是画板的唯一真相。
 */
export class BoardStore {
  private readonly dataDir: string
  private readonly boards = new Map<string, Board>()
  /**
   * 串行队列。整个"读场景 → 分配 id → 落盘 → 改内存"都在里面：人和 agent 会同时画同一块板子，
   * 只串行落盘的话两次 append 会从同一个 `nextId` 分配出同一个 id。
   */
  private queue: Promise<void> = Promise.resolve()

  /**
   * @param dataDir - ops 文件目录，不存在时在第一次写入前创建。
   */
  constructor(dataDir: string) {
    this.dataDir = dataDir
  }

  /**
   * 读 `since`（含）之后的 ops 与当前 revision；冷会话在这里从磁盘重放一次。
   * @param sessionId - 目标会话。
   * @param since - 已经拿到的 op 数，作为增量游标。
   * @returns 本次要补的 ops 与流的总长。
   */
  async read(sessionId: SessionId, since: number): Promise<BoardDelta> {
    return deltaOf(this.board(sessionId), since)
  }

  /**
   * 折入一批命令并追加；id 由这里唯一分配。
   * @param sessionId - 目标会话。
   * @param commands - 人和 agent 提交的绘图命令。
   * @returns 本次追加的 ops 与追加后的流长。
   */
  async append(sessionId: SessionId, commands: readonly DrawCommand[]): Promise<BoardDelta> {
    const board = this.board(sessionId)
    const run = this.queue.then(async (): Promise<BoardDelta> => {
      const { ops, scene } = opsFromCommands(board.scene, commands)
      if (ops.length > 0) {
        // 先落盘再改内存：写失败时内存态不会跑在磁盘前面。
        await mkdir(this.dataDir, { recursive: true })
        await appendFile(this.file(sessionId), ops.map((op) => `${JSON.stringify(op)}\n`).join(''), 'utf8')
        board.scene = scene
        board.ops.push(...ops)
      }
      return deltaOf(board, board.ops.length - ops.length)
    })
    // 队列本身不携带失败（否则一次写失败会让后续 append 一起 reject），当前调用方仍然拿到它。
    this.queue = run.then(() => undefined, () => undefined)
    return await run
  }

  /**
   * 把当前场景折叠出来。
   * @param sessionId - 目标会话。
   * @returns 该会话的场景，`isDeleted` 的元素还在里面。
   */
  async scene(sessionId: SessionId): Promise<Scene> {
    return this.board(sessionId).scene
  }

  /**
   * 等在途的写入结束。
   * @returns 队列排空后 resolve。
   */
  async dispose(): Promise<void> {
    await this.queue
  }

  /**
   * 取会话的画板，第一次访问时同步读一遍磁盘。
   * @param sessionId - 目标会话。
   * @returns 该会话的画板，之后一直复用同一个对象。
   */
  private board(sessionId: SessionId): Board {
    const cached = this.boards.get(sessionId)
    if (cached !== undefined) return cached
    const ops = readOps(this.file(sessionId))
    const created: Board = { ops, scene: applyOps(createScene(), ops) }
    this.boards.set(sessionId, created)
    return created
  }

  /**
   * ops 文件名；sessionId 只可能来自会话 id，但仍然只保留文件名字符。
   * @param sessionId - 目标会话。
   * @returns 该会话的 JSONL 绝对路径。
   */
  private file(sessionId: SessionId): string {
    return join(this.dataDir, `${sessionId.replace(/[^A-Za-z0-9._-]/g, '_')}.jsonl`)
  }
}

/**
 * 切出 `since` 之后的 ops。
 * @param board - 目标画板。
 * @param since - 已经拿到的 op 数；超出流长时按流长处理。
 * @returns 本次要补的 ops 与流的总长。
 */
function deltaOf(board: Board, since: number): BoardDelta {
  const start = Math.max(0, Math.min(since, board.ops.length))
  return { revision: board.ops.length, ops: board.ops.slice(start) }
}

/**
 * 读一个会话的 JSONL。
 * @param file - ops 文件路径。
 * @returns 按写入顺序的 ops；文件还不存在时是空流。
 */
function readOps(file: string): SceneOp[] {
  let text: string
  try {
    text = readFileSync(file, 'utf8')
  } catch (error) {
    // 只有"这个会话还没有画过"是可以接受的读失败，其余（权限、损坏的目录项）必须冒出来。
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
  const lines = text.split('\n')
  // 最后一个换行会在末尾留一个空串。
  if (lines[lines.length - 1] === '') lines.pop()

  const ops: SceneOp[] = []
  for (const [index, line] of lines.entries()) {
    if (line === '') continue
    try {
      ops.push(JSON.parse(line) as SceneOp)
    } catch (error) {
      // append-only 只可能被"写到一半就死了"弄坏最后一行。丢掉它，前面的照常读；
      // 中间的行坏了说明文件不是我们写的，必须冒出来。
      if (index === lines.length - 1) break
      throw error
    }
  }
  return ops
}
