# Farsça ↔ Türkçe Sözlük (APK)

Çevrimdışı çalışan, çift yönlü, kişiselleştirilebilir sözlük uygulaması. 733 kelimelik gömülü sözlükle gelir; kendi kelime listeni JSON/CSV olarak içe aktarabilirsin.

## Özellikler

- Otomatik yön algılama: Farsça yazarsan Farsça→Türkçe, Türkçe yazarsan Türkçe→Farsça
- Telaffuz: Farsça kelimenin yanında küçük, soluk Latin harfli okunuş; isteğe bağlı örnek cümleler
- Favoriler, arama geçmişi, kelime kopyalama, 10 soruluk quiz
- Tek tek kelime ekleme herkese açık; yeni kelimeler **onaya gönderilir**, yönetici onaylayınca herkes görür
- Yönetici: PIN + Firebase girişiyle **onay kuyruğu**, bulut kelime düzenleme/silme ve toplu ekleme
- İnternet olmadan da çalışır; kelimeler cihazda saklanır, bağlantı gelince bulutla senkron olur
- Fiil kartındaki **çekim ikonuna** dokununca 6 kişilik çekim ekranı: Farsça + Latin okunuş + Türkçe karşılık
- **Okuma Pratiği** bölümü: Zor → Orta → Kolay seviyelerinde hikâyelerle okuma çalışması
- Uygulama adı, alt başlık, tema, renk, yazı boyutu ayarları

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
3. Kelime anında cihazında görünür ve üzerinde **“Onay bekliyor”** rozeti çıkar. İnternet varsa Firebase'e gönderilir; yönetici onaylayınca diğer cihazlarda da görünür. PIN gerekmez. Aynı kelime varsa senin versiyonun gömülü olanı ezer.

### Telefondan toplu text dosyası (sadece sen)

1. Kitaptan kelimeleri bir `.txt` dosyasına **her satıra bir kelime** olacak şekilde yaz. **Sıra: Farsça - Türkçe - Telaffuz** (telaffuz isteğe bağlı):
   ```
   کتاب - kitap - ketab
   دوست - arkadaş - dost
   خانه - ev - xane
   ```
   Yanlış sıra (`کتاب - ketab - kitap`) telaffuz ile anlamı yer değiştirir. Uygulama, gömülü sözlükten bildiği kelimelerde sıra hatasını otomatik düzeltmeye çalışır; yine de doğru sırayı kullan.
2. Uygulamada üstteki **başlığa basılı tut** (yaklaşık 1 saniye) → PIN gir (varsayılan: `1234`) → **Firebase e-posta/şifre** ile giriş yap.
3. Üstteki **Bulut yönetimi** bağlantısından:
   - **Onay kuyruğu**: kullanıcıların gönderdiği kelimeleri **Onayla** / **Reddet**.
   - **Bulut kelimeleri**: onaylı kelimeleri **Düzenle** / **Sil**.
   - **Toplu ekle**: girdiğin kelimeler doğrudan onaylı olarak buluta yazılır (tek kelime ekleme de yöneticiyken doğrudan onaylıya gider).
   - **Senkronize et**: buluttaki onaylı kelimeleri cihaza çeker.
4. “Toplu ekle” ve “Bulut yönetimi” bağlantıları giriş yapmadan görünmez.

PIN'i değiştirmek için `web/app.js` dosyasının üstündeki `const ADMIN_PIN = '1234';` satırını düzenle, commit + push et ve yeni APK'yı kur. Bu PIN yalnızca arayüz kapısıdır; asıl güvenlik Firebase Authentication ve Firestore kurallarındadır.

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

### Okuma pratiği hikâyeleri

Uygulamada **Geçmiş** ile **Quiz** arasında `Okuma Pratiği` sekmesi vardır. Seviye sırası **Zor → Orta → Kolay** şeklindedir. Hikâyeler `data/stories.json` dosyasından gelir; dosya başlangıçta boştur, uygulama içinden hikâye ekleme yoktur.

Format:

```json
[
  {
    "id": "hikaye-1",
    "level": "zor",
    "titleFa": "...",
    "titleTr": "...",
    "fa": "...",
    "tr": "...",
    "pron": "..."
  }
]
```

- `level`: `zor`, `orta` veya `kolay`
- `fa`, `tr`, `pron` alanları hikâyenin **tam metnidir**; cümle cümle veya paragraf paragraf bölünmez.
- Ekranda sırayla Farsça tam metin, Türkçe tam metin ve Latin okunuş tam metin alt alta gösterilir.
- `pron` isteğe bağlıdır; boş bırakılabilir.
- Dosyayı değiştirdikten sonra `node scripts/embed-dictionary.js` çalıştırılır; GitHub Actions derlemesi bunu otomatik yapar ve `web/stories.js` dosyasını yeniler.

