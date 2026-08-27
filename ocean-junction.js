// Surgical Ocean Drive / three-post circle junction only.
// Keep the existing Ocean Drive path and release behavior; open the circle
// rails exactly where the elevated ramp crosses them so the two features read
// as one clean T-junction and the ball has a real entrance to the post chamber.

const oceanCircleOuterRailSections = [
  [
    ...upperLeftLoopOuterPoints.slice(0, 8),
    { x: 184, y: 51 }
  ],
  [
    { x: 208, y: 82 },
    ...upperLeftLoopOuterPoints.slice(9)
  ]
];

const oceanCircleInnerRailSections = [
  [
    ...upperLeftLoopInnerPoints.slice(0, 7),
    { x: 143, y: 63 }
  ],
  [
    { x: 177, y: 87 },
    ...upperLeftLoopInnerPoints.slice(9)
  ]
];

// Match collision geometry to the visible gaps. Nothing else about the loop,
// bumpers, or Ocean Drive physics is changed.
upperLeftLoopRails.splice(
  0,
  upperLeftLoopRails.length,
  ...oceanCircleOuterRailSections.flatMap(section => makeRailSegments(section)),
  ...oceanCircleInnerRailSections.flatMap(section => makeRailSegments(section))
);

// Draw only the two circle rails as split sections. All other neon rails keep
// using the original renderer unchanged.
const drawSmoothNeonRailBeforeOceanJunction = drawSmoothNeonRail;
drawSmoothNeonRail = function drawSmoothNeonRailWithOceanJunction(points, accent) {
  if (points === upperLeftLoopOuterPoints) {
    for (const section of oceanCircleOuterRailSections) {
      drawSmoothNeonRailBeforeOceanJunction(section, accent);
    }
    return;
  }

  if (points === upperLeftLoopInnerPoints) {
    for (const section of oceanCircleInnerRailSections) {
      drawSmoothNeonRailBeforeOceanJunction(section, accent);
    }
    return;
  }

  drawSmoothNeonRailBeforeOceanJunction(points, accent);
};
