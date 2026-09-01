// Miami Nights photorealistic exotic-car toys beneath the center logo.
// Visual only: no collision geometry, scoring, or gameplay behavior.

(() => {
  const whiteFront = new Image();
  const nightFront = new Image();

  whiteFront.decoding = 'async';
  nightFront.decoding = 'async';
  whiteFront.src = 'assets/countach-front-white.svg?v=20260831-caralpha';
  nightFront.src = 'assets/ferrari-front-3q.webp?v=20260831-caralpha';

  // Both source images are clipped tightly to their car silhouettes so the
  // playfield shows through around them instead of revealing image rectangles.
  const whiteSilhouette = {
    sourceWidth: 220,
    sourceHeight: 161,
    points: [
      [210, 19], [130, 13], [121, 19], [135, 19], [132, 25],
      [117, 25], [98, 30], [64, 55], [62, 49], [53, 48],
      [52, 54], [58, 57], [36, 67], [13, 96], [8, 107],
      [11, 117], [9, 125], [116, 145], [142, 137], [158, 138],
      [168, 127], [172, 110], [189, 95], [204, 96], [210, 91],
      [214, 56], [211, 39], [207, 35], [190, 29], [192, 22],
      [205, 26]
    ]
  };

  const frontSilhouette = {
    sourceWidth: 390,
    sourceHeight: 245,
    points: [
      [16, 72], [18, 126], [28, 157], [28, 176], [72, 204],
      [115, 211], [130, 221], [141, 214], [164, 219], [228, 220],
      [336, 208], [340, 203], [347, 202], [353, 197], [353, 192],
      [359, 187], [359, 180], [369, 176], [366, 172], [370, 167],
      [374, 172], [375, 165], [370, 155], [371, 138], [363, 131],
      [348, 88], [299, 47], [292, 45], [285, 38], [273, 37],
      [257, 30], [247, 22], [124, 15], [89, 18], [70, 38],
      [67, 36], [56, 46], [51, 45], [51, 54], [41, 47],
      [33, 51], [35, 61]
    ]
  };

  function traceSilhouette(silhouette, width, height) {
    const { sourceWidth, sourceHeight, points } = silhouette;
    ctx.beginPath();
    for (let index = 0; index < points.length; index += 1) {
      const [sourceX, sourceY] = points[index];
      const x = (sourceX / sourceWidth - 0.5) * width;
      const y = (sourceY / sourceHeight - 0.5) * height;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function clipToSilhouette(silhouette, width, height) {
    traceSilhouette(silhouette, width, height);
    ctx.clip();
  }

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
    silhouette,
    cyanWeight,
    mirrorX = false
  ) {
    if (!image.complete || !image.naturalWidth) return;

    drawGrounding(centerX, centerY, width, height, rotation, cyanWeight);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    if (mirrorX) ctx.scale(-1, 1);
    clipToSilhouette(silhouette, width, height);

    ctx.globalAlpha = 0.97;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.filter = filter;
    ctx.drawImage(image, -width / 2, -height / 2, width, height);

    // Very restrained reflected table light makes the artwork share the
    // cyan/magenta environment instead of reading like a pasted-on decal.
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.11;
    const neonReflection = ctx.createLinearGradient(-width / 2, 0, width / 2, 0);
    neonReflection.addColorStop(0, cyanWeight ? '#20e1ff' : '#ff279a');
    neonReflection.addColorStop(0.48, 'rgba(255,255,255,0)');
    neonReflection.addColorStop(1, cyanWeight ? '#ff279a' : '#20e1ff');
    ctx.fillStyle = neonReflection;
    ctx.fillRect(-width / 2, -height / 2, width, height);

    // A faint upper-body sheen gives the image a molded/toy-like surface.
    ctx.globalAlpha = 0.07;
    const sheen = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
    sheen.addColorStop(0, 'rgba(255,255,255,0.9)');
    sheen.addColorStop(0.42, 'rgba(255,255,255,0.05)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(-width / 2, -height / 2, width, height);

    ctx.restore();
  }

  function drawMiamiExotics() {
    // Dedicated white front-facing exotic on the left; dark front-facing
    // exotic on the right. Preserve the approved stagger and toy treatment.
    drawPhotoToy(
      whiteFront,
      150,
      550,
      96,
      70,
      -0.03,
      'saturate(0.92) contrast(0.98) brightness(1.02)',
      whiteSilhouette,
      false,
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
      frontSilhouette,
      true,
      false
    );
  }

  const baseDrawBallWithPhotoExotics = drawBall;
  drawBall = function drawBallWithPhotoExotics() {
    drawMiamiExotics();
    baseDrawBallWithPhotoExotics();
  };

  const buildNumberDisplay = document.querySelector('.build-number');
  if (buildNumberDisplay) {
    buildNumberDisplay.textContent = 'Build 20260831-CARALPHA';
  }
})();
