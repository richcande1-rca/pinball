# Pinball

A small browser-based pinball experiment built with HTML Canvas and vanilla JavaScript.

## Current milestone

The physics test is now minimally playable.

Current behavior:

- one free-moving ball
- gravity straight down the playfield
- no built-in sideways drift
- solid side/top walls and an open drain
- two independently controlled rotating flippers
- stronger flipper response toward the tip because contact uses flipper surface velocity
- two simple slingshot-style side bumpers that kick the ball inward/upward
- light rolling resistance
- reset after drain or by keyboard

## Controls

- Left flipper: `Left Arrow` or `Z`
- Right flipper: `Right Arrow` or `X`
- Reset ball: `Space` or `R`
- Touch/pointer: press the left or right half of the playfield

## Physics decisions so far

- A neutral ball released with no lateral velocity travels straight downhill.
- Sideways motion must come from a real interaction: angled geometry, wall/post contact, bumper, launcher, or flipper.
- Flippers are rotating rigid segments rather than simple "touch = launch" zones.
- Collision response uses the local velocity of the moving flipper surface, so timing and contact position already matter.
- Spin / English is real and may matter later, especially from flipper or bumper contact, but it is deliberately **not simulated yet**.
- The ball remains constrained to the 2D playfield plane for now; no hop or airborne 3D physics.

## Next physics questions

Before adding scoring, art, or complicated table geometry, tune the feel:

- flipper strength and swing speed
- bumper kick strength
- gravity / perceived table slope
- bounce energy loss
- whether a raised flipper can eventually cradle a ball naturally once lower guide geometry is added

Detailed spin, scoring, sound, tilt, and table art come later.

## Run

Open `index.html` in a browser, or use the GitHub Pages build for the repository.
