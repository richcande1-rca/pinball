// Miami Nights: preserve a live ball that returns backward through the shooter chute.
// If the ball is still on the recovery route when it reaches the plunger area,
// park that same ball for relaunch. No geometry, scoring, or drain rules change.

(() => {
  if (window.miamiShooterReturnFixInstalled) return;
  window.miamiShooterReturnFixInstalled = true;

  const baseUpdateWithShooterReturnFix = update;
  update = function updateWithShooterReturnFix(dt) {
    if (
      !gameOver &&
      !ball.ready &&
      shooterRoute === 'recovery' &&
      ball.vy > 0 &&
      ball.y >= SHOOTER.ballY - 4
    ) {
      parkBallAtPlunger();
      return;
    }

    baseUpdateWithShooterReturnFix(dt);
  };
})();
