import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { handleAppend, handleScene, handleSnapshot } from '../host/routes.ts'
import { SnapshotRequests } from '../host/snapshots.ts'
import { BoardStore } from '../host/store.ts'

/** 一条最小直线命令。 */
const LINE = { op: 'line', from: { x: 0, y: 0 }, to: { x: 10, y: 10 }, color: '#000000', width: 2 } as const

/**
 * 造一个只有本次测试用的画板存储与快照账本。
 * @param run - 收到存储与账本的测试体。
 * @returns 测试体跑完后清理磁盘与等待中的请求。
 */
async function withStore(run: (store: BoardStore, snapshots: SnapshotRequests) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'blackboard-routes-'))
  const store = new BoardStore(dir)
  const snapshots = new SnapshotRequests()
  try {
    await run(store, snapshots)
  } finally {
    snapshots.dispose()
    await store.dispose()
    await rm(dir, { recursive: true, force: true })
  }
}

/**
 * 造一个指向画板路由的请求。
 * @param path - 含查询串的绝对路径。
 * @param body - POST 的请求体，未传时不带体。
 * @param method - HTTP 方法。
 * @returns 该请求。
 */
function request(path: string, body?: string, method = 'GET'): Request {
  return new Request(`http://127.0.0.1${path}`, {
    method,
    ...(body === undefined ? {} : { body }),
  })
}

test('GET 场景：空会话返回空 ops 与 revision 0', async () => {
  await withStore(async (store, snapshots) => {
    const response = await handleScene(store, snapshots, request('/api/blackboard.scene?sessionId=s1&since=0'))
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { revision: 0, ops: [], snapshotRequest: null })
  })
})

test('GET 场景：缺 sessionId 或 since 非法时 400', async () => {
  await withStore(async (store, snapshots) => {
    assert.equal((await handleScene(store, snapshots, request('/api/blackboard.scene'))).status, 400)
    assert.equal((await handleScene(store, snapshots, request('/api/blackboard.scene?sessionId='))).status, 400)
    assert.equal((await handleScene(store, snapshots, request('/api/blackboard.scene?sessionId=s&since=-1'))).status, 400)
    assert.equal((await handleScene(store, snapshots, request('/api/blackboard.scene?sessionId=s&since=abc'))).status, 400)
  })
})

test('POST 追加：返回本次 ops，随后的 GET 增量读到它', async () => {
  await withStore(async (store, snapshots) => {
    const appended = await handleAppend(store, request(
      '/api/blackboard.ops?sessionId=s2',
      JSON.stringify({ commands: [LINE] }),
      'POST',
    ))
    assert.equal(appended.status, 200)
    const delta = await appended.json() as { revision: number; ops: { op: string }[] }
    assert.equal(delta.revision, 1)
    assert.equal(delta.ops[0]?.op, 'add')

    // 场景响应比追加响应多一个 snapshotRequest 字段。
    const scene = await handleScene(store, snapshots, request('/api/blackboard.scene?sessionId=s2&since=0'))
    assert.deepEqual(await scene.json(), { ...delta, snapshotRequest: null })
    // 已经拿到的增量不会再发第二遍。
    const nothing = await handleScene(store, snapshots, request('/api/blackboard.scene?sessionId=s2&since=1'))
    assert.deepEqual(await nothing.json(), { revision: 1, ops: [], snapshotRequest: null })
  })
})

test('POST 追加：缺 sessionId、体不是 JSON、commands 缺失或命令非法时 400', async () => {
  await withStore(async (store) => {
    const cases: readonly (readonly [string, string | undefined])[] = [
      ['/api/blackboard.ops', JSON.stringify({ commands: [] })],
      ['/api/blackboard.ops?sessionId=', JSON.stringify({ commands: [] })],
      ['/api/blackboard.ops?sessionId=s', 'not json'],
      ['/api/blackboard.ops?sessionId=s', JSON.stringify({})],
      ['/api/blackboard.ops?sessionId=s', JSON.stringify({ commands: 'nope' })],
      ['/api/blackboard.ops?sessionId=s', JSON.stringify({ commands: [null] })],
      ['/api/blackboard.ops?sessionId=s', JSON.stringify({ commands: [{ op: 'nope' }] })],
      // width 必须是有限数：字符串会被 Response.json 序列化成 null 永久写进 JSONL。
      ['/api/blackboard.ops?sessionId=s', JSON.stringify({ commands: [{ ...LINE, width: '2' }] })],
      ['/api/blackboard.ops?sessionId=s', JSON.stringify({ commands: [{ ...LINE, from: { x: 0 } }] })],
    ]
    for (const [path, body] of cases) {
      const response = await handleAppend(store, request(path, body, 'POST'))
      assert.equal(response.status, 400, `${path} ${String(body)}`)
    }
    // 被拒的请求一条都没写进画板。
    assert.deepEqual(await store.read('s' as SessionId, 0), { revision: 0, ops: [] })
  })
})

