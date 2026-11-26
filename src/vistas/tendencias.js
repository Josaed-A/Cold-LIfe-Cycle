// Tendencias: ajuste lineal/exponencial, tiempo hasta cada umbral y comparación con el intervalo P-F.
import { info } from '../ui/ayuda.js';
import { COLOR, esc, fDias, fFecha, fNum, estadoHTML, origenHTML } from '../ui/formato.js';
import { graficoTendencia } from '../ui/grafico.js';
import { sumarDias } from '../simulador.js';

const AYUDA_METODO = `<p><b>Ajuste.</b> Se ajustan dos modelos a las lecturas de la ventana: lineal <i>y = a + b·t</i> y exponencial de la desviación respecto de la línea base <i>y = base ± A·e^{k·t}</i> (mínimos cuadrados en la escala original). Se parte de la forma física esperada del mecanismo (columna «Degradación» en Variables y P-F) y solo se cambia al otro modelo si mejora R² en 0,02 o más.</p>
<p><b>Ventana «auto»:</b> desde que la variable dejó la zona de su base (desviación ≥ 25 % del camino a P), con al menos 4 lecturas; si no hay desviación, 30 días (8 lecturas en las semanales). Así el tramo sano no aplana la pendiente.</p>
<p><b>Tiempo hasta el umbral:</b> instante en que el modelo cruza P, la alarma o F, contado desde el día de análisis; el rango usa la banda ±2σ de los residuos. Solo se estima si hay degradación significativa (pendiente con t &gt; 2, o desviación exponencial actual &gt; 2σ).</p>
<p><b>Límites del método:</b> supone que el mecanismo actual sigue igual (no anticipa fallas súbitas ni reparaciones); con pocas lecturas (variables semanales) el error es mayor; un cambio de régimen (limpieza, ajuste) invalida la ventana; la extrapolación lejana de una exponencial es muy sensible a k.</p>`;

const TXT = {
  ok: (a) => a.veredicto.dias !== null ? `Normal. Llegaría a P en ${fDias(a.veredicto.dias)}, más que la mitad del intervalo P-F (${fDias(a.pf.pf / 2)}): basta la frecuencia de medición actual.` : 'Normal y sin tendencia de degradación significativa.',
  vigilar: (a) => `Normal, pero llegaría a P en ${fDias(a.veredicto.dias)}, menos que la mitad del intervalo P-F (${fDias(a.pf.pf / 2)}): confirmar en la próxima medición.`,
  alcanza: (a) => `<b>Sí alcanza para planear.</b> La alarma llegaría en ${fDias(a.veredicto.dias)} y la tarea necesita ${fDias(a.prep)} de preparación (técnico y repuesto).`,
  justo: (a) => `<b>Justo.</b> ${fDias(a.veredicto.dias)} hasta la alarma frente a ${fDias(a.prep)} de preparación: pedir recurso y repuesto hoy.`,
  'no-alcanza': (a) => `<b>No alcanza.</b> La alarma llegaría en ${fDias(a.veredicto.dias)} y la preparación toma ${fDias(a.prep)}: intervenir de inmediato con lo disponible y vigilar a diario.`,
  'sin-tendencia': () => '<b>En alerta, sin tendencia significativa.</b> El valor está sobre P pero estable: confirmar con una medición manual antes de intervenir.',
  paro: (a) => `<b>Paro obligatorio.</b> Superó la alarma${a.estado === 'falla' ? ' y llegó a F (falla funcional)' : ', antes de F'}: detener el compresor y ejecutar la tarea del RCM.`,
};

