import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterByMinDistance, simplifyRdp } from '../core/simplify.ts'
import type { Point } from '../core/types.ts'

test('filterByMinDistance 保留首点、滤掉近点、保持顺序', () => {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 0.5, y: 0 },
    { x: 5, y: 0 },
    { x: 5.5, y: 0 },
    { x: 12, y: 0 },
  ]

  assert.deepEqual(filterByMinDistance(points, 2), [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 12, y: 0 }])
})

test('filterByMinDistance 对空数组和单点返回原样', () => {
  assert.deepEqual(filterByMinDistance([], 2), [])
  assert.deepEqual(filterByMinDistance([{ x: 7, y: 8 }], 2), [{ x: 7, y: 8 }])
})

test('filterByMinDistance 不修改输入数组', () => {
  const points: Point[] = [{ x: 0, y: 0 }, { x: 9, y: 9 }]
  const before = points.map((point) => ({ ...point }))
  filterByMinDistance(points, 2)

  assert.equal(points.length, before.length)
  for (const [index, point] of points.entries()) assert.deepEqual(point, before[index])
})

test('simplifyRdp 把共线点压成两点', () => {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
    { x: 4, y: 0 },
  ]

  assert.deepEqual(simplifyRdp(points, 2), [{ x: 0, y: 0 }, { x: 4, y: 0 }])
})

test('simplifyRdp 保住偏离弦的拐点', () => {
  const points: Point[] = [{ x: 0, y: 0 }, { x: 50, y: 40 }, { x: 100, y: 0 }]

  assert.deepEqual(simplifyRdp(points, 2), points)
})

test('simplifyRdp 原样返回退化输入', () => {
  const loop: Point[] = [{ x: 3, y: 3 }, { x: 9, y: 1 }, { x: 4, y: 8 }, { x: 3, y: 3 }]

  assert.deepEqual(simplifyRdp([], 2), [])
  assert.deepEqual(simplifyRdp([{ x: 1, y: 1 }], 2), [{ x: 1, y: 1 }])
  assert.deepEqual(simplifyRdp([{ x: 1, y: 1 }, { x: 9, y: 9 }], 2), [{ x: 1, y: 1 }, { x: 9, y: 9 }])
  // 首尾重合时弦长为 0：必须早退，不能产出 NaN。
  assert.deepEqual(simplifyRdp(loop, 2), loop)
})

test('simplifyRdp 不修改输入数组', () => {
  const points: Point[] = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }]
  const before = points.map((point) => ({ ...point }))
  simplifyRdp(points, 2)

  assert.equal(points.length, before.length)
  for (const [index, point] of points.entries()) assert.deepEqual(point, before[index])
})

test('ε 变大时点数单调不增', () => {
  const wavy: Point[] = []
  for (let index = 0; index < 60; index += 1) wavy.push({ x: index * 2, y: Math.sin(index / 3) * 20 })

  let previous = wavy.length
  for (const epsilon of [1, 2, 4, 8, 16]) {
    const count = simplifyRdp(wavy, epsilon).length
    assert.ok(count <= previous, `ε=${epsilon} 得到了 ${count} 点，多于更小 ε 的 ${previous} 点`)
    previous = count
  }
  assert.ok(previous < wavy.length)
})
