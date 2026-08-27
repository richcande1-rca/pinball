const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const leftFlipperButton = document.getElementById('left-flipper-button');
const rightFlipperButton = document.getElementById('right-flipper-button');
const launchButton = document.getElementById('launch-button');
const launchButtonLabel = document.getElementById('launch-button-label');
const scoreValueDisplay = document.getElementById('score-value');
const ballNumberDisplay = document.getElementById('ball-number');
const ballPipsDisplay = document.getElementById('ball-pips');

const TABLE = {
  left: 24,
  right: canvas.width - 24,
  top: 24,
  bottom: canvas.height - 24
};

const SHOOTER = {
  dividerX: 396,
  dividerTop: 158,
  dividerBottom: TABLE.bottom,
  ballX: 430,
  ballY: 650,
  recoveryGateTop: 500,
  recoveryGateBottom: 560,
  recoveryFeedY: 526
};

const PLAYFIELD_CENTER = (TABLE.left + SHOOTER.dividerX) / 2;

const ball = {
  x: SHOOTER.ballX,
  y: SHOOTER.ballY,
  vx: 0,
  vy: 0,
  radius: 8,
  ready: true
};

const gravity = 760;      // px/s², straight down the playfield
const wallRestitution = 0.82;
const rollingDrag = 0.9992;

const TOTAL_BALLS = 3;
let score = 0;
let ballNumber = 1;
let ballsRemaining = TOTAL_BALLS;
let gameOver = false;

const plunger = {
  x: SHOOTER.ballX,
  topY: 668,
  charge: 0,
  charging: false,
  chargeRate: 0.9,        // reaches full pull in a little over one second
  minSpeed: 760,
  maxSpeed: 1140,
  maxPull: 30
};

const keys = {
  left: false,
  right: false
};

const FLIPPER_CHARGE = {
  duration: 1,
  contactSpeed: 55,
  heldDecayRate: 2.4,
  latchHoldDuration: 1.5,
  latchFadeDuration: 2,
  minimum: 0.08,
  punchWindow: 0.16,
  basePunch: 90,
  fullPunch: 390
};

function makeFlipper(side) {
  const isLeft = side === 'left';
  return {
    side,
    // Keep the original pivot spacing, but center the pair on the main
    // playfield rather than on the full canvas including the shooter lane.
    pivotX: PLAYFIELD_CENTER + (isLeft ? -95 : 95),
    pivotY: 620,
    length: 74,
    radius: 11,
    restAngle: isLeft ? 0.34 : Math.PI - 0.34,
    activeAngle: isLeft ? -0.48 : Math.PI + 0.48,
    angle: isLeft ? 0.34 : Math.PI - 0.34,
    angularVelocity: 0,
    pressed: false,
    justPressed: false,
    justReleased: false,
    cradleContact: false,
    cradleCharge: 0,
    storedCharge: 0,
    storedHoldRemaining: 0,
    storedDecayRate: 0,
    pendingPunch: 0,
    punchRemaining: 0,
    coilFlashStartedAt: -Infinity
  };
}

const flippers = [makeFlipper('left'), makeFlipper('right')];

const sideBumpers = [
  { x1: 56, y1: 553, x2: 115, y2: 602, radius: 10, kick: 65, armed: true },
  { x1: 364, y1: 553, x2: 305, y2: 602, radius: 10, kick: 65, armed: true }
];

const lowerGuides = [
  { x1: 65, y1: 590, x2: 72, y2: 640, radius: 4 },
  { x1: 355, y1: 590, x2: 348, y2: 640, radius: 4 }
];

function makeRailSegments(points, radius = 4) {
  return points.slice(0, -1).map((point, index) => ({
    x1: point.x,
    y1: point.y,
    x2: points[index + 1].x,
    y2: points[index + 1].y,
    radius
  }));
}

// The strong launch uses a compact hook in the upper-right corner. Its open
// mouth points into the upper playfield, leaving the roof and entire left side
// available for bumpers, targets, lanes, and other future trouble.
const coastalOrbitOuterPoints = [
  { x: 314, y: 77 },
  { x: 340, y: 58 },
  { x: 365, y: 39 },
  { x: 395, y: 32 },
  { x: 424, y: 47 },
  { x: 445, y: 82 },
  { x: 452, y: 122 },
  { x: 452, y: 168 }
];

const coastalOrbitInnerPoints = [
  { x: 336, y: 113 },
  { x: 360, y: 100 },
  { x: 379, y: 86 },
  { x: 396, y: 86 },
  { x: 410, y: 101 },
  { x: 416, y: 126 },
  { x: 410, y: 148 },
  { x: 396, y: 158 }
];

const coastalOrbitRails = [
  ...makeRailSegments(coastalOrbitOuterPoints),
  ...makeRailSegments(coastalOrbitInnerPoints)
];

// The upper-right target is now a recessed magnetic lock. A clean hit
// captures the ball, holds it for a dramatic beat, then ejects down-left.
const magneticTarget = {
  x: 390,
  y: 126,
  radius: 12,
  value: 500,
  state: 'ready',
  holdRemaining: 0,
  captureDuration: 0.7,
  cooldownRemaining: 0,
  ejectAngle: 145 * Math.PI / 180,
  ejectSpeed: 650,
  flashStartedAt: -Infinity
};

// A compact upper-left loop gives the right flipper its deliberate skill shot.
// The rails stay in the corner and form a short horseshoe with separate entry
// and exit mouths rather than sprawling across the playfield.
const upperLeftLoopOuterPoints = [
  { x: 84, y: 200 },
  { x: 62, y: 180 },
  { x: 44, y: 150 },
  { x: 40, y: 115 },
  { x: 48, y: 75 },
  { x: 76, y: 43 },
  { x: 116, y: 28 },
  { x: 156, y: 34 },
  { x: 190, y: 55 },
  { x: 212, y: 88 },
  { x: 218, y: 123 },
  { x: 210, y: 157 },
  { x: 190, y: 184 },
  { x: 198, y: 207 }
];

const upperLeftLoopInnerPoints = [
  { x: 112, y: 184 },
  { x: 92, y: 165 },
  { x: 78, y: 142 },
  { x: 76, y: 116 },
  { x: 84, y: 90 },
  { x: 103, y: 69 },
  { x: 128, y: 60 },
  { x: 151, y: 64 },
  { x: 171, y: 78 },
  { x: 184, y: 98 },
  { x: 187, y: 122 },
  { x: 180, y: 144 },
  { x: 164, y: 164 },
  { x: 174, y: 185 }
];

const upperLeftLoopRails = [
  ...makeRailSegments(upperLeftLoopOuterPoints),
  ...makeRailSegments(upperLeftLoopInnerPoints)
];

const upperLeftLoopPath = [
  { x: 100, y: 192 },
  { x: 77, y: 173 },
  { x: 60, y: 146 },
  { x: 58, y: 116 },
  { x: 66, y: 82 },
  { x: 90, y: 56 },
  { x: 122, y: 44 },
  { x: 154, y: 49 },
  { x: 181, y: 66 },
  { x: 198, y: 93 },
  { x: 202, y: 122 },
  { x: 195, y: 151 },
  { x: 177, y: 174 },
  { x: 186, y: 196 }
];

const loopRamp = {
  active: false,
  progress: 0,
  duration: 0.9,
  value: 2500,
  flashStartedAt: -Infinity
};

// The inverted triangle leaves a deliberate center entrance between the two
// lower posts. A clean shot reaches the violet cap first and is kicked back
// into the cyan/magenta pair for sustained, deliberately unruly volleys.
const popBumpers = [
  { x: 105, y: 149, radius: 7, kick: 225, accent: 'cyan', armed: true, flashStartedAt: -Infinity, lastPoints: 100 },
  { x: 159, y: 149, radius: 7, kick: 225, accent: 'magenta', armed: true, flashStartedAt: -Infinity, lastPoints: 100 },
  { x: 132, y: 100, radius: 7, kick: 235, accent: 'lavender', armed: true, flashStartedAt: -Infinity, lastPoints: 100 }
];

const bumperCombo = {
  count: 0,
  remaining: 0,
  window: 1.1
};

const midPlayfieldGuides = [
  { x1: 86, y1: 402, x2: 122, y2: 430, radius: 4 },
  { x1: 334, y1: 402, x2: 298, y2: 430, radius: 4 }
];

// Three upright drop targets sit flush against the left wall. Their narrow
// faces keep them readable as a bank without floating into the playfield.
const dropTargets = [
  { label: '3', x1: 44, y1: 452, x2: 44, y2: 474, radius: 3.5, value: 500, accent: 'cyan', dropped: false, flashStartedAt: -Infinity },
  { label: '0', x1: 44, y1: 480, x2: 44, y2: 502, radius: 3.5, value: 500, accent: 'lavender', dropped: false, flashStartedAt: -Infinity },
  { label: '5', x1: 44, y1: 508, x2: 44, y2: 530, radius: 3.5, value: 500, accent: 'magenta', dropped: false, flashStartedAt: -Infinity }
];

const dropTargetBank = {
  completionValue: 3000,
  resetDelay: 1.15,
  resetRemaining: 0,
  completeFlashStartedAt: -Infinity
};

// OCEAN DRIVE is an actual elevated ramp. Once a clean left-flipper shot
// enters, the ball rides a separate upper layer, crosses the spinner, and
// drops into the existing plunger ramp where its curve begins.
const oceanRampPath = [
  // The same-width mouth reaches slightly toward center, then blends back
  // into the original raised run.
  { x: 347, y: 482 },
  { x: 350, y: 466 },
  { x: 357, y: 443 },
  { x: 360, y: 392 },
  { x: 360, y: 344 },
  { x: 359, y: 296 },
  { x: 356, y: 248 },
  { x: 348, y: 202 },
  { x: 362, y: 184 },
  { x: 384, y: 171 },
  { x: 408, y: 163 },
  { x: 430, y: 160 }
];

