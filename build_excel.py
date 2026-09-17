# -*- coding: utf-8 -*-
"""Astro Şuşu modul envanterini Excel'e yazar."""
import os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

OUT = r"C:\3matolye\Numeroloji\AstroSushu_Modul_Envanteri.xlsx"

# (Kategori, Modul Adi, URL, Girdiler, Cikti_Ozeti, Ucretsiz, Durum)
ROWS = [
 # ---------------- NUMEROLOJI ----------------
 ("Numeroloji","Bütünsel Numerolojik Analiz","/Numerology/HolisticAnalysis","Tam ad; Gün; Ay; Yıl","İfade düzlemleri, harf grupları, geçiş döngüleri, öz döngü, isim/doğum/sentez sayısal matrisi, omurga","Evet","Çalıştı (örnek kaydedildi)"),
 ("Numeroloji","İsim Analizi","/Numerology/FullNameAnalysis","Tam ad","İsim haritası, yaşam yolu, ifade, kişilik, kalp arzusu vb.","Kısıtlı","Çalıştı (örnek kaydedildi)"),
 ("Numeroloji","Doğum Tarihi Analizi","/Numerology/BirthdayAnalysis","Gün; Ay; Yıl","Hayat sayısı, yıllara göre dağılım (Kabala/Enerji), dönemler","Evet","Çalıştı (örnek kaydedildi)"),
 ("Numeroloji","Karşılaştırma Analizi","/Numerology/CompareAnalysis","Ad+Tarih (x2)","İki kişinin numerolojik göstergeleri karşılaştırma","Evet","Girdi alanları tespit edildi"),
 ("Numeroloji","İsim Karşılaştırma","/Numerology/CompareNameAnalysis","İsim (x2)","İki ismin sayısal karşılaştırması","Evet","Girdi alanları tespit edildi"),
 ("Numeroloji","Adres/Lokasyon Analizi","/Numerology/LocationAnalysis","Ülke; Eyalet; Şehir; İlçe; Semt; (11 alan)","Adres sayısal değeri","Evet","Girdi alanları tespit edildi"),
 ("Numeroloji","Kimlik Numarası Analizi","/Numerology/IdentityNumberAnalysis","Kimlik numarası","Sayı-yankı tablosu","Evet","Çalıştı (örnek kaydedildi)"),
 ("Numeroloji","Telefon Numarası Analizi","/Numerology/PhoneNumberAnalysis","Telefon numarası","Sayı dizilimi / yankı","Evet","Çalıştı (örnek kaydedildi)"),
 ("Numeroloji","Araba Plaka Analizi","/Numerology/CarPlateAnalysis","Plaka","Sayı-yankı tablosu","Evet","Çalıştı (örnek kaydedildi)"),
 ("Numeroloji","Motosiklet Plaka Analizi","/Numerology/MotorcyclePlateAnalysis","Plaka","Sayı-yankı tablosu","Evet","Çalıştı (örnek kaydedildi)"),
 ("Numeroloji - Kişisel","Kişisel Tarih","/Numerology/Personal/Date","Gün; Ay; Yıl","Kişisel gün sayısı analizi","Evet","Çalıştı (örnek kaydedildi)"),
 ("Numeroloji - Kişisel","Kişisel Hafta","/Numerology/Personal/Week","Gün; Ay; Yıl","Kişisel hafta döngüsü","Evet","Çalıştı (örnek kaydedildi)"),
 ("Numeroloji - Kişisel","Kişisel Fibonacci","/Numerology/Personal/Fibonacci","Gün; Ay; Yıl","Fibonacci dizilim modeli","Evet","Girdi alanları tespit edildi"),
 ("Numeroloji - Kişisel","Kişisel Döngüler","/Numerology/Personal/Cycles","Gün; Ay; Yıl","Sayısal döngü modeli","Evet","Çalıştı (örnek kaydedildi)"),
 ("Numeroloji - Kişisel","Kadersel Döngüler","/Numerology/Personal/FatefulCycles","Gün; Ay; Yıl","Kadersel dönemler","Evet","Girdi alanları tespit edildi"),
 ("Numeroloji - Kişisel","Dönüşüm Yılları","/Numerology/Personal/Transformation","Gün; Ay; Yıl","Dönüşüm yılları hesaplaması","Evet","Çalıştı (örnek kaydedildi)"),
 ("Numeroloji - Evrensel","Evrensel Tarih","/Numerology/Universal/Date","Gün; Ay; Yıl","Evrensel tarih hesaplaması","Evet","Çalıştı (örnek kaydedildi)"),
 ("Numeroloji - Evrensel","Evrensel Hafta","/Numerology/Universal/Week","Tarih","Evrensel hafta modülü","Evet","Girdi alanları tespit edildi"),
 ("Numeroloji - Evrensel","Evrensel Fibonacci","/Numerology/Universal/Fibonacci","Gün; Ay; Yıl","Evrensel Fibonacci modeli","Evet","Girdi alanları tespit edildi"),
 ("Numeroloji - Evrensel","Evrensel Döngüler","/Numerology/Universal/Cycles","Gün; Ay; Yıl","Evrensel sayı döngüleri","Evet","Girdi alanları tespit edildi"),
 ("Numeroloji - Evrensel","Evrensel Çark","/Numerology/Universal/Wheel","Gün; Ay; Yıl","Evrensel çark hesaplaması","Evet","Çalıştı (örnek kaydedildi)"),
 ("Karma","Karma Analizi (Ladini)","/Karmic/Analysis","Tam ad; Gün; Ay; Yıl","Karma haritası, karmik göstergeler","Evet","Çalıştı (örnek kaydedildi)"),
 ("Kader Matrisi","Kader Matrisi Analizi","/DestinyMatrix/Analysis","Tam ad; Gün; Ay; Yıl","Kader matrisi, sayı matrisi görselleştirmesi","Evet","Çalıştı (örnek kaydedildi)"),
 ("Numeroloji - Araç","İsim Uyumluluğu","/Numerology/Tool/NameCompatibility","İsim (x2)","Kalp arzusu/kişilik/ifade uyum yüzdeleri, rapor+kart","Evet","Çalıştı (örnek kaydedildi)"),
 ("Numeroloji - Araç","Hesaplama Aracı","/Numerology/Tool/Calculator","Değer","Numerolojik değer hesaplama","Kısıtlı","Girdi alanları tespit edildi"),
 ("Numeroloji - Araç","Pin Kodu Karşılaştırma","/Numerology/Tool/PinCodeCompare","Pin kodları (6 alan)","Pin kodu karşılaştırma modülü","Evet","Girdi alanları tespit edildi"),
 # ---------------- ASTROLOJI ----------------
 ("Astroloji","Natal Harita","/Astrology/NatalChart","Doğum tarihi/saati/yeri","Profesyonel natal harita, gezegen/ev/açı tabloları","Abonelik","URL biliniyor"),
 ("Astroloji","Transit Haritası","/Astrology/TransitChart","Natal + tarih","Transit-natal açılar, zaman çizelgesi","Abonelik","URL biliniyor"),
 ("Astroloji","İlerletilmiş Harita","/Astrology/ProgressedChart","Natal","İkincil ilerletim, ilerletilmiş-natal açılar","Abonelik","URL biliniyor"),
 ("Astroloji","Solar Return","/Astrology/SolarReturn","Natal + yıl","Kesin güneş dönüş anı, SR-natal açılar","Abonelik","URL biliniyor"),
 ("Astroloji","Lunar Return","/Astrology/LunarReturn","Natal + ay","Kesin ay dönüş anı, LR-natal açılar","Abonelik","URL biliniyor"),
 ("Astroloji","Tutulma Analizi","/Astrology/EclipseAnalysis","Natal","Tutulma kataloğu ve natal temaslar","Abonelik","URL biliniyor"),
 ("Astroloji","Asteroitler ve Kraliyet Yıldızları","/Astrology/AsteroidsRoyalStarsAnalysis","Natal","Asteroitler ve kraliyet yıldızları analizi","Abonelik","URL biliniyor"),
 ("Astroloji","Arap Noktaları Analizi","/Astrology/ArabicPartsAnalysis","Natal","Yedi Hermetik Lot / Arap noktaları","Abonelik","URL biliniyor"),
 ("Astroloji","Bütünsel Harita Analizi","/Astrology/HolisticAnalysis","Natal","Element-nitelik dengesi ve harita sentezi","Abonelik","URL biliniyor"),
 ("Astroloji","Sinastri Haritası","/Astrology/SynastryChart","2 natal","Kişiler arası açılar, karşılıklı ev yerleşimleri","Abonelik","URL biliniyor"),
 ("Astroloji","Kompozit Harita","/Astrology/CompositeChart","2 natal","Dairesel kompozit, orta noktalar","Abonelik","URL biliniyor"),
 ("Astroloji","Rektifikasyon","/Astrology/Rectification","Natal + yaşam olayları","Doğum saati rektifikasyonu, aday sıralaması","Abonelik","URL biliniyor"),
 ("Astroloji","Astrokartografi Analizi","/Astrology/AstrocartographyAnalysis","Natal","Dünya hatları, konum önerileri","Abonelik","URL biliniyor"),
 ("Astroloji","Güncel Gökyüzü","/Astrology/CurrentSky","Tarih/saat/konum","Gökyüzü haritası, ay fazı, yorumlar","Ücretsiz","URL biliniyor"),
 ("Astroloji","Kişisel Astroloji Takvimi","/Astrology/PersonalAstrologyCalendar","Natal","Kişisel transit dönemleri, kesinleşme zamanları","Abonelik","URL biliniyor"),
 # ---------------- ARAÇLAR ----------------
 ("Araç","Not Panosu","/Tool/NoteBoard","-","Not yönetimi","Evet","URL biliniyor"),
 ("Araç","Çizim Alanı","/Tool/DrawingWorkspace","-","Serbest çizim","Evet","URL biliniyor"),
 ("Araç","Dizim Çalışma Alanı","/Tool/ConstellationWorkspace","-","Temsilci yerleştirme/dizim","Evet","URL biliniyor"),
 ("Araç","Aile Sistemi Haritası","/Tool/FamilySystemMap","-","Aile üyeleri/kuşaklar haritası","Evet","URL biliniyor"),
 ("Araç","Prompter","/Tool/Prompter","Metin","Metin takip aracı","Ücretsiz","URL biliniyor"),
 ("Araç","Akış Planlayıcı","/Tool/FlowPlanner","-","Eğitim/yayın akış planlama","Evet","URL biliniyor"),
 # ---------------- PRATİK BİLGİLER / DİĞER ----------------
 ("Pratik Bilgiler","Ülkeler","/Handy/Countries","-","Ülke sayısal değeri","Evet","URL biliniyor"),
 ("Pratik Bilgiler","Şehirler","/Handy/Cities","-","Şehir sayısal değeri","Evet","URL biliniyor"),
 ("Pratik Bilgiler","İlçeler","/Handy/Counties","-","İlçe sayısal değeri","Evet","URL biliniyor"),
 ("Pratik Bilgiler","Finansal Varlıklar","/Handy/FinancialEntities","-","Finansal varlık veri modeli","Evet","URL biliniyor"),
 ("Pratik Bilgiler","Futbol Takımları","/Handy/SoccerTeams","-","Futbol takımı sayısal modeli","Evet","URL biliniyor"),
 ("Eğitim","Eğitim Setleri","/Edu/Bundles","-","Omurga, Çakralar, Karmalar, Arkanalar setleri","Satın alma","URL biliniyor"),
 ("Hesap","Çalışma Alanım","/Workspace","Ad; Tarih; Saat; Yer","Kayıtlı çalışmalar, analizlere hızlı erişim","Evet","Çalıştı (örnek kayıt eklendi)"),
 ("Hesap","Abonelik","/Subscription","-","Yıllık abonelik (935₺), 7 gün ücretsiz deneme","Satın alma","URL biliniyor"),
]

