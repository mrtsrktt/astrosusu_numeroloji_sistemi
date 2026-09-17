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

  /* Dikey Sütunlu Numerolojik Omurga Tablosu (Bütünsel / İsim / Doğum Tarihi)
     Referans görsel ve çıktı yapısına birebir uygun 6 sütunlu dikey mimari:
     [İşaretçi (Yeşil Nokta)] | R (Rakam Frekansı) | [Sayı] | H (Harfler) | E (Evrensel Harfler) | A (Pin Kodu Hane Açılımı) */
  function omurgaTable(name, day, month, year) {
    name = name || '';
    const d = parseInt(day, 10) || 0;
    const m = parseInt(month, 10) || 0;
    const y = parseInt(year, 10) || 0;
    const hasDate = (d > 0 && m > 0 && y > 0);
    const hasName = Boolean(name && name.trim());

    // 1. Üst Başlık Şeridi (BAŞLANGIÇ, BİTİŞ, İLK SESLİ, ANAHTAR, DENGE)
    const parts = nameParts(name);
    const ltrs = letters(name);

    const csChar = parts.length ? parts[0][0] : '-';
    const csVal = parts.length ? (LETTER_VALUES[csChar] || 0) : 0;

    const cpChar = parts.length ? parts[parts.length - 1].slice(-1) : '-';
    const cpVal = parts.length ? (LETTER_VALUES[cpChar] || 0) : 0;

    let fvChar = '-';
    let fvVal = 0;
    for (const ch of up(name)) {
      if (VOWELS.has(ch) && LETTER_VALUES[ch] !== undefined) {
        fvChar = ch;
        fvVal = LETTER_VALUES[ch];
        break;
      }
    }

    const keyVal = ltrs.length ? reduce(LETTER_VALUES[ltrs[0]] + LETTER_VALUES[ltrs[ltrs.length - 1]]) : 0;

    let initials = '';
    parts.forEach(p => { if (p) initials += p[0]; });
    const balVal = balanceNumber(name);

    const top = {
      cornerstone: { char: csChar, val: csVal, text: csChar !== '-' ? `${csChar}=${csVal}` : '-' },
      capstone: { char: cpChar, val: cpVal, text: cpChar !== '-' ? `${cpChar}=${cpVal}` : '-' },
      firstVowel: { char: fvChar, val: fvVal, text: fvChar !== '-' ? `${fvChar}=${fvVal}` : '-' },
      key: { val: keyVal, text: String(keyVal || '-') },
      balance: { initials: initials, val: balVal, text: initials ? `${initials}=${balVal}` : '-' }
    };

    // 2. Harflerin 1-9 sayılarına göre dağılımı (H Sütunu)
    const nameLetters = {};
    for (let i = 1; i <= 9; i++) nameLetters[i] = [];
    if (hasName) {
      ltrs.forEach(ch => {
        const v = LETTER_VALUES[ch];
        if (v >= 1 && v <= 9) nameLetters[v].push(ch);
      });
    }

    // 3. Pin Kodu ve Göstergeler (A ve R Sütunları)
    const pc = hasDate ? pinCode(d, m, y) : null;
    const lp = hasDate ? lifePath(d, m, y) : null;
    const bn = hasDate ? birthdayNumber(d) : null;
    const at = hasDate ? attitudeNumber(d, m) : null;
    const ex = hasName ? expressionNumber(name) : null;

    // Evrensel Pisagor Harfleri (E Sütunu)
    const E_CHARS = {
      9: 'İÍÎ',
      8: 'HZQ',
      7: 'GĞP',
      6: 'FOÖXÓÔØŒ',
      5: 'WŇƏÑÉÈÊË',
      4: 'DV',
      3: 'ÇLUÜŬÚÛ',
      2: 'B',
      1: 'JSŞÄßÀÁÂÃÅÆ'
    };

    // Satır Pastel Arka Plan Renkleri (Görsel referans ile birebir)
    const ROW_BG = {
      9: '#fef9c3', // Krem / Sarı
      8: '#fee2e2', // Açık Pembe
      7: '#dcfce7', // Açık Yeşil
      6: '#fee2e2', // Açık Pembe
      5: '#fef9c3', // Krem / Sarı
      4: '#fef9c3', // Krem / Sarı
      3: '#dcfce7', // Açık Yeşil
      2: '#dcfce7', // Açık Yeşil
      1: '#fef9c3'  // Krem / Sarı
    };

    // A Sütunu Hane Kutucuk Arka Plan Renkleri (Pin Kodu Hane Enerjisi)
    const A_BOX_BG = {
      9: '#fef3c7',
      8: '#fef3c7',
      7: '#fee2e2',
      6: '#eff6ff',
      5: '#ffe4e6',
      4: '#ffe4e6',
      3: '#eff6ff',
      2: '#fef3c7',
      1: '#ffffff'
    };

    // R Frekans Sayımı (Pin Kodu + Tarih Sentezi)
    const rCounts = {};
    for (let i = 1; i <= 9; i++) rCounts[i] = 0;
    if (pc) {
      pc.digits.forEach(val => { if (rCounts[val] !== undefined) rCounts[val]++; });
      [pc.fatherLine, pc.motherLine, pc.selfLine, pc.destinyLine].forEach(val => {
        if (val && rCounts[val] !== undefined) rCounts[val]++;
      });
      [bn, lp].forEach(val => {
        if (val && rCounts[val] !== undefined) rCounts[val]++;
      });
    }

    const rows = [];
    for (let num = 9; num >= 1; num--) {
      const arr = nameLetters[num] || [];
      const hDisplay = arr.length > 0 ? `${arr.join('')} (${arr.length})` : '-';

      let aEcho = null;
      let aNum = null;
      let aDisplay = '-';
      if (pc) {
        const cell = pc['Cell' + num];
        if (cell) {
          aNum = cell.Number;
          if (cell.Echo > 9 && cell.Echo !== cell.Number) {
            aEcho = cell.Echo;
            aDisplay = `(${cell.Echo}) ${cell.Number}`;
          } else {
            aDisplay = String(cell.Number);
          }
        }
      }

      const rDisplay = rCounts[num] > 0 ? `${rCounts[num]}x` : '-';
      // Aktif Sayı Vurgusu (Mor Kutu): Yaşam Yolu veya İfade Sayısı bu rakama denk geliyorsa
      const isHighlight = (lp === num || (hasName && ex === num));
      // Yeşil Nokta İşaretçisi: Referans görseldeki 2. satır / çekirdek karmik ders göstergesi
      const hasIndicator = (num === 2);

      rows.push({
        num: num,
        hasIndicator: hasIndicator,
        r: rDisplay,
        rCount: rCounts[num] || 0,
        isHighlight: isHighlight,
        h: hDisplay,
        hLetters: arr.join(''),
        hCount: arr.length,
        e: E_CHARS[num],
        aNum: aNum,
        aEcho: aEcho,
        aDisplay: aDisplay,
        aBoxBg: A_BOX_BG[num],
        bgColor: ROW_BG[num]
      });
    }

    return { top, rows, hasDate, hasName };
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

  function destinyMatrix(a1, a2, a3, a4) {
    let d, m, y, nm;
    if (typeof a1 === 'number' || (!isNaN(Number(a1)) && !isNaN(Number(a2)))) {
      d = parseInt(a1, 10) || 1;
      m = parseInt(a2, 10) || 1;
      y = parseInt(a3, 10) || 1990;
      nm = a4 || '';
    } else {
      nm = a1 || '';
      d = parseInt(a2, 10) || 1;
      m = parseInt(a3, 10) || 1;
      y = parseInt(a4, 10) || 1990;
    }

    // Dört ana köşe (Kişilik karesi)
    const A = reduce22(d);              // Kişilik günü
    const B = reduce22(m);              // Ruh ayı
    const C = reduce22(digitSum(y));    // Karma yılı
    const D = reduce22(A + B + C);      // Karmik kök / alt
    const E = reduce22(A + B + C + D);  // Merkez konfor

    // Soy karesi köşeleri
    const F = reduce22(A + B);          // Erkek soyu üst
    const G = reduce22(B + C);          // Kadın soyu üst
    const H = reduce22(C + D);          // Kadın soyu alt
    const I = reduce22(D + A);          // Erkek soyu alt

    // Ara noktalar (kadersel araçlar)
    const A1 = reduce22(A + E);
    const A2 = reduce22(A + A1);
    const B1 = reduce22(B + E);
    const B2 = reduce22(B + B1);
    const C1 = reduce22(C + E);
    const C2 = reduce22(C + C1);
    const D1 = reduce22(D + E);
    const D2 = reduce22(D + D1);

    // Kadersel Yönelimler (Destinations)
    const personal = reduce22(A + C + B + D);
    const social = reduce22(F + H + G + I);
    const spiritual = reduce22(personal + social);
    const planetary = reduce22(social + spiritual);

    // 7 Çakra Enerji Dağılımı
    const chakras = [
      { chakra: 1, name: 'Muladhara (Kök)', fiziksel: A, enerji: D, duygusal: reduce22(A + D) },
      { chakra: 2, name: 'Svadhisthana (Sakral)', fiziksel: A1, enerji: D1, duygusal: reduce22(A1 + D1) },
      { chakra: 3, name: 'Manipura (Solar)', fiziksel: E, enerji: E, duygusal: E },
      { chakra: 4, name: 'Anahata (Kalp)', fiziksel: B1, enerji: C1, duygusal: reduce22(B1 + C1) },
      { chakra: 5, name: 'Vishuddha (Boğaz)', fiziksel: B, enerji: C, duygusal: reduce22(B + C) },
      { chakra: 6, name: 'Ajna (Üçüncü Göz)', fiziksel: F, enerji: H, duygusal: reduce22(F + H) },
      { chakra: 7, name: 'Sahasrara (Taç)', fiziksel: G, enerji: I, duygusal: reduce22(G + I) }
    ];

    const noktalar = [
      { kod: 'A', ad: 'Kişilik (Gün)',       deger: A, tarot: TAROT[A] },
      { kod: 'B', ad: 'Ruh (Ay)',            deger: B, tarot: TAROT[B] },
      { kod: 'C', ad: 'Karma (Yıl)',         deger: C, tarot: TAROT[C] },
      { kod: 'D', ad: 'Kader (Toplam)',      deger: D, tarot: TAROT[D] },
      { kod: 'M', ad: 'Merkez (Öz)',         deger: E, tarot: TAROT[E] },
      { kod: 'F', ad: 'Erkek Soyu Üst',      deger: F, tarot: TAROT[F] },
      { kod: 'G', ad: 'Kadın Soyu Üst',      deger: G, tarot: TAROT[G] },
      { kod: 'H', ad: 'Kadın Soyu Alt',      deger: H, tarot: TAROT[H] },
      { kod: 'I', ad: 'Erkek Soyu Alt',      deger: I, tarot: TAROT[I] }
    ];

    // Yaşam çizgisi — merkez enerjiye göre 0-80 yaş
    const yasCizgisi = destinyAgeLine(E).map(s => ({
      yas: s.yas,
      deger: s.arcana,
      tarot: TAROT[s.arcana]
    }));

    return {
      A, B, C, D, E, F, G, H, I,
      A1, A2, B1, B2, C1, C2, D1, D2,
      destinations: { personal, social, spiritual, planetary },
      chakras,
      noktalar,
      yasCizgisi,
      merkez: E
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

  /* -------------------------------------------------------- Para Kodu (Money Code) */
  function moneyCode(day, month, year) {
    const d = parseInt(day, 10) || 0;
    const m = parseInt(month, 10) || 0;
    const y = parseInt(year, 10) || 0;
    const d1 = reduceFull(digitSum(y));
    const d2 = reduceFull(m);
    const d3 = reduceFull(d);
    const d4 = reduceFull(d1 + d2 + d3);
    const code = `${d1}${d2}${d3}${d4}`;
    const echo = d1 + d2 + d3 + d4;
    const num = reduce(echo);
    return {
      Code: code, code: code,
      Echo: echo, echo: echo,
      Number: num, number: num,
      digits: [d1, d2, d3, d4]
    };
  }

  /* ----------------------------------------------------------- Pin Kodu (Pin Code) */
  function pinCode(day, month, year) {
    const d = parseInt(day, 10) || 0;
    const m = parseInt(month, 10) || 0;
    const y = parseInt(year, 10) || 0;
    const ySum = digitSum(y);

    const c1Num = reduceFull(d);
    const c2Num = reduceFull(m);
    const c3Num = reduceFull(ySum);

    const c4Echo = c1Num + c2Num + c3Num;
    const c4Num = reduceFull(c4Echo);

    const c5Echo = c1Num + c4Num;
    const c5Num = reduceFull(c5Echo);

    const c6Echo = c2Num + c1Num;
    const c6Num = reduceFull(c6Echo);

    const c7Echo = c3Num + c2Num;
    const c7Num = reduceFull(c7Echo);

    const c8Echo = c6Num + c7Num;
    const c8Num = reduceFull(c8Echo);

    const c9Echo = c1Num + c2Num + c3Num + c4Num + c5Num + c6Num + c7Num + c8Num;
    const c9Num = reduceFull(c9Echo);

    const fatherEcho = c1Num + c3Num;
    const fatherNum = reduceFull(fatherEcho);

    const motherEcho = c2Num + c4Num;
    const motherNum = reduceFull(motherEcho);

    const selfEcho = c5Num + c6Num + c7Num;
    const selfNum = reduceFull(selfEcho);

    const destinyEcho = c8Num + c9Num;
    const destinyNum = reduceFull(destinyEcho);

    return {
      Cell1: { Number: c1Num, Echo: d },
      Cell2: { Number: c2Num, Echo: m },
      Cell3: { Number: c3Num, Echo: ySum },
      Cell4: { Number: c4Num, Echo: c4Echo },
      Cell5: { Number: c5Num, Echo: c5Echo },
      Cell6: { Number: c6Num, Echo: c6Echo },
      Cell7: { Number: c7Num, Echo: c7Echo },
      Cell8: { Number: c8Num, Echo: c8Echo },
      Cell9: { Number: c9Num, Echo: c9Echo },
      FatherLine: { Number: fatherNum, Echo: fatherEcho },
      MotherLine: { Number: motherNum, Echo: motherEcho },
      SelfLine: { Number: selfNum, Echo: selfEcho },
      DestinyLine: { Number: destinyNum, Echo: destinyEcho },
      pinStr: `${c1Num}${c2Num}${c3Num}${c4Num}${c5Num}${c6Num}${c7Num}${c8Num}${c9Num}`,
      digits: [c1Num, c2Num, c3Num, c4Num, c5Num, c6Num, c7Num, c8Num, c9Num],
      c1: c1Num, c2: c2Num, c3: c3Num, c4: c4Num, c5: c5Num, c6: c6Num, c7: c7Num, c8: c8Num, c9: c9Num,
      fatherLine: fatherNum, motherLine: motherNum, selfLine: selfNum, destinyLine: destinyNum
    };
  }

  /* ------------------------------------------------------------- Aşk Kodu & Yaşam Kodu */
  function loveCode(name, day, month, year) {
    const su = soulUrgeNumber(name);
    const lp = lifePath(day, month, year);
    const major = reduce(su);
    const minor = reduce(lp);
    const effect = reduce(major + minor);
    const stress = Math.abs(major - minor);
    return {
      Number: effect,
      Echo: major + minor,
      MajorEnergy: major,
      MinorEnergy: minor,
      Effect: effect,
      EffectEcho: major + minor,
      Stress: stress
    };
  }

  function lifeCode(day, month, year) {
    const lp = lifePath(day, month, year);
    const d = parseInt(day, 10) || 0;
    const m = parseInt(month, 10) || 0;
    const num = reduce(d + m + lp);
    return { Number: num, Echo: d + m + lp, IsKarmicDebt: [13, 14, 16, 19].includes(d + m + lp) };
  }

  /* ---------------------------------------------------- Karmik Borç Kontrolü */
  function karmicDebtCheck(...args) {
    const titles = { 13: 'Disiplin Borcu', 14: 'Özgürlük Borcu', 16: 'Ego / İlişki Borcu', 19: 'Bireysellik Borcu' };
    const debts = [13, 14, 16, 19];

    if (args.length === 1 && typeof args[0] === 'number') {
      const num = args[0];
      return debts.includes(num) ? { isKarmic: true, id: num, code: num, title: titles[num] } : { isKarmic: false, id: num, code: num };
    }

    let numbersToCheck = [];
    if (args.length >= 3) {
      const [d, m, y, name] = args;
      if (debts.includes(Number(d))) numbersToCheck.push({ code: Number(d), source: 'Doğum Günü' });
      const sumDMY = (Number(d) || 0) + (Number(m) || 0) + (Number(y) || 0);
      if (debts.includes(sumDMY)) numbersToCheck.push({ code: sumDMY, source: 'Yaşam Yolu Ara Toplamı' });
      const lpSteps = reduceDetailed((Number(d) || 0) + (Number(m) || 0) + (Number(y) || 0)).steps;
      lpSteps.forEach(s => { if (debts.includes(s)) numbersToCheck.push({ code: s, source: 'Yaşam Yolu Basamağı' }); });
      if (name) {
        const lsum = letterSum(name);
        if (debts.includes(lsum)) numbersToCheck.push({ code: lsum, source: 'İfade Sayısı Ara Toplamı' });
      }
    } else if (Array.isArray(args[0])) {
      args[0].forEach(n => {
        if (debts.includes(Number(n))) numbersToCheck.push({ code: Number(n), source: 'Gösterge' });
      });
    }

    const unique = [];
    const seen = new Set();
    numbersToCheck.forEach(item => {
      if (!seen.has(item.code)) {
        seen.add(item.code);
        unique.push({ isKarmic: true, id: item.code, code: item.code, title: titles[item.code], source: item.source });
      }
    });
    return unique;
  }

  /* ------------------------------------------------- 5 Seviyeli İlişki Uyumu Motoru */
  function harmonyAnalysis(person1, person2) {
    const p1 = typeof person1 === 'string' ? { name: person1 } : person1;
    const p2 = typeof person2 === 'string' ? { name: person2 } : person2;

    const lp1 = p1.d ? lifePath(p1.d, p1.m, p1.y) : expressionNumber(p1.name);
    const lp2 = p2.d ? lifePath(p2.d, p2.m, p2.y) : expressionNumber(p2.name);
    const ex1 = expressionNumber(p1.name);
    const ex2 = expressionNumber(p2.name);
    const su1 = soulUrgeNumber(p1.name);
    const su2 = soulUrgeNumber(p2.name);

    const diff = Math.abs(reduce(lp1) - reduce(lp2));
    let hIdx = 2; // Doğal Akış
    if (diff === 0) hIdx = 1; // Ayna
    else if ([1, 8].includes(diff)) hIdx = 3; // Tamamlayıcı
    else if ([2, 4, 7].includes(diff)) hIdx = 4; // Gelişimsel
    else hIdx = 5; // Zorlu

    const harmonyTypes = (global.NumerologyData && global.NumerologyData.harmonyTypes) || [
      { index: 0, title: 'Nötr', bgcolor: '#ffffff', color: '#000000' },
      { index: 1, title: 'Ayna / Kutuplu', bgcolor: '#efe4f3', color: '#4a154b', des: 'Ruhsal ayna, güçlü benzerlik ve manyetik çekim.' },
      { index: 2, title: 'Doğal Akış', bgcolor: '#e4f1e8', color: '#155724', des: 'Zahmetsiz uyum, kendiliğinden gelişen anlayış ve rahatlık.' },
      { index: 3, title: 'Tamamlayıcı', bgcolor: '#e4edf5', color: '#004085', des: 'Birbirinin eksik yönlerini dengeleyen ve güçlendiren birliktelik.' },
      { index: 4, title: 'Gelişimsel', bgcolor: '#f8edd8', color: '#856404', des: 'Karşılıklı öğrenme, olgunlaşma ve dönüştürücü ruhsal dersler.' },
      { index: 5, title: 'Zorlu / Mücadeleci', bgcolor: '#fde8e8', color: '#9b1c1c', des: 'Farklı dünya görüşleri, emek isteyen ve sabırla aşılacak sınavlar.' }
    ];

    const hInfo = harmonyTypes.find(h => h.index === hIdx) || harmonyTypes[2];
    const score = hIdx === 1 ? 95 : hIdx === 2 ? 90 : hIdx === 3 ? 85 : hIdx === 4 ? 75 : 60;

    return {
      p1: { lp: lp1, ex: ex1, su: su1 },
      p2: { lp: lp2, ex: ex2, su: su2 },
      harmonyIndex: hIdx,
      harmonyTitle: hInfo.title,
      type: hInfo.title,
      description: hInfo.des,
      analysis: hInfo.des,
      bgcolor: hInfo.bgcolor || '#e4edf5',
      color: hInfo.color || '#004085',
      score: score
    };
  }

  /* ------------------------------------------------- Ezoterik & Kozmik Hesaplayıcılar */
  function arcana(n) {
    const val = Number(n) || 0;
    return reduce22(val);
  }

  function zodiacSign() {
    return { number: 0, name: '', symbol: '', element: 'Toprak', dates: '' };
  }

  function planet() {
    return { number: 0, name: '', symbol: '', description: '' };
  }

  function rune() {
    return { number: 0, name: '', symbol: '', meaning: '' };
  }

  function element(d, m, y) {
    const eList = (global.NumerologyData && global.NumerologyData.elements) || [
      { id: 1, name: 'Ateş', symbol: '🜂', color: '#e74c3c', description: 'İrade, cesaret ve tutku.' },
      { id: 2, name: 'Toprak', symbol: '🜃', color: '#27ae60', description: 'Güven, istikrar ve üretkenlik.' },
      { id: 3, name: 'Hava', symbol: '🜁', color: '#3498db', description: 'Zihin, vizyon ve iletişim.' },
      { id: 4, name: 'Su', symbol: '🜄', color: '#2980b9', description: 'Sezgi, şefkat ve akış.' }
    ];
    const lp = lifePath(d, m, y);
    // Pisagor numeroloji element eşlemesi: 1,5,9 Ateş | 2,6 Su | 3,7 Hava | 4,8 Toprak
    const elMap = { 1: 0, 5: 0, 9: 0, 2: 3, 6: 3, 3: 2, 7: 2, 4: 1, 8: 1, 11: 2, 22: 1, 33: 3 };
    const idx = elMap[lp] !== undefined ? elMap[lp] : 0;
    return eList[idx] || eList[0];
  }

  function moonPhase(d, m, y) {
    const day = Number(d) || 1, month = Number(m) || 1, year = Number(y) || 1990;
    let ym = year, mm = month;
    if (mm < 3) { ym--; mm += 12; }
    ++mm;
    let jd = 365.25 * ym + 30.6 * mm + day - 694039.09;
    jd /= 29.5305882;
    let b = Math.round((jd - parseInt(jd)) * 8);
    if (b >= 8) b = 0;
    const phases = [
      { phase: 'Yeniay', meaning: 'Tohum ekme, yeni niyetler ve ruhsal başlangıçlar enerjisi.' },
      { phase: 'Hilal', meaning: 'Büyüme arzusu, cesaretle ilk adımları atma ve vizyon oluşturma.' },
      { phase: 'İlk Dördün', meaning: 'Engelleri aşma, irade sınavı ve kararlılıkla ilerleme.' },
      { phase: 'Büyüyen Ay', meaning: 'Detayları rafine etme, sabır ve son hazırlıkların tamamlanması.' },
      { phase: 'Dolunay', meaning: 'Tezahür, maksimum farkındalık, aydınlanma ve ruhsal hasat.' },
      { phase: 'Küçülen Ay', meaning: 'Şükran duyma, bilgiyi paylaşma ve başkalarına rehberlik etme.' },
      { phase: 'Son Dördün', meaning: 'Bırakma, affetme, eski yüklerden arınma ve teslimiyet.' },
      { phase: 'Balzamik (Karanlık Ay)', meaning: 'Derin dinlenme, içe dönüş, meditasyon ve ruhsal yenilenme.' }
    ];
    return phases[b] || phases[0];
  }

  function karmicAnalysis(day, month, year, name) {
    let d, m, y, nm;
    if (typeof day === 'string' && isNaN(Number(day))) {
      nm = day; d = Number(month) || 1; m = Number(year) || 1; y = Number(name) || 1990;
    } else {
      d = Number(day) || 1; m = Number(month) || 1; y = Number(year) || 1990; nm = name || '';
    }

    const A = reduce22(d);
    const B = reduce22(m);
    const C = reduce22(digitSum(y));
    const F = reduce22(A + B);
    const G = reduce22(B + C);
    const H = reduce22(C + A);
    const D = reduce22(A + B + C); // Merkez Düğüm
    const E = reduce22(D + B);
    const I = reduce22(D + C);
    const K = reduce22(D + A);
    const L = reduce22(D + F);

    const spiritualPath = D;
    const successPath = reduce22(A + C);
    const karmicKnot = D;
    const tailKarma = [D, reduce22(D + C), reduce22(D + B)];
    const missions = [
      'Geçmiş yaşam karmasını temizleyerek bu yaşamda ruhsal olgunluğa ve ilahi bilgeliğe ulaşma dersi.',
      'Liderlik enerjisini bencillikten arındırıp toplumsal faydaya ve ışık rehberliğine dönüştürme.',
      'Duygusal bağımlılıkları aşarak koşulsuz sevgi ve içsel huzur dengesini inşa etme.',
      'Maddi dünyayı manevi değerlerle harmanlayıp bolluk bilincini adaletle paylaşma.'
    ];
    const incarnationMission = missions[D % missions.length];

    return {
      A, B, C, D, E, F, G, H, I, K, L,
      spiritualPath, successPath, karmicKnot, tailKarma, incarnationMission,
      hayatSayisi: { ham: d + m + y, deger: reduce22(d + m + y) },
      yol: [{ kod: 'A', deger: A }, { kod: 'B', deger: B }, { kod: 'C', deger: C }, { kod: 'D', deger: D }],
      basari: [{ kod: 'E', deger: E }, { kod: 'F', deger: F }, { kod: 'G', deger: G }, { kod: 'H', deger: H }],
      dugum: [{ kod: 'I', deger: I }, { kod: 'K', deger: K }, { kod: 'L', deger: L }]
    };
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
    tirolWheel, karmaAnalysis, karmicAnalysis, destinyMatrix, personalCycles,
    transformationYears, universalDate, universalWheel, personalWeekTable,
    nameCompatibility, plateAnalysis, identityNumberAnalysis,

    moneyCode, pinCode, loveCode, lifeCode, karmicDebtCheck, harmonyAnalysis,
    arcana, zodiacSign, planet, rune, element, moonPhase,
    omurgaTable
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  }
  global.AstroSushuEngine = API;

})(typeof window !== 'undefined' ? window : globalThis);
