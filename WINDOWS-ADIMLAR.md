# Windows 10 / 11 için sıfırdan anlatım

"GitHub terminali" diye ayrı bir uygulama yok. **Kendi bilgisayarının komut penceresi** içinde `git` yazıyoruz. Aşağıdaki adımları sırayla yap.

---

## ADIM 1 — Komut penceresini aç

1. Klavyede **Windows tuşu** (⌘/Windows logosu) ile **R** tuşuna **birlikte** bas.
   - Küçük bir **Çalıştır** penceresi açılır.
2. "Aç:" yazan yere şunu yaz: `cmd`
3. **Enter** tuşuna bas.

Açılan siyah pencereye şuna benzer bir şey yazmış olmalı:

```
Microsoft Windows [Version 10.0.19045.xxxx]
(c) Microsoft Corporation. All rights reserved.

C:\Users\ADIN>
```

Bu `C:\Users\ADIN>` kısmına **komut satırı** denir. Artık buraya yazabilirsin.

> Alternatif: Başlat menüsünde `powershell` yaz → **Windows PowerShell** → aynı işi görür.

**En kolay alternatif:** `fa-tr-sozluk` klasörünün içinde **`terminal-ac.bat`** dosyasına çift tıkla. Terminal zaten doğru klasörde açılır ve komutlar ekranda hazır bekler. (Git kurulu değilse önce Adım 2'yi yap.)

---

## ADIM 2 — Git kurulu mu kontrol et

Terminalde şunu yaz ve **Enter**'a bas:

```
git --version
```

### Sonuç A: `git version 2.43.0` gibi bir satır çıktı
Harika, Git kurulu. Adım 3'e geç.

### Sonuç B: `'git' is not recognized as an internal or external command` dedi
Git'i kurman gerekir:

1. Tarayıcıda şurayı aç: **https://git-scm.com/download/win**
2. **Download for Windows (64-bit)** butonuna tıkla. İndirilen `Git-x.y.z-64-bit.exe` dosyasını bul.
3. Dosyaya **çift tıkla**.
4. "Windows güvenliği uyarısı" çıkarsa **Evet / Yes** de.
5. Kurulum ekranlarında **her yerde Next**'e tıkla. Hiçbir ayarı değiştirme.
6. Sonda **Install** → **Finish**.
7. **Terminali kapatıp yeniden aç** (Adım 1'i tekrarla). Bu çok önemli; aksi halde Windows yeni Git'i görmez.
8. Tekrar `git --version` yaz. Artık sürüm görmelisin.

---

## ADIM 3 — Doğru klasöre geç

Terminalde şu an ev klasöründesin. Bizim dosyalar `fa-tr-sozluk` klasöründe.

1. **Dosya Gezgini**'ni aç (klavyede **Win + E**).
2. `fa-tr-sozluk` klasörünü bul. Genelde **İndirilenler / Downloads** veya **Masaüstü / Desktop** içindedir.
3. Klasörü aç. Üstteki **adres çubuğuna** tıkla (yol mavi seçilir).
4. **Ctrl + C** ile yolu kopyala. Örnek: `C:\Users\Ayse\Downloads\fa-tr-sozluk`
5. Terminale dön. Şunu yaz:

```
cd "C:\Users\Ayse\Downloads\fa-tr-sozluk"
```

- `cd` yazdıktan sonra bir boşluk bırak.
- Tırnakların içine kendi kopyaladığın yolu yapıştır.
- Terminale yapıştırmak için **sağ tık** yapabilirsin (Ctrl+V bazı Windows ayarlarında çalışmaz).
- **Enter**'a bas.

Doğru yerde misin diye kontrol et:

```
dir
```

Şunları görmelisin: `README.md`, `WINDOWS-ADIMLAR.md`, `data`, `web`, `package.json`, `terminal-ac.bat`.

Bunları görmüyorsan yanlış klasördesin — Adım 3'ü tekrarla.

> İpucu: `terminal-ac.bat`'e çift tıklarsan bu adımı atlamış olursun; terminal doğrudan klasörde açılır.

---

## ADIM 4 — GitHub'da boş bir repo oluştur

1. Tarayıcıda **https://github.com** adresine git.
2. Giriş yap. Hesabın yoksa **Sign up** → e-posta, şifre, kullanıcı adı → **Create account**.
3. Sağ üstteki **+** işaretine tıkla → **New repository**.
4. **Repository name** kutusuna yaz: `farsca-turkce-sozluk`
5. **Public** radyo butonunu seç. (Private seçersen ücretsiz Actions kotası sorun olabilir.)
6. **Add a README file** kutusunu işaretle.
7. **Create repository** butonuna tıkla.
8. Açılan sayfada yeşil **Code** butonuna tıkla → **HTTPS** sekmesinde şu adresi görürsün:

```
https://github.com/KULLANICIADIN/farsca-turkce-sozluk.git
```

Bu adresi kopyala (sağındaki kopya ikonuna tıkla).

---

## ADIM 5 — Komutları çalıştır

Terminal hâlâ `fa-tr-sozluk` klasöründe olmalı. **Her satırı ayrı ayrı** yaz ve Enter'a bas:

```bash
git init
git add .
git commit -m "ilk sürüm"
git branch -M main
git remote add origin https://github.com/KULLANICIADIN/farsca-turkce-sozluk.git
git push -u origin main
```

Şu satırdaki `KULLANICIADIN` yazısını **kendi GitHub kullanıcı adınla** değiştirmeyi unutma.

Ne yaptığını özetle:

| Komut | Ne işe yarar |
|---|---|
| `git init` | Klasörü Git projesi yapar |
| `git add .` | Bütün dosyaları "yüklenecek" diye işaretler |
| `git commit -m "..."` | Onlara bir sürüm adı verir |
| `git branch -M main` | Ana dalın adını `main` yapar |
| `git remote add origin ...` | GitHub adresini tanıtır |
| `git push -u origin main` | Dosyaları GitHub'a gönderir |

### Çıkabilecek hatalar ve çözümleri

**`Author identity unknown` / `Please tell me who you are`**
Adını ve e-postanı bir kez tanıtman gerekir:

```bash
git config --global user.email "sen@eposta.com"
git config --global user.name "Adin Soyad"
git commit -m "ilk sürüm"
```

**`fatal: not a git repository`**
Yanlış klasördesin. `cd` ile tekrar `fa-tr-sozluk` klasörüne gir ve `dir` ile kontrol et.

**`Password` / `Username for github.com` sordu**
GitHub şifre kabul etmez, **token** ister:
1. GitHub → sağ üst profil → **Settings**
2. En altta **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. **Generate new token (classic)** → Not: `APK derleme` → süre: 90 days
4. **repo** kutusunu işaretle → **Generate token**
5. Çıkan `ghp_...` kodunu kopyala → terminalde şifre yerine yapıştır.

**`Could not resolve host: github.com`**
İnternet bağlantın veya VPN/proxy engeli var; bağlantını kontrol et.

---

## ADIM 6 — APK'yı derle ve indir

1. GitHub repo sayfasında üstteki **Actions** sekmesine tıkla.
2. Sol tarafta **Build APK** yazısına tıkla.
3. Sağda **Run workflow** butonu → açılan kutuda tekrar **Run workflow** (yeşil buton).
4. 2–5 dakika bekle. İşaret **✓** olunca o çalıştırmaya tıkla.
5. En aşağıda **Artifacts** bölümü → **farsca-turkce-sozluk-apk** → indir.
6. İndirilen ZIP'ten `app-debug.apk` dosyasını çıkar → telefona gönder → aç ve kur.

---

## Kontrol listesi

- [ ] `cmd` açıldı, `C:\Users\...>` görüyorum
- [ ] `git --version` sürüm veriyor
- [ ] `cd "...\fa-tr-sozluk"` ile klasöre girdim, `dir` dosyaları gösteriyor
- [ ] GitHub'da public repo oluşturdum, HTTPS adresini kopyaladım
- [ ] 6 git komutu sırayla çalıştı, hata yok
- [ ] Actions'ta Build APK çalıştı, artifact indirildi
- [ ] APK telefonuma kuruldu

Bir adımda takılırsan terminalde gördüğün **hata mesajını aynen** buraya yaz, o satırı birlikte çözelim.
