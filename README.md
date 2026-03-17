# Pixel Wars

A tile-based strategy game built with TypeScript and PixiJS.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- npm

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173/pixel-wars/ in your browser.

## Scripts

| Command           | Description                    |
| ----------------- | ------------------------------ |
| `npm run dev`     | Start local dev server         |
| `npm run build`   | Type-check and build for prod  |
| `npm run preview` | Preview the production build   |
| `npm test`        | Run tests                      |
| `npm run lint`    | Type-check without emitting    |

## Publishing to GitHub Pages

Deployment is automated via GitHub Actions. Every push to `main` triggers the workflow at [.github/workflows/deploy.yml](.github/workflows/deploy.yml), which:

1. Installs dependencies
2. Runs tests
3. Builds the project
4. Deploys the `dist/` folder to GitHub Pages

### One-time setup

1. Go to your repository on GitHub.
2. Navigate to **Settings > Pages**.
3. Under **Source**, select **GitHub Actions**.

After that, every push to `main` will automatically deploy the game.

### Manual deploy

You can also trigger a deploy manually:

1. Go to **Actions > Deploy to GitHub Pages** in your repository.
2. Click **Run workflow** and select the `main` branch.

### Live URL

Once deployed, the game is available at:

```
https://<your-github-username>.github.io/pixel-wars/
```