function resumenHTML(a, app) {
  const v = a.v; const f = a.fit; const hoy = app.A.fecha;
  const fila = (k, t) => { const x = a.tiempos[k]; const d = x?.dias;
    return `<tr><td>${t}</td><td class="n">${x ? fDias(d) : '—'}${x && !x.ya && Number.isFinite(d) && (x.max - x.min) > 0.05 ? `<span class="sub">${fDias(x.min)} – ${fDias(x.max)}</span>` : ''}</td><td class="n">${x && Number.isFinite(d) && !x.ya ? fFecha(sumarDias(hoy, Math.floor(d))) : '—'}</td></tr>`; };
  const ecu = !f ? '—' : f.modelo === 'lineal' ? `y = ${fNum(f.lin.a, 2)} ${f.lin.b >= 0 ? '+' : '−'} ${fNum(Math.abs(f.lin.b), 3)}·t` : `y = ${fNum(v.base, 1)} ${v.sentido === 'baja' ? '−' : '+'} ${fNum(Math.exp(f.exp.lnA + f.exp.k * f.t1), 2)}·e<sup>${fNum(f.exp.k, 4)}·(t − hoy)</sup>`;
  const pfObs = a.estado === 'alerta' && a.transcurrido !== null && Number.isFinite(a.tiempos.falla?.dias) ? a.transcurrido + a.tiempos.falla.dias : null;
  const cons = a.consumido; const posAl = a.pf.pAlarma / a.pf.pf;
  return `
    <div class="fila entre"><div><span class="tenue">Hoy</span> <b style="font-size:1.3rem" class="num">${a.x === null ? 'N/I' : fNum(a.x, v.dec) + ' ' + v.unidad}</b> ${origenHTML(a.origen, app.simulado)}</div>${estadoHTML(a.estado)}</div>
    <div class="veredicto v-${a.veredicto?.tipo || 'ok'}" style="margin:10px 0">${a.veredicto ? TXT[a.veredicto.tipo](a) : 'Sin dato reciente (N/I).'}</div>
    <h3>Tendencia ${info(AYUDA_METODO)} ${origenHTML('inferido')}</h3>
    <table><tbody>
      <tr><td>Modelo</td><td class="n"><b>${f ? f.modelo : 'sin datos suficientes'}</b></td></tr>
      <tr><td>Ecuación</td><td class="n" style="font-size:.8rem">${ecu}</td></tr>
      <tr><td>R² lineal · exponencial</td><td class="n">${f ? fNum(f.lin.r2, 3) : '—'} · ${f?.exp ? fNum(f.exp.r2, 3) : '—'}</td></tr>
      <tr><td>σ residuos · lecturas</td><td class="n">${f ? fNum(f.sigma, v.dec) + ' ' + v.unidad : '—'} · ${f?.n ?? 0}</td></tr>
      <tr><td>Ventana</td><td class="n">${a.ventana} d${a.adaptativa ? ' (desde la desviación)' : ''}</td></tr>
    </tbody></table>
    <h3 style="margin-top:14px">Tiempo hasta el umbral ${origenHTML('inferido')}</h3>
    <table><thead><tr><th>Umbral</th><th class="n">Faltan</th><th class="n">Fecha estimada</th></tr></thead><tbody>
      ${fila('alerta', `P · alerta (${fNum(v.umbrales.alerta.v, 1)})`)}${fila('alarma', `Alarma · paro (${fNum(v.umbrales.alarma.v, 1)})`)}${fila('falla', `F · falla (${fNum(v.umbrales.falla.v, 1)})`)}
    </tbody></table>
    <h3 style="margin-top:14px">Intervalo P-F ${info(`<p><b>Intervalo P-F</b> = tiempo entre que la falla se puede detectar (P, donde está la alerta) y la falla funcional (F). Se calcula con la forma y la tasa de degradación supuestas del mecanismo: ${v.degradacion.forma === 'lineal' ? `(F − P) / ${fNum(v.degradacion.r, 2)} ${v.unidad}/día` : `ln((F − base)/(P − base)) / ${fNum(v.degradacion.k, 4)} por día`}.</p><p>La barra muestra cuánto del P-F ya se consumió desde el cruce observado de P y dónde está la alarma (paro).</p><p>Regla RCM: medir al menos cada P-F/2 = ${fDias(a.pf.pf / 2)}. Frecuencia propuesta: ${esc(v.frecuencia.propuestaTxt)}.</p>`)} ${origenHTML('supuesto')}</h3>
    <table><tbody>
      <tr><td>P → F (supuesto)</td><td class="n"><b>${fDias(a.pf.pf)}</b></td></tr>
      <tr><td>P → alarma · alarma → F</td><td class="n">${fDias(a.pf.pAlarma)} · ${fDias(a.pf.alarmaF)}</td></tr>
      ${a.transcurrido !== null ? `<tr><td>Desde el cruce de P</td><td class="n">${fDias(a.transcurrido)} (${fFecha(app.serie.fechas[a.iP])})</td></tr>` : ''}
      ${pfObs !== null ? `<tr><td>P-F según la tendencia ${origenHTML('inferido')}</td><td class="n">${fDias(pfObs)} <span class="sub">${pfObs < 0.8 * a.pf.pf ? 'más rápido que lo supuesto' : pfObs > 1.25 * a.pf.pf ? 'más lento que lo supuesto' : 'coherente con lo supuesto'}</span></td></tr>` : ''}
    </tbody></table>
    ${cons !== null ? `<div class="pfbarra" title="P-F consumido"><div class="cons" style="width:${Math.min(100, cons * 100)}%"></div><div class="marca-al" style="left:${posAl * 100}%"></div><span style="left:6px">P</span><span style="right:6px">F</span></div><div class="hi-esc"><span>consumido ${fNum(Math.min(1, cons) * 100)} %</span><span>alarma al ${fNum(posAl * 100)} % (supuesto)</span></div>` : ''}`;
}

