// Miami Nights: animate only the striped sunset disk behind the palm silhouettes.
// Presentation only. No outside halo/frame: the sun's internal gradients move
// and flash in step with the twelve insert lamps around the motif.

(() => {
  if (window.miamiSunsetGradientGlowInstalled) return;
  window.miamiSunsetGradientGlowInstalled = true;

  const SUN_X = 210;
  const SUN_Y = 350;
  const SUN_RX = 45;
  const SUN_RY = 43;
  const PAD = 3;
  const LAMP_COUNT = 12;
  const palette = {
    cyan: MIAMI_COLORS.cyan,
    magenta: MIAMI_COLORS.magenta,
    lavender: MIAMI_COLORS.lavender,
    white: '#f4ffff',
    orange: '#ffb62e',
    yellow: '#ffe15a'
  };

  let sunMask = null;
  let sunPaint = null;
  let maskNaturalWidth = 0;
  let maskNaturalHeight = 0;
  let override = {
    kind: 'none',
    startedAt: -Infinity,
    until: -Infinity,
    origin: 0
  };

  // The old theme layer painted a large magenta/purple radial bloom around the
  // entire motif. Disable it here so all animation is confined to the sun disk.
  if (typeof drawSunsetGlow === 'function') {
    drawSunsetGlow = function drawSunsetGlowDisabled() {};
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function wrapIndex(index) {
    return ((index % LAMP_COUNT) + LAMP_COUNT) % LAMP_COUNT;
  }

  function trigger(kind, duration, origin = 0) {
    const now = performance.now();
    override = {
      kind,
      startedAt: now,
      until: now + duration,
      origin: wrapIndex(origin)
    };
  }

  function mode2xActive() {
    return (
      typeof centerDoubleScoreRemaining !== 'undefined' &&
      centerDoubleScoreRemaining > 0
    );
  }

  function parseHex(color) {
    if (typeof color !== 'string' || color[0] !== '#') {
      return { r: 255, g: 60, b: 172 };
    }
    const hex = color.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16)
      };
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    };
  }

  function mixColor(a, b, amount) {
    const ca = parseHex(a);
    const cb = parseHex(b);
    const t = clamp01(amount);
    const r = Math.round(ca.r + (cb.r - ca.r) * t);
    const g = Math.round(ca.g + (cb.g - ca.g) * t);
    const bl = Math.round(ca.b + (cb.b - ca.b) * t);
    return `rgb(${r}, ${g}, ${bl})`;
  }

  function buildSunMask() {
    if (!miamiArtwork.complete || !miamiArtwork.naturalWidth) return false;
    if (
      sunMask &&
      sunPaint &&
      maskNaturalWidth === miamiArtwork.naturalWidth &&
      maskNaturalHeight === miamiArtwork.naturalHeight
    ) return true;

    const width = Math.ceil(SUN_RX * 2 + PAD * 2);
    const height = Math.ceil(SUN_RY * 2 + PAD * 2);
    const left = SUN_X - SUN_RX - PAD;
    const top = SUN_Y - SUN_RY - PAD;
    const bounds = getArtworkBounds();

    const source = document.createElement('canvas');
    source.width = width;
    source.height = height;
    const sourceCtx = source.getContext('2d', { willReadFrequently: true });
    sourceCtx.imageSmoothingEnabled = true;
    sourceCtx.imageSmoothingQuality = 'high';
    sourceCtx.drawImage(
      miamiArtwork,
      bounds.x - left,
      bounds.y - top,
      bounds.width,
      bounds.height
    );

    const image = sourceCtx.getImageData(0, 0, width, height);
    const data = image.data;
    const centerX = width / 2;
    const centerY = height / 2;

    // Keep only the colored sunset stripes. Dark palm silhouettes and the dark
    // gaps between stripes become transparent, so the moving gradient cannot
    // paint over them.
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4;
        const dx = (x - centerX) / SUN_RX;
        const dy = (y - centerY) / SUN_RY;
        if (dx * dx + dy * dy > 1) {
          data[index + 3] = 0;
          continue;
        }

        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const brightness = (r + g + b) / 3;
        const chroma = max - min;
        const brightMask = clamp01((brightness - 22) / 82);
        const colorMask = clamp01((chroma - 6) / 36);

        data[index] = 255;
        data[index + 1] = 255;
        data[index + 2] = 255;
        data[index + 3] = Math.round(
          255 * brightMask * (0.52 + colorMask * 0.48)
        );
      }
    }

    sourceCtx.putImageData(image, 0, 0);
    sunMask = source;
    sunPaint = document.createElement('canvas');
    sunPaint.width = width;
    sunPaint.height = height;
    maskNaturalWidth = miamiArtwork.naturalWidth;
    maskNaturalHeight = miamiArtwork.naturalHeight;
    return true;
  }

  if (!miamiArtwork.complete) {
    miamiArtwork.addEventListener('load', buildSunMask, { once: true });
  } else {
    buildSunMask();
  }

  function syncState(now) {
    let head = 0;
    let opposite = 6;
    let energy = 0.88;
    let primary = palette.cyan;
    let secondary = palette.magenta;
    let flash = 0;

    if (now < override.until) {
      const age = now - override.startedAt;
      const step = Math.floor(age / 75);
      const fastStep = Math.floor(age / 55);
      flash = 1;

      switch (override.kind) {
        case 'pocket':
          head = wrapIndex(override.origin + step);
          energy = 0.95;
          break;
        case 'pop':
          head = wrapIndex(step * 3);
          energy = 1;
          break;
        case 'drop':
          head = wrapIndex(step * 2);
          opposite = wrapIndex(head + 6);
          energy = 0.98;
          break;
        case 'bank':
          head = Math.floor(age / 90) % 2 === 0 ? 0 : 1;
          primary = palette.white;
          secondary = palette.magenta;
          energy = 1;
          break;
        case 'loop':
          head = wrapIndex(-fastStep);
          primary = palette.cyan;
          secondary = palette.lavender;
          energy = 1;
          break;
        case 'ramp':
          head = wrapIndex(fastStep);
          energy = 1;
          break;
        case 'spinner':
          head = wrapIndex(fastStep);
          opposite = wrapIndex(head + 6);
          energy = 1;
          break;
        case 'magnet':
          head = Math.floor(age / 115) % 2 === 0 ? 3 : 9;
          primary = palette.magenta;
          secondary = palette.white;
          energy = 1;
          break;
        case 'reef':
          head = Math.floor(age / 110) % 2 === 0 ? 0 : 1;
          primary = head === 0 ? palette.cyan : palette.magenta;
          secondary = head === 0 ? palette.magenta : palette.cyan;
          energy = 1;
          break;
        case 'extra':
          head = Math.floor(age / 70) % 2 === 0 ? 0 : 6;
          primary = palette.white;
          secondary = palette.cyan;
          energy = 1;
          break;
        case 'two-x':
          head = Math.floor(age / 100) % 2 === 0 ? 0 : 6;
          energy = 1;
          break;
        case 'drain':
          head = 6;
          primary = palette.magenta;
          secondary = palette.magenta;
          energy = Math.max(
            0.28,
            1 - age / Math.max(1, override.until - override.startedAt)
          );
          break;
        default:
          break;
      }
    } else if (gameOver) {
      const sequence = Math.floor(now / 2600) % 4;
      const step = Math.floor(now / 90);
      if (sequence === 0) {
        head = wrapIndex(step);
        primary = palette.lavender;
      } else if (sequence === 1) {
        head = wrapIndex(-step);
      } else if (sequence === 2) {
        head = Math.floor(now / 180) % 2 === 0 ? 0 : 1;
        primary = palette.white;
      } else {
        head = wrapIndex(step);
        opposite = wrapIndex(6 - step);
      }
      energy = 0.9;
    } else if (ball.ready) {
      head = Math.floor(now / 520) % 2 === 0 ? 0 : 1;
      primary = head === 0 ? palette.cyan : palette.magenta;
      secondary = head === 0 ? palette.magenta : palette.cyan;
      energy = 0.72 + (0.5 + 0.5 * Math.sin(now / 360)) * 0.18;
    } else if (mode2xActive()) {
      head = Math.floor(now / 145) % 2 === 0 ? 0 : 6;
      energy = 1;
    } else {
      // Match the ring's normal two-head chase. This baseline is intentionally
      // vivid now; the color motion should be obvious even without a scoring event.
      const step = Math.floor(now / 125);
      head = wrapIndex(step);
      opposite = wrapIndex(6 - step);
      primary = head % 2 ? palette.magenta : palette.cyan;
      secondary = opposite % 2 ? palette.magenta : palette.cyan;
      energy = 0.88;
    }

    if (primary === palette.cyan && head % 2) primary = palette.magenta;
    if (secondary === palette.magenta && opposite % 2 === 0) secondary = palette.cyan;

    return { head, opposite, primary, secondary, energy, flash };
  }

  function drawSyncedSunGradient() {
    if (!buildSunMask()) return;

    const now = performance.now();
    const state = syncState(now);
    const angle = -Math.PI / 2 + state.head * Math.PI * 2 / LAMP_COUNT;
    const width = sunPaint.width;
    const height = sunPaint.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const reach = Math.max(width, height) * 0.64;
    const dx = Math.cos(angle) * reach;
    const dy = Math.sin(angle) * reach;
    const paintCtx = sunPaint.getContext('2d');

    paintCtx.clearRect(0, 0, width, height);

    // Strong directional gradient: the same lamp head that leads the ring now
    // visibly pulls cyan/magenta/lavender through the sunset stripes.
    const gradient = paintCtx.createLinearGradient(
      centerX - dx,
      centerY - dy,
      centerX + dx,
      centerY + dy
    );
    const coolEdge = mixColor('#7a35ff', state.secondary, 0.72);
    const pinkMid = mixColor('#ff2f9f', state.primary, 0.58);
    const hotCore = mixColor(palette.orange, state.primary, 0.24);
    const hotYellow = mixColor(palette.yellow, state.primary, 0.12);
    const brightEdge = mixColor('#ff4f95', state.primary, 0.74);

    gradient.addColorStop(0, coolEdge);
    gradient.addColorStop(0.24, pinkMid);
    gradient.addColorStop(0.46, hotCore);
    gradient.addColorStop(0.58, hotYellow);
    gradient.addColorStop(0.78, brightEdge);
    gradient.addColorStop(1, state.primary);

    paintCtx.globalCompositeOperation = 'source-over';
    paintCtx.globalAlpha = 1;
    paintCtx.fillStyle = gradient;
    paintCtx.fillRect(0, 0, width, height);

    // A bright hotspot travels around the inside edge with the ring's active head.
    const hotX = centerX + Math.cos(angle) * SUN_RX * 0.48;
    const hotY = centerY + Math.sin(angle) * SUN_RY * 0.48;
    const hotspot = paintCtx.createRadialGradient(
      hotX,
      hotY,
      1,
      hotX,
      hotY,
      25
    );
    hotspot.addColorStop(
      0,
      `rgba(255,255,255,${0.28 + state.energy * 0.22 + state.flash * 0.18})`
    );
    hotspot.addColorStop(
      0.42,
      `rgba(255,183,64,${0.20 + state.energy * 0.16})`
    );
    hotspot.addColorStop(1, 'rgba(255,60,172,0)');
    paintCtx.fillStyle = hotspot;
    paintCtx.fillRect(0, 0, width, height);

    // A fast warm band makes the existing horizontal sunset stripes look like
    // they are being energized rather than merely recolored.
    const bandY = centerY + Math.sin(now / 210 + state.head * 0.68) * SUN_RY * 0.46;
    const band = paintCtx.createLinearGradient(0, bandY - 11, 0, bandY + 11);
    band.addColorStop(0, 'rgba(255,255,255,0)');
    band.addColorStop(
      0.5,
      `rgba(255,240,174,${0.26 + state.energy * 0.22 + state.flash * 0.14})`
    );
    band.addColorStop(1, 'rgba(255,255,255,0)');
    paintCtx.fillStyle = band;
    paintCtx.fillRect(0, bandY - 11, width, 22);

    paintCtx.globalCompositeOperation = 'destination-in';
    paintCtx.globalAlpha = 1;
    paintCtx.drawImage(sunMask, 0, 0);
    paintCtx.globalCompositeOperation = 'source-over';

    const left = SUN_X - SUN_RX - PAD;
    const top = SUN_Y - SUN_RY - PAD;

    // Use a strong normal blend for obvious color travel, followed by a smaller
    // screen pass for light output. Both remain strictly inside the mask.
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = window.miamiMobilePerformanceMode
      ? 0.38 + state.energy * 0.16 + state.flash * 0.10
      : 0.46 + state.energy * 0.18 + state.flash * 0.14;
    ctx.drawImage(sunPaint, left, top);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = window.miamiMobilePerformanceMode
      ? 0.10 + state.energy * 0.10 + state.flash * 0.06
      : 0.14 + state.energy * 0.12 + state.flash * 0.10;
    ctx.drawImage(sunPaint, left, top);
    ctx.restore();
  }

  const baseDrawMiamiArtworkWithSunsetGradientGlow = drawMiamiArtwork;
  drawMiamiArtwork = function drawMiamiArtworkWithSunsetGradientGlow() {
    baseDrawMiamiArtworkWithSunsetGradientGlow();
    drawSyncedSunGradient();
  };

  // Mirror palm-ring.js event timing so the sun and its twelve lamps behave as
  // one lighting feature.
  window.addEventListener('miami-pocket-target', event => {
    const detail = event.detail || {};
    trigger('pocket', 850, 3 + Number(detail.index || 0));
  });
  window.addEventListener('miami-pop-bumper', () => trigger('pop', 620));
  window.addEventListener('miami-drop-target', event => {
    const detail = event.detail || {};
    trigger(detail.bankComplete ? 'bank' : 'drop', detail.bankComplete ? 1250 : 720);
  });
  window.addEventListener('miami-loop-complete', () => trigger('loop', 950));
  window.addEventListener('miami-ramp-enter', () => trigger('ramp', 900));
  window.addEventListener('miami-spinner-exit', () => trigger('spinner', 1100));
  window.addEventListener('miami-magnet-capture', () => trigger('magnet', 900));
  window.addEventListener('miami-reef-complete', () => trigger('reef', 1500));

  window.addEventListener('miami-impact', event => {
    const detail = event.detail || {};
    const index = Number(detail.index);

    if (detail.type === 'post' && index === 8) {
      const earnedExtra =
        typeof captiveExtraBallAwarded !== 'undefined' &&
        typeof captiveHitProgress !== 'undefined' &&
        captiveExtraBallAwarded &&
        captiveHitProgress >= 5;
      trigger(earnedExtra ? 'extra' : 'pop', earnedExtra ? 1500 : 520);
      return;
    }

    if (
      detail.type === 'post' &&
      index >= 11 &&
      index <= 13 &&
      mode2xActive()
    ) {
      trigger('two-x', 1250);
    }
  });

  window.addEventListener('miami-drain', () => trigger('drain', 850, 6));
})();