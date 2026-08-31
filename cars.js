// Miami Nights photorealistic exotic-car decals beneath the center logo.
// Visual only: no collision geometry, scoring, or gameplay behavior.

(() => {
  const countachRear = new Image();
  const ferrariFront = new Image();

  countachRear.decoding = 'async';
  ferrariFront.decoding = 'async';
  countachRear.src = 'assets/countach-rear.webp?v=20260830-photocars';
  ferrariFront.src = 'assets/ferrari-front.webp?v=20260830-photocars';

  function drawPhotoDecal(image, centerX, centerY, width, height, glow) {
    if (!image.complete || !image.naturalWidth) return;

    ctx.save();
    ctx.globalAlpha = 0.98;
    if (!window.miamiMobilePerformanceMode) {
      ctx.shadowColor = glow;
      ctx.shadowBlur = 5;
    }
    ctx.drawImage(
      image,
      centerX - width / 2,
      centerY - height / 2,
      width,
      height
    );
    ctx.restore();
  }

  function drawMiamiExotics() {
    // Keep the established lower-center placement, but make the two cars read
    // in opposite directions: white Countach rear, black Ferrari front.
    drawPhotoDecal(
      countachRear,
      150,
      522,
      92,
      44,
      'rgba(255, 80, 190, 0.42)'
    );
    drawPhotoDecal(
      ferrariFront,
      268,
      522,
      92,
      46,
      'rgba(40, 225, 255, 0.38)'
    );
  }

  const baseDrawBallWithPhotoExotics = drawBall;
  drawBall = function drawBallWithPhotoExotics() {
    drawMiamiExotics();
    baseDrawBallWithPhotoExotics();
  };

  const buildNumberDisplay = document.querySelector('.build-number');
  if (buildNumberDisplay) {
    buildNumberDisplay.textContent = 'Build 20260830-PHOTOCARS';
  }
})();
