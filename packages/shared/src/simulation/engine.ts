import {
  cloneOrchestratedGameSnapshot,
  createGameOrchestrator,
  createGameOrchestrationStateFromScene
} from "../gameOrchestration";
import type { GameSnapshot } from "../types";
import type {
  GameRuntimeState,
  GameSimulation,
  SimulationCommand,
  SimulationDispatchResult,
  SimulationSceneDefinition
} from "./types";

export function cloneGameSnapshot(snapshot: GameSnapshot): GameSnapshot {
  return cloneOrchestratedGameSnapshot(snapshot);
}

class LocalGameSimulation implements GameSimulation {
  private readonly orchestrator;

  constructor(sceneDefinition: SimulationSceneDefinition) {
    this.orchestrator = createGameOrchestrator(
      createGameOrchestrationStateFromScene(sceneDefinition)
    );
  }

  getSnapshot(): GameSnapshot {
    return this.orchestrator.getSnapshot();
  }

  getRuntimeState(): GameRuntimeState {
    return this.orchestrator.getRuntimeState();
  }

  hasPendingAdvance(): boolean {
    return this.orchestrator.hasPendingAdvance();
  }

  dispatch(command: SimulationCommand): SimulationDispatchResult {
    return this.orchestrator.dispatch(command);
  }

  advanceTurn(): SimulationDispatchResult {
    return this.orchestrator.advanceTurn();
  }
}

export function createGameSimulation(
  sceneDefinition: SimulationSceneDefinition
): GameSimulation {
  return new LocalGameSimulation(sceneDefinition);
}
