import { defineGoldenCase } from "../types";

export const BASIC_GOLDEN_CASES = [
  defineGoldenCase({
    id: "basic-movement-right",
    title: "Movement updates the actor position",
    description: "A simple grounded move should consume the movement tool and land on the next floor tile.",
    scene: {
      layout: ["#####", "#...#", "#...#", "#####"],
      players: [
        {
          id: "hero",
          name: "Hero",
          characterId: "ehh",
          position: { x: 1, y: 1 },
          tools: [
            {
              toolId: "movement",
              params: {
                movePoints: 1
              }
            }
          ]
        }
      ],
      turn: {
        currentPlayerId: "hero",
        phase: "action"
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "hero",
        tool: "movement",
        direction: "right",
        label: "Move right once"
      }
    ],
    expect: {
      boardLayout: ["#####", "#...#", "#...#", "#####"],
      players: {
        hero: {
          position: { x: 2, y: 1 },
          toolCount: 0
        }
      },
      latestPresentation: {
        toolId: "movement",
        eventKinds: ["player_motion"]
      }
    }
  }),
  defineGoldenCase({
    id: "earth-wall-break",
    title: "Movement breaks an earth wall",
    description: "Ground movement into an earth wall should remove the wall and attach a delayed state transition event.",
    scene: {
      layout: ["#####", "#.e.#", "#...#", "#####"],
      players: [
        {
          id: "hero",
          name: "Hero",
          characterId: "ehh",
          position: { x: 1, y: 1 },
          tools: [
            {
              toolId: "movement",
              params: {
                movePoints: 3
              }
            }
          ]
        }
      ],
      turn: {
        currentPlayerId: "hero",
        phase: "action"
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "hero",
        tool: "movement",
        direction: "right",
        label: "Break the wall"
      }
    ],
    expect: {
      boardLayout: ["#####", "#...#", "#...#", "#####"],
      players: {
        hero: {
          position: { x: 2, y: 1 },
          toolCount: 0
        }
      },
      latestPresentation: {
        toolId: "movement",
        eventKinds: ["player_motion", "state_transition"]
      }
    }
  }),
  defineGoldenCase({
    id: "leader-deploy-wallet",
    title: "Leader wallet deploy ends the turn",
    description: "Deploying a wallet should create a summon and immediately advance to the next roll phase.",
    scene: {
      layout: ["#####", "#...#", "#...#", "#####"],
      players: [
        {
          id: "leader",
          name: "Leader",
          characterId: "leader",
          position: { x: 1, y: 1 },
          tools: [
            {
              toolId: "deployWallet",
              source: "character_skill",
              params: {
                targetRange: 2
              }
            }
          ]
        }
      ],
      turn: {
        currentPlayerId: "leader",
        phase: "action",
        turnNumber: 1
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "leader",
        tool: {
          toolId: "deployWallet",
          source: "character_skill"
        },
        targetPosition: { x: 2, y: 1 },
        label: "Deploy wallet"
      }
    ],
    expect: {
      boardLayout: ["#####", "#...#", "#...#", "#####"],
      players: {
        leader: {
          position: { x: 1, y: 1 },
          toolCount: 0
        }
      },
      summonCount: 1,
      summons: [
        {
          summonId: "wallet",
          ownerId: "leader",
          position: { x: 2, y: 1 }
        }
      ],
      turnInfo: {
        currentPlayerId: "leader",
        phase: "roll",
        turnNumber: 2
      },
      latestPresentation: {
        toolId: "deployWallet",
        eventKinds: ["state_transition"]
      }
    }
  }),
  defineGoldenCase({
    id: "leader-wallet-pickup",
    title: "Leader picks up a wallet while moving",
    description: "Passing through a wallet should remove the summon and replace the spent movement with a rewarded tool.",
    scene: {
      layout: ["#####", "#...#", "#...#", "#####"],
      players: [
        {
          id: "leader",
          name: "Leader",
          characterId: "leader",
          position: { x: 1, y: 1 },
          tools: [
            {
              toolId: "movement",
              params: {
                movePoints: 1
              }
            }
          ]
        }
      ],
      summons: [
        {
          summonId: "wallet",
          ownerId: "leader",
          position: { x: 2, y: 1 }
        }
      ],
      turn: {
        currentPlayerId: "leader",
        phase: "action"
      },
      seeds: {
        toolDieSeed: 1
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "leader",
        tool: "movement",
        direction: "right",
        label: "Pick up the wallet"
      }
    ],
    expect: {
      boardLayout: ["#####", "#...#", "#...#", "#####"],
      players: {
        leader: {
          position: { x: 2, y: 1 },
          toolCount: 1
        }
      },
      summonCount: 0,
      latestPresentation: {
        toolId: "movement",
        eventKinds: ["player_motion", "state_transition"]
      }
    }
  })
] as const;
