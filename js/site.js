// onigiri.ai landing page: the lantern hero, the scroll story and the small touches. No libraries.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;

  /* ---------- Top bar ---------- */
  const top = document.querySelector('.top');
  const onScroll = () => top.classList.toggle('scrolled', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Hero: Wisp carries the lantern through the rain ---------- */
  const hero = document.querySelector('.hero');
  const scene = hero.querySelector('.scene');
  const wisp = hero.querySelector('.wisp');
  const canvas = hero.querySelector('canvas');
  const hint = hero.querySelector('.hero-hint');
  const ctx = canvas.getContext('2d');
  // Where the lantern hangs inside the sprite, as a share of its box.
  const LANTERN = { x: 0.8, y: 0.33 };
  let W = 0, H = 0, dpr = 1;
  let target = { x: 0, y: 0 }, pos = { x: 0, y: 0 }, vel = { x: 0, y: 0 };
  let lastMove = -1e9, visible = true, t0 = performance.now();
  let drops = [], splashes = [], sparks = [];
  if (coarse) hero.classList.add('touch');

  const size = () => {
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height; dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(320, (W * H) / 5200));
    drops = Array.from({ length: n }, () => newDrop(true));
    if (!pos.x) { pos.x = target.x = W * (W < 800 ? 0.68 : 0.7); pos.y = target.y = H * (W < 800 ? 0.68 : 0.52); }
  };
  const newDrop = (anywhere) => ({
    x: Math.random() * (W + 200) - 100,
    y: anywhere ? Math.random() * H : -20 - Math.random() * 80,
    l: 12 + Math.random() * 20,
    v: 11 + Math.random() * 9,
    z: 0.4 + Math.random() * 0.6,
  });

  const spriteSize = () => wisp.offsetWidth;
  const lantern = () => ({ x: pos.x + spriteSize() * (LANTERN.x - 0.5), y: pos.y + spriteSize() * (LANTERN.y - 0.5) });

  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    target.x = e.clientX - r.left; target.y = e.clientY - r.top;
    lastMove = performance.now();
    if (hint && !hint.classList.contains('gone')) setTimeout(() => hint.classList.add('gone'), 1600);
  });
  hero.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') {
      const r = hero.getBoundingClientRect();
      target.x = e.clientX - r.left; target.y = e.clientY - r.top; lastMove = performance.now();
    }
  });

  // In the game, a tap on the lantern makes a customer smile. Here it makes Wisp hop and the lantern sparkle.
  const smile = (e) => {
    e.stopPropagation();
    wisp.classList.remove('hop'); void wisp.offsetWidth; wisp.classList.add('hop');
    const l = lantern();
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 4.5;
      sparks.push({ x: l.x, y: l.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2.5, life: 1, r: 2.2 + Math.random() * 3 });
    }
    if (reduce) draw(performance.now());
  };
  wisp.addEventListener('click', smile);
  wisp.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); smile(e); } });

  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !reduce) requestAnimationFrame(frame); }).observe(hero);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !reduce) requestAnimationFrame(frame); });

  const place = (now) => {
    // Idle or touch: Wisp drifts slowly around the stall on its own.
    if (now - lastMove > (coarse ? 2500 : 5000)) {
      const k = (now - t0) / 1000;
      const cx = W < 800 ? 0.62 : 0.7, cy = W < 800 ? 0.7 : 0.55;
      target.x = W * (cx + Math.sin(k * 0.31) * (W < 800 ? 0.18 : 0.14));
      target.y = H * (cy + Math.sin(k * 0.53 + 1) * 0.09);
    }
    const ax = (target.x - pos.x) * 0.06, ay = (target.y - pos.y) * 0.06;
    vel.x = vel.x * 0.72 + ax; vel.y = vel.y * 0.72 + ay;
    pos.x += vel.x; pos.y += vel.y;
    const s = spriteSize();
    wisp.style.setProperty('--wx', `${pos.x - s / 2}px`);
    wisp.style.setProperty('--wy', `${pos.y - s / 2}px`);
    wisp.style.rotate = `${Math.max(-14, Math.min(14, vel.x * 0.9))}deg`;
    const l = lantern();
    const flick = 1 + Math.sin(now / 90) * 0.012 + Math.sin(now / 37) * 0.01;
    scene.style.setProperty('--lx', `${l.x}px`);
    scene.style.setProperty('--ly', `${l.y}px`);
    scene.style.setProperty('--lr', `${Math.round((W < 800 ? 220 : 320) * flick)}px`);
  };

  const draw = (now) => {
    ctx.clearRect(0, 0, W, H);
    const l = lantern();
    const R = W < 800 ? 230 : 330;
    ctx.lineCap = 'round';
    for (const d of drops) {
      if (!reduce) { d.y += d.v * d.z; d.x -= d.v * d.z * 0.16; }
      if (d.y > H * (0.78 + d.z * 0.2)) {
        if (!reduce && Math.random() < 0.35) splashes.push({ x: d.x, y: d.y, r: 1, life: 1 });
        Object.assign(d, newDrop(false));
      }
      const dist = Math.hypot(d.x - l.x, d.y - l.y);
      const near = Math.max(0, 1 - dist / R);
      const a = 0.12 + d.z * 0.18 + near * 0.55;
      ctx.strokeStyle = near > 0.02 ? `rgba(255, ${200 + near * 30 | 0}, ${150 + near * 40 | 0}, ${a})` : `rgba(150, 175, 230, ${a})`;
      ctx.lineWidth = 0.6 + d.z * 0.9;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.l * 0.16 * d.z, d.y - d.l * d.z); ctx.stroke();
    }
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i]; s.r += 0.9; s.life -= 0.04;
      if (s.life <= 0) { splashes.splice(i, 1); continue; }
      const near = Math.max(0, 1 - Math.hypot(s.x - l.x, s.y - l.y) / R);
      ctx.strokeStyle = near > 0.02 ? `rgba(255, 210, 160, ${s.life * (0.15 + near * 0.5)})` : `rgba(150, 175, 230, ${s.life * 0.18})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r * 2.2, s.r * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.07; p.vx *= 0.97; p.vy *= 0.985; p.life -= 0.014;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(255, ${190 + p.life * 50 | 0}, 120, ${p.life})`;
      ctx.shadowColor = 'rgba(255, 170, 80, 0.9)'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life + 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  const frame = (now) => {
    if (!visible || document.hidden) return;
    place(now); draw(now);
    requestAnimationFrame(frame);
  };

  addEventListener('resize', size);
  size();
  if (reduce) { place(performance.now()); draw(performance.now()); }
  else requestAnimationFrame(frame);

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
