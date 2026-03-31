import type { ActionResolution, ToolActionContext } from "../../types";

export type ToolExecutor = (context: ToolActionContext) => ActionResolution;
