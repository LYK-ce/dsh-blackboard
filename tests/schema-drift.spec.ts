// `DrawCommand` 是纯类型，运行时被擦除；`blackboard_draw` 的参数 schema 是手写的对象字面量。
// 两者各写一遍，就只能靠本 spec 把它们钉在一起：类型侧用 TypeScript 编译器 API 读源码，
// schema 侧读 `createDrawTool` 真实编译出来的 `parameters`。
//
// 缺陷背景：schema 曾经漏了 `rect`/`circle` 的 `fill` 与 `text` 的 `align`，
// 模型带上这些字段时 `defineTool` 的 exactly-one `oneOf` 校验会直接抛 `INVALID_ARGS`，
// 而聚合后的消息只说"没匹配上任何一支"，看不出少了哪个字段。
//
// 覆盖范围：**字段名集合、必填性、`additionalProperties`** 三者双向相等，外加"未被镜像的支"
// 的显式豁免表。它**不**比属性的取值类型、enum 成员、嵌套对象的结构——那三样由
// `tests/tool.spec.ts` 的行为测试兜底（`fill` 必须是字符串、align 的三个枚举值各有一条落地
// 断言、点对象缺字段会被拒；实测把 enum 收成两个值时，只有那条落地断言会红）。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'
import ts from 'typescript'
import { createDrawTool } from '../host/tool.ts'
import { BoardStore } from '../host/store.ts'

/** 本仓库根目录：本 spec 位于 tests/ 下。 */
const ROOT = resolve(import.meta.dirname, '..')

/** 刻意不镜像给模型的类型支，每项都要写清理由。 */
const UNMIRRORED_ARMS: readonly { readonly op: string; readonly reason: string }[] = [
  {
    op: 'clear',
    reason: '它能一次抹掉人与 agent 的全部笔迹，`host/tool.ts` 的 COMMAND 注释与 README「已知限制」都写明刻意不开放给模型',
  },
]

/** 类型侧解析出的一支命令。 */
interface TypeArm {
  /** `op` 的字符串字面量，也是与 schema 支配对的键。 */
  readonly op: string
  /** 该支的全部属性名，声明顺序。 */
  readonly properties: readonly string[]
  /** 没有 `?` 的属性名，声明顺序。 */
  readonly required: readonly string[]
}

/** schema 侧一个属性的形状；这里只关心 `op` 的 `const`。 */
interface SchemaProperty {
  readonly const?: unknown
}

/** schema 侧一支 oneOf 分支。 */
interface SchemaBranch {
  readonly properties?: Readonly<Record<string, SchemaProperty>>
  readonly required?: readonly string[]
  readonly additionalProperties?: unknown
}

/** schema 侧整份参数 schema 里本 spec 用到的部分。 */
interface SchemaParameters {
  readonly properties?: {
    readonly commands?: {
      readonly items?: { readonly oneOf?: readonly SchemaBranch[] }
    }
  }
}

/**
 * 读 `DrawCommand` 类型别名并拆出每一支。
 * @returns 每支的 `op`、属性名与必填属性名。
 */
function parseTypeArms(): readonly TypeArm[] {
  const file = resolve(ROOT, 'core/commands.ts')
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  const alias = source.statements.find(
    (statement): statement is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(statement) && statement.name.text === 'DrawCommand',
  )
  if (alias === undefined) assert.fail('core/commands.ts 里找不到 DrawCommand 类型别名')
  const union = alias.type
  if (!ts.isUnionTypeNode(union)) assert.fail('DrawCommand 不再是一个联合类型，解析器读不到各支')

  return union.types.map((member, index) => {
    if (!ts.isTypeLiteralNode(member)) {
      assert.fail(`DrawCommand 第 ${index} 支不是对象字面量类型，解析器读不到属性`)
    }
    const properties: string[] = []
    const required: string[] = []
    let op: string | undefined
    for (const node of member.members) {
      if (!ts.isPropertySignature(node)) assert.fail(`DrawCommand 第 ${index} 支里有非属性成员`)
      if (!ts.isIdentifier(node.name) && !ts.isStringLiteral(node.name)) {
        assert.fail(`DrawCommand 第 ${index} 支里有解析不了名字的属性`)
      }
      const name = node.name.text
      properties.push(name)
      if (node.questionToken === undefined) required.push(name)
      if (name !== 'op') continue
      const type = node.type
      if (type === undefined || !ts.isLiteralTypeNode(type) || !ts.isStringLiteral(type.literal)) {
        assert.fail(`DrawCommand 第 ${index} 支的 op 不是字符串字面量，无法与 schema 支配对`)
      }
      op = type.literal.text
    }
    if (op === undefined) assert.fail(`DrawCommand 第 ${index} 支没有 op 属性`)
    return { op, properties, required }
  })
}

/**
 * 读真实编译产物里 `blackboard_draw` 的 oneOf 分支。
 * @returns 每支的 `op`、属性名、必填属性名与 `additionalProperties`。
 */
