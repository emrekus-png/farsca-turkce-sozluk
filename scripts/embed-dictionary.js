// data/dictionary.json -> web/dictionary.js
// Böylece uygulama fetch() kullanmadan, file:// ve Capacitor^+ üzerinde çalışır.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'data', 'dictionary.json');
const dest = path.join(root, 'web', 'dictionary.js');
const conjSrc = path.join(root, 'data', 'conjugations.json');
const conjDest = path.join(root, 'web', 'conjugations.js');
const storiesSrc = path.join(root, 'data', 'stories.json');
const storiesDest = path.join(root, 'web', 'stories.js');

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

const conj = JSON.parse(fs.readFileSync(conjSrc, 'utf8'));
const conjBanner = [
  '// BU DOSYA OTOMATİK ÜRETİLMİŞTİR — düzenlemeyin.',
  '// Kaynak: data/conjugations.json  (sonra: node scripts/embed-dictionary.js)',
  '',
].join('\n');
fs.writeFileSync(conjDest, `${conjBanner}window.CONJUGATIONS = ${JSON.stringify(conj)};\n`, 'utf8');
console.log(`OK: çekim verisi -> ${path.relative(root, conjDest)}`);

const rawStories = JSON.parse(fs.readFileSync(storiesSrc, 'utf8'));
const stories = (Array.isArray(rawStories) ? rawStories : []).map((s, i) => ({
  id: String(s.id || `hikaye-${i + 1}`).trim(),
  level: String(s.level || 'orta').trim().toLowerCase(),
  titleFa: String(s.titleFa || '').trim(),
  titleTr: String(s.titleTr || '').trim(),
  fa: String(s.fa || '').trim(),
  tr: String(s.tr || '').trim(),
  pron: String(s.pron || '').trim(),
})).filter((s) => ['zor', 'orta', 'kolay'].includes(s.level) && (s.titleFa || s.titleTr || s.fa || s.tr || s.pron));

const storiesBanner = [
  '// BU DOSYA OTOMATİK ÜRETİLMİŞTİR — düzenlemeyin.',
  '// Kaynak: data/stories.json  (sonra: node scripts/embed-dictionary.js)',
  '',
].join('\n');
fs.writeFileSync(storiesDest, `${storiesBanner}window.STORIES = ${JSON.stringify(stories)};\n`, 'utf8');
console.log(`OK: ${stories.length} hikâye -> ${path.relative(root, storiesDest)}`);
