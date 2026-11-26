// Gráficos: tendencia con umbrales P/alarma/F y proyección (Chart.js + anotaciones), índice de salud,
// indicadores contra objetivo y mini-tendencias en canvas 2D (se redibujan en cada paso de la reproducción).
import { COLOR, fFecha, fNum, isoDeTs, ts } from './formato.js';
import { estadoDe } from '../analisis.js';

const Chart = window.Chart;
if (Chart && window['chartjs-plugin-annotation']) Chart.register(window['chartjs-plugin-annotation']);
if (Chart) {
  Chart.defaults.color = '#a9b4c6';
  Chart.defaults.borderColor = 'rgba(38,51,73,.7)';
  Chart.defaults.font.family = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
}
const alfa = (hex, a) => hex + Math.round(a * 255).toString(16).padStart(2, '0');
const DIA = 86400000;
const etiqueta = (txt, color, pos = 'start') => ({ display: true, content: txt, position: pos, backgroundColor: 'rgba(12,19,32,.85)', color, font: { size: 10.5 }, padding: 3 });

/** Líneas y bandas de umbral de una variable (alerta = P, alarma = paro, F = falla funcional). */
function umbrales(v, yMin, yMax) {
  const u = v.umbrales; const sube = v.sentido !== 'baja';
  const lim = (a, b) => (sube ? { yMin: a, yMax: b } : { yMin: b, yMax: a });
  return {
    bA: { type: 'box', ...lim(u.alerta.v, u.alarma.v), backgroundColor: alfa(COLOR.alerta, 0.09), borderWidth: 0, drawTime: 'beforeDatasetsDraw' },
    bR: { type: 'box', ...lim(u.alarma.v, sube ? yMax : yMin), backgroundColor: alfa(COLOR.alarma, 0.1), borderWidth: 0, drawTime: 'beforeDatasetsDraw' },
    lP: { type: 'line', yMin: u.alerta.v, yMax: u.alerta.v, borderColor: COLOR.alerta, borderWidth: 1.5, borderDash: [6, 4], label: etiqueta(`P · alerta ${fNum(u.alerta.v, v.dec > 1 ? 1 : 0)} ${v.unidad}`, '#f2bd4c') },
    lA: { type: 'line', yMin: u.alarma.v, yMax: u.alarma.v, borderColor: COLOR.alarma, borderWidth: 1.5, borderDash: [6, 4], label: etiqueta(`Alarma · paro ${fNum(u.alarma.v, v.dec > 1 ? 1 : 0)} ${v.unidad}`, '#ff8080') },
    lF: { type: 'line', yMin: u.falla.v, yMax: u.falla.v, borderColor: '#b52a2a', borderWidth: 2, label: etiqueta(`F · falla ${fNum(u.falla.v, v.dec > 1 ? 1 : 0)} ${v.unidad}`, '#ff6b6b') },
    lB: { type: 'line', yMin: v.base, yMax: v.base, borderColor: 'rgba(124,196,240,.35)', borderWidth: 1, borderDash: [2, 4], label: { ...etiqueta('línea base', '#7cc4f0', 'end'), font: { size: 9.5 } } },
  };
}

/**
 * Tendencia de una variable hasta el día de análisis (los días futuros de la serie no se muestran),
 * con la recta o exponencial ajustada, su proyección ±2σ y los cruces estimados.
 */