const oceanRamp = {
  active: false,
  progress: 0,
  duration: 1.35,
  spinnerProgress: 0.48,
  spinnerTriggered: false,
  entrySpeed: 0,
  flashStartedAt: -Infinity
};

const oceanSpinner = {
  angle: 0,
  angularVelocity: 0,
  rotationAccumulator: 0,
  drag: 1,
  value: 100,
  flashStartedAt: -Infinity,
  impactFlashStartedAt: -Infinity,
  lastPoints: 0
};

const shooterDivider = {
  x1: SHOOTER.dividerX,
  y1: SHOOTER.dividerTop,
  x2: SHOOTER.dividerX,
  y2: SHOOTER.dividerBottom,
  radius: 4
};

// The visible divider keeps its full layout envelope, while these two physical
// rails leave a generous fork into the upper playfield.
const shooterDividerRails = [
  {
    x1: SHOOTER.dividerX,
    y1: SHOOTER.dividerTop,
    x2: SHOOTER.dividerX,
    y2: 178,
    radius: 4
  },
  {
    x1: SHOOTER.dividerX,
    y1: 262,
    x2: SHOOTER.dividerX,
    y2: SHOOTER.recoveryGateTop,
    radius: 4
  },
  {
    x1: SHOOTER.dividerX,
    y1: SHOOTER.recoveryGateBottom,
    x2: SHOOTER.dividerX,
    y2: SHOOTER.dividerBottom,
    radius: 4
  }
];

const shooterDiverter = {
  x1: 400,
  y1: 190,
  x2: 447,
  y2: 232,
  radius: 5
};

const shooterDiverterOpen = {
  x1: 400,
  y1: 190,
  x2: 414,
  y2: 174,
  radius: 5
};

const shooterRecoveryGuidePoints = [
  { x: 447, y: 510 },
  { x: 434, y: 522 },
  { x: 414, y: 534 },
  { x: 386, y: 538 }
];

const LAUNCH_ROUTE_THRESHOLDS = {
  playfield: 0.28,
  orbit: 0.72
};

const RAMP_EXIT = {
  x: 313,
  y: 103,
  angle: 33 * Math.PI / 180,
  speed: 340
};

let shooterRoute = 'return';
let ballHasEnteredPlayfield = false;

function routeForPlungerCharge(charge) {
  if (charge >= LAUNCH_ROUTE_THRESHOLDS.orbit) {
    return 'orbit';
  }

  if (charge >= LAUNCH_ROUTE_THRESHOLDS.playfield) {
    return 'playfield';
  }

  return 'return';
}

function visibleShooterRoute() {
  return ball.ready ? routeForPlungerCharge(plunger.charge) : shooterRoute;
}


function ballIsInShooterLane() {
  return ball.x - ball.radius > SHOOTER.dividerX;
}

function syncStatusDisplay() {
  scoreValueDisplay.textContent = String(score).padStart(6, '0');
  ballNumberDisplay.textContent = gameOver ? 'GAME OVER' : `BALL ${ballNumber}`;
  ballPipsDisplay.textContent =
    '●'.repeat(ballsRemaining) +
    '○'.repeat(Math.max(0, TOTAL_BALLS - ballsRemaining));
  ballPipsDisplay.setAttribute(
    'aria-label',
    `${ballsRemaining} ball${ballsRemaining === 1 ? '' : 's'} remaining`
  );
}

function resetPlayfieldForBall() {
  for (const bumper of sideBumpers) {
    bumper.armed = true;
  }

  for (const bumper of popBumpers) {
    bumper.armed = true;
    bumper.flashStartedAt = -Infinity;
    bumper.lastPoints = 100;
  }
  bumperCombo.count = 0;
  bumperCombo.remaining = 0;

  for (const target of dropTargets) {
    target.dropped = false;
    target.flashStartedAt = -Infinity;
  }
  dropTargetBank.resetRemaining = 0;
  dropTargetBank.completeFlashStartedAt = -Infinity;

  oceanSpinner.angle = 0;
  oceanSpinner.angularVelocity = 0;
  oceanSpinner.rotationAccumulator = 0;
  oceanSpinner.flashStartedAt = -Infinity;
  oceanSpinner.impactFlashStartedAt = -Infinity;
  oceanSpinner.lastPoints = 0;
  oceanRamp.active = false;
  oceanRamp.progress = 0;
  oceanRamp.spinnerTriggered = false;
  oceanRamp.entrySpeed = 0;
  oceanRamp.flashStartedAt = -Infinity;

  for (const flipper of flippers) {
    flipper.justPressed = false;
    flipper.justReleased = false;
    flipper.cradleContact = false;
    flipper.cradleCharge = 0;
    flipper.storedCharge = 0;
    flipper.storedHoldRemaining = 0;
    flipper.storedDecayRate = 0;
    flipper.pendingPunch = 0;
    flipper.punchRemaining = 0;
    flipper.coilFlashStartedAt = -Infinity;
  }

  magneticTarget.state = 'ready';
  magneticTarget.holdRemaining = 0;
  magneticTarget.cooldownRemaining = 0;
  loopRamp.active = false;
  loopRamp.progress = 0;
}

function parkBallAtPlunger() {
  ball.x = SHOOTER.ballX;
  ball.y = SHOOTER.ballY;
  ball.vx = 0;
  ball.vy = 0;
  ball.ready = true;

  plunger.charge = 0;
  plunger.charging = false;
  shooterRoute = 'return';
  ballHasEnteredPlayfield = false;
  syncLaunchButton();
}

function resetGame() {
  score = 0;
  ballNumber = 1;
  ballsRemaining = TOTAL_BALLS;
  gameOver = false;
  magneticTarget.flashStartedAt = -Infinity;
  loopRamp.flashStartedAt = -Infinity;
  resetPlayfieldForBall();
  parkBallAtPlunger();
  syncStatusDisplay();
}

function handleDrain() {
  window.dispatchEvent(new CustomEvent('miami-drain', {
    detail: { ball: ballNumber, score }
  }));

  if (ballsRemaining > 1) {
    ballsRemaining -= 1;
    ballNumber += 1;
    resetPlayfieldForBall();
    parkBallAtPlunger();
    syncStatusDisplay();
    return;
  }

  ballsRemaining = 0;
  gameOver = true;
  ball.vx = 0;
  ball.vy = 0;
  ball.ready = false;
  plunger.charge = 0;
  plunger.charging = false;
  syncStatusDisplay();
  syncLaunchButton();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function closestPointOnSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return { x: x1, y: y1, t: 0 };
  }

  const t = clamp(((px - x1) * dx + (py - y1) * dy) / lengthSq, 0, 1);
  return {
    x: x1 + dx * t,
    y: y1 + dy * t,
    t
  };
}

function resolveSegmentCollision(segment, surfaceVelocity = { x: 0, y: 0 }, restitution = 0.9, extraKick = 0) {
  const closest = closestPointOnSegment(
    ball.x,
    ball.y,
    segment.x1,
    segment.y1,
    segment.x2,
    segment.y2
  );

  let nx = ball.x - closest.x;
  let ny = ball.y - closest.y;
  let distance = Math.hypot(nx, ny);
  const minDistance = ball.radius + segment.radius;

  if (distance >= minDistance) {
    return false;
  }

  if (distance < 0.0001) {
    const sx = segment.x2 - segment.x1;
    const sy = segment.y2 - segment.y1;
    const sl = Math.hypot(sx, sy) || 1;
    nx = -sy / sl;
    ny = sx / sl;
    distance = 1;
  } else {
    nx /= distance;
    ny /= distance;
  }

  const overlap = minDistance - distance;
  ball.x += nx * overlap;
  ball.y += ny * overlap;

  const rvx = ball.vx - surfaceVelocity.x;
  const rvy = ball.vy - surfaceVelocity.y;
  const normalSpeed = rvx * nx + rvy * ny;

  if (normalSpeed < 0) {
    const impulse = -(1 + restitution) * normalSpeed;
    ball.vx += impulse * nx;
    ball.vy += impulse * ny;

    if (extraKick > 0) {
      ball.vx += nx * extraKick;
      ball.vy += ny * extraKick;
    }
  }

  return true;
}

