import {
  DEFAULT_COLOR,
  DEFAULT_FONT_SIZE,
  DEFAULT_WIDTH,
  MAX_SCALE_FACTOR,
  MIN_POINT_DISTANCE,
  RDP_EPSILON,
  applyCommands,
  assertNever,
  clampViewport,
  createScene,
  filterByMinDistance,
  fitViewport,
  panBy,
  render,
  screenToVirtual,
  simplifyRdp,
  zoomAt,
} from '../core/index.ts'
import type { Color, DrawCommand, Point, Scene } from '../core/index.ts'

/** 工具栏能选的绘制工具。 */
export type BoardTool = 'pen' | 'line' | 'arrow' | 'rect' | 'circle' | 'text'

/** 会拖拽出形状的工具；文字在按下时直接提交，没有手势。 */
type DragTool = Exclude<BoardTool, 'text'>

/** 当前工具与样式。 */
export interface BoardStyle {
  readonly tool: BoardTool
  readonly color: Color
  readonly width: number
}

/** 面板的初始工具与样式。 */
export const DEFAULT_STYLE: BoardStyle = { tool: 'pen', color: DEFAULT_COLOR, width: DEFAULT_WIDTH }

/** 滚轮一格的缩放倍数。 */
const ZOOM_STEP = 1.15

/** 挂在画布上的回调；都用 getter，免得改一次工具就重挂。 */
export interface CanvasOptions {
  /** 读取当前工具与样式。 */
  readonly style: () => BoardStyle
  /** 文字工具要一段文字；返回 null 表示取消。 */
  readonly askText: () => string | null
  /** 一次手势结束时交回一条命令。 */
  readonly onCommand: (command: DrawCommand) => void
}

/** 画布句柄。 */
export interface CanvasHandle {
  /**
   * 重画场景层。
   * @param scene - 最新场景。
   * @returns 无。
   */
  update(scene: Scene): void
  /**
   * 导出当前场景层。
   * @returns PNG；画布没有内容时也返回一张空白图。
   */
  toPng(): Promise<Blob>
  /**
   * 摘掉监听、观察者与 DOM。
   * @returns 无。
   */
  dispose(): void
}

/** 一次指针手势的进行中状态。 */
interface Gesture {
  readonly pointerId: number
  /** 手势开始时的工具；手势期间改工具不影响这一笔。 */
  readonly tool: DragTool
  readonly color: Color
  readonly width: number
  readonly origin: Point
  /** 手绘的原始采样点，含随后会被过滤掉的。 */
  raw: Point[]
  /** 当前指针位置，图形工具的终点。 */
  current: Point
}

/**
 * 取 canvas 的 2D 上下文。
 * @param canvas - 目标 canvas。
 * @returns 它的 2D 上下文。
 */
function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (ctx === null) throw new Error('blackboard: the browser returned no 2D context')
  return ctx
}

/**
 * 在 host 里挂一块双层画布：场景层按 revision 重画，进行中的手势画在实时层。
 * @param host - 已定位的容器；画布铺满它。
 * @param options - 工具、取字与命令回调。
 * @returns 更新、导出与销毁的句柄。
 */
