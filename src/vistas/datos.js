// Datos y supuestos: fuente de datos, carga de archivos, mediciones manuales, etiquetas de origen,
// supuestos con justificación, fuentes y limitaciones (informe breve imprimible).
import { info } from '../ui/ayuda.js';
import { esc, fFecha, fNum, origenHTML, recurso } from '../ui/formato.js';
import { plantilla, RANGO } from '../datos.js';
import { descargar } from '../almacen.js';
import { render as renderModelo } from './modelo.js';

export function render(root, app) {
  const cfg = app.cfg; const s = app.serie; const A = app.A; const st = app.store;
  const ini = Math.max(0, app.cursor - 13);
  const dias = Array.from({ length: app.cursor - ini + 1 }, (_, k) => app.cursor - k);
  const celda = (v, i) => { const x = s.valores[v.id][i]; if (x === null || x === undefined) return '<td class="n tenue">N/I</td>'; const man = s.manual[`${v.id}|${i}`]; const o = s.origen[v.id][i] || v.origen;
    return `<td class="n">${fNum(x, v.dec)} <span class="compacto">${origenHTML(o, app.simulado && !man)}</span>${man ? `<span class="sub">manual: ${esc(man)}</span>` : ''}</td>`; };
  root.innerHTML = `
    <div class="solo-print"><h2>Informe breve de supuestos, fuentes y limitaciones — Cold Life Cycle</h2><p>${esc(cfg.activo.componente)} · ${esc(cfg.activo.nombre)}. Día de análisis ${fFecha(A.fecha)}.</p></div>
    <div class="cabecera"><div><h1>Datos y supuestos</h1><p>De dónde sale cada número de la plataforma.</p></div>
      <button class="btn no-print" id="daInforme">Imprimir informe completo</button></div>

    <div class="rejilla c2 no-print">
      <div class="panel"><h3>Fuente de datos ${info('<p>La plataforma funciona con datos simulados o reales; el origen siempre queda visible (franja superior y etiqueta de cada dato).</p><p><b>CSV o Excel</b>: una fila por lectura con columna <code>fecha</code> y las variables (<code>tdesc, corriente, ciclo, tcam, sh, vib</code>; se aceptan nombres en español como «Temperatura de descarga»). Varias lecturas el mismo día se promedian (sirve el registro cada 15 min de un datalogger). Columna opcional <code>origen</code> (medido / inferido / supuesto). Un Excel puede traer además una hoja <b>Eventos</b> con la bitácora de mantenimiento.</p><p>Datos inválidos no se convierten en 0: quedan N/I y se listan en los avisos.</p>')}</h3>
        <p>${app.simulado ? `<span class="chip-sim">DATOS SIMULADOS</span> Escenario <b>${esc(s.nombre)}</b> · ${s.fechas.length} días desde ${fFecha(s.fechas[0])}.` : `<span class="chip-arch">ARCHIVO</span> <b>${esc(s.nombre)}</b> · ${s.fechas.length} días (${fFecha(s.fechas[0])} a ${fFecha(s.fechas.at(-1))}).`}</p>
        <div class="fila">
          <button class="btn prim" id="daCargar">Cargar CSV o Excel…</button>
          <button class="btn" id="daPlantilla">Plantilla Excel</button>
          <a class="btn" href="${recurso('data/ejemplo_mediciones.csv')}" download="ejemplo_mediciones.csv">Ejemplo CSV</a>
          <button class="btn" id="daExport">Descargar datos (CSV)</button>
          ${app.simulado ? '' : '<button class="btn" id="daSim">Volver al simulador</button>'}
        </div>
        ${!app.simulado && s.avisos?.length ? `<div class="aviso" style="max-height:160px;overflow:auto"><b>Avisos de la carga (${s.avisos.length})</b><br>${s.avisos.map(esc).join('<br>')}</div>` : ''}
      </div>
      <div class="panel"><h3>Medición manual ${info('<p>Para lecturas tomadas en el activo con instrumento portátil (termómetro infrarrojo, pinza amperimétrica, app de vibración del celular, manómetros). Quedan etiquetadas como <b>Medido</b> y, si caen dentro del período, reemplazan el valor de ese día; si son posteriores, extienden la serie.</p><p>Se guardan en este navegador.</p>')}</h3>
        <form id="daForm" class="fila" style="align-items:flex-end">
          <label class="campo">Fecha<input type="date" name="fecha" value="${A.fecha}" required></label>
          <label class="campo">Variable<select name="var">${cfg.variables.map((v) => `<option value="${v.id}">${esc(v.corto)} (${esc(v.unidad)})</option>`).join('')}</select></label>
          <label class="campo">Valor<input type="text" inputmode="decimal" name="valor" required style="width:90px"></label>
          <label class="campo">Instrumento<input type="text" name="inst" placeholder="p. ej. pinza Fluke" style="width:150px"></label>
          <button class="btn prim">Agregar</button>
        </form>
        ${st.manuales.length ? `<table style="margin-top:10px"><tbody>${st.manuales.map((m, k) => { const v = cfg.variables.find((x) => x.id === m.var); return `<tr><td class="num">${fFecha(m.fecha)}</td><td>${esc(v?.corto ?? m.var)}</td><td class="n">${fNum(m.valor, v?.dec ?? 2)} ${esc(v?.unidad ?? '')}</td><td>${esc(m.instrumento || '')}</td><td>${origenHTML('medido')}</td><td><button class="btn chico" data-borrar="${k}">Quitar</button></td></tr>`; }).join('')}</tbody></table>` : '<p class="tenue" style="font-size:.85rem">Sin mediciones manuales.</p>'}
      </div>
    </div>
    <div class="espacio no-print"></div>

    <div class="panel"><h3>Últimos 14 días hasta el día de análisis ${info('<p>Valor diario de cada variable con su etiqueta: <b>M</b> medido, <b>I</b> inferido, <b>S</b> supuesto. <b>sim</b> marca valores que generó el simulador: representan lo que mediría el instrumento, pero no son mediciones reales.</p>')}</h3>
      <div class="tabla-wrap"><table><thead><tr><th>Fecha</th>${cfg.variables.map((v) => `<th class="n">${esc(v.corto)}<br><small>${esc(v.unidad)}</small></th>`).join('')}</tr></thead>
      <tbody>${dias.map((i) => `<tr><td class="num">${fFecha(s.fechas[i])}</td>${cfg.variables.map((v) => celda(v, i)).join('')}</tr>`).join('')}</tbody></table></div>
    </div>
    <div class="espacio"></div>

    <div class="rejilla c2">
      <div class="panel"><h3>Etiquetas de origen</h3><table><tbody>
        <tr><td>${origenHTML('medido')}</td><td>Lo registró un instrumento o una persona en el activo.<span class="sub">Temperatura de descarga, corriente, temperatura de cámara, vibración; mediciones manuales; bitácora cargada.</span></td></tr>
        <tr><td>${origenHTML('inferido')}</td><td>Se calculó a partir de datos medidos.<span class="sub">Ciclo útil, sobrecalentamiento, subíndices e índice de salud, tendencias, tiempo hasta el umbral, P-F consumido, plazos, disponibilidad, MTBF, MTTR.</span></td></tr>
        <tr><td>${origenHTML('supuesto')}</td><td>Se asumió por falta de dato; está justificado abajo.<span class="sub">Umbrales, tasas de degradación e intervalo P-F, RLA, línea base, costos y tiempos de las tareas, objetivos MTBF/MTTR, bitácora simulada.</span></td></tr>
        <tr><td>${origenHTML('medido', true)}</td><td>Valor simulado: lo que mediría el instrumento según el escenario. <b>No es una medición real.</b></td></tr>
      </tbody></table></div>
      <div class="panel"><h3>Limitaciones</h3><ul class="lista-simple">${cfg.limitaciones.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>
    </div>
    <div class="espacio"></div>

    <div class="panel"><h3>Supuestos ${origenHTML('supuesto')}</h3><div class="tabla-wrap"><table>
      <thead><tr><th>Parámetro</th><th>Valor</th><th>Justificación</th><th>Cómo validarlo</th></tr></thead>
      <tbody>${cfg.supuestos.map(([p, v, j, c]) => `<tr><td><b>${esc(p)}</b></td><td>${esc(v)}</td><td>${esc(j)}</td><td>${esc(c)}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="espacio"></div>
    <div class="panel"><h3>Fuentes</h3><table><tbody>${cfg.fuentes.map(([a, t]) => `<tr><td><b>${esc(a)}</b></td><td>${esc(t)}</td></tr>`).join('')}
      <tr><td><b>Poly Haven (CC0)</b></td><td>Modelos 3D: unidad condensadora exterior, estantería, canasta plástica, tablero eléctrico y luminaria (assets/modelos/LICENCIAS.md).</td></tr></tbody></table></div>`;

  root.querySelector('#daCargar').addEventListener('click', () => app.pedirArchivo('datos'));
  root.querySelector('#daSim')?.addEventListener('click', () => { app.usarSimulador(); app.construirBarra(); });
  // Informe completo (supuestos, fuentes y limitaciones) en una sola impresión: «Variables y P-F» va antes de esta
  // vista, solo en papel, y se quita al terminar.
  root.querySelector('#daInforme').onclick = () => {
    const previo = document.createElement('div'); previo.className = 'solo-print'; previo.style.breakAfter = 'page';
    renderModelo(previo, app); root.querySelector('.solo-print').after(previo);
    window.addEventListener('afterprint', () => previo.remove(), { once: true }); print();
  };
  root.querySelector('#daPlantilla').addEventListener('click', () => {
    const p = plantilla(cfg); const X = window.XLSX; const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(p.mediciones), 'Mediciones');
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(p.eventos), 'Eventos');
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(cfg.variables.map((v) => ({ columna: v.id, variable: v.nombre, unidad: v.unidad, origen: v.origen, metodo: v.metodo }))), 'Variables');
    X.writeFile(wb, 'plantilla_cold_life_cycle.xlsx');
  });
  root.querySelector('#daExport').addEventListener('click', () => {
    const cab = ['fecha', ...cfg.variables.map((v) => v.id), 'origen'];
    const filas = s.fechas.map((f, i) => [f, ...cfg.variables.map((v) => (s.valores[v.id][i] ?? '')), app.simulado ? 'simulado' : '']);
    descargar(`datos_${app.simulado ? 'simulados_' + (app.simParams().escenario) : 'archivo'}.csv`, '﻿' + [cab, ...filas].map((r) => r.join(';').replace(/(\d)\.(\d)/g, '$1,$2')).join('\r\n'), 'text/csv;charset=utf-8');
  });
  root.querySelector('#daForm').addEventListener('submit', (e) => {
    e.preventDefault(); const f = new FormData(e.target);
    const v = cfg.variables.find((x) => x.id === f.get('var')); const valor = Number(String(f.get('valor')).replace(',', '.'));
    if (!Number.isFinite(valor)) return app.toast('Valor no numérico.', true);
    const [lo, hi] = RANGO[v.id]; if (valor < lo || valor > hi) return app.toast(`${v.corto} fuera del rango físico [${lo}, ${hi}] ${v.unidad}.`, true);
    const fecha = f.get('fecha');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha < s.fechas[0]) return app.toast('La fecha debe estar dentro o después del período de datos.', true);
    st.manuales.push({ fecha, var: v.id, valor, instrumento: String(f.get('inst') || '').slice(0, 60) });
    app.guardar(); app.rehacerSerie(app.cursor); app.render();
    app.toast(`Medición manual agregada: ${v.corto} = ${fNum(valor, v.dec)} ${v.unidad}.`);
  });
  root.querySelectorAll('[data-borrar]').forEach((b) => b.addEventListener('click', () => { st.manuales.splice(+b.dataset.borrar, 1); app.guardar(); app.rehacerSerie(app.cursor); app.render(); }));
}
