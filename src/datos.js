// Carga de archivos CSV/Excel → serie diaria normalizada (lógica pura, sin DOM).
// Acepta encabezados en español o inglés, coma decimal, varias lecturas por día (se promedian) y
// una columna opcional «origen» (medido / inferido / supuesto) por fila. Un dato inválido no se
// convierte en 0: queda vacío (N/I) y se informa en los avisos.
import { sumarDias, diasEntre } from './simulador.js';

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const ALIAS = {
  fecha: ['fecha', 'date', 'dia', 'fechahora', 'timestamp', 'hora'],
  tdesc: ['tdesc', 'tdescarga', 'temperaturadescarga', 'temperaturadedescarga', 'descarga', 'tdescargac'],
  corriente: ['corriente', 'corrientea', 'corrientecompresor', 'amperaje', 'i', 'ia'],
  ciclo: ['ciclo', 'cicloutil', 'cicloutilpct', 'duty', 'dutycycle', 'encendido', 'ciclo%'],
  tcam: ['tcam', 'tcamara', 'temperaturacamara', 'temperaturadecamara', 'camara', 'tcamarac'],
  sh: ['sh', 'sobrecalentamiento', 'superheat', 'sobrecalentamientosuccion', 'sobrecalentamientok'],
  vib: ['vib', 'vibracion', 'vibracionrms', 'velocidadrms', 'vibracionmms'],
  origen: ['origen', 'etiqueta', 'fuente'],
};
// Rango físico plausible: fuera de él el dato se descarta (probable error de digitación o sensor).
export const RANGO = { tdesc: [-20, 200], corriente: [0, 60], ciclo: [0, 100], tcam: [-30, 40], sh: [-5, 60], vib: [0, 50] };
const ORIGENES = { medido: 'medido', inferido: 'inferido', supuesto: 'supuesto', simulado: 'supuesto' };

