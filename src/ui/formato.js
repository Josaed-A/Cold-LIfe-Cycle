// Utilidades de presentación (sin lógica de negocio).

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** 'aaaa-mm-dd' → 'dd-mmm-aaaa' */
export function fFecha(iso) {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}-${MESES[+m - 1]}-${a}${iso.length > 10 ? ' ' + iso.slice(11, 16) : ''}`;
}
export const fMes = (iso) => (iso ? `${MESES[+iso.slice(5, 7) - 1]}-${iso.slice(2, 4)}` : '—');
export const ts = (iso) => Date.parse(iso.slice(0, 10) + 'T00:00:00Z');
export const isoDeTs = (t) => new Date(t).toISOString().slice(0, 10);

export function fNum(x, dec = 0) {
  if (x === null || x === undefined || !Number.isFinite(x)) return '—';
  return x.toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
export const fCOP = (x) => (Number.isFinite(x) ? '$ ' + fNum(Math.round(x)) : '—');
export const fVal = (v, x) => (x === null || x === undefined ? 'N/I' : `${fNum(x, v.dec)} ${v.unidad}`);

/** Días → texto legible (horas si < 1 día, meses si > 60 días). */
export function fDias(d) {
  if (d === null || d === undefined || Number.isNaN(d)) return '—';
  if (!Number.isFinite(d)) return 'no se alcanza';
  if (d <= 0) return 'ya alcanzado';
  if (d < 1) return `${fNum(d * 24, d * 24 < 10 ? 1 : 0)} h`;
  if (d > 60) return `${fNum(d / 30.4, 1)} meses`;
  return `${fNum(d, d < 10 ? 1 : 0)} d`;
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const COLOR = { normal: '#2e9e5b', alerta: '#e0a020', alarma: '#d64545', falla: '#8e1b1b', NI: '#7a8599', verde: '#2e9e5b', amarillo: '#e0a020', rojo: '#d64545' };
export const NOMBRE_ESTADO = { normal: 'Normal', alerta: 'Alerta (P)', alarma: 'Alarma · paro', falla: 'Falla funcional (F)', NI: 'N/I' };
export const estadoHTML = (e) => `<span class="estado e-${e}">${NOMBRE_ESTADO[e] ?? e}</span>`;

// Etiqueta de origen del dato (enunciado, sección 4). simulado = el valor no lo midió nadie.
const ORIG = { medido: ['M', 'Medido', 'Lo registró un instrumento o una persona en el activo'], inferido: ['I', 'Inferido', 'Se calculó a partir de datos medidos'], supuesto: ['S', 'Supuesto', 'Se asumió por falta de dato; está listado y justificado en Datos y supuestos'] };
export function origenHTML(o, simulado = false) {
  const [l, n, t] = ORIG[o] || ORIG.supuesto;
  return `<span class="orig o-${o}" title="${t}${simulado ? ' · valor SIMULADO, no es una medición real' : ''}">${l}<span class="orig-n"> ${n}</span>${simulado ? '<i>sim</i>' : ''}</span>`;
}

// En la versión entregable (un solo HTML) los modelos 3D van embebidos en window.__RECURSOS.
export const recurso = (ruta) => (typeof window !== 'undefined' && window.__RECURSOS?.[ruta]) || ruta;

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
