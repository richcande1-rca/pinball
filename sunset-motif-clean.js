// Miami Nights: remove the last faint colored haze around the center sunset.
// Presentation only. Keep the actual striped sun and dark palm silhouettes,
// discard low-level colored pixels outside that motif, then let the existing
// synced sun-gradient layer animate the disk on top.

(() => {
  if (window.miamiSunsetMotifCleanInstalled) return;
  window.miamiSunsetMotifCleanInstalled = true;

  const SUN_RX = 47;
  const SUN_RY = 45;
  const PALM_RX = 73;
  const PALM_RY = 62;

  let cleanMotif = null;
  let cachedNaturalWidth = 0;
  let cachedNaturalHeight = 0;

  function buildCleanMotif() {
    if (!miamiArtwork.complete || !miamiArtwork.naturalWidth) return false;

    if (
      cleanMotif &&
      cachedNaturalWidth === miamiArtwork.naturalWidth &&
      cachedNaturalHeight === miamiArtwork.naturalHeight
    ) return true;

    const bounds = getArtworkBounds();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    const layer = document.createElement('canvas');
    layer.width = width;
    layer.height = height;
    const layerCtx = layer.getContext('2d', { willReadFrequently: true });

    layerCtx.imageSmoothingEnabled = true;
    layerCtx.imageSmoothingQuality = 'high';
    layerCtx.drawImage(miamiArtwork, 0, 0, width, height);

    const image = layerCtx.getImageData(0, 0, width, height);
    const data = image.data;
    const centerX = width / 2;
    const centerY = height / 2;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4;
        if (data[index + 3] === 0) continue;

        const sunDx = (x - centerX) / SUN_RX;
        const sunDy = (y - centerY) / SUN_RY;
        const insideSun = sunDx * sunDx + sunDy * sunDy <= 1.04;

        const palmDx = (x - centerX) / PALM_RX;
        const palmDy = (y - centerY) / PALM_RY;
        const nearPalm = palmDx * palmDx + palmDy * palmDy <= 1;

        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const brightness = (r + g + b) / 3;
        const chroma = max - min;

        // Preserve black/dark palm pixels even where fronds extend outside the
        // sun. Colored magenta/purple background pixels fail this test and vanish.
        const darkSilhouette =
          max < 66 ||
          (brightness < 108 && chroma < 44);

        if (!insideSun && !(nearPalm && darkSilhouette)) {
          data[index + 3] = 0;
        }
      }
    }

    layerCtx.putImageData(image, 0, 0);
    cleanMotif = layer;
    cachedNaturalWidth = miamiArtwork.naturalWidth;
    cachedNaturalHeight = miamiArtwork.naturalHeight;
    return true;
  }

  if (!miamiArtwork.complete) {
    miamiArtwork.addEventListener('load', buildCleanMotif, { once: true });
  } else {
    buildCleanMotif();
  }

  // sunset-field.js owns the playfield ribs. Replace only its motif paint pass;
  // the following sunset-gradient module will wrap this cleaned version.
  drawMiamiArtwork = function drawMiamiArtworkWithoutResidualHaze() {
    if (buildCleanMotif()) {
      const bounds = getArtworkBounds();
      ctx.drawImage(cleanMotif, bounds.x, bounds.y, bounds.width, bounds.height);
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 5;
    ctx.font = 'italic 24px system-ui, sans-serif';
    ctx.fillStyle = MIAMI_COLORS.magenta;
    ctx.shadowColor = MIAMI_COLORS.magenta;
    ctx.fillText('MIAMI', PLAYFIELD_CENTER, 458);
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillStyle = MIAMI_COLORS.cyan;
    ctx.shadowColor = MIAMI_COLORS.cyan;
    ctx.fillText('N I G H T S', PLAYFIELD_CENTER, 478);
    ctx.restore();
  };
})();
