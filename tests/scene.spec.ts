import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { DrawCommand } from '../core/commands.ts'
import { applyCommands, createScene } from '../core/scene.ts'

test('line 命令产出外接框与相对点列', () => {
  const scene = applyCommands(createScene(), [
    { op: 'line', from: { x: 10, y: 20 }, to: { x: 40, y: 60 }, color: '#000000', width: 2 },
  ])

  assert.deepEqual(scene.elements, [{
    id: 'e0',
    type: 'line',
    x: 10,
    y: 20,
    width: 30,
    height: 40,
    points: [{ x: 0, y: 0 }, { x: 30, y: 40 }],
    strokeColor: '#000000',
    strokeWidth: 2,
    isDeleted: false,
  }])
  assert.equal(scene.nextId, 1)
})

test('arrow 与 line 只差 type', () => {
  const [line] = applyCommands(createScene(), [
    { op: 'line', from: { x: 0, y: 0 }, to: { x: 5, y: 5 }, color: '#000000', width: 2 },
  ]).elements
  const [arrow] = applyCommands(createScene(), [
    { op: 'arrow', from: { x: 0, y: 0 }, to: { x: 5, y: 5 }, color: '#000000', width: 2 },
  ]).elements

  assert.deepEqual(arrow, { ...line, type: 'arrow' })
})

test('rect 把 at 当外接框的一角：负数 size 归一化原点并取绝对值', () => {
  const scene = applyCommands(createScene(), [
    { op: 'rect', at: { x: 5, y: 6 }, size: { x: -30, y: 40 }, color: '#111111', width: 4, fill: '#eeeeee' },
  ])

  assert.deepEqual(scene.elements, [{
    id: 'e0',
    type: 'rect',
    x: -25,
    y: 6,
    width: 30,
    height: 40,
    strokeColor: '#111111',
    strokeWidth: 4,
    isDeleted: false,
    fill: '#eeeeee',
  }])
})

test('rect 没有 fill 时不写这个字段', () => {
  const scene = applyCommands(createScene(), [
    { op: 'rect', at: { x: 0, y: 0 }, size: { x: 10, y: 10 }, color: '#000000', width: 1 },
  ])
  const element = scene.elements[0]

  assert.ok(element !== undefined)
  assert.equal(Object.hasOwn(element, 'fill'), false)
})

test('circle 换算成外接框等于直径的 ellipse', () => {
  const scene = applyCommands(createScene(), [
    { op: 'circle', center: { x: 100, y: 200 }, radius: 30, color: '#1971c2', width: 4 },
  ])

  assert.deepEqual(scene.elements, [{
    id: 'e0',
    type: 'ellipse',
    x: 70,
    y: 170,
    width: 60,
    height: 60,
    strokeColor: '#1971c2',
    strokeWidth: 4,
    isDeleted: false,
  }])
})

test('circle 的负 radius 按绝对值取外接框', () => {
  const scene = applyCommands(createScene(), [
    { op: 'circle', center: { x: 100, y: 200 }, radius: -30, color: '#1971c2', width: 4 },
  ])

  assert.deepEqual(scene.elements, [{
    id: 'e0',
    type: 'ellipse',
    x: 70,
    y: 170,
    width: 60,
    height: 60,
    strokeColor: '#1971c2',
    strokeWidth: 4,
    isDeleted: false,
  }])
})

test('line 轴对齐时外接框有一边为 0', () => {
  const horizontal = applyCommands(createScene(), [
    { op: 'line', from: { x: 2, y: 7 }, to: { x: 12, y: 7 }, color: '#000000', width: 2 },
  ]).elements[0]
  const vertical = applyCommands(createScene(), [
    { op: 'line', from: { x: 3, y: 4 }, to: { x: 3, y: 9 }, color: '#000000', width: 2 },
  ]).elements[0]

  assert.deepEqual(horizontal, {
    id: 'e0',
    type: 'line',
    x: 2,
    y: 7,
    width: 10,
    height: 0,
    points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
    strokeColor: '#000000',
    strokeWidth: 2,
    isDeleted: false,
  })
  assert.deepEqual(vertical, {
    id: 'e0',
    type: 'line',
    x: 3,
    y: 4,
    width: 0,
    height: 5,
    points: [{ x: 0, y: 0 }, { x: 0, y: 5 }],
    strokeColor: '#000000',
    strokeWidth: 2,
    isDeleted: false,
  })
})

