// Miami Nights: MIDNIGHT RUN final-ball mode.
// After NEON RUSH completes normally, the clock re-arms as stage two.
// Clearing that second clock freezes the machine for a deliberate beat, then
// resumes play with the table blacked out except for the sunset, car headlights,
// and the live ball. Midnight Run lasts until drain/reset.
//
// Presentation/progression only: no score multiplier, ball save, geometry, or
// physics changes.

(() => {
  if (window.miamiMidnightRunInstalled) return;
  window.miamiMidnightRunInstalled = true;

  const FREEZE_MS = 850;
  const TITLE_MS = 1100;

  const state = {
    phase: 'idle',
    freezeUntil: -Infinity,
    titleUntil: -Infinity,
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

  function beginMidnightTransition() {
    if (state.phase !== 'idle') return;

    const now = performance.now();
    state.phase = 'freeze';
    state.freezeUntil = now + FREEZE_MS;
    state.titleUntil = -Infinity;
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
    state.freezeCaptured = false;
    window.miamiInputLocked = false;

    window.dispatchEvent(new CustomEvent('miami-midnight-run-start', {
      detail: { titleMs: TITLE_MS }
    }));
  }

  function stopMidnightRun() {
    if (state.phase === 'idle') return;

    state.phase = 'idle';
    state.freezeUntil = -Infinity;
    state.titleUntil = -Infinity;
    state.freezeCaptured = false;
    window.miamiInputLocked = false;
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

  window.addEventListener('miami-neon-rush-end', event => {
    if (!event.detail?.completed || gameOver) return;
    if (typeof window.miamiReopenClockForNextStage !== 'function') return;
    window.miamiReopenClockForNextStage();
  });

  window.addEventListener('miami-clock-complete', event => {
    if (Number(event.detail?.stage || 1) !== 2) return;
    beginMidnightTransition();
  });

  window.addEventListener('miami-drain', stopMidnightRun);

  const baseResetGameWithMidnightRun = resetGame;
  resetGame = function resetGameWithMidnightRun() {
    stopMidnightRun();
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
  };

  function drawHeadlight(x, y, radius = 8) {
    const mobile = Boolean(window.miamiMobilePerformanceMode);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);

    glow.addColorStop(0, 'rgba(255, 255, 255, 1)');
    glow.addColorStop(0.18, 'rgba(235, 248, 255, 0.98)');
    glow.addColorStop(0.45, 'rgba(180, 224, 255, 0.46)');
    glow.addColorStop(1, 'rgba(90, 170, 255, 0)');

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#dff7ff';
    ctx.shadowBlur = mobile ? 0 : 7;
    ctx.beginPath();
    ctx.ellipse(x, y, 2.3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCarHeadlights() {
    // Match the approved car placement without repainting either body.
    drawHeadlight(129, 554, 8);
    drawHeadlight(169, 555, 8);
    drawHeadlight(245, 537, 8);
    drawHeadlight(290, 536, 8);
  }

  function drawMidnightBall() {
    if (underpass.active) {
      const nearTransition = [underpass.entry, ...underpass.outlets].some(
        mouth => Math.hypot(ball.x - mouth.x, ball.y - mouth.y) < mouth.radius + 4
      );
      if (!nearTransition) return;
    }

    ctx.save();
    ctx.fillStyle = '#f7fbff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 5;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
    if (!window.miamiMobilePerformanceMode) {
      ctx.shadowColor = MIAMI_COLORS.magenta;
      ctx.shadowBlur = 14;
    }
    ctx.strokeText('MIDNIGHT RUN!', canvas.width / 2, 205, 330);
    ctx.fillText('MIDNIGHT RUN!', canvas.width / 2, 205, 330);
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

    drawCarHeadlights();
    drawMidnightBall();
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

    baseDrawWithMidnightRun();

    if (state.phase === 'run') {
      drawBlackout(performance.now());
    }
  };
})();
