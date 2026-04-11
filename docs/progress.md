# 进展记录

## 当前状态

- 已形成 `shared / server / client` 三层 workspace。
- 已接入大厅、准备、开局、结算后回房的联机流程。
- 已实现工具、地形、召唤物、角色能力、竞速模式、golden 测试与本地回放。
- 已建立 `PreviewDescriptor + ActionPresentation + PlaybackEngine` 的表现链路，客户端按语义预览和语义事件播放瞬态。

## 2026-04-09

- 新增 `/mapeditor` 地图编辑器页面：
  - 新增 `packages/client/src/map-editor/MapEditorApp.tsx`
  - 3D 棋盘、hover 虚影与拖拽连续摆放复用 `BoardTileVisual`
  - 地形库缩略图通过 `TerrainThumbnail` 复用单格渲染
- 补齐 shared 布局辅助函数：
  - `createBoardDefinitionFromLayout()`
  - `resizeBoardLayout()`
  - `getBoardSpawnPosition()`
- 新增自定义地图联机测试链路：
  - client `createRoom()` 支持 `{ mapId: "custom", customMap }`
  - `WatcherRoom` 支持从布局文本直接建盘并推导出生点
  - 自定义地图仍复用原有 `WatcherRoom + shared orchestration`
- 新增地图编辑器文档：
  - `docs/arch/地图编辑器原型.md`
- 验证：
  - `npm.cmd run typecheck --workspace @watcher/shared`
  - `npm.cmd run typecheck --workspace @watcher/server`
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run goldens`
  - 结果：`28/28` golden cases passed
- 修复地图编辑器主棋盘白屏：
  - 原因是地形库里每个缩略图都创建独立 WebGL canvas，导致主棋盘 context 被浏览器回收
  - 改为单个隐藏 canvas 批量生成缩略图图片，地形库只展示缓存图片
  - `MapEditorScene` 也补上了自己的 Three scene 背景色
- 调整地图编辑器布局与 hover 稳定性：
  - 右侧改为固定视口内的上下两段布局，让地图和地形库同时占满页面
  - 地形库卡片取消 hover 缩放，避免鼠标 cover 时卡片抖动
  - 棋盘放置预览改为单层 ghost tile，移除会互相干扰的双层高亮
- 补齐地图编辑器地形旋转与操作提示：
  - 选中地形后支持按 `R` 顺时针旋转，当前仅对大炮与传送带生效
  - 地形库收口为单个传送带与单个大炮条目
  - 左侧栏新增地形编辑操作说明
- 修正地图编辑器旋转与缩略图问题：
  - 旋转后的预览与实际落子统一使用当前选中的真实符号，而不是地形库条目的默认符号
  - 缩略图缓存扩展到旋转后的符号集合，并改为方形采样，消除裁切错位
- 统一 client 地形资产入口：
  - 新增 `WallTileAsset` 与 `EarthWallTileAsset`
  - `BoardTileVisual` 现在对 `wall / earthWall / highwall` 都走显式 asset，而不是只有基础盒体
  - 缩略图采样延迟到稳定帧后再抓取，修正图标与地形名称错位

## 2026-04-08

- 修正 `lucky` 的全局状态模型：
  - `lucky` 停留领取后真实切换为 `emptyLucky`
  - 回合开始时统一把 `emptyLucky` 恢复为 `lucky`
  - 删除 client 侧基于当前玩家 `turnFlags` 的 Lucky 显示特判

- 重组 shared 地形框架：
  - 新增 `packages/shared/src/terrain-modules/`
  - 地形改为“一种地形一个文件”
  - 抽出 `terrain-modules/traversal.ts` 统一管理地面移动、飞跃穿越与投射物阻挡规则
- 扩展并重定义地形：
  - 新增 `poison`，停留触发并把玩家送回出生点
  - 旧 `pit` 改为经过触发并把玩家送回出生点
  - 新增 `highwall`，阻挡地面移动、飞跃穿越与投射物
  - `cannon` 接入地形模块并继续复用火箭核心结算
  - `lucky` 与 `emptyLucky` 之间通过真实地形状态切换表达可领取与不可领取
- 扩展 shared presentation：
  - `PresentationMotionStyle` 新增 `fall_side` 与 `spin_drop`
  - `effect` 新增 `lucky_claim`
  - `poison` 与 `pit` 通过玩家 motion 完成动画
- 扩展 client 地形表现：
  - 新增 `PoisonTileAsset`
  - 新增 `HighwallTileAsset`
  - 新增 `LuckyClaimEffectAsset`
  - `BoardScene` 改为直接消费 `lucky / emptyLucky` 地形状态与 `state_transition`
- 更新默认棋盘符号：
  - `p -> poison`
  - `o -> pit`
  - `H -> highwall`
- 新增与更新 golden 用例：
  - `turn-start-poison-respawns-before-roll`
  - `pit-pass-through-respawns-mid-move`
  - `highwall-blocks-leap-traversal`
- 验证：
  - `npm.cmd run typecheck --workspace @watcher/shared`
  - `npm.cmd run typecheck --workspace @watcher/server`
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run goldens`
  - 结果：`27/27` golden cases passed

## 2026-04-07

- shared 主链切换为自顶向下传递 draft 的结算模型：
  - 新增 `packages/shared/src/rules/actionDraft.ts`
  - tool executor、terrain trigger、summon trigger 全部改为直接修改 draft
  - 删除旧的 patch-builder 主路径
- 火箭链路收回到工具模块内部：
  - 删除过渡层 `packages/shared/src/rules/rocketResolution.ts`
  - 在 `packages/shared/src/tool-modules/rocket.ts` 内部定义 `resolveRocketCore(draft, spec)`
  - `cannon` 直接复用 `resolveRocketCore()`
