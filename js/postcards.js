/* Postcard deck: swipe / arrow through a stop's sights, tap to flip. */

window.Postcards = (function () {
  const { PLACES } = window.TRIP_DATA;
  const modal = document.getElementById('postcards');
  const deck = document.getElementById('pcDeck');
  const dots = document.getElementById('pcDots');
  let cards = [], current = 0, flipped = new Set(), lastFocus = null;

  function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const mix = (a, b, t) => d3.interpolateRgb(a, b)(t);

  // Layered cut-paper landscape, seeded by the sight so each card differs.
  function placeholder(id, accent) {
    const r = rng(hash(id)), W = 400, H = 500;
    const sky0 = mix('#fff4f8', accent, 0.10), sky1 = mix('#ffd9c9', accent, 0.30);
    const sunX = 80 + r() * 240, sunY = 90 + r() * 90;
    const layers = [0.25, 0.45, 0.65, 0.85].map((depth, i) => {
      const base = 210 + i * 70 + r() * 20, amp = 30 + r() * 50, freq = 1 + r() * 2, ph = r() * 6;
      let d = `M0 ${H} L0 ${base}`;
      for (let x = 0; x <= W; x += 20) d += ` L${x} ${(base - Math.sin(x / W * Math.PI * freq + ph) * amp - (r() * 8)).toFixed(1)}`;
      d += ` L${W} ${H} Z`;
      return `<path d="${d}" fill="${mix('#fde4ec', accent, depth)}" filter="url(#ds-${id})"/>`;
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky0}"/><stop offset="1" stop-color="${sky1}"/></linearGradient>
        <filter id="ds-${id}" x="-5%" y="-10%" width="110%" height="130%"><feDropShadow dx="0" dy="-3" stdDeviation="3" flood-color="#6a1240" flood-opacity=".22"/></filter>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#sky-${id})"/>
      <circle cx="${sunX}" cy="${sunY}" r="${34 + r() * 18}" fill="#fff8ec" opacity=".9" filter="url(#ds-${id})"/>
      ${layers}
    </svg>`;
  }

  function fmt(isoDay) { const [y, m, d] = isoDay.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }); }

  function layout() {
    cards.forEach((el, i) => {
      const o = i - current, a = Math.abs(o);
      const flip = flipped.has(i) ? 180 : 0;
      el.style.transform = `translate(-50%, -50%) translateX(${o * 70}%) rotate(${o * 4}deg) scale(${1 - Math.min(a, 2) * 0.1}) rotateY(${flip}deg)`;
      el.style.opacity = a > 2 ? 0 : a === 0 ? 1 : 0.85;
      el.style.zIndex = 10 - a;
      el.style.pointerEvents = a > 2 ? 'none' : 'auto';
      el.setAttribute('aria-hidden', a === 0 ? 'false' : 'true');
      el.tabIndex = a === 0 ? 0 : -1;
    });
    [...dots.children].forEach((b, i) => b.setAttribute('aria-current', String(i === current)));
  }
  function go(i) { current = Math.max(0, Math.min(cards.length - 1, i)); layout(); }

  function open(stop, trip) {
    const place = PLACES[stop.place];
    const nights = Math.round((Date.parse(stop.to) - Date.parse(stop.from)) / 864e5) + 1;
    const crowd = window.CrowdChart.crowdAt(stop.place, stop.from);
    document.getElementById('pcCountry').textContent = place.country;
    document.getElementById('pcCountry').style.color = trip.accent;
    document.getElementById('pcCity').textContent = place.name;
    document.getElementById('pcMeta').textContent =
      `${fmt(stop.from)}${stop.to !== stop.from ? ' – ' + fmt(stop.to) : ''} · ${nights} night${nights > 1 ? 's' : ''} · Crowds: ${window.CrowdChart.word(crowd).toLowerCase()} (our guess)`;

    deck.innerHTML = ''; dots.innerHTML = ''; flipped = new Set(); current = 0;
    cards = place.sights.map((s, i) => {
      const id = `${stop.place}-${s.id}`;
      const el = document.createElement('div');
      el.className = 'postcard';
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `${s.name}. Tap to flip.`);
      el.innerHTML = `
        <div class="face front">
          <div class="art">${s.img ? `<img src="${s.img}" alt="${s.name}" loading="lazy">` : placeholder(id, trip.accent) + '<span class="art-soon">Art coming soon</span>'}</div>
          <div class="caption"><b>${s.name}</b><span>${place.name}</span></div>
        </div>
        <div class="face back">
          <div class="back-top">
            <p class="greet">Greetings from<br><b>${place.name}</b></p>
            <div class="stamp"><div style="background:${trip.accent}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="#fff" stroke-width="1.4"/><path d="M2 12h20M12 2c3.4 3.6 3.4 16.4 0 20M12 2c-3.4 3.6-3.4 16.4 0 20" fill="none" stroke="#fff" stroke-width="1.2"/></svg>${place.country}</div></div>
          </div>
          <p class="note">${s.note}</p>
          <div class="back-foot">
            <p class="sign">xoxo ♥</p>
            <div class="postmark">${place.name}<br>${fmt(stop.from)}<br>${stop.from.slice(0, 4)}</div>
          </div>
        </div>`;
      el.addEventListener('click', () => {
        if (suppressClick) return;
        if (i !== current) return go(i);
        flipped.has(i) ? flipped.delete(i) : flipped.add(i); layout();
      });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
      deck.appendChild(el);
      const dot = document.createElement('button');
      dot.type = 'button'; dot.setAttribute('aria-label', `Postcard ${i + 1}: ${s.name}`);
      dot.addEventListener('click', () => go(i));
      dots.appendChild(dot);
      return el;
    });

    lastFocus = document.activeElement;
    modal.hidden = false;
    layout();
    requestAnimationFrame(() => cards[0] && cards[0].focus({ preventScroll: true }));
  }

  function close() { modal.hidden = true; if (lastFocus) lastFocus.focus({ preventScroll: true }); }

  // swipe
  let sx = null, sy = null, suppressClick = false;
  deck.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; suppressClick = false; });
  deck.addEventListener('pointerup', (e) => {
    if (sx == null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      suppressClick = true; go(current + (dx < 0 ? 1 : -1));
      setTimeout(() => { suppressClick = false; }, 50);
    }
  });

  document.getElementById('pcPrev').addEventListener('click', () => go(current - 1));
  document.getElementById('pcNext').addEventListener('click', () => go(current + 1));
  modal.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  document.addEventListener('keydown', (e) => {
    if (modal.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') go(current - 1);
    if (e.key === 'ArrowRight') go(current + 1);
  });

  return { open, close, isOpen: () => !modal.hidden };
})();
