import type { Context } from '@deepseek-ai/cordis'
import { OPS_PATH, SCENE_PATH } from '../shared/protocol.ts'
import type { AppendBody, BoardDelta } from '../shared/protocol.ts'
// 类型专用：把 locale 服务的 Context 合并拉进程序。
import type {} from '@deepseek-ai/dsh-client-locale/client'
// 类型专用：'sidebar.right.pane.tab' 的 SlotMap 行与 sidebarRightTabs 服务由 ui-sidebar-right 声明。
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { DrawCommand } from '../core/index.ts'
import { NS, en, zh } from './locale.ts'
import type { BlackboardKey } from './locale.ts'
import { BlackboardPanel } from './panel.tsx'
import type { BlackboardInjected, BoardAskResult } from './panel.tsx'
import { createSceneSource } from './source.ts'
import type { SceneSource } from './source.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** 画板面板的文案。 */
    blackboard: BlackboardKey
  }
}

/** 轮询间隔，毫秒：agent 画完到人看见最多迟这么久。 */
const POLL_MS = 1000

/** 右侧栏 tab 类型与它 body 座位的注册 id；与 package.json 的 name 一致。 */
const TAB_ID = 'dsh-blackboard'

/** 发给模型的图片名。 */
const IMAGE_NAME = 'blackboard.png'

/** 需要的服务：槽位、会话绑定、文案与右侧栏的 tab 类型登记处。 */
export const inject = ['slots', 'sessions', 'locale', 'sidebarRightTabs']

/**
 * 把画板切成 base64；`PromptContentPart` 的 image 要的是不带 data-URL 前缀的规范 base64。
 * @param png - 画板截图。
 * @returns 该 PNG 的 base64。
 */
function base64Of(png: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result)
      resolve(url.slice(url.indexOf(',') + 1))
    }
    reader.onerror = () => { reject(reader.error ?? new Error('blackboard: FileReader failed')) }
    reader.readAsDataURL(png)
  })
}

/**
 * 把画板注册成右侧栏的一个 page type：类型登记在 `sidebarRightTabs`，面板挂在
 * `sidebar.right.pane.tab` 这个 keyed 座位上（两段式注册，模板是 ui-sidebar-terminal）。
 * 数据走两条 exact Fetch route，人 → 模型走 `session.prompt`。
 * @param ctx - 客户端根上下文。
 * @returns 无。
 */
export function apply(ctx: Context): void {
  /** 每个会话一份源；同一个 sessionId 重复注入时复用，避免挂出第二个轮询。 */
  const sources = new Map<string, SceneSource>()

  const loadScene = async (sessionId: SessionId, since: number): Promise<BoardDelta> => {
    const response = await fetch(`${SCENE_PATH}?sessionId=${encodeURIComponent(sessionId)}&since=${since}`)
    if (!response.ok) throw new Error(`blackboard: scene read failed with ${response.status}`)
    return await response.json() as BoardDelta
  }

  const appendCommands = async (sessionId: SessionId, commands: readonly DrawCommand[]): Promise<BoardDelta> => {
    const body: AppendBody = { commands }
    const response = await fetch(`${OPS_PATH}?sessionId=${encodeURIComponent(sessionId)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) throw new Error(`blackboard: append failed with ${response.status}`)
    return await response.json() as BoardDelta
  }

  const askAgent = async (sessionId: SessionId, png: Blob, text: string): Promise<BoardAskResult> => {
    const binding = ctx.sessions.binding(sessionId)
    // 会话没在这个页面打开时没有发送面；面板会把这条原因显示出来。
    if (binding === undefined) return { ok: false, reason: 'session is not bound on this page' }
    const result = await binding.session.prompt([
      { type: 'image', mediaType: 'image/png', data: await base64Of(png), name: IMAGE_NAME },
      { type: 'text', text },
    ], 'queue')
    return result.ok ? { ok: true } : { ok: false, reason: `${result.error.code}: ${result.error.message}` }
  }

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'blackboard: dictionaries')
  // tab 标题与 guide 文案都是注册期文本，走 thunk 才能跟随语言切换而不重新注册。
  const t = ctx.locale.bind(NS)
  /**
   * 一个会话的画板注入面：面板私有的场景源，加画与转发两个动作。
   * @param sessionId - 面板所属会话。
   * @returns 注入面。
   */
  const injected = (sessionId: SessionId): BlackboardInjected => {
    const existing = sources.get(sessionId)
    const source = existing ?? createSceneSource({
      load: (since) => loadScene(sessionId, since),
      append: (commands) => appendCommands(sessionId, commands),
      pollMs: POLL_MS,
    })
    if (existing === undefined) sources.set(sessionId, source)
    return {
      hooks: { scene: source },
      draw: source.send,
      ask: (png, text) => askAgent(sessionId, png, text),
    }
  }
  // 不写 patterns：这是个 page type，按 kind 打开、不认资源地址（ui-sidebar-right/src/client/tab-registry.ts）。
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: TAB_ID,
    kind: 'blackboard',
    priority: 'builtin',
    title: () => t('view.board'),
    guide: [{ id: 'open', order: 20, title: () => t('view.board'), description: () => t('guide.description') }],
  }), 'blackboard: tab type')
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab',
    key: TAB_ID,
    locale: NS,
    inject: injected,
  }, BlackboardPanel)), 'blackboard: pane body')
}
