// Lógica de condición (pura, sin DOM): estado por umbral, índice de salud, tendencia y tiempo hasta
// el umbral, intervalo P-F, órdenes de trabajo sugeridas e indicadores de proceso.
import { sumarDias, diasEntre } from './simulador.js';

export const NIVEL = { NI: -1, normal: 0, alerta: 1, alarma: 2, falla: 3 };
const sg = (v) => (v.sentido === 'baja' ? -1 : 1);
const mas = (v, x, u) => sg(v) * (x - u) >= 0; // x ya alcanzó el umbral u en el sentido de la degradación

export function estadoDe(v, x) {
  if (x === null || x === undefined || !Number.isFinite(x)) return 'NI';
  const u = v.umbrales;
  if (mas(v, x, u.falla.v)) return 'falla';
  if (mas(v, x, u.alarma.v)) return 'alarma';
  if (mas(v, x, u.alerta.v)) return 'alerta';
  return 'normal';
}

/** Subíndice 0–100: 100 en la línea base, hP en P (alerta), hAlarma en la alarma, 0 en F; lineal por tramos. */
export function subindice(v, x, cfg) {
  if (x === null || x === undefined || !Number.isFinite(x)) return null;
  const { hP, hAlarma } = cfg.indice;
  const d = sg(v) * (x - v.base); const u = v.umbrales;
  const P = sg(v) * (u.alerta.v - v.base), A = sg(v) * (u.alarma.v - v.base), F = sg(v) * (u.falla.v - v.base);
  if (d <= 0) return 100;
  if (d < P) return 100 - (100 - hP) * (d / P);
  if (d < A) return hP - (hP - hAlarma) * ((d - P) / (A - P));
  if (d < F) return hAlarma * (1 - (d - A) / (F - A));
  return 0;
}

/** Pesos: suma de la criticidad C de los modos que anticipa cada variable, normalizada a 1. */
export function pesos(cfg) {
  const suma = (v) => v.modos.reduce((s, m) => s + cfg.modos[m].C, 0);
  const total = cfg.variables.reduce((s, v) => s + suma(v), 0);
  return Object.fromEntries(cfg.variables.map((v) => [v.id, { w: suma(v) / total, sumaC: suma(v) }]));
}

/** Intervalo P-F (días) y tramos P→alarma y alarma→F según la forma y tasa de degradación supuestas. */
export function intervaloPF(v) {
  const d = v.degradacion; const u = v.umbrales;
  const dist = (a, b) => (d.forma === 'lineal' ? Math.abs(b - a) / d.r : Math.log(Math.abs(b - v.base) / Math.abs(a - v.base)) / d.k);
  return { pf: dist(u.alerta.v, u.falla.v), pAlarma: dist(u.alerta.v, u.alarma.v), alarmaF: dist(u.alarma.v, u.falla.v) };
}

/** Índice de salud y semáforo. sub = { id: {x, estado, h, w} }. La regla de veto ata el semáforo a los umbrales. */
export function indiceSalud(hoy, cfg, W = pesos(cfg)) {
  const sub = {}; let sw = 0, swh = 0; let peor = null;
  for (const v of cfg.variables) {
    const x = hoy[v.id]; const estado = estadoDe(v, x); const h = subindice(v, x, cfg);
    sub[v.id] = { x, estado, h, w: W[v.id].w };
    if (h !== null) { sw += W[v.id].w; swh += W[v.id].w * h; }
    if (estado !== 'NI' && (!peor || NIVEL[estado] > NIVEL[peor.estado] || (NIVEL[estado] === NIVEL[peor.estado] && h < sub[peor.id].h))) peor = { id: v.id, estado };
  }
  if (!sw) return { hi: null, promedio: null, semaforo: 'NI', peor: null, sub, veto: false };
  const promedio = swh / sw; let hi = promedio;
  const nivel = peor ? NIVEL[peor.estado] : 0;
  if (nivel >= 2) hi = Math.min(hi, cfg.indice.rojo);
  else if (nivel === 1) hi = Math.min(hi, cfg.indice.verde);
  const semaforo = hi > cfg.indice.verde ? 'verde' : hi > cfg.indice.rojo ? 'amarillo' : 'rojo';
  return { hi, promedio, semaforo, peor, sub, veto: hi < promedio - 1e-9 };
}

