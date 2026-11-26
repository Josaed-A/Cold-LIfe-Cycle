// Variables y P-F: variables de condición, umbrales con fuente, curvas P-F, pesos y AMFEC ↔ RCM.
import { info } from '../ui/ayuda.js';
import { esc, fDias, fNum, origenHTML } from '../ui/formato.js';
import { intervaloPF, pesos } from '../analisis.js';
import { desviacion, diasHasta } from '../simulador.js';

/** Curva P-F de una variable (SVG): condición de 100 % (sano) a 0 % (F) en el tiempo. */
function curvaPF(v) {
  const W = 330, H = 178, L = 34, R = 12, T = 14, B = 40;
  const u = v.umbrales; const pf = intervaloPF(v);
  const tP = diasHasta(v, u.alerta.v), tA = diasHasta(v, u.alarma.v), tF = diasHasta(v, u.falla.v);
  const t0 = Math.max(0, tP - 0.9 * pf.pf), t1 = tF + 0.06 * pf.pf;
  const rango = Math.abs(u.falla.v - v.base);
  const cond = (t) => Math.max(0, 1 - Math.abs(desviacion(v, t)) / rango);
  const X = (t) => L + ((t - t0) / (t1 - t0)) * (W - L - R); const Y = (c) => T + (1 - c) * (H - T - B);
  const pts = Array.from({ length: 80 }, (_, i) => t0 + (tF - t0) * i / 79).map((t) => `${X(t).toFixed(1)},${Y(cond(t)).toFixed(1)}`).join(' ');
  const punto = (t, color, txt, dy = -8) => `<circle cx="${X(t)}" cy="${Y(cond(t))}" r="4.5" fill="${color}" stroke="#0c1320" stroke-width="1.5"/><text x="${X(t) - 4}" y="${Y(cond(t)) + dy}" fill="${color}" font-size="10.5" font-weight="700" text-anchor="end">${txt}</text>`;
  const yB = H - 22;
  return `<svg class="pfsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Curva P-F de ${esc(v.nombre)}">
    <line x1="${L}" y1="${T}" x2="${L}" y2="${H - B}" stroke="#3a4760"/><line x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}" stroke="#3a4760"/>
    <text x="${L - 4}" y="${T + 8}" fill="#6f7c92" font-size="9" text-anchor="end">sano</text><text x="${L - 4}" y="${H - B}" fill="#6f7c92" font-size="9" text-anchor="end">F</text>
    <text x="${L + 4}" y="${H - B + 12}" fill="#6f7c92" font-size="9">tiempo →</text>
    <line x1="${X(tP)}" y1="${T}" x2="${X(tP)}" y2="${yB}" stroke="#e0a020" stroke-dasharray="3 3"/><line x1="${X(tF)}" y1="${T}" x2="${X(tF)}" y2="${yB}" stroke="#d64545" stroke-dasharray="3 3"/>
    <polyline points="${pts}" fill="none" stroke="#7cc4f0" stroke-width="2.4"/>
    ${punto(tP, '#f2bd4c', `P ${fNum(u.alerta.v, 1)}`)}${punto(tA, '#ff8080', `Paro ${fNum(u.alarma.v, 1)}`)}${punto(tF, '#ff5c5c', `F ${fNum(u.falla.v, 1)}`)}
    <g class="pf-int"><line x1="${X(tP)}" y1="${yB}" x2="${X(tF)}" y2="${yB}" stroke="#cfe3ff" stroke-width="1.5"/><path d="M${X(tP)},${yB - 4}v8M${X(tF)},${yB - 4}v8" stroke="#cfe3ff" stroke-width="1.5"/>
    <text x="${(X(tP) + X(tF)) / 2}" y="${yB + 14}" fill="#cfe3ff" font-size="11" font-weight="700" text-anchor="middle">P-F = ${fDias(pf.pf)}</text></g>
  </svg>`;
}

