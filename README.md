# Farsça ↔ Türkçe Sözlük (APK)

Çevrimdışı çalışan, çift yönlü, kişiselleştirilebilir sözlük uygulaması. 733 kelimelik gömülü sözlükle gelir; kendi kelime listeni JSON/CSV olarak içe aktarabilirsin.

## Özellikler

- Otomatik yön algılama: Farsça yazarsan Farsça→Türkçe, Türkçe yazarsan Türkçe→Farsça
- Telaffuz: Farsça kelimenin yanında küçük, soluk Latin harfli okunuş; isteğe bağlı örnek cümleler
- Favoriler, arama geçmişi, kelime kopyalama, 10 soruluk quiz
- Tek tek kelime ekleme herkese açık; toplu text dosyası yönetici PIN'iyle korunur
- Fiil kartındaki **çekim ikonuna** dokununca 6 kişilik çekim ekranı: Farsça + Latin okunuş + Türkçe karşılık
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

### Telefondan tek tek kelime ekleme (herkes)

1. Arama ekranındaki **＋ Kelime ekle** bağlantısına dokun.
2. Farsça ve Türkçe alanlarını doldur; istersen telaffuz, tür ve örnek cümleleri de yaz → **Kelimeyi kaydet**.
3. Kelime anında aramada görünür. Aynı kelime varsa senin versiyonun gömülü olanı ezer. PIN gerekmez.

### Telefondan toplu text dosyası (sadece sen)

1. Kitaptan kelimeleri bir `.txt` dosyasına **her satıra bir kelime** olacak şekilde yaz. **Sıra: Farsça - Türkçe - Telaffuz** (telaffuz isteğe bağlı):
   ```
   کتاب - kitap - ketab
   دوست - arkadaş - dost
   خانه - ev - xane
   ```
   Yanlış sıra (`کتاب - ketab - kitap`) telaffuz ile anlamı yer değiştirir. Uygulama, gömülü sözlükten bildiği kelimelerde sıra hatasını otomatik düzeltmeye çalışır; yine de doğru sırayı kullan.
2. Uygulamada üstteki **başlığa basılı tut** (yaklaşık 1 saniye) → PIN gir (varsayılan: `1234`).
3. Açılan **Toplu kelime ekle** ekranından dosyayı seç veya satırları yapıştır → **Toplu içe aktar**.
4. **Her satır aramada ayrı bir kelime kartı olarak çıkar.** “Toplu ekle” bağlantısı ve giriş, yönetici olmadan görünmez.

PIN'i değiştirmek için `web/app.js` dosyasının üstündeki `const ADMIN_PIN = '1234';` satırını düzenle, commit + push et ve yeni APK'yı kur. Uygulama tamamen cihazda çalıştığı için bu PIN ciddi bir güvenlik bariyeri değil; günlük kullanım içindir.

JSON/CSV de desteklenir; her satır yine ayrı bir kelime olur:

```
کتاب|kitap|ketab
دوست|arkadaş|dost
```

CSV örneği (ilk satır başlık):

```csv
fa,tr,pron,pos,cat
کتاب,kitap,ketab,isim,eğitim
دوست,arkadaş,dost,isim,duygu
```

### Fiil çekimleri

Gömülü fiillerin ve sonradan eklediğin fiillerin kartında, yıldız ve kopya ikonlarının **başında** bir çekim ikonu görünür. Bu ikona dokununca ayrı ekranda **Geçmiş / Şimdi / Gelecek / Emir** sekmeleri açılır; her sekmede ben, sen, o, biz, siz, onlar için Farsça + Latin okunuş + Türkçe karşılık gösterilir. Farsça/Latin sola, Türkçe en sağa hizalanır. Yalnızca olumlu çekimler gösterilir; Emir sekmesinde sadece **sen** ve **siz** satırları vardır. `داشتن` ve `هست/است` için Emir sekmesi gösterilmez.

Kurallar: `می` fiilden ayrı yazılır; bileşik fiillerde yardımcı fiilden önce gelir (`کار می کنم`, `کار خواهم کرد`). Şimdiki zaman ve emirde şimdiki kök (`گیرم`), geçmiş/gelecekte geçmiş kök (`گرفتم`) kullanılır. `داشتن` ve `هست/است` şimdiki zaman çekimlerinde `می` almaz: `دارم`, `هستم`. Bileşik emirde önek korunur: `ادامه بده`, `ادامه بدهید`.

Yeni eklediğin bir kelimenin fiil sayılması için **Tür: fiil** yazman yeterlidir; ya da Farsça `-ن` ile, Türkçe `mak/mek` ile bitmesi de yeterli sayılır. Düzensiz fiillerin kökleri `data/conjugations.json` dosyasındadır; bilinmeyen fiillerde okunuş ve Türkçe karşılık kural ile yaklaşık üretilir.

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

- Seslendirme özelliği kaldırıldı; telaffuz yazı olarak gösterilir.
- `app-debug.apk` kurulabilir bir derlemedir; Play Store için signed release gerekir.