export function mountCanvas(host: HTMLElement, options: CanvasOptions): CanvasHandle {
  const stage = document.createElement('div')
  // 白底放在容器上，不能放在 canvas 元素上：两层 canvas 上下叠放，上层若有不透明背景会把下层整个盖住。
  // 这样屏幕上不透明，而 core 的 render 仍然只 clearRect；导出 PNG 的底色由 toPng 自己铺。
  stage.style.cssText = 'position:absolute;inset:0;touch-action:none;cursor:crosshair;background:#ffffff'
  const sceneCanvas = document.createElement('canvas')
  const liveCanvas = document.createElement('canvas')
  for (const canvas of [sceneCanvas, liveCanvas]) {
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%'
    stage.append(canvas)
  }
  host.append(stage)

  const sceneCtx = context2d(sceneCanvas)
  const liveCtx = context2d(liveCanvas)
  let scene = createScene()
  // 视野 = 容器尺寸决定的 fit 视口 + 用户的缩放/平移；`fit` 同时是缩放下限与"回到居中"的基准。
  let fit = fitViewport(1, 1)
  let viewport = fit
  /** 当前画布的设备像素尺寸；中键平移与滚轮缩放都要用它夹视野。 */
  let size = { width: 1, height: 1 }
  let gesture: Gesture | undefined
  let pan: { pointerId: number; x: number; y: number } | undefined

  /** 把指针事件折算成虚拟坐标。 */
  const toVirtual = (event: PointerEvent): Point => {
    const rect = stage.getBoundingClientRect()
    const dpr = window.devicePixelRatio
    return screenToVirtual((event.clientX - rect.left) * dpr, (event.clientY - rect.top) * dpr, viewport)
  }

  /** 手绘的点管线：最小距离过滤 → RDP。 */
  const penPoints = (raw: readonly Point[]): Point[] => simplifyRdp(filterByMinDistance(raw, MIN_POINT_DISTANCE), RDP_EPSILON)

  /** 当前手势对应的一条命令。 */
  const commandOf = (current: Gesture): DrawCommand => {
    switch (current.tool) {
      case 'pen':
        return { op: 'stroke', points: penPoints(current.raw), color: current.color, width: current.width }
      case 'line':
        return { op: 'line', from: current.origin, to: current.current, color: current.color, width: current.width }
      case 'arrow':
        return { op: 'arrow', from: current.origin, to: current.current, color: current.color, width: current.width }
      case 'rect':
        return {
          op: 'rect',
          at: {
            x: Math.min(current.origin.x, current.current.x),
            y: Math.min(current.origin.y, current.current.y),
          },
          size: {
            x: Math.abs(current.current.x - current.origin.x),
            y: Math.abs(current.current.y - current.origin.y),
          },
          color: current.color,
          width: current.width,
        }
      case 'circle':
        return {
          op: 'circle',
          center: current.origin,
          radius: Math.hypot(current.current.x - current.origin.x, current.current.y - current.origin.y),
          color: current.color,
          width: current.width,
        }
      default:
        assertNever(current.tool)
    }
  }

  /** 重画实时层；没有手势时等于清屏。 */
  const drawLive = (): void => {
    const preview = gesture === undefined ? createScene() : applyCommands(createScene(), [commandOf(gesture)])
    render(liveCtx, preview, viewport)
  }

  /** 视野变了就两层一起重画。 */
  const redraw = (): void => {
    render(sceneCtx, scene, viewport)
    drawLive()
  }

  const onPointerDown = (event: PointerEvent): void => {
    // 中键按下 = 平移视野：不画东西，也不跟进行中的左键手势抢指针。
    if (event.button === 1) {
      if (gesture !== undefined) return
      event.preventDefault()
      pan = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
      stage.setPointerCapture(event.pointerId)
      stage.style.cursor = 'grabbing'
      return
    }
    if (event.button !== 0) return
    const point = toVirtual(event)
    const style = options.style()
    if (style.tool === 'text') {
      const text = options.askText()
      if (text === null || text === '') return
      options.onCommand({ op: 'text', at: point, text, size: DEFAULT_FONT_SIZE, color: style.color })
      return
    }
    stage.setPointerCapture(event.pointerId)
    gesture = {
      pointerId: event.pointerId,
      tool: style.tool,
      color: style.color,
      width: style.width,
      origin: point,
      current: point,
      raw: [point],
    }
    drawLive()
  }

  const onPointerMove = (event: PointerEvent): void => {
    if (pan !== undefined) {
      if (event.pointerId !== pan.pointerId) return
      const dpr = window.devicePixelRatio
      viewport = clampViewport(
        panBy(viewport, (event.clientX - pan.x) * dpr, (event.clientY - pan.y) * dpr),
        fit,
        size.width,
        size.height,
      )
      pan.x = event.clientX
      pan.y = event.clientY
      redraw()
      return
    }
    if (gesture === undefined || event.pointerId !== gesture.pointerId) return
    const point = toVirtual(event)
    gesture.current = point
    if (gesture.tool === 'pen') gesture.raw.push(point)
    drawLive()
  }

  const onPointerUp = (event: PointerEvent): void => {
    if (pan !== undefined && event.pointerId === pan.pointerId) {
      pan = undefined
      stage.style.cursor = 'crosshair'
      return
    }
    if (gesture === undefined || event.pointerId !== gesture.pointerId) return
    const point = toVirtual(event)
    gesture.current = point
    if (gesture.tool === 'pen') gesture.raw.push(point)
    const command = commandOf(gesture)
    gesture = undefined
    drawLive()
    options.onCommand(command)
  }

  const onPointerCancel = (event: PointerEvent): void => {
    if (pan !== undefined && event.pointerId === pan.pointerId) {
      pan = undefined
      stage.style.cursor = 'crosshair'
      return
    }
    if (gesture === undefined || event.pointerId !== gesture.pointerId) return
    gesture = undefined
    drawLive()
  }

  /** 滚轮缩放：以指针位置为锚，一格 ZOOM_STEP 倍。 */
  const onWheel = (event: WheelEvent): void => {
    event.preventDefault()
    const rect = stage.getBoundingClientRect()
    const dpr = window.devicePixelRatio
    const at = { x: (event.clientX - rect.left) * dpr, y: (event.clientY - rect.top) * dpr }
    const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP
    viewport = clampViewport(zoomAt(viewport, factor, at, fit.scale), fit, size.width, size.height)
    redraw()
  }

  /** 中键点击的浏览器默认行为是自动滚动；这块画布用中键平移，所以吃掉它。 */
  const swallowMiddle = (event: MouseEvent): void => {
    if (event.button === 1) event.preventDefault()
  }

  /** 按容器尺寸乘 DPR 重设两层画布，再按新的 fit 视口把当前视野搬过去。 */
  const resize = (): void => {
    const rect = stage.getBoundingClientRect()
    const dpr = window.devicePixelRatio
    const width = Math.max(1, Math.round(rect.width * dpr))
    const height = Math.max(1, Math.round(rect.height * dpr))
    for (const canvas of [sceneCanvas, liveCanvas]) {
      canvas.width = width
      canvas.height = height
    }
    // 容器尺寸变了：把原先落在画布中心的虚拟点和相对 fit 的放大倍数搬到新画布中心，缩放与平移都不丢。
    const center = screenToVirtual(size.width / 2, size.height / 2, viewport)
    const factor = Math.min(viewport.scale / fit.scale, MAX_SCALE_FACTOR)
    size = { width, height }
    fit = fitViewport(width, height)
    const scale = fit.scale * factor
    viewport = clampViewport(
      { scale, offsetX: width / 2 - center.x * scale, offsetY: height / 2 - center.y * scale },
      fit,
      width,
      height,
    )
    redraw()
  }

  stage.addEventListener('pointerdown', onPointerDown)
  stage.addEventListener('pointermove', onPointerMove)
  stage.addEventListener('pointerup', onPointerUp)
  stage.addEventListener('pointercancel', onPointerCancel)
  stage.addEventListener('wheel', onWheel, { passive: false })
  stage.addEventListener('mousedown', swallowMiddle)
  stage.addEventListener('auxclick', swallowMiddle)
  const observer = new ResizeObserver(resize)
  observer.observe(stage)
  resize()

  return {
    update: (next) => {
      scene = next
      render(sceneCtx, scene, viewport)
    },
    // 只导场景层：实时层是还没提交的手势，不该进图；导出的是当前视野（缩放/平移之后的画面）。
    toPng: () => new Promise<Blob>((resolve, reject) => {
      // 合成到白底再编码：元素上的白底不进入 canvas 像素，透明 PNG 被模型压到黑底时近黑笔迹会看不见。
      const sheet = document.createElement('canvas')
      sheet.width = sceneCanvas.width
      sheet.height = sceneCanvas.height
      const ctx = context2d(sheet)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, sheet.width, sheet.height)
      ctx.drawImage(sceneCanvas, 0, 0)
      sheet.toBlob((blob) => {
        if (blob === null) reject(new Error('blackboard: the canvas produced no PNG'))
        else resolve(blob)
      }, 'image/png')
    }),
    dispose: () => {
      observer.disconnect()
      stage.removeEventListener('pointerdown', onPointerDown)
      stage.removeEventListener('pointermove', onPointerMove)
      stage.removeEventListener('pointerup', onPointerUp)
      stage.removeEventListener('pointercancel', onPointerCancel)
      stage.removeEventListener('wheel', onWheel)
      stage.removeEventListener('mousedown', swallowMiddle)
      stage.removeEventListener('auxclick', swallowMiddle)
      stage.remove()
    },
  }
}
