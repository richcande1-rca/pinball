# Pinball

A small browser-based pinball experiment built with HTML Canvas and vanilla JavaScript.

## Current milestone

Get the basic playfield physics feeling right before adding game systems.

Current test:

- one ball
- gravity straight down the playfield
- no built-in sideways drift
- solid walls
- believable bounce
- simple rolling resistance
- reset when the ball falls out

## Physics decisions so far

- A neutral ball released with no lateral velocity should travel straight downhill.
- Sideways motion must come from an actual interaction: angled geometry, wall/post contact, bumper, launcher, or flipper.
- Spin / English is real and may matter later, especially from flipper or bumper contact, but it is deliberately **not simulated yet**.
- The ball remains constrained to the 2D playfield plane for now; no hop or airborne 3D physics.

## Flipper requirements for the next major step

Flippers should eventually behave as rotating rigid surfaces, not as simple "touch = launch" zones. That matters because:

- contact near the tip should be faster than contact near the pivot
- shot direction should depend on timing and contact position
- a raised flipper should be able to cradle/hold a ball
- releasing a cradled ball and re-engaging the flipper at the right moment should produce a controlled timed shot
- flipper contact can eventually impart spin when the spin model is added

Bumpers, scoring, sound, tilt, table art, and detailed spin come later.

## Run

Open `index.html` in a browser, or use the GitHub Pages build for the repository.
