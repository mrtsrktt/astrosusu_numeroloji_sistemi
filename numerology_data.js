/**
 * Astro Şuşu Numeroloji Sistemi — Ezoterik Veri ve Sembol Kütüphanesi
 * Gezegenler, Burçlar, 24 Futhark Rünü, 22 Büyük Arkana, 4 Element, 8 Ay Fazı,
 * 99 Esma-ül Hüsna, 5 Uyum Tipi, Yönler (Tirol Çarkı)
 */
(function (global) {
  'use strict';

  const numerologyData = {};

  numerologyData.daysOfWeek = [
    { number: 1, name: 'Pazartesi' },
    { number: 2, name: 'Salı' },
    { number: 3, name: 'Çarşamba' },
    { number: 4, name: 'Perşembe' },
    { number: 5, name: 'Cuma' },
    { number: 6, name: 'Cumartesi' },
    { number: 7, name: 'Pazar' }
  ];

  numerologyData.karmicDebts = [
    { id: 13, title: 'Disiplin Borcu', desc: 'Emek, sabır ve düzen sınavı. Kolaya kaçmama ve sorumluluk alma gerekliliği.' },
    { id: 14, title: 'Özgürlük Borcu', desc: 'Aşırılıklar, bağımlılıklar ve özgürlüğü yanlış kullanma sınavı. Ölçülü olma dersi.' },
    { id: 16, title: 'Ego / Yıkım Borcu', desc: 'Ego, kibir ve sahte temellerin yıkılması. Kalp kırıklıkları ve ruhsal uyanış.' },
    { id: 19, title: 'Bireysellik Borcu', desc: 'Yalnızlık, bencil davranma ve yardım istemeyi reddetme sınavı. Paylaşma dersi.' }
  ];

  numerologyData.chakraKarmas = [
    { chakra: 1, name: 'Kök Çakra', color: '#e74c3c', description: 'Güven, aidiyet, hayatta kalma, atalar karması.' },
    { chakra: 2, name: 'Sakral Çakra', color: '#e67e22', description: 'Duygusallık, ilişkiler, yaratıcı akış, anne karması.' },
    { chakra: 3, name: 'Solar Pleksus', color: '#f1c40f', description: 'Güç, özdeğer, özgüven, egonun karması.' },
    { chakra: 4, name: 'Kalp Çakrası', color: '#2ecc71', description: 'Sevgi, şefkat, affetme, kalp kırıklıkları karması.' },
    { chakra: 5, name: 'Boğaz Çakrası', color: '#3498db', description: 'İfade, iletişim, kendi gerçeğini söyleme karması.' },
    { chakra: 6, name: 'Üçüncü Göz', color: '#9b59b6', description: 'Sezgi, algı, geçmişi görme karması.' },
    { chakra: 7, name: 'Taç Çakra', color: '#8e44ad', description: 'İnanç, ruhsal bağlantı, Tanrı / evrenle ilişki karması.' },
    { chakra: 8, name: 'Ruh Yıldızı', color: '#d4af37', description: 'Karmik döngülerin tamamlanması, kader kontrolü.' },
    { chakra: 9, name: 'Evrensel Bilinç', color: '#1abc9c', description: 'Evrensel bilinç, teslimiyet, kolektif karma.' }
  ];

  numerologyData.elements = [
    { id: 1, name: 'Ateş', symbol: '🜂', color: '#e74c3c', description: 'Yaşama kıvılcım katan güç, irade, cesaret ve tutku.' },
    { id: 2, name: 'Toprak', symbol: '🜃', color: '#27ae60', description: 'Yaşamın temelini ve kalıcılığını sağlayan güç, güven ve istikrar.' },
    { id: 3, name: 'Hava', symbol: '🜁', color: '#3498db', description: 'Zihni ve insanları birbirine bağlayan güç, iletişim ve vizyon.' },
    { id: 4, name: 'Su', symbol: '🜄', color: '#2980b9', description: 'Ruhun derinliklerini ve duygusal akışı taşıyan güç, sezgi ve şifa.' }
  ];

  numerologyData.planets = [
    { number: 1, name: 'Güneş', symbol: '☉', description: 'Kimlik, irade, canlılık ve yaşam enerjisinin merkezidir.' },
    { number: 2, name: 'Ay', symbol: '☽', description: 'Duyguların, sezgilerin ve içsel güvenlik ihtiyacının sembolüdür.' },
    { number: 3, name: 'Merkür', symbol: '☿', description: 'Zihnin, iletişimin, düşünme biçiminin ve öğrenme sürecinin temsilcisidir.' },
    { number: 4, name: 'Venüs', symbol: '♀', description: 'Sevginin, estetiğin, değerlerin ve ilişkisel uyumun gezegenidir.' },
    { number: 5, name: 'Mars', symbol: '♂', description: 'Arzu, cesaret, eylem ve mücadele gücünü yöneten içsel savaşçıdır.' },
    { number: 6, name: 'Jüpiter', symbol: '♃', description: 'İnanç, bolluk, bilgelik ve yaşam felsefesiyle büyüme ilkesini temsil eder.' },
    { number: 7, name: 'Satürn', symbol: '♄', description: 'Disiplin, zaman, sınır ve sorumluluk bilincinin yapı kuran öğretmenidir.' },
    { number: 8, name: 'Uranüs', symbol: '♅', description: 'Devrim, özgürlük, farkındalık ve ani değişimlerin elektriksel gücüdür.' },
    { number: 9, name: 'Neptün', symbol: '♆', description: 'Hayal gücü, sezgi, ilahi birlik ve koşulsuz sevgi bilincini taşır.' },
    { number: 10, name: 'Plüton', symbol: '♇', description: 'Dönüşüm, simya, ölüm ve yeniden doğuşun derin gücüdür.' }
  ];

  numerologyData.signs = [
    { number: 1, name: 'Koç', symbol: '♈', element: 'Ateş', dates: '21 Mart - 19 Nisan' },
    { number: 2, name: 'Boğa', symbol: '♉', element: 'Toprak', dates: '20 Nisan - 20 Mayıs' },
    { number: 3, name: 'İkizler', symbol: '♊', element: 'Hava', dates: '21 Mayıs - 20 Haziran' },
    { number: 4, name: 'Yengeç', symbol: '♋', element: 'Su', dates: '21 Haziran - 22 Temmuz' },
    { number: 5, name: 'Aslan', symbol: '♌', element: 'Ateş', dates: '23 Temmuz - 22 Ağustos' },
    { number: 6, name: 'Başak', symbol: '♍', element: 'Toprak', dates: '23 Ağustos - 22 Eylül' },
    { number: 7, name: 'Terazi', symbol: '♎', element: 'Hava', dates: '23 Eylül - 22 Ekim' },
    { number: 8, name: 'Akrep', symbol: '♏', element: 'Su', dates: '23 Ekim - 21 Kasım' },
    { number: 9, name: 'Yay', symbol: '♐', element: 'Ateş', dates: '22 Kasım - 21 Aralık' },
    { number: 10, name: 'Oğlak', symbol: '♑', element: 'Toprak', dates: '22 Aralık - 19 Ocak' },
    { number: 11, name: 'Kova', symbol: '♒', element: 'Hava', dates: '20 Ocak - 18 Şubat' },
    { number: 12, name: 'Balık', symbol: '♓', element: 'Su', dates: '19 Şubat - 20 Mart' }
  ];

  numerologyData.arcanas = [
    { number: 1, name: 'BÜYÜCÜ', planet: 'Merkür', horoscope: 'İkizler, Başak', element: 'Hava', letter: 'A, E, O', time: '1 Gün, 1 Hafta, 1 Ay', guardian: false, desc: 'Yaratım gücü, irade, başlangıçlar, fırsatları somutlaştırma.' },
    { number: 2, name: 'AZİZE', planet: 'Ay', horoscope: 'Yengeç', element: 'Su', letter: 'B', time: 'Beklemek, İçsel Sesi Dinlemek', guardian: true, desc: 'Sezgi, gizem, bilinçaltı, pasif bilgelik, derin dişil güç.' },
    { number: 3, name: 'İMPARATORİÇE', planet: 'Venüs', horoscope: 'Boğa', element: 'Toprak', letter: 'G', time: 'Hasat Zamanı, Yaz Sonu / Sonbahar', guardian: false, desc: 'Bereket, doğurganlık, güzellik, maddi refah, şefkatli yönetim.' },
    { number: 4, name: 'İMPARATOR', planet: 'Mars', horoscope: 'Koç', element: 'Ateş', letter: 'D', time: 'İlkbahar, 21 Mart - 20 Nisan', guardian: false, desc: 'Düzen, otorite, disiplin, yapılandırma, sarsılmaz liderlik.' },
    { number: 5, name: 'AZİZ', planet: 'Venüs', horoscope: 'Boğa', element: 'Toprak', letter: 'H', time: '5 Gün, 5 Hafta, 5 Ay', guardian: true, desc: 'Manevi öğretmenlik, gelenek, ahlak, yüksek bilgi, rehberlik.' },
    { number: 6, name: 'AŞIKLAR', planet: 'Venüs, Jüpiter', horoscope: 'İkizler', element: 'Hava', letter: 'V, U', time: '6 Gün, 6 Hafta, 6 Ay', guardian: false, desc: 'Seçimler, aşk, kalpten karar verme, ortaklıklar ve estetik denge.' },
    { number: 7, name: 'ARABA', planet: 'Ay', horoscope: 'Yengeç', element: 'Su', letter: 'Z', time: '7 Gün, 7 Hafta, 7 Ay', guardian: false, desc: 'Hedefe odaklanma, zafer, irade gücü, seyahat, ilerleme.' },
    { number: 8, name: 'ADALET', planet: 'Venüs', horoscope: 'Terazi', element: 'Hava', letter: 'C, H', time: '11 Gün, 11 Hafta, 11 Ay', guardian: false, desc: 'Sebep-sonuç yasası, doğruluk, denge, hukuki ve karmik adalet.' },
    { number: 9, name: 'ERMİŞ', planet: 'Merkür', horoscope: 'Başak', element: 'Toprak', letter: 'T, E', time: '9 Gün, 9 Hafta, 9 Ay', guardian: false, desc: 'İçsel aydınlanma, bilgelik, yalnızlık, tefekkür, derin araştırma.' },
    { number: 10, name: 'KADER ÇARKI', planet: 'Jüpiter', horoscope: 'Balık, Yay', element: 'Ateş', letter: 'Y', time: '10 Gün, 10 Hafta, 10 Ay', guardian: false, desc: 'Kadersel şans, döngüsel değişimler, ilahi akışa teslimiyet.' },
    { number: 11, name: 'GÜÇ', planet: 'Güneş', horoscope: 'Aslan', element: 'Ateş', letter: 'G', time: '8 Gün, 8 Hafta, 8 Ay', guardian: false, desc: 'İçsel güç, sabır, şefkatle nefsini terbiye etme, dayanıklılık.' },
    { number: 12, name: 'ASILAN ADAM', planet: 'Neptün', horoscope: 'Balık', element: 'Su', letter: 'L', time: '12 Gün, 12 Hafta, 12 Ay', guardian: false, desc: 'Farklı bakış açısı, fedakarlık, bekleme, teslimiyet ve aydınlanma.' },
    { number: 13, name: 'ÖLÜM', planet: 'Mars, Plüton', horoscope: 'Akrep', element: 'Su', letter: 'M', time: '13 Gün, 13 Hafta, 13 Ay', guardian: false, desc: 'Büyük dönüşüm, eskiyi bırakma, kabuk değiştirme, yeniden doğuş.' },
    { number: 14, name: 'DENGE', planet: 'Jüpiter', horoscope: 'Yay', element: 'Ateş', letter: 'N', time: 'Yavaş İlerleyen Süreç, Sabır', guardian: false, desc: 'Uyum, ılımlılık, simyasal denge, ruhsal sükunet ve şifa.' },
    { number: 15, name: 'ŞEYTAN', planet: 'Satürn', horoscope: 'Oğlak', element: 'Toprak', letter: 'S', time: '15 Gün, 15 Hafta, 15 Ay', guardian: false, desc: 'Maddi tutkular, gölge yanlarla yüzleşme, bağımlılıkları aşma, cazibe.' },
    { number: 16, name: 'KULE', planet: 'Mars', horoscope: 'Koç', element: 'Ateş', letter: 'A', time: '16 Gün, 16 Hafta, 16 Ay', guardian: false, desc: 'Sahte temellerin yıkılışı, ani uyanış, özgürleşme, hakikate dönüş.' },
    { number: 17, name: 'YILDIZ', planet: 'Jüpiter', horoscope: 'Kova', element: 'Hava', letter: 'P, F', time: '17 Gün, 17 Hafta, 17 Ay', guardian: true, desc: 'Umut, ilham, şifa, parlayan yetenekler, evrensel koruma.' },
    { number: 18, name: 'AY', planet: 'Neptün, Jüpiter', horoscope: 'Balık', element: 'Su', letter: 'T, S', time: '18 Gün, 18 Hafta, 18 Ay', guardian: false, desc: 'Bilinçaltı, sezgiler, yanılsamalar, rüyalar, karanlıktan ışığa geçiş.' },
    { number: 19, name: 'GÜNEŞ', planet: 'Güneş', horoscope: 'Aslan', element: 'Ateş', letter: 'K', time: 'Yaz Ayları', guardian: false, desc: 'Büyük başarı, neşe, canlılık, görünürlük, çocuksu masumiyet ve zafer.' },
    { number: 20, name: 'MAHKEME', planet: 'Plüton', horoscope: 'Akrep', element: 'Ateş', letter: 'R', time: '20 Gün, 20 Hafta, 20 Ay', guardian: false, desc: 'Soy karmasının temizlenmesi, diriliş, uyanış, geçmişle hesaplaşma.' },
    { number: 21, name: 'DÜNYA', planet: 'Satürn', horoscope: 'Kova, Oğlak', element: 'Toprak', letter: 'Ş', time: '21 Gün, 21 Hafta, 21 Ay', guardian: false, desc: 'Tamamlanma, bütünlük, küresel başarı, sınırları aşma, nihai zafer.' },
    { number: 22, name: 'JOKER', planet: 'Uranüs', horoscope: 'Kova', element: 'Hava', letter: 'T', time: 'Mevsim Başlangıçları', guardian: false, desc: 'Sonsuz özgürlük, sıfırdan başlangıç, güvenle bilinmeyene adım atma.' }
  ];

  numerologyData.runes = [
    { number: 1, name: 'Fehu', symbol: 'ᚠ', meaning: 'Bereket, zenginlik, hareketli mal ve ruhsal bolluk.' },
    { number: 2, name: 'Uruz', symbol: 'ᚢ', meaning: 'İçsel güç, yaşam enerjisi, sağlık, dayanıklılık ve cesaret.' },
    { number: 3, name: 'Thurisaz', symbol: 'ᚦ', meaning: 'Korunma, sınır koyma, ilahi kalkan ve gölgeleri defetme.' },
    { number: 4, name: 'Ansuz', symbol: 'ᚨ', meaning: 'İlahi söz, bilgelik, ilham, rehberlik ve üst bilinç.' },
    { number: 5, name: 'Raido', symbol: 'ᚱ', meaning: 'Yolculuk, doğru istikamet, kader rotası ve gelişim.' },
    { number: 6, name: 'Kenaz', symbol: 'ᚲ', meaning: 'Aydınlanma meşalesi, kavrayış, yaratıcılık ve içsel ateş.' },
    { number: 7, name: 'Gebo', symbol: 'ᚷ', meaning: 'Kutsal armağan, adil takas, koşulsuz sevgi ve ortaklık.' },
    { number: 8, name: 'Wunjo', symbol: 'ᚹ', meaning: 'Neşe, huzur, kutlama, dileklerin gerçekleşmesi.' },
    { number: 9, name: 'Hagalaz', symbol: 'ᚺ', meaning: 'Kozmik arınma, ani krizle gelen temizlik, fırtına sonrası dinginlik.' },
    { number: 10, name: 'Nauthiz', symbol: 'ᚾ', meaning: 'Sabır, yoklukta olgunlaşma, direnç ve irade testi.' },
    { number: 11, name: 'Isa', symbol: 'ᛁ', meaning: 'Durağanlık, buz, içe odaklanma, sabırla bekleme dönemi.' },
    { number: 12, name: 'Jera', symbol: 'ᛃ', meaning: 'Emeklerin karşılığı, hasat vakti, döngünün meyvesi.' },
    { number: 13, name: 'Eihwaz', symbol: 'ᛇ', meaning: 'Hayat ağacı, dayanıklılık, ölüm-yeniden doğuş ekseni.' },
    { number: 14, name: 'Perthro', symbol: 'ᛈ', meaning: 'Kader zarı, gizem, bilinmeyen kaderin açılışı, sezgi.' },
    { number: 15, name: 'Algiz', symbol: 'ᛉ', meaning: 'İlahi koruma, melek kalkanı, yüksek farkındalık.' },
    { number: 16, name: 'Sowilo', symbol: 'ᛊ', meaning: 'Güneş ışığı, zafer, başarı, yaşam gücü ve berraklık.' },
    { number: 17, name: 'Tiwaz', symbol: 'ᛏ', meaning: 'Hakikat, onur, ruhsal savaşçı, adalet ve doğruluk.' },
    { number: 18, name: 'Berkana', symbol: 'ᛒ', meaning: 'Huş ağacı, büyüme, doğum, şifa ve dişil besleyicilik.' },
    { number: 19, name: 'Ehwaz', symbol: 'ᛖ', meaning: 'Kutsal at, sadakat, güvenilir ortaklık, hızlı ilerleme.' },
    { number: 20, name: 'Mannaz', symbol: 'ᛗ', meaning: 'İnsan, öz farkındalık, ortak akıl ve toplumsal bilinç.' },
    { number: 21, name: 'Laguz', symbol: 'ᛚ', meaning: 'Su, akış, sezgiler, teslimiyet ve duygusal derinlik.' },
    { number: 22, name: 'Ingwaz', symbol: 'ᛜ', meaning: 'Kuluçka, tohum, gizil potansiyelin olgunlaşması.' },
    { number: 23, name: 'Othila', symbol: 'ᛟ', meaning: 'Kökler, ata mirası, kutsal yurt ve aidiyet.' },
    { number: 24, name: 'Dagaz', symbol: 'ᛞ', meaning: 'Şafak vakti, aydınlanma, dönüşüm ve yeni başlangıç.' }
  ];

  numerologyData.directions = [
    { number: 0, planet: 'Merkür', direction: 'Kuzey', season: 'Kış', color: 'Siyah / Mavi', member: 'Böbrek', element: 'Su', emotion: 'Korku / Bilgelik', sound: 'Chui', bgcc: '#1C398E', des: 'Derin bilgelik, yaşam özü, içsel güç ve potansiyelin sessiz kaynağıdır.' },
    { number: 1, planet: 'Jüpiter', direction: 'Doğu', season: 'İlkbahar', color: 'Yeşil', member: 'Karaciğer', element: 'Ağaç', emotion: 'Öfke / Vizyon', sound: 'Xu', bgcc: '#2AA63E', des: 'Büyüme, hareket, vizyon ve yaşamın ileri doğru genişleme enerjisidir.' },
    { number: 2, planet: 'Mars', direction: 'Güney', season: 'Yaz', color: 'Kırmızı', member: 'Kalp', element: 'Ateş', emotion: 'Neşe / Canlılık', sound: 'Ha', bgcc: '#FB2C36', des: 'Bilinç, neşe, ruhsal parlaklık ve yaşam enerjisinin dışa yayılmasıdır.' },
    { number: 3, planet: 'Venüs', direction: 'Sonbahar', color: 'Beyaz', member: 'Akciğer', element: 'Metal', emotion: 'Keder / Arınma', sound: 'Si', bgcc: '#FFFFFF', des: 'Arınma, disiplin, bırakma ve özün saflaştırılması sürecidir.' },
    { number: 4, planet: 'Satürn', direction: 'Merkez', season: 'Geçiş', color: 'Sarı', member: 'Dalak / Mide', element: 'Toprak', emotion: 'Endişe / Merkezlenme', sound: 'Hu', bgcc: '#FFD230', des: 'Denge, merkezlenme, beslenme ve tüm enerjileri bir arada tutan stabilitedir.' }
  ];

  numerologyData.harmonyTypes = [
    { index: 0, title: 'Nötr', bgcolor: '#ffffff', color: '#000', des: 'Standart etkileşim' },
    { index: 1, title: 'Ayna / Kutuplu', bgcolor: '#efe4f3', color: '#4a154b', des: 'Ruhsal ayna, güçlü benzerlik veya zıt kutupların yüksek çekimi.' },
    { index: 2, title: 'Doğal Akış', bgcolor: '#e4f1e8', color: '#155724', des: 'Zahmetsiz uyum, kendiliğinden gelişen anlayış ve rahatlık.' },
    { index: 3, title: 'Tamamlayıcı', bgcolor: '#e4edf5', color: '#004085', des: 'Birbirinin eksik yönlerini dengeleyen ve güçlendiren birliktelik.' },
    { index: 4, title: 'Gelişimsel', bgcolor: '#f8edd8', color: '#856404', des: 'Karşılıklı öğrenme, olgunlaşma ve dönüştürücü ruhsal dersler.' },
    { index: 5, title: 'Zorlu / Mücadeleci', bgcolor: '#f5e1e1', color: '#721c24', des: 'Farklı dünya görüşleri, emek isteyen ve sabırla aşılacak sınavlar.' }
  ];

  numerologyData.findArcana = function (n) {
    return numerologyData.arcanas.find(a => a.number === Number(n)) || null;
  };

  numerologyData.findPlanet = function (n) {
    return numerologyData.planets.find(p => p.number === Number(n)) || null;
  };

  numerologyData.findSign = function (n) {
    return numerologyData.signs.find(s => s.number === Number(n)) || null;
  };

  numerologyData.findRune = function (n) {
    return numerologyData.runes.find(r => r.number === Number(n)) || null;
  };

  numerologyData.findKarmicDebt = function (id) {
    return numerologyData.karmicDebts.find(k => k.id === Number(id)) || null;
  };

  numerologyData.findChakra = function (c) {
    return numerologyData.chakraKarmas.find(k => k.chakra === Number(c)) || null;
  };

  numerologyData.getHarmony = function (idx) {
    return numerologyData.harmonyTypes.find(h => h.index === Number(idx)) || numerologyData.harmonyTypes[0];
  };

  global.NumerologyData = numerologyData;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
