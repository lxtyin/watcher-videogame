import { defineGoldenCase } from "../types";

export const GOLDEN_MOVEMENT_CASES = [
    defineGoldenCase({
        id: "basic-movement-right",
        title: "Movement updates the actor position",
        description: "A simple grounded move should consume the movement tool and land on the next floor tile.",
        scene: {
            layout: [
                "#####",
                "#...#",
                "#...#",
                "#####"
            ],
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
                label: "Move right once"
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
                hero: {
                    position: { x: 3, y: 1 },
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
            layout: [
                "#####",
                "#.e.#",
                "#...#",
                "#####"
            ],
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
                direction: "right"
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
                hero: {
                    position: { x: 2, y: 1 },
                    toolCount: 0
                }
            }
        }
    })
];