test('POST 追加：erase 与 clear 也走同一条 wire 校验', async () => {
  await withStore(async (store) => {
    const first = await handleAppend(store, request(
      '/api/blackboard.ops?sessionId=s3',
      JSON.stringify({ commands: [{ op: 'rect', at: { x: 0, y: 0 }, size: { x: 5, y: 5 }, color: '#ff0000', width: 2 }] }),
      'POST',
    ))
    const added = await first.json() as { ops: { op: string; element?: { id: string } }[] }
    const id = added.ops?.[0]?.element?.id
    assert.ok(id !== undefined)

    const erased = await handleAppend(store, request(
      '/api/blackboard.ops?sessionId=s3',
      JSON.stringify({ commands: [{ op: 'erase', ids: [id] }] }),
      'POST',
    ))
    assert.equal(erased.status, 200)
    const scene = await store.scene('s3' as SessionId)
    assert.equal(scene.elements[0]?.isDeleted, true)
  })
})

test('快照：等待期间场景带着请求 id，交付后清空', async () => {
  await withStore(async (store, snapshots) => {
    const pending = snapshots.request('s4', 5_000)
    const wanted = await handleScene(store, snapshots, request('/api/blackboard.scene?sessionId=s4&since=0'))
    const { snapshotRequest: requestId } = await wanted.json() as { snapshotRequest: string | null }
    assert.ok(requestId !== null)

    const delivered = await handleSnapshot(snapshots, request(
      `/api/blackboard.snapshot?sessionId=s4&requestId=${requestId}`,
      'png-bytes',
      'POST',
    ))
    assert.equal(delivered.status, 200)
    assert.equal(Buffer.from(await pending).toString(), 'png-bytes')

    const after = await handleScene(store, snapshots, request('/api/blackboard.scene?sessionId=s4&since=0'))
    assert.equal((await after.json() as { snapshotRequest: string | null }).snapshotRequest, null)
  })
})

test('快照：参数不全或空体 400，请求 id 对不上 409', async () => {
  await withStore(async (_store, snapshots) => {
    const cases: readonly (readonly [string, string | undefined])[] = [
      ['/api/blackboard.snapshot', 'png'],
      ['/api/blackboard.snapshot?sessionId=s', 'png'],
      ['/api/blackboard.snapshot?sessionId=s&requestId=', 'png'],
      ['/api/blackboard.snapshot?sessionId=s&requestId=r', undefined],
      ['/api/blackboard.snapshot?sessionId=s&requestId=r', 'png'],
    ]
    const expected = [400, 400, 400, 400, 409]
    for (const [index, [path, body]] of cases.entries()) {
      const response = await handleSnapshot(snapshots, request(path, body, 'POST'))
      assert.equal(response.status, expected[index], `${path} ${String(body)}`)
    }
  })
})

test('快照账本：超时报错，后一次请求挤掉前一次', async () => {
  const snapshots = new SnapshotRequests()
  try {
    await assert.rejects(snapshots.request('s', 5), /no board panel answered/)

    const first = snapshots.request('s', 1_000)
    const second = snapshots.request('s', 1_000)
    await assert.rejects(first, /newer snapshot request replaced this one/)

    assert.equal(snapshots.deliver('s', 'nope', new Uint8Array([1])), false)
    const id = snapshots.outstanding('s')
    assert.ok(id !== null)
    assert.equal(snapshots.deliver('s', id, new Uint8Array([1, 2])), true)
    assert.deepEqual([...await second], [1, 2])
    assert.equal(snapshots.outstanding('s'), null)
  } finally {
    snapshots.dispose()
  }
})
