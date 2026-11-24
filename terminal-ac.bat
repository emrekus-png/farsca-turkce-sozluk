@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ============================================================
echo  Sözlük klasörü içinde terminal açildi.
echo  Bulundugun yer: %CD%
echo ============================================================
echo.
echo  Asagidaki komutlari TEK TEK yazip Enter'a bas:
echo.
echo     git --version
echo     git init
echo     git add .
echo     git commit -m "ilk surum"
echo     git branch -M main
echo     git remote add origin https://github.com/KULLANICIADIN/farsca-turkce-sozluk.git
echo     git push -u origin main
echo.
echo  Not: KULLANICIADIN yazan yeri kendi GitHub kullanici adinla degistir.
echo  Kapatmak icin: exit
echo.
cmd /k
