import { defineGoldenCase } from "../types";

export const GOLDEN_MULTIPLAYER_CASES = [
  defineGoldenCase({
    id: "hookshot-pulls-stacked-players",
    title: "Hookshot pulls multiple stacked players",
    description:
      "Hookshot should pull every player on the hit cell with the same passive drag resolution.",
    scene: {
      layout: [
        "#######",
        "#.....#",
        "#.....#",
        "#######"
      ],
      players: [
        {
          id: "hooker",
          name: "Hooker",
          characterId: "late",
          position: { x: 1, y: 1 },
          tools: [
            {
              toolId: "hookshot",
              params: {
                hookLength: 4
              }
            }
          ]
        },
        {
          id: "target-a",
          name: "Target A",
          characterId: "ehh",
          position: { x: 4, y: 1 }
        },
        {
          id: "target-b",
          name: "Target B",
          characterId: "leader",
          position: { x: 4, y: 1 }
        }
      ],
      turn: {
        currentPlayerId: "hooker",
        phase: "action"
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "hooker",
        tool: "hookshot",
        direction: "right",
        label: "Pull the stacked targets"
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
        hooker: {
          position: { x: 1, y: 1 },
          toolCount: 0
        },
        "target-a": {
          position: { x: 2, y: 1 }
        },
        "target-b": {
          position: { x: 2, y: 1 }
        }
      },
      latestPresentation: {
        toolId: "hookshot",
        eventKinds: ["player_motion", "player_motion"]
      }
    }
  }),
  defineGoldenCase({
    id: "rocket-hits-stacked-center-and-splashes-neighbors",
    title: "Rocket affects stacked center and multiple splash targets",
    description:
      "Rocket should launch all players on the impact cell and also push players on each adjacent splash cell.",
    scene: {
      layout: [
        "#########",
        "#.......#",
        "#.......#",
        "#.......#",
        "#.......#",
        "#.......#",
        "#########"
      ],
      players: [
        {
          id: "rocketeer",
          name: "Rocketeer",
          characterId: "ehh",
          position: { x: 1, y: 3 },
          tools: [
            {
              toolId: "rocket",
              params: {
                projectileRange: 6,
                rocketBlastLeapDistance: 2,
                rocketSplashPushDistance: 1
              }
            }
          ]
        },
        {
          id: "center-a",
          name: "Center A",
          characterId: "late",
          position: { x: 4, y: 3 }
        },
        {
          id: "center-b",
          name: "Center B",
          characterId: "leader",
          position: { x: 4, y: 3 }
        },
        {
          id: "splash-up",
          name: "Splash Up",
          characterId: "ehh",
          position: { x: 4, y: 2 }
        },
        {
          id: "splash-down",
          name: "Splash Down",
          characterId: "late",
          position: { x: 4, y: 4 }
        }
      ],
      turn: {
        currentPlayerId: "rocketeer",
        phase: "action"
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "rocketeer",
        tool: "rocket",
        direction: "right",
        label: "Fire through the center stack"
      }
    ],
    expect: {
      boardLayout: [
        "#########",
        "#.......#",
        "#.......#",
        "#.......#",
        "#.......#",
        "#.......#",
        "#########"
      ],
      players: {
        rocketeer: {
          position: { x: 1, y: 3 },
          toolCount: 0
        },
        "center-a": {
          position: { x: 6, y: 3 }
        },
        "center-b": {
          position: { x: 6, y: 3 }
        },
        "splash-up": {
          position: { x: 4, y: 1 }
        },
        "splash-down": {
          position: { x: 4, y: 5 }
        }
      },
      latestPresentation: {
        toolId: "rocket",
        eventKinds: [
          "projectile",
          "player_motion",
          "player_motion",
          "player_motion",
          "player_motion",
          "effect"
        ]
      }
    }
  }),
  defineGoldenCase({
    id: "rocket-pushes-stacked-splash-players",
    title: "Rocket pushes every player on one splash cell",
    description:
      "Splash knockback should apply independently to multiple players stacked on the same adjacent cell.",
    scene: {
      layout: [
        "#########",
        "#.......#",
        "#.......#",
        "#.......#",
        "#.......#",
        "#.......#",
        "#########"
      ],
      players: [
        {
          id: "rocketeer",
          name: "Rocketeer",
          characterId: "ehh",
          position: { x: 1, y: 3 },
          tools: [
            {
              toolId: "rocket",
              params: {
                projectileRange: 6,
                rocketBlastLeapDistance: 2,
                rocketSplashPushDistance: 1
              }
            }
          ]
        },
        {
          id: "center",
          name: "Center",
          characterId: "late",
          position: { x: 4, y: 3 }
        },
        {
          id: "stack-up-a",
          name: "Stack Up A",
          characterId: "ehh",
          position: { x: 4, y: 2 }
        },
        {
          id: "stack-up-b",
          name: "Stack Up B",
          characterId: "leader",
          position: { x: 4, y: 2 }
        }
      ],
      turn: {
        currentPlayerId: "rocketeer",
        phase: "action"
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "rocketeer",
        tool: "rocket",
        direction: "right",
        label: "Push the stacked splash targets"
      }
    ],
    expect: {
      boardLayout: [
        "#########",
        "#.......#",
        "#.......#",
        "#.......#",
        "#.......#",
        "#.......#",
        "#########"
      ],
      players: {
        rocketeer: {
          position: { x: 1, y: 3 },
          toolCount: 0
        },
        center: {
          position: { x: 6, y: 3 }
        },
        "stack-up-a": {
          position: { x: 4, y: 1 }
        },
        "stack-up-b": {
          position: { x: 4, y: 1 }
        }
      }
    }
  })
];
