// Miami Nights: physical sunset orbit around the central palm motif.
// The artwork stays untouched; two lightweight elliptical rail runs create a
// real ball channel around it. Passing the twelve existing lamp positions
// scores progress, and completing the ring triggers the sunset payoff.

(() => {
  if (window.miamiSunsetOrbitInstalled) return;
  window.miamiSunsetOrbitInstalled = true;

  const CENTER_X = 210;
  const CENTER_Y = 350;
  const LAMP_COUNT = 12;
  const LAMP_RX = 66;
  const LAMP_RY = 55;
  const SENSOR_RADIUS = 17;
  const RAIL_RADIUS = 2.6;
  const INNER_RX = 57;
  const INNER_RY = 44;
  const OUTER_RX = 86;
  const OUTER_RY = 68;
  const RAIL_STEPS = 40;
  const LAMP_VALUE = 100;
  const COMPLETE_VALUE = 5000;
  const SHOW_DURATION = 1800;

  const progress = new Set();
  let showStartedAt = -Infinity;
  let showUntil = -Infinity;

  function angleDistance(a, b) {
    const full = Math.PI * 2;
    let delta = Math.abs(a - b) % full;
    if (delta > Math.PI) delta = full - delta;
    return delta;
  }

  const sharedOpenings = [
    { angle: 0, halfWidth: 0.30 },
    { angle: Math.PI, halfWidth: 0.30 },
    { angle: Math.PI / 2, halfWidth: 0.24 }
  ];

  // The outer top stays open beneath the three center standups so the new
  // feature does not collide with or visually crowd that existing target bank.
  const outerOpenings = [
    ...sharedOpenings,
    { angle: -Math.PI / 2, halfWidth: 0.50 }
  ];

  function angleIsOpen(angle, openings) {
    return openings.some(opening =>
      angleDistance(angle, opening.angle) <= opening.halfWidth
    );
  }

  function buildEllipseRails(rx, ry, openings) {
    const rails = [];
    for (let index = 0; index < RAIL_STEPS; index += 1) {
      const a1 = index * Math.PI * 2 / RAIL_STEPS;
      const a2 = (index + 1) * Math.PI * 2 / RAIL_STEPS;
      const mid = (a1 + a2) / 2;
      if (angleIsOpen(mid, openings)) continue;

      rails.push({
        x1: CENTER_X + Math.cos(a1) * rx,
        y1: CENTER_Y + Math.sin(a1) * ry,
        x2: CENTER_X + Math.cos(a2) * rx,
        y2: CENTER_Y + Math.sin(a2) * ry,
        radius: RAIL_RADIUS
      });
    }
    return rails;
  }

  const innerRails = buildEllipseRails(INNER_RX, INNER_RY, sharedOpenings);
  const outerRails = buildEllipseRails(OUTER_RX, OUTER_RY, outerOpenings);
  const allRails = [...innerRails, ...outerRails];

  const lampPositions = Array.from({ length: LAMP_COUNT }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / LAMP_COUNT;
    return {
      x: CENTER_X + Math.cos(angle) * LAMP_RX,
      y: CENTER_Y + Math.sin(angle) * LAMP_RY
    };
  });

  function liveMainPlayfieldBall() {
    return (
      !gameOver &&
      !ball.ready &&
      !underpass.active &&
      !oceanRamp.active &&
      !loopRamp.active &&
      magneticTarget.state !== 'holding'
    );
  }

  function nearOrbit() {
    return (
      Math.abs(ball.x - CENTER_X) <= OUTER_RX + ball.radius + 14 &&
      Math.abs(ball.y - CENTER_Y) <= OUTER_RY + ball.radius + 14
    );
  }

  function scoreMultiplier() {
    return (
      typeof centerDoubleScoreRemaining !== 'undefined' &&
      centerDoubleScoreRemaining > 0
    ) ? 2 : 1;
  }

  function award(points) {
    score += points * scoreMultiplier();
    syncStatusDisplay();
  }

  function clearProgress() {
    progress.clear();
    showStartedAt = -Infinity;
    showUntil = -Infinity;
  }

  function completeOrbit() {
    const now = performance.now();
    award(COMPLETE_VALUE);
    showStartedAt = now;
    showUntil = now + SHOW_DURATION;

    window.dispatchEvent(new CustomEvent('miami-sunset-orbit-complete', {
      detail: {
        points: COMPLETE_VALUE * scoreMultiplier(),
        score
      }
    }));
  }

  function updateLampProgress() {
    const now = performance.now();
    if (now < showUntil) return;

    if (showUntil !== -Infinity) {
      progress.clear();
      showStartedAt = -Infinity;
      showUntil = -Infinity;
    }

    for (let index = 0; index < lampPositions.length; index += 1) {
      if (progress.has(index)) continue;
      const lamp = lampPositions[index];
      if (Math.hypot(ball.x - lamp.x, ball.y - lamp.y) > SENSOR_RADIUS) continue;

      progress.add(index);
      award(LAMP_VALUE);
      window.dispatchEvent(new CustomEvent('miami-sunset-orbit-lamp', {
        detail: { index, lit: progress.size, total: LAMP_COUNT, score }
      }));

      if (progress.size === LAMP_COUNT) {
        completeOrbit();
      }
      break;
    }
  }

  function updateOrbitPhysics() {
    if (!liveMainPlayfieldBall() || !nearOrbit()) return;

    for (const rail of allRails) {
      resolveSegmentCollision(rail, { x: 0, y: 0 }, 0.86);
    }

    updateLampProgress();
  }

  function drawRailSet(rails, accent, flashStrength) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.strokeStyle = '#182033';
    ctx.lineWidth = 6.2;
    ctx.beginPath();
    for (const rail of rails) {
      ctx.moveTo(rail.x1, rail.y1);
      ctx.lineTo(rail.x2, rail.y2);
    }
    ctx.stroke();

    ctx.strokeStyle = flashStrength > 0.45 ? '#f4ffff' : accent;
    ctx.lineWidth = 2.1 + flashStrength * 0.8;
    if (!window.miamiMobilePerformanceMode && flashStrength > 0.05) {
      ctx.shadowColor = accent;
      ctx.shadowBlur = 7 + flashStrength * 10;
    }
    ctx.beginPath();
    for (const rail of rails) {
      ctx.moveTo(rail.x1, rail.y1);
      ctx.lineTo(rail.x2, rail.y2);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawProgressLamps(now, flashStrength) {
    for (let index = 0; index < lampPositions.length; index += 1) {
      if (!progress.has(index)) continue;
      const lamp = lampPositions[index];
      const accent = index % 2 === 0
        ? MIAMI_COLORS.cyan
        : MIAMI_COLORS.magenta;
      const showPulse = flashStrength > 0
        ? 0.55 + 0.45 * Math.sin(now / 58 + index * 0.8)
        : 0;

      ctx.save();
      ctx.strokeStyle = flashStrength > 0 && showPulse > 0.5
        ? '#f4ffff'
        : accent;
      ctx.lineWidth = 1.8 + flashStrength * 0.8;
      if (!window.miamiMobilePerformanceMode) {
        ctx.shadowColor = accent;
        ctx.shadowBlur = flashStrength > 0 ? 10 + showPulse * 9 : 5;
      }
      ctx.globalAlpha = 0.78 + flashStrength * 0.22;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 6.8 + flashStrength * 1.2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = flashStrength > 0 && showPulse > 0.42
        ? '#f4ffff'
        : accent;
      ctx.globalAlpha = 0.78 + showPulse * 0.22;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 2.1 + flashStrength * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawOrbit() {
    const now = performance.now();
    const flashStrength = now < showUntil
      ? Math.max(0, 1 - (now - showStartedAt) / SHOW_DURATION)
      : 0;

    drawRailSet(outerRails, MIAMI_COLORS.cyan, flashStrength);
    drawRailSet(innerRails, MIAMI_COLORS.magenta, flashStrength);
    drawProgressLamps(now, flashStrength);
  }

  const baseDrawMiamiArtworkWithSunsetOrbit = drawMiamiArtwork;
  drawMiamiArtwork = function drawMiamiArtworkWithSunsetOrbit() {
    baseDrawMiamiArtworkWithSunsetOrbit();
    drawOrbit();
  };

  const baseUpdateWithSunsetOrbit = update;
  update = function updateWithSunsetOrbit(dt) {
    baseUpdateWithSunsetOrbit(dt);
    if (window.miamiGamePaused === true) return;
    updateOrbitPhysics();
  };

  window.addEventListener('miami-drain', clearProgress);

  const baseResetGameWithSunsetOrbit = resetGame;
  resetGame = function resetGameWithSunsetOrbit() {
    clearProgress();
    baseResetGameWithSunsetOrbit();
  };

  const instructions = document.querySelector('.instruction-content');
  if (instructions) {
    instructions.append(document.createTextNode(
      ' Central sunset orbit: light each of the 12 ring lamps for 100 points; complete the ring for 5000 and the sunset show.'
    ));
  }
})();
