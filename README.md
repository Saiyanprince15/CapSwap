# CapSwap

CapSwap is a Reddit Devvit web game built around a simple but precise puzzle: sort the bottle caps into the correct order before you run out of guesses. The game combines a React shell, a Phaser scene graph, and a small Hono-based server so the entire experience can run inside a Reddit post while still feeling responsive and polished.

## What It Does

CapSwap presents a bottle-sorting puzzle with four difficulty modes:

- Easy: 4 bottles, 14 tries
- Medium: 6 bottles, 10 tries
- Hard: 8 bottles, 8 tries
- Daily Puzzle: 5 bottles, 12 tries, seeded from the UTC calendar day so every player gets the same challenge

Players can swap bottles by tapping or dragging, then confirm their arrangement to check progress. The interface tracks remaining tries, current and best streaks, and supports a global mute toggle. The game also uses layered visual feedback, menu animations, and a short reveal sequence for wins and losses.

## Project Structure

The codebase follows the Devvit web app layout described in `AGENTS.md`:

- `src/client`: React entry points, Phaser integration, UI overlays, and game logic
- `src/server`: Hono routes for menu actions, forms, API endpoints, and triggers
- `src/shared`: Types shared between the client and server
- `public`: Static art and font assets used by the game

Key client pieces:

- `src/client/App.tsx`: React HUD, menu screens, and the bridge into Phaser
- `src/client/phaser/scenes/GameScene.ts`: Core gameplay scene, transitions, animations, and round flow
- `src/client/utils/gameLogic.ts`: Pure puzzle generation and validation logic
- `src/client/utils/gameState.ts`: Game state machine
- `src/client/utils/streakManager.ts`: Local streak persistence

Key server pieces:

- `src/server/index.ts`: Hono app composition and route mounting
- `src/server/core/post.ts`: Reddit custom post creation
- `src/server/routes/menu.ts`: Moderator menu action for creating a CapSwap post
- `src/server/routes/forms.ts`: Example form handler
- `src/server/routes/triggers.ts`: App install trigger handler

## How It Works

The gameplay loop is intentionally small and deterministic:

1. The scene generates a solution sequence for the selected difficulty.
2. An initial arrangement is created as a derangement, so the opening board starts unsolved.
3. The player swaps bottles until the arrangement matches the solution.
4. Pressing Confirm deducts a try and checks the current arrangement.
5. A win reveals the hidden sequence and updates the streak; a loss ends the round and resets the current streak.

Daily mode uses a UTC date-based seed so the puzzle stays identical for every player on the same day regardless of timezone.

## Tech Stack

- React 18 for the overlay UI and menu flow
- Phaser 3 for the game scene, animation, and interaction layer
- Hono for the server-side routes
- Devvit web APIs for Reddit integration
- TypeScript across the entire project
- Vite for client builds

## Requirements

- Node.js 22.2 or newer
- Devvit CLI access for local playtesting, uploads, and publishing
- A Reddit developer app configured for the workspace

## Development

Install dependencies with your package manager of choice, then use the scripts below from the project root.

```bash
npm run dev
```

Starts a Devvit playtest session for local iteration.

```bash
npm run build
```

Builds the client bundle for the Devvit runtime.

```bash
npm run type-check
```

Runs the TypeScript project build for type validation.

```bash
npm run lint
```

Runs ESLint across the client source.

```bash
npm run deploy
```

Validates the project, uploads the app, and prepares a new version for Reddit.

```bash
npm run launch
```

Runs the deploy checks and publishes the app.

```bash
npm run login
```

Authenticates the Devvit CLI with Reddit.

## Runtime Notes

- The main post entrypoint is configured in `devvit.json` and loads `game.html` inline.
- Moderator actions can create a new CapSwap post through the subreddit menu.
- The app install trigger also creates a post when the app is installed.
- Streak data is stored locally in the browser via `localStorage`.

## Design Notes

The game leans into a restrained arcade aesthetic: pixel-art assets, a frosted glass reveal layer, custom chiptune audio, and carefully staged animations rather than noisy effects. The implementation keeps the puzzle logic independent from Phaser so the core rules remain easy to test and reason about.

## Credits

Built on top of the Devvit web platform, Phaser, React, Hono, and Vite. The project structure follows the Devvit Phaser starter pattern, but the gameplay, presentation, and server behavior are specific to CapSwap.
