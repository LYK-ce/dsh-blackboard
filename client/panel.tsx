import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// 类型专用：'sidebar.right.pane.tab' 的 SlotMap 行与会话作用域标准位必须在程序里。
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import { PALETTE } from '../core/index.ts'
import type { DrawCommand } from '../core/index.ts'
import { DEFAULT_STYLE, mountCanvas } from './canvas.ts'
import type { BoardStyle, BoardTool, CanvasHandle } from './canvas.ts'
import type { BlackboardKey } from './locale.ts'
import type { SceneSource } from './source.ts'

/** 把画板交给 agent 的结果。 */
export type BoardAskResult = { readonly ok: true } | { readonly ok: false; readonly reason: string }

/** 画板视图的注入面：面板私有的可观察源，加两个动作。 */
export interface BlackboardInjected {
  /** 面板私有的场景源；框架把它绑成 `useScene`。 */
  hooks: { scene: SceneSource }
  /**
   * 追加一批命令。
   * @param commands - 命令。
   * @returns 本次新增的元素 id。
   */
  draw: (commands: readonly DrawCommand[]) => Promise<readonly string[]>
  /**
   * 把一张画板截图当作用户消息发给 agent。
   * @param png - 场景层的 PNG。
   * @param text - 随图一起发的文字。
   * @returns 成功，或面板要显示的原因。
   */
  ask: (png: Blob, text: string) => Promise<BoardAskResult>
}

/** 画板视图的完整 props：运行时份额 + 注入面 + 文案位。 */
export type BlackboardPanelProps = PropsRuntime<'sidebar.right.pane.tab'>
  & InjectFace<BlackboardInjected>
  & PropsLocale<'blackboard'>

/**
 * 工具栏按钮的内联样式。这个自建打包不含 dsh 仓库的样式注入（没有 CSS Modules），
 * 所以样式只走内联 style 与 `--dsw-*` 变量。
 */
const BUTTON: CSSProperties = {
  minWidth: 28,
  height: 26,
  padding: '0 8px',
  cursor: 'pointer',
  border: '1px solid var(--dsw-alias-border-l2, #d0d0d0)',
  borderRadius: 6,
  background: 'var(--dsw-alias-bg-layer-2, #f7f7f7)',
  color: 'inherit',
  font: 'inherit',
}

/** 六个工具；字形是通用绘图符号，不是文案。 */
const TOOLS: readonly { readonly tool: BoardTool; readonly glyph: string; readonly key: BlackboardKey }[] = [
  { tool: 'pen', glyph: '✎', key: 'tool.pen' },
  { tool: 'line', glyph: '╱', key: 'tool.line' },
  { tool: 'arrow', glyph: '↗', key: 'tool.arrow' },
  { tool: 'rect', glyph: '▭', key: 'tool.rect' },
  { tool: 'circle', glyph: '◯', key: 'tool.circle' },
  { tool: 'text', glyph: 'T', key: 'tool.text' },
]

/** 线宽预设，虚拟单位。 */
const WIDTHS: readonly number[] = [2, 4, 8]

/**
 * 把任意抛出物折成一行文字。
 * @param error - 捕获到的值，可能是任何东西。
 * @returns `Error` 取它的 message，其余走 `String()`。
 */
function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * 会话作用域的画板面板：工具栏 + 双层 canvas。
 * @param props - 框架给的运行时份额、注入面与 `t`。
 * @returns 面板元素。
 */
