// Miami Nights decorative exotics beneath the center logo.
// Visual only: no collision geometry, scoring, or gameplay behavior.

(() => {
  function drawGroundShadow(width, height) {
    ctx.save();
    const shadow = ctx.createRadialGradient(0, 3, 2, 0, 3, width * 0.55);
    shadow.addColorStop(0, 'rgba(0, 0, 0, 0.52)');
    shadow.addColorStop(0.6, 'rgba(0, 0, 0, 0.26)');
    shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.scale(1, height / width);
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(0, 3, width * 0.58, width * 0.58, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawWheel(x, y, radius = 8) {
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = '#050608';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    const rim = ctx.createRadialGradient(-1.5, -1.5, 1, 0, 0, radius * 0.65);
    rim.addColorStop(0, '#f1f3f5');
    rim.addColorStop(0.35, '#9ca6b2');
    rim.addColorStop(0.72, '#3a414b');
    rim.addColorStop(1, '#11151b');
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.62, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#d9dde2';
    ctx.lineWidth = 0.8;
    for (let spoke = 0; spoke < 5; spoke += 1) {
      const angle = spoke * Math.PI * 2 / 5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(
        Math.cos(angle) * radius * 0.48,
        Math.sin(angle) * radius * 0.48
      );
      ctx.stroke();
    }

    ctx.fillStyle = '#151a21';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLamborghini() {
    ctx.save();
    ctx.translate(150, 522);
    ctx.rotate(-0.075);

    drawGroundShadow(84, 25);
    drawWheel(-25, 13, 8.2);
    drawWheel(25, 13, 8.2);

    const body = ctx.createLinearGradient(0, -18, 0, 16);
    body.addColorStop(0, '#fff4a3');
    body.addColorStop(0.2, '#f4d13b');
    body.addColorStop(0.62, '#c99007');
    body.addColorStop(1, '#6f4600');
    ctx.fillStyle = body;
    ctx.strokeStyle = '#3f2b03';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-42, 8);
    ctx.lineTo(-36, -7);
    ctx.lineTo(-24, -15);
    ctx.lineTo(8, -17);
    ctx.lineTo(29, -11);
    ctx.lineTo(41, -2);
    ctx.lineTo(44, 7);
    ctx.lineTo(34, 12);
    ctx.lineTo(-34, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const glass = ctx.createLinearGradient(0, -14, 0, 3);
    glass.addColorStop(0, '#bfd8e5');
    glass.addColorStop(0.35, '#425d70');
    glass.addColorStop(1, '#101923');
    ctx.fillStyle = glass;
    ctx.strokeStyle = '#162330';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-20, -10);
    ctx.lineTo(-8, -15);
    ctx.lineTo(13, -14);
    ctx.lineTo(24, -8);
    ctx.lineTo(17, -1);
    ctx.lineTo(-17, -1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#161b20';
    ctx.beginPath();
    ctx.moveTo(-33, 4);
    ctx.lineTo(-21, 1);
    ctx.lineTo(-17, 8);
    ctx.lineTo(-30, 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#e8fbff';
    ctx.shadowColor = '#bff6ff';
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 4;
    ctx.beginPath();
    ctx.moveTo(31, -7);
    ctx.lineTo(41, -2);
    ctx.lineTo(37, 1);
    ctx.lineTo(28, -2);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.72)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-29, -8);
    ctx.lineTo(5, -13);
    ctx.lineTo(28, -8);
    ctx.stroke();

    ctx.strokeStyle = '#72510a';
    ctx.beginPath();
    ctx.moveTo(-34, 11);
    ctx.lineTo(34, 10);
    ctx.stroke();

    ctx.restore();
  }

  function drawFerrari() {
    ctx.save();
    ctx.translate(268, 522);
    ctx.rotate(0.065);

    drawGroundShadow(82, 25);
    drawWheel(-24, 13, 8);
    drawWheel(24, 13, 8);

    const body = ctx.createLinearGradient(0, -18, 0, 16);
    body.addColorStop(0, '#ffaaa1');
    body.addColorStop(0.18, '#ee3e32');
    body.addColorStop(0.6, '#a70d10');
    body.addColorStop(1, '#51050a');
    ctx.fillStyle = body;
    ctx.strokeStyle = '#3a070a';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-41, 7);
    ctx.bezierCurveTo(-39, -5, -30, -13, -17, -15);
    ctx.bezierCurveTo(0, -18, 17, -16, 30, -10);
    ctx.bezierCurveTo(38, -6, 43, -1, 44, 6);
    ctx.bezierCurveTo(38, 11, 29, 13, 18, 13);
    ctx.lineTo(-30, 13);
    ctx.bezierCurveTo(-36, 12, -40, 10, -41, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const glass = ctx.createLinearGradient(0, -14, 0, 3);
    glass.addColorStop(0, '#cadbe4');
    glass.addColorStop(0.4, '#4d6270');
    glass.addColorStop(1, '#141b22');
    ctx.fillStyle = glass;
    ctx.strokeStyle = '#1a222a';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-18, -10);
    ctx.quadraticCurveTo(0, -16, 18, -10);
    ctx.lineTo(22, -2);
    ctx.quadraticCurveTo(0, 1, -20, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#180709';
    ctx.beginPath();
    ctx.moveTo(-30, 3);
    ctx.quadraticCurveTo(-22, 0, -15, 2);
    ctx.lineTo(-18, 9);
    ctx.lineTo(-31, 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fff2d5';
    ctx.shadowColor = '#ffe6bb';
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 4;
    ctx.beginPath();
    ctx.moveTo(29, -7);
    ctx.quadraticCurveTo(38, -5, 42, 0);
    ctx.lineTo(35, 1);
    ctx.lineTo(27, -2);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.74)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-27, -8);
    ctx.quadraticCurveTo(1, -15, 29, -8);
    ctx.stroke();

    ctx.strokeStyle = '#4f0709';
    ctx.beginPath();
    ctx.moveTo(-31, 11);
    ctx.quadraticCurveTo(0, 13, 34, 10);
    ctx.stroke();

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
    buildNumberDisplay.textContent = 'Build 20260830-CARART';
  }
})();
