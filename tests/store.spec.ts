import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { DrawCommand } from '../core/commands.ts'
import { BoardStore } from '../host/store.ts'

/** 一条最小直线命令。 */
function line(fromX: number): DrawCommand {
  return { op: 'line', from: { x: fromX, y: 0 }, to: { x: fromX + 10, y: 10 }, color: '#000000', width: 1 }
}

/** 造一个只有本次测试用的磁盘目录。 */
async function withStore(run: (store: BoardStore, dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'blackboard-store-'))
  const store = new BoardStore(dir)
  try {
    await run(store, dir)
  } finally {
    await store.dispose()
    await rm(dir, { recursive: true, force: true })
  }
}

test('append 折入命令并返回本次的 ops 与 revision', async () => {
  await withStore(async (store, dir) => {
    const sessionId = 'session-a' as SessionId
    const delta = await store.append(sessionId, [line(0)])

    assert.equal(delta.revision, 1)
    assert.deepEqual(delta.ops.map((op) => (op.op === 'add' ? op.element.id : op.op)), ['e0'])
    assert.deepEqual((await store.scene(sessionId)).elements.map((element) => element.id), ['e0'])
    assert.deepEqual((await store.read(sessionId, 0)).ops, delta.ops)
    assert.deepEqual((await store.read(sessionId, 1)).ops, [])
    assert.equal(readFileSync(join(dir, 'session-a.jsonl'), 'utf8').trim().split('\n').length, 1)
  })
})

test('并发 append 不会撞 id，两条都落盘', async () => {
  await withStore(async (store, dir) => {
    const sessionId = 'session-race' as SessionId
    const [first, second] = await Promise.all([
      store.append(sessionId, [line(0)]),
      store.append(sessionId, [line(20)]),
    ])
    const ids = [...first.ops, ...second.ops].flatMap((op) => (op.op === 'add' ? [op.element.id] : []))

    assert.deepEqual(ids.toSorted(), ['e0', 'e1'])
    assert.deepEqual((await store.scene(sessionId)).elements.map((element) => element.id).toSorted(), ['e0', 'e1'])
    assert.equal(readFileSync(join(dir, 'session-race.jsonl'), 'utf8').trim().split('\n').length, 2)
  })
})

test('冷会话从磁盘重放 ops，nextId 跟着元素走', async () => {
  await withStore(async (store, dir) => {
    const sessionId = 'session-cold' as SessionId
    await store.append(sessionId, [line(0), line(20), line(40)])
    await store.dispose()

    const reopened = new BoardStore(dir)
    const delta = await reopened.read(sessionId, 0)
    const scene = await reopened.scene(sessionId)
    const next = await reopened.append(sessionId, [line(60)])

    assert.equal(delta.revision, 3)
    assert.deepEqual(scene.elements.map((element) => element.id), ['e0', 'e1', 'e2'])
    assert.deepEqual(next.ops.map((op) => (op.op === 'add' ? op.element.id : op.op)), ['e3'])
  })
})

test('空命令批次不写磁盘也不推进 revision', async () => {
  await withStore(async (store) => {
    const sessionId = 'session-empty' as SessionId
    await store.append(sessionId, [line(0)])

    assert.deepEqual(await store.append(sessionId, []), { revision: 1, ops: [] })
  })
})
