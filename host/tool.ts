import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import type { DrawCommand } from '../core/commands.ts'
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