test('text 命令写 0 宽高并保留 align', () => {
  const scene = applyCommands(createScene(), [
    { op: 'text', at: { x: 1, y: 2 }, text: 'hi', size: 32, color: '#000000', align: 'middle' },
  ])

  assert.deepEqual(scene.elements, [{
    id: 'e0',
    type: 'text',
    x: 1,
    y: 2,
    width: 0,
    height: 0,
    text: 'hi',
    fontSize: 32,
    align: 'middle',
    strokeColor: '#000000',
    strokeWidth: 0,
    isDeleted: false,
  }])
})

test('text 命令省略 align 时默认 start', () => {
  const scene = applyCommands(createScene(), [
    { op: 'text', at: { x: 0, y: 0 }, text: 'hi', size: 32, color: '#000000' },
  ])
  const element = scene.elements[0]

  assert.ok(element?.type === 'text')
  assert.equal(element.align, 'start')
})

test('stroke 命令产出外接框与相对点列', () => {
  const scene = applyCommands(createScene(), [
    { op: 'stroke', points: [{ x: 5, y: 5 }, { x: 5, y: 25 }, { x: 45, y: 25 }], color: '#2f9e44', width: 4 },
  ])

  assert.deepEqual(scene.elements, [{
    id: 'e0',
    type: 'stroke',
    x: 5,
    y: 5,
    width: 40,
    height: 20,
    points: [{ x: 0, y: 0 }, { x: 0, y: 20 }, { x: 40, y: 20 }],
    strokeColor: '#2f9e44',
    strokeWidth: 4,
    isDeleted: false,
  }])
})

test('erase 只标记命中的元素，且不修改输入场景', () => {
  const drawn = applyCommands(createScene(), [
    { op: 'line', from: { x: 0, y: 0 }, to: { x: 10, y: 10 }, color: '#000000', width: 1 },
    { op: 'line', from: { x: 0, y: 0 }, to: { x: 20, y: 20 }, color: '#000000', width: 1 },
  ])
  const erased = applyCommands(drawn, [{ op: 'erase', ids: ['e0', 'nope'] }])

  assert.equal(erased.elements.length, 2)
  assert.equal(erased.elements[0]?.isDeleted, true)
  assert.equal(erased.elements[1]?.isDeleted, false)
  assert.equal(erased.elements[0]?.id, 'e0')
  assert.equal(erased.nextId, 2)
  assert.equal(drawn.elements[0]?.isDeleted, false)
})

test('clear 清空元素但保留 nextId，新 id 不与清空前撞号', () => {
  const drawn = applyCommands(createScene(), [
    { op: 'line', from: { x: 0, y: 0 }, to: { x: 1, y: 1 }, color: '#000000', width: 1 },
  ])
  const cleared = applyCommands(drawn, [{ op: 'clear' }])
  const after = applyCommands(cleared, [
    { op: 'line', from: { x: 0, y: 0 }, to: { x: 1, y: 1 }, color: '#000000', width: 1 },
  ])

  assert.deepEqual(cleared.elements, [])
  assert.equal(cleared.nextId, 1)
  assert.equal(after.elements[0]?.id, 'e1')
})

test('一批命令里的 id 单调且不重复', () => {
  const commands: DrawCommand[] = [
    { op: 'line', from: { x: 0, y: 0 }, to: { x: 1, y: 1 }, color: '#000000', width: 1 },
    { op: 'circle', center: { x: 0, y: 0 }, radius: 1, color: '#000000', width: 1 },
    { op: 'clear' },
    { op: 'stroke', points: [{ x: 0, y: 0 }, { x: 3, y: 3 }], color: '#000000', width: 1 },
  ]
  const scene = applyCommands(createScene(), commands)

  assert.deepEqual(scene.elements.map((element) => element.id), ['e2'])
  assert.equal(scene.nextId, 3)
})

test('applyCommands 是纯函数：同一入参两次调用深度相等且不修改输入场景', () => {
  const commands: DrawCommand[] = [
    { op: 'line', from: { x: 0, y: 0 }, to: { x: 10, y: 10 }, color: '#000000', width: 2 },
    { op: 'stroke', points: [{ x: 1, y: 1 }, { x: 4, y: 9 }], color: '#e03131', width: 4 },
    { op: 'text', at: { x: 3, y: 3 }, text: 'x', size: 32, color: '#000000' },
  ]
  const start = createScene()
  const first = applyCommands(start, commands)
  const second = applyCommands(start, commands)

  assert.deepEqual(first, second)
  assert.deepEqual(start, createScene())
})
