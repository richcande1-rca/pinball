// Miami Nights: remove the two former magenta mid-playfield deflectors.
// This deletes both their collision geometry and their passive impact bookkeeping.

(() => {
  if (window.miamiDeflectorsRemoved) return;
  window.miamiDeflectorsRemoved = true;

  midPlayfieldGuides.length = 0;

  if (Array.isArray(passiveImpactSurfaces)) {
    for (let index = passiveImpactSurfaces.length - 1; index >= 0; index -= 1) {
      if (passiveImpactSurfaces[index]?.type === 'mid-guide') {
        passiveImpactSurfaces.splice(index, 1);
      }
    }
  }
})();
