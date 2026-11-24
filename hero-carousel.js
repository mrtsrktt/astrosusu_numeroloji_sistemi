(() => {
  const hero = document.querySelector('[data-hero-carousel]');
  if (!hero) return;
  const track = hero.querySelector('.hero-panels');
  const slides = [...track.querySelectorAll('.hero-slide')];
  if (slides.length < 2) return;
  const status = hero.querySelector('.hero-status');
  const progress = document.createElement('div');
  progress.className = 'hero-progress';
  progress.setAttribute('aria-hidden', 'true');
  progress.innerHTML = '<div class="hero-progress-fill"></div>';
  hero.append(progress);
  const fill = progress.firstElementChild;
  const duration = 700, interval = 5000;
  let active = 0, elapsed = 0, last = performance.now();
  let hovered = false, moving = false, gesture = null;
  const mod = i => (i + slides.length) % slides.length;
  const width = () => track.getBoundingClientRect().width;
  const translate = x => `translate3d(${x}px,0,0)`;
  function paint(offset = 0, showAdjacent = false) {
    const w = width();
    slides.forEach((slide, i) => {
      const position = i === active ? 0 : i === mod(active + 1) ? 1 : i === mod(active - 1) ? -1 : 2;
      const visible = position === 0 || (showAdjacent && Math.abs(position) === 1);
      slide.style.visibility = visible ? 'visible' : 'hidden';
      slide.style.transform = translate(position * w + offset);
      slide.inert = i !== active;
    });
    track.dataset.active = String(active);
  }
  async function settle(direction, offset = 0, announce = false) {
    if (moving) return;
    moving = true;
    const w = width();
    paint(offset, true);
    const animations = [active, mod(active + 1), mod(active - 1)].map(i => {
      const position = i === active ? 0 : i === mod(active + 1) ? 1 : -1;
      return slides[i].animate([
        { transform: translate(position * w + offset) },
        { transform: translate((position - direction) * w) }
      ], { duration, easing:'cubic-bezier(.22,.61,.36,1)', fill:'both' });
    });
    await Promise.allSettled(animations.map(a => a.finished));
    active = mod(active + direction);
    paint();
    animations.forEach(a => a.cancel());
    if (direction) elapsed = 0;
    fill.style.transform = `scaleX(${elapsed / interval})`;
    moving = false;
    last = performance.now();
    if (announce && status) status.textContent = `${active + 1}. slayt: ${slides[active].querySelector('.hero-title').textContent.trim()}`;
  }
  function tick(now) {
    if (!hovered && !moving && !gesture && !document.hidden) {
      elapsed = Math.min(interval, elapsed + now - last);
      fill.style.transform = `scaleX(${elapsed / interval})`;
      if (elapsed >= interval) void settle(1);
    }
    last = now;
    requestAnimationFrame(tick);
  }
  hero.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hovered = true; });
  hero.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hovered = false; last = performance.now(); } });
  track.tabIndex = 0;
  track.setAttribute('role', 'group');
  track.setAttribute('aria-label', 'Slaytlar, sağ ve sol ok tuşlarıyla gezinebilirsin');
  track.addEventListener('keydown', e => {
    if (!['ArrowRight','ArrowLeft'].includes(e.key)) return;
    e.preventDefault();
    if (!moving && !gesture) void settle(e.key === 'ArrowRight' ? 1 : -1, 0, true);
  });
  track.addEventListener('dragstart', e => e.preventDefault());
  track.addEventListener('pointerdown', e => {
    if (moving || gesture || !e.isPrimary || e.button !== 0 || e.target.closest('button,input,select,textarea')) return;
    gesture = { id:e.pointerId, x:e.clientX, y:e.clientY, offset:0, dragging:false };
  });
  track.addEventListener('pointermove', e => {
    if (!gesture || gesture.id !== e.pointerId) return;
    const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y;
    if (!gesture.dragging) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { gesture = null; return; }
      if (Math.abs(dx) < 8) return;
      gesture.dragging = true;
      track.setPointerCapture(e.pointerId);
      track.classList.add('hero-dragging');
    }
    e.preventDefault();
    gesture.offset = Math.max(-width(), Math.min(width(), dx));
    paint(gesture.offset, true);
  });
  function finish(e, commit) {
    if (!gesture || gesture.id !== e.pointerId) return;
    const g = gesture;
    gesture = null;
    if (track.hasPointerCapture(g.id)) track.releasePointerCapture(g.id);
    track.classList.remove('hero-dragging');
    if (g.dragging) {
      const direction = commit && Math.abs(g.offset) >= Math.min(100, width() * .2) ? (g.offset < 0 ? 1 : -1) : 0;
      void settle(direction, g.offset, true);
    }
  }
  track.addEventListener('click', e => { if (moving) { e.preventDefault(); e.stopPropagation(); } }, true);
  track.addEventListener('pointerup', e => finish(e, true));
  track.addEventListener('pointercancel', e => finish(e, false));
  track.addEventListener('lostpointercapture', e => { if (e.target === track) finish(e, false); });
  track.addEventListener('pointerleave', e => { if (gesture && !gesture.dragging) finish(e, false); });
  window.addEventListener('resize', () => { if (!moving && !gesture) paint(); });
  document.addEventListener('visibilitychange', () => { last = performance.now(); });
  paint();
  requestAnimationFrame(tick);
})();
