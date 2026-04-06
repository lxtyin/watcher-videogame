import type {
  Direction,
  GridPosition,
  ToolInteractionAnchor,
  ToolInteractionDefinition,
  ToolSelectionRecord,
  ToolSelectionValue
} from "./types";

export const DEFAULT_DIRECTION_SELECTION_KEY = "direction";
export const DEFAULT_TILE_SELECTION_KEY = "targetPosition";
export const DEFAULT_CHOICE_SELECTION_KEY = "choiceId";

export const INSTANT_TOOL_INTERACTION: ToolInteractionDefinition = {
  stages: []
};

function clonePosition(position: GridPosition): GridPosition {
  return {
    x: position.x,
    y: position.y
  };
}

export function cloneToolSelectionValue(value: ToolSelectionValue): ToolSelectionValue {
  if (value.kind === "tile") {
    return {
      kind: "tile",
      position: clonePosition(value.position)
    };
  }

  return {
    ...value
  };
}

export function cloneToolSelectionRecord(record: ToolSelectionRecord): ToolSelectionRecord {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, value ? cloneToolSelectionValue(value) : value])
  );
}

export function createDirectionSelection(direction: Direction): ToolSelectionValue {
  return {
    direction,
    kind: "direction"
  };
}

export function createTileSelection(position: GridPosition): ToolSelectionValue {
  return {
    kind: "tile",
    position: clonePosition(position)
  };
}

export function createChoiceSelection(choiceId: string): ToolSelectionValue {
  return {
    choiceId,
    kind: "choice"
  };
}

export function getDirectionSelection(
  input: ToolSelectionRecord,
  selectionKey = DEFAULT_DIRECTION_SELECTION_KEY
): Direction | null {
  const value = input[selectionKey];
  return value?.kind === "direction" ? value.direction : null;
}

export function getTileSelection(
  input: ToolSelectionRecord,
  selectionKey = DEFAULT_TILE_SELECTION_KEY
): GridPosition | null {
  const value = input[selectionKey];

  if (value?.kind !== "tile") {
    return null;
  }

  return clonePosition(value.position);
}

export function getChoiceSelection(
  input: ToolSelectionRecord,
  selectionKey = DEFAULT_CHOICE_SELECTION_KEY
): string | null {
  const value = input[selectionKey];
  return value?.kind === "choice" ? value.choiceId : null;
}

export function createDragDirectionInteraction(
  directionKey = DEFAULT_DIRECTION_SELECTION_KEY,
  anchor: ToolInteractionAnchor = { kind: "actor" }
): ToolInteractionDefinition {
  return {
    stages: [
      {
        anchor,
        directionKey,
        kind: "drag-direction-release"
      }
    ]
  };
}

export function createDragTileInteraction(
  tileKey = DEFAULT_TILE_SELECTION_KEY
): ToolInteractionDefinition {
  return {
    stages: [
      {
        kind: "drag-tile-release",
        tileKey
      }
    ]
  };
}

export function createDragAxisTileInteraction(
  directionKey = DEFAULT_DIRECTION_SELECTION_KEY,
  tileKey = DEFAULT_TILE_SELECTION_KEY
): ToolInteractionDefinition {
  return {
    stages: [
      {
        directionKey,
        kind: "drag-axis-tile-release",
        tileKey
      }
    ]
  };
}

export function createModalChoiceInteraction(
  choiceKey = DEFAULT_CHOICE_SELECTION_KEY
): ToolInteractionDefinition {
  return {
    stages: [
      {
        choiceKey,
        kind: "modal-choice"
      }
    ]
  };
}

export function createSequentialInteraction(
  stages: ToolInteractionDefinition["stages"]
): ToolInteractionDefinition {
  return {
    stages
  };
}

export function isInstantInteractionDefinition(
  interaction: ToolInteractionDefinition
): boolean {
  return interaction.stages.length === 0;
}

export function isChoiceInteractionDefinition(
  interaction: ToolInteractionDefinition
): boolean {
  return interaction.stages[0]?.kind === "modal-choice";
}

export function isPointerDrivenInteractionDefinition(
  interaction: ToolInteractionDefinition
): boolean {
  return !isInstantInteractionDefinition(interaction) && !isChoiceInteractionDefinition(interaction);
}
