# 进展记录

## 当前状态

- 已形成 `shared / server / client` 三层 workspace。
- 已接入大厅、准备、开局、结算后回房的联机流程。
- 已实现工具、地形、召唤物、角色能力、竞速模式、golden 测试与本地回放。
- 已建立 `PreviewDescriptor + ActionPresentation + PlaybackEngine` 的表现链路，客户端按语义预览和语义事件播放瞬态。

## 2026-05-01 MovementDescriptor 边界收口

- shared 位移描述模型收口为完整 `MovementDescriptor`：
  - `MovementDescriptor` 直接表达 `type / disposition / timing / tags`
  - `packages/shared/src/rules/displacement.ts` 只保留完整 descriptor 构造与位移结果辅助函数
- 工具层统一负责生成完整位移描述：
  - 主动工具通过 `resolveToolMovementDescriptor()` 读取工具默认位移并接入 `resolveToolMovementType()`
  - 被动推拉通过 `createPassiveMovementDescriptor()` 或等价完整构造器明确写入位移类型与标签
- `movementSystem` 统一消费完整 `MovementDescriptor`：
  - `resolveLinearDisplacement / resolveDragDisplacement / resolveLeapDisplacement / resolveTeleportDisplacement` 的入参直接携带最终位移语义
  - 飞跃内部需要落点语义时，显式复制当前 descriptor 并将 `type` 写为 `landing`
- 已迁移工具模块：
  - `movement / jump / brake / teleport / hookshot`
  - `basketball / punch / rocket / blazeBombThrow / awmShoot`
- 文档同步：
  - 更新 `docs/arch/共享规则层.md`
- 本轮验证：
  - `npm.cmd run typecheck --workspace @watcher/shared`
  - `npm.cmd run goldens -- --case leader-wallet-active-translate-pass`
  - `npm.cmd run goldens`，`48/48` passed
  - `npm.cmd run typecheck`

## 2026-04-29 可交互的 turn-end 阶段、领导改版与莫汀接入

- shared 回合编排调整：
  - `turn-end` 从“立即清算的终点”改为可交互阶段
  - `endTurn` 在 `turn-action` 时先进入 `turn-end`
  - 若 `turn-end` 获得了可用工具，玩家可以继续使用这些工具，或再次发送 `endTurn` 跳过该阶段
  - `turn-end` 工具全部用完时，shared 会自动结束该阶段并切到下一名玩家
- modifier hook 语义拆分：
  - 新增 `onTurnEndStart`
  - `onTurnEndStart` 负责“回合结束阶段开始时”发放工具或施加效果
  - 既有 `onTurnEnd` 保留为“真正回合结束时”的清理与收尾逻辑
- 角色与工具更新：
  - `Leader` 改为在回合结束阶段开始时获得 `deployWallet`
  - `deployWallet` 不再强制结束回合
  - 新增角色 `Mountain / 莫汀`
  - `Mountain` 的技能会在回合结束阶段开始时授予一个耐久 2 的 `buildWall`
  - `buildWall / deployWallet` 明确允许在 `turn-end` 使用
- client 交互更新：
  - HUD 与场景弧环会在 `turn-end` 显示工具栏
  - 回合结束阶段的结束按钮文案改为“跳过”
  - 新增莫汀立绘接入
- 文档同步：
  - 更新 `docs/游戏规则与内容定义.md`
  - 更新 `docs/arch/能力系统统一模型.md`
  - 更新 `docs/arch/房间与大厅流程.md`
