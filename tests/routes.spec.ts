import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { handleAppend, handleScene } from '../host/routes.ts'
import { BoardStore } from '../host/store.ts'

/** 一条最小直线命令。 */
const LINE = { op: 'line', from: { x: 0, y: 0 }, to: { x: 10, y: 10 }, color: '#000000', width: 2 } as const

/**
 * 造一个只有本次测试用的画板存储。
 * @param run - 收到存储与其磁盘目录的测试体。
 * @returns 测试体跑完后清理磁盘。
 */
async function withStore(run: (store: BoardStore) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'blackboard-routes-'))
  const store = new BoardStore(dir)
  try {
    await run(store)
  } finally {
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
    ...(body === undefined ? {} : { body, headers: { 'content-type': 'application/json' } }),
  })
}

test('GET 场景：空会话返回空 ops 与 revision 0', async () => {
  await withStore(async (store) => {
    const response = await handleScene(store, request('/api/blackboard.scene?sessionId=s1&since=0'))
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { revision: 0, ops: [] })
  })
})

test('GET 场景：缺 sessionId 或 since 非法时 400', async () => {
  await withStore(async (store) => {
    assert.equal((await handleScene(store, request('/api/blackboard.scene'))).status, 400)
    assert.equal((await handleScene(store, request('/api/blackboard.scene?sessionId='))).status, 400)
    assert.equal((await handleScene(store, request('/api/blackboard.scene?sessionId=s&since=-1'))).status, 400)
    assert.equal((await handleScene(store, request('/api/blackboard.scene?sessionId=s&since=abc'))).status, 400)
  })
})

test('POST 追加：返回本次 ops，随后的 GET 增量读到它', async () => {
  await withStore(async (store) => {
    const appended = await handleAppend(store, request(
      '/api/blackboard.ops?sessionId=s2',
      JSON.stringify({ commands: [LINE] }),
      'POST',
    ))
    assert.equal(appended.status, 200)
    const delta = await appended.json() as { revision: number; ops: { op: string }[] }
    assert.equal(delta.revision, 1)
    assert.equal(delta.ops[0]?.op, 'add')

    const scene = await handleScene(store, request('/api/blackboard.scene?sessionId=s2&since=0'))
    assert.deepEqual(await scene.json(), delta)
    // 已经拿到的增量不会再发第二遍。
    const nothing = await handleScene(store, request('/api/blackboard.scene?sessionId=s2&since=1'))
    assert.deepEqual(await nothing.json(), { revision: 1, ops: [] })
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
    const id = added.ops[0]?.element?.id
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
