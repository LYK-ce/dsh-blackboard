import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import type { DrawCommand } from '../core/commands.ts'
import { createDrawTool } from '../host/tool.ts'
import { BoardStore } from '../host/store.ts'

/** 一条最小直线命令。 */
const LINE: DrawCommand = { op: 'line', from: { x: 0, y: 0 }, to: { x: 10, y: 10 }, color: '#000000', width: 2 }

/** 工具执行上下文里本插件真正用到的那一部分：当前 agent 的会话。 */
type Exec = Parameters<ReturnType<typeof createDrawTool>['execute']>[1]

/**
 * 造一个指向指定会话的执行上下文。
 * @param sessionId - 工具应当画到哪块板子上；不传表示没有 agent（无会话）。
 * @returns 执行上下文替身。
 */
function execFor(sessionId?: string): Exec {
  const agent = sessionId === undefined ? undefined : { session: { id: sessionId } }
  return { agent } as unknown as Exec
}

/**
 * 造一个只有本次测试用的画板存储。
 * @param run - 收到存储的测试体。
 * @returns 测试体跑完后清理磁盘。
 */
async function withStore(run: (store: BoardStore) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'blackboard-tool-'))
  const store = new BoardStore(dir)
  try {
    await run(store)
  } finally {
    await store.dispose()
    await rm(dir, { recursive: true, force: true })
  }
}

test('工具定义：名字、坐标系描述与七支 oneOf 命令', () => {
  const tool = createDrawTool(new BoardStore(tmpdir()))

  assert.equal(tool.name, 'blackboard_draw')
  assert.match(tool.description, /Virtual board coordinates run 0\.\.1000 on both axes, y downward\./)

  const parameters = tool.parameters as {
    readonly type?: string
    readonly additionalProperties?: boolean
    readonly properties?: Record<string, { readonly type?: string; readonly items?: { readonly oneOf?: readonly Record<string, unknown>[] } }>
    readonly required?: readonly string[]
  }
  assert.equal(parameters.type, 'object')
  assert.deepEqual(parameters.required, ['commands'])

  const arms = parameters.properties?.commands?.items?.oneOf
  assert.equal(arms?.length, 7)
  const ops = arms?.map((arm) => {
    const properties = arm['properties'] as Record<string, { readonly const?: string }> | undefined
    return properties?.['op']?.const
  })
  assert.deepEqual(ops?.toSorted(), ['arrow', 'circle', 'erase', 'line', 'rect', 'stroke', 'text'])
})

test('工具执行：把命令画进当前会话并回报新增 id 与元素数', async () => {
  await withStore(async (store) => {
    const result = await createDrawTool(store).execute({ commands: [LINE] }, execFor('session-tool'))

    assert.deepEqual(result, { added: ['e0'], elements: 1 })
    assert.deepEqual((await store.scene('session-tool' as never)).elements.map((element) => element.id), ['e0'])
  })
})

test('工具执行：一次多支命令的 id 单调、元素数按未删除计', async () => {
  await withStore(async (store) => {
    const tool = createDrawTool(store)
    const first = await tool.execute({ commands: [LINE, LINE] }, execFor('session-many'))
    assert.deepEqual(first, { added: ['e0', 'e1'], elements: 2 })

    // 擦掉一个之后，元素数只算没被软删除的。
    const erased = await store.append('session-many' as never, [{ op: 'erase', ids: ['e0'] }])
    assert.deepEqual(erased.ops, [{ op: 'patch', id: 'e0', isDeleted: true }])
    const second = await tool.execute({ commands: [LINE] }, execFor('session-many'))
    assert.deepEqual(second, { added: ['e2'], elements: 2 })
  })
})

test('工具执行：没有 agent 会话时抛错，不静默画到别处', async () => {
  await withStore(async (store) => {
    await assert.rejects(
      createDrawTool(store).execute({ commands: [LINE] }, execFor()),
      /blackboard_draw: the tool ran without an agent session/,
    )
  })
})

test('工具执行：不合法参数在进入 execute 之前就被 schema 挡住', async () => {
  await withStore(async (store) => {
    const tool = createDrawTool(store)
    await assert.rejects(tool.execute({ commands: [{ op: 'nope' }] }, execFor('session-bad')))
    assert.deepEqual(await store.read('session-bad' as never, 0), { revision: 0, ops: [] })
  })
})
