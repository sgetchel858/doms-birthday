/* Papercraft globe → trip map. D3 orthographic projection for both: the globe
   spins freely, and opening a trip rotates + zooms the same projection into the
   region (at that zoom an orthographic view reads as a flat paper map). */

(function () {
  const { HOME, PLACES, TRIPS } = window.TRIP_DATA;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;

  const $ = (id) => document.getElementById(id);
  const stage = $('stage'), wrap = $('mapWrap'), svgEl = $('globe');
  const svg = d3.select(svgEl);
  const tipEl = $('pinTip');
  const ll = (p) => [p.lon, p.lat];
  const mix = (a, b, t) => d3.interpolateRgb(a, b)(t);
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parse = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const fmt = (iso) => parse(iso).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
  const nightsOf = (s) => Math.round((parse(s.to) - parse(s.from)) / 864e5) + 1;
  const range = (s) => {
    if (s.from === s.to) return fmt(s.from);
    const a = parse(s.from), b = parse(s.to);
    return a.getUTCMonth() === b.getUTCMonth() ? `${fmt(s.from)}–${b.getUTCDate()}` : `${fmt(s.from)} – ${fmt(s.to)}`;
  };

  // ---------------------------------------------------------------- state
  let W = 0, H = 0, baseScale = 1;
  const proj = d3.geoOrthographic().clipAngle(90).precision(0.4);
  const path = d3.geoPath(proj);
  const grat = d3.geoGraticule10();
  const geo = { land: {}, borders: {}, countries: {} };

  const S = {
    mode: 'globe', trip: null, hot: null, hotStop: null, picked: null,
    rot: [62, -34, 0], scale: 1, translate: [0, 0],
    anim: null, dragging: false, vel: [0, 0], lastInteract: -1e9, dirty: true,
    planeT: 0,
  };

  // ---------------------------------------------------------------- svg layers
  const defs = svg.append('defs');
  const sheen = defs.append('radialGradient').attr('id', 'sheen').attr('cx', '36%').attr('cy', '30%').attr('r', '75%');
  sheen.append('stop').attr('offset', '0').attr('stop-color', '#fff').attr('stop-opacity', 0.55);
  sheen.append('stop').attr('offset', '.5').attr('stop-color', '#fff').attr('stop-opacity', 0);
  sheen.append('stop').attr('offset', '1').attr('stop-color', '#7a2a5c').attr('stop-opacity', 0.25);
  const routeMask = defs.append('mask').attr('id', 'routeMask').attr('maskUnits', 'userSpaceOnUse');
  const routeMaskPath = routeMask.append('path').attr('fill', 'none').attr('stroke', '#fff').attr('stroke-width', 14)
    .attr('stroke-linecap', 'round').attr('pathLength', 1).attr('stroke-dasharray', '1 1');

  const L = {};
  L.cast = svg.append('ellipse').attr('class', 'sphere-cast');
  L.ocean = svg.append('path').attr('class', 'ocean');
  L.facets = svg.append('g').attr('class', 'facets');
  L.glitter = svg.append('g').attr('class', 'glitter').style('pointer-events', 'none');
  L.grat = svg.append('path').attr('class', 'grat');
  L.landShadow = svg.append('path').attr('class', 'land-shadow');
  L.landEdge = svg.append('path').attr('class', 'land-edge');
  L.land = svg.append('path').attr('class', 'land');
  L.hi = svg.append('g');
  L.borders = svg.append('path').attr('class', 'borders');
  L.sheen = svg.append('path').attr('fill', 'url(#sheen)').style('pointer-events', 'none');
  L.labels = svg.append('g').style('transition', 'opacity .5s');
  L.arcs = svg.append('g').style('transition', 'opacity .4s');
  L.plane = svg.append('g').style('pointer-events', 'none');
  L.route = svg.append('g').style('transition', 'opacity .5s');
  L.stops = svg.append('g').style('transition', 'opacity .5s');
  L.pins = svg.append('g').style('transition', 'opacity .4s');

  L.plane.append('path').attr('d', 'M-10,-7 L11,0 L-10,7 L-6,0 Z').attr('fill', '#fffaf0').attr('stroke', '#2c2420').attr('stroke-width', 1.2).attr('stroke-linejoin', 'round');
  L.plane.append('path').attr('d', 'M-6,0 L11,0').attr('stroke', '#2c2420').attr('stroke-width', 1);
  L.plane.style('opacity', 0);

  // ---------------------------------------------------------------- pins (globe)
  function pinPath() { return 'M0,0 C-2,-6 -10,-11 -10,-19 A10,10 0 1,1 10,-19 C10,-11 2,-6 0,0Z'; }
  // A heart that tapers to a point on the map.
  const HEART = 'M0,0 C-3,-5 -14,-12 -14,-22 C-14,-29 -8,-32 -4,-31 C-2,-30.5 -0.6,-29 0,-27.5 C0.6,-29 2,-30.5 4,-31 C8,-32 14,-29 14,-22 C14,-12 3,-5 0,0Z';

  const MEMORIES = [
    { id: 'london', name: 'London', lon: -0.1276, lat: 51.5072, fan: 0.55 },
    { id: 'edinburgh', name: 'Edinburgh', lon: -3.1883, lat: 55.9533, fan: -0.55 },
  ];
  const FAN = { 'iberian-slow-travel': -0.5, 'andalusian-romance': 0.5, 'lost-kingdoms': -0.6, 'slow-kingdoms': 0.6 };
  const pinData = TRIPS.map((t) => ({ trip: t, place: PLACES[t.stops[0].place], fan: FAN[t.id] || 0 }));
  // Label sides, chosen so neighbors don't collide on the globe.
  const SIDE = { 'andalusian-romance': 'right', 'iberian-slow-travel': 'left', 'lost-kingdoms': 'left', 'slow-kingdoms': 'right' };

  function buildPins() {
    L.pins.selectAll('*').remove();
    // home
    const home = L.pins.append('g').attr('class', 'pin home').attr('data-id', 'home');
    home.append('ellipse').attr('rx', 7).attr('ry', 2.5).attr('fill', 'rgba(0,0,0,.25)');
    home.append('path').attr('d', pinPath()).attr('fill', css('--home'));
    home.append('path').attr('d', 'M-5,-18 L0,-23 L5,-18 L5,-14 L-5,-14 Z').attr('fill', css('--paper-2'));
    labelPill(home, 'San Francisco', 'below');
    Object.assign(home.node(), { __coord: ll(HOME), __fan: 0, __kind: 'home' });

    // Last year's birthday: faded "been there, done that" hearts
    MEMORIES.forEach((m, i) => {
      const g = L.pins.append('g').attr('class', 'pin memory').attr('data-id', 'btdt-' + m.id)
        .attr('role', 'img').attr('aria-label', `${m.name}: been there, done that (last year's birthday)`);
      g.append('title').text(`${m.name}: been there, done that (last year's birthday)`);
      const inner = g.append('g').attr('class', 'pin-inner');
      inner.append('ellipse').attr('rx', 5).attr('ry', 2).attr('fill', 'rgba(90,20,60,.18)');
      inner.append('path').attr('d', HEART).attr('transform', 'scale(.78)')
        .attr('fill', '#fff6f9').attr('stroke', '#c2477a').attr('stroke-width', 1.5).attr('stroke-dasharray', '2.2 2');
      if (i === 0) labelPill(g, 'BTDT · London & Edinburgh', 'above');
      Object.assign(g.node(), { __coord: [m.lon, m.lat], __fan: m.fan, __kind: 'memory' });
    });

    pinData.forEach((d) => {
      const g = L.pins.append('g').attr('class', 'pin').attr('data-id', d.trip.id)
        .attr('tabindex', 0).attr('role', 'button').attr('aria-label', `${d.trip.title}: open trip`);
      const inner = g.append('g').attr('class', 'pin-inner');
      inner.append('ellipse').attr('rx', 7).attr('ry', 2.5).attr('fill', 'rgba(90,20,60,.28)');
      const heart = inner.append('g').attr('class', 'pin-heart').style('animation-delay', `${TRIPS.indexOf(d.trip) * 0.35}s`);
      heart.append('path').attr('d', HEART).attr('fill', d.trip.accent).attr('stroke', '#fff').attr('stroke-width', 1.6)
        .style('filter', 'drop-shadow(0 2px 2px rgba(90,20,60,.3))');
      heart.append('path').attr('d', 'M0,0 C3,-5 14,-12 14,-22 C14,-29 8,-32 4,-31 C2,-30.5 0.6,-29 0,-27.5 Z').attr('fill', 'rgba(0,0,0,.12)');
      heart.append('ellipse').attr('cx', -7).attr('cy', -24).attr('rx', 3.2).attr('ry', 2).attr('transform', 'rotate(-35 -7 -24)').attr('fill', 'rgba(255,255,255,.65)');
      inner.append('circle').attr('class', 'hit').attr('cy', -16).attr('r', 22);
      labelPill(g, d.trip.title, SIDE[d.trip.id] || 'right');
      Object.assign(g.node(), { __coord: ll(d.place), __fan: d.fan, __kind: 'trip', __trip: d.trip });
      g.on('pointerenter', () => setHot(d.trip, false))
        .on('pointerleave', () => setHot(null))
        .on('click', () => selectTrip(d.trip))
        .on('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectTrip(d.trip); } });
    });
    S.dirty = true;
  }

  function labelPill(g, text, side) {
    const lg = g.append('g').attr('class', 'pin-label-g');
    const bg = lg.append('rect').attr('class', 'pin-label-bg').attr('rx', 8)
      .style('filter', 'drop-shadow(0 2px 4px rgba(150,40,90,.22))');
    const t = lg.append('text').attr('class', 'pin-label').text(text);
    const pw = t.node().getBBox().width + 14;
    g.node().__pill = { bg, t, pw, side };
    placePill(g.node(), side);
  }
  function pillBox(node, side) {
    const P = node.__pill, ph = 22;
    if (side === 'left') return { x: -18 - P.pw, y: -32, w: P.pw, h: ph };
    if (side === 'left-low') return { x: -18 - P.pw, y: -6, w: P.pw, h: ph };
    if (side === 'right-low') return { x: 18, y: -6, w: P.pw, h: ph };
    if (side === 'above') return { x: -P.pw / 2, y: -62, w: P.pw, h: ph };
    if (side === 'below') return { x: -P.pw / 2, y: 6, w: P.pw, h: ph };
    return { x: 18, y: -32, w: P.pw, h: ph };
  }
  function placePill(node, side) {
    const P = node.__pill; if (!P || P.cur === side) return;
    P.cur = side;
    const b = pillBox(node, side);
    P.bg.attr('x', b.x).attr('y', b.y).attr('width', b.w).attr('height', b.h);
    P.t.attr('x', b.x + 7).attr('y', b.y + 15);
  }

  // ---------------------------------------------------------------- render
  function visible(c) { return d3.geoDistance(c, [-S.rot[0], -S.rot[1]]) < Math.PI / 2 - 0.06; }

  // ---------------------------------------------------------------- jewel ocean
  // The ocean is a folded-paper gem: a subdivided icosahedron whose facets are
  // shaded by a fixed light, so they catch the light as the globe turns.
  const RAD = Math.PI / 180;
  function icosphere(n) {
    const t = (1 + Math.sqrt(5)) / 2;
    const V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
    const F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
    const toLL = ([x, y, z]) => [Math.atan2(x, z) / RAD, Math.asin(Math.max(-1, Math.min(1, y))) / RAD];
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const out = [];
    F.forEach(([a, b, c]) => {
      const A = V[a], B = V[b], C = V[c];
      const P = (i, j) => norm([0, 1, 2].map((k) => A[k] + (B[k] - A[k]) * i / n + (C[k] - A[k]) * j / n));
      const tris = [];
      for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) {
        tris.push([P(i, j), P(i + 1, j), P(i, j + 1)]);
        if (i + j < n - 1) tris.push([P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)]);
      }
      tris.forEach((tri) => {
        const ring = tri.map(toLL); ring.push(ring[0]);
        let f = { type: 'Polygon', coordinates: [ring] };
        if (d3.geoArea(f) > 2 * Math.PI) f = { type: 'Polygon', coordinates: [ring.slice().reverse()] };
        const c = norm(tri.reduce((acc, v) => [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]], [0, 0, 0]));
        out.push({ f, c: toLL(c), jitter: rnd(), phase: rnd() * 100, speed: 0.35 + rnd() * 0.5 });
      });
    });
    return out;
  }
  const FACETS = icosphere(window.innerWidth < 700 ? 3 : 4); // fewer, bigger facets on phones (and cheaper to draw)
  const LIGHT = (() => { const v = [-0.5, 0.62, 0.7], l = Math.hypot(...v); return v.map((x) => x / l); })();
  let gemRamp = null;
  function readGem() {
    gemRamp = d3.interpolateRgbBasis([1, 2, 3, 4, 5].map((i) => css(`--gem-${i}`)));
  }
  readGem();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readGem(); buildPins(); S.dirty = true; });
  L.facets.selectAll('path').data(FACETS).join('path');

  // glitter: tiny four-point stars stuck to the ocean
  const GLITTER = d3.range(46).map((i) => {
    const u = Math.sin(i * 12.9898) * 43758.5453, v = Math.sin(i * 78.233) * 12543.123;
    const fu = u - Math.floor(u), fv = v - Math.floor(v);
    return { c: [fu * 360 - 180, Math.asin(fv * 1.7 - 0.85) / RAD], size: 2.5 + (i % 4) * 1.4, delay: (i * 0.37) % 3.2 };
  });
  L.glitter.selectAll('g').data(GLITTER).join((enter) => {
    const g = enter.append('g');
    g.append('path').attr('class', 'glint')
      .attr('d', (d) => { const k = d.size; return `M0 ${-k * 2} C${k * .25} ${-k * .4} ${k * .4} ${-k * .25} ${k * 2} 0 C${k * .4} ${k * .25} ${k * .25} ${k * .4} 0 ${k * 2} C${-k * .25} ${k * .4} ${-k * .4} ${k * .25} ${-k * 2} 0 C${-k * .4} ${-k * .25} ${-k * .25} ${-k * .4} 0 ${-k * 2}Z`; })
      .style('animation-delay', (d) => d.delay + 's');
    return g;
  });

  function renderOcean(z, now) {
    const fade = Math.max(0, Math.min(1, 1 - (z - 1.15) / 0.8));
    L.facets.style('opacity', fade).style('display', fade > 0 ? null : 'none');
    L.glitter.style('opacity', fade).style('display', fade > 0 ? null : 'none');
    if (fade <= 0) return;
    const rot = d3.geoRotation(S.rot);
    const t = now / 1000;
    L.facets.selectAll('path').each(function (fc) {
      const [lon, lat] = rot(fc.c);
      const ph = lat * RAD, la = lon * RAD;
      const x = Math.cos(ph) * Math.sin(la), y = Math.sin(ph), zz = Math.cos(ph) * Math.cos(la);
      if (zz < -0.2) { this.setAttribute('d', ''); return; }
      const lit = Math.max(0, x * LIGHT[0] + y * LIGHT[1] + zz * LIGHT[2]);
      const shade = Math.min(1, 0.12 + lit * 0.72 + (fc.jitter - 0.5) * 0.22);
      const glint = Math.pow(Math.max(0, Math.sin(t * fc.speed + fc.phase)), 60) * (zz > 0.2 ? 1 : 0);
      this.setAttribute('d', path(fc.f) || '');
      this.setAttribute('fill', glint > 0.02 ? d3.interpolateRgb(gemRamp(shade), '#ffffff')(glint * 0.85) : gemRamp(shade));
    });
    L.glitter.selectAll('g').each(function (d) {
      const show = visible(d.c);
      this.style.display = show ? '' : 'none';
      if (show) { const p = proj(d.c); this.setAttribute('transform', `translate(${p[0]},${p[1]})`); }
    });
  }

  function render() {
    S.dirty = false;
    proj.rotate(S.rot).scale(S.scale).translate(S.translate);
    const z = S.scale / baseScale;
    const res = z > 2.2 && geo.land['50'] ? '50' : '110';
    const sphere = { type: 'Sphere' };
    const sp = path(sphere);
    L.ocean.attr('d', sp);
    L.sheen.attr('d', sp).style('opacity', Math.max(0, 1 - (z - 1) / 1.2));
    L.cast.attr('cx', S.translate[0]).attr('cy', S.translate[1] + S.scale * 1.02)
      .attr('rx', S.scale * 0.78).attr('ry', S.scale * 0.08).style('opacity', Math.max(0, 1 - (z - 1) / 0.6));
    L.grat.attr('d', z > 1.6 ? path(grat) : null);
    renderOcean(z, performance.now());
    const ld = path(geo.land[res]);
    const off = z > 2 ? 'translate(2,3)' : 'translate(1.2,2.2)';
    L.landShadow.attr('d', ld).attr('transform', off);
    L.landEdge.attr('d', ld);
    L.land.attr('d', ld);
    L.borders.attr('d', path(geo.borders[res]));

    // highlighted countries
    const focus = S.mode === 'trip' ? S.trip : S.hot;
    const feats = focus ? focus.countryIds.map((id) => geo.countries[res].get(id)).filter(Boolean) : [];
    const edgeC = css('--land-edge');
    L.hi.selectAll('path').data(feats, (f) => f.id).join('path')
      .attr('fill', focus ? mix(css('--land-hi'), focus.accent, 0.14) : edgeC)
      .attr('d', path);

    if (S.mode === 'globe' || S.anim) renderGlobeMarks();
    if (S.mode === 'trip' && S.trip) renderTripMarks();
  }

  function renderGlobeMarks() {
    const home = ll(HOME);
    L.arcs.selectAll('path').data(TRIPS, (t) => t.id).join('path')
      .attr('class', (t) => 'arc' + (S.hot ? (S.hot === t ? ' hot' : ' dim') : ''))
      .attr('stroke', (t) => t.accent)
      .attr('d', (t) => path({ type: 'LineString', coordinates: [home, ll(PLACES[t.stops[0].place])] }));

    // position pins
    const shown = [];
    L.pins.selectAll('.pin').each(function () {
      const g = d3.select(this), c = this.__coord, fan = this.__fan || 0;
      if (!c) return;
      const show = visible(c);
      g.style('display', show ? null : 'none');
      g.classed('dim', !!(S.hot && this.__trip && S.hot !== this.__trip));
      if (!show) return;
      const p = proj(c);
      const px = p[0] + fan * 18, py = p[1];
      g.attr('transform', `translate(${px},${py})`);
      g.select('.pin-inner').attr('transform', `rotate(${fan * 16})`);
      shown.push({ node: this, px, py, home: this.__kind === 'home' });
    });
    // place labels greedily: on-screen, off pin heads, off each other
    const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    const heads = shown.map((s) => ({ x: s.px - 15, y: s.py - 33, w: 30, h: 33 }));
    const placed = [];
    const rank = (n) => (n.__kind === 'home' ? 0 : n.__kind === 'trip' ? 1 : 2);
    shown.sort((a, b) => rank(a.node) - rank(b.node)).forEach((sh) => {
      const P = sh.node.__pill; if (!P) return;
      const sides = sh.home ? ['below', 'left-low', 'right-low']
        : sh.node.__kind === 'memory' ? ['above', 'left', 'right', 'left-low', 'right-low']
        : [P.side, 'right', 'left', 'right-low', 'left-low', 'above'].filter((v, k, a) => a.indexOf(v) === k);
      let best = null;
      for (const side of sides) {
        const b = pillBox(sh.node, side), r = { x: sh.px + b.x, y: sh.py + b.y, w: b.w, h: b.h };
        const out = Math.max(0, 6 - r.x) + Math.max(0, r.x + r.w - (W - 6)) + Math.max(0, 40 - r.y) + Math.max(0, r.y + r.h - (H - 6));
        const cost = out * 400 + heads.concat(placed).reduce((a, o) => a + overlap(r, o), 0);
        if (!best || cost < best.cost - 0.5) best = { cost, side, r };
        if (cost === 0) break;
      }
      placed.push(best.r);
      placeSmooth(sh.node, best.side);
    });
  }

  // Avoid label flicker while the globe spins: only switch sides after a few frames.
  function placeSmooth(node, side) {
    const P = node.__pill;
    if (P.cur === side) { P.want = null; return; }
    if (P.want !== side) { P.want = side; P.wantN = 0; }
    if (++P.wantN > 6 || P.cur == null) { placePill(node, side); P.want = null; }
  }

  // ---------------------------------------------------------------- trip marks
  function uniquePlaces(trip) {
    const m = new Map();
    trip.stops.forEach((s, i) => {
      if (!m.has(s.place)) m.set(s.place, { place: s.place, idx: [], stops: [] });
      m.get(s.place).idx.push(i + 1); m.get(s.place).stops.push(s);
    });
    return [...m.values()];
  }

  function curve(a, b, k) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const cx = mx - dy * k, cy = my + dx * k;
    return `Q${cx.toFixed(1)},${cy.toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)}`;
  }

  function routeD(trip) {
    const pts = trip.stops.map((s) => proj(ll(PLACES[s.place])));
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) d += ' ' + curve(pts[i - 1], pts[i], i % 2 ? 0.22 : -0.22);
    return d;
  }

  function leadIn(trip) {
    // A dotted line from the edge of the map toward stop 1, pointing at San Francisco.
    const first = ll(PLACES[trip.stops[0].place]);
    const a = proj(first), b = proj(d3.geoInterpolate(first, ll(HOME))(0.015));
    let dx = b[0] - a[0], dy = b[1] - a[1]; const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    const inset = { l: 18, r: 18, t: 18, b: 18 };
    const tx = dx > 0 ? (W - inset.r - a[0]) / dx : dx < 0 ? (inset.l - a[0]) / dx : Infinity;
    const ty = dy > 0 ? (H - inset.b - a[1]) / dy : dy < 0 ? (inset.t - a[1]) / dy : Infinity;
    const t = Math.max(0, Math.min(tx, ty));
    const e = [a[0] + dx * t, a[1] + dy * t];
    const s = [a[0] + dx * 22, a[1] + dy * 22];
    return { s, e, angle: Math.atan2(-dy, -dx) * 180 / Math.PI, dx, dy };
  }

  function renderTripMarks() {
    const trip = S.trip;
    const d = routeD(trip);
    L.route.select('path.route').attr('d', d).attr('stroke', trip.accent);
    routeMaskPath.attr('d', d);

    const li = leadIn(trip);
    L.route.select('path.leadin').attr('d', `M${li.e[0]},${li.e[1]} L${li.s[0]},${li.s[1]}`);
    L.route.select('g.leadin-plane').attr('transform', `translate(${li.e[0] + (li.s[0] - li.e[0]) * 0.18},${li.e[1] + (li.s[1] - li.e[1]) * 0.18}) rotate(${li.angle})`);

    placeStopLabels();

    L.labels.selectAll('text').each(function (lb) {
      const p = proj([lb.lon, lb.lat]);
      d3.select(this).attr('x', p[0]).attr('y', p[1]);
    });
  }

  function buildTripMarks(trip) {
    L.route.selectAll('*').remove(); L.stops.selectAll('*').remove(); L.labels.selectAll('*').remove();

    L.labels.selectAll('text').data(trip.mapLabels || []).join('text')
      .attr('class', 'country-label').attr('text-anchor', 'middle')
      .style('font-style', (d) => d.sea ? 'italic' : null)
      .style('letter-spacing', (d) => d.sea ? '.12em' : null)
      .text((d) => d.text);

    L.route.append('path').attr('class', 'leadin');
    const pl = L.route.append('g').attr('class', 'leadin-plane');
    pl.append('path').attr('d', 'M-9,-6 L10,0 L-9,6 L-5,0 Z').attr('fill', '#fffaf0').attr('stroke', css('--ink-2')).attr('stroke-width', 1.1).attr('stroke-linejoin', 'round');
    L.route.append('path').attr('class', 'route').attr('mask', 'url(#routeMask)');

    const ups = uniquePlaces(trip);
    const g = L.stops.selectAll('g.stop-pin').data(ups, (u) => u.place).join('g')
      .attr('class', 'stop-pin').attr('tabindex', 0).attr('role', 'button')
      .attr('aria-label', (u) => `${PLACES[u.place].name}: see postcards`);
    g.each(function (u) {
      const el = d3.select(this), place = PLACES[u.place];
      const label = (u.stops[0].label) || place.label || 'right';
      el.append('circle').attr('r', 24).attr('fill', 'transparent');
      const badge = el.append('g').attr('class', 'stop-badge');
      const txt = u.idx.join('·');
      const bw = Math.max(26, 12 + txt.length * 8);
      badge.append('rect').attr('x', -bw / 2).attr('y', -13).attr('width', bw).attr('height', 26).attr('rx', 13)
        .attr('fill', trip.accent).attr('stroke', '#fff').attr('stroke-width', 2.5)
        .style('filter', 'drop-shadow(0 2px 2px rgba(0,0,0,.25))');
      badge.append('text').attr('text-anchor', 'middle').attr('y', 5).attr('fill', '#fff').style('font-size', '13px').text(txt);

      const lg = el.append('g');
      const bg = lg.append('rect').attr('class', 'stop-label-bg').attr('rx', 10).style('filter', 'drop-shadow(0 2px 4px rgba(150,40,90,.25))');
      const t1 = lg.append('text').attr('class', 'stop-label-name').text(place.name);
      const t2 = lg.append('text').attr('class', 'stop-label-date').text(u.stops.map(range).join(' & '));
      const w = Math.max(t1.node().getBBox().width, t2.node().getBBox().width) + 16, h = 38;
      bg.attr('width', w).attr('height', h);
      this.__lab = { lg, w, h, bw, pref: label };
    });
    g.on('click', (e, u) => openPostcards(trip, u.stops[0]))
      .on('keydown', (e, u) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPostcards(trip, u.stops[0]); } })
      .on('pointerenter', (e, u) => { S.hotStop = u.place; S.dirty = true; })
      .on('pointerleave', () => { S.hotStop = null; S.dirty = true; });
  }

  // Greedy label placement: try the preferred side, then the others; keep labels
  // on-screen, off the badges, off each other, and clear of the back button.
  function placeStopLabels() {
    const nodes = L.stops.selectAll('g.stop-pin').nodes();
    const pos = nodes.map((n) => proj(ll(PLACES[n.__data__.place])));
    const obstacles = [{ x: 0, y: 0, w: 64, h: 64 }];
    nodes.forEach((n, i) => { const b = n.__lab.bw; obstacles.push({ x: pos[i][0] - b / 2 - 3, y: pos[i][1] - 16, w: b + 6, h: 32 }); });
    const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    const placed = [];
    nodes.forEach((n, i) => {
      const { lg, w, h, bw, pref } = n.__lab, [px, py] = pos[i];
      const sides = [pref, 'right', 'left', 'bottom', 'top', 'bottom-right', 'top-left', 'bottom-left', 'top-right'].filter((v, k, a) => a.indexOf(v) === k);
      let best = null;
      for (const side of sides) {
        let x, y;
        if (side === 'left') { x = -bw / 2 - 8 - w; y = -h / 2; }
        else if (side === 'right') { x = bw / 2 + 8; y = -h / 2; }
        else if (side === 'top') { x = -w / 2; y = -19 - h; }
        else if (side === 'bottom') { x = -w / 2; y = 19; }
        else if (side === 'bottom-right') { x = 6; y = 16; }
        else if (side === 'bottom-left') { x = -w - 6; y = 16; }
        else if (side === 'top-right') { x = 6; y = -16 - h; }
        else { x = -w - 6; y = -16 - h; }
        const r = { x: px + x, y: py + y, w, h };
        const out = Math.max(0, 6 - r.x) + Math.max(0, r.x + w - (W - 6)) + Math.max(0, 6 - r.y) + Math.max(0, r.y + h - (H - 6));
        const cost = out * 400 + obstacles.concat(placed).reduce((a, o) => a + overlap(r, o), 0);
        if (!best || cost < best.cost) best = { cost, x, y, r };
        if (cost === 0) break;
      }
      placed.push(best.r);
      lg.select('rect').attr('x', best.x).attr('y', best.y);
      lg.select('.stop-label-name').attr('x', best.x + 8).attr('y', best.y + 16);
      lg.select('.stop-label-date').attr('x', best.x + 8).attr('y', best.y + 31);
      d3.select(n).attr('transform', `translate(${px},${py})`).classed('hot', S.hotStop === n.__data__.place);
    });
  }

  function drawRouteIn() {
    routeMaskPath.interrupt().attr('stroke-dashoffset', 1)
      .transition().duration(reduceMotion ? 0 : 1400).ease(d3.easeCubicInOut).attr('stroke-dashoffset', 0);
    L.stops.selectAll('g.stop-pin').style('opacity', 0)
      .transition().delay((u, i) => reduceMotion ? 0 : 150 + i * 220).duration(300).style('opacity', 1);
  }

  // ---------------------------------------------------------------- camera
  function homeView() { return { rot: S.rot.slice(), scale: baseScale, translate: [W / 2, H / 2] }; }

  function fitTrip(trip) {
    const pts = uniquePlaces(trip).map((u) => ll(PLACES[u.place]));
    const lons = pts.map((p) => p[0]), lats = pts.map((p) => p[1]);
    const c = [(d3.min(lons) + d3.max(lons)) / 2, (d3.min(lats) + d3.max(lats)) / 2];
    const rot = [-c[0], -c[1], 0];
    const padX = Math.min(118, W * 0.29), padT = Math.min(78, H * 0.2), padB = Math.min(58, H * 0.16);
    const p = d3.geoOrthographic().rotate(rot).clipAngle(90)
      .fitExtent([[padX, padT], [W - padX, H - padB]], { type: 'MultiPoint', coordinates: pts });
    const scale = Math.min(p.scale(), Math.max(5500, Math.min(W, H) * 8.5)); // keep some context on big screens
    return { rot, scale, translate: p.translate() };
  }

  function lonDelta(a, b) { return ((b - a + 540) % 360) - 180; }

  // `target` may be a function so the destination tracks layout changes mid-flight.
  function animateTo(target, dur, done) {
    const from = { rot: S.rot.slice(), scale: S.scale, translate: S.translate.slice() };
    S.anim = { from, target, t0: performance.now(), dur: reduceMotion ? 1 : dur, done };
  }

  function stepAnim(now) {
    const a = S.anim;
    const to = typeof a.target === 'function' ? a.target() : a.target;
    const k = Math.min(1, (now - a.t0) / a.dur), e = d3.easeCubicInOut(k);
    S.rot = [a.from.rot[0] + lonDelta(a.from.rot[0], to.rot[0]) * e, a.from.rot[1] + (to.rot[1] - a.from.rot[1]) * e, 0];
    S.scale = a.from.scale * Math.pow(to.scale / a.from.scale, e);
    S.translate = [a.from.translate[0] + (to.translate[0] - a.from.translate[0]) * e, a.from.translate[1] + (to.translate[1] - a.from.translate[1]) * e];
    S.dirty = true;
    if (k >= 1) { S.anim = null; a.done && a.done(); }
  }

  function focusRot(trip) {
    const mid = d3.geoInterpolate(ll(HOME), ll(PLACES[trip.stops[0].place]))(0.5);
    return [-mid[0], -Math.max(-35, Math.min(45, mid[1])), 0];
  }

  // ---------------------------------------------------------------- interaction
  function setHot(trip, moveGlobe) {
    if (S.mode !== 'globe') return;
    S.hot = trip; S.dirty = true;
    document.querySelectorAll('.trip-tag').forEach((b) => b.classList.toggle('is-hot', !!trip && b.dataset.id === trip.id));
    if (trip && moveGlobe && !S.dragging) {
      animateTo({ rot: focusRot(trip), scale: baseScale, translate: [W / 2, H / 2] }, 900);
    }
    if (!trip) S.lastInteract = performance.now();
    S.planeT = 0;
  }

  // Globe drag via pointer events. On the phone home page the globe sits in a
  // scrolling page with touch-action: pan-y, so vertical swipes scroll the page
  // (the browser cancels the pointer) and sideways swipes spin the globe.
  let drag = null, justDragged = false;
  const panYOnly = () => getComputedStyle(svgEl).touchAction === 'pan-y';
  svgEl.addEventListener('pointerdown', (e) => {
    if (S.mode !== 'globe' || e.button > 0) return;
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, moved: false, touch: e.pointerType === 'touch' };
  });
  svgEl.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
      drag.moved = true; S.dragging = true; S.anim = null; S.vel = [0, 0];
      svgEl.classList.add('dragging'); $('mapHint').style.opacity = 0;
      try { svgEl.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    }
    const k = (180 / Math.PI) / S.scale;
    const dl = (e.clientX - drag.x) * k;
    const dp = drag.touch && panYOnly() ? 0 : -(e.clientY - drag.y) * k;
    drag.x = e.clientX; drag.y = e.clientY;
    S.rot = [S.rot[0] + dl, Math.max(-70, Math.min(70, S.rot[1] + dp)), 0];
    S.vel = [dl, dp]; S.dirty = true;
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.moved) { justDragged = true; setTimeout(() => { justDragged = false; }, 60); }
    drag = null; S.dragging = false; svgEl.classList.remove('dragging'); S.lastInteract = performance.now();
  }
  svgEl.addEventListener('pointerup', endDrag);
  svgEl.addEventListener('pointercancel', endDrag);
  svgEl.addEventListener('click', (e) => { if (justDragged) { e.stopPropagation(); e.preventDefault(); } }, true);

  // Phones: intro sits above the globe in one scrolling page. Desktop: it heads the side panel.
  const phoneMQ = matchMedia('(max-width: 899px)');
  function placeIntro() {
    const intro = $('intro');
    if (phoneMQ.matches) { if (intro.parentNode !== stage) stage.insertBefore(intro, wrap); }
    else if (intro.parentNode !== $('panelHome')) $('panelHome').prepend(intro);
  }
  phoneMQ.addEventListener('change', placeIntro);
  placeIntro();

  function selectTrip(trip) {
    S.hot = null; S.mode = 'trip'; S.trip = trip; S.vel = [0, 0];
    document.documentElement.style.setProperty('--accent', trip.accent);
    stage.scrollTop = 0;
    stage.classList.add('is-trip');
    tipEl.hidden = true;
    L.pins.style('opacity', 0).style('pointer-events', 'none');
    L.arcs.style('opacity', 0);
    L.plane.style('opacity', 0);
    L.route.style('opacity', 0); L.stops.style('opacity', 0); L.labels.style('opacity', 0);
    buildTripMarks(trip);
    fillPanel(trip);
    $('mapBack').hidden = false;
    animateTo(() => fitTrip(trip), 1700, () => {
      L.route.style('opacity', 1); L.stops.style('opacity', 1); L.labels.style('opacity', 1);
      S.dirty = true; render();
      drawRouteIn();
    });
  }

  function backToGlobe() {
    if (S.mode !== 'trip') return;
    const trip = S.trip;
    S.mode = 'globe';
    stage.classList.remove('is-trip');
    stage.scrollTop = 0;
    document.documentElement.style.removeProperty('--accent');
    L.route.style('opacity', 0); L.stops.style('opacity', 0); L.labels.style('opacity', 0);
    $('mapBack').hidden = true;
    $('panelTrip').hidden = true; $('panelHome').hidden = false;
    $('panel').scrollTop = 0;
    animateTo(() => ({ rot: focusRot(trip), scale: baseScale, translate: [W / 2, H / 2] }), 1500, () => {
      S.trip = null;
      L.pins.style('opacity', 1).style('pointer-events', null);
      L.arcs.style('opacity', 1);
      S.lastInteract = performance.now(); S.dirty = true;
    });
  }

  function openPostcards(trip, stop) { window.Postcards.open(stop, trip); }

  // ---------------------------------------------------------------- panel
  function buildTripList() {
    const ul = $('tripList');
    ul.innerHTML = '';
    TRIPS.forEach((t) => {
      const li = document.createElement('li');
      li.innerHTML = `<button class="trip-tag" type="button" data-id="${t.id}" style="--tc:${t.accent}">
        <span class="tag-hole" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.3 5.3 3.3 1.7-2 3.1-3.3 5.3-3.3 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" fill="currentColor"/></svg></span>
        <span>
          <span class="tag-title">${t.title}</span>
          <span class="tag-sub">${t.subtitle}</span>
          <span class="tag-route">${t.stops.map((s) => PLACES[s.place].name).filter((n, i, a) => a.indexOf(n) === i).join(' · ')}</span>
          ${S.picked === t ? '<span class="tag-picked">♥ Your pick</span>' : ''}
        </span>
      </button>`;
      const b = li.firstElementChild;
      b.addEventListener('mouseenter', () => !coarse && setHot(t, true));
      b.addEventListener('mouseleave', () => !coarse && setHot(null));
      b.addEventListener('focus', () => !coarse && setHot(t, true));
      b.addEventListener('blur', () => !coarse && setHot(null));
      b.addEventListener('click', () => selectTrip(t));
      ul.appendChild(li);
    });
  }

  function fillPanel(trip) {
    $('panelHome').hidden = true; $('panelTrip').hidden = false;
    $('tripCountries').textContent = trip.countries.join(' · ');
    $('tripTitle').textContent = trip.title;
    $('tripTagline').textContent = trip.tagline;
    $('tripDates').textContent = `${fmt(trip.depart)}, 2026 – ${fmt(trip.ret)}, 2027`;

    const ol = $('stopList'); ol.innerHTML = '';
    trip.stops.forEach((s, i) => {
      const n = nightsOf(s), p = PLACES[s.place];
      const li = document.createElement('li');
      li.innerHTML = `<button class="stop" type="button">
        <span class="stop-num">${i + 1}</span>
        <span><span class="stop-city">${p.name}</span>
          <span class="stop-when">${range(s)} · ${n} night${n > 1 ? 's' : ''}</span>
          ${s.note ? `<span class="stop-note">${s.note}</span>` : ''}</span>
        <span class="stop-cta">Postcards</span>
      </button>`;
      const b = li.firstElementChild;
      b.addEventListener('click', () => openPostcards(trip, s));
      b.addEventListener('mouseenter', () => { S.hotStop = s.place; S.dirty = true; });
      b.addEventListener('mouseleave', () => { S.hotStop = null; S.dirty = true; });
      ol.appendChild(li);
    });

    renderBlackTravel(trip);

    const crowd = $('crowd');
    requestAnimationFrame(() => window.CrowdChart.render(crowd, trip));

    const i = TRIPS.indexOf(trip);
    const prev = TRIPS[(i + TRIPS.length - 1) % TRIPS.length], next = TRIPS[(i + 1) % TRIPS.length];
    const nav = $('tripNav'); nav.innerHTML = '';
    [[prev, `← ${prev.title}`], [next, `${next.title} →`]].forEach(([t, label]) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
      b.addEventListener('click', () => { $('panel').scrollTop = 0; selectTrip(t); });
      nav.appendChild(b);
    });
    $('panel').scrollTop = 0;
  }

  // ---------------------------------------------------------------- travel as a Black woman
  const SAFETY_WORDS = ['', 'Take extra care', 'Use caution', 'Safe with care', 'Safe', 'Very safe'];
  const WELCOME_WORDS = ['', 'Expect friction', 'Mixed', 'Comfortable, expect curiosity', 'Very comfortable', 'Feels at home'];
  function meter(label, v, words) {
    const dots = [1, 2, 3, 4, 5].map((i) => `<i class="${i <= v ? 'on' : ''}"></i>`).join('');
    return `<div class="bw-meter"><span class="bw-mlabel">${label}</span><span class="bw-dots" role="img" aria-label="${label}: ${v} out of 5">${dots}</span><span class="bw-word">${words[v]}</span></div>`;
  }
  function renderBlackTravel(trip) {
    const BT = window.TRIP_DATA.BLACK_TRAVEL;
    const places = uniquePlaces(trip);
    $('bwNotes').innerHTML = `
      <p class="bw-summary">${BT.trips[trip.id]}</p>
      ${places.map((u) => {
        const d = BT.places[u.place], p = PLACES[u.place];
        return `<article class="bw-card">
          <h4><span class="bw-num">${u.idx.join('·')}</span>${p.name}</h4>
          ${meter('Safety', d.safety, SAFETY_WORDS)}
          ${meter('Welcome', d.welcome, WELCOME_WORDS)}
          <p class="bw-note">${d.note}</p>
          <p class="bw-tip"><b>Good to know:</b> ${d.tip}</p>
        </article>`;
      }).join('')}`;
  }

  // ---------------------------------------------------------------- pick
  const pickedModal = $('picked');
  $('pickBtn').addEventListener('click', () => {
    const t = S.trip; if (!t) return;
    S.picked = t; buildTripList();
    $('pickedTitle').textContent = t.title;
    $('pickedRoute').textContent = t.stops.map((s) => PLACES[s.place].name).filter((n, i, a) => a.indexOf(n) === i).join(' → ');
    pickedModal.style.setProperty('--accent', t.accent);
    pickedModal.hidden = false;
    confetti(t.accent);
  });
  pickedModal.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => { pickedModal.hidden = true; }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pickedModal.hidden) pickedModal.hidden = true; });

  function confetti(accent) {
    const box = $('confetti'); box.innerHTML = '';
    if (reduceMotion) return;
    const colors = [accent, '#f06292', '#f8bbd0', '#e9c46a', '#fff1c7', '#c9a7e0', '#ffffff'];
    const shapes = [
      '<path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.3 5.3 3.3 1.7-2 3.1-3.3 5.3-3.3 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/>',
      '<path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0Z"/>',
      '<ellipse cx="12" cy="12" rx="6" ry="11"/>',
    ];
    for (let i = 0; i < 110; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + 'vw';
      p.style.color = colors[i % colors.length];
      const size = 10 + Math.random() * 12;
      p.style.width = p.style.height = size + 'px';
      p.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor">${shapes[i % shapes.length]}</svg>`;
      p.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
      p.style.setProperty('--rot', (Math.random() * 900 - 450) + 'deg');
      p.style.animationDuration = (2.2 + Math.random() * 2.2) + 's';
      p.style.animationDelay = (Math.random() * 0.6) + 's';
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      box.appendChild(p);
    }
  }

  $('mapBack').addEventListener('click', backToGlobe);
  $('panelBack').addEventListener('click', backToGlobe);

  // ---------------------------------------------------------------- loop
  let lastT = performance.now();
  function tick(now) {
    const dt = Math.min(50, now - lastT); lastT = now;
    if (S.anim) stepAnim(now);
    else if (S.mode === 'globe' && !S.dragging) {
      if (Math.abs(S.vel[0]) + Math.abs(S.vel[1]) > 0.01) {
        S.rot = [S.rot[0] + S.vel[0], Math.max(-70, Math.min(70, S.rot[1] + S.vel[1])), 0];
        S.vel = [S.vel[0] * 0.93, S.vel[1] * 0.93]; S.dirty = true;
      } else if (!S.hot && !reduceMotion && now - S.lastInteract > 2500) {
        S.rot = [S.rot[0] - dt * 0.004, S.rot[1], 0]; S.dirty = true;
      }
    }
    // paper plane along the hot arc
    if (S.mode === 'globe' && S.hot && !S.anim) {
      S.planeT = (S.planeT + dt / 2600) % 1;
      const interp = d3.geoInterpolate(ll(HOME), ll(PLACES[S.hot.stops[0].place]));
      const c = interp(S.planeT), c2 = interp(Math.min(1, S.planeT + 0.01));
      if (visible(c)) {
        proj.rotate(S.rot).scale(S.scale).translate(S.translate);
        const p = proj(c), p2 = proj(c2);
        const ang = Math.atan2(p2[1] - p[1], p2[0] - p[0]) * 180 / Math.PI;
        L.plane.attr('transform', `translate(${p[0]},${p[1]}) rotate(${ang})`).style('opacity', 1);
      } else L.plane.style('opacity', 0);
    } else L.plane.style('opacity', 0);

    if (S.mode === 'globe' && !reduceMotion) S.dirty = true; // facets glint over time
    if (S.dirty && geo.land['110']) render();
    requestAnimationFrame(tick);
  }

  function resize() {
    W = wrap.clientWidth; H = wrap.clientHeight;
    svg.attr('width', W).attr('height', H).attr('viewBox', `0 0 ${W} ${H}`);
    baseScale = Math.max(80, Math.min(W, H) * (W < 600 ? 0.4 : 0.38));
    if (!S.anim) {
      if (S.mode === 'globe') { S.scale = baseScale; S.translate = [W / 2, H / 2]; }
      else if (S.trip) Object.assign(S, fitTrip(S.trip));
    }
    S.dirty = true;
  }

  // ---------------------------------------------------------------- sparkles
  const SPARK = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0Z"/></svg>';
  function makeSparkles() {
    const box = $('sparkles');
    const colors = ['#f1d27a', '#ffffff', '#f8a5c2', '#e9c46a', '#ffd6e5'];
    const n = window.innerWidth < 600 ? 22 : 38;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('span');
      el.className = 'sparkle';
      el.innerHTML = SPARK;
      const size = 6 + Math.random() * 14;
      Object.assign(el.style, {
        left: Math.random() * 100 + '%', top: Math.random() * 100 + '%',
        width: size + 'px', height: size + 'px', color: colors[i % colors.length],
        animationDelay: (Math.random() * 4) + 's', animationDuration: (2.4 + Math.random() * 3) + 's',
      });
      box.appendChild(el);
    }
    const ring = $('globeSparkles');
    for (let i = 0; i < 7; i++) {
      const el = document.createElement('span');
      el.className = 'sparkle';
      el.innerHTML = SPARK;
      el.style.animationDelay = (i * 0.55) + 's';
      el.style.color = i % 2 ? '#ffffff' : '#f1d27a';
      ring.appendChild(el);
    }
  }
  function placeGlobeSparkles() {
    const els = $('globeSparkles').children;
    const r = baseScale;
    [...els].forEach((el, i) => {
      const a = -2.4 + i * 0.78, k = 1.06 + (i % 3) * 0.07, size = 10 + (i % 3) * 6;
      Object.assign(el.style, {
        left: (W / 2 + Math.cos(a) * r * k - size / 2) + 'px',
        top: (H / 2 + Math.sin(a) * r * k - size / 2) + 'px',
        width: size + 'px', height: size + 'px',
      });
    });
  }

  // ---------------------------------------------------------------- boot
  function ingest(world, res) {
    geo.land[res] = topojson.feature(world, world.objects.land);
    geo.borders[res] = topojson.mesh(world, world.objects.countries, (a, b) => a !== b);
    const fc = topojson.feature(world, world.objects.countries);
    geo.countries[res] = new Map(fc.features.map((f) => [String(f.id), f]));
    S.dirty = true;
  }

  makeSparkles();
  new ResizeObserver(() => { resize(); placeGlobeSparkles(); }).observe(wrap);
  resize();
  S.scale = baseScale; S.translate = [W / 2, H / 2];
  buildTripList();
  if (coarse) $('mapHint').textContent = 'Spin the globe · tap a heart';

  fetch('data/countries-110m.json').then((r) => r.json()).then((w) => {
    ingest(w, '110');
    buildPins();
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(buildPins);
    requestAnimationFrame(tick);
    fetch('data/countries-50m.json').then((r) => r.json()).then((w50) => ingest(w50, '50'));
  });

  // Debug hook for QA scripts.
  window.__app = { selectTrip: (id) => selectTrip(TRIPS.find((t) => t.id === id)), backToGlobe, S };
})();
