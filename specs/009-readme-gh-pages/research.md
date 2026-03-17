# Research: README with GitHub Actions & GitHub Pages Deployment

**Date**: 2026-03-16
**Feature**: 009-readme-gh-pages

## R1: GitHub Actions CI for Vite/TypeScript Projects

**Decision**: Use a single CI workflow (`ci.yml`) triggered on `push` and `pull_request` to the `main` branch. The workflow runs `npm ci`, `npm run lint` (TypeScript type-checking), and `npm test` (Vitest).

**Rationale**: This is the standard GitHub Actions pattern for Node.js projects. `npm ci` ensures reproducible installs from the lockfile. Running lint and test as separate steps provides clear failure attribution in the Actions UI.

**Alternatives considered**:
- Matrix builds across multiple Node versions: Rejected — single-developer project targeting a specific Node version. Unnecessary complexity.
- Separate lint and test workflows: Rejected — a single workflow with sequential steps is simpler and sufficient for this project size.

## R2: GitHub Pages Deployment with GitHub Actions

**Decision**: Use a dedicated deployment workflow (`deploy.yml`) triggered on `push` to `main` only. It uses the official `actions/upload-pages-artifact` and `actions/deploy-pages` actions with the `github-pages` environment and `id-token: write` permission.

**Rationale**: This is the modern GitHub Pages deployment method (GitHub Actions source), replacing the legacy `gh-pages` branch approach. It provides:
- Atomic deployments with rollback
- Built-in environment protection
- No need for a dedicated deployment branch or personal access tokens
- Direct integration with the GitHub Pages settings UI

**Alternatives considered**:
- `gh-pages` branch deployment (via `peaceiris/actions-gh-pages`): Rejected — legacy pattern. GitHub's official Actions-based deployment is simpler and doesn't require branch management.
- Manual deployment: Rejected — doesn't meet the automation requirement from FR-006.

## R3: Vite Base Path Configuration for GitHub Pages

**Decision**: The Vite config already sets `base: '/pixel-wars/'`. This is correct for GitHub Pages deployment at `https://<username>.github.io/pixel-wars/`.

**Rationale**: GitHub Pages serves project sites at a sub-path matching the repository name. Vite's `base` option prepends this path to all asset URLs in the build output.

**Alternatives considered**:
- Dynamic base path via environment variable: Rejected — adds complexity for a single deployment target. Hard-coded value is simpler and aligns with Constitution Principle I.

## R4: GitHub Pages Repository Settings

**Decision**: Document that the user must enable GitHub Pages in repository Settings > Pages, selecting "GitHub Actions" as the source (not "Deploy from a branch").

**Rationale**: This is a one-time manual configuration step in the GitHub UI. It cannot be automated via workflow files — it must be done before the deployment workflow will work.

**Alternatives considered**:
- Using `gh` CLI to configure Pages programmatically: While possible, it adds a dependency on the GitHub CLI and requires authentication setup. A manual UI step is simpler for a one-time action.

## R5: Node.js Version Selection

**Decision**: Use Node.js 20 (LTS) in GitHub Actions workflows via `actions/setup-node@v4`.

**Rationale**: Node 20 is the current LTS release and will be supported until April 2026. The project requires Node 18+; using 20 provides the latest LTS stability. Using `actions/setup-node` with npm caching (`cache: 'npm'`) speeds up CI runs.

**Alternatives considered**:
- Node 22: Rejected — not yet LTS (enters LTS October 2026). Node 20 is safer for CI stability.
- Node 18: Acceptable but nearing end-of-life (April 2025 already passed). Node 20 is the better default.
