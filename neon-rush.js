// Miami Nights: NEON RUSH spectacle mode.
// Triggered after the clock is fully cleared. This feature is presentation-only:
// no geometry, physics, drain protection, scoring multiplier, or music changes.

(() => {
  if (window.miamiNeonRushInstalled) return;
  window.miamiNeonRushInstalled = true;

  const DURATION_MS = 10000;
  const REAPPEAR_DELAY_MS = 320;
  const BEAT_MS = 1000;
  const CENTER_X = 210;
  const CENTER_Y = 350;
  const CLOCK_RADIUS_X = 66;
  const CLOCK_RADIUS_Y = 55;
  const CLOCK_LAMPS = 12;

  const state = {
    active: false,
    pendingUntil: -Infinity,
    startedAt: -Infinity,
    endsAt: -Infinity,
    lastBeatIndex: -1,
    lastImpactAt: -Infinity,
    lastImpactX: CENTER_X,
    lastImpactY: CENTER_Y
  };
  window.miamiNeonRushState = state;

  function scheduleRush() {
    const now = performance.now();
    state.active = false;
    state.pendingUntil = now + REAPPEAR_DELAY_MS;
    state.startedAt = -Infinity;
    state.endsAt = -Infinity;
    state.lastBeatIndex = -1;
  }

  function startRush(now) {
    state.active = true;
    state.pendingUntil = -Infinity;
    state.startedAt = now;
    state.endsAt = now + DURATION_MS;
    state.lastBeatIndex = -1;

    window.dispatchEvent(new CustomEvent('miami-neon-rush-start', {
      detail: { durationMs: DURATION_MS }
    }));
  }

  function stopRush(completed = false) {
    if (!state.active && !Number.isFinite(state.pendingUntil)) return;

    const wasActive = state.active;
    state.active = false;
    state.pendingUntil = -Infinity;
    state.startedAt = -Infinity;
    state.endsAt = -Infinity;
    state.lastBeatIndex = -1;

    if (wasActive) {
      window.dispatchEvent(new CustomEvent('miami-neon-rush-end', {
        detail: { completed }
      }));
    }
  }

  function updateRush(now) {
    if (!state.active && Number.isFinite(state.pendingUntil) && now >= state.pendingUntil) {
      startRush(now);
    }

    if (!state.active) return;

    if (gameOver || now >= state.endsAt) {
      stopRush(now >= state.endsAt && !gameOver);
      return;
    }

    const elapsed = now - state.startedAt;
    const beatIndex = Math.floor(elapsed / BEAT_MS);

    if (beatIndex !== state.lastBeatIndex && beatIndex >= 0 && beatIndex < 10) {
      state.lastBeatIndex = beatIndex;
      const remaining = Math.max(1, 10 - beatIndex);
      window.dispatchEvent(new CustomEvent('miami-neon-rush-beat', {
        detail: {
          beatIndex,
          remaining,
          finalCountdown: remaining <= 3
        }
      }));
    }
  }

  function rushProgress(now) {
    return clamp((now - state.startedAt) / DURATION_MS, 0, 1);
  }

  function drawRushClock(now) {
    const progress = rushProgress(now);
    const remainingSeconds = Math.max(0, (state.endsAt - now) / 1000);
    const litCount = Math.max(1, Math.ceil((1 - progress) * CLOCK_LAMPS));
    const runner = Math.floor((now - state.startedAt) / 85) % CLOCK_LAMPS;
    const mobile = Boolean(window.miamiMobilePerformanceMode);

    for (let index = 0; index < CLOCK_LAMPS; index += 1) {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / CLOCK_LAMPS;
      const x = CENTER_X + Math.cos(angle) * CLOCK_RADIUS_X;
      const y = CENTER_Y + Math.sin(angle) * CLOCK_RADIUS_Y;
      const lit = index < litCount;
      const accent = index % 2 === 0 ? MIAMI_COLORS.cyan : MIAMI_COLORS.magenta;
      const runnerHit = index === runner;

      ctx.save();
      ctx.globalAlpha = lit ? 0.82 : 0.18;
      ctx.fillStyle = runnerHit && lit ? '#ffffff' : (lit ? accent : '#09101b');
      ctx.strokeStyle = lit ? '#ffffff' : MIAMI_COLORS.structure;
      ctx.lineWidth = runnerHit && lit ? 2.2 : 1.2;
      if (!mobile && lit) {
        ctx.shadowColor = accent;
        ctx.shadowBlur = runnerHit ? 13 : 6;
      }
      ctx.beginPath();
      ctx.arc(x, y, runnerHit && lit ? 5.1 : 4.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    const pulse = 0.5 + 0.5 * Math.sin(now / 90);
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = 'rgba(1, 5, 13, 0.9)';
    ctx.strokeStyle = pulse > 0.5 ? MIAMI_COLORS.cyan : MIAMI_COLORS.magenta;
    ctx.lineWidth = 1.8;
    if (!mobile) {
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 8 + pulse * 7;
    }
    ctx.fillRect(CENTER_X - 38, CENTER_Y - 11, 76, 22);
    ctx.strokeRect(CENTER_X - 38, CENTER_Y - 11, 76, 22);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 8px ui-monospace, monospace';
    ctx.fillText('NEON RUSH', CENTER_X, CENTER_Y - 3, 68);
    ctx.font = '900 9px ui-monospace, monospace';
    ctx.fillText(`${Math.ceil(remainingSeconds)}s`, CENTER_X, CENTER_Y + 6.5);
    ctx.restore();
  }

  function drawRushPerimeter(now) {
    const mobile = Boolean(window.miamiMobilePerformanceMode);
    const beatPhase = ((now - state.startedAt) % BEAT_MS) / BEAT_MS;
    const flash = 1 - clamp(beatPhase / 0.22, 0, 1);
    const chase = Math.floor((now - state.startedAt) / 70);
    const points = [];

    for (let x = 54; x <= 426; x += 42) points.push({ x, y: 28 });
    for (let y = 92; y <= 610; y += 58) {
      points.push({ x: 24, y });
      points.push({ x: 456, y });
    }

    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      const hot = (index + chase) % 6 === 0;
      const accent = index % 2 === 0 ? MIAMI_COLORS.cyan : MIAMI_COLORS.magenta;

      ctx.save();
      ctx.globalAlpha = hot ? 0.95 : 0.28 + flash * 0.22;
      ctx.fillStyle = hot ? '#ffffff' : accent;
      if (!mobile && hot) {
        ctx.shadowColor = accent;
        ctx.shadowBlur = 9;
      }
      ctx.beginPath();
      ctx.arc(point.x, point.y, hot ? 3.2 : 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = 0.10 + flash * 0.12;
    ctx.strokeStyle = flash > 0.45 ? MIAMI_COLORS.magenta : MIAMI_COLORS.cyan;
    ctx.lineWidth = 2 + flash * 2;
    if (!mobile) {
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 9;
    }
    for (const [x, y] of [[24, 28], [456, 28], [24, 636], [456, 636]]) {
      ctx.beginPath();
      ctx.moveTo(CENTER_X, CENTER_Y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRushImpact(now) {
    const age = now - state.lastImpactAt;
    if (age < 0 || age >= 180) return;

    const strength = 1 - age / 180;
    ctx.save();
    ctx.globalAlpha = strength * 0.72;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 + strength * 2;
    ctx.shadowColor = strength > 0.5 ? MIAMI_COLORS.cyan : MIAMI_COLORS.magenta;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 10;
    ctx.beginPath();
    ctx.arc(
      state.lastImpactX,
      state.lastImpactY,
      6 + (1 - strength) * 18,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.restore();
  }

  function drawNeonRush() {
    if (!state.active) return;
    const now = performance.now();
    drawRushPerimeter(now);
    drawRushClock(now);
    drawRushImpact(now);
  }

  window.addEventListener('miami-clock-complete', scheduleRush);

  window.addEventListener('miami-impact', event => {
    if (!state.active) return;
    const detail = event.detail || {};
    if (!Number.isFinite(detail.x) || !Number.isFinite(detail.y)) return;
    state.lastImpactAt = performance.now();
    state.lastImpactX = detail.x;
    state.lastImpactY = detail.y;
  });

  const baseUpdateWithNeonRush = update;
  update = function updateWithNeonRush(dt) {
    baseUpdateWithNeonRush(dt);
    updateRush(performance.now());
  };

  const baseDrawPassiveGeometryWithNeonRush = drawPassivePlayfieldGeometry;
  drawPassivePlayfieldGeometry = function drawPassiveGeometryWithNeonRush() {
    baseDrawPassiveGeometryWithNeonRush();
    drawNeonRush();
  };

  const baseResetGameWithNeonRush = resetGame;
  resetGame = function resetGameWithNeonRush() {
    stopRush(false);
    baseResetGameWithNeonRush();
  };
})();
