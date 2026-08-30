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

  // 3-0-5 outlane save: use the existing left pink diverter itself as the
  // physical blocker. Completing the bank extends its outside end across the
  // gutter while leaving the flipper-side end untouched, so the cradle geometry
  // stays exactly as-is and no second safety rail can create a pinch point.
  const leftPinkDiverter = sideBumpers[0];
  const leftPinkDiverterRest = {
    x1: leftPinkDiverter.x1,
    y1: leftPinkDiverter.y1
  };
  const stockLeftLowerGuide = lowerGuides[0];

  function clearLegacyLeftOutlaneGate() {
    const gateIndex = lowerGuides.indexOf(leftOutlaneGate);
    if (gateIndex !== -1) {
      lowerGuides.splice(gateIndex, 1);
    }
    if (stockLeftLowerGuide && !lowerGuides.includes(stockLeftLowerGuide)) {
      lowerGuides.unshift(stockLeftLowerGuide);
    }
  }

  setLeftOutlaneProtection = function setPinkDiverterOutlaneProtection(active) {
    if (leftOutlaneProtectionActive === active) return;
    leftOutlaneProtectionActive = active;
    clearLegacyLeftOutlaneGate();

    if (active) {
      // Continue the diverter on its existing angle until it reaches the cabinet
      // side, blocking the gutter before the ball can commit to the outlane.
      leftPinkDiverter.x1 = TABLE.left + 4;
      leftPinkDiverter.y1 = 530;
      leftOutlaneGateFlashStartedAt = performance.now();
      return;
    }

    leftPinkDiverter.x1 = leftPinkDiverterRest.x1;
    leftPinkDiverter.y1 = leftPinkDiverterRest.y1;
  };

  // Completing 3-0-5 now leaves the bank physically down for the rest of the
  // current ball. The normal ball reset raises the targets again on the drain,
  // at the same time the pink outlane save retracts.
  window.addEventListener('miami-drop-target', event => {
    if (event.detail && event.detail.bankComplete) {
      dropTargetBank.resetRemaining = 0;
    }
  });

  // The pink diverter now is the visible and physical 3-0-5 save. Suppress the
  // obsolete separate cyan safety rail artwork entirely.
  drawLeftOutlaneGate = function drawNoSeparateLeftOutlaneGate() {};
  clearLegacyLeftOutlaneGate();

  // Narrow the launch lane as far as practical: the physical gap between the
  // divider surface and the cabinet's right wall is exactly the ball diameter
  // plus two pixels. That leaves one pixel of side clearance around the parked
  // ball and opens the former launch-lane width back into the main playfield.
  // Apply this late so PLAYFIELD_CENTER and the existing flipper positions do
  // not move with the divider.
  const narrowLaunchLaneWidth = ball.radius * 2 + 2;
  const narrowLaunchDividerX =
    TABLE.right - shooterDivider.radius - narrowLaunchLaneWidth;
  const narrowLaunchBallX = TABLE.right - ball.radius - 1;

  SHOOTER.dividerX = narrowLaunchDividerX;
  SHOOTER.ballX = narrowLaunchBallX;
  shooterDivider.x1 = narrowLaunchDividerX;
  shooterDivider.x2 = narrowLaunchDividerX;
  for (const rail of shooterDividerRails) {
    rail.x1 = narrowLaunchDividerX;
    rail.x2 = narrowLaunchDividerX;
  }
  plunger.x = narrowLaunchBallX;
  if (ball.ready) {
    ball.x = narrowLaunchBallX;
  }

  // The cyan outer orbit wall still reached down into the narrowed launch line
  // even after its final vertical segment was removed. Cut the preceding segment
  // back to y=100, preserving the upper orbit guide while leaving a true ball-width
  // mouth for the medium launch to pass upward beneath Ocean Drive.
  const orbitEntryCutback = { x: 448, y: 100 };
  if (coastalOrbitOuterPoints.length >= 8) {
    coastalOrbitOuterPoints[6].x = orbitEntryCutback.x;
    coastalOrbitOuterPoints[6].y = orbitEntryCutback.y;
    coastalOrbitOuterPoints[7].x = orbitEntryCutback.x;
    coastalOrbitOuterPoints[7].y = orbitEntryCutback.y;
  }
  if (coastalOrbitRails.length > 6) {
    Object.assign(coastalOrbitRails[5], {
      x2: orbitEntryCutback.x,
      y2: orbitEntryCutback.y
    });
    coastalOrbitRails.splice(6, 1);
  }

  // Keep the medium-launch entry as one collision surface. The ball moved
  // 17 pixels right when the lane was narrowed, so translate the entire original
  // chute by the same amount without changing its angle, length, restitution,
  // or the point where the launch line meets it. The far endpoint may sit just
  // beyond the cabinet wall; that hidden portion is unreachable by the ball.
  const launchLaneShift = narrowLaunchBallX - 430;
  Object.assign(shooterDiverter, {
    x1: 400 + launchLaneShift,
    y1: 190,
    x2: 447 + launchLaneShift,
    y2: 232
  });

  // Re-shape the lower return/low-launch guide around the narrow lane instead
  // of leaving its old inner endpoint stranded far left of the moved divider.
  Object.assign(shooterRecoveryGuidePoints[0], { x: TABLE.right - 1, y: 510 });
  Object.assign(shooterRecoveryGuidePoints[1], { x: 449, y: 522 });
  Object.assign(shooterRecoveryGuidePoints[2], { x: 438, y: 533 });
  Object.assign(shooterRecoveryGuidePoints[3], {
    x: narrowLaunchDividerX - ball.radius - 4,
    y: 538
  });

  // Move the existing right blue gutter rail with the divider. Keeping its old
  // 41/48-pixel offsets from the launch wall restores the original right-outlane
  // envelope instead of leaving a new full-width escape chute beside the flipper.
  const rightLowerGuide = lowerGuides[1];
  Object.assign(rightLowerGuide, {
    x1: narrowLaunchDividerX - 41,
    y1: 590,
    x2: narrowLaunchDividerX - 48,
    y2: 640
  });

  const buildNumberDisplay = document.querySelector('.build-number');
  if (buildNumberDisplay) {
    buildNumberDisplay.textContent = 'Build 20260830-ENTRYCUT';
  }

  const instructions = document.querySelector('.instruction-content');
  if (instructions) {
    instructions.append(document.createTextNode(
      ' Three upper-left circle passes light all three loop bumpers for 3X scoring until the ball drains.'
    ));
  }
})();