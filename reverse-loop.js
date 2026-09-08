// Miami Nights: allow the upper-left circle ramp to run in reverse.
// A completed reverse pass scores and dispatches the same loop-complete event
// as the stock forward route so existing 3X progress logic remains authoritative.

(() => {
  let reverseLoopActive = false;

  const baseTryEnterUpperLeftLoopWithReverse = tryEnterUpperLeftLoop;
  tryEnterUpperLeftLoop = function tryEnterUpperLeftLoopBidirectional() {
    const enteredForward = baseTryEnterUpperLeftLoopWithReverse();
    if (enteredForward) {
      reverseLoopActive = false;
      return true;
    }

    if (loopRamp.active || gameOver) return false;

    const lastIndex = upperLeftLoopPath.length - 1;
    const entrance = upperLeftLoopPath[lastIndex];
    const inwardPoint = upperLeftLoopPath[lastIndex - 1];
    const distance = Math.hypot(ball.x - entrance.x, ball.y - entrance.y);
    const speed = Math.hypot(ball.vx, ball.vy);
    const inwardX = inwardPoint.x - entrance.x;
    const inwardY = inwardPoint.y - entrance.y;
    const inwardLength = Math.hypot(inwardX, inwardY) || 1;
    const inwardSpeed =
      (ball.vx * inwardX + ball.vy * inwardY) / inwardLength;

    if (distance >= 25 || speed < 260 || inwardSpeed < 140) return false;

    reverseLoopActive = true;
    loopRamp.active = true;
    loopRamp.progress = 1;
    ball.x = entrance.x;
    ball.y = entrance.y;
    ball.vx = 0;
    ball.vy = 0;
    return true;
  };

  const baseUpdateUpperLeftLoopWithReverse = updateUpperLeftLoop;
  updateUpperLeftLoop = function updateUpperLeftLoopBidirectional(dt) {
    if (!reverseLoopActive) {
      return baseUpdateUpperLeftLoopWithReverse(dt);
    }

    if (!loopRamp.active) {
      reverseLoopActive = false;
      return false;
    }

    const previousX = ball.x;
    const previousY = ball.y;
    loopRamp.progress = clamp(
      loopRamp.progress - dt / loopRamp.duration,
      0,
      1
    );

    const point = sampleSmoothPath(upperLeftLoopPath, loopRamp.progress);
    ball.x = point.x;
    ball.y = point.y;
    ball.vx = (point.x - previousX) / dt;
    ball.vy = (point.y - previousY) / dt;

    if (loopRamp.progress <= 0) {
      loopRamp.active = false;
      reverseLoopActive = false;
      loopRamp.flashStartedAt = performance.now();

      // Continue naturally back into the playfield from the stock entrance.
      const start = upperLeftLoopPath[0];
      const next = upperLeftLoopPath[1];
      const exitX = start.x - next.x;
      const exitY = start.y - next.y;
      const exitLength = Math.hypot(exitX, exitY) || 1;
      const exitSpeed = 335;
      ball.vx = exitX / exitLength * exitSpeed;
      ball.vy = exitY / exitLength * exitSpeed;

      score += loopRamp.value;
      syncStatusDisplay();
      window.dispatchEvent(new CustomEvent('miami-loop-complete', {
        detail: {
          points: loopRamp.value,
          score,
          direction: 'reverse'
        }
      }));
    }

    return true;
  };

  window.addEventListener('miami-drain', () => {
    reverseLoopActive = false;
  });

  const baseResetGameWithReverseLoop = resetGame;
  resetGame = function resetGameWithReverseLoop() {
    reverseLoopActive = false;
    baseResetGameWithReverseLoop();
  };
})();
