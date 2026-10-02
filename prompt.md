# MASTER PROMPT — PREMIUM 3D ROULETTE CASINO

Build a production-quality vertical slice of a premium 3D European roulette game from scratch.

The goal is to create an immersive, realistic-feeling casino table experience using **React + TypeScript + Three.js**, with a strong focus on atmosphere, camera choreography, polished interactions, and a complete playable roulette loop.

This is NOT a generic Three.js demo. It should feel like a polished casino game prototype that could later be expanded into a full product.

---

# 1. CORE CREATIVE DIRECTION

## Visual Direction

Create a:

**Realistic 3D casino environment + clean, slightly stylized modern UI.**

Reference the overall atmosphere and presentation quality of **Evolution Casino / premium Las Vegas casino environments**, but do NOT directly copy their UI, branding, logos, layouts, or proprietary visual identity.

The environment should feel:

- dark
- premium
- sophisticated
- realistic
- warm
- cinematic
- tactile
- expensive
- slightly intimate

Use:

- dark wood
- dark green roulette felt
- brushed/dark metal
- realistic roulette wheel
- realistic casino chips
- subtle warm lighting
- soft reflections
- subtle depth
- controlled highlights
- restrained shadows

Avoid:

- cyberpunk aesthetics
- excessive neon
- futuristic HUDs
- giant glowing elements
- excessive bloom
- unrealistic holographic UI
- overly colorful environments
- cartoonish casino objects

## IMPORTANT TECHNICAL VISUAL CONSTRAINT

Do NOT spend excessive complexity on shaders.

The scene should look realistic primarily through:

- good geometry
- materials
- lighting
- camera composition
- texture usage
- ambient occlusion where appropriate
- reflections where inexpensive
- animation
- post-processing used very carefully

Do not build complicated custom GLSL shader systems unless absolutely necessary.

Prefer simple, maintainable Three.js materials.

The result should look premium without becoming a shader showcase.

---

# 2. TECHNOLOGY

Build the project from scratch using:

- React
- TypeScript
- Three.js
- Vite
- modern CSS
- React-friendly Three.js architecture

Use a clean modular architecture.

Prefer:

- React for application/UI/state orchestration
- Three.js for the 3D world
- HTML/CSS overlay for the main casino HUD
- Three.js raycasting for world interactions
- centralized game state
- reusable components
- clear separation between game logic and presentation

Avoid putting all logic into one giant component.

---

# 3. GAME TYPE

Implement:

**European Roulette**

Only one zero:

```text
0
1–36
```

No `00`.

The game is played entirely with **virtual USD currency**.

Example starting balance:

```text
$10,000
```

Make the starting balance easy to configure.

No real-money functionality.

---

# 4. COMPLETE ROUND LOOP

The game must have a complete playable round.

State flow:

```text
IDLE
↓
BETTING
↓
NO MORE BETS
↓
SPINNING
↓
RESULT
↓
PAYOUT
↓
NEXT ROUND
```

The player should always understand which phase the game is currently in.

## BETTING

During betting:

- player can place bets
- player can modify bets
- player can use all supported betting types
- bots can place bets
- timer counts down
- camera uses a relaxed table-oriented composition

## NO MORE BETS

When betting ends:

- prevent new bets
- visually communicate "No More Bets"
- transition camera toward the roulette wheel
- create a short dramatic pause
- then start spinning

## SPINNING

During spinning:

- roulette wheel animates
- ball animates
- camera transitions to wheel-focused view
- wheel and ball movement should feel physically believable
- sound becomes more prominent

## RESULT

When the deterministic result is reached:

- ball settles into the selected pocket
- wheel slows down
- winning number is highlighted
- winning bets are visually emphasized
- losing bets are visually de-emphasized

## PAYOUT

Calculate payouts correctly.

Update balance.

Animate winning chips / payout feedback.

Then transition back toward the normal table camera.

---

# 5. DETERMINISTIC ROULETTE PHYSICS

This is extremely important.

The game must use:

**Deterministic casino physics.**

The game logic determines the winning number first.

For example:

```ts
resultNumber = 17;
```

The roulette animation then visually produces a believable spin that ends on 17.

Do NOT rely on uncontrolled real physics to randomly determine the result.

The player should perceive a realistic roulette simulation, but the game logic must remain deterministic.

The physical animation should be designed around the predetermined result.

The system should support:

```text
result number
→ calculate target pocket
→ calculate wheel rotation
→ calculate ball trajectory
→ animate
→ settle on target
```

