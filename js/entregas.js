/*! QORVEX · © 2026 CH Industrial Solutions · Todos los derechos reservados. Software propietario: prohibida su copia, modificación o distribución sin autorización por escrito. Ver LEGAL.md y LICENSE.txt. */
/* =====================================================================
   entregas.js — lee Entregas.xlsx (carpeta Data Base, hoja Form1)
   Columna F = ID de caja o rack entregado · Columna C = fecha de entrega
   Columna E = quién lo registró · Columna G = comentarios
   Solo lectura: QORVEX nunca escribe en este libro (lo llena el formulario).
   Si un ID aparece aquí, la celda de DATA se muestra como ENTREGADO.
   ===================================================================== */
(function (App) {
  const NAME = 'Entregas.xlsx', SHEET = 'Form1', EVERY = 120000; // relee cada 2 minutos
  const E = { map: new Map(), lm: 0, size: 0, at: 0, found: false, err: '' };
  const key = (v) => String(v == null ? '' : v).trim().toUpperCase();
  const pad = (n) => String(n).padStart(2, '0');
  /** Fecha de Excel (número de serie, Date o texto) → dd/mm/aaaa hh:mm */
  function fmt(v) {
    if (typeof v === 'number' && isFinite(v)) {
      const d = new Date(Math.round((v - 25569) * 864e5));
      return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
    }
    if (v instanceof Date && !isNaN(v)) return `${pad(v.getDate())}/${pad(v.getMonth() + 1)}/${v.getFullYear()} ${pad(v.getHours())}:${pad(v.getMinutes())}`;
    return String(v == null ? '' : v).trim();
  }
  /** Lee el libro si cambió. Devuelve true cuando cambió lo que se muestra. */
  async function load(force) {
    const dir = App.S && App.S.dir; if (!dir) return false;
    let fh;
    try { fh = await dir.getFileHandle(NAME); }
    catch (e) {
      const had = E.found || E.map.size; E.found = false; E.map = new Map(); E.at = Date.now(); E.err = '';
      return !!had;
    }
    let f;
    try { f = await fh.getFile(); } catch (e) { E.err = 'No se pudo leer (¿abierto o sincronizando?)'; E.at = Date.now(); return false; }
    E.at = Date.now();
    if (!force && E.found && f.lastModified === E.lm && f.size === E.size) return false;
    try {
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
      const ws = wb.Sheets[SHEET] || wb.Sheets[wb.SheetNames[0]];
      const rows = ws ? XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }) : [];
      const m = new Map();
      rows.slice(1).forEach((r) => {
        const id = key(r[5]); if (!id) return;
        m.set(id, { fecha: fmt(r[2]), name: String(r[4] || '').trim(), com: String(r[6] || '').trim() }); // la última entrega gana
      });
      E.map = m; E.lm = f.lastModified; E.size = f.size; E.found = true; E.err = '';
      return true;
    } catch (e) { E.err = 'No se pudo leer el libro: ' + (e.message || e); return false; }
  }
  const stale = () => Date.now() - E.at > EVERY;
  const get = (id) => (id ? E.map.get(key(id)) : null);
  function info() {
    if (E.err) return `Entregas: ${E.err}`;
    if (!E.at) return 'Entregas: leyendo…';
    if (!E.found) return `Sin ${NAME} en la carpeta`;
    const d = new Date(E.at);
    return `Entregas: ${E.map.size.toLocaleString('es-MX')} IDs · leído ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  setInterval(async () => {
    if (!App.S || !App.S.dir || !(App.auth && App.auth.user())) return;
    try { if ((await load()) && typeof App.ent.onChange === 'function') App.ent.onChange(); } catch (e) { /* sigue con lo último leído */ }
  }, EVERY);
  App.ent = { load, get, stale, info, NAME, state: E, onChange: null };
})(window.App);
