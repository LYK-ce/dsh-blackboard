# dsh-blackboard —— DeepSeek Harness 的人机共享画板

人和 agent 共享一块画板：人在面板上画，agent 用 `blackboard_draw` 工具画，双方都看得见，刷新页面后还在。

这是一个独立的 dsh 插件包：node 半边（`host/`）注册 `blackboard_draw` 工具与两条 exact Fetch 路由，浏览器半边（`client/`）在**右侧栏**提供画板视图。安装只需要一条命令——包里的 `dsh.bundle.patch` 指向那份 cordis overlay，overlay 里只插一行，不改动 dsh 自身的任何文件。

## 要求

- 一份 DeepSeek Harness（`dsh`）0.2.1-alpha.1 版本线的 checkout，或同版本的 `@deepseek-ai/dsh` 安装
- Node `^22.19 || >=24`、pnpm

## 安装

本包同时声明了 `dsh.bundle.patch`（指向 `blackboard.cordis.yml`）与 `dsh.client`，所以它是一份**能直接装进 profile 的 bundle**：装完之后 dsh 自己按这份 overlay 接上 host 半边与浏览器半边，不需要手写 `--patch`。

用 GUI 的插件管理器装，或者走同一条路的命令行：

```sh
dsh plugin --profile <profile> add <spec>
```

`<spec>` 有三种形态：

| spec | 例 | 说明 |
|---|---|---|
| 本地路径 | `C:\src\dsh-blackboard`、`/src/dsh-blackboard`、`file:C:\src\dsh-blackboard` | 开发时就地用。**GUI 里必须填绝对路径**——Host 的工作目录对浏览器里输入的人没有意义，相对路径会被拒；**同一条 CLI 命令会把相对路径按调用方的当前目录锚成绝对路径**，所以 `dsh plugin --profile demo add ./dsh-blackboard` 和官方教程 `add ./hello-plugin` 一样可用 |
| git | `github:LYK-ce/dsh-blackboard` | 一般用户走这条：pnpm 直接打包远端仓库，**不跑任何构建** |
| npm | `dsh-blackboard` | 还没发；发出去以后与 git 一样，产物必须随包走 |

> `dsh.client` 一旦声明，`@deepseek-ai/dsh-client-modules` 会在启动时 `readFileSync` `exports["./client"]` 指向的那个文件；缺了就是 `MissingClientBundleError`，整个 `dsh web` 起不来。所以 **`lib/client.js` 进版本库**（`.gitignore` 用 `lib/*` + `!lib/client.js` 白名单放行它），改了 `client/` 下的源码必须 `pnpm run build` 并把产物一起提交。这条对 git 装法尤其关键：pnpm 只打包仓库里有的东西，产物入库后**安装路径上没有任何构建步骤**——装的人不用跑构建，`pnpm-workspace.yaml` 里也不会多出一个待决定的构建脚本。本包因此刻意不放 `prepare`：留一个只会给每次安装加一道没有收益的构建审批。

想改这个插件本身，在 checkout 里 clone + 构建：

```sh
git clone <this repo> dsh-blackboard
cd dsh-blackboard
pnpm install
pnpm run build      # 产出 lib/client.js
```

本仓库自带一份 `pnpm-workspace.yaml`（只有一个包，主要用来放 pnpm 设置），所以即使把它放在
某个 dsh checkout 内部，它也是一个独立的 workspace root，直接 `pnpm install` 就行。

## 挂载

挂载就是 `dsh.bundle.patch` 那一行：`blackboard.cordis.yml` 里只插一条 host 行。行名写成相对路径，app-boot 的 `anchorInsertedPluginNames` 会把它锚成该文件所在目录的 `file://` URL，换机器、换 checkout 位置都不用改；`@deepseek-ai/dsh-client-modules` 再按**行名**找到最近的 `package.json`（这里是同目录的 `package.json`），读它的 `dsh.client` 与 `exports["./client"]`，把 `lib/client.js` 作为动态客户端 bundle serve 出去——所以一条行就够，不需要第二条。

**开发时**可以绕过 profile，让源码启动的 `dsh` 直接吃这份 overlay（源码启动的 host 半边由 tsx 直接跑 `.ts` 源码）：

```powershell
pnpm dsh web --patch <本仓库路径>/blackboard.cordis.yml --port 8081 --no-open
```

