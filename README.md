# dsh-blackboard —— DeepSeek Harness 的人机共享画板

人和 agent 共享一块画板：人在面板上画，agent 用 `blackboard_draw` 工具画，双方都看得见，刷新页面后还在。

这是一个独立的 dsh 插件包：node 半边（`host/`）注册 `blackboard_draw` 工具与两条 exact Fetch 路由，浏览器半边（`client/`）在**右侧栏**提供画板视图。挂载只靠一份 cordis overlay 里的一行，不改动 dsh 自身的任何文件。

## 要求

- 一份 DeepSeek Harness（`dsh`）0.1.6-alpha.1 版本线的 checkout，或同版本的 `@deepseek-ai/dsh` 安装
- Node `^22.19 || >=24`、pnpm

## 安装

```sh
git clone <this repo> dsh-blackboard
cd dsh-blackboard
pnpm install
pnpm run build      # 产出 lib/client.js —— 挂载前必须存在
```

本仓库自带一份 `pnpm-workspace.yaml`（只有一个包，主要用来放 pnpm 设置），所以即使把它放在
某个 dsh checkout 内部，它也是一个独立的 workspace root，直接 `pnpm install` 就行。

## 挂载

host 半边由 tsx 直接跑 `.ts` 源码，所以用源码启动的 `dsh`：

```powershell
pnpm dsh web --patch <本仓库路径>/blackboard.cordis.yml --port 8081 --no-open
```

> **`--patch` 必须写在应用自己的 flag 之前。** `dsh` 启动器只解析自己的 flag，遇到第一个
> 不认识的 token（例如 `--port`）就把后面**全部**原样交给 web 应用；写在后面会被应用当成
> 未知选项报 `error: unknown option '--patch'`。
> （`dsh web --patch X --port 8081 --no-open` ✅；`dsh web --port 8081 --patch X` ❌。）

打开 `http://127.0.0.1:8081`，点右侧栏的 **+**，在 guide 里选「画板」，即可开一个画板标签页（和终端、文件预览并列，按会话记忆）。模型那一侧的工具目录里会多出 `blackboard_draw`。

## 用法

- 画布上手势：左键画（工具栏切换工具、颜色、线宽），**中键拖拽平移视野**，**滚轮缩放**。缩放下限就是整块板刚好铺满画布，缩到底自动回中；拖侧栏边改变容器尺寸时，缩放倍数与视野中心都保留。
- 「撤销上一笔 / 清空」只作用于人自己最后一次手势；模型可以自己用 `erase` 纠错。
- 「发给 agent」把场景层导成 PNG，作为一条普通用户消息发出去——导出的是**当前视野**，不是整块板。
- 随图发出去的那句话取自输入栏：**输入栏里有字就用它，没有就用「这是我画的黑板。」这句默认话**；发送成功后输入栏会被清空。输入栏里挂着的附件**不会**跟着走（原因见「已知限制」）。

## 目录

```
blackboard.cordis.yml   overlay：只插一条 host 行，行名是相对路径
package.json            dsh.client 声明 + exports["./client"]，bundle id 必须等于包名
core/                   零依赖纯 TypeScript：命令、场景、渲染、简化、视口
shared/                 ops 流（SceneOp / applyOps / opsFromCommands）与 wire 协议
host/                   插件宿主半边：index / store / routes / tool
client/                 浏览器半边：index / panel / canvas / source / locale
build/build-client.mjs  esbuild → lib/client.js（模块表 lazy-CJS 协议）
tests/                  node:test 单测（61 例）
lib/client.js           构建产物，**启动前必须存在**
probe-host-import.mjs   探测 Loader 用 tsx 加载 host 半边时包名导入能否解析
```

## 数据流

```
人（工具栏手势）─┐
                ├─→ DrawCommand[] ─→ POST /api/blackboard.ops ─→ BoardStore（唯一分配 id）
agent（工具调用）┘                                                  │
                                                                    ↓
                            GET /api/blackboard.scene?since=<rev> ← ops 流
                                                                    │
                                                          浏览器按 revision 增量折叠
```

- **真相在 `$DSH_HOME/blackboard/<sessionId>.jsonl`**（append-only，每会话一份），不写 session log。原因见下。
- 两条 exact Fetch route 由 `ctx.connection.fetch.register` 注册，页面用普通 `fetch('/api/blackboard.*')` 访问——不生成任何代码，也不碰 Typert。
- 追加串行化在 `BoardStore` 的一条队列里：整个"折命令 → 分配 id → 落盘 → 改内存"是一段临界区，所以人和 agent 同时画不会撞 id。客户端不做乐观追加，只按 host 回来的 revision 增量拼接。
- 两半之间只有这两条 HTTP 路由：`host/` 与 `client/` 互相没有任何 import，`core/` 与 `shared/` 才是两边共用的代码（`core` ← `shared` ← 两半）。

## 开发与验证

```sh
pnpm run verify   # = typecheck && test && build && probe
```

