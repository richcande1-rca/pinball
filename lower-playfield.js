// Miami Nights: lower-third geometry and visual makeover, pass 1.
// Keep the proven flipper mechanics, ball size, shooter logic, scoring, and
// center safety post intact while replacing the prototype lower guides with a
// coherent sling / inlane / outlane assembly.

(() => {
  if (window.miamiLowerPlayfieldInstalled) return;
  window.miamiLowerPlayfieldInstalled = true;

  const BUILD = 'Build 20260910-PERF1-LOWER1';

  // Preserve the existing powered sling behavior, but shape each powered face
  // as the diagonal edge of a proper triangular sling assembly.
  Object.assign(sideBumpers[0], {
    x1: 62,
    y1: 548,
    x2: 122,
    y2: 592,
    radius: 10
  });
  Object.assign(sideBumpers[1], {
    x1: 358,
    y1: 548,
    x2: 298,
    y2: 592,
    radius: 10
  });

  // Replace the two prototype lower sticks with passive structure for two
  // sling triangles and two real lane dividers. The outer cabinet walls remain
  // the outside walls of the outlanes; the new dividers create an inner return
  // lane that naturally aims toward each flipper heel.
  const redesignedLowerGuides = [
    // Left sling passive sides.
    { x1: 62, y1: 548, x2: 106, y2: 548, radius: 4, accent: 'lavender' },
    { x1: 106, y1: 548, x2: 122, y2: 592, radius: 4, accent: 'cyan' },

    // Right sling passive sides.
    { x1: 358, y1: 548, x2: 314, y2: 548, radius: 4, accent: 'lavender' },
    { x1: 314, y1: 548, x2: 298, y2: 592, radius: 4, accent: 'magenta' },

    // Left outlane / inlane divider, gently bending toward the flipper heel.
    { x1: 52, y1: 560, x2: 64, y2: 600, radius: 4, accent: 'cyan' },
    { x1: 64, y1: 600, x2: 91, y2: 626, radius: 4, accent: 'cyan' },

    // Right outlane / inlane divider. It stays inside the main playfield and
    // leaves room for the shooter-recovery system to be redesigned separately.
    { x1: 368, y1: 560, x2: 356, y2: 600, radius: 4, accent: 'magenta' },
    { x1: 356, y1: 600, x2: 329, y2: 626, radius: 4, accent: 'magenta' }
  ];

  lowerGuides.splice(
    0,
    lowerGuides.length,
    ...redesignedLowerGuides
  );

  // The collision segment, pivot, length, angles, angular velocity, cradle,
  // and stored-energy mechanics remain untouched. Only the rendered bat is
  // upgraded from a thick rounded line into a tapered pinball-flipper body.
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

      // Mechanical-looking pivot cap ties the flipper visually into the lane
      // hardware instead of leaving it as a floating neon baton.
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

  // Bring the apron upward so the lanes, flippers and drain read as one lower
  // assembly. This is visual only; the open center drain physics remain the
  // established table drain.
  drawLowerApron = function drawLowerPlayfieldApron() {
    const leftApron = [
      { x: TABLE.left, y: 648 },
      { x: 74, y: 648 },
      { x: 148, y: TABLE.bottom },
      { x: TABLE.left, y: TABLE.bottom }
    ];
    const rightApron = [
      { x: SHOOTER.dividerX, y: 648 },
      { x: 346, y: 648 },
      { x: 272, y: TABLE.bottom },
      { x: SHOOTER.dividerX, y: TABLE.bottom }
    ];

    const drawApronPanel = (points, accent) => {
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
      ctx.moveTo(points[0].x + (points === leftApron ? 8 : -8), points[0].y - 3);
      ctx.lineTo(points[1].x, points[1].y - 3);
      ctx.stroke();
      ctx.restore();
    };

    drawApronPanel(leftApron, MIAMI_COLORS.cyan);
    drawApronPanel(rightApron, MIAMI_COLORS.magenta);
  };

  const stampBuild = () => {
    const buildNumberDisplay = document.querySelector('.build-number');
    if (buildNumberDisplay) buildNumberDisplay.textContent = BUILD;
  };
  stampBuild();
  // Later feature loaders also stamp their own build IDs. Reassert this pass
  // after they have settled so the visible label identifies the geometry being
  // tested without changing their code.
  window.setTimeout(stampBuild, 1200);
})();
