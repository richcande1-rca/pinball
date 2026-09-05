// Miami Nights: integrate the central palm/sunset art into the playfield.
// Visual only: extend the purple horizon stripes across the full table with a
// soft vertical + horizontal fade, and feather away the old flag-shaped edge.
// No physics changes.

(() => {
  if (window.miamiSunsetFieldInstalled) return;
  window.miamiSunsetFieldInstalled = true;

  const STRIPE_CENTER_Y = 350;
  const STRIPE_SPACING = 13;
  const stripeOffsets = [];

  // Preserve the exact spacing/phase of the original center ribs, then carry
  // that same pattern through the entire playable table.
  for (let offset = 5; STRIPE_CENTER_Y + offset <= TABLE.bottom; offset += STRIPE_SPACING) {
    stripeOffsets.push(offset);
  }
  for (let offset = 5 - STRIPE_SPACING; STRIPE_CENTER_Y + offset >= TABLE.top; offset -= STRIPE_SPACING) {
    stripeOffsets.push(offset);
  }
  stripeOffsets.sort((a, b) => a - b);

  // The stripe field is completely static. Paint it once, then use one cheap
  // drawImage call per frame instead of rebuilding gradients every render.
  const stripeLayer = document.createElement('canvas');
  stripeLayer.width = canvas.width;
  stripeLayer.height = canvas.height;
  const stripeCtx = stripeLayer.getContext('2d');

  function buildStripeLayer() {
    stripeCtx.clearRect(0, 0, stripeLayer.width, stripeLayer.height);

    const verticalFadeDistance = Math.max(
      STRIPE_CENTER_Y - TABLE.top,
      TABLE.bottom - STRIPE_CENTER_Y
    );

    for (const offset of stripeOffsets) {
      const y = STRIPE_CENTER_Y + offset;
      const normalizedDistance = Math.min(
        1,
        Math.abs(offset) / Math.max(1, verticalFadeDistance)
      );
      const centerStrength = Math.pow(1 - normalizedDistance, 1.35);
      const bandAlpha = 0.035 + centerStrength * 0.545;
      const phaseIndex = Math.round((offset + 60) / STRIPE_SPACING);
      const bandHeight = Math.abs(phaseIndex) % 2 === 0 ? 4 : 3;

      const fade = stripeCtx.createLinearGradient(TABLE.left, 0, TABLE.right, 0);
      fade.addColorStop(0, 'rgba(126, 82, 207, 0)');
      fade.addColorStop(0.08, `rgba(126, 82, 207, ${bandAlpha * 0.18})`);
      fade.addColorStop(0.24, `rgba(126, 82, 207, ${bandAlpha * 0.55})`);
      fade.addColorStop(0.42, `rgba(142, 89, 226, ${bandAlpha * 0.92})`);
      fade.addColorStop(0.50, `rgba(151, 94, 235, ${bandAlpha})`);
      fade.addColorStop(0.58, `rgba(142, 89, 226, ${bandAlpha * 0.92})`);
      fade.addColorStop(0.76, `rgba(126, 82, 207, ${bandAlpha * 0.55})`);
      fade.addColorStop(0.92, `rgba(126, 82, 207, ${bandAlpha * 0.18})`);
      fade.addColorStop(1, 'rgba(126, 82, 207, 0)');

      stripeCtx.fillStyle = fade;
      stripeCtx.fillRect(
        TABLE.left,
        y - bandHeight / 2,
        TABLE.right - TABLE.left,
        bandHeight
      );
    }
  }

  buildStripeLayer();

  let motifLayer = null;
  let motifNaturalWidth = 0;
  let motifNaturalHeight = 0;

  function buildMotifLayer() {
    if (!miamiArtwork.complete || !miamiArtwork.naturalWidth) return false;

    if (
      motifLayer &&
      motifNaturalWidth === miamiArtwork.naturalWidth &&
      motifNaturalHeight === miamiArtwork.naturalHeight
    ) return true;

    const bounds = getArtworkBounds();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    const layer = document.createElement('canvas');
    layer.width = width;
    layer.height = height;
    const layerCtx = layer.getContext('2d');

    layerCtx.imageSmoothingEnabled = true;
    layerCtx.imageSmoothingQuality = 'high';
    layerCtx.drawImage(miamiArtwork, 0, 0, width, height);

    // Feather the old rectangular/flag boundary away instead of replacing it
    // with another hard crop. The palms and sunset remain strongest at center.
    layerCtx.globalCompositeOperation = 'destination-in';

    const horizontalFade = layerCtx.createLinearGradient(0, 0, width, 0);
    horizontalFade.addColorStop(0, 'rgba(255,255,255,0)');
    horizontalFade.addColorStop(0.08, 'rgba(255,255,255,0)');
    horizontalFade.addColorStop(0.18, 'rgba(255,255,255,0.55)');
    horizontalFade.addColorStop(0.28, 'rgba(255,255,255,1)');
    horizontalFade.addColorStop(0.72, 'rgba(255,255,255,1)');
    horizontalFade.addColorStop(0.82, 'rgba(255,255,255,0.55)');
    horizontalFade.addColorStop(0.92, 'rgba(255,255,255,0)');
    horizontalFade.addColorStop(1, 'rgba(255,255,255,0)');
    layerCtx.fillStyle = horizontalFade;
    layerCtx.fillRect(0, 0, width, height);

    const verticalFade = layerCtx.createLinearGradient(0, 0, 0, height);
    verticalFade.addColorStop(0, 'rgba(255,255,255,0)');
    verticalFade.addColorStop(0.10, 'rgba(255,255,255,0.18)');
    verticalFade.addColorStop(0.20, 'rgba(255,255,255,0.9)');
    verticalFade.addColorStop(0.27, 'rgba(255,255,255,1)');
    verticalFade.addColorStop(0.73, 'rgba(255,255,255,1)');
    verticalFade.addColorStop(0.82, 'rgba(255,255,255,0.88)');
    verticalFade.addColorStop(0.92, 'rgba(255,255,255,0.16)');
    verticalFade.addColorStop(1, 'rgba(255,255,255,0)');
    layerCtx.fillStyle = verticalFade;
    layerCtx.fillRect(0, 0, width, height);
    layerCtx.globalCompositeOperation = 'source-over';

    motifLayer = layer;
    motifNaturalWidth = miamiArtwork.naturalWidth;
    motifNaturalHeight = miamiArtwork.naturalHeight;
    return true;
  }

  if (!miamiArtwork.complete) {
    miamiArtwork.addEventListener('load', buildMotifLayer, { once: true });
  } else {
    buildMotifLayer();
  }

  const baseDrawTableWithSunsetField = drawTable;
  drawTable = function drawTableWithSunsetField() {
    baseDrawTableWithSunsetField();
    ctx.drawImage(stripeLayer, 0, 0);
  };

  // Replace only the artwork paint pass. All text, glow, lamp-ring logic and
  // playfield geometry continue to use their existing layers.
  drawMiamiArtwork = function drawMiamiArtworkWithFeatheredSunset() {
    if (buildMotifLayer()) {
      const bounds = getArtworkBounds();
      ctx.drawImage(motifLayer, bounds.x, bounds.y, bounds.width, bounds.height);
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
