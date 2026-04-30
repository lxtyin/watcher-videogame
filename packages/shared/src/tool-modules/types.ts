import type { ToolContentDefinition, ToolDieFaceContentDefinition } from "../content/schema";
import type { ToolExecutor } from "../rules/executors/types";
import type { ToolActionContext, ToolChoiceDefinition } from "../types";

export interface ToolModule<TId extends string = string> {
  definition: ToolContentDefinition;
  dieFace?: Omit<ToolDieFaceContentDefinition, "toolId">;
  execute: ToolExecutor;
  getChoices?: (context: ToolActionContext) => readonly ToolChoiceDefinition[];
  id: TId;
}
