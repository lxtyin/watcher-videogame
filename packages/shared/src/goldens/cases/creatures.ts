import { defineGoldenCase } from "../types";

export const GOLDEN_CREATURE_CASES = [
  defineGoldenCase({
    id: "layout-symbol-spawns-dice-pig",
    title: "Layout P spawns a dice pig creature",
    description: "The temporary P layout symbol should leave a floor tile and create one dice pig summon.",
    scene: {
      layout: [
        "#####",
        "#.P.#",
        "#####"
      ],
      players: [
        {
          id: "actor",
          name: "Actor",
          characterId: "ehh",
          position: { x: 1, y: 1 }
        }
      ],
      turn: {
        currentPlayerId: "actor",
        phase: "turn-action"
      }
    },
    steps: [],
    expect: {
      boardLayout: [
        "#####",
        "#...#",
        "#####"
      ],
      summonCount: 1,
      summons: [
        {
          summonId: "dicePig",
          ownerId: "",
          position: { x: 2, y: 1 }
        }
      ]
    }
  }),
  defineGoldenCase({
    id: "dice-pig-can-be-pushed-as-creature",
    title: "Dice pig can be pushed as a creature",
    description: "A creature summon should move through the same displacement pipeline as a player target.",
    scene: {
      layout: [
        "#####",
        "#sP.#",
        "#####"
      ],
      players: [
        {
          id: "actor",
          name: "Actor",
          characterId: "ehh",
          position: { x: 1, y: 1 },
          tools: [
            {
              toolId: "basketball"
            }
          ]
        }
      ],
      turn: {
        currentPlayerId: "actor",
        phase: "turn-action"
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "actor",
        tool: "basketball",
        direction: "right",
        label: "Push the dice pig"
      }
    ],
    expect: {
      boardLayout: [
        "#####",
        "#s..#",
        "#####"
      ],
      players: {
        actor: {
          position: { x: 1, y: 1 },
          toolCount: 0
        }
      },
      summonCount: 1,
      summons: [
        {
          summonId: "dicePig",
          ownerId: "",
          position: { x: 3, y: 1 }
        }
      ],
      latestPresentation: {
        toolId: "basketball",
        eventKinds: ["motion", "motion", "state_transition"]
      }
    }
  }),
  defineGoldenCase({
    id: "dice-pig-dies-and-grants-current-player-tool",
    title: "Dice pig death grants the current player a tool",
    description: "A creature summon can be pushed by a tool, trigger pit death, and run its onDeath reward.",
    scene: {
      layout: [
        "#####",
        "#sPo#",
        "#####"
      ],
      players: [
        {
          id: "actor",
          name: "Actor",
          characterId: "ehh",
          position: { x: 1, y: 1 },
          tools: [
            {
              toolId: "basketball"
            }
          ]
        }
      ],
      seeds: {
        toolDieSeed: 1
      },
      turn: {
        currentPlayerId: "actor",
        phase: "turn-action"
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "actor",
        tool: "basketball",
        direction: "right",
        label: "Push the dice pig into the pit"
      }
    ],
    expect: {
      boardLayout: [
        "#####",
        "#s.o#",
        "#####"
      ],
      players: {
        actor: {
          position: { x: 1, y: 1 },
          toolCount: 1
        }
      },
      summonCount: 0,
      latestPresentation: {
        toolId: "basketball"
      },
      turnInfo: {
        currentPlayerId: "actor",
        phase: "turn-action"
      }
    }
  })
];
