# Miami Nights Runtime Architecture

This document describes the current live architecture and the invariants that must be preserved while preparing the game for real multiball.

## Core invariants

- Physics runs at a fixed 240 Hz step and rendering is separate from simulation.
- Ball motion remains physical on the main playfield. Geometry, gravity, restitution, rolling drag and flipper surface velocity determine motion.
- No teleporting or scripted trajectory should be introduced for ordinary ball travel. Raised ramps may own a ball while it follows an explicit ramp path.
- Flippers remain shared table mechanisms.
- Scoring, lamps and presentation observe gameplay state; they should not secretly move balls.
- A physical ball drain is not automatically the end of the numbered player ball during multiball.
- Existing `miami-drain` semantics are end-of-numbered-ball / end-of-turn semantics and should remain that way so existing per-ball modes reset correctly.
- Extra balls and multiball are separate concepts. An extra ball increases future numbered-ball inventory; multiball increases simultaneous live-ball count for the current numbered ball.

## Current load/runtime layers

1. `intro.js` gates gameplay and late-loads feature modules.
2. `game.js` owns the original physics loop, geometry, single live `ball`, shooter, ramps, magnet, core targets, drawing and input.
3. `index.html` contains substantial inline table rules and overrides, including underpass changes, center standups, captive ball, Ocean Drive lettering, wall-neon behavior and PASSFIX logic.
4. `theme.js` replaces/extends rendering and effect observation.
5. Late feature modules wrap existing update/draw/reset functions:
   - `circle3x.js`
   - `businesses.js`
   - `cars.js`
   - `center-post.js`
   - `displays.js`
   - `reef-feedback.js`
   - `extra-ball-feedback.js`
   - `shooter-return-fix.js`
   - `pocket-targets.js`
   - `sunset-field.js`
   - `palm-ring.js`
   - `deflector-removal.js`
   - `captive-repeat.js`

The wrapper pattern has been effective for rapid feature work, but multiball requires explicit state ownership instead of continuing to stack wrappers around one global ball.

## Single-ball state that must become ball-local

The following concepts currently assume exactly one global `ball`:

- position, velocity, radius, ready/parked state
- shooter route and whether the ball has entered the playfield
- Ocean Drive ramp progress and entry speed
- upper-left loop progress
- underpass occupancy / travel state
- magnetic-target ownership while holding
- Cafe Ocho ownership while holding
- recovery/shooter-lane return state
- ball trail and passive-impact velocity history

Each simultaneous live ball must be able to occupy one of these mechanisms without moving or changing another ball.

## Shared table state that should remain shared

- flipper angles and controls
- table geometry
- score
- target bank completion
- 2X mode timer
- circle 3X qualification
- Ocean Drive letter progress
- bumper/spinner state where the physical table itself is shared
- captive-ball mechanism and its repeatable extra-ball progress
- lamps/displays/audio presentation

Some shared mechanisms need multi-contact-safe rearming. A second ball being far away must not re-arm a sling, bumper or target while another ball is still touching it.

## Drain semantics

Current `handleDrain()` immediately dispatches `miami-drain`, decrements `ballsRemaining`, advances `ballNumber`, resets per-ball modes and parks the next ball.

Multiball requires two events/concepts:

1. **physical ball drain** — remove one live ball from the current multiball; do not decrement numbered-ball inventory while other live balls remain;
2. **numbered ball ended** — when the final live ball drains, preserve the existing `miami-drain` behavior so 2X, 3X, businesses, outlane save and other per-ball modes reset exactly once.

## Known cleanup items found during audit

- `extra-ball-feedback.js` previously loaded `shooter-return-fix.js` even though `intro.js` already owns that load. This duplicate loader has been removed on the surgery branch.
- The live `index.html` underpass override currently replaces the physical hidden chamber with a random outlet selector and hidden off-table wait. This violates the original physical-underpass design and should be removed during consolidation.
- Legacy upper-neon insert logic remains in `index.html` even though a later override replaces it with upper-wall neon behavior.
- Individual modules still stamp historical build labels even though `intro.js` is the final build-label owner.
- Pocket-target scoring currently sits outside the existing center-2X wrapper and should be normalized when scoring ownership is consolidated.

## Refactor sequence

### Checkpoint A — repository/runtime cleanup

- Move live inline gameplay code out of `index.html` into named modules while preserving execution order and behavior.
- Remove dead/redundant loader and build-label ownership.
- Restore the physical underpass implementation rather than the random teleport override.
- Keep the live game single-ball during this checkpoint.

### Checkpoint B — one-ball engine ownership

- Introduce a ball factory/state object with an ID and per-ball route/mechanism state.
- Introduce `balls` / live-ball collection while initially keeping exactly one ball.
- Convert collision/update functions to accept an explicit ball rather than relying on the global `ball` where practical.
- Split world updates from per-ball updates so shared timers/spinners/flippers update once per 240 Hz step.
- Preserve one-ball behavior exactly.

### Checkpoint C — real multiball

- Allow multiple live ball objects.
- Add equal-mass ball-to-ball circle collisions.
- Give magnet, Cafe Ocho, ramps and underpass explicit ball ownership.
- Make sling/target rearming safe with multiple simultaneous contacts.
- Treat individual multiball drains separately from end-of-numbered-ball drain.
- Extend trails/audio/presentation to multiple live balls without multiplying expensive whole-table work.

### Checkpoint D — rule activation

After three-ball simulation is stable, attach a table rule to start multiball. Candidate rule: complete `OCEAN DRIVE`, qualify the magnet, then shoot the magnet to hold the current ball while two additional balls launch and all three enter live play.

## Do not change during surgery unless explicitly required

- ball radius
- table gravity / overall slope feel
- approved flipper geometry and strength
- Countach/Ferrari art or placement
- center post
- approved sunset ribs / palm ring visuals
- target positions
- normal scoring values
- existing audio/music behavior
- mobile touch-control geometry
