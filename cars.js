// Miami Nights decorative exotics beneath the center logo.
// VICE protocol: flat, low-slung neon artwork only — no gameplay behavior.

(() => {
  function drawGroundShadow(width) {
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = '#00030a';
    ctx.beginPath();
    ctx.ellipse(0, 10, width * 0.48, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawRecessedWheel(x, y, radius = 6.2) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#02040a';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#384359';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#090d17';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function strokeNeonPath(accent, drawPath) {
    ctx.save();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = accent;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 5;
    ctx.beginPath();
    drawPath();
    ctx.stroke();
    ctx.restore();
  }

  function drawLamborghini() {
    ctx.save();
    ctx.translate(150, 522);
    ctx.rotate(-0.075);

    drawGroundShadow(84);
    drawRecessedWheel(-27, 10.5, 6.3);
    drawRecessedWheel(27, 10.5, 6.3);

    // Low Countach-style wedge: mostly shadow, with the yellow living in the
    // silhouette instead of a glossy toy-car gradient.
    ctx.fillStyle = '#3a2905';
    ctx.strokeStyle = '#75520b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-43, 7);
    ctx.lineTo(-36, -5);
    ctx.lineTo(-20, -11);
    ctx.lineTo(11, -12);
    ctx.lineTo(31, -7);
    ctx.lineTo(43, 0);
    ctx.lineTo(39, 7);
    ctx.lineTo(30, 10);
    ctx.lineTo(-35, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dark, nearly flush canopy.
    ctx.fillStyle = '#08111b';
    ctx.beginPath();
    ctx.moveTo(-18, -7.5);
    ctx.lineTo(-7, -11);
    ctx.lineTo(10, -10.5);
    ctx.lineTo(22, -6);
    ctx.lineTo(15, -2);
    ctx.lineTo(-14, -2);
    ctx.closePath();
    ctx.fill();

    // One hard amber belt line gives the car its identity without making it
    // look like a separate illustrated sticker.
    strokeNeonPath('#f0b51b', () => {
      ctx.moveTo(-39, 3);
      ctx.lineTo(-30, -5);
      ctx.lineTo(-18, -9.5);
      ctx.lineTo(11, -10.5);
      ctx.lineTo(30, -6);
      ctx.lineTo(40, 0);
    });

    ctx.save();
    ctx.strokeStyle = MIAMI_COLORS.cyan;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.8;
    ctx.shadowColor = MIAMI_COLORS.cyan;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 3;
    ctx.beginPath();
    ctx.moveTo(-13, -2.5);
    ctx.lineTo(15, -2.5);
    ctx.stroke();
    ctx.restore();

    // Tiny headlamp slash — not a glowing headlight blob.
    ctx.save();
    ctx.strokeStyle = '#eaffff';
    ctx.lineWidth = 1.2;
    ctx.shadowColor = MIAMI_COLORS.cyan;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 4;
    ctx.beginPath();
    ctx.moveTo(31, -4.5);
    ctx.lineTo(39, -1.3);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  function drawFerrari() {
    ctx.save();
    ctx.translate(268, 522);
    ctx.rotate(0.065);

    drawGroundShadow(82);
    drawRecessedWheel(-26, 10.5, 6.2);
    drawRecessedWheel(26, 10.5, 6.2);

    // Dark Testarossa-era wedge. The red is intentionally deep and flat so
    // the magenta edge light belongs to the table rather than to a toy sprite.
    ctx.fillStyle = '#3b070d';
    ctx.strokeStyle = '#71111d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-42, 6);
    ctx.lineTo(-37, -3);
    ctx.lineTo(-23, -9);
    ctx.lineTo(-5, -11.5);
    ctx.lineTo(15, -10.5);
    ctx.lineTo(31, -6);
    ctx.lineTo(42, 0);
    ctx.lineTo(40, 7);
    ctx.lineTo(30, 10);
    ctx.lineTo(-34, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#08111a';
    ctx.beginPath();
    ctx.moveTo(-17, -7);
    ctx.lineTo(-5, -10.2);
    ctx.lineTo(12, -9.5);
    ctx.lineTo(23, -5.5);
    ctx.lineTo(16, -2);
    ctx.lineTo(-14, -2);
    ctx.closePath();
    ctx.fill();

    strokeNeonPath(MIAMI_COLORS.magenta, () => {
      ctx.moveTo(-39, 3);
      ctx.lineTo(-31, -3.5);
      ctx.lineTo(-20, -8);
      ctx.lineTo(-4, -10.2);
      ctx.lineTo(14, -9.2);
      ctx.lineTo(30, -5.3);
      ctx.lineTo(40, 0);
    });

    // Cyan waist stripe nods to the table palette and the Testarossa side
    // strakes without adding literal grille detail at this scale.
    ctx.save();
    ctx.strokeStyle = MIAMI_COLORS.cyan;
    ctx.lineWidth = 0.9;
    ctx.globalAlpha = 0.82;
    ctx.shadowColor = MIAMI_COLORS.cyan;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 3;
    for (let offset = 0; offset < 3; offset += 1) {
      ctx.beginPath();
      ctx.moveTo(-31, 1.8 + offset * 2);
      ctx.lineTo(-12, 1.2 + offset * 1.65);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#fff0f5';
    ctx.lineWidth = 1.15;
    ctx.shadowColor = MIAMI_COLORS.magenta;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 4;
    ctx.beginPath();
    ctx.moveTo(31, -4);
    ctx.lineTo(39, -1);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  function drawMiamiExotics() {
    drawLamborghini();
    drawFerrari();
  }

  const baseDrawBallWithExotics = drawBall;
  drawBall = function drawBallWithExotics() {
    drawMiamiExotics();
    baseDrawBallWithExotics();
  };

  const buildNumberDisplay = document.querySelector('.build-number');
  if (buildNumberDisplay) {
    buildNumberDisplay.textContent = 'Build 20260830-VICECARS';
  }
})();
