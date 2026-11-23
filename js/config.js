/*! QORVEX · © 2026 CH Industrial Solutions · Ing. Carlos Alberto Hernández Hernández · Todos los derechos reservados. Software propietario: prohibida su copia, modificación o distribución sin autorización por escrito. Ver LEGAL.md y LICENSE.txt. */
/* =====================================================================
   config.js — Config_QORVEX.json (en la carpeta Data Base)
   Única fuente de: turnos y horarios, días laborables, festivos, metas
   por turno y tipo (jobs y contenedores), supervisores y usuarios de
   QORVEX MOBILE. Solo el Motor (modo Editor) la escribe; las tabletas
   la leen.
   ===================================================================== */
(function (App) {
  const { $, $$, esc, fmtN, toast, pad } = App;
  const NAME = 'Config_QORVEX.json';
  const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const ROLE_N = { admin: 'Supervisor / Admin', capturista: 'Capturista', validador: 'Validador' };
  const roleOf = (r) => (r === 'admin' || r === 'capturista' ? r : 'validador'); // roles anteriores (ambos, secuenciador…) → Validador
  const goal0 = () => ({ val: { jobs: 0, cont: 0 }, seq: { jobs: 0, cont: 0 } });
  const DEF = () => ({
    version: 1, updated: '', by: '',
    shifts: [
      { n: 'Día', s: '07:00', e: '15:00', days: [1, 2, 3, 4, 5], goals: goal0() },
      { n: 'Tarde', s: '15:00', e: '22:30', days: [1, 2, 3, 4, 5], goals: goal0() },
      { n: 'Noche', s: '22:30', e: '07:00', days: [1, 2, 3, 4, 5], goals: goal0() },
    ],
    supervisors: [], users: [], holidays: [],
    motor: { idleMin: 30 }, mobile: { idleMin: 15 },
    brand: { wall: 1, logos: [] },
  });
  let CFG = DEF(), META = { loaded: false, lastModified: 0, seal: 'sin', master: null };
  const SEC = () => window.QXsec;
  const isMaster = () => !!(App.auth && App.auth.user() && META.master && App.auth.user().emp === META.master.emp);

  /** External Sequence Status: rate diario, CIAs del reporte y horario de generación */
  const DEF_CIAS = [['L1', '011'], ['L2', '065'], ['SATX', '044'], ['TULSA', '014'], ['SAP', '002'], ['TSC', '498']];
  function normReport(r) {
    r = r || {};
    const cias = Array.isArray(r.cias) && r.cias.length ? r.cias.map((c) => ({ n: String(c.n || '').trim(), c: String(c.c || '').trim() })).filter((c) => c.n || c.c) : DEF_CIAS.map(([n, c]) => ({ n, c }));
    const times = (Array.isArray(r.times) ? r.times : ['07:00']).map((t) => String(t).trim()).filter((t) => /^\d{1,2}:\d{2}$/.test(t)).map((t) => t.padStart(5, '0'));
    return { rate: Math.max(1, Number(r.rate) || 279), cias, on: r.on !== false, days: Array.isArray(r.days) ? r.days.map(Number).filter((d) => d >= 0 && d <= 6) : [1, 2, 3, 4, 5], times: [...new Set(times)].sort(), cover: r.cover === 'days' ? 'days' : 'all', coverDays: Math.max(1, Math.min(30, Number(r.coverDays) || 3)) };
  }
  function normalize(c) {
    const d = DEF(), o = Object.assign(d, c || {});
    o.shifts = (Array.isArray(o.shifts) && o.shifts.length ? o.shifts : d.shifts).map((x) => ({
      n: String(x.n || '').trim() || 'Turno', s: x.s || '00:00', e: x.e || '00:00',
      days: Array.isArray(x.days) ? x.days.map(Number).filter((n) => n >= 0 && n <= 6) : [1, 2, 3, 4, 5],
      goals: { val: { jobs: +(x.goals?.val?.jobs) || 0, cont: +(x.goals?.val?.cont) || 0 }, seq: { jobs: +(x.goals?.seq?.jobs) || 0, cont: +(x.goals?.seq?.cont) || 0 } },
    }));
    o.supervisors = (o.supervisors || []).map((s) => ({ emp: String(s.emp || '').trim().toUpperCase(), name: String(s.name || '').trim(), active: s.active !== false })).filter((s) => s.emp && s.name);
    o.users = (o.users || []).map((u) => ({ emp: String(u.emp || '').trim().toUpperCase(), name: String(u.name || '').trim(), role: roleOf(u.role), pw: u.pw || '', pwAt: +u.pwAt || 0, must: !!u.must, active: u.active !== false, status: u.status === 'pendiente' ? 'pendiente' : 'activo', created: +u.created || 0, by: u.by || '' })).filter((u) => u.emp && u.name && u.emp !== 'ADMIN' && u.emp !== 'MAESTRA');
    // V 13.05: Supervisor = rol Supervisor / Admin. Los supervisores de la lista anterior pasan a ser usuarios con ese rol
    // (sin contraseña hasta que el Administrador se la asigne con «Asignar»).
    o.supervisors.forEach((sp) => {
      const u = o.users.find((x) => x.emp === sp.emp);
      if (u) { if (u.role !== 'admin') u.role = 'admin'; return; }
      o.users.push({ emp: sp.emp, name: sp.name, role: 'admin', pw: '', pwAt: 0, must: true, active: sp.active, status: 'activo', created: Date.now(), by: 'Migrado de Supervisores' });
    });
    o.supervisors = [];
    o.holidays = (o.holidays || []).filter((h) => /^\d{4}-\d{2}-\d{2}$/.test(h.d)).map((h) => ({ d: h.d, n: String(h.n || '').trim() })).sort((a, b) => a.d.localeCompare(b.d));
    o.motor = { idleMin: Math.max(5, +(o.motor && o.motor.idleMin) || 30) };
    o.mobile = { idleMin: Math.max(0, Math.min(240, o.mobile && o.mobile.idleMin != null ? +o.mobile.idleMin || 0 : 15)) };
    delete o.sello;
    o.brand = { wall: (o.brand && +o.brand.wall === 2) ? 2 : 1, logos: ((o.brand && o.brand.logos) || []).filter((x) => /^data:image\//.test(x)).slice(0, 3) };
    o.labels = window.QXLabels ? window.QXLabels.norm(o) : (o.labels || {}); // etiquetas 6×4: componentes, prefijos, líneas, logo
    o.report = normReport(o.report); // External Sequence Status: rate, CIAs y programación
    return o;
  }

  async function load() {
    const S = App.S; if (!S.dir) return CFG;
    try {
      const raw = await App.txt.readOpt(S.dir, NAME), obj = raw ? JSON.parse(raw.text.replace(/^﻿/, '')) : null;
      const seal = obj ? await SEC().sealCheck(obj) : 'sin';
      const master = await SEC().readMaster(S.dir);
      CFG = normalize(obj); SEC().enforceMaster(CFG.users, master); // el Admin master siempre conserva su rol y contraseña
      META = { loaded: !!raw, lastModified: raw ? raw.lastModified : 0, seal, master };
    } catch (e) { toast(`${NAME}: no se pudo leer (${e.message}). Se usan valores por defecto.`, 'warn', 6000); CFG = normalize(null); META = { loaded: false, lastModified: 0, seal: 'sin', master: null }; }
    return CFG;
  }
  async function save(next) {
    const S = App.S;
    if (App.lock && !App.lock.canEdit()) throw new Error('Modo consulta: no se puede guardar la configuración.');
    const cur = await App.txt.readOpt(S.dir, NAME);
    const c = normalize(next);
    const curSeal = cur ? await SEC().sealCheck(JSON.parse(cur.text.replace(/^\uFEFF/, ''))) : 'sin';
    // Si una tableta cambió el archivo mientras se editaba (por ejemplo, creó un usuario o cambió su contraseña),
    // se conservan esos cambios de usuarios en lugar de rechazar el guardado.
    if (cur && curSeal !== 'mal' && cur.lastModified !== META.lastModified) {
      try {
        const disk = normalize(JSON.parse(cur.text.replace(/^\uFEFF/, ''))), base = new Set((CFG.users || []).map((u) => u.emp));
        disk.users.forEach((du) => {
          const mine = c.users.find((u) => u.emp === du.emp);
          if (!mine) { if (!base.has(du.emp)) c.users.push(du); return; } // nuevo desde una tableta (los que se quitaron aquí no regresan)
          if ((du.pwAt || 0) > (mine.pwAt || 0)) Object.assign(mine, { pw: du.pw, pwAt: du.pwAt, must: du.must });
        });
      } catch (e) { console.warn('config en disco', e); }
    } c.updated = new Date().toISOString(); c.by = (App.lock && App.lock.who()) || '';
    SEC().enforceMaster(c.users, await SEC().readMaster(S.dir));
    c.sello = await SEC().seal(c);
    if (!(await App.fs.ensurePermission(S.dir))) throw new Error('No se autorizó la escritura en la carpeta.');
    if (cur) { try { await App.fs.backup(S.dir, NAME, new TextEncoder().encode(cur.text)); } catch (e) { console.warn(e); } }
    await App.txt.writeWhole(S.dir, NAME, JSON.stringify(c, null, 2));
    await load();
    return CFG;
  }

  /** Auto-registro: agrega una cuenta PENDIENTE leyendo el archivo más reciente (no requiere modo Editor) */
  async function addPending(u) {
    const S = App.S;
    if (!(await App.fs.ensurePermission(S.dir))) throw new Error('No se autorizó la escritura en la carpeta.');
    const cur = await App.txt.readOpt(S.dir, NAME);
    const obj = cur ? JSON.parse(cur.text.replace(/^\uFEFF/, '')) : null;
    const c = normalize(obj);
    if (u.emp === 'ADMIN' || u.emp === 'MAESTRA' || c.users.some((x) => x.emp === u.emp)) throw new Error('Ese número de empleado ya está registrado.');
    const first = u.first === true && !(await SEC().readMaster(S.dir));
    if (first && c.users.some((x) => x.role === 'admin' && x.status !== 'pendiente' && x.active && x.pw)) throw new Error('Ya hay un Supervisor / Admin: inicia sesión o pídele que te dé de alta.');
    c.users.push({ emp: u.emp, name: u.name, role: first ? 'admin' : 'validador', pw: u.pw, pwAt: Date.now(), must: false, active: true, status: first ? 'activo' : 'pendiente', created: Date.now(), by: first ? 'Configuración inicial · QORVEX' : 'Registro · QORVEX' });
    c.updated = new Date().toISOString(); c.by = `${first ? 'Configuración inicial' : 'Registro'} de ${u.name}`;
    if (first && !(await SEC().readMaster(S.dir))) await SEC().writeMaster(S.dir, { emp: u.emp, name: u.name, pw: u.pw }); // primer usuario = Admin master
    SEC().enforceMaster(c.users, await SEC().readMaster(S.dir));
    c.sello = await SEC().seal(c);
    await App.txt.writeWhole(S.dir, NAME, JSON.stringify(c, null, 2));
    await load();
  }
  /** Cambia una contraseña con cifrado anterior al formato nuevo (solo ese usuario, sin tocar lo demás) */
  async function upgradePw(emp, oldHash, newHash) {
    const S = App.S; if (!S.dir || !(await App.fs.ensurePermission(S.dir))) return;
    const cur = await App.txt.readOpt(S.dir, NAME); if (!cur) return;
    const obj = JSON.parse(cur.text.replace(/^\uFEFF/, ''));
    const m = await SEC().readMaster(S.dir);
    if (m && m.emp === emp && m.pw === oldHash) await SEC().writeMaster(S.dir, { ...m, pw: newHash });
    const u = (obj.users || []).find((x) => String(x.emp || '').toUpperCase() === emp); if (!u || u.pw !== oldHash) { await load(); return; }
    u.pw = newHash; SEC().enforceMaster(obj.users, await SEC().readMaster(S.dir)); obj.sello = await SEC().seal(obj);
    await App.txt.writeWhole(S.dir, NAME, JSON.stringify(obj, null, 2));
    await load();
  }
  /** Carpeta de una versión anterior sin Admin master: el primer Supervisor / Admin que entra lo es */
  async function claimMaster(emp, pwHash) {
    const S = App.S; if (!S.dir || (await SEC().readMaster(S.dir))) return false;
    const u = CFG.users.find((x) => x.emp === emp); if (!u || u.role !== 'admin') return false;
    if (!(await App.fs.ensurePermission(S.dir))) return false;
    await SEC().writeMaster(S.dir, { emp, name: u.name, pw: pwHash || u.pw }); await load(); return true;
  }
  /** Supervisores = usuarios activos con rol Supervisor / Admin */
  const sups = () => CFG.users.filter((u) => u.role === 'admin' && u.active && u.status !== 'pendiente').map((u) => ({ emp: u.emp, name: u.name, active: true }));
  /** ¿Hace falta crear el primer Supervisor / Admin? (carpeta nueva) */
  const needsFirst = () => !META.master && !CFG.users.some((u) => u.role === 'admin' && u.status !== 'pendiente' && u.active && u.pw);

  /** Imagen subida → PNG reducido (máx. 360×140) como data URL */
  function shrink(file) {
    return new Promise((res, rej) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => { const k = Math.min(1, 360 / img.width, 140 / img.height), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/png')); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('No es una imagen válida')); };
      img.src = url;
    });
  }

  /* ---------- Turnos, días y metas ---------- */
  const hm = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const inShift = (x, m) => { const a = hm(x.s), b = hm(x.e); return a === b ? true : a < b ? m >= a && m < b : m >= a || m < b; };
  const shiftAt = (ts) => { const d = new Date(ts), m = d.getHours() * 60 + d.getMinutes(); return CFG.shifts.find((x) => inShift(x, m)) || null; };
  const hours = (x) => { let a = hm(x.s), b = hm(x.e); if (b <= a) b += 1440; return (b - a) / 60; };
  const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  /** Fecha operativa: lo capturado después de las 00:00 en un turno que cruza la medianoche cuenta para el día en que inició */
  function opDate(ts) { const d = new Date(ts), m = d.getHours() * 60 + d.getMinutes(), x = shiftAt(ts); if (x && hm(x.s) > hm(x.e) && m < hm(x.e)) d.setDate(d.getDate() - 1); return isoDay(d); }
  const holiday = (iso) => CFG.holidays.find((h) => h.d === iso) || null;
  /** ¿Ese turno trabaja ese día con meta? (día laborable y no festivo) */
  function hasGoal(iso, x) { if (!x || holiday(iso)) return false; return x.days.includes(new Date(`${iso}T12:00:00`).getDay()); }

  /* ---------- Contraseña (misma fórmula que QORVEX MOBILE) ---------- */
  async function hashPw(emp, pw) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`vm|${emp}|${pw}`));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
  }

  /* =====================================================================
     Pantalla CONFIGURACIÓN
     ===================================================================== */
  let D = null; // borrador en edición
  function render(m) {
    const S = App.S;
    if (!App.auth.isAdmin()) { m.innerHTML = '<div class="empty">CONFIGURACIÓN es solo para el Administrador.</div>'; return; }
    if (!S.dir) { m.innerHTML = '<div class="empty">Primero conecta la carpeta de trabajo (ARCHIVOS).</div>'; return; }
    const ro = App.lock && !App.lock.canEdit();
    if (!D) D = JSON.parse(JSON.stringify(CFG));
    const dis = ro ? 'disabled' : '';
    const cov = (() => { const cnt = new Array(1440).fill(0); D.shifts.forEach((x) => { for (let k = 0; k < 1440; k++) if (inShift(x, k)) cnt[k]++; }); return { gaps: cnt.filter((c) => !c).length, over: cnt.filter((c) => c > 1).length }; })();
    m.innerHTML = `
      <div class="ptitle"><h1>CONFIGURACIÓN <small>Turnos, metas, supervisores, usuarios, etiquetas y reportes</small></h1>
        <span class="muted">${META.loaded ? `${esc(NAME)} · ${CFG.updated ? `guardado ${App.fDT(new Date(CFG.updated).getTime())}${CFG.by ? ` por ${esc(CFG.by)}` : ''}` : ''}` : 'Aún no existe Config_QORVEX.json: se crea al guardar'}</span>
        <span class="sp"></span><span id="cfDirty"></span>${ro ? '<span class="pill warn">Modo consulta: solo lectura</span>' : '<button class="btn" id="cfReset">Descartar cambios</button><button class="btn primary" id="cfSave">Guardar configuración</button>'}</div>
      <div class="note">QORVEX MOBILE toma de aquí los turnos, los usuarios y los supervisores cada vez que se conecta a la carpeta.</div>

      <div class="dpanel cfg"><div class="dph"><h3>Turnos, días laborables y metas</h3><span class="sp"></span>${ro ? '' : '<button class="btn sm" id="shAdd">+ Agregar turno</button>'}</div>
        <div class="tw" style="max-height:none"><table class="t cfg-t"><thead><tr><th rowspan="2">Turno</th><th rowspan="2">Inicio</th><th rowspan="2">Fin</th><th rowspan="2">Horas</th><th rowspan="2">Días laborables</th><th colspan="2">Meta Validación</th><th colspan="2">Meta Secuencia</th><th rowspan="2"></th></tr>
          <tr><th>Jobs</th><th>Contenedores</th><th>Jobs</th><th>Contenedores</th></tr></thead><tbody>
          ${D.shifts.map((x, i) => `<tr>
            <td><input class="input" data-sh="${i}" data-k="n" value="${esc(x.n)}" maxlength="20" ${dis}></td>
            <td><input class="input" type="time" data-sh="${i}" data-k="s" value="${esc(x.s)}" ${dis}></td>
            <td><input class="input" type="time" data-sh="${i}" data-k="e" value="${esc(x.e)}" ${dis}></td>
            <td class="num">${hours(x).toFixed(1)}</td>
            <td><div class="days">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<label class="${x.days.includes(d) ? 'on' : ''}"><input type="checkbox" data-sh="${i}" data-day="${d}" ${x.days.includes(d) ? 'checked' : ''} ${dis}>${DAYS[d]}</label>`).join('')}</div></td>
            ${['val', 'seq'].map((ty) => ['jobs', 'cont'].map((u) => `<td><input class="input num" type="number" min="0" step="1" data-sh="${i}" data-g="${ty}.${u}" value="${x.goals[ty][u]}" ${dis}></td>`).join('')).join('')}
            <td>${ro || D.shifts.length < 2 ? '' : `<button class="btn sm" data-shdel="${i}" title="Quitar turno">✕</button>`}</td></tr>`).join('')}
          </tbody></table></div>
        ${cov.gaps || cov.over ? `<div class="banner warn">${cov.gaps ? `Hay ${Math.floor(cov.gaps / 60)} h ${cov.gaps % 60} min del día sin turno. ` : ''}${cov.over ? `Hay ${Math.floor(cov.over / 60)} h ${cov.over % 60} min en más de un turno (se toma el primero).` : ''}</div>` : '<div class="muted small">✓ Los turnos cubren las 24 horas sin traslaparse. El turno que cruza la medianoche cuenta para el día en que inicia.</div>'}
        <div class="muted small">La meta es por turno y por día. En días no laborables y festivos las capturas sí cuentan, pero sin meta.</div>
      </div>

      <div class="dgrid cfg2">
        <div class="dpanel cfg"><div class="dph"><h3>Supervisores</h3><span class="muted small">${fmtN(D.users.filter((u) => u.role === 'admin' && u.active && u.status !== 'pendiente').length)} activos</span></div>
          <div class="essp">Los supervisores son los usuarios con rol <b>Supervisor / Admin</b> (tabla Usuarios). Aparecen en la tableta al iniciar sesión para elegir al supervisor del turno.</div>
          <table class="t mini"><thead><tr><th>No. empleado</th><th>Nombre</th><th>Contraseña</th></tr></thead><tbody>
          ${D.users.filter((u) => u.role === 'admin' && u.active && u.status !== 'pendiente').map((u) => `<tr><td class="mono">${esc(u.emp)}</td><td>${esc(u.name)}</td><td>${u.pw ? '<span class="pill ok">asignada</span>' : '<span class="pill warn">sin asignar</span>'}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Sin supervisores. Da rol Supervisor / Admin a quien corresponda en la tabla Usuarios.</td></tr>'}
          </tbody></table></div>
        <div class="dpanel cfg"><div class="dph"><h3>Días festivos</h3><span class="sp"></span>${ro ? '' : '<button class="btn sm" id="hoAdd">+ Agregar</button>'}</div>
          <table class="t mini"><thead><tr><th>Fecha</th><th>Descripción</th><th></th></tr></thead><tbody>
          ${D.holidays.map((h, i) => `<tr><td><input class="input" type="date" data-ho="${i}" data-k="d" value="${esc(h.d)}" ${dis}></td><td><input class="input" data-ho="${i}" data-k="n" value="${esc(h.n)}" ${dis}></td><td>${ro ? '' : `<button class="btn sm" data-hodel="${i}">✕</button>`}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Sin festivos.</td></tr>'}
          </tbody></table></div>
      </div>

      <div class="dpanel cfg"><div class="dph"><h3>Usuarios · QORVEX y QORVEX MOBILE</h3><span class="muted small">Una sola lista para los dos programas · la contraseña se guarda cifrada</span><span class="sp"></span>${D.users.some((u) => u.status === 'pendiente') ? `<span class="pill warn">${D.users.filter((u) => u.status === 'pendiente').length} solicitud(es) de registro</span>` : ''}${ro ? '' : '<button class="btn sm" id="usAdd">+ Agregar usuario</button>'}</div>
        <table class="t mini"><thead><tr><th>No. empleado</th><th>Nombre</th><th>Rol</th><th>Estado</th><th>Contraseña</th><th>Pedir cambio</th><th>Activo</th><th></th></tr></thead><tbody>
        ${D.users.map((u, i) => { const mst = META.master && u.emp === META.master.emp, dm = mst ? 'disabled' : dis; return `<tr class="${u.status === 'pendiente' ? 'pend-row' : ''}"><td><input class="input" data-us="${i}" data-k="emp" value="${esc(u.emp)}" ${dm}></td><td><input class="input" data-us="${i}" data-k="name" value="${esc(u.name)}" ${dis}>${mst ? '<span class="pill ok" title="Primer Supervisor / Admin de la carpeta">👑 Admin master</span>' : ''}</td>
          <td><select class="input" data-us="${i}" data-k="role" ${dm}>${Object.entries(ROLE_N).map(([k, t]) => `<option value="${k}" ${u.role === k ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
          <td>${u.status === 'pendiente' ? `<span class="pill warn">Pendiente</span>${ro ? '' : ` <button class="btn sm primary" data-usok="${i}">Aprobar</button>`}` : '<span class="pill ok">Activo</span>'}</td>
          <td>${u.pw ? '<span class="pill ok">asignada</span>' : '<span class="pill warn">sin asignar</span>'} ${ro || (mst && !isMaster()) ? '' : `<button class="btn sm" data-uspw="${i}">${u.pw ? 'Cambiar' : 'Asignar'}</button>`}</td>
          <td><input type="checkbox" data-us="${i}" data-k="must" ${u.must ? 'checked' : ''} ${dm}></td>
          <td><input type="checkbox" data-us="${i}" data-k="active" ${u.active ? 'checked' : ''} ${dm}></td><td>${ro || mst ? '' : `<button class="btn sm" data-usdel="${i}" title="${u.status === 'pendiente' ? 'Rechazar solicitud' : 'Quitar usuario'}">✕</button>`}</td></tr>`; }).join('')}
        </tbody></table>
        <div class="muted small">Supervisor / Admin: todo, y aparece en la lista de supervisores de la tableta. Capturista: trabaja en QORVEX y QORVEX MOBILE, sin CONFIGURACIÓN ni usuarios. Validador: captura y exporta en QORVEX MOBILE; no entra a QORVEX. Quien se registra queda <b>Pendiente</b> hasta que lo apruebes (y guardes la configuración).</div></div>

      <div class="dgrid cfg2">
        <div class="dpanel cfg"><div class="dph"><h3>Fondo del inicio de sesión</h3><span class="muted small">Con marca CH</span></div>
          <div class="walls">${[1, 2].map((n) => `<label class="wall ${D.brand.wall === n ? 'on' : ''}"><input type="radio" name="wall" value="${n}" ${D.brand.wall === n ? 'checked' : ''} ${dis}><img src="img/fondo-login-${n}.jpg" alt="Fondo ${n}"><span>Fondo ${n}</span></label>`).join('')}</div></div>
        <div class="dpanel cfg"><div class="dph"><h3>Logos de la empresa</h3><span class="muted small">Se imprimen en reportes · máximo 3</span><span class="sp"></span>${ro || D.brand.logos.length >= 3 ? '' : '<label class="btn sm">+ Cargar logo<input type="file" id="lgUp" accept="image/png,image/jpeg,image/svg+xml" hidden></label>'}</div>
          <div class="logos">${D.brand.logos.map((src, i) => `<div class="logo-it"><img src="${src}" alt="Logo ${i + 1}">${ro ? '' : `<button class="btn sm" data-lgdel="${i}">✕</button>`}</div>`).join('') || '<div class="muted small">El programa no trae logos de empresa. Cárgalos aquí si quieres que salgan en los reportes impresos.</div>'}</div></div>
      </div>

      <div class="dpanel cfg"><div class="dph"><h3>Etiquetas 6 × 4</h3><span class="muted small">Componentes, prefijos y líneas · QORVEX y QORVEX MOBILE</span><span class="sp"></span>
          <label class="lbchk"><input type="checkbox" id="lbLogo" ${D.labels.logo ? 'checked' : ''} ${dis}> Logo QORVEX en la etiqueta</label></div>
        <div class="dgrid cfg2">
          <div><table class="t mini"><thead><tr><th>Componente</th><th>Prefijo</th><th title="Prefijo de las etiquetas de Devolución">Devolución</th><th>Activo</th><th></th></tr></thead><tbody>
            ${D.labels.comps.map((c, i) => `<tr><td><input class="input" data-lc="${i}" data-k="n" value="${esc(c.n)}" maxlength="40" ${dis}></td><td><input class="input" data-lc="${i}" data-k="p" value="${esc(c.p)}" maxlength="4" style="text-transform:uppercase;width:80px" ${dis}></td><td><input class="input" data-lc="${i}" data-k="pd" value="${esc(c.pd || '')}" maxlength="4" style="text-transform:uppercase;width:80px" ${dis}></td>
              <td><input type="checkbox" data-lc="${i}" data-k="a" ${c.a ? 'checked' : ''} ${dis}></td><td>${ro ? '' : `<button class="btn sm" data-lcdel="${i}">✕</button>`}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Sin componentes.</td></tr>'}
          </tbody></table>${ro ? '' : '<button class="btn sm" id="lcAdd">+ Componente</button>'}</div>
          <div><table class="t mini"><thead><tr><th>Línea</th><th>Activa</th><th></th></tr></thead><tbody>
            ${D.labels.lines.map((l, i) => `<tr><td><input class="input" data-ll="${i}" data-k="l" value="${esc(l.l)}" maxlength="10" ${dis}></td><td><input type="checkbox" data-ll="${i}" data-k="a" ${l.a ? 'checked' : ''} ${dis}></td><td>${ro ? '' : `<button class="btn sm" data-lldel="${i}">✕</button>`}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Sin líneas.</td></tr>'}
          </tbody></table>${ro ? '' : '<button class="btn sm" id="llAdd">+ Línea</button>'}</div>
        </div>
        <div class="muted small">El prefijo (1 a 4 letras) es el inicio del ID: AA001, AA002… Al llegar a 999 pasa solo al siguiente (AB). Si cambias un prefijo, los consecutivos que ya existen siguen con el suyo. Desactivar oculta el componente o la línea al generar, sin borrar el historial.</div></div>

      <div class="dpanel cfg"><div class="dph"><h3>External Sequence Status</h3><span class="muted small">Reporte de gerencia: rate, CIAs y horario</span></div>
        <div class="dgrid cfg2">
          <div>
            <div class="frow"><label class="lbl">Rate (unidades por día)</label><input class="input" id="rpRate" type="number" min="1" value="${D.report.rate}" style="width:120px" ${dis}></div>
            <table class="t mini" style="margin-top:10px"><thead><tr><th>Nombre</th><th>Cia</th><th></th></tr></thead><tbody>
              ${D.report.cias.map((c, i) => `<tr><td><input class="input" data-rc="${i}" data-k="n" value="${esc(c.n)}" maxlength="20" ${dis}></td><td><input class="input" data-rc="${i}" data-k="c" value="${esc(c.c)}" maxlength="6" style="width:90px" ${dis}></td><td>${ro ? '' : `<button class="btn sm" data-rcdel="${i}">✕</button>`}</td></tr>`).join('')}
            </tbody></table>${ro ? '' : '<button class="btn sm" id="rcAdd">+ Cia</button>'}
          </div>
          <div>
            <label class="lbchk"><input type="checkbox" id="rpOn" ${D.report.on ? 'checked' : ''} ${dis}> Generar automáticamente en Data Base\\Reportes</label>
            <div class="frow" style="margin-top:10px"><label class="lbl">Días</label><div class="days">${['D','L','M','M','J','V','S'].map((d, i) => `<label class="day"><input type="checkbox" data-rd="${i}" ${D.report.days.includes(i) ? 'checked' : ''} ${dis}><span>${d}</span></label>`).join('')}</div></div>
            <div class="frow" style="margin-top:10px"><label class="lbl">Horas (separadas por coma)</label><input class="input" id="rpTimes" value="${esc(D.report.times.join(', '))}" placeholder="07:00, 15:00" style="width:220px" ${dis}></div>
            <div class="frow" style="margin-top:10px"><label class="lbl">Cobertura</label><select class="input" id="rpCover" style="width:auto" ${dis}><option value="all" ${D.report.cover === 'all' ? 'selected' : ''}>Todo (como está la operación)</option><option value="days" ${D.report.cover === 'days' ? 'selected' : ''}>Desde hoy, próximos N días de Start Date</option></select>
              <input class="input" id="rpDays" type="number" min="1" max="30" value="${D.report.coverDays}" style="width:80px" ${D.report.cover === 'days' ? '' : 'hidden'} ${dis}></div>
            <div class="muted small" style="margin-top:8px">Se genera solo mientras QORVEX esté abierto en alguna PC. Si estaba cerrado a la hora programada, se genera al abrirlo ese mismo día.</div>
          </div>
        </div></div>

      <div class="dpanel cfg"><div class="dph"><h3>Acerca de QORVEX</h3><span class="muted small">Versión 13.06.00</span></div>
        <div class="about"><img src="img/icono-ch-180.png" alt="CH Industrial Solutions"><div><b>Desarrollado por CH Industrial Solutions</b><br>Titular: Ing. Carlos Alberto Hernández Hernández<br>charliealberth290116@outlook.es · 8115377033 · General Escobedo, Nuevo León, México</div></div></div>

      <div class="dpanel cfg"><div class="dph"><h3>Seguridad</h3><span class="muted small">Admin master · sello de la configuración · contraseñas · sesiones</span></div>
        <div class="dgrid cfg2 secg">
          <div><b>👑 Admin master</b>
            <div class="essp">${META.master ? `<b>${esc(META.master.emp)} · ${esc(META.master.name)}</b>. Es el primer Supervisor / Admin de la carpeta: su contraseña cifrada está en Data Base\\Seguridad. Nadie más puede quitarle el rol ni cambiar su contraseña; solo él mismo.` : 'Aún no hay Admin master: el primer Supervisor / Admin que entre lo será.'}</div></div>
          <div><b>🛡️ Sello de Config_QORVEX.json</b>
            <div class="essp">${META.seal === 'ok' ? '✓ Sellada: QORVEX detecta si alguien la edita a mano.' : META.seal === 'mal' ? '⚠ Fue modificada fuera de QORVEX (con el Bloc de notas u otro programa). Revisa usuarios y roles; al presionar Guardar configuración se vuelve a sellar.' : 'Sin sello todavía: se sella al guardar la configuración.'}</div>
            <b>🔒 Contraseñas</b>
            <div class="essp">${(() => { const n = D.users.filter((u) => SEC().isWeak(u.pw)).length; return n ? `${n} con el cifrado anterior: se actualizan solas cuando cada usuario entra.` : 'Todas con cifrado PBKDF2.'; })()}</div></div>
        </div>
        <label class="lbl">QORVEX MOBILE: cerrar la sesión de la tableta tras <input class="input num" type="number" min="0" max="240" step="5" id="idleM" value="${D.mobile.idleMin}" ${dis}> minutos sin uso <span class="muted small">(0 = nunca; si hay lecturas sin SUBMIT, avisa y no las pierde)</span></label></div>

      <div class="dpanel cfg"><div class="dph"><h3>Motor</h3></div>
        <label class="lbl">Cerrar el modo Editor tras <input class="input num" type="number" min="5" step="5" id="idle" value="${D.motor.idleMin}" ${dis}> minutos sin movimiento</label></div>`;
    if (ro) return;
    const redraw = () => render(m);
    const upd = () => { const e = $('#cfDirty', m); if (e) e.innerHTML = JSON.stringify(D) !== JSON.stringify(CFG) ? '<span class="pill warn">Cambios sin guardar · presiona Guardar configuración</span>' : ''; };
    upd(); m.onchange = () => setTimeout(upd, 0);
    $$('[data-sh][data-k]', m).forEach((i) => (i.onchange = () => { D.shifts[+i.dataset.sh][i.dataset.k] = i.value; redraw(); }));
    $$('[data-sh][data-day]', m).forEach((i) => (i.onchange = () => { const x = D.shifts[+i.dataset.sh], d = +i.dataset.day; x.days = i.checked ? [...new Set([...x.days, d])] : x.days.filter((n) => n !== d); redraw(); }));
    $$('[data-sh][data-g]', m).forEach((i) => (i.onchange = () => { const [ty, u] = i.dataset.g.split('.'); D.shifts[+i.dataset.sh].goals[ty][u] = Math.max(0, parseInt(i.value, 10) || 0); }));
    $$('[data-shdel]', m).forEach((b) => (b.onclick = () => { D.shifts.splice(+b.dataset.shdel, 1); redraw(); }));
    $('#shAdd').onclick = () => { D.shifts.push({ n: `Turno ${D.shifts.length + 1}`, s: '00:00', e: '00:00', days: [1, 2, 3, 4, 5], goals: goal0() }); redraw(); };
    const bindList = (key, arr) => {
      $$(`[data-${key}][data-k]`, m).forEach((i) => (i.onchange = () => { const o = arr()[+i.dataset[key]], k = i.dataset.k; o[k] = i.type === 'checkbox' ? i.checked : k === 'emp' ? i.value.trim().toUpperCase() : i.value; }));
      $$(`[data-${key}del]`, m).forEach((b) => (b.onclick = () => { arr().splice(+b.dataset[`${key}del`], 1); redraw(); }));
    };
    bindList('ho', () => D.holidays); bindList('us', () => D.users);
    $('#hoAdd').onclick = () => { D.holidays.push({ d: '', n: '' }); redraw(); };
    $('#usAdd').onclick = () => { D.users.push({ emp: '', name: '', role: 'validador', pw: '', pwAt: 0, must: true, active: true, status: 'activo', created: Date.now(), by: '' }); redraw(); };
    $$('[data-usok]', m).forEach((b) => (b.onclick = () => { D.users[+b.dataset.usok].status = 'activo'; redraw(); toast('Aprobado · presiona Guardar configuración', 'ok'); }));
    $$('input[name=wall]', m).forEach((r) => (r.onchange = () => { D.brand.wall = +r.value; redraw(); }));
    $$('[data-lgdel]', m).forEach((b) => (b.onclick = () => { D.brand.logos.splice(+b.dataset.lgdel, 1); redraw(); }));
    if ($('#lgUp')) $('#lgUp').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { D.brand.logos.push(await shrink(f)); redraw(); } catch (x) { toast(x.message, 'err'); } };
    $$('[data-uspw]', m).forEach((b) => (b.onclick = async () => {
      const u = D.users[+b.dataset.uspw];
      if (!u.emp) return toast('Primero escribe el No. de empleado', 'warn');
      const pw = await App.modal({ title: `Contraseña de ${esc(u.emp)} · ${esc(u.name)}`, body: '<label class="lbl">Contraseña nueva (mín. 4)<input class="input" type="password" id="pw1" autocomplete="new-password"></label><label class="lbl">Confirmar<input class="input" type="password" id="pw2" autocomplete="new-password"></label>',
        buttons: [{ t: 'Cancelar', v: null }, { t: 'Asignar', cls: 'primary', fn: (el) => { const a = $('#pw1', el).value, c = $('#pw2', el).value; if (a.length < 4) { toast('Mínimo 4 caracteres', 'warn'); return false; } if (a !== c) { toast('No coinciden', 'warn'); return false; } return a; } }] });
      if (!pw) return;
      u.pw = await SEC().pwMake(u.emp, pw); u.pwAt = Date.now();
      if (META.master && u.emp === META.master.emp) { if (!isMaster()) return toast('Solo el Admin master cambia su contraseña.', 'warn'); u.must = false; await SEC().writeMaster(App.S.dir, { ...META.master, pw: u.pw }); META.master = await SEC().readMaster(App.S.dir); }
      toast('Contraseña asignada · se aplica al guardar la configuración', 'ok'); redraw();
    }));
    $('#lbLogo').onchange = (e) => { D.labels.logo = e.target.checked; };
    $$('[data-lc][data-k]', m).forEach((i) => (i.onchange = () => { const o = D.labels.comps[+i.dataset.lc], k = i.dataset.k; o[k] = k === 'a' ? i.checked : k === 'p' || k === 'pd' ? i.value.trim().toUpperCase() : i.value; }));
    $$('[data-ll][data-k]', m).forEach((i) => (i.onchange = () => { const o = D.labels.lines[+i.dataset.ll]; o[i.dataset.k] = i.dataset.k === 'a' ? i.checked : i.value.trim(); }));
    $$('[data-lcdel]', m).forEach((b) => (b.onclick = () => { D.labels.comps.splice(+b.dataset.lcdel, 1); redraw(); }));
    $$('[data-lldel]', m).forEach((b) => (b.onclick = () => { D.labels.lines.splice(+b.dataset.lldel, 1); redraw(); }));
    $('#lcAdd').onclick = () => { D.labels.comps.push({ n: '', p: '', pd: '', a: true }); redraw(); };
    $('#llAdd').onclick = () => { D.labels.lines.push({ l: '', a: true }); redraw(); };
    $('#rpRate').onchange = (e) => { D.report.rate = Math.max(1, Number(e.target.value) || 279); };
    $$('[data-rc][data-k]', m).forEach((i) => (i.onchange = () => { D.report.cias[+i.dataset.rc][i.dataset.k] = i.value.trim(); }));
    $$('[data-rcdel]', m).forEach((b) => (b.onclick = () => { D.report.cias.splice(+b.dataset.rcdel, 1); redraw(); }));
    if ($('#rcAdd')) $('#rcAdd').onclick = () => { D.report.cias.push({ n: '', c: '' }); redraw(); };
    $('#rpOn').onchange = (e) => { D.report.on = e.target.checked; };
    $$('[data-rd]', m).forEach((i) => (i.onchange = () => { const d = +i.dataset.rd; D.report.days = i.checked ? [...new Set([...D.report.days, d])].sort() : D.report.days.filter((x) => x !== d); }));
    $('#rpTimes').onchange = (e) => { D.report.times = normReport({ times: e.target.value.split(/[,;\s]+/) }).times; e.target.value = D.report.times.join(', '); };
    $('#rpCover').onchange = (e) => { D.report.cover = e.target.value; $('#rpDays').hidden = e.target.value !== 'days'; };
    $('#rpDays').onchange = (e) => { D.report.coverDays = Math.max(1, Math.min(30, Number(e.target.value) || 3)); };
    $('#idle').onchange = (e) => { D.motor.idleMin = Math.max(5, parseInt(e.target.value, 10) || 30); };
    $('#idleM').onchange = (e) => { D.mobile.idleMin = Math.max(0, Math.min(240, parseInt(e.target.value, 10) || 0)); };
    $('#cfReset').onclick = () => { D = null; redraw(); };
    $('#cfSave').onclick = async () => {
      const err = [];
      D.shifts.forEach((x) => { x.n = String(x.n || '').trim(); });
      if (D.shifts.some((x) => !x.n)) err.push('Cada turno necesita nombre.');
      if (new Set(D.shifts.map((x) => x.n.toLowerCase())).size !== D.shifts.length) err.push('Hay turnos con el mismo nombre.');
      if (D.shifts.some((x) => !/^\d{2}:\d{2}$/.test(x.s) || !/^\d{2}:\d{2}$/.test(x.e))) err.push('Revisa las horas de inicio y fin.');
      const dupe = (a) => a.length !== new Set(a).size;
      if (D.users.some((u) => u.emp === 'ADMIN')) err.push('ADMIN es un nombre reservado.');
      if (D.users.some((u) => !u.emp || !u.name)) err.push('Cada usuario necesita No. de empleado y nombre.');
      if (dupe(D.users.map((u) => u.emp))) err.push('Hay usuarios con el mismo No. de empleado.');
      if (D.holidays.some((h) => !/^\d{4}-\d{2}-\d{2}$/.test(h.d))) err.push('Cada festivo necesita fecha.');
      if (D.labels.comps.some((c) => !String(c.n).trim() || !/^[A-Z]{1,4}$/.test(c.p))) err.push('Etiquetas: cada componente necesita nombre y un prefijo de 1 a 4 letras.');
      if (D.labels.comps.some((c) => !/^[A-Z]{1,4}$/.test(c.pd || ''))) err.push('Etiquetas: cada componente necesita prefijo de Devolución (1 a 4 letras).');
      if (dupe(D.labels.comps.map((c) => String(c.n).trim().toLowerCase())) || dupe(D.labels.comps.flatMap((c) => [c.p, c.pd]))) err.push('Etiquetas: hay componentes o prefijos repetidos (incluye los de Devolución).');
      if (!(D.report.rate > 0)) err.push('External Sequence Status: el rate debe ser mayor a 0.');
      if (D.report.on && D.report.times.length && !D.report.days.length) err.push('External Sequence Status: elige al menos un día de ejecución.');
      if (D.labels.lines.some((l) => !String(l.l).trim())) err.push('Etiquetas: cada línea necesita identificador.');
      if (dupe(D.labels.lines.map((l) => String(l.l).trim()))) err.push('Etiquetas: hay líneas repetidas.');
      if (err.length) return App.modal({ title: 'Revisa la configuración', body: `<ul class="errs">${err.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` });
      try { await App.busy('Guardando configuración…', () => save(D)); D = null; toast('Configuración guardada. Las tabletas la toman al conectarse.', 'ok', 5000); if (App.S.result) App.ui.render(); else redraw(); }
      catch (e) { toast(e.message, 'err', 7000); }
    };
  }
  const discard = () => { D = null; };

  App.cfg = { normReport, NAME, DAYS, ROLE_N, addPending, upgradePw, sups, needsFirst, get seal() { return META.seal; }, get master() { return META.master; }, claimMaster, isMaster, load, save, render, discard, shiftAt, opDate, hours, hasGoal, holiday, isoDay, hm, inShift, hashPw, get: () => CFG, get loaded() { return META.loaded; } };
})(window.App);
