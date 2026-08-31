// Miami Nights photorealistic exotic-car toys beneath the center logo.
// Visual only: no collision geometry, scoring, or gameplay behavior.

(() => {
  const countachRear = new Image();
  const ferrariFront = new Image();

  countachRear.decoding = 'async';
  ferrariFront.decoding = 'async';
  countachRear.src = 'assets/countach-rear-3q.webp?v=20260831-3qpolish';
  ferrariFront.src = 'assets/ferrari-front-3q.webp?v=20260831-3qpolish';

  // These silhouette paths trim only the leftover oval/matte around the
  // generated car artwork. They do not alter the image itself.
  const countachSilhouette = {
    sourceWidth: 395,
    sourceHeight: 225,
    points: [
      [20, 104], [21, 126], [62, 143], [71, 139], [115, 140],
      [164, 147], [180, 146], [205, 176], [258, 171], [270, 165],
      [285, 176], [288, 196], [292, 199], [314, 199], [316, 191],
      [327, 191], [328, 170], [348, 148], [347, 116], [360, 65],
      [357, 57], [347, 48], [316, 67], [304, 68], [284, 38],
      [296, 25], [290, 17], [282, 14], [282, 6], [156, 6],
      [154, 9], [147, 7], [143, 14], [148, 17], [178, 17],
      [185, 21], [141, 41], [118, 43], [96, 50], [46, 82]
    ]
  };

  const ferrariSilhouette = {
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
    cyanWeight
  ) {
    if (!image.complete || !image.naturalWidth) return;

    drawGrounding(centerX, centerY, width, height, rotation, cyanWeight);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
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

    // A faint upper-body sheen gives the clipped image a molded/toy-like
    // surface while keeping the original car render intact.
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
    // Keep the approved cars, stagger, scale and 3/4 poses. The grounding,
    // reflected neon and sheen make them read as mounted physical toys.
    drawPhotoToy(
      countachRear,
      150,
      550,
      98,
      56,
      -0.035,
      'saturate(0.86) contrast(0.97) brightness(1.01)',
      countachSilhouette,
      false
    );
    drawPhotoToy(
      ferrariFront,
      268,
      534,
      98,
      61,
      0.025,
      'saturate(0.84) contrast(0.95) brightness(1.06)',
      ferrariSilhouette,
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
    buildNumberDisplay.textContent = 'Build 20260831-CARMOUNT';
  }
})();
