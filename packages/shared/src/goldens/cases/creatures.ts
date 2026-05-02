import { defineGoldenCase } from "../types";

export const GOLDEN_CREATURE_CASES = [
  defineGoldenCase({
    id: "layout-symbol-spawns-dice-pig",
    title: "Layout descriptor spawns a dice pig creature",
    description: "The dice pig layout feature should leave a floor tile and create one dice pig summon.",
    scene: {
      layout: [
        "#	#	#	#	#",
        "#	.	.|p?	.	#",
        "#	#	#	#	#"
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
        "#	#	#	#	#",
        "#	.	.	.	#",
        "#	#	#	#	#"
      ],
      summonCount: 1,
      summons: [
        {
          summonId: "dicePig",
          ownerId: "",
          state: { carry: "random_tool" },
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
        "#	#	#	#	#",
        "#	Start	.|p?	.	#",
        "#	#	#	#	#"
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
        "#	#	#	#	#",
        "#	Start	.	.	#",
        "#	#	#	#	#"
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
          state: { carry: "random_tool" },
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
        "#	#	#	#	#",
        "#	Start	.|p?	Pit	#",
        "#	#	#	#	#"
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
        "#	#	#	#	#",
        "#	Start	.	Pit	#",
        "#	#	#	#	#"
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
  }),
  defineGoldenCase({
    id: "dice-pig-point-carry-grants-movement-tool",
    title: "Dice pig point carry grants movement",
    description: "A dice pig carrying point five should grant a Movement 5 tool when it dies.",
    scene: {
      layout: [
        "#	#	#	#	#",
        "#	Start	.|p5	Pit	#",
        "#	#	#	#	#"
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
        label: "Push the point-carrying dice pig into the pit"
      }
    ],
    expect: {
      boardLayout: [
        "#	#	#	#	#",
        "#	Start	.	Pit	#",
        "#	#	#	#	#"
      ],
      players: {
        actor: {
          toolCount: 1,
          toolIds: ["movement"]
        }
      },
      summonCount: 0
    }
  }),
  defineGoldenCase({
    id: "dice-pig-tool-carry-grants-specific-tool",
    title: "Dice pig tool carry grants the specific tool",
    description: "A dice pig carrying hookshot should grant Hookshot instead of rolling the random tool die.",
    scene: {
      layout: [
        "#	#	#	#	#",
        "#	Start	.|p:hookshot	Pit	#",
        "#	#	#	#	#"
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
        label: "Push the hookshot-carrying dice pig into the pit"
      }
    ],
    expect: {
      boardLayout: [
        "#	#	#	#	#",
        "#	Start	.	Pit	#",
        "#	#	#	#	#"
      ],
      players: {
        actor: {
          toolCount: 1,
          toolIds: ["hookshot"]
        }
      },
      summonCount: 0
    }
  }),
  defineGoldenCase({
    id: "dice-pig-empty-carry-grants-nothing",
    title: "Empty dice pig grants nothing",
    description: "A dice pig carrying no die should die without adding a tool to the current player.",
    scene: {
      layout: [
        "#	#	#	#	#",
        "#	Start	.|pn	Pit	#",
        "#	#	#	#	#"
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
        label: "Push the empty dice pig into the pit"
      }
    ],
    expect: {
      boardLayout: [
        "#	#	#	#	#",
        "#	Start	.	Pit	#",
        "#	#	#	#	#"
      ],
      players: {
        actor: {
          toolCount: 0
        }
      },
      summonCount: 0
    }
  })
];
