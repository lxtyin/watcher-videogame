import { defineGoldenCase } from "../types";

export const GOLDEN_WALLET_CASES = [
  defineGoldenCase({
    id: "leader-deploy-wallet",
    title: "Deploy Wallet no longer ends the turn by itself",
    description:
      "Using Deploy Wallet during the action phase should create a summon but keep the player in the same phase.",
    scene: {
      layout: [
        "#####",
        "#...#",
        "#...#",
        "#####"
      ],
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
        phase: "turn-action",
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
      boardLayout: [
        "#####",
        "#...#",
        "#...#",
        "#####"
      ],
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
        phase: "turn-action",
        turnNumber: 1
      },
      latestPresentation: {
        toolId: "deployWallet",
        eventKinds: ["state_transition"]
      }
    }
  }),
  defineGoldenCase({
    id: "leader-turn-end-grants-deploy-wallet",
    title: "Leader receives Deploy Wallet during the turn-end phase",
    description:
      "Ending the action phase should enter turn-end, grant Deploy Wallet, and using the last turn-end tool should finish the turn automatically.",
    scene: {
      layout: [
        "#####",
        "#...#",
        "#...#",
        "#####"
      ],
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
      turn: {
        currentPlayerId: "leader",
        phase: "turn-action",
        turnNumber: 1
      }
    },
    steps: [
      {
        kind: "endTurn",
        actorId: "leader",
        label: "Leader enters the turn-end phase"
      },
      {
        kind: "useTool",
        actorId: "leader",
        tool: {
          toolId: "deployWallet",
          source: "character_skill"
        },
        targetPosition: { x: 2, y: 1 },
        label: "Leader deploys the turn-end wallet"
      }
    ],
    expect: {
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
        phase: "turn-start",
        turnNumber: 2
      },
      latestPresentation: {
        toolId: "deployWallet",
        eventKinds: ["state_transition"]
      }
    }
  }),
  defineGoldenCase({
    id: "leader-can-skip-turn-end-wallet",
    title: "Leader can skip the turn-end phase without using Deploy Wallet",
    description:
      "If a turn-end tool was granted, sending endTurn again should skip the remaining phase and finish the turn.",
    scene: {
      layout: [
        "#####",
        "#...#",
        "#...#",
        "#####"
      ],
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
      turn: {
        currentPlayerId: "leader",
        phase: "turn-action",
        turnNumber: 1
      }
    },
    steps: [
      {
        kind: "endTurn",
        actorId: "leader",
        label: "Leader enters the turn-end phase"
      },
      {
        kind: "endTurn",
        actorId: "leader",
        label: "Leader skips the turn-end wallet"
      }
    ],
    expect: {
      players: {
        leader: {
          position: { x: 1, y: 1 },
          toolCount: 0
        }
      },
      summonCount: 0,
      turnInfo: {
        currentPlayerId: "leader",
        phase: "turn-start",
        turnNumber: 2
      }
    }
  }),
  defineGoldenCase({
    id: "leader-wallet-active-translate-pass",
    title: "Leader picks up a wallet while translating",
    description:
      "Active grounded movement should trigger wallet pickup when the actor passes through the wallet tile.",
    scene: {
      layout: [
        "#####",
        "#...#",
        "#...#",
        "#####"
      ],
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
        phase: "turn-action"
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
        label: "Walk through wallet"
      }
    ],
    expect: {
      boardLayout: [
        "#####",
        "#...#",
        "#...#",
        "#####"
      ],
      players: {
        leader: {
          position: { x: 2, y: 1 },
          toolCount: 1
        }
      },
      summonCount: 0,
      latestPresentation: {
        toolId: "movement",
        eventKinds: ["motion", "state_transition"]
      }
    }
  }),
  defineGoldenCase({
    id: "leader-wallet-active-drag-pass",
    title: "Leader picks up a wallet while dragging",
    description:
      "Active hookshot self-movement should trigger wallet pickup while passing over the wallet tile.",
    scene: {
      layout: [
        "######",
        "#...##",
        "#....#",
        "######"
      ],
      players: [
        {
          id: "leader",
          name: "Leader",
          characterId: "leader",
          position: { x: 1, y: 1 },
          tools: [
            {
              toolId: "hookshot",
              params: {
                hookLength: 4
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
        phase: "turn-action"
      },
      seeds: {
        toolDieSeed: 1
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "leader",
        tool: "hookshot",
        direction: "right",
        label: "Hook toward the wall"
      }
    ],
    expect: {
      boardLayout: [
        "######",
        "#...##",
        "#....#",
        "######"
      ],
      players: {
        leader: {
          position: { x: 3, y: 1 },
          toolCount: 1
        }
      },
      summonCount: 0,
      latestPresentation: {
        toolId: "hookshot",
        eventKinds: ["reaction", "reaction", "motion", "state_transition"]
      }
    }
  }),
  defineGoldenCase({
    id: "leader-wallet-active-leap-stop",
    title: "Leader picks up a wallet on leap landing",
    description:
      "Active leap movement should trigger wallet pickup on stop when the landing tile contains the wallet.",
    scene: {
      layout: [
        "#####",
        "#...#",
        "#...#",
        "#####"
      ],
      players: [
        {
          id: "leader",
          name: "Leader",
          characterId: "leader",
          position: { x: 1, y: 1 },
          tools: [
            {
              toolId: "jump",
              params: {
                jumpDistance: 2
              }
            }
          ]
        }
      ],
      summons: [
        {
          summonId: "wallet",
          ownerId: "leader",
          position: { x: 3, y: 1 }
        }
      ],
      turn: {
        currentPlayerId: "leader",
        phase: "turn-action"
      },
      seeds: {
        toolDieSeed: 1
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "leader",
        tool: "jump",
        direction: "right",
        label: "Jump onto wallet"
      }
    ],
    expect: {
      boardLayout: [
        "#####",
        "#...#",
        "#...#",
        "#####"
      ],
      players: {
        leader: {
          position: { x: 3, y: 1 },
          toolCount: 1
        }
      },
      summonCount: 0,
      latestPresentation: {
        toolId: "jump",
        eventKinds: ["motion", "state_transition"]
      }
    }
  }),
  defineGoldenCase({
    id: "leader-wallet-ignores-passive-translate",
    title: "Wallet ignores passive translation",
    description:
      "Being pushed across a wallet should not trigger pickup because the displacement is passive.",
    scene: {
      layout: [
        "#######",
        "#.....#",
        "#.....#",
        "#######"
      ],
      players: [
        {
          id: "enemy",
          name: "Enemy",
          characterId: "ehh",
          position: { x: 5, y: 1 },
          tools: [
            {
              toolId: "basketball",
              params: {
                projectileRange: 4,
                projectileBounceCount: 0,
                projectilePushDistance: 1
              }
            }
          ]
        },
        {
          id: "leader",
          name: "Leader",
          characterId: "leader",
          position: { x: 3, y: 1 }
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
        currentPlayerId: "enemy",
        phase: "turn-action"
      },
      seeds: {
        toolDieSeed: 1
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "enemy",
        tool: "basketball",
        direction: "left",
        label: "Push leader onto wallet"
      }
    ],
    expect: {
      boardLayout: [
        "#######",
        "#.....#",
        "#.....#",
        "#######"
      ],
      players: {
        enemy: {
          position: { x: 5, y: 1 },
          toolCount: 0
        },
        leader: {
          position: { x: 2, y: 1 },
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
      latestPresentation: {
        toolId: "basketball",
        eventKinds: ["motion", "motion"]
      }
    }
  })
];
