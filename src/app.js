// Shell: fuente de datos (simulador o archivo), día de análisis, router por hash y barra del simulador.
import { CONFIG, VARIABLES } from './config.js';
import { simular, sumarDias } from './simulador.js';
import { analizar, eventosPeriodo, indicadores } from './analisis.js';
import { serieDeFilas, filasDeCSV, eventosDeFilas } from './datos.js';
import * as almacen from './almacen.js';
import { esc, fFecha } from './ui/formato.js';
import { activarInfo, info } from './ui/ayuda.js';

import * as vEstado from './vistas/estado.js';
import * as vTendencias from './vistas/tendencias.js';
import * as vAlertas from './vistas/alertas.js';
import * as vIndicadores from './vistas/indicadores.js';
import * as vModelo from './vistas/modelo.js';
import * as vDatos from './vistas/datos.js';

window.__appLista = true;
const RUTAS = { estado: vEstado, tendencias: vTendencias, alertas: vAlertas, indicadores: vIndicadores, modelo: vModelo, datos: vDatos };

export const app = {
  cfg: CONFIG,
  store: null,
  serie: null,      // serie vigente (simulada o cargada) + mediciones manuales
  cursor: 0,        // índice del día de análisis
  A: null,          // análisis en el día de análisis
  ventana: 'auto',
  vista: null,
  _limpiezas: [],
  _timer: null,

  alLimpiar(fn) { this._limpiezas.push(fn); },
  guardar() { const e = almacen.guardar(CONFIG.storageKey, this.store); if (e) this.toast(e, true); },
  toast(msg, error = false) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.className = 'toast ver' + (error ? ' error' : '');
    clearTimeout(t._h); t._h = setTimeout(() => { t.className = 'toast'; }, error ? 6000 : 3500);
  },
  simParams() { return { ...CONFIG.simulacion, ...(this.store.sim || {}) }; },
  get simulado() { return this.serie?.fuente === 'simulador'; },

  /** Reconstruye la serie desde la fuente elegida y aplica las mediciones manuales. */
  rehacerSerie(cursor = 'auto') {
    const base = this.store.fuente === 'archivo' && this.store.archivo ? this.store.archivo : simular(CONFIG, this.simParams());
    const s = { ...base, valores: Object.fromEntries(Object.entries(base.valores).map(([k, a]) => [k, [...a]])), origen: Object.fromEntries(CONFIG.variables.map((v) => [v.id, [...(base.origen?.[v.id] || base.fechas.map(() => null))]])), manual: {} };
    for (const m of this.store.manuales) {
      let i = s.fechas.indexOf(m.fecha);
      if (i < 0 && m.fecha > s.fechas.at(-1)) { // la medición manual extiende la serie
        while (s.fechas.at(-1) < m.fecha) { s.fechas.push(sumarDias(s.fechas.at(-1), 1)); for (const v of CONFIG.variables) { s.valores[v.id].push(null); s.origen[v.id].push(null); } }
        i = s.fechas.length - 1;
      }
      if (i < 0 || !VARIABLES[m.var]) continue;
      s.valores[m.var][i] = m.valor; s.origen[m.var][i] = 'medido'; s.manual[`${m.var}|${i}`] = m.instrumento || 'manual';
    }
    this.serie = s;
    const n = s.fechas.length - 1;
    if (cursor === 'auto') cursor = s.meta?.dP ? Math.min(n, Math.round((s.meta.dP + s.meta.dAlarma) / 2)) : n;
    this.fijarCursor(cursor, false);
  },
  fijarCursor(i, refrescar = true) {
    this.cursor = Math.max(0, Math.min(i, this.serie.fechas.length - 1));
    this.A = analizar(this.serie, CONFIG, this.cursor, { ventana: this.ventana });
    actualizarBarra(); actualizarBadge();
    if (!refrescar) return;
    if (this.vista?.actualizar) this.vista.actualizar(document.getElementById('vista'), this); else render();
  },
  /** Eventos de mantenimiento hasta el día de análisis (+ la falla funcional del escenario si ya ocurrió). */
  eventos() {
    const hasta = this.A.fecha; const extra = [];
    const m = this.serie.meta;
    if (this.simulado && m?.dF !== undefined && this.cursor >= m.dF) {
      const T = CONFIG.tareas[m.modo];
      extra.push({ fecha: this.serie.fechas[m.dF], tipo: 'falla', modo: m.modo, descripcion: `Falla funcional del escenario simulado (${CONFIG.modos[m.modo].nombre})`, horasParada: T.falla.horas, costo: T.falla.costo, origen: 'supuesto' });
    }
    const base = this.store.eventosArchivo || CONFIG.eventos;
    return eventosPeriodo(CONFIG, base, hasta, extra).map((e) => (this.store.eventosArchivo && !e.origen ? { ...e, origen: 'medido' } : e));
  },
  kpis() { return indicadores(CONFIG, this.eventos(), this.A.fecha); },

  reproducir(si = !this._timer) {
    clearInterval(this._timer); this._timer = null;
    if (si) {
      if (this.cursor >= this.serie.fechas.length - 1) this.fijarCursor(0);
      this._timer = setInterval(() => { if (this.cursor >= this.serie.fechas.length - 1) return this.reproducir(false); this.fijarCursor(this.cursor + 1); }, 140);
    }
    actualizarBarra();
  },

  async cargarArchivo(file) {
    const { filas, hojas } = await leerArchivo(file, /medic|datos|condic/i);
    const he = hojas && Object.keys(hojas).find((n) => /evento|bitac|mant/i.test(n));
    const eventos = he ? eventosDeFilas(hojas[he]) : null;
    const s = serieDeFilas(filas, CONFIG, file.name);
    this.store.archivo = s; this.store.fuente = 'archivo';
    if (eventos?.length) this.store.eventosArchivo = eventos;
    this.reproducir(false); this.guardar(); this.rehacerSerie(); render();
    this.toast(`${file.name}: ${s.fechas.length} días${eventos ? `, ${eventos.length} eventos` : ''}${s.avisos.length ? ` · ${s.avisos.length} avisos (ver Datos y supuestos)` : ''}.`);
  },
  async cargarEventos(file) {
    const { filas } = await leerArchivo(file, /evento|bitac|mant/i);
    this.store.eventosArchivo = eventosDeFilas(filas); this.guardar(); render();
    this.toast(`Bitácora cargada: ${this.store.eventosArchivo.length} eventos.`);
  },
  usarSimulador(params = {}) {
    this.reproducir(false);
    this.store.fuente = 'simulador'; this.store.sim = { ...(this.store.sim || {}), ...params }; this.guardar();
    this.rehacerSerie(); render();
  },
  pedirArchivo(destino = 'datos') { const f = document.getElementById('archivoDatos'); f.dataset.destino = destino; f.click(); },
};
window.app = app; // útil para depurar desde la consola

