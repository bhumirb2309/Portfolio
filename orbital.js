// Hero orbital card ring — 5 cards fixed 72° apart around a circle (pure CSS
// 3D, see style.css). Idles with a slow CSS-only auto-rotation by default —
// this keeps it visibly alive even in contexts where requestAnimationFrame
// gets throttled/suspended (e.g. a backgrounded preview tab), since CSS
// @keyframes don't depend on JS's rAF loop to animate.
//
// The moment you scroll or click a card, JS takes over precisely: scrolling
// steps exactly one card at a time (snap, not free-spin), and clicking any
// visible side card rotates it straight to the front via the shortest path.
// Depth-based opacity dimming (JS-driven, once active) falls out of each
// card's real angle in 3D space.

function initOrbital() {
  const scene = document.getElementById('orbitalScene');
  const ring = document.getElementById('orbitalRing');
  const shadow = document.getElementById('orbitalShadow');
  if (!scene || !ring) return;

  const cards = Array.from(ring.querySelectorAll('.orbital-card'));
  const COUNT = cards.length;
  const STEP = 360 / COUNT;
  const IDLE_DURATION_MS = 48000;

  // Each card's own rotateY offset (--i * this) is read from CSS — keep it in sync with
  // however many cards actually exist, instead of a value baked in for a fixed card count.
  ring.style.setProperty('--oc-step', `${STEP}deg`);

  const BASE_TILT = -6;
  const STEP_COOLDOWN = 550; // ms — one scroll gesture = one step, ignore the rest of it

  const pageLoadTime = performance.now();
  let jsControlled = false;
  let currentIndex = 0;
  let displayRotY = 0;
  let targetRotY = 0;
  let rotYBase = 0; // the ring's angle at the moment JS took over from the idle animation
  let rotX = BASE_TILT;
  let cooldownUntil = 0;

  function idleRotY(now) {
    return ((now - pageLoadTime) % IDLE_DURATION_MS) / IDLE_DURATION_MS * 360;
  }

  function takeControl() {
    if (jsControlled) return;
    jsControlled = true;
    ring.classList.add('js-controlled');
    rotYBase = idleRotY(performance.now());
    displayRotY = rotYBase;
    targetRotY = rotYBase;
    currentIndex = 0;
    lastTime = null;
    requestAnimationFrame(tick);
  }

  function step(dir) {
    currentIndex += dir;
    targetRotY = rotYBase - currentIndex * STEP;
  }

  function goToCard(cardIndex) {
    const currentMod = ((currentIndex % COUNT) + COUNT) % COUNT;
    let delta = cardIndex - currentMod;
    if (delta > COUNT / 2) delta -= COUNT;
    if (delta < -COUNT / 2) delta += COUNT;
    if (delta === 0) return;
    currentIndex += delta;
    targetRotY = rotYBase - currentIndex * STEP;
    cooldownUntil = performance.now() + STEP_COOLDOWN;
  }

  scene.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      takeControl();
      const now = performance.now();
      if (now < cooldownUntil || Math.abs(e.deltaY) < 4) return;
      cooldownUntil = now + STEP_COOLDOWN;
      step(e.deltaY > 0 ? 1 : -1);
    },
    { passive: false }
  );

  cards.forEach((card, i) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.oc-link')) return;
      takeControl();
      goToCard(i);
    });
  });

  function updateScale() {
    const w = scene.clientWidth;
    const scale = Math.max(0.5, Math.min(1, w / 600));
    document.documentElement.style.setProperty('--oc-scale', scale.toFixed(3));
  }
  window.addEventListener('resize', updateScale);
  updateScale();

  let lastTime = null;
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = lastTime !== null ? Math.min(now - lastTime, 50) : 0;
    lastTime = now;
    if (dt === 0) return;

    const lerpFn = (alpha) => 1 - Math.pow(1 - alpha, dt / 16.667);

    displayRotY += (targetRotY - displayRotY) * lerpFn(0.12);
    rotX += (BASE_TILT - rotX) * lerpFn(0.08);

    ring.style.transform = `rotateX(${rotX.toFixed(3)}deg) rotateY(${displayRotY.toFixed(3)}deg)`;

    cards.forEach((card, i) => {
      const worldAngle = (((i / COUNT) * 360 + displayRotY) % 360 + 360) % 360;
      const depth = (Math.cos((worldAngle * Math.PI) / 180) + 1) / 2;
      card.style.opacity = (0.35 + depth * 0.65).toFixed(2);
    });

    if (shadow) {
      const shiftX = Math.sin((displayRotY * Math.PI) / 180) * 60;
      shadow.style.transform = `translateX(calc(-50% + ${shiftX.toFixed(1)}px))`;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOrbital);
} else {
  initOrbital();
}
