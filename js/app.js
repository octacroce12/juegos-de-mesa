(() => {
  const games = (window.GAMES || []).map(g => ({ ...g, slug: g.imagen.replace(/^img\//, '').replace(/\.webp$/, '') }));
  const DIFF_ORDER = ['Apto Kuka', 'Baja', 'Intermedia', 'Alta', 'Gordo tryhard'];
  const DIFF_CLASS = { 'Apto Kuka': 'd-kuka', 'Baja': 'd-baja', 'Intermedia': 'd-intermedia', 'Alta': 'd-alta', 'Gordo tryhard': 'd-gordo' };
  const $ = id => document.getElementById(id);
  const state = { q: '', diff: 'Todas', family: 'Todas', type: 'Todos', sort: 'nota' };
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
  const played = g => g.nota !== null && g.nota !== undefined;
  const coinClass = g => !played(g) ? 'none' : g.nota >= 9 ? 'top' : g.nota <= 4 ? 'low' : '';

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
  }

  /* ---- abanico de los mejor puntuados ---- */
  function renderFan() {
    const top = games.filter(played).sort((a, b) => b.nota - a.nota || a.nombre.localeCompare(b.nombre, 'es')).slice(0, 7);
    const mid = (top.length - 1) / 2;
    $('fan').innerHTML = top.map((g, k) => {
      const off = k - mid;
      return `<button class="fan-card" type="button" data-name="${esc(g.nombre)}" style="--r:${(off * 6).toFixed(1)};--d:${Math.round(Math.abs(off) * Math.abs(off) * 4)};--k:${k};z-index:${10 - Math.round(Math.abs(off))}" aria-label="${esc(g.nombre)}, nota ${fmt(g.nota)}" title="${esc(g.nombre)} · ${fmt(g.nota)}"><img src="${g.imagen}" alt="" decoding="async"></button>`;
    }).join('');
  }

  /* ---- chips ---- */
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
    $('family-chips').innerHTML = chip('Todas', 'Todas', 'family', games.length) + fams.map(([n, e]) => chip(`${e} ${n}`, n, 'family', fCounts[n])).join('');
    // Tipo exacto: solo aparece al elegir una familia con más de un tipo.
    const fam = FAMILIES.find(f => f[0] === state.family);
    const subs = fam ? fam[2].filter(t => tCounts[t]) : [];
    $('type-group').hidden = subs.length < 2;
    $('type-chips').innerHTML = subs.length < 2 ? '' : chip('Todos', 'Todos', 'type', fCounts[state.family]) + subs.map(t => chip(t, t, 'type', tCounts[t])).join('');
  }

  /* ---- filtrado y orden ---- */
  function compute() {
    const q = norm(state.q.trim());
    visible = games.filter(g =>
      (!q || norm(g.nombre).includes(q)) &&
      (state.diff === 'Todas' || g.dificultad === state.diff) &&
      (state.family === 'Todas' || familyOf(g.tipo) === state.family) &&
      (state.type === 'Todos' || g.tipo === state.type));
    const by = {
      nota: (a, b) => (played(b) ? b.nota : -1) - (played(a) ? a.nota : -1) || a.nombre.localeCompare(b.nombre, 'es'),
      nombre: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
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
    grid.innerHTML = visible.map((g, i) => `
      <button class="game" type="button" data-i="${i}" style="--i:${Math.min(i, 14)}" aria-label="${esc(g.nombre)}, ver detalle">
        <div class="box">
          <div class="cover">${coverHTML(g)}</div>
          <span class="coin ${coinClass(g)}" title="${played(g) ? 'Nota final' : 'Todavía sin jugar'}">${played(g) ? fmt(g.nota) : '?'}</span>
        </div>
        <div class="label">
          <h3>${esc(g.nombre)}</h3>
          <div class="tags"><span class="tag type">${esc(g.tipo)}</span><span class="tag ${DIFF_CLASS[g.dificultad] || 'd-baja'}">${esc(g.dificultad)}</span></div>
        </div>
      </button>`).join('');
    $('empty').hidden = visible.length > 0;
    $('result-line').textContent = visible.length === games.length
      ? `Mostrando los ${games.length} juegos`
      : `${visible.length} de ${games.length} juegos`;
    renderChips();
  }

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
    $('m-rating').innerHTML = `<div class="big-coin ${n === null ? 'none' : n <= 4 ? 'low' : ''}">${n === null ? '?' : fmt(n)}</div>
      <div><div class="pips" aria-hidden="true">${Array.from({ length: 10 }, (_, k) => `<i class="${n !== null && k < Math.round(n) ? 'on' : ''}"></i>`).join('')}</div>
      <small>${n === null ? 'Todavía sin jugar' : 'Nota final sobre 10'}</small></div>`;
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
    Object.assign(state, { q: b.dataset.name, diff: 'Todas', family: 'Todas', type: 'Todos' });
    $('search').value = b.dataset.name;
    render();
    openModal(0);
  });
  $('search').addEventListener('input', e => { state.q = e.target.value; render(); });
  $('sort').addEventListener('change', e => { state.sort = e.target.value; render(); });
  $('clear').addEventListener('click', () => {
    Object.assign(state, { q: '', diff: 'Todas', family: 'Todas', type: 'Todos' });
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
      return `<article class="poster" style="--tilt:${tilts[i % tilts.length]}deg;--i:${Math.min(i, 14)}">
        <span class="pin" aria-hidden="true"></span>
        <div class="p-head">SE BUSCA</div>
        <div class="p-sub">Vivo en mi lista, no en mi estantería</div>
        <div class="p-photo"><img src="${w.imagen}" alt="Caja de ${esc(w.nombre)}" loading="lazy" decoding="async"></div>
        <h3 class="p-name">${esc(w.nombre)}</h3>
        <p class="p-phrase">“${esc(w.frase)}”</p>
        <div class="p-reward"><small>${w.precio != null ? 'Recompensa · desde' : 'Recompensa'}</small>${w.precio != null ? `<b>${money(w.precio)}</b>` : '<b class="na">Consultar precio</b>'}</div>
        <a class="p-btn${ml ? ' ml' : ''}" href="${esc(w.url)}" target="_blank" rel="noopener noreferrer">${ml ? 'Buscar en Mercado Libre →' : 'Ver precios en Cazagangas →'}</a>
      </article>`;
    }).join('');
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
    renderStats();
    if (wish) renderWish();
    if (push) history.replaceState(null, '', wish ? '#deseos' : location.pathname + location.search);
  }
  document.querySelector('.tabs').addEventListener('click', e => {
    const t = e.target.closest('.tab');
    if (t) setView(t.dataset.view);
  });
  $('wish-search').addEventListener('input', e => { wstate.q = e.target.value; renderWish(); });
  $('wish-sort').addEventListener('change', e => { wstate.sort = e.target.value; renderWish(); });

  /* ---- init ---- */
  renderStats();
  renderFan();
  renderChips();
  render();
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash === 'deseos') setView('wish', false);
  else if (hash) { const i = visible.findIndex(g => g.slug === hash); if (i >= 0) openModal(i, false); }
})();
