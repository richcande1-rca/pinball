// Miami Nights decorative exotics beneath the center logo.
// Visual only: no collision geometry, scoring, or gameplay behavior.

(() => {
  function drawWheel(x, y) {
    ctx.save();
    ctx.fillStyle = '#02040a';
    ctx.strokeStyle = '#39445d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x - 4, y - 7, 8, 14, 3);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawLambo() {
    ctx.save();
    ctx.translate(164, 518);
    ctx.rotate(-0.10);

    drawWheel(-15, -18);
    drawWheel(15, -18);
    drawWheel(-15, 18);
    drawWheel(15, 18);

    ctx.fillStyle = '#07131d';
    ctx.strokeStyle = MIAMI_COLORS.cyan;
    ctx.lineWidth = 2;
    ctx.shadowColor = MIAMI_COLORS.cyan;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 8;
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(13, -22);
    ctx.lineTo(17, -7);
    ctx.lineTo(15, 21);
    ctx.lineTo(8, 29);
    ctx.lineTo(-8, 29);
    ctx.lineTo(-15, 21);
    ctx.lineTo(-17, -7);
    ctx.lineTo(-13, -22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#111b2b';
    ctx.strokeStyle = '#f4ffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-9, -10);
    ctx.lineTo(9, -10);
    ctx.lineTo(11, 7);
    ctx.lineTo(-11, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = MIAMI_COLORS.lavender;
    ctx.beginPath();
    ctx.moveTo(-10, -19);
    ctx.lineTo(0, -25);
    ctx.lineTo(10, -19);
    ctx.moveTo(-11, 17);
    ctx.lineTo(11, 17);
    ctx.stroke();

    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '700 6px ui-monospace, monospace';
    ctx.fillStyle = MIAMI_COLORS.cyan;
    ctx.shadowColor = MIAMI_COLORS.cyan;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 4;
    ctx.fillText('LAMBO', 164, 551);
    ctx.restore();
  }

  function drawFerrari() {
    ctx.save();
    ctx.translate(257, 518);
    ctx.rotate(0.10);

    drawWheel(-15, -18);
    drawWheel(15, -18);
    drawWheel(-15, 18);
    drawWheel(15, 18);

    ctx.fillStyle = '#180710';
    ctx.strokeStyle = MIAMI_COLORS.magenta;
    ctx.lineWidth = 2;
    ctx.shadowColor = MIAMI_COLORS.magenta;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 8;
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.bezierCurveTo(11, -27, 16, -19, 17, -7);
    ctx.lineTo(15, 19);
    ctx.bezierCurveTo(12, 27, 7, 30, 0, 30);
    ctx.bezierCurveTo(-7, 30, -12, 27, -15, 19);
    ctx.lineTo(-17, -7);
    ctx.bezierCurveTo(-16, -19, -11, -27, 0, -30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#211323';
    ctx.strokeStyle = '#f4ffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-9, -8);
    ctx.quadraticCurveTo(0, -15, 9, -8);
    ctx.lineTo(10, 8);
    ctx.quadraticCurveTo(0, 12, -10, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = MIAMI_COLORS.lavender;
    ctx.beginPath();
    ctx.moveTo(-8, -21);
    ctx.quadraticCurveTo(0, -26, 8, -21);
    ctx.moveTo(-10, 18);
    ctx.quadraticCurveTo(0, 22, 10, 18);
    ctx.stroke();

    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '700 6px ui-monospace, monospace';
    ctx.fillStyle = MIAMI_COLORS.magenta;
    ctx.shadowColor = MIAMI_COLORS.magenta;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 4;
    ctx.fillText('FERRARI', 257, 551);
    ctx.restore();
  }

  function drawMiamiExotics() {
    drawLambo();
    drawFerrari();
  }

  const baseDrawBallWithExotics = drawBall;
  drawBall = function drawBallWithExotics() {
    drawMiamiExotics();
    baseDrawBallWithExotics();
  };

  const buildNumberDisplay = document.querySelector('.build-number');
  if (buildNumberDisplay) {
    buildNumberDisplay.textContent = 'Build 20260830-CARS';
  }
})();
