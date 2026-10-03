// Miami Nights: MIDNIGHT RUN story climax and encore loop.
// First pass: Clock #1 -> Neon Rush -> Clock #2 -> Midnight Run.
// Clearing Midnight re-arms the clock; encore passes use
// Clock -> Neon Rush -> Midnight Run. Midnight #2 and later automatically use
// the proven two-ball multiball lifecycle and pay 50,000 per surviving ball.
//
// No score multiplier, ball save, geometry, or physics changes.

(() => {
  if (window.miamiMidnightRunInstalled) return;
  window.miamiMidnightRunInstalled = true;

  const FREEZE_MS = 850;
  const TITLE_MS = 1100;
  const RUN_MS = 20000;
  const CLEAR_MS = 1400;
  const CLEAR_BONUS = 50000;
  const TICK_MS = 1000;

  const state = {
    phase: 'idle',
    freezeUntil: -Infinity,
    titleUntil: -Infinity,
    startedAt: -Infinity,
    endsAt: -Infinity,
    clearUntil: -Infinity,
    lastTickIndex: -1,
    lastBonus: 0,
    completedRuns: 0,
    currentRun: 0,
    automaticMultiball: false,
    survivingBalls: 1,
    freezeCaptured: false
  };
  window.miamiMidnightRunState = state;

  const freezeFrame = document.createElement('canvas');
  freezeFrame.width = canvas.width;
  freezeFrame.height = canvas.height;
  const freezeCtx = freezeFrame.getContext('2d');

  const blockedKeys = new Set([
    'ArrowLeft',
    'ArrowRight',
    'KeyZ',
    'KeyX',
    'Slash',
    'NumpadDivide',
    'Space',
    'Enter'
  ]);

  function transitionFrozen() {
    return state.phase === 'freeze';
  }

  function releaseForTransition() {
    if (typeof releaseAllControls === 'function') releaseAllControls();
  }

  function livePhysicalBallCount() {
    const engineCount = Number(
      window.miamiMultiballEngine?.state?.livePhysicalBalls
    );
    if (Number.isFinite(engineCount)) {
      return clamp(Math.round(engineCount), 1, 2);
    }

    const lifecycleCount = Number(window.miamiMultiballState?.liveCount);
    return Number.isFinite(lifecycleCount)
      ? clamp(Math.round(lifecycleCount), 1, 2)
      : 1;
  }

  function ensureEncoreMultiball() {
    const lifecycle = window.miamiMultiballState;
    if (lifecycle?.phase === 'multiball') return true;
    if (lifecycle?.phase !== 'single') return false;

    const request = window.miamiRequestTwoBallMultiball;
    if (typeof request !== 'function') return false;

    request('ocean');
    return window.miamiMultiballState?.phase === 'multiball';
  }

  function rearmEncoreClock() {
    const rearm = window.miamiRearmClockForEncore;
    return typeof rearm === 'function' ? rearm() : false;
  }

  function beginMidnightTransition() {
    if (state.phase !== 'idle') return;

    const now = performance.now();
    state.phase = 'freeze';
    state.freezeUntil = now + FREEZE_MS;
    state.titleUntil = -Infinity;
    state.startedAt = -Infinity;
    state.endsAt = -Infinity;
    state.clearUntil = -Infinity;
    state.lastTickIndex = -1;
    state.lastBonus = 0;
    state.currentRun = state.completedRuns + 1;
    state.automaticMultiball = false;
    state.survivingBalls = 1;
    state.freezeCaptured = false;
    window.miamiInputLocked = true;
    releaseForTransition();

    window.dispatchEvent(new CustomEvent('miami-midnight-run-pending', {
      detail: { freezeMs: FREEZE_MS }
    }));
  }

  function enterMidnightRun(now) {
    if (state.phase !== 'freeze') return;

    state.phase = 'run';
    state.freezeUntil = -Infinity;
    state.titleUntil = now + TITLE_MS;
    state.startedAt = now;
    state.endsAt = now + RUN_MS;
    state.clearUntil = -Infinity;
    state.lastTickIndex = -1;
    state.lastBonus = 0;
    state.currentRun = state.completedRuns + 1;
    state.automaticMultiball = state.currentRun >= 2;
    state.survivingBalls = 1;
    state.freezeCaptured = false;
    window.miamiInputLocked = false;

    const multiballStarted = state.automaticMultiball
      ? ensureEncoreMultiball()
      : false;

    window.dispatchEvent(new CustomEvent('miami-midnight-run-start', {
      detail: {
        titleMs: TITLE_MS,
        durationMs: RUN_MS,
        run: state.currentRun,
        automaticMultiball: state.automaticMultiball,
        multiballStarted,
        liveCount: livePhysicalBallCount()
      }
    }));
  }

  function completeMidnightRun(now) {
    if (state.phase !== 'run') return false;

    const survivingBalls = state.currentRun >= 2
      ? livePhysicalBallCount()
      : 1;
    const bonus = CLEAR_BONUS * survivingBalls;

    state.phase = 'clear';
    state.endsAt = -Infinity;
    state.clearUntil = now + CLEAR_MS;
    state.lastTickIndex = -1;
    state.survivingBalls = survivingBalls;
    state.lastBonus = bonus;
    state.completedRuns += 1;

    score += bonus;
    syncStatusDisplay();

    window.dispatchEvent(new CustomEvent('miami-midnight-run-clear', {
      detail: {
        run: state.currentRun,
        bonus,
        survivingBalls,
        perBall: CLEAR_BONUS,
        durationMs: RUN_MS,
        clearMs: CLEAR_MS
      }
    }));
    return true;
  }

  function finishCompletedRun({ rearm = true } = {}) {
    if (state.phase !== 'clear') return false;

    const run = state.currentRun;
    const bonus = state.lastBonus;
    const survivingBalls = state.survivingBalls;

    state.phase = 'idle';
    state.freezeUntil = -Infinity;
    state.titleUntil = -Infinity;
    state.startedAt = -Infinity;
    state.endsAt = -Infinity;
    state.clearUntil = -Infinity;
    state.lastTickIndex = -1;
    state.lastBonus = 0;
    state.currentRun = 0;
    state.automaticMultiball = false;
    state.survivingBalls = 1;
    state.freezeCaptured = false;
    window.miamiInputLocked = false;

    window.dispatchEvent(new CustomEvent('miami-midnight-run-end', {
      detail: {
        completed: true,
        run,
        bonus,
        survivingBalls
      }
    }));

    if (rearm) rearmEncoreClock();
    return true;
  }

  function finishClear() {
    finishCompletedRun({ rearm: true });
  }

  function stopMidnightRun({ rearmCompleted = true } = {}) {
    if (state.phase === 'idle') return;

    if (state.phase === 'clear') {
      finishCompletedRun({ rearm: rearmCompleted });
      return;
    }

    const run = state.currentRun;

    state.phase = 'idle';
    state.freezeUntil = -Infinity;
    state.titleUntil = -Infinity;
    state.startedAt = -Infinity;
    state.endsAt = -Infinity;
    state.clearUntil = -Infinity;
    state.lastTickIndex = -1;
    state.lastBonus = 0;
    state.currentRun = 0;
    state.automaticMultiball = false;
    state.survivingBalls = 1;
    state.freezeCaptured = false;
    window.miamiInputLocked = false;

    window.dispatchEvent(new CustomEvent('miami-midnight-run-end', {
      detail: {
        completed: false,
        run,
        bonus: 0,
        survivingBalls: 0
      }
    }));
  }

  function updateMidnightTimer(now) {
    if (state.phase !== 'run') return;

    if (now >= state.endsAt) {
      completeMidnightRun(now);
      return;
    }

    const elapsed = now - state.startedAt;
    const tickIndex = Math.floor(elapsed / TICK_MS);
    const totalTicks = Math.ceil(RUN_MS / TICK_MS);

    if (
      tickIndex !== state.lastTickIndex &&
      tickIndex >= 0 &&
      tickIndex < totalTicks
    ) {
      state.lastTickIndex = tickIndex;
      const remaining = Math.max(1, totalTicks - tickIndex);
      window.dispatchEvent(new CustomEvent('miami-midnight-run-tick', {
        detail: {
          tickIndex,
          remaining,
          finalCountdown: remaining <= 5
        }
      }));
    }
  }

  function blockTransitionKey(event) {
    if (!transitionFrozen() || !blockedKeys.has(event.code)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function isGameControlTarget(target) {
    return target === leftFlipperButton ||
      target === rightFlipperButton ||
      target === launchButton;
  }

  function blockTransitionPointer(event) {
    if (!transitionFrozen() || !isGameControlTarget(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  window.addEventListener('keydown', blockTransitionKey, true);
  window.addEventListener('keyup', blockTransitionKey, true);
  document.addEventListener('pointerdown', blockTransitionPointer, true);
  document.addEventListener('pointerup', blockTransitionPointer, true);
  document.addEventListener('pointercancel', blockTransitionPointer, true);

  window.miamiTestStartMidnightRun = function miamiTestStartMidnightRun() {
    if (!window.miamiTestModeActive) return false;
    stopMidnightRun({ rearmCompleted: false });
    beginMidnightTransition();
    return true;
  };

  window.addEventListener('miami-neon-rush-end', event => {
    if (!event.detail?.completed || gameOver) return;

    const reopen = window.miamiReopenClockForNextStage;
    if (typeof reopen === 'function') reopen();
  });

  window.addEventListener('miami-clock-complete', event => {
    if (Number(event.detail?.stage || 1) !== 2) return;
    beginMidnightTransition();
  });

  window.addEventListener('miami-drain', () => {
    stopMidnightRun({ rearmCompleted: false });
    state.completedRuns = 0;
    state.currentRun = 0;
    state.automaticMultiball = false;
    state.survivingBalls = 1;
  });

  const baseResetGameWithMidnightRun = resetGame;
  resetGame = function resetGameWithMidnightRun() {
    stopMidnightRun({ rearmCompleted: false });
    state.completedRuns = 0;
    state.currentRun = 0;
    state.automaticMultiball = false;
    state.survivingBalls = 1;
    baseResetGameWithMidnightRun();
  };

  const baseUpdateWithMidnightRun = update;
  update = function updateWithMidnightRun(dt) {
    if (transitionFrozen()) {
      const now = performance.now();
      if (now >= state.freezeUntil) enterMidnightRun(now);
      return;
    }

    baseUpdateWithMidnightRun(dt);

    const now = performance.now();
    if (state.phase === 'run') {
      updateMidnightTimer(now);
    } else if (state.phase === 'clear' && now >= state.clearUntil) {
      finishClear();
    }
  };

  function midnightUrgency(now) {
    if (state.phase !== 'run' || !Number.isFinite(state.endsAt)) return 0;
    const remaining = Math.max(0, state.endsAt - now);
    if (remaining > 5000) return 0;
    return clamp(1 - remaining / 5000, 0, 1);
  }

  const HEADLIGHT_GRADIENT_STEPS = 8;
  const headlightGradientCache = new Map();

  function cachedHeadlightGlow(x, y, radius, urgency) {
    const step = Math.round(
      clamp(urgency, 0, 1) * (HEADLIGHT_GRADIENT_STEPS - 1)
    );
    const key = `${x}:${y}:${radius}:${step}`;
    const cached = headlightGradientCache.get(key);
    if (cached) return cached;

    const steppedUrgency = step / (HEADLIGHT_GRADIENT_STEPS - 1);
    const liveRadius = radius + steppedUrgency * 3.5;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, liveRadius);
    glow.addColorStop(0, 'rgba(255, 255, 255, 1)');
    glow.addColorStop(0.18, 'rgba(235, 248, 255, 0.98)');
    glow.addColorStop(0.45, 'rgba(180, 224, 255, 0.46)');
    glow.addColorStop(1, 'rgba(90, 170, 255, 0)');

    const entry = { glow, liveRadius };
    headlightGradientCache.set(key, entry);
    return entry;
  }

  function drawHeadlight(x, y, radius = 8, urgency = 0) {
    const mobile = Boolean(window.miamiReducedRenderEffects);
    const { glow, liveRadius } = cachedHeadlightGlow(x, y, radius, urgency);

    ctx.save();
    ctx.globalCompositeOperation = mobile ? 'source-over' : 'screen';
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, liveRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#dff7ff';
    ctx.shadowBlur = mobile ? 0 : 7 + urgency * 8;
    ctx.beginPath();
    ctx.ellipse(x, y, 2.3 + urgency * 0.6, 1.5 + urgency * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCarHeadlights(now) {
    // Match the approved car placement without repainting either body.
    const urgency = midnightUrgency(now);
    drawHeadlight(129, 554, 8, urgency);
    drawHeadlight(169, 555, 8, urgency);
    drawHeadlight(245, 537, 8, urgency);
    drawHeadlight(290, 536, 8, urgency);
  }

  function drawFlipperGlare(now) {
    const mobile = Boolean(window.miamiReducedRenderEffects);
    const urgency = midnightUrgency(now);

    for (const flipper of flippers) {
      const cos = Math.cos(flipper.angle);
      const sin = Math.sin(flipper.angle);
      const start = 10;
      const end = Math.max(start + 4, flipper.length - 7);

      ctx.save();
      ctx.globalCompositeOperation = mobile ? 'source-over' : 'screen';
      ctx.globalAlpha = 0.15 + urgency * 0.1 + (flipper.pressed ? 0.12 : 0);
      ctx.strokeStyle = '#d9f8ff';
      ctx.lineWidth = flipper.pressed ? 2.2 : 1.5;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#9eefff';
      ctx.shadowBlur = mobile ? 0 : 5 + urgency * 7;
      ctx.beginPath();
      ctx.moveTo(
        flipper.pivotX + cos * start,
        flipper.pivotY + sin * start
      );
      ctx.lineTo(
        flipper.pivotX + cos * end,
        flipper.pivotY + sin * end
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawMidnightBallState(ballState, underpassActive = false) {
    if (underpassActive) {
      const nearTransition = [underpass.entry, ...underpass.outlets].some(
        mouth => Math.hypot(
          ballState.x - mouth.x,
          ballState.y - mouth.y
        ) < mouth.radius + 4
      );
      if (!nearTransition) return;
    }

    ctx.save();
    ctx.fillStyle = '#f7fbff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = window.miamiReducedRenderEffects ? 0 : 5;
    ctx.beginPath();
    ctx.arc(
      ballState.x,
      ballState.y,
      ballState.radius,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  function drawMidnightBalls() {
    drawMidnightBallState(ball, underpass.active);

    const companion = window.miamiMultiballEngine?.state?.companion;
    if (companion?.active) {
      drawMidnightBallState(
        companion.ball,
        Boolean(companion.route?.underpassActive)
      );
    }
  }

  function drawMidnightTitle(now) {
    if (now >= state.titleUntil) return;

    const remaining = Math.max(0, state.titleUntil - now);
    const strength = Math.min(1, remaining / 260);

    ctx.save();
    ctx.globalAlpha = strength;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 30px ui-monospace, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = MIAMI_COLORS.cyan;
    ctx.lineWidth = 1.6;
    if (!window.miamiReducedRenderEffects) {
      ctx.shadowColor = MIAMI_COLORS.magenta;
      ctx.shadowBlur = 14;
    }
    ctx.strokeText('MIDNIGHT RUN!', canvas.width / 2, 205, 330);
    ctx.fillText('MIDNIGHT RUN!', canvas.width / 2, 205, 330);
    ctx.restore();
  }

  function drawMidnightTimer(now) {
    if (state.phase !== 'run') return;

    const remainingMs = Math.max(0, state.endsAt - now);
    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const finalCountdown = remainingSeconds <= 5;
    const beatPhase = (remainingMs % 1000) / 1000;
    const pulse = finalCountdown
      ? 0.78 + 0.22 * Math.cos(beatPhase * Math.PI * 2)
      : 1;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.globalAlpha = 0.78;
    ctx.font = '800 9px ui-monospace, monospace';
    ctx.fillStyle = '#b8efff';
    ctx.fillText('SURVIVE THE MIDNIGHT RUN', canvas.width / 2, 246);

    ctx.globalAlpha = pulse;
    ctx.font = '900 25px ui-monospace, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = MIAMI_COLORS.cyan;
    ctx.lineWidth = 1.2;
    if (!window.miamiReducedRenderEffects) {
      ctx.shadowColor = finalCountdown ? '#ffffff' : MIAMI_COLORS.cyan;
      ctx.shadowBlur = finalCountdown ? 13 : 7;
    }

    const timerText = `00:${String(remainingSeconds).padStart(2, '0')}`;
    ctx.strokeText(timerText, canvas.width / 2, 272);
    ctx.fillText(timerText, canvas.width / 2, 272);
    ctx.restore();
  }

  function drawMidnightClear(now) {
    baseDrawWithMidnightRun();

    const remaining = Math.max(0, state.clearUntil - now);
    const progress = clamp(1 - remaining / CLEAR_MS, 0, 1);
    const textStrength = clamp(
      Math.min(progress * 6, remaining / 220),
      0,
      1
    );

    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.72 * (1 - progress);
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const openingFlash = clamp(1 - progress * 5, 0, 1);
    if (openingFlash > 0) {
      ctx.fillStyle = '#e8fbff';
      ctx.globalAlpha = openingFlash * 0.18;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.globalAlpha = textStrength;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 27px ui-monospace, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = MIAMI_COLORS.cyan;
    ctx.lineWidth = 1.4;
    if (!window.miamiReducedRenderEffects) {
      ctx.shadowColor = MIAMI_COLORS.magenta;
      ctx.shadowBlur = 16;
    }
    ctx.strokeText('MIDNIGHT CLEARED', canvas.width / 2, 224, 350);
    ctx.fillText('MIDNIGHT CLEARED', canvas.width / 2, 224, 350);

    ctx.font = '900 22px ui-monospace, monospace';
    ctx.fillStyle = '#f4ffff';
    const bonusText = `+${state.lastBonus.toLocaleString('en-US')}`;
    ctx.strokeText(bonusText, canvas.width / 2, 258);
    ctx.fillText(bonusText, canvas.width / 2, 258);

    if (state.currentRun >= 2) {
      ctx.font = '800 9px ui-monospace, monospace';
      ctx.fillStyle = '#b8efff';
      const ballWord = state.survivingBalls === 1 ? 'BALL' : 'BALLS';
      ctx.fillText(
        `${state.survivingBalls} ${ballWord} SURVIVED · 50,000 EACH`,
        canvas.width / 2,
        280
      );
    }
    ctx.restore();
  }

  function drawBlackout(now) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (typeof window.miamiDrawSunsetOnly === 'function') {
      window.miamiDrawSunsetOnly();
    }

    drawCarHeadlights(now);
    drawFlipperGlare(now);
    drawMidnightBalls();
    drawMidnightTimer(now);
    drawMidnightTitle(now);
  }

  const baseDrawWithMidnightRun = draw;
  draw = function drawWithMidnightRun() {
    if (transitionFrozen()) {
      if (!state.freezeCaptured) {
        baseDrawWithMidnightRun();
        freezeCtx.clearRect(0, 0, freezeFrame.width, freezeFrame.height);
        freezeCtx.drawImage(canvas, 0, 0);
        state.freezeCaptured = true;
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(freezeFrame, 0, 0);
      }
      return;
    }

    const now = performance.now();

    if (state.phase === 'run') {
      drawBlackout(now);
      return;
    }

    if (state.phase === 'clear') {
      drawMidnightClear(now);
      return;
    }

    baseDrawWithMidnightRun();
  };
})();
