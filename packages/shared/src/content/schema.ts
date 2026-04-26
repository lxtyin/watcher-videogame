export type TileType =
  | "floor"
  | "wall"
  | "earthWall"
  | "boxingBall"
  | "tower"
  | "teamSpawn"
  | "teamCamp"
  | "highwall"
  | "poison"
  | "pit"
  | "cannon"
  | "lucky"
  | "emptyLucky"
  | "conveyor"
  | "start"
  | "goal";

export type TeamId = "white" | "black";

export type GameMode = "free" | "race" | "bedwars";

export type TurnPhase = "turn-start" | "turn-action" | "turn-end";
export type Direction = "up" | "down" | "left" | "right";
export type ToolSource = "turn" | "character_skill";
export type MovementType = "translate" | "leap" | "drag" | "landing";
export type MovementDisposition = "active" | "passive";

export type ToolCommonParameterId = "movePoints";
export type ToolParameterId = ToolCommonParameterId | (string & {});

export interface ToolParameterValueMap {
  movePoints?: number;
  [parameterId: string]: number | undefined;
}

export interface TextDescription {
  description: string;
  details?: readonly string[];
  title: string;
}

export interface ToolTextDescriptionContext {
  charges: number;
  params: ToolParameterValueMap;
}

export interface ToolUsabilityContext {
  tool: {
    charges: number;
    params: ToolParameterValueMap;
    source: ToolSource;
    toolId: string;
  };
  tools: readonly {
    charges: number;
    params: ToolParameterValueMap;
    source: ToolSource;
    toolId: string;
  }[];
}

export interface ToolUsabilityResult {
  reason: string | null;
  usable: boolean;
}

export interface ToolChoiceContentDefinition {
  description: string;
  id: string;
  label: string;
}

export type ToolInteractionAnchorDefinition =
  | {
      kind: "actor";
    }
  | {
      kind: "tile_slot";
      slotKey: string;
    };

export type ToolInteractionStageDefinition =
  | {
      anchor: ToolInteractionAnchorDefinition;
      directionKey: string;
      kind: "drag-direction-release";
    }
  | {
      kind: "drag-tile-release";
      tileKey: string;
    }
  | {
      directionKey: string;
      kind: "drag-axis-tile-release";
      tileKey: string;
    }
  | {
      choiceKey: string;
      kind: "modal-choice";
    };

export interface ToolInteractionDefinition {
  stages: readonly ToolInteractionStageDefinition[];
}

export interface MovementContentDefinition {
  disposition: MovementDisposition;
  type: MovementType;
}

export interface ToolContentDefinition {
  actorMovement?: MovementContentDefinition;
  choices?: readonly ToolChoiceContentDefinition[];
  color: string;
  defaultCharges: number;
  defaultParams: ToolParameterValueMap;
  debugGrantable: boolean;
  disabledHint: string | null;
  endsTurnOnUse: boolean;
  getTextDescription: (context: ToolTextDescriptionContext) => TextDescription;
  interaction: ToolInteractionDefinition;
  isAvailable: (context: ToolUsabilityContext) => ToolUsabilityResult;
  label: string;
  phases?: readonly TurnPhase[];
  rollable: boolean;
  source: ToolSource;
}

export interface ToolLoadoutContentDefinition {
  charges?: number;
  params?: ToolParameterValueMap;
  source?: ToolSource;
  toolId: string;
}

export interface ToolDieFaceContentDefinition extends ToolLoadoutContentDefinition {
  toolId: string;
}

export interface CharacterContentDefinition {
  flavorText: string;
  label: string;
  nativeName: string;
  portraitId: string;
  skillIds: readonly string[];
  summary: string;
}

export interface SummonContentDefinition {
  description: string;
  label: string;
  triggerMode: "movement_trigger";
}

export interface PresentationEffectContentDefinition {
  description: string;
  label: string;
}

export interface PresentationSoundCueContentDefinition {
  description: string;
  label: string;
}
