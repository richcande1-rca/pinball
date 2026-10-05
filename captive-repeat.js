// Miami Nights: make the five-hit captive-ball extra-ball award repeatable.
// Every completed five-hit cycle can earn another extra ball, even on the same live ball.

(() => {
  if (window.miamiCaptiveRepeatInstalled) return;
  window.miamiCaptiveRepeatInstalled = true;

  const AWARD_VISUAL_HOLD_MS = 900;
  let extraBallsEarnedThisGame = captiveExtraBallAwarded ? 1 : 0;
  let awardVisualHoldUntil = -Infinity;

  function renderRepeatableBallPips() {
    const slotCount = Math.max(
      TOTAL_BALLS + extraBallsEarnedThisGame,
      ballsRemaining
    );
    const litCount = Math.max(0, Math.min(ballsRemaining, slotCount));

    ballPipsDisplay.textContent =
      '●'.repeat(litCount) +
      '○'.repeat(Math.max(0, slotCount - litCount));
    ballPipsDisplay.setAttribute(
      'aria-label',
      `${ballsRemaining} ball${ballsRemaining === 1 ? '' : 's'} remaining`
    );
  }

  const baseSyncStatusDisplayWithRepeatableExtraBall = syncStatusDisplay;
  syncStatusDisplay = function syncStatusDisplayWithRepeatableExtraBall() {
    baseSyncStatusDisplayWithRepeatableExtraBall();
    renderRepeatableBallPips();
  };

  // Keep the completed five-lamp look on screen briefly after an award, then
  // clear progress to 0/5 and immediately re-arm the next extra-ball cycle.
  const baseDrawCaptiveBallAssemblyWithRepeatableCycle = drawCaptiveBallAssembly;
  drawCaptiveBallAssembly = function drawCaptiveBallAssemblyWithRepeatableCycle() {
    if (performance.now() >= awardVisualHoldUntil) {
      return baseDrawCaptiveBallAssemblyWithRepeatableCycle();
    }

    const actualProgress = captiveHitProgress;
    captiveHitProgress = CAPTIVE_EXTRA_BALL_HITS;

    try {
      return baseDrawCaptiveBallAssemblyWithRepeatableCycle();
    } finally {
      captiveHitProgress = actualProgress;
    }
  };

  window.addEventListener('miami-impact', event => {
    const detail = event.detail || {};
    if (detail.type !== 'post' || Number(detail.index) !== 8) return;

    if (
      captiveExtraBallAwarded &&
      captiveHitProgress >= CAPTIVE_EXTRA_BALL_HITS
    ) {
      extraBallsEarnedThisGame += 1;
      awardVisualHoldUntil = performance.now() + AWARD_VISUAL_HOLD_MS;

      // Start a fresh five-hit cycle immediately. CAPTIVE READY multiball stays
      // independent, while another extra ball can now be earned on this same ball.
      captiveHitProgress = 0;
      captiveExtraBallAwarded = false;
      syncStatusDisplay();
    }
  });

  window.addEventListener('miami-drain', () => {
    captiveHitProgress = 0;
    captiveExtraBallAwarded = false;
    captiveExtraBallFlashStartedAt = -Infinity;
    awardVisualHoldUntil = -Infinity;
  });

  const baseResetGameWithRepeatableExtraBall = resetGame;
  resetGame = function resetGameWithRepeatableExtraBall() {
    extraBallsEarnedThisGame = 0;
    awardVisualHoldUntil = -Infinity;
    baseResetGameWithRepeatableExtraBall();
    renderRepeatableBallPips();
  };

  renderRepeatableBallPips();
})();
