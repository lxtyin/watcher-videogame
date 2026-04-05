import type { ToolContentDefinition, ToolDieFaceContentDefinition } from "../content/schema";
import type { ToolExecutor } from "../rules/executors/types";

export interface ToolModule<TId extends string = string> {
  definition: ToolContentDefinition;
  dieFace?: Omit<ToolDieFaceContentDefinition, "toolId">;
  execute: ToolExecutor;
  id: TId;
}