export function graficoTendencia(canvas, serie, a, cursor, op = {}) {
  const v = a.v; const arr = serie.valores[v.id];
  const desde = Math.max(0, cursor - (op.historia ?? 120));
  const pts = [];
  for (let i = desde; i <= cursor; i++) if (arr[i] !== null && arr[i] !== undefined) pts.push({ x: ts(serie.fechas[i]), y: arr[i], i });
  const X = (i) => ts(serie.fechas[0]) + i * DIA;
  const fit = a.fit; const ajuste = [], proy = [], hi = [], lo = [];
  let xMax = X(cursor) + 7 * DIA;
  if (fit) {
    for (let k = 0; k <= 30; k++) { const t = fit.t0 + (cursor - fit.t0) * k / 30; ajuste.push({ x: X(t), y: fit.predecir(t) }); }
    if (fit.degrada) {
      const fin = Math.min(a.tiempos.falla && Number.isFinite(a.tiempos.falla.dias) ? a.tiempos.falla.dias * 1.15 + 3 : a.pf.pf, Math.max(a.pf.pf, 20), 150);
      for (let k = 0; k <= 40; k++) { const t = cursor + fin * k / 40; const y = fit.predecir(t); proy.push({ x: X(t), y }); hi.push({ x: X(t), y: y + 2 * fit.sigma }); lo.push({ x: X(t), y: y - 2 * fit.sigma }); }
      xMax = X(cursor + fin);
    }
  }
  const u = v.umbrales; const vals = [...pts.map((p) => p.y), v.base, u.falla.v, u.alerta.v];
  const clip = (y) => Math.max(Math.min(...vals) - 0.15 * Math.abs(u.falla.v - v.base), Math.min(Math.max(...vals) + 0.15 * Math.abs(u.falla.v - v.base), y));
  let yMin = Math.min(...vals); let yMax = Math.max(...vals); const m = 0.12 * (yMax - yMin || 1); yMin -= m; yMax += m;
  if (v.id === 'ciclo') { yMin = Math.max(0, yMin); yMax = Math.min(110, yMax); }
  const anot = umbrales(v, yMin, yMax);
  const vline = (x, color, txt, dash = [4, 4]) => ({ type: 'line', xMin: x, xMax: x, borderColor: color, borderWidth: 1.5, borderDash: dash, label: { display: true, content: txt, position: 'end', rotation: -90, backgroundColor: 'rgba(12,19,32,.85)', color, font: { size: 10 }, padding: 2 } });
  anot.hoy = vline(X(cursor), 'rgba(230,235,243,.6)', 'Hoy', []);
  if (a.iP !== null) anot.p = vline(X(a.iP), '#f2bd4c', 'Cruce de P');
  const tA = a.tiempos.alarma; const tF = a.tiempos.falla;
  if (tA && !tA.ya && Number.isFinite(tA.dias)) anot.ea = vline(X(cursor + tA.dias), '#ff8080', 'Alarma estimada');
  if (tF && !tF.ya && Number.isFinite(tF.dias)) anot.ef = vline(X(cursor + tF.dias), '#ff6b6b', 'F estimada');
  if (op.hitos) for (const [k, i, txt] of op.hitos) if (i !== undefined && i <= cursor) anot['h' + k] = vline(X(i), '#c7a8f0', txt, [2, 3]);

  const ds = [
    { label: `${v.nombre} (${v.unidad})`, data: pts, showLine: true, borderColor: 'rgba(159,179,204,.55)', borderWidth: 1.2, pointRadius: pts.length > 90 ? 2.2 : 3.2, pointBackgroundColor: (c) => COLOR[estadoDe(v, c.raw?.y)] || '#9fb3cc', pointBorderWidth: 0, order: 1 },
  ];
  if (ajuste.length) ds.push({ label: `Ajuste ${fit.modelo} (R² ${fNum(fit.r2, 2)})`, data: ajuste, borderColor: '#7cc4f0', borderWidth: 2, pointRadius: 0, order: 2 });
  if (proy.length) ds.push(
    { label: 'Banda ±2σ', data: hi.map((p) => ({ ...p, y: clip(p.y) })), borderWidth: 0, pointRadius: 0, fill: '+1', backgroundColor: 'rgba(199,168,240,.14)', order: 4 },
    { label: '_lo', data: lo.map((p) => ({ ...p, y: clip(p.y) })), borderWidth: 0, pointRadius: 0, fill: false, order: 4 },
    { label: 'Proyección', data: proy.map((p) => ({ ...p, y: clip(p.y) })), borderColor: '#c7a8f0', borderDash: [7, 5], borderWidth: 2, pointRadius: 0, order: 3 },
  );
  return new Chart(canvas, {
    type: 'line', data: { datasets: ds },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false, parsing: false, normalized: true,
      interaction: { mode: 'nearest', intersect: false, axis: 'x' },
      scales: {
        x: { type: 'linear', min: X(desde), max: xMax, ticks: { callback: (x) => fFecha(isoDeTs(x)).slice(0, 6), maxRotation: 0, autoSkipPadding: 22 }, grid: { color: 'rgba(38,51,73,.45)' } },
        y: { min: yMin, max: yMax, title: { display: true, text: `${v.corto} (${v.unidad})` }, grid: { color: 'rgba(38,51,73,.45)' } },
      },
      plugins: {
        legend: { labels: { filter: (it) => !it.text.startsWith('_'), usePointStyle: true, boxHeight: 7 } },
        annotation: { annotations: anot },
        tooltip: { callbacks: { title: (it) => fFecha(isoDeTs(it[0].raw.x)), label: (it) => `${it.dataset.label.split(' (')[0]}: ${fNum(it.raw.y, v.dec)} ${v.unidad}` } },
      },
    },
  });
}

