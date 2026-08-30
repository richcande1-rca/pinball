// Miami Nights: playable businesses tucked beneath the elevated Ocean Drive ramp.
// This stays late-loaded so the stable core launch/ramp physics remain untouched.

(() => {
  const reefHotel = {
    targets: [
      { x1: 409, y1: 279, x2: 409, y2: 292, radius: 3.5, lit: false, flashStartedAt: -Infinity },
      { x1: 409, y1: 310, x2: 409, y2: 323, radius: 3.5, lit: false, flashStartedAt: -Infinity },
      { x1: 409, y1: 341, x2: 409, y2: 354, radius: 3.5, lit: false, flashStartedAt: -Infinity }
    ],
    targetValue: 400,
    completionValue: 2500,
    completed: false,
    flashStartedAt: -Infinity
  };

  const neonPalms = {
    x1: 387,
    x2: 421,
    y: 400,
    angle: 0,
    angularVelocity: 0,
    rotationAccumulator: 0,
    value: 100,
    drag: 1.25,
    lastTriggerAt: -Infinity,
    flashStartedAt: -Infinity,
    lastPoints: 0
  };

  const cafeOcho = {
    x: 403,
    y: 466,
    radius: 12,
    value: 750,
    active: false,
    holdRemaining: 0,
    captureDuration: 0.55,
    ejectAngle: 225 * Math.PI / 180,
    ejectSpeed: 440,
    flashStartedAt: -Infinity
  };

  function resetOceanDriveBusinesses() {
    for (const target of reefHotel.targets) {
      target.lit = false;
      target.flashStartedAt = -Infinity;
    }
    reefHotel.completed = false;
    reefHotel.flashStartedAt = -Infinity;

    neonPalms.angle = 0;
    neonPalms.angularVelocity = 0;
    neonPalms.rotationAccumulator = 0;
    neonPalms.lastTriggerAt = -Infinity;
    neonPalms.flashStartedAt = -Infinity;
    neonPalms.lastPoints = 0;

    cafeOcho.active = false;
    cafeOcho.holdRemaining = 0;
    cafeOcho.flashStartedAt = -Infinity;
  }

  window.addEventListener('miami-drain', resetOceanDriveBusinesses);

  const baseResetGameWithBusinesses = resetGame;
  resetGame = function resetGameWithBusinesses() {
    resetOceanDriveBusinesses();
    baseResetGameWithBusinesses();
  };

  function collideWithReefHotelTarget(target, index) {
    const closest = closestPointOnSegment(
      ball.x,
      ball.y,
      target.x1,
      target.y1,
      target.x2,
      target.y2
    );
    const dx = ball.x - closest.x;
    const dy = ball.y - closest.y;
    const distance = Math.hypot(dx, dy);
    const contactDistance = ball.radius + target.radius;
    if (distance >= contactDistance) return false;

    let incomingNormalSpeed = 0;
    if (distance > 0.0001) {
      const nx = dx / distance;
      const ny = dy / distance;
      incomingNormalSpeed = -(ball.vx * nx + ball.vy * ny);
    }

    const touching = resolveSegmentCollision(
      target,
      { x: 0, y: 0 },
      incomingNormalSpeed < 45 ? 0.22 : 0.62
    );

    if (touching && !target.lit && incomingNormalSpeed >= 55) {
      target.lit = true;
      target.flashStartedAt = performance.now();
      score += reefHotel.targetValue;

      if (!reefHotel.completed && reefHotel.targets.every(candidate => candidate.lit)) {
        reefHotel.completed = true;
        reefHotel.flashStartedAt = performance.now();
        score += reefHotel.completionValue;
      }

      syncStatusDisplay();
      window.dispatchEvent(new CustomEvent('miami-impact', {
        detail: {
          type: 'post',
          strength: clamp(incomingNormalSpeed / 700, 0.14, 1),
          x: closest.x,
          y: closest.y,
          index: 20 + index
        }
      }));
    }

    return touching;
  }

  function triggerNeonPalms(previousX, previousY) {
    const now = performance.now();
    if (now - neonPalms.lastTriggerAt < 130) return;

    const crossedUp = previousY > neonPalms.y && ball.y <= neonPalms.y;
    const crossedDown = previousY < neonPalms.y && ball.y >= neonPalms.y;
    if (!crossedUp && !crossedDown) return;

    const dy = ball.y - previousY;
    const crossingT = Math.abs(dy) > 0.0001
      ? clamp((neonPalms.y - previousY) / dy, 0, 1)
      : 0;
    const crossingX = previousX + (ball.x - previousX) * crossingT;
    if (crossingX < neonPalms.x1 || crossingX > neonPalms.x2) return;

    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed < 120) return;

    const direction = crossedUp ? 1 : -1;
    const addedSpin = clamp(speed * 0.075, 10, 48);
    neonPalms.angularVelocity = clamp(
      neonPalms.angularVelocity + direction * addedSpin,
      -62,
      62
    );
    neonPalms.lastTriggerAt = now;
    neonPalms.flashStartedAt = now;
  }

  function updateNeonPalms(dt) {
    if (neonPalms.angularVelocity === 0) return;

    const rotation = neonPalms.angularVelocity * dt;
    neonPalms.angle = (neonPalms.angle + rotation) % (Math.PI * 2);
    neonPalms.rotationAccumulator += Math.abs(rotation);

    while (neonPalms.rotationAccumulator >= Math.PI * 2) {
      neonPalms.rotationAccumulator -= Math.PI * 2;
      neonPalms.lastPoints = neonPalms.value;
      neonPalms.flashStartedAt = performance.now();
      score += neonPalms.value;
      syncStatusDisplay();
    }

    neonPalms.angularVelocity *= Math.exp(-neonPalms.drag * dt);
    if (Math.abs(neonPalms.angularVelocity) < 0.12) {
      neonPalms.angularVelocity = 0;
    }
  }

  function tryCaptureCafeOcho() {
    if (cafeOcho.active) return false;

    const distance = Math.hypot(ball.x - cafeOcho.x, ball.y - cafeOcho.y);
    const speed = Math.hypot(ball.vx, ball.vy);
    if (distance > cafeOcho.radius || speed < 110) return false;

    cafeOcho.active = true;
    cafeOcho.holdRemaining = cafeOcho.captureDuration;
    cafeOcho.flashStartedAt = performance.now();
    ball.x = cafeOcho.x;
    ball.y = cafeOcho.y;
    ball.vx = 0;
    ball.vy = 0;
    score += cafeOcho.value;
    syncStatusDisplay();
    return true;
  }

  function updateCafeOcho(dt) {
    ball.x = cafeOcho.x;
    ball.y = cafeOcho.y;
    ball.vx = 0;
    ball.vy = 0;
    cafeOcho.holdRemaining = Math.max(0, cafeOcho.holdRemaining - dt);
    if (cafeOcho.holdRemaining > 0) return;

    const ux = Math.cos(cafeOcho.ejectAngle);
    const uy = Math.sin(cafeOcho.ejectAngle);
    const clearance = cafeOcho.radius + ball.radius + 3;
    cafeOcho.active = false;
    cafeOcho.flashStartedAt = performance.now();
    ball.x = cafeOcho.x + ux * clearance;
    ball.y = cafeOcho.y + uy * clearance;
    ball.vx = ux * cafeOcho.ejectSpeed;
    ball.vy = uy * cafeOcho.ejectSpeed;
    shooterRoute = 'released';
    ballHasEnteredPlayfield = true;
  }

  const baseUpdateWithBusinesses = update;
  update = function updateWithOceanDriveBusinesses(dt) {
    updateNeonPalms(dt);

    if (cafeOcho.active) {
      for (const flipper of flippers) {
        updateFlipper(flipper, dt);
      }
      updateCafeOcho(dt);
      return;
    }

    const previousX = ball.x;
    const previousY = ball.y;
    baseUpdateWithBusinesses(dt);

    if (
      gameOver ||
      ball.ready ||
      underpass.active ||
      oceanRamp.active ||
      loopRamp.active ||
      magneticTarget.state === 'holding'
    ) return;

    for (const [index, target] of reefHotel.targets.entries()) {
      collideWithReefHotelTarget(target, index);
    }

    triggerNeonPalms(previousX, previousY);
    tryCaptureCafeOcho();
  };

  function drawBusinessFacade(x, y, width, height, accent) {
    ctx.save();
    ctx.fillStyle = 'rgba(2, 5, 14, 0.88)';
    ctx.strokeStyle = MIAMI_COLORS.structure;
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);

    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.shadowColor = accent;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 5;
    ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);
    ctx.restore();
  }

  function drawReefHotel(now) {
    drawBusinessFacade(379, 268, 48, 91, MIAMI_COLORS.cyan);

    const completionAge = now - reefHotel.flashStartedAt;
    const completionFlash = completionAge >= 0 && completionAge < 700
      ? 1 - completionAge / 700
      : 0;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 7px ui-monospace, monospace';
    ctx.fillStyle = completionFlash > 0 ? '#ffffff' : MIAMI_COLORS.cyan;
    ctx.shadowColor = MIAMI_COLORS.cyan;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : (6 + completionFlash * 14);
    ctx.fillText('REEF', 402.5, 277);
    ctx.font = '700 5px ui-monospace, monospace';
    ctx.fillStyle = MIAMI_COLORS.lavender;
    ctx.fillText('HOTEL', 402.5, 285);

    for (const [index, target] of reefHotel.targets.entries()) {
      const hitAge = now - target.flashStartedAt;
      const hitFlash = hitAge >= 0 && hitAge < 260 ? 1 - hitAge / 260 : 0;
      const centerY = (target.y1 + target.y2) / 2;
      ctx.globalAlpha = target.lit ? 1 : 0.45;
      ctx.fillStyle = hitFlash > 0 ? '#ffffff' : (target.lit ? MIAMI_COLORS.cyan : '#07101d');
      ctx.strokeStyle = target.lit ? '#ffffff' : MIAMI_COLORS.lavender;
      ctx.shadowColor = MIAMI_COLORS.cyan;
      ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : (target.lit ? 8 : 2);
      ctx.fillRect(397, centerY - 5, 14, 10);
      ctx.strokeRect(397, centerY - 5, 14, 10);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#f4ffff';
      ctx.font = '700 5px ui-monospace, monospace';
      ctx.fillText(String(index + 1), 404, centerY + 0.5);
    }
    ctx.restore();
  }

  function drawNeonPalms(now) {
    drawBusinessFacade(379, 367, 48, 59, MIAMI_COLORS.magenta);
    const flashAge = now - neonPalms.flashStartedAt;
    const flash = flashAge >= 0 && flashAge < 240 ? 1 - flashAge / 240 : 0;
    const faceWidth = Math.max(0.12, Math.abs(Math.cos(neonPalms.angle)));

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 6px ui-monospace, monospace';
    ctx.fillStyle = flash > 0 ? '#ffffff' : MIAMI_COLORS.magenta;
    ctx.shadowColor = MIAMI_COLORS.magenta;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : (5 + flash * 12);
    ctx.fillText('NEON', 403, 377);
    ctx.fillStyle = MIAMI_COLORS.cyan;
    ctx.fillText('PALMS', 403, 385);

    ctx.translate(404, neonPalms.y);
    ctx.scale(faceWidth, 1);
    ctx.fillStyle = flash > 0 ? '#ffffff' : '#07101d';
    ctx.strokeStyle = flash > 0 ? '#ffffff' : MIAMI_COLORS.cyan;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = MIAMI_COLORS.magenta;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : (5 + flash * 12);
    ctx.fillRect(-4, -13, 8, 26);
    ctx.strokeRect(-4, -13, 8, 26);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = MIAMI_COLORS.lavender;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(neonPalms.x1, neonPalms.y);
    ctx.lineTo(neonPalms.x2, neonPalms.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawCafeOcho(now) {
    drawBusinessFacade(379, 434, 48, 61, MIAMI_COLORS.lavender);
    const flashAge = now - cafeOcho.flashStartedAt;
    const flash = flashAge >= 0 && flashAge < 320 ? 1 - flashAge / 320 : 0;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 6px ui-monospace, monospace';
    ctx.fillStyle = flash > 0 ? '#ffffff' : MIAMI_COLORS.lavender;
    ctx.shadowColor = MIAMI_COLORS.magenta;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : (5 + flash * 13);
    ctx.fillText('CAFE', 403, 443);
    ctx.fillStyle = MIAMI_COLORS.cyan;
    ctx.fillText('OCHO', 403, 451);

    ctx.fillStyle = '#02040b';
    ctx.strokeStyle = flash > 0 ? '#ffffff' : MIAMI_COLORS.magenta;
    ctx.lineWidth = 2;
    ctx.shadowColor = MIAMI_COLORS.magenta;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : (6 + flash * 14);
    ctx.beginPath();
    ctx.arc(cafeOcho.x, cafeOcho.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = MIAMI_COLORS.cyan;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cafeOcho.x, cafeOcho.y, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawOceanDriveBusinesses() {
    const now = performance.now();
    drawReefHotel(now);
    drawNeonPalms(now);
    drawCafeOcho(now);
  }

  // Paint the storefronts first so the elevated Ocean Drive deck naturally
  // passes over them instead of looking like flat artwork pasted on top.
  const baseDrawOceanRampWithBusinesses = drawOceanRamp;
  drawOceanRamp = function drawOceanRampWithBusinesses() {
    drawOceanDriveBusinesses();
    baseDrawOceanRampWithBusinesses();
  };

  const buildNumberDisplay = document.querySelector('.build-number');
  if (buildNumberDisplay) {
    buildNumberDisplay.textContent = 'Build 20260830-BUSINESSES';
  }

  const instructions = document.querySelector('.instruction-content');
  if (instructions) {
    instructions.append(document.createTextNode(
      ' Ocean Drive businesses: light all three REEF HOTEL floors, spin NEON PALMS, or sink CAFE OCHO for its kickout.'
    ));
  }
})();