function updateFlipper(flipper, dt) {
  const wasPressed = flipper.pressed;
  const nextPressed = flipper.side === 'left' ? keys.left : keys.right;
  const hadCradleContact = flipper.cradleContact;

  flipper.justPressed = nextPressed && !wasPressed;
  flipper.justReleased = !nextPressed && wasPressed;
  flipper.cradleContact = false;

  if (flipper.justReleased) {
    if (flipper.cradleCharge >= FLIPPER_CHARGE.minimum) {
      flipper.storedCharge = flipper.cradleCharge;
      flipper.storedHoldRemaining = FLIPPER_CHARGE.latchHoldDuration;
      flipper.storedDecayRate =
        flipper.cradleCharge / FLIPPER_CHARGE.latchFadeDuration;
    } else {
      flipper.storedCharge = 0;
      flipper.storedHoldRemaining = 0;
      flipper.storedDecayRate = 0;
    }
    flipper.cradleCharge = 0;
  }

  if (flipper.justPressed) {
    if (flipper.storedCharge >= FLIPPER_CHARGE.minimum) {
      flipper.pendingPunch = flipper.storedCharge;
      flipper.punchRemaining = FLIPPER_CHARGE.punchWindow;
    } else {
      flipper.pendingPunch = 0;
      flipper.punchRemaining = 0;
    }
    flipper.storedCharge = 0;
    flipper.storedHoldRemaining = 0;
    flipper.storedDecayRate = 0;
  }

  if (nextPressed && !flipper.justPressed) {
    if (hadCradleContact) {
      flipper.cradleCharge = clamp(
        flipper.cradleCharge + dt / FLIPPER_CHARGE.duration,
        0,
        1
      );
    } else {
      flipper.cradleCharge = Math.max(
        0,
        flipper.cradleCharge - FLIPPER_CHARGE.heldDecayRate * dt
      );
    }
  }

  if (!nextPressed && !flipper.justReleased && flipper.storedCharge > 0) {
    if (flipper.storedHoldRemaining > 0) {
      flipper.storedHoldRemaining = Math.max(
        0,
        flipper.storedHoldRemaining - dt
      );
    } else {
      flipper.storedCharge = Math.max(
        0,
        flipper.storedCharge - flipper.storedDecayRate * dt
      );
    }
  }

  if (flipper.pendingPunch > 0 && !flipper.justPressed) {
    flipper.punchRemaining = Math.max(0, flipper.punchRemaining - dt);
    if (flipper.punchRemaining === 0) {
      flipper.pendingPunch = 0;
    }
  }

  flipper.pressed = nextPressed;
  const target = flipper.pressed ? flipper.activeAngle : flipper.restAngle;

  // Ordinary motion remains unchanged; stored energy is applied separately
  // and only once when a charged cradle shot actually touches the rising bat.
  const maxSpeed = flipper.pressed ? 14 : 10; // rad/s
  const delta = target - flipper.angle;
  const step = clamp(delta, -maxSpeed * dt, maxSpeed * dt);

  flipper.angularVelocity = step / dt;
  flipper.angle += step;
}

function getFlipperSegment(flipper) {
  return {
    x1: flipper.pivotX,
    y1: flipper.pivotY,
    x2: flipper.pivotX + Math.cos(flipper.angle) * flipper.length,
    y2: flipper.pivotY + Math.sin(flipper.angle) * flipper.length,
    radius: flipper.radius
  };
}

function collideWithFlipper(flipper) {
  const segment = getFlipperSegment(flipper);
  const closest = closestPointOnSegment(
    ball.x,
    ball.y,
    segment.x1,
    segment.y1,
    segment.x2,
    segment.y2
  );

  const dx = ball.x - closest.x;
  const dy = ball.y - closest.y;
  const distance = Math.hypot(dx, dy);
  const contactDistance = ball.radius + segment.radius;

  const rx = closest.x - flipper.pivotX;
  const ry = closest.y - flipper.pivotY;
  const surfaceVelocity = {
    x: -flipper.angularVelocity * ry,
    y: flipper.angularVelocity * rx
  };

  let incomingNormalSpeed = 0;
  if (distance > 0.0001) {
    const nx = dx / distance;
    const ny = dy / distance;
    incomingNormalSpeed = -(
      (ball.vx - surfaceVelocity.x) * nx +
      (ball.vy - surfaceVelocity.y) * ny
    );
  }

  const motion = clamp(Math.abs(flipper.angularVelocity) / 14, 0, 1);
  const heldStill = flipper.pressed && Math.abs(flipper.angularVelocity) < 0.25;

  // A gently settling ball on a held flipper should not bounce at all. Fast
  // impacts retain the livelier restitution, and a moving flipper still adds
  // energy through its actual surface velocity.
  const restingImpact =
    heldStill &&
    distance < contactDistance &&
    incomingNormalSpeed >= 0 &&
    incomingNormalSpeed < 45;

  const restitution = restingImpact ? 0 : 0.38 + 0.42 * motion;
  const touching = resolveSegmentCollision(segment, surfaceVelocity, restitution);

  flipper.cradleContact =
    touching &&
    heldStill &&
    Math.hypot(ball.vx, ball.vy) < FLIPPER_CHARGE.contactSpeed;

  const chargedStrike =
    touching &&
    !heldStill &&
    ball.y <= closest.y + 3 &&
    flipper.pendingPunch >= FLIPPER_CHARGE.minimum &&
    flipper.punchRemaining > 0;

  if (chargedStrike) {
    const sx = segment.x2 - segment.x1;
    const sy = segment.y2 - segment.y1;
    const segmentLength = Math.hypot(sx, sy) || 1;
    let punchX = -sy / segmentLength;
    let punchY = sx / segmentLength;

    if (punchY > 0) {
      punchX *= -1;
      punchY *= -1;
    }

    const storedEnergy = flipper.pendingPunch;
    const punchSpeed = FLIPPER_CHARGE.basePunch +
      (FLIPPER_CHARGE.fullPunch - FLIPPER_CHARGE.basePunch) * storedEnergy;
    ball.vx += punchX * punchSpeed;
    ball.vy += punchY * punchSpeed;

    flipper.pendingPunch = 0;
    flipper.punchRemaining = 0;
    flipper.coilFlashStartedAt = performance.now();

    window.dispatchEvent(new CustomEvent('miami-coil-punch', {
      detail: {
        side: flipper.side,
        charge: storedEnergy,
        speed: punchSpeed
      }
    }));
  }

  // Let gravity move the ball freely along a held flipper.
  return touching && heldStill;
}

function collideWithSideBumper(bumper) {
  const closest = closestPointOnSegment(
    ball.x,
    ball.y,
    bumper.x1,
    bumper.y1,
    bumper.x2,
    bumper.y2
  );

  const dx = ball.x - closest.x;
  const dy = ball.y - closest.y;
  const distance = Math.hypot(dx, dy);
  const contactDistance = ball.radius + bumper.radius;
  const rearmDistance = contactDistance + 36;

  // Once a sling fires, the ball must move clearly away from it before the
  // sling can arm again. Tiny contact/no-contact jitter in a cradle therefore
  // cannot manufacture another powered hit.
  if (!bumper.armed && distance > rearmDistance) {
    bumper.armed = true;
  }

  let incomingNormalSpeed = 0;
  if (distance > 0.0001) {
    const nx = dx / distance;
    const ny = dy / distance;
    incomingNormalSpeed = -(ball.vx * nx + ball.vy * ny);
  }

  const shouldKick =
    bumper.armed &&
    distance < contactDistance &&
    incomingNormalSpeed >= 60;

  // Slow settling contact is dead rubber: no bounce and no powered kick.
  const restitution = incomingNormalSpeed < 60 ? 0 : 0.68;
  const touching = resolveSegmentCollision(
    bumper,
    { x: 0, y: 0 },
    restitution,
    shouldKick ? bumper.kick : 0
  );

  if (shouldKick) {
    bumper.armed = false;
  }

  return touching;
}

function collideWithPopBumper(bumper, index) {
  let dx = ball.x - bumper.x;
  let dy = ball.y - bumper.y;
  let distance = Math.hypot(dx, dy);
  const contactDistance = ball.radius + bumper.radius;

  if (!bumper.armed && distance > contactDistance + 8) {
    bumper.armed = true;
  }

  if (distance >= contactDistance) return false;

  if (distance < 0.0001) {
    const escapeAngle = -Math.PI / 2 + index * Math.PI * 2 / 3;
    dx = Math.cos(escapeAngle);
    dy = Math.sin(escapeAngle);
    distance = 1;
  }

  const nx = dx / distance;
  const ny = dy / distance;
  const incomingNormalSpeed = -(ball.vx * nx + ball.vy * ny);
  const overlap = contactDistance - distance;
  ball.x += nx * overlap;
  ball.y += ny * overlap;

  if (incomingNormalSpeed > 0) {
    const impulse = (1 + 0.92) * incomingNormalSpeed;
    ball.vx += impulse * nx;
    ball.vy += impulse * ny;
  }

  if (bumper.armed && incomingNormalSpeed >= 35) {
    // A small tangent variation keeps repeated volleys lively without turning
    // the result into an uncontrollable cannon shot.
    const jitter = (Math.random() - 0.5) * 0.28;
    const cos = Math.cos(jitter);
    const sin = Math.sin(jitter);
    const kickX = nx * cos - ny * sin;
    const kickY = nx * sin + ny * cos;

    ball.vx += kickX * bumper.kick;
    ball.vy += kickY * bumper.kick;
    bumper.armed = false;
    bumper.flashStartedAt = performance.now();

    const continuingVolley = bumperCombo.remaining > 0;
    bumperCombo.count = continuingVolley
      ? Math.min(3, bumperCombo.count + 1)
      : 1;
    bumperCombo.remaining = bumperCombo.window;
    const points = bumperCombo.count * 100;
    bumper.lastPoints = points;
    score += points;
    syncStatusDisplay();

    window.dispatchEvent(new CustomEvent('miami-pop-bumper', {
      detail: {
        index,
        accent: bumper.accent,
        combo: bumperCombo.count,
        points,
        score
      }
    }));
  }

  return true;
}

