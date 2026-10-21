# Oyun Salonu — Game Lounge

Virtual-credit casino games behind one lobby, built with React, TypeScript and
Vite. Each game is a self-contained module with its own state and its own
wallet; the games share only the app shell, the lobby screen, the interface
language and a few generic utilities. No real money is involved anywhere.

| Game | Route | Folder |
| --- | --- | --- |
| European Roulette (3D, Three.js) | `#/roulette` | `src/games/roulette/` |
| Cosmic Spin (5×3 slot, 20 paylines) | `#/cosmic-spin` | `src/games/cosmic-spin/` |

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production bundle in dist/
npm test           # unit + interaction tests (Vitest, jsdom for UI tests)
npm run test:e2e   # end-to-end tests (Playwright, desktop + mobile)
```

The app opens on the lobby. Pick a game card; the URL hash (`#/roulette`,
`#/cosmic-spin`) keeps you in that game across reloads, and the browser Back
button returns to the lobby.

`npm run test:e2e` starts its own dev server on port 5174 and uses the locally
installed Chrome. Without Chrome, run `npx playwright install chromium` once and
set `PW_CHANNEL=` (empty).

## Project structure

```
src/
  main.tsx          Entry: fonts, document-level CSS, <App/>
  app/              Shell: hash router, lazy game host (loading + error states)
  lobby/            The shared project screen — one card per registered game
  games/
    registry.ts     The list of games: id/route, lobby card, code-split loader
    roulette/       Everything roulette (see below)
    cosmic-spin/    Everything Cosmic Spin (see below)
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

## Cosmic Spin

A space-themed 5×3 slot with 20 fixed paylines, played with its own virtual
wallet (10,000 starting credits, separate from roulette). Flow: intro → main
menu → game, with Free Spins, a bonus-pick game, multipliers, a virtual jackpot,
autoplay, three spin speeds, a session summary, settings and a paytable.

### Rules (all from `game/config/`)

- **Bets:** 20, 40, 100, 200, 500 or 1,000 credits — multiples of the 20
  paylines, so every line bet is a whole number of credits.
- **Lines:** paid left to right from the leftmost reel, best win per line only.
  Pays are in line bets (`payouts.ts`, values from the approved symbol catalog).
- **WILD** substitutes for every regular symbol (never SCATTER, BONUS or
  MULTIPLIER); a run of WILDs alone pays its own row; a line takes the better of
  the two.
- **SCATTER** anywhere: 3/4/5 pay 2×/10×/50× the bet and award 8/12/18 Free
  Spins (retriggerable, at most 250 per session).
- **Free Spins** cost nothing, play at the triggering bet, use reels with more
  WILDs and the **MULTIPLIER** symbol (×2/×3/×5/×10). Multipliers on one spin add
  up and apply to that spin's line wins only.
- **BONUS** ×3+ (base game): pick 1 of 5 capsules. Contents are drawn when the
  bonus starts; only the picked capsule pays (bet multiples, a multiplied Power
  Boost, a 1,000-credit Space Bounty, Free Spins or a 100× Cosmic Treasure).
- **Jackpot:** 1% of every paid bet feeds the pool (seed 25,000). 5+ WILDs
  anywhere win pool × bet ÷ 1,000 (the whole pool at max bet); the pool never
  drops below the seed.
- **Win tiers:** big ≥ 10× bet, mega ≥ 30× bet, jackpot.

### Mathematics

`engine/rtp.ts` computes the return exactly from the configuration (per-reel
window enumeration plus a closed-form payline expectation; multipliers and
retriggers included). With the shipped weights: **95.6 % theoretical RTP,
jackpot excluded** (target 96 %), Free Spins about 1 in 219 spins, bonus about
1 in 237, jackpot about 1 in 11,000 base spins (1 in 930 free spins). A seeded
150,000-spin simulation in the tests must agree with it; a seeded 1,000,000-spin
run returned 96.2 % with a 25.5 % hit rate — with this volatility, about ±1 %
from the exact figure is normal. These are properties of the configuration, not
a promise for any session.

### How a spin works

`state/spinActions.ts` draws the whole outcome (grid, wins, bonus capsules) and
the reel timing **before** anything moves. The reducer (`state/gameReducer.ts`)
settles it in one step — bet deducted and win credited exactly once — and the
balance display holds the win back until the reels reveal it. Every phase
change is checked against `state/transitions.ts`, so double clicks, late timers
or skips can never pay twice. `state/controller.ts` only schedules timed
transitions and sound cues; a watchdog moves the game on if a presentation ever
stalls. Speed modes (normal / quick / turbo) and reduced motion change timings
only.

```
src/games/cosmic-spin/
  CosmicSpinGame.tsx  root (lazy-loaded), keyboard controls, modal host
  runtime.ts          store + controller + audio + persistence for one mount
  lobbyCard.tsx       lobby artwork, loaded with the lobby
  game/config/        symbols, paylines, payouts, reel weights, rules, presentation timings
  game/engine/        rng, grid generator, evaluator, spin, bonus, jackpot, rtp, simulate
  state/              types, reducer, transitions, selectors, controller, persistence, store
  features/           intro, menu, slot board + controls, bonus, win scenes, paytable, settings, …
  audio/              Web Audio manager, synthesized sound effects and generative music
  assets/manifest.ts  every artwork path, by semantic name
  i18n/               Turkish (default) and English
  styles/             design tokens and component styles, scoped under .cs-root
```

The session (wallet, bet, jackpot, statistics, settings, and any Free Spins or
unopened bonus in progress) is saved to `localStorage` under a versioned,
validated schema; a reload resumes through the feature's intro. It is a
client-side demo, not a tamper-proof ledger.

**Developer hooks (dev server only):** `?seed=123` makes outcomes reproducible;
`cosmicSpin.forceNext([[…5 symbols], […], […]])` in the console makes the next
spin land on that grid (still evaluated by the real engine).

### Assets

The raw art pack lives in `cosmicspin/reference/` (not committed).
`npm run assets:cosmic-spin` (needs `ffmpeg` with libwebp) converts it into
`public/assets/cosmic-spin/` (≈3.3 MB of WebP): symbols at 384 px plus
motion-blurred copies for spinning reels, backgrounds in two sizes, mascot
poses, the slot frame plus an extracted rim overlay (symbols spin under the gold
rims), and effect sheets turned into single-row sprite strips with real alpha
(their baked checkerboard / haze backgrounds are removed). Components only use
paths from `assets/manifest.ts`; missing artwork falls back to a styled label.

Not used from the pack: `effects/energy-ring.png` (its rings sit on a
semi-opaque gold haze that cannot be separated cleanly) and the reference
sheets. `COSMIC_SPIN_ASSET_PLAN.md` was not part of the delivery. No audio
files were supplied: every sound and the music are synthesized; recordings can
be added in `public/assets/cosmic-spin/audio/` and listed in `AUDIO_FILES`
(a missing file falls back to the synthesized sound).