- 本轮验证：
  - `npm.cmd run typecheck --workspace @watcher/shared`
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run typecheck --workspace @watcher/server`
  - `npm.cmd run goldens`，`45/45` passed
  - `npm.cmd run build --workspace @watcher/client`

## 2026-04-28 棋子模型白屏排查

- 排查新增棋子模型白屏时，确认 `PetPiece` 通过 `useGLTF()` 从 `/assets/cube-pets/<pet-id>.glb` 运行时加载资源。
- 修复静态资源缺失：
  - 将 `ak-amiya.glb`
  - 将 `ak-logos.glb`
  - 同步放入 `packages/client/public/assets/cube-pets/`
- 结论：
  - 这次白屏的直接原因不是 shared / server 缺少额外注册
  - 也不是 `ak-amiya.glb` / `ak-logos.glb` 本体无法被当前 `three + GLTFLoader` 解析
  - 而是前端运行时请求的静态 GLB 文件原先不在 `client public assets` 目录，导致模型加载失败并把界面带入白屏
- 补充说明：
  - `ak-amiya.glb` 与 `ak-logos.glb` 不依赖额外外部纹理文件
  - 只要 `pets.ts` 中启用的 id 与 `packages/client/public/assets/cube-pets/` 中的实际文件保持一致即可
- 验证：
  - `npm.cmd run build --workspace @watcher/client`

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
  - 地形触发逻辑进入模块；地面移动、飞跃穿越与投射物阻挡规则保留在底层 `movementSystem.ts` 与 `spatial.ts`
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

## 2026-04-11 shared 位移与工具条件清理

- 移除 `ToolCondition` 系统：
  - `ToolContentDefinition` 与 `ToolDefinition` 不再包含 `conditions`
  - `tools.ts` 不再执行统一条件循环
  - `Dash` 与 `Balance` 不再依赖 `tool_present` 条件
- 清理 `MovementDescriptor` 边界：
  - 新增 `MovementDescriptorInput`，只承载主动/被动、时机与标签
  - `resolveLinearDisplacement`、`resolveDragDisplacement`、`resolveLeapDisplacement`、`resolveTeleportDisplacement` 负责写入最终移动类型
  - 工具侧改为通过 `ToolMovementPlan` 选择 resolver，并使用 resolver 返回的 `movement` 写入动作结果
- 修正飞跃落点触发：
  - `resolveLeapDisplacement` 的中间格仍按飞跃处理
  - 最后一格按 `translate` 触发 terrain / summon，因此跳跃落在 pit 上会正常触发重生
  - 新增 golden case `leap-landing-on-pit-respawns`
- 验证：
  - `npm.cmd run typecheck --workspace @watcher/shared`
  - `npm.cmd run goldens`
  - `npm.cmd run typecheck`

## 2026-04-11 信息展示收束

- 新增统一展示文本入口：
  - `getToolTextDescription(tool)`
  - `getTerrainTextDescription(tile)`
  - `getSkillTextDescription(skillId)`
- 地形说明从 client 硬编码迁回 `packages/shared/src/terrain-modules/`：
  - 每个地形模块现在提供 `label / accent / getTextDescription`
  - `inspectables.ts` 只负责组装信息卡，不再维护地形规则文案
- 工具信息卡改为读取 shared 工具自己的 `getTextDescription`：
  - `HudSidebar` 当前工具详情改用 `getToolTextDescription`
  - `SceneInteractionHud` 弧形工具卡不再使用 client 侧工具说明
- 修正展示文本模型：
  - `ToolContentDefinition.getTextDescription` 改为必填
  - `SkillDefinition.getTextDescription` 改为必填
  - 删除旧的 `buttonValue` / `TOOL_PARAMETER_LABELS` 自动参数展示体系
  - 工具、技能、地形的展示文本都由各自模块手写
- 地形 thumbnail 资源收束到正式棋盘资源目录：
  - 新增 `packages/client/src/game/assets/board/TerrainThumbnail.tsx`
  - 新增 `packages/client/src/game/assets/board/TerrainThumbnailCaptureDeck.tsx`
  - 新增 `terrainThumbnailCatalog.ts`
  - 地图编辑器和游戏内长按地形信息卡共用同一套 3D thumbnail
- 验证：
  - `npm.cmd run typecheck`

## 2026-04-11 拳击工具表现接入

- 接入用户新增的 `punch` 工具：
  - shared 侧保持通过 `resolveLinearDisplacement` 处理击退与反推
  - 命中玩家与命中墙壁分别产出 `punch_player_hit` / `punch_wall_hit` 语义 effect
  - punch 加入工具骰面末尾，避免扰动既有 deterministic seed 预期
- 新增 client 拳击资源：
  - `PunchDirectionAsset`
  - `PunchPlayerHitEffectAsset`
  - `PunchWallHitEffectAsset`
- 新增 golden case：
  - `punch-hits-player-and-pushes-three`
  - `punch-hits-wall-and-recoils-self`
- 验证：
  - `npm.cmd run goldens`
  - `npm.cmd run typecheck`
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run build --workspace @watcher/client`

## 2026-04-12 工具 SVG 图标资源

- 新增 `packages/client/src/game/assets/ui/tools/` 下的简约工具 SVG 图标：
  - `jump.svg`
  - `hookshot.svg`
  - `basketball.svg`
  - `rocket.svg`
  - `build-wall.svg`
  - `punch.svg`
- 图标统一使用 `viewBox="0 0 256 256"` 与 `currentColor`，便于后续由 CSS 或图标组件统一着色。
- 验证：
  - 使用 PowerShell XML 解析检查 6 个 SVG 文件均可正常解析。

## 2026-04-12 Tool 可用性与参数分层

- 工具可用性从全局特判迁入 `ToolContentDefinition.isAvailable`：
  - 调用方直接读取对应工具定义的 `isAvailable`
  - 移动点、投弹、制衡等可用性规则由对应工具模块自己裁决
- 工具参数拆为通用参数与工具私有参数：
  - 保留通用 `movePoints`
  - 其它工具私有参数由工具模块内部约定命名
- 移动点相关 helper 改为直接读取和修改 `params.movePoints`：
  - 不再特判 `movement` 或 `brake`
  - 后续其它工具只要带 `movePoints` 参数即可参与加减、清空与束缚扣减
- 清理地形阻挡文档：
  - 阻挡与落点语义明确由 `movementSystem.ts` 与 `spatial.ts` 维护
  - 移除旧地形穿越文档入口

## 2026-04-12 角色卡与角色立绘

- 为现有角色补充中文名、立绘标识与 `flavorText`：
  - `blaze`：布拉泽
  - `chain`：常
  - `ehh`：鹅哈哈
  - `leader`：领导
  - `farther`：法真
  - `late`：罗素
  - `volaty`：芙兰迪
  - `awm`：AWM
- 将 `resources/立绘` 中对应立绘生成 900px 宽的 client 用 JPEG 资源，并新增角色立绘 URL 映射。
- 重做对局左侧角色卡：
  - 展示带边框的角色立绘
  - 在立绘下半部叠加中文名、英文名、技能描述与角色台词
  - 使用深色叠加背景保证文字可读
- 将切换角色入口改为与调试工具领取一致的下拉框 + 按钮形式，并放在角色卡下方。

## 2026-04-12 投骰动画第一版

- 新增 shared 投骰结果字段：
  - `turnInfo.lastRolledMoveDieValue` 保存点数骰原始结果
  - `turnInfo.moveRoll` 继续表示 modifier 处理后的移动工具点数
- client 收到投骰后的 snapshot 时会先创建本地骰子动画并暂存 snapshot：
  - 动画期间仍显示投骰前状态
  - 动画结束后再应用 snapshot，工具栏与后续 presentation 才开始更新
