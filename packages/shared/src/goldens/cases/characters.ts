import { defineGoldenCase } from "../types";

export const GOLDEN_CHARACTER_CASES = [
  defineGoldenCase({
    id: "blaze-prepares-bomb-and-throws-next-turn",
    title: "Blaze prepares a bomb and receives Bomb Throw next turn",
    description:
      "Using Blaze's turn-start action should end the turn immediately and grant Bomb Throw on the next turn.",
    scene: {
      layout: [
        "########",
        "#......#",
        "#......#",
        "#......#",
        "########"
      ],
      players: [
        {
          id: "blaze",
          name: "Blaze",
          characterId: "blaze",
          position: { x: 1, y: 1 }
        },
        {
          id: "target",
          name: "Target",
          characterId: "late",
          position: { x: 2, y: 1 }
        }
      ],
      turn: {
        currentPlayerId: "blaze",
        phase: "turn-start"
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "blaze",
        tool: "blazePrepareBomb",
        label: "Blaze prepares the next-turn bomb"
      },
      {
        kind: "rollDice",
        actorId: "target",
        label: "Target takes the intervening turn"
      },
      {
        kind: "endTurn",
        actorId: "target",
        label: "Target ends the turn"
      },
      {
        kind: "rollDice",
        actorId: "blaze",
        label: "Blaze rolls and receives Bomb Throw"
      },
      {
        kind: "useTool",
        actorId: "blaze",
        tool: "bombThrow",
        targetPosition: { x: 2, y: 1 },
        direction: "right",
        label: "Blaze throws the bomb at the adjacent target tile"
      }
    ],
    expect: {
      players: {
        blaze: {
          position: { x: 1, y: 1 },
          toolIds: ["movement", "buildWall"]
        },
        target: {
          position: { x: 4, y: 1 }
        }
      },
      turnInfo: {
        currentPlayerId: "blaze",
        phase: "turn-action",
        moveRoll: 4,
        lastRolledToolId: "buildWall"
      },
      latestPresentation: {
        toolId: "bombThrow",
        eventKinds: ["motion"]
      }
    }
  }),
  defineGoldenCase({
    id: "volaty-skips-tool-die-and-leaps",
    title: "Volaty skips the tool die and turns movement into a leap",
    description:
      "Volaty's turn-start action should roll only movement and resolve the turn's Movement tool as a leap.",
    scene: {
      layout: [
        "#######",
        "#..#..#",
        "#.....#",
        "#######"
      ],
      players: [
        {
          id: "volaty",
          name: "Volaty",
          characterId: "volaty",
          position: { x: 1, y: 1 }
        }
      ],
      turn: {
        currentPlayerId: "volaty",
        phase: "turn-start"
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "volaty",
        tool: "volatySkipToolDie",
        label: "Volaty skips the tool die"
      },
      {
        kind: "rollDice",
        actorId: "volaty",
        label: "Volaty rolls after skipping the tool die"
      },
      {
        kind: "useTool",
        actorId: "volaty",
        tool: "jump",
        direction: "right",
        label: "Volaty leaps across the wall with jump"
      }
    ],
    expect: {
      players: {
        volaty: {
          position: { x: 4, y: 1 },
          toolCount: 0
        }
      },
      turnInfo: {
        currentPlayerId: "volaty",
        phase: "turn-action",
        // moveRoll: 3,
        lastRolledToolId: null
      },
      latestPresentation: {
        toolId: "jump",
        eventKinds: ["motion"]
      }
    }
  }),
  defineGoldenCase({
    id: "chain-gains-hookshot-when-still-out-of-turn",
    title: "Chain gains a small Hookshot after staying still out of turn",
    description:
      "If Chain was not moved between turns, the next roll should include a Hookshot with length 2.",
    scene: {
      layout: [
        "#######",
        "#.....#",
        "#.....#",
        "#######"
      ],
      players: [
        {
          id: "chain",
          name: "Chain",
          characterId: "chain",
          position: { x: 1, y: 1 }
        }
      ],
      turn: {
        currentPlayerId: "chain",
        phase: "turn-start"
      }
    },
    steps: [
      {
        kind: "rollDice",
        actorId: "chain",
        label: "Chain rolls after staying still"
      }
    ],
    expect: {
      players: {
        chain: {
          toolIds: ["movement", "jump", "hookshot"]
        }
      },
      turnInfo: {
        phase: "turn-action",
        moveRoll: 3,
        lastRolledToolId: "jump"
      }
    }
  }),
  defineGoldenCase({
    id: "chain-loses-hookshot-after-out-of-turn-move",
    title: "Chain does not gain the small Hookshot after being moved out of turn",
    description:
      "Any out-of-turn movement should clear Chain's next-turn Hookshot reward.",
    scene: {
      layout: [
        "#######",
        "#.....#",
        "#.....#",
        "#######"
      ],
      players: [
        {
          id: "dummy",
          name: "Dummy",
          characterId: "ehh",
          position: { x: 1, y: 1 },
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
          id: "chain",
          name: "Chain",
          characterId: "chain",
          position: { x: 3, y: 1 }
        }
      ],
      turn: {
        currentPlayerId: "dummy",
        phase: "turn-action"
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "dummy",
        tool: "basketball",
        direction: "right",
        label: "Dummy pushes Chain out of turn"
      },
      {
        kind: "endTurn",
        actorId: "dummy",
        label: "Dummy ends the turn"
      },
      {
        kind: "rollDice",
        actorId: "chain",
        label: "Chain rolls after being moved"
      }
    ],
    expect: {
      players: {
        chain: {
          position: { x: 4, y: 1 },
          toolIds: ["movement", "jump"]
        }
      },
      turnInfo: {
        currentPlayerId: "chain",
        phase: "turn-action",
        moveRoll: 3,
        lastRolledToolId: "jump"
      }
    }
  }),
  defineGoldenCase({
    id: "farther-balance-trim-and-bank",
    title: "Farther banks one movement point for the next turn",
    description:
      "Balance option one should reduce this turn's movement by 1 and grant a Movement 1 tool next turn.",
    scene: {
      layout: [
        "#########",
        "#.......#",
        "#.......#",
        "#########"
      ],
      players: [
        {
          id: "farther",
          name: "Farther",
          characterId: "farther",
          position: { x: 1, y: 1 },
          tools: [
            {
              toolId: "movement",
              params: {
                movePoints: 3
              }
            },
            {
              toolId: "balance"
            }
          ]
        },
        {
          id: "dummy",
          name: "Dummy",
          characterId: "late",
          position: { x: 1, y: 2 }
        }
      ],
      turn: {
        currentPlayerId: "farther",
        phase: "turn-action"
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "farther",
        tool: "balance",
        choiceId: "trim_and_bank",
        label: "Farther trims one point and banks it"
      },
      {
        kind: "endTurn",
        actorId: "farther",
        label: "Farther ends the turn"
      },
      {
        kind: "rollDice",
        actorId: "dummy",
        label: "Dummy takes the intervening turn"
      },
      {
        kind: "endTurn",
        actorId: "dummy",
        label: "Dummy ends the turn"
      },
      {
        kind: "rollDice",
        actorId: "farther",
        label: "Farther rolls again"
      },
      {
        kind: "useTool",
        actorId: "farther",
        tool: { toolId: "movement", nth: 1 },
        direction: "right",
        label: "Farther spends the banked Movement 1"
      }
    ],
    expect: {
      players: {
        farther: {
          position: { x: 2, y: 1 },
          toolIds: ["movement", "buildWall", "balance"]
        }
      },
      latestPresentation: {
        toolId: "movement",
        eventKinds: ["motion"]
      }
    }
  }),
  defineGoldenCase({
    id: "farther-balance-store-all",
    title: "Farther stores the whole movement pool for the next turn",
    description:
      "Balance option two should zero this turn's movement and return the whole amount as a Movement tool next turn.",
    scene: {
      layout: [
        "#########",
        "#.......#",
        "#.......#",
        "#########"
      ],
      players: [
        {
          id: "farther",
          name: "Farther",
          characterId: "farther",
          position: { x: 1, y: 1 },
          tools: [
            {
              toolId: "movement",
              params: {
                movePoints: 3
              }
            },
            {
              toolId: "balance"
            }
          ]
        },
        {
          id: "dummy",
          name: "Dummy",
          characterId: "late",
          position: { x: 1, y: 2 }
        }
      ],
      turn: {
        currentPlayerId: "farther",
        phase: "turn-action"
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "farther",
        tool: "balance",
        choiceId: "store_all",
        label: "Farther stores the whole movement pool"
      },
      {
        kind: "endTurn",
        actorId: "farther",
        label: "Farther ends the turn"
      },
      {
        kind: "rollDice",
        actorId: "dummy",
        label: "Dummy takes the intervening turn"
      },
      {
        kind: "endTurn",
        actorId: "dummy",
        label: "Dummy ends the turn"
      },
      {
        kind: "rollDice",
        actorId: "farther",
        label: "Farther rolls again"
      },
      {
        kind: "useTool",
        actorId: "farther",
        tool: { toolId: "movement", nth: 1 },
        direction: "right",
        label: "Farther spends the stored Movement 3"
      }
    ],
    expect: {
      players: {
        farther: {
          position: { x: 4, y: 1 },
          toolIds: ["movement", "buildWall", "balance"]
        }
      },
      latestPresentation: {
        toolId: "movement",
        eventKinds: ["motion"]
      }
    }
  }),
  defineGoldenCase({
    id: "awm-shoot-applies-bondage-tags",
    title: "AWM installs bondage and writes stacks without character-specific runtime state",
    description:
      "AWM Shoot should install the base bondage modifier on the first hit player and write stacks equal to AWM's current movement pool.",
    scene: {
      layout: [
        "########",
        "#......#",
        "#......#",
        "########"
      ],
      players: [
        {
          id: "awm",
          name: "AWM",
          characterId: "awm",
          position: { x: 1, y: 1 },
          tools: [
            {
              toolId: "movement",
              params: {
                movePoints: 2
              }
            },
            {
              toolId: "awmShoot",
              source: "character_skill"
            }
          ]
        },
        {
          id: "target",
          name: "Target",
          characterId: "late",
          position: { x: 3, y: 1 }
        }
      ],
      turn: {
        currentPlayerId: "awm",
        phase: "turn-action"
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "awm",
        tool: "awmShoot",
        direction: "right",
        label: "AWM shoots the first player in line"
      }
    ],
    expect: {
      players: {
        awm: {
          position: { x: 1, y: 1 },
          toolIds: ["movement"]
        },
        target: {
          position: { x: 3, y: 1 },
          modifiers: ["basis:bondage"],
          tags: {
            "basis:bondage-stacks": 2
          }
        }
      }
    }
  }),
  defineGoldenCase({
    id: "bondage-modifier-reduces-next-movement-and-clears-on-turn-end",
    title: "Bondage is a pluggable base modifier that reduces movement and clears on turn end",
    description:
      "A player with an installed bondage modifier should receive reduced movement-derived tools on roll, then lose both the modifier and its stacks at turn end.",
    scene: {
      layout: [
        "########",
        "#......#",
        "#......#",
        "########"
      ],
      players: [
        {
          id: "target",
          name: "Target",
          characterId: "late",
          position: { x: 1, y: 1 },
          modifiers: ["basis:bondage"],
          tags: {
            "basis:bondage-stacks": 2
          }
        },
        {
          id: "dummy",
          name: "Dummy",
          characterId: "ehh",
          position: { x: 1, y: 2 }
        }
      ],
      turn: {
        currentPlayerId: "target",
        phase: "turn-start"
      }
    },
    steps: [
      {
        kind: "rollDice",
        actorId: "target",
        label: "The tagged player rolls and receives reduced movement-derived tools"
      },
      {
        kind: "useTool",
        actorId: "target",
        tool: "brake",
        targetPosition: { x: 2, y: 1 },
        label: "Late's transformed Brake is reduced to one tile by bondage"
      },
      {
        kind: "endTurn",
        actorId: "target",
        label: "Ending the turn clears the bondage tags"
      }
    ],
    expect: {
      players: {
        target: {
          position: { x: 2, y: 1 },
          modifiers: [],
          tags: {},
          toolIds: []
        }
      },
      turnInfo: {
        currentPlayerId: "dummy",
        phase: "turn-start"
      },
      latestPresentation: {
        toolId: "brake",
        eventKinds: ["motion"]
      }
    }
  })
] as const;
