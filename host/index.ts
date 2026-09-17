import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
// Type-only：把 ctx.connection 的声明拉进程序；运行时不产生 import。
import type {} from '@deepseek-ai/dsh-client-connection'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { OPS_PATH, SCENE_PATH, SNAPSHOT_PATH } from '../shared/protocol.ts'
import { handleAppend, handleScene, handleSnapshot } from './routes.ts'
import { SnapshotRequests } from './snapshots.ts'
import { BoardStore } from './store.ts'
import { createDrawTool, createSnapshotTool } from './tool.ts'

export const name = 'blackboard'
export const inject = ['tools', 'connection']

/** 插件配置。 */
export interface Config {
  /** ops 文件目录；默认 `<dsh home>/blackboard`。快照 PNG 也落在这里。 */
  readonly dataDir?: string
}

/**
 * 挂三条 exact Fetch route 与两个工具（画/读）。画板数据不进 session log。
 * @param ctx - 宿主上下文。
 * @param config - 可选的 ops 目录覆盖。
 * @returns 无。
 */
export function apply(ctx: Context, config: Config = {}): void {
  const dataDir = config.dataDir ?? join(resolveDshHome(), 'blackboard')
  const store = new BoardStore(dataDir)
  ctx.effect(() => () => store.dispose(), 'blackboard: board store')
  // host 没有 canvas，读画板只能向浏览器里的面板要图；这份账本记的就是"谁在等图"。
  const snapshots = new SnapshotRequests()
  ctx.effect(() => () => snapshots.dispose(), 'blackboard: snapshot requests')
  ctx.effect(() => ctx.connection.fetch.register({
    path: SCENE_PATH,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: (request) => handleScene(store, snapshots, request),
  }), 'blackboard: scene route')
  ctx.effect(() => ctx.connection.fetch.register({
    path: OPS_PATH,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: (request) => handleAppend(store, request),
  }), 'blackboard: ops route')
  ctx.effect(() => ctx.connection.fetch.register({
    path: SNAPSHOT_PATH,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: (request) => handleSnapshot(snapshots, request),
  }), 'blackboard: snapshot route')
  // tools.register 自己就是注册即效应（先例 packages/todo/tool-todo/src/index.ts:146），这里不重复包一层。
  ctx.tools.register(createDrawTool(store))
  ctx.tools.register(createSnapshotTool(snapshots, dataDir))
}