- 新增骰子动画计划：
  - 点数骰始终按 shared 的原始点数骰结果展示
  - 工具骰按最终 `lastRolledToolId` 展示；如 Volaty 取消工具骰则不展示工具骰
  - 落点、旋转圈数、最终 yaw 由事件 id 派生的伪随机数决定
- 暂定骰面：
  - 点数骰：`1 / 2 / 3 / 4 / 5 / 6`
  - 工具骰：当前 `getRollableToolIds()` 顺序，即 `jump / hookshot / basketball / buildWall / rocket / punch`
- 验证：
  - `npm.cmd run typecheck`
  - `npm.cmd run build --workspace @watcher/client`
  - `npm.cmd run goldens`
  - Playwright 创建房间投骰流程：普通投骰显示点数骰 + 工具骰，工具发放延后到骰子消失后；Volaty 先使用“飞跃”后只显示点数骰。

## 2026-04-12 投骰动画物理姿态调整

- 按“骰子模型原点在正方体中心、边长 1m”调整动画高度：
  - 渲染时按当前局部旋转计算正方体在世界 y 轴上的半高
  - 骰子中心高度始终为平台高度 + 当前半高 + 非负弹跳/下落高度，避免旋转穿过平台
- 调整旋转结构：
  - 外层只保留随机 y 轴 yaw
  - 内层负责把结果面以 90 度倍数转到上方，最终不保留任意 x/z 倾斜
  - 下落阶段也使用同一段 spin 进度持续旋转，落下与滚动更连贯
- 面序修改位置：
  - `packages/client/src/game/state/diceRollAnimation.ts` 中的 `POINT_DIE_FACE_ORDER`
  - `packages/client/src/game/state/diceRollAnimation.ts` 中的 `TOOL_DIE_FACE_ORDER`
  - 如果模型本体坐标方向也要重排，则同步调整对应的 `POINT_DIE_FACE_TOP_ORIENTATIONS` 或 `TOOL_DIE_FACE_TOP_ORIENTATIONS`
- 验证：
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run build --workspace @watcher/client`
  - Playwright 手动时间推进截图：`0ms / 600ms / 1200ms / 2400ms / 3000ms / 3450ms`

## 2026-04-13 部署连接与 mapeditor 跳转修复

- 修复 LAN 建房时客户端回退连接 `localhost:2567` 的问题：
  - `VITE_SERVER_URL` 为空或不可用时，客户端按当前页面 hostname 推导 `ws(s)://<host>:2567`
  - 对 env 值做空字符清理，降低 PowerShell UTF-16 `.env` 造成的影响
- 修复 mapeditor 开房后的部署路径跳转：
  - 不再硬编码跳转到域名根路径 `/`
  - 从 `/mapeditor` 或子路径部署下的 `.../mapeditor` 回到当前 app 根路径并追加 `?room=...`
  - 路由入口改为识别 pathname 最后一段，兼容子路径部署
- 更新 README 部署命令：
  - 用 `Set-Content -Encoding utf8` 替代 PowerShell `echo > .env`
- 验证：
  - `npm.cmd run typecheck --workspace @watcher/client`

## 2026-04-13 视角管理重做

- 新增代码开关 `CAMERA_CONTROL_MODE_BY_CODE`：
  - 默认使用新的 `follow` 视角
  - 切回 `orbit` 可恢复旧的 `OrbitControls` 路径
- 新视角采用 fixed rig + follow camera：
  - 固定朝向，不再自由旋转
  - 默认距离比旧镜头更近
  - 当前行动玩家超过 dead zone / camera window 后才推动视角中心
  - 镜头移动使用 damping，形成先快后慢的 soft follow
- 单指输入统一到 `BoardScene` 仲裁：
  - 工具指针优先，工具开始时会取消相机候选拖拽
  - canvas 外的工具 UI 不触发相机拖拽
  - 单指拖动超过阈值后进入 pan，松手后快速 recenter 到当前行动玩家
  - 静止长按才显示地形说明，拖拽会取消检查卡
- 双指输入：
  - 支持 pinch zoom
  - pinch 开始时取消当前指针工具草稿，避免工具拖拽和缩放同时生效
- 验证：
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run build --workspace @watcher/client`
  - `develop-web-game` Playwright 脚本回放 `basic-movement-right`，golden 通过且无 console error
  - 自定义 Playwright 交互检查：拖拽 pan、松手 recenter、拖拽取消检查卡、长按地形说明、程序化双指 pinch zoom

## 2026-04-13 视角与投骰微调

- PC 端 follow camera 支持滚轮 zoom。
- 平移视角改为屏幕增量映射，避免用当前镜头地面投影反复反馈造成抖动。
- 松开拖拽后只把当前行动玩家带回 dead zone / camera window 内，不再强制居中。
- 指针工具选中或使用中时，移动端 touch drag 不启动相机 pan。
- 投骰动画落点改为围绕当前行动玩家的世界坐标附近随机，双骰只在该锚点附近分 lane。
- 验证：
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run build --workspace @watcher/client`
  - `develop-web-game` Playwright 脚本回放 `basic-movement-right`，golden 通过且无 console error
  - 自定义 Playwright 交互检查：平移稳定性、滚轮 zoom、双指 pinch、指针工具触摸拖动不 pan、骰子落点锚在当前玩家附近

## 2026-04-13 屏幕空间 camera window

- follow camera 的 camera window 从世界坐标偏移改为屏幕空间窗口：
  - 使用玩家与当前相机目标的 NDC 投影判断是否出界
  - 只在玩家投影超出屏幕窗口时，把相机目标平移到窗口边缘
  - 视角越远时，同样的屏幕窗口自然覆盖更大的世界范围