function collideWithDropTarget(target, index) {
  if (target.dropped) return false;

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

  let nx;
  let ny;
  if (distance < 0.0001) {
    const sx = target.x2 - target.x1;
    const sy = target.y2 - target.y1;
    const segmentLength = Math.hypot(sx, sy) || 1;
    nx = -sy / segmentLength;
    ny = sx / segmentLength;
    if (ball.vx * nx + ball.vy * ny > 0) {
      nx *= -1;
      ny *= -1;
    }
  } else {
    nx = dx / distance;
    ny = dy / distance;
  }
  const incomingNormalSpeed = -(ball.vx * nx + ball.vy * ny);
  const touching = resolveSegmentCollision(
    target,
    { x: 0, y: 0 },
    incomingNormalSpeed < 45 ? 0.18 : 0.52
  );

  if (touching && incomingNormalSpeed >= 55) {
    target.dropped = true;
    target.flashStartedAt = performance.now();
    score += target.value;

    const bankComplete = dropTargets.every(candidate => candidate.dropped);
    if (bankComplete) {
      score += dropTargetBank.completionValue;
      dropTargetBank.resetRemaining = dropTargetBank.resetDelay;
      dropTargetBank.completeFlashStartedAt = performance.now();
    }

    syncStatusDisplay();
    window.dispatchEvent(new CustomEvent('miami-drop-target', {
      detail: {
        index,
        label: target.label,
        points: target.value,
        bankComplete,
        bankBonus: bankComplete ? dropTargetBank.completionValue : 0,
        score
      }
    }));
  }

  return touching;
}

function updateDropTargetBank(dt) {
  if (dropTargetBank.resetRemaining <= 0) return;

  dropTargetBank.resetRemaining = Math.max(
    0,
    dropTargetBank.resetRemaining - dt
  );

  if (dropTargetBank.resetRemaining === 0) {
    for (const target of dropTargets) {
      target.dropped = false;
    }
    window.dispatchEvent(new CustomEvent('miami-drop-bank-reset'));
  }
}

function tryEnterOceanRamp() {
  const entrance = oceanRampPath[0];
  const distance = Math.hypot(ball.x - entrance.x, ball.y - entrance.y);
  const entrySpeed = Math.hypot(ball.vx, ball.vy);

  if (
    !oceanRamp.active &&
    distance < 30 &&
    ball.vx > 80 &&
    ball.vy < -100 &&
    entrySpeed >= 260
  ) {
    oceanRamp.active = true;
    oceanRamp.progress = 0;
    oceanRamp.spinnerTriggered = false;
    oceanRamp.entrySpeed = entrySpeed;
    ball.x = entrance.x;
    ball.y = entrance.y;
    ball.vx = 0;
    ball.vy = 0;
    ballHasEnteredPlayfield = true;
    shooterRoute = 'released';
    window.dispatchEvent(new CustomEvent('miami-ramp-enter', {
      detail: { speed: entrySpeed }
    }));
    return true;
  }

  return false;
}

function updateOceanSpinner(dt) {
  if (oceanSpinner.angularVelocity === 0) return;

  const rotation = oceanSpinner.angularVelocity * dt;
  oceanSpinner.angle = (
    oceanSpinner.angle + rotation
  ) % (Math.PI * 2);
  oceanSpinner.rotationAccumulator += Math.abs(rotation);

  while (oceanSpinner.rotationAccumulator >= Math.PI * 2) {
    oceanSpinner.rotationAccumulator -= Math.PI * 2;
    oceanSpinner.lastPoints = oceanSpinner.value;
    oceanSpinner.flashStartedAt = performance.now();
    score += oceanSpinner.value;
    syncStatusDisplay();
    window.dispatchEvent(new CustomEvent('miami-spinner-tick', {
      detail: {
        points: oceanSpinner.value,
        speed: Math.abs(oceanSpinner.angularVelocity),
        score
      }
    }));
  }

  oceanSpinner.angularVelocity *= Math.exp(-oceanSpinner.drag * dt);
  if (Math.abs(oceanSpinner.angularVelocity) < 0.12) {
    oceanSpinner.angularVelocity = 0;
  }
}

function updateOceanRamp(dt) {
  if (!oceanRamp.active) return false;

  const previousProgress = oceanRamp.progress;
  const previousX = ball.x;
  const previousY = ball.y;
  oceanRamp.progress = clamp(
    oceanRamp.progress + dt / oceanRamp.duration,
    0,
    1
  );

  const point = sampleSmoothPath(oceanRampPath, oceanRamp.progress);
  ball.x = point.x;
  ball.y = point.y;
  ball.vx = (point.x - previousX) / dt;
  ball.vy = (point.y - previousY) / dt;

  if (
    !oceanRamp.spinnerTriggered &&
    previousProgress < oceanRamp.spinnerProgress &&
    oceanRamp.progress >= oceanRamp.spinnerProgress
  ) {
    const addedSpin = clamp(oceanRamp.entrySpeed * 0.065, 14, 56);
    oceanSpinner.angularVelocity = clamp(
      oceanSpinner.angularVelocity + addedSpin,
      -62,
      62
    );
    oceanSpinner.impactFlashStartedAt = performance.now();
    oceanRamp.spinnerTriggered = true;
    window.dispatchEvent(new CustomEvent('miami-spinner-hit', {
      detail: {
        impactSpeed: oceanRamp.entrySpeed,
        angularVelocity: Math.abs(oceanSpinner.angularVelocity)
      }
    }));
  }

  if (oceanRamp.progress >= 1) {
    const dropSpeed = clamp(oceanRamp.entrySpeed * 0.8, 320, 520);
    oceanRamp.active = false;
    oceanRamp.flashStartedAt = performance.now();

    // Hand the ball back to the existing upper-right plunger ramp at the
    // beginning of its curve. The original orbit rails handle the rest.
    ball.x = 430;
    ball.y = 160;
    ball.vx = -70;
    ball.vy = -dropSpeed;
    shooterRoute = 'orbit';
    ballHasEnteredPlayfield = true;
    window.dispatchEvent(new CustomEvent('miami-spinner-exit', {
      detail: { speed: dropSpeed }
    }));
  }

  return true;
}

function collideWithMagneticTarget(target, dt) {
  if (target.state === 'holding') return true;

  target.cooldownRemaining = Math.max(0, target.cooldownRemaining - dt);

  let dx = ball.x - target.x;
  let dy = ball.y - target.y;
  let distance = Math.hypot(dx, dy);
  const contactDistance = ball.radius + target.radius;

  if (
    target.state === 'cooldown' &&
    target.cooldownRemaining === 0 &&
    distance > contactDistance + 22
  ) {
    target.state = 'ready';
  }

  if (distance >= contactDistance) return false;

  if (distance < 0.0001) {
    dx = -1;
    dy = 0.7;
    distance = Math.hypot(dx, dy);
  }

  const nx = dx / distance;
  const ny = dy / distance;
  const incomingNormalSpeed = -(ball.vx * nx + ball.vy * ny);

  if (target.state === 'ready' && incomingNormalSpeed >= 55) {
    target.state = 'holding';
    target.holdRemaining = target.captureDuration;
    target.flashStartedAt = performance.now();
    ball.x = target.x;
    ball.y = target.y;
    ball.vx = 0;
    ball.vy = 0;
    score += target.value;
    syncStatusDisplay();
    window.dispatchEvent(new CustomEvent('miami-magnet-capture', {
      detail: { points: target.value, score }
    }));
    return true;
  }

  const overlap = contactDistance - distance;
  ball.x += nx * overlap;
  ball.y += ny * overlap;

  const normalSpeed = ball.vx * nx + ball.vy * ny;
  if (normalSpeed < 0) {
    const impulse = -(1 + 0.72) * normalSpeed;
    ball.vx += impulse * nx;
    ball.vy += impulse * ny;
  }

  return true;
}

function updateMagneticTarget(dt) {
  if (magneticTarget.state !== 'holding') return false;

  ball.x = magneticTarget.x;
  ball.y = magneticTarget.y;
  ball.vx = 0;
  ball.vy = 0;
  magneticTarget.holdRemaining -= dt;

  if (magneticTarget.holdRemaining <= 0) {
    const ux = Math.cos(magneticTarget.ejectAngle);
    const uy = Math.sin(magneticTarget.ejectAngle);
    const clearance = magneticTarget.radius + ball.radius + 2;

    magneticTarget.state = 'cooldown';
    magneticTarget.cooldownRemaining = 0.45;
    magneticTarget.flashStartedAt = performance.now();
    ball.x = magneticTarget.x + ux * clearance;
    ball.y = magneticTarget.y + uy * clearance;
    ball.vx = ux * magneticTarget.ejectSpeed;
    ball.vy = uy * magneticTarget.ejectSpeed;
    window.dispatchEvent(new CustomEvent('miami-magnet-eject', {
      detail: { speed: magneticTarget.ejectSpeed }
    }));
  }

  return true;
}

function sampleSmoothPath(points, progress) {
  const scaled = clamp(progress, 0, 1) * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(scaled));
  const t = scaled - index;
  const p0 = points[Math.max(0, index - 1)];
  const p1 = points[index];
  const p2 = points[index + 1];
  const p3 = points[Math.min(points.length - 1, index + 2)];
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: 0.5 * (
      2 * p1.x + (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    ),
    y: 0.5 * (
      2 * p1.y + (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    )
  };
}

function tryEnterUpperLeftLoop() {
  const entrance = upperLeftLoopPath[0];
  const distance = Math.hypot(ball.x - entrance.x, ball.y - entrance.y);
  const fastEnough = Math.hypot(ball.vx, ball.vy) >= 260;

  if (
    !loopRamp.active &&
    distance < 25 &&
    ball.vx < -40 &&
    ball.vy < -120 &&
    fastEnough
  ) {
    loopRamp.active = true;
    loopRamp.progress = 0;
    ball.x = entrance.x;
    ball.y = entrance.y;
    ball.vx = 0;
    ball.vy = 0;
    ballHasEnteredPlayfield = true;
    shooterRoute = 'released';
    window.dispatchEvent(new CustomEvent('miami-loop-enter'));
    return true;
  }

  return false;
}

