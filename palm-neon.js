// Miami Nights: give the central sunset palms a lightweight neon outline.
// Presentation only. The large palm is the hero light; the two smaller palms
// echo it more softly. Existing scoring, physics, geometry and artwork stay
// untouched.

(() => {
  if (window.miamiPalmNeonInstalled) return;
  window.miamiPalmNeonInstalled = true;

  const REFERENCE_WIDTH = 220;
  const REFERENCE_HEIGHT = 124;
  let burstStartedAt = -Infinity;
  let burstDuration = 0;

  const palms = [
    {
      strength: 0.5,
      accent: 'magenta',
      trunk: [89, 96, 88, 79, 86, 64, 84, 53],
      fronds: [
        [84, 53, 75, 48, 67, 49, 61, 55],
        [84, 53, 76, 43, 67, 41, 59, 44],
        [84, 53, 82, 43, 82, 36, 78, 31],
        [84, 53, 88, 44, 95, 40, 103, 41],
        [84, 53, 94, 49, 101, 53, 106, 60],
        [84, 53, 91, 56, 96, 63, 98, 70]
      ]
    },
    {
      strength: 0.62,
      accent: 'cyan',
      trunk: [105, 95, 104, 77, 104, 60, 104, 45],
      fronds: [
        [104, 45, 94, 40, 85, 40, 78, 46],
        [104, 45, 96, 34, 89, 31, 82, 32],
        [104, 45, 104, 34, 101, 27, 97, 23],
        [104, 45, 111, 35, 118, 32, 126, 34],
        [104, 45, 115, 42, 124, 44, 132, 51],
        [104, 45, 111, 50, 116, 57, 119, 65]
      ]
    },
    {
      strength: 1,
      accent: 'cyan',
      trunk: [118, 97, 119, 77, 124, 51, 132, 30],
      fronds: [
        [132, 30, 120, 29, 106, 34, 94, 43],
        [132, 30, 119, 21, 105, 19, 92, 24],
        [132, 30, 129, 17, 122, 8, 113, 3],
        [132, 30, 136, 16, 138, 7, 135, 0],
        [132, 30, 142, 17, 153, 8, 166, 8],
        [132, 30, 146, 23, 163, 20, 180, 24],
        [132, 30, 149, 29, 164, 34, 178, 43],
        [132, 30, 145, 36, 154, 43, 161, 54]
      ]
    }
  ];

  function triggerBurst(duration = 850) {
    burstStartedAt = performance.now();
    burstDuration = Math.max(240, duration);
  }

  function point(bounds, x, y) {
    return {
      x: bounds.x + x / REFERENCE_WIDTH * bounds.width,
      y: bounds.y + y / REFERENCE_HEIGHT * bounds.height
    };
  }

  function traceCurve(bounds, curve) {
    const start = point(bounds, curve[0], curve[1]);
    const c1 = point(bounds, curve[2], curve[3]);
    const c2 = point(bounds, curve[4], curve[5]);
    const end = point(bounds, curve[6], curve[7]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y);
  }

  function drawCurve(bounds, curve, color, width, alpha, blur, dash = null, offset = 0) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : blur;
    if (dash) {
      ctx.setLineDash(dash);
      ctx.lineDashOffset = offset;
    }
    traceCurve(bounds, curve);
    ctx.stroke();
    ctx.restore();
  }

  function drawPalm(bounds, palm, index, now, burst) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 620 + index * 1.6);
    const idle = palm.strength * (0.28 + pulse * 0.22);
    const energy = clamp(idle + burst * palm.strength * 0.9, 0, 1.35);
    const accent = MIAMI_COLORS[palm.accent] || MIAMI_COLORS.cyan;
    const alternate = palm.accent === 'cyan'
      ? MIAMI_COLORS.magenta
      : MIAMI_COLORS.cyan;
    const crown = point(bounds, palm.trunk[6], palm.trunk[7]);

    if (!window.miamiMobilePerformanceMode) {
      const halo = ctx.createRadialGradient(
        crown.x, crown.y, 1,
        crown.x, crown.y, 23 + burst * 9
      );
      halo.addColorStop(0, `rgba(255,255,255,${0.025 + burst * 0.08})`);
      halo.addColorStop(0.28, palm.accent === 'cyan'
        ? `rgba(34,223,243,${0.035 + energy * 0.055})`
        : `rgba(255,60,172,${0.035 + energy * 0.055})`);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.fillStyle = halo;
      ctx.fillRect(crown.x - 36, crown.y - 36, 72, 72);
      ctx.restore();
    }

    // Soft tube underneath, then a narrow bright neon core.
    drawCurve(
      bounds,
      palm.trunk,
      accent,
      3.5 + energy * 1.6,
      0.12 + energy * 0.24,
      8 + burst * 12
    );
    drawCurve(
      bounds,
      palm.trunk,
      burst > 0.72 ? '#ffffff' : accent,
      1.05 + energy * 0.75,
      0.5 + energy * 0.38,
      4 + burst * 8
    );

    for (let frondIndex = 0; frondIndex < palm.fronds.length; frondIndex += 1) {
      const color = frondIndex % 2 === 0 ? accent : alternate;
      const frond = palm.fronds[frondIndex];
      drawCurve(
        bounds,
        frond,
        color,
        2.8 + energy * 1.25,
        0.1 + energy * 0.2,
        7 + burst * 11
      );
      drawCurve(
        bounds,
        frond,
        burst > 0.82 && frondIndex % 2 === 0 ? '#ffffff' : color,
        0.9 + energy * 0.6,
        0.48 + energy * 0.4,
        3 + burst * 7
      );
    }

    // A moving electrical highlight keeps the tree alive without animating the
    // underlying artwork. On mobile it becomes a crisp dashed line with no blur.
    const dashOffset = -now / 26 - index * 6;
    drawCurve(
      bounds,
      palm.trunk,
      '#f5ffff',
      0.75 + burst * 0.55,
      0.18 + energy * 0.34,
      burst > 0 ? 5 : 2,
      [4, 9],
      dashOffset
    );

    if (energy > 0.7) {
      ctx.save();
      ctx.globalAlpha = clamp((energy - 0.55) * 1.2, 0, 0.9);
      ctx.fillStyle = burst > 0.55 ? '#ffffff' : accent;
      ctx.shadowColor = accent;
      ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 8 + burst * 9;
      ctx.beginPath();
      ctx.arc(crown.x, crown.y, 1.5 + burst * 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPalmNeon() {
    if (!miamiArtwork.complete || !miamiArtwork.naturalWidth) return;

    const bounds = getArtworkBounds();
    const now = performance.now();
    const age = now - burstStartedAt;
    const burst = burstDuration > 0 && age >= 0 && age < burstDuration
      ? 1 - age / burstDuration
      : 0;

    for (let index = 0; index < palms.length; index += 1) {
      drawPalm(bounds, palms[index], index, now, burst);
    }
  }

  // Sunset-field owns the final artwork placement. Wrap it here, then palm-ring
  // (loaded immediately after this module) can still place its inserts on top.
  const baseDrawMiamiArtworkWithPalmNeon = drawMiamiArtwork;
  drawMiamiArtwork = function drawMiamiArtworkWithPalmNeon() {
    baseDrawMiamiArtworkWithPalmNeon();
    drawPalmNeon();
  };

  const ordinaryBurstEvents = [
    'miami-pop-bumper',
    'miami-pocket-target',
    'miami-secondary-target',
    'miami-drop-target',
    'miami-loop-complete',
    'miami-ramp-enter',
    'miami-spinner-exit',
    'miami-magnet-capture',
    'miami-neon-palms-hit',
    'miami-cafe-ocho-capture'
  ];
  for (const eventName of ordinaryBurstEvents) {
    window.addEventListener(eventName, () => triggerBurst(820));
  }

  window.addEventListener('miami-reef-complete', () => triggerBurst(1250));
  window.addEventListener('miami-feature-qualified', () => triggerBurst(1350));
  window.addEventListener('miami-captive-ready', () => triggerBurst(1800));
  window.addEventListener('miami-captive-progress-boost', event => {
    const detail = event.detail || {};
    triggerBurst(detail.extraBallAwarded ? 1650 : 950);
  });

  window.addEventListener('miami-game-start', () => triggerBurst(1200));
})();
