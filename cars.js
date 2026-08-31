// Miami Nights photorealistic exotic-car decals beneath the center logo.
// Visual only: no collision geometry, scoring, or gameplay behavior.

(() => {
  const countachRear = new Image();
  const ferrariFront = new Image();

  countachRear.decoding = 'async';
  ferrariFront.decoding = 'async';
  countachRear.src = 'assets/countach-rear-3q.webp?v=20260831-3qpolish';
  ferrariFront.src = 'assets/ferrari-front-3q.webp?v=20260831-3qpolish';

  function drawPhotoDecal(image, centerX, centerY, width, height, rotation) {
    if (!image.complete || !image.naturalWidth) return;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    ctx.globalAlpha = 0.99;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  function drawMiamiExotics() {
    // Keep the established lower-center placement, but settle the cars at a
    // subtle opposing three-quarter angle so they read like polished printed
    // playfield artwork rather than perfectly horizontal pasted sprites.
    drawPhotoDecal(countachRear, 150, 522, 98, 56, -0.035);
    drawPhotoDecal(ferrariFront, 268, 522, 98, 61, 0.025);
  }

  const baseDrawBallWithPhotoExotics = drawBall;
  drawBall = function drawBallWithPhotoExotics() {
    drawMiamiExotics();
    baseDrawBallWithPhotoExotics();
  };

  const buildNumberDisplay = document.querySelector('.build-number');
  if (buildNumberDisplay) {
    buildNumberDisplay.textContent = 'Build 20260831-3QPOLISH';
  }
})();
