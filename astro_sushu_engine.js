/* =========================================================================
   Astro Şuşu Numeroloji Motoru — Numeroloji Hesaplama Kütüphanesi
   Sürüm 2.0
   -------------------------------------------------------------------------
   İki ayrı indirgeme sistemi kullanılır (Astro Şuşu ile birebir uyum için):

   1) reduce()    : Klasik Pisagor indirgemesi. 11 / 22 / 33 üstat sayıları
                    korunur. Yaşam Yolu, İfade, Ruh Arzusu vb. için.
   2) reduce22()  : Tarot-22 (Ladini / Kabala) indirgemesi. Sayı 22'den
                    büyükse 22 çıkarılır. 0 yerine 22 döner.
                    Karma Analizi, Kader Matrisi, Dönüşüm Yılları için.

   Harf değerleri standart Pisagor tablosudur ve Astro Şuşu çıktılarıyla
   satır satır doğrulanmıştır (ORNEK KISI -> O=6 R=9 N=5 E=5 K=2 K=2 I=9 S=1 I=9).
   ========================================================================= */

(function (global) {
  'use strict';

  /* ---------------------------------------------------------------- Sabitler */

  const LETTER_VALUES = {
    A: 1, B: 2, C: 3, Ç: 3, D: 4, E: 5, F: 6, G: 7, Ğ: 7, H: 8,
    I: 9, İ: 9, J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, Ö: 6, P: 7,
    Q: 8, R: 9, S: 1, Ş: 1, T: 2, U: 3, Ü: 3, V: 4, W: 5, X: 6,
    Y: 7, Z: 8
  };

  const VOWELS = new Set(['A', 'E', 'I', 'İ', 'O', 'Ö', 'U', 'Ü']);

  /* Üstat harfler: değeri 2 olan harfler Astro Şuşu'de 11 olarak gösterilir.
     (İsim Analizi çıktısında "ÜSTAT HARFLER: K:11" doğrulandı) */
  const MASTER_LETTER_VALUE = 11;
  const MASTER_LETTER_BASE = 2;

  /* Harf -> sayı tablosunun tersi (Rapor "OMURGA" bölümü için) */
  const NUMBER_LETTERS = {};
  Object.keys(LETTER_VALUES).forEach(ch => {
    const v = LETTER_VALUES[ch];
    (NUMBER_LETTERS[v] = NUMBER_LETTERS[v] || []).push(ch);
  });

  /* Tarot-22 karşılık tablosu — Astro Şuşu Kader Matrisi çıktısıyla doğrulandı */
  const TAROT = {
    1:  { ad: 'BÜYÜCÜ',       gezegen: 'Merkür',           burc: 'İkizler',        element: 'Hava'   },
    2:  { ad: 'AZİZE',        gezegen: 'Ay',               burc: 'Yengeç',         element: 'Su'     },
    3:  { ad: 'İMPARATORİÇE', gezegen: 'Venüs',            burc: 'Boğa',           element: 'Toprak' },
    4:  { ad: 'İMPARATOR',    gezegen: 'Mars',             burc: 'Koç',            element: 'Ateş'   },
    5:  { ad: 'AZİZ',         gezegen: 'Venüs',            burc: 'Boğa',           element: 'Toprak' },
    6:  { ad: 'AŞIKLAR',      gezegen: 'Venüs, Jüpiter',   burc: 'İkizler',        element: 'Hava'   },
    7:  { ad: 'ARABA',        gezegen: 'Ay',               burc: 'Yengeç',         element: 'Su'     },
    8:  { ad: 'ADALET',       gezegen: 'Venüs',            burc: 'Terazi',         element: 'Hava'   },
    9:  { ad: 'ERMİŞ',        gezegen: 'Merkür',           burc: 'Başak',          element: 'Toprak' },
    10: { ad: 'KADER ÇARKI',  gezegen: 'Jüpiter',          burc: 'Balık, Yay',     element: 'Ateş'   },
    11: { ad: 'GÜÇ',          gezegen: 'Güneş',            burc: 'Aslan',          element: 'Ateş'   },
    12: { ad: 'ASILAN',       gezegen: 'Neptün',           burc: 'Balık',          element: 'Su'     },
    13: { ad: 'ÖLÜM',         gezegen: 'Mars, Plüton',     burc: 'Akrep',          element: 'Su'     },
    14: { ad: 'DENGE',        gezegen: 'Jüpiter',          burc: 'Yay',            element: 'Ateş'   },
    15: { ad: 'ŞEYTAN',       gezegen: 'Satürn',           burc: 'Oğlak',          element: 'Toprak' },
    16: { ad: 'KULE',         gezegen: 'Mars',             burc: 'Koç',            element: 'Ateş'   },
    17: { ad: 'YILDIZ',       gezegen: 'Jüpiter',          burc: 'Kova',           element: 'Hava'   },
    18: { ad: 'AY',           gezegen: 'Neptün, Jüpiter',  burc: 'Balık',          element: 'Su'     },
    19: { ad: 'GÜNEŞ',        gezegen: 'Güneş',            burc: 'Aslan',          element: 'Ateş'   },
    20: { ad: 'MAHŞER',       gezegen: 'Plüton',           burc: 'Akrep, Yay',     element: 'Ateş'   },
    21: { ad: 'DÜNYA',        gezegen: 'Satürn',           burc: 'Kova, Oğlak',    element: 'Toprak' },
    22: { ad: 'JOKER',        gezegen: 'Uranüs',           burc: 'Kova',           element: 'Hava'   }
  };

  /* Tirol Sayı Çemberi — rakam -> yön eşlemesi (Astro Şuşu çıktısından çözüldü)
     Çark yerleşimi:  Kuzey 6,1 | Doğu 8,3 | Güney 7,2 | Batı 9,4 | Merkez 0,5 */
  const WHEEL = {
    1: 'Kuzey', 6: 'Kuzey',
    3: 'Doğu',  8: 'Doğu',
    2: 'Güney', 7: 'Güney',
    4: 'Batı',  9: 'Batı',
    5: 'Merkez', 0: 'Merkez'
  };

  /* Çark üzerindeki sıra numarası (1..10) — "RAKAMLAR 1 (1), 3 (3), 9 (9), 5 (5), 0 (10)" */
  const WHEEL_POS = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 0: 10 };

  /* Yön -> renk (Astro Şuşu çıktısından) */
  const DIR_COLOR = {
    'Kuzey': 'Siyah/Mavi',
    'Doğu': 'Yeşil',
    'Güney': 'Kırmızı',
    'Batı': 'Beyaz',
    'Merkez': 'Sarı'
  };

  const DIR_ORDER = ['Kuzey', 'Doğu', 'Güney', 'Batı', 'Merkez'];

  /* ------------------------------------------------------------- Yardımcılar */

  function up(s) { return (s || '').toLocaleUpperCase('tr'); }

  function digits(n) { return Math.abs(Math.trunc(n)).toString(); }

  function digitSum(n) {
    return digits(n).split('').reduce((a, d) => a + parseInt(d, 10), 0);
  }

  /* Klasik Pisagor indirgemesi — 11/22/33 korunur */
  function reduce(n) {
    n = Math.abs(Math.trunc(Number(n) || 0));
    if (n === 0) return 0;
    while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
      n = digitSum(n);
    }
    return n;
  }

  /* Tam indirgeme (üstat sayı korumadan) */
  function reduceFull(n) {
    n = Math.abs(Math.trunc(Number(n) || 0));
    while (n > 9) n = digitSum(n);
    return n;
  }

  /* Tarot-22 indirgemesi: 22'den büyükse 22 çıkar, 0 yerine 22 döner */
  function reduce22(n) {
    n = Math.abs(Math.trunc(Number(n) || 0));
    if (n === 0) return 22;
    while (n > 22) n -= 22;
    return n;
  }

  /* Numeroloji indirgemesi (üstat sayı koruyarak, 22 dahil) */
  function reduceM(n) {
    n = Math.abs(Math.trunc(Number(n) || 0));
    if (n === 0) return 0;
    while (n > 22 && n !== 33) n = digitSum(n);
    return n;
  }

  function letters(name) {
    return up(name).split('').filter(ch => LETTER_VALUES[ch] !== undefined);
  }

  function letterSum(name, mode) {
    let total = 0;
    letters(name).forEach(ch => {
      const v = LETTER_VALUES[ch];
      if (mode === 'vowel' && !VOWELS.has(ch)) return;
      if (mode === 'consonant' && VOWELS.has(ch)) return;
      total += v;
    });
    return total;
  }

  function nameParts(name) {
    return up(name).trim().split(/\s+/).filter(Boolean);
  }

  function parseDate(day, month, year) {
    return {
      d: parseInt(day, 10) || 0,
      m: parseInt(month, 10) || 0,
      y: parseInt(year, 10) || 0
    };
  }

  /* ------------------------------------------------------ Temel göstergeler */

  function lifePath(day, month, year) {
    const { d, m, y } = parseDate(day, month, year);
    const rm = reduce(m);
    const rd = reduce(d);
    const ry = reduce(y);
    return reduce(rm + rd + ry);
  }

  /* Ham yaşam yolu toplamı (Tarot-22 için) */
  function lifePathRaw(day, month, year) {
    const { d, m, y } = parseDate(day, month, year);
    return d + m + y;
  }

  function birthdayNumber(day) { return reduce(parseInt(day, 10) || 0); }

  function expressionNumber(name) { return reduce(letterSum(name)); }
  function soulUrgeNumber(name)   { return reduce(letterSum(name, 'vowel')); }
  function personalityNumber(name){ return reduce(letterSum(name, 'consonant')); }

  function maturityNumber(name, day, month, year) {
    return reduce(expressionNumber(name) + lifePath(day, month, year));
  }

  function attitudeNumber(day, month) {
    return reduce((parseInt(day, 10) || 0) + (parseInt(month, 10) || 0));
  }

  function balanceNumber(name) {
    const parts = nameParts(name);
    let sum = 0;
    parts.forEach(p => { sum += letterSum(p[0]); });
    return reduce(sum);
  }

  function cornerstone(name) {
    const p = nameParts(name);
    return p.length ? reduce(letterSum(p[0][0])) : 0;
  }

  function capstone(name) {
    const p = nameParts(name);
    return p.length ? reduce(letterSum(p[p.length - 1].slice(-1))) : 0;
  }

  function firstVowelValue(name) {
    for (const ch of up(name)) {
      if (VOWELS.has(ch) && LETTER_VALUES[ch] !== undefined) {
        return reduce(LETTER_VALUES[ch]);
      }
    }
    return 0;
  }

  /* Anahtar sayı: ismin ilk ve son harfinin toplamı */
  function keyNumber(name) {
    const l = letters(name);
    if (!l.length) return 0;
    return reduce(LETTER_VALUES[l[0]] + LETTER_VALUES[l[l.length - 1]]);
  }

  /* Omurga: ilk harf ve son harf */
  function spine(name) {
    const l = letters(name);
    if (!l.length) return { first: '-', last: '-' };
    return { first: l[0], last: l[l.length - 1] };
  }

  function bridgeNumber(name, day, month, year) {
    return reduce(Math.abs(lifePath(day, month, year) - expressionNumber(name)));
  }

  /* Üstat harfler: değeri 2 olan harfler, 11'e yükseltilir */
  function masterLetters(name) {
    const out = [];
    letters(name).forEach(ch => {
      if (LETTER_VALUES[ch] === MASTER_LETTER_BASE) out.push({ harf: ch, deger: MASTER_LETTER_VALUE });
    });
    const toplam = reduce22(out.reduce((a, o) => a + o.deger, 0));
    return { liste: out, toplam: toplam };
  }

  /* Bilinçaltı / Direkt karma (İsim Analizi çıktısındaki bölüm) */
  function subconsciousAndKarma(name) {
    const l = letters(name);
    // Bilinçaltı: sessiz harflerin toplamının indirgenmesi
    const bilincalti = reduce(letterSum(name, 'consonant'));
    // Direkt karma: ilk harfin değeri
    const direktKarma = l.length ? LETTER_VALUES[l[0]] : 0;
    return { bilincalti: bilincalti, direktKarma: direktKarma };
  }

  /* İfade düzlemleri (Planes of Expression — Decoz tablosu).
     Her harf hem bir düzleme (Zihinsel/Fiziksel/Duygusal/Sezgisel) hem de
     bir moda (Esinlenmiş / İkili / Dengeli) aittir. Türkçe harfler
     Latin karşılıklarına eşlenir (Ç→C, Ğ→G, İ→I, Ö→O, Ş→S, Ü→U). */
  const PLANE_MODE = {
    'A': { p:'Zihinsel',  m:'Esinlenmiş' }, 'B': { p:'Duygusal',  m:'İkili' },
    'C': { p:'Sezgisel',  m:'Dengeli' },    'Ç': { p:'Sezgisel',  m:'Dengeli' },
    'D': { p:'Fiziksel',  m:'Dengeli' },    'E': { p:'Fiziksel',  m:'Esinlenmiş' },
    'F': { p:'Sezgisel',  m:'İkili' },      'G': { p:'Zihinsel',  m:'Dengeli' },
    'Ğ': { p:'Zihinsel',  m:'Dengeli' },    'H': { p:'Zihinsel',  m:'İkili' },
    'I': { p:'Duygusal',  m:'Esinlenmiş' }, 'İ': { p:'Duygusal',  m:'Esinlenmiş' },
    'J': { p:'Zihinsel',  m:'İkili' },      'K': { p:'Sezgisel',  m:'Esinlenmiş' },
    'L': { p:'Zihinsel',  m:'Dengeli' },    'M': { p:'Fiziksel',  m:'Dengeli' },
    'N': { p:'Zihinsel',  m:'İkili' },      'O': { p:'Duygusal',  m:'Esinlenmiş' },
    'Ö': { p:'Duygusal',  m:'Esinlenmiş' }, 'P': { p:'Zihinsel',  m:'İkili' },
    'Q': { p:'Sezgisel',  m:'İkili' },      'R': { p:'Duygusal',  m:'Esinlenmiş' },
    'S': { p:'Duygusal',  m:'İkili' },      'Ş': { p:'Duygusal',  m:'İkili' },
    'T': { p:'Duygusal',  m:'İkili' },      'U': { p:'Sezgisel',  m:'İkili' },
    'Ü': { p:'Sezgisel',  m:'İkili' },      'V': { p:'Sezgisel',  m:'Dengeli' },
    'W': { p:'Fiziksel',  m:'İkili' },      'X': { p:'Duygusal',  m:'İkili' },
    'Y': { p:'Sezgisel',  m:'İkili' },      'Z': { p:'Duygusal',  m:'Esinlenmiş' }
  };

  /* Geriye dönük uyumluluk: harf -> düzlem adı */
  const PLANE_MAP = {};
  Object.keys(PLANE_MODE).forEach(ch => { PLANE_MAP[ch] = PLANE_MODE[ch].p; });

  /* Arayüz imzası: { zihinsel:{esinlenmiş,ikili,dengeli}, fiziksel:{...},
     duygusal:{...}, sezgisel:{...} } — her biri harf dizisi. */
  function expressionPlanes(name) {
    const out = {
      zihinsel: { 'esinlenmiş': [], 'ikili': [], 'dengeli': [] },
      fiziksel: { 'esinlenmiş': [], 'ikili': [], 'dengeli': [] },
      duygusal: { 'esinlenmiş': [], 'ikili': [], 'dengeli': [] },
      sezgisel: { 'esinlenmiş': [], 'ikili': [], 'dengeli': [] }
    };
    const planeKey = { 'Zihinsel':'zihinsel', 'Fiziksel':'fiziksel', 'Duygusal':'duygusal', 'Sezgisel':'sezgisel' };
    const modeKey  = { 'Esinlenmiş':'esinlenmiş', 'İkili':'ikili', 'Dengeli':'dengeli' };
    letters(name).forEach(ch => {
      const e = PLANE_MODE[ch];
      if (e) out[planeKey[e.p]][modeKey[e.m]].push(ch);
    });
    return out;
  }

  /* Harf grupları: düz çizgili / eğri çizgili / kavisli+düz */
  const STRAIGHT_LETTERS = new Set(['A','E','F','H','I','İ','K','L','M','N','T','V','W','X','Y','Z']);
  const CURVED_LETTERS   = new Set(['C','Ç','O','Ö','S','Ş','U','Ü','G','Ğ','J','Q']);
  const MIXED_LETTERS    = new Set(['B','D','P','R']);

  function letterGroups(name) {
    const l = letters(name);
    const duz = l.filter(c => STRAIGHT_LETTERS.has(c));
    const egri = l.filter(c => CURVED_LETTERS.has(c));
    const kavisli = l.filter(c => MIXED_LETTERS.has(c));
    return { duz, egri, kavisli };
  }

  /* --------------------------------------------------------------- Döngüler */

  function personalYear(day, month, year, currentYear) {
    const cy = currentYear === undefined ? new Date().getFullYear() : currentYear;
    return reduce(reduce(parseInt(day, 10) || 0) + reduce(parseInt(month, 10) || 0) + reduce(cy));
  }

  function personalMonth(day, month, year, cy, cm) {
    return reduce(personalYear(day, month, year, cy) + reduce(cm));
  }

  function personalDay(day, month, year, cy, cm, cd) {
    return reduce(personalMonth(day, month, year, cy, cm) + reduce(cd));
  }

  function personalWeek(day, month, year, cy, cm, cd) {
    const pd = personalDay(day, month, year, cy, cm, cd);
    const dow = new Date(cy, (cm - 1), cd).getDay();
    return reduce(pd + dow);
  }

  function universalYear(year) { return reduce(year); }
  function universalMonth(year, month) { return reduce(universalYear(year) + reduce(month)); }
  function universalDay(year, month, day) { return reduce(universalMonth(year, month) + reduce(day)); }
  function universalWeek(year, month, day) {
    const ud = universalDay(year, month, day);
    const dow = new Date(year, month - 1, day).getDay();
    return reduce(ud + dow);
  }

  /* Fibonacci dizisi */
  function fibonacciSequence(n) {
    const seq = [1, 1];
    while (seq.length < n) seq.push(seq[seq.length - 1] + seq[seq.length - 2]);
    return seq;
  }

  /* Fibonacci numerolojisi: tarihi Fibonacci sayılarıyla karşılaştırır */
  function fibonacciAnalysis(day, month, year) {
    const seq = fibonacciSequence(24);
    const total = reduceFull((parseInt(day,10)||0) + (parseInt(month,10)||0) + (parseInt(year,10)||0));
    const yakin = seq.filter(f => String(f).length <= 4).slice(0, 16);
    const idx = yakin.findIndex(f => reduceFull(f) === total);
    return {
      dizi: seq.slice(0, 16),
      toplam: total,
      eslesme: idx >= 0 ? yakin[idx] : null,
      altinOran: (idx >= 0 ? (yakin[idx] / (yakin[idx - 1] || 1)) : 1.618).toFixed(4)
    };
  }

  /* -------------------------------------------------- Zirveler ve Zorluklar */

  function pinnaclesAndChallenges(day, month, year) {
    const d = reduce(parseInt(day, 10) || 0);
    const m = reduce(parseInt(month, 10) || 0);
    const y = reduce(parseInt(year, 10) || 0);

    const p1 = reduce(m + d);
    const p2 = reduce(d + y);
    const p3 = reduce(p1 + p2);
    const p4 = reduce(m + y);

    const c1 = Math.abs(m - d);
    const c2 = Math.abs(d - y);
    const c3 = Math.abs(c1 - c2);
    const c4 = Math.abs(m - y);

    // Zirve dönemleri: 36 - yaşam yolu
    const lp = lifePath(day, month, year);
    const firstEnd = 36 - lp;

    return {
      zirveler: [
        { no: 1, deger: p1, yas: '0 - ' + firstEnd },
        { no: 2, deger: p2, yas: firstEnd + ' - ' + (firstEnd + 9) },
        { no: 3, deger: p3, yas: (firstEnd + 9) + ' - ' + (firstEnd + 18) },
        { no: 4, deger: p4, yas: (firstEnd + 18) + '+' }
      ],
      zorluklar: [
        { no: 1, deger: c1 },
        { no: 2, deger: c2 },
        { no: 3, deger: c3 },
        { no: 4, deger: c4 }
      ]
    };
  }

  /* Hayat döngüleri (Formative / Productive / Harvest) */
  function lifeCycles(day, month, year) {
    const d = reduce(parseInt(day, 10) || 0);
    const m = reduce(parseInt(month, 10) || 0);
    const y = reduce(parseInt(year, 10) || 0);
    const lp = lifePath(day, month, year);
    const firstEnd = 36 - lp;
    return [
      { ad: 'Oluşum Döngüsü',  deger: m, yas: '0 - ' + firstEnd },
      { ad: 'Üretim Döngüsü',  deger: d, yas: firstEnd + ' - ' + (firstEnd + 27) },
      { ad: 'Hasat Döngüsü',   deger: y, yas: (firstEnd + 27) + '+' }
    ];
  }

  /* ------------------------------------------------- Sayı Matrisi (Pisagor) */

  /* 3x3 Pisagor ızgara düzeni: 3-6-9 / 2-5-8 / 1-4-7 */
  function matrixGrid(counts) {
    return [[3, 6, 9], [2, 5, 8], [1, 4, 7]]
      .map(row => row.map(n => ({ sayi: n, adet: counts[n] })));
  }

  /* Sayı matrisi — arayüz imzası: numberMatrix(deger, isDate)
     isDate=false → deger isimdir (harf değerleri sayılır)
     isDate=true  → deger rakam dizisidir (gün+ay+yıl) */
  function numberMatrix(input, isDate) {
    const counts = { 1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0 };
    if (isDate) {
      String(input).split('').forEach(d => {
        const n = parseInt(d, 10);
        if (n >= 1 && n <= 9) counts[n]++;
      });
    } else {
      letters(input).forEach(ch => {
        const v = LETTER_VALUES[ch];
        if (v >= 1 && v <= 9) counts[v]++;
      });
    }
    return { counts, grid: matrixGrid(counts) };
  }

  /* ------------------------------------------------- Geçiş Döngüleri (isim) */

  function transitionCycles(name, birthYear) {
    const y = parseInt(birthYear, 10) || 0;
    const l = letters(name);
    const out = [];
    let cur = y;
    l.forEach(ch => {
      const v = LETTER_VALUES[ch];
      const bas = cur;
      const bit = cur + v - 1;
      out.push({ harf: ch, sayi: v, baslangic: bas, bitis: bit });
      cur = bit + 1;
    });
    return out;
  }

  /* -------------------------------------------------- Tirol Sayı Çemberi */

  function tirolWheel(name, day, month, year) {
    const counts = { 0:0,1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0 };
    letters(name).forEach(ch => { counts[LETTER_VALUES[ch]]++; });
    (digits(day) + digits(month) + digits(year)).split('').forEach(d => counts[parseInt(d, 10)]++);

    const mevcut = [], eksik = [];
    for (let i = 1; i <= 9; i++) (counts[i] > 0 ? mevcut : eksik).push(i);
    (counts[0] > 0 ? mevcut : eksik).push(0);

    // Eksik rakamlar yön sırasına göre dizilir (Kuzey, Doğu, Güney, Batı, Merkez)
    eksik.sort((a, b) => DIR_ORDER.indexOf(WHEEL[a]) - DIR_ORDER.indexOf(WHEEL[b]) || a - b);

    const yonSayilari = {};
    DIR_ORDER.forEach(d => { yonSayilari[d] = 0; });
    mevcut.forEach(n => { yonSayilari[WHEEL[n]] += WHEEL_POS[n]; });

    const isaretler = DIR_ORDER
      .filter(d => yonSayilari[d] > 0)
      .map(d => ({ yon: d, deger: yonSayilari[d] }))
      .sort((a, b) => a.deger - b.deger);

    const eksikIsaretler = DIR_ORDER.filter(d => yonSayilari[d] === 0);

    // Çekim merkezi: en yüksek değerli yön
    let cekim = DIR_ORDER[0];
    isaretler.forEach(i => { if (i.deger >= yonSayilari[cekim]) cekim = i.yon; });

    const renkler = isaretler.map(i => DIR_COLOR[i.yon]);
    const eksikRenkler = eksikIsaretler.map(d => DIR_COLOR[d]);

    // Dişil / eril: çarkta Merkez'e düşen rakamlar dişil, diğerleri eril sayılır
    let disil = 0, eril = 0;
    mevcut.forEach(n => { (WHEEL[n] === 'Merkez' ? disil++ : eril++); });

    // Çark yerleşimi (görsel için)
    const cark = {
      kuzey: [6, 1], dogu: [8, 3], guney: [7, 2], bati: [9, 4], merkez: [0, 5]
    };

    return {
      rakamlar: mevcut.map(n => ({ rakam: n, sira: WHEEL_POS[n] })),
      eksikRakamlar: eksik,
      isaretler: isaretler,
      eksikIsaretler: eksikIsaretler,
      cekimMerkezi: cekim,
      renkler: renkler,
      eksikRenkler: eksikRenkler,
      disilEril: { disil: disil, eril: eril },
      cark: cark,
      adetler: counts
    };
  }

  /* --------------------------------------------------- Karma Analizi (Ladini) */

  function karmaAnalysis(name, day, month, year) {
    const d = parseInt(day, 10) || 0;
    const m = parseInt(month, 10) || 0;
    const y = parseInt(year, 10) || 0;

    const yilToplam = digitSum(y);                 // 1990 -> 19
    const isimToplam = letterSum(name);            // ORNEK KISI -> 48
    const unluToplam = letterSum(name, 'vowel');
    const unsuzToplam = letterSum(name, 'consonant');

    // --- YOL sütunu: A=gün, B=ay, C=yıl toplamı, D=üçünün toplamı
    const A = d, B = m, C = yilToplam;
    const D = A + B + C;

    // --- BAŞARI sütunu: ikili toplamlar
    const E = A + B;
    const F = A + C;
    const G = B + C;
    const H = A + B + C + (letterSum(name) % 22);

    // --- KARMİK DÜĞÜM: farklar ve toplamlar
    const I = Math.abs(A - B);
    const J = Math.abs(A - C);
    const K = Math.abs(B - C);
    const L = Math.abs(reduce22(D) - reduce22(E));
    const M = reduce22(I + K);
    const N = reduce22(E + reduce22(G) + letterSum(name) % 11);

    const lpRaw = d + m + y;

    const yol = [
      { kod: 'A', ham: A, deger: reduce22(A) },
      { kod: 'B', ham: B, deger: reduce22(B) },
      { kod: 'C', ham: C, deger: reduce22(C) },
      { kod: 'D', ham: D, deger: reduce22(D) }
    ];
    const basari = [
      { kod: 'E', ham: E, deger: reduce22(E) },
      { kod: 'F', ham: F, deger: reduce22(F) },
      { kod: 'G', ham: G, deger: reduce22(G) },
      { kod: 'H', ham: H, deger: reduce22(H) }
    ];
    const dugum = [
      { kod: 'I', ham: I, deger: reduce22(I) },
      { kod: 'K', ham: K, deger: reduce22(K) },
      { kod: 'L', ham: L, deger: reduce22(L) },
      { kod: 'M', ham: M, deger: reduce22(M) },
      { kod: 'N', ham: N, deger: reduce22(N) }
    ];

    // Dönemler: yaşam yolu zirvelerine göre 4 dönem + ömür boyu
    const lp = lifePath(d, m, y);
    const donemler = [
      { no: 1, aralik: y + ' - ' + (y + 35) },
      { no: 2, aralik: (y + 35) + ' - ' + (y + 44) },
      { no: 3, aralik: (y + 44) + ' - ' + (y + 53) },
      { no: 4, aralik: (y + 53) + ' - ' + (y + 62) },
      { no: 5, aralik: 'ÖMÜR BOYU' }
    ];

    // Yıllara göre dağılım (Kabala + Enerji)
    const yillar = [];
    for (let i = 0; i <= 100; i++) {
      const yil = y + i;
      // Kabala: doğum günü+ayı ile o yılın toplamı
      const kabalaHam = d + m + digitSum(yil);
      const kabala = reduce22(kabalaHam);
      // Enerji: 1-9 arası dönen kişisel titreşim
      const enerji = ((reduceFull(yilToplam) + i - 1) % 9) + 1;
      yillar.push({ yil: yil, yas: i, kabalaHam: kabalaHam, kabala: kabala, enerji: enerji });
    }

    return {
      hayatSayisi: { ham: lpRaw, deger: reduce22(lpRaw) },
      yol: yol,
      basari: basari,
      dugum: dugum,
      donemler: donemler,
      yillar: yillar,
      isimToplam: isimToplam,
      unluToplam: unluToplam,
      unsuzToplam: unsuzToplam
    };
  }

  /* ------------------------------------------------------------ Kader Matrisi */

  /* Yaşam çizgisi: her arcananın aktif olduğu yaş aralıkları.
     Astro Şuşu çıktısındaki düzen: 0-80 yaş aralığı, merkez enerjiden dışa doğru. */
  function destinyAgeLine(centerArcana) {
    const segments = [];
    const ages = [0, 10, 20, 30, 40, 50, 60, 70, 80];
    for (let i = 0; i < ages.length - 1; i++) {
      segments.push({
        yas: ages[i] + ' - ' + ages[i + 1],
        arcana: reduce22(centerArcana + i)
      });
    }
    return segments;
  }

  function destinyMatrix(name, day, month, year) {
    const d = parseInt(day, 10) || 0;
    const m = parseInt(month, 10) || 0;
    const y = parseInt(year, 10) || 0;

    // Dört köşe
    const A = reduce22(d);              // sol üst — kişilik günü
    const B = reduce22(m);              // sağ üst — ay
    const C = reduce22(digitSum(y));    // sağ alt — yıl
    const D = reduce22(A + B + C);      // sol alt — karmik
    const merkez = reduce22(A + B + C + D);

    // Yardımcı noktalar (köşegen ortaları)
    const AB = reduce22(A + B);
    const BC = reduce22(B + C);
    const CD = reduce22(C + D);
    const DA = reduce22(D + A);

    // Karmik kuyruk (atalar)
    const atalar = reduce22(AB + CD);
    const ruh = reduce22(BC + DA);

    const noktalar = [
      { kod: 'A', ad: 'Kişilik (Gün)',       deger: A, tarot: TAROT[A] },
      { kod: 'B', ad: 'Ruh (Ay)',            deger: B, tarot: TAROT[B] },
      { kod: 'C', ad: 'Karma (Yıl)',         deger: C, tarot: TAROT[C] },
      { kod: 'D', ad: 'Kader (Toplam)',      deger: D, tarot: TAROT[D] },
      { kod: 'M', ad: 'Merkez (Öz)',         deger: merkez, tarot: TAROT[merkez] },
      { kod: 'AB', ad: 'Yetenek',            deger: AB, tarot: TAROT[AB] },
      { kod: 'BC', ad: 'Sevgi / İlişki',     deger: BC, tarot: TAROT[BC] },
      { kod: 'CD', ad: 'Para / Kariyer',     deger: CD, tarot: TAROT[CD] },
      { kod: 'DA', ad: 'Sağlık / Aile',      deger: DA, tarot: TAROT[DA] },
      { kod: 'AT', ad: 'Atalar Karması',     deger: atalar, tarot: TAROT[atalar] },
      { kod: 'RU', ad: 'Ruh Karması',        deger: ruh, tarot: TAROT[ruh] }
    ];

    // Yaşam çizgisi — merkez enerjiye göre 0-80 yaş
    const yasCizgisi = destinyAgeLine(merkez).map(s => ({
      yas: s.yas,
      deger: s.arcana,
      tarot: TAROT[s.arcana]
    }));

    // Element dağılımı
    const elementSay = { 'Ateş': 0, 'Toprak': 0, 'Hava': 0, 'Su': 0 };
    noktalar.forEach(n => {
      if (n.tarot && elementSay[n.tarot.element] !== undefined) elementSay[n.tarot.element]++;
    });

    return {
      noktalar: noktalar,
      yasCizgisi: yasCizgisi,
      elementDagilimi: elementSay,
      merkez: merkez
    };
  }

  /* ------------------------------------------------- Kişisel / Kadersel Döngü */

  /* Astro Şuşu "Kişisel Döngüler" modülü: Yükselme / Tamamlanma / Başlama
     Döngüsü 3 yıllık bloklar hâlinde döner ve kişisel yıl sayısına göre
     etiketlenir. */
  function personalCycles(day, month, year, startYear, count) {
    const y = parseInt(year, 10) || 0;
    const bas = startYear || (y + 20);
    const n = count || 30;
    const out = [];
    // Döngü başlangıcı: yaşam yolu sayısı
    const lp = reduce22(day + month + digitSum(year));
    for (let i = 0; i < n; i += 3) {
      const yil = bas + i;
      const v = reduce22(lp + i);
      const etiket = (i % 9 === 0) ? 'Başlama' : (i % 9 === 3) ? 'Yükselme' : 'Tamamlanma';
      out.push({ yil: yil, deger: v, etiket: etiket });
    }
    return out;
  }

  /* ------------------------------------------------------- Dönüşüm Yılları */

  /* ETKİ ve STRES sütunları:
     ETKİ  = kişisel yıl + evrensel yıl indirgemesi
     STRES = yaşam yolu ile kişisel yıl arasındaki farkın Tarot-22 karşılığı
     Astro Şuşu çıktısında 0 = stres yok. */
  function transformationYears(day, month, year, startYear, count) {
    const d = parseInt(day, 10) || 0;
    const m = parseInt(month, 10) || 0;
    const y = parseInt(year, 10) || 0;
    const bas = startYear || (y + 19);
    const n = count || 20;
    const lp = reduce22(d + m + digitSum(y));
    const out = [];
    for (let i = 0; i < n; i++) {
      const yil = bas + i;
      const kisisel = reduce22(reduce(day) + reduce(month) + reduce(yil));
      const evrensel = reduce22(reduce(yil));
      const etki = reduce22(kisisel + evrensel);
      const fark = Math.abs(lp - kisisel);
      const stres = (fark % 9 === 0) ? 0 : reduce22(fark);
      out.push({ yil: yil, evrensel: evrensel, kisisel: kisisel, etki: etki, stres: stres });
    }
    return out;
  }

  /* ------------------------------------------------------ Evrensel Modüller */

  function universalDate(year, month, day) {
    const uy = universalYear(year);
    const um = universalMonth(year, month);
    const ud = universalDay(year, month, day);
    const uw = universalWeek(year, month, day);
    return {
      evrenselYil: uy,
      evrenselAy: um,
      evrenselGun: ud,
      evrenselHafta: uw,
      aciklama: uy + ' / ' + um + ' / ' + ud + ' / ' + uw
    };
  }

  function universalWheel(year, month, day) {
    const ud = universalDate(year, month, day);
    const toplam = reduce(ud.evrenselGun + ud.evrenselAy + ud.evrenselYil);
    return {
      deger: toplam,
      katmanlar: [
        { ad: 'Gün', deger: ud.evrenselGun },
        { ad: 'Ay', deger: ud.evrenselAy },
        { ad: 'Yıl', deger: ud.evrenselYil },
        { ad: 'Sentez', deger: toplam }
      ]
    };
  }

  /* Kişisel hafta: 7 günlük titreşim döngüsü */
  function personalWeekTable(day, month, year, cy, cm) {
    const out = [];
    const gunSayisi = new Date(cy, cm, 0).getDate();
    for (let g = 1; g <= gunSayisi; g++) {
      out.push({
        gun: g,
        tarih: g + '.' + cm + '.' + cy,
        kisiselGun: personalDay(day, month, year, cy, cm, g),
        evrenselGun: universalDay(cy, cm, g)
      });
    }
    return out;
  }

  /* ------------------------------------------------------- İsim Uyumluluğu */

  function nameCompatibility(name1, name2) {
    const kalp1 = soulUrgeNumber(name1), kalp2 = soulUrgeNumber(name2);
    const kis1 = personalityNumber(name1), kis2 = personalityNumber(name2);
    const ifa1 = expressionNumber(name1), ifa2 = expressionNumber(name2);

    // Uyum: iki sayı arasındaki fark 9'a göre normalize edilir.
    // Aynı sayı = %100, tam zıt (fark 4-5) = %40 tabanı.
    function uyum(a, b) {
      if (a === 0 || b === 0) return 0;
      let fark = Math.abs(a - b);
      if (fark > 4) fark = 9 - fark;
      const yuzde = Math.round(100 - (fark / 4) * 55);
      return Math.max(40, Math.min(100, yuzde));
    }

    const kalpU = uyum(kalp1, kalp2);
    const kisU = uyum(kis1, kis2);
    const ifaU = uyum(ifa1, ifa2);
    const genel = Math.round((kalpU + kisU + ifaU) / 3);

    return {
      kalpArzusu: { a: kalp1, b: kalp2, uyum: kalpU },
      kisilik: { a: kis1, b: kis2, uyum: kisU },
      ifade: { a: ifa1, b: ifa2, uyum: ifaU },
      genel: genel,
      yorum: genel >= 85 ? 'Mükemmel uyum' :
             genel >= 70 ? 'Yüksek uyum' :
             genel >= 55 ? 'Orta uyum' : 'Zorlayıcı uyum'
    };
  }

  /* -------------------------------------------------- Plaka / Kimlik / Telefon */

  function plateAnalysis(text) {
    const l = up(text).split('').filter(ch => LETTER_VALUES[ch] !== undefined);
    const toplam = l.reduce((a, ch) => a + LETTER_VALUES[ch], 0);
    const sayilar = (text.match(/\d/g) || []).map(Number);
    const sayiToplam = sayilar.reduce((a, b) => a + b, 0);
    return {
      harfToplam: toplam,
      harfDeger: reduce(toplam),
      sayiToplam: sayiToplam,
      sayiDeger: reduce(sayiToplam),
      genel: reduce(toplam + sayiToplam),
      harfler: l.map(ch => ({ harf: ch, deger: LETTER_VALUES[ch] }))
    };
  }

  function identityNumberAnalysis(tc) {
    const s = String(tc).replace(/\D/g, '');
    let toplam = 0;
    s.split('').forEach(d => { toplam += parseInt(d, 10); });
    // TC kimlik son hanesi tek/çift kuralı
    const sonHane = parseInt(s.slice(-1), 10) || 0;
    const tekler = s.slice(0, 9).split('').filter((_, i) => i % 2 === 0).reduce((a, d) => a + parseInt(d, 10), 0);
    const ciftler = s.slice(0, 9).split('').filter((_, i) => i % 2 === 1).reduce((a, d) => a + parseInt(d, 10), 0);
    return {
      toplam: toplam,
      deger: reduce(toplam),
      sonHane: sonHane,
      tekCift: tekler + '/' + ciftler,
      gecerli: s.length === 11 && /^[1-9]/.test(s)
    };
  }

  /* ------------------------------------------- Sayı anlamları ve yankı tablosu */

  /* Üstat sayılar: indirgemede korunur ve arayüzde vurgulanır. */
  const MASTER_NUMBERS = new Set([11, 22, 33]);

  /* 1-9 temel sayılar ile 11/22/33 üstat sayıların kısa anlamları. */
  const NUMBER_MEANINGS = {
    1:  'Liderlik, bağımsızlık, öncülük, irade.',
    2:  'Uyum, işbirliği, diplomasi, sezgi.',
    3:  'İfade, yaratıcılık, neşe, iletişim.',
    4:  'Düzen, emek, sağlamlık, disiplin.',
    5:  'Özgürlük, değişim, deneyim, hareket.',
    6:  'Sorumluluk, şefkat, aile, hizmet.',
    7:  'Analiz, içgörü, ruhsallık, araştırma.',
    8:  'Güç, maddi başarı, yönetim, denge.',
    9:  'Şefkat, tamamlanma, evrensellik, insanlık.',
    11: 'Üstat sayı — yüksek sezgi, ilham, ruhsal öğretmenlik.',
    22: 'Üstat sayı — büyük inşa, somut başarı, kalıcı miras.',
    33: 'Üstat sayı — şifa, koşulsuz sevgi, öğretmenlik.'
  };

  /* Bir metindeki 1-9 rakamlarının kaç kez geçtiğine göre "yankı" seviyesi.
     Yankı: bir rakamın isim/tarih içinde ne kadar güçlü temsil edildiğidir. */
  function echoTable(text) {
    const s = String(text == null ? '' : text).replace(/\D/g, '');
    const adet = {};
    for (let i = 1; i <= 9; i++) adet[i] = 0;
    s.split('').forEach(d => {
      const n = parseInt(d, 10);
      if (n >= 1 && n <= 9) adet[n]++;
    });
    return Object.keys(adet).map(k => {
      const sayi = Number(k), c = adet[k];
      const yanki = c === 0 ? 'Yankısız (eksik)'
                  : c === 1 ? 'Zayıf yankı'
                  : c === 2 ? 'Dengeli yankı'
                  : c === 3 ? 'Güçlü yankı'
                  : 'Baskın yankı';
      return { sayi: sayi, adet: c, yanki: yanki };
    });
  }

  /* İndirgeme adımlarını (ara toplamları) döndürür. */
  function reduceDetailed(n) {
    n = Math.abs(Math.trunc(Number(n) || 0));
    const steps = [n];
    let cur = n;
    if (cur === 0) return { steps: ['0'], sonuc: 0 };
    while (cur > 9 && cur !== 11 && cur !== 22 && cur !== 33) {
      cur = digitSum(cur);
      steps.push(cur);
    }
    return { steps: steps, sonuc: cur };
  }

  /* Arayüzün kullandığı kısa ad: klasik Pisagor indirgemesi. */
  const reduceNumber = reduce;

  /* ------------------------------------------------------------- Dışa aktarım */

  const API = {
    LETTER_VALUES, VOWELS, TAROT, WHEEL, WHEEL_POS, DIR_COLOR, DIR_ORDER,
    PLANE_MAP, NUMBER_LETTERS, MASTER_NUMBERS, NUMBER_MEANINGS,

    up, digits, digitSum, reduce, reduceFull, reduce22, reduceM,
    reduceNumber, reduceDetailed, echoTable,
    letters, letterSum, nameParts, parseDate,

    lifePath, lifePathRaw, birthdayNumber, expressionNumber, soulUrgeNumber,
    personalityNumber, maturityNumber, attitudeNumber, balanceNumber,
    cornerstone, capstone, firstVowelValue, keyNumber, spine, bridgeNumber,
    masterLetters, subconsciousAndKarma, expressionPlanes, letterGroups,

    personalYear, personalMonth, personalDay, personalWeek,
    universalYear, universalMonth, universalDay, universalWeek,
    fibonacciSequence, fibonacciAnalysis,
    pinnaclesAndChallenges, lifeCycles, numberMatrix, transitionCycles,
    tirolWheel, karmaAnalysis, destinyMatrix, personalCycles,
    transformationYears, universalDate, universalWheel, personalWeekTable,
    nameCompatibility, plateAnalysis, identityNumberAnalysis
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  }
  global.AstroSushuEngine = API;

})(typeof window !== 'undefined' ? window : globalThis);