| 命令 | 作用 |
|---|---|
| `pnpm run typecheck` | host / client 两个 program 各自 `tsc --noEmit`，各自解析自己那半的 `@deepseek-ai/*` 类型 |
| `pnpm run test` | `node --import tsx/esm --test tests/*.spec.ts`，61 例 |
| `pnpm run build` | esbuild 打 `lib/client.js`（改动客户端代码后必须重跑，没有 HMR） |
| `pnpm run probe` | 验证 Loader 用 tsx 加载 `host/index.ts` 时 `@deepseek-ai/dsh-*` 包名导入能解析 |

**改完客户端代码必须 `pnpm run build` 再刷新页面**：dsh 的 registry serve 的是 `lib/client.js`，不是源码。

## 版本对齐

`@deepseek-ai/dsh-*` 全部钉在 `0.1.6-alpha.1`，`@deepseek-ai/cordis` 是 peer `^4.0.2`——也就是本插件实测通过的那条版本线。dsh 的公开 API 目前是 pre-stable 的，升级 dsh 时请把这一组依赖一起升，不要混版本。

devDependencies 里那一长串 `@deepseek-ai/dsh-client-*` 不是装饰：dsh 的客户端能力靠 TypeScript 声明合并挂在 `Context` 上（例如 `ctx.sessions` 由 `@deepseek-ai/dsh-api-session-controller/client` 声明，`ctx.slots` 由 `dsh-client-ui-slots` 声明），而发布出去的包里这些兄弟包只写在 **devDependencies**，不会跟着装进来。加上 `skipLibCheck: true` 会把 d.ts 里解析不到的 import 静默掉，少一个包的表现就是"某个 `ctx.xxx` 突然不存在"。所以：**用到哪个服务的类型，就把它所属的包显式写进 devDependencies**。

## 已验证

在一条全新的独立安装上（`pnpm install` → `pnpm run verify`，不依赖任何 dsh checkout）：

- `pnpm run typecheck` 零错误——两个 program 都是对着 npm 上发布的 `0.1.6-alpha.1` 类型编译的；
- `pnpm run test` **61/61** 通过；
- `pnpm run build` 产出 `lib/client.js`（`pnpm run verify` 里 build 排在 test 前面：`tests/manifest.spec.ts` 检查的是构建产物，全新 clone 上先 test 会 ENOENT）；
- `pnpm run probe` 确认 tsx 能解析 host 半边的包名导入。

浏览器里的行为在开发机上实测过：右侧栏 `+` 菜单出现「画板」、能画、刷新后还在；agent 调用 `blackboard_draw` 后图形出现在板上；「发给 agent」后模型能描述画面。

## 已知限制

- **不写 session log。** 画板真相是 `$DSH_HOME/blackboard/<sessionId>.jsonl`：仓库外插件的事件类型不在 dsh 的 `KNOWN_SESSION_EVENT_TYPES` 里，未知事件只在标了 `ignorable` 时被保留——所以在"不改 dsh 仓库"的前提下拿不到投影 / 分叉 / 回放语义。想要那些语义，得把本插件做进 `packages/`（官方仓库目前不接受外部 PR）。
- **输入栏里的附件带不走。** 「发给 agent」只借输入栏的**文字**。草稿附件的解析与序列化全在 ui-conversation 内部：`IConversation` 只暴露 `input` / `blocks` / `send` / `updateQueue` / `cancel` / `loadOlder`，`serializeDraftAttachments` 之类只作为 composer 附件槽（`kind: 'single'`，已被 ui-attachment 占用）的 owner prop 存在，仓库外插件没有公开的路读它们。所以附件会留在输入栏，发送成功后的状态行会告诉你漏了几个。
- **1 秒轮询**，不是推送：agent 画完到人看见最多 1s，空闲时每秒一次请求。
- **磁盘 ops 文件没有清理策略**：会话画得越多文件越大，且删会话不会删这个文件。
- **工具 7 支**（`line`/`arrow`/`rect`/`circle`/`text`/`stroke`/`erase`）：`clear` 不开放给模型——它会一次抹掉人与 agent 的全部笔迹。
- **不用 CSS Modules**：自建打包不含 dsh 仓库的样式注入，面板只用内联 style + `--dsw-*` 变量。
- **工具注册在 host 平面**，所有 preset（含 `minimal`）的模型工具目录里都会出现 `blackboard_draw`。
- **路由只做结构校验**：`sessionId` 由页面提供，只要通过 `/api` 的浏览器信任围栏就能读写对应画板；本地单用户场景可接受，多用户部署则不行。

## 发布

- 给这个 GitHub 仓库加上 [`dsh-plugin`](https://github.com/topics/dsh-plugin) 话题——这是官方 README 指定的发现渠道。
- 要发 npm 的话：`package.json` 里的 `name` / `version` / `repository` 自定，发布前跑 `pnpm run verify && pnpm run build`（`lib/` 是发布产物，被 `.gitignore` 忽略但列在 `files` 里）。
- `LICENSE` 里的版权人占位符记得填。
