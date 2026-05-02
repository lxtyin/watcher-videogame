import { RACE_GAME_MAP_ID } from "../../content/maps";
import { defineGoldenCase } from "../types";

export const GOLDEN_RACE_CASES = [
  defineGoldenCase({
    id: "race-goal-finishes-and-passes-turn",
    title: "Race: reaching goal finishes the player and passes the turn",
    description: "When at least two racers remain after the active player reaches the goal, the next unfinished player should begin immediately.",
    scene: {
      mapId: RACE_GAME_MAP_ID,
      layout: [
        "#	#	#	#	#",
        "#	Start	.	Goal	#",
        "#	.	.	.	#",
        "#	#	#	#	#"
      ],
      players: [
        {
          id: "p1",
          name: "P1",
          characterId: "ehh",
          position: { x: 1, y: 1 },
          spawnPosition: { x: 1, y: 1 },
          tools: [{ toolId: "movement", params: { movePoints: 2 } }]
        },
        {
          id: "p2",
          name: "P2",
          characterId: "ehh",
          position: { x: 1, y: 2 },
          spawnPosition: { x: 1, y: 1 }
        },
        {
          id: "p3",
          name: "P3",
          characterId: "ehh",
          position: { x: 2, y: 2 },
          spawnPosition: { x: 1, y: 1 }
        }
      ],
      turn: {
        currentPlayerId: "p1",
        phase: "turn-action",
        turnNumber: 1
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "p1",
        tool: "movement",
        direction: "right"
      }
    ],
    expect: {
      allowDebugTools: false,
      mapId: RACE_GAME_MAP_ID,
      mode: "race",
      settlementState: "active",
      players: {
        p1: {
          position: { x: 3, y: 1 },
          finishRank: 1,
          finishedTurnNumber: 1,
          toolCount: 0
        },
        p2: {
          finishRank: null,
          finishedTurnNumber: null
        },
        p3: {
          finishRank: null,
          finishedTurnNumber: null
        }
      },
      turnInfo: {
        currentPlayerId: "p2",
        phase: "turn-start",
        turnNumber: 2
      }
    }
  }),
  defineGoldenCase({
    id: "race-goal-autofinishes-final-unfinished-player",
    title: "Race: final unfinished player is settled with the runner-up turn",
    description: "When only one racer remains after another player reaches the goal, the final racer should receive the next rank and the same finish turn as the runner-up.",
    scene: {
      mapId: RACE_GAME_MAP_ID,
      layout: [
        "#	#	#	#	#",
        "#	Start	.	Goal	#",
        "#	.	.	.	#",
        "#	#	#	#	#"
      ],
      players: [
        {
          id: "p1",
          name: "P1",
          characterId: "ehh",
          position: { x: 3, y: 1 },
          spawnPosition: { x: 1, y: 1 },
          finishRank: 1,
          finishedTurnNumber: 1
        },
        {
          id: "p2",
          name: "P2",
          characterId: "ehh",
          position: { x: 1, y: 1 },
          spawnPosition: { x: 1, y: 1 },
          tools: [{ toolId: "movement", params: { movePoints: 2 } }]
        },
        {
          id: "p3",
          name: "P3",
          characterId: "ehh",
          position: { x: 1, y: 2 },
          spawnPosition: { x: 1, y: 1 }
        }
      ],
      turn: {
        currentPlayerId: "p2",
        phase: "turn-action",
        turnNumber: 3
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "p2",
        tool: "movement",
        direction: "right"
      }
    ],
    expect: {
      allowDebugTools: false,
      mapId: RACE_GAME_MAP_ID,
      mode: "race",
      settlementState: "complete",
      players: {
        p1: {
          finishRank: 1,
          finishedTurnNumber: 1
        },
        p2: {
          position: { x: 3, y: 1 },
          finishRank: 2,
          finishedTurnNumber: 3,
          toolCount: 0
        },
        p3: {
          finishRank: 3,
          finishedTurnNumber: 3
        }
      },
      turnInfo: {
        currentPlayerId: "",
        phase: "turn-start",
        turnNumber: 3
      }
    }
  }),
  defineGoldenCase({
    id: "race-goal-settlement-after-last-player",
    title: "Race: settlement starts after the last player reaches goal",
    description: "The last unfinished player should complete the race, receive the next rank, and leave the match in settlement state.",
    scene: {
      mapId: RACE_GAME_MAP_ID,
      layout: [
        "#	#	#	#	#",
        "#	Start	.	.	#",
        "#	.	.	Goal	#",
        "#	#	#	#	#"
      ],
      players: [
        {
          id: "p1",
          name: "P1",
          characterId: "ehh",
          position: { x: 3, y: 2 },
          spawnPosition: { x: 1, y: 1 },
          finishRank: 1,
          finishedTurnNumber: 1
        },
        {
          id: "p2",
          name: "P2",
          characterId: "ehh",
          position: { x: 1, y: 2 },
          spawnPosition: { x: 1, y: 1 },
          tools: [{ toolId: "movement", params: { movePoints: 2 } }]
        }
      ],
      turn: {
        currentPlayerId: "p2",
        phase: "turn-action",
        turnNumber: 2
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "p2",
        tool: "movement",
        direction: "right"
      }
    ],
    expect: {
      allowDebugTools: false,
      mapId: RACE_GAME_MAP_ID,
      mode: "race",
      settlementState: "complete",
      players: {
        p1: {
          finishRank: 1,
          finishedTurnNumber: 1
        },
        p2: {
          position: { x: 3, y: 2 },
          finishRank: 2,
          finishedTurnNumber: 2,
          toolCount: 0
        }
      },
      turnInfo: {
        currentPlayerId: "",
        phase: "turn-start",
        turnNumber: 2
      }
    }
  })
] as const;
