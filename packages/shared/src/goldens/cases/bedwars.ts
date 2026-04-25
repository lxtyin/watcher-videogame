import { BEDWARS_GAME_MAP_ID } from "../../content/maps";
import { STUN_MODIFIER_ID } from "../../skills";
import { defineGoldenCase } from "../types";

export const GOLDEN_BEDWARS_CASES = [
  defineGoldenCase({
    id: "bedwars-enemy-impact-damages-tower",
    title: "Bedwars: enemy impact damages tower",
    description: "An enemy translate impact should reduce the opposing tower durability by one.",
    scene: {
      mapId: BEDWARS_GAME_MAP_ID,
      layout: [
        "#########",
        "#i.t.T.I#",
        "#.......#",
        "#########"
      ],
      symbols: {
        A: { type: "tower", durability: 4, faction: "black" }
      },
      players: [
        {
          id: "p1",
          name: "P1",
          characterId: "ehh",
          position: { x: 4, y: 1 },
          spawnPosition: { x: 1, y: 1 },
          tools: [{ toolId: "movement", params: { movePoints: 1 } }]
        },
        {
          id: "p2",
          name: "P2",
          characterId: "ehh",
          position: { x: 7, y: 1 },
          spawnPosition: { x: 7, y: 1 }
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
      allowDebugTools: true,
      mapId: BEDWARS_GAME_MAP_ID,
      mode: "bedwars",
      boardLayout: [
        "#########",
        "#i.t.A.I#",
        "#.......#",
        "#########"
      ],
      settlementState: "active",
      players: {
        p1: {
          position: { x: 4, y: 1 },
          teamId: "white",
          toolCount: 0
        },
        p2: {
          teamId: "black"
        }
      },
      turnInfo: {
        currentPlayerId: "p1",
        phase: "turn-action",
        turnNumber: 1
      }
    }
  }),
  defineGoldenCase({
    id: "bedwars-impact-breaks-tower",
    title: "Bedwars: tower breaks at zero durability",
    description: "A tower with one durability should become floor after the next enemy impact.",
    scene: {
      mapId: BEDWARS_GAME_MAP_ID,
      layout: [
        "#########",
        "#i.t.Z.I#",
        "#.......#",
        "#########"
      ],
      symbols: {
        Z: { type: "tower", durability: 1, faction: "black" },
        f: { type: "floor", faction: "black" }
      },
      players: [
        {
          id: "p1",
          name: "P1",
          characterId: "ehh",
          position: { x: 4, y: 1 },
          spawnPosition: { x: 1, y: 1 },
          tools: [{ toolId: "movement", params: { movePoints: 1 } }]
        },
        {
          id: "p2",
          name: "P2",
          characterId: "ehh",
          position: { x: 7, y: 1 },
          spawnPosition: { x: 7, y: 1 }
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
      boardLayout: [
        "#########",
        "#i.t.f.I#",
        "#.......#",
        "#########"
      ],
      players: {
        p1: {
          teamId: "white"
        },
        p2: {
          teamId: "black"
        }
      },
      settlementState: "active"
    }
  }),
  defineGoldenCase({
    id: "bedwars-poison-respawns-with-stun-and-ends-turn",
    title: "Bedwars: poison respawns and applies stun",
    description: "With a surviving home tower, lethal terrain should respawn the player at their team spawn and end the turn.",
    scene: {
      mapId: BEDWARS_GAME_MAP_ID,
      layout: [
        "#########",
        "#i..p..I#",
        "#..t.T..#",
        "#########"
      ],
      players: [
        {
          id: "p1",
          name: "P1",
          characterId: "ehh",
          position: { x: 3, y: 1 },
          spawnPosition: { x: 1, y: 1 },
          tools: [{ toolId: "movement", params: { movePoints: 1 } }]
        },
        {
          id: "p2",
          name: "P2",
          characterId: "ehh",
          position: { x: 7, y: 1 },
          spawnPosition: { x: 7, y: 1 }
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
      mode: "bedwars",
      settlementState: "active",
      players: {
        p1: {
          boardVisible: true,
          modifiers: [STUN_MODIFIER_ID],
          position: { x: 1, y: 1 },
          spawnPosition: { x: 1, y: 1 },
          teamId: "white",
          toolCount: 0
        },
        p2: {
          teamId: "black"
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
    id: "bedwars-stun-skips-next-turn",
    title: "Bedwars: stun skips the next turn",
    description: "The stun modifier should remove itself on turn start and immediately advance to the next active player.",
    scene: {
      mapId: BEDWARS_GAME_MAP_ID,
      layout: [
        "#########",
        "#i.....I#",
        "#..t.T..#",
        "#########"
      ],
      players: [
        {
          id: "p1",
          name: "P1",
          characterId: "ehh",
          modifiers: [STUN_MODIFIER_ID],
          position: { x: 1, y: 1 },
          spawnPosition: { x: 1, y: 1 }
        },
        {
          id: "p2",
          name: "P2",
          characterId: "ehh",
          position: { x: 7, y: 1 },
          spawnPosition: { x: 7, y: 1 }
        }
      ],
      turn: {
        currentPlayerId: "p1",
        phase: "turn-start",
        turnNumber: 3
      }
    },
    steps: [],
    expect: {
      players: {
        p1: {
          modifiers: [],
          teamId: "white"
        },
        p2: {
          teamId: "black"
        }
      },
      turnInfo: {
        currentPlayerId: "p2",
        phase: "turn-start",
        turnNumber: 4
      }
    }
  }),
  defineGoldenCase({
    id: "bedwars-team-camp-grants-random-tool",
    title: "Bedwars: team camp grants a tool to the in-turn ally",
    description: "Stopping on your own team camp during your turn should roll one tool die and add the result to inventory.",
    scene: {
      mapId: BEDWARS_GAME_MAP_ID,
      layout: [
        "#########",
        "#i.c...I#",
        "#..t.T..#",
        "#########"
      ],
      players: [
        {
          id: "p1",
          name: "P1",
          characterId: "ehh",
          position: { x: 2, y: 1 },
          spawnPosition: { x: 1, y: 1 },
          tools: [{ toolId: "movement", params: { movePoints: 1 } }]
        },
        {
          id: "p2",
          name: "P2",
          characterId: "ehh",
          position: { x: 7, y: 1 },
          spawnPosition: { x: 7, y: 1 }
        }
      ],
      seeds: {
        toolDieSeed: 1
      },
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
      players: {
        p1: {
          position: { x: 3, y: 1 },
          teamId: "white",
          toolCount: 1,
          toolIds: ["jump"]
        },
        p2: {
          teamId: "black"
        }
      },
      settlementState: "active"
    }
  }),
  defineGoldenCase({
    id: "bedwars-no-tower-means-elimination-and-settlement",
    title: "Bedwars: without a tower the next death eliminates the team",
    description: "A player whose team no longer has a tower should be removed instead of respawned, ending the match if no allies remain.",
    scene: {
      mapId: BEDWARS_GAME_MAP_ID,
      layout: [
        "#########",
        "#i..p..I#",
        "#....T..#",
        "#########"
      ],
      players: [
        {
          id: "p1",
          name: "P1",
          characterId: "ehh",
          position: { x: 3, y: 1 },
          spawnPosition: { x: 1, y: 1 },
          tools: [{ toolId: "movement", params: { movePoints: 1 } }]
        },
        {
          id: "p2",
          name: "P2",
          characterId: "ehh",
          position: { x: 7, y: 1 },
          spawnPosition: { x: 7, y: 1 }
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
      settlementState: "complete",
      players: {
        p1: {
          boardVisible: false,
          position: { x: 4, y: 1 },
          teamId: "white",
          toolCount: 0
        },
        p2: {
          boardVisible: true,
          teamId: "black"
        }
      },
      turnInfo: {
        currentPlayerId: "",
        phase: "turn-start",
        turnNumber: 1
      }
    }
  })
] as const;
