// Miami Nights: lower-third physical rearchitecture, pass 2A.
// This pass changes the actual playable lower geometry: flipper placement,
// sling placement, inlane/outlane rails, shooter-recovery junction, and the
// lower-right underpass mouth. Core flipper physics and ball size stay intact.

(() => {
  if (window.miamiLowerPlayfieldInstalled) return;
  window.miamiLowerPlayfieldInstalled = true;

  const BUILD = 'Build 20260910-PERF1-MB2-UP2A-LOWER2A';

  // --- Flipper geometry ----------------------------------------------------
  // Preserve the established rotating-segment physics, cradle logic and stored
  // energy. Move the hardware itself into a more conventional lower-table
  // relationship with the new lanes.
  const leftFlipper = flippers.find(candidate => candidate.side === 'left');
  const rightFlipper = flippers.find(candidate => candidate.side === 'right');

  if (leftFlipper) {
    Object.assign(leftFlipper, {
      pivotX: 112,
      pivotY: 628,
      length: 78,
      restAngle: 0.32,
      activeAngle: -0.52,
      angle: 0.32,
      angularVelocity: 0
    });
  }

  if (rightFlipper) {
    Object.assign(rightFlipper, {
      pivotX: 308,
      pivotY: 628,
      length: 78,
      restAngle: Math.PI - 0.32,
      activeAngle: Math.PI + 0.52,
      angle: Math.PI - 0.32,
      angularVelocity: 0
    });
  }

  // --- Sling assemblies ---------------------------------------------------
  // Move the slings inward enough to create real side-lane territory. Their
  // diagonal faces remain the existing powered sling objects, so scoring/audio
  // ownership and kick behavior are unchanged.
  Object.assign(sideBumpers[0], {
    x1: 100,
    y1: 542,
    x2: 155,
    y2: 590,
    radius: 10
  });
  Object.assign(sideBumpers[1], {
    x1: 320,
    y1: 542,
    x2: 265,
    y2: 590,
    radius: 10
  });

  // Each side now has a real outlane divider, a return-lane rail and the two
  // passive sides of the sling triangle. The cabinet wall remains the outer
  // wall of each outlane. A ball must first choose the narrow side mouth; once
  // committed to the outlane it is allowed to drain naturally.
  const redesignedLowerGuides = [
    // Left sling: top and inner passive sides.
    { x1: 100, y1: 542, x2: 145, y2: 542, radius: 4, accent: 'lavender' },
    { x1: 145, y1: 542, x2: 155, y2: 590, radius: 4, accent: 'cyan' },

    // Right sling: top and inner passive sides.
    { x1: 320, y1: 542, x2: 275, y2: 542, radius: 4, accent: 'lavender' },
    { x1: 275, y1: 542, x2: 265, y2: 590, radius: 4, accent: 'magenta' },

    // Left outlane divider. The top opening is deliberately narrow; the lower
    // widening only occurs after the ball has already committed to the outlane.
    { x1: 60, y1: 542, x2: 61, y2: 565, radius: 4, accent: 'cyan' },
    { x1: 61, y1: 565, x2: 70, y2: 589, radius: 4, accent: 'cyan' },
    { x1: 70, y1: 589, x2: 84, y2: 607, radius: 4, accent: 'cyan' },
    { x1: 84, y1: 607, x2: 104, y2: 620, radius: 4, accent: 'cyan' },

    // Left inner return rail funnels the playable lane onto the flipper heel.
    { x1: 155, y1: 590, x2: 149, y2: 604, radius: 4, accent: 'lavender' },
    { x1: 149, y1: 604, x2: 136, y2: 620, radius: 4, accent: 'lavender' },

    // Right outlane divider, mirrored around the main playfield center.
    { x1: 360, y1: 542, x2: 359, y2: 565, radius: 4, accent: 'magenta' },
    { x1: 359, y1: 565, x2: 350, y2: 589, radius: 4, accent: 'magenta' },
    { x1: 350, y1: 589, x2: 336, y2: 607, radius: 4, accent: 'magenta' },
    { x1: 336, y1: 607, x2: 316, y2: 620, radius: 4, accent: 'magenta' },

    // Right inner return rail funnels the playable lane onto the flipper heel.
    { x1: 265, y1: 590, x2: 271, y2: 604, radius: 4, accent: 'lavender' },
    { x1: 271, y1: 604, x2: 284, y2: 620, radius: 4, accent: 'lavender' }
  ];

  lowerGuides.splice(0, lowerGuides.length, ...redesignedLowerGuides);

  // --- Shooter recovery / right inlane junction ---------------------------
  // Give the returning shooter-lane ball a real physical guide through a
  // longer opening in the divider. The existing scripted feed remains only as
  // a deep fallback if a ball somehow misses the physical guide.
  SHOOTER.recoveryGateTop = 500;
  SHOOTER.recoveryGateBottom = 580;
  SHOOTER.recoveryFeedY = 602;

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

  // LOWER2 originally exposed the first recovery-rail endpoint at x=447,
  // inside the 456 px cabinet wall. With an 8 px ball and 4 px rail that made
  // the endpoint's collision envelope overlap the wall and form a tiny catch.
  // Start the physical rail safely beyond the wall instead, so the returning
  // ball meets one continuous diagonal surface with no reachable corner.
  shooterRecoveryGuidePoints.splice(
    0,
    shooterRecoveryGuidePoints.length,
    { x: 470, y: 498 },
    { x: 448, y: 518 },
    { x: 438, y: 533 },
    { x: 425, y: 546 },
    { x: 409, y: 557 },
    { x: 390, y: 566 },
    { x: 370, y: 570 },
    { x: 350, y: 574 }
  );

  // Keep the visible guide clipped to the inside edge of the cabinet. Physics
  // gets the off-table lead-in above; the player only sees the usable rail.
  const recoveryVisualGuidePoints = [
    { x: TABLE.right, y: 511 },
    { x: 448, y: 518 },
    { x: 438, y: 533 },
    { x: 425, y: 546 },
    { x: 409, y: 557 },
    { x: 390, y: 566 },
    { x: 370, y: 570 },
    { x: 350, y: 574 }
  ];

  const lowerRecoveryRails = makeRailSegments(shooterRecoveryGuidePoints, 4);
  const baseUpdateWithLowerGeometry = update;
  update = function updateWithLowerGeometry(dt) {
    baseUpdateWithLowerGeometry(dt);

    if (
      gameOver ||
      ball.ready ||
      shooterRoute !== 'recovery' ||
      underpass.active ||
      oceanRamp.active ||
      loopRamp.active ||
      magneticTarget.state === 'holding'
    ) return;

    if (
      ball.y >= SHOOTER.recoveryGateTop - 14 &&
      ball.y <= SHOOTER.recoveryGateBottom + 14 &&
      ball.x >= SHOOTER.dividerX - 28
    ) {
      for (const rail of lowerRecoveryRails) {
        // Low restitution makes this behave like a return guide instead of a
        // powered rebound: retain motion while turning the ball into the lane.
        resolveSegmentCollision(rail, { x: 0, y: 0 }, 0.24);
      }
    }

    if (ball.x + ball.radius < SHOOTER.dividerX) {
      shooterRoute = 'released';
      ballHasEnteredPlayfield = true;
    }
  };

  // Move the lower-right underpass mouth out of the recovery gate itself. It
  // remains on the shooter-side divider and keeps the same blind routing rules.
  if (underpass.outlets[3]) {
    Object.assign(underpass.outlets[3], {
      x: SHOOTER.dividerX - 1,
      y: 480,
      radius: 18,
      edge: 'right'
    });
  }

  // --- Flipper appearance -------------------------------------------------
  // Match the new physical length while retaining LOWER1's chunkier tapered
  // body. The rendered shape follows the collision segment exactly.
  function traceFlipperBody(length, baseHalf, tipHalf) {
    const noseX = length - tipHalf * 0.35;
    ctx.beginPath();
    ctx.moveTo(0, -baseHalf);
    ctx.lineTo(noseX, -tipHalf);
    ctx.quadraticCurveTo(length + tipHalf * 0.45, 0, noseX, tipHalf);
    ctx.lineTo(0, baseHalf);
    ctx.quadraticCurveTo(-baseHalf * 0.9, 0, 0, -baseHalf);
    ctx.closePath();
  }

  drawFlippers = function drawLowerPlayfieldFlippers() {
    const now = performance.now();
    const mobile = Boolean(window.miamiMobilePerformanceMode);

    for (const flipper of flippers) {
      const accent = flipper.side === 'left'
        ? MIAMI_COLORS.cyan
        : MIAMI_COLORS.magenta;
      const firedAge = now - flipper.coilFlashStartedAt;
      const firedFlash = firedAge >= 0 && firedAge < 180
        ? 1 - firedAge / 180
        : 0;
      const storedEnergy = clamp(
        Math.max(
          flipper.cradleCharge,
          flipper.storedCharge,
          flipper.pendingPunch
        ),
        0,
        1
      );
      const fullPulse = storedEnergy > 0.96
        ? 0.78 + 0.22 * Math.sin(now / 55)
        : 1;
      const glowEnergy = Math.max(storedEnergy * fullPulse, firedFlash);

      ctx.save();
      ctx.translate(flipper.pivotX, flipper.pivotY);
      ctx.rotate(flipper.angle);

      if (glowEnergy > 0.005 && !mobile) {
        ctx.save();
        ctx.globalAlpha = 0.18 + glowEnergy * 0.35;
        ctx.fillStyle = accent;
        ctx.shadowColor = accent;
        ctx.shadowBlur = 9 + glowEnergy * 20;
        traceFlipperBody(flipper.length, 13, 8.5);
        ctx.fill();
        ctx.restore();
      }

      ctx.fillStyle = '#101728';
      ctx.strokeStyle = MIAMI_COLORS.structure;
      ctx.lineWidth = 2.5;
      traceFlipperBody(flipper.length, 11, 7.2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = flipper.pressed ? '#f1efff' : '#d8d5f0';
      ctx.globalAlpha = 0.9;
      traceFlipperBody(flipper.length - 3, 7.2, 4.8);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.strokeStyle = glowEnergy > 0.9 ? '#f8ffff' : accent;
      ctx.lineWidth = 1.8 + glowEnergy * 0.9;
      ctx.shadowColor = accent;
      ctx.shadowBlur = mobile ? 0 : 4 + glowEnergy * 12;
      traceFlipperBody(flipper.length, 11, 7.2);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#070b15';
      ctx.strokeStyle = glowEnergy > 0.9 ? '#f8ffff' : accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#cfd5e6';
      ctx.beginPath();
      ctx.arc(0, 0, 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  drawLowerGuides = function drawLowerPlayfieldGuides() {
    for (const guide of lowerGuides) {
      const accent = MIAMI_COLORS[guide.accent] || MIAMI_COLORS.cyan;
      drawNeonSegment(guide, accent, 7, 1.8);
    }
  };

  // Draw the recovery guide with the on-table visual path, while the collision
  // rail keeps its safe lead-in beyond the cabinet wall.
  drawShooterRecoveryGate = function drawLowerRecoveryGate() {
    ctx.save();
    ctx.globalAlpha = shooterRoute === 'recovery' ? 1 : 0.38;
    drawSmoothNeonRail(recoveryVisualGuidePoints, MIAMI_COLORS.magenta);
    ctx.restore();
  };

  // A higher, deeper apron makes the committed outlanes and the central drain
  // read as deliberate hardware rather than empty canvas. It remains below the
  // live collision surface; the lane rails and flippers above own the physics.
  drawLowerApron = function drawLowerPlayfieldApron() {
    const leftApron = [
      { x: TABLE.left, y: 636 },
      { x: 78, y: 636 },
      { x: 148, y: TABLE.bottom },
      { x: TABLE.left, y: TABLE.bottom }
    ];
    const rightApron = [
      { x: SHOOTER.dividerX, y: 636 },
      { x: 342, y: 636 },
      { x: 272, y: TABLE.bottom },
      { x: SHOOTER.dividerX, y: TABLE.bottom }
    ];

    const drawApronPanel = (points, accent, isLeft) => {
      ctx.save();
      ctx.fillStyle = '#0b1020';
      ctx.strokeStyle = '#28314b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      ctx.shadowColor = accent;
      ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 3;
      ctx.beginPath();
      ctx.moveTo(points[0].x + (isLeft ? 8 : -8), points[0].y - 3);
      ctx.lineTo(points[1].x, points[1].y - 3);
      ctx.stroke();
      ctx.restore();
    };

    drawApronPanel(leftApron, MIAMI_COLORS.cyan, true);
    drawApronPanel(rightApron, MIAMI_COLORS.magenta, false);
  };

  const stampBuild = () => {
    const buildNumberDisplay = document.querySelector('.build-number');
    if (buildNumberDisplay) buildNumberDisplay.textContent = BUILD;
  };

  stampBuild();

  // The multiball/underpass scripts load later and normally stamp last. Wait
  // until that final gameplay layer is installed, then identify this combined
  // build without permanently fighting future build owners.
  let buildPolls = 0;
  const buildPoll = window.setInterval(() => {
    buildPolls += 1;
    if (window.miamiBidirectionalUnderpassInstalled || buildPolls >= 100) {
      window.clearInterval(buildPoll);
      stampBuild();
    }
  }, 100);
})();
