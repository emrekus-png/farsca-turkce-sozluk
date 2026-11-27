/* Firebase Firestore katmanı — çevrimdışı önbellek + onay kuyruğu */
(function () {
  'use strict';

  const CFG = window.FIREBASE_CONFIG;
  const KEY_CLOUD = 'fatr.cloud.v1';
  const KEY_REV = 'fatr.rev.v1';
  const BATCH_SIZE = 500; // Firestore tek batch işlem sınırı

  let auth = null;
  let store = null;
  let ready = false;
  let user = null;
  let admin = false;

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  function online() { return navigator.onLine !== false; }
  function clean(w) {
    return {
      fa: String((w && w.fa) || '').trim(),
      tr: String((w && w.tr) || '').trim(),
      pron: String((w && w.pron) || '').trim(),
      pos: String((w && w.pos) || '').trim(),
      cat: String((w && w.cat) || '').trim(),
      exFa: String((w && w.exFa) || '').trim(),
      exTr: String((w && w.exTr) || '').trim(),
    };
  }

  function wordId(w) {
    return clean(w).fa + '::' + clean(w).tr;
  }

  function chunk(items, size) {
    const out = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
  }

  function fromDoc(doc) {
    const d = clean(doc.data() || {});
    return Object.assign({ id: doc.id, wordId: wordId(d) }, d);
  }

  function ensure() {
    if (!ready) throw new Error('Firebase hazır değil');
    if (!online()) throw new Error('İnternet bağlantısı yok');
  }

  function init() {
    if (!CFG || !window.firebase || !firebase.apps) return Promise.resolve(false);
    try {
      const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(CFG);
      auth = app.auth();
      store = app.firestore();
      ready = true;
      auth.onAuthStateChanged(function (u) {
        user = u || null;
        if (!u) admin = false;
      });
      return Promise.resolve(true);
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  function isReady() { return ready; }
  function currentUser() { return user ? (user.email || user.uid) : ''; }
  function isAdmin() { return !!admin; }
  function cached() { return load(KEY_CLOUD, []); }

  function checkAdmin() {
    if (!ready || !user || !online()) return Promise.resolve(false);
    return store.collection('pending').limit(1).get()
      .then(function () { return true; })
      .catch(function () { return false; });
  }

  // Uygulama açılırken kayıtlı Firebase oturumunu geri yükle.
  // Oturum varsa ve hesap yöneticiyse yönetici modunu sessizce aç.
  function restore() {
    if (!ready || !online()) return Promise.resolve({ user: '', admin: false });
    return new Promise(function (resolve) {
      let done = false;
      let stop = null;
      const finish = function (ok) {
        if (done) return;
        done = true;
        try { if (stop) stop(); } catch (e) {}
        admin = !!ok;
        resolve({ user: ok ? currentUser() : '', admin: admin });
      };
      stop = auth.onAuthStateChanged(function (u) {
        if (done) return;
        user = u || null;
        if (!u) { finish(false); return; }
        checkAdmin().then(function (ok) { finish(ok); }).catch(function () { finish(false); });
      });
    });
  }

  function signIn(email, password) {
    ensure();
    if (!email || !password) return Promise.reject(new Error('E-posta ve şifre gerekli'));
    return auth.signInWithEmailAndPassword(String(email).trim(), String(password))
      .then(function (cred) {
        user = cred.user;
        return checkAdmin();
      })
      .then(function (ok) {
        admin = ok;
        return { user: currentUser(), admin: admin };
      });
  }

  function signOut() {
    admin = false;
    if (!ready) return Promise.resolve();
    return auth.signOut().then(function () { user = null; }).catch(function () { user = null; });
  }

  // Kelime listesi değişmediyse 10 bin dokümanı yeniden indirme.
  // force = true ise (Senkronize et düğmesi) her zaman tam çekiş yap.
  function pull(force) {
    ensure();
    const revRef = store.collection('meta').doc('words');
    const cachedRev = Number(load(KEY_REV, 0)) || 0;
    return revRef.get().then(function (d) {
      const rev = Number((d.data() && d.data().rev) || 0) || 0;
      if (!force && cachedRev > 0 && rev <= cachedRev) return cached();
      return store.collection('words').get().then(function (snap) {
        const list = snap.docs.map(fromDoc);
        save(KEY_CLOUD, list);
        save(KEY_REV, rev);
        return list;
      });
    }).catch(function () {
      // meta dokümanı yoksa / okunamıyorsa eski davranış: tam çekiş.
      return store.collection('words').get().then(function (snap) {
        const list = snap.docs.map(fromDoc);
        save(KEY_CLOUD, list);
        return list;
      });
    });
  }

  // Yönetici yazışmalarından sonra sürüm numarasını artır; diğer cihazlar bunu görür.
  function bumpRevision() {
    if (!ready || !admin || !online()) return Promise.resolve();
    const ref = store.collection('meta').doc('words');
    return ref.set({ rev: firebase.firestore.FieldValue.increment(1) }, { merge: true })
      .then(function () { return ref.get(); })
      .then(function (d) { save(KEY_REV, Number((d.data() && d.data().rev) || 1) || 1); })
      .catch(function () {}); // kuralda meta satırı yoksa yazmayı engelleme
  }

  // Misafir tek eklemede kelimenin zaten onaylı olup olmadığını kontrol et.
  function existsApproved(id) {
    if (!ready || !online() || !id) return Promise.resolve(false);
    return store.collection('words').doc(id).get()
      .then(function (d) { return !!d.exists; })
      .catch(function () { return false; });
  }

  function submit(word) {
    ensure();
    const w = clean(word);
    if (!w.fa || !w.tr) return Promise.reject(new Error('Farsça ve Türkçe gerekli'));
    return store.collection('pending').add(Object.assign({}, w, {
      wordId: wordId(w),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    }));
  }

  function pullPending() {
    ensure();
    if (!admin) return Promise.reject(new Error('Bu hesap yönetici değil'));
    return store.collection('pending').get().then(function (snap) {
      return snap.docs.map(fromDoc);
    });
  }

  function approve(doc) {
    ensure();
    if (!admin) return Promise.reject(new Error('Bu hesap yönetici değil'));
    const w = clean(doc);
    const target = (doc && doc.wordId && doc.wordId !== '::') ? doc.wordId : wordId(w);
    return store.collection('words').doc(target).set(Object.assign({}, w, {
      approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
    })).then(function () {
      return store.collection('pending').doc(doc.id).delete();
    }).then(bumpRevision);
  }

  function reject(id) {
    ensure();
    if (!admin) return Promise.reject(new Error('Bu hesap yönetici değil'));
    return store.collection('pending').doc(id).delete();
  }

  function approveMany(items) {
    ensure();
    if (!admin) return Promise.reject(new Error('Bu hesap yönetici değil'));
    const rows = (items || []).filter(function (doc) {
      return doc && doc.id && (wordId(clean(doc)) !== '::');
    });
    if (!rows.length) return Promise.resolve(0);
    return chunk(rows, BATCH_SIZE).reduce(function (chain, part) {
      return chain.then(function () {
        const batch = store.batch();
        part.forEach(function (doc) {
          const w = clean(doc);
          const target = (doc.wordId && doc.wordId !== '::') ? doc.wordId : wordId(w);
          batch.set(store.collection('words').doc(target), Object.assign({}, w, {
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
          }));
          batch.delete(store.collection('pending').doc(doc.id));
        });
        return batch.commit();
      });
    }, Promise.resolve()).then(bumpRevision).then(function () { return rows.length; });
  }

  function rejectMany(ids) {
    ensure();
    if (!admin) return Promise.reject(new Error('Bu hesap yönetici değil'));
    const list = (ids || []).filter(Boolean);
    if (!list.length) return Promise.resolve(0);
    return chunk(list, BATCH_SIZE).reduce(function (chain, part) {
      return chain.then(function () {
        const batch = store.batch();
        part.forEach(function (id) { batch.delete(store.collection('pending').doc(id)); });
        return batch.commit();
      });
    }, Promise.resolve()).then(function () { return list.length; });
  }

  function upsertApproved(items, onProgress) {
    ensure();
    if (!admin) return Promise.reject(new Error('Bu hesap yönetici değil'));
    const rows = (items || []).map(clean).filter(function (w) { return wordId(w) !== '::'; });
    if (!rows.length) return Promise.resolve(0);
    const parts = chunk(rows, BATCH_SIZE);
    let done = 0;
    return parts.reduce(function (chain, part) {
      return chain.then(function () {
        const batch = store.batch();
        part.forEach(function (w) {
          batch.set(store.collection('words').doc(wordId(w)), Object.assign({}, w, {
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          }));
        });
        return batch.commit().then(function () {
          done += part.length;
          if (typeof onProgress === 'function') onProgress(done, rows.length, parts.length);
        });
      });
    }, Promise.resolve()).then(bumpRevision).then(function () { return rows.length; });
  }

  function updateApproved(id, data) {
    ensure();
    if (!admin) return Promise.reject(new Error('Bu hesap yönetici değil'));
    return store.collection('words').doc(id).set(Object.assign({}, clean(data), {
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    })).then(bumpRevision);
  }

  function deleteApproved(id) {
    ensure();
    if (!admin) return Promise.reject(new Error('Bu hesap yönetici değil'));
    return store.collection('words').doc(id).delete().then(bumpRevision);
  }

  function deleteApprovedMany(ids) {
    ensure();
    if (!admin) return Promise.reject(new Error('Bu hesap yönetici değil'));
    const list = (ids || []).filter(Boolean);
    if (!list.length) return Promise.resolve(0);
    return chunk(list, BATCH_SIZE).reduce(function (chain, part) {
      return chain.then(function () {
        const batch = store.batch();
        part.forEach(function (id) { batch.delete(store.collection('words').doc(id)); });
        return batch.commit();
      });
    }, Promise.resolve()).then(bumpRevision).then(function () { return list.length; });
  }

  window.AppCloud = {
    init: init,
    isReady: isReady,
    currentUser: currentUser,
    isAdmin: isAdmin,
    restore: restore,
    existsApproved: existsApproved,
    signIn: signIn,
    signOut: signOut,
    pull: pull,
    cached: cached,
    submit: submit,
    pullPending: pullPending,
    approve: approve,
    reject: reject,
    approveMany: approveMany,
    rejectMany: rejectMany,
    upsertApproved: upsertApproved,
    updateApproved: updateApproved,
    deleteApproved: deleteApproved,
    deleteApprovedMany: deleteApprovedMany,
  };
})();
