// Miami Nights: GOD MODE.
// Clear three AMBUSH modes in one game to earn 20 seconds where drains do not
// consume a ball and all positive scoring is tripled. Saved balls return
// immediately and current mode progress stays intact. The reward is repeatable
// every three successful AMBUSH clears.

(() => {
  if (window.miamiGodModeInstalled) return;
  window.miamiGodModeInstalled = true;

  const REQUIRED_AMBUSH_CLEARS = 3;
  const DURATION_MS = 20000;
  const INTRO_MS = 1300;
  const SAVE_FLASH_MS = 650;
  const END_FLASH_MS = 1100;

  const state = {
    ambushClears: 0,
    active: false,
    remainingMs: 0,
    introUntil: -Infinity,
    saveFlashUntil: -Infinity,
    endFlashUntil: -Infinity,
    saves: 0
  };

  window.miamiGodModeState = state;
  window.miamiGodModeActive = false;

  function startGodMode() {
    if (gameOver || state.active) return false;

    state.active = true;
    state.remainingMs = DURATION_MS;
    state.introUntil = performance.now() + INTRO_MS;
    state.endFlashUntil = -Infinity;
    state.saves = 0;
    window.miamiGodModeActive = true;

    window.dispatchEvent(new CustomEvent('miami-god-mode-start', {
      detail: {
        durationMs: DURATION_MS,
        requiredAmbushClears: REQUIRED_AMBUSH_CLEARS
      }
    }));
    return true;
  }

  function finishGodMode() {
    if (!state.active) return;

    state.active = false;
    state.remainingMs = 0;
    state.endFlashUntil = performance.now() + END_FLASH_MS;
    window.miamiGodModeActive = false;

    window.dispatchEvent(new CustomEvent('miami-god-mode-end', {
      detail: { saves: state.saves }
    }));
  }

  function registerSave(peer = 'table-ball') {
    if (!state.active) return false;

    state.saves += 1;
    state.saveFlashUntil = performance.now() + SAVE_FLASH_MS;

    window.dispatchEvent(new CustomEvent('miami-god-save', {
      detail: { peer, saves: state.saves }
    }));
    return true;
  }

  window.miamiGodModeRegisterSave = registerSave;

  window.addEventListener('miami-ambush-success', () => {
    state.ambushClears += 1;
    if (state.ambushClears < REQUIRED_AMBUSH_CLEARS) return;

    state.ambushClears = 0;
    startGodMode();
  });

  const baseHandleDrainWithGodMode = handleDrain;
  handleDrain = function handleDrainWithGodMode() {
    if (state.active && !gameOver) {
      parkBallAtPlunger();
      plunger.charge = 0.72;
      launchBall();
      registerSave('table-ball');
      return;
    }

    baseHandleDrainWithGodMode();
  };

  const baseUpdateWithGodMode = update;
  update = function updateWithGodMode(dt) {
    const tripleScoring = state.active && !gameOver;
    const scoreBeforeUpdate = score;

    if (tripleScoring) {
      state.remainingMs = Math.max(
        0,
        state.remainingMs - Math.max(0, Number(dt) || 0) * 1000
      );
      if (state.remainingMs <= 0) finishGodMode();
    }

    baseUpdateWithGodMode(dt);

    if (tripleScoring) {
      const positiveGain = Math.max(0, score - scoreBeforeUpdate);
      if (positiveGain > 0) {
        score += positiveGain * 2;

        // PRESSURE tracks score deltas across updates. Mark the GOD MODE bonus
        // as already processed so it is not halved again on the next frame.
        if (window.miamiAmbushState) {
          window.miamiAmbushState.lastScoreSeen = score;
        }

        syncStatusDisplay();
      }
    }
  };

  function drawDrainGlow(now) {
    if (!state.active) return;

    const pulse = 0.52 + Math.sin(now * 0.014) * 0.18;
    const y = canvas.height - 18;

    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 5;
    ctx.shadowColor = '#fff3b0';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.29, y);
    ctx.lineTo(canvas.width * 0.71, y);
    ctx.stroke();
    ctx.restore();
  }

  function drawTimer() {
    if (!state.active) return;

    const seconds = Math.max(0, Math.ceil(state.remainingMs / 1000));
    const label = `GOD MODE · 3X · 00:${String(seconds).padStart(2, '0')}`;
    const width = 178;
    const height = 22;
    const x = canvas.width / 2 - width / 2;
    const y = 8;

    ctx.save();
    ctx.fillStyle = 'rgba(5, 7, 14, 0.82)';
    ctx.strokeStyle = 'rgba(255, 215, 106, 0.88)';
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
    ctx.fillStyle = '#fff6cf';
    ctx.font = '800 11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, canvas.width / 2, y + height / 2 + 0.5);
    ctx.restore();
  }

  function drawFlash(now) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (now < state.introUntil) {
      const fade = Math.min(1, (state.introUntil - now) / 260);
      ctx.globalAlpha = Math.max(0.18, fade);
      ctx.shadowColor = '#fff3b0';
      ctx.shadowBlur = 22;
      ctx.fillStyle = '#fff8d8';
      ctx.font = '900 34px system-ui, sans-serif';
      ctx.fillText('GOD MODE', canvas.width / 2, canvas.height * 0.34);
      ctx.font = '800 12px ui-monospace, monospace';
      ctx.fillText('20 SECONDS · NO DRAIN · 3X', canvas.width / 2, canvas.height * 0.34 + 28);
    }

    if (now < state.saveFlashUntil) {
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 22px system-ui, sans-serif';
      ctx.fillText('SAVED', canvas.width / 2, canvas.height * 0.72);
    }

    if (now < state.endFlashUntil) {
      ctx.globalAlpha = Math.min(1, (state.endFlashUntil - now) / 260);
      ctx.shadowColor = '#ffd76a';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#fff6cf';
      ctx.font = '900 18px system-ui, sans-serif';
      ctx.fillText('GOD MODE OVER', canvas.width / 2, canvas.height * 0.34);
    }

    ctx.restore();
  }

  const baseDrawWithGodMode = draw;
  draw = function drawWithGodMode() {
    baseDrawWithGodMode();

    const now = performance.now();
    drawDrainGlow(now);
    drawTimer();
    drawFlash(now);
  };

  function resetGodModeForNewGame() {
    state.ambushClears = 0;
    state.active = false;
    state.remainingMs = 0;
    state.introUntil = -Infinity;
    state.saveFlashUntil = -Infinity;
    state.endFlashUntil = -Infinity;
    state.saves = 0;
    window.miamiGodModeActive = false;
  }

  const baseResetGameWithGodMode = resetGame;
  resetGame = function resetGameWithGodMode() {
    resetGodModeForNewGame();
    baseResetGameWithGodMode();
  };

  const instructions = document.querySelector('.instruction-content');
  if (instructions) {
    instructions.append(document.createTextNode(
      ' GOD MODE: clear AMBUSH three times in one game to earn 20 seconds with no drains and 3X scoring on all positive points. Saved balls return immediately and mode progress stays intact.'
    ));
  }
})();
