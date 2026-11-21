/*! QORVEX · © 2026 CH Industrial Solutions · Todos los derechos reservados. Software propietario: prohibida su copia, modificación o distribución sin autorización por escrito. Ver LEGAL.md y LICENSE.txt. */
/* =====================================================================
   ess.js — REPORTES · External Sequence Status (reporte de gerencia)
   Hojas del Excel:
     Resumen  CIA × componente: Total QTY (jobs con material) y Missing
              (jobs con SHORTAGE); Days = QTY de Arnés ÷ Rate; Inventory vs day
     Arneses  AOR, Job, LS, CIA, Arnés (rack o SHORTAGE), Estado, Start Date
     Detalle  DATA completo de la cobertura elegida
     Huecos   cortos por CIA: primero Arnés, luego BCM, Gauge, Switch y Key
   Material = on hand, secuenciado, devuelto o ENTREGADO (por caja o por job; lo entregado cuenta).
   Programado: a los días y horas de CONFIG se guarda en Data Base\Reportes
   mientras QORVEX esté abierto en alguna PC (si estaba cerrado, al abrirlo).
   ===================================================================== */
(function (App) {
  const { $, $$, esc, fmtN, toast, pad, show } = App;
  const DIR = 'Reportes', NAME = 'External Sequence Status';
  const SH = () => App.motor.SHORT;
  /** Componentes del reporte: columna de DATA que dice si hay material */
  const RC = [
    { n: 'ARNES', s: 'MSSL', k: 'idArnes', dev: 'idArnes', c: 'FFFF00', t: '000000', ink: 'C9A100' },
    { n: 'BCM', s: 'Stoneridge', k: 'idBcm', dev: 'secBcm', c: 'F4B183', t: '000000', ink: 'E46C0A' },
    { n: 'GAUGE', s: 'Continental', k: 'idCluster', dev: 'secCluster', c: 'A9D08E', t: '000000', ink: '548235' },
    { n: 'SWITCH', s: 'Merit', k: 'idSwCh', dev: 'secSwCh', c: '00B050', t: 'FFFFFF', ink: '00B050' }, // Switch Ch: si hay Ch, hay Gde
    { n: 'KEY', s: 'VSI', k: 'idKey', dev: 'secKey', c: '7030A0', t: 'FFFFFF', ink: '7030A0' },
  ];
  const has = (x, rc) => { const v = x.out[rc.k]; return !!(x.dev && x.dev[rc.dev]) || !!(x.entj && x.entj[rc.k]) || (v != null && v !== '' && v !== SH()); };
  const R0 = { mode: 'all', from: '', to: '' };

  /* ---------- Cobertura ---------- */
  const dayOf = (x) => (typeof x.out.start === 'number' ? Math.floor(x.out.start) : null);
  const todaySerial = () => { const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5 + 25569); };
  function dates(rows) { return [...new Set(rows.map(dayOf).filter((d) => d != null))].sort((a, b) => a - b); }
  function inRange(rows, cov) {
    if (!cov || cov.mode === 'all') return rows;
    const f = Number(cov.from), t = Number(cov.to);
    return rows.filter((x) => { const d = dayOf(x); return d != null && (!f || d >= f) && (!t || d <= t); });
  }
  const covTxt = (cov) => (!cov || cov.mode === 'all' ? 'Todo (como está la operación)' : `Start Date ${cov.from ? App.fSerial(+cov.from) : '…'} a ${cov.to ? App.fSerial(+cov.to) : '…'}`);

  /* ---------- Cálculo ---------- */
  const ciaNum = (v) => { const n = String(v ?? '').replace(/\D/g, ''); return n ? Number(n) : NaN; };
  function compute(rows, cfgR) {
    const cias = cfgR.cias.map((c) => ({ ...c, num: ciaNum(c.c), rows: [] }));
    const other = { n: 'Otras', c: '', rows: [] };
    rows.forEach((x) => { const n = ciaNum(x.base.cia), c = cias.find((k) => k.num === n); (c || other).rows.push(x); });
    if (other.rows.length) cias.push(other);
    const line = (list) => RC.map((rc) => { const q = list.filter((x) => has(x, rc)).length; return { q, m: list.length - q }; });
    const T = cias.map((c) => ({ c, v: line(c.rows) }));
    const tot = line(rows);
    const rate = cfgR.rate;
    return { T, tot, rate, n: rows.length, days: (q) => q / rate };
  }
  const ciaLbl = (c) => (c.c ? `${c.n} (${c.c})` : c.n);

  /* ---------- Excel ---------- */
  const fill = (rgb) => ({ patternType: 'solid', fgColor: { rgb } });
  const B = { top: { style: 'thin', color: { rgb: 'FFFFFF' } }, bottom: { style: 'thin', color: { rgb: 'FFFFFF' } }, left: { style: 'thin', color: { rgb: 'FFFFFF' } }, right: { style: 'thin', color: { rgb: 'FFFFFF' } } };
  const BLUE = '4472C4', HEADS = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: fill('0E2A40'), alignment: { horizontal: 'center' } };
  function cellText(x, k) {
    if (App.ui.BASE.includes(k)) return x.base[k];
    const v = x.out[k];
    if (k === 'start' && typeof v === 'number') return App.fSerial(v);
    if (k === 'estado') return v;
    if (x.entj && x.entj[k]) return 'ENTREGADO';
    if (v === SH() || v === App.motor.PEND) return v;
    if (v != null && v !== '' && App.ent.get(v) && /^(id|sec)[A-Z]/.test(k)) return 'ENTREGADO';
    if (x.dev && x.dev[k]) return `${v} · DEV`;
    return v;
  }
  function arnEstado(x) {
    const v = x.out.idArnes;
    if (x.entj && x.entj.idArnes) return 'Entregado (por job)';
    if (v === SH()) return 'Shortage';
    if (App.ent.get(v)) return 'Entregado';
    if (x.dev && x.dev.idArnes) return 'Devolución';
    return 'On hand';
  }
  function book(rows, cov, cfgR, when) {
    const R = compute(rows, cfgR), wb = XLSX.utils.book_new(), E = XLSX.utils.encode_cell;
    /* Resumen */
    const ws = {}; const set = (r, c, v, s, z) => { ws[E({ r, c })] = { t: typeof v === 'number' ? 'n' : 's', v, s, ...(z ? { z } : {}) }; };
    const merges = [];
    set(0, 0, `${NAME} · ${App.fDT(when)}`, { font: { bold: true, sz: 14, color: { rgb: '0B2A5B' } } });
    set(1, 0, `Cobertura: ${covTxt(cov)} · ${fmtN(R.n)} jobs`, { font: { italic: true, color: { rgb: '5B6472' } } });
    const r0 = 3, cDays = 1 + RC.length * 2;
    set(r0, 0, '', { fill: fill('FFFFFF') });
    RC.forEach((rc, i) => { const c = 1 + i * 2; set(r0, c, `${rc.n} [${rc.s}]`, { font: { bold: true, color: { rgb: rc.t } }, fill: fill(rc.c), alignment: { horizontal: 'center' }, border: B }); set(r0, c + 1, '', { fill: fill(rc.c), border: B }); merges.push({ s: { r: r0, c }, e: { r: r0, c: c + 1 } }); });
    set(r0, cDays, `Rate ${R.rate}`, { font: { bold: true }, fill: fill('FCE4D6'), alignment: { horizontal: 'center' }, border: B });
    const hb = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: fill(BLUE), alignment: { horizontal: 'center' }, border: B };
    set(r0 + 1, 0, 'CIA', hb);
    RC.forEach((_, i) => { set(r0 + 1, 1 + i * 2, 'Total QTY', hb); set(r0 + 1, 2 + i * 2, 'Missing', hb); });
    set(r0 + 1, cDays, 'Days', hb);
    const num = { alignment: { horizontal: 'center' }, border: { bottom: { style: 'thin', color: { rgb: 'D9D9D9' } } } };
    R.T.forEach((t, j) => {
      const r = r0 + 2 + j;
      set(r, 0, ciaLbl(t.c), { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: fill(BLUE), border: B });
      t.v.forEach((v, i) => { if (t.c.rows.length) { set(r, 1 + i * 2, v.q, num); set(r, 2 + i * 2, v.m, { ...num, font: v.m ? { bold: true, color: { rgb: 'C00000' } } : undefined }); } else { set(r, 1 + i * 2, '', num); set(r, 2 + i * 2, '', num); } });
      set(r, cDays, t.c.rows.length ? R.days(t.v[0].q) : 0, num, '0.00');
    });
    const rt = r0 + 2 + R.T.length;
    set(rt, 0, 'TOTAL', { font: { bold: true, color: { rgb: BLUE } } });
    R.tot.forEach((v, i) => { set(rt, 1 + i * 2, v.q, { font: { bold: true, color: { rgb: RC[i].ink } }, alignment: { horizontal: 'center' } }); set(rt, 2 + i * 2, v.m, { font: { bold: true, color: { rgb: RC[i].ink } }, alignment: { horizontal: 'center' } }); });
    set(rt, cDays, R.days(R.tot[0].q), { font: { bold: true }, alignment: { horizontal: 'center' } }, '0.00');
    set(rt + 1, 0, 'Inventory vs day', { font: { italic: true } });
    R.tot.forEach((v, i) => set(rt + 1, 1 + i * 2, R.days(v.q), { fill: fill('EDEDED'), font: { bold: true }, alignment: { horizontal: 'center' } }, '0.00'));
    set(rt + 3, 0, 'Total QTY = jobs con material (on hand, secuenciado, devuelto o entregado) · Missing = jobs con SHORTAGE · Days = Total QTY de Arnés ÷ Rate · SWITCH se toma de Switch Ch', { font: { italic: true, sz: 9, color: { rgb: '7F7F7F' } } });
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rt + 3, c: cDays } });
    ws['!merges'] = merges; ws['!cols'] = [{ wch: 18 }, ...RC.flatMap(() => [{ wch: 11 }, { wch: 10 }]), { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen');
    /* Arneses */
    const byStart = (a, b) => (dayOf(a) ?? 9e9) - (dayOf(b) ?? 9e9) || ciaNum(a.base.ls) - ciaNum(b.base.ls);
    const ar = [...rows].sort(byStart);
    const wa = XLSX.utils.aoa_to_sheet([['AOR', 'Job', 'LS', 'CIA', 'Arnés', 'Estado', 'Start Date'], ...ar.map((x) => [show(x.base.aor), show(x.base.job), show(x.base.ls), show(x.base.cia), x.out.idArnes, arnEstado(x), typeof x.out.start === 'number' ? App.fSerial(x.out.start) : show(x.out.start)])]);
    for (let c = 0; c < 7; c++) wa[E({ r: 0, c })].s = HEADS;
    ar.forEach((x, i) => { if (x.out.idArnes === SH()) { const a = wa[E({ r: i + 1, c: 4 })]; if (a) a.s = { font: { bold: true, color: { rgb: '9B2C2C' } }, fill: fill('F9D4D4') }; } });
    wa['!cols'] = [{ wch: 13 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 13 }, { wch: 12 }, { wch: 12 }];
    wa['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: ar.length, c: 6 } }) };
    XLSX.utils.book_append_sheet(wb, wa, 'Arneses');
    /* Detalle */
    const COLS = App.ui.COLS;
    const wd = XLSX.utils.aoa_to_sheet([COLS.map(([, t]) => t), ...rows.map((x) => COLS.map(([k]) => { const v = cellText(x, k); return v == null ? '' : v; }))]);
    COLS.forEach((_, c) => { wd[E({ r: 0, c })].s = HEADS; });
    rows.forEach((x, i) => COLS.forEach(([k], c) => {
      const a = wd[E({ r: i + 1, c })]; if (!a) return; const v = String(a.v);
      if (v === SH()) a.s = { font: { bold: true, color: { rgb: '9B2C2C' } }, fill: fill('F9D4D4') };
      else if (v === 'ENTREGADO') a.s = { font: { bold: true, color: { rgb: '0F7A43' } }, fill: fill('D7F5E3') };
      else if (/ · DEV$/.test(v)) a.s = { font: { bold: true, color: { rgb: '6B21A8' } }, fill: fill('EDE4FB') };
    }));
    wd['!cols'] = COLS.map(([, t]) => ({ wch: Math.max(9, String(t).length + 2) }));
    wd['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: COLS.length - 1 } }) };
    XLSX.utils.book_append_sheet(wb, wd, 'Detalle');
    /* Huecos: cortos por CIA, primero Arnés, luego el siguiente componente */
    const wh = {}; const hs = (r, c, v, s) => { wh[E({ r, c })] = { t: typeof v === 'number' ? 'n' : 's', v, s }; };
    const HC = ['Componente', 'AOR', 'Job', 'Lineset', 'Start Date'], W = HC.length + 1;
    let maxR = 1;
    const blocks = R.T.filter((t) => t.c.rows.length);
    blocks.forEach((t, b) => {
      const c0 = b * W;
      hs(0, c0, `CORTOS ${t.c.c || t.c.n} · ${t.c.n}`, { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: fill(BLUE) });
      for (let c = 1; c < HC.length; c++) hs(0, c0 + c, '', { fill: fill(BLUE) });
      HC.forEach((h, c) => hs(1, c0 + c, h, HEADS));
      let r = 2;
      RC.forEach((rc) => {
        t.c.rows.filter((x) => !has(x, rc)).sort(byStart).forEach((x) => {
          hs(r, c0, rc.n === 'GAUGE' ? 'Gauge' : rc.n === 'ARNES' ? 'Arnés' : rc.n.charAt(0) + rc.n.slice(1).toLowerCase(), { font: { bold: true, color: { rgb: rc.ink } } });
          hs(r, c0 + 1, show(x.base.aor)); hs(r, c0 + 2, show(x.base.job)); hs(r, c0 + 3, show(x.base.ls)); hs(r, c0 + 4, typeof x.out.start === 'number' ? App.fSerial(x.out.start) : show(x.out.start));
          r++;
        });
      });
      if (r === 2) { hs(2, c0, 'Sin cortos', { font: { italic: true, color: { rgb: '0F7A43' } } }); r = 3; }
      maxR = Math.max(maxR, r);
    });
    if (!blocks.length) hs(0, 0, 'Sin jobs en la cobertura elegida');
    wh['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: Math.max(1, blocks.length * W - 1) } });
    wh['!cols'] = blocks.flatMap(() => [{ wch: 12 }, { wch: 13 }, { wch: 10 }, { wch: 9 }, { wch: 12 }, { wch: 3 }]);
    XLSX.utils.book_append_sheet(wb, wh, 'Huecos');
    return { bytes: App.xl.serialize(wb, 'ess.xlsx'), R };
  }

  /* ---------- Guardar ---------- */
  const stampD = (d) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
  /** Guarda bytes con el explorador (o descarga si el navegador no lo permite) */
  App.saveBytes = async function (bytes, fname) {
    let handle = null;
    if (typeof window.showSaveFilePicker === 'function') {
      try { handle = await window.showSaveFilePicker({ suggestedName: fname, startIn: 'documents', types: [{ description: 'Libro de Excel', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }] }); }
      catch (e) { if (e.name === 'AbortError') return false; toast(App.fs.explain(e), 'err'); return false; }
    }
    try {
      if (handle) { await App.fs.writeFile(handle, bytes); toast(`Exportado: ${handle.name}`, 'ok', 5000); }
      else { XLSX.writeFile(XLSX.read(bytes, { type: 'array' }), fname); toast(`Descargado: ${fname}`, 'ok', 5000); }
      return true;
    } catch (e) { toast(`No se pudo exportar: ${e.message}`, 'err', 6000); return false; }
  };
  async function repDir(create) { return App.S.dir.getDirectoryHandle(DIR, { create: !!create }); }
  async function saveToFolder(bytes, name) {
    if (!(await App.fs.ensurePermission(App.S.dir))) throw new Error('No se autorizó la escritura en la carpeta.');
    const d = await repDir(true), fh = await d.getFileHandle(name, { create: true }), w = await fh.createWritable();
    try { await w.write(bytes); await w.close(); } catch (e) { try { await w.abort(); } catch (x) {} throw e; }
  }
  async function listReports() {
    try { const d = await repDir(false), out = []; for await (const [n, h] of d.entries()) if (h.kind === 'file' && /\.xlsx$/i.test(n)) { const f = await h.getFile(); out.push({ n, h, lm: f.lastModified }); } return out.sort((a, b) => b.lm - a.lm); }
    catch (e) { return []; }
  }

  /* ---------- Programación ---------- */
  const hhmm = (t) => t.replace(':', '');
  const slotName = (d, t) => `${NAME} ${stampD(d)} ${hhmm(t)}.xlsx`;
  /** Último horario de hoy que ya pasó y aún no tiene archivo */
  function dueSlot(cfgR, now = new Date()) {
    if (!cfgR.on || !cfgR.times.length || !cfgR.days.includes(now.getDay())) return null;
    const nowHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const past = cfgR.times.filter((t) => t <= nowHM);
    return past.length ? past[past.length - 1] : null;
  }
  function nextRun(cfgR, from = new Date()) {
    if (!cfgR.on || !cfgR.times.length || !cfgR.days.length) return null;
    for (let i = 0; i < 8; i++) {
      const d = new Date(from); d.setDate(d.getDate() + i);
      if (!cfgR.days.includes(d.getDay())) continue;
      const t = cfgR.times.find((x) => i > 0 || x > `${pad(from.getHours())}:${pad(from.getMinutes())}`);
      if (t) { const [h, m] = t.split(':').map(Number); d.setHours(h, m, 0, 0); return d; }
    }
    return null;
  }
  /** Cruce fresco para el reporte programado (sin tocar lo que el usuario tiene en pantalla) */
  async function freshRows() {
    const S = App.S;
    try { await App.ent.load(); } catch (e) {}
    try { await App.dev.load(); } catch (e) {}
    for (const k of ['val', 'seq']) {
      const L = S.L[k];
      if (L && !S.dirty[k] && !L.dirty && L.t.rows.length === L.n0) { try { await App.loadRole(k); } catch (e) { console.warn(e); } }
    }
    if (!S.L.planes || !S.L.val || !S.L.seq) return S.result ? S.result.rows : null;
    return App.motor.run({ planes: S.L.planes.t, val: App.srcs('val').map((L) => L.t), seq: App.srcs('seq').map((L) => L.t), pulls: S.pulls, dev: App.dev.recs }).rows;
  }
  let running = false;
  async function tick() {
    const S = App.S;
    if (running || !S.dir || !App.auth.user() || !S.L.planes) return;
    const cfgR = App.cfg.get().report, now = new Date(), t = dueSlot(cfgR, now); if (!t) return;
    const name = slotName(now, t), key = `qx_ess_${name}`;
    try { if (localStorage.getItem(key)) return; } catch (e) {}
    running = true;
    try {
      const list = await listReports();
      if (list.some((f) => f.n === name)) { try { localStorage.setItem(key, '1'); } catch (e) {} return; }
      const rows = await freshRows(); if (!rows) return;
      const cov = cfgR.cover === 'days' ? { mode: 'range', from: todaySerial(), to: todaySerial() + cfgR.coverDays - 1 } : { mode: 'all' };
      const { bytes } = book(inRange(rows, cov), cov, cfgR, now);
      await saveToFolder(bytes, name);
      try { localStorage.setItem(key, '1'); } catch (e) {}
      toast(`Reporte programado guardado: ${DIR}\\${name}`, 'ok', 8000);
      if (document.querySelector('#essList')) render(document.querySelector('#main'));
    } catch (e) { toast(`No se pudo generar el reporte programado: ${e.message}`, 'err', 8000); }
    finally { running = false; }
  }
  setInterval(tick, 30000);
  setTimeout(tick, 8000);

  /* ---------- Pantalla REPORTES ---------- */
  function render(m) {
    const S = App.S, R = S.result, cfgR = App.cfg.get().report;
    if (!R) { m.innerHTML = `<div class="empty">Primero ejecuta el cruce en <b>INICIO</b> o <b>DATA</b>.</div>`; return; }
    const ds = dates(R.rows);
    if (R0.mode === 'range') { if (!R0.from) R0.from = String(ds[0] || ''); if (!R0.to) R0.to = String(ds[ds.length - 1] || ''); }
    const rows = inRange(R.rows, R0), C = compute(rows, cfgR), nr = nextRun(cfgR);
    const opt = (sel) => ds.map((d) => `<option value="${d}" ${String(sel) === String(d) ? 'selected' : ''}>${App.fSerial(d)}</option>`).join('');
    const DN = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    m.innerHTML = `
      <div class="ptitle"><h1>REPORTES <small>External Sequence Status</small></h1><span class="muted">${esc(App.ent.info())}</span><span class="sp"></span>
        <button class="btn" id="esSave" title="Guarda el Excel en Data Base\\${DIR}">Guardar en ${DIR}</button><button class="btn primary" id="esDl">Descargar Excel…</button></div>
      <div class="dpanel"><div class="dph"><h3>Cobertura</h3><span class="muted small">${fmtN(rows.length)} jobs · Rate ${fmtN(cfgR.rate)}</span></div>
        <div class="filters" style="margin:0">
          <label class="opt-inline"><input type="radio" name="esm" value="all" ${R0.mode === 'all' ? 'checked' : ''}> Todo (como está la operación)</label>
          <label class="opt-inline"><input type="radio" name="esm" value="range" ${R0.mode === 'range' ? 'checked' : ''}> Start Date de</label>
          <select class="input" id="esF" ${R0.mode === 'range' ? '' : 'disabled'}>${opt(R0.from)}</select><span>a</span><select class="input" id="esT" ${R0.mode === 'range' ? '' : 'disabled'}>${opt(R0.to)}</select>
        </div></div>
      <div class="dpanel"><div class="dph"><h3>Resumen para gerencia</h3><span class="muted small">Total QTY = jobs con material · Missing = jobs con SHORTAGE · Days = Arnés ÷ Rate</span></div>
        <div class="tw2"><table class="ess">
          <thead><tr><th class="e0"></th>${RC.map((rc) => `<th colspan="2" style="background:#${rc.c};color:#${rc.t}">${rc.n} [${rc.s}]</th>`).join('')}<th class="rate">Rate ${fmtN(cfgR.rate)}</th></tr>
          <tr class="h2"><th>CIA</th>${RC.map(() => '<th>Total QTY</th><th>Missing</th>').join('')}<th>Days</th></tr></thead>
          <tbody>${C.T.map((t) => `<tr><th>${esc(ciaLbl(t.c))}</th>${t.v.map((v) => (t.c.rows.length ? `<td>${fmtN(v.q)}</td><td class="${v.m ? 'miss' : ''}">${fmtN(v.m)}</td>` : '<td></td><td></td>')).join('')}<td>${t.c.rows.length ? C.days(t.v[0].q).toFixed(2) : '0.00'}</td></tr>`).join('')}
          <tr class="tot"><th>TOTAL</th>${C.tot.map((v, i) => `<td style="color:#${RC[i].ink}">${fmtN(v.q)}</td><td style="color:#${RC[i].ink}">${fmtN(v.m)}</td>`).join('')}<td>${C.days(C.tot[0].q).toFixed(2)}</td></tr>
          <tr class="ivd"><th>Inventory vs day</th>${C.tot.map((v) => `<td class="g">${C.days(v.q).toFixed(2)}</td><td></td>`).join('')}<td></td></tr></tbody></table></div>
        <p class="muted small" style="margin:8px 0 0">El Excel lleva además las hojas <b>Arneses</b> (todos con su rack o SHORTAGE), <b>Detalle</b> (DATA completo) y <b>Huecos</b> (cortos por CIA: primero Arnés, luego BCM, Gauge, Switch y Key).</p></div>
      <div class="dgrid cfg2">
        <div class="dpanel"><div class="dph"><h3>Programación</h3>${App.auth.isAdmin() ? '<button class="btn sm" id="esCfg">Cambiar en CONFIG</button>' : ''}</div>
          <p class="essp">${cfgR.on && cfgR.times.length && cfgR.days.length ? `Se guarda solo en <b>Data Base\\${DIR}</b> los <b>${cfgR.days.map((d) => DN.at(d)).join(', ')}</b> a las <b>${cfgR.times.join(', ')}</b> · cobertura: ${cfgR.cover === 'days' ? `desde hoy, ${cfgR.coverDays} día(s)` : 'todo'}.` : 'Sin programación activa.'}</p>
          ${nr ? `<p class="muted small">Próxima ejecución: <b>${App.fDT(nr.getTime())}</b>. Requiere que QORVEX esté abierto con sesión en alguna PC; si estaba cerrado, se genera al abrirlo ese mismo día.</p>` : ''}</div>
        <div class="dpanel"><div class="dph"><h3>Reportes guardados</h3><span class="muted small">Data Base\\${DIR}</span></div><div id="essList" class="muted small">Leyendo…</div></div>
      </div>`;
    $$('input[name=esm]').forEach((i) => (i.onchange = () => { R0.mode = i.value; render(m); }));
    $('#esF').onchange = (e) => { R0.from = e.target.value; if (+R0.to < +R0.from) R0.to = R0.from; render(m); };
    $('#esT').onchange = (e) => { R0.to = e.target.value; if (+R0.to < +R0.from) R0.from = R0.to; render(m); };
    if ($('#esCfg')) $('#esCfg').onclick = () => App.ui.go('config');
    const make = () => book(rows, { ...R0 }, cfgR, new Date());
    $('#esDl').onclick = async () => { if (!rows.length) return toast('No hay jobs en esa cobertura', 'warn'); await App.saveBytes(make().bytes, `${NAME} ${stampD(new Date())}.xlsx`); };
    $('#esSave').onclick = async () => {
      if (!rows.length) return toast('No hay jobs en esa cobertura', 'warn');
      const d = new Date(), name = `${NAME} ${stampD(d)} ${pad(d.getHours())}${pad(d.getMinutes())}.xlsx`;
      try { await saveToFolder(make().bytes, name); toast(`Guardado: ${DIR}\\${name}`, 'ok', 6000); render(m); } catch (e) { toast(e.message, 'err', 6000); }
    };
    listReports().then((list) => {
      const el = $('#essList'); if (!el) return;
      el.innerHTML = list.length ? `<table class="t mini"><tbody>${list.slice(0, 12).map((f, i) => `<tr><td>${esc(f.n)}</td><td class="muted">${App.fDT(f.lm)}</td><td><button class="btn sm" data-ess="${i}">Descargar</button></td></tr>`).join('')}</tbody></table>` : 'Aún no hay reportes guardados.';
      $$('[data-ess]', el).forEach((b) => (b.onclick = async () => { const f = list[+b.dataset.ess], file = await f.h.getFile(); const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = f.n; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }));
    });
  }

  App.ess = { render, book, compute, inRange, dates, dueSlot, nextRun, tick, slotName, NAME, DIR, RC };
})(window.App);
