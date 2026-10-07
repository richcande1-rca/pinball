// Miami Nights: allow up to two five-hit captive-ball extra-ball awards per live ball.
// The first award resets the five-hit ladder; the second locks awards until drain.

(() => {
  if (window.miamiCaptiveRepeatInstalled) return;
  window.miamiCaptiveRepeatInstalled = true;

  const MAX_EXTRA_BALLS_PER_LIVE_BALL = 2;
  let extraBallsEarnedThisGame = captiveExtraBallAwarded ? 1 : 0;
  let extraBallsEarnedThisLiveBall = captiveExtraBallAwarded ? 1 : 0;

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
      extraBallsEarnedThisLiveBall += 1;

      if (extraBallsEarnedThisLiveBall < MAX_EXTRA_BALLS_PER_LIVE_BALL) {
        // First award: start a fresh five-hit cycle immediately. CAPTIVE READY
        // multiball stays independent.
        captiveHitProgress = 0;
        captiveExtraBallAwarded = false;
      } else {
        // Second award: leave the ladder complete and award flag locked so
        // further captive hits cannot create more extra balls before drain.
        captiveHitProgress = CAPTIVE_EXTRA_BALL_HITS;
        captiveExtraBallAwarded = true;
      }

      syncStatusDisplay();
    }
  });

  window.addEventListener('miami-drain', () => {
    extraBallsEarnedThisLiveBall = 0;
    captiveHitProgress = 0;
    captiveExtraBallAwarded = false;
    captiveExtraBallFlashStartedAt = -Infinity;
  });

  const baseResetGameWithRepeatableExtraBall = resetGame;
  resetGame = function resetGameWithRepeatableExtraBall() {
    extraBallsEarnedThisGame = 0;
    extraBallsEarnedThisLiveBall = 0;
    baseResetGameWithRepeatableExtraBall();
    renderRepeatableBallPips();
  };

  renderRepeatableBallPips();
})();
