# Miami Nights Pinball

A browser pinball machine built with HTML Canvas and vanilla JavaScript.

Miami Nights started as a small physics experiment and has grown into a full neon table with real-time scoring, modes, ramps, targets, sound, music, mobile controls and a custom 240 Hz fixed-step physics loop.

## Current table

The live game currently includes:

- one free-moving live ball with gravity, rolling resistance and collision response;
- two independently controlled rotating flippers using local flipper-surface velocity;
- cradle/stored-energy flipper shots;
- slings, posts, pop bumpers, drop targets and standups;
- a three-route plunger / shooter lane with live-ball return recovery;
- the elevated **OCEAN DRIVE** ramp and spinner;
- the upper-left loop and 3X circle-bumper qualification;
- center standups that start timed 2X scoring;
- the 3-0-5 bank with a per-ball left-outlane save;
- a magnetic capture/eject target;
- a captive-ball mechanism with a repeatable five-hit extra-ball award;
- REEF HOTEL, NEON PALMS and CAFE OCHO beneath Ocean Drive;
- a five-exit underpass system;
- lower apron mode/event displays;
- a twelve-insert palm/sunset light ring;
- Miami Nights music and event-driven machine sound effects;
- desktop keyboard controls and large mobile touch controls.

## Controls

- Left flipper: `Z` or `Left Arrow`
- Right flipper: `/`, `X`, `Right Arrow`, or numpad divide
- Plunger: hold and release `Space` or the on-screen **LAUNCH** button
- Music mute: `M`
- New game/reset: `R`
- Touch/pointer controls are available around the cabinet on mobile and desktop.

## Physics principles

- The simulation uses a fixed **240 Hz** physics step independent of rendering.
- A neutral ball with no lateral velocity falls straight down the playfield.
- Sideways motion comes from physical interaction: angled geometry, walls, posts, bumpers, ramps, launcher or flippers.
- Flippers are rotating rigid segments rather than trigger zones.
- Collision response uses local flipper-surface velocity, so timing and contact position matter.
- Slow contact on a held flipper can settle without artificial bounce.
- Ball spin / English is deliberately not simulated yet.
- The live ball remains in a 2D playfield plane; raised ramps use explicit upper-layer path state.

## Current engineering milestone

The next major engine feature is **real simultaneous multiball**. Before enabling multiple live balls, the single-ball runtime is being refactored so ball-local route state, captures, drains and mechanism ownership are explicit rather than relying on one global `ball` object.

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the current runtime map, invariants, known cleanup items and the staged multiball refactor plan.

## Run

Open `index.html` in a browser or use the repository's GitHub Pages build.