// ---------- Tendencia ----------
function mc(t, y) { // mínimos cuadrados y = a + b t
  const n = t.length; const mt = t.reduce((s, x) => s + x, 0) / n; const my = y.reduce((s, x) => s + x, 0) / n;
  let stt = 0, sty = 0; for (let i = 0; i < n; i++) { stt += (t[i] - mt) ** 2; sty += (t[i] - mt) * (y[i] - my); }
  const b = stt ? sty / stt : 0; return { a: my - b * mt, b, stt, mt };
}
function r2(y, yhat) {
  const my = y.reduce((s, x) => s + x, 0) / y.length;
  let ssr = 0, sst = 0; for (let i = 0; i < y.length; i++) { ssr += (y[i] - yhat[i]) ** 2; sst += (y[i] - my) ** 2; }
  return { r2: sst ? 1 - ssr / sst : 0, ssr };
}

/**
 * Ajusta lineal y exponencial (de la desviación respecto de la base) y elige según el comportamiento:
 * exponencial solo si mejora R² en 0,02 o más y la desviación crece.
 */
export function ajustar(t, y, v) {
  const n = t.length;
  if (n < 4) return null;
  const L = mc(t, y); const fl = (x) => L.a + L.b * x;
  const rl = r2(y, t.map(fl));
  const fit = { n, t0: t[0], t1: t[n - 1], lin: { ...L, r2: rl.r2 }, exp: null };
  const s = sg(v);
  // Exponencial de la desviación z = s·(y − base) = A·e^{k(t − tc)}, por mínimos cuadrados en la escala
  // original (no con logaritmos, que el ruido cerca de la base distorsiona): para cada k, A es lineal.
  const tc = t[n - 1]; const z = y.map((x) => s * (x - v.base));
  const ssrDe = (k) => { let ze = 0, ee = 0; const e = t.map((x) => Math.exp(k * (x - tc))); for (let i = 0; i < n; i++) { ze += z[i] * e[i]; ee += e[i] * e[i]; } const A = ze / ee; let ssr = 0; for (let i = 0; i < n; i++) ssr += (z[i] - A * e[i]) ** 2; return { A, ssr }; };
  let mejor = null; const K = Array.from({ length: 121 }, (_, i) => 0.002 * Math.pow(200, i / 120));
  K.forEach((k, i) => { const r = ssrDe(k); if (r.A > 0 && (!mejor || r.ssr < mejor.ssr)) mejor = { ...r, k, i }; });
  if (mejor) {
    let lo = K[Math.max(0, mejor.i - 1)], hi = K[Math.min(K.length - 1, mejor.i + 1)];
    for (let it = 0; it < 40; it++) { const a = lo + 0.382 * (hi - lo), b = lo + 0.618 * (hi - lo); if (ssrDe(a).ssr < ssrDe(b).ssr) hi = b; else lo = a; }
    const k = (lo + hi) / 2; const r = ssrDe(k);
    if (r.A > 0) { const re = r2(y, t.map((x) => v.base + s * r.A * Math.exp(k * (x - tc)))); fit.exp = { lnA: Math.log(r.A) - k * tc, k, r2: re.r2, ssr: re.ssr }; }
  }
  // Se parte de la forma física esperada del mecanismo (config.degradacion.forma) y solo se cambia
  // al otro modelo si mejora R² en 0,02 o más.
  const prefExp = v.degradacion?.forma === 'exponencial';
  const usarExp = fit.exp && fit.exp.k > 0 && fit.exp.r2 >= 0.3 && (prefExp ? fit.exp.r2 >= rl.r2 - 0.02 : fit.exp.r2 >= rl.r2 + 0.02);
  fit.modelo = usarExp ? 'exponencial' : 'lineal';
  fit.predecir = usarExp ? (x) => v.base + s * Math.exp(fit.exp.lnA + fit.exp.k * x) : fl;
  fit.r2 = usarExp ? fit.exp.r2 : rl.r2;
  fit.sigma = Math.sqrt((usarExp ? fit.exp.ssr : rl.ssr) / Math.max(1, n - 2));
  // ¿Hay degradación significativa? pendiente en el sentido de la falla con t > 2.
  const seB = fit.sigma / Math.sqrt(L.stt || 1);
  fit.degrada = usarExp ? Math.exp(fit.exp.lnA + fit.exp.k * t[n - 1]) > 2 * fit.sigma : s * L.b / (seB || 1e-9) > 2;
  fit.pendiente = L.b; // unidades por día
  return fit;
}

