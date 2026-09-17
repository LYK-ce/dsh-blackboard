/** 画板面板的文案字典。 */

/** 命名空间。 */
export const NS = 'blackboard'

/** 简体中文字典，键集的事实来源。 */
export const zh = {
  'view.board': '画板',
  'guide.description': '在这一栏里和 agent 一起画画',
  'tool.pen': '手绘',
  'tool.line': '直线',
  'tool.arrow': '箭头',
  'tool.rect': '矩形',
  'tool.circle': '圆',
  'tool.text': '文字',
  'tool.textPrompt': '文字内容',
  'action.undo': '撤销上一笔',
  'action.clear': '清空',
  'action.send': '发给 agent',
  'send.message': '这是我画的黑板。',
  'send.sent': '已发给 agent。',
  'send.failed': '发送失败：{reason}',
  'status.failed': '操作失败：{reason}',
  'status.elements': '画板上有 {count} 个元素',
} satisfies Record<string, string>

/** 画板命名空间的键集。 */
export type BlackboardKey = keyof typeof zh

/** 英文字典，按 zh 的键集校验完整性。 */
export const en = {
  'view.board': 'Blackboard',
  'guide.description': 'Draw on a board shared with the agent',
  'tool.pen': 'Freehand',
  'tool.line': 'Line',
  'tool.arrow': 'Arrow',
  'tool.rect': 'Rectangle',
  'tool.circle': 'Circle',
  'tool.text': 'Text',
  'tool.textPrompt': 'Text to place',
  'action.undo': 'Undo last stroke',
  'action.clear': 'Clear',
  'action.send': 'Send to agent',
  'send.message': 'This is what I drew on the blackboard.',
  'send.sent': 'Sent to the agent.',
  'send.failed': 'Send failed: {reason}',
  'status.failed': 'Failed: {reason}',
  'status.elements': 'The board has {count} element(s)',
} satisfies Record<BlackboardKey, string>
