/**
 * Astro Şuşu Numeroloji Sistemi — Ladini Karma Analizi Çift-Üçgen SVG Çizici
 * Kişilik ve Halef Üçgenleri, Karmik Eksenler ve Tıklanabilir Arkana Düğümleri
 */
(function (global) {
  'use strict';

  function KarmicSVG(containerId, options) {
    this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    this.options = Object.assign({
      width: 580,
      height: 520,
      gap: 30,
      lineBlue: '#3B82F6',
      lineGreen: '#10B981',
      lineRed: '#EF4444',
      lineGrey: '#64748B'
    }, options);
  }

  KarmicSVG.prototype.render = function (data) {
    if (!this.container) return;
    if (!data) return;

    const opt = this.options;
    const w = opt.width;
    const h = opt.height;
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);

    const largeCircleStyle = 'stroke:#FFFFFF;stroke-width:2px;filter:url(#kShadow);cursor:pointer;';
    const largeTextStyle = 'fill:#FFFFFF;font-weight:700;font-family:Segoe UI,sans-serif;font-size:13px;text-anchor:middle;dominant-baseline:central;cursor:pointer;user-select:none;';
    const smallCircleStyle = 'stroke:#FFFFFF;stroke-width:1.5px;filter:url(#kShadow);cursor:pointer;';
    const smallTextStyle = 'font-weight:700;font-family:Segoe UI,sans-serif;font-size:11px;cursor:pointer;user-select:none;text-anchor:middle;dominant-baseline:central;';

    // Üçgen Tepe Noktaları
    // Üçgen 1 (Kişilik - Tepe Yukarı): (cx, 40), (80, h-60), (w-80, h-60)
    const pA = { x: 80, y: h - 60 };
    const pB = { x: cx, y: 50 };
    const pC = { x: w - 80, y: h - 60 };

    // Üçgen 2 (Halef - Tepe Aşağı): (cx, h-40), (80, 70), (w-80, 70)
    const pF = { x: cx, y: h - 50 };
    const pG = { x: 80, y: 80 };
    const pH = { x: w - 80, y: 80 };

    let svg = `
      <svg viewBox="0 0 ${w} ${h}" style="display:block;width:100%;height:auto;max-width:${w}px;margin:0 auto;">
        <defs>
          <filter id="kShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.25"/>
          </filter>
        </defs>

        <!-- Kişilik Üçgeni (Mavi) -->
        <polygon points="${pA.x},${pA.y} ${pB.x},${pB.y} ${pC.x},${pC.y}" fill="rgba(59,130,246,0.06)" stroke="${opt.lineBlue}" stroke-width="2.5" />

        <!-- Halef Üçgeni (Yeşil) -->
        <polygon points="${pG.x},${pG.y} ${pH.x},${pH.y} ${pF.x},${pF.y}" fill="rgba(16,185,129,0.06)" stroke="${opt.lineGreen}" stroke-width="2.5" />

        <!-- Eksenler -->
        <line x1="${cx}" y1="50" x2="${cx}" y2="${h - 50}" stroke="${opt.lineGrey}" stroke-width="1.8" stroke-dasharray="3,3" />
        <line x1="80" y1="${cy}" x2="${w - 80}" y2="${cy}" stroke="${opt.lineGrey}" stroke-width="1.8" stroke-dasharray="3,3" />
    `;

    const node = (x, y, r, fill, code, label, val, isSmall) => {
      const v = typeof val === 'object' && val !== null ? val.Number : val;
      const arcana = global.NumerologyData ? global.NumerologyData.findArcana(v) : null;
      const tip = `${code}: ${v} ${arcana ? '— ' + arcana.name : ''}`;
      return `
        <g class="k-node" data-code="${code}" data-num="${v}" style="cursor:pointer;" onclick="window.NumerologyDefinitions && window.NumerologyDefinitions.show('Arcana', '${v}', '${code} Karmik Noktası: Arkana ${v} — ${arcana ? arcana.name : ''}')">
          <title>${tip} (Detaylı bilgi kartı için tıklayın)</title>
          <circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" style="${isSmall ? smallCircleStyle : largeCircleStyle}" />
          <text x="${x}" y="${y}" style="${isSmall ? smallTextStyle : largeTextStyle}">${v || code}</text>
        </g>
      `;
    };

    // Noktalar
    svg += node(pA.x, pA.y, 20, opt.lineBlue, 'A', 'Gün (Kişilik)', data.A);
    svg += node(pB.x, pB.y, 20, opt.lineBlue, 'B', 'Ay (Kişilik)', data.B);
    svg += node(pC.x, pC.y, 20, opt.lineBlue, 'C', 'Yıl (Kişilik)', data.C);

    svg += node(pF.x, pF.y, 20, opt.lineGreen, 'F', 'Halef Tepe', data.F);
    svg += node(pG.x, pG.y, 20, opt.lineGreen, 'G', 'Halef Sol', data.G);
    svg += node(pH.x, pH.y, 20, opt.lineGreen, 'H', 'Halef Sağ', data.H);

    // Merkez ve Ara Noktalar (D, E, I, K, L, M, N)
    svg += node(cx, cy, 22, opt.lineRed, 'D', 'Merkez Düğüm', data.D);
    svg += node(cx, cy - 65, 14, opt.lineGrey, 'E', 'Üst Merkez', data.E, true);
    svg += node(cx, cy + 65, 14, opt.lineGrey, 'I', 'Alt Merkez', data.I, true);
    svg += node(cx - 75, cy, 14, opt.lineGrey, 'K', 'Sol Merkez', data.K, true);
    svg += node(cx + 75, cy, 14, opt.lineGrey, 'L', 'Sağ Merkez', data.L, true);

    svg += `</svg>`;
    this.container.innerHTML = svg;
  };

  KarmicSVG.render = function (containerId, inputData, options) {
    const chart = new KarmicSVG(containerId, options);
    let data = inputData;
    if (inputData && (inputData.d !== undefined || inputData.y !== undefined)) {
      const engine = global.AstroSushuEngine;
      if (engine && engine.karmicAnalysis) {
        data = engine.karmicAnalysis(inputData.d, inputData.m, inputData.y, inputData.name);
      }
    }
    chart.render(data);
    return chart;
  };

  global.KarmicSVG = KarmicSVG;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));