- 初始化 follow camera 时先把相机放到当前目标，再从下一帧开始计算屏幕窗口，避免首帧旧矩阵造成错误偏移。
- 验证：
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run build --workspace @watcher/client`
  - `develop-web-game` Playwright 脚本回放 `basic-movement-right`，golden 通过且无 console error
  - 自定义 Playwright 交互检查：拖拽后玩家回到屏幕窗口边界内，zoom out 后仍按屏幕窗口约束

## 2026-04-13 PWA 与单点按压优先级

- 按移动端 Web 游戏的 PWA 方案补齐客户端外壳：
  - 新增 `manifest.webmanifest`，使用 `fullscreen + landscape`，并声明主题色、启动范围和 SVG 图标
  - 新增生产环境 service worker，缓存 app shell 与静态资源，导航请求保持 network-first 回退
  - `index.html` 增加 manifest、theme color、standalone/iOS Web App meta 与 `viewport-fit=cover`
  - `main.tsx` 仅在生产环境注册 service worker，避免开发时缓存干扰
- 单点按压优先级整理：
  - 场景弧形工具按钮、选择按钮与左侧栏工具按钮在 `pointerdown/click` 阶段阻止事件继续冒泡
  - 工具按钮区域使用 `touch-action: none`，棋盘区域保持 `touch-action: none`
  - 页面根节点增加 `overscroll-behavior`，减少移动端下拉刷新/边界滚动干扰
- 已验证：
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run build --workspace @watcher/client`
  - `develop-web-game` Playwright 脚本回放 `basic-movement-right`，golden 通过且无 console error
  - 自定义 Playwright 交互检查：棋盘拖动会平移视角，静止长按会显示检查卡，按住场景工具按钮拖动时相机位移为 0px

## 2026-04-13 移动端全屏提示

- 确认 PWA manifest 不会改变普通浏览器标签页的地址栏/标签栏表现：
  - `display: fullscreen` 只影响已安装 PWA 从桌面图标启动后的显示模式
  - `requestFullscreen()` 需要用户手势，不能在横屏事件中静默触发
- 新增移动端普通浏览器提示：
  - `MobilePwaPrompt` 在 coarse pointer 且非 standalone/fullscreen display mode 时显示
  - 支持 `beforeinstallprompt` 的浏览器会出现“安装应用”入口
  - 支持 Fullscreen API 的浏览器会出现“进入全屏”入口
  - iOS 等不支持安装事件的浏览器显示“分享菜单添加到主屏幕”的文字提示
- 调整提示位置：
  - 横屏时放在右上角，避免遮挡创建页底部按钮
  - 竖屏时保持底部展示，并低于横屏提示层级
- manifest 补充 `id` 与 `display_override`，让不支持 `fullscreen` 的浏览器按 `standalone / minimal-ui / browser` 顺序回退。
- manifest 将同一个 SVG 图标显式声明为 `any / 192x192 / 512x512`；后续若要更稳触发 Chromium 安装推广，建议补正式 PNG 图标导出链。
- 已验证：
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run build --workspace @watcher/client`
  - `develop-web-game` Playwright 脚本回放 `basic-movement-right`，golden 通过且无 console error
  - 移动端横屏 Playwright 检查：首页、创建页和对局内都会显示移动端全屏/安装提示

## 2026-04-14 阴影相机范围

- 为 directional light 增加按地图尺寸估算的 shadow camera bounds：
  - 主棋盘、建房地图预览、地图编辑器都使用 `estimateBoardShadowBounds()`
  - bounds 使用棋盘半对角线加保守 margin，避免 Three.js 默认 `10 x 10` 阴影正交范围在大地图上出现方形边界
- 已验证：
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run build --workspace @watcher/client`

## 2026-04-14 地形预览强调

- `PreviewDescriptor` 新增 `highlightTiles`：
  - shared 提供显式写入 helper，由工具或地形在结算过程中主动登记强调地块
  - 当前覆盖顺向传送带加速、土墙被击碎、毒气/坑洞死亡预览
  - client 根据当前地形类型决定具体表现，不在 shared 写 mesh 细节
- 客户端棋盘地形预览：
  - 传送带高亮时箭头变绿
  - 土墙资产重做为层次不齐的长条柱子，高亮时虚化并向外倒塌
  - 毒气/坑洞高亮时在地块上方显示红色危险提示
- 已验证：
  - `npm.cmd run typecheck`
  - `npm.cmd run build --workspace @watcher/client`
  - shared 语义抽检：移动经过传送带/土墙、坑、毒时 `preview.highlightTiles` 分别返回预期坐标
  - `npm.cmd run goldens`，`31/31` golden cases passed
- 调整：
  - `highlightTiles` 改为显式写入，不再在 draft 终结时从地形触发或 tile mutation 反推
  - 传送带、毒气、坑洞由各自 terrain module 写入；土墙破坏由现有破坏发生点写入

## 2026-04-14 Pit 动画与移动端地形预览

- 修正 Pit 相关 presentation 顺序：
  - 在 `ActionPresentation` 生成与追加边界统一规范 motion 顺序，按 `startMs` 稳定排序
  - 移除位移系统内针对 pass-through 事件的局部重排做法，避免把 Pit 当成个例处理
  - 非 motion 事件保留原槽位与相对顺序，避免打乱现有 reaction / state transition 播放约定
  - 保持 leap 中间格使用 `leap` 语义，只有落点使用 `landing` 触发接触型地形
- 修正移动端长按地形说明闪退：
  - canvas contextmenu 阻止继续冒泡，避免移动端长按菜单事件清掉刚显示的检查卡
  - touch 场景按下进入检查/平移候选时调用 `preventDefault()`，减少浏览器长按行为干扰