wb = Workbook()

# --- Sayfa 1: Modul Envanteri ---
ws = wb.active
ws.title = "Modul Envanteri"
headers = ["#","Kategori","Modül Adı","URL","Girdiler","Çıktı Özeti","Ücretsiz mi?","Durum"]
ws.append(headers)

hfill = PatternFill("solid", fgColor="2F5597")
hfont = Font(bold=True, color="FFFFFF", size=11)
thin = Side(style="thin", color="BFBFBF")
border = Border(left=thin,right=thin,top=thin,bottom=thin)

for c in range(1,len(headers)+1):
    cell = ws.cell(row=1,column=c)
    cell.fill = hfill; cell.font = hfont
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell.border = border

cat_colors = {
 "Numeroloji":"DDEBF7","Numeroloji - Kişisel":"E2EFDA","Numeroloji - Evrensel":"FFF2CC",
 "Numeroloji - Araç":"FCE4D6","Karma":"E4DFEC","Kader Matrisi":"E4DFEC",
 "Astroloji":"F8CBAD","Araç":"D9E1F2","Pratik Bilgiler":"EDEDED",
 "Eğitim":"FFF2CC","Hesap":"E2EFDA",
}

for i,(cat,name,url,inp,out,free,status) in enumerate(ROWS, start=1):
    r = i+1
    ws.cell(row=r,column=1,value=i)
    ws.cell(row=r,column=2,value=cat)
    ws.cell(row=r,column=3,value=name)
    ws.cell(row=r,column=4,value="https://kaynak-site"+url)
    ws.cell(row=r,column=5,value=inp)
    ws.cell(row=r,column=6,value=out)
    ws.cell(row=r,column=7,value=free)
    ws.cell(row=r,column=8,value=status)
    fill = PatternFill("solid", fgColor=cat_colors.get(cat,"FFFFFF"))
    for c in range(1,9):
        cell = ws.cell(row=r,column=c)
        cell.border = border
        cell.alignment = Alignment(vertical="top", wrap_text=(c in (5,6)))
        if c==2: cell.fill = fill

