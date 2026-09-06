// Miami Nights: small secondary targets in previously dead playfield space.
// The three center targets are a compact drop bank: each folds away when hit
// and the bank resets shortly after all three are down. Side-wall targets stay
// fixed. Group metadata/events remain available for later strategy rules.

(() => {
  if (window.miamiSecondaryTargetsInstalled) return;
  window.miamiSecondaryTargetsInstalled = true;

  const secondaryTargets = [
    // Three compact drop targets around the palm/cars. They disappear after a
    // solid hit so the lower center opens back up during play.
    { x1: 112, y1: 430, x2: 126, y2: 430, radius: 3.25, value: 300, accent: 'cyan', group: 'center', groupIndex: 0, drop: true, dropped: false, armed: true, flashStartedAt: -Infinity },
    { x1: 294, y1: 430, x2: 308, y2: 430, radius: 3.25, value: 300, accent: 'magenta', group: 'center', groupIndex: 1, drop: true, dropped: false, armed: true, flashStartedAt: -Infinity },
    { x1: 203, y1: 505, x2: 217, y2: 505, radius: 3.25, value: 300, accent: 'lavender', group: 'center', groupIndex: 2, drop: true, dropped: false, armed: true, flashStartedAt: -Infinity },

    // Two flush standups beneath the captive-ball cage. They live on the side
    // wall so the captive-ball shot itself remains completely unobstructed.
    { x1: 44, y1: 348, x2: 44, y2: 364, radius: 3.25, value: 300, accent: 'magenta', group: 'captive-side', groupIndex: 0, drop: false, armed: true, flashStartedAt: -Infinity },
    { x1: 44, y1: 386, x2: 44, y2: 402, radius: 3.25, value: 300, accent: 'cyan', group: 'captive-side', groupIndex: 1, drop: false, armed: true, flashStartedAt: -Infinity },

    // The upper-right pair now lives all the way in the playable corner pocket.
    // A loose playfield ball can get up here and hit them. The strong-launch ball
    // is on the elevated orbit route, so these lower-playfield standups are made
    // non-colliding only while shooterRoute === 'orbit'.
    { x1: 432, y1: 58, x2: 432, y2: 74, radius: 3.25, value: 300, accent: 'cyan', group: 'upper-right', groupIndex: 0, drop: false, armed: true, flashStartedAt: -Infinity },
    { x1: 432, y1: 88, x2: 432, y2: 104, radius: 3.25, value: 300, accent: 'magenta', group: 'upper-right', groupIndex: 1, drop: false, armed: true, flashStartedAt: -Infinity }
  ];

  const centerDropTargets = secondaryTargets.filter(target => target.group === 'center');
  const CENTER_BANK_RESET_DELAY = 1.0;
  let centerBankResetRemaining = 0;
  let centerBankCompleteFlashStartedAt = -Infinity;

  function targetContact(target) {
    const closest = closestPointOnSegment(
      ball.x,
      ball.y,
      target.x1,
      target.y1,
      target.x2,
      target.y2
    );
    return {
      closest,
      distance: Math.hypot(ball.x - closest.x, ball.y - closest.y)
    };
  }

  function currentScoreMultiplier() {
    return (
      typeof centerDoubleScoreRemaining !== 'undefined' &&
      centerDoubleScoreRemaining > 0
    ) ? 2 : 1;
  }

  function resetCenterDropBank() {
    centerBankResetRemaining = 0;
    for (const target of centerDropTargets) {
      target.dropped = false;
      target.armed = true;
    }
  }

  const baseResetPlayfieldForSecondaryTargets = resetPlayfieldForBall;
  resetPlayfieldForBall = function resetPlayfieldWithSecondaryTargets() {
    baseResetPlayfieldForSecondaryTargets();
    resetCenterDropBank();
    centerBankCompleteFlashStartedAt = -Infinity;
  };

  function collideWithSecondaryTarget(target, index) {
    if (target.drop && target.dropped) return false;

    // These two targets are beneath the elevated strong-launch route. The orbit
    // ball passes over them; once it is back in ordinary loose play they become
    // normal physical standups again.
    if (target.group === 'upper-right' && shooterRoute === 'orbit') return false;

    const contact = targetContact(target);
    const contactDistance = ball.radius + target.radius;

    if (!target.drop && !target.armed && contact.distance > contactDistance + 12) {
      target.armed = true;
    }

    if (contact.distance >= contactDistance) return false;

    let incomingNormalSpeed = 0;
    if (contact.distance > 0.0001) {
      const nx = (ball.x - contact.closest.x) / contact.distance;
      const ny = (ball.y - contact.closest.y) / contact.distance;
      incomingNormalSpeed = -(ball.vx * nx + ball.vy * ny);
    }

    const touching = resolveSegmentCollision(
      target,
      { x: 0, y: 0 },
      incomingNormalSpeed < 45 ? 0.34 : 0.78
    );

    if (touching && target.armed && incomingNormalSpeed >= 45) {
      target.armed = false;
      target.flashStartedAt = performance.now();
      if (target.drop) target.dropped = true;

      const awardedPoints = target.value * currentScoreMultiplier();
      score += awardedPoints;
      syncStatusDisplay();

      window.dispatchEvent(new CustomEvent('miami-impact', {
        detail: {
          type: 'post',
          strength: clamp(incomingNormalSpeed / 700, 0.14, 1),
          x: contact.closest.x,
          y: contact.closest.y,
          index: 40 + index
        }
      }));

      window.dispatchEvent(new CustomEvent('miami-secondary-target', {
        detail: {
          index,
          group: target.group,
          groupIndex: target.groupIndex,
          dropped: Boolean(target.dropped),
          points: awardedPoints,
          score
        }
      }));

      if (
        target.drop &&
        centerBankResetRemaining <= 0 &&
        centerDropTargets.every(candidate => candidate.dropped)
      ) {
        centerBankCompleteFlashStartedAt = performance.now();
        centerBankResetRemaining = CENTER_BANK_RESET_DELAY;
        window.dispatchEvent(new CustomEvent('miami-secondary-bank-complete', {
          detail: { group: 'center', score }
        }));
      }
    }

    return touching;
  }

  const baseUpdateWithSecondaryTargets = update;
  update = function updateWithSecondaryTargets(dt) {
    baseUpdateWithSecondaryTargets(dt);

    if (centerBankResetRemaining > 0) {
      centerBankResetRemaining = Math.max(0, centerBankResetRemaining - dt);
      if (centerBankResetRemaining === 0) resetCenterDropBank();
    }

    if (
      gameOver ||
      ball.ready ||
      underpass.active ||
      oceanRamp.active ||
      loopRamp.active ||
      magneticTarget.state === 'holding'
    ) return;

    for (let index = 0; index < secondaryTargets.length; index += 1) {
      collideWithSecondaryTarget(secondaryTargets[index], index);
    }
  };

  function drawSecondaryTarget(target) {
    const centerX = (target.x1 + target.x2) / 2;
    const centerY = (target.y1 + target.y2) / 2;
    const width = Math.hypot(target.x2 - target.x1, target.y2 - target.y1);
    const angle = Math.atan2(target.y2 - target.y1, target.x2 - target.x1);
    const accent = MIAMI_COLORS[target.accent] || MIAMI_COLORS.lavender;
    const age = performance.now() - target.flashStartedAt;
    const flash = age >= 0 && age < 260 ? 1 - age / 260 : 0;

    // A dropped target leaves only a momentary floor-level glint, then clears
    // completely out of the playfield until the three-target bank resets.
    if (target.drop && target.dropped) {
      if (flash <= 0) return;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);
      ctx.globalAlpha = flash * 0.8;
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = accent;
      ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 10;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-width / 2, 2.5);
      ctx.lineTo(width / 2, 2.5);
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);

    ctx.fillStyle = '#02050d';
    ctx.strokeStyle = MIAMI_COLORS.structure;
    ctx.lineWidth = 1.4;
    ctx.fillRect(-width / 2 - 2, -5, width + 4, 10);
    ctx.strokeRect(-width / 2 - 2, -5, width + 4, 10);

    ctx.fillStyle = flash > 0 ? '#f4ffff' : '#07101d';
    ctx.strokeStyle = flash > 0 ? '#ffffff' : accent;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = accent;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : (5 + flash * 14);
    ctx.fillRect(-width / 2, -3, width, 6);
    ctx.strokeRect(-width / 2, -3, width, 6);
    ctx.restore();
  }

  function drawSecondaryTargets() {
    for (const target of secondaryTargets) drawSecondaryTarget(target);

    const completionFlash = clamp(
      1 - (performance.now() - centerBankCompleteFlashStartedAt) / 420,
      0,
      1
    );
    if (completionFlash <= 0) return;

    ctx.save();
    ctx.globalAlpha = completionFlash * 0.7;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = MIAMI_COLORS.lavender;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 14;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(PLAYFIELD_CENTER, 468, 24 + (1 - completionFlash) * 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const baseDrawPassivePlayfieldGeometryWithSecondaryTargets = drawPassivePlayfieldGeometry;
  drawPassivePlayfieldGeometry = function drawPassivePlayfieldGeometryWithSecondaryTargets() {
    baseDrawPassivePlayfieldGeometryWithSecondaryTargets();
    drawSecondaryTargets();
  };
})();