- 已验证：
  - `npm.cmd run typecheck`
  - `npm.cmd run goldens`，`31/31` golden cases passed
  - `npm.cmd run build --workspace @watcher/client`
  - shared 语义抽检：Pit 触发时 presentation 顺序为 `motion:ground:0 -> motion:spin_drop:150`
  - shared 语义抽检：跳跃飞过 Pit 只生成 `motion:arc:0`，不生成 `spin_drop`

## 2026-04-14 工具拖拽跟随与移动端取消区

- 调整 pointer tool 拖拽时的 follow 相机：
  - 工具拖拽激活后，相机 focus 从当前行动玩家切换为当前 pointer 的世界坐标
  - pointer 释放、取消或执行后，focus 清回玩家，并进入 `recentering`
  - 工具拖拽使用独立的 `TOOL_POINTER_CAMERA_WINDOW_NDC_X/Y` 参数，当前先与角色 follow 的 camera window 保持一致
- 新增移动端底部取消区：
  - touch 拖拽工具时，屏幕底部显示取消带
  - 手指拖入底部取消带，或在取消带内抬起时，按与右键相同的路径取消当前工具交互
  - 取消带只依赖当前 pointer tool 状态，不引入任何 Tool 专用特判
- 客户端实现整理：
  - `SceneToolCancelZone` 作为独立 scene overlay 组件挂入 `BoardScene`
  - `BoardScene` 单独维护工具拖拽期间的原始 pointer 世界坐标，避免把相机逻辑塞进 tool interaction session
- 已验证：
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run build --workspace @watcher/client`
  - `npm.cmd run goldens`，`31/31` golden cases passed

## 2026-04-15 场景 Overlay 回归修复

- 修复 PC 端拖拽工具时右键无法取消：
  - 右键取消相关的 `pointerdown / mousedown / contextmenu` 改为 capture 阶段监听，避免被 scene canvas 上的事件链吞掉
  - canvas 仍然阻止浏览器右键菜单，但不再拦截后续取消逻辑
- 修复移动端地形长按预览与取消区定位：
  - 不再使用 R3F `Html fullscreen` 承载地形预览卡和工具取消区
  - 新增 `useSceneOverlayStore`，由 `BoardScene` 同步 overlay 状态，`GameBoardCanvas` 在 `board-shell` 下以普通 DOM UI 渲染
  - 这样地形预览卡与取消区都固定在 3D 视口屏幕空间，不再跟随相机或 scene 变换漂移
  - 工具取消命中区域改为基于主 canvas 的可视区域底边计算，不再错误使用整窗 `window.innerHeight`
- 客户端验证：
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run build --workspace @watcher/client`
  - `npm.cmd run goldens`，`31/31` 通过
  - 桌面端 Playwright 复现并验证：拖拽 `scene-tool-jump-1` 时右键后，`selectedToolInstanceId` 从 `jump-2` 变为 `null`
  - 移动端 landscape 模拟验证：长按地块时 `inspectionCard` 正常出现，预览框 rect 与 `board-shell` 对齐；拖拽工具时取消区 rect 在连续 touch move 中保持不变
- 2026-04-15 补充微调：touch 拖拽工具进入取消区时只高亮，不再立刻取消；改为松手时再按取消区命中执行取消，避免误触。
- 2026-04-15 补充微调：将 `board-shell__ui-layer` 层级抬高到工具环之上，避免地形预览卡被场景工具栏遮挡；工具拖拽时的相机 follow 目标改为“鼠标所在格中心”，并对目标格做棋盘边界钳制，减少平移抖动并避免视角被拖出棋盘。
- 2026-04-15 补充微调：`board-shell__ui-layer` 的层级提升到高于 drei `Html` 默认区间，避免地形预览卡仍被场景工具环遮挡；工具拖拽 follow 改为“目标格中心 + 切格迟滞”，仅在指针真正进入相邻格一定深度后才切换 follow tile，减少边界来回跳动。

## 2026-04-22 背景音乐与表现层音效

- 新增 shared 音效语义：
  - `ActionPresentation` 增加 `sound` 事件类型，沿用 `startMs` 时间线，并保留 `anchor` 以支持未来空间音效扩展
  - 新增 `packages/shared/src/content/sounds.ts` 与 `packages/shared/src/sounds.ts` 作为音效 cue 注册表与查询入口
  - `sound` 事件约定为触发型语义，`durationMs = 0`，不延长 action busy 时长
- 背景音乐接入：
  - `App.tsx` 增加页面级 BGM 切换，主页/建房/进房前使用 `Porchside Pause`
  - 进入实际对局地图后切换为 `Marimba Turn`
  - `GameAudioDirector` 负责首个用户手势解锁音频、循环播放与切歌
- 表现层音效接入：
  - 脚步声进入 shared 位移主流程，普通移动按落格出声，飞跃只在落地时出声
  - 土墙击碎在真实地形变化处写入破碎音效，不由 client 反推
  - 多个工具模块在效果触发点各自写入 `sound` 事件，避免集中式 `toolId -> sound` 特判
- client 音频资源整理：
  - 音频素材统一放入 `packages/client/src/game/assets/audio/`
  - 新增 `audioRegistry.ts`、`audioRuntime.ts`、`GameAudioDirector.tsx`，分别负责 cue 映射、播放运行时与 presentation 调度
  - 脚步等多变体音效按 `event.id` 稳定选样，保证随机感与回放一致性
- 测试与验证：
  - `npm.cmd run typecheck`
  - `npm.cmd run build --workspace @watcher/client`
  - `npm.cmd run goldens`，`31/31` golden cases passed
  - 浏览器轻量冒烟：主页与建房页无新增 console / page error

