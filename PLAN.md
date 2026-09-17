# Astro Şuşu Numeroloji Sistemi — Yerel HTML Uygulaması Planı

## Amaç
kaynak-site'un numeroloji modüllerini yerel, çevrimdışı çalışan tek sayfalık bir HTML
uygulaması olarak yeniden üretmek. Giriş, analiz sayfaları, rapor ve geçmiş analizler dahil.

## Kapsam (Faz 1 — bu sürüm)
Sadece **numeroloji** modülleri (astroloji hariç). 26 modül.

## Teknoloji
- Tek dosya HTML + CSS + vanilla JS (kurulum yok, çift tıkla açılır)
- Hesaplama: saf JS (Pisagor 1-9 + üstat sayılar 11,22,33,44...)
- Depolama: `localStorage` (çalışma alanı, geçmiş analizler)
- PDF: `window.print()` + yazdırma CSS'i (tarayıcıdan PDF olarak kaydet)
- Dil: Türkçe

## Modül Listesi (26)
### Temel Analizler (10)
1. Bütünsel Numerolojik Analiz
2. İsim Analizi (FullName)
3. Doğum Tarihi Analizi (Birthday)
4. Karşılaştırma Analizi
5. İsim Karşılaştırma
6. Adres/Lokasyon Analizi
7. Kimlik Numarası Analizi
8. Telefon Numarası Analizi
9. Araba Plaka Analizi
10. Motosiklet Plaka Analizi

### Kişisel Döngüler (6)
11. Kişisel Tarih
12. Kişisel Hafta
13. Kişisel Fibonacci
14. Kişisel Döngüler
15. Kadersel Döngüler
16. Dönüşüm Yılları

### Evrensel Döngüler (5)
17. Evrensel Tarih
18. Evrensel Hafta
19. Evrensel Fibonacci
20. Evrensel Döngüler
21. Evrensel Çark

### Ekoller (2)
22. Karma Analizi (Ladini)
23. Kader Matrisi

### Araçlar (3)
24. İsim Uyumluluğu
25. Hesaplama Aracı
26. Pin Kodu Karşılaştırma

## Hesaplama Motoru
- `reduceNumber(n, {master:true})`: 1-9'a indirger, üstat sayılarda (11,22,33,44) durur
- Harf değerleri: Pisagor tablosu (A=1..I=9, J=1..)
- Sayılar: Yaşam Yolu, İfade, Kişilik, Kalp Arzusu, Olgunluk, Tutum, Denge, Köşe/Bitiş Taşı, Köprü, Erken Ders
- Döngüler: Kişisel yıl/ay/gün/hafta, zirve dönemler, meydan okumalar
- Matris: isim/doğum/sentez 3x3 sayı matrisi
- Çakralar, harf grupları, ifade düzlemleri

## Uygulama Yapısı
- **Giriş ekranı**: yerel (kullanıcı adı + şifre localStorage'da saklanır; ilk kullanımda kayıt)
- **Kenar menü**: modül kategorileri
- **Analiz sayfası**: girdi formu + çalıştır + sonuç görüntüleme
- **Çalışma Alanı**: kayıtlı kişiler (ad, doğum tarihi, saat, yer)
- **Geçmiş**: çalıştırılan analizler localStorage'da
- **Rapor**: yazdırılabilir/PDF çıktı görünümü

## Fazlar
- **Faz 1** (şimdi): İskelet + giriş + çalışma alanı + hesaplama motoru + ilk 10 temel modül
- **Faz 2**: Kişisel/Evrensel döngü modülleri + Karma/Kader Matrisi
- **Faz 3**: Uyumluluk araçları + rapor/PDF + geçmiş ekranı
- **Faz 4**: (opsiyonel) Astroloji modülleri, çok dillilik

## Kaynak Referansları
- Envanter: `AstroSushu_Modul_Envanteri.xlsx`
- Astro Şuşu örnek çıktıları: `kaynak_ornekler/*.txt`
- Astro Şuşu modül girdileri: `kaynak_ornekler/modules.json`

