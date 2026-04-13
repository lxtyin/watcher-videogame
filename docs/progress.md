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
