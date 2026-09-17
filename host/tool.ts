import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import type { DrawCommand } from '../core/commands.ts'
import type { SnapshotRequests } from './snapshots.ts'
import type { BoardStore } from './store.ts'

/** 面板与工具共用的虚拟坐标范围，写在描述里当模型的坐标系约定。 */
const COORDINATES = 'Virtual board coordinates run 0..1000 on both axes, y downward.'

/** 一个点的参数节点。 */
const POINT = {
  type: 'object',
  additionalProperties: false,
  properties: {
    x: { type: 'number', required: true },
    y: { type: 'number', required: true },
  },
} as const

/**
 * 作为属性使用时的点节点。`required: true` 是"父对象必须带这个字段"的标记，
 * 所以只能在使用点加——放进 `items` 会让数组元素也背上这个标记，那是噪音。
 */
const POINT_PROP = { ...POINT, required: true } as const

/** 描边形状共用的两个参数。 */
const PAINT = {
  color: { type: 'string', required: true, description: "Stroke color as '#rrggbb'." },
  width: { type: 'number', required: true, description: 'Stroke width in virtual units; 4 is the default.' },
} as const

/**
 * 七支绘图命令。`clear` 不开放给模型：它能一次抹掉人与 agent 的全部笔迹。
 * 每支靠 `op` 的 `const` 区分，校验是 exactly-one。
 */
const COMMAND = {
  oneOf: [
    {
      type: 'object',
      additionalProperties: false,
      properties: { op: { type: 'string', const: 'line', required: true }, from: POINT_PROP, to: POINT_PROP, ...PAINT },
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: { op: { type: 'string', const: 'arrow', required: true }, from: POINT_PROP, to: POINT_PROP, ...PAINT },
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        op: { type: 'string', const: 'rect', required: true },
        at: { ...POINT_PROP, description: 'Top-left corner.' },
        size: { ...POINT_PROP, description: 'Width and height in x and y.' },
        ...PAINT,
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        op: { type: 'string', const: 'circle', required: true },
        center: POINT_PROP,
        radius: { type: 'number', required: true },
        ...PAINT,
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        op: { type: 'string', const: 'text', required: true },
        at: { ...POINT_PROP, description: 'Left edge of the text; y is its vertical centre.' },
        text: { type: 'string', required: true },
        size: { type: 'number', required: true, description: 'Font size in virtual units.' },
        color: PAINT.color,
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        op: { type: 'string', const: 'stroke', required: true },
        points: { type: 'array', items: POINT, required: true, description: 'Freehand samples, in order.' },
        ...PAINT,
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        op: { type: 'string', const: 'erase', required: true },
        ids: { type: 'array', items: { type: 'string' }, required: true, description: 'Ids of shapes to remove.' },
      },
    },
  ],
} as const

/**
 * 绘图工具：一批命令画到当前会话的画板上。
 * @param store - 画板存储；工具不碰 session log。
 * @returns 可注册进 `ctx.tools` 的定义。
 */
export function createDrawTool(store: BoardStore): ToolDefinition {
  return defineTool({
    name: 'blackboard_draw',
    description: `Draw or erase shapes on the shared blackboard of this session. ${COORDINATES}`,
    parameters: {
      commands: { type: 'array', items: COMMAND, required: true, description: 'Shapes to draw, in order.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          added: { type: 'array', items: { type: 'string' }, required: true },
          elements: { type: 'integer', required: true },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: `Drew ${value.added.length} shape(s); the board now has ${value.elements} element(s).`
          + (value.added.length > 0 ? ` New ids: ${value.added.join(', ')}.` : ''),
      }],
    },
    async execute(args, exec) {
      const sessionId = exec.agent?.session.id
      // 没有 agent 就没有会话，也就没有该画到哪块板子上。
      if (sessionId === undefined) throw new Error('blackboard_draw: the tool ran without an agent session')
      const delta = await store.append(sessionId, args.commands as DrawCommand[])
      const scene = await store.scene(sessionId)
      return {
        added: delta.ops.flatMap((op) => (op.op === 'add' ? [op.element.id] : [])),
        elements: scene.elements.filter((element) => !element.isDeleted).length,
      }
    },
  })
}

/** 等面板交图的上限，毫秒：面板每秒轮询一次，留两拍余量。 */
const SNAPSHOT_TIMEOUT_MS = 2500

/**
 * 读画板工具：向浏览器里的面板要一张**整块板**的 PNG，落到磁盘并把路径交回模型。
 *
 * host 没有 canvas，图只能由面板产出，所以面板没开（或没响应）时这里超时报错。
 * 导出的图与人的缩放/平移无关，永远是完整的 0..1000 板面。
 * @param snapshots - 快照请求账本。
 * @param dataDir - 快照落盘目录（与 ops 文件同一个目录）。
 * @returns 可注册进 `ctx.tools` 的定义。
 */
export function createSnapshotTool(snapshots: SnapshotRequests, dataDir: string): ToolDefinition {
  return defineTool({
    name: 'blackboard_read',
    description: 'Read the current shared blackboard as an image file. The board is drawn by the open board panel in the '
      + "browser, so this fails when no board panel is open for this session. The image always covers the whole board, "
      + "independent of the panel's zoom or pan. The returned PNG is written to disk; read that path with read_image to see it.",
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          path: { type: 'string', required: true },
          bytes: { type: 'integer', required: true },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: `Board snapshot written to ${value.path} (${value.bytes} bytes). Read it with read_image to see the drawing.`,
      }],
    },
    async execute(_args, exec) {
      const sessionId = exec.agent?.session.id
      // 没有 agent 就没有会话，也就没有该向哪块板子要图。
      if (sessionId === undefined) throw new Error('blackboard_read: the tool ran without an agent session')
      const png = await snapshots.request(sessionId, SNAPSHOT_TIMEOUT_MS, exec.signal)
      const path = join(dataDir, `${sessionId.replace(/[^A-Za-z0-9._-]/g, '_')}.png`)
      await writeFile(path, png)
      return { path, bytes: png.byteLength }
    },
  })
}
