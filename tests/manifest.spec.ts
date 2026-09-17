import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

/** 本插件目录。 */
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

/** 仓库根；本插件是仓库内的"仓库外插件"，所以它一定存在。 */
const REPO = resolve(ROOT, '..', '..')

/** 模块表基线的事实来源：shell 静态播种的那张表。 */
const PLATFORM_MODULES_FILE = join(REPO, 'packages', 'client', 'web', 'src', 'platform.ts')

/**
 * 读一个 JSON 文件。
 * @param path - 文件路径。
 * @returns 解析后的值。
 */
function readJson(path: string): Record<string, never> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, never>
}

/**
 * 从一个文件里抽出一段数组字面量中的字符串项。
 * @param text - 文件内容。
 * @param name - 数组常量名。
 * @returns 其中的字符串字面量；找不到该常量时 undefined。
 */
function stringArrayOf(text: string, name: string): string[] | undefined {
  const body = new RegExp(`${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`).exec(text)?.[1]
  if (body === undefined) return undefined
  return [...body.matchAll(/'([^']+)'/g)].map((match) => match[1] as string)
}

/** 本包的 manifest。 */
const manifest = readJson(join(ROOT, 'package.json')) as unknown as {
  readonly name: string
  readonly exports: Record<string, string>
  readonly dsh?: { readonly client?: { readonly platform?: string } }
}

/** 客户端产物的相对路径。 */
const CLIENT_EXPORT = manifest.exports['./client'] as string

test('manifest：dsh.client 声明为 web，且 ./client 导出指向已构建的产物', () => {
  assert.equal(typeof manifest.name, 'string')
  assert.notEqual(manifest.name, '')
  assert.equal(manifest.dsh?.client?.platform, 'web')
  assert.equal(typeof CLIENT_EXPORT, 'string')
  // loader 扫描这个包靠的是 exports["./client"] 指向的真实文件；没有它会在启动时就失败。
  assert.ok(existsSync(join(ROOT, CLIENT_EXPORT)), `${CLIENT_EXPORT} does not exist`)
})

test('bundle：以 package.json 的 name 作为模块表 id 注册', () => {
  const bundle = readFileSync(join(ROOT, CLIENT_EXPORT), 'utf8')
  const registered = /__ModuleLoader__\.load\(\{\s*id:\s*"([^"]+)",\s*factory:/.exec(bundle)
  assert.ok(registered !== null, 'bundle does not register a module-table factory')
  // 两个 id 必须一致，否则 modules 宿主半侧会 serve 一份没人认领的 bundle。
  assert.equal(registered[1], manifest.name)
})

test('bundle：只 require 模块表基线，不夹带任何 workspace 包', () => {
  const bundle = readFileSync(join(ROOT, CLIENT_EXPORT), 'utf8')
  const required = new Set([...bundle.matchAll(/require\("([^"]+)"\)/g)].map((match) => match[1] as string))
  assert.ok(required.size > 0, 'bundle requires nothing at all — React should be an external')

  const baseline = existsSync(PLATFORM_MODULES_FILE)
    ? stringArrayOf(readFileSync(PLATFORM_MODULES_FILE, 'utf8'), 'PLATFORM_MODULES')
    // 插件被复制到 checkout 之外时，退回自建打包脚本里那份 external 清单。
    : stringArrayOf(readFileSync(join(ROOT, 'build', 'build-client.mjs'), 'utf8'), 'BASELINE')
  assert.ok(baseline !== undefined, 'neither the shell baseline nor the bundler baseline was readable')

  for (const specifier of required) {
    assert.ok(
      baseline.includes(specifier),
      `bundle requires "${specifier}", which the module-table baseline does not supply`,
    )
  }
})

test('overlay：只插一行，指向本目录里真实存在的 host 入口', () => {
  const overlay = readFileSync(join(ROOT, 'blackboard.cordis.yml'), 'utf8')

  const ids = [...overlay.matchAll(/^\s*(?:-\s*)?id:\s*(\S+)\s*$/gm)].map((match) => match[1] as string)
  const names = [...overlay.matchAll(/^\s*name:\s*'([^']+)'\s*$/gm)].map((match) => match[1] as string)
  assert.deepEqual(ids, ['blackboard-host'])
  assert.equal(names.length, 1)

  const entry = names[0] as string
  // 相对路径由 app-boot 锚成本 patch 文件所在目录；换成裸包名就要求 node 解析能命中，
  // 那正是这个插件不依赖的东西。
  assert.match(entry, /^\.\.?\//)
  assert.ok(existsSync(resolve(ROOT, entry)), `${entry} does not exist next to the overlay`)
})
