# MovementDescriptor 系统迁移操作表

本文档是临时收口清单，只讨论 shared 主规则层中的 MovementDescriptor 相关设计，不涉及具体 tool / terrain / summon 内容实现。

## 当前判断

### 保留项

- `MovementDescriptor`
  - 权威定义位置：`packages/shared/src/types.ts`
  - 明确定义：一次已经确定最终语义的位移描述，必须完整表达：
    - `type`：位移类型，决定规则行为与表现语义
    - `disposition`：主动/被动
    - `timing`：回合内/回合外
    - `tags`：附加规则标签

- `resolveToolMovementType()`
  - 权威定义位置：`packages/shared/src/skills/index.ts`
  - 明确定义：角色 modifier 对工具位移类型的唯一覆写入口
  - 它回答的是“默认类型经过角色/状态修正后，这次实际应当按什么 `MovementType` 处理”

- `movementSystem` 四个入口
  - `resolveLinearDisplacement()`
  - `resolveDragDisplacement()`
  - `resolveLeapDisplacement()`
  - `resolveTeleportDisplacement()`
  - 明确定义：最终位移求解器，接收完整 `MovementDescriptor`，产出路径、impact、触发器和表现时间

### 计划删除项

- `MovementDescriptorInput`
  - 删除原因：它只保存 `disposition / timing / tags`，但在现有系统中，几乎没有一个稳定场景真正需要“先拥有不完整的位移描述”
  - 现在它主要是为了配合 `createToolMovementPlan()` 和 movementSystem 的二段式拼装而存在

- `MovementContentDefinition`
  - 删除原因：它回答的是“这个工具通常是什么位移”，不是“这次实际发生的位移是什么”

- `createMovementDescriptorInput()`
  - 删除原因：如果 `MovementDescriptorInput` 删除，这个 helper 也随之删除

- `materializeMovementDescriptor()`
  - 删除原因：当前没有实际调用，且概念上只是把 `MovementContentDefinition + options` 再包一层

- `ToolMovementPlan`
  - 删除原因：它把“最终 type”和“半成品 descriptor”捆在一起，造成工具层必须理解一个中间态结构

- `createToolMovementPlan()`
  - 删除原因：它的实际职责是：
    1. 读工具默认 movement 定义
    2. 调 `resolveToolMovementType()`
    3. 拼 tags / timing / disposition
    4. 返回一个中间壳 `ToolMovementPlan`
  - 这四步可以直接收敛成“返回完整 `MovementDescriptor`”

- `createPassiveToolMovementPlan()`
  - 删除原因：和上面同理，应直接返回完整 `MovementDescriptor`

## 结构性判断

### 当前奇怪点 1：tool 层掌握了“半个 descriptor”

当前典型调用形态：

- `movement.ts`
  - 先 `createToolMovementPlan()`
  - 再根据 `movement.type` 选位移求解器
  - 再把 `movement.descriptor` 传给求解器

这说明 `ToolMovementPlan` 不是一个真正稳定的领域概念，只是当前 helper 的产物。

### 当前奇怪点 2：movementSystem 负责把 input 补全为 descriptor

当前 `resolveSteppedDisplacement()` / `resolveLeapDisplacement()` / `resolveTeleportDisplacement()` 内部还要再调用：

- `createMovementDescriptor(movementType, options.movement)`

这意味着“最终位移语义”的组装责任落在 movementSystem 内部，而 tool 层其实已经知道足够多的信息来组装它。

### 当前奇怪点 3：同一个概念被拆在两个阶段里，但边界并不自然

按现状：

- tool 层决定 `disposition / timing / tags`
- modifier 决定可能覆写后的 `type`
- movementSystem 才拿到完整 descriptor

这里真正有意义的只有“modifier 可能改 type”这一步；除此之外，没有必要引入一个单独的 Input 类型。

## 迁移后目标模型

### 目标 1：tool 层直接产出完整 MovementDescriptor

保留一个新的 helper，建议命名二选一：

- `resolveToolMovementDescriptor()`
- `createToolMovementDescriptor()`

推荐定义：

- 输入：
  - `ToolActionContext`
  - `ToolContentDefinition`
  - `fallbackType`
  - `extraTags`
  - 可选 `timingOverride`
  - 可选 `dispositionOverride`
- 输出：
  - `MovementDescriptor`

它一次性完成：

1. 读取工具的默认 `actorMovement`
2. 通过 `resolveToolMovementType()` 得到最终 `type`
3. 组装 `disposition / timing / tags`
4. 返回完整 `MovementDescriptor`

### 目标 2：passive 位移也直接产出完整 MovementDescriptor

保留一个新的 helper，建议命名：

- `createPassiveMovementDescriptor()`

输入：

- `toolId`
- `type`
- `extraTags`
- 可选 `timingOverride`

输出：

- `MovementDescriptor`

### 目标 3：movementSystem 只接受完整 descriptor

