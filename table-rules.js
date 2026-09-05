// Miami Nights table-specific rules and mechanisms that sit on top of game.js.
// Extracted from index.html without changing classic-script scope or load order.

// Tuck the scoop immediately beneath Ocean Drive and keep its playfield
// guides above the established launch trajectory.
underpass.entry.y = 90;
Object.assign(underpassEntryGuides[0], { y1: 100, y2: 78 });
Object.assign(underpassEntryGuides[1], { y1: 100, y2: 78 });

// Two larger, softer powered pops flank the scoop approach. They use the
// existing pop-bumper collision/scoring rules, but their wider spacing and
// gentler kick are meant to turn near-misses into lively upper-table chaos
// rather than force a scripted route into the underpass.
const underpassPopBumpers = [
  { x: 225, y: 132, radius: 10.5, kick: 190, accent: 'cyan', armed: true, flashStartedAt: -Infinity, lastPoints: 100 },
  { x: 318, y: 145, radius: 10, kick: 185, accent: 'magenta', armed: true, flashStartedAt: -Infinity, lastPoints: 100 }
];
popBumpers.push(...underpassPopBumpers);

const baseDrawPopBumpersWithUnderpassPops = drawPopBumpers;
drawPopBumpers = function drawPopBumpersWithUnderpassPops() {
  baseDrawPopBumpersWithUnderpassPops();
  const now = performance.now();

  for (const bumper of underpassPopBumpers) {
    const accent = MIAMI_COLORS[bumper.accent];
    const hitAge = now - bumper.flashStartedAt;
    const flashStrength = hitAge >= 0 && hitAge < 260
      ? 1 - hitAge / 260
      : 0;

    ctx.save();
    ctx.translate(bumper.x, bumper.y);
    ctx.strokeStyle = MIAMI_COLORS.structure;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, bumper.radius + 2.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = flashStrength > 0 ? '#f4ffff' : accent;
    ctx.lineWidth = 2;
    ctx.shadowColor = accent;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 :
      (8 + flashStrength * 18);
    ctx.beginPath();
    ctx.arc(0, 0, bumper.radius + 1.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
};

underpass.outlets[0].x = 150;
Object.assign(underpass.outlets[4], {
  x: 72,
  y: 536,
  radius: 13,
  edge: 'right'
});

const underpassRandomizer = {
  exitIndex: 0,
  travelRemaining: 0,
  entrySpeed: 0
};

const baseTryEnterUnderpass = tryEnterUnderpass;
tryEnterUnderpass = function tryEnterUnderpassRandomized() {
  const entered = baseTryEnterUnderpass();
  if (!entered) return false;

  underpassRandomizer.exitIndex = Math.floor(
    Math.random() * underpass.outlets.length
  );
  underpassRandomizer.travelRemaining = 0.4 + Math.random() * 0.5;
  underpassRandomizer.entrySpeed = Math.hypot(ball.vx, ball.vy);
  return true;
};

updateUnderpass = function updateUnderpassRandomized(dt) {
  if (!underpass.active) return false;

  underpassRandomizer.travelRemaining = Math.max(
    0,
    underpassRandomizer.travelRemaining - dt
  );

  if (underpassRandomizer.travelRemaining > 0) {
    ball.x = -100;
    ball.y = -100;
    ball.vx = 0;
    ball.vy = 0;
    return true;
  }

  const outlet = underpass.outlets[underpassRandomizer.exitIndex];
  const baseAngle = outlet.edge === 'top'
    ? -Math.PI / 2
    : outlet.edge === 'right'
      ? 0
      : Math.PI;
  const angle = baseAngle + (Math.random() * 2 - 1) * 16 * Math.PI / 180;
  const exitSpeed = clamp(
    underpassRandomizer.entrySpeed * (0.82 + Math.random() * 0.2),
    180,
    760
  );
  const clearance = ball.radius + 5;

  ball.x = outlet.x + Math.cos(baseAngle) * clearance;
  ball.y = outlet.y + Math.sin(baseAngle) * clearance;
  ball.vx = Math.cos(angle) * exitSpeed;
  ball.vy = Math.sin(angle) * exitSpeed;
  underpass.active = false;
  ballHasEnteredPlayfield = true;
  shooterRoute = 'released';
  return false;
};

Object.assign(midPlayfieldGuides[0], {
  x1: 70,
  y1: 438,
  x2: 106,
  y2: 466
});

const centerStandupTargets = [
  { x1: 122, y1: 278, x2: 166, y2: 278, radius: 4.5, value: 300, accent: 'cyan', hit: false, flashStartedAt: -Infinity },
  { x1: 188, y1: 264, x2: 232, y2: 264, radius: 4.5, value: 300, accent: 'lavender', hit: false, flashStartedAt: -Infinity },
  { x1: 254, y1: 278, x2: 298, y2: 278, radius: 4.5, value: 300, accent: 'magenta', hit: false, flashStartedAt: -Infinity }
];
const centerStandupBank = {
  completeFlashStartedAt: -Infinity
};
const CENTER_DOUBLE_SCORE_DURATION = 18;
let centerDoubleScoreRemaining = 0;

function resetCenterStandupTargets() {
  for (const target of centerStandupTargets) {
    target.hit = false;
    target.flashStartedAt = -Infinity;
  }
  centerStandupBank.completeFlashStartedAt = -Infinity;
}

const baseResetGameWithCenterTargets = resetGame;
resetGame = function resetGameWithCenterTargets() {
  resetCenterStandupTargets();
  centerDoubleScoreRemaining = 0;
  baseResetGameWithCenterTargets();
};

window.addEventListener('miami-drain', () => {
  resetCenterStandupTargets();
  centerDoubleScoreRemaining = 0;
});

function collideWithCenterStandupTarget(target) {
  if (target.hit) return false;

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
    incomingNormalSpeed < 45 ? 0.28 : 0.7
  );

  if (touching && incomingNormalSpeed >= 55) {
    target.hit = true;
    target.flashStartedAt = performance.now();
    score += target.value;

    const bankComplete = centerStandupTargets.every(candidate => candidate.hit);
    if (bankComplete) {
      centerStandupBank.completeFlashStartedAt = performance.now();
      centerDoubleScoreRemaining = CENTER_DOUBLE_SCORE_DURATION;
    }

    syncStatusDisplay();
    window.dispatchEvent(new CustomEvent('miami-impact', {
      detail: {
        type: 'post',
        strength: clamp(incomingNormalSpeed / 700, 0.14, 1),
        x: closest.x,
        y: closest.y,
        index: 11 + centerStandupTargets.indexOf(target)
      }
    }));
  }

  return touching;
}

function drawCenterStandupTargets() {
  const now = performance.now();
  const completionAge = now - centerStandupBank.completeFlashStartedAt;
  const completionFlash = completionAge >= 0 && completionAge < 700
    ? 1 - completionAge / 700
    : 0;
  const modePulse = centerDoubleScoreRemaining > 0
    ? 0.5 + 0.5 * Math.sin(now / 120)
    : 0;

  for (const target of centerStandupTargets) {
    const accent = MIAMI_COLORS[target.accent];
    const flashAge = now - target.flashStartedAt;
    const hitFlash = flashAge >= 0 && flashAge < 260
      ? 1 - flashAge / 260
      : 0;
    const centerX = (target.x1 + target.x2) / 2;
    const centerY = (target.y1 + target.y2) / 2;
    const width = Math.hypot(target.x2 - target.x1, target.y2 - target.y1);
    const angle = Math.atan2(target.y2 - target.y1, target.x2 - target.x1);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);

    if (target.hit) {
      if (hitFlash > 0) {
        ctx.globalAlpha = hitFlash;
        ctx.fillStyle = accent;
        ctx.shadowColor = accent;
        ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 14;
        ctx.fillRect(-width / 2, 4, width, 2.5);
      }
      ctx.restore();
      continue;
    }

    ctx.fillStyle = '#030611';
    ctx.strokeStyle = MIAMI_COLORS.structure;
    ctx.lineWidth = 2;
    ctx.fillRect(-width / 2 - 3, -7, width + 6, 14);
    ctx.strokeRect(-width / 2 - 3, -7, width + 6, 14);

    ctx.fillStyle = hitFlash > 0 ? '#f4ffff' : '#07101d';
    ctx.strokeStyle = hitFlash > 0 || completionFlash > 0
      ? '#ffffff'
      : accent;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = accent;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 :
      (7 + hitFlash * 18 + completionFlash * 8);
    ctx.fillRect(-width / 2, -5, width, 10);
    ctx.strokeRect(-width / 2, -5, width, 10);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(PLAYFIELD_CENTER, 238);
  ctx.globalAlpha = centerDoubleScoreRemaining > 0 ? 1 : 0.5;
  ctx.fillStyle = '#050815';
  ctx.strokeStyle = centerDoubleScoreRemaining > 0
    ? '#f4ffff'
    : MIAMI_COLORS.lavender;
  ctx.shadowColor = centerDoubleScoreRemaining > 0
    ? MIAMI_COLORS.magenta
    : MIAMI_COLORS.lavender;
  ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 :
    (centerDoubleScoreRemaining > 0 ? 8 + modePulse * 12 : 3);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = centerDoubleScoreRemaining > 0
    ? '#f4ffff'
    : MIAMI_COLORS.lavender;
  ctx.font = '900 9px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('2X', 0, 0.5);
  ctx.restore();
}

const upperNeonInserts = [
  { x: 146, y: 210, accent: 'cyan', lit: false },
  { x: 184, y: 228, accent: 'magenta', lit: false },
  { x: 226, y: 216, accent: 'lavender', lit: false },
  { x: 269, y: 228, accent: 'cyan', lit: false },
  { x: 309, y: 210, accent: 'magenta', lit: false }
];
const UPPER_NEON_TRIGGER_RADIUS = 20;
const UPPER_NEON_BONUS = 1000;
let upperNeonBonusAwarded = false;
let upperNeonCompleteFlashStartedAt = -Infinity;

function resetUpperNeonInserts() {
  for (const insert of upperNeonInserts) {
    insert.lit = false;
  }
  upperNeonBonusAwarded = false;
  upperNeonCompleteFlashStartedAt = -Infinity;
}

const baseResetGameWithUpperNeons = resetGame;
resetGame = function resetGameWithUpperNeons() {
  resetUpperNeonInserts();
  baseResetGameWithUpperNeons();
};

window.addEventListener('miami-drain', resetUpperNeonInserts);

function updateUpperNeonInserts() {
  const liveBallOnMainPlayfield =
    !ball.ready &&
    !underpass.active &&
    !oceanRamp.active &&
    !loopRamp.active &&
    magneticTarget.state !== 'holding';
  if (!liveBallOnMainPlayfield) return;

  for (const insert of upperNeonInserts) {
    if (insert.lit) continue;
    if (Math.hypot(ball.x - insert.x, ball.y - insert.y) <= UPPER_NEON_TRIGGER_RADIUS) {
      insert.lit = true;
    }
  }

  if (!upperNeonBonusAwarded && upperNeonInserts.every(insert => insert.lit)) {
    upperNeonBonusAwarded = true;
    upperNeonCompleteFlashStartedAt = performance.now();
    score += UPPER_NEON_BONUS * (centerDoubleScoreRemaining > 0 ? 2 : 1);
    syncStatusDisplay();
  }
}

function drawUpperNeonInserts() {
  const now = performance.now();
  const completionAge = now - upperNeonCompleteFlashStartedAt;
  const completionFlash = completionAge >= 0 && completionAge < 700
    ? 1 - completionAge / 700
    : 0;

  for (const insert of upperNeonInserts) {
    const accent = MIAMI_COLORS[insert.accent];
    ctx.save();
    ctx.translate(insert.x, insert.y);
    ctx.fillStyle = insert.lit
      ? (completionFlash > 0.45 ? '#f4ffff' : accent)
      : '#050815';
    ctx.strokeStyle = insert.lit ? '#f4ffff' : accent;
    ctx.globalAlpha = insert.lit ? 1 : 0.42;
    ctx.shadowColor = accent;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 :
      (insert.lit ? 8 + completionFlash * 16 : 3);
    ctx.lineWidth = insert.lit ? 1.7 : 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 5.5 + completionFlash * 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

const captiveBall = {
  x: 70,
  y: 320,
  vy: 0,
  radius: 8,
  minY: 262,
  maxY: 320,
  hitValue: 500,
  topValue: 2500,
  hitArmed: true,
  topArmed: true,
  flashStartedAt: -Infinity,
  topFlashStartedAt: -Infinity
};

const captiveBallRails = [
  { x1: 56, y1: 250, x2: 56, y2: 310, radius: 3 },
  { x1: 84, y1: 250, x2: 84, y2: 310, radius: 3 },
  { x1: 56, y1: 250, x2: 84, y2: 250, radius: 3 }
];

const CAPTIVE_EXTRA_BALL_HITS = 5;
const captiveHitLampY = [307, 296, 285, 274, 263];
let captiveHitProgress = 0;
let captiveExtraBallAwarded = false;
let captiveExtraBallFlashStartedAt = -Infinity;
const captiveRoofTarget = {
  rail: captiveBallRails[2],
  value: 1000,
  armed: true,
  flashStartedAt: -Infinity
};

function resetCaptiveBallMechanism() {
  captiveBall.y = captiveBall.maxY;
  captiveBall.vy = 0;
  captiveBall.hitArmed = true;
  captiveBall.topArmed = true;
  captiveBall.flashStartedAt = -Infinity;
  captiveBall.topFlashStartedAt = -Infinity;
  captiveRoofTarget.armed = true;
  captiveRoofTarget.flashStartedAt = -Infinity;
}

const baseResetPlayfieldForCaptiveBall = resetPlayfieldForBall;
resetPlayfieldForBall = function resetPlayfieldWithCaptiveBall() {
  baseResetPlayfieldForCaptiveBall();
  resetCaptiveBallMechanism();
};

const baseResetGameWithCaptiveProgress = resetGame;
resetGame = function resetGameWithCaptiveProgress() {
  captiveHitProgress = 0;
  captiveExtraBallAwarded = false;
  captiveExtraBallFlashStartedAt = -Infinity;
  baseResetGameWithCaptiveProgress();
};

function collideWithCaptiveBall() {
  const dx = ball.x - captiveBall.x;
  const dy = ball.y - captiveBall.y;
  let distance = Math.hypot(dx, dy);
  const contactDistance = ball.radius + captiveBall.radius;

  if (distance > contactDistance + 6) captiveBall.hitArmed = true;
  if (distance >= contactDistance) return;

  let nx;
  let ny;
  if (distance < 0.0001) {
    nx = 0;
    ny = 1;
    distance = 1;
  } else {
    nx = dx / distance;
    ny = dy / distance;
  }

  const overlap = contactDistance - distance;
  ball.x += nx * overlap * 0.65;
  ball.y += ny * overlap * 0.65;
  captiveBall.y = clamp(
    captiveBall.y - ny * overlap * 0.35,
    captiveBall.minY,
    captiveBall.maxY
  );

  const relativeNormalSpeed =
    ball.vx * nx + (ball.vy - captiveBall.vy) * ny;
  if (relativeNormalSpeed >= 0) return;

  const restitution = 0.82;
  const effectiveMass = 1 + ny * ny;
  const impulse = -(1 + restitution) * relativeNormalSpeed / effectiveMass;
  ball.vx += impulse * nx;
  ball.vy += impulse * ny;
  captiveBall.vy -= impulse * ny;

  const impactSpeed = -relativeNormalSpeed;
  if (captiveBall.hitArmed && impactSpeed >= 55) {
    captiveBall.hitArmed = false;
    captiveBall.flashStartedAt = performance.now();
    score += captiveBall.hitValue;

    if (!captiveExtraBallAwarded) {
      captiveHitProgress = Math.min(
        CAPTIVE_EXTRA_BALL_HITS,
        captiveHitProgress + 1
      );

      if (captiveHitProgress === CAPTIVE_EXTRA_BALL_HITS) {
        captiveExtraBallAwarded = true;
        captiveExtraBallFlashStartedAt = performance.now();
        ballsRemaining += 1;
      }
    }

    syncStatusDisplay();
    window.dispatchEvent(new CustomEvent('miami-impact', {
      detail: {
        type: 'post',
        strength: clamp(impactSpeed / 700, 0.12, 1),
        x: captiveBall.x,
        y: captiveBall.y,
        index: 8
      }
    }));
  }
}

function collideWithCaptiveRoofTarget() {
  const roof = captiveRoofTarget.rail;
  const closest = closestPointOnSegment(
    ball.x,
    ball.y,
    roof.x1,
    roof.y1,
    roof.x2,
    roof.y2
  );
  const dx = ball.x - closest.x;
  const dy = ball.y - closest.y;
  const distance = Math.hypot(dx, dy);
  const contactDistance = ball.radius + roof.radius;

  if (!captiveRoofTarget.armed && distance > contactDistance + 10) {
    captiveRoofTarget.armed = true;
  }

  let incomingNormalSpeed = 0;
  if (distance > 0.0001) {
    const nx = dx / distance;
    const ny = dy / distance;
    incomingNormalSpeed = -(ball.vx * nx + ball.vy * ny);
  }

  const cleanTopHit =
    captiveRoofTarget.armed &&
    ball.y < roof.y1 &&
    distance < contactDistance &&
    incomingNormalSpeed >= 55;
  const touching = resolveSegmentCollision(
    roof,
    { x: 0, y: 0 },
    cleanTopHit ? 0.92 : 0.72
  );

  if (touching && cleanTopHit) {
    captiveRoofTarget.armed = false;
    captiveRoofTarget.flashStartedAt = performance.now();
    score += captiveRoofTarget.value;
    syncStatusDisplay();
    window.dispatchEvent(new CustomEvent('miami-impact', {
      detail: {
        type: 'post',
        strength: clamp(incomingNormalSpeed / 700, 0.18, 1),
        x: (roof.x1 + roof.x2) / 2,
        y: roof.y1,
        index: 10
      }
    }));
  }

  return touching;
}

function updateCaptiveBall(dt) {
  captiveBall.vy += gravity * dt;
  captiveBall.y += captiveBall.vy * dt;
  captiveBall.vy *= 0.9985;

  if (captiveBall.y <= captiveBall.minY) {
    const impactSpeed = Math.max(0, -captiveBall.vy);
    captiveBall.y = captiveBall.minY;
    if (captiveBall.vy < 0) captiveBall.vy = impactSpeed * 0.55;

    if (captiveBall.topArmed) {
      captiveBall.topArmed = false;
      captiveBall.topFlashStartedAt = performance.now();
      score += captiveBall.topValue;
      syncStatusDisplay();
      window.dispatchEvent(new CustomEvent('miami-impact', {
        detail: {
          type: 'post',
          strength: clamp(impactSpeed / 700, 0.18, 1),
          x: captiveBall.x,
          y: captiveBall.minY,
          index: 9
        }
      }));
    }
  }

  if (captiveBall.y >= captiveBall.maxY) {
    captiveBall.y = captiveBall.maxY;
    if (captiveBall.vy > 0) {
      captiveBall.vy = captiveBall.vy < 80 ? 0 : -captiveBall.vy * 0.16;
    }
    captiveBall.topArmed = true;
  }

  const liveBallOnMainPlayfield =
    !ball.ready &&
    !underpass.active &&
    !oceanRamp.active &&
    !loopRamp.active &&
    magneticTarget.state !== 'holding';

  if (!liveBallOnMainPlayfield) return;

  for (const rail of captiveBallRails.slice(0, 2)) {
    resolveSegmentCollision(rail, { x: 0, y: 0 }, 0.72);
  }
  collideWithCaptiveRoofTarget();
  collideWithCaptiveBall();
}

const baseUpdateWithCaptiveBall = update;
update = function updateWithCaptiveBall(dt) {
  baseUpdateWithCaptiveBall(dt);
  if (!gameOver) updateCaptiveBall(dt);
};

const baseUpdateWithCenterTargets = update;
update = function updateWithCenterTargets(dt) {
  const doubleWasActive = centerDoubleScoreRemaining > 0;
  const scoreBeforeBaseUpdate = score;

  baseUpdateWithCenterTargets(dt);

  if (doubleWasActive && score > scoreBeforeBaseUpdate) {
    score += score - scoreBeforeBaseUpdate;
    syncStatusDisplay();
  }

  if (gameOver) return;

  if (centerDoubleScoreRemaining > 0 && !ball.ready) {
    centerDoubleScoreRemaining = Math.max(
      0,
      centerDoubleScoreRemaining - dt
    );
  }

  const liveBallOnMainPlayfield =
    !ball.ready &&
    !underpass.active &&
    !oceanRamp.active &&
    !loopRamp.active &&
    magneticTarget.state !== 'holding';
  if (!liveBallOnMainPlayfield) return;

  const scoreBeforeTargets = score;
  for (const target of centerStandupTargets) {
    collideWithCenterStandupTarget(target);
  }

  if (doubleWasActive && score > scoreBeforeTargets) {
    score += score - scoreBeforeTargets;
    syncStatusDisplay();
  }
};

const baseUpdateWithUpperNeons = update;
update = function updateWithUpperNeons(dt) {
  baseUpdateWithUpperNeons(dt);
  if (!gameOver) updateUpperNeonInserts();
};

const leftOutlaneGate = {
  x1: 28,
  y1: 592,
  x2: 96,
  y2: 636,
  radius: 5
};
let leftOutlaneProtectionActive = false;
let leftOutlaneGateFlashStartedAt = -Infinity;

function setLeftOutlaneProtection(active) {
  if (leftOutlaneProtectionActive === active) return;
  leftOutlaneProtectionActive = active;

  const gateIndex = lowerGuides.indexOf(leftOutlaneGate);
  if (active && gateIndex === -1) {
    lowerGuides.push(leftOutlaneGate);
    leftOutlaneGateFlashStartedAt = performance.now();
  } else if (!active && gateIndex !== -1) {
    lowerGuides.splice(gateIndex, 1);
  }
}

window.addEventListener('miami-drop-target', event => {
  if (event.detail && event.detail.bankComplete) {
    setLeftOutlaneProtection(true);
  }
});
window.addEventListener('miami-drain', () => {
  setLeftOutlaneProtection(false);
});

const baseResetPlayfieldForLeftOutlane = resetPlayfieldForBall;
resetPlayfieldForBall = function resetPlayfieldWithLeftOutlaneProtection() {
  setLeftOutlaneProtection(false);
  baseResetPlayfieldForLeftOutlane();
};

function drawLeftOutlaneGate() {
  if (!leftOutlaneProtectionActive) return;

  const flashStrength = clamp(
    1 - (performance.now() - leftOutlaneGateFlashStartedAt) / 280,
    0,
    1
  );

  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#4a3b66';
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(leftOutlaneGate.x1, leftOutlaneGate.y1);
  ctx.lineTo(leftOutlaneGate.x2, leftOutlaneGate.y2);
  ctx.stroke();

  ctx.strokeStyle = MIAMI_COLORS.cyan;
  ctx.lineWidth = 5;
  ctx.shadowColor = MIAMI_COLORS.cyan;
  ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 :
    (10 + flashStrength * 18);
  ctx.stroke();

  ctx.strokeStyle = '#f4ffff';
  ctx.lineWidth = 1.5 + flashStrength * 1.5;
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 :
    (4 + flashStrength * 10);
  ctx.stroke();
  ctx.restore();
}

function drawCaptiveBallAssembly() {
  const now = performance.now();
  const hitStrength = 1 - (now - captiveBall.flashStartedAt) / 160;
  const topStrength = 1 - (now - captiveBall.topFlashStartedAt) / 220;
  const roofStrength = clamp(
    1 - (now - captiveRoofTarget.flashStartedAt) / 320,
    0,
    1
  );
  const extraBallFlash = clamp(
    1 - (now - captiveExtraBallFlashStartedAt) / 720,
    0,
    1
  );

  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#4a3b66';
  ctx.lineWidth = 7;
  for (const rail of captiveBallRails) {
    ctx.beginPath();
    ctx.moveTo(rail.x1, rail.y1);
    ctx.lineTo(rail.x2, rail.y2);
    ctx.stroke();
  }

  ctx.strokeStyle = MIAMI_COLORS.cyan;
  ctx.lineWidth = 2.25;
  ctx.shadowColor = MIAMI_COLORS.cyan;
  ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 7;
  for (const rail of captiveBallRails.slice(0, 2)) {
    ctx.beginPath();
    ctx.moveTo(rail.x1, rail.y1);
    ctx.lineTo(rail.x2, rail.y2);
    ctx.stroke();
  }

  const roofFlashing = roofStrength > 0 || (topStrength > 0 && topStrength <= 1);
  ctx.strokeStyle = roofFlashing
    ? '#fff4ff'
    : MIAMI_COLORS.magenta;
  ctx.shadowColor = MIAMI_COLORS.magenta;
  ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 :
    (roofFlashing ? 18 + roofStrength * 10 : 7);
  ctx.lineWidth = roofStrength > 0 ? 2.75 : 2.25;
  ctx.beginPath();
  ctx.moveTo(56, 250);
  ctx.lineTo(84, 250);
  ctx.stroke();

  ctx.fillStyle = MIAMI_COLORS.lavender;
  ctx.shadowColor = MIAMI_COLORS.lavender;
  ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 5;
  ctx.beginPath();
  ctx.arc(56, 310, 4.5, 0, Math.PI * 2);
  ctx.arc(84, 310, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  for (let index = 0; index < captiveHitLampY.length; index += 1) {
    const lampY = captiveHitLampY[index];
    const lit = index < captiveHitProgress;
    const accent = index % 2 === 0
      ? MIAMI_COLORS.cyan
      : MIAMI_COLORS.magenta;

    ctx.globalAlpha = lit ? 1 : 0.42;
    ctx.fillStyle = lit
      ? (extraBallFlash > 0.38 ? '#fff4ff' : accent)
      : '#070b18';
    ctx.strokeStyle = lit ? '#f4ffff' : MIAMI_COLORS.lavender;
    ctx.shadowColor = lit ? accent : MIAMI_COLORS.lavender;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 :
      (lit ? 7 + extraBallFlash * 18 : 2);
    ctx.lineWidth = lit ? 1.4 : 1;
    ctx.beginPath();
    ctx.arc(
      96,
      lampY,
      4 + extraBallFlash * 1.4,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  if (hitStrength > 0 && hitStrength <= 1) {
    ctx.globalAlpha = hitStrength * 0.75;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = MIAMI_COLORS.cyan;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 16;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(captiveBall.x, captiveBall.y, 12 + (1 - hitStrength) * 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle = '#dfe8ff';
  ctx.strokeStyle = MIAMI_COLORS.cyan;
  ctx.shadowColor = MIAMI_COLORS.cyan;
  ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 8;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(captiveBall.x, captiveBall.y, captiveBall.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(captiveBall.x - 2.5, captiveBall.y - 2.5, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const oceanDriveProgressLetters = 'OCEANDRIVE';
const oceanDriveLetterProgress = [
  0.8558, 0.8355, 0.8189, 0.8017, 0.7850,
  0.7604, 0.7433, 0.7260, 0.7081, 0.6898
];
let oceanDriveLettersLit = 0;

const baseResetGameWithOceanDriveLetters = resetGame;
resetGame = function resetGameWithOceanDriveLetters() {
  oceanDriveLettersLit = 0;
  baseResetGameWithOceanDriveLetters();
};

window.addEventListener('miami-spinner-exit', () => {
  oceanDriveLettersLit = Math.min(
    oceanDriveProgressLetters.length,
    oceanDriveLettersLit + 1
  );
});

function drawOceanDriveProgressLetters() {
  const now = performance.now();
  const completionAge = now - oceanRamp.flashStartedAt;
  const completionFlash =
    oceanDriveLettersLit === oceanDriveProgressLetters.length &&
    completionAge >= 0 && completionAge < 520
      ? 1 - completionAge / 520
      : 0;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 14px ui-monospace, monospace';
  ctx.lineWidth = 1.2;

  for (let index = 0; index < oceanDriveProgressLetters.length; index += 1) {
    const point = sampleSmoothPath(
      oceanRampPath,
      oceanDriveLetterProgress[index]
    );
    const lit = index < oceanDriveLettersLit;
    const accent = index % 2 === 0
      ? MIAMI_COLORS.cyan
      : MIAMI_COLORS.magenta;

    if (lit) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = completionFlash > 0 ? '#ffffff' : accent;
      ctx.strokeStyle = '#f4ffff';
      ctx.shadowColor = accent;
      ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 :
        (10 + completionFlash * 18);
      ctx.strokeText(oceanDriveProgressLetters[index], point.x, point.y);
      ctx.fillText(oceanDriveProgressLetters[index], point.x, point.y);
    } else {
      ctx.globalAlpha = 0.48;
      ctx.fillStyle = '#070b18';
      ctx.strokeStyle = MIAMI_COLORS.lavender;
      ctx.shadowColor = MIAMI_COLORS.lavender;
      ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 3;
      ctx.fillText(oceanDriveProgressLetters[index], point.x, point.y);
      ctx.strokeText(oceanDriveProgressLetters[index], point.x, point.y);
    }
  }

  ctx.restore();
}

const baseDrawOceanRampWithSmallLabel = drawOceanRamp;
drawOceanRamp = function drawOceanRampWithPassLetters() {
  const baseFillText = ctx.fillText;
  ctx.fillText = function suppressOldOceanDriveLabel(text, ...args) {
    if (text === 'OCEAN DRIVE') return;
    return baseFillText.call(ctx, text, ...args);
  };

  try {
    baseDrawOceanRampWithSmallLabel();
  } finally {
    ctx.fillText = baseFillText;
  }

  drawOceanDriveProgressLetters();
};

function drawProminentUnderpassMouth(mouth, accent) {
  const radius = 18;
  ctx.save();
  ctx.translate(mouth.x, mouth.y);

  ctx.fillStyle = '#01030a';
  ctx.strokeStyle = '#4a3b66';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(0, 0, radius, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.fillRect(-radius, -2, radius * 2, 10);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.shadowColor = accent;
  ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 9;
  ctx.beginPath();
  ctx.arc(0, 0, radius, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '700 8px ui-monospace, monospace';
  ctx.fillStyle = MIAMI_COLORS.lavender;
  ctx.shadowColor = MIAMI_COLORS.magenta;
  ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 4;
  ctx.fillText('UNDERPASS', mouth.x, mouth.y + 21);
  ctx.restore();
}

function drawCompactSideExit(mouth, accent) {
  const radius = 10;
  ctx.save();
  ctx.translate(mouth.x, mouth.y);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#01030a';
  ctx.strokeStyle = '#4a3b66';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, 0, radius, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.fillRect(-radius, -1, radius * 2, 7);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = accent;
  ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 6;
  ctx.beginPath();
  ctx.arc(0, 0, radius, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

drawUnderpassMouths = function () {
  drawProminentUnderpassMouth(underpass.entry, MIAMI_COLORS.magenta);
  drawTunnelMouth(underpass.outlets[0], MIAMI_COLORS.lavender);
  drawTunnelMouth(underpass.outlets[1], MIAMI_COLORS.cyan, Math.PI / 2);
  drawTunnelMouth(underpass.outlets[2], MIAMI_COLORS.cyan);
  drawTunnelMouth(underpass.outlets[3], MIAMI_COLORS.magenta, Math.PI / 2);
  drawCompactSideExit(underpass.outlets[4], MIAMI_COLORS.cyan);
};
