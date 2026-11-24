# Farsça ↔ Türkçe Sözlük (APK)

Çevrimdışı çalışan, çift yönlü, kişiselleştirilebilir sözlük uygulaması. 733 kelimelik gömülü sözlükle gelir; kendi kelime listeni JSON/CSV olarak içe aktarabilirsin.

## Özellikler

- Otomatik yön algılama: Farsça yazarsan Farsça→Türkçe, Türkçe yazarsan Türkçe→Farsça
- Telaffuz (Latin harfli okunuş) ve örnek cümleler
- Favoriler, arama geçmişi, kelime kopyalama
- Seslendirme (cihazda Farsça/Türkçe ses paketi varsa)
- 10 soruluk quiz modu
- Uygulama adı, alt başlık, tema, renk, yazı boyutu ayarları
- Tamamen çevrimdışı; veriler yalnızca cihazında saklanır

## 1) Bilgisayarda önizleme (opsiyonel)

```bash
node scripts/serve.js
# tarayıcıda http://localhost:8080
```

## 2) APK üretme (ücretsiz, bulutta)

Bu ortamda Android SDK olmadığı için derlemeyi GitHub Actions yapar.

1. GitHub'da yeni bir **public** repository oluştur (ör. `farsca-turkce-sozluk`).
2. Bu klasörün içindekileri repository'ye yükle:

   ```bash
   cd fa-tr-sozluk
   git init
   git add .
   git commit -m "ilk sürüm"
   git branch -M main
   git remote add origin https://github.com/KULLANICIADIN/farsca-turkce-sozluk.git
   git push -u origin main
   ```

3. GitHub'da **Actions** sekmesini aç → solda **Build APK** iş akışını seç → **Run workflow** (push ile otomatik de başlar).
4. İş bitince en üstteki çalıştırmaya gir → **Artifacts** → `farsca-turkce-sozluk-apk` dosyasını indir.
5. ZIP'ten `app-debug.apk` çık, telefonuna gönder ve kur. Android "Bilinmeyen kaynaklardan yükleme" iznini isteyebilir.

> İpucu: Repo'yu **private** yaparsan Actions dakika kotası uygulanabilir; public repo ücretsizdir.

## 3) Sözlüğü kendine göre özelleştirme

### Kalıcı olarak (kaynak dosyada)

`data/dictionary.json` dosyasını düzenle:

```json
[
  { "fa": "کتاب", "tr": "kitap", "pron": "ketab", "pos": "isim", "cat": "eğitim", "exFa": "من کتاب میخوانم.", "exTr": "Ben kitap okuyorum." }
]
```

Alanlar: `fa` (Farsça), `tr` (Türkçe) zorunlu; `pron`, `pos`, `cat`, `exFa`, `exTr` isteğe bağlı. Sonra:

```bash
node scripts/embed-dictionary.js
```

GitHub'a push ettiğinde bu adım otomatik çalışır.

### Telefondan (kurulum sonrası)

Uygulamada **＋ Kelime ekle / içe aktar** ile JSON veya CSV yükle. Aynı kelime varsa senin versiyonun gömülü olanı ezer. Ayarlardan **Sadece benim kelimelerim** seçeneğini açarsan gömülü sözlük tamamen gizlenir.

CSV örneği (ilk satır başlık):

```csv
fa,tr,pron,pos,cat
کتاب,kitap,ketab,isim,eğitim
دوست,arkadaş,dost,isim,duygu
```

## 4) Uygulama kimliğini değiştirme

- `capacitor.config.json`: `appId` (Play Store için benzersiz paket adı) ve `appName`
- `web/manifest.json`: ad ve tema renkleri
- Ayarlar ekranından uygulama adını/alt başlığını ve vurgu rengini telefon üzerinden değiştirebilirsin.

## Dosya yapısı

```
fa-tr-sozluk/
├── data/dictionary.json        # sözlük kaynağı (733 kelime)
├── scripts/embed-dictionary.js # JSON -> web/dictionary.js
├── scripts/serve.js            # yerel önizleme sunucusu
├── web/                        # uygulamanın kendisi (HTML/CSS/JS)
├── capacitor.config.json       # APK ayarları
├── package.json
└── .github/workflows/build-apk.yml
```

## Bilinen notlar

- Seslendirme cihazdaki TTS seslerine bağlıdır; Farsça ses paketi yoksa sessiz kalabilir.
- `app-debug.apk` kurulabilir bir derlemedir; Play Store için signed release gerekir.
