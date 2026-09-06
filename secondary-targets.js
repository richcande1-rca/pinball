// Miami Nights: small secondary targets in previously dead playfield space.
// These are simple scoring standups for now. Group metadata/events are exposed
// so strategy rules can be attached later without moving the approved geometry.

(() => {
  if (window.miamiSecondaryTargetsInstalled) return;
  window.miamiSecondaryTargetsInstalled = true;

  const secondaryTargets = [
    // Three compact center-field targets around the palm/cars. These sit outside
    // the palm ring and logo, leaving the main flipper lanes open.
    { x1: 112, y1: 430, x2: 126, y2: 430, radius: 3.25, value: 300, accent: 'cyan', group: 'center', groupIndex: 0, armed: true, flashStartedAt: -Infinity },
    { x1: 294, y1: 430, x2: 308, y2: 430, radius: 3.25, value: 300, accent: 'magenta', group: 'center', groupIndex: 1, armed: true, flashStartedAt: -Infinity },
    { x1: 203, y1: 505, x2: 217, y2: 505, radius: 3.25, value: 300, accent: 'lavender', group: 'center', groupIndex: 2, armed: true, flashStartedAt: -Infinity },

    // Two flush standups beneath the captive-ball cage. They live on the side
    // wall so the captive-ball shot itself remains completely unobstructed.
    { x1: 44, y1: 348, x2: 44, y2: 364, radius: 3.25, value: 300, accent: 'magenta', group: 'captive-side', groupIndex: 0, armed: true, flashStartedAt: -Infinity },
    { x1: 44, y1: 386, x2: 44, y2: 402, radius: 3.25, value: 300, accent: 'cyan', group: 'captive-side', groupIndex: 1, armed: true, flashStartedAt: -Infinity },

    // Two-target mini-bank in the far upper-right pocket below the entry ramp.
    // Keep them shallow against the wall so launch/Ocean Drive paths stay open.
    { x1: 410, y1: 208, x2: 424, y2: 208, radius: 3.25, value: 300, accent: 'cyan', group: 'upper-right', groupIndex: 0, armed: true, flashStartedAt: -Infinity },
    { x1: 414, y1: 238, x2: 428, y2: 238, radius: 3.25, value: 300, accent: 'magenta', group: 'upper-right', groupIndex: 1, armed: true, flashStartedAt: -Infinity }
  ];

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

  function collideWithSecondaryTarget(target, index) {
    const contact = targetContact(target);
    const contactDistance = ball.radius + target.radius;

    if (!target.armed && contact.distance > contactDistance + 12) {
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
          points: awardedPoints,
          score
        }
      }));
    }

    return touching;
  }

  const baseUpdateWithSecondaryTargets = update;
  update = function updateWithSecondaryTargets(dt) {
    baseUpdateWithSecondaryTargets(dt);

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
  }

  const baseDrawPassivePlayfieldGeometryWithSecondaryTargets = drawPassivePlayfieldGeometry;
  drawPassivePlayfieldGeometry = function drawPassivePlayfieldGeometryWithSecondaryTargets() {
    baseDrawPassivePlayfieldGeometryWithSecondaryTargets();
    drawSecondaryTargets();
  };
})();
