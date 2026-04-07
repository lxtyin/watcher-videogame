import type { ToolActionContext } from "../../types";
import type { ToolActionDraft } from "../actionDraft";

export type ToolExecutor = (draft: ToolActionDraft, context: ToolActionContext) => void;
