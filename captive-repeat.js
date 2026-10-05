// Miami Nights: make the five-hit captive-ball extra-ball award repeatable.
// Every completed five-hit cycle can earn another extra ball, even on the same live ball.

(() => {
  if (window.miamiCaptiveRepeatInstalled) return;
  window.miamiCaptiveRepeatInstalled = true;

  let extraBallsEarnedThisGame = captiveExtraBallAwarded ? 1 : 0;

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

  window.addEventListener('miami-impact', event => {
    const detail = event.detail || {};
    if (detail.type !== 'post' || Number(detail.index) !== 8) return;

    if (
      captiveExtraBallAwarded &&
      captiveHitProgress >= CAPTIVE_EXTRA_BALL_HITS
    ) {
      extraBallsEarnedThisGame += 1;
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
  });

  const baseResetGameWithRepeatableExtraBall = resetGame;
  resetGame = function resetGameWithRepeatableExtraBall() {
    extraBallsEarnedThisGame = 0;
    baseResetGameWithRepeatableExtraBall();
    renderRepeatableBallPips();
  };

  renderRepeatableBallPips();
})();
