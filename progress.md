# 进展记录

## 当前状态

- 已形成 `shared / server / client` 三层 workspace。
- 已接入大厅、准备、开局、结算后回房的联机流程。
- 已实现工具、地形、召唤物、角色能力、竞速模式、golden 测试与本地回放。
- 已建立 `PreviewDescriptor + ActionPresentation + PlaybackEngine` 的表现链路，客户端按语义预览和语义事件播放瞬态。

## 2026-04-06

- 完成 shared 侧工具交互协议重构：
  - `ToolContentDefinition` 删除 `targetMode / tileTargeting`
  - 新增 `packages/shared/src/toolInteraction.ts`
  - `UseToolCommandPayload` 统一改为 `{ toolInstanceId, input }`
  - `ToolDefinition` 统一挂载 `interaction`
- 将 shared 的工具可用性判断与执行入口同步到新协议：
  - `packages/shared/src/actions.ts`
  - `packages/shared/src/gameOrchestration.ts`
  - `packages/shared/src/rules/actionResolution.ts`
  - `packages/shared/src/tools.ts`
- 将预览辅助改为围绕 `PreviewDescriptor` 与选择 slot 工作：
  - `packages/shared/src/rules/previewDescriptor.ts`
  - `packages/shared/src/tool-modules/helpers.ts`
- 重写并统一 shared 工具模块的交互与执行入口，至少覆盖：
  - `movement`
  - `jump`
  - `brake`
  - `hookshot`
  - `basketball`
  - `rocket`
  - `bombThrow`
- 将 client / server / golden runner 全链路同步到新 payload 结构：
  - `packages/client/src/game/interaction/toolInteraction.ts`
  - `packages/client/src/game/state/useGameStore.ts`
  - `packages/client/src/game/state/roomCommands.ts`
  - `packages/client/src/game/utils/boardMath.ts`
  - `packages/shared/src/goldens/runner.ts`
- 浏览器烟测补充验证：
  - 统一 Playwright 客户端验证了“创建房间并进入联机房间”链路
  - 自定义浏览器脚本验证了 shared 新 `input` 结构可真实穿透 server：
    - `buildWall` 的 `tile` 选择成功把 `(1,2)` 改成 `earthWall`
    - `balance` 的 `choice` 选择成功写入 `farther:banked-movement = 1`

## 2026-04-05

- 新增能力系统权威文档 `docs/arch/能力系统统一模型.md`，并冻结顶层概念边界。
- 将玩家跨回合状态容器从旧角色状态模型统一迁移为 `Player.tags` 的 `Tag Map`。
- 新增 `packages/shared/src/modifiers.ts` 与 `packages/shared/src/playerTags.ts`，正式定义 `Skill / Modifier / Player.tags` 运行时接口。
- 引入 `packages/shared/src/skills/`，把角色能力改为 `Character -> Skill -> Modifier`。
- 将 Blaze、Volaty 的回合开始能力改为 `turn-start` 阶段工具，并统一吞并到 `useTool`。
- 删除旧系统：
  - `packages/shared/src/characterRuntime.ts`
  - `packages/shared/src/turnStartActions.ts`
  - `packages/shared/src/content/turnStartActions.ts`
- 将 shared / server / client 全链路中的 `characterState` 迁移为 `tags`。
- 将客户端 HUD 改成统一工具环，不再保留独立的 turn-start action UI。
- 清理架构文档，去除已删除旧系统的现状描述。
- 将回合中段阶段名从 `action` 统一改为 `turn-action`，并同步 shared / server / client / 文档。
- 将 Modifier 阶段 hook 统一收敛为 `onTurnStart / onTurnActionStart / onTurnEnd`。
- 把单个 Tool 的定义与执行收拢到 `packages/shared/src/tool-modules/`，删除旧的分散式 `rules/executors/*` 工具实现文件。
- 将回合开始的停留结算从 `movementSystem.resolveCurrentTileStop` 收回 `gameOrchestration.ts`，由编排层统一处理地形与召唤物停留效果。
- 将运行时可插拔 Modifier 显式迁移到 `Player.modifiers`，不再通过枚举全部 Modifier 再结合 tags 推断激活。
- 新增角色 `AWM` 与基础 Modifier `bondage`，验证“角色安装 Modifier，tags 仅保存层数状态”的可插拔能力模型。
- 扩展 golden 断言以检查 `player.tags` 与 `player.modifiers`，并新增 AWM / bondage 两条能力系统回归用例。
- 为 `packages/server` 与 `packages/client` 的类型检查增加 `@watcher/shared -> ../shared/src/index.ts` 路径映射，避免工作区内 typecheck 读取过期 dist 声明。
- 从 `ActionResolution` 中正式封装 `PreviewDescriptor`，统一表达所有玩家预计落点、当前玩家移动路径、选择范围、作用范围与合法性。
- 将 shared 表现事件统一收敛为 `motion / reaction / state_transition` 三类，不再保留零散动画事件命名。
- 新增 `packages/client/src/game/animation/playbackEngine.ts` 作为客户端唯一播放引擎，统一输出当前时刻的瞬态玩家、投射物、reaction 与显示状态。
- 删除旧的分散式 `presentationPlayback.ts` 与 `displayState.ts` 播放实现，避免表现层双轨。
- 将 client 输入显式限制为“presentation 播放期间不可交互”，避免预览与 authoritative 播放重叠。