/** Días desde tHoy hasta que la tendencia cruza u; rango con ±2σ. null si no hay degradación. */
export function tiempoHasta(fit, u, v, tHoy, hoyX) {
  if (hoyX !== null && hoyX !== undefined && mas(v, hoyX, u)) return { dias: 0, min: 0, max: 0, ya: true };
  if (!fit || !fit.degrada) return null;
  const s = sg(v);
  const resolver = (uu) => {
    let t;
    if (fit.modelo === 'exponencial') { const z = s * (uu - v.base); if (z <= 0) return 0; t = (Math.log(z) - fit.exp.lnA) / fit.exp.k; }
    else t = (uu - fit.lin.a) / fit.lin.b;
    return Math.max(0, t - tHoy);
  };
  const dias = resolver(u); const a = resolver(u - s * 2 * fit.sigma); const b = resolver(u + s * 2 * fit.sigma);
  const lim = (x) => (Number.isFinite(x) && x < 3650 ? x : Infinity);
  return { dias: lim(dias), min: lim(Math.min(a, b)), max: lim(Math.max(a, b)), ya: false };
}

// ---------- Serie ----------
/** Último valor disponible de la variable hasta el índice i (tolerancia según su frecuencia). */
export function valorEn(serie, v, i) {
  const arr = serie.valores[v.id] || []; const tol = Math.max(2, Math.ceil(1.5 * v.frecuencia.propuesta));
  for (let j = Math.min(i, arr.length - 1); j >= 0 && i - j <= tol; j--) if (arr[j] !== null && arr[j] !== undefined) return { x: arr[j], j };
  return { x: null, j: null };
}

export const ventanaAuto = (v) => Math.max(30, Math.round(8 * Math.max(1, v.frecuencia.propuesta)));

/**
 * Puntos para la tendencia. 'auto': desde que la variable dejó la zona de la base (desviación ≥ 25 % del
 * camino a P en dos lecturas seguidas hacia atrás), con al menos 4 puntos y como máximo 120 días; así la
 * tendencia no se aplana con el tramo sano. Si no hay excursión, la ventana base de la variable.
 */
export function puntosTendencia(serie, v, cursor, ventana = 'auto') {
  const arr = serie.valores[v.id] || []; const t = [], y = [];
  const desde = (w) => { t.length = 0; y.length = 0; for (let i = Math.max(0, cursor - w + 1); i <= cursor; i++) { const z = arr[i]; if (z !== null && z !== undefined) { t.push(i); y.push(z); } } };
  if (ventana !== 'auto') { desde(+ventana); return { t, y, ventana: +ventana, adaptativa: false }; }
  desde(120);
  const lim = 0.25 * Math.abs(v.umbrales.alerta.v - v.base); let cerca = 0, ini = null;
  for (let i = t.length - 1; i >= 0; i--) { if (sg(v) * (y[i] - v.base) < lim) { if (++cerca === 2) { ini = i + 1; break; } } else cerca = 0; }
  if (ini !== null && t.length - ini >= 4 && ini > 0) { const k = Math.max(0, ini - 1); return { t: t.slice(k), y: y.slice(k), ventana: cursor - t[k] + 1, adaptativa: true }; }
  desde(ventanaAuto(v)); return { t, y, ventana: ventanaAuto(v), adaptativa: false };
}

/** Estados e índice de salud de cada día (para el historial y la detección de cruces). */
export function historia(serie, cfg, hasta = serie.fechas.length - 1) {
  const W = pesos(cfg); const out = [];
  for (let i = 0; i <= hasta; i++) {
    const hoy = Object.fromEntries(cfg.variables.map((v) => [v.id, valorEn(serie, v, i).x]));
    const r = indiceSalud(hoy, cfg, W);
    out.push({ i, fecha: serie.fechas[i], hi: r.hi, semaforo: r.semaforo, estados: Object.fromEntries(cfg.variables.map((v) => [v.id, r.sub[v.id].estado])) });
  }
  return out;
}

