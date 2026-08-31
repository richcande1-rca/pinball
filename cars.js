// Miami Nights photorealistic exotic-car decals beneath the center logo.
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

  function clipToSilhouette(silhouette, width, height) {
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
    ctx.clip();
  }

  function drawPhotoDecal(
    image,
    centerX,
    centerY,
    width,
    height,
    rotation,
    filter,
    silhouette
  ) {
    if (!image.complete || !image.naturalWidth) return;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    clipToSilhouette(silhouette, width, height);
    ctx.globalAlpha = 0.98;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.filter = filter;
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  function drawMiamiExotics() {
    // Preserve the current stagger, scale, rotation and color treatment.
    // Only the unwanted image matte is clipped away.
    drawPhotoDecal(
      countachRear,
      150,
      550,
      98,
      56,
      -0.035,
      'saturate(0.86) contrast(0.95) brightness(1.01)',
      countachSilhouette
    );
    drawPhotoDecal(
      ferrariFront,
      268,
      534,
      98,
      61,
      0.025,
      'saturate(0.82) contrast(0.92) brightness(1.08)',
      ferrariSilhouette
    );
  }

  const baseDrawBallWithPhotoExotics = drawBall;
  drawBall = function drawBallWithPhotoExotics() {
    drawMiamiExotics();
    baseDrawBallWithPhotoExotics();
  };

  const buildNumberDisplay = document.querySelector('.build-number');
  if (buildNumberDisplay) {
    buildNumberDisplay.textContent = 'Build 20260831-CARCLIP';
  }
})();
