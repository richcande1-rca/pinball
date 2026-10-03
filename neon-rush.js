// Miami Nights: NEON RUSH scoring + spectacle mode.
// Triggered after the clock is fully cleared. Fifteen seconds of intensified
// table presentation and a separate bonus pot that mirrors points scored during
// the rush. No geometry, physics, drain protection, or music changes.

(() => {
  if (window.miamiNeonRushInstalled) return;
  window.miamiNeonRushInstalled = true;

  const DURATION_MS = 15000;
  const REAPPEAR_DELAY_MS = 320;
  const BEAT_MS = 1000;
  const CENTER_X = 210;
  const CENTER_Y = 350;
  const CLOCK_RADIUS_X = 66;
  const CLOCK_RADIUS_Y = 55;
  const CLOCK_LAMPS = 12;

  const PERIMETER_POINTS = [];
  for (let x = 48; x <= 432; x += 32) {
    PERIMETER_POINTS.push({ x, y: 28 });
  }
  for (let y = 76; y <= 620; y += 44) {
    PERIMETER_POINTS.push({ x: 24, y });
    PERIMETER_POINTS.push({ x: 456, y });
  }

  const DISCO_RAY_COUNT = 8;
  const DISCO_RING_COUNT = 4;

  const state = {
    active: false,
    pendingUntil: -Infinity,
    startedAt: -Infinity,
    endsAt: -Infinity,
    lastBeatIndex: -1,
    lastImpactAt: -Infinity,
    lastImpactX: CENTER_X,
    lastImpactY: CENTER_Y,
    bonusPot: 0,
    lastScoreSeen: 0,
    cashoutFlashStartedAt: -Infinity,
    lastCashout: 0
  };
  window.miamiNeonRushState = state;

  function scheduleRush() {
    const now = performance.now();
    state.active = false;
    state.pendingUntil = now + REAPPEAR_DELAY_MS;
    state.startedAt = -Infinity;
    state.endsAt = -Infinity;
    state.lastBeatIndex = -1;
    state.bonusPot = 0;
    state.lastScoreSeen = score;
  }

  function startRush(now) {
    state.active = true;
    state.pendingUntil = -Infinity;
    state.startedAt = now;
    state.endsAt = now + DURATION_MS;
    state.lastBeatIndex = -1;
    state.bonusPot = 0;
    state.lastScoreSeen = score;

    window.dispatchEvent(new CustomEvent('miami-neon-rush-start', {
      detail: { durationMs: DURATION_MS }
    }));
  }

  function cashOutRush(now) {
    const payout = Math.max(0, Math.round(state.bonusPot));
    state.lastCashout = payout;
    state.cashoutFlashStartedAt = now;

    if (payout > 0) {
      score += payout;
      syncStatusDisplay();
    }

    window.dispatchEvent(new CustomEvent('miami-neon-rush-cashout', {
      detail: { bonus: payout }
    }));
  }

  function stopRush({ cashOut = false, completed = false } = {}) {
    if (!state.active && !Number.isFinite(state.pendingUntil)) return;

    const wasActive = state.active;
    const now = performance.now();

    state.active = false;
    state.pendingUntil = -Infinity;
    state.startedAt = -Infinity;
    state.endsAt = -Infinity;
    state.lastBeatIndex = -1;

    if (wasActive && cashOut) cashOutRush(now);

    if (wasActive) {
      window.dispatchEvent(new CustomEvent('miami-neon-rush-end', {
        detail: {
          completed,
          bonus: state.lastCashout
        }
      }));
    }
  }

  function recordRushScore(scoreBefore) {
    if (!state.active) return;
    if (score > scoreBefore) {
      state.bonusPot += score - scoreBefore;
    }
    state.lastScoreSeen = score;
  }

  function updateRush(now) {
    if (!state.active && Number.isFinite(state.pendingUntil) && now >= state.pendingUntil) {
      startRush(now);
    }

    if (!state.active) return;

    if (gameOver) {
      stopRush({ cashOut: true, completed: false });
      return;
    }

    if (now >= state.endsAt) {
      stopRush({ cashOut: true, completed: true });
      return;
    }

    const elapsed = now - state.startedAt;
    const beatIndex = Math.floor(elapsed / BEAT_MS);
    const totalBeats = Math.ceil(DURATION_MS / BEAT_MS);

    if (
      beatIndex !== state.lastBeatIndex &&
      beatIndex >= 0 &&
      beatIndex < totalBeats
    ) {
      state.lastBeatIndex = beatIndex;
      const remaining = Math.max(1, totalBeats - beatIndex);
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

  function drawDiscoWash(now) {
    const mobile = Boolean(window.miamiReducedRenderEffects);
    const wave = 0.5 + 0.5 * Math.sin(now / 260);
    const inverse = 1 - wave;
    const baseAlpha = mobile ? 0.028 : 0.045;

    ctx.save();
    ctx.globalCompositeOperation = mobile ? 'source-over' : 'screen';

    ctx.globalAlpha = baseAlpha + wave * (mobile ? 0.025 : 0.04);
    ctx.fillStyle = MIAMI_COLORS.magenta;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalAlpha = baseAlpha + inverse * (mobile ? 0.025 : 0.04);
    ctx.fillStyle = MIAMI_COLORS.cyan;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.restore();
  }

  function drawDiscoRays(now) {
    const mobile = Boolean(window.miamiReducedRenderEffects);
    const elapsed = now - state.startedAt;
    const rotation = elapsed / 820;
    const rayCount = mobile ? 4 : DISCO_RAY_COUNT;
    const reach = 520;

    ctx.save();
    ctx.globalCompositeOperation = mobile ? 'source-over' : 'screen';
    ctx.lineCap = 'round';

    for (let index = 0; index < rayCount; index += 1) {
      const angle = rotation + index * Math.PI * 2 / rayCount;
      const accent = index % 2 === 0 ? MIAMI_COLORS.cyan : MIAMI_COLORS.magenta;
      const wave = 0.5 + 0.5 * Math.sin(elapsed / 180 + index * 0.9);

      ctx.globalAlpha = (mobile ? 0.07 : 0.10) + wave * (mobile ? 0.05 : 0.08);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 5 + wave * 7;
      if (!mobile) {
        ctx.shadowColor = accent;
        ctx.shadowBlur = 10 + wave * 10;
      }

      ctx.beginPath();
      ctx.moveTo(CENTER_X, CENTER_Y);
      ctx.lineTo(
        CENTER_X + Math.cos(angle) * reach,
        CENTER_Y + Math.sin(angle) * reach
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawDiscoRings(now) {
    const mobile = Boolean(window.miamiReducedRenderEffects);
    const elapsed = now - state.startedAt;

    for (let index = 0; index < DISCO_RING_COUNT; index += 1) {
      const phase = ((elapsed / 1000) + index / DISCO_RING_COUNT) % 1;
      const accent = index % 2 === 0 ? MIAMI_COLORS.magenta : MIAMI_COLORS.cyan;

      ctx.save();
      ctx.globalAlpha = (1 - phase) * (mobile ? 0.22 : 0.34);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5 + (1 - phase) * 2;
      if (!mobile) {
        ctx.shadowColor = accent;
        ctx.shadowBlur = 7;
      }
      ctx.beginPath();
      ctx.ellipse(
        CENTER_X,
        CENTER_Y,
        CLOCK_RADIUS_X + 8 + phase * 74,
        CLOCK_RADIUS_Y + 7 + phase * 60,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawOpeningTakeover(now) {
    const age = now - state.startedAt;
    if (age < 0 || age > 1150) return;

    const mobile = Boolean(window.miamiReducedRenderEffects);
    const progress = age / 1150;
    const strength = 1 - progress;

    ctx.save();
    ctx.globalAlpha = strength * (mobile ? 0.16 : 0.24);
    ctx.fillStyle = progress < 0.5 ? MIAMI_COLORS.cyan : MIAMI_COLORS.magenta;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = clamp(strength * 1.3, 0, 1);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 28px ui-monospace, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = progress < 0.5 ? MIAMI_COLORS.magenta : MIAMI_COLORS.cyan;
    ctx.lineWidth = 1.8;
    if (!mobile) {
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 16;
    }
    ctx.strokeText('NEON RUSH', PLAYFIELD_CENTER, 168, 270);
    ctx.fillText('NEON RUSH', PLAYFIELD_CENTER, 168, 270);
    ctx.restore();
  }

  function drawRushClock(now) {
    const progress = rushProgress(now);
    const remainingSeconds = Math.max(0, (state.endsAt - now) / 1000);
    const litCount = Math.max(1, Math.ceil((1 - progress) * CLOCK_LAMPS));
    const runner = Math.floor((now - state.startedAt) / 90) % CLOCK_LAMPS;
    const runner2 = (runner + 6) % CLOCK_LAMPS;
    const mobile = Boolean(window.miamiReducedRenderEffects);

    for (let index = 0; index < CLOCK_LAMPS; index += 1) {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / CLOCK_LAMPS;
      const x = CENTER_X + Math.cos(angle) * CLOCK_RADIUS_X;
      const y = CENTER_Y + Math.sin(angle) * CLOCK_RADIUS_Y;
      const lit = index < litCount;
      const accent = index % 2 === 0 ? MIAMI_COLORS.cyan : MIAMI_COLORS.magenta;
      const runnerHit = index === runner || index === runner2;

      ctx.save();
      ctx.globalAlpha = lit ? 0.92 : 0.16;
      ctx.fillStyle = runnerHit && lit ? '#ffffff' : (lit ? accent : '#09101b');
      ctx.strokeStyle = lit ? '#ffffff' : MIAMI_COLORS.structure;
      ctx.lineWidth = runnerHit && lit ? 2.5 : 1.3;
      if (!mobile && lit) {
        ctx.shadowColor = accent;
        ctx.shadowBlur = runnerHit ? 16 : 8;
      }
      ctx.beginPath();
      ctx.arc(x, y, runnerHit && lit ? 5.5 : 4.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    const pulse = 0.5 + 0.5 * Math.sin(now / 95);
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = 'rgba(1, 5, 13, 0.92)';
    ctx.strokeStyle = pulse > 0.5 ? MIAMI_COLORS.cyan : MIAMI_COLORS.magenta;
    ctx.lineWidth = 1.8;
    if (!mobile) {
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 9 + pulse * 8;
    }
    ctx.fillRect(CENTER_X - 43, CENTER_Y - 16, 86, 32);
    ctx.strokeRect(CENTER_X - 43, CENTER_Y - 16, 86, 32);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = '900 8px ui-monospace, monospace';
    ctx.fillText('NEON RUSH', CENTER_X, CENTER_Y - 8, 76);

    ctx.font = '900 10px ui-monospace, monospace';
    ctx.fillText(`${Math.ceil(remainingSeconds)}s`, CENTER_X, CENTER_Y + 1.5);

    ctx.font = '800 7px ui-monospace, monospace';
    ctx.fillStyle = pulse > 0.55 ? MIAMI_COLORS.cyan : MIAMI_COLORS.magenta;
    ctx.fillText(`BONUS +${Math.round(state.bonusPot)}`, CENTER_X, CENTER_Y + 11, 78);
    ctx.restore();
  }

  function drawRushPerimeter(now) {
    const mobile = Boolean(window.miamiReducedRenderEffects);
    const elapsed = now - state.startedAt;
    const beatPhase = (elapsed % BEAT_MS) / BEAT_MS;
    const beatFlash = 1 - clamp(beatPhase / 0.24, 0, 1);
    const chasePhase = elapsed / 135;

    for (let index = 0; index < PERIMETER_POINTS.length; index += 1) {
      const point = PERIMETER_POINTS[index];
      const accent = index % 2 === 0 ? MIAMI_COLORS.cyan : MIAMI_COLORS.magenta;
      const wave = 0.5 + 0.5 * Math.sin(chasePhase - index * 0.78);
      const hot = wave > 0.82;

      ctx.save();
      ctx.globalAlpha = 0.24 + wave * 0.72;
      ctx.fillStyle = hot ? '#ffffff' : accent;
      if (!mobile && hot) {
        ctx.shadowColor = accent;
        ctx.shadowBlur = 11;
      }
      ctx.beginPath();
      ctx.arc(point.x, point.y, 1.8 + wave * 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = 0.16 + beatFlash * 0.18;
    ctx.strokeStyle = beatFlash > 0.48 ? MIAMI_COLORS.magenta : MIAMI_COLORS.cyan;
    ctx.lineWidth = 2 + beatFlash * 2.5;
    if (!mobile) {
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 10;
    }
    ctx.strokeRect(TABLE.left + 4, TABLE.top + 4, TABLE.right - TABLE.left - 8, 612);
    ctx.restore();
  }

  function drawRushImpact(now) {
    const age = now - state.lastImpactAt;
    if (age < 0 || age >= 230) return;

    const strength = 1 - age / 230;
    ctx.save();
    ctx.globalAlpha = strength * 0.82;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 + strength * 2.5;
    ctx.shadowColor = strength > 0.5 ? MIAMI_COLORS.cyan : MIAMI_COLORS.magenta;
    ctx.shadowBlur = window.miamiReducedRenderEffects ? 0 : 13;
    ctx.beginPath();
    ctx.arc(
      state.lastImpactX,
      state.lastImpactY,
      7 + (1 - strength) * 22,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.restore();
  }

  function drawCashout(now) {
    const age = now - state.cashoutFlashStartedAt;
    if (age < 0 || age >= 1800 || state.lastCashout <= 0) return;

    const progress = age / 1800;
    const strength = 1 - progress;
    const mobile = Boolean(window.miamiReducedRenderEffects);

    ctx.save();
    ctx.globalAlpha = clamp(strength * 1.25, 0, 1);
    ctx.fillStyle = 'rgba(1, 5, 13, 0.9)';
    ctx.strokeStyle = progress < 0.5 ? MIAMI_COLORS.cyan : MIAMI_COLORS.magenta;
    ctx.lineWidth = 2;
    if (!mobile) {
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 12;
    }
    ctx.fillRect(PLAYFIELD_CENTER - 82, 316, 164, 42);
    ctx.strokeRect(PLAYFIELD_CENTER - 82, 316, 164, 42);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 11px ui-monospace, monospace';
    ctx.fillText('NEON RUSH CASHOUT', PLAYFIELD_CENTER, 329, 150);
    ctx.font = '900 14px ui-monospace, monospace';
    ctx.fillText(`+${state.lastCashout}`, PLAYFIELD_CENTER, 346, 150);
    ctx.restore();
  }

  function drawNeonRush() {
    const now = performance.now();

    if (state.active) {
      drawDiscoWash(now);
      drawDiscoRays(now);
      drawDiscoRings(now);
      drawRushPerimeter(now);
      drawRushClock(now);
      drawRushImpact(now);
      drawOpeningTakeover(now);
    }

    drawCashout(now);
  }

  window.miamiTestStartNeonRush = function miamiTestStartNeonRush() {
    if (!window.miamiTestModeActive) return false;

    state.active = false;
    state.pendingUntil = -Infinity;
    state.startedAt = -Infinity;
    state.endsAt = -Infinity;
    state.lastBeatIndex = -1;
    state.bonusPot = 0;
    state.lastScoreSeen = score;
    startRush(performance.now());
    return true;
  };

  window.addEventListener('miami-clock-complete', event => {
    const stage = Number(event.detail?.stage || 1);
    if (stage === 1) scheduleRush();
  });

  window.addEventListener('miami-drain', () => {
    stopRush({ cashOut: false, completed: false });
    state.bonusPot = 0;
    state.lastCashout = 0;
    state.cashoutFlashStartedAt = -Infinity;
  });

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
    const wasActive = state.active;
    const scoreBefore = score;

    baseUpdateWithNeonRush(dt);

    if (wasActive && state.active) {
      recordRushScore(scoreBefore);
    }

    updateRush(performance.now());
  };

  const baseDrawPassiveGeometryWithNeonRush = drawPassivePlayfieldGeometry;
  drawPassivePlayfieldGeometry = function drawPassiveGeometryWithNeonRush() {
    baseDrawPassiveGeometryWithNeonRush();
    drawNeonRush();
  };

  const baseResetGameWithNeonRush = resetGame;
  resetGame = function resetGameWithNeonRush() {
    stopRush({ cashOut: false, completed: false });
    state.bonusPot = 0;
    state.lastCashout = 0;
    state.cashoutFlashStartedAt = -Infinity;
    baseResetGameWithNeonRush();
  };
})();
