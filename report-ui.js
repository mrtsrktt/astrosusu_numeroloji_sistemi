// Shared authenticated report controls. All credit values come from the server.
window.ReportUI = {
  async json(url, options) {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'İşlem tamamlanamadı.');
    return data;
  },
  async credits(target) {
    try {
      const c = await this.json('/api/reports/credits');
      if (!target.isConnected) return;
      target.textContent = `Kullanılan: ${c.used} · Kalan: ${c.remaining} / ${c.total}` +
        (c.reserved ? ` · Ayrılmış: ${c.reserved}` : '') +
        (!c.canGenerate ? ' · Yeni üretim kapalı' : '');
    } catch (e) { if (target.isConnected) target.textContent = e.message; }
  },
  async analysis(target, analysisId) {
    if (!target || !analysisId) return;
    if (!document.getElementById('report-pending-styles')) {
      const style = document.createElement('style');
      style.id = 'report-pending-styles';
      style.textContent = `
        .report-pending { display:flex; align-items:center; gap:9px; min-width:0; max-width:100%; }
        .report-pending-ring { width:16px; height:16px; flex:0 0 16px; border:2px solid #b58060; border-top-color:#633c60; border-right-color:transparent; border-radius:50%; animation:report-pending-spin 1.4s linear infinite; }
        .report-pending-button { cursor:wait; white-space:normal; text-align:left; }
        @keyframes report-pending-spin { to { transform:rotate(360deg); } }
        @media (prefers-reduced-motion:reduce) { .report-pending-ring { animation:none; } }
      `;
      document.head.append(style);
    }
    target.dataset.analysisId = analysisId;
    const pending = (reserved = false) => {
      // Keep the same live region during polling: announce only on state entry.
      if (target.dataset.pdfState === 'pending') return;
      target.dataset.pdfState = 'pending';
      const status = document.createElement('div');
      status.className = 'report-pending';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.setAttribute('aria-atomic', 'true');
      const ring = document.createElement('span');
      ring.className = 'report-pending-ring'; ring.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span');
      status.append(ring, text);
      const button = document.createElement('button');
      button.className = 'btn-sm report-pending-button';
      button.disabled = true; button.textContent = 'Yorum PDF’si oluştur';
      const note = document.createElement('p');
      note.style.cssText = 'font-size:13px;line-height:1.5;margin:0';
      note.textContent = 'Hazır olduğunda indirme bağlantısı burada görünecek.';
      if (reserved) note.title = 'Bir kredi ayrıldı. PDF doğrulanınca kullanım kesinleşir.';
      const group = document.createElement('div');
      group.append(status, note);
      target.replaceChildren(group, button);
      text.textContent = 'Yorum PDF’si hazırlanıyor…';
    };
    const refresh = async () => {
      try {
        const [items, c] = await Promise.all([this.json('/api/reports'), this.json('/api/reports/credits')]);
        if (!target.isConnected) return;
        const r = items.find(x => String(x.analysisId) === String(analysisId));
        if (r?.status === 'pending') {
          pending(true);
          setTimeout(() => { if (target.isConnected) refresh(); }, 1500);
          return;
        }
        target.dataset.pdfState = r?.status || 'idle';
        target.replaceChildren();
        const note = document.createElement('p');
        note.style.cssText = 'font-size:13px;line-height:1.5;margin:0 0 10px';
        const button = document.createElement(r?.status === 'ready' ? 'a' : 'button');
        button.className = 'btn-sm';
        if (r?.status === 'ready') {
          note.textContent = r.isSample ? 'Örnek PDF · Tekrar indirmek kredi kullanmaz.' : 'Tekrar indirmek kredi kullanmaz.';
          button.textContent = 'PDF’yi indir';
          button.href = r.downloadUrl;
        } else {
          note.textContent = (r ? 'Önceki istek tamamlanamadı; kredi kullanılmadı. ' : '') +
            (c.canGenerate ? `${c.isSample ? 'Örnek PDF · ' : 'Bütünsel analiz · '}Oluşturmadan önce onayınızla 1 PDF kredisi kullanılacak.` : 'Yeni üretim için aktif rapor paketi, kullanılabilir kredi ve açık PDF üretim modu gerekir.');
          button.textContent = 'Yorum PDF’si oluştur'; button.disabled = !c.canGenerate;
          button.onclick = async () => {
            if (!confirm('Bu işlem döneminizden 1 PDF kredisi kullanır. Devam edilsin mi?')) return;
            pending();
            try { await this.json(`/api/history/${analysisId}/report`, { method: 'POST' }); await refresh(); }
            catch (e) {
              if (!target.isConnected) return;
              target.dataset.pdfState = 'failed';
              note.textContent = e.message; button.disabled = !c.canGenerate;
              target.replaceChildren(note, button);
            }
          };
        }
        target.append(note, button);
      } catch (e) {
        if (target.isConnected) { target.dataset.pdfState = 'failed'; target.textContent = e.message; }
      }
    };
    await refresh();
  }
};
