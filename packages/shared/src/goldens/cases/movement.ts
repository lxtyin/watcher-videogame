import { defineGoldenCase } from "../types";

export const GOLDEN_MOVEMENT_CASES = [
    defineGoldenCase({
        id: "basic-movement-right",
        title: "Movement updates the actor position",
        description: "A simple grounded move should consume the movement tool and land on the next floor tile.",
        scene: {
            layout: [
                "#	#	#	#	#",
                "#	.	.	.	#",
                "#	.	.	.	#",
                "#	#	#	#	#"
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
                "#	#	#	#	#",
                "#	.	.	.	#",
                "#	.	.	.	#",
                "#	#	#	#	#"
            ],
            players: {
                hero: {
                    position: { x: 3, y: 1 },
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
        id: "earth-wall-break",
        title: "Movement breaks an earth wall",
        description: "Ground movement into an earth wall should remove the wall and attach a delayed state transition event.",
        scene: {
            layout: [
                "#	#	#	#	#",
                "#	.	E2	.	#",
                "#	.	.	.	#",
                "#	#	#	#	#"
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
                "#	#	#	#	#",
                "#	.	.	.	#",
                "#	.	.	.	#",
                "#	#	#	#	#"
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
                "#	#	#	#	#",
                "#	.	Lucky	.	#",
                "#	.	.	.	#",
                "#	#	#	#	#"
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
                "#	#	#	#	#",
                "#	.	Lucky	.	#",
                "#	.	.	.	#",
                "#	#	#	#	#"
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
        id: "lucky-can-trigger-every-turn",
        title: "Lucky can trigger every turn",
        description: "Lucky tiles should stay on the board and grant a reward every time action phase begins on them.",
        scene: {
            layout: [
                "#	#	#	#	#",
                "#	.	Lucky	.	#",
                "#	.	.	.	#",
                "#	#	#	#	#"
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
            },
            {
                kind: "rollDice",
                actorId: "hero",
                label: "Claim lucky again at action phase start"
            }
        ],
        expect: {
            boardLayout: [
                "#	#	#	#	#",
                "#	.	Lucky	.	#",
                "#	.	.	.	#",
                "#	#	#	#	#"
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
                turnNumber: 3
            },
            latestPresentation: {
                eventKinds: ["reaction"]
            }
        }
    }),
    defineGoldenCase({
        id: "lucky-point-reward-grants-movement-points",
        title: "Lucky point reward grants movement",
        description: "A point Lucky tile should grant a movement tool with the configured movement die value.",
        scene: {
            layout: [
                "#	#	#	#	#	#	#	#	#",
                "#	.	L5	.	.	.	.	.	#",
                "#	#	#	#	#	#	#	#	#"
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
                label: "Step onto the point Lucky tile"
            },
            {
                kind: "useTool",
                actorId: "hero",
                tool: "movement",
                direction: "right",
                label: "Spend the movement-5 reward"
            }
        ],
        expect: {
            boardLayout: [
                "#	#	#	#	#	#	#	#	#",
                "#	.	L5	.	.	.	.	.	#",
                "#	#	#	#	#	#	#	#	#"
            ],
            players: {
                hero: {
                    position: { x: 7, y: 1 },
                    toolCount: 0
                }
            }
        }
    }),
    defineGoldenCase({
        id: "lucky-tool-reward-grants-specific-tool",
        title: "Lucky tool reward grants the configured tool",
        description: "A tool Lucky tile should grant the exact configured tool instead of rolling randomly.",
        scene: {
            layout: [
                "#	#	#	#	#",
                "#	.	L:rocket	.	#",
                "#	#	#	#	#"
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
                label: "Step onto the tool Lucky tile"
            }
        ],
        expect: {
            boardLayout: [
                "#	#	#	#	#",
                "#	.	L:rocket	.	#",
                "#	#	#	#	#"
            ],
            players: {
                hero: {
                    position: { x: 2, y: 1 },
                    toolCount: 1,
                    toolIds: ["rocket"]
                }
            }
        }
    }),

    defineGoldenCase({
        id: "turn-action-poison-respawns-after-roll",
        title: "Poison triggers after the roll when action phase begins",
        description: "Starting a turn on poison should wait for the roll to finish, then respawn the player as action phase begins.",
        scene: {
            layout: [
                "#	#	#	#	#",
                "#	.	Poison	.	#",
                "#	.	.	.	#",
                "#	#	#	#	#"
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
                "#	#	#	#	#",
                "#	.	Poison	.	#",
                "#	.	.	.	#",
                "#	#	#	#	#"
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
                "#	#	#	#	#	#",
                "#	.	Pit	.	.	#",
                "#	.	.	.	.	#",
                "#	#	#	#	#	#"
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
                "#	#	#	#	#	#",
                "#	.	Pit	.	.	#",
                "#	.	.	.	.	#",
                "#	#	#	#	#	#"
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
                "#	#	#	#	#	#	#",
                "#	.	.	High	.	.	#",
                "#	.	.	.	.	.	#",
                "#	#	#	#	#	#	#"
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
                "#	#	#	#	#	#	#",
                "#	.	.	High	.	.	#",
                "#	.	.	.	.	.	#",
                "#	#	#	#	#	#	#"
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
        id: "leap-landing-on-pit-respawns",
        title: "Leap landing on a pit respawns",
        description: "Leap should fly over intermediate cells, but the landing tile should trigger contact terrain as translate movement.",
        scene: {
            layout: [
                "#	#	#	#	#	#",
                "#	.	.	Pit	.	#",
                "#	.	.	.	.	#",
                "#	#	#	#	#	#"
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
                            toolId: "jump",
                            params: {
                                jumpDistance: 2
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
                label: "Jump onto the pit"
            }
        ],
        expect: {
            boardLayout: [
                "#	#	#	#	#	#",
                "#	.	.	Pit	.	#",
                "#	.	.	.	.	#",
                "#	#	#	#	#	#"
            ],
            players: {
                hero: {
                    position: { x: 1, y: 2 },
                    toolCount: 0
                }
            },
            eventTypes: ["player_respawned", "tool_used"]
        }
    }),
    defineGoldenCase({
        id: "build-wall-blocked-by-player-and-summon",
        title: "Build Wall requires an unoccupied floor tile",
        description: "Build Wall should stay blocked when the target tile contains a player or a summon.",
        scene: {
            layout: [
                "#	#	#	#	#",
                "#	.	.	.	#",
                "#	.	.	.	#",
                "#	.	.	.	#",
                "#	#	#	#	#"
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
                "#	#	#	#	#",
                "#	.	.	.	#",
                "#	.	.	.	#",
                "#	.	.	.	#",
                "#	#	#	#	#"
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
                "#	#	#	#	#	#	#	#	#",
                "#	Cv	.	.	.	.	.	C<	#",
                "#	.	.	.	.	.	.	.	#",
                "#	.	.	.	.	.	.	.	#",
                "#	C>	.	.	.	.	.	C^	#",
                "#	#	#	#	#	#	#	#	#"
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
                "#	#	#	#	#	#	#	#	#",
                "#	Cv	.	.	.	.	.	C<	#",
                "#	.	.	.	.	.	.	.	#",
                "#	.	.	.	.	.	.	.	#",
                "#	C>	.	.	.	.	.	C^	#",
                "#	#	#	#	#	#	#	#	#"
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
                "#	#	#	#	#",
                "#	.	C>	#	#",
                "#	.	.	.	#",
                "#	#	#	#	#"
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
                "#	#	#	#	#",
                "#	.	C>	#	#",
                "#	.	.	.	#",
                "#	#	#	#	#"
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
    }),
    defineGoldenCase({
        id: "movement-impact-recoil-on-wall-block",
        title: "Translate movement authors an impact recoil when a wall blocks remaining steps",
        description: "Ground translate should append an impact recoil motion when a player still has move points but the next tile is solid.",
        scene: {
            layout: [
                "#	#	#	#	#",
                "#	.	.	.	#",
                "#	.	.	.	#",
                "#	#	#	#	#"
            ],
            players: [
                {
                    id: "hero",
                    name: "Hero",
                    characterId: "ehh",
                    position: { x: 2, y: 2 },
                    tools: [
                        {
                            toolId: "movement",
                            params: {
                                movePoints: 2
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
                direction: "up",
                label: "Walk into the top wall with one step left"
            }
        ],
        expect: {
            boardLayout: [
                "#	#	#	#	#",
                "#	.	.	.	#",
                "#	.	.	.	#",
                "#	#	#	#	#"
            ],
            players: {
                hero: {
                    position: { x: 2, y: 1 },
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
        id: "movement-impact-boxing-ball-grants-scaled-punch",
        title: "In-turn impact on a boxing ball grants a punch with matching knockback",
        description: "An in-turn translate impact should wobble the boxing ball, pop the impact value, and grant a punch whose push distance matches the remaining move points.",
        scene: {
            layout: [
                "#	#	#	#	#	#	#",
                "#	.	.	.	.	.	#",
                "#	.	.	Box	.	.	#",
                "#	.	.	.	.	.	#",
                "#	.	.	.	.	.	#",
                "#	.	.	.	.	.	#",
                "#	#	#	#	#	#	#"
            ],
            players: [
                {
                    id: "hero",
                    name: "Hero",
                    characterId: "ehh",
                    position: { x: 1, y: 2 },
                    tools: [
                        {
                            toolId: "movement",
                            params: {
                                movePoints: 3
                            }
                        }
                    ]
                },
                {
                    id: "target",
                    name: "Target",
                    characterId: "late",
                    position: { x: 2, y: 3 }
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
                label: "Ram the boxing ball with two move points left"
            },
            {
                kind: "useTool",
                actorId: "hero",
                tool: "punch",
                direction: "down",
                label: "Use the rewarded punch on the nearby target"
            }
        ],
        expect: {
            boardLayout: [
                "#	#	#	#	#	#	#",
                "#	.	.	.	.	.	#",
                "#	.	.	Box	.	.	#",
                "#	.	.	.	.	.	#",
                "#	.	.	.	.	.	#",
                "#	.	.	.	.	.	#",
                "#	#	#	#	#	#	#"
            ],
            players: {
                hero: {
                    position: { x: 2, y: 2 },
                    toolCount: 0
                },
                target: {
                    position: { x: 2, y: 5 }
                }
            }
        }
    }),
    defineGoldenCase({
        id: "movement-impact-adjacent-boxing-ball-still-applies",
        title: "Adjacent in-turn impact on a boxing ball still applies the tool",
        description: "Even if translate movement is blocked on the first tile, an in-turn impact should still consume the tool, trigger the boxing ball, and grant the scaled punch.",
        scene: {
            layout: [
                "#	#	#	#	#	#	#",
                "#	.	.	.	.	.	#",
                "#	.	.	Box	.	.	#",
                "#	.	.	.	.	.	#",
                "#	.	.	.	.	.	#",
                "#	.	.	.	.	.	#",
                "#	#	#	#	#	#	#"
            ],
            players: [
                {
                    id: "hero",
                    name: "Hero",
                    characterId: "ehh",
                    position: { x: 2, y: 2 },
                    tools: [
                        {
                            toolId: "movement",
                            params: {
                                movePoints: 2
                            }
                        }
                    ]
                },
                {
                    id: "target",
                    name: "Target",
                    characterId: "late",
                    position: { x: 2, y: 3 }
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
                label: "Bump directly into the adjacent boxing ball"
            },
            {
                kind: "useTool",
                actorId: "hero",
                tool: "punch",
                direction: "down",
                label: "Use the rewarded punch after the zero-step impact"
            }
        ],
        expect: {
            boardLayout: [
                "#	#	#	#	#	#	#",
                "#	.	.	.	.	.	#",
                "#	.	.	Box	.	.	#",
                "#	.	.	.	.	.	#",
                "#	.	.	.	.	.	#",
                "#	.	.	.	.	.	#",
                "#	#	#	#	#	#	#"
            ],
            players: {
                hero: {
                    position: { x: 2, y: 2 },
                    toolCount: 0
                },
                target: {
                    position: { x: 2, y: 5 }
                }
            }
        }
    }),
    defineGoldenCase({
        id: "basketball-passive-push-adjacent-wall-still-recoils",
        title: "Basketball push still authors impact recoil when the target starts against a wall",
        description: "Passive translate displacement from Basketball should keep the zero-step impact recoil presentation instead of dropping it as an empty move.",
        scene: {
            layout: [
                "#	#	#	#	#",
                "#	.	.	.	#",
                "#	.	.	.	#",
                "#	#	#	#	#"
            ],
            players: [
                {
                    id: "hero",
                    name: "Hero",
                    characterId: "ehh",
                    position: { x: 1, y: 1 },
                    tools: [
                        {
                            toolId: "basketball",
                            params: {
                                projectileBounceCount: 0,
                                projectilePushDistance: 2,
                                projectileRange: 3
                            }
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
                currentPlayerId: "hero",
                phase: "turn-action"
            }
        },
        steps: [
            {
                kind: "useTool",
                actorId: "hero",
                tool: "basketball",
                direction: "right",
                label: "Throw the basketball at the target pinned against the wall"
            }
        ],
        expect: {
            boardLayout: [
                "#	#	#	#	#",
                "#	.	.	.	#",
                "#	.	.	.	#",
                "#	#	#	#	#"
            ],
            players: {
                hero: {
                    position: { x: 1, y: 1 },
                    toolCount: 0
                },
                target: {
                    position: { x: 3, y: 1 }
                }
            },
            latestPresentation: {
                toolId: "basketball",
                eventKinds: ["motion", "motion"]
            }
        }
    }),
    defineGoldenCase({
        id: "projectile-impact-boxing-ball-triggers-hit-effect",
        title: "Projectile collision with a boxing ball triggers the impact reaction",
        description: "Projectile-owned impacts should still shake the boxing ball even though they always report impact 999.",
        scene: {
            layout: [
                "#	#	#	#	#	#	#",
                "#	.	.	.	.	.	#",
                "#	.	.	.	Box	.	#",
                "#	.	.	.	.	.	#",
                "#	#	#	#	#	#	#"
            ],
            players: [
                {
                    id: "hero",
                    name: "Hero",
                    characterId: "ehh",
                    position: { x: 1, y: 2 },
                    tools: [{ toolId: "rocket" }]
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
                tool: "rocket",
                direction: "right",
                label: "Fire a rocket into the boxing ball"
            }
        ],
        expect: {
            boardLayout: [
                "#	#	#	#	#	#	#",
                "#	.	.	.	.	.	#",
                "#	.	.	.	Box	.	#",
                "#	.	.	.	.	.	#",
                "#	#	#	#	#	#	#"
            ],
            players: {
                hero: {
                    position: { x: 1, y: 2 },
                    toolCount: 0
                }
            },
            latestPresentation: {
                toolId: "rocket",
                eventKinds: ["motion", "reaction", "reaction"]
            }
        }
    })
];
