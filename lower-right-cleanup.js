// Miami Nights: proven lower-playfield baseline restore + recovery rail cleanup.
// Restore the simple physical geometry that played reliably before the LOWER2
// experiments, while keeping the newer tapered flipper art, center safety post,
// underpass, multiball, scoring, and upper table untouched.

(() => {
  if (window.miamiLowerRightCleanupInstalled) return;
  window.miamiLowerRightCleanupInstalled = true;

  const BUILD = 'Build 20260913-PERF1-MB2-UP2A-LOWERBASE1-RECOVERY2-PEERHANDOFF1';

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

  // Keep only the known-good two short lower guide posts. RECOVERY2 removes the
  // separate right-side bridge entirely; the recovery rail now runs directly
  // into the established right sling with no collision joint between them.
  lowerGuides.splice(
    0,
    lowerGuides.length,
    { x1: 65, y1: 590, x2: 72, y2: 640, radius: 4 },
    { x1: 355, y1: 590, x2: 348, y2: 640, radius: 4 }
  );

  // --- Recovery rail baseline --------------------------------------------
  // Restore the original recovery opening and feed height. LOWER2A stretched
  // this system down toward the right sling, where it became a catch surface.
  SHOOTER.recoveryGateTop = 500;
  SHOOTER.recoveryGateBottom = 560;
  SHOOTER.recoveryFeedY = 526;

  shooterDividerRails.splice(
    0,
    shooterDividerRails.length,
    {
      x1: SHOOTER.dividerX,
      y1: SHOOTER.dividerTop,
      x2: SHOOTER.dividerX,
      y2: 178,
      radius: 4
    },
    {
      x1: SHOOTER.dividerX,
      y1: 262,
      x2: SHOOTER.dividerX,
      y2: SHOOTER.recoveryGateTop,
      radius: 4
    },
    {
      x1: SHOOTER.dividerX,
      y1: SHOOTER.recoveryGateBottom,
      x2: SHOOTER.dividerX,
      y2: SHOOTER.dividerBottom,
      radius: 4
    }
  );

  // RECOVERY2 uses one simple surface for both drawing and collision. It begins
  // well outside the right wall, enters the table lower than the old cramped
  // mouth, and terminates exactly at the existing right sling endpoint. With no
  // intermediate vertices there are no elbow/kink collision normals to trap a
  // slow ball, and what the player sees is exactly what the physics resolves.
  const recoveryGuidePoints = [
    { x: 500, y: 512 },
    { x: 364, y: 553 }
  ];

  shooterRecoveryGuidePoints.splice(
    0,
    shooterRecoveryGuidePoints.length,
    ...recoveryGuidePoints
  );

  const safeRecoveryRails = makeRailSegments(recoveryGuidePoints, 4);

  // LOWER2A already closed over its long recovery-rail array before this late
  // baseline layer loads. Suppress only those seven obsolete segments when its
  // wrapper calls resolveSegmentCollision; every unrelated collision continues
  // through the established resolver unchanged.
  const obsoleteRecoverySegments = [
    [470, 498, 448, 518],
    [448, 518, 438, 533],
    [438, 533, 425, 546],
    [425, 546, 409, 557],
    [409, 557, 390, 566],
    [390, 566, 370, 570],
    [370, 570, 350, 574]
  ];

  function isObsoleteRecoverySegment(segment) {
    if (!segment) return false;
    return obsoleteRecoverySegments.some(([x1, y1, x2, y2]) =>
      segment.x1 === x1 &&
      segment.y1 === y1 &&
      segment.x2 === x2 &&
      segment.y2 === y2
    );
  }

  const baseResolveSegmentCollisionWithRecoveryBaseline = resolveSegmentCollision;
  resolveSegmentCollision = function resolveSegmentCollisionWithRecoveryBaseline(
    segment,
    surfaceVelocity = { x: 0, y: 0 },
    restitution = 0.9,
    extraKick = 0
  ) {
    if (isObsoleteRecoverySegment(segment)) return false;

    return baseResolveSegmentCollisionWithRecoveryBaseline(
      segment,
      surfaceVelocity,
      restitution,
      extraKick
    );
  };

  function resolveSafeRecoveryRailCollisions() {
    if (
      gameOver ||
      ball.ready ||
      ball.vy <= 0 ||
      underpass.active ||
      oceanRamp.active ||
      loopRamp.active ||
      magneticTarget.state === 'holding'
    ) return;

    if (
      ball.y >= SHOOTER.recoveryGateTop - 18 &&
      ball.y <= SHOOTER.recoveryGateBottom + 18 &&
      ball.x >= SHOOTER.dividerX - 36
    ) {
      for (const rail of safeRecoveryRails) {
        resolveSegmentCollision(rail, { x: 0, y: 0 }, 0.24);
      }
    }
  }

  const baseUpdateWithRecoveryBaseline = update;
  update = function updateWithRecoveryBaseline(dt) {
    // The recovery surface is one-way hardware: descending balls meet it while
    // upward launch motion passes through untouched. Resolve before the core
    // update so recovery route changes cannot bypass the surface, then resolve
    // once more afterward for ordinary downward loose-ball approaches.
    const wasRecoveryRoute = shooterRoute === 'recovery';
    resolveSafeRecoveryRailCollisions();
    baseUpdateWithRecoveryBaseline(dt);

    // The core handoff places a recovered ball just inside the divider with a
    // down-left velocity. That trajectory can run directly into the powered
    // right sling. Keep the same release point and route transition, but flatten
    // only this recovery handoff so the ball travels left into open play above
    // the right flipper instead of being delivered into the sling face.
    if (
      wasRecoveryRoute &&
      shooterRoute === 'released' &&
      !gameOver &&
      !ball.ready &&
      Math.abs(ball.x - (SHOOTER.dividerX - ball.radius - 4)) <= 2 &&
      Math.abs(ball.y - SHOOTER.recoveryFeedY) <= 2
    ) {
      ball.vx = -245;
      ball.vy = 10;
    }

    resolveSafeRecoveryRailCollisions();
  };

  // Keep the recovery hardware visually neutral. The visible line is the same
  // two-point path used for collision so there is no visual/physics mismatch.
  drawShooterRecoveryGate = function drawBaselineRecoveryGate() {
    ctx.save();
    ctx.globalAlpha = shooterRoute === 'recovery' ? 0.9 : 0.52;
    drawSmoothNeonRail(recoveryGuidePoints, MIAMI_COLORS.structure);
    ctx.restore();
  };

  const stampBuild = () => {
    const buildNumberDisplay = document.querySelector('.build-number');
    if (buildNumberDisplay) buildNumberDisplay.textContent = BUILD;
  };

  stampBuild();
  window.setTimeout(stampBuild, 700);
  window.setTimeout(stampBuild, 1600);
})();
