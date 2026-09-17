import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createSceneSource } from '../client/source.ts'
import type { SceneSource } from '../client/source.ts'
import type { DrawCommand } from '../core/commands.ts'
import type { Element } from '../core/elements.ts'
import type { BoardDelta } from '../shared/protocol.ts'

/** 一条最小直线命令；测试里只用它当 append 的输入。 */
const LINE: DrawCommand = { op: 'line', from: { x: 0, y: 0 }, to: { x: 1, y: 1 }, color: '#000000', width: 1 }

/** 一个最小元素，只用来观察场景里的 id。 */
function add(id: string): Element {
  return {
    id,
    type: 'rect',
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    strokeColor: '#000000',
    strokeWidth: 1,
    isDeleted: false,
  }
}

/** 把若干个 `add` 折成一份 delta 的 ops。 */
function adds(...ids: readonly string[]): BoardDelta['ops'] {
  return ids.map((id) => ({ op: 'add', element: add(id) }))
}

/** 等已经 resolve 的 Promise 链跑完。setImmediate 不是定时器，只是让出事件循环。 */
function settle(): Promise<void> {
  return new Promise((resolve) => { setImmediate(resolve) })
}

/** 场景里还没被软删除的元素 id。 */
function idsOf(source: SceneSource): string[] {
  return source.getSnapshot().elements.filter((element) => !element.isDeleted).map((element) => element.id)
}

/** 手动完成的 load / append 队列，用来精确控制两份响应的到达顺序。 */
interface Harness {
  readonly source: SceneSource
  readonly loads: ((delta: BoardDelta) => void)[]
  readonly appends: ((delta: BoardDelta) => void)[]
}

/**
 * 建一个 load / append 都由测试手动完成的源。没有真定时器：轮询间隔取到测试跑不完，
 * 只有订阅时那一拍（以及缺口触发的重拉）会被用到。
 * @returns 源与两个待完成队列。
 */
function createHarness(): Harness {
  const loads: ((delta: BoardDelta) => void)[] = []
  const appends: ((delta: BoardDelta) => void)[] = []
  const source = createSceneSource({
    load: () => new Promise<BoardDelta>((resolve) => { loads.push(resolve) }),
    append: () => new Promise<BoardDelta>((resolve) => { appends.push(resolve) }),
    pollMs: 60_000,
  })
  return { source, loads, appends }
}

test('两拍增量按 revision 拼进场景', async () => {
  const harness = createHarness()
  const stop = harness.source.subscribe(() => undefined)
  try {
    harness.loads[0]?.({ revision: 2, ops: adds('e0', 'e1') })
    await settle()
    assert.deepEqual(idsOf(harness.source), ['e0', 'e1'])

    const sent = harness.source.send([LINE])
    // send 串行化在一条队列上，append 要等一个微任务才被调用。
    await settle()
    harness.appends[0]?.({ revision: 3, ops: adds('e2') })

    assert.deepEqual(await sent, ['e2'])
    assert.deepEqual(idsOf(harness.source), ['e0', 'e1', 'e2'])
  } finally {
    stop()
  }
})

test('append 的响应抢在首拍之前到达时按缺口重置，并立刻整份重拉', async () => {
  const harness = createHarness()
  const stop = harness.source.subscribe(() => undefined)
  try {
    // 首拍还在路上（host 上已经有 5 条 op），人就画了一笔，于是 append 的响应先到。
    const sent = harness.source.send([LINE])
    await settle()
    harness.appends[0]?.({ revision: 6, ops: adds('e5') })
    await settle()

    // 有缺口：源清空并立刻再拉一次，而不是把缺口留在身后。
    assert.equal(harness.loads.length, 2)
    assert.deepEqual(idsOf(harness.source), [])

    harness.loads[1]?.({ revision: 6, ops: adds('e0', 'e1', 'e2', 'e3', 'e4', 'e5') })
    await settle()

    assert.deepEqual(await sent, ['e5'])
    assert.deepEqual(idsOf(harness.source), ['e0', 'e1', 'e2', 'e3', 'e4', 'e5'])
  } finally {
    stop()
  }
})

test('落后或重叠的 delta 被忽略，场景引用不变', async () => {
  const harness = createHarness()
  const stop = harness.source.subscribe(() => undefined)
  try {
    harness.loads[0]?.({ revision: 3, ops: adds('e0', 'e1', 'e2') })
    await settle()
    const before = harness.source.getSnapshot()

    // revision 已经到 3：更旧的一份整份丢掉，同序号的重复也不会被画第二遍。
    const sent = harness.source.send([LINE])
    await settle()
    harness.appends[0]?.({ revision: 3, ops: adds('e9') })

    await sent
    assert.equal(harness.source.getSnapshot(), before)
    assert.deepEqual(idsOf(harness.source), ['e0', 'e1', 'e2'])
  } finally {
    stop()
  }
})
