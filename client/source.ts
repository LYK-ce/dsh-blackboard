import type { DrawCommand } from '../core/commands.ts'
import { createScene } from '../core/scene.ts'
import type { Scene } from '../core/scene.ts'
import { applyOps } from '../shared/ops.ts'
import type { BoardDelta } from '../shared/protocol.ts'

/** 面板用的可观察场景源。 */
export interface SceneSource {
  /**
   * 当前场景。
   * @returns 场景没动时返回同一个对象引用。
   */
  getSnapshot(): Scene
  /**
   * 订阅变化；第一个订阅者启动轮询，最后一个走了就停。
   * @param listener - 场景变化时调用。
   * @returns 退订。
   */
  subscribe(listener: () => void): () => void
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
 * @param options - 读/追加实现与轮询间隔。
 * @returns 可观察源。
 */
export function createSceneSource(options: SceneSourceOptions): SceneSource {
  let scene = createScene()
  let revision = 0
  let timer: ReturnType<typeof setInterval> | undefined
  /** 串行化 append：两份 append 响应乱序到达时，后到的那份会让 revision 倒退。 */
  let sending: Promise<unknown> = Promise.resolve()
  const listeners = new Set<() => void>()

  /**
   * 折入一份 delta。轮询与 append 的响应可能同时到，所以要分清三种情形：落后的丢掉、
   * 有重叠的只取没见过的部分、**有缺口的整份重来**。
   */
  const applyDelta = (delta: BoardDelta): void => {
    if (delta.revision <= revision) return
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
    for (const listener of listeners) listener()
  }

  const poll = async (): Promise<void> => {
    // host 重启或会话消失都只该让这一拍失败：下一拍会重试，面板不该炸。
    await options.load(revision).then(applyDelta, () => undefined)
  }

  return {
    getSnapshot: () => scene,
    subscribe: (listener) => {
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
    },
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