> **`--patch` 必须写在应用自己的 flag 之前。** `dsh` 启动器只解析自己的 flag，遇到第一个
> 不认识的 token（例如 `--port`）就把后面**全部**原样交给 web 应用；写在后面会被应用当成
> 未知选项报 `error: unknown option '--patch'`。
> （`dsh web --patch X --port 8081 --no-open` ✅；`dsh web --port 8081 --patch X` ❌。）

打开 `dsh web`（上面那条开发命令就是 `http://127.0.0.1:8081`），点右侧栏的 **+**，在 guide 里选「画板」，即可开一个画板标签页（和终端、文件预览并列，按会话记忆）。模型那一侧的工具目录里会多出 `blackboard_draw`。

### host 半边由谁跑：tsx 还是 Node 内建类型剥离

`host/index.ts` 是 TypeScript 源码，加载它的运行时取决于是哪一种 dsh：

| dsh | 加载 host 半边的机制 |
|---|---|
| 源码启动（`pnpm dsh …`） | tsx 的 ESM hook（`node --import tsx/esm`） |
| 安装版（`@deepseek-ai/dsh` 或打包出来的可执行文件） | **Node 内建类型剥离**，安装里没有 tsx。Node ≥22.18 / 24 默认开启 |

所以安装版能直接跑 `.ts` 源码，靠的不是本包带了构建步骤，而是 Node 自己剥离类型。**`NODE_OPTIONS=--no-experimental-strip-types` 会让它加载失败**（`ERR_UNKNOWN_FILE_EXTENSION`）；这个开关是给"只允许纯 JS"的部署用的，用它就得把 host 半边预先编译成 JS。

### 与既有 `--patch` 路线的关系

`start-dsh-blackboard.bat` 用 `--patch Workspace\blackboard-plugin\blackboard.cordis.yml` 挂的是**另一个目录里的旧副本**，而它插的那一行用的是**同一个行 id** `blackboard-host`。这条路线与 bundle 撞车时不会报任何错：

- `applyEntryPatches` 对 insert 不查重（`vendor/include/src/index.ts`），两行都留在组合结果里；
- Loader 的 `EntryGroup.update` 按 id 建表，**同 id 只留最后一条**（`vendor/loader/src/config/group.ts`）；
- `--patch` 层排在 bundle 层**之后**（`packages/boot/app-boot/src/profile-context.ts`）。

结论：**装了 bundle 之后旧副本仍然胜出，bundle 静默不生效**——插件看着装了，跑的还是 `Workspace\blackboard-plugin`。所以**两条路线只能留一条**：装了 bundle 就必须去掉 blackboard 那条 `--patch`；`--patch` 只留给上一节的源码开发（那时没有 bundle 层，它指向的才是本仓库）。

自查有没有双挂载——组合后的配置树里 `blackboard-host` **出现两行**即为双挂载（`--dump-config` 会给每一行标出它来自哪个文件）：

```powershell
pnpm dsh --profile web --dump-config | Select-String 'blackboard-host'
```

## 用法

- 画布上手势：左键画（工具栏切换工具、颜色、线宽），**中键拖拽平移视野**，**滚轮缩放**。缩放下限就是整块板刚好铺满画布，缩到底自动回中；拖侧栏边改变容器尺寸时，缩放倍数与视野中心都保留。
- 「撤销上一笔 / 清空」只作用于人自己最后一次手势；模型可以自己用 `erase` 纠错。
- 模型画 `rect` / `circle` 时可以带 `fill` 给形状填色（省略这个字段就是只描边，元素上也不会写上它）；画 `text` 时可以带 `align: 'middle'` 或 `align: 'end'` 指定水平对齐（省略按 `start`，即 `at` 为左边缘与垂直中心）。
- 「发给 agent」把场景层导成 PNG，作为一条普通用户消息发出去——导出的是**当前视野**，不是整块板。
- 随图发出去的那句话取自输入栏：**输入栏里有字就用它，没有就用「这是我画的黑板。」这句默认话**；发送成功后输入栏会被清空。输入栏里挂着的附件**不会**跟着走（原因见「已知限制」）。
- agent 可以**随时读当前画板，不需要你点任何按钮**：`blackboard_read` 向面板要一张**整块板**的 PNG（与你当时的缩放/平移无关），写到 `$DSH_HOME/blackboard/<sessionId>.png`，再用 `read_image` 看它。

## 目录

