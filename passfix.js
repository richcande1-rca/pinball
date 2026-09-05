// PASSFIX: keep the strong-launch chute physical only while a ball is
// actually riding that elevated route. Loose playfield balls can then pass
// beneath Ocean Drive instead of striking the hidden upper-layer rails.
// Also join the lower-right cyan guide directly to the pink sling so their
// former tiny gap cannot form a dead-ball pinch point.
(() => {
  if (window.miamiPassFixInstalled) return;

  let attempts = 0;
  const installPassFix = () => {
    const ready =
      typeof coastalOrbitRails !== 'undefined' &&
      typeof resolveSegmentCollision === 'function' &&
      typeof lowerGuides !== 'undefined' &&
      typeof sideBumpers !== 'undefined';

    if (!ready) {
      attempts += 1;
      if (attempts < 200) window.setTimeout(installPassFix, 50);
      return;
    }

    const rightPinkSling = sideBumpers[1];
    const rightOutlaneTopGuide = lowerGuides.find(guide =>
      Math.abs(guide.x1 - 370) < 0.01 &&
      Math.abs(guide.y1 - 556) < 0.01 &&
      Math.abs(guide.x2 - 414) < 0.01 &&
      Math.abs(guide.y2 - 548) < 0.01
    );

    if (!rightOutlaneTopGuide) {
      attempts += 1;
      if (attempts < 200) window.setTimeout(installPassFix, 50);
      return;
    }

    rightOutlaneTopGuide.x1 = rightPinkSling.x1;
    rightOutlaneTopGuide.y1 = rightPinkSling.y1;

    const baseResolveSegmentCollisionPassFix = resolveSegmentCollision;
    resolveSegmentCollision = function resolveSegmentCollisionPassFix(
      segment,
      surfaceVelocity = { x: 0, y: 0 },
      restitution = 0.9,
      extraKick = 0
    ) {
      if (
        shooterRoute !== 'orbit' &&
        coastalOrbitRails.includes(segment)
      ) {
        return false;
      }

      return baseResolveSegmentCollisionPassFix(
        segment,
        surfaceVelocity,
        restitution,
        extraKick
      );
    };

    window.miamiPassFixInstalled = true;
  };

  window.addEventListener('load', installPassFix, { once: true });
})();
