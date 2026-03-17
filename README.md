# Pixel Wars

A browser-based pixel strategy game built with TypeScript and PixiJS. Command armies on procedurally generated tile maps, capture territory, and outmaneuver AI opponents in turn-based tactical combat.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [GitHub Actions CI](#github-actions-ci)
- [Deploying to GitHub Pages](#deploying-to-github-pages)

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (included with Node.js)

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/<your-username>/pixel-wars.git
   cd pixel-wars
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open the URL shown in your terminal (usually `http://localhost:5173/pixel-wars/`) — the game will load in your browser.

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Dev server | `npm run dev` | Starts the Vite development server with hot reload |
| Build | `npm run build` | Type-checks with TypeScript and builds for production into `dist/` |
| Preview | `npm run preview` | Serves the production build locally for testing |
| Test | `npm test` | Runs the Vitest test suite |
| Lint | `npm run lint` | Runs TypeScript type-checking (`tsc --noEmit`) |

## GitHub Actions CI

This project includes a continuous integration workflow that runs automatically on every push and pull request to the `main` branch.

**What it does:**

1. Checks out the code
2. Sets up Node.js 20 with npm caching
3. Installs dependencies (`npm ci`)
4. Runs linting (`npm run lint`)
5. Runs tests (`npm test`)

The workflow file lives at `.github/workflows/ci.yml`. You can view workflow results in the **Actions** tab of the GitHub repository. Failed checks will block pull request merging.

## Deploying to GitHub Pages

The project automatically builds and deploys to GitHub Pages on every push to `main`.

### One-Time Setup

1. Go to your repository on GitHub
2. Navigate to **Settings > Pages**
3. Under **Source**, select **GitHub Actions**

> **Note:** GitHub Pages is free for public repositories. Private repositories require a GitHub Pro, Team, or Enterprise plan.

### How It Works

On every push to `main`, the deployment workflow (`.github/workflows/deploy.yml`):

1. Checks out the code and installs dependencies
2. Runs `npm run build` to produce the production bundle in `dist/`
3. Uploads `dist/` as a GitHub Pages artifact
4. Deploys the artifact to GitHub Pages

The Vite base path is configured as `/pixel-wars/` in `vite.config.ts`, which ensures all asset URLs resolve correctly on GitHub Pages.

### Live URL

Once deployed, the game is available at:

```
https://<your-username>.github.io/pixel-wars/
```
