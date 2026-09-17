// Miami Nights: make the five-hit captive-ball extra-ball award repeatable.
// Existing scoring, captive physics and award presentation remain unchanged.

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

  // Keep the completed five-lamp look on screen briefly after an award without
  // holding the gameplay counter at five. Hits during this visual celebration
  // already count toward the next five-hit cycle.
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

      // The award has already been granted and announced by the established
      // captive/feedback logic. Re-arm the rules immediately so the very next
      // legitimate captive hit becomes hit #1 of the next cycle.
      captiveHitProgress = 0;
      captiveExtraBallAwarded = false;
      syncStatusDisplay();
    }
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
