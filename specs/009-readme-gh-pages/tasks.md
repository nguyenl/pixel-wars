# Tasks: README with GitHub Actions & GitHub Pages Deployment

**Input**: Design documents from `/specs/009-readme-gh-pages/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, quickstart.md

**Tests**: Not requested — no test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create directory structure for GitHub Actions workflows

- [x] T001 Create `.github/workflows/` directory at repository root

---

## Phase 2: User Story 1 - Developer Reads README for Project Overview (Priority: P1) 🎯 MVP

**Goal**: A developer can read README.md and understand what Pixel Wars is, install dependencies, and run the project locally.

**Independent Test**: Clone the repo on a fresh machine, follow the README instructions, and verify the project runs in the browser at `localhost`.

### Implementation for User Story 1

- [x] T002 [US1] Create `README.md` at repository root with project title, description explaining Pixel Wars is a browser-based pixel strategy game built with TypeScript and PixiJS, and a table of contents
- [x] T003 [US1] Add Prerequisites section to `README.md` listing Node.js v18+ and npm requirements
- [x] T004 [US1] Add Getting Started section to `README.md` with step-by-step instructions: clone, `npm install`, `npm run dev`, and expected result (game opens in browser)
- [x] T005 [US1] Add Available Scripts section to `README.md` documenting `npm run dev`, `npm run build`, `npm run preview`, `npm test`, and `npm run lint` with descriptions of each

**Checkpoint**: README.md exists with project overview, prerequisites, setup guide, and scripts reference. A developer can follow it to run the project locally.

---

## Phase 3: User Story 2 - Developer Sets Up GitHub Actions CI (Priority: P2)

**Goal**: A working CI workflow file exists, and the README documents how it works and how to set it up.

**Independent Test**: Push a commit to `main` and verify the GitHub Actions CI workflow triggers, runs lint and tests, and reports pass/fail.

### Implementation for User Story 2

- [x] T006 [P] [US2] Create `.github/workflows/ci.yml` with: trigger on push/PR to `main`, `actions/checkout@v4`, `actions/setup-node@v4` with Node 20 and npm cache, `npm ci`, `npm run lint` step, `npm test` step
- [x] T007 [US2] Add GitHub Actions CI section to `README.md` explaining: what the CI workflow does (runs lint + tests on every push and PR to main), where the workflow file lives (`.github/workflows/ci.yml`), how to view workflow results in the Actions tab, and that failed checks block merging

**Checkpoint**: CI workflow file is ready. README documents it. Pushing to `main` triggers automated lint + test.

---

## Phase 4: User Story 3 - Developer Publishes App to GitHub Pages (Priority: P3)

**Goal**: A working deployment workflow file exists, and the README documents how to enable GitHub Pages and how the automated deployment works.

**Independent Test**: Enable GitHub Pages in repo settings, push to `main`, verify the game loads at `https://<username>.github.io/pixel-wars/`.

### Implementation for User Story 3

- [x] T008 [P] [US3] Create `.github/workflows/deploy.yml` with: trigger on push to `main`, permissions (`pages: write`, `id-token: write`), concurrency group (`pages`, cancel-in-progress: false), build job (`actions/checkout@v4`, `actions/setup-node@v4` with Node 20 and npm cache, `npm ci`, `npm run build`, `actions/upload-pages-artifact@v3` pointing to `dist/`), deploy job (`actions/deploy-pages@v4` with `github-pages` environment and url output)
- [x] T009 [US3] Add Deploying to GitHub Pages section to `README.md` covering: one-time setup (go to Settings > Pages > Source: select "GitHub Actions"), how the deployment workflow works (auto-builds and deploys on push to `main`), the Vite base path configuration in `vite.config.ts` (`base: '/pixel-wars/'`), where to find the live URL (`https://<username>.github.io/pixel-wars/`), and note about private repos requiring GitHub Pro/Team/Enterprise for Pages

**Checkpoint**: Deployment workflow file is ready. README documents full setup. Merging to `main` triggers automatic build and deploy to GitHub Pages.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final review and cleanup

- [x] T010 Review all three files (`README.md`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`) for consistency, correct YAML syntax, and accurate file path references
- [x] T011 Verify `README.md` renders correctly in GitHub markdown preview (headings, code blocks, links)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **User Story 1 (Phase 2)**: Depends on Setup — creates the README file
- **User Story 2 (Phase 3)**: Depends on Setup — the workflow file needs the directory from T001. README section (T007) depends on README existing from US1
- **User Story 3 (Phase 4)**: Depends on Setup — the workflow file needs the directory from T001. README section (T009) depends on README existing from US1
- **Polish (Phase 5)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on T001 (directory setup). Creates README.md — other stories add sections to it.
- **User Story 2 (P2)**: T006 (ci.yml) can run in parallel with US1. T007 (README CI section) depends on T002 (README exists).
- **User Story 3 (P3)**: T008 (deploy.yml) can run in parallel with US1 and US2. T009 (README deploy section) depends on T002 (README exists).

### Parallel Opportunities

- T006 (ci.yml) and T008 (deploy.yml) can be created in parallel — they are independent files
- T006 and T008 can also run in parallel with T002-T005 (README creation) since they target different files
- T007 and T009 (README additions) must run after T002 (initial README creation) and should run sequentially since they modify the same file

---

## Parallel Example: User Story 2 & 3 Workflow Files

```bash
# These can run in parallel (different files, no dependencies):
Task: "Create CI workflow in .github/workflows/ci.yml"          # T006
Task: "Create deploy workflow in .github/workflows/deploy.yml"  # T008
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: User Story 1 (T002-T005)
3. **STOP and VALIDATE**: README exists with project overview and local setup guide
4. A developer can already use the README to set up and run the project

### Incremental Delivery

1. Setup (T001) → Directory ready
2. User Story 1 (T002-T005) → README with project overview (MVP!)
3. User Story 2 (T006-T007) → CI workflow + README CI docs
4. User Story 3 (T008-T009) → Deployment workflow + README deployment docs
5. Polish (T010-T011) → Final review and validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story adds to the README incrementally — US1 creates it, US2 and US3 append sections
- Workflow files (ci.yml, deploy.yml) are independent and can be created in parallel
- Commit after each phase for clean history
