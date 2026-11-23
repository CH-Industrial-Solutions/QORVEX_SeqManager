/*! QORVEX · © 2026 CH Industrial Solutions · Ing. Carlos Alberto Hernández Hernández · Todos los derechos reservados. Software propietario: prohibida su copia, modificación o distribución sin autorización por escrito. Ver LEGAL.md y LICENSE.txt. */
/* =====================================================================
   auth.js — inicio de sesión y registro de QORVEX (Motor)
   - Usuarios: los mismos de QORVEX MOBILE (Config_QORVEX.json).
   - Roles: Administrador (todo) · Capturista (Motor y Mobile sin
     configuración) · Validador (solo QORVEX MOBILE, no entra aquí).
   - V 13.05: sin clave fija. El primer usuario de la carpeta es el Admin master
     (Data Base\Seguridad). Contraseñas con PBKDF2; las anteriores se actualizan al entrar.
   - Registrarse crea una cuenta PENDIENTE que aprueba un Administrador.
   ===================================================================== */
(function (App) {
  const { $, $$, esc, toast } = App;
  const RESERVED = ['ADMIN'];
  const TAMPER = 'Aviso: Config_QORVEX.json fue modificado fuera de QORVEX. Un Supervisor / Admin debe revisar usuarios y roles en CONFIG y guardar para volver a sellarla.';
  const KEY = 'qx_motor_user';
  let ME = null;

  const user = () => ME;
  const isAdmin = () => !!ME && ME.role === 'admin';
  const canEditor = () => !!ME && (ME.role === 'admin' || ME.role === 'capturista');
  const roleTxt = (r) => App.cfg.ROLE_N[r] || r;
  const wall = () => { let n = 1; try { n = App.cfg.loaded ? App.cfg.get().brand.wall : +(localStorage.getItem('qx_wall') || 1); localStorage.setItem('qx_wall', n); } catch (e) {} return n === 2 ? 2 : 1; };

  function logout() { ME = null; try { sessionStorage.removeItem(KEY); } catch (e) {} }

  /** Valida usuario y contraseña contra la configuración de la carpeta */
  async function check(emp, pw) {
    emp = String(emp || '').trim().toUpperCase();
    if (RESERVED.includes(emp)) return { err: 'Usuario o contraseña incorrectos.' };
    const u = App.cfg.get().users.find((x) => x.emp === emp);
    if (!u || !u.pw || !(await window.QXsec.pwOk(emp, pw, u.pw))) return { err: 'Usuario o contraseña incorrectos.' };
    if (u.status === 'pendiente') return { err: 'Tu cuenta está pendiente: un Supervisor / Admin debe aprobarla.' };
    if (!u.active) return { err: 'Usuario desactivado. Consulta a un Supervisor / Admin.' };
    if (u.role === 'validador') return { err: 'Tu rol (Validador) no tiene acceso a QORVEX. Usa QORVEX MOBILE.' };
    if (window.QXsec.isWeak(u.pw)) { const old = u.pw; window.QXsec.pwMake(emp, pw).then(async (nh) => { await App.cfg.upgradePw(emp, old, nh); if (u.role === 'admin') await App.cfg.claimMaster(emp, nh); }).catch((e) => console.warn('cifrado', e)); }
    else if (u.role === 'admin' && !App.cfg.master) App.cfg.claimMaster(emp, u.pw).catch((e) => console.warn('master', e));
    return { ok: { emp: u.emp, name: u.name, role: u.role } };
  }
  /** Si ya hay sesión válida en esta pestaña, la reutiliza; si no, muestra el login */
  async function ensure() {
    try {
      const s = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (s) {
        const u = App.cfg.get().users.find((x) => x.emp === s.emp && x.active && x.status !== 'pendiente' && x.role !== 'validador');
        if (u) { ME = { emp: u.emp, name: u.name, role: u.role }; return true; }
      }
    } catch (e) {}
    return show();
  }

  function show() {
    return new Promise((resolve) => {
      const n = wall();
      $('#app').innerHTML = `<div class="lg-page" style="background-image:url('img/wall-${n}.jpg')">
        <div class="lg-card">
          <div class="lg-brand"><img src="img/qorvex-logo-${App.ui && App.ui.isLight && App.ui.isLight() ? 'light' : 'dark'}.png" alt="QORVEX"></div>
          <div class="lg-sw" role="tablist"><span class="lg-knob"></span><button type="button" class="on" data-p="0">Iniciar sesión</button><button type="button" data-p="1">Registrarse</button></div>
          <div class="lg-view"><div class="lg-track">
            <form class="lg-pane" id="fIn" autocomplete="off" novalidate>
              <h2>Bienvenido</h2><p class="muted">Entra con tu número de empleado y contraseña.</p>
              ${App.cfg.seal === 'mal' ? `<div class="lg-note">⚠ ${esc(TAMPER)}</div>` : App.cfg.needsFirst() ? '<div class="lg-note">Carpeta nueva: el primero en registrarse será el <b>Admin master</b> (Supervisor / Admin).</div>' : ''}
              <label>No. de empleado<input class="input" name="emp" autocomplete="username" placeholder="No. de empleado"></label>
              <label>Contraseña<input class="input" name="pw" type="password" autocomplete="current-password" placeholder="Contraseña"></label>
              <div class="lg-err" id="eIn"></div>
              <button class="btn primary big" type="submit">Ingresar</button>
              <p class="muted small">¿Olvidaste tu contraseña? Pide a un Supervisor / Admin que te asigne una nueva.</p>
            </form>
            <form class="lg-pane" id="fUp" autocomplete="off" novalidate>
              <h2>${App.cfg.needsFirst() ? 'Configuración inicial' : 'Crear cuenta'}</h2><p class="muted">${App.cfg.needsFirst() ? 'Carpeta nueva: esta cuenta será el <b>Admin master</b> (primer Supervisor / Admin).' : 'Tu cuenta quedará pendiente hasta que un Supervisor / Admin la apruebe y te asigne rol.'}</p>
              <label>No. de empleado<input class="input" name="emp" maxlength="15" placeholder="Será tu usuario"></label>
              <label>Nombre completo<input class="input" name="name" maxlength="60"></label>
              <div class="lg-2"><label>Contraseña<input class="input" name="pw" type="password" autocomplete="new-password" placeholder="Mín. 4"></label>
              <label>Confirmar<input class="input" name="pw2" type="password" autocomplete="new-password"></label></div>
              <label class="lg-chk"><input type="checkbox" name="ok"> Acepto el <a href="#" data-legal>aviso legal y los términos de uso</a></label>
              <div class="lg-err" id="eUp"></div>
              <button class="btn primary big" type="submit">Registrarme</button>
            </form>
          </div></div>
          <div class="lg-foot"><a href="#" data-legal>Aviso legal · Términos · Privacidad</a><span>${esc(App.legal.FOOT)}</span></div>
        </div></div>`;
      const pg = $('.lg-page');
      const go = (p) => { pg.classList.toggle('up', p === 1); $$('.lg-sw button').forEach((b) => b.classList.toggle('on', +b.dataset.p === p)); setTimeout(() => (p ? $('#fUp').emp : $('#fIn').emp).focus(), 320); };
      $$('.lg-sw button').forEach((b) => (b.onclick = () => go(+b.dataset.p)));
      $$('[data-legal]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); App.legal.open(); }));
      const fi = $('#fIn'), fu = $('#fUp');
      [fi.emp, fu.emp].forEach((i) => i.addEventListener('input', () => { i.value = i.value.toUpperCase().replace(/\s/g, ''); }));
      fi.emp.focus();
      fi.onsubmit = async (e) => {
        e.preventDefault(); $('#eIn').textContent = '';
        await App.cfg.load(); // por si un Administrador acaba de aprobar o cambiar algo
        const r = await check(fi.emp.value, fi.pw.value);
        if (r.err) { $('#eIn').textContent = r.err; fi.pw.value = ''; fi.pw.focus(); return; }
        ME = r.ok; try { sessionStorage.setItem(KEY, JSON.stringify({ emp: ME.emp })); } catch (x) {}
        resolve(true);
      };
      fu.onsubmit = async (e) => {
        e.preventDefault(); const er = $('#eUp'); er.textContent = '';
        const emp = fu.emp.value.trim().toUpperCase(), name = fu.name.value.trim(), pw = fu.pw.value;
        if (!emp || !/^[A-Z0-9_-]{2,15}$/.test(emp)) return (er.textContent = 'Número de empleado: 2 a 15 letras o números.');
        if (RESERVED.includes(emp)) return (er.textContent = 'Ese usuario está reservado.');
        if (name.length < 3) return (er.textContent = 'Escribe tu nombre completo.');
        if (pw.length < 4) return (er.textContent = 'La contraseña debe tener al menos 4 caracteres.');
        if (pw !== fu.pw2.value) return (er.textContent = 'Las contraseñas no coinciden.');
        if (!fu.ok.checked) return (er.textContent = 'Debes aceptar el aviso legal y los términos de uso.');
        try {
          const first = App.cfg.needsFirst();
          await App.cfg.addPending({ emp, name, pw: await window.QXsec.pwMake(emp, pw), first });
          fu.reset(); toast(first ? 'Admin master creado. Ya puedes iniciar sesión.' : 'Registro enviado. Un Supervisor / Admin debe aprobar tu cuenta.', 'ok', 7000); go(0); fi.emp.value = emp;
        } catch (x) { er.textContent = x.message; }
      };
    });
  }

  /** Primera pantalla: sin sesión no se ve nada. Para iniciar sesión primero se conecta la carpeta (ahí están los usuarios). */
  async function gate() {
    if (ME) return;
    const saved = App.S.savedDir;
    $('#app').innerHTML = `<div class="lg-page" style="background-image:url('img/wall-${wall()}.jpg')">
      <div class="lg-card">
        <div class="lg-brand"><img src="img/qorvex-logo-${App.ui && App.ui.isLight && App.ui.isLight() ? 'light' : 'dark'}.png" alt="QORVEX"></div>
        <div class="lg-pane" style="width:100%">
          <h2>Iniciar sesión</h2>
          <p class="muted">Primero conecta la carpeta compartida <b>Data Base</b>: ahí están los usuarios, la configuración y las capturas.</p>
          ${saved ? `<button class="btn primary big" id="gRe" type="button">Reconectar «${esc(saved.name)}»</button><button class="btn big" id="gPick" type="button">Elegir otra carpeta</button>`
            : '<button class="btn primary big" id="gPick" type="button">Seleccionar carpeta Data Base</button>'}
        </div>
        <div class="lg-foot"><a href="#" data-legal>Aviso legal · Términos · Privacidad</a><span>${esc(App.legal.FOOT)}</span></div>
      </div></div>`;
    $$('[data-legal]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); App.legal.open(); }));
    const go = async (useSaved) => { await App.quickStart(useSaved); if (!ME) gate(); };
    if ($('#gRe')) $('#gRe').onclick = () => go(true);
    $('#gPick').onclick = () => go(false);
  }

  App.auth = { gate, TAMPER, user, isAdmin, canEditor, ensure, show, logout, roleTxt, wall };
})(window.App);