## 2026-04-24 撞击机制与拳击球地形

- 新增 shared 通用 `impact` 语义：
  - `translate` 在仍有剩余步数时被 solid tile 阻挡，会以剩余步数 author 一次 `impact`
  - `drag / leap / landing` 不参与这套机制；投掷物命中 solid tile 时统一按 `impactStrength = 999` 触发地形 impact
  - 地形模块新增 `onImpact` 入口，由 `movementSystem` 与投掷物结算统一分发
- 新增撞击表现：
  - `ActionPresentation` 增加 `motion(style = "impact_recoil")`，角色会继续顶到墙边，再回弹到格子中心
  - `ActionPresentation` 的 `reaction` 增加通用 `number_popup` 载荷，用于显示拳击球撞击值
  - client 的 `PlaybackEngine`、`BoardScene` 与 presentation 资源接入新的 recoil motion 和 number popup 渲染
- 新增地形 `boxingBall`：
  - 作为新的 solid tile，阻挡地面移动与投射物
  - 被任意 impact 命中时播放摇摆 effect
  - 被当前回合玩家以 `translate` 撞击 `x` 时，头顶弹出数字 `x`，并奖励一个 `projectilePushDistance = x` 的 `punch`
  - 地图符号与地图编辑器缩略图新增 `b`
- 投掷物接入：
  - 现有 `awmShoot / basketball / rocket / punch` 的 solid collision 均会分发 projectile impact
  - 本轮按需求不扩展 projectile trace 的中途 bounce contact 链路
- 测试与验证：
  - `npm.cmd run typecheck --workspace @watcher/shared`
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run typecheck --workspace @watcher/server`
  - `npm.cmd run goldens`，`34/34` golden cases passed
  - `npm.cmd run build --workspace @watcher/client`
## 2026-04-24 拳击球白屏修复与零路径撞击落地

- 修复拳击球撞击时的数字弹字实现：
  - 将 `NumberPopupReactionVisual` 从 `@react-three/drei` 的 `Text + Billboard` 改为投影到世界坐标的 `Html`
  - 避免运行时首次挂载 3D 文本时触发整棵 scene 的不稳定重渲染，收敛“3D 视口整屏闪烁后看不见内容”的风险
- 调整主动平移工具的“零路径撞击”语义：
  - `MovementSystemResolution` 新增 `impactStrength`
  - `movement` 与 `brake` 不再因为 `path.length === 0` 就直接判 blocked；只要实际 author 了 `impact`，就视为一次有效使用
  - 这样角色贴着墙或拳击球主动使用平移工具时，也能正常触发撞击表现与后续地形效果
- 新增 golden：
  - `movement-impact-adjacent-boxing-ball-still-applies`
  - 覆盖“第一步就撞上相邻拳击球、位移路径为空，但依然消耗工具并获得缩放 punch”的链路
- 本轮验证：
  - `npm.cmd run typecheck --workspace @watcher/shared`
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run goldens`，`35/35` passed
  - `npm.cmd run build --workspace @watcher/client`
  - Playwright 复查 `/goldens?case=movement-impact-adjacent-boxing-ball-still-applies`，未出现新的 console/page error

## 2026-04-25 起床战争模式

- 新增 `bedwars` 模式主链：
  - `GameMode` 扩展为 `free / race / bedwars`
  - 玩家快照、房间同步状态与客户端反序列化新增 `teamId`
  - 棋盘地块新增通用 `faction` 字段，用于承载阵营出生点、阵营营地、塔等阵营地形
  - 新增 `teams.ts` 统一顺序分队、白队/黑队显示名与浅色/深色玩家色分配
- 新增起床战争核心规则：
  - 服务器与本地 simulation 都按加入顺序自动分配白队/黑队
  - `tower` 作为新的 `solid` 地形，被敌方角色撞击时耐久 `-1`，耐久归零后击碎为 `floor`
  - `teamSpawn` 作为阵营出生点，bedwars 下复活点按阵营出生点推导
  - `teamCamp` 作为阵营营地，仅己方角色在自己回合停留时触发一次随机工具骰奖励
  - 玩家被 `pit / poison` 击倒后，若己方塔仍存在则回出生点并挂 `basis:stun`；若塔已毁则直接淘汰
  - 一方全部淘汰后立即进入 settlement
- 能力系统扩展：
  - 新增通用 runtime modifier `basis:stun`
  - `ModifierPhaseHookResult` 新增 `skipTurn`
  - `gameOrchestration` 接入回合开始自动跳过并清除眩晕
- 表现与客户端入口：
  - 新增 `TowerTileAsset`、`TeamSpawnTileAsset`、`TeamCampTileAsset`
  - `tower` 顶部常驻显示剩余耐久
  - 新增 `BedwarsSettlementOverlay`
  - 创建房间页面、侧边栏模式文案、地图编辑器模式选择与导入导出格式都接入 `bedwars`
- 内容与测试：
  - 新增内置地图 `bedwars_test`
  - 地图符号新增 `t/T`（白/黑塔）、`i/I`（白/黑出生点）、`c/C`（白/黑营地）
  - 新增 6 个 bedwars golden case，覆盖塔掉血/击碎、营地奖励、复活附眩晕、眩晕跳回合、无塔淘汰结算
