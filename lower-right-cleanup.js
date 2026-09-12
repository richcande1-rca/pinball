// Miami Nights: proven lower-playfield baseline restore + recovery rail cleanup.
// Restore the simple physical geometry that played reliably before the LOWER2
// experiments, while keeping the newer tapered flipper art, center safety post,
// underpass, multiball, scoring, and upper table untouched.

(() => {
  if (window.miamiLowerRightCleanupInstalled) return;
  window.miamiLowerRightCleanupInstalled = true;

  const BUILD = 'Build 20260912-PERF1-MB2-UP2A-LOWERBASE1-GATE1B-RECOVERY1C';

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

  // Keep the known-good two short guide posts. Replace the separate GATE1A
  // flap with one continuous bridge from the recovery rail endpoint directly
  // into the established right sling. The bridge and sling meet as one downhill
  // surface instead of forming the tiny concave pocket that could trap/jitter a
  // ball between competing collision normals.
  const rightReturnBridge = {
    x1: 386,
    y1: 538,
    x2: 364,
    y2: 553,
    radius: 4,
    accent: 'structure'
  };

  lowerGuides.splice(
    0,
    lowerGuides.length,
    { x1: 65, y1: 590, x2: 72, y2: 640, radius: 4 },
    { x1: 355, y1: 590, x2: 348, y2: 640, radius: 4 },
    rightReturnBridge
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

  // Keep the visible recovery curve unchanged, but widen its collision mouth.
  // The former physical lead-in began only 14 px outside TABLE.right; extending
  // it farther out delays where that hidden rail enters the playable table and
  // gives a descending ball substantially more clearance at the outer wall.
  const safeRecoveryGuidePoints = [
    { x: 500, y: 512 },
    { x: 434, y: 522 },
    { x: 414, y: 534 },
    { x: 386, y: 538 }
  ];
  const recoveryVisualGuidePoints = [
    { x: TABLE.right, y: 505 },
    { x: 447, y: 510 },
    { x: 434, y: 522 },
    { x: 414, y: 534 },
    { x: 386, y: 538 }
  ];

  shooterRecoveryGuidePoints.splice(
    0,
    shooterRecoveryGuidePoints.length,
    ...safeRecoveryGuidePoints
  );

  const safeRecoveryRails = makeRailSegments(safeRecoveryGuidePoints, 4);

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
    // The visible recovery curve is one-way hardware: descending balls meet it,
    // while upward launch motion passes through untouched. Resolve before the
    // established update so the core recovery fallback cannot change route state
    // before a returning ball gets a physical chance to meet the rail, then
    // resolve again afterward for ordinary downward loose-ball approaches.
    resolveSafeRecoveryRailCollisions();
    baseUpdateWithRecoveryBaseline(dt);
    resolveSafeRecoveryRailCollisions();
  };

  // Return the recovery hardware to its neutral structural presentation rather
  // than the LOWER2A magenta neon treatment.
  drawShooterRecoveryGate = function drawBaselineRecoveryGate() {
    ctx.save();
    ctx.globalAlpha = shooterRoute === 'recovery' ? 0.9 : 0.52;
    drawSmoothNeonRail(recoveryVisualGuidePoints, MIAMI_COLORS.structure);
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