/** Cambios de estado (subidas y bajadas) por variable a lo largo de la historia. */
export function cruces(hist, cfg) {
  const ev = [];
  for (const v of cfg.variables) {
    let prev = 'normal';
    for (const d of hist) {
      const e = d.estados[v.id]; if (e === 'NI') continue;
      if (e !== prev) ev.push({ fecha: d.fecha, i: d.i, var: v.id, de: prev, a: e, sube: NIVEL[e] > NIVEL[prev] });
      prev = e;
    }
  }
  return ev.sort((a, b) => a.i - b.i);
}

function modoPrincipal(v, cfg) { return [...v.modos].sort((a, b) => cfg.modos[b].C - cfg.modos[a].C)[0]; }

export function prioridadDe(nivel, C, cfg) { return cfg.prioridad[nivel].find((p) => C >= p.cMin); }

/** Análisis completo en el día `cursor` (índice en serie.fechas). */
export function analizar(serie, cfg, cursor, op = {}) {
  const W = pesos(cfg);
  cursor = Math.max(0, Math.min(cursor, serie.fechas.length - 1));
  const fecha = serie.fechas[cursor];
  const hist = historia(serie, cfg, cursor);
  const hoy = {}; const vars = {};
  for (const v of cfg.variables) {
    const { x, j } = valorEn(serie, v, cursor); hoy[v.id] = x;
    const { t, y, ventana, adaptativa } = puntosTendencia(serie, v, cursor, op.ventana || 'auto');
    const fit = ajustar(t, y, v);
    const est = estadoDe(v, x);
    const tiempos = Object.fromEntries(['alerta', 'alarma', 'falla'].map((k) => [k, tiempoHasta(fit, v.umbrales[k].v, v, cursor, x)]));
    // Inicio de la excursión actual sobre P (cruce observado de P).
    let iP = null;
    if (NIVEL[est] >= 1) { iP = cursor; for (let i = cursor; i >= 0; i--) { const e = hist[i].estados[v.id]; if (e === 'NI') continue; if (NIVEL[e] >= 1) iP = i; else break; } }
    const pf = intervaloPF(v);
    const mp = modoPrincipal(v, cfg); const prep = cfg.tareas[mp].preparacion;
    let veredicto = null;
    if (est === 'normal' && tiempos.alerta && Number.isFinite(tiempos.alerta.dias)) veredicto = { tipo: tiempos.alerta.dias < pf.pf / 2 ? 'vigilar' : 'ok', dias: tiempos.alerta.dias };
    else if (est === 'normal') veredicto = { tipo: 'ok', dias: null };
    else if (est === 'alerta') {
      const ta = tiempos.alarma?.dias;
      veredicto = { tipo: ta === undefined || ta === null || !Number.isFinite(ta) ? 'sin-tendencia' : ta >= 1.5 * prep ? 'alcanza' : ta >= prep ? 'justo' : 'no-alcanza', dias: ta ?? null, prep };
    } else if (est !== 'NI') veredicto = { tipo: 'paro', prep };
    const transcurrido = iP !== null ? cursor - iP : null;
    const restanteF = tiempos.falla?.dias;
    const consumido = transcurrido !== null && Number.isFinite(restanteF) ? transcurrido / Math.max(1e-9, transcurrido + restanteF) : null;
    vars[v.id] = { v, x, j, edad: j !== null ? cursor - j : null, estado: est, h: subindice(v, x, cfg), w: W[v.id].w, sumaC: W[v.id].sumaC, fit, ventana, adaptativa, tiempos, pf, iP, transcurrido, consumido, modo: mp, prep, veredicto, origen: serie.origen?.[v.id]?.[j] || v.origen };
  }
  const salud = indiceSalud(hoy, cfg, W);
  const ordenes = cfg.variables.filter((v) => NIVEL[vars[v.id].estado] >= 1).map((v) => ordenSugerida(vars[v.id], serie, cfg, fecha))
    .sort((a, b) => a.p.localeCompare(b.p) || b.C - a.C);
  return { fecha, cursor, hoy, vars, salud, hist, cruces: cruces(hist, cfg), ordenes };
}

