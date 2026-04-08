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
        id: "turn-action-lucky-grants-post-roll-tool",
        title: "Lucky triggers after the roll when action phase begins",
        description: "Starting a turn on a lucky tile should wait for the roll to finish, then grant one extra tool as action phase begins.",
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
            },
            {
                kind: "rollDice",
                actorId: "hero",
                label: "Roll into the action phase"
            }
        ],
        expect: {
            boardLayout: [
                "#####",
                "#.x.#",
                "#...#",
                "#####"
            ],
            players: {
                hero: {
                    position: { x: 2, y: 1 },
                    toolCount: 4
                }
            },
            turnInfo: {
                currentPlayerId: "hero",
                phase: "turn-action",
                turnNumber: 2
            }
        }
    }),
    defineGoldenCase({
        id: "turn-start-restores-empty-lucky",
        title: "Turn start restores empty lucky tiles",
        description: "Lucky tiles claimed on the previous turn should restore as the next turn begins.",
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
                label: "End the first turn on lucky"
            },
            {
                kind: "rollDice",
                actorId: "hero",
                label: "Claim lucky at action phase start"
            },
            {
                kind: "endTurn",
                actorId: "hero",
                label: "Advance into the next turn start"
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
                    toolCount: 0
                }
            },
            turnInfo: {
                currentPlayerId: "hero",
                phase: "turn-start",
                turnNumber: 3
            },
            latestPresentation: {
                toolId: "movement",
                eventKinds: ["state_transition"]
            }
        }
    }),

    defineGoldenCase({
        id: "turn-action-poison-respawns-after-roll",
        title: "Poison triggers after the roll when action phase begins",
        description: "Starting a turn on poison should wait for the roll to finish, then respawn the player as action phase begins.",
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
                label: "End the turn while standing on poison"
            },
            {
                kind: "rollDice",
                actorId: "hero",
                label: "Roll into the action phase"
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
                    toolCount: 3
                }
            },
            turnInfo: {
                currentPlayerId: "hero",
                phase: "turn-action",
                turnNumber: 2
            },
            eventTypes: ["turn_ended", "turn_started", "dice_rolled", "player_respawned"]
        }
    }),
    defineGoldenCase({
        id: "pit-pass-through-respawns-mid-move",
        title: "Passing through a pit respawns immediately",
        description: "Pit should trigger while moving through it, stop the move, and respawn the player to spawn.",
        scene: {
            layout: [
                "######",
                "#.o..#",
                "#....#",
                "######"
            ],
            players: [
                {
                    id: "hero",
                    name: "Hero",
                    characterId: "ehh",
                    position: { x: 1, y: 1 },
                    spawnPosition: { x: 1, y: 2 },
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
                label: "Move through the pit"
            }
        ],
        expect: {
            boardLayout: [
                "######",
                "#.o..#",
                "#....#",
                "######"
            ],
            players: {
                hero: {
                    position: { x: 1, y: 2 },
                    toolCount: 0
                }
            },
            latestPresentation: {
                toolId: "movement",
                eventKinds: ["motion", "motion"]
            }
        }
    }),
    defineGoldenCase({
        id: "highwall-blocks-leap-traversal",
        title: "Highwall blocks leap traversal",
        description: "Jump cannot leap over a highwall and must settle before it if a landing tile exists.",
        scene: {
            layout: [
                "#######",
                "#..H..#",
                "#.....#",
                "#######"
            ],
            players: [
                {
                    id: "hero",
                    name: "Hero",
                    characterId: "ehh",
                    position: { x: 1, y: 1 },
                    tools: [
                        {
                            toolId: "jump",
                            params: {
                                jumpDistance: 3
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
                tool: "jump",
                direction: "right",
                label: "Try to jump over the highwall"
            }
        ],
        expect: {
            boardLayout: [
                "#######",
                "#..H..#",
                "#.....#",
                "#######"
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
                "#########",
                "#D.....L#",
                "#.......#",
                "#.......#",
                "#R.....U#",
                "#########"
            ],
            players: [
                {
                    id: "hero",
                    name: "Hero",
                    characterId: "ehh",
                    position: { x: 4, y: 1 },
                    tools: [
                        {
                            toolId: "basketball",
                        }
                    ]
                },
                {
                    id: "p1",
                    name: "P1",
                    characterId: "ehh",
                    position: { x: 2, y: 1 }
                },
                {
                    id: "p2",
                    name: "P2",
                    characterId: "ehh",
                    position: { x: 1, y: 2 }
                },
                {
                    id: "p3",
                    name: "P3",
                    characterId: "ehh",
                    position: { x: 4, y: 4 }
                },
                {
                    id: "p4",
                    name: "P4",
                    characterId: "ehh",
                    position: { x: 7, y: 2 }
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
                tool: "basketball",
                direction: "left",
                label: "Throw basketball"
            }
        ],
        expect: {
            boardLayout: [
                "#########",
                "#D.....L#",
                "#.......#",
                "#.......#",
                "#R.....U#",
                "#########"
            ],
            players: {
                hero: {
                    position: { x: 1, y: 1 },
                    toolCount: 0
                },
                p1: {
                    position: { x: 1, y: 1 }
                },
                p2: {
                    position: { x: 1, y: 4 }
                },
                p3: {
                    position: { x: 7, y: 4 }
                },
                p4: {
                    position: { x: 7, y: 1 }
                },
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
                "#.R##",
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
                "#.R##",
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
