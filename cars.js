// Miami Nights photorealistic exotic-car decals beneath the center logo.
// Visual only: no collision geometry, scoring, or gameplay behavior.

(() => {
  const countachRear = new Image();
  const ferrariFront = new Image();

  countachRear.decoding = 'async';
  ferrariFront.decoding = 'async';
  countachRear.src = 'assets/countach-rear-3q.webp?v=20260831-3qpolish';
  ferrariFront.src = 'assets/ferrari-front-3q.webp?v=20260831-3qpolish';

  function drawPhotoDecal(image, centerX, centerY, width, height, rotation, filter) {
    if (!image.complete || !image.naturalWidth) return;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    ctx.globalAlpha = 0.98;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.filter = filter;
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  function drawMiamiExotics() {
    // Keep the established three-quarter art, but place both cars deeper into
    // the open lower playfield and soften the grading so they read more like
    // photographic artwork under clearcoat than high-contrast pasted sprites.
    drawPhotoDecal(
      countachRear,
      150,
      542,
      98,
      56,
      -0.035,
      'saturate(0.86) contrast(0.95) brightness(1.01)'
    );
    drawPhotoDecal(
      ferrariFront,
      268,
      542,
      98,
      61,
      0.025,
      'saturate(0.82) contrast(0.92) brightness(1.08)'
    );
  }

  const baseDrawBallWithPhotoExotics = drawBall;
  drawBall = function drawBallWithPhotoExotics() {
    drawMiamiExotics();
    baseDrawBallWithPhotoExotics();
  };

  const buildNumberDisplay = document.querySelector('.build-number');
  if (buildNumberDisplay) {
    buildNumberDisplay.textContent = 'Build 20260831-CARBLEND';
  }
})();
