/*! QORVEX · © 2026 CH Industrial Solutions · Todos los derechos reservados. Ver LEGAL.md y LICENSE.txt. */
/* =====================================================================
   seguridad.js — Verificación de los TXT de capturas (V 13.05)
   Revisa el código encadenado de cada renglón (ver qxsec.js). Si alguien
   borra o cambia renglones a mano, aquí se ve en qué archivo y en qué línea.
   Solo lectura: nunca modifica los archivos.
   ===================================================================== */
(function (App) {
  const { $, $$, esc, fmtN, toast } = App;
  const RE = /^((Validacion|Secuencia|Devolucion|Entrega)_[A-Za-z0-9-]+_\d{4}-\d{2}|Correcciones_Motor)\.txt$/i;
  const V = { at: 0, files: [], busy: false };

  async function run(quiet) {
    const dir = App.S.dir; if (!dir || V.busy) return V;
    V.busy = true;
    try {
      const out = [];
      for await (const [n, h] of dir.entries()) {
        if (h.kind !== 'file' || !RE.test(n)) continue;
        try { out.push({ n, ...(await window.QXsec.verify(await (await h.getFile()).text())) }); } catch (e) { out.push({ n, ok: 0, legacy: 0, bad: [{ n: 0, why: `no se pudo leer: ${e.message}` }] }); }
      }
      out.sort((a, b) => a.n.localeCompare(b.n, 'es'));
      V.files = out; V.at = Date.now();
      const bad = out.filter((f) => f.bad.length);
      if (bad.length) toast(`⚠ ${bad.length} archivo(s) de capturas con renglones alterados. Revisa ARCHIVOS → Verificación.`, 'warn', 9000);
      else if (!quiet) toast('Verificación: todos los TXT de capturas están íntegros.', 'ok');
    } finally { V.busy = false; }
    return V;
  }

  function panel() {
    const bad = V.files.filter((f) => f.bad.length).length;
    return `<div class="dpanel vchk"><div class="dph"><h3>Verificación de capturas (TXT)</h3>
        <span class="muted small">${V.at ? `Revisado ${App.fDT(V.at)} · ${fmtN(V.files.length)} archivos` : 'Aún no se revisa'}</span>
        ${V.at ? (bad ? `<span class="pill warn">${bad} con alteraciones</span>` : '<span class="pill ok">Todo íntegro</span>') : ''}
        <span class="sp"></span><button class="btn sm" id="vRun">Verificar ahora</button></div>
      <div class="essp">Cada renglón nuevo lleva un código encadenado al anterior. Si alguien borra o cambia renglones con el Bloc de notas, aparece aquí. Los renglones de antes de la V 13.05 no tienen código y se cuentan como «anteriores».</div>
      ${V.files.length ? `<div class="tw2"><table class="t mini"><thead><tr><th>Archivo</th><th>Verificados</th><th>Anteriores sin código</th><th>Estado</th></tr></thead><tbody>
        ${V.files.map((f, i) => `<tr><td class="mono">${esc(f.n)}</td><td class="num">${fmtN(f.ok)}</td><td class="num">${fmtN(f.legacy)}</td>
          <td class="${f.bad.length ? 'bad' : 'good'}">${f.bad.length ? `⚠ ${f.bad.length} renglón(es) <a href="#" data-vdet="${i}">ver</a>` : '✓ Íntegro'}</td></tr>`).join('')}
      </tbody></table></div>` : ''}</div>`;
  }
  function bind(rerender) {
    const b = $('#vRun'); if (b) b.onclick = async () => { await App.busy('Verificando archivos…', () => run(false)); rerender(); };
    $$('[data-vdet]').forEach((a) => (a.onclick = (e) => {
      e.preventDefault(); const f = V.files[+a.dataset.vdet];
      App.modal({ title: `Renglones alterados · ${esc(f.n)}`, body: `<div class="essp">Compara con el historial de versiones de SharePoint/OneDrive para ver qué cambió y quién lo cambió.</div><table class="t mini"><thead><tr><th>Línea</th><th>Detalle</th></tr></thead><tbody>${f.bad.map((x) => `<tr><td class="num">${x.n}</td><td>${esc(x.why)}</td></tr>`).join('')}</tbody></table>` });
    }));
  }
  App.secv = { run, panel, bind, get state() { return V; } };
})(window.App);
