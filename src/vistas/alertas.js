// Alertas y acciones: cada variable en alerta o alarma genera una orden de trabajo sugerida.
import { info } from '../ui/ayuda.js';
import { esc, fCOP, fDias, fFecha, fNum, estadoHTML, origenHTML, NOMBRE_ESTADO } from '../ui/formato.js';
import { descargar } from '../almacen.js';

const AYUDA = (cfg) => `<p><b>De la alerta a la orden.</b> Cuando una variable cruza P (alerta) o la alarma, la plataforma crea una orden sugerida con:</p>
<ul><li><b>Modo de falla del AMFEC</b> que anticipa la variable (si anticipa dos, se toma el de mayor criticidad C y el otro queda como diagnóstico diferencial).</li>
<li><b>Tarea del RCM</b> para ese modo, recurso, horas-hombre y repuestos.</li>
<li><b>Prioridad</b> según la criticidad C del AMFEC y el nivel (matriz abajo).</li>
<li><b>Plazo</b>: el máximo de la prioridad; en alerta se acorta si la tendencia dice que la alarma llega antes (tiempo hasta la alarma − preparación).</li></ul>
<p><b>Alarma = paro obligatorio</b> (está antes de F en la curva P-F): detener el compresor, trasladar el inventario con el plan de contingencia del informe y ejecutar la tarea.</p>`;

function otHTML(o, app) {
  const cfg = app.cfg; const v = cfg.variables.find((x) => x.id === o.var); const M = cfg.modos[o.modo];
  const otros = o.modos.slice(1).map((m) => `${m} ${cfg.modos[m].nombre} (C ${cfg.modos[m].C}): ${cfg.tareas[m].tarea}`);
  const limite = o.plazoDias < 1 ? `${fNum(o.plazoDias * 24)} h` : fDias(o.plazoDias);
  return `<div class="ot${o.paro ? ' paro' : ''}">
    ${o.paro ? `<div class="paro-banner">PARO OBLIGATORIO · ${o.estado === 'falla' ? 'falla funcional alcanzada (F)' : 'alarma antes de F'}</div>` : ''}
    <div class="ot-cab"><span class="prio prio-${o.p}">${o.p} · ${o.pTxt}</span><b class="id">${o.id}</b>${estadoHTML(o.estado)}
      <span>${esc(v.nombre)}: <b>${fNum(o.x, v.dec)} ${v.unidad}</b> ${origenHTML(app.A.vars[o.var].origen, app.simulado)}</span><span class="tenue">desde ${fFecha(o.desde)}</span></div>
    <div class="ot-grid">
      <div><span>Modo de falla (AMFEC)</span><b>${o.modo} · ${esc(M.nombre)}</b><br><small class="tenue">${esc(M.efecto)}</small><br><small>S/O/D ${M.S}/${M.O}/${M.D} · NPR ${M.NPR} · <b>C ${M.C}</b></small></div>
      <div><span>Recurso</span>${esc(o.recurso)}<br><small class="tenue">${o.horas} h-h · ${esc(o.repuestos)}</small></div>
      <div><span>Plazo ${origenHTML('inferido')}</span><b>${limite}</b> · hasta ${fFecha(o.limite)}<br><small class="tenue">${o.porTendencia ? 'acortado por la tendencia (alarma − preparación)' : `máximo de ${o.p}`} · preparación ${fDias(o.preparacion)}</small></div>
      <div><span>Costo ${origenHTML('supuesto')}</span>Intervenir: <b>${fCOP(o.costo)}</b><br><small class="tenue">Si llega a F: ${fCOP(o.costoFalla)} y ${o.paradaFalla} h de parada</small></div>
    </div>
    <p class="tarea"><b>Tarea RCM</b> <span class="chip">${esc(o.tipo)}</span> ${esc(o.tarea)}</p>
    ${otros.length ? `<p class="tenue" style="margin:.4em 0 0;font-size:.84rem">Diagnóstico diferencial: ${otros.map(esc).join(' · ')}</p>` : ''}
  </div>`;
}