function updateUpperLeftLoop(dt) {
  if (!loopRamp.active) return false;

  const previousX = ball.x;
  const previousY = ball.y;
  loopRamp.progress = clamp(loopRamp.progress + dt / loopRamp.duration, 0, 1);
  const point = sampleSmoothPath(upperLeftLoopPath, loopRamp.progress);
  ball.x = point.x;
  ball.y = point.y;
  ball.vx = (point.x - previousX) / dt;
  ball.vy = (point.y - previousY) / dt;

  if (loopRamp.progress >= 1) {
    loopRamp.active = false;
    loopRamp.flashStartedAt = performance.now();
    ball.vx = 285;
    ball.vy = 175;
    score += loopRamp.value;
    syncStatusDisplay();
    window.dispatchEvent(new CustomEvent('miami-loop-complete', {
      detail: { points: loopRamp.value, score }
    }));
  }

  return true;
}

function launchBall() {
  if (!ball.ready) {
    return;
  }

  const launchCharge = plunger.charge;
  const launchSpeed = plunger.minSpeed +
    (plunger.maxSpeed - plunger.minSpeed) * launchCharge;

  shooterRoute = routeForPlungerCharge(launchCharge);
  ballHasEnteredPlayfield = false;
  ball.ready = false;
  ball.vx = 0;
  ball.vy = -launchSpeed;
  plunger.charge = 0;
  plunger.charging = false;
  syncLaunchButton();
}

function update(dt) {
  for (const flipper of flippers) {
    updateFlipper(flipper, dt);
  }

  if (gameOver) {
    return;
  }

  updateDropTargetBank(dt);
  updateOceanSpinner(dt);

  bumperCombo.remaining = Math.max(0, bumperCombo.remaining - dt);
  if (bumperCombo.remaining === 0) {
    bumperCombo.count = 0;
  }

  if (
    updateMagneticTarget(dt) ||
    updateUpperLeftLoop(dt) ||
    updateOceanRamp(dt)
  ) {
    return;
  }

  if (ball.ready) {
    ball.x = SHOOTER.ballX;
    ball.y = SHOOTER.ballY;
    ball.vx = 0;
    ball.vy = 0;

    if (plunger.charging) {
      plunger.charge = clamp(plunger.charge + plunger.chargeRate * dt, 0, 1);
    }
    return;
  }

  ball.vy += gravity * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // Light rolling resistance. Spin / English is still deliberately deferred.
  ball.vx *= rollingDrag;
  ball.vy *= rollingDrag;

  if (tryEnterUpperLeftLoop()) {
    return;
  }

  if (tryEnterOceanRamp()) {
    return;
  }

  if (ball.x - ball.radius < TABLE.left) {
    ball.x = TABLE.left + ball.radius;
    ball.vx = Math.abs(ball.vx) * wallRestitution;
  }

  if (ball.x + ball.radius > TABLE.right) {
    ball.x = TABLE.right - ball.radius;
    ball.vx = -Math.abs(ball.vx) * wallRestitution;
  }

  if (ball.y - ball.radius < TABLE.top) {
    ball.y = TABLE.top + ball.radius;
    ball.vy = Math.abs(ball.vy) * wallRestitution;
  }

  for (const rail of shooterDividerRails) {
    resolveSegmentCollision(rail, { x: 0, y: 0 }, 0.86);
  }

  // Once a live ball crosses into the shooter lane, the lower return gate
  // takes responsibility for it. A failed launch has not earned this state
  // yet, so it remains eligible to settle back onto the plunger.
  if (
    ballHasEnteredPlayfield &&
    shooterRoute !== 'recovery' &&
    ball.vy > 0 &&
    ballIsInShooterLane() &&
    ball.y > SHOOTER.dividerTop &&
    ball.y < SHOOTER.recoveryGateBottom
  ) {
    shooterRoute = 'recovery';
  }

  if (
    shooterRoute === 'playfield' &&
    ball.vy < 0 &&
    ball.x > SHOOTER.dividerX
  ) {
    resolveSegmentCollision(shooterDiverter, { x: 0, y: 0 }, 0.88);
  }

  if (
    shooterRoute === 'playfield' &&
    ball.x + ball.radius < SHOOTER.dividerX
  ) {
    shooterRoute = 'released';
    ballHasEnteredPlayfield = true;
  }

  for (const rail of coastalOrbitRails) {
    // The polished orbit loses very little energy, allowing a properly charged
    // launch to sweep through both corners instead of stalling across the top.
    resolveSegmentCollision(rail, { x: 0, y: 0 }, 0.98);
  }

  // The short ramp ejects into open play at an exact 33-degree down-left
  // angle. This sends a strong launch toward the upper target area without
  // consuming the rest of the table.
  if (
    shooterRoute === 'orbit' &&
    ball.vx < 0 &&
    ball.x < 345 &&
    ball.y < 135
  ) {
    ball.x = RAMP_EXIT.x;
    ball.y = RAMP_EXIT.y;
    ball.vx = -Math.cos(RAMP_EXIT.angle) * RAMP_EXIT.speed;
    ball.vy = Math.sin(RAMP_EXIT.angle) * RAMP_EXIT.speed;
    shooterRoute = 'released';
    ballHasEnteredPlayfield = true;
  }

  // A live ball returning down the shooter lane uses the lower cabinet gate.
  // It emerges just above the right flipper with a controlled, playable feed.
  if (
    shooterRoute === 'recovery' &&
    ball.vy > 0 &&
    ballIsInShooterLane() &&
    ball.y >= SHOOTER.recoveryFeedY
  ) {
    ball.x = SHOOTER.dividerX - ball.radius - 4;
    ball.y = SHOOTER.recoveryFeedY;
    ball.vx = -155;
    ball.vy = 80;
    shooterRoute = 'released';
  }

  for (const rail of upperLeftLoopRails) {
    resolveSegmentCollision(rail, { x: 0, y: 0 }, 0.94);
  }

  for (const [index, bumper] of popBumpers.entries()) {
    collideWithPopBumper(bumper, index);
  }

  collideWithMagneticTarget(magneticTarget, dt);

  for (const [index, target] of dropTargets.entries()) {
    collideWithDropTarget(target, index);
  }

  for (const guide of midPlayfieldGuides) {
    resolveSegmentCollision(guide, { x: 0, y: 0 }, wallRestitution);
  }

  for (const guide of lowerGuides) {
    resolveSegmentCollision(guide, { x: 0, y: 0 }, wallRestitution);
  }

  for (const bumper of sideBumpers) {
    collideWithSideBumper(bumper);
  }

  for (const flipper of flippers) {
    collideWithFlipper(flipper);
  }

  // A launch that never reached the playfield is not a drain. The plunger
  // catches it and immediately becomes available for another attempt.
  if (
    !ballHasEnteredPlayfield &&
    ball.vy > 0 &&
    ballIsInShooterLane() &&
    ball.y >= SHOOTER.ballY - 4
  ) {
    parkBallAtPlunger();
    return;
  }

  // Open drain below the flippers.
  if (ball.y - ball.radius > canvas.height) {
    handleDrain();
  }
}

const MIAMI_COLORS = {
  playfield: '#070b18',
  shooterLane: '#0b1222',
  structure: '#20283a',
  cyan: '#22dff3',
  magenta: '#ff3cac',
  lavender: '#c9b8ff'
};

function drawNeonSegment(segment, accent = MIAMI_COLORS.cyan, bodyWidth = 6, accentWidth = 2) {
  ctx.save();
  ctx.lineCap = 'round';

  ctx.strokeStyle = MIAMI_COLORS.structure;
  ctx.lineWidth = bodyWidth;
  ctx.beginPath();
  ctx.moveTo(segment.x1, segment.y1);
  ctx.lineTo(segment.x2, segment.y2);
  ctx.stroke();

  ctx.strokeStyle = accent;
  ctx.lineWidth = accentWidth;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.moveTo(segment.x1, segment.y1);
  ctx.lineTo(segment.x2, segment.y2);
  ctx.stroke();
  ctx.restore();
}

function traceSmoothRail(points) {
  ctx.moveTo(points[0].x, points[0].y);

  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index];
    const next = points[index + 1];
    const midpoint = {
      x: (point.x + next.x) / 2,
      y: (point.y + next.y) / 2
    };
    ctx.quadraticCurveTo(point.x, point.y, midpoint.x, midpoint.y);
  }

  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
}

function drawSmoothNeonRail(points, accent) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = MIAMI_COLORS.structure;
  ctx.lineWidth = 8;
  ctx.beginPath();
  traceSmoothRail(points);
  ctx.stroke();

  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.25;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 7;
  ctx.beginPath();
  traceSmoothRail(points);
  ctx.stroke();
  ctx.restore();
}

function drawCoastalOrbit() {
  const laneGlow = ctx.createLinearGradient(TABLE.left, 0, TABLE.right, 0);
  laneGlow.addColorStop(0, 'rgba(255, 60, 172, 0.12)');
  laneGlow.addColorStop(0.5, 'rgba(201, 184, 255, 0.07)');
  laneGlow.addColorStop(1, 'rgba(34, 223, 243, 0.12)');

  ctx.save();
  ctx.fillStyle = laneGlow;
  ctx.beginPath();
  ctx.moveTo(coastalOrbitOuterPoints[0].x, coastalOrbitOuterPoints[0].y);
  for (const point of coastalOrbitOuterPoints.slice(1)) {
    ctx.lineTo(point.x, point.y);
  }
  for (const point of [...coastalOrbitInnerPoints].reverse()) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  drawSmoothNeonRail(coastalOrbitOuterPoints, MIAMI_COLORS.cyan);
  drawSmoothNeonRail(coastalOrbitInnerPoints, MIAMI_COLORS.magenta);
}

