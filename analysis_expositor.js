/**
 * Astro Şuşu Numeroloji Sistemi — Analysis Expositor (Bütünsel Danışan Rapor Motoru)
 * Evrensel numeroloji standartlarında 24 ana bölüm, kapak sayfası, içindekiler tablosu,
 * derin psikolojik & manevi rehberlik paragrafları ve A4 PDF yazdırma stili.
 */
(function (global) {
  'use strict';

  const AnalysisExpositor = {
    generateFullReport: function (person, analysisResults) {
      const name = person.fullName || person.name || 'Danışan';
      const d = person.d || 1;
      const m = person.m || 1;
      const y = person.y || 1990;
      const dateStr = `${d}.${m}.${y}`;
      const nowStr = new Date().toLocaleDateString('tr-TR');

      const defs = global.NumerologyDefinitions;
      const getDef = (cat, num) => {
        if (!defs) return '';
        const html = defs.get(`Num/${cat}/${num}.html`) || defs.get(`Num/${cat}/${num}`) || '';
        // extract paragraphs only
        return html.replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, '').trim();
      };

      const E = global.AstroSushuEngine;
      const res = analysisResults || {};
      const lp = res.lp || res.lifePath || (E ? E.lifePath(d, m, y) : 1);
      const ex = res.ex || res.expression || (E ? E.expressionNumber(name) : 1);
      const su = res.su || res.soulUrge || (E ? E.soulUrgeNumber(name) : 1);
      const pe = res.pe || res.personality || (E ? E.personalityNumber(name) : 1);
      const at = res.at || res.attitude || (E ? E.attitudeNumber(d, m) : 1);
      const ma = res.ma || res.maturity || (E ? E.maturityNumber(name, d, m, y) : 1);
      const br = res.br || res.bridge || (E ? E.bridgeNumber(name, d, m, y) : 0);
      const ba = res.ba || res.balance || (E ? E.balanceNumber(name) : 1);
      const co = res.co || res.cornerstone || (E ? E.cornerstone(name) : 'A');
      const ca = res.ca || res.capstone || (E ? E.capstone(name) : 'Z');
      const fv = res.fv || res.firstVowel || (E ? E.firstVowelValue(name) : 'A');
      const mcObj = res.mc || (E ? E.moneyCode(d, m, y) : { code: '0000', number: 1, echo: 0 });
      const pcObj = res.pc || (E ? E.pinCode(d, m, y) : { pinStr: '000000000' });
      const kDebts = res.kDebts || (E ? E.karmicDebtCheck(d, m, y, name) : []);
      const dmData = E ? E.destinyMatrix(d, m, y, name) : { destinations: {}, chakras: [] };
      const karmicData = E ? E.karmicAnalysis(d, m, y, name) : { tailKarma: [] };
      const el = E ? E.element(d, m, y) : { name: 'Ateş', symbol: '🜂', description: '' };
      const ep = E ? E.expressionPlanes(name) : null;
      const pnc = res.p || (E ? E.pinnaclesAndChallenges(d, m, y) : { zirveler: [], zorluklar: [] });

      const mc = mcObj.code || mcObj.Code || '0000';
      const mcNum = mcObj.number || mcObj.Number || 1;
      const pcStr = pcObj.pinStr || '000000000';

      const sections = [
        {
          no: '01',
          title: 'KALP ARZUSU (Ruhun İçsel Motivasyonu)',
          sub: `Sayı Değeri: ${su}`,
          content: getDef('HeartDesire', su) || `Kalp arzusu sayınız ${su}, ruhunuzun en derin özlemlerini ve içsel motivasyonunuzu yansıtır. Yaşamınızda gerçek tatmini ne zaman ve nasıl bulacağınızın pusulasıdır.`
        },
        {
          no: '02',
          title: 'KİŞİLİK SAYISI (Dış Dünyaya Yansıyan İmaj)',
          sub: `Sayı Değeri: ${pe}`,
          content: getDef('Personality', pe) || `Kişilik sayınız ${pe}, başkalarının sizi ilk karşılaştıklarında nasıl algıladığını ve sosyal alandaki auranızı gösterir.`
        },
        {
          no: '03',
          title: 'İFADE SAYISI (Doğuştan Gelen Yetenekler ve Yaşam Misyonu)',
          sub: `Sayı Değeri: ${ex}`,
          content: getDef('Expression', ex) || `İfade sayınız ${ex}, bu dünyada gerçekleştirmek üzere donatıldığınız zihinsel, ruhsal ve pratik potansiyelin toplamıdır.`
        },
        {
          no: '04',
          title: 'KÖŞE TAŞI (İlk Harfin Yaşama Başlama Enerjisi)',
          sub: `Başlangıç Harfi: ${co}`,
          content: getDef('Cornerstone', co) || `İsminizin ilk harfi olan ${co}, yeni bir işe, ilişkiye veya projeye başlarken sergilediğiniz ilk refleksleri belirler.`
        },
        {
          no: '05',
          title: 'BİTİŞ TAŞI (Son Harfin Sonuçlandırma Gücü)',
          sub: `Bitiş Harfi: ${ca}`,
          content: getDef('FinalLetterStone', ca) || `İsminizin son harfi olan ${ca}, başladığınız işleri nasıl tamamladığınızı ve sebat gücünüzü temsil eder.`
        },
        {
          no: '06',
          title: 'İLK SESLİ HARF (Duygusal Tepki Kalıbı)',
          sub: `İlk Sesli: ${fv}`,
          content: `İsminizdeki ilk sesli harf olan ${fv}, beklenmedik durumlar karşısında verdiğiniz en ilkel ve samimi duygusal tepkiyi gösterir.`
        },
        {
          no: '07',
          title: 'DENGE SAYISI (Krizleri Yönetme Kabiliyeti)',
          sub: `Sayı Değeri: ${ba}`,
          content: getDef('Balance', ba) || `Denge sayınız ${ba}, hayatınızda fırtınalı ve dengesiz dönemler baş gösterdiğinde merkezinize nasıl döneceğinizi açıklar.`
        },
        {
          no: '08',
          title: 'KÖPRÜ SAYISI (İfade ve Yaşam Yolu Arasındaki Geçiş)',
          sub: `Sayı Değeri: ${br}`,
          content: getDef('Bridge', br) || `Köprü sayınız ${br}, kim olduğunuz (İfade) ile nereye gittiğiniz (Yaşam Yolu) arasındaki engelleri aşmanızı sağlayan anahtardır.`
        },
        {
          no: '09',
          title: 'YAŞAM YOLU (Ruhun Bu Dünyadaki Ana Görevi)',
          sub: `Ana Sayı: ${lp}`,
          content: getDef('LifePath', lp) || `Yaşam Yolu ${lp}, doğduğunuz andan itibaren size tahsis edilen ana yaşam patikasıdır. Bu yolda kazanacağınız tecrübeler ruhunuzun temel tekamülünü oluşturur.`
        },
        {
          no: '10',
          title: 'TUTUM SAYISI (Hayata Karşı Genel Duruş)',
          sub: `Sayı Değeri: ${at}`,
          content: getDef('Attitude', at) || `Tutum sayınız ${at}, olaylara karşı ilk tepkiniz ve dış dünyanın sizin hakkınızda edindiği kalıcı izlenimdir.`
        },
        {
          no: '11',
          title: 'OLGUNLUK SAYISI (İkinci Yarıdaki Büyük Potansiyel)',
          sub: `Sayı Değeri: ${ma}`,
          content: getDef('Maturity', ma) || `Olgunluk sayınız ${ma}, 35-40 yaşlarından sonra hayatınızda ağırlığını hissettiren ve ileriki yıllarınıza yön veren bilgelik sayısıdır.`
        },
        {
          no: '12',
          title: 'PARA KODU (Maddi Bereket ve Finansal Akış Sekansı)',
          sub: `Finansal Sekans: ${mc} (Toplam Frekans: ${mcNum})`,
          content: getDef('MoneyCode', mcNum) || `Para kodunuz ${mc}, bilinçaltınızdaki bolluk-bereket kapılarını açan titreşimdir. Parayı kazanma, tutma ve büyütme stratejinizin sayısal haritasıdır.`
        },
        {
          no: '13',
          title: 'PİN KODU VE 4 YAŞAM ÇİZGİSİ',
          sub: `9 Haneli Kod: ${pcStr}`,
          content: `Pin Kodunuz ${pcStr}, karakterinizin 9 farklı hücresini ve atalarınızdan devraldığınız Baba Çizgisi (${pcObj.fatherLine || '-'}), Anne Çizgisi (${pcObj.motherLine || '-'}), Ben Çizgisi (${pcObj.selfLine || '-'}) ve Kadersel Çizgiyi (${pcObj.destinyLine || '-'}) detaylandırır.`
        },
        {
          no: '14',
          title: '22 ARCANA KADER MATRİSİ (Oktagram Sentezi)',
          sub: `Merkez Konfor Arkanası: ${dmData.E || '-'}`,
          content: `22 Büyük Arkana Kader Matrisiniz; Gün (Kişilik: Arkana ${dmData.A || '-'}), Ay (Ruhsal Hat: Arkana ${dmData.B || '-'}), Yıl (Geçmiş Karma: Arkana ${dmData.C || '-'}) ve Alt Düğüm (Kader: Arkana ${dmData.D || '-'}) eksenlerinde ruhunuzun somutlaşma haritasını çizer.`
        },
        {
          no: '15',
          title: 'DÖRT KADERSEL YÖNELİM (Destinations)',
          sub: `Kişisel, Sosyal, Ruhsal ve Kolektif Hedefler`,
          content: `Kişisel Kaderiniz (Arkana ${(dmData.destinations||{}).personal || '-'}), Sosyal Kaderiniz (Arkana ${(dmData.destinations||{}).social || '-'}), Ruhsal Senteziniz (Arkana ${(dmData.destinations||{}).spiritual || '-'}) ve Kolektif Misyonunuz (Arkana ${(dmData.destinations||{}).planetary || '-'}), hayatınızın 20, 40 ve 60 yaş döngülerinde açığa çıkan kilit arketipsel basamakları gösterir.`
        },
        {
          no: '16',
          title: '7 ÇAKRA ENERJİ VE ŞİFA MATRİSİ',
          sub: `Kökten Taca 7 Enerji Merkezi`,
          content: `Çakra sisteminizdeki enerji akışları fiziksel, duygusal ve ruhsal sağlığınızın zeminini oluşturur. Sahasrara'dan Muladhara'ya kadar her çakranın arkana frekansı, bedeninizde dengelenmesi gereken merkezleri ve şifalanma yöntemlerini açığa çıkarır.`
        },
        {
          no: '17',
          title: 'LADİNİ KARMA ANALİZİ (Çift-Üçgen Ekolü)',
          sub: `Ruhsal Aks: ${karmicData.spiritualPath || '-'} | Başarı Yolu: ${karmicData.successPath || '-'}`,
          content: `Kişilik Üçgeni ile Halef Üçgeni arasındaki etkileşim, karmik düğüm noktanızı (Arkana ${karmicData.karmicKnot || '-'}) ve enkarnasyon görevinizi belirler: ${karmicData.incarnationMission || 'Ruhsal denge ve tekamül.'}`
        },
        {
          no: '18',
          title: 'GEÇMİŞ YAŞAM VE KUYRUK KARMASI',
          sub: `Kuyruk Arkanaları: ${(karmicData.tailKarma||[]).join(', ') || '-'}`,
          content: `Geçmiş enkarnasyonlardan bilinçaltınıza taşınan gölge alışkanlıklar ve çözümlenmemiş dersler, bu yaşamda benzer döngülerle sınanmanıza yol açabilir. Bu arketipsel gölgeleri ışığa dönüştürdüğünüzde en büyük gücünüze ulaşırsınız.`
        },
        {
          no: '19',
          title: 'KARMİK BORÇLAR VE RUHSAL ARINMA REÇETESİ',
          sub: `Tespit Edilen Borçlar: ${kDebts.length ? kDebts.map(k=>k.code).join(', ') : 'Temiz / Dengeli'}`,
          content: kDebts.length ? kDebts.map(k => `<b>Karmik Borç ${k.code} (${k.title}):</b> Bu borç, geçmiş döngülerde ihmal edilen sorumlulukların telafisidir. Çözüm reçetesi: Sabır, dürüstlük ve ruhsal bilinçle hareket etmektir.`).join('<br><br>') : `Haritanızda aktif bir karmik borç (13, 14, 16, 19) tespit edilmemiştir. Ruhunuz temiz bir karmik sayfayla bu yaşamı deneyimlemektedir.`
        },
        {
          no: '20',
          title: 'TİROL DOĞUM ÇARKI (5 Yön ve Element Dengesi)',
          sub: `Pusula ve Organ Ağırlıkları`,
          content: `Tirol bilgelik çarkı, doğum tarihinizdeki rakamların Kuzey (Su), Güney (Ateş), Doğu (Ağaç), Batı (Metal) ve Merkez (Toprak) yönlerine dağılımını gösterir. Hangi organların enerjisel destek istediğini ve hangi elementin sizde baskın olduğunu anlatır.`
        },
        {
          no: '21',
          title: 'NUMEROLOJİK OMURGA VE ELEMENT DENGESİ',
          sub: `Baskın Element: ${el.name} (${el.symbol}) · Denge Sayısı: ${ba}`,
          content: `Doğum haritanızdaki rakamların element dağılımı (${el.name}) ve kriz anlarında merkezinize dönmenizi sağlayan Denge Sayınız (${ba}), numerolojik omurganızın en sağlam dayanağıdır. Bu denge, yaşam yolunuzda hedeflerinize sarsılmadan ilerlemenizi sağlar.`
        },
        {
          no: '22',
          title: 'DÖRT İFADE DÜZLEMİ',
          sub: `Zihinsel, Fiziksel, Duygusal ve Sezgisel Katmanlar`,
          content: `İsminizdeki harflerin titreşimi, yaşam enerjinizi zihinsel, fiziksel, duygusal ve sezgisel düzlemlere nasıl paylaştırdığınızı gösterir. Bu dağılım, kariyerinizden ilişkilerinize kadar kararlarınızı yöneten içsel dengeyi kurar.`
        },
        {
          no: '23',
          title: 'ZİRVE DÖNEMLERİ (PINNACLES) VE MEYDAN OKUMALAR',
          sub: `Hayatınızın 4 Büyük Evresi`,
          content: `Hayatınızın 9'ar yıllık evrelerinde gerçekleşen 4 Zirve Dönemi ve Meydan Okuma; hangi yaş aralıklarında hangi büyük sıçramaları yapacağınızı ve hangi tuzaklara dikkat etmeniz gerektiğini belirleyen stratejik yol haritanızdır.`
        },
        {
          no: '24',
          title: 'BÜTÜNSEL YAŞAM SENTEZİ VE DANIŞMANLIK NOTLARI',
          sub: `Danışanınıza Özel Ruhsal ve Pratik Rehberlik`,
          content: `Sevgili ${name}, bu analizde açığa çıkan tüm göstergeler, Yaşam Yolunuz olan ${lp} sayısının etrafında birleşmektedir. Para kodunuz (${mc}), Pin kodunuz (${pcStr}) ve karmik göstergelerinizle birlikte kendi öz potansiyelinizi gerçekleştirmek için gereken tüm donanıma sahipsiniz. Kendinize güvenin ve ilahi planın akışına teslim olun.`
        }
      ];


      // Build HTML Report
      let html = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>Bütünsel Numeroloji Raporu — ${name}</title>
  <style>
    :root {
      --plum: #3b2348;
      --gold: #b78936;
      --rose: #a85871;
      --soft: #fcf9f5;
      --ink: #2b2533;
      --muted: #6b6375;
      --line: #ebdcc9;
    }
    body {
      margin: 0; padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f4efe9; color: var(--ink); line-height: 1.6;
    }
    .sheet {
      max-width: 860px; margin: 30px auto; background: #fff;
      box-shadow: 0 15px 50px rgba(45,25,60,0.12);
      border-radius: 8px; overflow: hidden; border: 1px solid var(--line);
    }
    .cover {
      background: linear-gradient(135deg, #2d1838, #4d2a5e);
      color: #fff; padding: 70px 50px; text-align: center; position: relative;
    }
    .cover h1 {
      font-size: 28px; letter-spacing: 2px; text-transform: uppercase;
      color: #f7dfa5; margin: 0 0 12px; font-weight: 700;
    }
    .cover h2 {
      font-size: 20px; font-weight: 400; color: #eedcf5; margin: 0 0 35px;
    }
    .cover .meta-box {
      display: inline-block; background: rgba(255,255,255,0.08);
      border: 1px solid rgba(247,223,165,0.3); border-radius: 12px;
      padding: 16px 36px; text-align: left; font-size: 14px;
    }
    .cover .meta-box div { margin: 6px 0; }
    .cover .meta-box span { color: #f7dfa5; font-weight: 600; }
    
    .toc {
      padding: 40px 50px; background: var(--soft); border-bottom: 1px solid var(--line);
    }
    .toc h3 {
      color: var(--plum); margin-top: 0; text-transform: uppercase;
      font-size: 14px; letter-spacing: 1.5px; border-bottom: 2px solid var(--gold);
      padding-bottom: 8px;
    }
    .toc-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px 30px; font-size: 13px;
    }
    .toc-item {
      display: flex; justify-content: space-between; border-bottom: 1px dashed var(--line);
      padding: 4px 0;
    }
    .toc-item span.no { color: var(--gold); font-weight: 700; }

    .content-area { padding: 40px 50px; }
    .section-card {
      margin-bottom: 40px; padding-bottom: 30px; border-bottom: 1px solid var(--line);
      page-break-inside: avoid;
    }
    .section-head { margin-bottom: 16px; }
    .section-no {
      color: var(--gold); font-size: 11px; font-weight: 800; letter-spacing: 1.5px;
      text-transform: uppercase; margin-bottom: 4px;
    }
    .section-title {
      font-size: 20px; color: var(--plum); margin: 0 0 6px; font-weight: 700;
    }
    .section-sub {
      color: var(--rose); font-size: 13px; font-weight: 600;
    }
    .section-body {
      font-size: 14px; color: #383040; line-height: 1.8; text-align: justify;
    }
    .section-body p { margin: 0 0 14px; }

    .print-bar {
      position: fixed; top: 16px; right: 20px; z-index: 1000;
      display: flex; gap: 10px;
    }
    .btn-print {
      background: #b78936; color: #fff; border: 0; padding: 10px 22px;
      border-radius: 20px; font-weight: 700; cursor: pointer;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2); font-size: 13px;
    }
    .btn-close {
      background: #3b2348; color: #fff; border: 0; padding: 10px 18px;
      border-radius: 20px; font-weight: 700; cursor: pointer;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2); font-size: 13px;
    }

    @media print {
      body { background: #fff; }
      .sheet { max-width: 100%; margin: 0; box-shadow: none; border: 0; }
      .print-bar { display: none !important; }
      .section-card { page-break-inside: avoid; }
      @page { size: A4; margin: 15mm; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <button class="btn-print" onclick="window.print()">🖨️ PDF Olarak Kaydet / Yazdır</button>
    <button class="btn-close" onclick="window.close()">✕ Kapat</button>
  </div>

  <div class="sheet">
    <div class="cover">
      <h1>Bütünsel Numeroloji Analiz Raporu</h1>
      <h2>Kişiye Özel Ruhsal, Kadersel ve Psikolojik Yol Haritası</h2>
      <div class="meta-box">
        <div><span>Danışan:</span> ${name}</div>
        <div><span>Doğum Tarihi:</span> ${dateStr}</div>
        <div><span>Yaşam Yolu Sayısı:</span> ${lp} | <span>İfade:</span> ${ex} | <span>Para Kodu:</span> ${mc}</div>
        <div><span>Rapor Tarihi:</span> ${nowStr}</div>
      </div>
    </div>

    <div class="toc">
      <h3>İçindekiler Tablosu</h3>
      <div class="toc-grid">
        ${sections.map(s => `
          <div class="toc-item">
            <span><span class="no">${s.no}.</span> ${s.title.split('(')[0]}</span>
            <span class="no">▶</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="content-area">
      ${sections.map(s => `
        <div class="section-card">
          <div class="section-head">
            <div class="section-no">BÖLÜM ${s.no}</div>
            <h3 class="section-title">${s.title}</h3>
            <div class="section-sub">${s.sub}</div>
          </div>
          <div class="section-body">
            ${s.content}
          </div>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>
      `;

      return html;
    },

    openReportWindow: function (person, analysisResults) {
      const html = this.generateFullReport(person, analysisResults);
      const win = window.open('', '_blank');
      if (win) {
        win.document.open();
        win.document.write(html);
        win.document.close();
      } else {
        alert('Lütfen tarayıcınızın pop-up engelleyicisini kaldırın.');
      }
    }
  };

  global.AnalysisExpositor = AnalysisExpositor;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