/** Texto CSV → filas {encabezado: valor}. Detecta ; , o tabulador. */
export function filasDeCSV(texto) {
  const lineas = String(texto).replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lineas.length) return [];
  const cab = lineas[0];
  const sep = [';', '\t', ','].map((c) => [c, cab.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  const partir = (l) => { const out = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === sep && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map((s) => s.trim()); };
  const h = partir(cab);
  return lineas.slice(1).map((l) => { const c = partir(l); return Object.fromEntries(h.map((k, i) => [k, c[i] ?? ''])); });
}

export function numero(x) {
  if (x === null || x === undefined || x === '') return null;
  if (typeof x === 'number') return Number.isFinite(x) ? x : NaN;
  const s = String(x).trim().replace(/\s/g, '');
  if (!s) return null;
  const t = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(',', '.');
  const n = Number(t); return Number.isFinite(n) ? n : NaN;
}

export function fechaISO(x) {
  if (x === null || x === undefined || x === '') return null;
  if (x instanceof Date) return Number.isNaN(x.getTime()) ? null : new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  if (typeof x === 'number') return new Date(Date.UTC(1899, 11, 30) + Math.floor(x) * 86400000).toISOString().slice(0, 10); // serial Excel
  const s = String(x).trim();
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

function mapaColumnas(encabezados) {
  const col = {};
  for (const h of encabezados) {
    const n = norm(h);
    for (const [k, al] of Object.entries(ALIAS)) if (!col[k] && al.map(norm).includes(n)) col[k] = h;
  }
  return col;
}

/** Filas → serie diaria. @returns {{fuente:'archivo', nombre, fechas, valores, origen, avisos}} */
export function serieDeFilas(filas, cfg, nombre = 'archivo') {
  const avisos = [];
  if (!filas.length) throw new Error('El archivo no tiene filas de datos.');
  const col = mapaColumnas(Object.keys(filas[0]));
  if (!col.fecha) throw new Error('Falta la columna «fecha».');
  const vars = cfg.variables.filter((v) => col[v.id]);
  if (!vars.length) throw new Error(`No se reconoce ninguna variable. Columnas esperadas: ${cfg.variables.map((v) => v.id).join(', ')}.`);
  const faltan = cfg.variables.filter((v) => !col[v.id]);
  if (faltan.length) avisos.push(`Sin columna para: ${faltan.map((v) => v.nombre).join(', ')} (quedan N/I).`);

  const porDia = new Map(); // fecha → { id: [valores], origen }
  filas.forEach((f, k) => {
    const fecha = fechaISO(f[col.fecha]);
    if (!fecha) { avisos.push(`Fila ${k + 2}: fecha no válida («${f[col.fecha]}»), se omite.`); return; }
    const d = porDia.get(fecha) || { origen: null }; porDia.set(fecha, d);
    if (col.origen) { const o = ORIGENES[norm(f[col.origen])]; if (o) d.origen = o; }
    for (const v of vars) {
      const n = numero(f[col[v.id]]);
      if (n === null) continue;
      if (Number.isNaN(n)) { avisos.push(`Fila ${k + 2}: ${v.corto} no numérico («${f[col[v.id]]}»), queda N/I.`); continue; }
      const [lo, hi] = RANGO[v.id];
      if (n < lo || n > hi) { avisos.push(`Fila ${k + 2}: ${v.corto} = ${n} ${v.unidad} fuera del rango físico [${lo}, ${hi}], queda N/I.`); continue; }
      (d[v.id] ||= []).push(n);
    }
  });
  if (!porDia.size) throw new Error('Ninguna fila tiene una fecha válida.');
  const dias = [...porDia.keys()].sort();
  const n = diasEntre(dias[0], dias.at(-1)) + 1;
  if (n > 3700) throw new Error('El rango de fechas supera 10 años; revise la columna fecha.');
  const fechas = Array.from({ length: n }, (_, i) => sumarDias(dias[0], i));
  const valores = {}; const origen = {};
  for (const v of cfg.variables) {
    valores[v.id] = fechas.map((f) => { const a = porDia.get(f)?.[v.id]; return a?.length ? +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(v.dec + 1) : null; });
    origen[v.id] = fechas.map((f) => porDia.get(f)?.origen || null);
  }
  if (avisos.length > 30) avisos.splice(30, avisos.length - 30, `… y ${avisos.length - 30} avisos más.`);
  return { fuente: 'archivo', nombre, fechas, valores, origen, avisos };
}

/** Filas de eventos de mantenimiento (hoja «Eventos» o CSV aparte). */
export function eventosDeFilas(filas) {
  const col = {}; const A = { fecha: ALIAS.fecha, tipo: ['tipo', 'clase'], modo: ['modo', 'modofalla'], descripcion: ['descripcion', 'detalle', 'evento'], horasParada: ['horasparada', 'parada', 'horas', 'downtime'], costo: ['costo', 'valor', 'costocop'] };
  for (const h of Object.keys(filas[0] || {})) for (const [k, al] of Object.entries(A)) if (!col[k] && al.includes(norm(h))) col[k] = h;
  if (!col.fecha || !col.tipo) throw new Error('La hoja de eventos necesita al menos las columnas fecha y tipo.');
  return filas.map((f) => ({
    fecha: fechaISO(f[col.fecha]), tipo: norm(f[col.tipo]).startsWith('falla') ? 'falla' : norm(f[col.tipo]).startsWith('prev') ? 'preventivo' : 'correctivo',
    modo: col.modo ? String(f[col.modo] || '').toUpperCase() || null : null, descripcion: col.descripcion ? String(f[col.descripcion] ?? '') : '',
    horasParada: Math.max(0, numero(f[col.horasParada]) || 0), costo: Math.max(0, numero(f[col.costo]) || 0), origen: 'medido',
  })).filter((e) => e.fecha);
}

/** Plantilla de carga: encabezados y dos filas de ejemplo. */
export function plantilla(cfg) {
  return {
    mediciones: [
      { fecha: '2026-06-01', ...Object.fromEntries(cfg.variables.map((v) => [v.id, v.base])), origen: 'medido' },
      { fecha: '2026-06-02', ...Object.fromEntries(cfg.variables.map((v) => [v.id, v.frecuencia.propuesta >= 7 ? '' : v.base])), origen: 'medido' },
    ],
    eventos: [{ fecha: '2026-06-15', tipo: 'falla', modo: 'M1', descripcion: 'Contactor quemado', horas_parada: 5, costo: 350000 }],
  };
}