function drawTable() {
  ctx.fillStyle = MIAMI_COLORS.playfield;
  ctx.fillRect(TABLE.left, TABLE.top, TABLE.right - TABLE.left, TABLE.bottom - TABLE.top);

  ctx.fillStyle = MIAMI_COLORS.shooterLane;
  ctx.fillRect(
    shooterDivider.x1 + shooterDivider.radius,
    shooterDivider.y1,
    TABLE.right - shooterDivider.x1 - shooterDivider.radius,
    TABLE.bottom - shooterDivider.y1
  );

  ctx.strokeStyle = MIAMI_COLORS.structure;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(TABLE.left, TABLE.bottom);
  ctx.lineTo(TABLE.left, TABLE.top);
  ctx.lineTo(TABLE.right, TABLE.top);
  ctx.lineTo(TABLE.right, TABLE.bottom);
  ctx.stroke();

  ctx.save();
  ctx.strokeStyle = MIAMI_COLORS.cyan;
  ctx.lineWidth = 1;
  ctx.shadowColor = MIAMI_COLORS.cyan;
  ctx.shadowBlur = 3;
  ctx.stroke();
  ctx.restore();
}

function drawShooterDiverter() {
  const route = visibleShooterRoute();

  ctx.save();
  if (route === 'playfield') {
    drawNeonSegment(shooterDiverter, MIAMI_COLORS.magenta, 9, 2.5);
  } else {
    ctx.globalAlpha = route === 'orbit' ? 1 : 0.38;
    const accent = route === 'orbit'
      ? MIAMI_COLORS.cyan
      : MIAMI_COLORS.lavender;
    drawNeonSegment(shooterDiverterOpen, accent, 9, 2.5);
  }
  ctx.restore();
}

function drawShooterRecoveryGate() {
  ctx.save();
  ctx.globalAlpha = shooterRoute === 'recovery' ? 1 : 0.38;
  drawSmoothNeonRail(shooterRecoveryGuidePoints, MIAMI_COLORS.magenta);
  ctx.restore();
}

function drawShooterLane() {
  drawCoastalOrbit();

  for (const rail of shooterDividerRails) {
    drawNeonSegment(rail, MIAMI_COLORS.cyan);
  }

  drawShooterDiverter();
  drawShooterRecoveryGate();
}

function drawPlunger() {
  ctx.save();
  const pull = plunger.charge * plunger.maxPull;
  const tipY = plunger.topY + pull;

  ctx.strokeStyle = MIAMI_COLORS.structure;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(plunger.x, tipY);
  ctx.lineTo(plunger.x, Math.min(canvas.height - 8, tipY + 36));
  ctx.stroke();

  ctx.strokeStyle = MIAMI_COLORS.cyan;
  ctx.lineWidth = 1;
  ctx.shadowColor = MIAMI_COLORS.cyan;
  ctx.shadowBlur = 3;
  ctx.beginPath();
  ctx.moveTo(plunger.x - 12, plunger.topY - 2);
  ctx.lineTo(plunger.x + 12, plunger.topY - 2);
  ctx.stroke();
  ctx.restore();
}

function drawSideBumpers() {
  for (const bumper of sideBumpers) {
    drawNeonSegment(bumper, MIAMI_COLORS.magenta, 10, 3);
  }
}

function drawLowerGuides() {
  for (const guide of lowerGuides) {
    drawNeonSegment(guide);
  }
}

