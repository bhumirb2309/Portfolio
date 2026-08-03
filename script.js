// Theme toggle (persisted) — localStorage can throw on file:// origins, so guard it
function readStoredTheme() {
  try { return localStorage.getItem('theme'); } catch { return null; }
}
function storeTheme(value) {
  try { localStorage.setItem('theme', value); } catch { /* ignore, e.g. file:// origin */ }
}

const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const themeToggleLabel = document.getElementById('themeToggleLabel');
const savedTheme = readStoredTheme();
if (savedTheme) root.setAttribute('data-theme', savedTheme);

function isDarkTheme() {
  const attr = root.getAttribute('data-theme');
  if (attr) return attr === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function syncThemeLabel() {
  if (themeToggleLabel) themeToggleLabel.textContent = isDarkTheme() ? '{dark}' : '{light}';
}
function applyTheme(value) {
  root.setAttribute('data-theme', value);
  storeTheme(value);
  syncThemeLabel();
}
syncThemeLabel();

themeToggle.addEventListener('click', () => {
  applyTheme(isDarkTheme() ? 'light' : 'dark');
});

// Mobile sidebar toggle
const shell = document.querySelector('.shell');
const navBurger = document.getElementById('navBurger');
navBurger.addEventListener('click', () => shell.classList.toggle('is-nav-open'));
document.querySelectorAll('.tabnav__item').forEach(link =>
  link.addEventListener('click', () => shell.classList.remove('is-nav-open'))
);

// Show all SBI projects
const toggleBtn = document.getElementById('toggleProjects');
toggleBtn.addEventListener('click', () => {
  const hidden = document.querySelectorAll('#sbiProjects .proj-card--hidden');
  const isHidden = getComputedStyle(hidden[0]).display === 'none';
  hidden.forEach(card => card.style.display = isHidden ? 'block' : 'none');
  toggleBtn.textContent = isHidden ? 'Show fewer projects ↑' : 'Show all 12 projects ↓';
});

// Scrollspy — highlight the active sidebar tab as panels scroll into view
const tabLinks = document.querySelectorAll('.tabnav__item');
const panels = document.querySelectorAll('.panel');
const spyObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      tabLinks.forEach(link => {
        link.classList.toggle('is-active', link.dataset.tab === id);
      });
    }
  });
}, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });

panels.forEach(panel => spyObserver.observe(panel));

// Scroll reveal — fades/lifts elements in as they enter the viewport, with a
// cascading stagger for siblings (cards in a grid, chips in a row, etc.)
const revealTargets = document.querySelectorAll(
  '.about-card, .timeline__item, .proj-card, .proj-slide, .skill-block, .edu-list, .contact-row, .contact-form, .panel__title, .eyebrow, .social-item, .cta-statement'
);
const revealGroupCounts = new Map();
revealTargets.forEach((el) => {
  el.classList.add('reveal');
  const group = el.parentElement;
  const idx = revealGroupCounts.get(group) || 0;
  el.style.transitionDelay = `${Math.min(idx * 70, 350)}ms`;
  revealGroupCounts.set(group, idx + 1);
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// Project carousel — click-and-drag scrolling (mouse only; touch/trackpad already scroll natively).
// Scrollbar is hidden via CSS so this drag is the direct way to move it on desktop.
const projCarousel = document.querySelector('.proj-carousel');
if (projCarousel) {
  let isDragging = false;
  let dragMoved = false;
  let dragStartX = 0;
  let dragStartScroll = 0;

  projCarousel.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    isDragging = true;
    dragMoved = false;
    dragStartX = e.clientX;
    dragStartScroll = projCarousel.scrollLeft;
    projCarousel.setPointerCapture(e.pointerId);
  });

  projCarousel.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    // Only start suppressing pointer-events on the slides (and showing the
    // grabbing cursor) once this is a real drag — not on every mousedown,
    // which would disable pointer-events on the very link being clicked
    // before its click event ever fires, silently swallowing plain clicks.
    if (!dragMoved && Math.abs(dx) > 4) {
      dragMoved = true;
      projCarousel.classList.add('is-dragging');
    }
    projCarousel.scrollLeft = dragStartScroll - dx;
  });

  function endCarouselDrag() {
    isDragging = false;
    projCarousel.classList.remove('is-dragging');
  }
  projCarousel.addEventListener('pointerup', endCarouselDrag);
  projCarousel.addEventListener('pointercancel', endCarouselDrag);
  projCarousel.addEventListener('pointerleave', endCarouselDrag);

  // Swallow the click that follows a drag so "View Project" links don't fire accidentally
  projCarousel.addEventListener('click', (e) => {
    if (dragMoved) { e.preventDefault(); e.stopPropagation(); }
  }, true);
}

