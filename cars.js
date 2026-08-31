// Miami Nights photorealistic exotic-car decals beneath the center logo.
// Visual only: no collision geometry, scoring, or gameplay behavior.

(() => {
  const countachRear = new Image();
  const ferrariFront = new Image();

  countachRear.decoding = 'async';
  ferrariFront.decoding = 'async';
  countachRear.src = 'assets/countach-rear.webp?v=20260831-topdecals';
  ferrariFront.src = 'assets/ferrari-front.webp?v=20260831-topdecals';

  function drawPhotoDecal(image, centerX, centerY, width, height) {
    if (!image.complete || !image.naturalWidth) return;

    // Intentionally no canvas shadow/glow here. These should read as artwork
    // printed into the playfield rather than objects hovering above it.
    ctx.save();
    ctx.globalAlpha = 1;
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
    // Preserve the established lower-center centers while allowing a little
    // more vertical room for the slightly top-down roof/deck perspective.
    drawPhotoDecal(countachRear, 150, 522, 92, 50);
    drawPhotoDecal(ferrariFront, 268, 522, 92, 52);
  }

  const baseDrawBallWithPhotoExotics = drawBall;
  drawBall = function drawBallWithPhotoExotics() {
    drawMiamiExotics();
    baseDrawBallWithPhotoExotics();
  };

  const buildNumberDisplay = document.querySelector('.build-number');
  if (buildNumberDisplay) {
    buildNumberDisplay.textContent = 'Build 20260831-TOPDECALS';
  }
})();
