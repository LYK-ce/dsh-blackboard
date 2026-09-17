import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAX_SCALE_FACTOR, clampViewport, fitViewport, panBy, screenToVirtual, zoomAt } from '../core/viewport.ts'
import type { Point } from '../core/types.ts'

test('正方形画布铺满且无偏移', () => {
  assert.deepEqual(fitViewport(600, 600), { scale: 0.6, offsetX: 0, offsetY: 0 })
})

test('宽画布横向留边', () => {
  const viewport = fitViewport(1000, 500)

  assert.equal(viewport.scale, 0.5)
  assert.equal(viewport.offsetX, 250)
  assert.equal(viewport.offsetY, 0)
})

test('高画布纵向留边', () => {
  const viewport = fitViewport(400, 900)

  assert.equal(viewport.scale, 0.4)
  assert.equal(viewport.offsetX, 0)
  assert.equal(viewport.offsetY, 250)
})

test('screenToVirtual 与 fitViewport 互为逆运算', () => {
  const viewport = fitViewport(800, 600)
  const virtual: Point[] = [
    { x: 0, y: 0 },
    { x: 123, y: 456 },
    { x: 999, y: 1 },
    { x: 500, y: 500 },
  ]

  for (const point of virtual) {
    const rounded = screenToVirtual(
      point.x * viewport.scale + viewport.offsetX,
      point.y * viewport.scale + viewport.offsetY,
      viewport,
    )
    assert.ok(Math.abs(rounded.x - point.x) < 1e-9, `x 往返失败：${rounded.x} != ${point.x}`)
    assert.ok(Math.abs(rounded.y - point.y) < 1e-9, `y 往返失败：${rounded.y} != ${point.y}`)
  }
})

test('panBy 只改偏移，不改缩放', () => {
  assert.deepEqual(panBy({ scale: 0.5, offsetX: 250, offsetY: 0 }, 30, -10), {
    scale: 0.5,
    offsetX: 280,
    offsetY: -10,
  })
})

test('zoomAt 让锚点下的虚拟坐标保持不动', () => {
  const fit = fitViewport(1000, 500)
  const at = { x: 300, y: 200 }
  const before = screenToVirtual(at.x, at.y, fit)
  const zoomed = zoomAt(fit, 2, at, fit.scale)
  const after = screenToVirtual(at.x, at.y, zoomed)

  assert.equal(zoomed.scale, fit.scale * 2)
  assert.ok(Math.abs(after.x - before.x) < 1e-9, `锚点 x 漂移：${after.x} != ${before.x}`)
  assert.ok(Math.abs(after.y - before.y) < 1e-9, `锚点 y 漂移：${after.y} != ${before.y}`)
})

test('zoomAt 把缩放夹在 fit 与 MAX_SCALE_FACTOR 倍之间', () => {
  const fit = fitViewport(800, 800)

  assert.equal(zoomAt(fit, 100, { x: 0, y: 0 }, fit.scale).scale, fit.scale * MAX_SCALE_FACTOR)
  assert.equal(zoomAt(fit, 0.1, { x: 0, y: 0 }, fit.scale).scale, fit.scale)
})

test('clampViewport 拖到天边也留住板面中线', () => {
  const fit = fitViewport(1000, 500)
  const clamped = clampViewport({ scale: 1, offsetX: 5000, offsetY: 5000 }, fit, 1000, 500)
  const board = 1000 * clamped.scale

  assert.ok(clamped.offsetX <= 500 && clamped.offsetX + board >= 500, `x 越界：${clamped.offsetX}`)
  assert.ok(clamped.offsetY <= 250 && clamped.offsetY + board >= 250, `y 越界：${clamped.offsetY}`)
})

test('clampViewport 缩到 fit 时回到居中', () => {
  const fit = fitViewport(1000, 500)

  assert.deepEqual(clampViewport(panBy(fit, 40, 40), fit, 1000, 500), fit)
})
