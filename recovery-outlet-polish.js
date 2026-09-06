// Miami Nights: make the lower-right underpass outlet read as a recessed
// tunnel slot instead of a standup target. Presentation only; routing and
// physics stay exactly as established.

(() => {
  if (window.miamiRecoveryOutletPolishInstalled) return;
  window.miamiRecoveryOutletPolishInstalled = true;

  let recoveryExitFlashStartedAt = -Infinity;

  // Observe a real underpass emergence so the slot can briefly wake up only
  // when it actually functions as an exit. No route selection or ball motion is
  // changed here.
  if (typeof updateUnderpass === 'function') {
    const baseUpdateUnderpassWithOutletFlash = updateUnderpass;
    updateUnderpass = function updateUnderpassWithOutletFlash(dt) {
      const wasActive = Boolean(underpass.active);
      const result = baseUpdateUnderpassWithOutletFlash(dt);

      if (wasActive && !underpass.active && underpass.outlets[3]) {
        const mouth = underpass.outlets[3];
        const exitDistance = Math.hypot(ball.x - mouth.x, ball.y - mouth.y);
        if (exitDistance <= mouth.radius + ball.radius + 12) {
          recoveryExitFlashStartedAt = performance.now();
        }
      }

      return result;
    };
  }

  function drawRecessedRecoverySlot(mouth) {
    const age = performance.now() - recoveryExitFlashStartedAt;
    const flash = age >= 0 && age < 360 ? 1 - age / 360 : 0;
    const mobile = Boolean(window.miamiMobilePerformanceMode);

    ctx.save();
    ctx.translate(mouth.x, mouth.y);

    // A dark slit cut into the divider: wide and shallow so it reads as an
    // opening/gate, not a vertical target face.
    ctx.fillStyle = '#01030a';
    ctx.fillRect(-9, -4, 18, 8);

    ctx.lineCap = 'round';
    ctx.strokeStyle = '#30394d';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-9, -4.5);
    ctx.lineTo(8, -4.5);
    ctx.moveTo(-9, 4.5);
    ctx.lineTo(8, 4.5);
    ctx.stroke();

    ctx.globalAlpha = flash > 0 ? 0.95 : 0.38;
    ctx.strokeStyle = flash > 0 ? '#ffffff' : MIAMI_COLORS.magenta;
    ctx.lineWidth = flash > 0 ? 2 : 1.25;
    ctx.shadowColor = MIAMI_COLORS.magenta;
    ctx.shadowBlur = mobile ? 0 : (flash > 0 ? 12 + flash * 10 : 3);
    ctx.beginPath();
    ctx.moveTo(-7, -3.5);
    ctx.lineTo(7, -3.5);
    ctx.moveTo(-7, 3.5);
    ctx.lineTo(7, 3.5);
    ctx.stroke();

    // Only an actual ball emergence gets a cyan center flare.
    if (flash > 0) {
      ctx.globalAlpha = flash;
      ctx.strokeStyle = MIAMI_COLORS.cyan;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = MIAMI_COLORS.cyan;
      ctx.shadowBlur = mobile ? 0 : 10;
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(9, 0);
      ctx.stroke();
    }

    ctx.restore();
  }

  if (
    typeof drawProminentUnderpassMouth === 'function' &&
    typeof drawCompactSideExit === 'function'
  ) {
    drawUnderpassMouths = function drawUnderpassMouthsWithRecessedRecoverySlot() {
      drawProminentUnderpassMouth(underpass.entry, MIAMI_COLORS.magenta);
      drawTunnelMouth(underpass.outlets[0], MIAMI_COLORS.lavender);
      drawTunnelMouth(underpass.outlets[1], MIAMI_COLORS.cyan, Math.PI / 2);
      drawTunnelMouth(underpass.outlets[2], MIAMI_COLORS.cyan);
      drawRecessedRecoverySlot(underpass.outlets[3]);
      drawCompactSideExit(underpass.outlets[4], MIAMI_COLORS.cyan);
    };
  }
})();