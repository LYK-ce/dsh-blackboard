import type { DrawCommand } from '../core/commands.ts'
import type { SceneOp } from './ops.ts'

/** 读场景的 exact Fetch route；查询参数 `sessionId` 与 `since`。 */
export const SCENE_PATH = '/api/blackboard.scene'

/** 追加命令的 exact Fetch route；查询参数 `sessionId`。 */
export const OPS_PATH = '/api/blackboard.ops'

/** 追加请求的 body。 */
export interface AppendBody {
  readonly commands: readonly DrawCommand[]
}

/**
 * 一次读取或追加的结果。
 * `ops[i]` 的逻辑序号是 `revision - ops.length + i`，客户端拿它当增量游标。
 */
export interface BoardDelta {
  /** 这条 ops 流当前的 op 总数，等于下一批 op 的起始序号。 */
  readonly revision: number
  readonly ops: readonly SceneOp[]
}
