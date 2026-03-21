# Feature Specification: AI Settlement Capture Prioritization

**Feature Branch**: `015-ai-capture-priority`
**Created**: 2026-03-19
**Status**: Draft
**Input**: User description: "The AI currently does not capture a settlement if it can be readily captured. Adjust the ai to prioritize settlement capture if that option is freely available."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — AI Captures Adjacent Undefended Settlement (Priority: P1)

When an AI unit is adjacent to an undefended, capturable settlement (neutral or enemy-owned), the AI should move that unit onto the settlement to begin or complete capture on that turn rather than taking a lower-priority action.

**Why this priority**: This is the core bug being fixed. The AI failing to capture a freely available settlement is a significant strategic oversight that makes the AI feel passive and uncompetitive. Correcting this is the minimum viable improvement.

**Independent Test**: Can be fully tested by observing a game state where one AI unit is directly adjacent to an undefended neutral or enemy settlement and verifying the AI moves that unit onto the settlement during its turn.

**Acceptance Scenarios**:

1. **Given** an AI unit is adjacent to an undefended neutral settlement at the start of the AI's turn, **When** the AI processes that unit's action, **Then** the unit moves onto the settlement and begins the capture sequence.
2. **Given** an AI unit is adjacent to an undefended enemy settlement at the start of the AI's turn, **When** the AI processes that unit's action, **Then** the unit moves onto the settlement and begins the capture sequence.
3. **Given** an AI unit is currently on a settlement completing turn 2 of a capture, **When** the AI processes that unit's action, **Then** the unit stays to complete the capture rather than moving elsewhere.

---

### User Story 2 — Capture Beats Lower-Priority Actions (Priority: P2)

When an AI unit has a freely available capture opportunity, settlement capture is chosen over other lower-priority actions such as exploration, repositioning, or non-critical combat.

**Why this priority**: Even if the AI does attempt captures sometimes, inconsistent prioritization leads to missed opportunities. This story ensures the priority ordering is deterministic and correct.

**Independent Test**: Can be tested by placing an AI unit in a position where it could either explore an unrevealed tile or move onto an adjacent undefended settlement, and verifying the AI always chooses capture.

**Acceptance Scenarios**:

1. **Given** an AI unit can either explore an unknown tile or capture an adjacent undefended settlement, **When** the AI evaluates options, **Then** the AI chooses to capture the settlement.
2. **Given** an AI unit can either reposition toward a distant enemy or capture an adjacent undefended settlement, **When** the AI evaluates options, **Then** the AI chooses to capture the settlement.

---

### User Story 3 — No Duplicate Capture Assignments (Priority: P3)

When multiple AI units can reach the same capturable settlement, only one unit is assigned to capture it; remaining units are redirected to other objectives.

**Why this priority**: Without coordination, multiple AI units may converge on the same settlement, wasting movement and leaving other objectives uncovered. This is a secondary quality improvement.

**Independent Test**: Can be tested by placing two AI units adjacent to the same undefended settlement and verifying that only one unit moves onto it while the other pursues a different action.

**Acceptance Scenarios**:

1. **Given** two AI units are both adjacent to the same undefended settlement, **When** the AI processes both units' actions, **Then** exactly one unit moves onto the settlement and the other takes a different action.

---

### Edge Cases

- What happens when an AI unit is mid-capture (turn 1 complete) and an enemy unit moves adjacent? The unit should remain to complete the capture unless the enemy unit will destroy it next turn.
- What happens when all capturable settlements within AI reach are already AI-owned? No capture action is taken; the unit proceeds to its next-best action.
- What happens when a settlement is within movement range but requires passing through an occupied enemy tile? The settlement is not considered freely capturable; the unit does not attempt it.
- What happens when a player unit occupies the settlement? The settlement cannot be captured this turn; the AI treats it as blocked.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The AI MUST evaluate settlement capture opportunities before evaluating exploration, repositioning, or non-combat movement options for each unit each turn.
- **FR-002**: The AI MUST consider a settlement "freely capturable" when it is undefended (no enemy unit currently on it) and reachable within the AI unit's movement range this turn.
- **FR-003**: When an AI unit identifies a freely capturable settlement as its best action, the AI MUST move that unit onto the settlement to initiate or advance the capture sequence.
- **FR-004**: An AI unit that is currently on a settlement and mid-capture (turn 1 of 2 complete) MUST remain to complete the capture on the following turn, unless the unit would be destroyed by an enemy attack before completing capture.
- **FR-005**: When multiple AI units could capture the same settlement, the AI MUST assign at most one unit to that settlement and direct other units to different objectives.
- **FR-006**: The AI's capture prioritization MUST apply in all strategic phases (defensive, balanced, and offensive) since an uncontested capture is always advantageous regardless of phase.

### Key Entities

- **Settlement**: A neutral or enemy-owned map tile that an AI unit can occupy to begin a capture sequence. A settlement is "freely capturable" when undefended and within reach.
- **AI Unit**: A military unit controlled by the AI that has a movement budget each turn. It evaluates available actions in priority order.
- **Capture Opportunity**: The state where an AI unit can reach an undefended capturable settlement within its movement range in the current turn.
- **Capture Sequence**: The 2-turn process by which a unit claims a settlement. Turn 1: unit moves onto settlement. Turn 2: unit remains; settlement ownership transfers.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of observable cases where an AI unit begins its turn adjacent to an undefended capturable settlement, the AI moves that unit onto the settlement during that turn.
- **SC-002**: The AI never chooses exploration or repositioning over a freely available settlement capture during the same turn for the same unit.
- **SC-003**: An AI unit that is mid-capture remains on the settlement to complete the capture in 100% of cases where no enemy threat would destroy it before completion.
- **SC-004**: When two or more AI units could reach the same settlement, no more than one unit is assigned to capture it per turn.
- **SC-005**: Observers playing against the AI report that the AI actively and consistently contests settlements, making the game feel noticeably more competitive compared to before this change.

## Assumptions

- The AI already has omniscient map knowledge (established in prior specs), so it always knows the exact location and ownership status of every settlement without needing line-of-sight.
- The 2-turn capture mechanic is already implemented and functioning correctly; this feature only changes the AI's decision-making priority, not the capture mechanics themselves.
- "Freely capturable" excludes settlements that require the AI unit to move through a tile occupied by an enemy unit to reach them.
- A settlement defended by a player unit (player unit is standing on it) is not considered freely capturable and is out of scope for this prioritization.
- The mid-capture retreat exception (FR-004) applies only when an enemy unit is positioned to attack and would destroy the AI unit before the capture completes; otherwise the AI should always complete the capture.
- This feature does not change the AI's behavior for settlements it cannot reach this turn; those remain subject to normal pathfinding and strategic evaluation.