export function render(root, app) {
  const cfg = app.cfg; const W = pesos(cfg);
  const totalC = Object.values(W).reduce((s, x) => s + x.sumaC, 0);
  const sinVar = Object.keys(cfg.modos).filter((m) => !cfg.variables.some((v) => v.modos.includes(m)));
  const chk = (f, pf) => (f <= pf / 2 ? '<span class="ok">✓</span>' : '<span class="no">✗</span>');
  const fFrec = (d) => (d < 1 ? fNum(d * 24 * 60) + ' min' : fDias(d));
  root.innerHTML = `
    <div class="cabecera"><div><h1>Variables, umbrales y curva P-F ${info(`<p>Cómo se conecta el trabajo previo del grupo con la plataforma:</p><ul><li><b>AMFEC</b> → modos de falla del compresor y su criticidad C = S × O: definen qué se monitorea y cuánto pesa.</li><li><b>Curva P-F</b> → la alerta se ubica en P (falla detectable), el paro (alarma) antes de F (falla funcional).</li><li><b>RCM</b> → la tarea que dispara cada alarma.</li></ul><p>El RCM y la curva P-F se construyen aquí con supuestos basados en referencias de los equipos e investigación: las tareas salen de las «acciones de control» del AMFEC y del plan de la Etapa 6, y cada tasa de degradación cita su fuente bajo la curva.</p>`)}</h1>
      <p>Seis variables que anticipan ${Object.keys(cfg.modos).length - sinVar.length} de los ${Object.keys(cfg.modos).length} modos del AMFEC del compresor.</p></div>
      <button class="btn no-print" onclick="print()">Imprimir</button></div>

    <div class="panel"><h3>Variables de condición ${info(`<p>Cada modo del AMFEC se asigna a <b>una</b> variable, la que lo detecta antes, para no contarlo dos veces en los pesos.</p><p><b>Peso</b> = suma de la criticidad C de sus modos / ${totalC} (suma de todas). Así pesa más la variable que protege contra más criticidad.</p><p><b>Frecuencia</b>: el RCM pide medir al menos cada P-F/2. ✓/✗ compara el plan actual del informe (Etapa 6) y la frecuencia propuesta con ese límite.</p>`)}</h3>
      <div class="tabla-wrap"><table>
        <thead><tr><th>Variable</th><th>Método de medición</th><th>Modo(s) del AMFEC que anticipa</th><th>Frecuencia (≤ P-F/2)</th><th>Origen</th><th class="n">Peso</th></tr></thead>
        <tbody>${cfg.variables.map((v) => { const pf = intervaloPF(v).pf; return `<tr>
          <td><b>${esc(v.nombre)}</b><span class="sub">${esc(v.unidad)}</span></td>
          <td>${esc(v.metodo)}</td>
          <td>${v.modos.map((m) => `<b>${m} ${esc(cfg.modos[m].nombre)}</b> · C ${cfg.modos[m].C}<span class="sub">${esc(cfg.modos[m].efecto)}</span>`).join('')}</td>
          <td>Propuesta: ${esc(v.frecuencia.propuestaTxt)} ${chk(v.frecuencia.propuesta, pf)}<span class="sub">Plan actual: ${esc(v.frecuencia.planTxt)} ${chk(v.frecuencia.plan, pf)} · límite P-F/2 = ${fFrec(pf / 2)}</span></td>
          <td>${origenHTML(v.origen)}</td>
          <td class="n"><b>${fNum(W[v.id].w * 100, 1)} %</b><span class="sub">ΣC ${W[v.id].sumaC}</span></td></tr>`; }).join('')}</tbody>
      </table></div>
      <p class="tenue" style="margin:.6em 0 0;font-size:.85rem"><b>Frente a las candidatas del enunciado:</b> ${cfg.candidatas.map(([c, d]) => `<b>${esc(c)}</b>: ${esc(d)}`).join(' · ')}</p>
      ${sinVar.length ? `<p class="tenue" style="margin:.6em 0 0;font-size:.85rem">Sin variable continua: ${sinVar.map((m) => `<b>${m} ${esc(cfg.modos[m].nombre)}</b> (C ${cfg.modos[m].C})`).join(', ')} → se cubre con tarea programada del RCM.</p>` : ''}
    </div>
    <div class="espacio"></div>

    <div class="panel"><h3>Umbrales de cuatro niveles ${info('<p><b>Normal</b> por debajo de P · <b>Alerta</b> en P (inicio de la falla detectable) · <b>Alarma</b> = detención obligatoria, antes de F · <b>F</b> = falla funcional.</p><p>Los umbrales son supuestos con fuente citada: no se ha verificado el manual del compresor instalado (marca y modelo desconocidos).</p>')} ${origenHTML('supuesto')}</h3>
      <div class="tabla-wrap"><table>
        <thead><tr><th>Variable</th><th>Normal</th><th>Alerta · P</th><th>Alarma · paro</th><th>F · falla funcional</th></tr></thead>
        <tbody>${cfg.variables.map((v) => { const u = v.umbrales; const op = v.sentido === 'baja' ? '≤' : '≥'; const nop = v.sentido === 'baja' ? '>' : '<';
          const c = (k) => `<b>${op} ${fNum(u[k].v, v.dec > 1 ? 1 : 0)} ${v.unidad}</b><span class="sub">${esc(u[k].fuente)}</span>`;
          return `<tr><td><b>${esc(v.corto)}</b></td><td>${nop} ${fNum(u.alerta.v, v.dec > 1 ? 1 : 0)} ${v.unidad}<span class="sub">línea base ${fNum(v.base, 1)} ${v.unidad}</span></td><td>${c('alerta')}</td><td>${c('alarma')}</td><td>${c('falla')}</td></tr>`; }).join('')}</tbody>
      </table></div>
    </div>
    <div class="espacio"></div>

    <h3>Curva P-F por variable ${info('<p>Condición del compresor frente al tiempo según la forma y la tasa de degradación supuestas del mecanismo. El intervalo P-F (de P a F) se calcula: lineal (F − P)/tasa; exponencial ln((F − base)/(P − base))/k.</p><p>El paro queda entre P y F: el tramo P → paro es el tiempo para planear; el tramo paro → F es el margen de seguridad.</p>')} ${origenHTML('supuesto')}</h3>
    <div class="rejilla c3">${cfg.variables.map((v) => { const p = intervaloPF(v); const d = v.degradacion; return `<div class="panel" style="padding:12px">
      <div class="fila entre"><b>${esc(v.corto)}</b><span class="chip">${d.forma} · ${d.forma === 'lineal' ? fNum(d.r, 2) + ' ' + v.unidad + '/d' : 'k ' + fNum(d.k, 4) + '/d'}</span></div>
      ${curvaPF(v)}
      <div class="hi-esc" style="font-size:.76rem"><span>P → paro ${fDias(p.pAlarma)}</span><span>paro → F ${fDias(p.alarmaF)}</span></div>
      <p class="tenue" style="font-size:.78rem;margin:.4em 0 0">${esc(d.mecanismo)}.</p><p class="tenue" style="font-size:.72rem;margin:.3em 0 0"><b>Referencia:</b> ${esc(d.fuente)}</p></div>`; }).join('')}</div>
    <div class="espacio"></div>

    <div class="panel"><h3>AMFEC del compresor ↔ tareas RCM ${info('<p>Modos, S/O/D, NPR y criticidad tomados del AMFEC del grupo. La tarea RCM se construyó con las «acciones de control» del AMFEC y el plan de mantenimiento del informe; preparación = días para tener técnico y repuesto.</p>')}</h3>
      <div class="tabla-wrap"><table>
        <thead><tr><th>Modo</th><th>Causa / mecanismo</th><th class="n">S/O/D</th><th class="n">NPR</th><th class="n">C</th><th>Variable</th><th>Tarea RCM</th><th class="n">Prep.</th></tr></thead>
        <tbody>${Object.entries(cfg.modos).sort((a, b) => b[1].C - a[1].C).map(([k, m]) => { const v = cfg.variables.find((x) => x.modos.includes(k)); const T = cfg.tareas[k]; return `<tr>
          <td><b>${k} ${esc(m.nombre)}</b><span class="sub">${esc(m.efecto)}</span></td><td>${esc(m.causa)}</td><td class="n">${m.S}/${m.O}/${m.D}</td><td class="n">${m.NPR}</td><td class="n"><b>${m.C}</b></td>
          <td>${v ? esc(v.corto) : '<span class="tenue">— (programada)</span>'}</td><td>${esc(T.tarea)}<span class="sub">${esc(T.tipo)} · ${esc(T.recurso)}</span></td><td class="n">${fDias(T.preparacion)}</td></tr>`; }).join('')}</tbody>
      </table></div>
    </div>`;
}
