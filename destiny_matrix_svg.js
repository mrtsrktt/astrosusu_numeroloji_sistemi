/**
 * Astro Şuşu Numeroloji Sistemi — 22 Arcana Kader Matrisi (Destiny Matrix) SVG Çizici
 * Natalia Ladini uyumlu oktagram (elmas) harita çizimi ve etkileşimli düğümler.
 */
(function (global) {
  'use strict';

  function DestinyMatrixSVG(containerId, options) {
    this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    this.options = Object.assign({
      width: 620,
      height: 620,
      gap: 24,
      perRectColor: '#3B82F6',   // Safir Mavi (Kişisel Kare)
      achRectColor: '#64748B',   // Arduvaz Gri (Soy Karesi)
      centerColor: '#8B5CF6',    // Menekşe / Mor (Merkez)
      loveMoneyColor: '#F97316'  // Turuncu (Aşk & Para)
    }, options);
  }

  DestinyMatrixSVG.prototype.render = function (data) {
    if (!this.container) return;
    if (!data) return;

    const opt = this.options;
    const w = opt.width - opt.gap;
    const h = opt.height - opt.gap;
    const wh = Math.floor(w / 2);
    const hh = Math.floor(h / 2);
    const gapAch = opt.gap + 75;
    const lenAch = w - gapAch;
    const lenK = opt.gap * 3.2;

    const largeCircleStyle = 'stroke:#FFFFFF;stroke-width:2.5px;filter:url(#dmShadow);cursor:pointer;transition:transform 0.2s;';
    const largeTextStyle = 'fill:#FFFFFF;font-weight:700;font-family:Segoe UI,sans-serif;font-size:14px;text-anchor:middle;dominant-baseline:central;cursor:pointer;user-select:none;';
    const smallCircleStyle = 'stroke:#FFFFFF;stroke-width:1.5px;filter:url(#dmShadow);cursor:pointer;';
    const smallTextStyle = 'font-weight:700;font-family:Segoe UI,sans-serif;font-size:11px;cursor:pointer;user-select:none;text-anchor:middle;dominant-baseline:central;';

    let svg = `
      <svg viewBox="0 0 ${opt.width} ${opt.height}" style="display:block;width:100%;height:auto;max-width:${opt.width}px;margin:0 auto;overflow:visible;">
        <defs>
          <filter id="dmShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.25"/>
          </filter>
        </defs>

        <!-- Kişisel Kare (Kişilik, Ruh, Karma, Kader) -->
        <g id="dmPerSquare">
          <line x1="${wh}" y1="${opt.gap}" x2="${opt.gap}" y2="${hh}" stroke="${opt.perRectColor}" stroke-width="2.5" />
          <line x1="${wh}" y1="${opt.gap}" x2="${w}" y2="${hh}" stroke="${opt.perRectColor}" stroke-width="2.5" />
          <line x1="${wh}" y1="${h}" x2="${w}" y2="${hh}" stroke="${opt.perRectColor}" stroke-width="2.5" />
          <line x1="${wh}" y1="${h}" x2="${opt.gap}" y2="${hh}" stroke="${opt.perRectColor}" stroke-width="2.5" />
          <line x1="${opt.gap}" y1="${hh}" x2="${w}" y2="${hh}" stroke="${opt.perRectColor}" stroke-width="2.5" />
          <line x1="${wh}" y1="${opt.gap}" x2="${wh}" y2="${h}" stroke="${opt.perRectColor}" stroke-width="2.5" />
        </g>

        <!-- Soy Karesi (Atalar, Ruh Karması) -->
        <g id="dmAchSquare">
          <line x1="${gapAch}" y1="${gapAch}" x2="${lenAch}" y2="${gapAch}" stroke="${opt.achRectColor}" stroke-width="2.2" stroke-dasharray="4,3" />
          <line x1="${lenAch}" y1="${gapAch}" x2="${lenAch}" y2="${lenAch}" stroke="${opt.achRectColor}" stroke-width="2.2" stroke-dasharray="4,3" />
          <line x1="${lenAch}" y1="${lenAch}" x2="${gapAch}" y2="${lenAch}" stroke="${opt.achRectColor}" stroke-width="2.2" stroke-dasharray="4,3" />
          <line x1="${gapAch}" y1="${gapAch}" x2="${gapAch}" y2="${lenAch}" stroke="${opt.achRectColor}" stroke-width="2.2" stroke-dasharray="4,3" />
          <line x1="${gapAch}" y1="${gapAch}" x2="${lenAch}" y2="${lenAch}" stroke="${opt.achRectColor}" stroke-width="1.8" stroke-dasharray="2,2" />
          <line x1="${lenAch}" y1="${gapAch}" x2="${gapAch}" y2="${lenAch}" stroke="${opt.achRectColor}" stroke-width="1.8" stroke-dasharray="2,2" />
        </g>

        <!-- Aşk & Para Çizgisi -->
        <line x1="${wh + 30}" y1="${hh + 30}" x2="${lenAch - 20}" y2="${hh + 50}" stroke="${opt.loveMoneyColor}" stroke-width="2.5" />

        <!-- Daire Çemberi (Merkez) -->
        <circle cx="${wh}" cy="${hh}" r="${lenK}" fill="none" stroke="${opt.centerColor}" stroke-width="2.5" stroke-dasharray="3,3" />
    `;

    // Helper node renderer
    const node = (x, y, r, fill, stroke, code, label, val, isSmall) => {
      const v = typeof val === 'object' && val !== null ? val.Number : val;
      const arcana = global.NumerologyData ? global.NumerologyData.findArcana(v) : null;
      const tip = `${code}: ${v} ${arcana ? '— ' + arcana.name : ''}`;
      return `
        <g class="dm-node" data-code="${code}" data-num="${v}" style="cursor:pointer;" onclick="window.NumerologyDefinitions && window.NumerologyDefinitions.openModal('${code}: ${arcana ? arcana.name : ''} (${v})', '<div style=\\'line-height:1.7\\'><h4>${code} Noktası: ${v} — ${arcana ? arcana.name : ''}</h4><p><b>Gezegen:</b> ${arcana ? arcana.planet : '-'}<br><b>Burç:</b> ${arcana ? arcana.horoscope : '-'}<br><b>Element:</b> ${arcana ? arcana.element : '-'}</p><p>${arcana ? arcana.desc : ''}</p></div>')">
          <title>${tip}</title>
          <circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" style="${isSmall ? smallCircleStyle : largeCircleStyle}" />
          <text x="${x}" y="${y}" style="${isSmall ? smallTextStyle : largeTextStyle}; fill:${isSmall ? '#ffffff' : '#ffffff'};">${v || code}</text>
        </g>
      `;
    };

    // Ana Noktalar (A, B, C, D, E, F, G, H, I, J)
    svg += node(opt.gap, hh, opt.gap, opt.perRectColor, '#fff', 'A', 'Kişilik (Gün)', data.A);
    svg += node(wh, opt.gap, opt.gap, opt.perRectColor, '#fff', 'B', 'Ruh (Ay)', data.B);
    svg += node(w, hh, opt.gap, opt.perRectColor, '#fff', 'C', 'Karma (Yıl)', data.C);
    svg += node(wh, h, opt.gap, opt.perRectColor, '#fff', 'D', 'Kader (Alt)', data.D);

    // Merkez
    svg += node(wh, hh, opt.gap, opt.centerColor, '#fff', 'E', 'Merkez Konfor', data.E);

    // Köşegen Noktalar (F, G, H, I)
    svg += node(gapAch, gapAch, opt.gap - 2, opt.achRectColor, '#fff', 'F', 'Erkek Soyu Üst', data.F);
    svg += node(lenAch, gapAch, opt.gap - 2, opt.achRectColor, '#fff', 'G', 'Kadın Soyu Üst', data.G);
    svg += node(lenAch, lenAch, opt.gap - 2, opt.achRectColor, '#fff', 'H', 'Kadın Soyu Alt', data.H);
    svg += node(gapAch, lenAch, opt.gap - 2, opt.achRectColor, '#fff', 'I', 'Erkek Soyu Alt', data.I);

    // Kadersel Araç Noktaları (A1, A2, B1, B2, C1, C2, D1, D2)
    const dRad = 11;
    svg += node(opt.gap + 60, hh, dRad, opt.perRectColor, '#fff', 'A2', 'A2', data.A2, true);
    svg += node(opt.gap + 110, hh, dRad, opt.perRectColor, '#fff', 'A1', 'A1', data.A1, true);

    svg += node(wh, opt.gap + 60, dRad, opt.perRectColor, '#fff', 'B2', 'B2', data.B2, true);
    svg += node(wh, opt.gap + 110, dRad, opt.perRectColor, '#fff', 'B1', 'B1', data.B1, true);

    svg += node(w - 60, hh, dRad, opt.perRectColor, '#fff', 'C2', 'C2', data.C2, true);
    svg += node(w - 110, hh, dRad, opt.perRectColor, '#fff', 'C1', 'C1', data.C1, true);

    svg += node(wh, h - 60, dRad, opt.perRectColor, '#fff', 'D2', 'D2', data.D2, true);
    svg += node(wh, h - 110, dRad, opt.perRectColor, '#fff', 'D1', 'D1', data.D1, true);

    svg += `</svg>`;

    this.container.innerHTML = svg;
  };

  DestinyMatrixSVG.render = function (containerId, inputData, options) {
    const chart = new DestinyMatrixSVG(containerId, options);
    let data = inputData;
    if (inputData && (inputData.d !== undefined || inputData.y !== undefined)) {
      const engine = global.AstroSushuEngine;
      if (engine && engine.destinyMatrix) {
        data = engine.destinyMatrix(inputData.d, inputData.m, inputData.y, inputData.name);
      }
    }
    chart.render(data);
    return chart;
  };

  global.DestinyMatrixSVG = DestinyMatrixSVG;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));