export function render(root, app, params) {
  const cfg = app.cfg; const id = cfg.variables.some((v) => v.id === params[0]) ? params[0] : (app.A.salud.peor?.id || cfg.variables[0].id);
  root.innerHTML = `
    <div class="cabecera"><div><h1>Tendencias y tiempo hasta el umbral</h1><p>¿Cuánto falta para el paro y alcanza el intervalo P-F para planear la intervención?</p></div>
      <div class="fila"><span class="tenue">Ventana</span><div class="seg" id="tdVen">${['auto', 14, 30, 60, 90].map((w) => `<button data-w="${w}" class="${String(app.ventana) === String(w) ? 'on' : ''}">${w === 'auto' ? 'auto' : w + ' d'}</button>`).join('')}</div></div></div>
    <div class="selvar" id="tdSel"></div>
    <div class="rejilla c-2-1">
      <div class="panel"><h2 id="tdTit"></h2><div class="grafico alto"><canvas id="tdCan"></canvas></div>
        <div class="leyenda"><span><i style="background:${COLOR.normal}"></i>normal</span><span><i style="background:${COLOR.alerta}"></i>alerta</span><span><i style="background:${COLOR.alarma}"></i>alarma</span><span><i style="background:#7cc4f0"></i>ajuste</span><span><i style="background:#c7a8f0"></i>proyección ±2σ</span><span class="tenue">Solo se muestran datos hasta el día de análisis.</span></div></div>
      <div class="panel" id="tdRes"></div>
    </div>
    <div class="espacio"></div>
    <div class="panel"><h3>Todas las variables ${info('<p>Resumen de la tendencia de cada variable en el día de análisis. «Veredicto» compara el tiempo hasta la alarma con la preparación que necesita la tarea del RCM (técnico y repuesto). Clic en una fila para verla arriba.</p>')}</h3><div class="tabla-wrap"><table id="tdTab"></table></div></div>`;
  root.querySelector('#tdVen').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; app.ventana = b.dataset.w; app.fijarCursor(app.cursor); render(root, app, [id]); });
  root._id = id;
  dibujar(root, app);
  app.alLimpiar(() => root._ch?.destroy());
}

function dibujar(root, app) {
  const cfg = app.cfg; const A = app.A; const id = root._id; const a = A.vars[id]; const v = a.v;
  root.querySelector('#tdSel').innerHTML = cfg.variables.map((x) => `<a href="#/tendencias/${x.id}" class="${x.id === id ? 'on' : ''}"><i style="background:${COLOR[A.vars[x.id].estado]}"></i>${esc(x.corto)}</a>`).join('');
  root.querySelector('#tdTit').innerHTML = `${esc(v.nombre)} <small class="tenue" style="font-weight:500">· ${esc(v.unidad)} · ${esc(cfg.modos[a.modo].nombre)} (C ${cfg.modos[a.modo].C})</small>`;
  root._ch?.destroy();
  root._ch = graficoTendencia(root.querySelector('#tdCan'), app.serie, a, app.cursor);
  root.querySelector('#tdRes').innerHTML = resumenHTML(a, app);
  const V = { ok: 'ok', vigilar: 'vigilar', alcanza: 'alcanza', justo: 'justo', 'no-alcanza': 'no alcanza', 'sin-tendencia': 'sin tendencia', paro: 'PARO' };
  root.querySelector('#tdTab').innerHTML = `<thead><tr><th>Variable</th><th class="n">Hoy</th><th>Estado</th><th>Modelo</th><th class="n">R²</th><th class="n">Hasta alarma</th><th class="n">P-F</th><th class="n">Preparación</th><th>Veredicto</th></tr></thead><tbody>${cfg.variables.map((x) => {
    const b = A.vars[x.id]; const t = b.tiempos.alarma;
    return `<tr class="clic${x.id === id ? ' sel' : ''}" data-id="${x.id}"><td>${esc(x.nombre)}</td><td class="n">${b.x === null ? 'N/I' : fNum(b.x, x.dec) + ' ' + x.unidad}</td><td>${estadoHTML(b.estado)}</td><td>${b.fit?.modelo ?? '—'}</td><td class="n">${b.fit ? fNum(b.fit.r2, 2) : '—'}</td><td class="n">${t ? fDias(t.dias) : '—'}</td><td class="n">${fDias(b.pf.pf)}</td><td class="n">${fDias(b.prep)}</td><td class="${['no-alcanza', 'paro'].includes(b.veredicto?.tipo) ? 'no' : b.veredicto?.tipo === 'alcanza' ? 'ok' : ''}">${V[b.veredicto?.tipo] ?? '—'}</td></tr>`;
  }).join('')}</tbody>`;
  root.querySelectorAll('#tdTab tr[data-id]').forEach((tr) => tr.addEventListener('click', () => { location.hash = `#/tendencias/${tr.dataset.id}`; }));
}

export function actualizar(root, app) { dibujar(root, app); }
