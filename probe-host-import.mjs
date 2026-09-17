/**
 * 探测：Loader 用 tsx 加载 host 半边时，包名导入（@deepseek-ai/dsh-tools 等）
 * 能否解析——tsx 会读本目录 tsconfig.json，独立仓库里这些包来自 node_modules。
 *
 * 用法（在仓库根跑，tsx 才在解析范围内）：
 *   node --import tsx/esm probe-host-import.mjs
 */
const entry = new URL('./host/index.ts', import.meta.url).href

try {
  const host = await import(entry)
  console.log('host entry imported OK:', Object.keys(host).toSorted().join(', '))
  console.log('apply is a function:', typeof host.apply === 'function')
  console.log('inject:', JSON.stringify(host.inject))
} catch (error) {
  console.error('HOST IMPORT FAILED:', error instanceof Error ? error.message : error)
  process.exitCode = 1
}
