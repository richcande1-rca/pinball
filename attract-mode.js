// Miami Nights: startup attract lighting only.
// No target state, scoring, collisions, physics or gameplay rules are changed.

(() => {
  if (window.miamiAttractModeInstalled) return;
  window.miamiAttractModeInstalled = true;

  const CENTER_X = 210;
  const CENTER_Y = 350;
  const ORBIT_MS = 5600;
  const COLOR_MS = 9200;
  const BLOOM_MS = 7600;
  const TWO_PI = Math.PI * 2;

  let attractStartedAt = performance.now();
  let newGameWasLit = false;

  const targets = [];

  function addTarget(x, y, accent = 'cyan', radius = 7) {
    targets.push({ x, y, accent, radius });
  }

  function addSegmentTarget(target, accent, radius = 7) {
    addTarget(
      (target.x1 + target.x2) / 2,
      (target.y1 + target.y2) / 2,
      accent || target.accent || 'cyan',
      radius
    );
  }

  // Top skill area: circle pops, underpass pops, upper-right standups, magnet.
  if (typeof popBumpers !== 'undefined') {
    for (let index = 0; index < popBumpers.length; index += 1) {
      const bumper = popBumpers[index];
      addTarget(
        bumper.x,
        bumper.y,
        bumper.accent || (index % 2 ? 'magenta' : 'cyan'),
        bumper.radius + 3
      );
    }
  }

  if (typeof magneticTarget !== 'undefined') {
    addTarget(
      magneticTarget.x,
      magneticTarget.y,
      'magenta',
      magneticTarget.radius + 2
    );
  }

  addTarget(432, 66, 'cyan', 7);
  addTarget(432, 96, 'magenta', 7);

  // Keep the center cluster above CLOCK free of attract overlays. The five
  // upper inserts, three center standups and 2X insert already draw themselves;
  // double-lighting them reads as phantom targets during startup.

  // Captive-ball cage: roof, five progress lamps, and captive itself.
  addTarget(70, 250, 'magenta', 9);
  // Captive progress lamps already draw themselves at x=96. Do not add a
  // second attract overlay at the historical x=70 position.
  addTarget(70, 320, 'lavender', 10);

  // Ocean Drive wall standups.
  [
    [336, 215.5, 'cyan'],
    [338.5, 248, 'magenta'],
    [340.5, 281.5, 'lavender'],
    [342, 315.5, 'cyan'],
    [341.5, 350.5, 'magenta']
  ].forEach(([x, y, accent]) => addTarget(x, y, accent, 7));

  // Clock lamps/pegs are deliberately excluded here. They are not physical
  // startup targets and should only appear when the earned CLOCK mode opens.

  // Lower/side secondary target bank.
  [
    [44, 356, 'magenta'],
    [44, 394, 'cyan'],
    [119, 430, 'cyan'],
    [301, 430, 'magenta'],
    [210, 505, 'lavender']
  ].forEach(([x, y, accent]) => addTarget(x, y, accent, 7));

  // REEF HOTEL windows, Neon Palms spinner, and Cafe Ocho lock.
  addTarget(409, 285.5, 'cyan', 7);
  addTarget(409, 316.5, 'magenta', 7);
  addTarget(409, 347.5, 'cyan', 7);
  addTarget(404, 400, 'lavender', 9);
  addTarget(403, 466, 'magenta', 11);

  // 3-0-5 bank follows the real current target centers.
  if (typeof dropTargets !== 'undefined') {
    for (let index = 0; index < dropTargets.length; index += 1) {
      const target = dropTargets[index];
      addSegmentTarget(
        target,
        target.accent || (index % 2 ? 'lavender' : 'cyan'),
        7
      );
    }
  }

  function attractActive(now) {
    const newGameLit =
      window.miamiGameStarted === true &&
      gameOver === true;

    if (newGameLit && !newGameWasLit) {
      attractStartedAt = now;
    }

    newGameWasLit = newGameLit;
    return newGameLit;
  }

  function wrapAngle(angle) {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
  }

  function targetAngle(target) {
    // Slight vertical compression makes the orbit read circular on the tall table.
    return Math.atan2(
      (target.y - CENTER_Y) * 0.82,
      target.x - CENTER_X
    );
  }

  function angularLobe(angleDifference, width) {
    const normalized = Math.abs(wrapAngle(angleDifference)) / width;
    if (normalized >= 1) return 0;
    const cosine = Math.cos(normalized * Math.PI / 2);
    return cosine * cosine;
  }

  function bloomIntensity(elapsed) {
    const phase = (elapsed % BLOOM_MS) / BLOOM_MS;
    const start = 0.80;
    const end = 0.90;
    if (phase < start || phase > end) return 0;
    return Math.sin((phase - start) / (end - start) * Math.PI);
  }

  function targetIntensity(target, elapsed) {
    const angle = targetAngle(target);
    const clockwise = elapsed / ORBIT_MS * TWO_PI;
    const counterClockwise = Math.PI - clockwise * 0.68;

    // Narrower lobes leave genuine dark space between illuminated regions.
    const primary = angularLobe(angle - clockwise, 0.50);
    const secondary = angularLobe(angle - counterClockwise, 0.38) * 0.58;

    const rhythm = 0.90 + 0.10 * Math.sin(elapsed / 165 + angle * 1.2);
    const bloom = bloomIntensity(elapsed);
    const orbit = Math.max(primary, secondary) * rhythm;

    // The whole-table breath is intentionally restrained; it should never
    // erase the dark pauses created by the narrower orbiting pools.
    return clamp(Math.max(orbit, bloom * 0.38), 0, 1);
  }

  function colorToRgb(color) {
    const value = String(color).trim();
    const hex = value.match(/^#([0-9a-f]{6})$/i);
    if (hex) {
      return {
        r: parseInt(hex[1].slice(0, 2), 16),
        g: parseInt(hex[1].slice(2, 4), 16),
        b: parseInt(hex[1].slice(4, 6), 16)
      };
    }

    const rgb = value.match(
      /^rgb\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*\)$/i
    );
    if (rgb) {
      return {
        r: clamp(Number(rgb[1]), 0, 255),
        g: clamp(Number(rgb[2]), 0, 255),
        b: clamp(Number(rgb[3]), 0, 255)
      };
    }

    return { r: 255, g: 255, b: 255 };
  }

  function mixColor(from, to, amount) {
    const a = colorToRgb(from);
    const b = colorToRgb(to);
    const t = clamp(amount, 0, 1);
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);
    return `rgb(${r}, ${g}, ${bl})`;
  }

  function rotatingColor(target, elapsed) {
    const palette = [
      MIAMI_COLORS.cyan,
      MIAMI_COLORS.magenta,
      MIAMI_COLORS.lavender
    ];
    const anglePhase = (targetAngle(target) + Math.PI) / TWO_PI;
    const cycle = (elapsed / COLOR_MS + anglePhase) % 1;
    const position = cycle * palette.length;
    const index = Math.floor(position) % palette.length;
    const local = position - Math.floor(position);
    const nextIndex = (index + 1) % palette.length;

    // Hold each color for most of its sector, then crossfade briefly. This keeps
    // cyan and magenta visually distinct instead of washing everything together.
    if (local < 0.72) return palette[index];
    return mixColor(
      palette[index],
      palette[nextIndex],
      (local - 0.72) / 0.28
    );
  }

  function drawAttractTarget(target, intensity, elapsed) {
    if (intensity <= 0.025) return;

    const mobile = Boolean(window.miamiMobilePerformanceMode);
    const movingColor = rotatingColor(target, elapsed);
    const baseAccent = MIAMI_COLORS[target.accent] || MIAMI_COLORS.cyan;
    const accent = mixColor(baseAccent, movingColor, 0.62);
    const radius = target.radius + intensity * 3.2;
    const sparkle = intensity > 0.94;

    ctx.save();
    ctx.globalAlpha = 0.18 + intensity * 0.80;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.4 + intensity * 2.0;
    ctx.shadowColor = accent;
    ctx.shadowBlur = mobile ? 0 : (4 + intensity * 16);
    ctx.beginPath();
    ctx.arc(target.x, target.y, radius, 0, TWO_PI);
    ctx.stroke();

    ctx.globalAlpha = 0.12 + intensity * 0.66;
    ctx.strokeStyle = movingColor;
    ctx.lineWidth = 1.0 + intensity * 1.05;
    ctx.shadowBlur = mobile ? 0 : (2 + intensity * 8);
    ctx.beginPath();
    ctx.arc(target.x, target.y, radius + 2.6 + intensity * 1.4, 0, TWO_PI);
    ctx.stroke();

    // White is now only a tiny peak sparkle; the visible rings stay colored.
    ctx.globalAlpha = 0.18 + intensity * 0.72;
    ctx.fillStyle = sparkle ? '#ffffff' : accent;
    ctx.shadowBlur = mobile ? 0 : (2 + intensity * 9);
    ctx.beginPath();
    ctx.arc(target.x, target.y, 1.1 + intensity * 1.9, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }

  function drawAttractMode(now) {
    if (!attractActive(now)) return;

    const elapsed = Math.max(0, now - attractStartedAt);
    for (const target of targets) {
      drawAttractTarget(target, targetIntensity(target, elapsed), elapsed);
    }
  }

  const baseDrawWithAttractMode = draw;
  draw = function drawWithAttractMode() {
    baseDrawWithAttractMode();
    drawAttractMode(performance.now());
  };
})();
