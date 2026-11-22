/* Yak-élec-pro – exportations SVG / PNG / PDF */
(function (g) {
  'use strict';
  const EE = g.EE;
  const safe = (s) => (s || 'schema').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'schema';

  function svgBlob(project) { return new Blob([EE.Render.standalone(project).svg], { type: 'image/svg+xml' }); }

  function canvasOf(project, scale) {
    const { svg, width, height } = EE.Render.standalone(project);
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement('canvas'); cv.width = Math.round(width * scale); cv.height = Math.round(height * scale);
        const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url); res(cv);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Rendu de l\'image impossible.')); };
      img.src = url;
    });
  }
  const toBlob = (cv, type, q) => new Promise((res) => cv.toBlob(res, type, q));

  async function pngBlob(project, scale = 2) { return toBlob(await canvasOf(project, scale), 'image/png'); }

  function ascii(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '?').replace(/([()\\])/g, '\\$1'); }

  // PDF (page A4, image JPEG haute résolution du schéma + métadonnées)
  async function pdfBlob(project) {
    const cv = await canvasOf(project, 3);
    const jpg = await toBlob(cv, 'image/jpeg', 0.92);
    const jb = new Uint8Array(await jpg.arrayBuffer());
    const wpx = cv.width, hpx = cv.height, land = wpx >= hpx, PW = land ? 842 : 595, PH = land ? 595 : 842, m = 28;
    const sc = Math.min((PW - 2 * m) / wpx, (PH - 2 * m) / hpx), dw = wpx * sc, dh = hpx * sc, dx = (PW - dw) / 2, dy = (PH - dh) / 2;
    const enc = new TextEncoder(); const chunks = []; let off = 0; const xref = [];
    const push = (b) => { const u = typeof b === 'string' ? enc.encode(b) : b; chunks.push(u); off += u.length; };
    const obj = (n, body) => { xref[n] = off; push(`${n} 0 obj\n${body}\nendobj\n`); };
    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'.replace(/[^\x00-\x7f]/g, '')); push('%\x80\x80\x80\x80\n'.replace(/[^\x00-\x7f]/g, ''));
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 5 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 4 0 R >>`);
    const content = `q ${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${dx.toFixed(2)} ${dy.toFixed(2)} cm /Im0 Do Q`;
    obj(4, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    xref[5] = off; push(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${wpx} /Height ${hpx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jb.length} >>\nstream\n`); push(jb); push('\nendstream\nendobj\n');
    obj(6, `<< /Title (${ascii(project.name)}) /Producer (Yak-élec-pro ${EE.VERSION}) /Creator (Yak-élec-pro) >>`);
    const xo = off; let x = `xref\n0 7\n0000000000 65535 f \n`;
    for (let i = 1; i <= 6; i++) x += String(xref[i]).padStart(10, '0') + ' 00000 n \n';
    push(x + `trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xo}\n%%EOF\n`);
    return new Blob(chunks, { type: 'application/pdf' });
  }

  function download(name, blob) {
    if (g.YakAndroid && g.YakAndroid.saveBase64) { // application Android : enregistrement via le pont natif
      const fr = new FileReader(); fr.onload = () => { try { g.YakAndroid.saveBase64(name, String(fr.result).split(',')[1] || '', blob.type || 'application/octet-stream'); } catch (e) { /* ignore */ } }; fr.readAsDataURL(blob); return;
    }
    const a = document.createElement('a'); a.download = name; a.href = URL.createObjectURL(blob); document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  EE.Export = { safe, svgBlob, pngBlob, pdfBlob, download,
    async run(kind, project) {
      const base = safe(project.name);
      if (kind === 'svg') download(base + '.svg', svgBlob(project));
      else if (kind === 'png') download(base + '.png', await pngBlob(project, 2));
      else if (kind === 'pdf') download(base + '.pdf', await pdfBlob(project));
      else if (kind === 'json') download(base + '.eep.json', new Blob([EE.Store.Projects.exportJSON(project.id)], { type: 'application/json' }));
    } };
})(window);
