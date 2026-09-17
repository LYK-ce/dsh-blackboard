import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { DrawCommand } from '../core/commands.ts'
import { applyCommands, createScene } from '../core/scene.ts'
import type { Scene } from '../core/scene.ts'
import { applyOps, nextIdAfter, opsFromCommands } from '../shared/ops.ts'
import type { SceneOp } from '../shared/ops.ts'

/** 一条最小直线命令。 */
function line(fromX: number): DrawCommand {
  return { op: 'line', from: { x: fromX, y: 0 }, to: { x: fromX + 10, y: 10 }, color: '#000000', width: 1 }
}

test('opsFromCommands 用 scene.nextId 分配 id 并产出 add', () => {
  const { ops, scene } = opsFromCommands(createScene(), [line(0), line(20)])

  assert.deepEqual(ops.map((op) => (op.op === 'add' ? op.element.id : op.op)), ['e0', 'e1'])
  assert.deepEqual(ops, scene.elements.map((element): SceneOp => ({ op: 'add', element })))
  assert.equal(scene.nextId, 2)
})

test('opsFromCommands 把 erase 折成 patch、clear 折成 clear', () => {
  const drawn = applyCommands(createScene(), [line(0), line(20)])
  const erased = opsFromCommands(drawn, [{ op: 'erase', ids: ['e1'] }, { op: 'clear' }])

  assert.deepEqual(erased.ops, [
    { op: 'patch', id: 'e1', isDeleted: true },
    { op: 'clear' },
  ])
  assert.deepEqual(erased.scene.elements, [])
})

test('applyOps 重放出的场景与 applyCommands 折叠出的场景深度相等', () => {
  const commands: DrawCommand[] = [line(0), line(20), { op: 'erase', ids: ['e0'] }, line(40), { op: 'clear' }, line(60)]
  const { ops, scene } = opsFromCommands(createScene(), commands)

  assert.deepEqual(applyOps(createScene(), ops), scene)
  assert.equal(scene.elements.at(-1)?.id, 'e3')
})

test('add 之后 nextId 前进，且不认识 id 形状时不动', () => {
  const { ops } = opsFromCommands(createScene(), [line(0)])
  const scene = applyOps(createScene(), ops)
  const element = scene.elements[0]

  assert.ok(element !== undefined)
  assert.equal(scene.nextId, 1)
  assert.equal(nextIdAfter(scene.nextId, 'e7'), 8)
  assert.equal(nextIdAfter(scene.nextId, 'nope'), scene.nextId)
})

test('clear 清空元素但不回收 id', () => {
  const { ops } = opsFromCommands(createScene(), [line(0), line(20)])
  const cleared = applyOps(applyOps(createScene(), ops), [{ op: 'clear' }])
  const after = applyOps(cleared, opsFromCommands(cleared, [line(40)]).ops)

  assert.deepEqual(cleared.elements, [])
  assert.equal(cleared.nextId, 2)
  assert.equal(after.elements[0]?.id, 'e2')
})

test('patch 命中不存在的 id 时被忽略，不抛也不改场景', () => {
  const { ops, scene } = opsFromCommands(createScene(), [line(0)])
  const patched = applyOps(scene, [{ op: 'patch', id: 'e99', isDeleted: true }, { op: 'patch', id: 'e0', isDeleted: true }])

  assert.equal(patched.elements[0]?.isDeleted, true)
  assert.equal(applyOps(scene, [{ op: 'patch', id: 'e99', isDeleted: true }]).elements.length, ops.length)
  assert.equal(scene.elements[0]?.isDeleted, false)
})

test('同一条 ops 流折叠两次深度相等且不修改起始场景', () => {
  const start: Scene = createScene()
  const { ops } = opsFromCommands(start, [line(0), line(20)])

  assert.deepEqual(applyOps(start, ops), applyOps(start, ops))
  assert.deepEqual(start, createScene())
})
