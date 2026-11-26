// Generador de datos de condición con ruido y una falla progresiva inyectada (lógica pura, sin DOM).
// Cada escenario degrada su variable primaria con la forma y tasa de config (las mismas que dan el
// intervalo P-F) y arrastra a las demás con acoples físicos simples. Todo valor sale «simulado».

const DIA = 86400000;
export const sumarDias = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + Math.round(n) * DIA).toISOString().slice(0, 10);
export const diasEntre = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DIA);

// PRNG reproducible (mulberry32) + normal estándar (Box-Muller).
function rng(semilla) {
  let a = semilla >>> 0;
  const u = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { u, n: () => Math.sqrt(-2 * Math.log(u() || 1e-12)) * Math.cos(2 * Math.PI * u()) };
}

/** Desviación de la variable primaria respecto de su base, t días después del inicio de la degradación. */
export function desviacion(v, t, ritmo = 1) {
  if (t < 0) return 0;
  const rango = v.umbrales.falla.v - v.base; const sg = Math.sign(rango);
  const d = v.degradacion;
  if (d.forma === 'lineal') return sg * d.r * ritmo * t;
  const d0 = 0.1 * Math.abs(v.umbrales.alerta.v - v.base); // la exponencial arranca con 10 % del camino a P
  return sg * d0 * Math.exp(d.k * ritmo * t);
}

/** Días desde el inicio de la degradación hasta que la primaria alcanza el valor x (sin ruido). */
export function diasHasta(v, x, ritmo = 1) {
  const dx = Math.abs(x - v.base); const d = v.degradacion;
  if (d.forma === 'lineal') return dx / (d.r * ritmo);
  const d0 = 0.1 * Math.abs(v.umbrales.alerta.v - v.base);
  return Math.log(dx / d0) / (d.k * ritmo);
}

/**
 * Serie diaria simulada.
 * @returns {{fuente:'simulador', nombre, fechas:string[], valores:Object<string,(number|null)[]>, meta}}
 */
export function simular(cfg, op = {}) {
  const p = { ...cfg.simulacion, ...op };
  const esc = cfg.escenarios[p.escenario] || cfg.escenarios.normal;
  const V = Object.fromEntries(cfg.variables.map((v) => [v.id, v]));
  const prim = esc.primaria ? V[esc.primaria] : null;
  const R = rng(p.semilla * 7919 + Object.keys(cfg.escenarios).indexOf(p.escenario) * 104729);

  // La primaria llega a F el día diaFalla (o antes si el ritmo es rápido); la serie termina 4 días después.
  let t0 = null; let meta = { escenario: p.escenario, nombre: esc.nombre, modo: esc.modo, ritmo: p.ritmo };
  let dias = p.dias;
  if (prim) {
    const aF = diasHasta(prim, prim.umbrales.falla.v, p.ritmo);
    t0 = Math.max(10, p.diaFalla - aF);
    const marca = (x) => Math.round(t0 + diasHasta(prim, x, p.ritmo));
    meta = { ...meta, primaria: prim.id, inicio: Math.round(t0), dP: marca(prim.umbrales.alerta.v), dAlarma: marca(prim.umbrales.alarma.v), dF: marca(prim.umbrales.falla.v) };
    dias = Math.min(p.dias, meta.dF + 5);
  }

  const fechas = Array.from({ length: dias }, (_, i) => sumarDias(p.inicio, i));
  const valores = Object.fromEntries(cfg.variables.map((v) => [v.id, []]));
  for (let i = 0; i < dias; i++) {
    const dow = new Date(fechas[i] + 'T00:00:00Z').getUTCDay();
    const finde = dow === 5 || dow === 6 ? 1 : 0; // viernes y sábado: más aperturas de puerta
    let s = 0; // severidad de la primaria: 0 en la base, 1 en F
    if (prim) s = Math.min(1.25, desviacion(prim, i - t0, p.ritmo) / (prim.umbrales.falla.v - prim.base));
    for (const v of cfg.variables) {
      const frec = Math.max(1, Math.round(v.frecuencia.propuesta));
      if (i % frec) { valores[v.id].push(null); continue; } // variables semanales: un dato cada 7 días
      const rango = v.umbrales.falla.v - v.base;
      let x = v.base;
      if (prim && v.id === prim.id) x += desviacion(v, i - t0, p.ritmo);
      else if (prim) {
        x += (esc.acoples?.[v.id] ?? 0) * Math.max(0, s) * rango;
        const kt = esc.tardia?.[v.id];
        if (kt) x += kt * rango * Math.max(0, (s - 0.8) / 0.2);
      }
      if (v.id === 'ciclo') x += 2.5 * finde;
      if (v.id === 'tcam') x += 0.08 * finde;
      x += v.ruido * p.ruido * R.n();
      if (v.id === 'ciclo') x = Math.min(100, Math.max(0, x));
      if (v.id === 'sh' || v.id === 'vib' || v.id === 'corriente') x = Math.max(0.05, x);
      valores[v.id].push(+x.toFixed(v.dec + 1));
    }
  }
  return { fuente: 'simulador', nombre: esc.nombre, fechas, valores, meta };
}
