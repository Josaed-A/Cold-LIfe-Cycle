// Estado: semáforo e índice de salud, modelo 3D con las piezas medidas y una tarjeta por variable.
import { info } from '../ui/ayuda.js';
import { esc, fDias, fFecha, fNum, fVal, estadoHTML, origenHTML } from '../ui/formato.js';
import { graficoHI, mini } from '../ui/grafico.js';
import { crearCuarto3D } from '../ui/cuarto3d.js';

const AYUDA_HI = (cfg) => `<p><b>Índice de salud (0–100).</b> Cada variable tiene un subíndice: 100 en su línea base, ${cfg.indice.hP} al llegar a P (alerta), ${cfg.indice.hAlarma} en la alarma y 0 en F, lineal entre esos puntos.</p>
<p>El índice es el promedio ponderado de los subíndices. El peso de cada variable es la suma de la criticidad C del AMFEC de los modos que anticipa (ver <i>Variables y P-F</i>).</p>
<p><b>Regla de veto:</b> si una variable está en alerta el índice no puede pasar de ${cfg.indice.verde}, y si está en alarma no puede pasar de ${cfg.indice.rojo}. Así el semáforo siempre coincide con los umbrales: un promedio alto no esconde una alarma.</p>
<p><b>Semáforo:</b> verde &gt; ${cfg.indice.verde} · amarillo ${cfg.indice.rojo}–${cfg.indice.verde} · rojo ≤ ${cfg.indice.rojo}. Use «Ir a: Normal / Alerta / Alarma» en la barra superior para probar los tres estados.</p>`;

let _ayudaHI = null; // el botón ⓘ se crea una vez (la tarjeta se redibuja en cada paso de la reproducción)
function saludHTML(A, app) {
  const s = A.salud; const cfg = app.cfg; _ayudaHI ||= info(AYUDA_HI(cfg));
  const peor = s.peor ? cfg.variables.find((v) => v.id === s.peor.id) : null;
  const txt = { verde: 'Operación normal', amarillo: 'Alerta: planear intervención', rojo: 'Alarma: paro obligatorio', NI: 'Sin datos' }[s.semaforo];
  const nPar = A.ordenes.filter((o) => o.paro).length;
  return `<div class="salud">
    <div class="semaforo" role="img" aria-label="Semáforo ${s.semaforo}"><i class="rojo ${s.semaforo === 'rojo' ? 'on' : ''}"></i><i class="amarillo ${s.semaforo === 'amarillo' ? 'on' : ''}"></i><i class="verde ${s.semaforo === 'verde' ? 'on' : ''}"></i></div>
    <div>
      <div class="fila entre"><h3 style="margin:0">Índice de salud ${_ayudaHI}</h3>${origenHTML('inferido')}</div>
      <div class="hi-num">${s.hi === null ? '—' : fNum(s.hi)}<small> /100</small></div>
      <div class="hi-barra"><b style="left:${s.hi ?? 0}%"></b></div><div class="hi-esc"><span>0</span><span>${cfg.indice.rojo}</span><span>${cfg.indice.verde}</span><span>100</span></div>
      <p style="margin:.6em 0 0;font-weight:700">${txt}</p>
      <p class="tenue" style="margin:.2em 0 0;font-size:.86rem">${peor ? `Peor variable: <b style="color:var(--texto)">${esc(peor.nombre)}</b> ${estadoHTML(s.peor.estado)}` : ''}
        ${s.veto ? `<br>Promedio ponderado ${fNum(s.promedio)}, limitado por la regla de veto.` : ''}</p>
      ${A.ordenes.length ? `<p style="margin:.5em 0 0"><a href="#/alertas">${A.ordenes.length} orden(es) sugerida(s)${nPar ? ` · ${nPar} con paro obligatorio` : ''} →</a></p>` : ''}
    </div></div>`;
}

function tarjetaHTML(a, app) {
  const v = a.v; const t = a.tiempos.alarma; const ver = a.veredicto?.tipo;
  const tAl = a.estado === 'normal' ? (a.tiempos.alerta && Number.isFinite(a.tiempos.alerta.dias) ? `P en ${fDias(a.tiempos.alerta.dias)}` : 'sin tendencia de degradación')
    : a.estado === 'alerta' ? (t && Number.isFinite(t.dias) ? `alarma en ${fDias(t.dias)}` : 'alarma: sin tendencia') : a.estado === 'NI' ? 'sin dato reciente' : 'paro obligatorio';
  return `<a class="var s-${a.estado}" href="#/tendencias/${v.id}">
    <div class="nom"><span>${esc(v.nombre)}</span>${origenHTML(a.origen, app.simulado)}</div>
    <div class="fila entre"><span class="val">${a.x === null ? 'N/I' : fNum(a.x, v.dec)}<small> ${v.unidad}</small></span>${estadoHTML(a.estado)}</div>
    <canvas data-mini="${v.id}"></canvas>
    <div class="pie"><span>subíndice ${a.h === null ? '—' : fNum(a.h)} · peso ${fNum(a.w * 100)} %</span><span class="${ver === 'no-alcanza' || ver === 'paro' ? 'no' : ''}">${tAl}</span></div>
  </a>`;
}