/** CSV o Excel → filas de la hoja cuyo nombre coincide con `preferida` (o la primera) y todas las hojas. */
async function leerArchivo(file, preferida) {
  if (!/\.(xlsx|xls)$/i.test(file.name)) return { filas: filasDeCSV(await file.text()), hojas: null };
  const wb = window.XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array', cellDates: true });
  const hojas = Object.fromEntries(wb.SheetNames.map((n) => [n, window.XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: '', raw: true })]));
  return { filas: hojas[wb.SheetNames.find((n) => preferida.test(n)) || wb.SheetNames[0]], hojas };
}

// ---------- Barra del simulador ----------
function saltos() {
  // Primer día de cada color del semáforo en la serie completa (para probar los tres estados).
  const hist = analizar(app.serie, CONFIG, app.serie.fechas.length - 1).hist;
  const primero = (c) => hist.find((d) => d.semaforo === c)?.i;
  return { verde: primero('verde'), amarillo: primero('amarillo'), rojo: primero('rojo'), falla: hist.find((d) => Object.values(d.estados).includes('falla'))?.i };
}

function construirBarra() {
  const b = document.getElementById('simbar');
  const p = app.simParams(); const sim = app.store.fuente !== 'archivo' || !app.store.archivo;
  const opt = (o, v) => Object.entries(o).map(([k, t]) => `<option value="${k}"${String(k) === String(v) ? ' selected' : ''}>${esc(t)}</option>`).join('');
  b.innerHTML = `
    <div class="sb-fuente">
      ${sim ? `<span class="chip-sim" title="Los valores los genera el simulador; no son mediciones reales">DATOS SIMULADOS</span>
        <label class="sb-campo">Escenario <select id="sbEsc">${opt(Object.fromEntries(Object.entries(CONFIG.escenarios).map(([k, e]) => [k, (e.modo ? e.modo + ' · ' : '') + e.nombre])), p.escenario)}</select></label>
        <label class="sb-campo">Ritmo <select id="sbRitmo">${opt({ 0.5: 'lento ×0,5', 1: 'nominal', 2: 'rápido ×2' }, p.ritmo)}</select></label>
        <label class="sb-campo">Ruido <select id="sbRuido">${opt({ 0.5: 'bajo', 1: 'normal', 2: 'alto' }, p.ruido)}</select></label>
        <label class="sb-campo">Semilla <input id="sbSem" type="number" min="1" max="9999" value="${p.semilla}" style="width:70px"></label>
        ${info('<p><b>Simulador con escenarios de degradación.</b> Genera un dato diario (sobrecalentamiento y vibración: semanal, su frecuencia de medición) con ruido gaussiano e inyecta una falla progresiva del modo del AMFEC elegido.</p><p>La variable que anticipa ese modo se degrada con la forma y la tasa de <i>Variables y P-F</i>; las demás se mueven con acoples físicos simples. Cada escenario recorre normal → alerta (P) → alarma (paro) → falla funcional (F).</p><p><b>Ritmo</b> cambia la velocidad de la degradación (×2 = el P-F real es la mitad del supuesto). <b>Semilla</b> cambia el ruido; la misma semilla repite los mismos datos.</p>')}`
    : `<span class="chip-arch" title="Datos cargados desde archivo">ARCHIVO</span> <b>${esc(app.store.archivo.nombre)}</b> <button class="btn chico" id="sbVolver">Volver al simulador</button>`}
    </div>
    <div class="sb-tiempo">
      <button class="btn icono" id="sbIni" title="Primer día" aria-label="Primer día">⏮</button>
      <button class="btn icono" id="sbPlay" title="Reproducir / pausar" aria-label="Reproducir"></button>
      <button class="btn icono" id="sbFin" title="Último día" aria-label="Último día">⏭</button>
      <input type="range" id="sbDia" min="0" value="0" aria-label="Día de análisis">
      <span class="sb-fecha num" id="sbFecha"></span>
      <span class="sb-saltos" id="sbSaltos"></span>
    </div>`;
  const re = () => app.usarSimulador({ escenario: b.querySelector('#sbEsc').value, ritmo: +b.querySelector('#sbRitmo').value, ruido: +b.querySelector('#sbRuido').value, semilla: Math.max(1, Math.round(+b.querySelector('#sbSem').value) || 1) });
  ['#sbEsc', '#sbRitmo', '#sbRuido', '#sbSem'].forEach((s) => b.querySelector(s)?.addEventListener('change', () => { re(); construirBarra(); }));
  b.querySelector('#sbVolver')?.addEventListener('click', () => { app.usarSimulador(); construirBarra(); });
  b.querySelector('#sbIni').addEventListener('click', () => { app.reproducir(false); app.fijarCursor(0); });
  b.querySelector('#sbFin').addEventListener('click', () => { app.reproducir(false); app.fijarCursor(app.serie.fechas.length - 1); });
  b.querySelector('#sbPlay').addEventListener('click', () => app.reproducir());
  b.querySelector('#sbDia').addEventListener('input', (e) => { app.reproducir(false); app.fijarCursor(+e.target.value); });
  b.querySelector('#sbSaltos').addEventListener('click', (e) => { const x = e.target.closest('[data-i]'); if (x) { app.reproducir(false); app.fijarCursor(+x.dataset.i); } });
  actualizarBarra();
}
app.construirBarra = construirBarra;

