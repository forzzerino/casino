# Oyun Salonu — Game Lounge

Virtual-credit casino games behind one lobby, built with React, TypeScript and
Vite. Each game is a self-contained module with its own state and its own
wallet; the games share only the app shell, the lobby screen, the interface
language and a few generic utilities. No real money is involved anywhere.

| Game | Route | Folder |
| --- | --- | --- |
| European Roulette (3D, Three.js) | `#/roulette` | `src/games/roulette/` |

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production bundle in dist/
npm test           # unit tests
```

The app opens on the lobby. Pick a game card; the URL hash (`#/roulette`) keeps
you in that game across reloads, and the browser Back button returns to the lobby.

## Project structure

```
src/
  main.tsx          Entry: fonts, document-level CSS, <App/>
  app/              Shell: hash router, lazy game host (loading + error states)
  lobby/            The shared project screen — one card per registered game
  games/
    registry.ts     The list of games: id/route, lobby card, code-split loader
    roulette/       Everything roulette (see below)
  shared/           Game-agnostic code only — never imports a game
    i18n/           Shared language store (TR/EN) + typed translator helpers
    shell/          ShellContext (exitToLobby) and the GameEntry / LobbyCard types
    audio/          Web Audio synthesis primitives
    hooks/ utils/   Seedable RNG, storage, easing, math, typed event emitter
```

Dependencies point one way: `app → lobby → games → shared`. A game reaches the
shell only through `useShell()`, and every game is loaded on demand, so the
lobby never downloads Three.js. Wallets are never shared: each game keeps its
balance in its own store.

**Adding a game:** create `src/games/<id>/` with a default-exported root
component and a lightweight `lobbyCard.tsx`, then add one entry to
`src/games/registry.ts`. Scope the game's CSS under its own root class.

## Roulette

Click **Masaya Otur / Take a Seat** — this also unlocks browser audio. Leaving
for the lobby (grid button in the top bar, or the pause screen) freezes the
table exactly like `Esc`; coming back shows the pause screen.

### Playing

1. Pick a chip (or press `1`–`6`).
2. Click a spot on the felt. Edges and corners select splits, streets, corners,
   six lines, trios and the first four; the tooltip shows the bet and its payout.
3. Press **Bahis Yap / Place Bet** (or `Space`). Double-click a spot to select and bet at once.

Other controls: **Geri Al / Undo** (`Ctrl+Z`), **Temizle / Clear**,
**Tekrarla / Repeat** (`R`), **İkiye Katla / Double** (`D`).
**Komşular / Neighbours** bets the centre number plus ±1/±2/±3 physical wheel
neighbours. Camera buttons switch Table / Wheel / **Top (Ball)** / Dealer
views; **Otomatik / Auto** lets the camera follow the round, and uses whichever
of Wheel or Ball you picked last while the wheel spins.

The ball camera is plan-aware rather than a literal chase (the ball starts at
~2.7 revolutions per second): it waits low where the ball will leave the
track, glides to where it will land, then rides along with the pocket — with
its orbit speed capped so it never becomes a spinning, nauseating shot.

**Pause:** `Esc` (or the ⏸ button) freezes the whole table — betting timer,
wheel, ball, bots and chip animations — and opens a screen with all settings
(sound mixer, camera, language) and the keyboard shortcuts. `Esc` again resumes
exactly where it stopped; a spin in progress still lands on its predetermined
number. Switching to another browser tab pauses automatically.

### Configuration

`src/games/roulette/config/gameConfig.ts` — starting balance, chip denominations,
table limit, phase timings, bot count. Chip colours live in
`src/games/roulette/config/chipPalettes.ts`.

Developer switches:

- `?result=17` forces every result (the animation still plays out naturally).
- `?betting=8` shortens the betting window to 8 seconds.
- `roulette.forceNextResult(0)` in the browser console forces only the next spin.

### Architecture

```
src/games/roulette/
  RouletteGame.tsx  root component (lazy-loaded by the shell)
  lobbyCard.tsx     lobby artwork (SVG wheel), loaded with the lobby, not the game
  game/        Pure game logic — no React, no Three.js
    roulette/  wheel order, analytic rotor motion, deterministic spin planner
    betting/   bet spots, layout geometry + hit-testing, bet operations
    payouts/   settlement
    bots/      behaviour profiles and per-round planning
    engine/    RoundEngine: IDLE → BETTING → NO_MORE_BETS → SPINNING → RESULT → PAYOUT
    clock.ts   pausable game clock — every timing in the game reads it
  state/       zustand store (single source of truth, incl. the roulette wallet) + preferences
  three/       3D presentation: SceneManager, wheel, ball, table, chips, camera, lighting
  audio/       Web Audio engine with music / effects / ambient buses, synthesized voices
  components/  HTML/CSS HUD (React)
  i18n/        Turkish (default) and English dictionaries with typed keys
```

**Deterministic spins.** The result is drawn (crypto RNG) when betting closes.
`planSpin` then designs the trajectory backwards from the target pocket: the
rotor follows an analytic speed curve, the bounce sequence is laid out in the
rotor's frame ending on the target, and the ball's launch speed is solved so the
track orbit and the spiral down the bowl arrive exactly where the bounces begin.
The plan is plain data; the renderer and the audio both sample it by time, so
every bounce you see is also the one you hear. Tests check all 37 outcomes.

**Swapping in models.** `RouletteWheel`, `Table`, `Chairs`, `DealerRack` and
`ChipFactory` each expose a small surface (a `group`, plus e.g. `setRotorAngle`,
`setBall`, `materials()`), so any of them can be replaced by a loaded GLB without
touching the game or camera code.
