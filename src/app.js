/* RecipeFlow — web app: dati, navigazione e schermate. */
'use strict';
(function () {
  const RF = window.RF, Ai = RF.Ai;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = n => RF.icon(n);
  const kcal = v => String(Math.round(v));
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

  // =====================================================================
  // DATI (salvati nel telefono: localStorage + IndexedDB per le foto)
  // =====================================================================
  const KEY = 'recipeflow.v1';
  const S = {
    favorites: [], imported: [], shopping: [], plan: {}, fridge: [], staples: true, household: 2, personal: {}, webCache: {}, hidden: [], history: [],
    geminiKey: '', geminiModel: RF.DEFAULT_MODEL, lang: 'it', accent: 'Menta', appearance: 'system', speakSteps: false, speakRate: 1
  };
  let builtin = [];

  function load() {
    try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { }
    S.favorites = S.favorites.map(RF.normRecipe);
    S.imported = S.imported.map(RF.normRecipe);
    for (const k in S.webCache) S.webCache[k] = RF.normRecipe(S.webCache[k]);
    for (const k in S.plan) S.plan[k].recipe = RF.normRecipe(S.plan[k].recipe);
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast('Memoria piena: elimina qualche ricetta cercata sul web'); }
  }

  const ai = () => new Ai(S.geminiKey, S.geminiModel, S.lang);
  const baseId = id => (id || '').replace('-light', '');
  const find = (l, id) => l.find(r => r.id === id);
  // Il ricettario parte VUOTO: le ricette di esempio si aggiungono a mano e diventano «tue».
  const visibleBuiltin = () => [];
  const samplesLeft = () => builtin.filter(r => !find(S.imported, r.id)).length;
  function addSamples() {
    let n = 0;
    for (const r of builtin) if (!find(S.imported, r.id)) { S.imported.push(RF.copy(r)); n++; }
    S.hidden = [];
    save();
    return n;
  }
  function deleteAllMine() {
    for (const r of S.imported.slice()) del(r);
  }
  function localRecipes() {
    const out = S.imported.slice();
    for (const r of visibleBuiltin()) if (!find(out, r.id)) out.push(r);
    return out;
  }
  function allKnown() {
    const out = localRecipes();
    for (const r of S.favorites) if (!find(out, r.id) && !Ai.isStub(r)) out.push(r);
    for (const r of Object.values(S.webCache)) if (!find(out, r.id)) out.push(r);
    return out;
  }
  const cached = r => Ai.isStub(r) ? (S.webCache[r.id] || r) : r;
  const byId = id => find(S.imported, id) || find(builtin, id) || S.webCache[id] || find(S.favorites, id);
  const isFav = r => !!find(S.favorites, baseId(r.id));
  const isMine = r => !!find(S.imported, baseId(r.id));
  const isBuiltin = r => !!find(builtin, baseId(r.id));
  function toggleFav(r) {
    const id = baseId(r.id), f = find(S.favorites, id);
    if (f) S.favorites.splice(S.favorites.indexOf(f), 1);
    else { let c = RF.copy(r.light ? (byId(id) || r) : r); c.id = id; S.favorites.unshift(c); }
    save();
  }
  function saveMine(r) {
    const id = baseId(r.id);
    const old = find(S.imported, id);
    if (old) S.imported.splice(S.imported.indexOf(old), 1);
    S.imported.unshift(r);
    const fav = find(S.favorites, id);
    if (fav) S.favorites[S.favorites.indexOf(fav)] = RF.copy(r);
    if (S.webCache[id]) S.webCache[id] = RF.copy(r);
    for (const k of Object.keys(S.plan)) {
      if (baseId(S.plan[k].recipe.id) === id) {
        S.plan[k].recipe = RF.copy(r);
      }
    }
    save();
  }
  function del(r) {
    const id = baseId(r.id);
    const m = find(S.imported, id);
    if (m) { S.imported.splice(S.imported.indexOf(m), 1); const p = S.personal[id]; if (p && p.photo) Photos.remove(p.photo); delete S.personal[id]; }
    delete S.webCache[id];
    const f = find(S.favorites, id);
    if (f) S.favorites.splice(S.favorites.indexOf(f), 1);
    for (const k of Object.keys(S.plan)) if (baseId(S.plan[k].recipe.id) === id) delete S.plan[k];
    save();
  }
  const personal = id => Object.assign({ rating: 0, notes: '', photo: '', cooked: 0 }, S.personal[baseId(id)] || {});
  const setPersonal = (id, p) => { S.personal[baseId(id)] = p; save(); };
  function addHistory(q) {
    q = q.trim(); if (!q) return;
    S.history = [q, ...S.history.filter(h => h.toLowerCase() !== q.toLowerCase())].slice(0, 8);
    save();
  }

  // ---- spesa ----
  const aisleGroup = a => RF.AISLES.includes(a) ? a : 'Altro';
  function addToShopping(r, factor, onlyMissing) {
    let added = 0;
    for (const i of r.ingredients) {
      const low = i.name.toLowerCase();
      if (i.unit === 'q.b.' || low.startsWith('acqua') || low.startsWith('water')) continue;
      if (onlyMissing && RF.pantryHas(S.fridge, S.staples, i.name)) continue;
      const key = RF.pnorm(i.name);
      const f = S.shopping.find(s => !s.checked && RF.pnorm(s.name) === key && s.unit === i.unit);
      if (f) { f.amount += i.amount * factor; if (!f.recipes.includes(r.title)) f.recipes += ', ' + r.title; }
      else { S.shopping.push({ name: i.name, amount: i.amount * factor, unit: i.unit, aisle: i.aisle || RF.aisleOf(i.name), recipes: r.title, checked: false }); added++; }
    }
    save();
    return added;
  }
  function addManual(text) {
    const p = RF.parseLine(text);
    S.shopping.push({ name: p.name, amount: p.amount, unit: p.unit, aisle: RF.aisleOf(p.name), recipes: '', checked: false });
    save();
  }
  const shopQty = s => RF.quantityLabel({ amount: s.amount, unit: s.unit || '' });
  function shoppingText() {
    let t = 'LISTA DELLA SPESA\n';
    for (const a of RF.AISLES) {
      const items = S.shopping.filter(i => !i.checked && aisleGroup(i.aisle) === a);
      if (!items.length) continue;
      t += '\n' + a.toUpperCase() + '\n' + items.map(i => '☐ ' + i.name + (shopQty(i) ? ' — ' + shopQty(i) : '')).join('\n') + '\n';
    }
    return t;
  }

  // ---- piano ----
  const LUNCH = 'pranzo', DINNER = 'cena';
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const planKey = (d, meal) => ymd(d) + '|' + meal;
  function monday(offset) {
    const d = new Date(); d.setHours(12, 0, 0, 0);
    const dow = d.getDay(); // domenica = 0
    d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1) + 7 * offset);
    return d;
  }
  const fmtDate = (d, opts) => d.toLocaleDateString('it-IT', opts);

  /** Prepara la ricetta completa di un'idea e la ricorda. */
  async function resolve(r, progress) {
    if (!Ai.isStub(r)) return r;
    if (S.webCache[r.id]) return S.webCache[r.id];
    const full = await ai().webRecipe(r.kind.slice(5), progress);
    full.id = r.id; full.kind = '';
    S.webCache[r.id] = full;
    for (const k in S.plan) if (S.plan[k].recipe.id === r.id) S.plan[k].recipe = full;
    const fav = find(S.favorites, r.id);
    if (fav) S.favorites[S.favorites.indexOf(fav)] = RF.copy(full);
    save();
    return full;
  }

  // =====================================================================
  // FOTO (IndexedDB)
  // =====================================================================
  const Photos = {
    db: null, urls: {},
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((ok, ko) => {
        const req = indexedDB.open('recipeflow-photos', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('p');
        req.onsuccess = () => { this.db = req.result; ok(this.db); };
        req.onerror = () => ko(req.error);
      });
    },
    async put(name, blob) {
      const db = await this.open();
      await new Promise((ok, ko) => { const t = db.transaction('p', 'readwrite'); t.objectStore('p').put(blob, name); t.oncomplete = ok; t.onerror = () => ko(t.error); });
    },
    async url(name) {
      if (!name) return null;
      if (this.urls[name]) return this.urls[name];
      try {
        const db = await this.open();
        const blob = await new Promise(ok => { const q = db.transaction('p').objectStore('p').get(name); q.onsuccess = () => ok(q.result); q.onerror = () => ok(null); });
        return blob ? (this.urls[name] = URL.createObjectURL(blob)) : null;
      } catch (e) { return null; }
    },
    async remove(name) {
      try { const db = await this.open(); db.transaction('p', 'readwrite').objectStore('p').delete(name); } catch (e) { }
    }
  };

  /** Chiede una foto, la ridimensiona (max 1400 px) e la salva. */
  function pickPhoto() {
    return new Promise(resolveP => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = async () => {
        const f = inp.files && inp.files[0];
        if (!f) return resolveP(null);
        try {
          const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' }).catch(() => createImageBitmap(f));
          const s = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
          const c = document.createElement('canvas');
          c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
          c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
          const blob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.84));
          const name = 'p-' + Date.now().toString(36) + '.jpg';
          await Photos.put(name, blob);
          resolveP(name);
        } catch (e) { toast('Non riesco a leggere la foto'); resolveP(null); }
      };
      inp.click();
    });
  }

  // =====================================================================
  // TEMA
  // =====================================================================
  const ACCENTS = [['Menta', '#2ED47A', '#B8F26B'], ['Brace', '#FF6B4A', '#FFB547'], ['Oceano', '#22D3EE', '#828CF8'], ['Lavanda', '#C084FC', '#F472B6'], ['Salvia', '#16A34A', '#84CC16'], ['Crema', '#E85A0D', '#F59E0B']];
  const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const lum = h => { const [r, g, b] = hex2rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  const mixHex = (a, b, t) => { const x = hex2rgb(a), y = hex2rgb(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  let dark = false;
  function applyTheme() {
    const sys = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
    dark = S.appearance === 'dark' || (S.appearance !== 'light' && sys);
    const [, a, b] = ACCENTS.find(x => x[0] === S.accent) || ACCENTS[0];
    const root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.style.setProperty('--accent', a);
    root.style.setProperty('--accent2', b);
    root.style.setProperty('--on-accent', lum(a) > 0.55 ? '#0B1A10' : '#FFFFFF');
    root.style.setProperty('--hilite', dark ? mixHex(a, '#ffffff', 0.25) : mixHex(a, '#000000', 0.3));
    RF.setAccent(parseInt(a.slice(1), 16));
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#0E1013' : '#F5F6F3';
  }

  // =====================================================================
  // MATTONCINI DELL'INTERFACCIA (stringhe HTML)
  // =====================================================================
  const A = (a, x) => `data-a="${a}"${x !== undefined ? ` data-x="${esc(x)}"` : ''}`;
  const btn = (label, icon, kind, a, x) => `<button class="btn ${kind || ''}" ${A(a, x)}>${icon ? ic(icon) : ''}<span>${esc(label)}</span></button>`;
  const ibtn = (icon, a, x, cls = '') => `<button class="ibtn ${cls}" ${A(a, x)} aria-label="${icon}">${ic(icon)}</button>`;
  const chip = (label, on, a, x) => `<button class="chip ${on ? 'on' : ''}" ${A(a, x)}>${esc(label)}</button>`;
  const pill = (label, cls = '') => `<span class="pill ${cls}">${esc(label)}</span>`;
  const toggle = (on, a, x) => `<label class="sw"><input type="checkbox" ${on ? 'checked' : ''} data-c="${a}"${x !== undefined ? ` data-x="${esc(x)}"` : ''}><span></span></label>`;
  const stepper = (v, aMinus, aPlus, x) => `<div class="stepper">${ibtn('minus', aMinus, x)}<span class="v">${esc(v)}</span>${ibtn('plus', aPlus, x)}</div>`;
  const toggleRow = (title, sub, on, a, x) => `<div class="row"><div class="grow"><h3>${esc(title)}</h3>${sub ? `<div class="muted mt4">${esc(sub)}</div>` : ''}</div>${toggle(on, a, x)}</div>`;
  const empty = (icon, title, sub) => `<div class="empty">${ic(icon)}<h3>${esc(title)}</h3>${sub ? `<p class="muted">${esc(sub)}</p>` : ''}</div>`;
  const GRADE_COLORS = { A: '#1FAA59', B: '#7BC043', C: '#F2B01E', D: '#F07F1D', E: '#E5484D' };
  const gradeBadge = (g, size) => `<span class="grade" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.45)}px;background:${GRADE_COLORS[g]}">${g}</span>`;

  function hashStr(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.codePointAt(0)) | 0; return Math.abs(h); }
  function coverBg(r) {
    const a = (ACCENTS.find(x => x[0] === S.accent) || ACCENTS[0])[1];
    const [rr, gg, bb] = hex2rgb(a).map(v => v / 255);
    const mx = Math.max(rr, gg, bb), mn = Math.min(rr, gg, bb);
    let h = 0;
    if (mx !== mn) h = mx === rr ? 60 * (((gg - bb) / (mx - mn)) % 6) : mx === gg ? 60 * ((bb - rr) / (mx - mn) + 2) : 60 * ((rr - gg) / (mx - mn) + 4);
    h = (h + (hashStr(r.title || '') % 90) - 45 + 360) % 360;
    return dark ? `linear-gradient(135deg, hsl(${h} 45% 30%), hsl(${(h + 35) % 360} 45% 19%))` : `linear-gradient(135deg, hsl(${h} 70% 82%), hsl(${(h + 35) % 360} 60% 68%))`;
  }
  /** Copertina: la tua foto (caricata dopo) oppure fondo colorato con l'emoji del piatto. */
  function cover(r, cls = '', extra = '') {
    const p = personal(r.id);
    return `<div class="cv ${cls}" style="background-image:${coverBg(r)}" ${p.photo ? `data-photo="${esc(p.photo)}"` : ''}><div class="plate"><span class="emo">${RF.emoji(r)}</span></div>${extra}</div>`;
  }
  async function hydratePhotos(root) {
    for (const el of root.querySelectorAll('[data-photo]')) {
      const u = await Photos.url(el.dataset.photo);
      if (u) { el.style.backgroundImage = `url("${u}")`; el.classList.add('photo'); }
    }
  }
  function recipeCard(r0) {
    const r = cached(r0), stub = Ai.isStub(r);
    let badges = '';
    if (!stub && r.ingredients.length) badges += `<span class="badge">${gradeBadge(RF.grade(RF.balanceScore(r)), 26)}</span>`;
    if (isFav(r)) badges += `<span class="fav" style="color:#FF4D6D">${ic('heartFill')}</span>`;
    else if (RF.hasTag(r, 'Virale')) badges += `<span class="fav" style="color:#FF8A00">${ic('flame')}</span>`;
    const meta = (r.minutes > 0 ? r.minutes + ' min · ' : '') + (stub ? 'idea dal web' : kcal(RF.perServing(r).kcal) + ' kcal');
    return `<div class="rc" data-a="openId" data-x="${esc(r.id)}" data-long="recipeMenu">${cover(r, '', badges)}<div class="info"><div class="t">${esc(r.title)}</div><div class="m">${esc(meta)}</div></div></div>`;
  }
  const grid = list => `<div class="grid">${list.map(recipeCard).join('')}</div>`;
  const miniRow = (r, a, x, sub) => `<div class="lrow" ${A(a, x)}>${cover(r, 'mini s')}<div class="grow"><h3>${esc(r.title)}</h3><div class="muted mt4">${esc(sub)}</div></div></div>`;

  // =====================================================================
  // FINESTRE, AVVISI, ATTESA
  // =====================================================================
  function overlay(html, center, onClose) {
    const o = document.createElement('div');
    o.className = 'overlay' + (center ? ' center' : '');
    o.innerHTML = `<div class="sheet">${html}</div>`;
    o.addEventListener('click', e => { if (e.target === o && onClose !== false) { o.remove(); onClose && onClose(); } });
    document.body.appendChild(o);
    return o;
  }
  function alertBox(title, msg) {
    const o = overlay(`<h2>${esc(title)}</h2><p class="muted" style="white-space:pre-wrap">${esc(msg)}</p><div class="btns"><button class="btn pri">OK</button></div>`, true);
    $('.btn', o).onclick = () => o.remove();
  }
  function confirmBox(title, msg, yes, onYes, danger) {
    const o = overlay(`<h2>${esc(title)}</h2><p class="muted">${esc(msg)}</p><div class="btns"><button class="btn" data-k="no">Annulla</button><button class="btn ${danger ? 'danger' : 'pri'}" data-k="yes">${esc(yes)}</button></div>`, true);
    $('[data-k=no]', o).onclick = () => o.remove();
    $('[data-k=yes]', o).onclick = () => { o.remove(); onYes(); };
  }
  function choose(title, items, onPick, dangerIdx = -1) {
    const o = overlay(`<h2>${esc(title)}</h2>${items.map((t, i) => `<button class="opt ${i === dangerIdx ? 'danger' : ''}" data-i="${i}">${esc(t)}</button>`).join('')}<div class="btns"><button class="btn block" data-k="no">Annulla</button></div>`);
    o.querySelectorAll('.opt').forEach(b => b.onclick = () => { o.remove(); onPick(+b.dataset.i); });
    $('[data-k=no]', o).onclick = () => o.remove();
  }
  function ask(title, hint, initial, multi, onOk, { allowEmpty = false, ok = 'OK' } = {}) {
    const field = multi ? `<textarea class="input" rows="5" placeholder="${esc(hint)}">${esc(initial || '')}</textarea>` : `<input class="input" placeholder="${esc(hint)}" value="${esc(initial || '')}">`;
    const o = overlay(`<h2>${esc(title)}</h2><div class="mt12">${field}</div><div class="btns"><button class="btn" data-k="no">Annulla</button><button class="btn pri" data-k="yes">${esc(ok)}</button></div>`, true);
    const inp = $('.input', o);
    setTimeout(() => inp.focus(), 50);
    const go = () => { const v = inp.value.trim(); if (v || allowEmpty) { o.remove(); onOk(v); } };
    $('[data-k=no]', o).onclick = () => o.remove();
    $('[data-k=yes]', o).onclick = go;
    if (!multi) inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }
  let toastEl;
  function toast(msg) {
    if (toastEl) toastEl.remove();
    toastEl = document.createElement('div');
    toastEl.className = 'toast'; toastEl.textContent = msg;
    document.body.appendChild(toastEl);
    const me = toastEl;
    setTimeout(() => me.remove(), 2600);
  }
  /** Lavoro lungo con pannello di attesa e stato aggiornato. */
  async function run(startMsg, work) {
    const o = overlay(`<div class="spinner"></div><p style="text-align:center;margin-top:16px" class="msg">${esc(startMsg)}</p><p class="muted" style="text-align:center">Può volerci fino a un minuto</p>`, true, false);
    const msg = $('.msg', o);
    try { return await work(m => { msg.textContent = m; }); }
    catch (e) { alertBox('Non è andata', e.message || String(e)); throw e; }
    finally { o.remove(); }
  }
  function needKey() {
    const o = overlay(`<h2>Serve la chiave di Gemini</h2><p class="muted">Per cercare ricette sul web, proporre idee e menù RecipeFlow usa Google Gemini, gratuito.</p>
      <p class="muted">Crea la chiave in un minuto su aistudio.google.com (accedi con Google → Create API key) e incollala nelle Impostazioni.</p>
      <div class="btns"><button class="btn" data-k="no">Più tardi</button><button class="btn pri" data-k="yes">Impostazioni</button></div>`, true);
    $('[data-k=no]', o).onclick = () => o.remove();
    $('[data-k=yes]', o).onclick = () => { o.remove(); nav.setTab(4); nav.push(new SettingsScreen()); };
  }
  async function share(title, text) {
    if (navigator.share) { try { await navigator.share({ title, text }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(text); toast('Copiato negli appunti'); } catch (e) { alertBox(title, text); }
  }

  // =====================================================================
  // VOCE, TIMER, SCHERMO ACCESO
  // =====================================================================
  const SPEECH_LANG = { it: 'it-IT', en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', pt: 'pt-PT' };
  let voices = [], speechKeep = [], speechGen = 0, silentAudio = null;
  function loadVoices() { try { voices = speechSynthesis.getVoices() || []; } catch (e) { voices = []; } }
  if ('speechSynthesis' in window) {
    loadVoices();
    if (speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', loadVoices); else speechSynthesis.onvoiceschanged = loadVoices;
  }
  function pickVoice(lang) {
    const l = lang.toLowerCase(), pre = l.slice(0, 2);
    const norm = v => (v.lang || '').toLowerCase().replace('_', '-');
    const exact = voices.filter(v => norm(v) === l), loose = voices.filter(v => norm(v).startsWith(pre));
    const pool = exact.length ? exact : loose;
    return pool.find(v => v.localService && /enhanced|premium|siri|migliorata/i.test(v.name)) || pool.find(v => v.localService) || pool[0] || null;
  }
  function unlockAudio() {
    try {
      if (!silentAudio) {
        const n = 2205, b = new ArrayBuffer(44 + n * 2), d = new DataView(b), w = (o, t) => { for (let i = 0; i < t.length; i++) d.setUint8(o + i, t.charCodeAt(i)); };
        w(0, 'RIFF'); d.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
        d.setUint32(24, 22050, true); d.setUint32(28, 44100, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, 'data'); d.setUint32(40, n * 2, true);
        silentAudio = new Audio(URL.createObjectURL(new Blob([b], { type: 'audio/wav' })));
      }
      silentAudio.currentTime = 0; const pr = silentAudio.play(); if (pr && pr.catch) pr.catch(() => { });
    } catch (e) { }
  }
  const speakClean = t => (t || '').replace(/°\s*C/g, ' gradi').replace(/°/g, ' gradi').replace(/&/g, ' e ').replace(/%/g, ' per cento')
    .replace(/[*#_]/g, ' ').replace(/[→–—]/g, ', ').replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\uFE0F]/gu, ' ').replace(/\s+/g, ' ').trim();
  function speechChunks(t) {
    const parts = t.match(/[^.!?;:]+[.!?;:]*\s*/g) || [t], out = [];
    let cur = '';
    for (const p of parts) { if ((cur + p).length > 170 && cur) { out.push(cur.trim()); cur = p; } else cur += p; }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function speak(text) {
    if (!('speechSynthesis' in window)) { toast('Lettura ad alta voce non disponibile su questo browser'); return; }
    const gen = ++speechGen, busy = speechSynthesis.speaking || speechSynthesis.pending;
    unlockAudio();
    const lang = SPEECH_LANG[S.lang] || 'it-IT';
    const go = () => {
      if (gen !== speechGen) return;
      loadVoices();
      const voice = pickVoice(lang);
      if (!voice && voices.length) toast('Nessuna voce per questa lingua: iPhone → Impostazioni → Accessibilità → Contenuto letto → Voci');
      speechKeep = speechChunks(speakClean(text)).map(c => {
        const u = new SpeechSynthesisUtterance(c);
        u.lang = lang; u.rate = S.speakRate || 1; u.volume = 1;
        if (voice) u.voice = voice;
        u.onerror = ev => { if (gen === speechGen && ev.error && !['canceled', 'interrupted'].includes(ev.error)) toast('La voce non parte (' + ev.error + '). Controlla volume e tasto silenzioso.'); };
        return u;
      });
      try { speechSynthesis.resume(); } catch (e) { }
      speechKeep.forEach(u => speechSynthesis.speak(u));
      setTimeout(() => { if (gen === speechGen && !speechSynthesis.speaking && !speechSynthesis.pending) toast('La voce non è partita: alza il volume, togli il silenzioso e riprova.'); }, 1800);
    };
    if (busy) { speechSynthesis.cancel(); setTimeout(go, 120); } else go();
  }
  const stopSpeaking = () => { speechGen++; speechKeep = []; if ('speechSynthesis' in window) speechSynthesis.cancel(); };

  const Timers = {
    list: {}, audio: null, tick: null,
    start(id, secs, label) {
      const t = this.list[id] || {};
      t.label = label; t.end = Date.now() + secs * 1000; t.running = true; t.left = secs;
      this.list[id] = t;
      try { this.audio = this.audio || new (window.AudioContext || window.webkitAudioContext)(); this.audio.resume(); } catch (e) { }
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => { });
      this.loop();
    },
    pause(id) { const t = this.list[id]; if (t && t.running) { t.left = Math.max(0, Math.ceil((t.end - Date.now()) / 1000)); t.running = false; } },
    reset(id) { delete this.list[id]; },
    left(id) { const t = this.list[id]; if (!t) return null; return t.running ? Math.max(0, Math.ceil((t.end - Date.now()) / 1000)) : t.left; },
    loop() {
      if (this.tick) return;
      this.tick = setInterval(() => {
        let any = false;
        for (const [id, t] of Object.entries(this.list)) {
          if (!t.running) continue;
          const l = Math.max(0, Math.ceil((t.end - Date.now()) / 1000));
          if (l <= 0) { t.running = false; t.left = 0; this.ring(t.label); } else any = true;
          const el = document.querySelector(`[data-timer="${id}"]`);
          if (el) el.textContent = RF.fmtSecs(l);
          if (l <= 0 && nav.top() instanceof CookScreen) nav.top().refresh();
        }
        if (!any) { clearInterval(this.tick); this.tick = null; }
      }, 500);
    },
    ring(label) {
      try {
        const ctx = this.audio;
        if (ctx) {
          for (let i = 0; i < 6; i++) {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.frequency.value = i % 2 ? 660 : 880; o.type = 'sine';
            g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.35);
            g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + i * 0.35 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.35 + 0.3);
            o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + i * 0.35); o.stop(ctx.currentTime + i * 0.35 + 0.32);
          }
        }
      } catch (e) { }
      if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 600]);
      if ('Notification' in window && Notification.permission === 'granted' && navigator.serviceWorker) {
        navigator.serviceWorker.ready.then(reg => reg.showNotification('⏰ Tempo scaduto', { body: label, icon: 'icons/icon-192.png', tag: 'timer', renotify: true })).catch(() => { });
      }
      alertBox('⏰ Tempo scaduto', label);
    }
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Object.keys(Timers.list).length) Timers.loop(); });

  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
      if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch (e) { }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && nav.top() && nav.top().fullScreen) keepAwake(true); });

  // =====================================================================
  // NAVIGAZIONE
  // =====================================================================
  const TABS = [['Scopri', 'compass'], ['Cosa cucino?', 'fridge'], ['Piano', 'calendar'], ['Spesa', 'cart'], ['Altro', 'dots']];

  class Screen {
    constructor() { this.scroll = 0; }
    get title() { return ''; }
    actions() { return ''; }
    render() { return ''; }
    after() { }
    leave() { }
    get fullScreen() { return false; }
    refresh() { if (nav.top() === this) nav.draw(true); }
    rebuild() { if (nav.top() === this) nav.draw(true); }
  }

  const nav = {
    stack: [], tab: 0,
    top() { return this.stack[this.stack.length - 1]; },
    root(i) { return [new Discover(), new Fridge(), new Planner(), new Shopping(), new More()][i]; },
    setTab(i) {
      if (this.top()) this.top().leave();
      this.tab = i;
      this.stack = [this.root(i)];
      this.drawTabs();
      this.draw(false);
    },
    push(s) {
      const v = $('#view');
      if (this.top()) this.top().scroll = v.scrollTop;
      this.stack.push(s);
      history.pushState({ d: this.stack.length }, '');
      this.draw(false);
    },
    back() {
      if (this.stack.length > 1) history.back();
      else if (this.tab !== 0) this.setTab(0);
    },
    popNow() {
      if (this.stack.length <= 1) return;
      this.stack.pop().leave();
      this.draw(true);
    },
    drawTabs() {
      $('#tabs').innerHTML = TABS.map(([l, icn], i) => `<button class="tab ${i === this.tab ? 'on' : ''}" data-tab="${i}"><span class="pill">${ic(icn)}</span>${esc(l)}</button>`).join('');
    },
    draw(keepScroll) {
      const s = this.top(), bar = $('#bar'), view = $('#view');
      const isRoot = this.stack.length === 1;
      const scroll = keepScroll ? view.scrollTop : s.scroll || 0;
      bar.className = isRoot ? '' : 'sub';
      bar.innerHTML = (isRoot ? '' : `<button class="ibtn" data-nav="back" aria-label="Indietro">${ic('back')}</button>`) + `<div class="ttl">${esc(s.title)}</div>` + s.actions();
      view.innerHTML = s.render();
      view.className = s.fullScreen ? '' : 'withtabs';
      $('#tabs').classList.toggle('hide', s.fullScreen);
      keepAwake(s.fullScreen);
      view.scrollTop = scroll;
      requestAnimationFrame(() => { view.scrollTop = scroll; });
      bar.classList.toggle('scrolled', view.scrollTop > 4);
      hydratePhotos(view);
      s.after(view);
    }
  };

  window.addEventListener('popstate', () => {
    if (document.querySelector('.overlay')) { document.querySelectorAll('.overlay').forEach(o => o.remove()); history.pushState({ d: nav.stack.length }, ''); return; }
    if (nav.stack.length > 1) nav.popNow();
    else if (nav.tab !== 0) nav.setTab(0);
  });

  let longFired = false, longTimer = null;
  function dispatch(el, attr, ev) {
    const s = nav.top(), name = el.getAttribute(attr);
    if (s && typeof s[name] === 'function') s[name](el.dataset.x, el, ev);
    else if (typeof Global[name] === 'function') Global[name](el.dataset.x, el, ev);
  }
  document.addEventListener('click', e => {
    if (longFired) { longFired = false; e.preventDefault(); return; }
    if (e.target.closest('.overlay')) return;
    const tab = e.target.closest('[data-tab]');
    if (tab) { const i = +tab.dataset.tab; if (i === nav.tab) { while (nav.stack.length > 1) nav.stack.pop().leave(); nav.top().scroll = 0; nav.draw(false); } else nav.setTab(i); return; }
    if (e.target.closest('[data-nav=back]')) { nav.back(); return; }
    const t = e.target.closest('[data-a]');
    if (t) dispatch(t, 'data-a', e);
  });
  document.addEventListener('change', e => { const t = e.target.closest('[data-c]'); if (t) dispatch(t, 'data-c', e); });
  document.addEventListener('input', e => { const t = e.target.closest('[data-in]'); if (t) dispatch(t, 'data-in', e); });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { const t = e.target.closest('[data-enter]'); if (t) { e.preventDefault(); dispatch(t, 'data-enter', e); } } });
  document.addEventListener('pointerdown', e => {
    const t = e.target.closest('[data-long]');
    if (!t || e.target.closest('.overlay')) return;
    const x0 = e.clientX, y0 = e.clientY;
    longTimer = setTimeout(() => { longFired = true; if (navigator.vibrate) navigator.vibrate(15); const s = nav.top(); const id = t.dataset.x; if (s[t.dataset.long]) s[t.dataset.long](id, t); else Global[t.dataset.long](id, t); }, 520);
    const cancel = ev => { if (!ev || ev.type !== 'pointermove' || Math.hypot(ev.clientX - x0, ev.clientY - y0) > 10) { clearTimeout(longTimer); cleanup(); } };
    const cleanup = () => { document.removeEventListener('pointerup', cancel); document.removeEventListener('pointermove', cancel); document.removeEventListener('pointercancel', cancel); };
    document.addEventListener('pointerup', cancel); document.addEventListener('pointermove', cancel); document.addEventListener('pointercancel', cancel);
  });
  document.addEventListener('contextmenu', e => { if (e.target.closest('[data-long]')) e.preventDefault(); });

  const Global = {
    newRecipeGlobal() { newRecipe(); },
    samples() { const n = addSamples(); toast(n + (n === 1 ? ' ricetta aggiunta' : ' ricette aggiunte') + ' a «Le mie ricette»'); const t = nav.top(); if (t) t.refresh(); },
    deleteAll() {
      confirmBox('Eliminare tutte le tue ricette?', `${S.imported.length} ricette, con note e foto, verranno eliminate per sempre. Non si può annullare.`, 'Elimina tutte', () => { deleteAllMine(); toast('Ricette eliminate'); const t = nav.top(); if (t) t.refresh(); }, true);
    },
    openId(id) { const r = byId(id) || allKnown().find(x => x.id === id) || Object.values(S.plan).map(p => p.recipe).find(x => x.id === id); if (r) openRecipe(r); },
    recipeMenu(id) {
      const r = byId(id) || allKnown().find(x => x.id === id);
      if (!r) return;
      const fav = isFav(r), mine = isMine(r);
      const delLabel = mine ? 'Elimina definitivamente' : 'Rimuovi';
      choose(r.title, [fav ? 'Togli dai preferiti' : 'Aggiungi ai preferiti', 'Apri', 'Modifica', delLabel], i => {
        if (i === 0) { toggleFav(r); nav.top().refresh(); }
        else if (i === 1) openRecipe(r);
        else if (i === 2) {
          const c = RF.copy(cached(r));
          if (!mine) { c.id = 'my-' + Date.now().toString(36); c.source = 'Le mie ricette'; if (c.kind && c.kind.startsWith('idea:')) c.kind = ''; }
          nav.push(new Editor(c));
        }
        else confirmBox(delLabel + '?', mine ? 'La ricetta, le tue note e la foto verranno eliminate per sempre. Non si può annullare.' : 'Verrà tolta da preferiti, piano e ricette cercate.',
          mine ? 'Elimina' : 'OK', () => { del(r); nav.top().refresh(); toast('Fatto'); }, mine);
      }, 3);
    }
  };

  async function openRecipe(r) {
    const c = cached(r);
    if (!Ai.isStub(c)) { nav.push(new RecipeScreen(c)); return; }
    if (!ai().ready) { needKey(); return; }
    try {
      const full = await run(`Cerco «${r.title}» sul web…`, p => resolve(r, p));
      nav.push(new RecipeScreen(full));
    } catch (e) { }
  }

  // =====================================================================
  // SCOPRI
  // =====================================================================
  const FILTERS = ['Tutte', 'Virali', 'Veloci', 'Vegetariane', 'Dolci', 'Basi', 'Preferiti', 'Dal web'];
  class Discover extends Screen {
    constructor() { super(); this.q = ''; this.filter = 'Tutte'; }
    get title() { return 'RecipeFlow'; }
    actions() { return `<span class="acc" style="width:30px;height:30px">${ic('chef').replace('class="ic"', 'class="ic" style="width:30px;height:30px"')}</span>`; }
    greeting() {
      const h = new Date().getHours();
      return h < 11 ? 'Buongiorno! Cosa prepari per colazione?' : h < 15 ? 'Che cosa cucini per pranzo?' : h < 18 ? 'Voglia di qualcosa di buono?' : 'Che cosa cucini per cena?';
    }
    render() {
      return `<div class="muted">${this.greeting()}</div>
        <div class="search">${ic('search')}<input class="input" type="search" enterkeyhint="search" placeholder="Cerca una ricetta o un piatto…" value="${esc(this.q)}" data-in="typed" data-enter="web"></div>
        <div id="results">${this.results()}</div>`;
    }
    typed(x, el) { this.q = el.value; $('#results').innerHTML = this.results(); hydratePhotos($('#results')); }
    setFilter(f) { this.filter = f; $('#results').innerHTML = this.results(); hydratePhotos($('#results')); }
    results() {
      const q = this.q.trim();
      let h = '';
      if (q) {
        h += `<div class="mt12">${btn(`Cerca «${q}» sul web`, 'globe', 'pri block', 'web')}</div><p class="muted">Gemini legge più ricette affidabili e ne propone una che le incrocia, con le fonti.</p>`;
      } else {
        if (!ai().ready) h += `<div class="card tinted"><div class="row top"><span class="acc">${ic('magic')}</span><div class="grow"><h3>Infinite ricette dal web</h3><p class="muted">Collega Gemini (gratis) per cercare qualsiasi piatto, ricevere idee con quello che hai in frigo e il menù della settimana.</p></div></div><div class="mt12">${btn('Collega Gemini', null, 'pri block', 'key')}</div></div>`;
        if (S.history.length) h += `<div class="small mt16">Cercate di recente</div><div class="flow mt8">${S.history.map(x => chip(x, false, 'again', x)).join('')}</div>`;
      }
      h += `<div class="hscroll">${FILTERS.map(f => chip(f, f === this.filter, 'setFilter', f)).join('')}</div>`;
      const list = this.filtered(q);
      if (!list.length) {
        if (q) h += empty('search', `Nessuna ricetta salvata con «${q}»`, 'Tocca «Cerca sul web» per trovarne una.');
        else if (this.filter === 'Preferiti') h += empty('heart', 'Ancora nessun preferito', 'Tocca il cuore in una ricetta per ritrovarla qui.');
        else if (this.filter === 'Dal web') h += empty('globe', 'Nessuna ricetta dal web', 'Scrivi un piatto qui sopra e cercalo sul web.');
        else h += empty('book', 'Il tuo ricettario è vuoto', 'Scrivi una ricetta tua, cercane una sul web oppure aggiungi quelle di esempio: potrai eliminarle quando vuoi.')
          + `<div class="btns">${btn('Nuova ricetta', 'edit', 'pri', 'newRecipeGlobal')}${samplesLeft() ? btn('Aggiungi gli esempi', 'plus', '', 'samples') : ''}</div>`;
        return h;
      }
      h += `<p class="muted mt12">${list.length === 1 ? '1 ricetta' : list.length + ' ricette'} · tieni premuto per altre azioni</p>` + grid(list);
      return h;
    }
    filtered(q) {
      const f = this.filter;
      let base = f === 'Preferiti' ? S.favorites.slice() : f === 'Dal web' ? Object.values(S.webCache) : allKnown();
      const words = q.toLowerCase().split(/\s+/).filter(Boolean);
      const out = base.filter(r => {
        if (words.length) {
          const hay = (r.title + ' ' + r.description + ' ' + r.tags.join(' ') + ' ' + r.ingredients.map(i => i.name).join(' ')).toLowerCase();
          if (!words.every(w => hay.includes(w))) return false;
        }
        if (f === 'Virali' && !RF.hasTag(r, 'Virale')) return false;
        if (f === 'Veloci' && !(RF.hasTag(r, 'Veloce') || (r.minutes > 0 && r.minutes <= 20))) return false;
        if (f === 'Vegetariane' && !(RF.hasTag(r, 'Vegetariana') || RF.hasTag(r, 'Vegana'))) return false;
        if (f === 'Dolci' && !(RF.hasTag(r, 'Dolce') || RF.hasTag(r, 'Colazione'))) return false;
        if (f === 'Basi' && !RF.hasTag(r, 'Basi')) return false;
        return true;
      });
      if (f === 'Tutte' && !words.length) out.sort((a, b) => (isMine(b) - isMine(a)) || (b.popularity - a.popularity));
      return out;
    }
    key() { needKey(); }
    again(q) { this.q = q; const inp = $('#view input'); if (inp) inp.value = q; this.web(); }
    async web() {
      const q = this.q.trim();
      if (!q) { toast('Scrivi il nome di un piatto'); return; }
      if (!ai().ready) { needKey(); return; }
      document.activeElement && document.activeElement.blur();
      addHistory(q);
      try {
        const r = await run(`Cerco «${q}» sul web…`, p => ai().webRecipe(q, p));
        S.webCache[r.id] = r; save();
        nav.push(new RecipeScreen(r));
      } catch (e) { }
    }
  }

  /** Testo del passaggio con la nota della versione leggera evidenziata. */
  function stepHtml(st) {
    const idx = st.indexOf('  → Versione leggera:');
    return idx < 0 ? esc(st) : esc(st.slice(0, idx)) + `<span class="lightnote">${esc(st.slice(idx + 2).trim())}</span>`;
  }

  // =====================================================================
  // DETTAGLIO RICETTA
  // =====================================================================
  class RecipeScreen extends Screen {
    constructor(r) {
      super();
      this.base = r; this.dough = null; this.moldBase = 0; this.mold = 0; this.light = false; this.disabled = new Set(); this.coachText = null;
      this.ingEdits = {}; this.removedIngs = new Set(); this.extraIngs = []; this.stepEdits = {}; this.extraSteps = []; this.inlineDirty = false;
      if (r.kind.startsWith('dough:')) this.dough = RF.doughPreset(RF.STYLES[r.kind.slice(6)] ? r.kind.slice(6) : 'NAPOLETANA');
      else if (r.kind.startsWith('mold:')) this.moldBase = this.mold = parseInt(r.kind.slice(5), 10) || 0;
      this.servings = this.dough ? this.dough.count : r.servings;
    }
    get title() { return this.base.title; }
    actions() {
      const fav = isFav(this.base);
      return `${ibtn('edit', 'editRecipe')}<button class="ibtn" data-a="fav" style="${fav ? 'color:#FF4D6D' : ''}">${ic(fav ? 'heartFill' : 'heart')}</button>${ibtn('share', 'shareIt')}${ibtn('dots', 'menu')}`;
    }
    applyInline(rec) {
      const hasIngMod = Object.keys(this.ingEdits).length > 0 || this.removedIngs.size > 0 || this.extraIngs.length > 0;
      const hasStepMod = Object.keys(this.stepEdits).length > 0 || this.extraSteps.length > 0;
      if (!hasIngMod && !hasStepMod) return rec;
      const c = RF.copy(rec);
      if (hasIngMod) {
        const nextIngs = [];
        c.ingredients.forEach((item, idx) => {
          if (this.removedIngs.has(idx)) return;
          if (this.ingEdits[idx]) nextIngs.push(RF.copy(this.ingEdits[idx]));
          else nextIngs.push(item);
        });
        for (const ex of this.extraIngs) nextIngs.push(RF.copy(ex));
        c.ingredients = nextIngs;
      }
      if (hasStepMod) {
        const nextSteps = c.steps.map((st, k) => this.stepEdits[k] !== undefined ? this.stepEdits[k] : st);
        for (const es of this.extraSteps) nextSteps.push(es);
        c.steps = nextSteps;
      }
      return c;
    }
    original() {
      let baseRec = this.base;
      if (this.dough) baseRec = RF.Dough.build(this.dough, baseRec);
      else if (this.moldBase > 0 && this.mold !== this.moldBase) baseRec = RF.scaleMold(baseRec, this.moldBase, this.mold);
      return this.applyInline(baseRec);
    }
    lightRes() { return RF.lighten(this.original(), this.disabled); }
    shown() { return this.light ? this.lightRes().light : this.original(); }
    factor(r) { return this.dough ? 1 : this.servings / Math.max(1, r.servings); }
    forCooking() {
      const r = RF.copy(this.shown()), f = this.factor(r);
      if (f !== 1) { for (const i of r.ingredients) { i.amount *= f; i.grams *= f; i.n = RF.scaleN(i.n, f); } r.servings = this.servings; }
      return r;
    }
    render() {
      const orig = this.original(), lr = this.lightRes(), r = this.light ? lr.light : orig, f = this.factor(r), p = personal(this.base.id);
      let h = cover(this.base, 'hero', `<button class="photoBtn" data-a="photo">${ic('camera')}${p.photo ? 'Cambia foto' : 'Aggiungi foto'}</button>`);
      h += `<h1>${esc(r.title)}</h1>`;
      if (r.description) h += `<p class="muted" style="font-size:15px">${esc(r.description)}</p>`;
      const tags = r.tags.filter(t => t !== 'Dal web').map(t => pill(t, t === 'Virale' ? 'warn' : 'muted')).join(' ');
      h += `<div class="flow mt12">${r.minutes > 0 ? pill('⏱ ' + r.minutes + ' min', 'acc') : ''}${pill(r.difficulty, 'muted')}${pill(r.source, 'muted')}${tags}${p.cooked ? pill('Cucinata ' + p.cooked + (p.cooked === 1 ? ' volta' : ' volte'), 'acc') : ''}</div>`;
      h += `<div class="btns">${btn('Cucina', 'play', 'pri', 'cook')}${btn('Spesa', 'cart', '', 'shop')}${btn('Piano', 'calendar', '', 'plan')}</div>`;
      h += `<div class="inline-bar">${btn('Modifica completa', 'edit', '', 'editRecipe')}${this.inlineDirty ? `${btn('Salva come mia', 'check', 'pri', 'saveInlineAsMine')}${btn('Ripristina', 'refresh', '', 'resetInline')}` : ''}</div>`;

      const kb = RF.perServing(orig).kcal, ka = RF.perServing(lr.light).kcal;
      h += `<div class="card" id="lightCard"><div class="row"><span class="acc">${ic('leaf')}</span><div class="grow"><h3>Versione leggera e completa</h3><div class="muted mt4">${lr.changes.length ? `${kcal(kb)} → ${kcal(ka)} kcal a porzione · ${lr.changes.length} ${lr.changes.length === 1 ? 'modifica' : 'modifiche'}` : 'È già una ricetta equilibrata'}</div></div>${toggle(this.light, 'setLight')}</div>`;
      if (this.light) {
        for (const c of lr.changes) {
          h += `<div class="sep"></div><div class="change ${c.enabled ? '' : 'off'}"><div class="grow"><h3>${esc(c.title)}</h3><div class="muted mt4">${esc(c.detail)}</div>`
            + (Math.abs(c.kcalDelta) >= 1 ? `<div class="small mt4 ${c.kcalDelta > 0 ? 'warn' : 'acc'}" style="text-transform:none">${c.kcalDelta > 0 ? '+' : '−'}${kcal(Math.abs(c.kcalDelta))} kcal a porzione</div>` : '')
            + `</div>${toggle(c.enabled, 'setChange', c.id)}</div>`;
        }
        if (lr.tips.length) h += `<div class="sep"></div><div class="small">Consigli</div>` + lr.tips.map(t => `<p style="font-size:14.5px">•&nbsp; ${esc(t)}</p>`).join('');
      }
      h += '</div>';

      h += this.nutrition(r);
      if (this.dough) h += this.doughPanel();
      else if (this.moldBase > 0) h += this.moldPanel();
      else h += this.enableDoughCard();

      h += `<div class="card"><div class="row"><h2 class="grow">Ingredienti</h2>${this.dough ? '' : stepper(this.servings + ' porz.', 'servMinus', 'servPlus')}</div>`;
      r.ingredients.forEach((i, idx) => {
        const have = RF.pantryHas(S.fridge, S.staples, i.name);
        h += `<div class="ingr editable" data-a="editIngredient" data-x="${idx}"><span class="dot ${have ? 'have' : ''}"></span><div class="grow">${esc(i.name)}${i.note ? `<div class="small acc" style="text-transform:none;letter-spacing:0">${esc(i.note)}</div>` : ''}</div><div class="q">${esc(RF.quantityLabel(i, f))}</div></div>`;
      });
      h += `<div class="mt12">${btn('Aggiungi ingrediente', 'plus', 'block', 'addIngredientInline')}</div>`;
      if (S.fridge.length) h += `<p class="muted">● verde = ce l'hai già (dal tuo frigo) · tocca un ingrediente per modificarlo</p>`;
      else h += `<p class="muted">Tocca un ingrediente per cambiare dose o rimuoverlo.</p>`;
      h += '</div>';

      h += `<div class="card"><h2>Procedimento</h2>`;
      r.steps.forEach((st, k) => {
        const kind = RF.classify(st), secs = RF.seconds(st);
        const txt = stepHtml(st);
        h += `<div class="step editable" data-a="editStepInline" data-x="${k}"><div class="art">${RF.stepSvg(st, dark)}</div><div class="grow"><div class="small acc">Passo ${k + 1} · ${RF.KIND_LABEL[kind]}</div><div class="mt4">${txt}</div>${secs ? `<div class="mt8">${pill('⏲ ' + RF.fmtSecs(secs), 'acc')}</div>` : ''}</div></div>`;
      });
      h += `<div class="inline-bar">${btn('Aggiungi passo', 'plus', '', 'addStepInline')}${btn('Avvia la modalità cucina', 'play', 'pri', 'cook')}</div></div>`;

      if (r.notes || r.sources.length) {
        h += `<div class="card"><h2>Dal web</h2>${r.notes ? `<p>${esc(r.notes)}</p>` : ''}`;
        if (r.sources.length) h += `<div class="small mt12">Fonti consultate</div>` + r.sources.map(s => {
          const b = s.indexOf('|'), t = b > 0 ? s.slice(0, b) : s, u = b > 0 ? s.slice(b + 1) : s;
          return `<a class="srclink" href="${esc(u)}" target="_blank" rel="noopener">↗&nbsp; ${esc(t)}</a>`;
        }).join('');
        h += '</div>';
      }

      h += `<div class="card"><div class="row"><span class="acc">${ic('magic')}</span><h3 class="grow">Coach AI: rendila più sana</h3></div>`;
      if (this.coachText == null) h += `<p class="muted">Sostituzioni ragionate, aggiunte per completare il pasto e consigli di cottura, scritti da Gemini per questa ricetta.</p><div class="mt12">${btn('Chiedi al coach', null, 'block', 'coach')}</div>`;
      else h += this.coachHtml(this.coachText);
      h += '</div>';

      h += `<div class="card"><h2>Le tue note</h2><div class="stars">${[1, 2, 3, 4, 5].map(v => `<button class="ibtn ${v <= p.rating ? 'on' : ''}" data-a="rate" data-x="${v}">${ic(v <= p.rating ? 'starFill' : 'star')}</button>`).join('')}</div>`
        + `<div class="note ${p.notes ? '' : 'empty'}" data-a="editNotes">${esc(p.notes || 'Tocca per scrivere un appunto (es. «meno sale», «20 minuti in più in forno»)')}</div>`
        + `<div class="btns">${btn('L\'ho cucinata', 'check', '', 'cooked')}${btn(p.photo ? 'Cambia foto' : 'Foto', 'camera', '', 'photo')}</div></div>`;
      return h;
    }
    coachHtml(text) {
      let h = '';
      for (const line of text.split('\n')) {
        const l = line.trim(); if (!l) continue;
        const header = l === l.toUpperCase() && l.length < 60 && /[A-ZÀ-Ý]/.test(l);
        if (header) h += `<div class="small acc mt16">${esc(l.replace(/^\d+\)\s*/, ''))}</div>`;
        else h += `<p style="font-size:14.5px">${esc(l.startsWith('- ') ? '•  ' + l.slice(2) : l)}</p>`;
      }
      return h;
    }
    nutrition(r) {
      const n = RF.perServing(r), score = RF.balanceScore(r), tot = n.prot * 4 + n.carb * 4 + n.fat * 9;
      const parts = [[n.prot * 4, '#3B82F6'], [n.carb * 4, '#F59E0B'], [n.fat * 9, '#EF4444']];
      let a = -90, arcs = '';
      const R = 50, C = 62;
      if (tot > 0) for (const [v, col] of parts) {
        const sw = v / tot * 360; if (sw < 0.5) { a += sw; continue; }
        const s0 = (a + 1) * Math.PI / 180, s1 = (a + sw - 1) * Math.PI / 180;
        arcs += `<path d="M${C + R * Math.cos(s0)} ${C + R * Math.sin(s0)} A${R} ${R} 0 ${sw - 2 > 180 ? 1 : 0} 1 ${C + R * Math.cos(s1)} ${C + R * Math.sin(s1)}" fill="none" stroke="${col}" stroke-width="15"/>`;
        a += sw;
      }
      const donut = `<svg viewBox="0 0 124 124" style="width:124px;height:124px;flex:none"><circle cx="62" cy="62" r="50" fill="none" stroke="var(--surface2)" stroke-width="15"/>${arcs}<text x="62" y="66" text-anchor="middle" font-size="25" font-weight="800" fill="var(--text)">${kcal(n.kcal)}</text><text x="62" y="84" text-anchor="middle" font-size="12" fill="var(--muted)">kcal</text></svg>`;
      const leg = (name, g, col, k) => `<div class="legend"><span class="d" style="background:${col}"></span><span class="grow">${name}</span><b>${Math.round(g)} g</b><span class="muted" style="font-size:12.5px;min-width:30px;text-align:right">${tot > 0 ? Math.round(k * 100 / tot) : 0}%</span></div>`;
      const dessert = RF.hasTag(r, 'Dolce') || RF.hasTag(r, 'Basi') || RF.hasTag(r, 'Contorno');
      const notes = [];
      if (!dessert && n.prot < 20) notes.push('poche proteine');
      if (!dessert && n.fib < 8) notes.push('poche fibre');
      if (n.sat > 8) notes.push('molti grassi saturi');
      if (n.sug > 15) notes.push('molti zuccheri');
      return `<div class="card"><div class="row"><div class="grow"><h2>Valori a porzione</h2><div class="muted mt4">Stime da tabelle di composizione medie</div></div><div class="col" style="align-items:center">${gradeBadge(RF.grade(score), 40)}<span class="small" style="text-transform:none;margin-top:2px">equilibrio</span></div></div>`
        + `<div class="row mt12" style="gap:16px">${donut}<div class="grow">${leg('Proteine', n.prot, '#3B82F6', n.prot * 4)}${leg('Carboidrati', n.carb, '#F59E0B', n.carb * 4)}${leg('Grassi', n.fat, '#EF4444', n.fat * 9)}<div class="muted mt8">Zuccheri ${Math.round(n.sug)} g · Saturi ${Math.round(n.sat)} g · Fibre ${Math.round(n.fib)} g</div></div></div>`
        + (notes.length ? `<p class="muted mt12">Da migliorare: ${notes.join(', ')}${this.light ? '.' : '. Prova la versione leggera qui sopra.'}</p>` : '') + '</div>';
    }
    doughPanel() {
      const d = this.dough, D = RF.Dough, tray = D.usesTray(d);
      const row = (label, val, key) => `<div class="row" style="padding:5px 0"><span class="grow">${label}</span>${stepper(val, 'dMinus', 'dPlus', key)}</div>`;
      let h = `<div class="card"><div class="row"><span class="acc">${ic('scale')}</span><h2 class="grow">Il tuo impasto</h2></div><p class="muted">Scegli lo stile e regola i parametri: dosi, lievito e passaggi si ricalcolano.</p>`;
      h += `<div class="flow mt12">${Object.entries(RF.STYLES).map(([k, s]) => chip(s.label, k === d.style, 'dStyle', k)).join('')}</div><p class="muted">${esc(RF.STYLES[d.style].desc)}</p><div class="sep"></div>`;
      h += row(tray ? 'Teglie' : 'Panetti', String(d.count), 'count');
      if (tray) h += `<div class="flow mt8">${RF.TRAYS.map((t, i) => chip(t[0], i === d.tray, 'dTray', i)).join('')}</div>`;
      else h += row('Peso del panetto', D.g(d.ball) + ' g', 'ball');
      h += row('Idratazione', D.g(d.hydration) + '%', 'hydration') + row('Sale', d.salt.toFixed(1).replace('.', ',') + '%', 'salt') + row('Olio', d.oil.toFixed(1).replace('.', ',') + '%', 'oil')
        + row('Ore a temperatura ambiente', D.hrs(d.ambHours), 'ambHours') + row('Ore in frigo', D.hrs(d.fridgeHours), 'fridgeHours')
        + row('Temperatura della stanza', D.g(d.temp) + ' °C', 'temp') + row('Inforno alle', String(d.bakeHour).padStart(2, '0') + ':00', 'bakeHour');
      h += `<div class="mt8">${toggleRow('Lievito secco', 'Al posto del lievito di birra fresco (un terzo della dose)', d.dryYeast, 'dDry')}</div>`;
      h += `<div class="res"><b>Farina ${D.g(D.flour(d))} g · Acqua ${D.g(D.water(d))} g · Lievito ${D.g(D.yeastG(d))} g · Sale ${D.g(D.saltG(d))} g${D.oilG(d) > 0 ? ' · Olio ' + D.g(D.oilG(d)) + ' g' : ''}</b><div class="acc mt4" style="font-weight:700">${esc(D.schedule(d))}</div></div>`;
      if (!(this.base.kind && this.base.kind.startsWith('dough:'))) {
        h += `<div class="mt12">${btn('Togli parametri impasto', 'trash', 'txt block', 'disableDough')}</div>`;
      }
      h += '</div>';
      return h;
    }
    moldPanel() {
      const k = Math.pow(this.mold / this.moldBase, 2);
      return `<div class="card"><h2>Dimensione dello stampo</h2><p class="muted">La ricetta è pensata per uno stampo da ${this.moldBase} cm: scegli il tuo e le dosi si adattano alla superficie.</p>`
        + `<div class="flow mt12">${RF.MOLDS.map(d => chip('Ø ' + d + ' cm', d === this.mold, 'setMold', d)).join('')}</div>`
        + `<p class="${this.mold === this.moldBase ? 'muted' : 'acc'}" style="font-weight:700">Dosi × ${k.toFixed(2).replace('.', ',')} rispetto alla ricetta originale</p></div>`;
    }
    /** Card che compare sulle ricette NON nate come impasto: permette di attivare il pannello parametri. */
    enableDoughCard() {
      return `<div class="card"><div class="row"><span class="acc">${ic('scale')}</span><h3 class="grow">Parametri impasto</h3></div>`
        + `<p class="muted">Se questa ricetta è un impasto (pane, pizza, focaccia, brioche…), attiva i parametri: potrai regolare idratazione, sale, olio, lievito e tempi, e le dosi si ricalcolano da sole.</p>`
        + `<div class="mt12">${btn('Attiva parametri impasto', 'plus', 'block', 'enableDough')}</div></div>`;
    }
    /** Sceglie uno stile sensato in base a titolo/tag/descrizione, altrimenti NAPOLETANA. */
    _guessDoughStyle() {
      const styles = Object.keys(RF.STYLES || {});
      if (!styles.length) return null;
      const hay = ((this.base.title || '') + ' ' + (this.base.description || '') + ' ' + (this.base.tags || []).join(' ')).toLowerCase();
      const find = (...kw) => styles.find(k => {
        const label = (RF.STYLES[k].label || '').toLowerCase();
        return kw.some(w => label.includes(w) || k.toLowerCase().includes(w));
      });
      if (/\b(pane|pagnotta|baguette|ciabatta|panini|filone)\b/.test(hay)) return find('pane') || null;
      if (/\b(focaccia|teglia|pizzetta|schiacciata)\b/.test(hay)) return find('teglia', 'focaccia') || null;
      if (/\b(brioche|cornetto|croissant|dolce lievitato)\b/.test(hay)) return find('brioche', 'dolce') || null;
      if (/\bpizza\b/.test(hay)) return find('napoletana', 'pizza', 'romana') || null;
      return null;
    }
    enableDough() {
      if (!RF.Dough || !RF.STYLES) { toast('Parametri impasto non disponibili'); return; }
      const style = this._guessDoughStyle() || (RF.STYLES.NAPOLETANA ? 'NAPOLETANA' : Object.keys(RF.STYLES)[0]);
      this.dough = RF.doughPreset(style);
      this.servings = this.dough.count;
      this.refresh();
      toast(`Parametri impasto attivati (${RF.STYLES[style].label})`);
    }
    disableDough() {
      this.dough = null;
      this.servings = this.base.servings || 2;
      this.refresh();
      toast('Parametri impasto disattivati');
    }
    // ---- azioni ----
    setLight(x, el) { this.light = el.checked; this.refresh(); }
    setChange(id, el) { if (el.checked) this.disabled.delete(id); else this.disabled.add(id); this.refresh(); }
    servMinus() { if (this.servings > 1) { this.servings--; this.refresh(); } }
    servPlus() { if (this.servings < 40) { this.servings++; this.refresh(); } }
    dStyle(k) { const old = this.dough, d = RF.doughPreset(k); d.temp = old.temp; d.dryYeast = old.dryYeast; d.bakeHour = old.bakeHour; this.dough = d; this.servings = d.count; this.refresh(); }
    dTray(i) { this.dough.tray = +i; this.refresh(); }
    dDry(x, el) { this.dough.dryYeast = el.checked; this.refresh(); }
    dStep(key, dir) {
      const d = this.dough, lim = { count: [1, 20, 1], ball: [120, 1200, 10], hydration: [50, 95, 1], salt: [1, 4, 0.1], oil: [0, 10, 0.5], ambHours: [1, 48, 1], fridgeHours: [0, 96, 6], temp: [16, 30, 1] };
      if (key === 'bakeHour') d.bakeHour = (d.bakeHour + (dir > 0 ? 1 : 23)) % 24;
      else { const [mn, mx, st] = lim[key]; d[key] = Math.round(Math.max(mn, Math.min(mx, d[key] + dir * st)) * 10) / 10; }
      this.servings = d.count; this.refresh();
    }
    dMinus(k) { this.dStep(k, -1); }
    dPlus(k) { this.dStep(k, 1); }
    setMold(d) { this.mold = +d; this.servings = this.original().servings; this.refresh(); }
    fav() { toggleFav(this.base); toast(isFav(this.base) ? 'Aggiunta ai preferiti' : 'Tolta dai preferiti'); this.rebuild(); }
    cook() { nav.push(new CookScreen(this.forCooking())); }
    shop() {
      const r = this.shown(), f = this.factor(r);
      if (!S.fridge.length) { const n = addToShopping(r, f, false); toast(n ? `Aggiunti ${n} ingredienti alla spesa` : 'Già nella lista della spesa'); return; }
      choose('Aggiungi alla spesa', ['Solo quello che manca nel frigo', 'Tutti gli ingredienti'], i => {
        const n = addToShopping(r, f, i === 0);
        toast(n ? `Aggiunti ${n} ingredienti alla spesa` : 'Hai già tutto!');
      });
    }
    plan() {
      const days = [], labels = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(); d.setDate(d.getDate() + i);
        const name = i === 0 ? 'Oggi' : i === 1 ? 'Domani' : cap(fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' }));
        days.push([d, LUNCH], [d, DINNER]); labels.push(name + ' · pranzo', name + ' · cena');
      }
      choose('Quando la cucini?', labels, i => {
        const r = RF.copy(this.shown());
        r.id = this.light ? baseId(this.base.id) + '-light' : this.base.id;
        S.plan[planKey(days[i][0], days[i][1])] = { recipe: r, servings: this.dough ? r.servings : this.servings };
        save(); toast('Aggiunta al piano: ' + labels[i]);
      });
    }
    async photo() {
      const name = await pickPhoto();
      if (!name) return;
      const p = personal(this.base.id);
      if (p.photo) Photos.remove(p.photo);
      p.photo = name; setPersonal(this.base.id, p);
      if (!isMine(this.base) && !isBuiltin(this.base) && !isFav(this.base)) toggleFav(this.base);
      this.refresh();
    }
    rate(v) { const p = personal(this.base.id); p.rating = p.rating === +v ? 0 : +v; setPersonal(this.base.id, p); this.refresh(); }
    editNotes() { const p = personal(this.base.id); ask('Le tue note', 'Scrivi qui', p.notes, true, s => { p.notes = s; setPersonal(this.base.id, p); this.refresh(); }, { allowEmpty: true }); }
    cooked() { const p = personal(this.base.id); p.cooked++; setPersonal(this.base.id, p); toast('Segnata! Buon appetito'); this.refresh(); }
    async coach() {
      if (!ai().ready) { needKey(); return; }
      try { this.coachText = await run('Il coach sta studiando la ricetta…', () => ai().coach(this.original())); this.refresh(); } catch (e) { }
    }
    shareIt() {
      const r = this.shown(), f = this.factor(r);
      let t = r.title + '\n' + (r.description ? r.description + '\n' : '') + `\nINGREDIENTI (${this.dough ? r.servings : this.servings} porzioni)\n`;
      t += r.ingredients.map(i => `• ${i.name} — ${RF.quantityLabel(i, f)}`).join('\n') + '\n\nPROCEDIMENTO\n' + r.steps.map((s, k) => `${k + 1}. ${s}`).join('\n');
      if (r.sourceUrl) t += '\n\nFonte: ' + r.sourceUrl;
      share(r.title, t + '\n\nCondivisa da RecipeFlow');
    }
    editRecipe() {
      const mine = isMine(this.base);
      const c = RF.copy(this.forCooking());
      if (!mine) { c.id = 'my-' + Date.now().toString(36); c.source = 'Le mie ricette'; if (c.kind && c.kind.startsWith('idea:')) c.kind = ''; }
      nav.push(new Editor(c));
    }
    editIngredient(idx) {
      idx = +idx;
      const list = this.shown().ingredients;
      const item = list[idx];
      if (!item) return;
      choose(item.name, ['Modifica quantità / nome', 'Rimuovi ingrediente'], k => {
        if (k === 1) {
          this.removedIngs.add(idx);
          this.inlineDirty = true;
          this.refresh();
          return;
        }
        ask('Modifica ingrediente', 'es. 250 g farina', RF.lineOf(item), false, txt => {
          this.ingEdits[idx] = RF.parseLine(txt);
          this.inlineDirty = true;
          this.refresh();
        });
      }, 1);
    }
    addIngredientInline() {
      ask('Nuovo ingrediente', 'es. 150 g zucchine', '', false, txt => {
        this.extraIngs.push(RF.parseLine(txt));
        this.inlineDirty = true;
        this.refresh();
      });
    }
    editStepInline(k) {
      k = +k;
      const steps = this.shown().steps;
      const cur = steps[k] || '';
      ask(`Passo ${k + 1}`, 'Scrivi il testo del passaggio', cur.replace(/\s*→ Versione leggera:.*$/, ''), true, txt => {
        this.stepEdits[k] = txt;
        this.inlineDirty = true;
        this.refresh();
      });
    }
    addStepInline() {
      ask('Nuovo passaggio', 'Descrivi il passaggio (es. Cuoci in forno 15 minuti)', '', true, txt => {
        this.extraSteps.push(txt);
        this.inlineDirty = true;
        this.refresh();
      });
    }
    saveInlineAsMine() {
      const r = RF.copy(this.forCooking());
      r.id = 'my-' + Date.now().toString(36);
      r.source = 'Le mie ricette';
      r.light = false;
      saveMine(r);
      this.inlineDirty = false;
      toast('Salvata tra «Le mie ricette»');
      this.base = r;
      this.ingEdits = {}; this.removedIngs.clear(); this.extraIngs = []; this.stepEdits = {}; this.extraSteps = [];
      this.refresh();
    }
    resetInline() {
      this.ingEdits = {}; this.removedIngs.clear(); this.extraIngs = []; this.stepEdits = {}; this.extraSteps = []; this.inlineDirty = false;
      toast('Modifiche ripristinate');
      this.refresh();
    }
    menu() {
      const mine = isMine(this.base), bi = isBuiltin(this.base);
      const items = [mine ? 'Modifica la ricetta' : 'Modifica una copia tra le mie', 'Leggi gli ingredienti ad alta voce', mine ? 'Elimina definitivamente' : 'Rimuovi dalle ricette cercate'];
      choose(this.base.title, items, i => {
        if (i === 0) {
          const c = RF.copy(this.base);
          if (!mine) { c.id = 'my-' + Date.now().toString(36); c.source = 'Le mie ricette'; if (c.kind.startsWith('idea:')) c.kind = ''; }
          nav.push(new Editor(c));
        } else if (i === 1) {
          const r = this.shown(), f = this.factor(r);
          speak(`Ingredienti per ${this.servings} porzioni. ` + r.ingredients.map(x => RF.quantityLabel(x, f) + ' di ' + x.name).join('. '));
        } else confirmBox(items[2] + '?', mine ? 'La ricetta, le note e la foto verranno eliminate per sempre. Non si può annullare.' : 'Potrai ritrovarla cercandola di nuovo.', 'OK', () => { del(this.base); nav.back(); }, mine);
      }, 2);
    }
  }

  // =====================================================================
  // MODALITÀ CUCINA
  // =====================================================================
  let timerBase = 0;
  class CookScreen extends Screen {
    constructor(r) { super(); this.r = r; this.step = 0; this.voice = S.speakSteps; this.tb = ++timerBase * 1000; }
    get title() { return this.r.title; }
    get fullScreen() { return true; }
    actions() { return ibtn('list', 'ingr') + `<button class="ibtn ${this.voice ? 'soft acc' : ''}" data-a="toggleVoice" style="${this.voice ? '' : 'color:var(--muted)'}">${ic('speaker')}</button>`; }
    render() {
      const r = this.r, n = r.steps.length;
      if (!n) return empty('book', 'Questa ricetta non ha passaggi', '');
      const st = r.steps[this.step], secs = RF.seconds(st), id = this.tb + this.step;
      let h = `<div class="cookwrap"><div class="prog">${r.steps.map((_, i) => `<i class="${i <= this.step ? 'on' : ''}"></i>`).join('')}</div>`
        + `<div class="small acc mt16">Passo ${this.step + 1} di ${n} · ${RF.KIND_LABEL[RF.classify(st)]}</div>`
        + `<div class="art cookart" id="cookart">${RF.stepSvg(st, dark)}</div><div class="cooktext">${stepHtml(st)}</div>`;
      if (secs) {
        const left = Timers.left(id), t = Timers.list[id], running = t && t.running;
        h += `<div class="card tinted"><div class="row"><span class="acc">${ic('timer')}</span><span class="timer grow" data-timer="${id}">${RF.fmtSecs(left == null ? secs : left)}</span>`
          + (running ? ibtn('pause', 'tPause', id, 'fill') : ibtn('play', 'tStart', id, 'fill'))
          + (left != null && !running ? ibtn('refresh', 'tReset', id, 'soft') : '') + '</div>'
          + `<div class="muted mt8">${running ? 'Tieni l\'app aperta: suona e ti avvisa quando finisce.' : left === 0 ? 'Tempo scaduto!' : 'Tocca ▶ per avviare il timer'}</div></div>`;
      }
      h += `<div class="mt12">${btn('Leggi il passo', 'speaker', 'block', 'sayNow')}</div>`;
      h += `<div class="spacer"></div><div class="btns" style="margin-top:22px">${this.step > 0 ? btn('Indietro', 'prev', '', 'prev') : ''}${this.step < n - 1 ? btn('Avanti', 'next', 'pri', 'next') : btn('Fatto, buon appetito!', 'check', 'pri', 'done')}</div></div>`;
      return h;
    }
    after(view) {
      const art = $('#cookart', view);
      if (!art) return;
      let x0 = null, y0 = null;
      art.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
      art.addEventListener('touchend', e => {
        if (x0 == null) return;
        const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0) this.next(); else this.prev(); }
        x0 = null;
      });
    }
    go(s) { this.step = s; this.refresh(); $('#view').scrollTop = 0; if (this.voice) this.say(); }
    next() { if (this.step < this.r.steps.length - 1) this.go(this.step + 1); }
    prev() { if (this.step > 0) this.go(this.step - 1); }
    say() { speak(`Passo ${this.step + 1}. ` + this.r.steps[this.step]); }
    sayNow() { if ('speechSynthesis' in window && speechSynthesis.speaking) { stopSpeaking(); toast('Voce fermata'); } else this.say(); }
    toggleVoice() { this.voice = !this.voice; if (this.voice) this.say(); else stopSpeaking(); toast(this.voice ? 'Lettura ad alta voce attiva' : 'Lettura disattivata'); this.rebuild(); }
    tStart(id) {
      id = +id;
      const left = Timers.left(id), secs = RF.seconds(this.r.steps[this.step]);
      Timers.start(id, left && left > 0 ? left : secs, `${this.r.title} · passo ${this.step + 1}`);
      this.refresh();
    }
    tPause(id) { Timers.pause(+id); this.refresh(); }
    tReset(id) { Timers.reset(+id); this.refresh(); }
    ingr() { alertBox(`Ingredienti (${this.r.servings} porz.)`, this.r.ingredients.map(i => `•  ${i.name} — ${RF.quantityLabel(i)}`).join('\n')); }
    done() {
      const p = personal(this.r.id); p.cooked++; setPersonal(this.r.id, p);
      stopSpeaking(); toast('Buon appetito! 🍽️'); nav.back();
    }
    leave() { stopSpeaking(); keepAwake(false); }
  }

  // =====================================================================
  // COSA CUCINO?
  // =====================================================================
  class Fridge extends Screen {
    constructor() { super(); this.ideas = null; this.extra = ''; }
    get title() { return 'Cosa cucino?'; }
    render() {
      let h = `<p class="muted" style="margin-top:0">Scrivi cosa hai in frigo e in dispensa: ti propongo ricette vere dal web che lo usano, e quelle salvate che puoi già fare.</p>`;
      h += `<div class="card"><div class="row"><h2 class="grow">Il tuo frigo</h2>${S.fridge.length ? '<button class="link danger" data-a="clear">Svuota</button>' : ''}</div>`
        + `<div class="row mt12"><input class="input grow" id="fadd" placeholder="Aggiungi (es. zucchine, uova)" enterkeyhint="done" data-enter="add">${ibtn('plus', 'add', undefined, 'fill')}</div>`;
      h += S.fridge.length ? `<div class="flow mt12">${S.fridge.map(f => chip(f + '  ✕', true, 'remove', f)).join('')}</div>` : `<p class="muted">Il frigo è vuoto: aggiungi qualcosa o tocca i suggerimenti qui sotto.</p>`;
      const sug = RF.SUGGEST.filter(s => !S.fridge.some(f => f.toLowerCase() === s)).slice(0, 14);
      h += `<div class="small mt16">Suggerimenti</div><div class="flow mt8">${sug.map(s => chip('+ ' + s, false, 'addOne', s)).join('')}</div>`;
      h += `<div class="mt16">${toggleRow('Ho sempre sale, olio, pepe, zucchero e aceto', 'Non li conto tra gli ingredienti mancanti', S.staples, 'staples')}</div></div>`;

      h += `<div class="card"><div class="row"><span class="acc">${ic('globe')}</span><h2 class="grow">Idee dal web</h2></div>`
        + `<input class="input mt12" id="wish" placeholder="Preferenze (facoltativo): veloce, vegetariano, al forno…" value="${esc(this.extra)}">`
        + `<div class="mt12">${btn(this.ideas ? 'Altre idee' : 'Trova ricette con quello che ho', 'magic', 'pri block', 'find')}</div>`;
      if (this.ideas) {
        this.ideas.forEach((i, k) => {
          h += `<div class="idea" data-a="openIdea" data-x="${k}"><div class="row"><h3 class="grow">${esc(i.title)}</h3>${i.minutes ? pill(i.minutes + ' min', 'acc') : ''}</div>`
            + (i.description ? `<div class="muted mt4">${esc(i.description)}</div>` : '')
            + (i.uses.length ? `<div class="acc mt8" style="font-weight:700;font-size:13.5px">✓ Usa: ${esc(i.uses.join(', '))}</div>` : '')
            + `<div class="${i.missing.length ? 'warn' : 'acc'} mt4" style="font-weight:700;font-size:13.5px">${i.missing.length ? 'Ti manca: ' + esc(i.missing.join(', ')) : 'Hai tutto!'}</div></div>`;
        });
        h += `<p class="muted">Tocca un'idea: preparo la ricetta completa incrociando più fonti.</p>`;
      } else if (!ai().ready) h += `<p class="muted">Serve la chiave gratuita di Gemini (Altro → Impostazioni).</p>`;
      h += '</div>';

      h += `<div class="card"><h2>Tra le ricette salvate</h2>`;
      if (!S.fridge.length) h += `<p class="muted">Aggiungi ingredienti per vedere cosa puoi già fare.</p>`;
      else {
        const ranked = allKnown().filter(r => !Ai.isStub(r) && r.ingredients.length).map(r => [r, RF.pantryMatch(S.fridge, S.staples, r)]).filter(x => x[1].have > 0)
          .sort((a, b) => (b[1].ratio - a[1].ratio) || (b[1].have - a[1].have)).slice(0, 12);
        if (!ranked.length) h += `<p class="muted">Nessuna ricetta salvata usa questi ingredienti: prova le idee dal web.</p>`;
        for (const [r, m] of ranked) {
          const pct = Math.round(m.ratio * 100), col = m.ratio >= 0.999 ? 'var(--accent)' : 'var(--warn)';
          const ring = `<svg viewBox="0 0 40 40" style="width:40px;height:40px;flex:none"><circle cx="20" cy="20" r="15" fill="none" stroke="var(--line)" stroke-width="4.5"/><circle cx="20" cy="20" r="15" fill="none" stroke="${col}" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="${(94.2 * m.ratio).toFixed(1)} 200" transform="rotate(-90 20 20)"/><text x="20" y="24" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--text)">${pct}%</text></svg>`;
          h += `<div class="lrow" data-a="openId" data-x="${esc(r.id)}">${cover(r, 'mini')}<div class="grow"><h3>${esc(r.title)}</h3><div class="${m.missing.length ? '' : 'acc'} mt4" style="font-weight:700;font-size:13.5px">Hai ${m.have} ingredienti su ${m.total}</div>`
            + (m.missing.length ? `<div class="muted mt4">Manca: ${esc(m.missing.slice(0, 4).join(', '))}${m.missing.length > 4 ? '…' : ''}</div>` : '') + `</div>${ring}</div>`;
        }
      }
      return h + '</div>';
    }
    add() {
      const inp = $('#fadd'); if (!inp) return;
      let any = false;
      for (const part of inp.value.split(/[,;\n]/)) { const s = part.trim().toLowerCase(); if (s && !S.fridge.some(f => f.toLowerCase() === s)) { S.fridge.push(s); any = true; } }
      if (any) { save(); this.refresh(); setTimeout(() => { const i = $('#fadd'); if (i) i.focus(); }, 30); }
    }
    addOne(s) { if (!S.fridge.includes(s)) { S.fridge.push(s); save(); this.refresh(); } }
    remove(s) { S.fridge = S.fridge.filter(f => f !== s); save(); this.refresh(); }
    clear() { confirmBox('Svuotare il frigo?', 'Togli tutti gli ingredienti dalla lista.', 'Svuota', () => { S.fridge = []; this.ideas = null; save(); this.refresh(); }, true); }
    staples(x, el) { S.staples = el.checked; save(); this.refresh(); }
    async find() {
      this.extra = ($('#wish') || {}).value ? $('#wish').value.trim() : '';
      if (!ai().ready) { needKey(); return; }
      if (!S.fridge.length && !this.extra) { toast('Aggiungi almeno un ingrediente'); return; }
      let req = '';
      if (S.fridge.length) req += 'Ingredients I have at home: ' + S.fridge.join(', ') + '. Suggest recipes that mainly use them.';
      if (S.staples) req += ' I always have salt, pepper, oil, sugar and vinegar.';
      if (this.extra) req += ' Preferences: ' + this.extra + '.';
      try { this.ideas = await run('Cerco ricette con quello che hai…', p => ai().ideas(req, 8, p)); this.refresh(); } catch (e) { }
    }
    openIdea(k) { const i = this.ideas[+k]; openRecipe(Ai.stub(i.title, i.description, i.search, i.minutes)); }
  }

  // =====================================================================
  // PIANO SETTIMANALE
  // =====================================================================
  class Planner extends Screen {
    constructor() { super(); this.week = 0; }
    get title() { return 'Piano'; }
    day(i) { const d = monday(this.week); d.setDate(d.getDate() + i); return d; }
    render() {
      const wt = this.week === 0 ? 'Questa settimana' : this.week === 1 ? 'Prossima settimana' : this.week === -1 ? 'Settimana scorsa' : 'Settimana';
      let h = `<div class="row">${ibtn('prev', 'prevWeek', undefined, 'soft')}<div class="grow" style="text-align:center"><h3>${wt}</h3><div class="muted">${fmtDate(this.day(0), { day: 'numeric', month: 'short' })} – ${fmtDate(this.day(6), { day: 'numeric', month: 'short' })}</div></div>${ibtn('next', 'nextWeek', undefined, 'soft')}</div>`;
      let planned = 0, known = 0, kc = 0;
      for (let i = 0; i < 7; i++) for (const m of [LUNCH, DINNER]) {
        const e = S.plan[planKey(this.day(i), m)]; if (!e) continue;
        planned++; const r = cached(e.recipe); if (!Ai.isStub(r)) { known++; kc += RF.perServing(r).kcal; }
      }
      h += `<div class="btns">${btn('Proponi il menù', 'magic', 'pri', 'propose')}${btn('Spesa', 'cart', '', 'shopWeek')}</div>`;
      if (planned) h += `<p class="muted">${planned} ${planned === 1 ? 'pasto pianificato' : 'pasti pianificati'}${known ? ' · in media ' + kcal(kc / known) + ' kcal a pasto' : ''}</p>`;
      const today = ymd(new Date());
      for (let i = 0; i < 7; i++) {
        const d = this.day(i), isToday = ymd(d) === today;
        h += `<div class="card day ${isToday ? 'today' : ''}" style="padding:12px 14px 10px"><div class="row"><h3 class="grow">${esc(cap(fmtDate(d, { weekday: 'long', day: 'numeric' })))}</h3>${isToday ? pill('Oggi', 'acc') : ''}</div>`
          + this.slot(d, LUNCH, 'Pranzo') + this.slot(d, DINNER, 'Cena') + '</div>';
      }
      h += `<div class="mt16">${btn('Svuota la settimana', 'trash', 'txt block', 'clearWeek')}</div>`;
      return h;
    }
    slot(d, meal, label) {
      const key = planKey(d, meal), e = S.plan[key];
      let h = `<div class="slot"><span class="small lbl">${label}</span>`;
      if (!e) h += `<button class="add" data-a="pick" data-x="${key}">+ Aggiungi</button>`;
      else {
        const r = cached(e.recipe), stub = Ai.isStub(r);
        h += `<div class="meal" data-a="openPlan" data-x="${key}" data-long="slotMenu">${cover(r, 'mini s')}<div class="grow" style="min-width:0"><div style="font-weight:700;font-size:14.5px;line-height:1.25">${esc(r.title)}</div><div class="muted" style="font-size:12.5px;margin-top:2px">${e.servings} porz. · ${stub ? 'ricetta pronta al primo tocco' : kcal(RF.perServing(r).kcal) + ' kcal'}</div></div></div>${ibtn('dots', 'slotMenu', key)}`;
      }
      return h + '</div>';
    }
    prevWeek() { this.week--; this.refresh(); }
    nextWeek() { this.week++; this.refresh(); }
    pick(key) { nav.push(new Picker(key, 'Scegli il piatto')); }
    openPlan(key) { const e = S.plan[key]; if (e) openRecipe(e.recipe); }
    slotMenu(key) {
      const e = S.plan[key]; if (!e) return;
      choose(e.recipe.title, ['Cambia piatto', 'Porzioni: ' + e.servings, 'Togli dal piano'], i => {
        if (i === 0) nav.push(new Picker(key, 'Cambia piatto'));
        else if (i === 1) choose('Quante porzioni?', [1, 2, 3, 4, 5, 6, 7, 8].map(n => n + (n === 1 ? ' porzione' : ' porzioni')), k => { e.servings = k + 1; save(); this.refresh(); });
        else { delete S.plan[key]; save(); this.refresh(); }
      }, 2);
    }
    clearWeek() {
      confirmBox('Svuotare la settimana?', 'Tolgo tutti i pasti di questa settimana dal piano.', 'Svuota', () => {
        for (let i = 0; i < 7; i++) { delete S.plan[planKey(this.day(i), LUNCH)]; delete S.plan[planKey(this.day(i), DINNER)]; }
        save(); this.refresh();
      }, true);
    }
    propose() {
      if (!ai().ready) { needKey(); return; }
      ask('Menù della settimana', 'Desideri (facoltativo): pesce 2 volte, cene leggere…', '', false, async wishes => {
        try {
          const days = await run('Preparo il menù della settimana…', p => ai().weekMenu(S.household, S.fridge, wishes, p));
          let filled = 0;
          days.slice(0, 7).forEach((pair, i) => [LUNCH, DINNER].forEach((m, k) => {
            const dish = (pair[k] || '').trim(), key = planKey(this.day(i), m);
            if (!dish || S.plan[key]) return;
            S.plan[key] = { recipe: Ai.stub(dish, '', dish, 0), servings: S.household }; filled++;
          }));
          save(); this.refresh();
          toast(filled ? `Aggiunti ${filled} pasti: tocca un piatto per la ricetta completa` : 'La settimana era già piena');
        } catch (e) { }
      }, { allowEmpty: true, ok: 'Proponi' });
    }
    shopWeek() {
      const keys = [];
      let stubs = 0;
      for (let i = 0; i < 7; i++) for (const m of [LUNCH, DINNER]) { const k = planKey(this.day(i), m), e = S.plan[k]; if (!e) continue; keys.push(k); if (Ai.isStub(cached(e.recipe))) stubs++; }
      if (!keys.length) { toast('La settimana è vuota'); return; }
      if (stubs && !ai().ready) { needKey(); return; }
      const go = async () => {
        try {
          const n = await run(stubs ? 'Preparo le ricette della settimana…' : 'Aggiungo alla spesa…', async p => {
            let done = 0, added = 0;
            for (const k of keys) {
              const e = S.plan[k]; if (!e) continue;
              let r = cached(e.recipe);
              if (Ai.isStub(r)) { done++; p(`Ricetta ${done} di ${stubs}: «${r.title}»…`); r = await resolve(r, null); }
              added += addToShopping(r, e.servings / Math.max(1, r.servings), S.fridge.length > 0);
            }
            return added;
          });
          this.refresh(); toast(`Aggiunti ${n} prodotti alla lista della spesa`);
        } catch (e) { this.refresh(); }
      };
      if (stubs) confirmBox('Spesa della settimana', `Preparo le ${stubs} ricette ancora da cercare sul web (circa 20-30 secondi l'una) e aggiungo gli ingredienti${S.fridge.length ? ' che mancano nel frigo' : ''}.`, 'Vai', go);
      else go();
    }
  }

  class Picker extends Screen {
    constructor(key, label) { super(); this.key = key; this.label = label; this.q = ''; }
    get title() { return this.label; }
    render() {
      return `<div class="search" style="margin-top:0">${ic('search')}<input class="input" placeholder="Scrivi un piatto o cerca tra le tue" data-in="typed" data-enter="useWeb" enterkeyhint="done"></div><div id="plist">${this.list()}</div>`;
    }
    typed(x, el) { this.q = el.value; $('#plist').innerHTML = this.list(); hydratePhotos($('#plist')); }
    list() {
      const t = this.q.trim(), ql = t.toLowerCase();
      let h = t ? `<div class="mt12">${btn(`Usa «${t}» dal web`, 'globe', 'pri block', 'useWeb')}</div><p class="muted">La ricetta completa viene cercata quando la apri o quando fai la spesa della settimana.</p>` : '';
      const rs = allKnown().filter(r => !ql || r.title.toLowerCase().includes(ql));
      h += `<div class="small mt16">${t ? 'Tra le ricette salvate' : 'Le tue ricette e il ricettario'}</div>`;
      h += rs.length ? rs.map(r => miniRow(r, 'choose', r.id, (r.minutes ? r.minutes + ' min · ' : '') + kcal(RF.perServing(r).kcal) + ' kcal')).join('') : `<p class="muted">Nessuna ricetta salvata: usa il bottone qui sopra per cercarla sul web.</p>`;
      return h;
    }
    useWeb() { const t = this.q.trim(); if (t) this.put(Ai.stub(cap(t), '', t, 0)); }
    choose(id) { const r = allKnown().find(x => x.id === id); if (r) this.put(r); }
    put(r) { const old = S.plan[this.key]; S.plan[this.key] = { recipe: r, servings: old ? old.servings : S.household }; save(); nav.back(); }
  }

  // =====================================================================
  // SPESA
  // =====================================================================
  class Shopping extends Screen {
    get title() { return 'Spesa'; }
    actions() { return S.shopping.length ? ibtn('share', 'shareList') + ibtn('dots', 'menu') : ''; }
    render() {
      let h = `<div class="row"><input class="input grow" id="sadd" placeholder="Aggiungi (es. 2 l latte, pane)" data-enter="add" enterkeyhint="done">${ibtn('plus', 'add', undefined, 'fill')}</div>`;
      if (!S.shopping.length) return h + empty('cart', 'La lista è vuota', 'Apri una ricetta e tocca «Spesa», oppure fai la spesa di tutta la settimana dal Piano.');
      const todo = S.shopping.filter(s => !s.checked).length;
      h += `<p class="muted mt12">${todo === 0 ? 'Hai preso tutto! 🎉' : todo + (todo === 1 ? ' prodotto da prendere' : ' prodotti da prendere') + ' · tocca per spuntare'}</p>`;
      for (const a of RF.AISLES) {
        const items = S.shopping.map((s, i) => [s, i]).filter(([s]) => !s.checked && aisleGroup(s.aisle) === a);
        if (items.length) h += `<div class="card" style="padding:12px 14px 6px"><div class="small acc">${a}</div>${items.map(([s, i]) => this.item(s, i)).join('')}</div>`;
      }
      const done = S.shopping.map((s, i) => [s, i]).filter(([s]) => s.checked);
      if (done.length) h += `<div class="card" style="padding:12px 14px 6px"><div class="row"><div class="small grow">Nel carrello (${done.length})</div><button class="link danger" data-a="clearChecked">Togli</button></div>${done.map(([s, i]) => this.item(s, i)).join('')}</div>`;
      return h;
    }
    item(s, i) {
      return `<div class="shop ${s.checked ? 'done' : ''}" data-a="check" data-x="${i}" data-long="itemMenu"><span class="box ${s.checked ? 'on' : ''}">${s.checked ? ic('check') : ''}</span><div class="grow"><div class="n">${esc(s.name)}</div>${s.recipes && !s.checked ? `<div class="muted" style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.recipes)}</div>` : ''}</div><b style="font-size:14.5px;${s.checked ? 'color:var(--muted)' : ''}">${esc(shopQty(s))}</b></div>`;
    }
    add() {
      const inp = $('#sadd'); if (!inp) return;
      const parts = inp.value.split(/[,;\n]/).map(x => x.trim()).filter(Boolean);
      parts.forEach(addManual);
      if (parts.length) { this.rebuild(); setTimeout(() => { const i = $('#sadd'); if (i) i.focus(); }, 30); }
    }
    check(i) { const s = S.shopping[+i]; if (!s) return; s.checked = !s.checked; save(); this.refresh(); }
    itemMenu(i) {
      const s = S.shopping[+i]; if (!s) return;
      choose(s.name, ['Modifica', 'Elimina'], k => {
        if (k === 1) { S.shopping.splice(+i, 1); save(); this.rebuild(); return; }
        ask('Modifica', 'es. 500 g farina', (s.amount > 0 ? RF.fmtNum(s.amount) + ' ' + s.unit + ' ' : '') + s.name, false, t => {
          const p = RF.parseLine(t); Object.assign(s, { name: p.name, amount: p.amount, unit: p.unit, aisle: RF.aisleOf(p.name) }); save(); this.refresh();
        });
      }, 1);
    }
    clearChecked() { S.shopping = S.shopping.filter(s => !s.checked); save(); this.rebuild(); }
    shareList() { share('Lista della spesa', shoppingText()); }
    menu() {
      choose('Lista della spesa', ['Togli i prodotti spuntati', 'Copia la lista', 'Svuota tutta la lista'], i => {
        if (i === 0) this.clearChecked();
        else if (i === 1) navigator.clipboard.writeText(shoppingText()).then(() => toast('Lista copiata'), () => alertBox('Lista della spesa', shoppingText()));
        else confirmBox('Svuotare la lista?', 'Tutti i prodotti verranno eliminati.', 'Svuota', () => { S.shopping = []; save(); this.rebuild(); }, true);
      }, 2);
    }
  }

  // =====================================================================
  // ALTRO, LE MIE RICETTE, EDITOR, IMPORTAZIONE, IMPOSTAZIONI
  // =====================================================================
  function newRecipe() { nav.push(new Editor(RF.normRecipe({ id: 'my-' + Date.now().toString(36), title: '', source: 'Le mie ricette', servings: 2 }))); }

  class More extends Screen {
    get title() { return 'Altro'; }
    render() {
      const cooked = Object.values(S.personal).reduce((a, p) => a + (p.cooked || 0), 0);
      const stat = (n, l) => `<div class="card stat"><b>${n}</b><span class="muted">${l}</span></div>`;
      const item = (icon, t, sub, a) => `<div class="lrow" ${A(a)}><span class="icbox">${ic(icon)}</span><div class="grow"><h3>${t}</h3><div class="muted mt4">${esc(sub)}</div></div><span style="color:var(--muted)">${ic('next')}</span></div>`;
      return `<div class="row" style="margin-top:-14px">${stat(S.imported.length, 'ricette tue')}${stat(S.favorites.length, 'preferite')}${stat(cooked, 'piatti cucinati')}</div>`
        + `<div class="card menu" style="padding:6px">${item('book', 'Le mie ricette', 'Scrivi, modifica e organizza le tue ricette', 'mine')}${item('edit', 'Nuova ricetta', 'Con calcolo automatico di calorie e reparti', 'newOne')}`
        + `${item('copy', 'Importa da un testo', 'Didascalie, trascrizioni, pagine web', 'importText')}${item('heart', 'Preferiti', S.favorites.length ? S.favorites.length + ' ricette' : 'Ancora nessuno', 'favs')}${item('gear', 'Impostazioni', 'Gemini, lingua, tema, famiglia', 'settings')}</div>`
        + `<div class="card"><div class="row"><img src="icons/icon-192.png" alt="" style="width:48px;height:48px;border-radius:12px"><div class="grow"><h3>RecipeFlow</h3><div class="muted mt4">Web app · versione 1.0 · di Arturo Clemente</div></div></div>`
        + `<p class="muted">Ricette dal web con Google Gemini (piano gratuito), versione leggera calcolata sul telefono, impasti con parametri, piano settimanale e spesa. I dati restano su questo telefono. I valori nutrizionali sono stime da tabelle medie e non sostituiscono il parere di un nutrizionista.</p>`
        + (isStandalone() ? '' : `<div class="res"><b>Installala sul telefono</b><div class="muted mt4">iPhone: in Safari tocca Condividi → «Aggiungi alla schermata Home». Android: menu ⋮ di Chrome → «Installa app».</div></div>`) + '</div>';
    }
    mine() { nav.push(new MyRecipes()); }
    newOne() { newRecipe(); }
    importText() { nav.push(new ImportScreen('')); }
    favs() { nav.push(new Favorites()); }
    settings() { nav.push(new SettingsScreen()); }
  }

  class Favorites extends Screen {
    get title() { return 'Preferiti'; }
    render() { return S.favorites.length ? grid(S.favorites) : empty('heart', 'Ancora nessun preferito', 'Tocca il cuore in alto in una ricetta.'); }
  }

  class MyRecipes extends Screen {
    get title() { return 'Le mie ricette'; }
    actions() { return ibtn('plus', 'newOne'); }
    render() {
      let h = `<div class="btns" style="margin-top:0">${btn('Nuova', 'edit', 'pri', 'newOne')}${btn('Da un testo', 'copy', '', 'fromText')}</div>`;
      if (!S.imported.length) return h + empty('book', 'Nessuna ricetta tua', 'Scrivila tu, incolla un testo oppure salva e modifica una ricetta trovata sul web.')
        + (samplesLeft() ? `<div class="btns">${btn('Aggiungi le ricette di esempio', 'plus', 'block', 'samples')}</div>` : '');
      return h + `<div class="small mt16">${S.imported.length} ${S.imported.length === 1 ? 'ricetta' : 'ricette'} · tieni premuto per eliminarla definitivamente</div>` + grid(S.imported)
        + `<div class="mt16">${btn('Elimina tutte le mie ricette', 'trash', 'danger block', 'deleteAll')}</div>`;
    }
    newOne() { newRecipe(); }
    fromText() { nav.push(new ImportScreen('')); }
  }

  class Editor extends Screen {
    constructor(r) { super(); this.r = r; this.servings = Math.max(1, r.servings); this.difficulty = r.difficulty; }
    get title() { return this.r.title ? 'Modifica' : 'Nuova ricetta'; }
    actions() { return `<button class="link" style="font-size:16px" data-a="save">Salva</button>`; }
    render() {
      const r = this.r, f = (label, inner) => `<div class="field"><span class="small">${label}</span>${inner}</div>`;
      return f('Titolo', `<input class="input" id="e-title" placeholder="es. Lasagne della nonna" value="${esc(r.title)}">`)
        + f('Descrizione', `<textarea class="input" id="e-desc" rows="2" placeholder="Due righe sul piatto (facoltativo)">${esc(r.description)}</textarea>`)
        + `<div class="row field"><div><span class="small" style="display:block;margin-bottom:6px">Porzioni</span>${stepper(String(this.servings), 'sMinus', 'sPlus')}</div><div class="grow"><span class="small" style="display:block;margin-bottom:6px">Minuti</span><input class="input" id="e-min" inputmode="numeric" placeholder="30" value="${r.minutes || ''}"></div></div>`
        + f('Difficoltà', `<div class="flow">${['Facile', 'Media', 'Difficile'].map(d => chip(d, d === this.difficulty, 'diff', d)).join('')}</div>`)
        + f('Tag (separati da virgola)', `<input class="input" id="e-tags" placeholder="es. Vegetariana, Veloce, Dolce" value="${esc(r.tags.join(', '))}">`)
        + f('Ingredienti, uno per riga', `<textarea class="input" id="e-ings" rows="7" placeholder="200 g farina&#10;2 uova&#10;1 cucchiaio di olio&#10;sale q.b.">${esc(r.ingredients.map(RF.lineOf).join('\n'))}</textarea>`)
        + `<p class="muted">Scrivi quantità, unità e nome: le calorie e i reparti della spesa si calcolano da soli.</p>`
        + f('Procedimento, un passaggio per paragrafo', `<textarea class="input" id="e-steps" rows="9" placeholder="Lascia una riga vuota tra un passaggio e l'altro.&#10;Scrivi i tempi (es. 10 minuti): diventano timer.">${esc(r.steps.map(s => s.replace(/\s*→ Versione leggera:.*$/, '')).join('\n\n'))}</textarea>`)
        + `<div class="mt16">${btn('Salva la ricetta', 'check', 'pri block', 'save')}</div>`;
    }
    keep() {
      const v = id => ($('#' + id) || {}).value;
      if ($('#e-title')) Object.assign(this.r, { title: v('e-title'), description: v('e-desc'), minutes: parseInt(v('e-min'), 10) || 0 });
      this.draft = { tags: v('e-tags'), ings: v('e-ings'), steps: v('e-steps') };
    }
    after() {
      if (this.draft) { $('#e-tags').value = this.draft.tags; $('#e-ings').value = this.draft.ings; $('#e-steps').value = this.draft.steps; }
    }
    sMinus() { this.keep(); if (this.servings > 1) this.servings--; this.refresh(); }
    sPlus() { this.keep(); if (this.servings < 40) this.servings++; this.refresh(); }
    diff(d) { this.keep(); this.difficulty = d; this.refresh(); }
    save() {
      const t = $('#e-title').value.trim();
      if (!t) { toast('Dai un titolo alla ricetta'); $('#e-title').focus(); return; }
      const old = {}; for (const i of this.r.ingredients) old[RF.lineOf(i)] = i;
      const n = RF.copy(this.r);
      n.title = t; n.description = $('#e-desc').value.trim(); n.servings = this.servings; n.minutes = parseInt($('#e-min').value, 10) || 0; n.difficulty = this.difficulty;
      n.tags = $('#e-tags').value.split(',').map(x => x.trim()).filter(Boolean).map(cap);
      n.ingredients = $('#e-ings').value.split('\n').map(l => l.trim()).filter(Boolean).map(l => old[l] ? RF.copy(old[l]) : RF.parseLine(l));
      const all = $('#e-steps').value.trim();
      n.steps = (all.includes('\n\n') ? all.split(/\n\s*\n/) : all.split('\n')).map(p => p.trim().replace(/^\d+[.)]\s*/, '').replace(/\n/g, ' ')).filter(Boolean);
      n.light = false;
      if (n.kind.startsWith('idea:')) n.kind = '';
      if (!n.source || n.source.startsWith('Idea')) n.source = 'Le mie ricette';
      saveMine(n);
      toast('Ricetta salvata');
      nav.stack.pop();
      if (nav.top() instanceof RecipeScreen) nav.stack.pop();
      nav.stack.push(new RecipeScreen(n));
      history.replaceState({ d: nav.stack.length }, '');
      nav.draw(false);
    }
  }

  class ImportScreen extends Screen {
    constructor(text) { super(); this.text = text; }
    get title() { return 'Importa da un testo'; }
    render() {
      return `<p class="muted" style="margin-top:0">Incolla la didascalia di un video, il testo di una pagina o la ricetta della nonna: Gemini la trasforma in una ricetta con quantità, passaggi e valori.</p>`
        + `<textarea class="input mt12" id="imp" rows="12" placeholder="Incolla qui il testo…">${esc(this.text)}</textarea>`
        + `<div class="mt12">${btn('Crea la ricetta', 'magic', 'pri block', 'go')}</div><p class="muted mt12">Vuoi solo il nome di un piatto? Scrivilo in Scopri e tocca «Cerca sul web».</p>`;
    }
    async go() {
      this.text = $('#imp').value.trim();
      if (this.text.length < 20) { toast('Incolla un testo un po\' più lungo'); return; }
      if (!ai().ready) { needKey(); return; }
      try {
        const r = await run('Leggo la ricetta…', () => ai().importText(this.text));
        nav.stack.pop(); nav.stack.push(new Editor(r));
        history.replaceState({ d: nav.stack.length }, '');
        nav.draw(false); toast('Controlla e salva');
      } catch (e) { }
    }
  }

  class SettingsScreen extends Screen {
    get title() { return 'Impostazioni'; }
    render() {
      let h = `<div class="card" style="margin-top:0"><div class="row"><span class="acc">${ic('magic')}</span><h2 class="grow">Google Gemini (gratis)</h2></div>`
        + `<p class="muted">Serve per cercare ricette sul web, le idee con il frigo, il menù della settimana, il coach e l'importazione.</p>`
        + `<div class="field"><span class="small">Chiave API</span><input class="input" id="s-key" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Incolla la chiave (inizia con AIza…)" value="${esc(S.geminiKey)}" style="font-family:ui-monospace,Menlo,monospace;font-size:14px"></div>`
        + `<div class="field"><span class="small">Modello</span><input class="input" id="s-model" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${RF.DEFAULT_MODEL}" value="${esc(S.geminiModel)}"></div>`
        + `<div class="btns">${btn('Salva e prova', 'check', 'pri', 'saveKey')}${btn('Ottieni la chiave', 'globe', '', 'getKey')}</div>`
        + `<p class="muted mt12">Come si fa: apri aistudio.google.com, accedi con il tuo account Google, tocca «Create API key», copiala e incollala qui. Il piano gratuito basta per l'uso di tutti i giorni. La chiave resta solo su questo telefono.</p></div>`;
      h += `<div class="card"><h2>Lingua delle ricette dal web</h2><div class="flow mt12">${RF.LANGS.map(l => chip(l[1], l[0] === S.lang, 'setLang', l[0])).join('')}</div></div>`;
      h += `<div class="card"><h2>Aspetto</h2><div class="small mt12">Colore</div><div class="flow mt8">${ACCENTS.map(([n, a, b]) => `<button class="chip ${n === S.accent ? 'on' : ''}" data-a="setAccent" data-x="${n}" style="display:flex;gap:8px;align-items:center${n === S.accent ? `;background:color-mix(in srgb, ${a} 25%, var(--surface));border-color:${a};color:var(--text)` : ''}"><span class="dot2" style="background:linear-gradient(135deg,${a},${b})"></span>${n}</button>`).join('')}</div>`
        + `<div class="small mt16">Tema</div><div class="flow mt8">${[['system', 'Come il telefono'], ['light', 'Chiaro'], ['dark', 'Scuro']].map(([k, l]) => chip(l, k === S.appearance, 'setMode', k)).join('')}</div></div>`;
      h += `<div class="card"><h2>In cucina</h2><div class="row mt12"><div class="grow"><h3>Persone in casa</h3><div class="muted mt4">Porzioni predefinite del piano settimanale</div></div>${stepper(String(S.household), 'hMinus', 'hPlus')}</div>`
        + `<div class="mt16">${toggleRow('Leggi i passaggi ad alta voce', 'In modalità cucina, appena cambi passaggio', S.speakSteps, 'setSpeak')}</div>`
        + `<div class="small mt16">Velocità della voce</div><div class="flow mt8">${[['Lenta', 0.85], ['Normale', 1], ['Veloce', 1.2]].map(([l, v]) => chip(l, S.speakRate === v, 'setRate', String(v))).join('')}</div>`
        + `<div class="mt12">${btn('Prova la voce', 'speaker', 'block', 'testVoice')}</div></div>`;
      h += `<div class="card"><h2>Ricettario e dati</h2><p class="muted">${S.imported.length} ricette tue · ${Object.keys(S.webCache).length} cercate sul web</p>`
        + (samplesLeft() ? `<p class="muted mt8">Il ricettario parte vuoto. Puoi aggiungere ${samplesLeft()} ricette di esempio tra le tue: poi si modificano ed eliminano come le altre.</p><div class="mt12">${btn('Aggiungi le ricette di esempio', 'plus', 'block', 'samples')}</div>` : '')
        + (Object.keys(S.webCache).length ? `<div class="mt12">${btn('Dimentica le ricette cercate sul web', 'trash', 'danger block', 'forgetWeb')}</div>` : '')
        + `<div class="btns">${btn('Esporta backup', 'share', '', 'exportData')}${btn('Importa backup', 'copy', '', 'importData')}</div>`
        + `<p class="muted mt8">Il backup contiene ricette, piano, spesa e note (non le foto). Utile per passare a un altro telefono.</p></div>`;
      return h;
    }
    async saveKey() {
      S.geminiKey = $('#s-key').value.trim(); S.geminiModel = $('#s-model').value.trim() || RF.DEFAULT_MODEL; save();
      document.activeElement && document.activeElement.blur();
      if (!S.geminiKey) { toast('Chiave rimossa'); return; }
      try { await run('Provo la chiave…', () => ai().generate('Reply with one short word.', 'Say OK', { maxTokens: 20 })); alertBox('Tutto pronto ✅', 'La chiave funziona: ora puoi cercare qualsiasi ricetta sul web.'); } catch (e) { }
    }
    getKey() { window.open('https://aistudio.google.com/apikey', '_blank'); }
    setLang(l) { S.lang = l; save(); this.refresh(); }
    setAccent(n) { S.accent = n; save(); applyTheme(); nav.drawTabs(); this.refresh(); }
    setMode(m) { S.appearance = m; save(); applyTheme(); this.refresh(); }
    hMinus() { if (S.household > 1) { S.household--; save(); this.refresh(); } }
    hPlus() { if (S.household < 12) { S.household++; save(); this.refresh(); } }
    setSpeak(x, el) { S.speakSteps = el.checked; save(); }
    setRate(v) { S.speakRate = +v; save(); this.refresh(); speak('Così suona la voce di RecipeFlow.'); }
    testVoice() { speak('Ciao! Questa è la voce di RecipeFlow. Se mi senti, la lettura funziona.'); }
    forgetWeb() { confirmBox('Dimenticare le ricette dal web?', 'Le preferite e i pasti già nel piano restano.', 'OK', () => { S.webCache = {}; S.history = []; save(); this.refresh(); }); }
    exportData() {
      const data = Object.assign({}, S, { geminiKey: '' });
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const file = new File([blob], 'recipeflow-backup.json', { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: 'Backup RecipeFlow' }).catch(() => { });
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'recipeflow-backup.json'; a.click(); }
    }
    importData() {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'application/json,.json';
      inp.onchange = async () => {
        try {
          const d = JSON.parse(await inp.files[0].text());
          confirmBox('Importare il backup?', 'Sostituisce ricette, piano, spesa e note di questo telefono.', 'Importa', () => {
            const key = S.geminiKey; Object.assign(S, d); if (!S.geminiKey) S.geminiKey = key; save(); load(); applyTheme(); nav.drawTabs(); this.refresh(); toast('Backup importato');
          });
        } catch (e) { alertBox('File non valido', 'Scegli un file di backup di RecipeFlow (.json).'); }
      };
      inp.click();
    }
  }

  const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

  // =====================================================================
  // AVVIO
  // =====================================================================
  async function boot() {
    load();
    applyTheme();
    if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (S.appearance === 'system') { applyTheme(); nav.draw(true); } });
    try { builtin = (await (await fetch('recipes.json')).json()).map(RF.normRecipe); } catch (e) { builtin = []; }
    history.replaceState({ d: 1 }, '');
    nav.setTab(0);
    $('#view').addEventListener('scroll', () => $('#bar').classList.toggle('scrolled', $('#view').scrollTop > 4), { passive: true });
    const params = new URLSearchParams(location.search);
    const shared = [params.get('title'), params.get('text'), params.get('url')].filter(Boolean).join('\n');
    if (shared) { history.replaceState({ d: 1 }, '', location.pathname); nav.setTab(4); nav.push(new ImportScreen(shared)); }
    if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
  }
  window.RecipeFlow = { S, nav, save, RecipeScreen }; // per prove
  boot();
})();