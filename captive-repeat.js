// Miami Nights: make the five-hit captive-ball extra-ball award repeatable.
// Existing scoring, captive physics and award presentation remain unchanged.

(() => {
  if (window.miamiCaptiveRepeatInstalled) return;
  window.miamiCaptiveRepeatInstalled = true;

  const RESET_DELAY_MS = 900;
  let extraBallsEarnedThisGame = captiveExtraBallAwarded ? 1 : 0;
  let cycleAwardSeen = Boolean(captiveExtraBallAwarded);
  let resetTimer = null;

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

  function resetCaptiveAwardCycle() {
    resetTimer = null;
    captiveHitProgress = 0;
    captiveExtraBallAwarded = false;
    captiveExtraBallFlashStartedAt = -Infinity;
    cycleAwardSeen = false;
    syncStatusDisplay();
  }

  window.addEventListener('miami-impact', event => {
    const detail = event.detail || {};
    if (detail.type !== 'post' || Number(detail.index) !== 8) return;

    if (
      !cycleAwardSeen &&
      captiveExtraBallAwarded &&
      captiveHitProgress >= CAPTIVE_EXTRA_BALL_HITS
    ) {
      cycleAwardSeen = true;
      extraBallsEarnedThisGame += 1;
      syncStatusDisplay();

      if (resetTimer !== null) window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(resetCaptiveAwardCycle, RESET_DELAY_MS);
    }
  });

  const baseResetGameWithRepeatableExtraBall = resetGame;
  resetGame = function resetGameWithRepeatableExtraBall() {
    if (resetTimer !== null) {
      window.clearTimeout(resetTimer);
      resetTimer = null;
    }
    extraBallsEarnedThisGame = 0;
    cycleAwardSeen = false;
    baseResetGameWithRepeatableExtraBall();
    renderRepeatableBallPips();
  };

  renderRepeatableBallPips();
})();