The visual motion should include:

- acceleration
- sustained rotation
- gradual deceleration
- ball orbiting
- ball losing momentum
- bouncing
- pocket entry
- final settling

However, do not build an unnecessarily complicated physics engine.

The priority is:

**believable visual physics > mathematically accurate simulation.**

---

# 6. ROULETTE WHEEL

Create a realistic European roulette wheel.

Use the correct European wheel number order:

```text
0, 32, 15, 19, 4, 21, 2, 25, 17, 34,
6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
24, 16, 33, 1, 20, 14, 31, 9, 22, 18,
29, 7, 28, 12, 35, 3, 26
```

The wheel should have:

- numbered pockets
- red/black pockets
- green zero
- central spindle
- realistic outer rim
- wooden/metal structure
- believable materials

It does not need extremely high polygon density.

Use instancing or efficient geometry where appropriate.

---

# 7. BETTING SYSTEM

Support all standard European roulette betting types.

## NUMBER BETS

- Straight Up

## MULTI-NUMBER BETS

- Split
- Street
- Corner
- Six Line

## OUTSIDE BETS

- Red
- Black
- Odd
- Even
- 1–18
- 19–36

## GROUP BETS

- 1st Dozen
- 2nd Dozen
- 3rd Dozen
- 1st Column
- 2nd Column
- 3rd Column

Every betting type must have correct roulette payout calculations.

Keep the betting logic independent from the visual UI.

---

# 8. CHIP SYSTEM

The player uses virtual USD chips.

Provide configurable chip denominations such as:

```text
$1
$5
$25
$100
$500
$1,000
```

The exact denomination list should be easy to modify.

The user does NOT drag chips.

Instead:

1. Select chip denomination.
2. Select a betting area.
3. Press/click the betting button.
4. A chip is animated onto the table.

Example:

```text
Selected chip: $100

Bet: 17

→ click BET

A $100 chip visually moves onto 17.
```

---

# 9. BET STACK CONSOLIDATION

This behavior is required.

If the user already has:

```text
17 = $100
```

and places another:

```text
$100
```

the bet becomes:

```text
17 = $200
```

Do NOT show two separate $100 chips.

Instead visually replace/consolidate the stack into:

```text
1 × $200 chip
```

The same principle should apply to all bet amounts.

The visual chip should represent the **current total bet value**, not necessarily the history of individual bets.

Create a clean chip-stack animation when the value changes.

For example:

```text
$100
↓
$200
```

should visually transition rather than abruptly replacing the object.

---

# 10. BETTING CONTROLS

Create a polished casino betting panel.

Include:

- chip denomination selector
- BET button
- CLEAR BETS
- UNDO
- REPEAT BET
- DOUBLE BET
- selected chip indicator
- current balance
- total amount wagered

Disable invalid actions based on game state.

Examples:

```text
BETTING:
BET enabled
CLEAR enabled
UNDO enabled
REPEAT enabled if previous bet exists
DOUBLE enabled

SPINNING:
all betting actions disabled
```

---

# 11. NEIGHBOURS BETTING CONTROL

Implement a dedicated:

**NEIGHBOURS**

betting control.

This should let the user select a central roulette number and automatically bet on its physical wheel neighbors.

Example:

```text
CENTER NUMBER

[ 17 ]

NEIGHBOURS

[ ±1 ] [ ±2 ] [ ±3 ]
```

The system should use the **physical European roulette wheel order**, NOT numerical adjacency.

For example, selecting 17 should calculate its neighbors from the actual wheel sequence.

Allow:

```text
±1
±2
±3
```

The user should be able to change the center number.

When the user presses the corresponding button, automatically create the required individual number bets.

Example:

```text
17 + ±2

→ 5 total number bets
```

Each number should receive the currently selected chip denomination.

If some of those numbers already have bets, consolidate the values correctly.

The UI should make the relationship visually obvious.

---

# 12. BETTING TABLE

Create a realistic roulette betting layout.

It should contain:

```text
0

1  2  3
4  5  6
...
34 35 36
```

plus:

- 1st / 2nd / 3rd column
- 1–18
- Even
- Red
- Black
- Odd
- 19–36
- Dozens

The table should visually resemble a real roulette table but with a cleaner, modern presentation.

Use subtle hover states.

When hovering a betting area:

- highlight it
- show possible bet
- avoid excessive glow

When selected:

- show active state
- display current bet amount

---

# 13. INTERACTION MODEL

