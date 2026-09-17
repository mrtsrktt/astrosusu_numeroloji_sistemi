/**
 * Astro Şuşu Numeroloji Sistemi — Tirol Doğum Çarkı (Birth Wheel) SVG Çizici
 * 5 Yön, 5 Element, Organlar, Renkler ve Sayısal Ağırlıklar Pusula Grafiği
 */
(function (global) {
  'use strict';

  function BirthWheelSVG(containerId, options) {
    this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    this.options = Object.assign({
      width: 500,
      height: 500
    }, options);
  }

  BirthWheelSVG.prototype.render = function (data) {
    if (!this.container || !data) return;

    const w = this.options.width;
    const h = this.options.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = 160;

    // Helper to get weight or count
    const northWeight = data.NorthWeight ?? (data.North ?? 0);
    const eastWeight = data.EastWeight ?? (data.East ?? 0);
    const southWeight = data.SouthWeight ?? (data.South ?? 0);
    const westWeight = data.WestWeight ?? (data.West ?? 0);
    const centerWeight = data.CenterWeight ?? (data.Center ?? 0);

    let svg = `
      <svg viewBox="0 0 ${w} ${h}" style="display:block;width:100%;height:auto;max-width:${w}px;margin:0 auto;font-family:'Segoe UI',sans-serif;">
        <defs>
          <filter id="bwShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.2"/>
          </filter>
        </defs>

        <!-- Arka Plan Halkaları -->
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="2" />
        <circle cx="${cx}" cy="${cy}" r="${r * 0.65}" fill="none" stroke="#edf2f7" stroke-width="1.5" stroke-dasharray="3,3" />

        <!-- Eksenler -->
        <line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}" stroke="#cbd5e1" stroke-width="2" />
        <line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="#cbd5e1" stroke-width="2" />

        <!-- KUZEY (Su / Mavi - Sayılar 1, 6) -->
        <g style="cursor:pointer;" onclick="window.NumerologyDefinitions && window.NumerologyDefinitions.openModal('Kuzey Yönü (Su - 1, 6)', '<h4>KUZEY YÖNÜ</h4><p><b>Element:</b> Su | <b>Organ:</b> Böbrek | <b>Renk:</b> Siyah / Mavi</p><p>Derin bilgelik, yaşam özü, içsel güç ve potansiyelin sessiz kaynağıdır. Rakamlar: 1 ve 6.</p>')">
          <circle cx="${cx}" cy="${cy - r}" r="38" fill="#1C398E" filter="url(#bwShadow)" />
          <text x="${cx}" y="${cy - r - 10}" fill="#93c5fd" font-size="11" font-weight="700" text-anchor="middle">KUZEY (Su)</text>
          <text x="${cx}" y="${cy - r + 8}" fill="#ffffff" font-size="15" font-weight="800" text-anchor="middle">1, 6</text>
          <text x="${cx}" y="${cy - r + 22}" fill="#cbd5e1" font-size="10" text-anchor="middle">Ağırlık: ${northWeight}</text>
        </g>

        <!-- GÜNEY (Ateş / Kırmızı - Sayılar 2, 7) -->
        <g style="cursor:pointer;" onclick="window.NumerologyDefinitions && window.NumerologyDefinitions.openModal('Güney Yönü (Ateş - 2, 7)', '<h4>GÜNEY YÖNÜ</h4><p><b>Element:</b> Ateş | <b>Organ:</b> Kalp | <b>Renk:</b> Kırmızı</p><p>Bilinç, neşe, ruhsal parlaklık ve yaşam enerjisinin dışa yayılmasıdır. Rakamlar: 2 ve 7.</p>')">
          <circle cx="${cx}" cy="${cy + r}" r="38" fill="#FB2C36" filter="url(#bwShadow)" />
          <text x="${cx}" y="${cy + r - 10}" fill="#fca5a5" font-size="11" font-weight="700" text-anchor="middle">GÜNEY (Ateş)</text>
          <text x="${cx}" y="${cy + r + 8}" fill="#ffffff" font-size="15" font-weight="800" text-anchor="middle">2, 7</text>
          <text x="${cx}" y="${cy + r + 22}" fill="#cbd5e1" font-size="10" text-anchor="middle">Ağırlık: ${southWeight}</text>
        </g>

        <!-- DOĞU (Ağaç / Yeşil - Sayılar 3, 8) -->
        <g style="cursor:pointer;" onclick="window.NumerologyDefinitions && window.NumerologyDefinitions.openModal('Doğu Yönü (Ağaç - 3, 8)', '<h4>DOĞU YÖNÜ</h4><p><b>Element:</b> Ağaç | <b>Organ:</b> Karaciğer | <b>Renk:</b> Yeşil</p><p>Büyüme, hareket, vizyon ve yaşamın ileri doğru genişleme enerjisidir. Rakamlar: 3 ve 8.</p>')">
          <circle cx="${cx + r}" cy="${cy}" r="38" fill="#2AA63E" filter="url(#bwShadow)" />
          <text x="${cx + r}" y="${cy - 10}" fill="#86efac" font-size="11" font-weight="700" text-anchor="middle">DOĞU (Ağaç)</text>
          <text x="${cx + r}" y="${cy + 8}" fill="#ffffff" font-size="15" font-weight="800" text-anchor="middle">3, 8</text>
          <text x="${cx + r}" y="${cy + 22}" fill="#cbd5e1" font-size="10" text-anchor="middle">Ağırlık: ${eastWeight}</text>
        </g>

        <!-- BATI (Metal / Beyaz - Sayılar 4, 9) -->
        <g style="cursor:pointer;" onclick="window.NumerologyDefinitions && window.NumerologyDefinitions.openModal('Batı Yönü (Metal - 4, 9)', '<h4>BATI YÖNÜ</h4><p><b>Element:</b> Metal | <b>Organ:</b> Akciğer | <b>Renk:</b> Beyaz</p><p>Arınma, disiplin, bırakma ve özün saflaştırılması sürecidir. Rakamlar: 4 ve 9.</p>')">
          <circle cx="${cx - r}" cy="${cy}" r="38" fill="#64748b" stroke="#cbd5e1" stroke-width="2" filter="url(#bwShadow)" />
          <text x="${cx - r}" y="${cy - 10}" fill="#f1f5f9" font-size="11" font-weight="700" text-anchor="middle">BATI (Metal)</text>
          <text x="${cx - r}" y="${cy + 8}" fill="#ffffff" font-size="15" font-weight="800" text-anchor="middle">4, 9</text>
          <text x="${cx - r}" y="${cy + 22}" fill="#cbd5e1" font-size="10" text-anchor="middle">Ağırlık: ${westWeight}</text>
        </g>

        <!-- MERKEZ (Toprak / Sarı - Sayılar 0, 5) -->
        <g style="cursor:pointer;" onclick="window.NumerologyDefinitions && window.NumerologyDefinitions.openModal('Merkez (Toprak - 0, 5)', '<h4>MERKEZ</h4><p><b>Element:</b> Toprak | <b>Organ:</b> Dalak / Mide | <b>Renk:</b> Sarı</p><p>Denge, merkezlenme, beslenme ve tüm enerjileri bir arada tutan stabilitedir. Rakamlar: 0 ve 5.</p>')">
          <circle cx="${cx}" cy="${cy}" r="44" fill="#EAB308" filter="url(#bwShadow)" />
          <text x="${cx}" y="${cy - 12}" fill="#78350f" font-size="11" font-weight="800" text-anchor="middle">MERKEZ</text>
          <text x="${cx}" y="${cy + 7}" fill="#451a03" font-size="16" font-weight="800" text-anchor="middle">0, 5</text>
          <text x="${cx}" y="${cy + 22}" fill="#78350f" font-size="10" font-weight="700" text-anchor="middle">Ağırlık: ${centerWeight}</text>
        </g>
      </svg>
    `;

    this.container.innerHTML = svg;
  };

  BirthWheelSVG.calculateWeights = function (d, m, y) {
    const digits = `${d}${m}${y}`.replace(/\D/g, '');
    const counts = {};
    for (let i = 0; i <= 9; i++) counts[i] = 0;
    for (const ch of digits) counts[ch] = (counts[ch] || 0) + 1;

    return {
      NorthWeight: counts[1] + counts[6],
      SouthWeight: counts[2] + counts[7],
      EastWeight: counts[3] + counts[8],
      WestWeight: counts[4] + counts[9],
      CenterWeight: counts[0] + counts[5]
    };
  };

  BirthWheelSVG.render = function (containerId, dOrData, m, y, options) {
    const chart = new BirthWheelSVG(containerId, options);
    let data = dOrData;
    if (typeof dOrData !== 'object' || dOrData === null || !('NorthWeight' in dOrData || 'North' in dOrData)) {
      data = BirthWheelSVG.calculateWeights(dOrData, m, y);
    }
    chart.render(data);
    return chart;
  };

  global.BirthWheelSVG = BirthWheelSVG;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));

