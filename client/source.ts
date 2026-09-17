import type { DrawCommand } from '../core/commands.ts'
import { createScene } from '../core/scene.ts'
import type { Scene } from '../core/scene.ts'
import { applyOps } from '../shared/ops.ts'
import type { BoardDelta } from '../shared/protocol.ts'

/** 一个可观察值；框架把它绑成 `use<Name>`。 */
export interface ObservableValue<T> {
  /**
   * 当前值。
   * @returns 值没变时返回同一个引用。
   */
  getSnapshot(): T
  /**
   * 订阅变化。
   * @param listener - 值变化时调用。
   * @returns 退订。
   */
  subscribe(listener: () => void): () => void
}

/** 面板用的可观察场景源。 */
export interface SceneSource extends ObservableValue<Scene> {
  /** 该不该出图；非 null 时就是这次快照请求的 id。 */
  readonly snapshotRequest: ObservableValue<string | null>
  /**
   * 追加一批命令。
   * @param commands - 命令。
   * @returns 本次新增的元素 id。
   */
  send(commands: readonly DrawCommand[]): Promise<readonly string[]>
}

/** {@link createSceneSource} 的入参。 */
export interface SceneSourceOptions {
  /** 读 `since` 之后的 ops。 */
  readonly load: (since: number) => Promise<BoardDelta>
  /** 追加命令，返回 host 分配好 id 的 ops。 */
  readonly append: (commands: readonly DrawCommand[]) => Promise<BoardDelta>
  /** 轮询间隔，毫秒。 */
  readonly pollMs: number
}

/**
 * 建一个按 revision 增量拉取的场景源。
 *
 * 这里不做乐观追加：id 由 host 唯一分配，本地先画一笔再回滚 id 只会引入第二条真相。
 * 本机回环的往返延迟远小于人的手感阈值。
 *
 * 除了场景，源还带一个 {@link createSceneSource.snapshotRequest}：host 侧的工具要一张画板
 * 快照时会把它挂到场景响应上，面板看到非 null 就出图交回去（host 没有 canvas，图只能面板出）。
 * @param options - 读/追加实现与轮询间隔。
 * @returns 可观察源。
 */
export function createSceneSource(options: SceneSourceOptions): SceneSource & {
  /** 该不该出图；非 null 时就是这次快照请求的 id。 */
  readonly snapshotRequest: ObservableValue<string | null>
} {
  let scene = createScene()
  let revision = 0
  let snapshotRequest: string | null = null
  let timer: ReturnType<typeof setInterval> | undefined
  /** 串行化 append：两份 append 响应乱序到达时，后到的那份会让 revision 倒退。 */
  let sending: Promise<unknown> = Promise.resolve()
  const listeners = new Set<() => void>()

  const notify = (): void => {
    for (const listener of listeners) listener()
  }

  /**
   * 折入一份 delta。轮询与 append 的响应可能同时到，所以要分清三种情形：落后的丢掉、
   * 有重叠的只取没见过的部分、**有缺口的整份重来**。
   *
   * 快照请求与 ops 无关：即使这一份 delta 没有新 op，它也可能带来（或撤掉）一次出图请求。
   */
  const applyDelta = (delta: BoardDelta): void => {
    const want = delta.snapshotRequest ?? null
    const wantMoved = want !== snapshotRequest
    snapshotRequest = want
    if (delta.revision <= revision) {
      if (wantMoved) notify()
      return
    }
    const start = delta.revision - delta.ops.length
    if (start > revision) {
      // 缺口一旦出现，本地就没有可增量拼接的前提了；直接跳到 delta.revision 会把缺口永久留在身后。
      revision = 0
      scene = createScene()
      void poll()
      return
    }
    scene = applyOps(scene, delta.ops.slice(revision - start))
    revision = delta.revision
    notify()
  }

  const poll = async (): Promise<void> => {
    // host 重启或会话消失都只该让这一拍失败：下一拍会重试，面板不该炸。
    await options.load(revision).then(applyDelta, () => undefined)
  }

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener)
    if (timer === undefined) {
      void poll()
      timer = setInterval(() => { void poll() }, options.pollMs)
    }
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0 && timer !== undefined) {
        clearInterval(timer)
        timer = undefined
      }
    }
  }

  return {
    getSnapshot: () => scene,
    subscribe,
    snapshotRequest: { getSnapshot: () => snapshotRequest, subscribe },
    send: (commands) => {
      const run = sending.then(async (): Promise<readonly string[]> => {
        const delta = await options.append(commands)
        applyDelta(delta)
        return delta.ops.flatMap((op) => (op.op === 'add' ? [op.element.id] : []))
      })
      // 队列本身不携带失败（否则一次失败会让后续 append 一起 reject），当前调用方仍然拿到它。
      sending = run.then(() => undefined, () => undefined)
      return run
    },
  }
}
