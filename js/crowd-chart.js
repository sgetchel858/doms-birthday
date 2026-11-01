/* Crowd chart: a best-guess daily crowd level for the trip vs London and Edinburgh.
   Three series, one y-axis (0–10), a crosshair tooltip, legend, and a table view. */

window.CrowdChart = (function () {
  const { PLACES, CROWDS, COMPARE } = window.TRIP_DATA;
  const DAY = 864e5;

  const parse = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const iso = (dt) => dt.toISOString().slice(0, 10);
  const fmt = (dt, opts) => dt.toLocaleDateString('en-US', Object.assign({ timeZone: 'UTC', month: 'short', day: 'numeric' }, opts));

  function crowdAt(placeId, day) {
    const c = CROWDS[placeId];
    if (!c) return null;
    return c.days[day] != null ? c.days[day] : c.base;
  }

  function word(v) {
    if (v == null) return '—';
    if (v < 3.5) return 'Quiet';
    if (v < 5.5) return 'Moderate';
    if (v < 7.5) return 'Busy';
    return 'Packed';
  }

  // Build one row per day from Dec 28 to Jan 12 (the days on the ground).
  function rows(trip) {
    const start = parse('2026-12-28'), end = parse('2027-01-12');
    const out = [];
    for (let t = +start; t <= +end; t += DAY) {
      const dt = new Date(t), day = iso(dt);
      const stopIdx = trip.stops.findIndex((s) => day >= s.from && day <= s.to);
      const stop = trip.stops[stopIdx];
      out.push({
        date: dt, day,
        stopIdx,
        place: stop ? PLACES[stop.place].name : 'In the air',
        trip: stop ? crowdAt(stop.place, day) : null,
        london: crowdAt('london', day),
        edinburgh: crowdAt('edinburgh', day),
      });
    }
    return out;
  }

  const avg = (arr) => { const v = arr.filter((x) => x != null); return v.reduce((a, b) => a + b, 0) / v.length; };

  function render(el, trip) {
    const data = rows(trip);
    const series = [
      { key: 'trip', name: 'Your trip', color: 'var(--series-trip)' },
      { key: 'london', name: COMPARE[0].name, color: 'var(--series-london)' },
      { key: 'edinburgh', name: COMPARE[1].name, color: 'var(--series-edinburgh)' },
    ];
    const aTrip = avg(data.map((d) => d.trip));
    const aLon = avg(data.map((d) => d.london));
    const aEdi = avg(data.map((d) => d.edinburgh));
    const vs = aTrip < Math.min(aLon, aEdi) - 0.3 ? 'quieter than' : aTrip > Math.max(aLon, aEdi) + 0.3 ? 'busier than' : 'about as busy as';

    el.innerHTML = `
      <p class="crowd-summary">Overall, <strong>${vs}</strong> a holiday trip to London or Edinburgh.
        Average <strong>${aTrip.toFixed(1)}</strong> vs ${aLon.toFixed(1)} and ${aEdi.toFixed(1)}, out of 10.</p>
      <ul class="crowd-legend">${series.map((s) => `<li><i style="border-color:${s.color}"></i>${s.name}</li>`).join('')}</ul>
      <div class="crowd-figure"><div class="crowd-tip" hidden></div></div>
      <div class="crowd-foot">
        <p class="crowd-note">Our best guess, not official data. 10 = Edinburgh at Hogmanay.</p>
        <button class="crowd-toggle" type="button" aria-expanded="false">Show as table</button>
      </div>
      <div class="crowd-table-wrap" hidden></div>`;

    const fig = el.querySelector('.crowd-figure');
    const tip = fig.querySelector('.crowd-tip');
    const W = Math.max(280, fig.clientWidth || 340), H = 210;
    const m = { top: 22, right: 10, bottom: 44, left: 26 };
    const x = d3.scaleUtc().domain(d3.extent(data, (d) => d.date)).range([m.left, W - m.right]);
    const y = d3.scaleLinear().domain([0, 10]).range([H - m.bottom, m.top]);

    const svg = d3.select(fig).append('svg').attr('viewBox', `0 0 ${W} ${H}`)
      .attr('role', 'img').attr('aria-label', `Estimated daily crowd levels for ${trip.title} compared with London and Edinburgh`);

    // grid + y axis
    const g = svg.append('g').attr('class', 'grid');
    [0, 5, 10].forEach((v) => g.append('line').attr('x1', m.left).attr('x2', W - m.right).attr('y1', y(v)).attr('y2', y(v)));
    const ax = svg.append('g').attr('class', 'axis');
    [0, 5, 10].forEach((v) => ax.append('text').attr('x', m.left - 8).attr('y', y(v) + 4).attr('text-anchor', 'end').text(v));

    // x labels: a few dates
    const ticks = ['2026-12-28', '2027-01-01', '2027-01-06', '2027-01-12'].map(parse);
    ticks.forEach((t, i) => ax.append('text')
      .attr('x', x(t)).attr('y', H - m.bottom + 16)
      .attr('text-anchor', i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle')
      .text(fmt(t)));

    // stop band: where you are each day
    const band = svg.append('g').attr('class', 'band');
    const bandY = H - m.bottom + 24, bandH = 14;
    const half = (x(data[1].date) - x(data[0].date)) / 2;
    const runs = [];
    data.forEach((d) => {
      const last = runs[runs.length - 1];
      if (last && last.stopIdx === d.stopIdx) last.to = d.date; else runs.push({ stopIdx: d.stopIdx, from: d.date, to: d.date });
    });
    runs.forEach((r) => {
      if (r.stopIdx < 0) return;
      const x0 = Math.max(m.left, x(r.from) - half) + 1, x1 = Math.min(W - m.right, x(r.to) + half) - 1;
      band.append('rect').attr('x', x0).attr('y', bandY).attr('width', Math.max(0, x1 - x0)).attr('height', bandH).attr('rx', 4);
      if (x1 - x0 > 14) band.append('text').attr('x', (x0 + x1) / 2).attr('y', bandY + 10.5).attr('text-anchor', 'middle').text(r.stopIdx + 1);
    });

    // lines
    const line = (key) => d3.line().defined((d) => d[key] != null).x((d) => x(d.date)).y((d) => y(d[key])).curve(d3.curveMonotoneX);
    series.slice().reverse().forEach((s) => {
      svg.append('path').attr('class', 'series').attr('stroke', s.color).attr('d', line(s.key)(data));
    });

    // one selective annotation: Hogmanay peak
    const peak = data.find((d) => d.day === '2026-12-31');
    if (peak) svg.append('text').attr('class', 'annot').attr('text-anchor', 'middle').attr('x', x(peak.date)).attr('y', y(10) - 5).text('Hogmanay');

    // hover / touch crosshair
    const hair = svg.append('line').attr('class', 'xhair').attr('y1', m.top).attr('y2', H - m.bottom).style('opacity', 0);
    const dots = series.map((s) => svg.append('circle').attr('class', 'dot').attr('r', 4.5).attr('fill', s.color).style('opacity', 0));
    function show(evt) {
      const [px] = d3.pointer(evt, svg.node());
      const t = x.invert(px); // d3.pointer already returns viewBox units for SVG
      const i = Math.max(0, Math.min(data.length - 1, Math.round((t - data[0].date) / DAY)));
      const d = data[i], cx = x(d.date);
      hair.attr('x1', cx).attr('x2', cx).style('opacity', 1);
      series.forEach((s, k) => dots[k].attr('cx', cx).attr('cy', d[s.key] == null ? -99 : y(d[s.key])).style('opacity', d[s.key] == null ? 0 : 1));
      tip.hidden = false;
      tip.innerHTML = `<b>${fmt(d.date, { weekday: 'short' })} · ${d.place}</b>` + series.map((s) =>
        `<div class="row"><span><i style="background:${s.color}"></i>${s.name}</span><span>${d[s.key] == null ? '—' : d[s.key] + ' · ' + word(d[s.key])}</span></div>`).join('');
      const fw = fig.clientWidth, tw = tip.offsetWidth;
      const left = (cx / W) * fw;
      tip.style.left = Math.min(fw - tw, Math.max(0, left > fw / 2 ? left - tw - 12 : left + 12)) + 'px';
    }
    function hide() { hair.style('opacity', 0); dots.forEach((d) => d.style('opacity', 0)); tip.hidden = true; }
    svg.append('rect').attr('x', m.left).attr('y', 0).attr('width', W - m.left - m.right).attr('height', H - m.bottom + 40)
      .attr('fill', 'transparent')
      .on('pointermove pointerdown', show).on('pointerleave pointercancel', hide);

    // table view
    const btn = el.querySelector('.crowd-toggle'), wrap = el.querySelector('.crowd-table-wrap');
    btn.addEventListener('click', () => {
      const open = wrap.hidden;
      wrap.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Hide table' : 'Show as table';
      if (open && !wrap.innerHTML) {
        wrap.innerHTML = `<table class="crowd-table"><thead><tr><th>Date</th><th>Where</th><th>Trip</th><th>London</th><th>Edinburgh</th></tr></thead><tbody>${
          data.map((d) => `<tr><td>${fmt(d.date)}</td><td>${d.place}</td><td>${d.trip ?? '—'}</td><td>${d.london}</td><td>${d.edinburgh}</td></tr>`).join('')
        }</tbody></table>`;
      }
    });
  }

  return { render, crowdAt, word, rows };
})();