widths = [4,20,32,46,26,40,12,28]
for i,w in enumerate(widths,start=1):
    ws.column_dimensions[get_column_letter(i)].width = w
ws.freeze_panes = "A2"
ws.auto_filter.ref = f"A1:H{len(ROWS)+1}"

# --- Sayfa 2: Ozet ---
ws2 = wb.create_sheet("Özet")
from collections import Counter
cats = Counter(r[0] for r in ROWS)
ws2.append(["Kategori","Modül Sayısı"])
for c in range(1,3):
    cell=ws2.cell(row=1,column=c); cell.fill=hfill; cell.font=hfont
    cell.alignment=Alignment(horizontal="center")
for cat,cnt in cats.most_common():
    ws2.append([cat,cnt])
ws2.append(["TOPLAM", len(ROWS)])
ws2.cell(row=ws2.max_row,column=1).font=Font(bold=True)
ws2.cell(row=ws2.max_row,column=2).font=Font(bold=True)
ws2.column_dimensions["A"].width=28
ws2.column_dimensions["B"].width=14

# --- Sayfa 3: Ornek Sonuclar ---
ws3 = wb.create_sheet("Örnek Analizler")
ws3.append(["Modül","Örnek Girdi","Sonuç Özeti","Kayıt Dosyası"])
for c in range(1,5):
    cell=ws3.cell(row=1,column=c); cell.fill=hfill; cell.font=hfont
    cell.alignment=Alignment(horizontal="center")

