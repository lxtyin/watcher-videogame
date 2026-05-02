import { DEFAULT_BOARD_SYMBOLS } from "../../content/boards/defaultBoard";
import { RACE_BOARD_LAYOUT, RACE_BOARD_SYMBOLS } from "../../content/boards/raceBoard";
import { RACE_BOARD2_LAYOUT, RACE_BOARD2_SYMBOLS } from "../../content/boards/raceBoard2";
import { defineGoldenCase } from "../types";

export const HEAVY_GOLDEN_CASES = [
  defineGoldenCase({
    id: "heavy-raceboard2-multi-step-tool-chain",
    title: "Heavy: raceBoard2 multi-step tool chain",
    description:
      "A large race board should handle Bomb Throw, Build Wall, and Brake in one continuous showcase.",
    scene: {
      allowDebugTools: true,
      layout: RACE_BOARD2_LAYOUT,
      mapId: "custom",
      mapLabel: "heavy-raceboard2-tool-chain",
      mode: "free",
      players: [
        {
          id: "hero",
          name: "Hero",
          position: { x: 9, y: 5 },
          spawnPosition: { x: 9, y: 5 },
          tools: [
            {
              instanceId: "bomb-1",
              params: {
                pushDistance: 3,
                targetRange: 1
              },
              toolId: "blazeBombThrow"
            },
            {
              instanceId: "wall-1",
              params: {
                wallDurability: 2
              },
              toolId: "buildWall"
            },
            {
              instanceId: "brake-1",
              params: {
                movePoints: 4
              },
              toolId: "brake"
            }
          ]
        },
        {
          id: "target",
          name: "Target",
          position: { x: 10, y: 5 },
          spawnPosition: { x: 10, y: 5 }
        }
      ],
      symbols: {
        ...DEFAULT_BOARD_SYMBOLS,
        ...RACE_BOARD2_SYMBOLS
      },
      turn: {
        currentPlayerId: "hero",
        phase: "turn-action",
        turnNumber: 1
      }
    },
    steps: [
      {
        actorId: "hero",
        direction: "right",
        kind: "useTool",
        label: "Bomb Throw pushes the target across the lane",
        targetPosition: { x: 10, y: 5 },
        tool: "blazeBombThrow"
      },
      {
        actorId: "hero",
        kind: "useTool",
        label: "Build Wall seals the left flank",
        targetPosition: { x: 8, y: 5 },
        tool: "buildWall"
      },
      {
        actorId: "hero",
        direction: "right",
        kind: "useTool",
        label: "Brake slides onto the conveyor tile",
        targetPosition: { x: 13, y: 5 },
        tool: "brake"
      }
    ],
    expect: {
      players: {
        hero: {
          position: { x: 13, y: 5 },
          toolCount: 0
        },
        target: {
          position: { x: 13, y: 5 }
        }
      }
    }
  }),
  defineGoldenCase({
    id: "heavy-raceboard-rocket-cluster",
    title: "Heavy: raceBoard rocket cluster",
    description:
      "A large race board should keep clustered rocket motion and splash reactions stable under heavy playback.",
    scene: {
      allowDebugTools: true,
      layout: RACE_BOARD_LAYOUT,
      mapId: "custom",
      mapLabel: "heavy-raceboard-rocket-cluster",
      mode: "free",
      players: [
        {
          id: "rocketeer",
          name: "Rocketeer",
          position: { x: 5, y: 1 },
          spawnPosition: { x: 5, y: 1 },
          tools: [
            {
              instanceId: "rocket-1",
              params: {
                projectileRange: 10,
                rocketBlastLeapDistance: 2,
                rocketSplashPushDistance: 1
              },
              toolId: "rocket"
            }
          ]
        },
        {
          id: "center-a",
          name: "Center A",
          position: { x: 8, y: 1 },
          spawnPosition: { x: 8, y: 1 }
        },
        {
          id: "center-b",
          name: "Center B",
          position: { x: 8, y: 1 },
          spawnPosition: { x: 8, y: 1 }
        },
        {
          id: "splash-down",
          name: "Splash Down",
          position: { x: 8, y: 2 },
          spawnPosition: { x: 8, y: 2 }
        }
      ],
      symbols: {
        ...DEFAULT_BOARD_SYMBOLS,
        ...RACE_BOARD_SYMBOLS
      },
      turn: {
        currentPlayerId: "rocketeer",
        phase: "turn-action",
        turnNumber: 1
      }
    },
    steps: [
      {
        actorId: "rocketeer",
        direction: "right",
        kind: "useTool",
        label: "Fire a clustered rocket volley",
        tool: "rocket"
      }
    ],
    expect: {
      latestPresentation: {
        eventKinds: ["motion", "motion", "motion", "motion", "reaction"],
        toolId: "rocket"
      },
      players: {
        rocketeer: {
          position: { x: 5, y: 1 },
          toolCount: 0
        },
        "center-a": {
          position: { x: 9, y: 1 }
        },
        "center-b": {
          position: { x: 9, y: 1 }
        },
        "splash-down": {
          position: { x: 8, y: 3 }
        }
      }
    }
  }),
  defineGoldenCase({
    id: "heavy-raceboard-turn-start-terrain-chain",
    title: "Heavy: raceBoard turn-start terrain chain",
    description:
      "A large race board should replay lucky claim, phase transition, and poison respawn without stalling playback.",
    scene: {
      allowDebugTools: true,
      layout: RACE_BOARD_LAYOUT,
      mapId: "custom",
      mapLabel: "heavy-raceboard-terrain-chain",
      mode: "free",
      players: [
        {
          id: "hero",
          name: "Hero",
          position: { x: 3, y: 3 },
          spawnPosition: { x: 2, y: 6 }
        }
      ],
      seeds: {
        moveDieSeed: 11,
        toolDieSeed: 1
      },
      symbols: {
        ...DEFAULT_BOARD_SYMBOLS,
        ...RACE_BOARD_SYMBOLS
      },
      turn: {
        currentPlayerId: "hero",
        phase: "turn-action",
        turnNumber: 1
      }
    },
    steps: [
      {
        actorId: "hero",
        kind: "endTurn",
        label: "End the turn while standing on lucky"
      },
      {
        actorId: "hero",
        kind: "rollDice",
        label: "Roll into the lucky-triggered action phase"
      },
      {
        actorId: "hero",
        direction: "right",
        kind: "useTool",
        label: "Brake onto poison and respawn",
        targetPosition: { x: 4, y: 3 },
        tool: "brake"
      }
    ],
    expect: {
      boardLayout: [
        "#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#",
        "#	Poison	.	.	Vv	.	.	.	.	.	E2	.	Vv	.	.	.	E2	.	.	#",
        "#	Poison	.	.	.	#	.	.	.	.	.	.	.	.	.	#	#	#	.	#",
        "#	Poison	.	Lucky0	Poison	.	#	#	.	.	.	#	.	.	#	#	Poison	Goal	.	#",
        "#	#	.	#	.	.	.	.	.	.	#	Poison	.	.	Lucky	#	#	#	.	#",
        "#	.	.	#	.	.	.	.	Poison	#	.	.	.	.	.	.	.	#	.	#",
        "#	.	Start	#	.	.	E2	E2	#	#	.	.	.	.	V<	E2	.	#	.	#",
        "#	.	#	#	.	.	.	.	.	#	.	.	.	E2	.	.	.	Poison	.	#",
        "#	Lucky	.	.	.	V^	.	.	.	.	.	V^	.	E2	.	.	.	Poison	.	#",
        "#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#"
      ],
      players: {
        hero: {
          position: { x: 2, y: 6 },
          toolCount: 2,
          toolIds: ["jump", "buildWall"]
        }
      },
      turnInfo: {
        currentPlayerId: "hero",
        phase: "turn-action",
        turnNumber: 2
      }
    }
  })
] as const;
