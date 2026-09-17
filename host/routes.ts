import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { DrawCommand } from '../core/commands.ts'
import type { AppendBody } from '../shared/protocol.ts'
import type { SnapshotRequests } from './snapshots.ts'
import type { BoardStore } from './store.ts'

/**
 * `GET /api/blackboard.scene?sessionId=<id>&since=<rev>`。
 * 响应多带一个 `snapshotRequest`：面板看到非 null 就该为这次请求出一张整块板的图交回来。
 * @param store - 画板存储。
 * @param snapshots - 快照请求账本。
 * @param request - 已通过 Connection 信任检查的请求。
 * @returns `{ revision, ops, snapshotRequest }`；查询参数不合法时 400。
 */
export async function handleScene(
  store: BoardStore,
  snapshots: SnapshotRequests,
  request: Request,
): Promise<Response> {
  const query = new URL(request.url).searchParams
  const sessionId = query.get('sessionId')
  const since = Number(query.get('since') ?? '0')
  if (sessionId === null || sessionId === '' || !Number.isSafeInteger(since) || since < 0) {
    return new Response('Invalid blackboard scene query.', { status: 400 })
  }
  const delta = await store.read(sessionId as SessionId, since)
  return Response.json({ ...delta, snapshotRequest: snapshots.outstanding(sessionId) })
}

/**
 * `POST /api/blackboard.snapshot?sessionId=<id>&requestId=<id>`，body 是 PNG 原始字节。
 * @param snapshots - 快照请求账本。
 * @param request - 已通过 Connection 信任检查的请求。
 * @returns `{ delivered: true }`；参数不合法或 body 为空时 400，没有对应等待请求时 409（多半是超时后的迟到交付）。
 */
export async function handleSnapshot(snapshots: SnapshotRequests, request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams
  const sessionId = query.get('sessionId')
  const requestId = query.get('requestId')
  if (sessionId === null || sessionId === '' || requestId === null || requestId === '') {
    return new Response('Invalid blackboard snapshot query.', { status: 400 })
  }
  const png = new Uint8Array(await request.arrayBuffer())
  if (png.byteLength === 0) return new Response('Empty blackboard snapshot body.', { status: 400 })
  if (!snapshots.deliver(sessionId, requestId, png)) {
    return new Response('No matching blackboard snapshot request.', { status: 409 })
  }
  return Response.json({ delivered: true })
}

/**
 * `POST /api/blackboard.ops?sessionId=<id>`，body 是 `{ commands }`。
 * @param store - 画板存储。
 * @param request - 已通过 Connection 信任检查的请求。
 * @returns 本次追加的 ops 与追加后的 revision；sessionId、body 或 commands 不合法时 400。
 */
export async function handleAppend(store: BoardStore, request: Request): Promise<Response> {
  const sessionId = new URL(request.url).searchParams.get('sessionId')
  if (sessionId === null || sessionId === '') return new Response('Invalid blackboard session id.', { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    // 只有"请求体不是 JSON"能走到这里；request.json() 不读磁盘也不碰外部状态。
    return new Response('Invalid blackboard request body.', { status: 400 })
  }

  const commands = commandsOf(body)
  if (commands === undefined) return new Response('Invalid blackboard commands.', { status: 400 })
  return Response.json(await store.append(sessionId as SessionId, commands))
}

/** 参数的检查方式。 */
type ArgumentKind = 'point' | 'points' | 'string' | 'number' | 'ids'

/** 一个 `{x, y}`，且两个坐标都是有限数。 */
const isPoint = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null) return false
  const point = value as { x?: unknown; y?: unknown }
  return Number.isFinite(point.x) && Number.isFinite(point.y)
}

/** 每支 `DrawCommand` 的必需参数及检查方式。 */
const CHECKS: Record<ArgumentKind, (value: unknown) => boolean> = {
  point: isPoint,
  points: (value) => Array.isArray(value) && value.every(isPoint),
  string: (value) => typeof value === 'string',
  // `NaN` 会被 Response.json 序列化成 null 永久写进 JSONL，所以这里必须挡住非有限数。
  number: (value) => Number.isFinite(value),
  ids: (value) => Array.isArray(value) && value.every((id) => typeof id === 'string'),
}

/** 每支 `DrawCommand` 的必需参数。 */
const REQUIRED_ARGUMENTS: Record<string, Record<string, ArgumentKind>> = {
  line: { from: 'point', to: 'point', color: 'string', width: 'number' },
  arrow: { from: 'point', to: 'point', color: 'string', width: 'number' },
  rect: { at: 'point', size: 'point', color: 'string', width: 'number' },
  circle: { center: 'point', radius: 'number', color: 'string', width: 'number' },
  text: { at: 'point', text: 'string', size: 'number', color: 'string' },
  stroke: { points: 'points', color: 'string', width: 'number' },
  erase: { ids: 'ids' },
  clear: {},
}

/**
 * 校验一组命令。请求体是 wire 边界，这里是不合法结构唯一的 400 机会。
 * @param body - 解析后的请求体。
 * @returns 命令数组；不是这个结构时 undefined。
 */
function commandsOf(body: unknown): DrawCommand[] | undefined {
  if (typeof body !== 'object' || body === null) return undefined
  const commands: unknown = (body as AppendBody).commands
  if (!Array.isArray(commands)) return undefined
  for (const command of commands) {
    if (typeof command !== 'object' || command === null) return undefined
    const parameters = command as Record<string, unknown>
    const required = typeof parameters.op === 'string' ? REQUIRED_ARGUMENTS[parameters.op] : undefined
    if (required === undefined) return undefined
    for (const [name, kind] of Object.entries(required)) {
      if (!CHECKS[kind](parameters[name])) return undefined
    }
  }
  return commands as DrawCommand[]
}