Do NOT make the player physically drag chips.

Use:

```text
select chip
→ select betting target
→ press BET
```

The physical chip movement is purely an animation.

Use Three.js raycasting for 3D table interaction where appropriate.

Use HTML/CSS controls for major HUD actions.

The interaction should feel responsive.

---

# 14. BOTS

Add lightweight virtual casino players.

Bots do NOT need 3D character models.

Do NOT add unnecessary NPC complexity.

Instead show them through compact UI indicators such as:

```text
Alex
$50 → Red

Mia
$100 → 17

Chris
$25 → 1st Dozen
```

Their bets should also appear physically on the table.

Bots should:

- have different betting styles
- behave somewhat differently
- place random bets
- sometimes favor outside bets
- sometimes place number bets
- sometimes use neighbours
- sometimes bet larger amounts

Create several simple behavioral profiles:

```text
Conservative
Random
High Roller
Number Player
```

Randomly assign these behaviors.

Bot behavior should remain lightweight.

Do not build machine learning.

Do not over-engineer AI.

---

# 15. CAMERA SYSTEM

Camera direction is a major part of the experience.

Default perspective:

**slightly elevated third-person casino table view.**

The player should feel seated at the table.

Provide three manually selectable camera views using UI buttons:

### TABLE VIEW

Main default view.

Shows:

- betting table
- roulette wheel
- player area
- surrounding environment

### WHEEL VIEW

Closer view of roulette wheel.

Used especially during spinning.

### DEALER / SIDE VIEW

A slightly different elevated cinematic angle showing more of the table and surrounding environment.

The user changes these views using buttons.

Do NOT allow free camera movement for now.

No WASD.

No mouse orbit controls.

---

# 16. AUTOMATIC CINEMATIC CAMERA

In addition to manual camera selection, the game should automatically choreograph camera transitions based on game state.

Example:

### Betting

Use:

```text
TABLE VIEW
```

with subtle slow camera movement.

### No More Bets

Smooth transition:

```text
TABLE → WHEEL
```

### Spin

Focus on the wheel.

### Ball nearing result

Subtle camera push-in.

### Result

Hold the winning area.

### Payout

Smoothly transition back toward the table.

The camera should never snap unless explicitly necessary.

Use smooth interpolation / easing.

Camera transitions should feel like a professional casino broadcast.

Do not overuse dramatic camera movement.

---

# 17. CAMERA TRANSITION PRINCIPLES

Avoid:

- extreme zoom
- fast spinning cameras
- nausea-inducing movement
- excessive depth-of-field
- camera shake everywhere

Use:

- smooth easing
- subtle dolly
- small focal changes
- controlled framing
- cinematic pauses

The goal is:

**immersive, not flashy.**

---

# 18. CASINO UI

The UI should be:

- premium
- clean
- dark
- modern
- slightly stylized
- easy to read

Use:

- dark charcoal
- deep green
- warm white
- muted gold/brass accents
- restrained red
- restrained casino green

Avoid giant gradients.

Avoid excessive glassmorphism.

Avoid neon.

Avoid futuristic HUD aesthetics.

The UI should feel like a premium casino product rather than a sci-fi game.

---

# 19. MAIN HUD

Include:

### Top area

- game title / roulette
- current round state
- timer

### Bottom / player area

- current balance
- selected chip
- chip selector
- total bet
- betting controls

### Side / contextual area

- bot players
- recent result
- optional mini history

Keep the UI hierarchy clear.

Do not overcrowd the screen.

---

# 20. RESULT PRESENTATION

When the result is determined, show a polished result state.

Example:

```text
17
RED
ODD
```

Use a subtle animated highlight.

Do not cover the entire screen with a giant popup.

The winning number should remain visually connected to the roulette table.

---

# 21. RECENT RESULTS

Include a compact recent-results strip.

Example:

```text
32   17   0   21   8
```

Each result should show its roulette color.

Keep this subtle.

It should not dominate the interface.

---

# 22. BALANCE & PAYOUT

Use USD formatting.

Example:

```text
$10,000.00
```

Calculate payouts correctly according to European roulette rules.

Standard payouts:

```text
Straight Up      35:1
Split            17:1
Street           11:1
Corner            8:1
Six Line          5:1

Dozen             2:1
Column            2:1

Red/Black         1:1
Odd/Even          1:1
1–18 / 19–36      1:1
```

Do not confuse payout ratio with total return.

Implement the actual balance calculations correctly.

---

