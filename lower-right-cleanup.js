// Miami Nights: proven lower-playfield baseline restore.
// Restore the simple physical geometry that played reliably before the LOWER2
// experiments, while keeping the newer tapered flipper art, center safety post,
// shooter recovery, underpass, multiball, scoring, and upper table untouched.

(() => {
  if (window.miamiLowerRightCleanupInstalled) return;
  window.miamiLowerRightCleanupInstalled = true;

  const BUILD = 'Build 20260911-PERF1-MB2-UP2A-LOWERBASE1';

  const leftFlipper = flippers.find(candidate => candidate.side === 'left');
  const rightFlipper = flippers.find(candidate => candidate.side === 'right');

  // Known-good physical flipper geometry from the working lower-table layout.
  // The existing collision model, cradle logic, stored energy, and tapered
  // renderer remain unchanged; only these hardware coordinates are restored.
  if (leftFlipper) {
    Object.assign(leftFlipper, {
      pivotX: PLAYFIELD_CENTER - 95,
      pivotY: 620,
      length: 74,
      restAngle: 0.34,
      activeAngle: -0.48,
      angle: 0.34,
      angularVelocity: 0
    });
  }

  if (rightFlipper) {
    Object.assign(rightFlipper, {
      pivotX: PLAYFIELD_CENTER + 95,
      pivotY: 620,
      length: 74,
      restAngle: Math.PI - 0.34,
      activeAngle: Math.PI + 0.48,
      angle: Math.PI - 0.34,
      angularVelocity: 0
    });
  }

  // Restore the original powered sling faces. Their kick/scoring/audio state is
  // preserved because these are the same established sideBumper objects.
  Object.assign(sideBumpers[0], {
    x1: 56,
    y1: 553,
    x2: 115,
    y2: 602,
    radius: 10
  });
  Object.assign(sideBumpers[1], {
    x1: 364,
    y1: 553,
    x2: 305,
    y2: 602,
    radius: 10
  });

  // Restore the two simple guide posts that left the flipper heels open and
  // avoided the catcher-mitt pockets. Both main and companion balls already
  // consume this shared lowerGuides array through the established physics.
  lowerGuides.splice(
    0,
    lowerGuides.length,
    { x1: 65, y1: 590, x2: 72, y2: 640, radius: 4 },
    { x1: 355, y1: 590, x2: 348, y2: 640, radius: 4 }
  );

  const stampBuild = () => {
    const buildNumberDisplay = document.querySelector('.build-number');
    if (buildNumberDisplay) buildNumberDisplay.textContent = BUILD;
  };

  stampBuild();
  window.setTimeout(stampBuild, 700);
  window.setTimeout(stampBuild, 1600);
})();