```
blackboard.cordis.yml   overlay：只插一条 host 行，行名是相对路径
package.json            dsh.bundle.patch + dsh.client 声明 + exports["./client"]，bundle id 必须等于包名
core/                   零依赖纯 TypeScript：命令、场景、渲染、简化、视口
shared/                 ops 流（SceneOp / applyOps / opsFromCommands）与 wire 协议
host/                   插件宿主半边：index / store / routes / tool
client/                 浏览器半边：index / panel / canvas / source / locale
build/build-client.mjs  esbuild → lib/client.js（模块表 lazy-CJS 协议）
tests/                  node:test 单测（75 例）
lib/client.js           构建产物，**启动前必须存在，且已进版本库**
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
pnpm run verify   # = typecheck && build && test && probe
```

| 命令 | 作用 |
|---|---|
| `pnpm run typecheck` | host / client 两个 program 各自 `tsc --noEmit`，各自解析自己那半的 `@deepseek-ai/*` 类型 |
| `pnpm run test` | `node --import tsx/esm --test tests/*.spec.ts`，75 例 |
| `pnpm run build` | esbuild 打 `lib/client.js`（改动客户端代码后必须重跑，没有 HMR） |
| `pnpm run probe` | 验证 Loader 用 tsx 加载 `host/index.ts` 时 `@deepseek-ai/dsh-*` 包名导入能解析 |

**改完客户端代码必须 `pnpm run build` 再刷新页面**：dsh 的 registry serve 的是 `lib/client.js`，不是源码。

## 版本对齐

`@deepseek-ai/dsh-tools` 与 `@deepseek-ai/dsh-home-paths` 是**运行时**依赖，而且写成 **peerDependencies + devDependencies 两份、`dependencies` 里一个不留**：profile 用的是 `nodeLinker: hoisted` + `autoInstallPeers: false`，留在 `dependencies` 里的包会被平铺进 profile 的 `node_modules`，**遮蔽**整个 installation 里那份；写成 peer 就由 installation 提供，`dsh` 启动时的兼容性闸也正好按 peer 判版本。两个版本号写法不同，各有原因：

- **peer 是范围 `^0.2.1-alpha.1`**。闸按 semver 判，范围才能让同一版本线上的 installation 都能装——`0.2.1-alpha.2`、`0.2.1`、`0.2.2` 都放行，`0.3.0` 拒绝。peer 写成精确值时闸只接受唯一一个构建，运行时一升小版本，插件就装不上、已装的会被跳过启动。
- **devDependencies 钉精确 `0.2.1-alpha.1`**，只服务类型检查，跟随本仓库当时编译所依据的类型。

`@deepseek-ai/cordis` 同理，peer 是 `^4.0.2`。dsh 的公开 API 目前是 pre-stable 的，升级 dsh 时请把这一组一起升，不要混版本。

devDependencies 里那一长串 `@deepseek-ai/dsh-client-*`（以及 `@deepseek-ai/dsh-api-session-controller` / `dsh-session`）钉在 `0.1.6-alpha.1`，只服务类型检查，运行时不进 profile：dsh 的客户端能力靠 TypeScript 声明合并挂在 `Context` 上（例如 `ctx.sessions` 由 `@deepseek-ai/dsh-api-session-controller/client` 声明，`ctx.slots` 由 `dsh-client-ui-slots` 声明），而发布出去的包里这些兄弟包只写在 **devDependencies**，不会跟着装进来。加上 `skipLibCheck: true` 会把 d.ts 里解析不到的 import 静默掉，少一个包的表现就是"某个 `ctx.xxx` 突然不存在"。所以：**用到哪个服务的类型，就把它所属的包显式写进 devDependencies**。

## 已验证

在一条全新的独立安装上（`pnpm install` → `pnpm run verify`，不依赖任何 dsh checkout）：

- `pnpm run typecheck` 零错误——两个 program 都是对着 npm 上发布的类型编译的（host 半边 `0.2.1-alpha.1`，浏览器半边 `0.1.6-alpha.1`）；
- `pnpm run test` **75/75** 通过（含快照请求的交付闭环、参数与迟到交付分支、账本超时与后请求抢占，以及类型 `DrawCommand` 与工具参数 schema 的漂移守卫）；
- `pnpm run build` 产出 `lib/client.js`（`pnpm run verify` 里 build 排在 test 前面：`tests/manifest.spec.ts` 检查的是构建产物，全新 clone 上先 test 会 ENOENT）；
- `pnpm run probe` 确认 tsx 能解析 host 半边的包名导入；
- `dsh.bundle.patch` 交给 dsh 自己的装载器（`@deepseek-ai/dsh-app-boot` 的 `bundlePatchPaths` → `loadOverlayPatches` → `composeEntries`）：目录解析成 `<包目录>/blackboard.cordis.yml`，行名被锚成包内的 `file:///…/dsh-blackboard/host/index.ts`，entry 名 `blackboard-host`。