// Contact form -> sends directly via Formspree; falls back to mailto if that fails
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xnjebezq';

const contactForm = document.getElementById('contactForm');
const contactSubmitBtn = contactForm.querySelector('button[type="submit"]');
const contactSubmitLabel = contactSubmitBtn.textContent;

function mailtoFallback() {
  const name = contactForm.name.value.trim();
  const email = contactForm.email.value.trim();
  const message = contactForm.message.value.trim();
  const subject = encodeURIComponent(`Portfolio contact from ${name}`);
  const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
  window.location.href = `mailto:bhumirb2309@gmail.com?subject=${subject}&body=${body}`;
}

contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (FORMSPREE_ENDPOINT.includes('YOUR_FORM_ID')) {
    mailtoFallback();
    return;
  }

  contactSubmitBtn.disabled = true;
  contactSubmitBtn.textContent = '[ Sending... ]';

  try {
    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(contactForm),
    });
    if (!res.ok) throw new Error('Form submission failed');
    contactSubmitBtn.textContent = '[ Message Sent ]';
    contactForm.reset();
  } catch {
    contactSubmitBtn.textContent = contactSubmitLabel;
    mailtoFallback();
  } finally {
    contactSubmitBtn.disabled = false;
    setTimeout(() => { contactSubmitBtn.textContent = contactSubmitLabel; }, 3000);
  }
});

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Glitch headline — scramble-then-resolve effect, cycling through a few taglines
const glitchEl = document.getElementById('glitchText');
if (glitchEl) {
  const glitchPhrases = [
    '_//Manual work... Automated away//_',
    '_//1.8+ years... shipping daily//_',
    '_//Data Analyst & Automation Engineer//_',
    '_//Open to Data & AI roles//_',
  ];
  const glyphs = '!<>-_\\/[]{}—=+*^?#01';
  let phraseIndex = 0;

  function runGlitch() {
    const finalText = glitchPhrases[phraseIndex];
    phraseIndex = (phraseIndex + 1) % glitchPhrases.length;

    let frame = 0;
    const totalFrames = 18;
    const timer = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      glitchEl.textContent = finalText
        .split('')
        .map((ch, i) => {
          if (ch === ' ') return ' ';
          const revealPoint = progress * finalText.length;
          if (i < revealPoint) return ch;
          return glyphs[Math.floor(Math.random() * glyphs.length)];
        })
        .join('');
      if (frame >= totalFrames) {
        clearInterval(timer);
        glitchEl.textContent = finalText;
      }
    }, 35);
  }

  runGlitch();
  setInterval(runGlitch, 9000);
}

// Hero card ring rotation/momentum now lives in orbital.js

// Quick timeline (experience) — click a year marker to swap the summary card
const qtEntries = [
  { logo: 'SF', role: 'Data Analyst, Automation Engineer & Full Stack Developer', dates: 'Apr 2025 — Present', location: 'Mumbai, IN', tag: 'FULL TIME' },
  { logo: 'SG', role: 'Risk Analyst Intern', dates: 'Jan 2025 — Feb 2025', location: 'Mumbai, IN', tag: 'INTERNSHIP' },
  { logo: 'DA', role: 'Data Analysis Intern', dates: 'Mar 2024 — May 2024', location: 'Remote', tag: 'INTERNSHIP' },
];
const qtMarkers = document.querySelectorAll('.qt-marker');
const qtCard = document.getElementById('qtCard');
const qtLogo = document.querySelector('.qt-logo');
const qtRole = document.getElementById('qtRole');
const qtDates = document.getElementById('qtDates');
const qtLocation = document.getElementById('qtLocation');
const qtTag = document.getElementById('qtTag');