export function render(root, app) {
  const cfg = app.cfg; const A = app.A;
  const proximas = cfg.variables.filter((v) => A.vars[v.id].veredicto?.tipo === 'vigilar');
  const subidas = A.cruces.filter((c) => c.sube && !A.cruces.some((d) => d.var === c.var && d.a === c.a && d.i < c.i && c.i - d.i <= 7)).reverse();
  const P = cfg.prioridad;
  root.innerHTML = `
    <div class="cabecera"><div><h1>Alertas y acciones ${info(AYUDA(cfg))}</h1><p>Órdenes de trabajo sugeridas el ${fFecha(A.fecha)}.</p></div>
      <div class="fila no-print"><button class="btn" id="alCsv" ${A.ordenes.length ? '' : 'disabled'}>Exportar CSV</button><button class="btn" onclick="print()">Imprimir</button></div></div>
    ${A.ordenes.length ? A.ordenes.map((o) => otHTML(o, app)).join('') : `<div class="aviso azul"><b>Sin alertas.</b> Todas las variables están en su zona normal; no hay órdenes sugeridas.</div>`}
    ${proximas.length ? `<div class="aviso">${proximas.map((v) => `<b>${esc(v.nombre)}</b> llegaría a P en ${fDias(A.vars[v.id].veredicto.dias)} (menos que P-F/2): confirmar en la próxima medición.`).join('<br>')}</div>` : ''}
    <div class="rejilla c2">
      <div class="panel"><h3>Matriz de prioridad ${info('<p>La prioridad sale de la <b>criticidad C = S × O</b> del AMFEC y del nivel alcanzado. El plazo es el tiempo máximo para ejecutar la orden.</p>')}</h3>
        <table><thead><tr><th>Nivel</th><th>C ≥ 40</th><th>30 ≤ C &lt; 40</th><th>C &lt; 30</th></tr></thead><tbody>
          ${['alarma', 'alerta'].map((n) => `<tr><td>${estadoHTML(n)}</td>${P[n].map((p) => `<td><span class="prio prio-${p.p}">${p.p}</span> ≤ ${p.plazo < 1 ? fNum(p.plazo * 24) + ' h' : p.plazo + ' d'}</td>`).join('')}</tr>`).join('')}
        </tbody></table>
        <p class="tenue" style="font-size:.84rem;margin:.6em 0 0">Modos del AMFEC sin variable continua: ${Object.keys(cfg.modos).filter((m) => !cfg.variables.some((v) => v.modos.includes(m))).map((m) => `<b>${m} ${esc(cfg.modos[m].nombre)}</b> → ${esc(cfg.tareas[m].tipo)}: ${esc(cfg.tareas[m].tarea)}`).join('; ')}</p>
      </div>
      <div class="panel"><h3>Historial de cruces de umbral ${info('<p>Cada vez que una variable subió de nivel hasta el día de análisis (se omiten los rebotes por ruido dentro de 7 días). Clic para ir a ese día.</p>')}</h3>
        <div style="max-height:300px;overflow:auto"><table><tbody>${subidas.length ? subidas.map((c) => { const v = cfg.variables.find((x) => x.id === c.var); return `<tr class="clic" data-i="${c.i}"><td class="num">${fFecha(c.fecha)}</td><td>${esc(v.corto)}</td><td>${estadoHTML(c.a)}</td></tr>`; }).join('') : '<tr><td class="tenue">Sin cruces hasta el día de análisis.</td></tr>'}</tbody></table></div>
      </div>
    </div>`;
  root.querySelectorAll('tr[data-i]').forEach((tr) => tr.addEventListener('click', () => app.fijarCursor(+tr.dataset.i)));
  root.querySelector('#alCsv')?.addEventListener('click', () => exportar(app));
}

function exportar(app) {
  const cfg = app.cfg; const A = app.A;
  const cab = ['orden', 'prioridad', 'nivel', 'variable', 'valor', 'unidad', 'origen_dato', 'desde', 'modo', 'modo_falla', 'C', 'NPR', 'tarea_rcm', 'tipo', 'recurso', 'horas_hombre', 'repuestos', 'plazo_horas', 'fecha_limite', 'costo_intervenir', 'costo_si_falla'];
  const filas = A.ordenes.map((o) => { const v = cfg.variables.find((x) => x.id === o.var); return [o.id, o.p, NOMBRE_ESTADO[o.estado], v.nombre, o.x, v.unidad, (A.vars[o.var].origen) + (app.simulado ? ' (simulado)' : ''), o.desde, o.modo, cfg.modos[o.modo].nombre, o.C, cfg.modos[o.modo].NPR, o.tarea, o.tipo, o.recurso, o.horas, o.repuestos, Math.round(o.plazoDias * 24), o.limite, o.costo, o.costoFalla]; });
  const csv = [cab, ...filas].map((r) => r.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  descargar(`ordenes_sugeridas_${A.fecha}.csv`, '﻿' + csv, 'text/csv;charset=utf-8');
}

