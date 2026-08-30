// Miami Nights: three loop passes light the three circle pops for 3X scoring.
// This is a small late-loaded gameplay hook so the core physics files stay untouched.

(() => {
  const CIRCLE_PASSES_FOR_TRIPLE = 3;
  const circlePopBumpers = popBumpers.slice(0, 3);
  let circlePassProgress = 0;

  function resetCirclePassProgress() {
    circlePassProgress = 0;
  }

  window.addEventListener('miami-loop-complete', () => {
    if (gameOver) return;
    circlePassProgress = Math.min(
      CIRCLE_PASSES_FOR_TRIPLE,
      circlePassProgress + 1
    );
  });

  // The stock pop event reports the normal 100/200/300 combo value. Once all
  // three circle pops are lit, add two more copies of that value so only these
  // three bumpers score 3X. The existing timed 2X mode still composes normally.
  window.addEventListener('miami-pop-bumper', event => {
    if (circlePassProgress < CIRCLE_PASSES_FOR_TRIPLE) return;

    const detail = event.detail || {};
    const index = Number(detail.index);
    const points = Number(detail.points) || 0;
    if (index < 0 || index >= circlePopBumpers.length || points <= 0) return;

    score += points * 2;
    syncStatusDisplay();
  });

  // A drain always clears the pass lights and 3X state for the next ball.
  window.addEventListener('miami-drain', resetCirclePassProgress);

  const baseResetGameWithCircleTriple = resetGame;
  resetGame = function resetGameWithCircleTriple() {
    resetCirclePassProgress();
    baseResetGameWithCircleTriple();
  };

  const baseDrawPopBumpersWithCircleTriple = drawPopBumpers;
  drawPopBumpers = function drawPopBumpersWithCircleTriple() {
    baseDrawPopBumpersWithCircleTriple();

    for (let index = 0; index < circlePassProgress; index += 1) {
      const bumper = circlePopBumpers[index];
      if (!bumper) continue;

      const accent = MIAMI_COLORS[bumper.accent];
      ctx.save();
      ctx.translate(bumper.x, bumper.y);
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = '#f4ffff';
      ctx.shadowColor = accent;
      ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 13;
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.arc(0, 0, bumper.radius + 4.2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 0.72;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(0, 0, bumper.radius + 2.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  };

  // 3-0-5 outlane save: while active, replace the stock near-vertical left
  // lower guide with one continuous downhill safety rail. This removes both
  // the crossing-rail pinch and the tiny gutter-side catch while preserving
  // ordinary collision physics all the way back toward the left flipper.
  const stockLeftLowerGuide = lowerGuides[0];
  Object.assign(leftOutlaneGate, {
    x1: TABLE.left + 1,
    y1: 590,
    x2: 98,
    y2: 620,
    radius: 5
  });

  setLeftOutlaneProtection = function setContinuousLeftOutlaneProtection(active) {
    if (leftOutlaneProtectionActive === active) return;
    leftOutlaneProtectionActive = active;

    if (active) {
      const stockIndex = lowerGuides.indexOf(stockLeftLowerGuide);
      if (stockIndex !== -1) {
        lowerGuides.splice(stockIndex, 1);
      }

      if (!lowerGuides.includes(leftOutlaneGate)) {
        lowerGuides.unshift(leftOutlaneGate);
      }
      leftOutlaneGateFlashStartedAt = performance.now();
      return;
    }

    const gateIndex = lowerGuides.indexOf(leftOutlaneGate);
    if (gateIndex !== -1) {
      lowerGuides.splice(gateIndex, 1);
    }

    if (!lowerGuides.includes(stockLeftLowerGuide)) {
      lowerGuides.unshift(stockLeftLowerGuide);
    }
  };

  const buildNumberDisplay = document.querySelector('.build-number');
  if (buildNumberDisplay) {
    buildNumberDisplay.textContent = 'Build 20260830-305SAVE';
  }

  const instructions = document.querySelector('.instruction-content');
  if (instructions) {
    instructions.append(document.createTextNode(
      ' Three upper-left circle passes light all three loop bumpers for 3X scoring until the ball drains.'
    ));
  }
})();