/** Orden de trabajo sugerida: modo del AMFEC, tarea RCM, prioridad por criticidad, recurso y plazo. */
export function ordenSugerida(a, serie, cfg, fecha) {
  const v = a.v; const nivel = NIVEL[a.estado] >= 2 ? 'alarma' : 'alerta';
  const modos = [...v.modos].sort((x, y) => cfg.modos[y].C - cfg.modos[x].C);
  const m = modos[0]; const M = cfg.modos[m]; const T = cfg.tareas[m];
  const pr = prioridadDe(nivel, M.C, cfg);
  let plazo = pr.plazo; let porTendencia = false;
  if (nivel === 'alerta' && a.tiempos.alarma && Number.isFinite(a.tiempos.alarma.dias)) {
    const holgura = a.tiempos.alarma.dias - T.preparacion;
    if (holgura < plazo) { plazo = Math.max(0.5, holgura); porTendencia = true; }
  }
  const inicio = a.iP !== null ? serie.fechas[a.iP] : fecha;
  return {
    id: `OT-${v.id.toUpperCase()}-${inicio.replace(/-/g, '')}`,
    var: v.id, nivel, estado: a.estado, x: a.x, p: pr.p, pTxt: pr.txt, C: M.C, modo: m, modos,
    tarea: T.tarea, tipo: T.tipo, recurso: T.recurso, horas: T.horas, repuestos: T.repuestos, preparacion: T.preparacion,
    plazoDias: plazo, porTendencia, limite: fechaMasDias(fecha, plazo), desde: inicio,
    costo: T.costo, costoFalla: T.falla.costo, paradaFalla: T.falla.horas,
    paro: nivel === 'alarma',
  };
}
const fechaMasDias = (iso, d) => new Date(Date.parse(iso + 'T00:00:00Z') + d * 86400000).toISOString().slice(0, 16).replace('T', ' ');

// ---------- Indicadores de proceso ----------
/** Eventos de mantenimiento del período: los del historial + preventivos mensuales + falla del escenario. */
export function eventosPeriodo(cfg, eventos, hasta, extra = []) {
  const ev = eventos.map((e) => ({ origen: 'supuesto', ...e }));
  const prev = cfg.preventivoMensual;
  if (prev) for (let f = sumarDias(cfg.puestaEnServicio, 4); f <= hasta; f = sumarMes(f)) ev.push({ fecha: f, tipo: 'preventivo', modo: null, descripcion: prev.descripcion, horasParada: 0, costo: prev.costo, origen: 'supuesto' });
  return [...ev, ...extra].filter((e) => e.fecha >= cfg.puestaEnServicio && e.fecha <= hasta).sort((a, b) => a.fecha.localeCompare(b.fecha));
}
const sumarMes = (iso) => { const [a, m, d] = iso.split('-').map(Number); const n = new Date(Date.UTC(a, m, d)); return n.toISOString().slice(0, 10); };

/** Disponibilidad mensual, MTBF y MTTR acumulados y costo acumulado frente al presupuesto. */
export function indicadores(cfg, eventos, hasta) {
  const desde = cfg.puestaEnServicio; const meses = [];
  let hAcum = 0, paradaAcum = 0, nAcum = 0, costoAcum = 0;
  for (let ini = desde.slice(0, 7) + '-01'; ini <= hasta; ini = sumarMes(ini)) {
    const finMes = sumarDias(sumarMes(ini), -1);
    const a = ini < desde ? desde : ini; const b = finMes > hasta ? hasta : finMes;
    const horas = (diasEntre(a, b) + 1) * 24;
    const delMes = eventos.filter((e) => e.fecha >= a && e.fecha <= b);
    const fallas = delMes.filter((e) => e.tipo === 'falla');
    const parada = fallas.reduce((s, e) => s + (e.horasParada || 0), 0);
    const costo = delMes.reduce((s, e) => s + (e.costo || 0), 0);
    hAcum += horas; paradaAcum += parada; nAcum += fallas.length; costoAcum += costo;
    meses.push({
      mes: ini.slice(0, 7), horas, parada, nFallas: fallas.length, costo,
      disp: 100 * (1 - parada / horas),
      mtbf: nAcum ? (hAcum - paradaAcum) / nAcum : null,
      mttr: nAcum ? paradaAcum / nAcum : null,
      costoAcum, presupuestoAcum: cfg.objetivos.presupuestoAnual.v * (diasEntre(desde, b) + 1) / 365,
    });
  }
  const u = meses.at(-1) || {};
  return { meses, disp: hAcum ? 100 * (1 - paradaAcum / hAcum) : null, mtbf: u.mtbf ?? null, mttr: u.mttr ?? null, nFallas: nAcum, horas: hAcum, costoAcum: u.costoAcum ?? 0, presupuestoAcum: u.presupuestoAcum ?? 0 };
}