function renderQtEntry(index, animate) {
  const entry = qtEntries[index];
  qtLogo.textContent = entry.logo;
  qtRole.textContent = entry.role;
  qtDates.textContent = entry.dates;
  qtLocation.textContent = entry.location;
  qtTag.textContent = entry.tag;

  if (animate) {
    qtCard.classList.remove('qt-animate');
    void qtCard.offsetWidth;
    qtCard.classList.add('qt-animate');
  }
}

qtMarkers.forEach(marker => {
  marker.addEventListener('click', () => {
    qtMarkers.forEach(m => m.classList.remove('is-active'));
    marker.classList.add('is-active');
    renderQtEntry(Number(marker.dataset.index), true);
  });
});

// Sync the card to qtEntries[0] on load — the static HTML is just a fallback
// for no-JS and shouldn't be trusted to stay in sync with this data by hand.
renderQtEntry(0, false);

// Custom cursor — small arrow that follows the pointer, with a click ripple
const cursorDot = document.getElementById('cursorDot');
if (cursorDot && matchMedia('(pointer: fine)').matches) {
  document.body.classList.add('has-custom-cursor');
  document.addEventListener('mousemove', (e) => {
    cursorDot.style.transform = `translate(${e.clientX - 2}px, ${e.clientY - 2}px)`;
  });
  document.addEventListener('mousedown', (e) => {
    const ripple = document.createElement('span');
    ripple.className = 'cursor-ripple';
    ripple.style.left = `${e.clientX}px`;
    ripple.style.top = `${e.clientY}px`;
    document.body.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
}

// Boot intro — theme pick, simulated loading sequence, then reveal the site
const intro = document.getElementById('intro');
if (intro) {
  document.body.style.overflow = 'hidden';

  const introId = document.getElementById('introId');
  const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  introId.textContent = '_//' + Array.from({ length: 12 }, () => glyphs[Math.floor(Math.random() * glyphs.length)]).join('') + '//_';

  const introStep1 = document.getElementById('introStep1');
  const introStep2 = document.getElementById('introStep2');
  const introLogLines = document.querySelectorAll('#introLog p');
  const introPercent = document.getElementById('introPercent');
  const introProgressBar = document.getElementById('introProgressBar');

  function startBoot(theme) {
    applyTheme(theme);
    intro.classList.add(theme === 'dark' ? 'intro--dark' : 'intro--light');
    introStep1.hidden = true;
    introStep2.hidden = false;

    const stepDelay = 1800 / introLogLines.length;
    introLogLines.forEach((line, i) => {
      setTimeout(() => {
        introLogLines.forEach(l => l.classList.remove('is-active'));
        line.classList.add('is-active');
        if (i > 0) introLogLines[i - 1].classList.remove('is-active');
        if (i > 0) introLogLines[i - 1].classList.add('is-done');
      }, i * stepDelay);
    });

    const totalDuration = 1800;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / totalDuration, 1);
      const pct = Math.round(progress * 100);
      introPercent.textContent = pct + '%';
      introProgressBar.style.width = pct + '%';
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        introLogLines.forEach(l => { l.classList.remove('is-active'); l.classList.add('is-done'); });
        setTimeout(() => {
          intro.classList.add('is-hidden');
          document.body.style.overflow = '';
          setTimeout(() => intro.remove(), 650);
        }, 300);
      }
    }
    requestAnimationFrame(tick);
  }

  document.getElementById('introLight').addEventListener('click', () => startBoot('light'));
  document.getElementById('introDark').addEventListener('click', () => startBoot('dark'));
}
