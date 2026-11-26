(function () {
  'use strict';

  /* ============================== Ayarlar / depolama ============================== */

  const KEYS = {
    settings: 'fatr.settings.v1',
    custom: 'fatr.custom.v1',
    favs: 'fatr.favorites.v1',
    history: 'fatr.history.v1',
  };

  /* ============ YÖNETİCİ PIN'İ — KENDİ PIN'İNİ BURAYA YAZ ============ */
  const ADMIN_PIN = '1234';
  /* Uygulama tamamen cihazda çalıştığı için bu PIN ileri düzey koruma değildir;
     günlük kullanım için yeterlidir. Değiştirmek için yukarıdaki sayıyı düzenle. */

  let isAdmin = false;

  const DEFAULT_SETTINGS = {
    appName: 'Farsça Türkçe Sözlük',
    subtitle: 'Çift yönlü · Çevrimdışı · Senin sözlüğün',
    theme: 'system',
    color: '#0d5c63',
    font: 'medium',
    examples: true,
    onlyCustom: false,
    dir: 'auto',
    quizDir: 'fa-tr',
  };

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      toast('Depolama dolu olabilir');
    }
  }

  let settings = Object.assign({}, DEFAULT_SETTINGS, load(KEYS.settings, {}));
  let custom = load(KEYS.custom, []);
  let favorites = load(KEYS.favs, []);
  let history = load(KEYS.history, []);

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ============================== Metin normalizasyonu ============================== */

  const FA_MARKS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

  function normFa(s) {
    return String(s || '')
      .replace(FA_MARKS, '')
      .replace(/[\u0649\u064A]/g, 'ی')   // ى ي
      .replace(/\u0643/g, 'ک')           // ك
      .replace(/\u0629/g, 'ه')           // ة
      .replace(/[\u0622\u0623\u0625]/g, 'ا') // آ أ إ
      .replace(/\u0640/g, '')            // tatweel
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function normTr(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[iİı]/g, 'i')
      .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[âîû]/g, (c) => ({ 'â': 'a', 'î': 'i', 'û': 'u' }[c]))
      .replace(/['’`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const FA_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

  function detectDir(q) {
    return FA_RE.test(q) ? 'fa-tr' : 'tr-fa';
  }

  function lev(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }

  function makeId(entry) {
    return String(entry.id || (entry.fa + '::' + entry.tr));
  }

  function prepare(entry) {
    const e = {
      id: makeId(entry),
      fa: String(entry.fa || '').trim(),
      tr: String(entry.tr || '').trim(),
      pron: String(entry.pron || '').trim(),
      pos: String(entry.pos || '').trim(),
      cat: String(entry.cat || '').trim(),
      exFa: String(entry.exFa || '').trim(),
      exTr: String(entry.exTr || '').trim(),
      custom: !!entry.custom,
    };
    e.nfa = normFa(e.fa);
    e.ntr = normTr(e.tr);
    e.npron = normTr(e.pron);
    return e;
  }

  /* ============================== Fiil çekimleri ============================== */

  const CONJ = window.CONJUGATIONS || {};
  const C_STEMS = CONJ.stems || {};
  const C_TR = CONJ.trOverride || {};
  const C_ALIAS = CONJ.aliases || {};
  const C_TR_ALIAS = CONJ.trAlias || {};
  const C_COPULA = CONJ.copula || { keys: [], rows: [] };
  const COP_KEYS = new Set((C_COPULA.keys || []).map(normFa));
  const POS_PARTICLE = (CONJ.particles && CONJ.particles.pos) || 'می';
  const NEG_PARTICLE = (CONJ.particles && CONJ.particles.neg) || 'نمی';
  const WANT = ((CONJ.particles && CONJ.particles.want) || ['خواهم'])[0];

  const CONJ_LABELS = [
    'Şimdiki zaman (olumlu)',
    'Şimdiki zaman (olumsuz)',
    'Geçmiş zaman',
    'Gelecek zaman',
    'Emir',
  ];

  // Fiil: Tür "fiil" ise ya da Farsça mastar (-n) + Türkçe mastar (mak/mek) ise.
  function isVerb(entry) {
    if (!entry) return false;
    const fa = normFa(entry.fa);
    if (!fa) return false;
    if (COP_KEYS.has(fa)) return true;
    const word = fa.split(' ').pop();
    const pos = normTr(entry.pos || '');
    const tr = normTr(entry.tr || '');
    return pos.indexOf('fiil') >= 0 || (/ن$/.test(word) && /(mak|mek)$/.test(tr));
  }

  function splitWord(text) {
    const parts = String(text || '').trim().split(/\s+/).filter(Boolean);
    return {
      prefix: parts.length > 1 ? parts.slice(0, -1).join(' ') : '',
      last: parts[parts.length - 1] || '',
    };
  }

  function guessStems(verbFa, verbPron, compound) {
    const past = verbFa.replace(/ن$/, '') || verbFa;
    const now = /ید$/.test(past) ? past.slice(0, -2) : (/د$/.test(past) ? past.slice(0, -1) : past);
    const pPast = String(verbPron || '').replace(/(an|en|ân)$/i, '');
    const pNow = /id$/.test(pPast) ? pPast.slice(0, -2) : (/d$/.test(pPast) ? pPast.slice(0, -1) : pPast);
    const vowelStart = /^[آا]/.test(now);
    const imp = vowelStart ? 'بی' + now : 'ب' + now;
    const pImp = vowelStart ? 'bi' + pNow : 'ba' + pNow;
    return {
      past, now, imp,
      impPl: imp + 'ید',
      cImp: now,
      cImpPl: now + 'ید',
      pPast, pNow,
      p1: pNow + 'am',
      p1Past: pPast + 'am',
      pImp,
      pImpPl: pImp + 'id',
      pCImp: pNow,
      pCImpPl: pNow + 'id',
      compound,
    };
  }

  function stemOf(verbFa, verbPron, compound) {
    let key = normFa(verbFa);
    if (C_ALIAS[key]) key = C_ALIAS[key];
    if (COP_KEYS.has(key)) key = 'هست';
    const known = C_STEMS[key];
    if (known) return Object.assign({}, known, { compound });
    return guessStems(verbFa, verbPron, compound);
  }

  function trVowel(s) {
    const found = String(s || '').match(/[aeıiouöü]/gi);
    return found ? found[found.length - 1].toLowerCase() : 'a';
  }

  function trHarmony(s, a, i, o, u) {
    const v = trVowel(s);
    if (v === 'a' || v === 'ı') return a;
    if (v === 'e' || v === 'i') return i;
    if (v === 'o' || v === 'u') return o;
    return u;
  }

  // Tanınmayan Türkçe fiiller için yaklaşık çekim.
  function guessTrForms(word) {
    const stem = String(word || '').replace(/(mak|mek)$/, '') || String(word || '');
    const vowelEnd = /[aeıiouöü]$/i.test(stem);
    const lastChar = stem.slice(-1);
    const voiceless = /[çfhkpsşt]/.test(lastChar);
    const presSuf = vowelEnd ? 'yorum' : trHarmony(stem, 'ıyorum', 'iyorum', 'uyorum', 'üyorum');
    const negSuf = trHarmony(stem, 'mıyorum', 'miyorum', 'muyorum', 'müyorum');
    const pastSuf = (lastChar === 't' || voiceless ? 't' : 'd') + trHarmony(stem, 'ım', 'im', 'um', 'üm');
    const futBase = lastChar === 't' ? stem.slice(0, -1) + 'd' : stem;
    const futSuf = (vowelEnd ? 'y' : '') + trHarmony(stem, 'acağım', 'eceğim', 'acağım', 'eceğim');
    const plSuf = (vowelEnd ? 'y' : '') + trHarmony(stem, 'ın', 'in', 'un', 'ün');
    return {
      pres: stem + presSuf,
      neg: stem + negSuf,
      past: stem + pastSuf,
      fut: futBase + futSuf,
      imp: stem,
      impPl: stem + plSuf,
    };
  }

  function trForms(rawTr) {
    const first = String(rawTr || '').split(';')[0].replace(/\([^)]*\)/g, '').trim();
    const clean = C_TR_ALIAS[normTr(first)] || first;
    const split = splitWord(clean);
    const whole = C_TR[normTr(clean)];
    const forms = whole || C_TR[normTr(split.last)] || guessTrForms(split.last);
    return { prefix: whole ? '' : split.prefix, forms };
  }

  function conjugate(entry) {
    const faKey = normFa(entry.fa);
    if (COP_KEYS.has(faKey)) {
      return { title: entry.fa, rows: C_COPULA.rows || [] };
    }

    const faSplit = splitWord(entry.fa);
    const pronSplit = splitWord(entry.pron);
    const compound = !!faSplit.prefix;
    const s = stemOf(faSplit.last, pronSplit.last, compound);
    const tr = trForms(entry.tr);

    const pfx = faSplit.prefix ? faSplit.prefix + ' ' : '';
    const pfxPron = pronSplit.prefix ? pronSplit.prefix + ' ' : '';
    const pfxTr = tr.prefix ? tr.prefix + ' ' : '';
    const posPron = POS_PARTICLE === 'نمی' ? 'nemi' : 'mi';
    const negPron = NEG_PARTICLE === 'نمی' ? 'nemi' : 'nemi';
    const wantPron = WANT === 'خواهم' ? 'xâham ' : '';

    const impFa = compound ? (s.cImp || s.imp) : s.imp;
    const impPlFa = compound ? (s.cImpPl || s.impPl) : s.impPl;
    const impPron = compound ? (s.pCImp || s.pImp) : s.pImp;
    const impPlPron = compound ? (s.pCImpPl || s.pImpPl) : s.pImpPl;
    const now1 = s.now + (/[واا]$/.test(s.now) ? 'ی' : '') + 'م';

    return {
      title: entry.fa,
      rows: [
        {
          label: CONJ_LABELS[0],
          fa: 'من ' + pfx + POS_PARTICLE + ' ' + now1,
          pron: 'man ' + pfxPron + posPron + ' ' + s.p1,
          tr: pfxTr + tr.forms.pres,
        },
        {
          label: CONJ_LABELS[1],
          fa: 'من ' + pfx + NEG_PARTICLE + ' ' + now1,
          pron: 'man ' + pfxPron + negPron + ' ' + s.p1,
          tr: pfxTr + tr.forms.neg,
        },
        {
          label: CONJ_LABELS[2],
          fa: 'من ' + pfx + s.past + 'م',
          pron: 'man ' + pfxPron + s.p1Past,
          tr: pfxTr + tr.forms.past,
        },
        {
          label: CONJ_LABELS[3],
          fa: 'من ' + pfx + WANT + ' ' + s.past,
          pron: 'man ' + pfxPron + wantPron + s.pPast,
          tr: pfxTr + tr.forms.fut,
        },
        {
          label: CONJ_LABELS[4],
          fa: pfx + impFa + ' · ' + pfx + impPlFa,
          pron: pfxPron + impPron + ' · ' + pfxPron + impPlPron,
          tr: pfxTr + tr.forms.imp + ' · ' + pfxTr + tr.forms.impPl,
        },
      ],
    };
  }

  function openConj(entry) {
    const data = conjugate(entry);
    $('#conjTitle').textContent = entry.fa;
    const body = $('#conjBody');
    body.innerHTML = '';

    const head = el('div', 'conj-head');
    const fa = el('div', 'fa', entry.fa);
    fa.setAttribute('dir', 'rtl');
    head.appendChild(fa);
    if (entry.pron) head.appendChild(el('div', 'pron', entry.pron));
    head.appendChild(el('div', 'tr', entry.tr));
    body.appendChild(head);

    const list = el('div', 'conj-list');
    data.rows.forEach((r) => {
      const cardEl = el('div', 'conj-card');
      cardEl.appendChild(el('div', 'conj-label', r.label));
      const rfa = el('div', 'conj-fa', r.fa);
      rfa.setAttribute('dir', 'rtl');
      cardEl.appendChild(rfa);
      if (r.pron) cardEl.appendChild(el('div', 'conj-pron', r.pron));
      cardEl.appendChild(el('div', 'conj-tr', r.tr));
      list.appendChild(cardEl);
    });
    body.appendChild(list);
    body.appendChild(el('div', 'conj-note', 'می و نمی fiilden ayrı yazılır; emir sadece sen ve siz içindir.'));
    openSheet('conjSheet');
  }

  function buildPool() {
    const seed = (window.SEED_DICTIONARY || []).map((x) => Object.assign({}, x, { custom: false }));
    const customPrepared = custom.map((x) => Object.assign({}, x, { custom: true }));
    const override = new Set(customPrepared.map((x) => x.nfa + '|' + x.ntr));
    const base = settings.onlyCustom ? [] : seed.filter((x) => !override.has(normFa(x.fa) + '|' + normTr(x.tr)));
    const all = customPrepared.concat(base).map(prepare);
    const seen = new Set();
    return all.filter((x) => {
      if (!x.fa || !x.tr || seen.has(x.id)) return false;
      seen.add(x.id);
      return true;
    });
  }

  let pool = buildPool();
  let featured = [];

  function refreshPool() {
    pool = buildPool();
    featured = pool.slice().sort(() => Math.random() - 0.5).slice(0, 12);
    $('#footerCount').textContent = pool.length + ' kelime';
    $('#resultInfo').textContent = pool.length + ' kelime yüklendi';
  }

  /* ============================== Arama ============================== */

  function scoreEntry(e, q, dir) {
    const targets = dir === 'fa-tr' ? [e.nfa] : dir === 'tr-fa' ? [e.ntr] : [e.nfa, e.ntr];
    let best = 0;
    for (const t of targets) {
      if (!t) continue;
      if (t === q) best = Math.max(best, 100);
      else if (t.startsWith(q)) best = Math.max(best, 82 - Math.min(12, t.length - q.length));
      else if (t.includes(q)) best = Math.max(best, 64);
      else if (q.length >= 4 && t.split(' ').some((w) => w.startsWith(q))) best = Math.max(best, 56);
    }
    if (e.npron && e.npron.includes(q)) best = Math.max(best, 44);
    const words = q.split(' ').filter(Boolean);
    if (words.length > 1) {
      const hay = targets.join(' ');
      const hits = words.filter((w) => hay.includes(w)).length;
      if (hits === words.length) best = Math.max(best, 58);
      else if (hits > 0) best = Math.max(best, 28 + hits * 9);
    }
    if (!best && q.length >= 3) {
      for (const t of targets) {
        if (!t) continue;
        const d = lev(q, t.slice(0, Math.max(q.length, t.length)));
        if (d <= Math.max(1, Math.floor(q.length / 3))) best = Math.max(best, 30 - d * 6);
      }
    }
    // Sırası bozuk eski içe aktarımlarda Farsça kelime "tr" veya "pron" alanına
    // düşmüş olabilir; yine de bulunabilsin.
    if (!best && q.length >= 2) {
      const extra = dir === 'fa-tr' ? [e.ntr, e.npron] : dir === 'tr-fa' ? [e.nfa, e.npron] : [e.ntr, e.npron];
      if (extra.some((t) => t && (t === q || t.includes(q)))) best = 40;
    }
    return best;
  }

  function search(raw) {
    const q = normFa(raw).trim();
    if (!q) return featured;
    const dir = settings.dir === 'auto' ? detectDir(raw) : settings.dir;
    const nq = dir === 'tr-fa' ? normTr(raw).trim() : q;
    return pool
      .map((e) => ({ e, s: scoreEntry(e, nq, dir) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.e.fa.localeCompare(b.e.fa, 'tr'))
      .slice(0, 60)
      .map((x) => x.e);
  }

  /* ============================== Arayüz yardımcıları ============================== */

  const ICONS = {
    star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  };

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast('Kopyalandı')).catch(() => toast('Kopyalanamadı'));
    } else {
      toast('Kopyalama bu cihazda kullanılamıyor');
    }
  }

  function addToHistory(q) {
    const text = String(q || '').trim();
    if (text.length < 2) return;
    history = [{ q: text, dir: settings.dir === 'auto' ? detectDir(text) : settings.dir, t: Date.now() }]
      .concat(history.filter((h) => normFa(h.q) !== normFa(text)))
      .slice(0, 40);
    save(KEYS.history, history);
    renderHistory();
  }

  /* ============================== Kart oluşturma ============================== */

  function card(entry) {
    const wrap = el('article', 'card');
    wrap.dataset.id = entry.id;

    const head = el('div', 'card-head');
    const main = el('div', 'card-main');

    const line = el('div', 'word-line');
    const fa = el('span', 'word-fa', entry.fa);
    fa.setAttribute('dir', 'rtl');
    line.appendChild(fa);
    if (entry.pron) line.appendChild(el('span', 'word-pron', entry.pron));
    main.appendChild(line);
    main.appendChild(el('div', 'word-tr', entry.tr));

    const meta = el('div', 'meta');
    if (entry.pos) meta.appendChild(el('span', 'tag pos', entry.pos));
    if (entry.cat) meta.appendChild(el('span', 'tag', entry.cat));
    if (entry.custom) meta.appendChild(el('span', 'tag', 'senin eklediğin'));
    if (meta.children.length) main.appendChild(meta);

    if (settings.examples && (entry.exFa || entry.exTr)) {
      const ex = el('div', 'example');
      if (entry.exFa) {
        const x = el('div', 'ex-fa', entry.exFa);
        x.setAttribute('dir', 'rtl');
        ex.appendChild(x);
      }
      if (entry.exTr) ex.appendChild(el('div', 'ex-tr', entry.exTr));
      main.appendChild(ex);
    }

    const actions = el('div', 'card-actions');
    const favBtn = el('button', 'mini-btn' + (favorites.includes(entry.id) ? ' active' : ''));
    favBtn.type = 'button';
    favBtn.title = 'Favorilere ekle/çıkar';
    favBtn.innerHTML = ICONS.star;
    favBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      toggleFav(entry.id);
    });

    const copyBtn = el('button', 'mini-btn');
    copyBtn.type = 'button';
    copyBtn.title = 'Kopyala';
    copyBtn.innerHTML = ICONS.copy;
    copyBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      copyText(entry.fa + ' — ' + entry.tr);
    });

    if (isVerb(entry)) {
      const conjBtn = el('button', 'mini-btn conj-btn', 'çekim');
      conjBtn.type = 'button';
      conjBtn.title = 'Fiil çekimleri';
      conjBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        openConj(entry);
      });
      actions.appendChild(conjBtn);
    }
    actions.append(favBtn, copyBtn);
    head.append(main, actions);
    wrap.appendChild(head);
    return wrap;
  }

  function renderResults() {
    const q = $('#searchInput').value;
    const box = $('#results');
    box.innerHTML = '';
    const list = search(q);
    if (!list.length) {
      const empty = el('div', 'empty');
      empty.appendChild(el('div', 'big', '؟'));
      empty.appendChild(el('div', '', 'Sonuç bulunamadı.'));
      const sub = el('div', 'small', 'Farklı bir yazım dene veya kendi kelimeni ekle.');
      sub.style.marginTop = '6px';
      empty.appendChild(sub);
      box.appendChild(empty);
      $('#resultInfo').textContent = '0 sonuç';
      return;
    }
    const frag = document.createDocumentFragment();
    list.forEach((e) => frag.appendChild(card(e)));
    box.appendChild(frag);
    $('#resultInfo').textContent = list.length + (q.trim() ? ' sonuç' : ' rastgele kelime');
  }

  function renderFavorites() {
    const box = $('#favList');
    box.innerHTML = '';
    $('#favCount').textContent = favorites.length;
    if (!favorites.length) {
      const e = el('div', 'empty');
      e.appendChild(el('div', 'big', '☆'));
      e.appendChild(el('div', '', 'Henüz favori yok'));
      e.appendChild(el('div', 'small', 'Kelime kartındaki yıldıza dokun.'));
      box.appendChild(e);
      return;
    }
    const byId = new Map(pool.map((e) => [e.id, e]));
    favorites.forEach((id) => {
      const e = byId.get(id);
      if (e) box.appendChild(card(e));
    });
  }

  function renderHistory() {
    const box = $('#historyList');
    box.innerHTML = '';
    if (!history.length) {
      const e = el('div', 'empty');
      e.appendChild(el('div', 'big', '↺'));
      e.appendChild(el('div', '', 'Geçmiş boş'));
      box.appendChild(e);
      return;
    }
    history.forEach((h) => {
      const row = el('div', 'history-item');
      const q = el('div', 'q', h.q);
      if (FA_RE.test(h.q)) q.setAttribute('dir', 'rtl');
      const when = new Date(h.t);
      const time = el('time', '', when.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + ' ' + when.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
      const go = el('button', '', '↗');
      go.type = 'button';
      go.title = 'Tekrar ara';
      go.addEventListener('click', () => {
        $('#searchInput').value = h.q;
        switchTab('search');
        renderResults();
      });
      row.append(q, time, go);
      box.appendChild(row);
    });
  }

  function toggleFav(id) {
    if (favorites.includes(id)) favorites = favorites.filter((x) => x !== id);
    else favorites = [id].concat(favorites);
    save(KEYS.favs, favorites);
    $('#favCount').textContent = favorites.length;
    renderResults();
    renderFavorites();
  }

  /* ============================== Sekmeler ============================== */

  function switchTab(name) {
    $$('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + name));
    if (name === 'favorites') renderFavorites();
    if (name === 'history') renderHistory();
  }

  /* ============================== Quiz ============================== */

  const quiz = { list: [], i: 0, score: 0, dir: 'fa-tr', answered: false };

  function startQuiz() {
    if (pool.length < 4) {
      toast('Quiz için en az 4 kelime gerekli');
      return;
    }
    quiz.list = pool.slice().sort(() => Math.random() - 0.5).slice(0, 10);
    quiz.i = 0;
    quiz.score = 0;
    quiz.dir = settings.quizDir;
    $('#quizBody').innerHTML = '';
    showQuestion();
  }

  function showQuestion() {
    quiz.answered = false;
    const body = $('#quizBody');
    body.innerHTML = '';
    if (quiz.i >= quiz.list.length) {
      $('#quizProgress').textContent = 'Tamamlandı';
      const score = el('div', 'score');
      score.appendChild(el('b', '', quiz.score + '/' + quiz.list.length));
      score.appendChild(el('div', '', quiz.score === quiz.list.length ? 'Muhteşem! 🎉' : quiz.score >= quiz.list.length / 2 ? 'İyi gidiyorsun 👍' : 'Tekrar denemek ister misin?'));
      body.appendChild(score);
      const again = el('button', 'primary-btn full', 'Tekrar başla');
      again.type = 'button';
      again.addEventListener('click', startQuiz);
      body.appendChild(again);
      return;
    }

    $('#quizProgress').textContent = (quiz.i + 1) + ' / ' + quiz.list.length + ' · ' + quiz.score + ' doğru';
    const current = quiz.list[quiz.i];
    const answer = quiz.dir === 'fa-tr' ? current.tr : current.fa;

    const word = el('div', 'quiz-word');
    const prompt = el('div', quiz.dir === 'fa-tr' ? 'fa' : 'tr', quiz.dir === 'fa-tr' ? current.fa : current.tr);
    if (quiz.dir === 'fa-tr') prompt.setAttribute('dir', 'rtl');
    word.appendChild(prompt);
    body.appendChild(word);

    const wrong = pool.filter((e) => e.id !== current.id && (quiz.dir !== 'fa-tr' || e.tr !== current.tr) && (quiz.dir !== 'tr-fa' || e.fa !== current.fa));
    const distract = wrong.filter((e) => e.cat === current.cat || e.pos === current.pos);
    const source = distract.length >= 3 ? distract : wrong;
    const options = [current].concat(source.sort(() => Math.random() - 0.5).slice(0, 3)).sort(() => Math.random() - 0.5);

    const optBox = el('div', 'quiz-options');
    options.forEach((o) => {
      const label = quiz.dir === 'fa-tr' ? o.tr : o.fa;
      const b = el('button', 'option', label);
      b.type = 'button';
      if (quiz.dir === 'tr-fa') b.setAttribute('dir', 'rtl');
      b.addEventListener('click', () => {
        if (quiz.answered) return;
        quiz.answered = true;
        const correct = o.id === current.id;
        if (correct) quiz.score++;
        b.classList.add(correct ? 'correct' : 'wrong');
        if (!correct) {
          const right = options.find((x) => x.id === current.id);
          const rightBtn = $$('.option', optBox).find((x) => x.textContent === (quiz.dir === 'fa-tr' ? right.tr : right.fa));
          if (rightBtn) rightBtn.classList.add('correct');
        }
        const feedback = el('div', 'quiz-feedback', correct ? '✓ Doğru!' : '✗ Doğrusu: ' + answer);
        feedback.style.color = correct ? '#2e8b50' : 'var(--danger)';
        body.appendChild(feedback);
        setTimeout(() => { quiz.i++; showQuestion(); }, 1100);
      });
      optBox.appendChild(b);
    });
    body.appendChild(optBox);
  }

  /* ============================== İçe / dışa aktarma ============================== */

  function parseCSV(text) {
    const rows = [];
    let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') quoted = false;
        else cell += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); cell = '';
        if (row.some((x) => x.trim())) rows.push(row);
        row = [];
      } else cell += c;
    }
    row.push(cell);
    if (row.some((x) => x.trim())) rows.push(row);
    return rows;
  }

  function normalizeImported(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const get = (...names) => {
      for (const n of names) {
        const v = raw[n];
        if (v != null && String(v).trim()) return String(v).trim();
      }
      return '';
    };
    const fa = get('fa', 'farsça', 'farsça kelime', 'persian', 'word_fa', 'word');
    const tr = get('tr', 'türkçe', 'türkçe karşılık', 'turkish', 'translation', 'meaning', 'word_tr');
    if (!fa || !tr) return null;
    return {
      id: get('id') || (fa + '::' + tr),
      fa, tr,
      pron: get('pron', 'telaffuz', 'pronunciation'),
      pos: get('pos', 'tür', 'part of speech'),
      cat: get('cat', 'kategori', 'category'),
      exFa: get('exFa', 'örnek_fa', 'example_fa'),
      exTr: get('exTr', 'örnek_tr', 'example_tr'),
      custom: true,
    };
  }

  function csvBlockToItems(lines) {
    const rows = parseCSV(lines.join('\n'));
    if (!rows.length) return [];
    const head = rows[0].map((x) => normTr(x));
    const hasHeader = head.includes('fa') && (head.includes('tr') || head.includes('meaning'));
    const keys = hasHeader ? head : ['fa', 'tr', 'pron', 'pos', 'cat', 'exFa', 'exTr'];
    return (hasHeader ? rows.slice(1) : rows).map((cells) => {
      const o = {};
      keys.forEach((k, i) => { if (cells[i] != null) o[k] = cells[i]; });
      return o;
    });
  }

  let lastImportSkipped = 0;

  function trHints() {
    const map = new Map();
    pool.forEach((e) => {
      if (!e.nfa || !e.ntr) return;
      if (!map.has(e.nfa)) map.set(e.nfa, new Set());
      map.get(e.nfa).add(e.ntr);
    });
    return map;
  }

  // "Farsça - Türkçe - Telaffuz" sırası bozulmuş satırları kurtarmaya çalışır.
  function dashParts(s, hints) {
    const parts = s.split(' - ').map((x) => x.trim()).filter(Boolean);
    if (!parts.length) return null;
    const a = parts[0] || '';
    const b = parts[1] || '';
    const c = parts[2] || '';
    const o = {};
    if (FA_RE.test(b) && !FA_RE.test(a)) {
      // Farsça ikinci alan: "anlam - فارسça - telaffuz"
      o.fa = b;
      const known = hints.get(normFa(b));
      if (known && known.has(normTr(c)) && !known.has(normTr(a))) { o.tr = c; o.pron = a; }
      else { o.tr = a; o.pron = c; }
    } else {
      o.fa = a;
      if (parts.length >= 3) {
        const known = hints.get(normFa(a));
        // "فارسça - telaffuz - anlam" yazılmışsa anlamı yerine koy
        if (known && known.has(normTr(c)) && !known.has(normTr(b))) { o.tr = c; o.pron = b; }
        else { o.tr = b; o.pron = c; }
      } else {
        o.tr = b;
        if (c) o.pron = c;
      }
    }
    if (parts[3]) o.pos = parts[3];
    return o;
  }

  function parseImport(text) {
    const t = String(text || '').trim();
    lastImportSkipped = 0;
    if (!t) return [];
    const rawLines = t.split(/\r?\n/).filter((x) => x.trim()).length;
    let items;
    if (t[0] === '[' || t[0] === '{') {
      const json = JSON.parse(t);
      items = Array.isArray(json) ? json : [json];
    } else {
      items = [];
      let csvLines = [];
      const hints = trHints();
      const keys = ['fa', 'tr', 'pron', 'pos', 'cat', 'exFa', 'exTr'];
      const flushCsv = () => {
        if (csvLines.length) items = items.concat(csvBlockToItems(csvLines));
        csvLines = [];
      };
      t.split(/\r?\n/).forEach((line) => {
        const s = line.trim();
        if (!s) return;
        if (s.includes(' - ') && !s.includes(',')) {
          // Her satır ayrı bir kelime: "کتاب - kitap - ketab"
          flushCsv();
          const o = dashParts(s, hints);
          if (o) items.push(o);
        } else if (s.includes('|')) {
          flushCsv();
          const o = {};
          s.split('|').forEach((cell, i) => { if (keys[i]) o[keys[i]] = cell.trim(); });
          items.push(o);
        } else {
          csvLines.push(s);
        }
      });
      flushCsv();
    }
    // Her satır kendi kimliğiyle ayrı bir kelime olur; aramada tek tek çıkar.
    const prepared = items.map(normalizeImported).filter(Boolean).map(prepare);
    if (t[0] !== '[' && t[0] !== '{') lastImportSkipped = Math.max(0, rawLines - prepared.length);
    return prepared;
  }

  function saveCustom() {
    save(KEYS.custom, custom.map((x) => ({
      id: x.id, fa: x.fa, tr: x.tr, pron: x.pron,
      pos: x.pos, cat: x.cat, exFa: x.exFa, exTr: x.exTr, custom: true,
    })));
  }

  function upsert(items) {
    const map = new Map(custom.map((x) => [x.id, prepare(x)]));
    items.forEach((x) => map.set(x.id, x));
    custom = Array.from(map.values());
    saveCustom();
    refreshPool();
    renderResults();
    renderFavorites();
  }

  function doImport(text) {
    let items;
    try {
      items = parseImport(text);
    } catch (e) {
      $('#importMsg').textContent = 'Dosya okunamadı: ' + e.message;
      return;
    }
    if (!items.length) {
      $('#importMsg').textContent = 'Geçerli kelime bulunamadı. "fa" ve "tr" alanları gerekli.';
      return;
    }
    upsert(items);
    const skipped = lastImportSkipped ? ' · ' + lastImportSkipped + ' satır atlandı (Farsça veya Türkçe eksik)' : '';
    $('#importMsg').textContent = items.length + ' satır = ' + items.length + ' ayrı kelime eklendi/güncellendi. Toplam: ' + pool.length + skipped;
    $('#pasteArea').value = '';
    toast(items.length + ' kelime eklendi');
  }

  function addOne() {
    const fa = $('#newFa').value.trim();
    const tr = $('#newTr').value.trim();
    if (!fa || !tr) {
      $('#addOneMsg').textContent = 'Farsça ve Türkçe alanları zorunlu.';
      return;
    }
    const entry = prepare({
      fa, tr,
      pron: $('#newPron').value.trim(),
      pos: $('#newPos').value.trim(),
      exFa: $('#newExFa').value.trim(),
      exTr: $('#newExTr').value.trim(),
      custom: true,
    });
    upsert([entry]);
    ['#newFa', '#newTr', '#newPron', '#newPos', '#newExFa', '#newExTr'].forEach((s) => { $(s).value = ''; });
    $('#addOneMsg').textContent = 'Eklendi: ' + fa + ' — ' + tr + ' · Toplam: ' + pool.length;
    $('#newFa').focus();
    toast('Kelime eklendi');
  }

  function download(filename, text) {
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  /* ============================== Ayarların uygulanması ============================== */

  function applySettings() {
    const root = document.documentElement;
    const dark = settings.theme === 'dark' ||
      (settings.theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    root.dataset.font = settings.font;
    root.style.setProperty('--accent', settings.color);
    const rgb = hexToRgb(settings.color);
    root.style.setProperty('--accent-soft', 'rgba(' + rgb + ',.14)');
    $('#appTitle').textContent = settings.appName || DEFAULT_SETTINGS.appName;
    $('#appSubtitle').textContent = settings.subtitle || '';
    document.title = settings.appName || DEFAULT_SETTINGS.appName;

    $$('#dirRow .chip').forEach((b) => b.classList.toggle('active', b.dataset.dir === settings.dir));
    $$('#quizDirRow .chip, .quiz-dirs .chip').forEach((b) => b.classList.toggle('active', b.dataset.quizDir === settings.quizDir));
    syncSettingsUI();
  }

  function hexToRgb(hex) {
    const m = String(hex).replace('#', '');
    const v = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
    const n = parseInt(v, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(',');
  }

  function syncSettingsUI() {
    $('#setAppName').value = settings.appName;
    $('#setSubtitle').value = settings.subtitle;
    $('#setExamples').checked = !!settings.examples;
    $('#setOnlyCustom').checked = !!settings.onlyCustom;
    $$('#setTheme button').forEach((b) => b.classList.toggle('active', b.dataset.value === settings.theme));
    $$('#setColor button').forEach((b) => b.classList.toggle('active', b.dataset.value === settings.color));
    $$('#setFont button').forEach((b) => b.classList.toggle('active', b.dataset.value === settings.font));
  }

  function commitSettings() {
    save(KEYS.settings, settings);
    applySettings();
  }

  function openSheet(id) { $('#' + id).hidden = false; }
  function closeSheet(id) { $('#' + id).hidden = true; }

  function applyAdmin() {
    $('#adminTools').hidden = !isAdmin;
    if (!isAdmin) closeSheet('importSheet');
  }

  function adminLogin() {
    const value = $('#adminPin').value.trim();
    if (value === ADMIN_PIN) {
      isAdmin = true;
      applyAdmin();
      $('#adminPin').value = '';
      $('#adminMsg').textContent = '';
      closeSheet('adminSheet');
      openSheet('importSheet');
      toast('Yönetici girişi yapıldı');
    } else {
      $('#adminMsg').textContent = 'PIN hatalı.';
      $('#adminPin').value = '';
      $('#adminPin').focus();
    }
  }

  function adminLogout() {
    isAdmin = false;
    applyAdmin();
    toast('Yönetici çıkışı yapıldı');
  }

  /* ============================== Olay bağlamaları ============================== */

  function bind() {
    $$('.tab').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));

    // Yönetici girişi: üstteki başlığa basılı tut (normal kullanıcıya görünmez).
    const brand = $('#brand');
    let pressTimer = null;
    const startPress = (e) => {
      if (e.type === 'mousedown' && e.button !== 0) return;
      clearTimeout(pressTimer);
      pressTimer = setTimeout(() => {
        pressTimer = null;
        $('#adminMsg').textContent = '';
        $('#adminPin').value = '';
        openSheet('adminSheet');
        setTimeout(() => $('#adminPin').focus(), 60);
      }, 700);
    };
    const cancelPress = () => { clearTimeout(pressTimer); pressTimer = null; };
    brand.addEventListener('mousedown', startPress);
    brand.addEventListener('touchstart', startPress, { passive: true });
    ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach((ev) => brand.addEventListener(ev, cancelPress));
    brand.addEventListener('contextmenu', (e) => e.preventDefault());

    const input = $('#searchInput');
    let timer;
    let inputWatch = null;
    let lastSeen = input.value;
    const scheduleRender = () => {
      $('#btnClear').hidden = !input.value;
      clearTimeout(timer);
      timer = setTimeout(() => { lastSeen = input.value; renderResults(); }, 60);
    };
    input.addEventListener('input', scheduleRender);
    // Bazı Android klavyeleri Farsça yazarken 'input' olayını geciktirir;
    // bu yüzden tuş, birleştirme (composition) ve odak sırasında da kontrol ediyoruz.
    ['keyup', 'compositionupdate', 'paste', 'cut', 'change'].forEach((ev) => input.addEventListener(ev, scheduleRender));
    input.addEventListener('focus', () => {
      clearInterval(inputWatch);
      inputWatch = setInterval(() => {
        if (input.value !== lastSeen) { lastSeen = input.value; scheduleRender(); }
      }, 120);
    });
    input.addEventListener('blur', () => { clearInterval(inputWatch); inputWatch = null; });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addToHistory(input.value);
    });
    $('#btnClear').addEventListener('click', () => {
      input.value = '';
      lastSeen = '';
      $('#btnClear').hidden = true;
      renderResults();
      input.focus();
    });
    $$('#dirRow .chip').forEach((b) => b.addEventListener('click', () => {
      settings.dir = b.dataset.dir;
      commitSettings();
      renderResults();
    }));

    $('#btnSettings').addEventListener('click', () => { syncSettingsUI(); openSheet('settingsSheet'); });
    $$('[data-close]').forEach((b) => b.addEventListener('click', () => closeSheet(b.dataset.close)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeSheet('settingsSheet'); closeSheet('addSheet'); closeSheet('importSheet'); closeSheet('adminSheet'); closeSheet('conjSheet'); }
    });

    $('#setAppName').addEventListener('change', (e) => { settings.appName = e.target.value; commitSettings(); });
    $('#setSubtitle').addEventListener('change', (e) => { settings.subtitle = e.target.value; commitSettings(); });
    $('#setTheme').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { settings.theme = b.dataset.value; commitSettings(); } });
    $('#setFont').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { settings.font = b.dataset.value; commitSettings(); } });
    $('#setColor').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { settings.color = b.dataset.value; commitSettings(); } });
    $('#setExamples').addEventListener('change', (e) => { settings.examples = e.target.checked; commitSettings(); renderResults(); renderFavorites(); });
    $('#setOnlyCustom').addEventListener('change', (e) => {
      settings.onlyCustom = e.target.checked;
      commitSettings();
      refreshPool();
      renderResults();
      renderFavorites();
    });

    $('#btnClearCustom').addEventListener('click', () => {
      if (!confirm('Eklediğin tüm kelimeler silinecek. Favoriler ve geçmiş korunacak. Emin misin?')) return;
      custom = [];
      save(KEYS.custom, []);
      refreshPool();
      favorites = favorites.filter((id) => pool.some((e) => e.id === id));
      save(KEYS.favs, favorites);
      renderResults();
      renderFavorites();
      toast('Eklenen kelimeler silindi');
    });

    $('#btnResetData').addEventListener('click', () => {
      if (!confirm('Favoriler, geçmiş, eklediğin kelimeler ve ayarlar silinecek. Emin misin?')) return;
      Object.values(KEYS).forEach((k) => { try { localStorage.removeItem(k); } catch (e) {} });
      location.reload();
    });

    // Tek kelime ekleme: herkese açık, PIN gerekmez.
    $('#btnAddOneOpen').addEventListener('click', () => {
      $('#addOneMsg').textContent = '';
      openSheet('addSheet');
      setTimeout(() => $('#newFa').focus(), 60);
    });
    // Toplu text dosyası: sadece yönetici.
    $('#btnImport').addEventListener('click', () => {
      if (!isAdmin) return;
      $('#importMsg').textContent = '';
      openSheet('importSheet');
    });
    $('#btnPasteImport').addEventListener('click', () => doImport($('#pasteArea').value));
    $('#btnAddOne').addEventListener('click', addOne);
    $('#btnAdminLogin').addEventListener('click', adminLogin);
    $('#adminPin').addEventListener('keydown', (e) => { if (e.key === 'Enter') adminLogin(); });
    $('#btnAdminLogout').addEventListener('click', adminLogout);

    const fileInput = $('#fileInput');
    fileInput.addEventListener('change', () => {
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => doImport(String(reader.result || ''));
      reader.onerror = () => { $('#importMsg').textContent = 'Dosya okunamadı'; };
      reader.readAsText(f, 'utf-8');
      fileInput.value = '';
    });

    const upload = $('.upload');
    ['dragenter', 'dragover'].forEach((ev) => upload.addEventListener(ev, (e) => { e.preventDefault(); upload.style.borderColor = 'var(--accent)'; }));
    ['dragleave', 'drop'].forEach((ev) => upload.addEventListener(ev, (e) => { e.preventDefault(); upload.style.borderColor = ''; }));
    upload.addEventListener('drop', (e) => {
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => doImport(String(reader.result || ''));
      reader.readAsText(f, 'utf-8');
    });

    $('#btnExportFav').addEventListener('click', () => {
      const byId = new Map(pool.map((e) => [e.id, e]));
      const list = favorites.map((id) => byId.get(id)).filter(Boolean).map(({ id, fa, tr, pron, pos, cat, exFa, exTr }) => ({ id, fa, tr, pron, pos, cat, exFa, exTr }));
      if (!list.length) { toast('Dışa aktarılacak favori yok'); return; }
      download('favorilerim.json', JSON.stringify(list, null, 2));
    });

    $('#btnClearHistory').addEventListener('click', () => {
      if (!history.length) return;
      history = [];
      save(KEYS.history, history);
      renderHistory();
    });

    $$('.quiz-dirs .chip').forEach((b) => b.addEventListener('click', () => {
      settings.quizDir = b.dataset.quizDir;
      commitSettings();
    }));
    $('#btnStartQuiz').addEventListener('click', startQuiz);
    $('#btnNewQuiz').addEventListener('click', startQuiz);

    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (settings.theme === 'system') applySettings();
      });
    }
  }

  /* ============================== Başlat ============================== */

  bind();
  applySettings();
  applyAdmin();
  refreshPool();
  renderResults();
  renderFavorites();
  renderHistory();
})();
