// Miami Nights: startup attract lighting only.
// No target state, scoring, collisions, physics or gameplay rules are changed.

(() => {
  if (window.miamiAttractModeInstalled) return;
  window.miamiAttractModeInstalled = true;

  const BEAT_MS = 260;
  const BEAT_COUNT = 10;
  const ALL_FLASH_BEAT = 8;
  const REST_BEAT = 9;

  let attractStartedAt = performance.now();
  let firstLaunchSeen = false;

  const targets = [];

  function addTarget(x, y, beat, accent = 'cyan', radius = 7) {
    targets.push({ x, y, beat, accent, radius });
  }

  function addSegmentTarget(target, beat, accent, radius = 7) {
    addTarget(
      (target.x1 + target.x2) / 2,
      (target.y1 + target.y2) / 2,
      beat,
      accent || target.accent || 'cyan',
      radius
    );
  }

  // Top skill area: circle pops, upper-right standups, magnetic lock.
  if (typeof popBumpers !== 'undefined') {
    for (let index = 0; index < popBumpers.length; index += 1) {
      const bumper = popBumpers[index];
      const beat = index < 3 ? 1 : 2;
      addTarget(
        bumper.x,
        bumper.y,
        beat,
        bumper.accent || (index % 2 ? 'magenta' : 'cyan'),
        bumper.radius + 3
      );
    }
  }

  if (typeof magneticTarget !== 'undefined') {
    addTarget(magneticTarget.x, magneticTarget.y, 0, 'magenta', magneticTarget.radius + 2);
  }

  // Upper-right pair from secondary-targets.js.
  addTarget(432, 66, 0, 'cyan', 7);
  addTarget(432, 96, 0, 'magenta', 7);

  // Five upper inserts that already form a natural left-to-right light bank.
  if (typeof upperNeonInserts !== 'undefined') {
    for (let index = 0; index < upperNeonInserts.length; index += 1) {
      const insert = upperNeonInserts[index];
      addTarget(insert.x, insert.y, 2, insert.accent || 'cyan', 7.5);
    }
  }

  // Three upper field barricades and their 2X insert.
  if (typeof centerStandupTargets !== 'undefined') {
    for (const target of centerStandupTargets) {
      addSegmentTarget(target, 3, target.accent, 8);
    }
  }
  addTarget(210, 238, 3, 'lavender', 9);

  // Captive-ball cage: roof, five progress lamps, and the captive itself.
  addTarget(70, 250, 3, 'magenta', 9);
  if (typeof captiveHitLampY !== 'undefined') {
    for (let index = 0; index < captiveHitLampY.length; index += 1) {
      addTarget(
        70,
        captiveHitLampY[index],
        4,
        index % 2 === 0 ? 'cyan' : 'magenta',
        6.5
      );
    }
  }
  addTarget(70, 320, 4, 'lavender', 10);

  // Five Ocean Drive wall standups from pocket-targets.js.
  [
    [336, 215.5, 'cyan'],
    [338.5, 248, 'magenta'],
    [340.5, 281.5, 'lavender'],
    [342, 315.5, 'cyan'],
    [341.5, 350.5, 'magenta']
  ].forEach(([x, y, accent], index) => {
    addTarget(x, y, index < 2 ? 3 : 5, accent, 7);
  });

  // Twelve clock positions get a full attract sweep even before CLOCK mode opens.
  for (let lampIndex = 0; lampIndex < 12; lampIndex += 1) {
    const angle = -Math.PI / 2 + lampIndex * Math.PI * 2 / 12;
    addTarget(
      210 + Math.cos(angle) * 66,
      350 + Math.sin(angle) * 55,
      lampIndex < 6 ? 4 : 5,
      lampIndex % 2 === 0 ? 'cyan' : 'magenta',
      6.5
    );
  }

  // Lower/side secondary target bank.
  [
    [44, 356, 'magenta', 5],
    [44, 394, 'cyan', 5],
    [119, 430, 'cyan', 6],
    [301, 430, 'magenta', 6],
    [210, 505, 'lavender', 6]
  ].forEach(([x, y, accent, beat]) => addTarget(x, y, beat, accent, 7));

  // REEF HOTEL windows, Neon Palms spinner, and Cafe Ocho lock.
  addTarget(409, 285.5, 4, 'cyan', 7);
  addTarget(409, 316.5, 5, 'magenta', 7);
  addTarget(409, 347.5, 5, 'cyan', 7);
  addTarget(404, 400, 6, 'lavender', 9);
  addTarget(403, 466, 7, 'magenta', 11);

  // 3-0-5 bank follows the real current target centers.
  if (typeof dropTargets !== 'undefined') {
    for (let index = 0; index < dropTargets.length; index += 1) {
      const target = dropTargets[index];
      addSegmentTarget(
        target,
        7,
        target.accent || (index % 2 ? 'lavender' : 'cyan'),
        7
      );
    }
  }

  function resetAttractMode() {
    firstLaunchSeen = false;
    attractStartedAt = performance.now();
  }

  window.addEventListener('miami-game-start', () => {
    if (ballNumber === 1 && ball.ready && !gameOver) resetAttractMode();
  });

  const baseResetGameWithAttractMode = resetGame;
  resetGame = function resetGameWithAttractMode() {
    resetAttractMode();
    baseResetGameWithAttractMode();
  };

  function attractActive() {
    if (window.miamiGameStarted !== true || gameOver || ballNumber !== 1) return false;
    if (firstLaunchSeen) return false;

    if (!ball.ready) {
      firstLaunchSeen = true;
      return false;
    }

    return true;
  }

  function targetIntensity(targetBeat, beat, phase) {
    if (beat === REST_BEAT) return 0;

    if (beat === ALL_FLASH_BEAT) {
      return 0.48 + 0.52 * Math.sin(Math.PI * phase);
    }

    if (targetBeat === beat) {
      return 0.42 + 0.58 * Math.sin(Math.PI * phase);
    }

    const previousBeat = (beat - 1 + BEAT_COUNT) % BEAT_COUNT;
    if (targetBeat === previousBeat && phase < 0.18) {
      return 0.26 * (1 - phase / 0.18);
    }

    return 0;
  }

  function drawAttractTarget(target, intensity) {
    if (intensity <= 0) return;

    const accent = MIAMI_COLORS[target.accent] || MIAMI_COLORS.cyan;
    const mobile = Boolean(window.miamiMobilePerformanceMode);
    const radius = target.radius + intensity * 3.5;

    ctx.save();
    ctx.globalAlpha = 0.24 + intensity * 0.72;
    ctx.strokeStyle = intensity > 0.82 ? '#ffffff' : accent;
    ctx.lineWidth = 1.5 + intensity * 1.8;
    ctx.shadowColor = accent;
    ctx.shadowBlur = mobile ? 0 : (4 + intensity * 14);
    ctx.beginPath();
    ctx.arc(target.x, target.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.12 + intensity * 0.72;
    ctx.fillStyle = intensity > 0.76 ? '#f4ffff' : accent;
    ctx.shadowBlur = mobile ? 0 : (2 + intensity * 8);
    ctx.beginPath();
    ctx.arc(target.x, target.y, 1.4 + intensity * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawAttractMode(now) {
    if (!attractActive()) return;

    const elapsed = Math.max(0, now - attractStartedAt);
    const beatPosition = (elapsed / BEAT_MS) % BEAT_COUNT;
    const beat = Math.floor(beatPosition);
    const phase = beatPosition - beat;

    for (const target of targets) {
      drawAttractTarget(target, targetIntensity(target.beat, beat, phase));
    }
  }

  const baseDrawWithAttractMode = draw;
  draw = function drawWithAttractMode() {
    baseDrawWithAttractMode();
    drawAttractMode(performance.now());
  };
})();
