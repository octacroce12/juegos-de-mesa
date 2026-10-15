/* Modo edición: mueve juegos de la lista de deseos a la colección haciendo un commit en GitHub.
   El token vive solo en este navegador (localStorage) y solo se envía a api.github.com. */
(() => {
  const REPO = 'octacroce12/juegos-de-mesa', BRANCH = 'main', KEY = 'oktapio_gh_token';
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const DIFFS = ['Inicial', 'Baja', 'Intermedia', 'Alta', 'Gordo tryhard'];
  let token = '';
  try { token = localStorage.getItem(KEY) || ''; } catch (e) {}

  const dlg = $('admin');
  const body = $('admin-body');
  const setEdit = on => document.body.classList.toggle('edit', on);
  setEdit(!!token);
  if (token) $('edit-open').textContent = '🔓 Modo edición activo';

  /* ---------- API de GitHub ---------- */
  async function gh(path, opts = {}) {
    const r = await fetch('https://api.github.com/repos/' + REPO + path, {
      ...opts,
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    });
    if (!r.ok) {
      let m = '';
      try { m = (await r.json()).message; } catch (e) {}
      const err = new Error(m || 'Error ' + r.status);
      err.status = r.status;
      throw err;
    }
    return r.json();
  }
  const fromB64 = b => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\s/g, '')), c => c.charCodeAt(0)));
  async function readData(path) {
    const f = await gh('/contents/' + path + '?ref=' + BRANCH);
    const text = fromB64(f.content);
    const a = text.indexOf('['), z = text.lastIndexOf(']');
    return { head: text.slice(0, a), arr: JSON.parse(text.slice(a, z + 1)) };
  }
  const dump = (head, arr) => head + JSON.stringify(arr, null, 1) + ';\n';

  /* Un solo commit con todos los cambios. mutate({games, wish}) modifica los arrays; devuelve {move:[[de, a]]} opcional. */
  async function commit(message, mutate) {
    const ref = await gh('/git/ref/heads/' + BRANCH);
    const head = ref.object.sha;
    const base = (await gh('/git/commits/' + head)).tree.sha;
    const [g, w] = await Promise.all([readData('data/games.js'), readData('data/wishlist.js')]);
    const moves = mutate(g.arr, w.arr) || [];
    const blob = async content => (await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content, encoding: 'utf-8' }) })).sha;
    const tree = [
      { path: 'data/games.js', mode: '100644', type: 'blob', sha: await blob(dump(g.head, g.arr)) },
      { path: 'data/wishlist.js', mode: '100644', type: 'blob', sha: await blob(dump(w.head, w.arr)) },
    ];
    if (moves.length) {
      const all = await gh('/git/trees/' + base + '?recursive=1');
      for (const [from, to] of moves) {
        const e = all.tree.find(t => t.path === from);
        if (e && to) tree.push({ path: to, mode: '100644', type: 'blob', sha: e.sha });
        if (e) tree.push({ path: from, mode: '100644', type: 'blob', sha: null });
      }
    }
    const nt = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: base, tree }) });
    const nc = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: nt.sha, parents: [head] }) });
    await gh('/git/refs/heads/' + BRANCH, { method: 'PATCH', body: JSON.stringify({ sha: nc.sha }) });
  }

  /* ---------- diálogo ---------- */
  const open = html => { body.innerHTML = html; if (!dlg.open) dlg.showModal(); };
  const closeDlg = () => dlg.open && dlg.close();
  $('admin-close').addEventListener('click', closeDlg);
  dlg.addEventListener('click', e => { if (e.target === dlg) closeDlg(); });

  function loginView(msg = '') {
    open(`<h2>Modo edición</h2>
      <p>Con esto podés pasar un juego de la lista de deseos a tu colección (¡Ya lo tengo!) o sacarlo de la lista, directo desde la web.</p>
      <ol class="steps">
        <li>Entrá a <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com/settings/personal-access-tokens/new</a>.</li>
        <li>Nombre: <b>juegos-web</b>. Vencimiento: el que quieras (90 días está bien).</li>
        <li>En <b>Repository access</b> elegí <b>Only select repositories</b> → <b>juegos-de-mesa</b>.</li>
        <li>En <b>Permissions → Repository permissions</b> poné <b>Contents: Read and write</b> (nada más).</li>
        <li>Generá el token, copialo y pegalo acá abajo.</li>
      </ol>
      <p class="warn">Se guarda solo en este navegador y solo se manda a GitHub. No lo compartas con nadie.</p>
      <label class="f">Token<input id="tok" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…"></label>
      <p class="err" id="adm-err">${esc(msg)}</p>
      <div class="m-nav"><button class="btn ghost" id="adm-cancel">Cancelar</button><button class="btn" id="adm-save">Activar</button></div>`);
    $('adm-cancel').onclick = closeDlg;
    $('adm-save').onclick = async () => {
      const t = $('tok').value.trim();
      if (!t) return;
      token = t;
      $('adm-save').disabled = true; $('adm-save').textContent = 'Verificando…';
      try {
        const r = await gh('');
        if (!r.permissions || !r.permissions.push) throw new Error('El token no tiene permiso de escritura (Contents: Read and write).');
        try { localStorage.setItem(KEY, t); } catch (e) {}
        setEdit(true);
        $('edit-open').textContent = '🔓 Modo edición activo';
        statusView('¡Listo! Modo edición activado. Andá a la Lista de deseos y vas a ver el botón ¡Ya lo tengo! en cada cartel.');
      } catch (e) {
        token = '';
        loginView(e.status === 401 ? 'GitHub no aceptó ese token. Revisá que esté completo.' : e.message);
      }
    };
  }
  function statusView(text, extra = '') {
    open(`<h2>Modo edición</h2><p>${esc(text)}</p>${extra}<div class="m-nav"><button class="btn" id="adm-ok">Ok</button></div>`);
    $('adm-ok').onclick = closeDlg;
  }
  function manageView() {
    open(`<h2>Modo edición activo</h2><p>Ya podés usar ¡Ya lo tengo! y Quitar en la lista de deseos.</p>
      <div class="m-nav"><button class="btn ghost" id="adm-out">Cerrar sesión y borrar token</button><button class="btn" id="adm-ok">Ok</button></div>`);
    $('adm-ok').onclick = closeDlg;
    $('adm-out').onclick = () => {
      token = '';
      try { localStorage.removeItem(KEY); } catch (e) {}
      setEdit(false);
      $('edit-open').textContent = '🔑 Modo edición';
      closeDlg();
    };
  }
  $('edit-open').addEventListener('click', () => (token ? manageView() : loginView()));

  /* ---------- ¡Ya lo tengo! ---------- */
  const slugOf = w => w.imagen.replace(/^img\/wl\//, '').replace(/\.webp$/, '');
  function haveView(w) {
    const types = [...new Set((window.GAMES || []).map(g => g.tipo))].sort((a, b) => a.localeCompare(b, 'es'));
    open(`<h2>¡Ya lo tengo!</h2>
      <div class="have-head"><img src="${esc(w.imagen)}" alt=""><b>${esc(w.nombre)}</b></div>
      <div class="f2">
        <label class="f">Tipo<input id="h-tipo" list="h-tipos" placeholder="Estrategia, Cartas…"><datalist id="h-tipos">${types.map(t => `<option value="${esc(t)}">`).join('')}</datalist></label>
        <label class="f">Dificultad<select id="h-dif">${DIFFS.map(d => `<option${d === 'Intermedia' ? ' selected' : ''}>${d}</option>`).join('')}</select></label>
      </div>
      <div class="f2">
        <label class="f">Nota (0 a 10)<input id="h-nota" type="text" inputmode="decimal" autocomplete="off" placeholder="ej: 8,5"></label>
        <label class="f chk"><input id="h-sin" type="checkbox" checked> Todavía sin jugar</label>
      </div>
      <label class="f">Comentario<textarea id="h-com" rows="3" placeholder="Tu frase sin filtro…"></textarea></label>
      <p class="err" id="adm-err"></p>
      <div class="m-nav"><button class="btn ghost" id="adm-cancel">Cancelar</button><button class="btn" id="adm-go">Pasar a mi colección</button></div>`);
    const sin = $('h-sin'), nota = $('h-nota');
    sin.onchange = () => { if (sin.checked) nota.value = ''; };
    nota.oninput = () => { if (nota.value !== '') sin.checked = false; };
    $('adm-cancel').onclick = closeDlg;
    $('adm-go').onclick = async () => {
      const tipo = $('h-tipo').value.trim(), com = $('h-com').value.trim();
      const n = sin.checked ? null : parseFloat(String(nota.value).replace(',', '.'));
      const err = m => { $('adm-err').textContent = m; };
      if (!tipo) return err('Falta el tipo.');
      if (!com) return err('Escribí un comentario.');
      if (n !== null && !(n >= 0 && n <= 10)) return err('La nota tiene que estar entre 0 y 10.');
      const slug = slugOf(w);
      const btn = $('adm-go'); btn.disabled = true; btn.textContent = 'Guardando…';
      try {
        await commit(`Ya tengo ${w.nombre}: pasa de la lista de deseos a la colección`, (games, wish) => {
          const i = wish.findIndex(x => x.id === w.id);
          if (i < 0) throw new Error('Ese juego ya no está en la lista de deseos.');
          wish.splice(i, 1);
          if (!games.some(g => g.imagen === 'img/' + slug + '.webp')) {
            games.push({ id: 'g-' + slug, nombre: w.nombre, tipo, dificultad: $('h-dif').value, nota: n, comentario: com, imagen: 'img/' + slug + '.webp' });
          }
          return [['img/wl/' + slug + '.webp', 'img/' + slug + '.webp']];
        });
        document.querySelector(`.poster[data-id="${w.id}"]`)?.remove();
        if (window.Oktapio) window.Oktapio.confetti();
        statusView('¡Listo! Ya está en tu colección. La web se actualiza sola en 1 o 2 minutos (recargá pasado ese tiempo).');
      } catch (e) { done(e); }
    };
  }
  function done(e) {
    if (e.status === 401 || e.status === 403) return loginView('El token venció o no tiene permiso. Generá uno nuevo.');
    const b = $('adm-go') || $('adm-del');
    if (b) { b.disabled = false; b.textContent = b.id === 'adm-del' ? 'Sí, quitar' : 'Pasar a mi colección'; }
    const el = $('adm-err'); if (el) el.textContent = e.message;
  }

  /* ---------- Quitar de la lista ---------- */
  function removeView(w) {
    open(`<h2>Quitar de la lista</h2><p>¿Sacar <b>${esc(w.nombre)}</b> de la lista de deseos?</p><p class="err" id="adm-err"></p>
      <div class="m-nav"><button class="btn ghost" id="adm-cancel">No</button><button class="btn" id="adm-del">Sí, quitar</button></div>`);
    $('adm-cancel').onclick = closeDlg;
    $('adm-del').onclick = async () => {
      $('adm-del').disabled = true; $('adm-del').textContent = 'Guardando…';
      try {
        await commit(`Saca ${w.nombre} de la lista de deseos`, (games, wish) => {
          const i = wish.findIndex(x => x.id === w.id);
          if (i >= 0) wish.splice(i, 1);
          return [['img/wl/' + slugOf(w) + '.webp', null]];
        });
        document.querySelector(`.poster[data-id="${w.id}"]`)?.remove();
        statusView('Listo, lo saqué. La web se actualiza en 1 o 2 minutos.');
      } catch (e) { done(e); }
    };
  }

  $('posters').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || !token) return;
    const w = (window.WISHLIST || []).find(x => x.id === b.dataset.id);
    if (!w) return;
    (b.dataset.act === 'have' ? haveView : removeView)(w);
  });
})();
