// Miami Nights table-specific visual hooks that depend on theme.js.
// Extracted from index.html without changing draw order.

const upperWallNeons = [
  { x1: 214, y1: 38, x2: 239, y2: 38, accent: 'cyan', flashStartedAt: -Infinity },
  { x1: 248, y1: 34, x2: 274, y2: 34, accent: 'magenta', flashStartedAt: -Infinity },
  { x1: 282, y1: 34, x2: 308, y2: 34, accent: 'lavender', flashStartedAt: -Infinity },
  { x1: 316, y1: 38, x2: 342, y2: 38, accent: 'cyan', flashStartedAt: -Infinity }
];

updateUpperNeonInserts = function updateUpperWallNeons() {
  const liveBallInUpperPocket =
    !ball.ready &&
    !underpass.active &&
    !oceanRamp.active &&
    !loopRamp.active &&
    magneticTarget.state !== 'holding' &&
    ball.y <= 92 &&
    ball.x >= 198 &&
    ball.x <= 356;
  if (!liveBallInUpperPocket) return;

  const now = performance.now();
  for (const neon of upperWallNeons) {
    const centerX = (neon.x1 + neon.x2) / 2;
    if (Math.abs(ball.x - centerX) <= 24) {
      neon.flashStartedAt = now;
    }
  }
};

function drawUpperWallNeons() {
  const now = performance.now();

  for (const neon of upperWallNeons) {
    const accent = MIAMI_COLORS[neon.accent];
    const flashStrength = clamp(
      1 - (now - neon.flashStartedAt) / 420,
      0,
      1
    );

    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = MIAMI_COLORS.structure;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(neon.x1 + 4, TABLE.top + 2);
    ctx.lineTo(neon.x1 + 4, neon.y1 - 4);
    ctx.moveTo(neon.x2 - 4, TABLE.top + 2);
    ctx.lineTo(neon.x2 - 4, neon.y2 - 4);
    ctx.stroke();

    ctx.strokeStyle = '#11182a';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(neon.x1, neon.y1);
    ctx.lineTo(neon.x2, neon.y2);
    ctx.stroke();

    ctx.globalAlpha = 0.62 + flashStrength * 0.38;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.6 + flashStrength * 0.8;
    ctx.shadowColor = accent;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 :
      (6 + flashStrength * 18);
    ctx.beginPath();
    ctx.moveTo(neon.x1, neon.y1);
    ctx.lineTo(neon.x2, neon.y2);
    ctx.stroke();

    if (flashStrength > 0) {
      ctx.globalAlpha = flashStrength * 0.9;
      ctx.strokeStyle = '#f4ffff';
      ctx.lineWidth = 1;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 9;
      ctx.stroke();
    }
    ctx.restore();
  }
}

drawUpperNeonInserts = function drawNoLegacyNeonDots() {};

const baseDrawOceanRampWithUpperWallNeons = drawOceanRamp;
drawOceanRamp = function drawOceanRampWithUpperWallNeons() {
  drawUpperWallNeons();
  baseDrawOceanRampWithUpperWallNeons();
};

const baseDrawBallWithUnderpassMouths = drawBall;
drawBall = function drawBallWithUnderpassMouths() {
  drawUpperNeonInserts();
  drawCenterStandupTargets();
  drawCaptiveBallAssembly();
  drawLeftOutlaneGate();
  drawUnderpassMouths();
  baseDrawBallWithUnderpassMouths();
};
