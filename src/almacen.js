// Persistencia local (localStorage) con respaldo en memoria para visores aislados (iframe sandbox),
// donde solo leer localStorage lanza un error. Todos los accesos van en try/catch.

let _ls;
function ls() {
  if (_ls === undefined) {
    try { _ls = window.localStorage; _ls.getItem('coldlife.v1'); }
    catch { const m = new Map(); _ls = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), enMemoria: true }; }
  }
  return _ls;
}
export const persistente = () => !ls().enMemoria;

export const vacio = () => ({
  version: 1,
  fuente: 'simulador',      // 'simulador' | 'archivo'
  sim: null,                // parámetros del simulador elegidos por el usuario
  archivo: null,            // serie cargada desde CSV/Excel
  eventosArchivo: null,     // bitácora de mantenimiento cargada (reemplaza la simulada)
  manuales: [],             // mediciones manuales { fecha, var, valor, instrumento }
});

export function cargar(clave) {
  try { const s = ls().getItem(clave); if (s) return { ...vacio(), ...JSON.parse(s) }; }
  catch (e) { console.warn('No se pudo leer el almacenamiento local', e); }
  return vacio();
}

/** Devuelve null si guardó o un mensaje de error. */
export function guardar(clave, datos) {
  try { ls().setItem(clave, JSON.stringify(datos)); return null; }
  catch (e) { return e?.name === 'QuotaExceededError' ? 'El almacenamiento del navegador está lleno; exporte un respaldo y quite el archivo cargado.' : String(e?.message || e); }
}

export function descargar(nombre, contenido, tipo = 'application/octet-stream') {
  const blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