- 本轮验证：
  - `npm.cmd run typecheck --workspace @watcher/shared`
  - `npm.cmd run typecheck --workspace @watcher/server`
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run goldens`，`41/41` passed

## 2026-04-25 Bedwars 结算延后与塔撞击特效

- 塔撞击表现补充：
  - `tower` 在 `onImpact` 时直接 author `reaction.effect(kind = "tower_impact")`
  - client 新增 `TowerImpactEffectAsset`，用石质冲击环与碎片脉冲表现撞塔
  - `TileMutation` 新增可选 `presentationStartMs`，用于让塔掉耐久/碎裂与撞击接触帧对齐，而不是默认落在 `0ms`
- bedwars 最终淘汰后的结算时机调整：
  - shared 不再在最后一名玩家死亡的同一帧立刻切入 `settlement`
  - 改为先保留 `roomPhase = in_game`，同时写入 `pendingAdvance(kind = "presentation_settlement")`
  - server 继续按 `latestPresentation.durationMs` 等待当前 presentation 播放完成，再通过 `advanceTurn()` 进入真正的 settlement
  - 当前 `settlementState` 仍会在淘汰结算后立即变为 `complete`，但 client 结算覆盖层仍由 `roomPhase === "settlement"` 控制，因此不会抢在动画前弹出
- 抽检与验证：
  - golden runner 会自动结清 `pendingAdvance`，因此 bedwars 相关 golden 的最终态保持不变
  - 共享层手工脚本抽检：最终淘汰的 `dispatch` 结果会停留在 `roomPhase = in_game / settlementState = complete / pendingAdvance = true`
  - `npm.cmd run typecheck --workspace @watcher/shared`
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run goldens`，`41/41` passed
  - `npm.cmd run build --workspace @watcher/client`

## 2026-04-25 持续状态表现与眩晕延后跳过

- 持续状态表现接入：
  - client 新增 `PlayerStatusVisuals`
  - 眩晕持续期间，玩家头顶常驻眩晕符号
  - 束缚持续期间，玩家身上常驻链条缠绕表现
  - 前端直接读取 `Player.modifiers + Player.tags` 渲染状态，不额外为眩晕补一层专用 tag
  - 束缚使用 `basis:bondage` 判定状态存在，并读取 `basis:bondage-stacks` 控制层数
- 眩晕回合改为平滑跳过：
  - `basis:stun` 仍在 `turn-start` 被移除
  - 但不再立即同步切到下一个玩家
  - shared 现在会先把当前玩家正常设为 `currentPlayerId`，触发视角切换
  - 随后 author 一段 `stun_clear` reaction，并写入 `pendingAdvance(kind = "turn_skip")`
  - presentation 播完后，再自动推进到下一名玩家
- golden runner 调整：
  - 构建 playback 时会先结清场景初始化阶段已经存在的 `pendingAdvance`
  - 这样像 `bedwars-stun-skips-next-turn` 这类 0 step case 仍然比较稳定最终态
- 本轮验证：
  - `npm.cmd run typecheck --workspace @watcher/shared`
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run goldens -- --case bedwars-stun-skips-next-turn`
  - `npm.cmd run goldens`，`41/41` passed
  - `npm.cmd run build --workspace @watcher/client`

## 2026-04-29 新增玩家向规则与内容定义文档

- 新增 `docs/游戏规则与内容定义.md`：
  - 定位为面向玩家的规则、概念与内容权威定义文档，不承载代码架构说明
  - 第一部分集中定义当前回合、工具与技能、位移类型、撞击、玩家状态等公共概念
  - 第二部分集中定义当前工具骰的基础六工具，以及现有全部角色技能
  - 角色技能条目同时补足了与专属工具直接相关的用户向规则说明，避免玩家文档依赖实现文件才能读懂
- 更新 `docs/index.md`：
  - 将这份新文档加入开发文档索引，并放在架构文档之前，作为领域规则入口
- 本轮验证：
  - 文档变更，未运行代码测试

## 2026-04-26 被动平移 impact 修复与 buffers 归档

- 被动平移的 impact 结算统一收口：
  - `movementSystem` 新增 `didDisplacementTakeEffect()`，统一判断一次位移是否真正产生了效果：`path.length > 0` 或 `impactStrength !== null`
  - `movement / brake` 改为直接复用这条语义，而不是各自手写 `path + impactStrength` 判断
  - `basketball / bombThrow / punch / rocket` 在消费嵌套位移 presentation 时也改为复用这条语义，因此“零路径但发生撞击”的被动平移不会再把 impact recoil 动画丢掉
  - 新增 golden case `basketball-passive-push-adjacent-wall-still-recoils`，覆盖篮球把贴墙角色撞出 zero-step impact 的场景
- 通用 runtime modifier 归档：
  - 新增 `packages/shared/src/buffers/`
  - `basis:stun` 与 `basis:bondage` 从 `skills/` 挪到 `buffers/`
  - `skills/index.ts` 继续统一注册并对外 re-export，这样外部调用点可以平滑过渡
- 本轮验证：
  - `npm.cmd run typecheck --workspace @watcher/shared`
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run typecheck --workspace @watcher/server`
  - `npm.cmd run goldens`，`42/42` passed
  - `npm.cmd run build --workspace @watcher/client`

## 2026-04-26 文本描述模型收口

- `ToolContentDefinition` 与 `ToolDefinition` 删除顶层 `description`
  - 工具正文描述统一只保留 `getTextDescription().description`
  - `disabledHint` 继续保留，专门负责不可用时的说明前缀
- `TextDescription.details` 改为可选
  - UI 读取点统一改成按需读取，不再要求所有模块机械返回空数组
  - 顺手清理了 `balance / deployWallet` 里原本只用于占位的空 detail
- `SkillDefinition` 删除 `summary`
  - 技能文本统一只保留 `getTextDescription`
  - `Character.summary` 继续保留，仍用于角色卡与场景检查卡的短描述

## 2026-04-30 Lamp 历史复制与 turn-start 立即投骰

