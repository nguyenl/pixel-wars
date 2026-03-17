# Quickstart: README with GitHub Actions & GitHub Pages Deployment

**Date**: 2026-03-16
**Feature**: 009-readme-gh-pages

## What This Feature Delivers

Three files added to the repository root:

1. **README.md** — Project overview, local setup, available scripts, CI setup guide, and GitHub Pages deployment guide.
2. **.github/workflows/ci.yml** — GitHub Actions workflow that runs `npm run lint` and `npm test` on every push and pull request to `main`.
3. **.github/workflows/deploy.yml** — GitHub Actions workflow that builds the Vite project and deploys the output to GitHub Pages on every push to `main`.

## Implementation Order

1. Create `.github/workflows/ci.yml` (CI must exist before deployment references it)
2. Create `.github/workflows/deploy.yml` (deployment workflow)
3. Create `README.md` (references the workflow files)

## Key Technical Decisions

- **Node.js 20 LTS** in workflows with npm caching
- **Official GitHub Pages actions** (`actions/upload-pages-artifact` + `actions/deploy-pages`) — not the legacy `gh-pages` branch method
- **Vite base path** already configured as `/pixel-wars/` in `vite.config.ts`
- **Single CI workflow** with lint + test steps (not separate workflows)
- **Manual GitHub Pages enablement** documented in README (Settings > Pages > Source: GitHub Actions)

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `README.md` | Create | Project documentation with setup, CI, and deployment guides |
| `.github/workflows/ci.yml` | Create | CI workflow: lint + test on push/PR |
| `.github/workflows/deploy.yml` | Create | Deployment workflow: build + deploy to GitHub Pages |

## No Data Model or Contracts

This feature is documentation and CI/CD configuration only. No game logic, data entities, or external interfaces are introduced.