function drawUpperLeftLoopRamp() {
  const active = loopRamp.active;
  const flashing = performance.now() - loopRamp.flashStartedAt < 260;

  ctx.save();
  const laneGlow = ctx.createLinearGradient(40, 0, 220, 0);
  laneGlow.addColorStop(0, 'rgba(34, 223, 243, 0.13)');
  laneGlow.addColorStop(1, 'rgba(255, 60, 172, 0.13)');
  ctx.fillStyle = laneGlow;
  ctx.beginPath();
  ctx.moveTo(upperLeftLoopOuterPoints[0].x, upperLeftLoopOuterPoints[0].y);
  for (const point of upperLeftLoopOuterPoints.slice(1)) ctx.lineTo(point.x, point.y);
  for (const point of [...upperLeftLoopInnerPoints].reverse()) ctx.lineTo(point.x, point.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  drawSmoothNeonRail(upperLeftLoopOuterPoints, MIAMI_COLORS.cyan);
  drawSmoothNeonRail(upperLeftLoopInnerPoints, MIAMI_COLORS.magenta);

  if (active || flashing) {
    ctx.save();
    ctx.globalAlpha = active ? 0.72 : 0.9;
    ctx.strokeStyle = '#f4ffff';
    ctx.shadowColor = active ? MIAMI_COLORS.cyan : MIAMI_COLORS.magenta;
    ctx.shadowBlur = active ? 18 : 24;
    ctx.lineWidth = active ? 4 : 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    traceSmoothRail(upperLeftLoopPath);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '700 8px ui-monospace, monospace';
  ctx.fillStyle = flashing ? '#f4ffff' : MIAMI_COLORS.lavender;
  ctx.shadowColor = flashing ? MIAMI_COLORS.magenta : MIAMI_COLORS.cyan;
  ctx.shadowBlur = flashing ? 14 : 5;
  ctx.fillText('LOOP', 130, 112);
  ctx.fillStyle = flashing ? MIAMI_COLORS.magenta : MIAMI_COLORS.cyan;
  ctx.fillText('2500', 130, 125);
  ctx.restore();
}

function drawMagneticTarget() {
  const holding = magneticTarget.state === 'holding';
  const recentFlash = performance.now() - magneticTarget.flashStartedAt < 260;
  const heldProgress = holding
    ? 1 - magneticTarget.holdRemaining / magneticTarget.captureDuration
    : 0;
  const pulse = holding
    ? 0.5 + 0.5 * Math.sin(performance.now() / 45)
    : recentFlash ? 1 : 0.35;

  ctx.save();
  ctx.translate(magneticTarget.x, magneticTarget.y);
  ctx.fillStyle = '#02040b';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fill();

  const rings = [
    { radius: 18, color: MIAMI_COLORS.magenta },
    { radius: 13, color: MIAMI_COLORS.cyan },
    { radius: 7, color: MIAMI_COLORS.magenta }
  ];

  for (const [index, ring] of rings.entries()) {
    ctx.globalAlpha = 0.58 + pulse * 0.42;
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = holding ? 2.4 + heldProgress * 1.6 : 2;
    ctx.shadowColor = ring.color;
    ctx.shadowBlur = 6 + pulse * 13;
    ctx.beginPath();
    ctx.arc(
      0, 0,
      ring.radius + (holding ? Math.sin(heldProgress * 8 + index) * 1.5 : 0),
      0, Math.PI * 2
    );
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle = recentFlash ? '#f4ffff' : MIAMI_COLORS.lavender;
  ctx.shadowColor = recentFlash ? MIAMI_COLORS.magenta : MIAMI_COLORS.cyan;
  ctx.shadowBlur = recentFlash ? 18 : 6;
  ctx.beginPath();
  ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();

  if (!holding) {
    ctx.font = '700 6px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f4ffff';
    ctx.fillText('500', 0, 0.5);
  }

  ctx.restore();
}

function drawPopBumpers() {
  const now = performance.now();

  for (const bumper of popBumpers) {
    const accent = MIAMI_COLORS[bumper.accent];
    const hitAge = now - bumper.flashStartedAt;
    const flashing = hitAge >= 0 && hitAge < 260;
    const flashStrength = flashing ? 1 - hitAge / 260 : 0;
    const idlePulse = 0.5 + 0.5 * Math.sin(now / 240 + bumper.x);

    ctx.save();
    ctx.translate(bumper.x, bumper.y);

    ctx.globalAlpha = 0.12 + idlePulse * 0.08 + flashStrength * 0.3;
    ctx.fillStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 18 + flashStrength * 20;
    ctx.beginPath();
    ctx.arc(0, 0, 12 + flashStrength * 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#050815';
    ctx.strokeStyle = MIAMI_COLORS.structure;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = flashing ? '#f4ffff' : accent;
    ctx.lineWidth = flashing ? 2 : 1.25;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 8 + idlePulse * 5 + flashStrength * 22;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.65 + flashStrength * 0.35;
    ctx.strokeStyle = bumper.accent === 'lavender'
      ? MIAMI_COLORS.magenta
      : MIAMI_COLORS.lavender;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.fillStyle = flashing ? '#ffffff' : accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = flashing ? 18 : 7;
    ctx.beginPath();
    ctx.arc(0, 0, 2.25 + flashStrength, 0, Math.PI * 2);
    ctx.fill();

    if (flashing) {
      ctx.globalAlpha = flashStrength;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, 0, 10 + (1 - flashStrength) * 6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = Math.min(1, flashStrength * 1.8);
      ctx.fillStyle = '#f4ffff';
      ctx.font = '700 8px ui-monospace, monospace';
      ctx.shadowColor = accent;
      ctx.shadowBlur = 10;
      ctx.fillText(`+${bumper.lastPoints}`, 0, -27 - (1 - flashStrength) * 7);
    }

    ctx.restore();
  }
}

function drawDropTargets() {
  const now = performance.now();
  const completionAge = now - dropTargetBank.completeFlashStartedAt;
  const completionFlash = completionAge >= 0 && completionAge < 760
    ? 1 - completionAge / 760
    : 0;

  for (const target of dropTargets) {
    const centerX = (target.x1 + target.x2) / 2;
    const centerY = (target.y1 + target.y2) / 2;
    const accent = MIAMI_COLORS[target.accent];
    const hitAge = now - target.flashStartedAt;
    const hitFlash = hitAge >= 0 && hitAge < 300
      ? 1 - hitAge / 300
      : 0;

    ctx.save();
    ctx.translate(centerX, centerY);

    // The housing reaches back to the cabinet wall, making this read as one
    // flush-mounted vertical target bank instead of three floating diamonds.
    ctx.fillStyle = '#02040b';
    ctx.strokeStyle = MIAMI_COLORS.structure;
    ctx.lineWidth = 1.5;
    ctx.fillRect(TABLE.left - centerX + 2, -13, centerX - TABLE.left + 5, 26);
    ctx.strokeRect(TABLE.left - centerX + 2, -13, centerX - TABLE.left + 5, 26);

    ctx.globalAlpha = target.dropped ? 0.28 : 1;
    ctx.translate(target.dropped ? -5 : 0, 0);
    ctx.scale(target.dropped ? 0.22 : 1, 1);
    ctx.fillStyle = hitFlash > 0 ? '#f4ffff' : '#07101d';
    ctx.strokeStyle = hitFlash > 0 ? '#ffffff' : accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 7 + hitFlash * 22 + completionFlash * 12;
    ctx.lineWidth = 2;
    ctx.fillRect(-5, -11, 10, 22);
    ctx.strokeRect(-5, -11, 10, 22);

    ctx.fillStyle = hitFlash > 0 ? accent : '#f4ffff';
    ctx.font = '800 9px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(target.label, 0, 0.5);
    ctx.restore();

    if (hitFlash > 0) {
      ctx.save();
      ctx.globalAlpha = hitFlash;
      ctx.strokeStyle = accent;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 18;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 12 + (1 - hitFlash) * 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '700 7px ui-monospace, monospace';
  ctx.fillStyle = completionFlash > 0 ? '#f4ffff' : MIAMI_COLORS.lavender;
  ctx.shadowColor = completionFlash > 0 ? MIAMI_COLORS.magenta : MIAMI_COLORS.cyan;
  ctx.shadowBlur = 5 + completionFlash * 20;
  if (completionFlash > 0) {
    ctx.fillText('305 +3000', 77, 491);
  }
  ctx.restore();
}

function offsetPathPoints(points, distance) {
  return points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const length = Math.hypot(dx, dy) || 1;
    return {
      x: point.x - dy / length * distance,
      y: point.y + dx / length * distance
    };
  });
}

function drawOceanRamp() {
  const now = performance.now();
  const impactAge = now - oceanSpinner.impactFlashStartedAt;
  const impactFlash = impactAge >= 0 && impactAge < 260
    ? 1 - impactAge / 260
    : 0;
  const tickAge = now - oceanSpinner.flashStartedAt;
  const tickFlash = tickAge >= 0 && tickAge < 190
    ? 1 - tickAge / 190
    : 0;
  const completionAge = now - oceanRamp.flashStartedAt;
  const completionFlash = completionAge >= 0 && completionAge < 320
    ? 1 - completionAge / 320
    : 0;
  const leftRail = offsetPathPoints(oceanRampPath, 16);
  const rightRail = offsetPathPoints(oceanRampPath, -16);
  const lastRailIndex = oceanRampPath.length - 1;

  // Match the two Ocean Drive rails directly to the existing coastal-ramp
  // rails. The color order reverses on the vertical run so neither rail has
  // to cross the other at the Y-junction.
  rightRail[lastRailIndex] = { ...coastalOrbitOuterPoints[0] };
  leftRail[lastRailIndex] = { ...coastalOrbitInnerPoints[0] };

  // Begin the underside shadow after the short ground-level entrance so the
  // mouth reads as rising from the playfield rather than already floating.
  const raisedShadowPath = oceanRampPath.slice(2);
  ctx.save();
  ctx.translate(6, 9);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.72)';
  ctx.lineWidth = 40;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  traceSmoothRail(raisedShadowPath);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  const deckGlow = ctx.createLinearGradient(360, 480, 290, 120);
  deckGlow.addColorStop(0, '#081728');
  deckGlow.addColorStop(0.52, '#14102d');
  deckGlow.addColorStop(1, '#200d2b');
  ctx.strokeStyle = deckGlow;
  ctx.lineWidth = 34;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = completionFlash > 0
    ? '#ffffff'
    : 'rgba(34, 223, 243, 0.42)';
  ctx.shadowBlur = 10 + completionFlash * 20;
  ctx.beginPath();
  traceSmoothRail(oceanRampPath);
  ctx.stroke();

  ctx.globalAlpha = 0.42;
  ctx.strokeStyle = '#725b9e';
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  traceSmoothRail(oceanRampPath);
  ctx.stroke();
  ctx.restore();

  drawSmoothNeonRail(rightRail, MIAMI_COLORS.cyan);
  drawSmoothNeonRail(leftRail, MIAMI_COLORS.magenta);

  if (oceanRamp.active || completionFlash > 0) {
    ctx.save();
    ctx.globalAlpha = oceanRamp.active ? 0.66 : completionFlash;
    ctx.strokeStyle = '#f4ffff';
    ctx.shadowColor = oceanRamp.active
      ? MIAMI_COLORS.cyan
      : MIAMI_COLORS.magenta;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    traceSmoothRail(oceanRampPath);
    ctx.stroke();
    ctx.restore();
  }

  const spinnerPoint = sampleSmoothPath(
    oceanRampPath,
    oceanRamp.spinnerProgress
  );
  const spinnerBefore = sampleSmoothPath(
    oceanRampPath,
    oceanRamp.spinnerProgress - 0.01
  );
  const spinnerAfter = sampleSmoothPath(
    oceanRampPath,
    oceanRamp.spinnerProgress + 0.01
  );
  const gateAngle = Math.atan2(
    spinnerAfter.y - spinnerBefore.y,
    spinnerAfter.x - spinnerBefore.x
  );
  const faceWidth = Math.max(0.1, Math.abs(Math.cos(oceanSpinner.angle)));

  ctx.save();
  ctx.translate(spinnerPoint.x, spinnerPoint.y);
  ctx.rotate(gateAngle);
  ctx.scale(faceWidth, 1);
  ctx.fillStyle = impactFlash > 0 ? '#f4ffff' : '#09101d';
  ctx.strokeStyle = impactFlash > 0 ? '#ffffff' : MIAMI_COLORS.cyan;
  ctx.shadowColor = impactFlash > 0 ? MIAMI_COLORS.magenta : MIAMI_COLORS.cyan;
  ctx.shadowBlur = 8 + impactFlash * 22;
  ctx.lineWidth = 2;
  ctx.fillRect(-5, -17, 10, 34);
  ctx.strokeRect(-5, -17, 10, 34);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = '#f4ffff';
  ctx.shadowColor = MIAMI_COLORS.magenta;
  ctx.shadowBlur = 6 + tickFlash * 16;
  ctx.beginPath();
  ctx.arc(
    spinnerPoint.x,
    spinnerPoint.y,
    3 + tickFlash * 1.5,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();

  ctx.save();
  const labelPoint = sampleSmoothPath(oceanRampPath, 0.18);
  const labelBefore = sampleSmoothPath(oceanRampPath, 0.16);
  const labelAfter = sampleSmoothPath(oceanRampPath, 0.2);
  const labelAngle = Math.atan2(
    labelAfter.y - labelBefore.y,
    labelAfter.x - labelBefore.x
  );
  ctx.translate(labelPoint.x, labelPoint.y);
  ctx.rotate(labelAngle);
  ctx.textAlign = 'center';
  ctx.font = '700 7px ui-monospace, monospace';
  ctx.fillStyle = tickFlash > 0 ? '#f4ffff' : MIAMI_COLORS.lavender;
  ctx.shadowColor = tickFlash > 0 ? MIAMI_COLORS.cyan : MIAMI_COLORS.magenta;
  ctx.shadowBlur = 5 + tickFlash * 14;
  ctx.fillText('OCEAN DRIVE', 0, 2.5);
  ctx.restore();

  if (tickFlash > 0) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '700 7px ui-monospace, monospace';
    ctx.fillStyle = '#f4ffff';
    ctx.shadowColor = MIAMI_COLORS.cyan;
    ctx.shadowBlur = 14;
    ctx.fillText(
      `+${oceanSpinner.lastPoints}`,
      spinnerPoint.x - 18,
      spinnerPoint.y - 20
    );
    ctx.restore();
  }
}

function ballIsUnderOceanRamp() {
  if (oceanRamp.active) return false;

  // The entrance is still at playfield level. Farther up, the deck is raised
  // and should visually cover a live ball passing beneath it.
  for (let step = 4; step <= 38; step += 1) {
    const point = sampleSmoothPath(oceanRampPath, step / 40);
    if (Math.hypot(ball.x - point.x, ball.y - point.y) <= ball.radius + 17) {
      return true;
    }
  }

  return false;
}

function drawOceanRampOcclusion() {
  if (!ballIsUnderOceanRamp()) return;

  // Redraw only the tiny deck area over the ball, preserving the established
  // ramp artwork while placing an under-ramp ball on the correct visual layer.
  ctx.save();
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius + 2, 0, Math.PI * 2);
  ctx.clip();
  drawOceanRamp();
  ctx.restore();
}

function drawPassivePlayfieldGeometry() {
  for (const guide of midPlayfieldGuides) {
    drawNeonSegment(guide, MIAMI_COLORS.magenta);
  }

  drawUpperLeftLoopRamp();
  drawPopBumpers();
  drawMagneticTarget();
  drawDropTargets();
  drawOceanRamp();
}

function drawLowerApron() {
  ctx.fillStyle = '#0b1020';
  ctx.strokeStyle = '#28314b';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(24, 670);
  ctx.lineTo(164, 670);
  ctx.lineTo(190, 696);
  ctx.lineTo(24, 696);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(396, 670);
  ctx.lineTo(256, 670);
  ctx.lineTo(230, 696);
  ctx.lineTo(396, 696);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.strokeStyle = MIAMI_COLORS.magenta;
  ctx.lineWidth = 1;
  ctx.shadowColor = MIAMI_COLORS.magenta;
  ctx.shadowBlur = 3;
  ctx.beginPath();
  ctx.moveTo(32, 666);
  ctx.lineTo(62, 666);
  ctx.moveTo(358, 666);
  ctx.lineTo(388, 666);
  ctx.stroke();
  ctx.restore();
}

function drawFlippers() {
  ctx.lineCap = 'round';
  const now = performance.now();

  for (const flipper of flippers) {
    const segment = getFlipperSegment(flipper);
    const accent = flipper.side === 'left' ? MIAMI_COLORS.cyan : MIAMI_COLORS.magenta;
    const firedAge = now - flipper.coilFlashStartedAt;
    const firedFlash = firedAge >= 0 && firedAge < 180
      ? 1 - firedAge / 180
      : 0;
    const storedEnergy = clamp(
      Math.max(
        flipper.cradleCharge,
        flipper.storedCharge,
        flipper.pendingPunch
      ),
      0,
      1
    );
    const fullPulse = storedEnergy > 0.96
      ? 0.78 + 0.22 * Math.sin(now / 55)
      : 1;
    const glowEnergy = Math.max(storedEnergy * fullPulse, firedFlash);

    ctx.strokeStyle = MIAMI_COLORS.structure;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(segment.x1, segment.y1);
    ctx.lineTo(segment.x2, segment.y2);
    ctx.stroke();

    ctx.strokeStyle = flipper.pressed ? '#f1efff' : MIAMI_COLORS.lavender;
    ctx.lineWidth = 8;
    ctx.stroke();

    if (glowEnergy > 0.005) {
      ctx.save();
      ctx.globalAlpha = 0.14 + glowEnergy * 0.5;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 10 + glowEnergy * 5;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 7 + glowEnergy * 28;
      ctx.stroke();

      ctx.globalAlpha = 0.12 + glowEnergy * 0.82;
      ctx.strokeStyle = '#f8ffff';
      ctx.lineWidth = 3 + glowEnergy * 5;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 4 + glowEnergy * 18;
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = glowEnergy > 0.9 ? '#f8ffff' : accent;
    ctx.lineWidth = 2;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 4 + glowEnergy * 15;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = MIAMI_COLORS.structure;
    ctx.beginPath();
    ctx.arc(flipper.pivotX, flipper.pivotY, 4 + glowEnergy * 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = glowEnergy > 0.9 ? '#f8ffff' : accent;
    ctx.lineWidth = 1.5 + glowEnergy;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 3 + glowEnergy * 10;
    ctx.stroke();
  }
}

function drawBall() {
  ctx.fillStyle = '#eef4ff';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTable();
  drawShooterLane();
  drawPassivePlayfieldGeometry();
  drawPlunger();
  drawSideBumpers();
  drawLowerGuides();
  drawLowerApron();
  drawFlippers();
  drawBall();
  drawOceanRampOcclusion();
}

const fixedStep = 1 / 240;
let accumulator = 0;
let previousTime = performance.now();

function frame(now) {
  let frameTime = (now - previousTime) / 1000;
  previousTime = now;

  if (window.miamiGameStarted === false) {
    accumulator = 0;
    draw();
    requestAnimationFrame(frame);
    return;
  }

  // Avoid giant physics jumps after the tab has been inactive.
  frameTime = Math.min(frameTime, 0.05);
  accumulator += frameTime;

  while (accumulator >= fixedStep) {
    update(fixedStep);
    accumulator -= fixedStep;
  }

  draw();
  requestAnimationFrame(frame);
}

const keyboardFlipperCodes = {
  left: new Set(),
  right: new Set()
};

const buttonFlipperPointers = {
  left: new Set(),
  right: new Set()
};

function flipperButtonFor(side) {
  return side === 'left' ? leftFlipperButton : rightFlipperButton;
}

function syncFlipperInput(side) {
  const wasPressed = keys[side];
  const isPressed =
    keyboardFlipperCodes[side].size > 0 ||
    buttonFlipperPointers[side].size > 0;

  keys[side] = isPressed;
  flipperButtonFor(side).setAttribute('aria-pressed', String(isPressed));

  if (isPressed && !wasPressed) {
    window.dispatchEvent(new CustomEvent('miami-flipper', {
      detail: { index: side === 'left' ? 0 : 1 }
    }));
  }
}

function sideForKey(code) {
  if (code === 'ArrowLeft' || code === 'KeyZ') {
    return 'left';
  }

  if (
    code === 'ArrowRight' ||
    code === 'Slash' ||
    code === 'NumpadDivide' ||
    code === 'KeyX'
  ) {
    return 'right';
  }

  return null;
}

function setKeyState(code, pressed) {
  const side = sideForKey(code);
  if (!side) {
    return false;
  }

  if (pressed) {
    keyboardFlipperCodes[side].add(code);
  } else {
    keyboardFlipperCodes[side].delete(code);
  }

  syncFlipperInput(side);
  return true;
}

function syncLaunchButton() {
  launchButton.disabled = !ball.ready && !gameOver;
  launchButton.setAttribute('aria-pressed', String(plunger.charging));
  launchButtonLabel.textContent = gameOver ? 'NEW GAME' : 'LAUNCH';
}

function beginPlungerCharge() {
  if (gameOver) {
    resetGame();
  }

  if (!ball.ready || plunger.charging) {
    return;
  }

  plunger.charging = true;
  syncLaunchButton();
}

function finishPlungerCharge(shouldLaunch) {
  if (!plunger.charging) {
    return;
  }

  if (shouldLaunch && ball.ready) {
    launchBall();
    return;
  }

  plunger.charge = 0;
  plunger.charging = false;
  syncLaunchButton();
}

function bindFlipperButton(button, side) {
  button.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();
    buttonFlipperPointers[side].add(event.pointerId);
    syncFlipperInput(side);
    button.setPointerCapture(event.pointerId);
  });

  const releasePointer = (event) => {
    buttonFlipperPointers[side].delete(event.pointerId);
    syncFlipperInput(side);
  };

  button.addEventListener('pointerup', releasePointer);
  button.addEventListener('pointercancel', releasePointer);
  button.addEventListener('lostpointercapture', releasePointer);
  button.addEventListener('contextmenu', event => event.preventDefault());

  button.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' && event.code !== 'Enter') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) {
      buttonFlipperPointers[side].add('keyboard');
      syncFlipperInput(side);
    }
  });

  button.addEventListener('keyup', (event) => {
    if (event.code !== 'Space' && event.code !== 'Enter') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    buttonFlipperPointers[side].delete('keyboard');
    syncFlipperInput(side);
  });
}

