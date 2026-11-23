/*! QORVEX · © 2026 CH Industrial Solutions · Todos los derechos reservados. Software propietario: prohibida su copia, modificación o distribución sin autorización por escrito. Ver LEGAL.md y LICENSE.txt. */
/* =====================================================================
   devoluciones.js — Devoluciones de línea capturadas en QORVEX MOBILE
   - Cada tableta escribe Devolucion_<EQUIPO>_<AAAA-MM>.txt (mismo formato
     que Validación y Secuencia; solo se agregan líneas).
   - Al leer, el último movimiento de cada ID manda (Alta / Edición / Baja).
   - En el cruce, la devolución más reciente de un job y componente pone
     su caja nueva en la columna SEC (en Arnés, en la columna ARNÉS).
   - Entregas por job (Entrega_<EQUIPO>_<AAAA-MM>.txt): excepciones registradas en
     QORVEX MOBILE; marcan ENTREGADO solo ese job y componente.
   Solo lectura en QORVEX.
   ===================================================================== */
(function (App) {
  const RE = /^Devolucion_([A-Za-z0-9-]+)_(\d{4})-(\d{2})\.txt$/i;
  const RE_ENT = /^Entrega_([A-Za-z0-9-]+)_(\d{4})-(\d{2})\.txt$/i; // entregas por job (excepciones, solo desde QORVEX MOBILE)
  const D = { recs: [], ents: [], files: [], at: 0 };
  /** Columna de DATA donde se refleja la devolución, por componente */
  const COL = { ARNES: 'idArnes', BCM: 'secBcm', CLUSTER: 'secCluster', SWGDE: 'secSwGde', SWCH: 'secSwCh', KEY: 'secKey' };

  /** Lee todos los TXT de un prefijo (Devolucion_ o Entrega_) y aplica los movimientos */
  async function readKind(dir, re, tipo) {
    const files = [];
    for await (const [name, h] of dir.entries()) { const m = h.kind === 'file' && name.match(re); if (m) files.push({ name, h, dev: m[1].toUpperCase(), ym: `${m[2]}-${m[3]}` }); }
    files.sort((a, b) => a.ym.localeCompare(b.ym));
    const fold = new Map();
    for (const f of files) {
      const raw = await App.txt.readText(f.h);
      const P = App.txt.parse(raw.text);
      P.rows.forEach((row) => {
        const o = App.txt.objOf(P.head, row), id = String(o.id || '').trim(); if (!id) return;
        const k = `${f.dev}|${id}`;
        if (App.normTxt(o.movimiento) === 'baja') fold.delete(k); else { fold.delete(k); fold.set(k, { o, dev: f.dev }); }
      });
    }
    const recs = [...fold.values()].map(({ o, dev }) => ({
      dev, id: o.id, fecha: o.fecha, hora: o.hora, ts: App.cap.tsOf(o.fecha, o.hora) || 0, turno: o.turno,
      job: App.normKey(o.job), jobRaw: o.job, cont: String(o.contenedor || '').trim().toUpperCase(), comp: o.componente, compN: App.normComp(o.componente),
      emp: String(o.noempleado || '').toUpperCase(), name: o.nombre, sup: o.supervisor, motivo: o.motivo || '', tipo,
    })).filter((r) => r.job && r.compN && (tipo === 'ent' || r.cont));
    return { recs, files: files.map((f) => f.name) };
  }
  async function load() {
    const dir = App.S && App.S.dir; if (!dir) return;
    const a = await readKind(dir, RE, 'dev'), b = await readKind(dir, RE_ENT, 'ent');
    D.recs = a.recs; D.ents = b.recs; D.files = [...a.files, ...b.files]; D.at = Date.now();
  }
  App.dev = { load, COL, RE, RE_ENT, get recs() { return D.recs; }, get ents() { return D.ents; }, get files() { return D.files; } };
})(window.App);
