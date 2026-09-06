// Miami Nights: extra-ball presentation only.
// Keeps the top strip informational while giving the two lower apron displays
// the loud celebration. No scoring, award thresholds, or ball physics change.

(() => {
  const EXTRA_BALL_TOP_FLASH_MS = 750;
  const EXTRA_BALL_APRON_FLASH_MS = 2300;
  const EXTRA_BALL_STROBE_MS = 110;
  let extraBallCelebrationStartedAt = -Infinity;
  let extraBallSeen = Boolean(captiveExtraBallAwarded);

  const ballStatus = document.querySelector('.ball-status');

  // The original status renderer assumes a three-ball game when it draws the
  // pips. Once the captive-ball award is earned, keep the same remaining-ball
  // convention but expand the display to four slots.
  function renderBallPipsWithAward() {
    const slotCount = TOTAL_BALLS + (captiveExtraBallAwarded ? 1 : 0);
    const litCount = Math.max(0, Math.min(ballsRemaining, slotCount));
    ballPipsDisplay.textContent =
      '●'.repeat(litCount) +
      '○'.repeat(Math.max(0, slotCount - litCount));
    ballPipsDisplay.setAttribute(
      'aria-label',
      `${ballsRemaining} ball${ballsRemaining === 1 ? '' : 's'} remaining`
    );
  }

  const baseSyncStatusDisplayWithExtraBall = syncStatusDisplay;
  syncStatusDisplay = function syncStatusDisplayWithExtraBall() {
    baseSyncStatusDisplayWithExtraBall();
    renderBallPipsWithAward();
  };

  // Only the BALL section of the top strip gets the brief acknowledgement.
  // The main celebration remains on the two lower apron displays.
  const style = document.createElement('style');
  style.textContent = `
    .ball-status.miami-extra-ball-flash {
      animation: miami-extra-ball-top-flash 750ms ease-out both;
    }

    @keyframes miami-extra-ball-top-flash {
      0%, 18%, 42%, 68% {
        background: rgba(220, 252, 255, 0.26);
        box-shadow:
          0 0 10px rgba(32, 225, 255, 0.95),
          0 0 22px rgba(255, 39, 154, 0.72);
      }
      9%, 30%, 55% {
        background: rgba(255, 255, 255, 0.10);
        box-shadow: 0 0 5px rgba(255, 255, 255, 0.72);
      }
      100% {
        background: transparent;
        box-shadow: none;
      }
    }

    .ball-status.miami-extra-ball-flash .ball-number,
    .ball-status.miami-extra-ball-flash .ball-pips {
      color: #ffffff;
      text-shadow:
        0 0 7px rgba(255, 255, 255, 0.95),
        0 0 14px rgba(32, 225, 255, 0.95),
        0 0 20px rgba(255, 39, 154, 0.78);
    }
  `;
  document.head.appendChild(style);

  function flashTopBallStatus() {
    if (!ballStatus) return;
    ballStatus.classList.remove('miami-extra-ball-flash');
    void ballStatus.offsetWidth;
    ballStatus.classList.add('miami-extra-ball-flash');
    window.setTimeout(() => {
      ballStatus.classList.remove('miami-extra-ball-flash');
    }, EXTRA_BALL_TOP_FLASH_MS);
  }

  function traceApronPanel(side) {
    ctx.beginPath();
    if (side === 'left') {
      ctx.moveTo(32, 674);
      ctx.lineTo(161, 674);
      ctx.lineTo(180, 693);
      ctx.lineTo(32, 693);
    } else {
      ctx.moveTo(388, 674);
      ctx.lineTo(259, 674);
      ctx.lineTo(240, 693);
      ctx.lineTo(388, 693);
    }
    ctx.closePath();
  }

  function drawCelebrationPanel(side, text, accent, alternateAccent, phase, pulse) {
    ctx.save();
    const mobile = Boolean(window.miamiMobilePerformanceMode);
    const activeAccent = phase ? alternateAccent : accent;

    traceApronPanel(side);
    ctx.fillStyle = phase
      ? 'rgba(14, 3, 25, 0.97)'
      : 'rgba(1, 15, 24, 0.97)';
    ctx.fill();

    ctx.globalAlpha = 0.82 + pulse * 0.18;
    ctx.strokeStyle = activeAccent;
    ctx.lineWidth = 3.4 + pulse * 1.4;
    ctx.shadowColor = activeAccent;
    ctx.shadowBlur = mobile ? 0 : (13 + pulse * 11);
    traceApronPanel(side);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = activeAccent;
    ctx.shadowBlur = mobile ? 0 : (8 + pulse * 8);
    ctx.font = '900 11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, side === 'left' ? 102 : 314, 684, 126);

    // A bright inner sweep gives the panels a genuine insert-strobe feel
    // without flashing the whole playfield.
    ctx.globalAlpha = 0.22 + pulse * 0.20;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (side === 'left') {
      ctx.moveTo(42, 678);
      ctx.lineTo(157, 678);
    } else {
      ctx.moveTo(263, 678);
      ctx.lineTo(378, 678);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawExtraBallApronCelebration(now) {
    const age = now - extraBallCelebrationStartedAt;
    if (age < 0 || age >= EXTRA_BALL_APRON_FLASH_MS) return;

    const phase = Math.floor(age / EXTRA_BALL_STROBE_MS) % 2 === 1;
    const pulse = 0.5 + 0.5 * Math.sin(age / 42);

    drawCelebrationPanel(
      'left',
      'EXTRA BALL!',
      MIAMI_COLORS.cyan,
      MIAMI_COLORS.magenta,
      phase,
      pulse
    );
    drawCelebrationPanel(
      'right',
      'AWARDED +1',
      MIAMI_COLORS.magenta,
      MIAMI_COLORS.cyan,
      phase,
      pulse
    );
  }

  // displays.js already owns the normal lower panels. Draw this temporary
  // celebration directly afterward so normal panel behavior resumes untouched.
  const baseDrawLowerApronWithExtraBall = drawLowerApron;
  drawLowerApron = function drawLowerApronWithExtraBall() {
    baseDrawLowerApronWithExtraBall();
    drawExtraBallApronCelebration(performance.now());
  };

  function celebrateExtraBall() {
    extraBallCelebrationStartedAt = performance.now();
    syncStatusDisplay();
    flashTopBallStatus();
  }

  // The captive mechanism already dispatches this impact after updating its
  // five-hit progress and award state. Detect the false->true award transition
  // here rather than changing the established gameplay logic.
  window.addEventListener('miami-impact', event => {
    const detail = event.detail || {};
    if (Number(detail.index) !== 8) return;

    if (!captiveExtraBallAwarded) {
      extraBallSeen = false;
      return;
    }

    if (
      !extraBallSeen &&
      captiveExtraBallAwarded &&
      captiveHitProgress >= 5
    ) {
      extraBallSeen = true;
      celebrateExtraBall();
    }
  });

  const baseResetGameWithExtraBallFeedback = resetGame;
  resetGame = function resetGameWithExtraBallFeedback() {
    extraBallSeen = false;
    extraBallCelebrationStartedAt = -Infinity;
    if (ballStatus) ballStatus.classList.remove('miami-extra-ball-flash');
    baseResetGameWithExtraBallFeedback();
  };

  // Correct the pip slots immediately in case this feature is hot-loaded while
  // a game is already in progress.
  syncStatusDisplay();
})();
