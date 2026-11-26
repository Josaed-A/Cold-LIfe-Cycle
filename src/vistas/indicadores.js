// Indicadores de proceso: disponibilidad, MTBF, MTTR y costos acumulados contra sus objetivos.
import { info } from '../ui/ayuda.js';
import { esc, fCOP, fFecha, fMes, fNum, origenHTML } from '../ui/formato.js';
import { graficoObjetivo } from '../ui/grafico.js';

export function render(root, app) {
  const cfg = app.cfg; const O = cfg.objetivos; const K = app.kpis(); const ev = app.eventos();
  const deArchivo = !!app.store.eventosArchivo;
  const kpi = (t, v, sufijo, ok, obj, ayuda) => `<div class="kpi ${ok === null ? '' : ok ? 'ok' : 'mal'}"><div class="t">${t} ${info(ayuda)} ${origenHTML('inferido')}</div><div class="v">${v}<small> ${sufijo}</small></div><div class="d">Objetivo ${obj} · ${ok === null ? 'sin fallas aún' : ok ? '<span class="ok">cumple</span>' : '<span class="no">no cumple</span>'}</div></div>`;
  const costoOk = K.costoAcum <= K.presupuestoAcum;
  root.innerHTML = `
    <div class="cabecera"><div><h1>Indicadores de proceso ${info(`<p>Se calculan con la bitácora de mantenimiento desde la puesta en servicio (${fFecha(cfg.puestaEnServicio)}) hasta el día de análisis. Solo las <b>fallas</b> cuentan como parada para la disponibilidad (definición del informe, Etapa 5); los preventivos suman costo.</p><p>Si el escenario simulado ya llegó a F, su falla funcional se agrega a la bitácora con el costo y la parada de la tarea correspondiente.</p>`)}</h1>
      <p>Bitácora: ${deArchivo ? 'cargada desde archivo' : 'simulada (no hay registros reales del equipo)'} ${origenHTML(deArchivo ? 'medido' : 'supuesto', !deArchivo)}</p></div>
      <div class="fila no-print"><button class="btn" id="kiCargar">Cargar bitácora…</button>${deArchivo ? '<button class="btn" id="kiSim">Usar la simulada</button>' : ''}</div></div>
    <div class="kpis">
      ${kpi('Disponibilidad', fNum(K.disp, 2), '%', K.disp >= O.disponibilidad.v, `≥ ${O.disponibilidad.v} %`, `<p>(Horas calendario − horas de falla) / horas calendario, acumulada.</p><p>Objetivo: ${esc(O.disponibilidad.fuente)}.</p>`)}
      ${kpi('MTBF', K.mtbf === null ? '—' : fNum(K.mtbf), 'h', K.mtbf === null ? null : K.mtbf >= O.mtbf.v, `≥ ${fNum(O.mtbf.v)} h`, `<p>Horas de operación / número de fallas, acumulado. ${K.nFallas} falla(s).</p><p>Objetivo: ${esc(O.mtbf.fuente)}.</p>`)}
      ${kpi('MTTR', K.mttr === null ? '—' : fNum(K.mttr, 1), 'h', K.mttr === null ? null : K.mttr <= O.mttr.v, `≤ ${O.mttr.v} h`, `<p>Horas de reparación / número de fallas, acumulado.</p><p>Objetivo: ${esc(O.mttr.fuente)}.</p>`)}
      ${kpi('Costo acumulado', fCOP(K.costoAcum), '', costoOk, `≤ ${fCOP(K.presupuestoAcum)}`, `<p>Suma de preventivos, correctivos y fallas frente al presupuesto anual de mantenimiento prorrateado.</p><p>Presupuesto: ${esc(O.presupuestoAnual.fuente)}.</p>`)}
    </div>
    <div class="espacio"></div>
    <div class="rejilla c2">
      <div class="panel"><h3>Disponibilidad mensual</h3><div class="grafico medio"><canvas id="kiDisp"></canvas></div></div>
      <div class="panel"><h3>Costo acumulado frente al presupuesto</h3><div class="grafico medio"><canvas id="kiCosto"></canvas></div></div>
      <div class="panel"><h3>MTBF acumulado</h3><div class="grafico medio"><canvas id="kiMtbf"></canvas></div></div>
      <div class="panel"><h3>MTTR acumulado</h3><div class="grafico medio"><canvas id="kiMttr"></canvas></div></div>
    </div>
    <div class="espacio"></div>
    <div class="panel"><h3>Bitácora de mantenimiento</h3><div class="tabla-wrap"><table>
      <thead><tr><th>Fecha</th><th>Tipo</th><th>Modo</th><th>Descripción</th><th class="n">Parada (h)</th><th class="n">Costo</th><th>Origen</th></tr></thead>
      <tbody>${ev.slice().reverse().map((e) => `<tr><td class="num">${fFecha(e.fecha)}</td><td>${e.tipo === 'falla' ? '<b class="no">falla</b>' : esc(e.tipo)}</td><td>${e.modo ? `${esc(e.modo)} <span class="sub">${esc(cfg.modos[e.modo]?.nombre ?? '')}</span>` : '—'}</td><td>${esc(e.descripcion)}</td><td class="n">${fNum(e.horasParada)}</td><td class="n">${fCOP(e.costo)}</td><td>${origenHTML(e.origen || 'supuesto', e.origen !== 'medido')}</td></tr>`).join('')}</tbody>
    </table></div></div>`;
  const m = K.meses; const et = m.map((x) => fMes(x.mes + '-01'));
  const charts = [
    graficoObjetivo(root.querySelector('#kiDisp'), et, [{ label: 'Disponibilidad', data: m.map((x) => x.disp), backgroundColor: m.map((x) => (x.disp >= O.disponibilidad.v ? '#2e9e5b' : '#d64545')) }], O.disponibilidad.v, { unidad: '%', y: { min: Math.min(97, Math.floor(Math.min(...m.map((x) => x.disp)))), max: 100 }, fmt: (x) => fNum(x, 2) + ' %' }),
    graficoObjetivo(root.querySelector('#kiCosto'), et, [{ label: 'Costo acumulado', data: m.map((x) => x.costoAcum), borderColor: '#f2bd4c', backgroundColor: '#f2bd4c' }, { label: 'Presupuesto acumulado', data: m.map((x) => x.presupuestoAcum), borderColor: '#5ccf8c', borderDash: [6, 4], backgroundColor: '#5ccf8c' }], null, { tipo: 'line', unidad: 'COP', fmt: fCOP, y: { beginAtZero: true, ticks: { callback: (x) => fNum(x / 1e6, 1) + ' M' } } }),
    graficoObjetivo(root.querySelector('#kiMtbf'), et, [{ label: 'MTBF', data: m.map((x) => x.mtbf), borderColor: '#7cc4f0', backgroundColor: '#7cc4f0', spanGaps: true }], O.mtbf.v, { tipo: 'line', unidad: 'h', fmt: (x) => fNum(x) + ' h', y: { beginAtZero: true } }),
    graficoObjetivo(root.querySelector('#kiMttr'), et, [{ label: 'MTTR', data: m.map((x) => x.mttr), borderColor: '#c7a8f0', backgroundColor: '#c7a8f0', spanGaps: true }], O.mttr.v, { tipo: 'line', unidad: 'h', fmt: (x) => fNum(x, 1) + ' h', y: { beginAtZero: true } }),
  ];
  app.alLimpiar(() => charts.forEach((c) => c.destroy()));
  root.querySelector('#kiCargar').addEventListener('click', () => app.pedirArchivo('eventos'));
  root.querySelector('#kiSim')?.addEventListener('click', () => { app.store.eventosArchivo = null; app.guardar(); app.render(); });
}
