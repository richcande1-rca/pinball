// Miami Nights: LOWER2B lower-playfield cleanup.
// Remove the LOWER2 catcher-mitt lane assemblies and replace the lower-right
// dead zone with one simple physical guard. This intentionally leaves flipper
// physics, slings, shooter recovery, underpass routing, scoring, and the center
// safety post unchanged.

(() => {
  if (window.miamiLowerRightCleanupInstalled) return;
  window.miamiLowerRightCleanupInstalled = true;

  const BUILD = 'Build 20260911-PERF1-MB2-UP2A-LOWER2B';

  // LOWER2A used a large collection of curved lower guides on both sides.
  // They looked like catcher mitts and, worse, created places where a ball
  // could settle beside a flipper. Replace the entire set with one clean rail
  // across the bottom of the lower-right open zone.
  //
  // The rail begins just inside the shooter divider and ends well above/right
  // of the right-flipper pivot. Its endpoint stays far enough from the flipper
  // collision envelope that the ball cannot be pinched into another pocket.
  const rightDeathTrapGuard = [
    {
      x1: 390,
      y1: 570,
      x2: 364,
      y2: 582,
      radius: 4,
      accent: 'magenta'
    },
    {
      x1: 364,
      y1: 582,
      x2: 338,
      y2: 598,
      radius: 4,
      accent: 'magenta'
    }
  ];

  lowerGuides.splice(
    0,
    lowerGuides.length,
    ...rightDeathTrapGuard
  );

  const stampBuild = () => {
    const buildNumberDisplay = document.querySelector('.build-number');
    if (buildNumberDisplay) buildNumberDisplay.textContent = BUILD;
  };

  stampBuild();
  window.setTimeout(stampBuild, 700);
  window.setTimeout(stampBuild, 1600);
})();
