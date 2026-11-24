// data/dictionary.json -> web/dictionary.js
// Böylece uygulama fetch() kullanmadan, file:// ve Capacitor^+ üzerinde çalışır.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'data', 'dictionary.json');
const dest = path.join(root, 'web', 'dictionary.js');

const data = JSON.parse(fs.readFileSync(src, 'utf8'));
const ids = new Set();
const clean = data.map((entry) => {
  const fa = String(entry.fa || '').trim();
  const tr = String(entry.tr || '').trim();
  const id = String(entry.id || `${fa}::${tr}`);
  ids.add(id);
  return {
    id,
    fa,
    tr,
    pron: String(entry.pron || '').trim(),
    pos: String(entry.pos || '').trim(),
    cat: String(entry.cat || '').trim(),
    exFa: String(entry.exFa || '').trim(),
    exTr: String(entry.exTr || '').trim(),
  };
});

const banner = [
  '// BU DOSYA OTOMATİK ÜRETİLMİŞTİR — düzenlemeyin.',
  '// Kaynak: data/dictionary.json  (sonra: node scripts/embed-dictionary.js)',
  '',
].join('\n');

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, `${banner}window.SEED_DICTIONARY = ${JSON.stringify(clean)};\n`, 'utf8');
console.log(`OK: ${clean.length} kelime -> ${path.relative(root, dest)}`);
