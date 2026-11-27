/* Firebase Firestore katmanı — çevrimdışı önbellek + onay kuyruğu */
(function () {
  'use strict';

  const CFG = window.FIREBASE_CONFIG;
  const KEY_CLOUD = 'fatr.cloud.v1';

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

  function pull() {
    ensure();
    return store.collection('words').get().then(function (snap) {
      const list = snap.docs.map(fromDoc);
      save(KEY_CLOUD, list);
      return list;
    });
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
    });
  }

  function reject(id) {
    ensure();
    if (!admin) return Promise.reject(new Error('Bu hesap yönetici değil'));
    return store.collection('pending').doc(id).delete();
  }

  function upsertApproved(items) {
    ensure();
    if (!admin) return Promise.reject(new Error('Bu hesap yönetici değil'));
    const batch = store.batch();
    (items || []).forEach(function (item) {
      const w = clean(item);
      const id = wordId(w);
      if (!id || id === '::') return;
      batch.set(store.collection('words').doc(id), Object.assign({}, w, {
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }));
    });
    return batch.commit();
  }

  function updateApproved(id, data) {
    ensure();
    if (!admin) return Promise.reject(new Error('Bu hesap yönetici değil'));
    return store.collection('words').doc(id).set(Object.assign({}, clean(data), {
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }));
  }

  function deleteApproved(id) {
    ensure();
    if (!admin) return Promise.reject(new Error('Bu hesap yönetici değil'));
    return store.collection('words').doc(id).delete();
  }

  window.AppCloud = {
    init: init,
    isReady: isReady,
    currentUser: currentUser,
    isAdmin: isAdmin,
    signIn: signIn,
    signOut: signOut,
    pull: pull,
    cached: cached,
    submit: submit,
    pullPending: pullPending,
    approve: approve,
    reject: reject,
    upsertApproved: upsertApproved,
    updateApproved: updateApproved,
    deleteApproved: deleteApproved,
  };
})();
