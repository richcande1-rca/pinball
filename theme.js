// Miami Nights visual layer only. No gameplay or collision logic lives here.

function drawMiamiArtwork() {
  const sunX = PLAYFIELD_CENTER;
  const sunY = 350;
  const sunRadius = 58;

  ctx.save();
  ctx.globalAlpha = 0.52;

  const sunset = ctx.createLinearGradient(0, sunY - sunRadius, 0, sunY + sunRadius);
  sunset.addColorStop(0, MIAMI_COLORS.magenta);
  sunset.addColorStop(0.42, '#ff5f91');
  sunset.addColorStop(0.62, '#ff8a5b');
  sunset.addColorStop(1, MIAMI_COLORS.lavender);
  ctx.fillStyle = sunset;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalAlpha = 0.72;
  ctx.fillStyle = '#050916';
  for (let y = sunY + 3; y <= sunY + 48; y += 10) {
    ctx.fillRect(sunX - sunRadius - 2, y, sunRadius * 2 + 4, 5);
  }
  ctx.restore();

  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#030712';
  ctx.strokeStyle = '#030712';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  function drawPalm(crownX, crownY, baseX, direction) {
    ctx.beginPath();
    ctx.moveTo(baseX - 3, sunY + 55);
    ctx.bezierCurveTo(baseX, sunY + 28, crownX - direction * 4, crownY + 13, crownX - 1, crownY);
    ctx.lineTo(crownX + 2, crownY);
    ctx.bezierCurveTo(crownX + direction * 2, crownY + 16, baseX + 4, sunY + 29, baseX + 3, sunY + 55);
    ctx.closePath();
    ctx.fill();

    const fronds = [
      [-direction * 43, 14, -direction * 17, -2, -direction * 32, 5],
      [-direction * 38, -9, -direction * 15, -13, -direction * 29, -14],
      [-direction * 22, -29, -direction * 8, -17, -direction * 16, -27],
      [direction * 8, -31, direction * 2, -17, direction * 6, -27],
      [direction * 27, -18, direction * 10, -14, direction * 20, -22],
      [direction * 34, 4, direction * 14, -4, direction * 27, -2]
    ];

    ctx.lineWidth = 2.8;
    for (const [endX, endY, control1X, control1Y, control2X, control2Y] of fronds) {
      ctx.beginPath();
      ctx.moveTo(crownX, crownY);
      ctx.bezierCurveTo(
        crownX + control1X,
        crownY + control1Y,
        crownX + control2X,
        crownY + control2Y,
        crownX + endX,
        crownY + endY
      );
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(crownX, crownY, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPalm(sunX - 53, sunY - 24, sunX - 73, 1);
  drawPalm(sunX + 53, sunY - 24, sunX + 73, -1);
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.shadowBlur = 5;
  ctx.font = 'italic 24px system-ui, sans-serif';
  ctx.fillStyle = MIAMI_COLORS.magenta;
  ctx.shadowColor = MIAMI_COLORS.magenta;
  ctx.fillText('MIAMI', PLAYFIELD_CENTER, 458);
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillStyle = MIAMI_COLORS.cyan;
  ctx.shadowColor = MIAMI_COLORS.cyan;
  ctx.fillText('N I G H T S', PLAYFIELD_CENTER, 478);
  ctx.restore();
}

function drawDecorativeDisplays() {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 10, 25, 0.84)';
  ctx.strokeStyle = 'rgba(34, 223, 243, 0.58)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(166, 154, 88, 38, 6);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = '9px ui-monospace, monospace';
  ctx.fillStyle = 'rgba(201, 184, 255, 0.72)';
  ctx.fillText('SCORE', PLAYFIELD_CENTER, 167);
  ctx.font = '16px ui-monospace, monospace';
  ctx.fillStyle = MIAMI_COLORS.magenta;
  ctx.shadowColor = MIAMI_COLORS.magenta;
  ctx.shadowBlur = 4;
  ctx.fillText('000000', PLAYFIELD_CENTER, 185);
  ctx.restore();

  const inserts = [
    { x: 104, y: 468, color: MIAMI_COLORS.cyan },
    { x: 316, y: 468, color: MIAMI_COLORS.magenta },
    { x: 210, y: 520, color: MIAMI_COLORS.lavender }
  ];

  for (const insert of inserts) {
    ctx.save();
    ctx.strokeStyle = insert.color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = insert.color;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(insert.x, insert.y, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(7, 11, 24, 0.8)';
    ctx.fill();
    ctx.restore();
  }
}

drawTable = function drawMiamiTable() {
  const playfieldGradient = ctx.createLinearGradient(0, TABLE.top, 0, TABLE.bottom);
  playfieldGradient.addColorStop(0, '#090d20');
  playfieldGradient.addColorStop(0.55, MIAMI_COLORS.playfield);
  playfieldGradient.addColorStop(1, '#040711');
  ctx.fillStyle = playfieldGradient;
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

  ctx.fillStyle = 'rgba(2, 5, 14, 0.72)';
  ctx.beginPath();
  ctx.moveTo(TABLE.left, TABLE.top);
  ctx.lineTo(42, 48);
  ctx.lineTo(42, 650);
  ctx.lineTo(TABLE.left, TABLE.bottom);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(TABLE.right, TABLE.top);
  ctx.lineTo(438, 48);
  ctx.lineTo(438, 650);
  ctx.lineTo(TABLE.right, TABLE.bottom);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.strokeStyle = 'rgba(201, 184, 255, 0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(42, 48);
  ctx.lineTo(42, 650);
  ctx.moveTo(438, 48);
  ctx.lineTo(438, 650);
  ctx.stroke();
  ctx.restore();
};

drawLowerApron = function drawMiamiLowerApron() {
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

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '600 8px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(201, 184, 255, 0.72)';
  ctx.fillText('MIAMI', 108, 687);
  ctx.fillText('NIGHTS', 312, 687);
  ctx.restore();
};

draw = function drawMiamiNightsFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTable();
  drawMiamiArtwork();
  drawDecorativeDisplays();
  drawShooterLane();
  drawPassivePlayfieldGeometry();
  drawPlunger();
  drawSideBumpers();
  drawLowerGuides();
  drawLowerApron();
  drawFlippers();
  drawBall();
};