let activeLaunchPointer = null;
let launchKeyHeld = false;

launchButton.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }

  event.preventDefault();
  activeLaunchPointer = event.pointerId;
  beginPlungerCharge();
  launchButton.setPointerCapture(event.pointerId);
});

launchButton.addEventListener('pointerup', (event) => {
  if (event.pointerId !== activeLaunchPointer) {
    return;
  }

  activeLaunchPointer = null;
  finishPlungerCharge(true);
});

function cancelLaunchPointer(event) {
  if (event.pointerId !== activeLaunchPointer) {
    return;
  }

  activeLaunchPointer = null;
  finishPlungerCharge(false);
}

launchButton.addEventListener('pointercancel', cancelLaunchPointer);
launchButton.addEventListener('lostpointercapture', cancelLaunchPointer);
launchButton.addEventListener('contextmenu', event => event.preventDefault());

launchButton.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' && event.code !== 'Enter') {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (!event.repeat) {
    launchKeyHeld = true;
    beginPlungerCharge();
  }
});

launchButton.addEventListener('keyup', (event) => {
  if (event.code !== 'Space' && event.code !== 'Enter') {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (launchKeyHeld) {
    launchKeyHeld = false;
    finishPlungerCharge(true);
  }
});

window.addEventListener('keydown', (event) => {
  if (setKeyState(event.code, true)) {
    event.preventDefault();
  }

  if (event.code === 'Space') {
    event.preventDefault();
    if (!event.repeat) {
      beginPlungerCharge();
    }
  }

  if (event.code === 'KeyR') {
    event.preventDefault();
    resetGame();
  }
});

window.addEventListener('keyup', (event) => {
  if (setKeyState(event.code, false)) {
    event.preventDefault();
  }

  if (event.code === 'Space') {
    event.preventDefault();
    finishPlungerCharge(true);
  }
});

function releaseAllControls() {
  keyboardFlipperCodes.left.clear();
  keyboardFlipperCodes.right.clear();
  buttonFlipperPointers.left.clear();
  buttonFlipperPointers.right.clear();
  syncFlipperInput('left');
  syncFlipperInput('right');

  activeLaunchPointer = null;
  launchKeyHeld = false;
  finishPlungerCharge(false);
}

bindFlipperButton(leftFlipperButton, 'left');
bindFlipperButton(rightFlipperButton, 'right');
syncFlipperInput('left');
syncFlipperInput('right');
syncStatusDisplay();
syncLaunchButton();

window.addEventListener('blur', releaseAllControls);

requestAnimationFrame(frame);
