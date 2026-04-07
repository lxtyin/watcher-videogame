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
                phase: "turn-action"
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
                eventKinds: ["motion"]
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
                phase: "turn-action"
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
    }),
    defineGoldenCase({
        id: "turn-start-lucky-grants-pre-roll-tool",
        title: "Turn start stop triggers lucky before the roll",
        description: "Starting a turn on a lucky tile should immediately grant one rolled tool during the turn-start phase.",
        scene: {
            layout: [
                "#####",
                "#.l.#",
                "#...#",
                "#####"
            ],
            players: [
                {
                    id: "hero",
                    name: "Hero",
                    characterId: "ehh",
                    position: { x: 2, y: 1 },
                    spawnPosition: { x: 1, y: 2 }
                }
            ],
            turn: {
                currentPlayerId: "hero",
                phase: "turn-action",
                turnNumber: 1
            },
            seeds: {
                toolDieSeed: 1
            }
        },
        steps: [
            {
                kind: "endTurn",
                actorId: "hero",
                label: "End the turn while standing on lucky"
            }
        ],
        expect: {
            boardLayout: [
                "#####",
                "#.l.#",
                "#...#",
                "#####"
            ],
            players: {
                hero: {
                    position: { x: 2, y: 1 },
                    toolCount: 1,
                    turnFlags: ["lucky_tile_claimed"]
                }
            },
            turnInfo: {
                currentPlayerId: "hero",
                phase: "turn-start",
                turnNumber: 2
            }
        }
    }),

    defineGoldenCase({
        id: "turn-start-pit-respawns-before-roll",
        title: "Turn start stop triggers pit before the roll",
        description: "Starting a turn on a pit should immediately respawn the player to their spawn tile before rolling.",
        scene: {
            layout: [
                "#####",
                "#.p.#",
                "#...#",
                "#####"
            ],
            players: [
                {
                    id: "hero",
                    name: "Hero",
                    characterId: "ehh",
                    position: { x: 2, y: 1 },
                    spawnPosition: { x: 1, y: 2 }
                }
            ],
            turn: {
                currentPlayerId: "hero",
                phase: "turn-action",
                turnNumber: 1
            }
        },
        steps: [
            {
                kind: "endTurn",
                actorId: "hero",
                label: "End the turn while standing on pit"
            }
        ],
        expect: {
            boardLayout: [
                "#####",
                "#.p.#",
                "#...#",
                "#####"
            ],
            players: {
                hero: {
                    position: { x: 1, y: 2 },
                    toolCount: 0
                }
            },
            turnInfo: {
                currentPlayerId: "hero",
                phase: "turn-start",
                turnNumber: 2
            },
            eventTypes: ["turn_ended", "turn_started", "player_respawned"]
        }
    }),
    defineGoldenCase({
        id: "build-wall-blocked-by-player-and-summon",
        title: "Build Wall requires an unoccupied floor tile",
        description: "Build Wall should stay blocked when the target tile contains a player or a summon.",
        scene: {
            layout: [
                "#####",
                "#...#",
                "#...#",
                "#...#",
                "#####"
            ],
            players: [
                {
                    id: "builder",
                    name: "Builder",
                    characterId: "ehh",
                    position: { x: 2, y: 2 },
                    tools: [
                        {
                            toolId: "buildWall"
                        }
                    ]
                },
                {
                    id: "blocker",
                    name: "Blocker",
                    characterId: "leader",
                    position: { x: 1, y: 2 }
                }
            ],
            summons: [
                {
                    summonId: "wallet",
                    ownerId: "builder",
                    position: { x: 3, y: 2 }
                }
            ],
            turn: {
                currentPlayerId: "builder",
                phase: "turn-action"
            }
        },
        steps: [
            {
                kind: "useTool",
                actorId: "builder",
                tool: "buildWall",
                targetPosition: { x: 1, y: 2 },
                label: "Try to build on another player",
                expect: {
                    blockedReasonIncludes: "empty floor tile"
                }
            },
            {
                kind: "useTool",
                actorId: "builder",
                tool: "buildWall",
                targetPosition: { x: 3, y: 2 },
                label: "Try to build on a summon",
                expect: {
                    blockedReasonIncludes: "empty floor tile"
                }
            }
        ],
        expect: {
            boardLayout: [
                "#####",
                "#...#",
                "#...#",
                "#...#",
                "#####"
            ],
            players: {
                builder: {
                    position: { x: 2, y: 2 },
                    toolCount: 1
                },
                blocker: {
                    position: { x: 1, y: 2 }
                }
            },
            summonCount: 1,
            summons: [
                {
                    summonId: "wallet",
                    ownerId: "builder",
                    position: { x: 3, y: 2 }
                }
            ]
        }
    }),
    defineGoldenCase({
        id: "movement-stop-cannon-fires-rocket",
        title: "Stopping on a cannon fires a rocket with terrain-owned presentation",
        description: "Landing on a cannon should reuse the shared rocket resolution core and knock the first hit player away.",
        scene: {
            layout: [
                "#######",
                "#.c...#",
                "#.....#",
                "#######"
            ],
            symbols: {
                c: {
                    type: "cannon",
                    direction: "right"
                }
            },
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
                },
                {
                    id: "target",
                    name: "Target",
                    characterId: "leader",
                    position: { x: 4, y: 1 }
                }
            ],
            turn: {
                currentPlayerId: "hero",
                phase: "turn-action"
            }
        },
        steps: [
            {
                kind: "useTool",
                actorId: "hero",
                tool: "movement",
                direction: "right",
                label: "Walk onto the cannon"
            }
        ],
        expect: {
            boardLayout: [
                "#######",
                "#.c...#",
                "#.....#",
                "#######"
            ],
            players: {
                hero: {
                    position: { x: 2, y: 1 },
                    toolCount: 0
                },
                target: {
                    position: { x: 5, y: 1 }
                }
            },
            latestPresentation: {
                toolId: "movement",
                eventKinds: ["motion", "motion", "motion", "reaction"]
            }
        }
    }),
    defineGoldenCase({
        id: "movement-stop-cannon-near-wall-blasts-triggering-player",
        title: "Stopping on a blocked cannon still blasts the triggering player",
        description: "When a cannon explodes on its own tile, the player who just stopped there should be treated as the blast target.",
        scene: {
            layout: [
                "#####",
                "#.c##",
                "#...#",
                "#####"
            ],
            symbols: {
                c: {
                    type: "cannon",
                    direction: "right"
                }
            },
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
                phase: "turn-action"
            }
        },
        steps: [
            {
                kind: "useTool",
                actorId: "hero",
                tool: "movement",
                direction: "right",
                label: "Walk onto the blocked cannon"
            }
        ],
        expect: {
            boardLayout: [
                "#####",
                "#.c##",
                "#...#",
                "#####"
            ],
            players: {
                hero: {
                    position: { x: 1, y: 1 },
                    toolCount: 0
                }
            },
            latestPresentation: {
                toolId: "movement",
                eventKinds: ["motion", "motion", "reaction"]
            }
        }
    })
];