浏览器里的行为在开发机上实测过：右侧栏 `+` 菜单出现「画板」、能画、刷新后还在；agent 调用 `blackboard_draw` 后图形出现在板上；「发给 agent」后模型能描述画面。

## 已知限制

- **不写 session log。** 画板真相是 `$DSH_HOME/blackboard/<sessionId>.jsonl`：仓库外插件的事件类型不在 dsh 的 `KNOWN_SESSION_EVENT_TYPES` 里，未知事件只在标了 `ignorable` 时被保留——所以在"不改 dsh 仓库"的前提下拿不到投影 / 分叉 / 回放语义。想要那些语义，得把本插件做进 `packages/`（官方仓库目前不接受外部 PR）。
- **输入栏里的附件带不走。** 「发给 agent」只借输入栏的**文字**。草稿附件的解析与序列化全在 ui-conversation 内部：`IConversation` 只暴露 `input` / `blocks` / `send` / `updateQueue` / `cancel` / `loadOlder`，`serializeDraftAttachments` 之类只作为 composer 附件槽（`kind: 'single'`，已被 ui-attachment 占用）的 owner prop 存在，仓库外插件没有公开的路读它们。所以附件会留在输入栏，发送成功后的状态行会告诉你漏了几个。
- **`blackboard_read` 需要面板开着。** host 没有 canvas，图只能由浏览器里的面板产出：工具先登记一次请求，面板下一次轮询（≤1s）从场景响应里看到它，出图 POST 回来；超过 2.5s 就报错。面板没开就没有图可给。
- **host 半边的改动要重启 `dsh` 才生效**：host 源码在启动时加载（源码启动走 tsx、安装版走 Node 内建类型剥离，见「挂载」一节），注册工具与路由后没有热重载；浏览器半边（`lib/client.js`）会热更新。
- **1 秒轮询**，不是推送：agent 画完到人看见最多 1s，空闲时每秒一次请求。
- **磁盘上没有任何自动清理。** 每个会话在 `$DSH_HOME/blackboard/` 下留两个文件：`<sessionId>.jsonl`（append-only 的 op 流，只增不减）与 `<sessionId>.png`（`blackboard_read` 的快照，每次覆盖同一路径，1024² 下约 280 KB）。两者都不随会话删除、不随插件卸载，也没有条数或体积上限——数据目录按"用过的会话数"线性增长（实测一个会话 ≈ 57 KB jsonl + 286 KB png）。另外 `erase` / `clear` 都是**软删除**（往流里追加 `patch`），所以"清空画板"只会让 jsonl 更长。目前只能手动收拾，PNG 是随时可由面板重建的，删了不影响画板本身：`Remove-Item $env:DSH_HOME\blackboard\*.png`；"保留最近 N 张、最旧先删"这类策略还没做。
- **工具 7 支**（`line`/`arrow`/`rect`/`circle`/`text`/`stroke`/`erase`）：`clear` 不开放给模型——它会一次抹掉人与 agent 的全部笔迹。
- **不用 CSS Modules**：自建打包不含 dsh 仓库的样式注入，面板只用内联 style + `--dsw-*` 变量。
- **工具注册在 host 平面**，所有 preset（含 `minimal`）的模型工具目录里都会出现 `blackboard_draw`。
- **路由只做结构校验**：`sessionId` 由页面提供，只要通过 `/api` 的浏览器信任围栏就能读写对应画板；本地单用户场景可接受，多用户部署则不行。

## 发布

- 给这个 GitHub 仓库加上 [`dsh-plugin`](https://github.com/topics/dsh-plugin) 话题——这是官方 README 指定的发现渠道。
- 要发 npm 的话：`package.json` 里的 `name` / `version` / `repository` 自定，发布前跑 `pnpm run verify`（`lib/client.js` 是发布产物，列在 `files` 里，也已经进了版本库）。
- `LICENSE` 里的版权人占位符记得填。
