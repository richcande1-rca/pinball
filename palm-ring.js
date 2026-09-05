// Miami Nights: twelve recessed insert lamps around the central palm/sunset motif.
// Presentation only: no collision geometry, scoring rules, or ball paths change.

(() => {
  if (window.miamiPalmRingInstalled) return;
  window.miamiPalmRingInstalled = true;

  const LAMP_COUNT = 12;
  const CENTER_X = 210;
  const CENTER_Y = 350;
  const RADIUS_X = 66;
  const RADIUS_Y = 55;
  const SOCKET_RADIUS = 5.7;
  const LAMP_RADIUS = 3.25;

  const lampPositions = Array.from({ length: LAMP_COUNT }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / LAMP_COUNT;
    return {
      x: CENTER_X + Math.cos(angle) * RADIUS_X,
      y: CENTER_Y + Math.sin(angle) * RADIUS_Y
    };
  });

  const palette = {
    cyan: MIAMI_COLORS.cyan,
    magenta: MIAMI_COLORS.magenta,
    lavender: MIAMI_COLORS.lavender,
    white: '#f4ffff'
  };

  let override = {
    kind: 'none',
    startedAt: -Infinity,
    until: -Infinity,
    origin: 0
  };

  function wrapIndex(index) {
    return ((index % LAMP_COUNT) + LAMP_COUNT) % LAMP_COUNT;
  }

  function circularDistance(a, b) {
    const direct = Math.abs(wrapIndex(a) - wrapIndex(b));
    return Math.min(direct, LAMP_COUNT - direct);
  }

  function trigger(kind, duration, origin = 0) {
    const now = performance.now();
    override = {
      kind,
      startedAt: now,
      until: now + duration,
      origin: wrapIndex(origin)
    };
  }

  function mode2xActive() {
    return (
      typeof centerDoubleScoreRemaining !== 'undefined' &&
      centerDoubleScoreRemaining > 0
    );
  }

  function appearance(color, intensity) {
    return {
      color,
      intensity: clamp(intensity, 0.08, 1)
    };
  }

  function overrideAppearance(index, now) {
    if (now >= override.until) return null;

    const age = now - override.startedAt;
    const step = Math.floor(age / 75);
    const fastStep = Math.floor(age / 55);

    switch (override.kind) {
      case 'pocket': {
        const head = wrapIndex(override.origin + step);
        const distance = circularDistance(index, head);
        const intensity = distance === 0 ? 1 : distance === 1 ? 0.58 : 0.12;
        return appearance(index % 2 ? palette.magenta : palette.cyan, intensity);
      }

      case 'pop': {
        const sparkle = (index * 5 + step * 3) % 11;
        const bright = sparkle < 3;
        const color = index % 3 === 0
          ? palette.lavender
          : index % 2
            ? palette.magenta
            : palette.cyan;
        return appearance(color, bright ? 1 : 0.16);
      }

      case 'drop': {
        const pair = wrapIndex(step * 2);
        const bright = index === pair || index === wrapIndex(pair + 6);
        return appearance(index < 6 ? palette.cyan : palette.magenta, bright ? 1 : 0.15);
      }

      case 'bank': {
        const on = Math.floor(age / 90) % 2 === 0;
        const color = index % 2 ? palette.magenta : palette.cyan;
        return appearance(on ? palette.white : color, on ? 1 : 0.42);
      }

      case 'loop': {
        const head = wrapIndex(-fastStep);
        const distance = circularDistance(index, head);
        return appearance(
          index % 2 ? palette.lavender : palette.cyan,
          distance === 0 ? 1 : distance === 1 ? 0.62 : 0.12
        );
      }

      case 'ramp': {
        const head = wrapIndex(fastStep);
        const distance = circularDistance(index, head);
        return appearance(
          index % 2 ? palette.magenta : palette.cyan,
          distance === 0 ? 1 : distance === 1 ? 0.62 : 0.12
        );
      }

      case 'spinner': {
        const headA = wrapIndex(fastStep);
        const headB = wrapIndex(headA + 6);
        const distance = Math.min(
          circularDistance(index, headA),
          circularDistance(index, headB)
        );
        return appearance(
          index % 2 ? palette.cyan : palette.magenta,
          distance === 0 ? 1 : distance === 1 ? 0.52 : 0.13
        );
      }

      case 'magnet': {
        const pulse = 0.56 + 0.44 * Math.sin(age / 58);
        const opposite = index === 3 || index === 9;
        return appearance(
          opposite ? palette.white : palette.magenta,
          opposite ? 1 : 0.28 + pulse * 0.56
        );
      }

      case 'reef': {
        const phase = Math.floor(age / 110) % 2;
        const bright = index % 2 === phase;
        return appearance(
          bright ? palette.cyan : palette.magenta,
          bright ? 1 : 0.42
        );
      }

      case 'extra': {
        const on = Math.floor(age / 70) % 2 === 0;
        return appearance(on ? palette.white : palette.cyan, on ? 1 : 0.62);
      }

      case 'two-x': {
        const phase = Math.floor(age / 100) % 2;
        const firstHalf = index < 6;
        const bright = firstHalf ? phase === 0 : phase === 1;
        return appearance(
          firstHalf ? palette.cyan : palette.magenta,
          bright ? 1 : 0.3
        );
      }

      case 'drain': {
        const bottomDistance = circularDistance(index, 6);
        const fade = Math.max(0.12, 1 - age / Math.max(1, override.until - override.startedAt));
        return appearance(
          palette.magenta,
          Math.max(0.12, fade * (1 - bottomDistance * 0.12))
        );
      }

      default:
        return null;
    }
  }

  function persistentAppearance(index, now) {
    if (gameOver) {
      const sequence = Math.floor(now / 2600) % 4;
      const step = Math.floor(now / 90);

      if (sequence === 0) {
        const head = wrapIndex(step);
        const distance = circularDistance(index, head);
        return appearance(
          index % 3 === 0 ? palette.lavender : index % 2 ? palette.magenta : palette.cyan,
          distance === 0 ? 1 : distance === 1 ? 0.58 : 0.14
        );
      }

      if (sequence === 1) {
        const head = wrapIndex(-step);
        const distance = circularDistance(index, head);
        return appearance(
          index % 2 ? palette.cyan : palette.magenta,
          distance === 0 ? 1 : distance === 1 ? 0.58 : 0.14
        );
      }

      if (sequence === 2) {
        const phase = Math.floor(now / 180) % 2;
        const bright = index % 2 === phase;
        return appearance(
          bright ? palette.white : index % 2 ? palette.magenta : palette.cyan,
          bright ? 0.92 : 0.28
        );
      }

      const headA = wrapIndex(step);
      const headB = wrapIndex(6 - step);
      const distance = Math.min(
        circularDistance(index, headA),
        circularDistance(index, headB)
      );
      return appearance(
        index < 6 ? palette.cyan : palette.magenta,
        distance === 0 ? 1 : distance === 1 ? 0.52 : 0.13
      );
    }

    if (ball.ready) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 360);
      const brightGroup = Math.floor(now / 520) % 2;
      const bright = index % 2 === brightGroup;
      return appearance(
        index % 2 ? palette.magenta : palette.cyan,
        bright ? 0.56 + pulse * 0.34 : 0.18 + pulse * 0.12
      );
    }

    if (mode2xActive()) {
      const phase = Math.floor(now / 145) % 2;
      const firstHalf = index < 6;
      const bright = firstHalf ? phase === 0 : phase === 1;
      return appearance(
        firstHalf ? palette.cyan : palette.magenta,
        bright ? 0.94 : 0.26
      );
    }

    // Normal ball-in-play state: two opposing heads travel in opposite
    // directions. This reads as "live play" without implying a specific award.
    const step = Math.floor(now / 125);
    const headA = wrapIndex(step);
    const headB = wrapIndex(6 - step);
    const distanceA = circularDistance(index, headA);
    const distanceB = circularDistance(index, headB);
    const distance = Math.min(distanceA, distanceB);
    const color = distanceA <= distanceB ? palette.cyan : palette.magenta;
    return appearance(
      color,
      distance === 0 ? 0.9 : distance === 1 ? 0.48 : 0.14
    );
  }

  function lampAppearance(index, now) {
    return overrideAppearance(index, now) || persistentAppearance(index, now);
  }

  function drawPalmRing() {
    const now = performance.now();
    const mobile = Boolean(window.miamiMobilePerformanceMode);
    const eventActive = now < override.until;

    // Socket housings never animate, so draw all twelve in one fill/stroke pass.
    ctx.save();
    ctx.fillStyle = '#02050b';
    ctx.strokeStyle = '#26364b';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (const point of lampPositions) {
      ctx.moveTo(point.x + SOCKET_RADIUS, point.y);
      ctx.arc(point.x, point.y, SOCKET_RADIUS, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    for (let index = 0; index < LAMP_COUNT; index += 1) {
      const point = lampPositions[index];
      const state = lampAppearance(index, now);
      const strongEventGlow = !mobile && eventActive && state.intensity > 0.82;

      ctx.save();
      ctx.globalAlpha = 0.28 + state.intensity * 0.72;
      ctx.fillStyle = state.color;
      ctx.strokeStyle = state.intensity > 0.82 ? palette.white : state.color;
      ctx.lineWidth = 1.1;

      // Continuous shadow blur was the expensive part. Ordinary chase / pulse
      // patterns use crisp bright inserts; only short event peaks get a glow.
      if (strongEventGlow) {
        ctx.shadowColor = state.color;
        ctx.shadowBlur = 7;
      }

      ctx.beginPath();
      ctx.arc(point.x, point.y, LAMP_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (state.intensity > 0.72) {
        ctx.shadowBlur = 0;
        ctx.globalAlpha = (state.intensity - 0.72) / 0.28;
        ctx.fillStyle = palette.white;
        ctx.beginPath();
        ctx.arc(point.x - 0.8, point.y - 0.8, 1.15, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // Draw the inserts directly after the artwork so they belong visually to the
  // sunset motif, then let the rest of the normal table geometry draw on top.
  const baseDrawMiamiArtworkWithPalmRing = drawMiamiArtwork;
  drawMiamiArtwork = function drawMiamiArtworkWithPalmRing() {
    baseDrawMiamiArtworkWithPalmRing();
    drawPalmRing();
  };

  window.addEventListener('miami-pocket-target', event => {
    const detail = event.detail || {};
    trigger('pocket', 850, 3 + Number(detail.index || 0));
  });

  window.addEventListener('miami-pop-bumper', () => {
    trigger('pop', 620);
  });

  window.addEventListener('miami-drop-target', event => {
    const detail = event.detail || {};
    trigger(detail.bankComplete ? 'bank' : 'drop', detail.bankComplete ? 1250 : 720);
  });

  window.addEventListener('miami-loop-complete', () => {
    trigger('loop', 950);
  });

  window.addEventListener('miami-ramp-enter', () => {
    trigger('ramp', 900);
  });

  window.addEventListener('miami-spinner-exit', () => {
    trigger('spinner', 1100);
  });

  window.addEventListener('miami-magnet-capture', () => {
    trigger('magnet', 900);
  });

  window.addEventListener('miami-reef-complete', () => {
    trigger('reef', 1500);
  });

  window.addEventListener('miami-impact', event => {
    const detail = event.detail || {};
    const index = Number(detail.index);

    if (detail.type === 'post' && index === 8) {
      const earnedExtra =
        typeof captiveExtraBallAwarded !== 'undefined' &&
        typeof captiveHitProgress !== 'undefined' &&
        captiveExtraBallAwarded &&
        captiveHitProgress >= 5;
      trigger(earnedExtra ? 'extra' : 'pop', earnedExtra ? 1500 : 520);
      return;
    }

    if (
      detail.type === 'post' &&
      index >= 11 &&
      index <= 13 &&
      mode2xActive()
    ) {
      trigger('two-x', 1250);
    }
  });

  window.addEventListener('miami-drain', () => {
    trigger('drain', 850, 6);
  });

  const baseResetGameWithPalmRing = resetGame;
  resetGame = function resetGameWithPalmRing() {
    override.kind = 'none';
    override.startedAt = -Infinity;
    override.until = -Infinity;
    override.origin = 0;
    baseResetGameWithPalmRing();
  };
})();
