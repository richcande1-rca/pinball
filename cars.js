// Miami Nights photorealistic exotic-car toys beneath the center logo.
// Visual only: no collision geometry, scoring, or gameplay behavior.

(() => {
  const whiteFront = new Image();
  const nightFront = new Image();

  whiteFront.decoding = 'async';
  nightFront.decoding = 'async';

  // Restore the known-good white-car artwork and keep the cleaned Ferrari.
  // Do not apply any rectangular compositing overlays to either asset.
  whiteFront.src = 'assets/countach-front-white.svg?v=20260901-carfix';
  nightFront.src = 'assets/ferrari-front-clean-edgefix.webp?v=20260901-carfix';

  function drawGrounding(centerX, centerY, width, height, rotation, cyanWeight) {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);

    // Lightweight contact shadow only. No per-frame blur filters.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(0, height * 0.25, width * 0.44, height * 0.20, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = cyanWeight
      ? 'rgba(32, 225, 255, 0.075)'
      : 'rgba(255, 39, 154, 0.065)';
    ctx.beginPath();
    ctx.ellipse(0, height * 0.22, width * 0.39, height * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawPhotoToy(
    image,
    centerX,
    centerY,
    width,
    height,
    rotation,
    filter,
    cyanWeight
  ) {
    if (!image.complete || !image.naturalWidth) return;

    drawGrounding(centerX, centerY, width, height, rotation, cyanWeight);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    ctx.globalAlpha = 0.97;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.filter = filter;
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  function drawMiamiExotics() {
    // Preserve the approved positions, scale, stagger and forward 3/4 stance.
    drawPhotoToy(
      whiteFront,
      150,
      550,
      96,
      70,
      -0.03,
      'saturate(0.92) contrast(0.98) brightness(1.02)',
      false
    );
    drawPhotoToy(
      nightFront,
      268,
      534,
      104,
      58,
      0.015,
      'saturate(0.92) contrast(1.04) brightness(1.10)',
      true
    );
  }

  const baseDrawBallWithPhotoExotics = drawBall;
  drawBall = function drawBallWithPhotoExotics() {
    drawMiamiExotics();
    baseDrawBallWithPhotoExotics();
  };

  const buildNumberDisplay = document.querySelector('.build-number');
  if (buildNumberDisplay) {
    buildNumberDisplay.textContent = 'Build 20260901-PASSFIX';
  }
})();
