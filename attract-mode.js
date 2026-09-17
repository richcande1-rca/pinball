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
  let firstLaunchSeen = false;

  const targets = [];

  function addCircleTarget(x, y, accent = 'cyan', radius = 7) {
    targets.push({ x, y, accent, radius, shape: 'circle' });
  }

  function addInsertTarget(x, y, accent = 'cyan', radius = 5.5) {
    targets.push({ x, y, accent, radius, shape: 'insert' });
  }

  function addRectTarget(x, y, width, height, accent = 'cyan', angle = 0) {
    targets.push({
      x,
      y,
      accent,
      shape: 'rect',
      width,
      height,
      angle
    });
  }

  function addSegmentTarget(target, accent, faceHeight = 7) {
    const dx = target.x2 - target.x1;
    const dy = target.y2 - target.y1;
    addRectTarget(
      (target.x1 + target.x2) / 2,
      (target.y1 + target.y2) / 2,
      Math.hypot(dx, dy),
      faceHeight,
      accent || target.accent || 'cyan',
      Math.atan2(dy, dx)
    );
  }

  function addSegmentGeometry(x1, y1, x2, y2, accent = 'cyan', faceHeight = 7) {
    addSegmentTarget({ x1, y1, x2, y2, accent }, accent, faceHeight);
  }

  // Real circular hardware: pop bumpers and magnetic lock.
  if (typeof popBumpers !== 'undefined') {
    for (let index = 0; index < popBumpers.length; index += 1) {
      const bumper = popBumpers[index];
      addCircleTarget(
        bumper.x,
        bumper.y,
        bumper.accent || (index % 2 ? 'magenta' : 'cyan'),
        bumper.radius + 1.2
      );
    }
  }

  if (typeof magneticTarget !== 'undefined') {
    addCircleTarget(
      magneticTarget.x,
      magneticTarget.y,
      'magenta',
      magneticTarget.radius
    );
  }

  // Upper-right secondary standups are narrow vertical faces, not circles.
  addSegmentGeometry(432, 58, 432, 74, 'cyan', 6);
  addSegmentGeometry(432, 88, 432, 104, 'magenta', 6);

  // These five are genuine circular playfield inserts. Light the insert itself.
  if (typeof upperNeonInserts !== 'undefined') {
    for (const insert of upperNeonInserts) {
      addInsertTarget(insert.x, insert.y, insert.accent || 'cyan', 5.5);
    }
  }

  // Three broad standup faces above the sunset plus the real round 2X insert.
  if (typeof centerStandupTargets !== 'undefined') {
    for (const target of centerStandupTargets) {
      addSegmentTarget(target, target.accent, 10);
    }
  }
  addInsertTarget(210, 238, 'lavender', 12);

  // Captive-ball hardware: roof edge, five actual lamps, then captive ball.
  if (typeof captiveBallRails !== 'undefined' && captiveBallRails[2]) {
    addSegmentTarget(captiveBallRails[2], 'magenta', 4);
  } else {
    addSegmentGeometry(56, 250, 84, 250, 'magenta', 4);
  }

  if (typeof captiveHitLampY !== 'undefined') {
    for (let index = 0; index < captiveHitLampY.length; index += 1) {
      addInsertTarget(
        96,
        captiveHitLampY[index],
        index % 2 === 0 ? 'cyan' : 'magenta',
        4
      );
    }
  }

  if (typeof captiveBall !== 'undefined') {
    addCircleTarget(
      captiveBall.x,
      captiveBall.maxY,
      'lavender',
      captiveBall.radius
    );
  } else {
    addCircleTarget(70, 320, 'lavender', 8);
  }

  // Five real Ocean Drive wall standups, using their exact face geometry.
  [
    [333, 210, 339, 221, 'cyan'],
    [337, 242, 340, 254, 'magenta'],
    [340, 275, 341, 288, 'lavender'],
    [342, 309, 342, 322, 'cyan'],
    [342, 344, 341, 357, 'magenta']
  ].forEach(([x1, y1, x2, y2, accent]) => {
    addSegmentGeometry(x1, y1, x2, y2, accent, 7);
  });

  // Clock lamps/pegs remain deliberately excluded. They only exist when the
  // earned CLOCK mode opens.

  // Lower/side secondary targets use their real horizontal/vertical faces.
  [
    [44, 348, 44, 364, 'magenta'],
    [44, 386, 44, 402, 'cyan'],
    [112, 430, 126, 430, 'cyan'],
    [294, 430, 308, 430, 'magenta'],
    [203, 505, 217, 505, 'lavender']
  ].forEach(([x1, y1, x2, y2, accent]) => {
    addSegmentGeometry(x1, y1, x2, y2, accent, 6);
  });

  // REEF HOTEL windows and Neon Palms are rectangular hardware.
  addRectTarget(404, 285.5, 14, 10, 'cyan');
  addRectTarget(404, 316.5, 14, 10, 'magenta');
  addRectTarget(404, 347.5, 14, 10, 'cyan');
  addRectTarget(404, 400, 8, 26, 'lavender');

  // Cafe Ocho is a real circular lock.
  addCircleTarget(403, 466, 'magenta', 12);

  // 3-0-5 follows the real upright drop-target faces.
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

    // Narrow pools preserve the ATTRACT4 dark pauses between active regions.
    const primary = angularLobe(angle - clockwise, 0.50);
    const secondary = angularLobe(angle - counterClockwise, 0.38) * 0.58;

    const rhythm = 0.90 + 0.10 * Math.sin(elapsed / 165 + angle * 1.2);
    const bloom = bloomIntensity(elapsed);
    const orbit = Math.max(primary, secondary) * rhythm;

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

    if (local < 0.72) return palette[index];
    return mixColor(
      palette[index],
      palette[nextIndex],
      (local - 0.72) / 0.28
    );
  }

  function drawSparkle(intensity, mobile) {
    if (intensity <= 0.96) return;
    const sparkle = (intensity - 0.96) / 0.04;
    ctx.globalAlpha = sparkle * 0.72;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = mobile ? 0 : 4;
    ctx.beginPath();
    ctx.arc(0, 0, 0.7 + sparkle * 0.8, 0, TWO_PI);
    ctx.fill();
  }

  function drawCircleTarget(target, intensity, accent, movingColor, mobile) {
    const radius = target.radius + intensity * 1.25;

    ctx.save();
    ctx.translate(target.x, target.y);

    ctx.globalAlpha = 0.18 + intensity * 0.80;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.4 + intensity * 1.95;
    ctx.shadowColor = accent;
    ctx.shadowBlur = mobile ? 0 : (4 + intensity * 16);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TWO_PI);
    ctx.stroke();

    ctx.globalAlpha = 0.10 + intensity * 0.52;
    ctx.strokeStyle = movingColor;
    ctx.lineWidth = 0.9 + intensity * 0.8;
    ctx.shadowColor = movingColor;
    ctx.shadowBlur = mobile ? 0 : (2 + intensity * 7);
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(1, radius - 2.2), 0, TWO_PI);
    ctx.stroke();

    drawSparkle(intensity, mobile);
    ctx.restore();
  }

  function drawInsertTarget(target, intensity, accent, movingColor, mobile) {
    ctx.save();
    ctx.translate(target.x, target.y);

    // Stay on the physical insert instead of drawing a larger ring around it.
    ctx.globalAlpha = 0.14 + intensity * 0.70;
    ctx.fillStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = mobile ? 0 : (4 + intensity * 15);
    ctx.beginPath();
    ctx.arc(0, 0, target.radius, 0, TWO_PI);
    ctx.fill();

    ctx.globalAlpha = 0.30 + intensity * 0.68;
    ctx.strokeStyle = movingColor;
    ctx.lineWidth = 1.1 + intensity * 1.0;
    ctx.shadowColor = movingColor;
    ctx.shadowBlur = mobile ? 0 : (2 + intensity * 7);
    ctx.beginPath();
    ctx.arc(0, 0, target.radius, 0, TWO_PI);
    ctx.stroke();

    drawSparkle(intensity, mobile);
    ctx.restore();
  }

  function drawRectTarget(target, intensity, accent, movingColor, mobile) {
    const expansion = 0.35 + intensity * 0.9;
    const width = target.width + expansion * 2;
    const height = target.height + expansion * 2;

    ctx.save();
    ctx.translate(target.x, target.y);
    ctx.rotate(target.angle || 0);

    // Brighten the existing face without creating a new object around it.
    ctx.globalAlpha = 0.05 + intensity * 0.18;
    ctx.fillStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = mobile ? 0 : (3 + intensity * 12);
    ctx.fillRect(-target.width / 2, -target.height / 2, target.width, target.height);

    ctx.globalAlpha = 0.22 + intensity * 0.76;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.25 + intensity * 1.7;
    ctx.shadowColor = accent;
    ctx.shadowBlur = mobile ? 0 : (4 + intensity * 16);
    ctx.strokeRect(-width / 2, -height / 2, width, height);

    ctx.globalAlpha = 0.10 + intensity * 0.48;
    ctx.strokeStyle = movingColor;
    ctx.lineWidth = 0.8 + intensity * 0.75;
    ctx.shadowColor = movingColor;
    ctx.shadowBlur = mobile ? 0 : (1 + intensity * 6);
    ctx.strokeRect(
      -target.width / 2,
      -target.height / 2,
      target.width,
      target.height
    );

    drawSparkle(intensity, mobile);
    ctx.restore();
  }

  function drawAttractTarget(target, intensity, elapsed) {
    if (intensity <= 0.025) return;

    const mobile = Boolean(window.miamiMobilePerformanceMode);
    const movingColor = rotatingColor(target, elapsed);
    const baseAccent = MIAMI_COLORS[target.accent] || MIAMI_COLORS.cyan;
    const accent = mixColor(baseAccent, movingColor, 0.70);

    if (target.shape === 'rect') {
      drawRectTarget(target, intensity, accent, movingColor, mobile);
    } else if (target.shape === 'insert') {
      drawInsertTarget(target, intensity, accent, movingColor, mobile);
    } else {
      drawCircleTarget(target, intensity, accent, movingColor, mobile);
    }
  }

  function drawAttractMode(now) {
    if (!attractActive()) return;

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
