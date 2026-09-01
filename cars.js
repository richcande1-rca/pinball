// Miami Nights photorealistic exotic-car toys beneath the center logo.
// Visual only: no collision geometry, scoring, or gameplay behavior.

(() => {
  const whiteFront = new Image();
  const nightFront = new Image();

  whiteFront.decoding = 'async';
  nightFront.decoding = 'async';
  whiteFront.src = 'assets/countach-front-white.svg?v=20260831-caralpha2';
  nightFront.src = 'assets/ferrari-front-transparent.webp?v=20260831-caralpha2';

  function drawGrounding(centerX, centerY, width, height, rotation, cyanWeight) {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);

    // Cheap layered ellipses make the cars sit on the glass without using
    // per-frame blur filters (important for the mobile build).
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

    // Keep the neon reflection and molded sheen inside the image alpha only.
    // This avoids rectangular overlays and removes the need for runtime masks.
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = 0.10;
    const neonReflection = ctx.createLinearGradient(-width / 2, 0, width / 2, 0);
    neonReflection.addColorStop(0, cyanWeight ? '#20e1ff' : '#ff279a');
    neonReflection.addColorStop(0.48, 'rgba(255,255,255,0)');
    neonReflection.addColorStop(1, cyanWeight ? '#ff279a' : '#20e1ff');
    ctx.fillStyle = neonReflection;
    ctx.fillRect(-width / 2, -height / 2, width, height);

    ctx.globalAlpha = 0.06;
    const sheen = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
    sheen.addColorStop(0, 'rgba(255,255,255,0.9)');
    sheen.addColorStop(0.42, 'rgba(255,255,255,0.05)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(-width / 2, -height / 2, width, height);

    ctx.restore();
  }

  function drawMiamiExotics() {
    // Both cars use real transparent-background assets. Preserve the approved
    // stagger, forward-facing 3/4 stance, scale and mounted-toy treatment.
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
      98,
      61,
      0.025,
      'saturate(0.84) contrast(0.95) brightness(1.06)',
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
    buildNumberDisplay.textContent = 'Build 20260831-CARALPHA2';
  }
})();