export function render(root, app) {
  const A = app.A; const cfg = app.cfg; const act = cfg.activo;
  root.innerHTML = `
    <div class="cabecera"><div><h1>Estado del compresor ${info(`<p><b>${esc(act.nombre)}</b> (${esc(act.referencia)}). ${esc(act.caso)}.</p><p>Componente monitoreado: <b>${esc(act.componente)}</b>, elegido en el AMFEC del grupo como el más crítico para mantener ${act.banda[0]}–${act.banda[1]} °C. Refrigerante supuesto: ${act.refrigerante}.</p><p>Todo se calcula para el <b>día de análisis</b> de la barra superior; los días posteriores no se usan.</p>`)}</h1>
      <p>${esc(act.componente)} · ${esc(act.nombre)} · ${esc(act.codigo)}</p></div>
      <div class="tenue">Día de análisis: <b style="color:var(--texto)" id="esFecha">${fFecha(A.fecha)}</b></div></div>
    <div class="rejilla c-1-2">
      <div class="panel" id="esSalud">${saludHTML(A, app)}</div>
      <div class="panel" style="padding:10px">
        <div class="vista3d" id="es3d"><div class="ctl3d fila">
          <div class="seg" id="es3dVista"><button data-v="instalacion" class="on">Instalación</button><button data-v="compresor">Compresor (corte)</button></div>
          <label class="chip" style="cursor:pointer"><input type="checkbox" id="es3dInt" checked style="vertical-align:-2px"> Ver interior</label>
        </div><div class="ayuda">Arrastrar: girar · rueda: zoom · clic en una pieza: su tendencia</div></div>
      </div>
    </div>
    <div class="espacio"></div>
    <div class="fila entre"><h3 style="margin:0">Variables de condición ${info('<p>Una tarjeta por variable: valor del día de análisis, etiqueta de origen (<b>M</b> medido, <b>I</b> inferido, <b>S</b> supuesto; <b>sim</b> = valor simulado), estado según sus umbrales, mini-tendencia de 60 días (líneas: P y alarma), subíndice, peso y tiempo estimado hasta el siguiente umbral. Clic para ver la tendencia completa.</p>')}</h3></div>
    <div class="espacio" style="height:8px"></div>
    <div class="vars" id="esVars">${cfg.variables.map((v) => tarjetaHTML(A.vars[v.id], app)).join('')}</div>
    <div class="espacio"></div>
    <div class="panel"><h3>Índice de salud en el tiempo ${info('<p>Índice de cada día hasta el día de análisis, con las bandas del semáforo. Los tramos se colorean con el semáforo de ese día.</p>')}</h3><div class="grafico chico"><canvas id="esHI"></canvas></div></div>`;
  dibujarMinis(root, app);
  const chart = graficoHI(root.querySelector('#esHI'), A.hist, cfg);
  app.alLimpiar(() => chart.destroy());
  root._hi = chart;

  const cont = root.querySelector('#es3d'); let tres = null; let vivo = true;
  app.alLimpiar(() => { vivo = false; tres?.destruir(); root._tres = null; });
  crearCuarto3D(cont, { variables: cfg.variables, onClick: (id) => { location.hash = `#/tendencias/${id}`; } })
    .then((t) => { if (!vivo) return t.destruir(); tres = t; root._tres = t; t.actualizar(app.A); })
    .catch((e) => { console.error(e); cont.insertAdjacentHTML('beforeend', '<div class="carga">No se pudo iniciar el 3D (WebGL).</div>'); });
  root.querySelector('#es3dVista').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || !tres) return;
    root.querySelectorAll('#es3dVista button').forEach((x) => x.classList.toggle('on', x === b)); tres.vista(b.dataset.v);
  });
  root.querySelector('#es3dInt').addEventListener('change', (e) => tres?.verInterior(e.target.checked));
}

function dibujarMinis(root, app) {
  root.querySelectorAll('canvas[data-mini]').forEach((c) => mini(c, app.serie, app.cfg.variables.find((v) => v.id === c.dataset.mini), app.cursor));
}

/** Cambio del día de análisis: se actualiza en sitio (sin recrear el 3D). */
export function actualizar(root, app) {
  const A = app.A;
  root.querySelector('#esFecha').textContent = fFecha(A.fecha);
  root.querySelector('#esSalud').innerHTML = saludHTML(A, app);
  root.querySelector('#esVars').innerHTML = app.cfg.variables.map((v) => tarjetaHTML(A.vars[v.id], app)).join('');
  dibujarMinis(root, app);
  root._tres?.actualizar(A);
  const ch = root._hi; if (ch) {
    const d = A.hist.filter((h) => h.hi !== null).map((h) => ({ x: Date.parse(h.fecha + 'T00:00:00Z'), y: h.hi, s: h.semaforo }));
    ch.data.datasets[0].data = d; ch.options.scales.x.min = d[0]?.x; ch.options.scales.x.max = d.at(-1)?.x; ch.update('none');
  }
}
