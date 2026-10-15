(() => {
  const games = (window.GAMES || []).map(g => ({ ...g, slug: g.imagen.replace(/^img\//, '').replace(/\.webp$/, '') }));
  const DIFF_ORDER = ['Inicial', 'Baja', 'Intermedia', 'Alta', 'Gordo tryhard'];
  const DIFF_CLASS = { 'Inicial': 'd-inicial', 'Baja': 'd-baja', 'Intermedia': 'd-intermedia', 'Alta': 'd-alta', 'Gordo tryhard': 'd-gordo' };
  const DIFF_ICON = { 'Inicial': '🌱', 'Baja': '🍃', 'Intermedia': '⚙️', 'Alta': '🔥', 'Gordo tryhard': '💀' };
  const $ = id => document.getElementById(id);
  const state = { q: '', diff: 'Todas', family: 'Todas', type: 'Todos', sort: 'nota', layout: 'grid', players: 'Todos', time: 'Todas' };
  try { if (localStorage.getItem('oktapio_layout') === 'shelf') state.layout = 'shelf'; } catch (e) {}
  // Familias para navegar: cada juego conserva su tipo original en la ficha.
  const FAMILIES = [
    ['Cartas', '🃏', ['Cartas', 'Cartas y puntuación', 'Sinergia de cartas', 'Bazas']],
    ['Estrategia', '♟️', ['Estrategia', 'Colocación', 'Colocación de trabajadores', 'Recursos', '1v1']],
    ['Fiesta y familiar', '🎉', ['Fiesta', 'Familiar', 'Memoria', 'Dibujo']],
    ['Cooperativo', '🤝', ['Cooperativo']],
    ['Palabras y saber', '💬', ['Palabras', 'Quiz']],
    ['Misterio y roles ocultos', '🕵️', ['Deducción', 'Roles ocultos']],
    ['Azar y apuestas', '🎲', ['Dados', 'Apuestas']],
    ['Rol y aventura', '🗡️', ['Rol', 'RPG', 'Terror']],
  ];
  const familyOf = t => (FAMILIES.find(f => f[2].includes(t)) || ['Otros'])[0];
  let visible = [];
  let current = -1;
  let view = 'col';
  const wishes = (window.WISHLIST || []).map((w, i) => ({ ...w, order: i }));
  const wstate = { q: '', sort: 'asc' };
  const money = n => '$' + n.toLocaleString('es-AR');

  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const fmt = n => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','));
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hue = s => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 360, 7);
  const colorOf = g => g.color || `hsl(${hue(g.nombre)} 38% 32%)`;
  const played = g => g.nota !== null && g.nota !== undefined;
  /* ---- ficha de partida: jugadores, duración, edad ---- */
  const fmtPl = j => j[1] >= 50 ? `${j[0]}+` : j[0] === j[1] ? `${j[0]}` : `${j[0]}–${j[1]}`;
  const hrs = m => fmt(Math.round(m / 6) / 10);
  const fmtDur = d => {
    const [a, b] = d;
    if (b <= 75) return a === b ? `${a}'` : `${a}–${b}'`;
    if (a === b) return `${hrs(a)} h`;
    return a < 60 ? `${a}'–${hrs(b)} h` : `${hrs(a)}–${hrs(b)} h`;
  };
  const meeples = (j, cap, cls = '') => {
    const n = Math.min(j[1], cap);
    return `<span class="meeples ${cls}" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<svg class="${i < j[0] ? 'on' : 'opt'}"><use href="#meeple"/></svg>`).join('')}${j[1] > cap ? '<b>+</b>' : ''}</span>`;
  };
  const dial = (d, s) => {
    const r = 14, C = 2 * Math.PI * r, cap = 120;
    const a = Math.min(d[0], cap) / cap * C, b = Math.min(d[1], cap) / cap * C;
    return `<svg class="dial" viewBox="0 0 36 36" width="${s}" height="${s}" aria-hidden="true"><g transform="rotate(-90 18 18)"><circle class="d-track" cx="18" cy="18" r="${r}"/><circle class="d-max" cx="18" cy="18" r="${r}" stroke-dasharray="${b.toFixed(1)} ${C.toFixed(1)}"/><circle class="d-min" cx="18" cy="18" r="${r}" stroke-dasharray="${a.toFixed(1)} ${C.toFixed(1)}"/></g></svg>`;
  };
  const factsRow = (g, withAge = true) => {
    const out = [];
    if (g.jugadores) out.push(`<span class="fact" title="${g.jugadores[0]} a ${g.jugadores[1]} jugadores">${meeples(g.jugadores, 4)}<em>${fmtPl(g.jugadores)}</em></span>`);
    if (g.duracion) out.push(`<span class="fact" title="Duración aproximada">${dial(g.duracion, 20)}<em>${fmtDur(g.duracion)}</em></span>`);
    if (g.edad && withAge) out.push(`<span class="fact age" title="Edad mínima recomendada"><b>${g.edad}+</b></span>`);
    return out.length ? `<div class="facts">${out.join('')}</div>` : '';
  };
  const durCenter = d => d[1] <= 75 ? (d[0] === d[1] ? d[0] : `${d[0]}–${d[1]}`) : (d[0] === d[1] ? hrs(d[0]) : `${hrs(d[0])}–${hrs(d[1])}`);
  const factTiles = g => {
    if (!g.jugadores && !g.duracion && !g.edad) return `<div class="tile none">Sin datos de jugadores y duración todavía.</div>`;
    const pl = g.jugadores
      ? `<div class="tile t-pl"><small>Jugadores</small>${meeples(g.jugadores, 8, 'big')}<strong>${g.jugadores[0] === g.jugadores[1] ? (g.jugadores[0] === 1 ? 'Solo 1' : g.jugadores[0]) : g.jugadores[1] >= 50 ? g.jugadores[0] + ' o más' : g.jugadores[0] + ' a ' + g.jugadores[1]}</strong></div>` : '';
    const du = g.duracion
      ? `<div class="tile t-du"><small>Duración</small><span class="dial-wrap">${dial(g.duracion, 64)}<i>${durCenter(g.duracion)}</i></span><strong>${g.duracion[1] <= 75 ? 'minutos' : 'horas'}</strong></div>` : '';
    const ed = g.edad
      ? `<div class="tile t-ed"><small>Edad</small><span class="seal"><b>${g.edad}+</b></span><strong>años</strong></div>` : '';
    return pl + du + ed;
  };
  const tierOf = n => n >= 9.5 ? 't6' : n >= 9 ? 't5' : n >= 8.5 ? 't4b' : n >= 8 ? 't4' : n >= 7 ? 't3' : n >= 5 ? 't2' : 't1';

  // ---- Ficha de nota (SVG plano, estilo ficha de póker): borde segmentado, aro, cara con halo y número ----
  // [claro, claro2, oscuro, oscuro2, aro, cara, halo, texto]
  const PAL = {
    none: ['#6f8b7b', '#5f7a6b', '#243a2f', '#1b2d24', '#6f8b7b', '#3d5648', '#4b6a59', '#e9f3ea'],
    t1: ['#d7d9dc', '#c1c4c8', '#4b5058', '#3b4047', '#d7d9dc', '#eceff2', '#ffffff', '#2c3138'],
    t2: ['#2fa35a', '#268a4a', '#10351f', '#0b2916', '#2fa35a', '#6fd596', '#9be8b6', '#0c3a1e'],
    t3: ['#2b72dc', '#235fb8', '#0f2350', '#0a1a3d', '#2b72dc', '#7db4ff', '#a6ccff', '#0a2252'],
    t4: ['#d62027', '#b5181f', '#3b1219', '#2c0d12', '#d62027', '#f7b719', '#ffcf0a', '#3a1212'],
    t4b: ['#f5b81c', '#d99a10', '#5a3706', '#472a04', '#f5b81c', '#fff0a0', '#fffbd0', '#4a2e05'],
    t5: ['#8a35e6', '#7128c4', '#1d0a3d', '#14072d', '#f5b81c', '#ffd93d', '#fff1a0', '#2a0e55'],
    t6: ['', '', '#1a1030', '#120a24', '#f5b81c', '#ffd93d', '#fff1a0', '#2a0e55']
  };
  const RAINBOW = ['#ff4d5e', '#ff9a2e', '#ffd92e', '#44d17a', '#2ec9e8', '#4b7dff', '#9a5cff', '#ff5cc0'];
  function medalDefs() {
    if (document.getElementById('medal-defs')) return;
    const el = document.createElement('div');
    el.id = 'medal-defs';
    el.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    el.innerHTML = `<svg width="0" height="0" aria-hidden="true"><defs>
      <linearGradient id="m-sweep" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <clipPath id="m-clip"><circle cx="50" cy="50" r="48"/></clipPath></defs></svg>`;
    document.body.appendChild(el);
  }
  const wedge = (a0, a1, r0, r1) => {
    const P = (a, r) => [50 + r * Math.cos(a * Math.PI / 180), 50 + r * Math.sin(a * Math.PI / 180)].map(x => x.toFixed(2));
    const [x0, y0] = P(a0, r1), [x1, y1] = P(a1, r1), [x2, y2] = P(a1, r0), [x3, y3] = P(a0, r0);
    return `M${x0} ${y0}A${r1} ${r1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 0 0 ${x3} ${y3}Z`;
  };
  function medal(n, tier) {
    const k = PAL[tier] ? tier : 't4';
    const [l, l2, d, d2, ring, face, halo, tx] = PAL[k];
    const epic = k === 't5' || k === 't6';
    const txt = n === null ? '?' : fmt(n);
    const fs = txt.length >= 3 ? 25 : txt.length === 2 ? 31 : 38;
    let edge = `<circle cx="50" cy="50" r="48" fill="${d}"/>`;
    for (let i = 0; i < 8; i++) {
      const a0 = -22.5 + i * 45, a1 = a0 + 45;
      const light = i % 2 === 0;
      const c1 = k === 't6' ? RAINBOW[i] : (light ? l : d), c2 = k === 't6' ? RAINBOW[i] : (light ? l2 : d2);
      edge += `<path d="${wedge(a0, a1, 38, 48)}" fill="${c1}"/><path d="${wedge(a0, a1, 38, 42.5)}" fill="${c2}" opacity="${k === 't6' ? .78 : 1}"/>`;
    }
    const sp = k === 't6' ? '<path class="m-sp" d="M12 18l1.8 4.2 4.2 1.8-4.2 1.8L12 30l-1.8-4.2L6 24l4.2-1.8z" fill="#fff"/><path class="m-sp m-sp2" d="M88 70l1.4 3.2 3.2 1.4-3.2 1.4L88 79l-1.4-3-3.2-1.4 3.2-1.4z" fill="#fff"/>' : '';
    const sweep = epic ? '<g clip-path="url(#m-clip)"><g class="m-sweep"><rect x="-30" y="-10" width="20" height="120" fill="url(#m-sweep)" transform="skewX(-20)"/></g></g>' : '';
    return `<svg class="medal" viewBox="0 0 100 100" aria-hidden="true">
      <g class="${k === 't6' ? 'm-spin' : ''}">${edge}</g>
      <circle cx="50" cy="50" r="37.5" fill="${d}"/>
      <circle cx="50" cy="50" r="34.5" fill="${ring}"/>
      <circle cx="50" cy="50" r="31" fill="${d}"/>
      <circle cx="50" cy="50" r="28.5" fill="${face}"/>
      <circle cx="50" cy="50" r="20" fill="${halo}" opacity=".7"/>
      <text x="51.4" y="${n === null ? 64.4 : 62.4}" text-anchor="middle" class="m-n" font-size="${fs}" fill="${d}" fill-opacity=".28">${txt}</text>
      <text x="50" y="${n === null ? 63 : 61}" text-anchor="middle" class="m-n" font-size="${fs}" fill="${tx}">${txt}</text>
      ${sweep}${sp}
    </svg>`;
  }
  const coinClass = g => !played(g) ? 'none' : tierOf(g.nota) + (g.nota >= 9 ? ' top' : g.nota <= 4 ? ' low' : '');

  /* ---- estadísticas ---- */
  function renderStats() {
    if (view === 'wish') return renderWishStats();
    const rated = games.filter(played);
    const items = [
      [games.length, 'juegos'],
      [rated.filter(g => g.nota >= 9).length, 'obras maestras (9+)'],
      [games.length - rated.length, 'sin jugar todavía'],
    ];
    $('stats').innerHTML = items.map(([n, l]) => `<li><b>${n}</b><span>${l}</span></li>`).join('');
    if (typeof countUp === 'function') countUp();
  }

  /* ---- abanico de los mejor puntuados ---- */
  function renderFan() {
    const top = games.filter(played).sort((a, b) => b.nota - a.nota || a.nombre.localeCompare(b.nombre, 'es')).slice(0, 7);
    const mid = (top.length - 1) / 2;
    $('fan').innerHTML = top.map((g, k) => {
      const off = k - mid;
      return `<button class="fan-card" type="button" data-name="${esc(g.nombre)}" style="--r:${(off * 6).toFixed(1)};--d:${Math.round(Math.abs(off) * Math.abs(off) * 4)};--k:${k};--z:${(1.7 - Math.abs(off) * .32).toFixed(2)};z-index:${10 - Math.round(Math.abs(off))}" aria-label="${esc(g.nombre)}, nota ${fmt(g.nota)}" title="${esc(g.nombre)} · ${fmt(g.nota)}"><img src="${g.imagen}" alt="" decoding="async"></button>`;
    }).join('');
  }

  /* ---- chips ---- */
  const SHORT = {'Fiesta y familiar': 'Fiesta', 'Palabras y saber': 'Palabras', 'Misterio y roles ocultos': 'Misterio', 'Azar y apuestas': 'Azar', 'Rol y aventura': 'Aventura'};
  function chip(label, value, group, count) {
    const on = state[group] === value;
    return `<button class="chip" type="button" data-group="${group}" data-value="${esc(value)}" aria-pressed="${on}">${esc(label)}${count != null ? `<small>${count}</small>` : ''}</button>`;
  }
  function renderChips() {
    const dCounts = {}, tCounts = {}, fCounts = {};
    games.forEach(g => {
      dCounts[g.dificultad] = (dCounts[g.dificultad] || 0) + 1;
      tCounts[g.tipo] = (tCounts[g.tipo] || 0) + 1;
      const f = familyOf(g.tipo); fCounts[f] = (fCounts[f] || 0) + 1;
    });
    const diffs = DIFF_ORDER.filter(d => dCounts[d]);
    $('diff-chips').innerHTML = chip('Todas', 'Todas', 'diff', games.length) + diffs.map(d => chip(d, d, 'diff', dCounts[d])).join('');
    const fams = FAMILIES.filter(f => fCounts[f[0]]).map(f => [f[0], f[1]]);
    if (fCounts['Otros']) fams.push(['Otros', '✨']);
    $('family-chips').innerHTML = chip('Todas', 'Todas', 'family', games.length) + fams.map(([n]) => chip(SHORT[n] || n, n, 'family', fCounts[n])).join('');
    const pCounts = {};
    [1, 2, 3, 4, 5, 6, 7].forEach(n => { pCounts[n] = games.filter(g => fitsPlayers(g, n)).length; });
    $('players-chips').innerHTML = chip('Cualquiera', 'Todos', 'players', null) + [1, 2, 3, 4, 5, 6, 7].map(n => chip(n === 7 ? '7 o más' : String(n), String(n), 'players', pCounts[n])).join('');
    const tOpts = [[30, 'Hasta 30′'], [60, 'Hasta 1 h'], [120, 'Hasta 2 h']];
    $('time-chips').innerHTML = chip('Cualquier rato', 'Todas', 'time', null) + tOpts.map(([m, l]) => chip(l, String(m), 'time', games.filter(g => g.duracion && g.duracion[1] <= m).length)).join('');
    // Tipo exacto: solo aparece al elegir una familia con más de un tipo.
    const fam = FAMILIES.find(f => f[0] === state.family);
    const subs = fam ? fam[2].filter(t => tCounts[t]) : [];
    $('type-group').hidden = subs.length < 2;
    $('type-chips').innerHTML = subs.length < 2 ? '' : chip('Todos', 'Todos', 'type', fCounts[state.family]) + subs.map(t => chip(t, t, 'type', tCounts[t])).join('');
  }

  const fitsPlayers = (g, n) => !!g.jugadores && g.jugadores[0] <= n && (n >= 7 ? g.jugadores[1] >= 7 : g.jugadores[1] >= n);

  /* ---- filtrado y orden ---- */
  function compute() {
    const q = norm(state.q.trim());
    visible = games.filter(g =>
      (!q || norm(g.nombre).includes(q)) &&
      (state.diff === 'Todas' || g.dificultad === state.diff) &&
      (state.family === 'Todas' || familyOf(g.tipo) === state.family) &&
      (state.type === 'Todos' || g.tipo === state.type) &&
      (state.players === 'Todos' || fitsPlayers(g, +state.players)) &&
      (state.time === 'Todas' || (g.duracion && g.duracion[1] <= +state.time)));
    const by = {
      nota: (a, b) => (played(b) ? b.nota : -1) - (played(a) ? a.nota : -1) || a.nombre.localeCompare(b.nombre, 'es'),
      nombre: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
      duracion: (a, b) => (a.duracion ? a.duracion[1] : 9999) - (b.duracion ? b.duracion[1] : 9999) || (a.duracion ? a.duracion[0] : 0) - (b.duracion ? b.duracion[0] : 0) || a.nombre.localeCompare(b.nombre, 'es'),
      dificultad: (a, b) => DIFF_ORDER.indexOf(a.dificultad) - DIFF_ORDER.indexOf(b.dificultad) || a.nombre.localeCompare(b.nombre, 'es'),
    };
    visible.sort(by[state.sort]);
  }

  function coverHTML(g) {
    return `<img src="${g.imagen}" alt="Caja de ${esc(g.nombre)}" loading="lazy" decoding="async">`;
  }

  function render() {
    compute();
    const grid = $('grid');
    const shelf = state.layout === 'shelf';
    grid.hidden = shelf;
    $('shelf').hidden = !shelf;
    document.querySelectorAll('.seg-b').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.layout === state.layout)));
    if (shelf) renderShelf();
    else grid.innerHTML = visible.map((g, i) => `
      <button class="game" type="button" data-i="${i}" style="--i:${Math.min(i, 14)}" aria-label="${esc(g.nombre)}, ver detalle">
        <div class="box" style="--c:${colorOf(g)}">
          <div class="cover">${coverHTML(g)}</div>
          ${g.edad ? `<span class="age-seal" title="Edad mínima recomendada: ${g.edad} años"><b>${g.edad}+</b></span>` : ''}
        </div>
        <span class="coin ${coinClass(g)}" title="${played(g) ? 'Nota final' : 'Todavía sin jugar'}">${medal(g.nota, played(g) ? tierOf(g.nota) : 'none')}</span>
        <div class="label">
          <h3>${esc(g.nombre)}</h3>
          <div class="tags"><span class="tag ${DIFF_CLASS[g.dificultad] || 'd-baja'}"><i aria-hidden="true">${DIFF_ICON[g.dificultad] || '🎲'}</i>${esc(g.dificultad)}</span><span class="type-txt">${esc(g.tipo)}</span></div>
          ${factsRow(g, false)}
        </div>
      </button>`).join('');
    $('empty').hidden = visible.length > 0;
    $('result-line').textContent = visible.length === games.length
      ? `Mostrando los ${games.length} juegos`
      : `${visible.length} de ${games.length} juegos`;
    renderChips();
    const nAct = (state.diff !== 'Todas') + (state.family !== 'Todas') + (state.type !== 'Todos') + (state.players !== 'Todos') + (state.time !== 'Todas');
    $('filt-n').textContent = nAct ? '(' + nAct + ')' : '';
  }

  const swap = el => { el.classList.remove('viewin'); void el.offsetWidth; el.classList.add('viewin'); };


  /* ---- estantería ---- */
  const spineSize = g => [36 + hue(g.nombre + 'w') % 24, 206 + hue(g.nombre + 'h') % 48];
  function renderShelf() {
    const el = $('shelf');
    const s = parseFloat(getComputedStyle(el).getPropertyValue('--s')) || 1;
    const avail = el.clientWidth - 48;
    const rows = [];
    let row = [], used = 0;
    visible.forEach((g, i) => {
      const w = spineSize(g)[0] * s + 5;
      if (row.length && used + w > avail) { rows.push(row); row = []; used = 0; }
      row.push([g, i]); used += w;
    });
    if (row.length) rows.push(row);
    el.innerHTML = rows.map(r => `<div class="shelf-row"><div class="books">${r.map(([g, i]) => {
      const [w, h] = spineSize(g);
      const n = played(g) ? g.nota : null;
      const L = g.nombre.length;
      const fs = L <= 13 ? 17 : L <= 22 ? 14.5 : L <= 32 ? 12.5 : 11;
      return `<button class="spine${n !== null && n >= 9 ? ' gold' : ''}" type="button" data-i="${i}" style="--c:${colorOf(g)};--w:${w};--h:${h};--fs:${fs}px" title="${esc(g.nombre)}${n !== null ? ' · ' + fmt(n) : ''}" aria-label="${esc(g.nombre)}, ver detalle">
        <span class="s-name">${esc(g.nombre)}</span>
        <span class="s-coin ${n === null ? 'none' : tierOf(n)}">${medal(n, n === null ? 'none' : tierOf(n), true)}</span>
      </button>`;
    }).join('')}</div></div>`).join('');
  }
  let rzT;
  window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { if (state.layout === 'shelf' && view === 'col') renderShelf(); }, 150); });
  document.querySelector('.seg').addEventListener('click', e => {
    const b = e.target.closest('.seg-b');
    if (!b) return;
    state.layout = b.dataset.layout;
    try { localStorage.setItem('oktapio_layout', state.layout); } catch (e2) {}
    render();
    swap($(state.layout === 'shelf' ? 'shelf' : 'grid'));
  });
  $('shelf').addEventListener('click', e => {
    const b = e.target.closest('.spine');
    if (b) openModal(+b.dataset.i);
  });

  /* ---- modal ---- */
  const modal = $('modal');
  function openModal(i, push = true) {
    if (i < 0 || i >= visible.length) return;
    current = i;
    const g = visible[i];
    const c = $('m-cover');
    c.className = 'm-cover cover';
    c.innerHTML = `<img src="${g.imagen}" alt="Caja de ${esc(g.nombre)}">`;
    $('m-title').textContent = g.nombre;
    $('m-badges').innerHTML = `<span class="tag type">${esc(g.tipo)}</span><span class="tag ${DIFF_CLASS[g.dificultad] || 'd-baja'}">Dificultad: ${esc(g.dificultad)}</span>`;
    const n = played(g) ? g.nota : null;
    const rated = games.filter(played);
    const rank = n === null ? null : 1 + rated.filter(x => x.nota > n).length;
    const below = n === null ? 0 : rated.filter(x => x.nota < n).length;
    const pct = n === null || rated.length < 2 ? null : Math.round(below / (rated.length - 1) * 100);
    const verdict = n === null ? 'Sin jugar todavía' : n >= 9 ? 'Obra maestra' : n >= 8 ? 'Imperdible' : n >= 7 ? 'Muy bueno' : n >= 6 ? 'Buenón' : n >= 5 ? 'Pasable' : 'Flojito';
    const tier = n === null ? 'none' : n >= 9 ? 'top' : n <= 4 ? 'low' : '';
    const hops = n === null ? 0 : Math.max(2, Math.round(n / 1.6));
    $('m-rating').innerHTML = `<div class="score ${tier}" style="--p:${n === null ? 0 : n / 10};--hops:${hops}">
      <div class="s-top">
        <div class="s-num"><b>${n === null ? '?' : fmt(n)}</b><small>${n === null ? '' : '/ 10'}</small></div>
        <div class="s-verdict">${verdict}</div>
      </div>
      <div class="s-track" role="img" aria-label="${n === null ? 'Sin nota' : 'Nota ' + fmt(n) + ' sobre 10'}">
        <div class="s-bar"><i class="s-fill"></i><i class="s-cells"></i></div>
        <span class="s-meeple"><svg viewBox="0 0 40 44" aria-hidden="true"><path d="M20 2c-4.500 0-7 3-7 6.500 0 2.200 1 3.800 2.400 5C11 15.600 7 17.500 3 19.600c-1.300.7-1.500 2.300-.6 3.300l7.600 8.400c.8.900 2 1 3 .3L15 29.600 11 41c-.4 1.200.5 2.400 1.800 2.400h14.400c1.300 0 2.200-1.200 1.800-2.400L25 29.600l2-.1 2.100 2.400c1 .7 2.200.6 3-.3l7.600-8.400c.9-1 .7-2.600-.6-3.300C33 17.500 29 15.600 24.600 13.500 26 12.300 27 10.700 27 8.500 27 5 24.500 2 20 2z"/></svg></span>
        <div class="s-scale"><span>0</span><span>5</span><span>10</span></div>
      </div>
      <p class="s-rank">${n === null ? 'Esperando que alguien lo estrene.' : `Puesto <b>${rank}</b> de ${rated.length}${pct !== null ? ` · mejor que el <b>${pct}%</b> de la colección` : ''}`}</p>
    </div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector('#m-rating .score')?.classList.add('go')));
    c.style.setProperty('--c', colorOf(g));
    $('m-facts').innerHTML = factTiles(g);
    const q = encodeURIComponent(g.nombre);
    $('m-links').innerHTML = `<a class="m-link" href="https://www.cazagangas.com.ar/juegos?titulo=${q}" target="_blank" rel="noopener noreferrer">🛒 Ver en Cazagangas</a><a class="m-link" href="https://boardgamegeek.com/geeksearch.php?action=search&objecttype=boardgame&q=${q}" target="_blank" rel="noopener noreferrer">📚 Ver en BoardGameGeek</a>`;
    $('m-comment').textContent = g.comentario;
    $('m-prev').disabled = i === 0;
    $('m-next').disabled = i === visible.length - 1;
    if (!modal.open) modal.showModal();
    if (push) history.replaceState(null, '', '#' + g.slug);
  }
  function closeModal() { if (modal.open) modal.close(); }
  modal.addEventListener('close', () => history.replaceState(null, '', location.pathname + location.search));
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  $('m-close').addEventListener('click', closeModal);
  $('m-prev').addEventListener('click', () => openModal(current - 1));
  $('m-next').addEventListener('click', () => openModal(current + 1));
  document.addEventListener('keydown', e => {
    if (!modal.open) return;
    if (e.key === 'ArrowLeft') openModal(current - 1);
    if (e.key === 'ArrowRight') openModal(current + 1);
  });

  /* ---- eventos ---- */
  $('grid').addEventListener('click', e => {
    const b = e.target.closest('.game');
    if (b) openModal(+b.dataset.i);
  });
  document.querySelector('.controls').addEventListener('click', e => {
    const c = e.target.closest('.chip');
    if (!c) return;
    state[c.dataset.group] = c.dataset.value;
    if (c.dataset.group === 'family') state.type = 'Todos';
    render();
  });
  $('fan').addEventListener('click', e => {
    const b = e.target.closest('.fan-card');
    if (!b) return;
    Object.assign(state, { q: b.dataset.name, diff: 'Todas', family: 'Todas', type: 'Todos', players: 'Todos', time: 'Todas' });
    $('search').value = b.dataset.name;
    render();
    openModal(0);
  });
  $('search').addEventListener('input', e => { state.q = e.target.value; render(); });
  $('sort').addEventListener('change', e => { state.sort = e.target.value; render(); });
  $('clear').addEventListener('click', () => {
    Object.assign(state, { q: '', diff: 'Todas', family: 'Todas', type: 'Todos', players: 'Todos', time: 'Todas' });
    $('search').value = '';
    render();
  });

  /* ---- lista de deseos ---- */
  function renderWishStats() {
    const priced = wishes.filter(w => w.precio != null);
    const total = priced.reduce((s, w) => s + w.precio, 0);
    const items = [
      [wishes.length, 'juegos buscados'],
      [money(total), 'si me los llevo todos'],
      [money(Math.min(...priced.map(w => w.precio))), 'el más baratito'],
    ];
    $('stats').innerHTML = items.map(([n, l]) => `<li><b>${n}</b><span>${l}</span></li>`).join('');
    countUp();
  }
  function renderWish() {
    const q = norm(wstate.q.trim());
    const list = wishes.filter(w => !q || norm(w.nombre).includes(q));
    const price = (w, dir) => w.precio == null ? Infinity : dir * w.precio;
    const by = {
      asc: (a, b) => price(a, 1) - price(b, 1) || a.nombre.localeCompare(b.nombre, 'es'),
      desc: (a, b) => (a.precio == null) - (b.precio == null) || b.precio - a.precio || a.nombre.localeCompare(b.nombre, 'es'),
      nombre: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
      orden: (a, b) => a.order - b.order,
    };
    list.sort(by[wstate.sort]);
    const tilts = [-1.6, 1.2, -0.8, 1.7, -1.2, 0.7];
    $('posters').innerHTML = list.map((w, i) => {
      const ml = w.tienda !== 'Cazagangas';
      return `<article class="poster" data-id="${esc(w.id)}" style="--tilt:${tilts[i % tilts.length]}deg;--i:${Math.min(i, 14)}">
        <span class="pin" aria-hidden="true"></span>
        <div class="p-head">SE BUSCA</div>
        <div class="p-sub">Vivo en mi lista, no en mi estantería</div>
        <div class="p-photo"><img src="${w.imagen}" alt="Caja de ${esc(w.nombre)}" loading="lazy" decoding="async"></div>
        <h3 class="p-name">${esc(w.nombre)}</h3>
        <p class="p-phrase">“${esc(w.frase)}”</p>
        ${factsRow(w)}
        <div class="p-reward"><small>${w.precio != null ? 'Recompensa · desde' : 'Recompensa'}</small>${w.precio != null ? `<b>${money(w.precio)}</b>` : '<b class="na">Consultar precio</b>'}</div>
        <a class="p-btn${ml ? ' ml' : ''}" href="${esc(w.url)}" target="_blank" rel="noopener noreferrer">${ml ? 'Buscar en Mercado Libre →' : 'Ver precios en Cazagangas →'}</a>
        <div class="p-edit"><button class="p-have" type="button" data-act="have" data-id="${esc(w.id)}">✅ ¡Ya lo tengo!</button><button class="p-del" type="button" data-act="del" data-id="${esc(w.id)}" title="Quitar de la lista">Quitar</button></div>
      </article>`;
    }).join('');
    $('wish-empty').hidden = list.length > 0;
    $('wish-result').textContent = list.length === wishes.length ? `${wishes.length} juegos en la lista de deseos` : `${list.length} de ${wishes.length} juegos`;
    const d = window.PRECIOS_AL ? new Date(window.PRECIOS_AL + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    $('wish-note').textContent = `Precios en pesos, estimados: es el más bajo que encontré en tiendas de Cazagangas el ${d}. Cambian seguido, así que tomalos como referencia y mirá el link.`;
  }
  function setView(v, push = true) {
    view = v;
    const wish = v === 'wish';
    $('view-col').hidden = wish;
    $('view-wish').hidden = !wish;
    $('tab-col').setAttribute('aria-selected', String(!wish));
    $('tab-wish').setAttribute('aria-selected', String(wish));
    $('fan').hidden = wish;
    $('roll-btn').hidden = wish;
    $('bb-roll').hidden = wish;
    document.querySelectorAll('.bb[data-view]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.view === v)));
    if (push) swap($(wish ? 'view-wish' : 'view-col'));
    renderStats();
    if (wish) renderWish();
    if (push) history.replaceState(null, '', wish ? '#deseos' : location.pathname + location.search);
  }
  document.querySelector('.tabs').addEventListener('click', e => {
    const t = e.target.closest('.tab');
    if (t) setView(t.dataset.view);
  });
  document.querySelector('.bottombar').addEventListener('click', e => {
    const b = e.target.closest('.bb');
    if (!b) return;
    if (b.id === 'bb-roll') roll(); else { setView(b.dataset.view); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  });
  $('filt-btn').addEventListener('click', () => {
    const ctl = $('view-col').querySelector('.controls');
    const on = !ctl.classList.contains('open');
    ctl.classList.toggle('open', on);
    $('filt-btn').setAttribute('aria-expanded', String(on));
  });
  $('wish-search').addEventListener('input', e => { wstate.q = e.target.value; renderWish(); });
  $('wish-sort').addEventListener('change', e => { wstate.sort = e.target.value; renderWish(); });


  /* ---- detalles: sonido, confeti, contadores ---- */
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let muted = false;
  try { muted = localStorage.getItem('oktapio_mute') === '1'; } catch (e) {}
  let actx;
  function audio() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function click(vol = .3, freq = 1800) { // golpecito de dado
    if (muted) return;
    const a = audio(); if (!a) return;
    const n = a.sampleRate * .045, buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq * (.8 + Math.random() * .5); f.Q.value = 1.2; g.gain.value = vol;
    src.connect(f).connect(g).connect(a.destination); src.start();
  }
  function clatter() { // varios golpes al caer
    [0, 70, 130, 210, 320].forEach((t, k) => setTimeout(() => click(.45 - k * .06, 1200 + k * 250), t));
  }
  function confetti() {
    if (reduced) return;
    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
    cv.width = innerWidth; cv.height = innerHeight; document.body.appendChild(cv);
    const x = cv.getContext('2d'), cols = ['#e0b83a', '#e8573d', '#3aa98f', '#5b8def', '#f4f0df', '#c06bd1'];
    const ps = Array.from({ length: 170 }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .6, vx: (Math.random() - .5) * 16, vy: -Math.random() * 17 - 6, s: 6 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[Math.random() * cols.length | 0] }));
    let t0 = performance.now();
    (function frame(t) {
      const dt = Math.min(2, (t - t0) / 16.7); t0 = t;
      x.clearRect(0, 0, cv.width, cv.height);
      let alive = 0;
      ps.forEach(p => { p.vy += .35 * dt; p.vx *= .995; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; if (p.y < cv.height + 20) alive++; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .6); x.restore(); });
      if (alive) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  }
  window.Oktapio = { confetti };
  if (!reduced && window.matchMedia && matchMedia('(hover: hover)').matches) {
    let raf = 0, ev;
    window.addEventListener('mousemove', e => {
      ev = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const sp = $('spot');
        sp.style.setProperty('--sx', ev.clientX + 'px'); sp.style.setProperty('--sy', ev.clientY + 'px');
        const hero = document.querySelector('.hero');
        if (hero.getBoundingClientRect().bottom > 0) {
          hero.style.setProperty('--mx', ((ev.clientX / innerWidth) * 2 - 1).toFixed(3));
          hero.style.setProperty('--my', ((ev.clientY / innerHeight) * 2 - 1).toFixed(3));
        }
      });
    });
  }
  function countUp() {
    if (reduced) return;
    document.querySelectorAll('#stats b').forEach(b => {
      const txt = b.textContent, n = parseInt(txt.replace(/\D/g, ''), 10), money = txt.startsWith('$');
      if (!(n > 0)) return;
      const t0 = performance.now(), dur = 900;
      (function step(t) {
        const k = Math.min(1, (t - t0) / dur), v = Math.round(n * (1 - Math.pow(1 - k, 3)));
        b.textContent = (money ? '$' : '') + (money ? v.toLocaleString('es-AR') : v);
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    });
  }

  /* ---- ¿Qué jugamos hoy? ---- */
  const rollDlg = $('roll');
  function syncMute() { $('roll-mute').textContent = muted ? '🔇' : '🔊'; }
  syncMute();
  $('roll-mute').addEventListener('click', () => { muted = !muted; try { localStorage.setItem('oktapio_mute', muted ? '1' : '0'); } catch (e) {} syncMute(); });
  function roll() {
    compute();
    if (!visible.length) return;
    const pick = Math.floor(Math.random() * visible.length);
    const winner = visible[pick];
    const finish = () => { rollDlg.close(); render(); openModal(visible.findIndex(g => g.id === winner.id)); };
    if (reduced) { finish(); return; }
    const img = $('roll-img'), name = $('roll-name');
    name.textContent = 'Tirando los dados…';
    rollDlg.classList.remove('landed');
    rollDlg.showModal();
    const seq = Array.from({ length: 16 }, () => visible[Math.floor(Math.random() * visible.length)]);
    seq.push(winner);
    let k = 0, delay = 60;
    (function tick() {
      const g = seq[k];
      img.src = g.imagen; click(.28, 1500 + Math.random() * 900);
      if (k === seq.length - 1) {
        name.textContent = g.nombre; rollDlg.classList.add('landed'); clatter();
        setTimeout(finish, 1100); return;
      }
      k++; delay *= 1.13;
      setTimeout(tick, delay);
    })();
  }
  $('roll-btn').addEventListener('click', roll);
  rollDlg.addEventListener('click', e => { if (e.target === rollDlg) rollDlg.close(); });

  /* ---- temas ---- */
  const THEME_COLOR = { fieltro: '#14241b', madera: '#3e2411', noche: '#0c1128' };
  function setTheme(t, save = true) {
    if (!THEME_COLOR[t]) t = 'fieltro';
    document.documentElement.dataset.theme = t;
    document.querySelector('meta[name="theme-color"]').content = THEME_COLOR[t];
    document.querySelectorAll('.sw').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.theme === t)));
    if (save) { try { localStorage.setItem('oktapio_theme', t); } catch (e) {} }
  }
  document.querySelector('.themes').addEventListener('click', e => {
    const b = e.target.closest('.sw');
    if (b) setTheme(b.dataset.theme);
  });
  setTheme(document.documentElement.dataset.theme || 'fieltro', false);

  /* ---- init ---- */
  renderStats();
  renderFan();
  medalDefs();
  renderChips();
  render();
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash === 'deseos') setView('wish', false);
  else if (hash) { const i = visible.findIndex(g => g.slug === hash); if (i >= 0) openModal(i, false); }
})();
