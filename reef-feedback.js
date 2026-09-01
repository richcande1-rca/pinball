// REEF HOTEL completion feedback only: no scoring or collision changes.
// Watches the existing hotel target impact events, then blinks the hotel and
// temporarily takes over the two lower VFD displays when all three are lit.

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

  function blinkOn(now = performance.now()) {
    if (!completionActive(now)) return false;
    return Math.floor(completionAge(now) / BLINK_INTERVAL_MS) % 2 === 0;
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
  });

  window.addEventListener('miami-drain', resetReefFeedback);

  const baseResetGameWithReefFeedback = resetGame;
  resetGame = function resetGameWithReefFeedback() {
    resetReefFeedback();
    baseResetGameWithReefFeedback();
  };

  function traceDisplayPanel(side) {
    ctx.beginPath();
    if (side === 'left') {
      ctx.moveTo(40, 672);
      ctx.lineTo(170, 672);
      ctx.lineTo(184, 697);
      ctx.lineTo(40, 697);
    } else {
      ctx.moveTo(250, 672);
      ctx.lineTo(380, 672);
      ctx.lineTo(380, 697);
      ctx.lineTo(236, 697);
    }
    ctx.closePath();
  }

  function drawReefDisplayPanel(side, text, accent) {
    const centerX = side === 'left' ? 108 : 312;

    ctx.save();
    traceDisplayPanel(side);
    ctx.fillStyle = 'rgba(1, 4, 10, 0.985)';
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = accent;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 8;
    ctx.stroke();

    if (text) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 9px ui-monospace, monospace';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = accent;
      ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 9;
      ctx.fillText(text, centerX, 686, 112);
    }
    ctx.restore();
  }

  function drawReefDisplayFlash() {
    const now = performance.now();
    if (!completionActive(now)) return;

    // Cover the normal display text on the dark phase so the completion message
    // visibly blinks rather than merely changing glow intensity.
    const lit = blinkOn(now);
    drawReefDisplayPanel('left', lit ? 'REEF HOTEL' : '', MIAMI_COLORS.cyan);
    drawReefDisplayPanel(
      'right',
      lit ? `BONUS +${completionAward}` : '',
      MIAMI_COLORS.magenta
    );
  }

  const baseDrawTableWithReefFeedback = drawTable;
  drawTable = function drawTableWithReefFeedback() {
    baseDrawTableWithReefFeedback();
    drawReefDisplayFlash();
  };

  function drawReefHotelBlink() {
    const now = performance.now();
    if (!blinkOn(now)) return;

    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = 'rgba(53, 233, 255, 0.12)';
    ctx.shadowColor = MIAMI_COLORS.cyan;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 18;
    ctx.lineWidth = 2.5;
    ctx.fillRect(377, 266, 52, 95);
    ctx.strokeRect(377, 266, 52, 95);

    for (const centerY of [285.5, 316.5, 347.5]) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = MIAMI_COLORS.magenta;
      ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 12;
      ctx.fillRect(395, centerY - 6, 18, 12);
    }
    ctx.restore();
  }

  const baseDrawOceanRampWithReefFeedback = drawOceanRamp;
  drawOceanRamp = function drawOceanRampWithReefFeedback() {
    baseDrawOceanRampWithReefFeedback();
    drawReefHotelBlink();
  };

  const buildNumberDisplay = document.querySelector('.build-number');
  if (buildNumberDisplay) {
    buildNumberDisplay.textContent = 'Build 20260901-REEFBLINK';
  }
})();
