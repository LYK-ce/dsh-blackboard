import assert from 'node:assert/strict'
import { test } from 'node:test'
import { OPS_PATH, SCENE_PATH } from '../shared/protocol.ts'
import type { BoardDelta } from '../shared/protocol.ts'

/** @deepseek-ai/dsh-client-connection 的 rpc-host 接受的路径段字符集。 */
const SEGMENT = /^\/api\/[A-Za-z0-9_$.-]+$/

test('两条路由都落在 /api 下且段名合法', () => {
  assert.equal(SCENE_PATH, '/api/blackboard.scene')
  assert.equal(OPS_PATH, '/api/blackboard.ops')
  assert.match(SCENE_PATH, SEGMENT)
  assert.match(OPS_PATH, SEGMENT)
  assert.notEqual(SCENE_PATH, OPS_PATH)
})

test('BoardDelta 的 revision 是流的总长，ops 的序号由它倒推', () => {
  const delta: BoardDelta = { revision: 5, ops: [{ op: 'clear' }, { op: 'patch', id: 'e0', isDeleted: true }] }
  const sequences = delta.ops.map((_, index) => delta.revision - delta.ops.length + index)

  assert.deepEqual(sequences, [3, 4])
  assert.deepEqual({ revision: 0, ops: [] }, { revision: 0, ops: [] })
})
