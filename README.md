# Rulet — Premium 3D European Roulette

A playable vertical slice of a single-table European roulette game built with
React, TypeScript, Three.js and Vite. All assets — table, wheel, chips, room,
textures, sound and music — are generated procedurally, so the project runs
with no external files.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production bundle in dist/
npm test           # unit tests (payouts, layout hit-testing, deterministic spins)
```

Click **Masaya Otur / Take a Seat** — this also unlocks browser audio.

## Playing

1. Pick a chip (or press `1`–`6`).
2. Click a spot on the felt. Edges and corners select splits, streets, corners,
   six lines, trios and the first four; the tooltip shows the bet and its payout.
3. Press **Bahis Yap / Place Bet** (or `Space`). Double-click a spot to select and bet at once.

Other controls: **Geri Al / Undo** (`Ctrl+Z`), **Temizle / Clear**,
**Tekrarla / Repeat** (`R`), **İkiye Katla / Double** (`D`).
**Komşular / Neighbours** bets the centre number plus ±1/±2/±3 physical wheel
neighbours. Camera buttons switch Table / Wheel / Dealer views; **Otomatik /
Auto** lets the camera follow the round.

**Pause:** `Esc` (or the ⏸ button) freezes the whole table — betting timer,
wheel, ball, bots and chip animations — and opens a screen with all settings
(sound mixer, camera, language) and the keyboard shortcuts. `Esc` again resumes
exactly where it stopped; a spin in progress still lands on its predetermined
number. Switching to another browser tab pauses automatically.

## Configuration

`src/config/gameConfig.ts` — starting balance, chip denominations, table limit,
phase timings, bot count. Chip colours live in `src/config/chipPalettes.ts`.

Developer switches:

- `?result=17` forces every result (the animation still plays out naturally).
- `?betting=8` shortens the betting window to 8 seconds.
- `roulette.forceNextResult(0)` in the browser console forces only the next spin.

## Architecture

```
src/
  game/        Pure game logic — no React, no Three.js
    roulette/  wheel order, analytic rotor motion, deterministic spin planner
    betting/   bet spots, layout geometry + hit-testing, bet operations
    payouts/   settlement
    bots/      behaviour profiles and per-round planning
    engine/    RoundEngine: IDLE → BETTING → NO_MORE_BETS → SPINNING → RESULT → PAYOUT
    clock.ts   pausable game clock — every timing in the game reads it
  state/       zustand store (single source of truth) + persisted preferences
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