## 2026-04-07

- 重组 client 工具资源目录，按 `packages/client/src/game/assets/tools/<tool-id>/` 聚合方向箭头、投射物、爆炸与预览素材，并补一个 `shared/` 放通用 preview asset。
- 将 `BoardScene` 的工具预览收敛成两层：
  - `selectionTiles -> BoardTileVisual` 的统一可选范围高亮
  - `effectTiles -> ToolEffectPreview` 的工具效果预览
- 删除 `previewState.ts` 里的 `summonPreviews / wallGhostPositions / TilePreviewVariant`，不再为 `buildWall`、`deployWallet` 维护专用 preview 字段。
- 收束通用地块预览逻辑，去掉 `BoardTileVisual` 里的 `blast` 分支；火箭爆炸改为通过 `ToolEffectPreview` 选择专用 effect asset。
- 清理 client 旧交互分类残留：
  - `toolSelection.ts` 只保留当前选中工具查询
  - `useKeyboardInteraction.ts` 改为直接读取 shared 的 `interaction` 定义
  - `useGameStore.ts` 删除旧的 `useInstantTool / useChoiceTool / perform*Action` 旁路接口
  - `HudSidebar.tsx` 删除已失效的 choice 侧栏分支
- 验证：`npm.cmd run typecheck --workspace @watcher/client` 通过。
- 按 `docs/AI开发指南.md` 清理当前文档体系：
  - 删除旧的 `docs/arch/角色系统原型.md`
  - 删除早期需求稿 `docs/架构设计_需求文档.md` 与 `docs/玩法设计_需求文档.md`
  - 新增 `docs/arch/表现层原型.md`
  - 重写 `docs/index.md`、`docs/arch/架构总览.md`、`docs/arch/共享规则层.md`、`docs/arch/交互层统一原型.md`、`docs/arch/能力系统统一模型.md`、`docs/arch/内容注册与资源组织.md`、`docs/arch/前后端联机原型.md`、`docs/arch/房间与大厅流程.md`
  - 将能力系统与角色组织收口到单一权威文档 `docs/arch/能力系统统一模型.md`
- 清理并同步 `docs/index.md`、`docs/arch/架构总览.md`、`docs/arch/共享规则层.md`、`docs/arch/前后端联机原型.md` 的表现层文档边界。

## 2026-04-07

- 增强 shared 表现语义：
  - 为 `hookshot` 增加 `hookshot` 投射物 motion 事件，并让拉回动作在钩锁飞行后延迟触发
  - 为 `awmShoot` 增加 `awm_bullet` 子弹投射物 motion 事件
  - 为土墙从 `earthWall -> floor` 的状态切换补充 `earth_wall_break` reaction 事件
- 扩展 shared 表现资源类型：
  - `PresentationProjectileType` 新增 `hookshot` 与 `awm_bullet`
  - `PresentationEffectType` 新增 `earth_wall_break`
- 新增 client procedural mesh 资源：
  - `packages/client/src/game/assets/tools/hookshot/HookshotProjectileAsset.tsx`
  - `packages/client/src/game/assets/tools/awm-shoot/AwmBulletProjectileAsset.tsx`
  - `packages/client/src/game/assets/board/EarthWallBreakEffectAsset.tsx`
- 更新 client 播放链路：
  - `ProjectileVisual.tsx` 接入 `hookshot / awm_bullet`
  - `EffectVisual.tsx` 接入 `earth_wall_break`
  - `playbackEngine.ts` 为不同投射物提供独立的抛物高度
- 调整表现可见性：
  - 放大 AWM 子弹的弹道与尾迹
  - 为钩锁补充更明显的链条与缆线
  - 抬高土墙碎裂的爆点与碎块，避免在 HUD 覆盖下完全不可见
- 更新 golden 断言：
  - `leader-wallet-active-drag-pass` 的事件序列改为包含钩锁投射物
  - `hookshot-pulls-stacked-players` 的事件序列改为包含钩锁投射物