# 23. SOUND DESIGN

Sound is an important part of the experience.

Implement a sound system with clear separation between effects and ambient audio.

Include:

### Ambient

- subtle casino ambience
- distant crowd
- room tone

### UI

- button click
- chip selection
- bet placement
- confirmation
- error / invalid action

### Roulette

- wheel spin
- ball rolling
- ball bouncing
- pocket landing

### Result

- subtle winning sound
- payout sound
- losing/neutral sound

### Music

Include a subtle optional background casino track.

Provide:

- master volume
- music volume
- effects volume

Mute controls should be accessible.

Do not make sounds obnoxious or arcade-like.

---

# 24. 3D ENVIRONMENT

Build a single casino roulette table scene.

Environment should include enough surrounding detail to avoid feeling like an isolated floating table.

Possible elements:

- roulette table
- chairs
- casino lighting
- dark walls
- subtle decorative elements
- lamps
- background tables or silhouettes
- distant ambient lights
- small reflective surfaces

However:

**Do not spend time building an entire casino.**

The table is the hero.

The background should provide atmosphere without stealing attention.

---

# 25. ASSETS

Create assets procedurally / with Three.js geometry when practical.

You may create:

- table
- roulette wheel
- chips
- chairs
- decorative objects

using geometry and simple materials.

If an asset genuinely benefits from a model, create a clean placeholder architecture that allows the GLTF/GLB asset to be swapped in later.

Do not block development waiting for perfect assets.

The project must remain functional with generated/procedural assets.

---

# 26. PERFORMANCE

Optimize the scene.

Use:

- instancing where appropriate
- reasonable polygon counts
- texture reuse
- efficient lighting
- limited shadow casters
- object pooling where useful

Avoid:

- unnecessary high-resolution textures
- huge geometry counts
- expensive custom shaders
- dozens of dynamic lights
- unnecessary post-processing

Target smooth desktop performance.

---

# 27. RESPONSIVE DESIGN

Primary target:

**Desktop 16:9**

The main showcase resolution should work well at:

```text
1920 × 1080
```

Also support reasonable resizing.

Do not prioritize mobile yet.

---

# 28. INTERNATIONALIZATION

Support:

```text
Turkish
English
```

Default language:

**Turkish**

Create a simple localization architecture rather than hardcoding UI strings.

Example:

```ts
t("roulette.bet");
t("roulette.noMoreBets");
t("roulette.spin");
```

Turkish UI should feel natural rather than machine-translated.

---

# 29. GAME STATE ARCHITECTURE

Create a centralized game state.

At minimum track:

```ts
gamePhase;
balance;
selectedChip;
currentBets;
previousBets;
totalBet;
timer;
resultNumber;
recentResults;
bots;
cameraMode;
language;
soundSettings;
```

Use a clean state management solution.

Do not scatter important game state across dozens of components.

---

# 30. BET DATA MODEL

Create a reusable betting model.

Example concept:

```ts
type Bet = {
    id: string;
    type: BetType;
    numbers: number[];
    amount: number;
};
```

The game logic should know which numbers each bet covers.

This makes payout calculation straightforward.

For example:

```ts
BetType.STRAIGHT;
BetType.SPLIT;
BetType.STREET;
BetType.CORNER;
BetType.SIX_LINE;
BetType.DOZEN;
BetType.COLUMN;
BetType.RED;
BetType.BLACK;
BetType.ODD;
BetType.EVEN;
BetType.LOW;
BetType.HIGH;
```

---

# 31. ANIMATION SYSTEM

Animations should be reusable.

Create systems/functions for:

- chip placement
- chip consolidation
- chip removal
- wheel spin
- ball movement
- result highlight
- camera transitions
- button feedback
- payout animation
- bot betting

Avoid hardcoding animation logic inside UI components.

---

# 32. VISUAL FEEDBACK

Every important interaction should provide subtle feedback.

Examples:

Hover:

```text
soft highlight
```

Bet:

```text
chip animation + click sound
```

Invalid bet:

```text
small UI feedback + sound
```

Result:

```text
number highlight + wheel focus
```

Win:

```text
subtle payout animation
```

Do not use excessive particles.

---

# 33. USER EXPERIENCE

The player should immediately understand:

1. What phase the game is in.
2. How much money they have.
3. Which chip they selected.
4. How much they have wagered.
5. Where their bets are.
6. How much time remains.
7. What the roulette result was.
8. What they won/lost.

Avoid unnecessary menus.