EX = [
 ("Bütünsel Analiz","Ornek Kisi, 15.3.1990","İfade düzlemleri, harf grupları, geçiş döngüleri, öz döngü, sayı matrisleri","holistic_result.txt"),
 ("İsim Analizi","Ornek Kisi","İsim haritası ve temel göstergeler","res_Numerology_FullNameAnalysis.txt"),
 ("Doğum Tarihi Analizi","15.3.1990","Hayat sayısı (28)6, yıllara göre Kabala/Enerji dağılımı","res_Numerology_BirthdayAnalysis.txt"),
 ("Kimlik No Analizi","12345678901","Sayı-yankı tablosu","res_Numerology_IdentityNumberAnalysis.txt"),
 ("Telefon Analizi","5551234567","Sayı dizilimi","res_Numerology_PhoneNumberAnalysis.txt"),
 ("Araba Plaka","34ABC123","Sayı-yankı tablosu","res_Numerology_CarPlateAnalysis.txt"),
 ("Motosiklet Plaka","34AB123","Sayı-yankı tablosu","res_Numerology_MotorcyclePlateAnalysis.txt"),
 ("İsim Uyumluluğu","Ornek Kisi + Test Kisi","Kalp arzusu/kişilik/ifade uyum yüzdeleri","res_Tool_NameCompatibility.txt"),
 ("Kişisel Tarih","15.3.1990","Kişisel gün analizi","res_Personal_Date.txt"),
 ("Kişisel Hafta","15.3.1990","Kişisel hafta döngüsü","res_Personal_Week.txt"),
 ("Kişisel Döngüler","15.3.1990","Sayısal döngü modeli","res_Personal_Cycles.txt"),
 ("Dönüşüm Yılları","15.3.1990","Dönüşüm yılı hesaplaması","res_Personal_Transformation.txt"),
 ("Evrensel Tarih","17.9.2026","Evrensel tarih hesaplaması","res_Universal_Date.txt"),
 ("Evrensel Çark","17.9.2026","Evrensel çark hesaplaması","res_Universal_Wheel.txt"),
 ("Karma Analizi","Ornek Kisi, 15.3.1990","Karma haritası","res_Karmic_Analysis.txt"),
 ("Kader Matrisi","Ornek Kisi, 15.3.1990","Kader matrisi ve matris görselleştirmesi","res_DestinyMatrix_Analysis.txt"),
]
for m,inp,res,f in EX:
    ws3.append([m,inp,res,f])
for i,w in enumerate([24,26,46,42],start=1):
    ws3.column_dimensions[get_column_letter(i)].width=w
for r in range(2,ws3.max_row+1):
    for c in range(1,5):
        ws3.cell(row=r,column=c).alignment=Alignment(vertical="top",wrap_text=True)

wb.save(OUT)
print("OK ->", OUT)
print("Modul sayisi:", len(ROWS))