- 浏览器烟测：
  - 用 golden 回放页检查了 `earth-wall-break`
  - 用 golden 回放页检查了 `hookshot-pulls-stacked-players`
  - 用 golden 回放页检查了 `awm-shoot-applies-bondage-tags`
  - 截图中可见钩锁飞行、AWM 蓝色弹道，以及土墙碎裂抬高后的碎块轮廓

## 2026-04-07

- 扩展 `ActionPresentation` 表达能力：
  - `reaction` 新增通用 `link` 子类型，用于在“玩家 / 固定位置”或“玩家 / 玩家”之间播放持续链路效果
  - `createProjectileEvent(..., speed)` 支持由工具模块直接设置投射物飞行速度
- 重写 `hookshot` 表现编排：
  - 先播放出钩 projectile
  - 命中后用 `reaction.link` 表达回收链路
  - 拉墙时为“玩家 -> 固定位置”链路，拉人时为“玩家 -> 玩家”链路
  - 回收期间链路和玩家移动同步播放
- client 新增：
  - `packages/client/src/game/assets/presentation/LinkReactionVisual.tsx`
  - `packages/client/src/game/assets/tools/hookshot/HookshotLinkReactionAsset.tsx`
- 修正选择地块 preview 边界：
  - `deployWallet` 和 `bombThrow` 现在会将 `effectTiles` 裁剪到 `selectionTiles` 内
  - 越界 hover 时不再在 `selectionTiles` 外渲染 effect preview
- 静态规则校验：
  - 用 `tsx` 直接调用 `buildActionPreview()` 验证 `deployWallet` 与 `bombThrow` 在超出范围时 `effectTiles = []`
  - 范围内仍保留正常 preview
- 浏览器烟测：
  - `leader-wallet-active-drag-pass`
  - `hookshot-pulls-stacked-players`
  - `awm-shoot-applies-bondage-tags`
  - 截图可见“先出钩，后回收”的钩锁节奏，以及更快的 AWM 蓝色弹道

## 2026-04-07

- 灏?`hookshot` 鐨勫嚭閽╀笌鏀堕挬鍏ㄩ儴鏀跺彛鍒?`reaction.link`锛屼笉鍐嶄娇鐢?`projectile`锛涚帺瀹剁Щ鍔ㄧ殑 `startMs` 缁熶竴鎺掑埌鈥滈挬瀛愬懡涓悗鈥濆啀寮€濮嬨€?
- `LinkReactionVisual` 琛ュ叆 `progressStyle` 鎾斁锛屾敮鎸佲€滀粠璧风偣寤朵几鈥濅笌鈥滀繚鎸佸叏闀垮害鈥濅袱绉嶉€氱敤閾捐矾褰㈡€併€?
- `buildWall` 鏂板鍗犱綅闄愬埗锛氭棤娉曞湪鏈夌帺瀹舵垨鍙敜鐗╃殑鍦版牸鏀剧疆锛屽苟鍚屾鏀剁揣 `selectionTiles`锛屽彧鏄剧ず鐪熸鍙敤鐨勭┖鍦版牸銆?
- 鏂板 golden 鐢ㄤ緥 `build-wall-blocked-by-player-and-summon`锛屽苟鏇存柊 `leader-wallet-active-drag-pass`銆乣hookshot-pulls-stacked-players` 鐨勪簨浠跺簭鍒楁柇瑷€銆?
- 楠岃瘉锛歚npm.cmd run typecheck --workspace @watcher/shared`銆乶pm.cmd run typecheck --workspace @watcher/client`銆乶pm.cmd run goldens`锛?`23/23` 閫氳繃銆?

## 2026-04-04

- 将回合编排正式收口到 `packages/shared/src/gameOrchestration.ts`。
- `WatcherRoom.ts` 改为 shared orchestration 的适配层，只负责消息入口、schema 映射和 timer 调度。
- `packages/shared/src/simulation/engine.ts` 改为 shared orchestration 的本地包装层。
- 新增 room 的 snapshot/runtime 映射：
  - `roomStateMappers.ts`
  - `roomStateMutations.ts`
- 保留竞速 finish 动画延迟推进，但推进动作本身改为调用 shared `advanceTurn()`。

## 最近验证

- `npm.cmd run typecheck --workspace @watcher/shared`
- `npm.cmd run typecheck --workspace @watcher/server`
- `npm.cmd run typecheck --workspace @watcher/client`
- `npm.cmd run typecheck`
- `node_modules/.bin/tsx.cmd -e "...runGoldenCases(GOLDEN_CASES)..."`
- `npm.cmd run goldens`
- 结果：`22/22` golden cases passed