The game should feel immediate.

---

# 34. CODE QUALITY

Write production-quality TypeScript.

Use:

- strong typing
- reusable components
- reusable hooks
- clean naming
- modular files
- minimal duplication
- clear comments only where useful

Avoid:

- giant files
- magic numbers
- duplicated game logic
- hardcoded UI state everywhere
- unnecessary abstractions
- placeholder TODOs for core functionality

---

# 35. PROJECT STRUCTURE

Use a clean architecture similar to:

```text
src/
  components/
    casino/
    roulette/
    ui/
    betting/
    bots/

  three/
    scene/
    camera/
    lighting/
    objects/
    roulette/
    animations/

  game/
    engine/
    betting/
    payouts/
    bots/
    roulette/

  state/
  hooks/
  i18n/
  audio/
  utils/
  types/
```

Adjust the structure if a better architecture is justified.

The important requirement is clear separation of:

```text
Game Logic
3D Rendering
UI
Audio
State
Localization
```

---

# 36. DEVELOPMENT PRIORITY

Build in this order:

### Phase 1 — Foundation

- Vite
- React
- TypeScript
- Three.js
- basic scene
- camera
- lighting
- table

### Phase 2 — Roulette

- wheel
- pockets
- ball
- wheel animation
- deterministic result

### Phase 3 — Betting

- betting table
- chips
- chip selector
- all betting types
- balance
- payout logic

### Phase 4 — UI

- casino HUD
- timer
- controls
- recent results
- result display

### Phase 5 — Camera

- Table View
- Wheel View
- Dealer/Side View
- automatic transitions

### Phase 6 — Bots

- lightweight bot logic
- bot UI
- bot chips

### Phase 7 — Audio

- ambient
- UI
- chips
- wheel
- ball
- result

### Phase 8 — Polish

- animation refinement
- lighting refinement
- material refinement
- spacing
- typography
- transitions
- performance

---

# 37. IMPORTANT PRODUCT PRINCIPLE

Do not optimize for technical complexity.

Optimize for:

**"How does this feel when I play one complete roulette round?"**

The finished experience should feel cohesive.

A user should be able to:

```text
Enter table
↓
See casino environment
↓
Choose chip
↓
Place multiple bets
↓
Use Neighbours
↓
See chips physically appear
↓
See bots betting
↓
Watch betting timer
↓
No More Bets
↓
Camera moves toward wheel
↓
Wheel spins
↓
Ball rolls
↓
Ball lands
↓
Winning number revealed
↓
Payout calculated
↓
Balance updated
↓
Camera returns to table
↓
Next round
```

That complete loop is the most important deliverable.

---

# 38. FINAL QUALITY BAR

Before considering the implementation complete, verify:

- European roulette rules are correct.
- All betting types work.
- Payouts are correct.
- Multiple simultaneous bets work.
- Chip denomination selection works.
- Bet consolidation works.
- Neighbours uses physical wheel adjacency.
- Repeat Bet works.
- Double Bet works.
- Undo works.
- Clear Bets works.
- Bot bets work.
- Deterministic results work.
- Roulette animation visually reaches the predetermined result.
- Camera transitions are smooth.
- Manual camera buttons work.
- Sound works.
- Turkish is the default language.
- English localization works.
- UI remains readable at 1920×1080.
- The scene feels premium without excessive shader complexity.
- No unnecessary visual clutter exists.
- No major interaction requires drag-and-drop.
- The entire round can be played from beginning to end without developer intervention.

---

# 39. DO NOT

Do NOT:

- build a multiplayer backend
- implement real money
- implement authentication
- build a complete casino
- add free camera controls
- create complex NPC characters
- build machine learning bots
- over-engineer physics
- create complicated custom shaders
- use excessive neon
- use excessive bloom
- create a futuristic HUD
- copy Evolution Casino branding
- make the UI overly glassmorphic
- make every element animated
- sacrifice usability for visual effects

The target is a polished, believable **single-table roulette vertical slice**.

---

# 40. IMPLEMENTATION EXPECTATION

Do not stop after creating a visual mockup.

Implement the actual playable experience.

If a sophisticated asset or effect is not immediately available, create a visually convincing procedural/simple implementation and keep the architecture replaceable.

Prioritize working functionality first, then polish.

At the end, the project should launch locally and allow a user to play complete roulette rounds immediately.

Make sensible implementation decisions without asking for approval for minor details.

Only make assumptions that are consistent with the creative and technical direction above.
