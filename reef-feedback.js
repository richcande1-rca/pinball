// REEF HOTEL completion feedback only: no scoring or collision changes.
// Watches the existing hotel target impact events, then flashes the hotel and
// asks the shared lower-display layer to announce the completion.

(() => {
  if (window.miamiReefFeedbackInstalled) return;
  window.miamiReefFeedbackInstalled = true;

  const REEF_TARGET_INDEXES = new Set([20, 21, 22]);
  const BLINK_DURATION_MS = 2400;
  const BLINK_INTERVAL_MS = 140;
  const reefHits = new Set();
  let completionStartedAt = -Infinity;
  let completionAward = 2500;

  function resetReefFeedback() {
    reefHits.clear();
    completionStartedAt = -Infinity;
    completionAward = 2500;
  }

  function completionAge(now = performance.now()) {
    return now - completionStartedAt;
  }

  function completionActive(now = performance.now()) {
    const age = completionAge(now);
    return age >= 0 && age < BLINK_DURATION_MS;
  }

  function blinkPhase(now = performance.now()) {
    if (!completionActive(now)) return -1;
    return Math.floor(completionAge(now) / BLINK_INTERVAL_MS) % 2;
  }

  window.addEventListener('miami-impact', event => {
    const detail = event.detail || {};
    const index = Number(detail.index);
    if (detail.type !== 'post' || !REEF_TARGET_INDEXES.has(index)) return;

    reefHits.add(index);
    if (reefHits.size !== 3 || completionActive()) return;

    const doubled =
      typeof centerDoubleScoreRemaining !== 'undefined' &&
      centerDoubleScoreRemaining > 0;
    completionAward = doubled ? 5000 : 2500;
    completionStartedAt = performance.now();

    // Let the existing shared display renderer handle the message/blink so we
    // do not add a second per-frame display paint pass.
    window.dispatchEvent(new CustomEvent('miami-reef-complete', {
      detail: { award: completionAward }
    }));
  });

  window.addEventListener('miami-drain', resetReefFeedback);

  const baseResetGameWithReefFeedback = resetGame;
  resetGame = function resetGameWithReefFeedback() {
    resetReefFeedback();
    baseResetGameWithReefFeedback();
  };

  function drawReefHotelBlink() {
    const now = performance.now();
    const phase = blinkPhase(now);
    if (phase < 0) return;

    // Bright alternating solid fills are deliberately used instead of large
    // shadowBlur glows. They demand attention while staying cheap on desktop
    // and mobile.
    const brightPhase = phase === 0;
    const facadeFill = brightPhase
      ? 'rgba(244, 255, 255, 0.90)'
      : 'rgba(255, 44, 170, 0.34)';
    const facadeStroke = brightPhase ? '#ffffff' : MIAMI_COLORS.magenta;
    const windowFill = brightPhase ? MIAMI_COLORS.cyan : '#ffffff';
    const windowStroke = brightPhase ? '#ffffff' : MIAMI_COLORS.cyan;

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.fillStyle = facadeFill;
    ctx.strokeStyle = facadeStroke;
    ctx.lineWidth = brightPhase ? 3 : 2;
    ctx.fillRect(377, 266, 52, 95);
    ctx.strokeRect(377, 266, 52, 95);

    for (const centerY of [285.5, 316.5, 347.5]) {
      ctx.fillStyle = windowFill;
      ctx.strokeStyle = windowStroke;
      ctx.lineWidth = 1.5;
      ctx.fillRect(395, centerY - 6, 18, 12);
      ctx.strokeRect(395, centerY - 6, 18, 12);
    }
    ctx.restore();
  }

  const baseDrawOceanRampWithReefFeedback = drawOceanRamp;
  drawOceanRamp = function drawOceanRampWithReefFeedback() {
    baseDrawOceanRampWithReefFeedback();
    if (completionActive()) drawReefHotelBlink();
  };

  const buildNumberDisplay = document.querySelector('.build-number');
  if (buildNumberDisplay) {
    buildNumberDisplay.textContent = 'Build 20260901-PERFDISPLAY';
  }
})();