迁移后各入口签名改为只收：

- `movement: MovementDescriptor`

不再收 `MovementDescriptorInput`

movementSystem 内部不再调用：

- `createMovementDescriptor()`

而是直接使用传入的 `movement`

## 逐文件迁移操作表

### 1. `packages/shared/src/rules/displacement.ts`

操作：

- 删除 `MovementDescriptorInput`
- 删除 `createMovementDescriptorInput()`
- 删除 `materializeMovementDescriptor()`
- 评估 `createMovementDescriptor()` 是否保留

保留建议：

- 若 tool helper 直接手工返回 `MovementDescriptor`，则 `createMovementDescriptor()` 也可以删除
- 若仍希望保留一个小型构造器，则把它改成“唯一完整构造器”，签名直接接收四元组：
  - `type`
  - `disposition`
  - `timing`
  - `tags`

### 2. `packages/shared/src/tool-modules/helpers.ts`

操作：

- 删除 `ToolMovementPlan`
- 删除 `createToolMovementPlan()`
- 删除 `createPassiveToolMovementPlan()`
- 新增：
  - `resolveToolMovementDescriptor()`
  - `createPassiveMovementDescriptor()`

注意：

- `resolveToolMovementType()` 仍然保留在 skills 层调用
- helper 的输出从 `{ type, descriptor }` 改成单个 `MovementDescriptor`

### 3. `packages/shared/src/rules/movementSystem.ts`

操作：

- `MovementRuntimeOptions.movement` 从 `MovementDescriptorInput` 改成 `MovementDescriptor`
- 删除内部所有 `createMovementDescriptor(...)`
- `resolveSteppedDisplacement()` 内：
  - `movement` 直接使用传入 descriptor
  - `movementLanding` 若仍需要，显式复制一个 descriptor，仅把 `type` 改为 `"landing"`
- `resolveLeapDisplacement()` 同理
- `resolveTeleportDisplacement()` 直接使用传入 descriptor；若 teleport 语义坚持必须是 landing，则调用方直接传 landing descriptor

注意：

- 这里会暴露一个新问题：`movementLanding` 是否真的是独立概念，还是只是 stop/pass-through 语义需要的临时变体
- 本轮先不改语义，只把“构造完整 descriptor 的责任”前移到调用方

### 4. `packages/shared/src/tool-modules/movement.ts`

操作：

- `const movement = createToolMovementPlan(...)` 改为 `const movement = resolveToolMovementDescriptor(...)`
- 原有 `movement.type` 分发逻辑保留，但直接基于完整 `MovementDescriptor`
- 传入 movementSystem 时改为 `movement`

### 5. `packages/shared/src/tool-modules/jump.ts`

操作：

- 改为直接拿完整 `MovementDescriptor`
- `resolveLeapDisplacement(..., movement)`

### 6. `packages/shared/src/tool-modules/brake.ts`

操作：

- 改为直接拿完整 `MovementDescriptor`
- `resolveLinearDisplacement(..., movement)`

### 7. `packages/shared/src/tool-modules/teleport.ts`

操作：

- 改为直接拿完整 `MovementDescriptor`
- 若 teleport 永远是 landing，则 helper 直接返回 `type: "landing"` 的完整 descriptor

### 8. `packages/shared/src/tool-modules/hookshot.ts`

操作：

- `actorMovement` 改为完整 `MovementDescriptor`
- `pulledMovement` 改为完整 `MovementDescriptor`
- 所有 `movement.descriptor` 改为 `movement`

### 9. 其他 passive 推动工具

涉及文件：

- `basketball.ts`
- `punch.ts`
- `rocket.ts`
- `blaze-bomb-throw.ts`
- `awm-shoot.ts`

操作：

- 现在它们很多是 `createMovementDescriptorInput("passive", ...)`
- 迁移后统一改成直接构造完整 `MovementDescriptor`

其中：

- `awm-shoot.ts` 现在已经半步在用完整 descriptor，是最接近目标形态的

## 推荐迁移顺序

1. 先在 `displacement.ts` 明确“未来只保留完整 descriptor”的目标
2. 改 `tool-modules/helpers.ts`，提供新的 descriptor helper
3. 改 `movementSystem.ts` 签名，接受完整 descriptor
4. 改四个主动位移工具：
   - `movement`
   - `jump`
   - `brake`
   - `teleport`
5. 改 `hookshot`
6. 扫 passive 推动工具
7. 最后删除旧类型和旧 helper

## 本轮结论

- `MovementDescriptorInput` 不是一个值得长期保留的领域概念
- 真正需要保留的核心概念只有：
  - `MovementContentDefinition`
  - `MovementDescriptor`
  - `resolveToolMovementType()`
  - movementSystem 各求解器
- `ToolMovementPlan` 的“奇怪感”是准确的，它不是规则本体，而是当前中间过渡壳
