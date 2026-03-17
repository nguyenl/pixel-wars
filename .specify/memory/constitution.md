<!--
SYNC IMPACT REPORT
==================
Version change: 2.0.0 → 2.1.0
Modified principles:
  - Removed IV. Real-Time Reliability (no longer applicable — single-player, browser-only)
  - Removed V. Observability (no longer applicable — no server infrastructure)
Added sections:
  - IV. Single-Player First, Multiplayer-Ready (new principle)
  - V. Browser-Only Execution (new principle)
Modified sections:
  - Technology Standards — removed backend/WebSocket constraints, added browser-only and GitHub Pages constraints
  - Governance — updated compliance review reference to reflect 5 principles (renumbered)
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check section references generic gates; verify no mention of server-side reliability or observability gates.
  ✅ .specify/templates/spec-template.md — No constitution-specific overrides required.
  ✅ .specify/templates/tasks-template.md — Task categories remain valid.
Follow-up TODOs:
  - TODO(TECH_STACK): No source files or README exist yet; technology choices are marked NEEDS CLARIFICATION in plan-template. Update this constitution once the stack is decided.
-->

# Pixel Wars Constitution

## Core Principles

### I. Simplicity First

Every design decision MUST start from the simplest solution that satisfies current requirements.
Complexity MUST be explicitly justified — if a simpler alternative exists, it MUST be used instead.
Premature abstractions, over-engineering, and speculative generalization are prohibited.
YAGNI (You Aren't Gonna Need It) is the default stance; add complexity only when the need is proven.

**Rationale**: Game systems accumulate accidental complexity quickly. An enforced simplicity gate
prevents architectural debt from compounding before the system is understood.

### II. Test-First Development

Tests MUST be written before implementation for every non-trivial feature.
The Red-Green-Refactor cycle is mandatory: tests MUST fail before implementation begins, then pass
after implementation, then the implementation is refactored without breaking tests.
Unit tests cover logic; integration tests cover inter-component contracts; end-to-end tests cover
critical user journeys. Test coverage MUST not regress.

**Rationale**: Game state bugs are expensive to debug. Catching contract failures early via failing
tests is orders of magnitude cheaper than post-deployment debugging.

### III. Vertical Slice Delivery

Every feature MUST be deliverable as an independently testable, independently deployable increment.
Each user story slice MUST provide user-visible value on its own — no story may be left half-done
in main. A slice is complete only when it passes its acceptance criteria end-to-end, not just at
the unit level.

**Rationale**: Pixel Wars is an interactive product. Stakeholders MUST be able to see and validate
working increments frequently rather than waiting for all components to integrate.

### IV. Single-Player First, Multiplayer-Ready

Pixel Wars is currently a single-player game. All features MUST be designed and implemented for
single-player first.
However, the codebase architecture MUST explicitly support a future transition to multiplayer.
Game state, input handling, and rendering logic MUST be structured such that adding networked
players later does not require a full rewrite — clean separation of concerns between game logic and
presentation is required.
Any design decision that would permanently foreclose multiplayer (e.g., hard-coding player count,
non-serializable state) MUST be flagged and justified before implementation begins.

**Rationale**: Building multiplayer into the initial scope would add premature complexity. Designing
with multiplayer in mind from the start prevents costly architectural refactors later without
incurring the full cost of building multiplayer now.

### V. Browser-Only Execution

The game MUST load and run entirely in the browser with no hosted server backend.
All game logic, state, and assets MUST be self-contained and servable as static files.
The game MUST be hostable on GitHub Pages without any server-side runtime.
Features that require a backend server (persistent cross-session leaderboards, server-authoritative
multiplayer, etc.) are out of scope until the architecture evolves beyond static hosting.
Any use of network requests (e.g., fetching assets) MUST work within the constraints of GitHub
Pages static file hosting.

**Rationale**: GitHub Pages static hosting eliminates operational overhead and keeps the project
simple to deploy and maintain. Constraining the design to browser-only execution enforces
self-containment and aligns with the single-player scope.

## Technology Standards

The technology stack for Pixel Wars has not yet been committed.
The following constraints apply regardless of stack:

- The frontend MUST use a 2D canvas or equivalent primitive for pixel rendering (no DOM-per-pixel).
- There is NO backend server. All state and logic lives in the browser.
- The game MUST be deployable as a set of static files (HTML, CSS, JS, assets) to GitHub Pages.
- All inter-component contracts MUST be documented (type definitions or interface specs) before
  implementation begins.
- External dependencies (npm packages, CDN-loaded libraries) MUST be evaluated for browser
  compatibility and bundle-size impact before adoption.

TODO(TECH_STACK): Finalize language, framework, and bundler choices once the initial spike is
complete. Update this section and bump the constitution version accordingly.

## Development Workflow

- Constitution Check gates in `plan.md` MUST be completed before Phase 0 research begins.
- Complexity violations MUST be documented in the Complexity Tracking table of `plan.md` before
  implementation begins, not after.
- Semantic versioning applies to all released artifacts; breaking API or schema changes MUST
  increment the MAJOR version.
- Commits MUST be scoped and atomic — one logical change per commit, conventional commit format
  preferred (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).

## Governance

This constitution supersedes all other project practices. In the event of conflict between this
document and any other guideline, the constitution takes precedence.

**Amendment procedure**:
1. Make the change directly with a clear description of the motivation and affected artifacts.
2. `CONSTITUTION_VERSION` MUST be incremented per semantic versioning rules (see below), and
   `LAST_AMENDED_DATE` MUST be updated to the amendment date.

**Versioning policy**:
- MAJOR: Backward-incompatible governance changes — removal or redefinition of a principle.
- MINOR: New principle, new mandatory section, or materially expanded guidance.
- PATCH: Clarifications, wording improvements, typo fixes.

**Compliance review**: Every plan's Constitution Check section MUST verify adherence to all five
Core Principles before implementation begins.

**Version**: 2.1.0 | **Ratified**: 2026-03-13 | **Last Amended**: 2026-03-14