export function BlackboardPanel({ t, useScene, draw, ask }: BlackboardPanelProps): JSX.Element {
  const [style, setStyle] = useState<BoardStyle>(DEFAULT_STYLE)
  const [status, setStatus] = useState('')
  const scene = useScene((snapshot) => snapshot)
  const host = useRef<HTMLDivElement | null>(null)
  const canvas = useRef<CanvasHandle | null>(null)
  /** 面板自己最后画上的元素，撤销只撤它。 */
  const lastAdded = useRef<string | undefined>(undefined)

  /**
   * 提交一批命令。失败只写状态行：画板不发消息，没有乐观更新可回滚，而漏掉这条
   * 会让"画一笔"变成控制台里的未捕获 rejection。
   * @param commands - 要追加的命令。
   * @returns 无。
   */
  const submit = (commands: readonly DrawCommand[]): void => {
    void draw(commands).then(
      (added) => { lastAdded.current = added[added.length - 1] },
      (error: unknown) => { setStatus(t('status.failed', { reason: describe(error) })) },
    )
  }

  /** 画布回调读这一份，避免每次改工具都重挂画布。 */
  const latest = useRef({ style, submit, prompt: t('tool.textPrompt') })

  useEffect(() => {
    latest.current = { style, submit, prompt: t('tool.textPrompt') }
  })

  useEffect(() => {
    const container = host.current
    if (container === null) return undefined
    const handle = mountCanvas(container, {
      style: () => latest.current.style,
      askText: () => window.prompt(latest.current.prompt),
      onCommand: (command) => { latest.current.submit([command]) },
    })
    canvas.current = handle
    return () => {
      canvas.current = null
      handle.dispose()
    }
  }, [])

  useEffect(() => {
    canvas.current?.update(scene)
  }, [scene])

  const elements = scene.elements.reduce((count, element) => (element.isDeleted ? count : count + 1), 0)

  const undo = (): void => {
    const id = lastAdded.current
    if (id === undefined) return
    lastAdded.current = undefined
    submit([{ op: 'erase', ids: [id] }])
  }

  const clear = (): void => {
    lastAdded.current = undefined
    submit([{ op: 'clear' }])
  }

  const send = async (): Promise<void> => {
    const handle = canvas.current
    if (handle === null) return
    try {
      const result = await ask(await handle.toPng(), t('send.message'))
      setStatus(result.ok ? t('send.sent') : t('send.failed', { reason: result.reason }))
    } catch (error: unknown) {
      // ask 只在 PNG 编码失败或远程调用装配故障时抛；两者都要让用户看见。
      setStatus(t('send.failed', { reason: describe(error) }))
    }
  }

  return (
    <div style={{
      display: 'flex',
      // 侧栏的 panelBody 是 row 方向的 flex 容器，根节点得自己撑开宽高（终端同理）。
      flex: '1 1 auto',
      flexDirection: 'column',
      height: '100%',
      minWidth: 0,
      minHeight: 0,
      background: 'var(--dsw-alias-bg-base, #ffffff)',
      color: 'var(--dsw-alias-label-primary, #1e1e1e)',
      font: 'inherit',
    }}
    >
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 4,
        padding: '6px 8px',
        borderBottom: '1px solid var(--dsw-alias-border-l1, #e5e5e5)',
      }}
      >
        {TOOLS.map((entry) => (
          <button
            key={entry.tool}
            type="button"
            title={t(entry.key)}
            aria-pressed={style.tool === entry.tool}
            onClick={() => { setStyle({ ...style, tool: entry.tool }) }}
            style={BUTTON}
          >
            {entry.glyph}
          </button>
        ))}
        {PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            title={color}
            aria-pressed={style.color === color}
            onClick={() => { setStyle({ ...style, color }) }}
            style={{ ...BUTTON, background: color, padding: 0 }}
          />
        ))}
        {WIDTHS.map((width) => (
          <button
            key={width}
            type="button"
            aria-pressed={style.width === width}
            onClick={() => { setStyle({ ...style, width }) }}
            style={BUTTON}
          >
            {String(width)}
          </button>
        ))}
        <button type="button" onClick={undo} style={BUTTON}>{t('action.undo')}</button>
        <button type="button" onClick={clear} style={BUTTON}>{t('action.clear')}</button>
        <button type="button" onClick={() => { void send() }} style={BUTTON}>{t('action.send')}</button>
        <span style={{ marginLeft: 'auto', opacity: 0.7 }}>{t('status.elements', { count: elements })}</span>
      </div>
      <div ref={host} style={{ position: 'relative', flex: '1 1 auto', minHeight: 0 }} />
      {status === '' ? null : <div style={{ padding: '4px 8px', opacity: 0.8 }}>{status}</div>}
    </div>
  )
}