- 整理 client 工具资源目录：
  - 资源按 `packages/client/src/game/assets/tools/<tool-id>/` 聚合
  - 删除 `wallGhostPositions`、`summonPreviews` 等预览专用旁路
- 文档体系收口到当前架构：
  - 新增 `docs/arch/表现层原型.md`
  - 重写 `docs/index.md`、`docs/arch/共享规则层.md`、`docs/arch/内容注册与资源组织.md` 等权威入口

## 2026-04-06

- 完成 shared 工具交互协议重构：
  - 删除 `targetMode / tileTargeting`
  - 新增 `packages/shared/src/toolInteraction.ts`
  - `useTool` payload 统一为 `{ toolInstanceId, input }`
- client 交互层统一为 `InteractionSession + driver`
- shared 工具模块统一迁入 `packages/shared/src/tool-modules/`

## 2026-04-05

- 完成能力系统统一模型：
  - `Character -> Skill -> Modifier`
  - `Player.tags + Player.modifiers`
  - `turn-start / turn-action / turn-end`
- 删除旧的角色运行时与 turn-start action 旧系统
- 新增 `AWM` 与基础 modifier `bondage`

## 2026-04-04

- 将回合编排正式收口到 `packages/shared/src/gameOrchestration.ts`
- `WatcherRoom.ts` 改为 shared orchestration 的适配层
- `packages/shared/src/simulation/engine.ts` 改为 shared orchestration 的本地包装层
## 2026-04-10 Heavy Golden Benchmark

- Added shared heavy cases for large maps, dense terrain mixes, and multi-step tool chains.
- Added `/heavy_goldens` in the client and reused the existing golden playback UI plus live Three scene.
- Added `window.render_perf_to_text()` so automation can read render benchmark JSON directly from the page.
- `BoardScene` now exposes playback and scene counts, and `GameBoardCanvas` exposes WebGL renderer stats.
- Added `scripts/run-heavy-golden-benchmark.mjs` and `npm.cmd run heavy-goldens:perf`.
- Benchmark script supports `--case`, `--mobile`, `--device`, `--cpu-throttle`, and `--output`.
- Verified with:
  - `npm.cmd run typecheck --workspace @watcher/shared`
  - `npm.cmd run typecheck --workspace @watcher/server`
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run goldens`
  - `npm.cmd run heavy-goldens:perf`
  - `npm.cmd run heavy-goldens:perf -- --case heavy-raceboard-turn-start-terrain-chain --mobile`

## 2026-04-10 Client Rendering Optimization

- Split client route loading with `React.lazy` so `/`, `/goldens`, `/heavy_goldens`, and `/mapeditor` no longer ship as one eager entry chunk.
- Added Vite `manualChunks` for `react`, `colyseus`, `r3f`, and `three-core` vendor bundles.
- Reworked board rendering:
  - Added `BoardStaticTileLayer`
  - Instanced repeated tile base blocks by tile type
  - Split tile decorations from dynamic selection overlays
  - Added a cheap instanced tile hit layer so static tile rendering no longer needs one mesh per tile for input
- `BoardScene` now stabilizes displayed tile arrays and passes the static board through memoized children so animation ticks do not re-render the whole board layer.
- Removed an accidental `node:process` import from `HighwallTileAsset`.
- Benchmark notes:
  - Full heavy desktop baseline before this pass was roughly `drawCallsP95 384`, `geometriesMax 576`
  - After this pass, full heavy desktop is roughly `drawCallsP95 187`, `geometriesMax 307`
  - Single-case `heavy-raceboard-rocket-cluster` dropped from roughly `drawCallsMax 312` / `geometriesMax 314` to `drawCallsMax 139` / `geometriesMax 134`
  - Frame-time improvement in headless Chromium is noisier because the benchmark still reports `ReadPixels` GPU-stall warnings, so draw calls and geometry counts are the more reliable signal right now
- Remaining follow-up:
  - `three-core` is still a large chunk (~696 kB minified); next options are trimming Three usage, route-isolating editor-only assets, or investigating whether some helpers can load lazily inside the gameplay route
  - Shadows are still on by default; a low-end/mobile quality tier is still worth doing

## 2026-04-11 界面优化

- 创建房间页改为全屏 3D 地图预览：
  - 新增 `CreateRoomMapPreview`，复用实际棋盘地块渲染层 `BoardStaticTileLayer`
  - 移除页面中的二维 `MapThumbnail` 展示入口
  - 地图名称、描述、模式标签、切图按钮和创建按钮改为 3D 画面上的 overlay
  - 预览镜头会围绕棋盘缓慢旋转
- 房间内左边栏顶部优化：
  - 左栏收起入口改为贴边 `<` / `>` 按钮
  - 返回主页改为 SVG 图标按钮
  - 房间号放大展示，并增加复制按钮
- 创建房间页二次视觉调整：
  - 3D 背景改回浅色棋盘，与其他页面色调一致
  - 地图名称、介绍和模式改为上方居中轴对称布局
  - 底部改为“上一张 / 创建房间 / 下一张”的三按钮布局
  - 切换按钮和左右拖动都会触发地图切换，背景带横移与模糊翻页过渡
- SVG 图标资源整理：
  - 新增 `packages/client/src/game/assets/ui/icons/`
  - 将返回、主页、复制、创建房间、加入房间、左右切换图标收束为 `UiIcon`
  - create-room 左右切换按钮改为垂直居中的大号 SVG ghost 按钮
  - create-room、room-entry、map-editor、race settlement 与房间侧栏返回/主页入口改为引用 `UiIcon`
- 验证：
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run build --workspace @watcher/client`
  - 使用 Playwright 打开 `/?screen=create` 做浏览器烟测，确认全屏 3D canvas、按钮切换、拖动切换、SVG icon mask 和切图 blur 正常