function parseSchemaArms(): readonly (TypeArm & { readonly additionalProperties: unknown })[] {
  const tool = createDrawTool(new BoardStore(tmpdir()))
  const parameters = tool.parameters as SchemaParameters
  const arms = parameters.properties?.commands?.items?.oneOf
  if (arms === undefined) assert.fail('blackboard_draw 的参数 schema 里没有 commands.items.oneOf')

  return arms.map((branch, index) => {
    const properties = branch.properties
    if (properties === undefined) assert.fail(`schema 第 ${index} 支没有 properties`)
    const op = properties['op']?.const
    if (typeof op !== 'string') assert.fail(`schema 第 ${index} 支的 op.const 不是字符串`)
    return {
      op,
      properties: Object.keys(properties),
      required: branch.required === undefined ? [] : [...branch.required],
      additionalProperties: branch.additionalProperties,
    }
  })
}

test('schema 漂移守卫：两侧都解析出了完整的支，守卫不是哑弹', () => {
  const typeArms = parseTypeArms()
  const schemaArms = parseSchemaArms()

  // 支数是对"提取器还有效"的断言：改了写法（换成 interface 再联合、包一层映射类型）
  // 而让类型侧读到空集时，这里必须红，而不是"两边都空所以通过"。
  assert.equal(typeArms.length, 8, `类型侧应解析出 8 支 DrawCommand，实际 ${typeArms.length} 支`)
  assert.equal(schemaArms.length, 7, `schema 侧应有 7 支 oneOf，实际 ${schemaArms.length} 支`)

  const typeOps = typeArms.map((arm) => arm.op)
  const schemaOps = schemaArms.map((arm) => arm.op)
  assert.equal(new Set(typeOps).size, typeOps.length, '类型侧出现了重复的 op')
  assert.equal(new Set(schemaOps).size, schemaOps.length, 'schema 侧出现了重复的 op')
  assert.deepEqual(schemaOps.toSorted(), typeOps.filter((op) => op !== 'clear').toSorted())

  // `clear` 只有 op 一个属性，所以这里对它只要求"非空"；其余每支至少两个属性。
  // 单属性的支若被提取器读成空集，下面这条会立刻红。
  const unmirroredOps = new Set(UNMIRRORED_ARMS.map((entry) => entry.op))
  for (const arm of typeArms) {
    const floor = unmirroredOps.has(arm.op) ? 1 : 2
    assert.ok(
      arm.properties.length >= floor,
      `类型支 ${arm.op} 只解析出 ${arm.properties.length} 个属性（应 ≥${floor}），提取器可能已退化`,
    )
  }
})

test('schema 漂移守卫：每支的属性名集合与类型双向相等', () => {
  const typeByOp = new Map(parseTypeArms().map((arm) => [arm.op, arm]))

  for (const arm of parseSchemaArms()) {
    const typed = typeByOp.get(arm.op)
    assert.ok(typed !== undefined, `schema 有类型里没有的支：${arm.op}`)

    const missing = typed.properties.filter((name) => !arm.properties.includes(name))
    assert.deepEqual(
      missing,
      [],
      `schema 支 ${arm.op} 缺了类型里有的属性（模型带上就会被 oneOf 拒掉）：${missing.join(', ')}`,
    )
    const extra = arm.properties.filter((name) => !typed.properties.includes(name))
    assert.deepEqual(
      extra,
      [],
      `schema 支 ${arm.op} 有类型里没有的属性（等于承诺一件没实现的事）：${extra.join(', ')}`,
    )
  }
})

test('schema 漂移守卫：每支的必填集合与类型一致', () => {
  const typeByOp = new Map(parseTypeArms().map((arm) => [arm.op, arm]))

  for (const arm of parseSchemaArms()) {
    const typed = typeByOp.get(arm.op)
    assert.ok(typed !== undefined, `schema 有类型里没有的支：${arm.op}`)
    assert.deepEqual(
      arm.required.toSorted(),
      typed.required.toSorted(),
      `schema 支 ${arm.op} 的必填集合与类型不一致`,
    )
  }
})

test('schema 漂移守卫：每支都关掉了 additionalProperties', () => {
  for (const arm of parseSchemaArms()) {
    assert.equal(arm.additionalProperties, false, `schema 支 ${arm.op} 没有关掉 additionalProperties`)
  }
})

test('schema 漂移守卫：没被镜像的支恰好是显式排除表，且每项都带理由', () => {
  const typeOps = parseTypeArms().map((arm) => arm.op)
  const schemaOps = new Set(parseSchemaArms().map((arm) => arm.op))

  const unmirrored = typeOps.filter((op) => !schemaOps.has(op)).toSorted()
  assert.deepEqual(
    unmirrored,
    UNMIRRORED_ARMS.map((entry) => entry.op).toSorted(),
    '类型里有、schema 里没有的支与显式排除表对不上：新加一支 op 就必须同时加 schema 支，或在这里写下豁免理由',
  )
  for (const entry of UNMIRRORED_ARMS) {
    assert.ok(entry.reason.trim().length > 0, `排除表里的 ${entry.op} 没有写理由`)
  }
  assert.equal(
    new Set(UNMIRRORED_ARMS.map((entry) => entry.op)).size,
    UNMIRRORED_ARMS.length,
    '排除表里有重复的 op',
  )
})
