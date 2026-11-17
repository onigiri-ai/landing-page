// onigiri.ai landing page: the lantern hero, the scroll story and the small touches. No libraries.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;

  /* ---------- Top bar ---------- */
  const top = document.querySelector('.top');
  const onScroll = () => top.classList.toggle('scrolled', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Hero: Wisp carries the lantern through the rain ----------
     Performance: Wisp, the light beam and the glow move by transform only (each on its own layer, so no repaint and no
     style recalculation), the rain canvas draws at 1x in a few batched strokes, and the sparks are one pre-drawn glow
     sprite stamped with additive blending (no shadow blur). */
  const hero = document.querySelector('.hero');
  const scene = hero.querySelector('.scene');
  const beam = scene.querySelector('.beam');
  const beamImg = beam.querySelector('img');
  const glow = scene.querySelector('.glow');
  const wisp = hero.querySelector('.wisp');
  const wispImg = wisp.querySelector('img');
  const canvas = scene.querySelector('canvas');
  const hint = hero.querySelector('.hero-hint');
  const ctx = canvas.getContext('2d');
  // Where the lantern hangs inside the sprite, as a share of its box.
  const LANTERN = { x: 0.8, y: 0.33 };
  const MAX_SPARKS = 60;
  let W = 0, H = 0, R = 300, S = 150;
  const target = { x: 0, y: 0 }, pos = { x: 0, y: 0 }, vel = { x: 0, y: 0 };
  let lastMove = -1e9, visible = true, running = false;
  const t0 = performance.now();
  let drops = [];
  const splashes = [], sparks = [];
  if (coarse) hero.classList.add('touch');

  // The spark: drawn once, stamped many times.
  const spark = document.createElement('canvas');
  spark.width = spark.height = 32;
  {
    const g = spark.getContext('2d');
    const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grd.addColorStop(0, 'rgba(255, 246, 220, 1)');
    grd.addColorStop(0.25, 'rgba(255, 210, 140, 0.9)');
    grd.addColorStop(0.6, 'rgba(255, 150, 60, 0.25)');
    grd.addColorStop(1, 'rgba(255, 140, 50, 0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 32, 32);
  }

  const newDrop = (anywhere) => ({
    x: Math.random() * (W + 200) - 100,
    y: anywhere ? Math.random() * H : -20 - Math.random() * 80,
    l: 12 + Math.random() * 20,
    v: 11 + Math.random() * 9,
    z: 0.4 + Math.random() * 0.6,
  });

  const size = () => {
    const r = hero.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height);
    // Rain is motion, not detail: one canvas pixel per CSS pixel keeps the fill cost low on retina screens.
    canvas.width = W; canvas.height = H;
    R = W < 800 ? 220 : 320;
    S = wisp.offsetWidth || 150;
    beam.style.width = beam.style.height = `${R * 2}px`;
    glow.style.width = glow.style.height = `${R * 2.2}px`;
    // The lit copy is the whole scene's size, slid against the beam so the two always line up.
    beamImg.style.width = `${W}px`;
    beamImg.style.height = `${H}px`;
    drops = Array.from({ length: Math.round(Math.min(260, (W * H) / 6000)) }, () => newDrop(true));
    // Stamp the spark once, invisibly, so its texture is ready before the first click.
    ctx.globalAlpha = 0; ctx.drawImage(spark, 0, 0); ctx.globalAlpha = 1;
    if (!pos.x) { pos.x = target.x = W * (W < 800 ? 0.68 : 0.7); pos.y = target.y = H * (W < 800 ? 0.68 : 0.52); }
  };

  const lantern = () => ({ x: pos.x + S * (LANTERN.x - 0.5), y: pos.y + S * (LANTERN.y - 0.5) });

  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    target.x = e.clientX - r.left; target.y = e.clientY - r.top;
    lastMove = performance.now();
    if (hint && !hint.classList.contains('gone')) setTimeout(() => hint.classList.add('gone'), 1600);
    wake();
  });

  // In the game, a tap on the lantern makes a customer smile. Here Wisp is the pointer, so a click anywhere in the
  // hero (but on a link or a button) makes Wisp hop and the lantern spark.
  const smile = () => {
    if (!reduce) {
      wispImg.animate([
        { transform: 'none' },
        { transform: 'translateY(-26px) scale(1.08, 0.94)', offset: 0.3 },
        { transform: 'translateY(0) scale(0.96, 1.05)', offset: 0.6 },
        { transform: 'none' },
      ], { duration: 650, easing: 'cubic-bezier(0.2, 0.7, 0, 1)' });
    }
    const l = lantern();
    const n = Math.min(18, MAX_SPARKS - sparks.length);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 4;
      sparks.push({ x: l.x, y: l.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2.5, life: 1, r: 10 + Math.random() * 12 });
    }
    wake();
  };
  hero.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button')) return;
    if (e.pointerType !== 'mouse') {
      const r = hero.getBoundingClientRect();
      target.x = e.clientX - r.left; target.y = e.clientY - r.top; lastMove = performance.now();
    }
    e.preventDefault(); // no text selection, no drag
    smile();
  });
  wisp.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); smile(); } });

  new IntersectionObserver(([en]) => { visible = en.isIntersecting; wake(); }).observe(hero);
  document.addEventListener('visibilitychange', wake);

  const place = (now) => {
    // Idle or touch: Wisp drifts slowly around the stall on its own.
    if (now - lastMove > (coarse ? 2500 : 5000)) {
      const k = (now - t0) / 1000;
      const cx = W < 800 ? 0.62 : 0.7, cy = W < 800 ? 0.7 : 0.55;
      target.x = W * (cx + Math.sin(k * 0.31) * (W < 800 ? 0.18 : 0.14));
      target.y = H * (cy + Math.sin(k * 0.53 + 1) * 0.09);
    }
    vel.x = vel.x * 0.72 + (target.x - pos.x) * 0.06;
    vel.y = vel.y * 0.72 + (target.y - pos.y) * 0.06;
    pos.x += vel.x; pos.y += vel.y;
    const tilt = Math.max(-14, Math.min(14, vel.x * 0.9));
    wisp.style.transform = `translate3d(${(pos.x - S / 2).toFixed(1)}px, ${(pos.y - S / 2).toFixed(1)}px, 0) rotate(${tilt.toFixed(2)}deg)`;
    const l = lantern();
    const bx = l.x - R, by = l.y - R;
    beam.style.transform = `translate3d(${bx.toFixed(1)}px, ${by.toFixed(1)}px, 0)`;
    beamImg.style.transform = `translate3d(${(-bx).toFixed(1)}px, ${(-by).toFixed(1)}px, 0)`;
    glow.style.transform = `translate3d(${(l.x - R * 1.1).toFixed(1)}px, ${(l.y - R * 1.1).toFixed(1)}px, 0)`;
    glow.style.opacity = (0.9 + Math.sin(now / 90) * 0.06 + Math.sin(now / 37) * 0.04).toFixed(3);
    return l;
  };

  // Rain in batches: 3 depths x (cool + 4 warmth levels) = at most 15 strokes a frame.
  const WARM = 4;
  const buckets = Array.from({ length: 3 * (WARM + 1) }, () => []);
  const draw = (l) => {
    ctx.clearRect(0, 0, W, H);
    const RR = R * 1.05;
    for (const b of buckets) b.length = 0;
    for (const d of drops) {
      if (!reduce) { d.y += d.v * d.z; d.x -= d.v * d.z * 0.16; }
      if (d.y > H * (0.78 + d.z * 0.2)) {
        if (!reduce && splashes.length < 40 && Math.random() < 0.3) splashes.push({ x: d.x, y: d.y, r: 1, life: 1 });
        Object.assign(d, newDrop(false));
      }
      const dx = d.x - l.x, dy = d.y - l.y;
      const near = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / RR);
      const w = near > 0.02 ? 1 + Math.min(WARM - 1, Math.floor(near * WARM)) : 0;
      buckets[Math.min(2, Math.floor((d.z - 0.4) / 0.2)) * (WARM + 1) + w].push(d);
    }
    ctx.lineCap = 'round';
    for (let zi = 0; zi < 3; zi++) {
      const z = 0.5 + zi * 0.2;
      ctx.lineWidth = 0.6 + z * 0.9;
      for (let w = 0; w <= WARM; w++) {
        const list = buckets[zi * (WARM + 1) + w];
        if (!list.length) continue;
        const near = w ? (w - 0.5) / WARM : 0;
        const a = 0.12 + z * 0.18 + near * 0.55;
        ctx.strokeStyle = w ? `rgba(255, ${200 + near * 30 | 0}, ${150 + near * 40 | 0}, ${a.toFixed(2)})` : `rgba(150, 175, 230, ${a.toFixed(2)})`;
        ctx.beginPath();
        for (const d of list) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.l * 0.16 * d.z, d.y - d.l * d.z); }
        ctx.stroke();
      }
    }
    if (splashes.length) {
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = 'rgba(150, 175, 230, 0.16)';
      ctx.beginPath();
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i]; s.r += 0.9; s.life -= 0.05;
        if (s.life <= 0) { splashes.splice(i, 1); continue; }
        ctx.moveTo(s.x + s.r * 2.2, s.y); ctx.ellipse(s.x, s.y, s.r * 2.2, s.r * 0.55, 0, 0, Math.PI * 2);
      }
      ctx.stroke();
    }
    if (sparks.length) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.07; p.vx *= 0.97; p.vy *= 0.985; p.life -= 0.022;
        if (p.life <= 0) { sparks.splice(i, 1); continue; }
        const s = p.r * (0.4 + p.life * 0.6);
        ctx.globalAlpha = p.life;
        ctx.drawImage(spark, p.x - s / 2, p.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  const frame = (now) => {
    if (!visible || document.hidden) { running = false; return; }
    draw(place(now));
    requestAnimationFrame(frame);
  };
  // One loop at most, and none while the hero is off screen or the tab is hidden.
  function wake() {
    if (reduce) { draw(place(performance.now())); return; }
    if (running || !visible || document.hidden) return;
    running = true;
    requestAnimationFrame(frame);
  }

  addEventListener('resize', () => { size(); wake(); });
  size();
  wake();

  /* ---------- Scroll reveals ---------- */
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  /* ---------- Story: the sticky frame follows the step in view ---------- */
  const steps = [...document.querySelectorAll('.story-step')];
  const shots = [...document.querySelectorAll('.stage-shots img')];
  const dots = [...document.querySelectorAll('.stage-dots i')];
  const label = document.querySelector('.frame .bar span');
  const show = (i) => {
    steps.forEach((s, j) => s.classList.toggle('active', j === i));
    shots.forEach((s, j) => s.classList.toggle('on', j === i));
    dots.forEach((s, j) => s.classList.toggle('on', j === i));
    if (label && steps[i]) label.textContent = steps[i].dataset.label || '';
  };
  const sio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) show(steps.indexOf(e.target)); }), { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach((s) => sio.observe(s));
  show(0);

  /* ---------- Cards lean towards the pointer ---------- */
  if (!reduce && !coarse) {
    document.querySelectorAll('.cast-card').forEach((c) => {
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        c.style.setProperty('--ry', `${x * 10}deg`); c.style.setProperty('--rx', `${-y * 10}deg`);
      });
      c.addEventListener('pointerleave', () => { c.style.setProperty('--ry', '0deg'); c.style.setProperty('--rx', '0deg'); });
    });
    document.querySelectorAll('.tile').forEach((t) => t.addEventListener('pointermove', (e) => {
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', `${e.clientX - r.left}px`); t.style.setProperty('--my', `${e.clientY - r.top}px`);
    }));
  }

  /* ---------- Download: point at the visitor's own system ---------- */
  const ua = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent;
  const os = /mac/i.test(ua) ? 'macos' : /win/i.test(ua) ? 'windows' : /linux|x11/i.test(ua) && !/android/i.test(navigator.userAgent) ? 'linux' : '';
  const names = { macos: 'macOS', windows: 'Windows', linux: 'Linux' };
  if (os) {
    const card = document.querySelector(`.platform[data-os="${os}"]`);
    if (card) card.classList.add('yours');
    const main = document.querySelector('[data-download-main]');
    if (main && !coarse) main.lastChild.textContent = ` Download for ${names[os]}`;
  }
})();
