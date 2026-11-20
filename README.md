# QORVEX · Manufacturing Intelligence Engine (V 13)

© 2026 CH Industrial Solutions · Ing. Carlos Alberto Hernández Hernández · Todos los derechos reservados. Ver LEGAL.md, LICENSE.txt y TERCEROS.txt.

Publicado en GitHub Pages: https://charliealberth2805-svg.github.io/QORVEX/

## Uso
- Edge o Chrome en Windows → **Conectar carpeta** (carpeta compartida **Data Base**) → **Iniciar sesión**.
- Cuenta maestra: **ADMIN / admin2026**. Los demás se registran (quedan pendientes) o los da de alta un Administrador en **CONFIG**.
- Roles: **Administrador** (todo) · **Capturista** (Motor y Mobile, sin CONFIG) · **Validador** (solo QORVEX MOBILE).
- Editor / Consulta: una sola persona edita a la vez; el modo Editor se cierra tras 30 min sin movimiento.
- CONFIG: turnos, días, festivos, metas, supervisores, usuarios (misma lista que Mobile), fondo del login y logos de empresa (salen en reportes impresos).

## Estructura
- `index.html` · `css/` · `img/` (logo QORVEX, icono CH, fondos con marca CH) · `js/` (un archivo por módulo; `js/lib/` = xlsx-js-style, Apache 2.0).
- Datos: nunca en este repositorio; viven en la carpeta Data Base (TXT de capturas, Excel de Planes/Pulls, Config_QORVEX.json).

QORVEX MOBILE: https://charliealberth2805-svg.github.io/Qorvex-Mobile/


## Etiquetas 6 × 4
Pestaña **ETIQUETAS** (misma en QORVEX y QORVEX MOBILE): genera, imprime, reimprime y anula etiquetas de Validación, Secuencia y Línea. Registro en TXT dentro de `Data Base/Etiquetas/`; los consecutivos se reservan con candado para que dos equipos nunca saquen el mismo ID. Código compartido: `js/etiquetas.js` (en MOBILE va incluido dentro de `index.html`). Código de barras Code 128 propio, sin librerías externas.
