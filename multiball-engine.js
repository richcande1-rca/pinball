// Miami Nights: MB1 two-ball peer engine.
//
// This layer is deliberately dormant until a companion is explicitly created.
// Normal single-ball play still runs through the existing update/draw/drain path
// unchanged. A companion uses the same 240 Hz fixed-step cadence, gravity,
// rolling drag, core rail/bumper/target/flipper collision helpers, and the same
// physical Ocean Drive / loop / underpass route functions. The CAPTIVE READY
// trigger is intentionally NOT connected in MB1; MB2 will do that only after
// this peer engine proves stable.

(() => {
  if (window.miamiMultiballEngineInstalled) return;
  window.miamiMultiballEngineInstalled = true;

  const PEER_ID = 'companion-ball';
  const BALL_COLLISION_RESTITUTION = 0.92;

  const companion = {
    active: false,
    testOnly: false,
    id: PEER_ID,
    ball: {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: ball.radius,
      ready: false
    },
    route: {
      shooterRoute: 'released',
      enteredPlayfield: true,
      underpassActive: false,
      underpassEnteredAt: -Infinity,
      oceanActive: false,
      oceanProgress: 0,
      oceanSpinnerTriggered: false,
      oceanEntrySpeed: 0,
      loopActive: false,
      loopProgress: 0
    }
  };

  const engineState = {
    companion,
    livePhysicalBalls: 1,
    lastPeerDrainAt: -Infinity
  };

  const peerRecoveryRails = typeof makeRailSegments === 'function'
    ? makeRailSegments(shooterRecoveryGuidePoints)
    : [];

  function copyBallState(source, target) {
    target.x = source.x;
    target.y = source.y;
    target.vx = source.vx;
    target.vy = source.vy;
    target.radius = source.radius;
    target.ready = Boolean(source.ready);
  }

  function captureRouteState() {
    return {
      shooterRoute,
      enteredPlayfield: ballHasEnteredPlayfield,
      underpassActive: underpass.active,
      underpassEnteredAt: underpass.enteredAt,
      oceanActive: oceanRamp.active,
      oceanProgress: oceanRamp.progress,
      oceanSpinnerTriggered: oceanRamp.spinnerTriggered,
      oceanEntrySpeed: oceanRamp.entrySpeed,
      loopActive: loopRamp.active,
      loopProgress: loopRamp.progress
    };
  }

  function applyRouteState(route) {
    shooterRoute = route.shooterRoute;
    ballHasEnteredPlayfield = route.enteredPlayfield;
    underpass.active = route.underpassActive;
    underpass.enteredAt = route.underpassEnteredAt;
    oceanRamp.active = route.oceanActive;
    oceanRamp.progress = route.oceanProgress;
    oceanRamp.spinnerTriggered = route.oceanSpinnerTriggered;
    oceanRamp.entrySpeed = route.oceanEntrySpeed;
    loopRamp.active = route.loopActive;
    loopRamp.progress = route.loopProgress;
  }

  function storeCompanionContext() {
    copyBallState(ball, companion.ball);
    companion.route = captureRouteState();
  }

  function withCompanionContext(callback) {
    const tableBall = { ...ball };
    const tableRoute = captureRouteState();

    copyBallState(companion.ball, ball);
    applyRouteState(companion.route);

    try {
      callback();
    } finally {
      storeCompanionContext();
      copyBallState(tableBall, ball);
      applyRouteState(tableRoute);
    }
  }

  function peerInSpecialRoute() {
    return companion.route.underpassActive ||
      companion.route.oceanActive ||
      companion.route.loopActive;
  }

  function tableBallInSpecialRoute() {
    return underpass.active ||
      oceanRamp.active ||
      loopRamp.active ||
      magneticTarget.state === 'holding';
  }

  function resolvePeerBallCollision() {
    if (
      !companion.active ||
      ball.ready ||
      peerInSpecialRoute() ||
      tableBallInSpecialRoute()
    ) return;

    const peer = companion.ball;
    let dx = peer.x - ball.x;
    let dy = peer.y - ball.y;
    let distance = Math.hypot(dx, dy);
    const minimum = peer.radius + ball.radius;
    if (distance >= minimum) return;

    if (distance < 0.0001) {
      dx = 1;
      dy = 0;
      distance = 1;
    }

    const nx = dx / distance;
    const ny = dy / distance;
    const overlap = minimum - distance;

    // Equal-mass balls share the positional correction equally.
    ball.x -= nx * overlap * 0.5;
    ball.y -= ny * overlap * 0.5;
    peer.x += nx * overlap * 0.5;
    peer.y += ny * overlap * 0.5;

    const relativeNormalSpeed =
      (peer.vx - ball.vx) * nx +
      (peer.vy - ball.vy) * ny;
    if (relativeNormalSpeed >= 0) return;

    const impulse = -(
      (1 + BALL_COLLISION_RESTITUTION) * relativeNormalSpeed
    ) / 2;

    ball.vx -= impulse * nx;
    ball.vy -= impulse * ny;
    peer.vx += impulse * nx;
    peer.vy += impulse * ny;
  }

  function stepCompanionLoosePlay(dt) {
    // Special physical routes use the exact core route functions. Their progress
    // is kept in the companion route context instead of stealing the table ball's
    // current Ocean Drive / loop / underpass state.
    if (
      updateUpperLeftLoop(dt) ||
      updateOceanRamp(dt) ||
      updateUnderpass(dt)
    ) return;

    ball.vy += gravity * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.vx *= rollingDrag;
    ball.vy *= rollingDrag;

    if (tryEnterUnderpass()) return;
    if (tryEnterUpperLeftLoop()) return;
    if (tryEnterOceanRamp()) return;

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
      resolveSegmentCollision(rail, { x: 0, y: 0 }, 0.98);
    }

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

    for (const rail of upperLeftLoopRails) {
      resolveSegmentCollision(rail, { x: 0, y: 0 }, 0.94);
    }

    for (const guide of underpassEntryGuides) {
      resolveSegmentCollision(guide, { x: 0, y: 0 }, 0.92);
    }

    for (const [index, bumper] of popBumpers.entries()) {
      collideWithPopBumper(bumper, index);
    }

    // MB1 intentionally leaves the single-ball capture devices (magnet/cafe)
    // under their existing owner. They become peer-aware in the activation step;
    // a dormant engine must not create two simultaneous owners of one lock.

    for (const [index, target] of dropTargets.entries()) {
      collideWithDropTarget(target, index);
    }

    for (const guide of midPlayfieldGuides) {
      resolveSegmentCollision(guide, { x: 0, y: 0 }, wallRestitution);
    }

    for (const guide of lowerGuides) {
      resolveSegmentCollision(guide, { x: 0, y: 0 }, wallRestitution);
    }

    if (shooterRoute === 'recovery' && ball.vy > 0 && ballIsInShooterLane()) {
      for (const rail of peerRecoveryRails) {
        resolveSegmentCollision(rail, { x: 0, y: 0 }, 0.88);
      }
      if (ball.x + ball.radius < SHOOTER.dividerX) {
        shooterRoute = 'released';
        ballHasEnteredPlayfield = true;
      }
    }

    for (const bumper of sideBumpers) {
      collideWithSideBumper(bumper);
    }

    for (const flipper of flippers) {
      collideWithFlipper(flipper);
    }
  }

  function finishPeerDrain() {
    if (!companion.active) return;

    const wasTestOnly = companion.testOnly;
    companion.active = false;
    companion.testOnly = false;
    engineState.livePhysicalBalls = 1;
    engineState.lastPeerDrainAt = performance.now();

    let report = null;
    if (!wasTestOnly && typeof window.miamiReportMultiballPeerDrain === 'function') {
      report = window.miamiReportMultiballPeerDrain(PEER_ID);
    }

    window.dispatchEvent(new CustomEvent('miami-multiball-peer-drain', {
      detail: {
        peer: PEER_ID,
        survivor: 'table-ball',
        consumesNormalBall: false,
        testOnly: wasTestOnly,
        lifecycle: report
      }
    }));
  }

  function stepCompanion(dt) {
    if (!companion.active || gameOver) return;

    let drained = false;
    withCompanionContext(() => {
      stepCompanionLoosePlay(dt);
      drained = ball.y - ball.radius > canvas.height;
    });

    if (drained) finishPeerDrain();
  }

  function spawnCompanion({
    x,
    y,
    vx = 0,
    vy = -260,
    confirmLifecycle = false,
    testOnly = false
  } = {}) {
    if (companion.active || gameOver || ball.ready) return false;

    companion.active = true;
    companion.testOnly = Boolean(testOnly);
    companion.ball.x = Number.isFinite(x)
      ? x
      : clamp(ball.x + 28, TABLE.left + ball.radius + 2, SHOOTER.dividerX - ball.radius - 2);
    companion.ball.y = Number.isFinite(y)
      ? y
      : clamp(ball.y - 34, TABLE.top + ball.radius + 2, TABLE.bottom - 90);
    companion.ball.vx = vx;
    companion.ball.vy = vy;
    companion.ball.radius = ball.radius;
    companion.ball.ready = false;
    companion.route = {
      shooterRoute: 'released',
      enteredPlayfield: true,
      underpassActive: false,
      underpassEnteredAt: -Infinity,
      oceanActive: false,
      oceanProgress: 0,
      oceanSpinnerTriggered: false,
      oceanEntrySpeed: 0,
      loopActive: false,
      loopProgress: 0
    };
    engineState.livePhysicalBalls = 2;

    if (confirmLifecycle) {
      const confirm = window.miamiConfirmTwoBallMultiballStarted;
      if (typeof confirm !== 'function' || !confirm(PEER_ID)) {
        companion.active = false;
        companion.testOnly = false;
        engineState.livePhysicalBalls = 1;
        return false;
      }
    }

    window.dispatchEvent(new CustomEvent('miami-multiball-peer-created', {
      detail: {
        peer: PEER_ID,
        liveCount: 2,
        testOnly: companion.testOnly
      }
    }));
    return true;
  }

  function removeCompanion(reason = 'removed') {
    if (!companion.active) return false;
    const wasTestOnly = companion.testOnly;
    companion.active = false;
    companion.testOnly = false;
    engineState.livePhysicalBalls = 1;
    window.dispatchEvent(new CustomEvent('miami-multiball-peer-removed', {
      detail: { peer: PEER_ID, reason, testOnly: wasTestOnly }
    }));
    return true;
  }

  function promoteCompanionToTableBall() {
    if (!companion.active) return false;

    copyBallState(companion.ball, ball);
    applyRouteState(companion.route);
    companion.active = false;
    companion.testOnly = false;
    engineState.livePhysicalBalls = 1;

    if (window.miamiMultiballState) {
      window.miamiMultiballState.phase = 'single';
      window.miamiMultiballState.liveCount = 1;
      window.miamiMultiballState.peers = ['table-ball'];
      window.miamiMultiballState.sourceBallNumber = null;
    }
    return true;
  }

  const baseHandleDrainWithPeerEngine = handleDrain;
  handleDrain = function handleDrainWithPeerEngine() {
    const lifecycle = window.miamiMultiballState;
    if (
      companion.active &&
      !companion.testOnly &&
      lifecycle &&
      lifecycle.phase === 'multiball'
    ) {
      const report = typeof window.miamiReportMultiballPeerDrain === 'function'
        ? window.miamiReportMultiballPeerDrain('table-ball')
        : null;

      if (report && report.handled && report.consumesNormalBall === false) {
        promoteCompanionToTableBall();
        engineState.lastPeerDrainAt = performance.now();
        window.dispatchEvent(new CustomEvent('miami-multiball-peer-drain', {
          detail: {
            peer: 'table-ball',
            survivor: 'table-ball',
            promotedFrom: PEER_ID,
            consumesNormalBall: false,
            lifecycle: report
          }
        }));
        return;
      }
    }

    baseHandleDrainWithPeerEngine();
  };

  const baseUpdateWithPeerEngine = update;
  update = function updateWithPeerEngine(dt) {
    baseUpdateWithPeerEngine(dt);
    if (!companion.active || gameOver) return;
    stepCompanion(dt);
    resolvePeerBallCollision();
  };

  function companionVisible() {
    if (!companion.active) return false;
    if (!companion.route.underpassActive) return true;

    const peer = companion.ball;
    return [underpass.entry, ...underpass.outlets].some(
      mouth => Math.hypot(peer.x - mouth.x, peer.y - mouth.y) < mouth.radius + 4
    );
  }

  const baseDrawBallWithPeerEngine = drawBall;
  drawBall = function drawBallWithPeerEngine() {
    baseDrawBallWithPeerEngine();
    if (!companionVisible()) return;

    const peer = companion.ball;
    ctx.fillStyle = '#eef4ff';
    ctx.beginPath();
    ctx.arc(peer.x, peer.y, peer.radius, 0, Math.PI * 2);
    ctx.fill();
  };

  const baseResetGameWithPeerEngine = resetGame;
  resetGame = function resetGameWithPeerEngine() {
    removeCompanion('new-game');
    baseResetGameWithPeerEngine();
  };

  window.miamiMultiballEngine = {
    state: engineState,
    spawnCompanion,
    removeCompanion,
    // Dormant MB1 test hook. It never consumes O/C/H and is not bound to a key.
    spawnTestPeer(overrides = {}) {
      return spawnCompanion({
        ...overrides,
        confirmLifecycle: false,
        testOnly: true
      });
    }
  };

  const stampBuild = () => {
    const buildNumberDisplay = document.querySelector('.build-number');
    if (buildNumberDisplay) {
      buildNumberDisplay.textContent = 'Build 20260910-PERF1-MB1';
    }
  };
  stampBuild();
  window.setTimeout(stampBuild, 400);
})();
