'use strict';
// One simulation second drives arrivals, work, patience and the live timeline together.
// Suspended callbacks never replay wall time accumulated in a background tab.
window.RingClock = (() => {
  function create({ speed, paused, session, step, now = () => performance.now(), schedule = setTimeout }) {
    let previous = now(), fraction = 0, identity = session(), rate = speed(), stopped = paused();
    function reset() { previous = now(); fraction = 0; identity = session(); rate = speed(); stopped = paused(); }
    function pulse() {
      const current = now(), elapsed = current - previous;
      previous = current;
      const nextRate = speed(), nextPaused = paused(), nextSession = session();
      if (nextSession !== identity || nextRate !== rate || nextPaused || stopped || elapsed < 0 || elapsed > 1500) {
        identity = nextSession; rate = nextRate; stopped = nextPaused; fraction = 0; return 0;
      }
      stopped = nextPaused;
      fraction += elapsed * (nextRate === 2 ? 2 : 1);
      let count = 0;
      while (fraction >= 1000 && !paused() && session() === identity) { fraction -= 1000; step(); count++; }
      if (paused() || session() !== identity) fraction = 0;
      return count;
    }
    function start() { function loop() { pulse(); schedule(loop, 100); } schedule(loop, 100); }
    return { start, pulse, reset };
  }
  return { create };
})();
