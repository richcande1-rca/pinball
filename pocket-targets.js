// Miami Nights: five small standup targets mounted along the playfield-side
// wall beneath Ocean Drive. They add things to hit without occupying the open
// center lanes or changing any existing ramp / table geometry.

(() => {
  if (window.miamiPocketTargetsInstalled) return;
  window.miamiPocketTargetsInstalled = true;

  const pocketTargets = [
    { x1: 333, y1: 210, x2: 339, y2: 221, radius: 3.5, value: 300, accent: 'cyan', armed: true, flashStartedAt: -Infinity },
    { x1: 337, y1: 242, x2: 340, y2: 254, radius: 3.5, value: 300, accent: 'magenta', armed: true, flashStartedAt: -Infinity },
    { x1: 340, y1: 275, x2: 341, y2: 288, radius: 3.5, value: 300, accent: 'lavender', armed: true, flashStartedAt: -Infinity },
    { x1: 342, y1: 309, x2: 342, y2: 322, radius: 3.5, value: 300, accent: 'cyan', armed: true, flashStartedAt: -Infinity },
    { x1: 342, y1: 344, x2: 341, y2: 357, radius: 3.5, value: 300, accent: 'magenta', armed: true, flashStartedAt: -Infinity }
  ];

  function targetDistance(target) {
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

  function collideWithPocketTarget(target, index) {
    const contact = targetDistance(target);
    const contactDistance = ball.radius + target.radius;

    if (!target.armed) {
      if (contact.distance > contactDistance + 12) target.armed = true;
      return false;
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
      incomingNormalSpeed < 45 ? 0.38 : 0.82
    );

    if (touching && incomingNormalSpeed >= 45) {
      target.armed = false;
      target.flashStartedAt = performance.now();
      score += target.value;
      syncStatusDisplay();

      window.dispatchEvent(new CustomEvent('miami-impact', {
        detail: {
          type: 'post',
          strength: clamp(incomingNormalSpeed / 700, 0.16, 1),
          x: contact.closest.x,
          y: contact.closest.y,
          index: 20 + index
        }
      }));

      window.dispatchEvent(new CustomEvent('miami-pocket-target', {
        detail: { index, points: target.value, score }
      }));
    }

    return touching;
  }

  const baseUpdateWithPocketTargets = update;
  update = function updateWithPocketTargets(dt) {
    baseUpdateWithPocketTargets(dt);

    if (
      gameOver ||
      ball.ready ||
      underpass.active ||
      oceanRamp.active ||
      loopRamp.active ||
      magneticTarget.state === 'holding'
    ) return;

    for (let index = 0; index < pocketTargets.length; index += 1) {
      collideWithPocketTarget(pocketTargets[index], index);
    }
  };

  function drawPocketTarget(target) {
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

    // Compact black housing keeps the face tucked against the Ocean Drive wall.
    ctx.fillStyle = '#02050d';
    ctx.strokeStyle = MIAMI_COLORS.structure;
    ctx.lineWidth = 1.5;
    ctx.fillRect(-width / 2 - 2.5, -5.5, width + 5, 11);
    ctx.strokeRect(-width / 2 - 2.5, -5.5, width + 5, 11);

    ctx.fillStyle = flash > 0 ? '#f4ffff' : '#07101d';
    ctx.strokeStyle = flash > 0 ? '#ffffff' : accent;
    ctx.lineWidth = 2;
    ctx.shadowColor = accent;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : (6 + flash * 16);
    ctx.fillRect(-width / 2, -3.5, width, 7);
    ctx.strokeRect(-width / 2, -3.5, width, 7);
    ctx.restore();
  }

  function drawPocketTargets() {
    for (const target of pocketTargets) drawPocketTarget(target);
  }

  // Draw after the existing passive geometry so the small target faces remain
  // visible against the raised-ramp shadow / rail beside them.
  const baseDrawPassivePlayfieldGeometryWithPocketTargets = drawPassivePlayfieldGeometry;
  drawPassivePlayfieldGeometry = function drawPassivePlayfieldGeometryWithPocketTargets() {
    baseDrawPassivePlayfieldGeometryWithPocketTargets();
    drawPocketTargets();
  };
})();
