# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**ExpertSudoku** is a daily Sudoku game in three difficulties (Medium, Expert, Hell), available two ways from one codebase:

1. As a **Discord Activity** embedded in an iframe in the Discord client, launched from a voice channel or chat, communicating with Discord through the Embedded App SDK, with live per-difficulty progress messages and streak announcements posted back to the launching channel.
2. As a **standalone website** at `expertsudoku.app` — no login, no server-side progress tracking, just the puzzle and localStorage.

It wraps a fork of [grantm/sudoku-web-app](https://github.com/grantm/sudoku-web-app) (the SudokuExchange.com app) and is deployed to Cloudflare Workers as `expertsudoku` (renamed from the original `daily-sudoku` worker — see the D1 note below). The React sudoku app is the bulk of the code; the Discord/Cloudflare/D1 integration is a layer around it.

Unlike the original fork, the app **does** run outside Discord now: `src/components/site/site-root.tsx` checks for a `frame_id` query param (only present inside the Discord iframe) and renders either the Discord path (`discord-root.tsx`) or the plain website (landing page, difficulty picker, legal pages). The Discord SDK is constructed lazily (`src/discordSdk.ts`) specifically so importing that code path doesn't blow up on the website, where there's no `frame_id`.

## Commands

```sh
npm run dev              # Vite dev server on port 3000 (serves client AND worker via @cloudflare/vite-plugin)
npm run build            # vite build → dist/client (assets) + dist/expertsudoku (worker)
npm run check            # build + wrangler deploy --dry-run
npm run deploy           # wrangler deploy
npm run lint             # eslint . (currently non-functional in this environment - see Known issues)
npm run cf-typegen       # regenerate worker-configuration.d.ts (Env types) after changing wrangler.json bindings

npm run db:generate      # drizzle-kit generate → drizzle/*.sql from db/schema.ts
npm run db:migrate:local # apply drizzle/*.sql to the local D1 (.wrangler/state/v3/d1)
npm run db:migrate:remote# apply to the real remote D1 (needs `wrangler login`)

npm run seed:generate    # node scripts/generate-puzzles.mjs --start YYYY-MM-DD --days N --out seed.sql
npm run seed:local       # wrangler d1 execute daily-sudoku --local --file=seed.sql
npm run seed:remote      # wrangler d1 execute daily-sudoku --remote --file=seed.sql
```

There are no automated tests.

Local dev requires a public URL for Discord to load the Activity: a named cloudflared tunnel (see `config.yml`, gitignored) forwards to localhost:3000, and `vite.config.ts` allowlists the tunnel hostname in `server.allowedHosts`. This is only needed for the Discord path — the website works against plain `localhost:3000`.

Secrets: `.env` (gitignored) holds `VITE_CLIENT_ID` (Discord app ID) and `CLIENT_SECRET`. `.dev.vars` (gitignored, read by `wrangler dev`/`wrangler d1`/`scripts/mint-dev-token.mjs`) holds `SESSION_SECRET` (HMAC key for session JWTs), `DISCORD_BOT_TOKEN` (for posting live-progress/streak messages), `DISCORD_PUBLIC_KEY` (the app's Ed25519 public key, for verifying button interactions — not actually secret), and optionally `DEV_PREVIEW=1` (enables `GET /api/dev/board-preview`, a dev-only visual check of the live board PNG), **and must also duplicate `VITE_CLIENT_ID`/`CLIENT_SECRET`** — see the gotcha below. In production the true secrets are set via `wrangler secret put <NAME>`; only `VITE_CLIENT_ID` and `DISCORD_PUBLIC_KEY` live in `wrangler.json`'s plaintext `vars`.

> **Gotcha:** `@cloudflare/vite-plugin` uses `.dev.vars` **instead of** `.env` for the worker's `context.env` the moment `.dev.vars` exists — it does not merge the two (confirmed by the `npm run build`/`npm run dev` log line switching from `Using vars defined in .env` to `Using vars defined in .dev.vars`). `import.meta.env.VITE_CLIENT_ID` on the **client** still comes from `.env` regardless (that's a separate, Vite-native mechanism), so a stale/placeholder `VITE_CLIENT_ID`/`CLIENT_SECRET` in `.dev.vars` produces a confusing split: `discordSdk.commands.authorize()` succeeds (client has the real client ID) but the server-side `/api/token` exchange with Discord fails with `discord-auth-failed` (worker has the wrong client ID and/or secret). Keep `.dev.vars`'s `VITE_CLIENT_ID`/`CLIENT_SECRET` in sync with `.env` whenever either changes.

## Architecture

Two runtime halves, both served by one Vite/Wrangler setup:

### Client (`src/`, React 18)

Entry `src/index.tsx` renders `SiteRoot` (`src/components/site/site-root.tsx`) — a hand-rolled router (pushState + popstate, no react-router: there are only 4 static routes + `/play`). `SiteRoot` branches on `frame_id`:

- **Discord path**: `discord-root.tsx` performs the SDK handshake — `discordSdk.ready()` → `commands.authorize()` → POST the code (plus `channelId`/`guildId` from the SDK) to `/api/token` → `commands.authenticate()` — then shows the `DifficultyPicker` and mounts `discord-play.jsx`, which fetches today's puzzle and the player's saved server-side progress in parallel and renders the sudoku `App` with a `stateAdapter` (`src/lib/save-adapter.js`) that POSTs progress to `/api/progress` (debounced, flushed on completion/pause/tab-hidden). Once that difficulty is completed — detected live via the adapter, or from `completedAt` on rejoin, showing the **same screen both ways** — `discord-play.jsx` replaces the board with a completion screen (time + `DifficultyPicker`) so the player can jump into another difficulty (`onSwitchDifficulty`).
- **Website path**: `landing.jsx` (difficulty picker + legal footer links) → `web-play.jsx` (fetches today's puzzle, `stateAdapter: null` — no server calls at all, `App` state only ever goes to localStorage) → `legal.jsx` (Imprint/Privacy/Terms, currently placeholder content marked `TODO`).

The player itself is branded too: **both** game themes in `src/index.css` map the inherited variable set onto the brand palette — dark (`:root .dark`) is `#242424` cells on `#1b1b1e`, light (`:root` default) is white cells on `#f4f4f5` — with dim grey givens, blurple player digits/selection, difficulty-coloured accents, and the brand mono face for grid/keyboard/timer digits in both. The grid renders as **rounded cell tiles with real gaps** (no grid lines): `grid-dimensions.jsx` adds a `blockGap` between 3×3 blocks to every cell coordinate (digits/covers/paused layers all read from it), `sudoku-cell-background.jsx` draws inset rounded rects (state-highlight overlay shares the geometry), given cells sit on a slightly raised tile (`--given-cell-fill-color`), and `GridLines` is only used by the saved-puzzle mini grid any more. Modals and the solved-puzzle panel use the landing's card language (14px radius, 1px border, mono headings, 8px buttons). The **in-game header** is fully built in the landing masthead language (rem-based, `--su-*` tokens only — no legacy `--status-bar-*` styling): pips + per-difficulty wordmark left ("MediumSudoku"/"ExpertSudoku"/"HellSudoku", accent-coloured, from `grid.get('difficultyLevel')`; text collapses to pips-only under 30rem), and a right-hand row of bordered panel chips — a **timer chip** (mono tabular digits + the pause/resume control inside it) and three square chip buttons: back-to-picker (when `onExit` is set), a mono "?" opening the game instructions (`menuHandler('show-help-page')`), and the **same `ThemeSelect` segmented component the landing masthead uses** (`src/components/site/theme-select.jsx`, scaled up via `.status-bar .theme-select` rules only). Header height is the shared `--header-height` token (site-theme.css) — `#root` padding and `.site-page`'s negative margin both use it. Grid cells and every virtual-keyboard key show a pointer cursor. The about modal was replaced by the **`/about` site page** (`src/components/site/about.jsx`, reusing the legal-page layout, linked from the landing footer); `modal-about.jsx` and its `showAboutModal`/`MODAL_TYPE_ABOUT` wiring are deleted.

**Theming** is owned by `src/lib/theme.js` (light/dark/auto, localStorage key `expertsudoku-theme`, default auto = `prefers-color-scheme`, live media-query updates): it sets `documentElement` light/dark classes (shell `--su-*` tokens have a `:root.light` override set in `site-theme.css`) and the body `dark` class (game vars). The landing masthead has a Light/Auto/Dark segmented selector (`theme-select.jsx`); the in-game button cycles the same pref. An inline `index.html` head script mirrors the logic pre-paint (no flash), and a `?theme=` URL param overrides without persisting (used for screenshot verification). The old `SETTINGS.darkMode` game setting is ignored — `syncSettingsToDom` no longer touches the `dark` class.

The shell screens (landing, picker, completion, legal) share a dedicated theme, `src/site-theme.css`: `--su-*` tokens copied from the live board PNG palette (`#242424` panel, `#2f2f2f`/`#666` cells, blurple, three difficulty colours) so the web UI and the Discord images read as one product. Fonts are **self-hosted** (`src/fonts/`, Inter variable for body + Spline Sans Mono variable for wordmarks/numbers) because the Discord iframe CSP blocks font CDNs. Each difficulty is branded as its own daily — **MediumSudoku / ExpertSudoku / HellSudoku** — in the picker rows (`difficulty-picker.jsx`, with truthful clue-density mini grids from `mini-grid.js`), the completion screen, and the rendered Discord images. `.site-page` carries a `margin-top: -7.5vh` to swallow `#root`'s padding reserved for the game's fixed status bar.

The SDK singleton (`src/discordSdk.ts`) is constructed **lazily** via `getDiscordSdk()` — the constructor reads `frame_id` off the URL and throws synchronously if it's missing, and since `discord-root.tsx` is in the site's static import graph even when the website is what actually renders, eagerly constructing it would break the website.

### Worker (`worker/`, Hono)

- `worker/index.ts` wires up the Hono routes and exports both `fetch` (the app) and `scheduled` (the daily streak cron, `worker/streaks.ts`, `5 0 * * *` — i.e. 00:05 UTC, checking the *previous* day).
- `POST /api/token` exchanges the OAuth code with Discord (`CLIENT_SECRET`, via `fetchAndRetry` in `worker/utils.ts`, which handles 429s using Discord's actual `Retry-After` header), fetches the Discord profile, upserts `players`, and mints a session JWT (`worker/session.ts`, HS256/`SESSION_SECRET`, 24h) carrying `{sub, chan, guild}` so later calls don't need to hit Discord again.
- `GET /api/puzzle/today?difficulty=` (`worker/puzzle.ts`) returns `{day, difficulty, givens}` for the server-computed UTC day — `solution` is never selected, let alone returned.
- `GET/POST /api/progress` (`worker/progress.ts`, session-authed via `requireSession`) reads/writes a player's progress on today's puzzle. Completion is **server-decided** (`currentDigits === solution`) and sticky — once `completedAt` is set, further writes for that (player, puzzle) are silently ignored (no unsolving, no regressing). Every write schedules (`waitUntil`) `maybeUpdateLiveMessage` (`worker/live-message.ts`).
- `worker/live-message.ts` renders a live board PNG (`worker/render/board-image.ts`, via `@resvg/resvg-wasm`) and edits (or, if the message was deleted/inaccessible, resends) a tracked Discord message per `(channelId, day, difficulty)`, throttled to one edit per 5s (`worker/discord.ts` for the raw Discord REST calls). The message **text is empty** — everything lives in the image: a heading with a difficulty icon (1/2/3 diamond pips, colour-coded) and "ExpertSudoku #N — Label" where N is the **absolute puzzle number** (`puzzleNumber` in `worker/day.ts`, days since `PUZZLE_EPOCH_DAY` + 1 — unrelated to streak length); up to 4 players' redacted boards in an adaptive 1/2/2×2 tile grid (givens/filled/empty pattern only), each with the player's avatar next to it; and a right-hand leaderboard column of avatars with timings plus a status icon behind the time — green check when completed, grey pause bars when `paused` or no save for 45s (`INACTIVE_AFTER_MS`, i.e. left the activity), whose times are frozen rather than extrapolated. The message carries three buttons: "Play along" (same difficulty, blurple) plus direct-entry buttons for the other two difficulties.
- `POST /api/interactions` (`worker/interactions.ts`) is the Discord Interactions endpoint (portal: "Interactions Endpoint URL"): it verifies the Ed25519 request signature against `DISCORD_PUBLIC_KEY` (401 on failure — Discord probes with bad signatures on save), answers PING, and on a difficulty-button press upserts `pending_launches` for (user, channel) and responds `LAUNCH_ACTIVITY` (type 12). `/api/token` then consumes a fresh (<10 min) pending row via `consumePendingDifficulty` and returns `preselected_difficulty`, which makes `discord-root.tsx` skip the difficulty picker.
- `worker/streaks.ts` (cron) tallies yesterday's completions per difficulty, grouped by `guildId ?? channelId`, increments/resets a per-context streak, and (once per day, idempotent via `announcedDay`) posts an announcement with a font-rendered top-5 leaderboard image (`worker/render/leaderboard-image.ts`, bundles `worker/render/fonts/Inter-Medium.ttf` inlined as a base64 `data:` URI via a `?inline` import — see the wasm/font bundling note below).
- `wrangler.json` binds a D1 database as `DB` (Drizzle schema in `db/schema.ts`, migrations in `drizzle/`) and serves `dist/client` as static assets with SPA fallback (`ASSETS` binding + `app.notFound` deferring to it — needed because with both a Worker `main` and `assets` configured, unmatched paths are routed to the Worker, not resolved by the assets layer, unless the Worker explicitly defers). Env typings come from the generated `worker-configuration.d.ts`.

### Puzzle generation (`scripts/generate-puzzles.mjs`, `shared/`)

`shared/solver.js` (backtracking, used both by the client for "compute the final digits" and by the generator for solving/uniqueness checks) and `shared/rater.js` (a technique-based grader: naked/hidden singles alone ⇒ `medium`; + naked/hidden pairs, pointing pairs, box/line claiming ⇒ `expert`; neither ⇒ `hell`) are plain dependency-free JS so they run under both the browser bundle and plain Node. `scripts/generate-puzzles.mjs` builds a solved grid, carves givens out cell-by-cell (checking uniqueness after each removal), rates the result after every removal, and keeps the best (closest-to-target-clue-count) checkpoint seen for each difficulty — one solved grid is carved independently per difficulty so, e.g., solving the day's Medium never reveals the day's Hell solution. Output is an idempotent (`INSERT OR IGNORE`) `seed.sql`.

### Sudoku engine (inherited fork, JS not TS)

All game state lives in an Immutable-ish model in `src/lib/sudoku-model.js` (backed by the project's own tiny `not-mutable.js`, not the `immutable` package) — a single Map manipulated through the exported `modelHelpers`; UI components in `src/components/` are thin views over it. `src/components/app/app.jsx` owns the grid state, keyboard/touch input dispatch, and persistence — `stateAdapter?.save(...)` (server, Discord only) plus always `persistPuzzleState`/`restoreFromPuzzleState` (localStorage). Pause (`modelHelpers.pauseTimer`/`resumeTimer`) freezes the timer and **hides the entire grid** — while paused, `cellContentLayers` in `sudoku-grid.jsx` renders only uniform empty tiles (no digits, no given/colour differentiation, no highlights) with a centred "Paused" label and a blurple **Continue** button (SVG `g.paused-continue`, wired to `onResume` threaded from app.jsx's `resumeHandler`); the virtual keyboard is hidden (`.paused .vkbd`), and cell covers aren't rendered at all (no pointer cursor, no selection, and nothing sitting on top of the Continue button).

**Progress tracking** (separate, older fork addition — unrelated to the D1/session progress system above): `src/lib/progress-tracker.js` reports puzzle state to *external* apps via URL params (`session`, `notify` callback URL or `method=message` for postMessage, `interval`) — see the README for the parameter contract. Still functional, orthogonal to everything else.

Mixed JS/TS is intentional: the inherited sudoku code is `.js`/`.jsx`, the Discord/worker/website integration layer is `.ts`/`.tsx`. TypeScript is split into three project references (`tsconfig.app.json` covers `src/` + `shared/`, `tsconfig.node.json` covers `vite.config.ts`, `tsconfig.worker.json` covers `worker/` + `shared/` + `db/`).

## Bundling notes (wasm/font)

`@resvg/resvg-wasm`'s `index_bg.wasm` is imported directly (`import wasm from '@resvg/resvg-wasm/index_bg.wasm'`) and Just Works under the `@cloudflare/vite-plugin` build (bundled as a `compiled-wasm` module) — no fallback needed. The **font** for the streak leaderboard image does *not* get the same treatment: a plain `.ttf` import is treated as a generic static asset (a URL string), not raw bytes, so `worker/render/leaderboard-image.ts` imports it with an explicit `?inline` suffix to force Vite to inline it as a base64 `data:` URI at build time, then decodes that back to bytes for `resvg`'s `fontBuffers` option. The board image has no text, so it doesn't need any of this.

## Known issues

- `npm run lint` doesn't work in this checked-out state: `eslint` isn't installed (only declared via a legacy CRA-style `eslintConfig` in `package.json`, with no `eslint`/`eslint-config-react-app` in `devDependencies`), and installing them pulls in `@typescript-eslint/parser` versions incompatible with this repo's toolchain. This predates the ExpertSudoku changes.
- There is no `typescript` package in `devDependencies`, so nothing here ever actually runs `tsc` — Vite/esbuild transpile `.ts`/`.tsx` without type-checking. The three `tsconfig*.json` files are mostly documentation of intent (module boundaries) rather than an enforced gate.

## License

AGPL v3 (inherited from the upstream sudoku-web-app fork).