## 4) Firebase bulut senkronizasyonu

Kelimeler cihazda tutulur; internet varsa Firebase Firestore ile senkron olur. Firebase SDK dosyaları `web/vendor/` altında APK'ya gömülüdür, CDN kullanılmaz.

### Firebase Console'da bir kez yapılacaklar

1. https://console.firebase.google.com → **Proje ekle** (Analytics kapalı).
2. **Firestore Database** → Veritabanı oluştur (Üretim modu, varsayılan bölge).
3. **Authentication** → E-posta/Şifre'yi etkinleştir → **Kullanıcı ekle** (senin admin hesabın).
4. Proje ayarları → Web uygulaması (`</>`) → config değerlerini `web/firebase-config.js` içine yaz.
5. Firestore → **Kurallar** sekmesine şunu yapıştır (e-postanı değiştir) ve yayınla:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null
        && request.auth.token.email == 'SENIN_ADMIN_EPOSTAN';
    }
    match /words/{wordId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /pending/{wordId} {
      allow create: if true;
      allow read, update, delete: if isAdmin();
    }
    match /meta/{docId} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

> `meta/words` dokümanındaki `rev` numarası, kelime listesi değiştiğinde artar. Uygulama açılışta sadece bu numarayı okur; değişmediyse onaylı kelimeleri yeniden indirmez. **"Senkronize et"** düğmesi her zaman tam çekiş yapar.

### Veri modeli

- `words/{fa::tr}` → onaylı kelimeler; herkes okur, sadece yönetici yazar.
- `pending/{otomatikId}` → kullanıcı gönderimleri; herkes ekleyebilir, sadece yönetici okur/onaylar/siler.
- `meta/words` → kelime listesi sürüm numarası (`rev`); herkes okur, sadece yönetici yazar.
- Cihaz önbelleği: `fatr.cloud.v1` (onaylı), `fatr.rev.v1` (sürüm), `fatr.submitted.v1` (bekleyen rozeti), `fatr.outbox.v1` (çevrimdışı kuyruk).

### Toplu ekleme ve büyük sözlükler

- Firestore tek seferde en fazla **500 yazma** işlemine izin verir. Toplu ekleme, onay ve red işlemleri otomatik olarak 500'erli parçalara bölünür; binlerce kelime tek seferde eklenebilir.
- Misafir tek kelime eklemesinde aynı `fa::tr` zaten onaylıysa kelime kuyruğa alınmaz, "Bu kelime zaten sözlükte" mesajı gösterilir. Toplu eklemede bu kontrol yapılmaz; aynı anahtar üzerine yazılır.
- Yönetici **Bulut kelimeleri** sekmesinde arama yapabilir; liste ilk 200 kelimeyle sınırlıdır ve "Daha fazla göster" ile genişletilir. Böylece 10 bin kelimede ekran donmaz.

## 5) Uygulama kimliğini değiştirme

- `capacitor.config.json`: `appId` (Play Store için benzersiz paket adı) ve `appName`
- `web/manifest.json`: ad ve tema renkleri
- Ayarlar ekranından uygulama adını/alt başlığını ve vurgu rengini telefon üzerinden değiştirebilirsin.

## Dosya yapısı

```
fa-tr-sozluk/
├── data/dictionary.json        # sözlük kaynağı (733 kelime)
├── data/stories.json           # okuma pratiği hikâyeleri (başlangıçta boş)
├── scripts/embed-dictionary.js # JSON -> web/dictionary.js, conjugations.js, stories.js
├── scripts/serve.js            # yerel önizleme sunucusu
├── web/                        # uygulamanın kendisi (HTML/CSS/JS)
│   ├── db.js                   # Firestore katmanı, çevrimdışı önbellek, onay kuyruğu
│   ├── firebase-config.js      # Firebase proje anahtarları (API key herkese açıktır)
│   └── vendor/                 # yerel Firebase SDK (APK içinde, CDN yok)
├── capacitor.config.json       # APK ayarları
├── package.json
└── .github/workflows/build-apk.yml
```

## Bilinen notlar

- Seslendirme özelliği kaldırıldı; telaffuz yazı olarak gösterilir.
- `app-debug.apk` kurulabilir bir derlemedir; Play Store için signed release gerekir.
