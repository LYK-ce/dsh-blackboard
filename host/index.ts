import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
// Type-only：把 ctx.connection 的声明拉进程序；运行时不产生 import。
import type {} from '@deepseek-ai/dsh-client-connection'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { OPS_PATH, SCENE_PATH } from '../shared/protocol.ts'
import { handleAppend, handleScene } from './routes.ts'
import { BoardStore } from './store.ts'
import { createDrawTool } from './tool.ts'

export const name = 'blackboard'
export const inject = ['tools', 'connection']

/** 插件配置。 */
export interface Config {
  /** ops 文件目录；默认 `<dsh home>/blackboard`。 */
  readonly dataDir?: string
}

/**
 * 挂两条 exact Fetch route 与一个绘图工具。画板数据不进 session log。
 * @param ctx - 宿主上下文。
 * @param config - 可选的 ops 目录覆盖。
 * @returns 无。
 */
export function apply(ctx: Context, config: Config = {}): void {
  const store = new BoardStore(config.dataDir ?? join(resolveDshHome(), 'blackboard'))
  ctx.effect(() => () => store.dispose(), 'blackboard: board store')
  ctx.effect(() => ctx.connection.fetch.register({
    path: SCENE_PATH,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: (request) => handleScene(store, request),
  }), 'blackboard: scene route')
  ctx.effect(() => ctx.connection.fetch.register({
    path: OPS_PATH,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: (request) => handleAppend(store, request),
  }), 'blackboard: ops route')
  // tools.register 自己就是注册即效应（先例 packages/todo/tool-todo/src/index.ts:146），这里不重复包一层。
  ctx.tools.register(createDrawTool(store))
}
