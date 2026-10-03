// Miami Nights: make the five-hit captive-ball extra-ball award repeatable across balls.
// Each live ball can earn it once; scoring, captive physics and award presentation stay unchanged.

(() => {
  if (window.miamiCaptiveRepeatInstalled) return;
  window.miamiCaptiveRepeatInstalled = true;

  const AWARD_VISUAL_HOLD_MS = 900;
  let extraBallsEarnedThisGame = captiveExtraBallAwarded ? 1 : 0;
  let awardVisualHoldUntil = -Infinity;
  let awardCountedThisBall = false;

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
  // clear progress to 0/5 while the per-ball award flag stays locked until drain.
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
      !awardCountedThisBall &&
      captiveExtraBallAwarded &&
      captiveHitProgress >= CAPTIVE_EXTRA_BALL_HITS
    ) {
      extraBallsEarnedThisGame += 1;
      awardCountedThisBall = true;
      awardVisualHoldUntil = performance.now() + AWARD_VISUAL_HOLD_MS;

      // One captive extra ball is available per live ball. Clear the visible
      // progress so the captive stays available for CAPTIVE READY multiball,
      // but leave captiveExtraBallAwarded true until the next real drain.
      captiveHitProgress = 0;
      syncStatusDisplay();
    }
  });

  window.addEventListener('miami-drain', () => {
    captiveHitProgress = 0;
    captiveExtraBallAwarded = false;
    captiveExtraBallFlashStartedAt = -Infinity;
    awardVisualHoldUntil = -Infinity;
    awardCountedThisBall = false;
  });

  const baseResetGameWithRepeatableExtraBall = resetGame;
  resetGame = function resetGameWithRepeatableExtraBall() {
    extraBallsEarnedThisGame = 0;
    awardVisualHoldUntil = -Infinity;
    awardCountedThisBall = false;
    baseResetGameWithRepeatableExtraBall();
    renderRepeatableBallPips();
  };

  renderRepeatableBallPips();
})();
