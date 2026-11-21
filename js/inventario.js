/*! QORVEX · © 2026 CH Industrial Solutions · Todos los derechos reservados. Software propietario: prohibida su copia, modificación o distribución sin autorización por escrito. Ver LEGAL.md y LICENSE.txt. */
/* =====================================================================
   inventario.js — INVENTARIO para confirmación física
   Inventario = lo capturado (Validado, Secuenciado, Devuelto) cuya caja
   NO aparece en Entregas.xlsx.
   - Validado: solo mientras el job no se haya secuenciado en ese componente
     (al secuenciarse pasa a su rack de secuencia). Arnés no se secuencia.
   - Devuelto: caja de devolución todavía no entregada.
   Exporta un Excel con una hoja por componente, ordenado por contenedor,
   con subtotal por contenedor y una columna para palomear en físico.
   ===================================================================== */
(function (App) {
  const { $, $$, esc, fmtN, toast, normKey, normComp, show } = App;
  const COMPS = [['ARNES', 'Arnés'], ['BCM', 'BCM'], ['CLUSTER', 'Cluster'], ['SWGDE', 'Switch Gde'], ['SWCH', 'Switch Ch'], ['KEY', 'Llaves']];
  const CN = Object.fromEntries(COMPS);
  const TY = { val: 'Validado', seq: 'Secuenciado', dev: 'Devuelto' };
  const F = { ty: '', comp: '', q: '' };

  /** Arma el inventario actual */
  function build() {
    const S = App.S, cap = App.cap.recs || {}, devs = (App.dev && App.dev.recs) || [];
    const plan = new Map(); (S.result ? S.result.rows : []).forEach((x) => { if (x.jobKey && !plan.has(x.jobKey)) plan.set(x.jobKey, x.base); });
    const deliv = (c) => !!(c && App.ent && App.ent.get(c));
    const seqKeys = new Set((cap.seq || []).map((r) => `${normKey(r.job)}|${normComp(r.comp)}`));
    // Entregas por job: lo capturado ANTES de la entrega ya salió del almacén
    const entTs = new Map(); ((App.dev && App.dev.ents) || []).forEach((e) => { const k = `${e.job}|${e.compN}`; entTs.set(k, Math.max(entTs.get(k) || 0, e.ts || 0)); });
    const out = [];
    const add = (r, ty) => {
      const job = normKey(r.job), comp = normComp(r.comp), cont = String(r.cont || '').trim().toUpperCase();
      if (!job || !comp || !cont || deliv(cont)) return;
      if (ty === 'val' && seqKeys.has(`${job}|${comp}`)) return; // ya se secuenció: está en su rack
      const et = entTs.get(`${job}|${comp}`); if (et != null && (r.ts || 0) <= et) return; // entregado por job
      const b = plan.get(job) || {};
      out.push({ ty, comp, cont, job: r.job, jobKey: job, aor: b.aor ?? '', ls: b.ls ?? '', cia: b.cia ?? '', fecha: `${r.fecha || ''} ${String(r.hora || '').slice(0, 5)}`.trim(), ts: r.ts || 0, emp: r.emp || '', name: r.name || '', dev: r.dev || '', inPlan: plan.has(job) });
    };
    (cap.val || []).forEach((r) => add(r, 'val'));
    (cap.seq || []).forEach((r) => add(r, 'seq'));
    devs.forEach((r) => add(r, 'dev'));
    const ord = Object.fromEntries(COMPS.map(([k], i) => [k, i]));
    out.sort((a, b) => ord[a.comp] - ord[b.comp] || a.cont.localeCompare(b.cont, 'es', { numeric: true }) || String(a.job).localeCompare(String(b.job), 'es', { numeric: true }));
    return out;
  }

  /** Resumen componente × tipo: jobs y contenedores */
  function summary(list) {
    const m = {};
    COMPS.forEach(([k]) => { m[k] = { val: [0, new Set()], seq: [0, new Set()], dev: [0, new Set()], tot: [0, new Set()] }; });
    list.forEach((x) => { const e = m[x.comp]; if (!e) return; e[x.ty][0]++; e[x.ty][1].add(x.cont); e.tot[0]++; e.tot[1].add(`${x.ty}|${x.cont}`); });
    return m;
  }

  function render(m) {
    const S = App.S;
    if (!S.L.val || !S.L.seq) { m.innerHTML = `<div class="empty">Primero carga los archivos y ejecuta el cruce en <b>INICIO</b>.</div>`; return; }
    const all = build(), sm = summary(all);
    const list = all.filter((x) => (!F.ty || x.ty === F.ty) && (!F.comp || x.comp === F.comp) && (!F.q || `${x.cont} ${x.job} ${x.aor}`.toUpperCase().includes(F.q.toUpperCase())));
    const cell = (a) => (a[0] ? `<b>${fmtN(a[0])}</b> <span class="muted small">jobs · ${fmtN(a[1].size)} cont.</span>` : '<span class="muted">—</span>');
    m.innerHTML = `
      <div class="ptitle"><h1>INVENTARIO <small>Confirmación física</small></h1><span class="muted">Lo capturado cuya caja no aparece en ${esc(App.ent.NAME)} ni se entregó por job · ${esc(App.ent.info())}</span><span class="sp"></span>
        <button class="btn" id="ivRe">Actualizar</button><button class="btn primary" id="ivExp">Exportar para conteo físico…</button></div>
      <div class="dpanel"><div class="dph"><h3>Resumen por componente</h3><span class="muted small">${fmtN(all.length)} jobs en almacén</span></div>
        <div class="tw2"><table class="t inv-sum"><thead><tr><th>Componente</th><th>Validado</th><th>Secuenciado</th><th>Devuelto</th><th>Total</th></tr></thead><tbody>
        ${COMPS.map(([k, n]) => `<tr data-c="${k}" class="${F.comp === k ? 'sel' : ''}"><td><b>${esc(n)}</b></td><td>${cell(sm[k].val)}</td><td>${cell(sm[k].seq)}</td><td>${cell(sm[k].dev)}</td><td>${cell(sm[k].tot)}</td></tr>`).join('')}
        </tbody></table></div></div>
      <div class="filters">
        <input class="input grow" id="ivQ" placeholder="Buscar contenedor, job o AOR" value="${esc(F.q)}">
        <select class="input" id="ivT"><option value="">Tipo: todos</option>${Object.entries(TY).map(([k, t]) => `<option value="${k}" ${F.ty === k ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <select class="input" id="ivC"><option value="">Componente: todos</option>${COMPS.map(([k, n]) => `<option value="${k}" ${F.comp === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
        <span class="muted small">${fmtN(list.length)} jobs · ${fmtN(new Set(list.map((x) => `${x.ty}|${x.cont}`)).size)} contenedores</span>
      </div>
      <div class="dpanel" style="padding:0"><div class="tw2 inv-list"><table class="t"><thead><tr><th>Componente</th><th>Contenedor</th><th>Tipo</th><th>Job</th><th>AOR</th><th>LS</th><th>Cia</th><th>Fecha</th><th>Capturista</th><th>Equipo</th></tr></thead><tbody>
        ${list.slice(0, 800).map((x) => `<tr><td>${esc(CN[x.comp])}</td><td><b>${esc(x.cont)}</b></td><td><span class="ivt ${x.ty}">${TY[x.ty]}</span></td><td class="b">${esc(show(x.job))}</td><td>${esc(show(x.aor))}${x.inPlan ? '' : '<span class="muted small" title="El job no está en el Plan cargado"> · fuera del plan</span>'}</td><td>${esc(show(x.ls))}</td><td>${esc(show(x.cia))}</td><td>${esc(x.fecha)}</td><td>${esc(x.name || x.emp)}</td><td>${esc(x.dev)}</td></tr>`).join('') || '<tr><td colspan="10" class="muted">Sin inventario con estos filtros.</td></tr>'}
      </tbody></table>${list.length > 800 ? `<div class="muted small" style="padding:8px">Se muestran 800 de ${fmtN(list.length)}; el Excel lleva todo.</div>` : ''}</div></div>`;
    const re = () => render(m);
    $('#ivQ').oninput = (e) => { F.q = e.target.value; clearTimeout(re.t); re.t = setTimeout(() => { re(); const i = $('#ivQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); };
    $('#ivT').onchange = (e) => { F.ty = e.target.value; re(); };
    $('#ivC').onchange = (e) => { F.comp = e.target.value; re(); };
    $$('.inv-sum tbody tr').forEach((tr) => (tr.onclick = () => { F.comp = F.comp === tr.dataset.c ? '' : tr.dataset.c; re(); }));
    $('#ivRe').onclick = async () => { await App.busy('Actualizando…', async () => { try { await App.dev.load(); } catch (e) {} try { await App.ent.load(true); } catch (e) {} }); re(); };
    $('#ivExp').onclick = () => exportDialog(all);
  }

  /* ---------- Exportar ---------- */
  async function exportDialog(all) {
    const c = (t) => fmtN(all.filter((x) => !t || x.ty === t).length);
    const pick = await App.modal({ title: 'Exportar inventario para conteo físico', body: `
      <p>¿Qué quieres imprimir?</p>
      <div class="opt-list">
        <label class="opt"><input type="radio" name="iv" value="val"><span>Validación</span><small>${c('val')} jobs</small></label>
        <label class="opt"><input type="radio" name="iv" value="seq"><span>Secuenciado</span><small>${c('seq')} jobs</small></label>
        <label class="opt"><input type="radio" name="iv" value="dev"><span>Devuelto</span><small>${c('dev')} jobs</small></label>
        <label class="opt"><input type="radio" name="iv" value="" checked><span>Todos</span><small>${c('')} jobs</small></label>
      </div>
      <p class="muted small">Una hoja por componente, ordenada por contenedor, con subtotal por contenedor y la columna <b>Físico</b> para palomear.</p>`,
      buttons: [{ t: 'Cancelar', v: null }, { t: 'Exportar…', cls: 'primary', fn: (el) => ({ v: $('input[name=iv]:checked', el).value }) }] });
    if (!pick) return;
    const list = all.filter((x) => !pick.v || x.ty === pick.v);
    if (!list.length) return toast('No hay inventario de ese tipo', 'warn');
    const d = new Date(), p2 = App.pad;
    const fname = `Inventario ${pick.v ? TY[pick.v] : 'Todos'} ${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()} ${p2(d.getHours())}-${p2(d.getMinutes())}.xlsx`;
    await App.saveBytes(workbook(list, pick.v), fname);
  }

  const S_HEAD = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { patternType: 'solid', fgColor: { rgb: '0E2A40' } }, alignment: { horizontal: 'center' }, border: { bottom: { style: 'thin', color: { rgb: '0E2A40' } } } };
  const S_SUB = { font: { bold: true, color: { rgb: '0B2A5B' } }, fill: { patternType: 'solid', fgColor: { rgb: 'E7EEF9' } } };
  const S_TIT = { font: { bold: true, sz: 14, color: { rgb: '0B2A5B' } } };
  const S_BOX = { alignment: { horizontal: 'center' }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } };

  function workbook(list, ty) {
    const wb = XLSX.utils.book_new(), now = App.fDT(Date.now());
    // Resumen
    const sm = summary(list);
    const rs = [[`Inventario QORVEX · ${ty ? TY[ty] : 'Todos'}`], [`Generado ${now} · lo capturado que no aparece en ${App.ent.NAME}`], [], ['Componente', 'Validado (jobs)', 'Secuenciado (jobs)', 'Devuelto (jobs)', 'Total jobs', 'Contenedores']];
    COMPS.forEach(([k, n]) => { const e = sm[k]; rs.push([n, e.val[0], e.seq[0], e.dev[0], e.tot[0], e.tot[1].size]); });
    const ws0 = XLSX.utils.aoa_to_sheet(rs);
    ws0.A1.s = S_TIT; for (let c = 0; c < 6; c++) ws0[XLSX.utils.encode_cell({ r: 3, c })].s = S_HEAD;
    ws0['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws0, 'Resumen');
    // Una hoja por componente
    const H = ['Contenedor', 'Tipo', 'Job', 'AOR', 'LS', 'CIA', 'Fecha', 'Capturista', 'Físico ✓'];
    COMPS.forEach(([k, n]) => {
      const rows = list.filter((x) => x.comp === k); if (!rows.length) return;
      const aoa = [[`${n} · ${ty ? TY[ty] : 'Todos'} · ${now}`], H], st = [];
      let i = 0;
      while (i < rows.length) {
        const key = `${rows[i].ty}|${rows[i].cont}`, start = i;
        while (i < rows.length && `${rows[i].ty}|${rows[i].cont}` === key) { const x = rows[i]; aoa.push([x.cont, TY[x.ty], x.job, x.aor, x.ls, x.cia, x.fecha, x.name || x.emp, '']); i++; }
        aoa.push([`Total ${rows[start].cont}`, TY[rows[start].ty], `${i - start} jobs`, '', '', '', '', '', '']); st.push(aoa.length - 1);
      }
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws.A1.s = S_TIT;
      H.forEach((_, c) => { ws[XLSX.utils.encode_cell({ r: 1, c })].s = S_HEAD; });
      st.forEach((r) => H.forEach((_, c) => { const a = XLSX.utils.encode_cell({ r, c }); if (ws[a]) ws[a].s = S_SUB; }));
      for (let r = 2; r < aoa.length; r++) if (!st.includes(r)) { const a = XLSX.utils.encode_cell({ r, c: 8 }); ws[a] = { t: 's', v: '', s: S_BOX }; }
      ws['!cols'] = [{ wch: 14 }, { wch: 13 }, { wch: 12 }, { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 17 }, { wch: 22 }, { wch: 10 }];
      ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 1, c: 0 }, e: { r: aoa.length - 1, c: H.length - 1 } }) };
      ws['!freeze'] = { xSplit: 0, ySplit: 2 };
      XLSX.utils.book_append_sheet(wb, ws, n.slice(0, 31));
    });
    return App.xl.serialize(wb, 'inventario.xlsx');
  }

  App.inv = { build, summary, render, COMPS };
})(window.App);