/** Índice de salud en el tiempo con las bandas del semáforo. */
export function graficoHI(canvas, hist, cfg) {
  const d = hist.filter((h) => h.hi !== null).map((h) => ({ x: ts(h.fecha), y: h.hi, s: h.semaforo }));
  const X = d.map((p) => p.x);
  return new Chart(canvas, {
    type: 'line',
    data: { datasets: [{ label: 'Índice de salud', data: d, borderColor: '#cfe3ff', borderWidth: 1.6, pointRadius: 0, segment: { borderColor: (c) => COLOR[c.p1.raw.s] } }] },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false, parsing: false,
      scales: { x: { type: 'linear', min: Math.min(...X), max: Math.max(...X), ticks: { callback: (x) => fFecha(isoDeTs(x)).slice(0, 6), maxRotation: 0, autoSkipPadding: 20 } }, y: { min: 0, max: 100, ticks: { stepSize: 20 } } },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { title: (it) => fFecha(isoDeTs(it[0].raw.x)), label: (it) => `Índice ${fNum(it.raw.y)} · ${it.raw.s}` } },
        annotation: { annotations: {
          v: { type: 'box', yMin: cfg.indice.verde, yMax: 100, backgroundColor: alfa(COLOR.normal, 0.08), borderWidth: 0 },
          a: { type: 'box', yMin: cfg.indice.rojo, yMax: cfg.indice.verde, backgroundColor: alfa(COLOR.alerta, 0.09), borderWidth: 0 },
          r: { type: 'box', yMin: 0, yMax: cfg.indice.rojo, backgroundColor: alfa(COLOR.alarma, 0.1), borderWidth: 0 },
        } },
      },
    },
  });
}

/** Barras o línea mensual contra una línea de objetivo. */
export function graficoObjetivo(canvas, etiquetas, series, objetivo, op = {}) {
  return new Chart(canvas, {
    type: op.tipo || 'bar',
    data: { labels: etiquetas, datasets: series.map((s) => ({ borderRadius: 3, pointRadius: 2.5, tension: 0.15, ...s })) },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      scales: { y: { ...(op.y || {}), title: { display: !!op.unidad, text: op.unidad } }, x: { grid: { display: false } } },
      plugins: {
        legend: { display: series.length > 1, labels: { boxHeight: 8 } },
        tooltip: { callbacks: { label: (it) => `${it.dataset.label}: ${op.fmt ? op.fmt(it.raw) : fNum(it.raw, 1)}` } },
        annotation: { annotations: objetivo === null ? {} : { o: { type: 'line', yMin: objetivo, yMax: objetivo, borderColor: '#5ccf8c', borderWidth: 2, borderDash: [6, 4], label: etiqueta(`Objetivo ${op.fmt ? op.fmt(objetivo) : fNum(objetivo)}`, '#5ccf8c', 'end') } } },
      },
    },
  });
}

/** Mini-tendencia (canvas 2D): últimos `dias` días con líneas de P y alarma, puntos coloreados por estado. */
export function mini(canvas, serie, v, cursor, dias = 60) {
  const ctx = canvas.getContext('2d'); const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = canvas.clientWidth || 200, H = canvas.clientHeight || 42;
  if (canvas.width !== W * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  const arr = serie.valores[v.id]; const ini = Math.max(0, cursor - dias + 1); const p = [];
  for (let i = ini; i <= cursor; i++) if (arr[i] !== null && arr[i] !== undefined) p.push([i, arr[i]]);
  const u = v.umbrales; const ys = [...p.map((q) => q[1]), v.base, u.alerta.v, u.alarma.v];
  const lo = Math.min(...ys), hi = Math.max(...ys), pad = (hi - lo || 1) * 0.12;
  const X = (i) => ((i - ini) / Math.max(1, cursor - ini)) * (W - 4) + 2; const Y = (y) => H - 3 - ((y - lo + pad) / (hi - lo + 2 * pad)) * (H - 6);
  const linea = (y, c) => { ctx.strokeStyle = c; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, Y(y)); ctx.lineTo(W, Y(y)); ctx.stroke(); ctx.setLineDash([]); };
  linea(u.alerta.v, COLOR.alerta); linea(u.alarma.v, COLOR.alarma);
  ctx.strokeStyle = 'rgba(159,179,204,.75)'; ctx.lineWidth = 1.3; ctx.beginPath();
  p.forEach(([i, y], k) => (k ? ctx.lineTo(X(i), Y(y)) : ctx.moveTo(X(i), Y(y)))); ctx.stroke();
  const ult = p.at(-1); if (ult) { ctx.fillStyle = COLOR[estadoDe(v, ult[1])]; ctx.beginPath(); ctx.arc(X(ult[0]), Y(ult[1]), 3.2, 0, 7); ctx.fill(); }
}