- 通用 choice / turn-start 流程继续收口：
  - `ActionPhaseEffect` 新增 `rollMode`
  - `gameOrchestration` 恢复并正式接入“工具使用后立刻投骰再进入行动阶段”的主链
  - `volatySkipToolDie` 与 `lampCopy` 都改为通过这条通用机制推进，而不是让玩家再额外点一次 `rollDice`
- shared 核心层新增通用 `toolHistory`
  - 用 `toolHistory` 取代旧的 `roundUsedTools`
  - 历史记录字段统一为 `toolId / params / playerId / source / turnNumber`
  - server schema / room mapper / client deserialize 全部同步改成 `toolHistoryJson`
- Lamp 机制重做：
  - 取消旧的 `lampPrepareCopy -> onDiceRoll grant lampCopy` 两段式
  - 改为在 `turn-start` 直接授予并使用 `lampCopy`
  - `lampCopy` 会从“自己上回合结束后到本回合开始前，其他玩家使用过的工具记录”中，确定性抽取至多 3 项供选择
  - 选择结果只把 `toolHistory` 索引写入 tag；真正的复制工具在 `onTurnActionStart` 消耗该 tag 后发放
  - 不再限制只能复制 `turn-action` 可用工具，也不再排除 `movement`
- Volaty 约束补齐：
  - `isAvailable` 现在显式要求 `turn-start`
  - 使用后立即进入只掷移动骰的流程
- 文档同步：
  - 更新 `docs/游戏规则与内容定义.md`
  - 更新 `docs/arch/能力系统统一模型.md`
- 本轮验证：
  - `npm.cmd run typecheck --workspace @watcher/shared`
  - `npm.cmd run typecheck --workspace @watcher/server`
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run goldens`，`46/46` passed
  - `npm.cmd run build --workspace @watcher/client`

## 2026-05-01 Blaze / AWM / Wallet / Bondage 规则更新

- `turn-start` 特殊投骰主链补齐：
  - `ActionPhaseEffect.rollMode` 新增 `tool_only`
  - `gameOrchestration` 统一支持三种进入行动阶段的投骰模式：`standard / movement_only / tool_only`
  - `Blaze` 的【备弹】改为放弃本回合移动骰，立刻只投工具骰，并在本回合行动阶段获得【投弹】
- 新增通用 `ModifierHooks.onToolPrepare`
  - `resolveToolAction()` 在 shared 侧真正执行工具前，先统一应用 modifier 对工具的准备期改写
  - `basis:bondage` 改为在这一步扣减主动移动工具的 `movePoints`
  - 束缚的规则语义随之收口为“影响下一次主动移动的实际结算，并在回合结束自动清除”
- `bombThrow` 表现升级：
  - 复用火箭投射物与爆炸 effect
  - 投掷起点改为施法者当前位置
  - 允许斜线飞向目标格
- 钱包规则调整：
  - 钱包不再只允许领导捡取
  - 任意玩家只要满足正常触发条件，都可以拾取钱包
- 角色内容调整：
  - `Leader` 技能 id 标准化为 `leader-deploy-wallet`
  - `Farther` 技能 id 标准化为 `farther-balance`
  - `Mountain` 改为每个行动阶段开始时获得耐久 2 的【砌墙】
  - `AWM` 改为在行动阶段获得【子弹】，消耗全部未使用移动点数充能，按同值推动并施加同值束缚
- 文档同步：
  - 更新 `docs/游戏规则与内容定义.md`
  - 更新 `docs/arch/能力系统统一模型.md`
- 本轮验证：
  - `npm.cmd run typecheck --workspace @watcher/shared`
  - `npm.cmd run typecheck --workspace @watcher/server`
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run goldens`，`47/47` passed
  - `npm.cmd run build --workspace @watcher/client`

## 2026-05-01 Leader / Farther 工具命名、钱包 turn-start 触发与 Blaze 交互修复

- 角色专属工具 id 标准化：
  - `deployWallet -> leaderDeployWallet`
  - `balance -> fartherBalance`
  - 同步更新 shared 工具模块、角色技能发放、client `actionUi`、预览资源映射与 golden case
- 召唤物运行时代码按目录归档：
  - 删除旧的 `packages/shared/src/summons.ts`
  - 新增 `packages/shared/src/summons/`
  - 以 `wallet.ts + index.ts + types.ts` 的方式管理召唤物定义与触发
- 钱包触发补齐：
  - 钱包仍会在主动经过或落地时触发
  - 另外新增“当前玩家在 `turn-start` 阶段踩在钱包上时自动触发”
  - shared 通过 `applyPhaseEntryStop(..., { includeSummons: true, includeTerrain: false })` 只对召唤物开放该时机，避免顺手改变地形时机
  - 新增 golden case `wallet-turn-start-pickup-on-stand`
- Blaze / client 交互修复：
  - `diceRollAnimation` 不再在 `tool_only` 情况下伪造点数骰；现在 `lastRolledMoveDieValue <= 0` 时不会生成点数骰动画
  - `BoardScene` 的多段 pointer 交互起点不再依赖 render 时的旧 `interactionSession` 布尔值，而是读取最新 `interactionSessionRef`，修复第二段偶发无法开始的问题
- 轻量浏览器验证：
  - 使用 `develop-web-game` 脚本对 `?mode=goldens&case=blaze-prepares-bomb-and-throws-next-turn` 做了 headless 探测
  - 该 golden route 的自动截图在当前脚本下未形成可用画面，因此这轮最终仍以 static review + typecheck + goldens 为主
- 本轮验证：
  - `npm.cmd run typecheck --workspace @watcher/shared`
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run typecheck --workspace @watcher/server`
  - `npm.cmd run goldens`，`48/48` passed
  - `npm.cmd run build --workspace @watcher/client`
