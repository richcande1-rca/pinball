// Miami Nights visual layer only. No gameplay or collision logic lives here.

const miamiArtwork = new Image();
miamiArtwork.src =
  'assets/miami-sunset-clean.png?v=20260823-1530';

function drawMiamiArtwork() {
  if (miamiArtwork.complete && miamiArtwork.naturalWidth) {
    const artworkWidth = 220;
    const artworkHeight =
      artworkWidth *
      miamiArtwork.naturalHeight /
      miamiArtwork.naturalWidth;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      miamiArtwork,
      Math.round(PLAYFIELD_CENTER - artworkWidth / 2),
      Math.round(350 - artworkHeight / 2),
      artworkWidth,
      artworkHeight
    );

    ctx.restore();
  }

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
