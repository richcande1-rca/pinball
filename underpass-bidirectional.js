// Miami Nights: bidirectional blind underpass network.
// Every physical tunnel mouth can now be both an entrance and an exit.
// A trip always exits from a different mouth than the one it entered, while
// preserving the existing blind/random travel time and velocity character.

(() => {
  if (window.miamiBidirectionalUnderpassInstalled) return;
  window.miamiBidirectionalUnderpassInstalled = true;

  const trips = new Map();
  const mouthCooldownUntil = [];
  let tripSerial = 0;

  function outwardAngle(mouth) {
    if (mouth.edge === 'top') return -Math.PI / 2;
    if (mouth.edge === 'bottom') return Math.PI / 2;
    if (mouth.edge === 'left') return Math.PI;
    return 0; // right
  }

  function currentMouths() {
    // The original upper pocket is approached from below, so as an exit it
    // points back down into the playfield. The five existing outlets retain
    // their established outward directions.
    return [
      {
        x: underpass.entry.x,
        y: underpass.entry.y,
        radius: underpass.entry.radius,
        edge: 'bottom'
      },
      ...underpass.outlets
    ];
  }

  function pruneStaleTrips(now) {
    for (const [key, trip] of trips) {
      if (now - trip.createdAt > 10000) trips.delete(key);
    }
  }

  function ballApproachesMouth(mouth) {
    const dx = ball.x - mouth.x;
    const dy = ball.y - mouth.y;
    if (Math.hypot(dx, dy) > mouth.radius) return false;

    const angle = outwardAngle(mouth);
    const outwardX = Math.cos(angle);
    const outwardY = Math.sin(angle);
    const outwardSpeed = ball.vx * outwardX + ball.vy * outwardY;

    // Entering means moving against the mouth's outward direction. Keep the
    // old scoop's minimum approach/speed requirements for every mouth.
    return outwardSpeed < -70 && Math.hypot(ball.vx, ball.vy) >= 180;
  }

  tryEnterUnderpass = function tryEnterBidirectionalUnderpass() {
    if (underpass.active) return false;

    const now = performance.now();
    const mouths = currentMouths();
    const sourceIndex = mouths.findIndex((mouth, index) =>
      now >= (mouthCooldownUntil[index] || -Infinity) &&
      ballApproachesMouth(mouth)
    );
    if (sourceIndex < 0) return false;

    const destinations = mouths
      .map((_, index) => index)
      .filter(index => index !== sourceIndex);
    const exitIndex = destinations[
      Math.floor(Math.random() * destinations.length)
    ];

    pruneStaleTrips(now);
    tripSerial += 1;
    const tripKey = now + tripSerial * 0.000001;

    trips.set(tripKey, {
      sourceIndex,
      exitIndex,
      travelRemaining: 0.4 + Math.random() * 0.5,
      entrySpeed: Math.hypot(ball.vx, ball.vy),
      createdAt: now
    });

    underpass.active = true;
    underpass.enteredAt = tripKey;
    return true;
  };

  updateUnderpass = function updateBidirectionalUnderpass(dt) {
    if (!underpass.active) return false;

    const tripKey = underpass.enteredAt;
    const trip = trips.get(tripKey);
    if (!trip) {
      // Fail safe: never strand a ball invisibly if route bookkeeping is lost.
      underpass.active = false;
      underpass.enteredAt = -Infinity;
      return false;
    }

    trip.travelRemaining = Math.max(0, trip.travelRemaining - dt);

    if (trip.travelRemaining > 0) {
      ball.x = -100;
      ball.y = -100;
      ball.vx = 0;
      ball.vy = 0;
      return true;
    }

    const mouths = currentMouths();
    const mouth = mouths[trip.exitIndex];
    const baseAngle = outwardAngle(mouth);
    const angle = baseAngle + (Math.random() * 2 - 1) * 16 * Math.PI / 180;
    const exitSpeed = clamp(
      trip.entrySpeed * (0.82 + Math.random() * 0.2),
      180,
      760
    );
    const clearance = ball.radius + 5;

    ball.x = mouth.x + Math.cos(baseAngle) * clearance;
    ball.y = mouth.y + Math.sin(baseAngle) * clearance;
    ball.vx = Math.cos(angle) * exitSpeed;
    ball.vy = Math.sin(angle) * exitSpeed;

    trips.delete(tripKey);
    mouthCooldownUntil[trip.exitIndex] = performance.now() + 220;
    underpass.active = false;
    underpass.enteredAt = -Infinity;
    ballHasEnteredPlayfield = true;
    shooterRoute = 'released';
    return false;
  };

  const stampBuild = () => {
    const buildNumberDisplay = document.querySelector('.build-number');
    if (buildNumberDisplay) {
      buildNumberDisplay.textContent = 'Build 20260910-PERF1-MB2-UP2';
    }
  };
  stampBuild();
  window.setTimeout(stampBuild, 400);
})();
