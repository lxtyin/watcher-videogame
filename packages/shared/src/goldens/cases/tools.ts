import { defineGoldenCase } from "../types";

export const GOLDEN_TOOL_CASES = [
  defineGoldenCase({
    id: "punch-hits-player-and-pushes-three",
    title: "Punch pushes a player within two tiles",
    description: "Punching toward a player within range should push that player three tiles away.",
    scene: {
      layout: [
        "########",
        "#......#",
        "#......#",
        "########"
      ],
      players: [
        {
          id: "boxer",
          name: "Boxer",
          characterId: "ehh",
          position: { x: 1, y: 1 },
          tools: [
            {
              toolId: "punch"
            }
          ]
        },
        {
          id: "target",
          name: "Target",
          characterId: "ehh",
          position: { x: 3, y: 1 }
        }
      ],
      turn: {
        currentPlayerId: "boxer",
        phase: "turn-action"
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "boxer",
        tool: "punch",
        direction: "right",
        label: "Punch the target"
      }
    ],
    expect: {
      boardLayout: [
        "########",
        "#......#",
        "#......#",
        "########"
      ],
      players: {
        boxer: {
          position: { x: 1, y: 1 },
          toolCount: 0
        },
        target: {
          position: { x: 6, y: 1 }
        }
      },
      latestPresentation: {
        toolId: "punch",
        eventKinds: ["reaction", "motion"]
      }
    }
  }),
  defineGoldenCase({
    id: "punch-hits-wall-and-recoils-self",
    title: "Punch recoils from a wall",
    description: "Punching a wall within range should push the boxer three tiles backward.",
    scene: {
      layout: [
        "#########",
        "#....#..#",
        "#.......#",
        "#########"
      ],
      players: [
        {
          id: "boxer",
          name: "Boxer",
          characterId: "ehh",
          position: { x: 4, y: 1 },
          tools: [
            {
              toolId: "punch"
            }
          ]
        }
      ],
      turn: {
        currentPlayerId: "boxer",
        phase: "turn-action"
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "boxer",
        tool: "punch",
        direction: "right",
        label: "Punch the wall"
      }
    ],
    expect: {
      boardLayout: [
        "#########",
        "#....#..#",
        "#.......#",
        "#########"
      ],
      players: {
        boxer: {
          position: { x: 1, y: 1 },
          toolCount: 0
        }
      },
      latestPresentation: {
        toolId: "punch",
        eventKinds: ["reaction", "motion"]
      }
    }
  })
];