function actualizarBarra() {
  const b = document.getElementById('simbar'); if (!b.firstElementChild || !app.serie) return;
  const r = b.querySelector('#sbDia'); r.max = app.serie.fechas.length - 1; r.value = app.cursor;
  b.querySelector('#sbPlay').textContent = app._timer ? '⏸' : '▶';
  b.querySelector('#sbFecha').innerHTML = `<b>${fFecha(app.A.fecha)}</b> · día ${app.cursor + 1}/${app.serie.fechas.length}`;
  if (!b._saltos || b._saltos.serie !== app.serie) b._saltos = { serie: app.serie, s: saltos() };
  const s = b._saltos.s; const sem = app.A.salud.semaforo;
  b.querySelector('#sbSaltos').innerHTML = 'Ir a: ' + [['verde', 'Normal'], ['amarillo', 'Alerta'], ['rojo', 'Alarma'], ['falla', 'F']]
    .map(([k, t]) => s[k] === undefined ? `<span class="salto off">${t}</span>` : `<button class="salto s-${k}${(k === sem && k !== 'falla') ? ' on' : ''}" data-i="${s[k]}" title="Primer día en ${t}">${t}</button>`).join('');
}

function actualizarBadge() {
  const n = app.A.ordenes.length; const b = document.getElementById('badgeAlertas');
  b.hidden = !n; b.textContent = n; b.className = 'badge' + (app.A.ordenes.some((o) => o.paro) ? '' : ' ambar');
}

// ---------- Router ----------
function parsear() {
  const partes = (location.hash || '#/estado').replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  return { ruta: RUTAS[partes[0]] ? partes[0] : 'estado', params: partes.slice(1) };
}

function render() {
  app._limpiezas.splice(0).forEach((f) => { try { f(); } catch (e) { console.warn(e); } });
  const { ruta, params } = parsear();
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('activo', a.dataset.r === ruta));
  document.getElementById('nav').classList.remove('abierto');
  const root = document.getElementById('vista');
  app.vista = RUTAS[ruta]; app.params = params;
  try { root.innerHTML = ''; RUTAS[ruta].render(root, app, params); }
  catch (e) { console.error(e); root.innerHTML = `<div class="aviso rojo"><b>Error al mostrar la vista.</b><br>${esc(e.message)}</div>`; }
}
app.render = render;

function iniciar() {
  activarInfo();
  document.getElementById('menuBtn').addEventListener('click', (e) => {
    const n = document.getElementById('nav'); n.classList.toggle('abierto'); e.currentTarget.setAttribute('aria-expanded', n.classList.contains('abierto'));
  });
  document.getElementById('archivoDatos').addEventListener('change', async (e) => {
    const f = e.target.files[0]; const destino = e.target.dataset.destino; e.target.value = '';
    if (!f) return;
    try {
      if (destino === 'eventos') await app.cargarEventos(f);
      else { await app.cargarArchivo(f); construirBarra(); }
    } catch (err) { console.error(err); app.toast('No se pudo leer el archivo: ' + err.message, true); }
  });
  app.store = almacen.cargar(CONFIG.storageKey);
  window.addEventListener('hashchange', render);
  window.addEventListener('keydown', (e) => {
    if (e.target.closest('input, select, textarea')) return;
    if (e.key === ' ') { e.preventDefault(); app.reproducir(); }
    if (e.key === 'ArrowRight') app.fijarCursor(app.cursor + (e.shiftKey ? 7 : 1));
    if (e.key === 'ArrowLeft') app.fijarCursor(app.cursor - (e.shiftKey ? 7 : 1));
  });
  try { app.rehacerSerie(); }
  catch (e) { console.warn('Archivo guardado ilegible; se vuelve al simulador', e); app.store.fuente = 'simulador'; app.store.archivo = null; app.rehacerSerie(); }
  construirBarra();
  render();
}

iniciar();
