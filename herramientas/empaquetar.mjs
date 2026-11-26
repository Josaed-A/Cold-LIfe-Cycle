// Genera la versión entregable: UN solo archivo HTML que se abre con doble clic, sin servidor,
// sin Python, sin internet y sin GitHub.
//
//   node herramientas/empaquetar.mjs
//
// Salida:
//   ColdLifeCycle.html                 (raíz, versionado) plataforma completa: código, librerías, estilos y modelos 3D
//   dist/ColdLifeCycle_entrega.zip     (ignorado por git) ColdLifeCycle.html + LEEME.txt + ejemplo CSV
//
// Los módulos ES no cargan desde file://, así que src/app.js se agrupa con esbuild en un script clásico
// (IIFE) y se incrusta con vendor/ y src/estilos.css. Los .glb de assets/modelos van como data URL en
// window.__RECURSOS (src/ui/formato.js → recurso). esbuild solo se usa para construir (npx).

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(RAIZ, 'dist');
const ESBUILD = 'esbuild@0.25.0';
const SALIDA = 'ColdLifeCycle.html';
const leer = (p) => readFileSync(join(RAIZ, p), 'utf8');
const FECHA = new Date().toLocaleDateString('sv'); // fecha local AAAA-MM-DD (toISOString daría la de UTC)
const seguroScript = (js) => js.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');
const seguroStyle = (css) => css.replace(/<\/(style)/gi, '<\\/$1');
const git = (...a) => { try { return execFileSync('git', a, { cwd: RAIZ, encoding: 'utf8' }).trim(); } catch { return ''; } };

function agrupar() {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  return execFileSync(npx, ['--yes', ESBUILD, 'src/app.js', '--bundle', '--format=iife', '--target=es2020', '--charset=utf8', '--minify', '--legal-comments=none',
    '--alias:three=./vendor/three.module.min.js', '--banner:js="use strict";', '--log-level=warning'],
  { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: process.platform === 'win32' });
}

const MIME = { '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
function archivos(dir) {
  const abs = join(RAIZ, dir); if (!existsSync(abs)) return [];
  return readdirSync(abs).flatMap((n) => { const p = join(abs, n); return statSync(p).isDirectory() ? archivos(relative(RAIZ, p)) : [relative(RAIZ, p)]; });
}
function recursos() {
  return Object.fromEntries(archivos('assets').filter((p) => MIME[extname(p).toLowerCase()])
    .map((p) => [p.split(sep).join('/'), `data:${MIME[extname(p).toLowerCase()]};base64,${readFileSync(join(RAIZ, p)).toString('base64')}`]));
}

function construirHTML(bundle, mapa) {
  let html = leer('index.html');
  const reemplazar = (re, fn, desc) => { const antes = html; html = html.replace(re, fn); if (html === antes) throw new Error(`index.html cambió: no se encontró ${desc}`); };
  reemplazar(/<link rel="stylesheet" href="src\/estilos\.css">/, () => `<style>\n${seguroStyle(leer('src/estilos.css'))}\n</style>`, 'la hoja de estilos');
  reemplazar(/<script src="(vendor\/[^"]+)"><\/script>/g, (_, p) => `<script>${seguroScript(leer(p))}</script>`, 'las librerías de vendor/');
  reemplazar(/\s*<script type="importmap">[\s\S]*?<\/script>/, () => '', 'el importmap');
  reemplazar(/\s*<script>\s*\/\/ Si se abre como archivo local[\s\S]*?<\/script>/, () => '', 'el aviso de file://');
  const version = [git('describe', '--always', '--dirty').replace(/-dirty$/, ' con cambios sin commit'), FECHA].filter(Boolean).join(' · ');
  reemplazar(/<script type="module" src="src\/app\.js"><\/script>/, () =>
    `<script>window.__VERSION = ${JSON.stringify(version)};\nwindow.__RECURSOS = ${seguroScript(JSON.stringify(mapa))};</script>\n  <script>${seguroScript(bundle)}</script>`, 'el módulo src/app.js');
  html = html.replace('<head>', `<head>\n  <!-- Cold Life Cycle · versión entregable en un solo archivo (${version}). Generado con herramientas/empaquetar.mjs. -->`);
  return { html, version };
}

const TABLA_CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = TABLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function zip(entradas) {
  const partes = []; const central = []; let off = 0;
  const d = new Date(); const hora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const fecha = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const { nombre, datos } of entradas) {
    const n = Buffer.from(nombre, 'utf8'); const comp = deflateRawSync(datos, { level: 9 }); const crc = crc32(datos);
    const loc = Buffer.alloc(30); loc.writeUInt32LE(0x04034b50, 0); loc.writeUInt16LE(20, 4); loc.writeUInt16LE(0x0800, 6); loc.writeUInt16LE(8, 8);
    loc.writeUInt16LE(hora, 10); loc.writeUInt16LE(fecha, 12); loc.writeUInt32LE(crc, 14); loc.writeUInt32LE(comp.length, 18); loc.writeUInt32LE(datos.length, 22); loc.writeUInt16LE(n.length, 26);
    const cen = Buffer.alloc(46); cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(0x0800, 8); cen.writeUInt16LE(8, 10);
    cen.writeUInt16LE(hora, 12); cen.writeUInt16LE(fecha, 14); cen.writeUInt32LE(crc, 16); cen.writeUInt32LE(comp.length, 20); cen.writeUInt32LE(datos.length, 24); cen.writeUInt16LE(n.length, 28); cen.writeUInt32LE(off, 42);
    partes.push(loc, n, comp); central.push(cen, n); off += loc.length + n.length + comp.length;
  }
  const tc = Buffer.concat(central); const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(entradas.length, 8); fin.writeUInt16LE(entradas.length, 10); fin.writeUInt32LE(tc.length, 12); fin.writeUInt32LE(off, 16);
  return Buffer.concat([...partes, tc, fin]);
}

const LEEME = `COLD LIFE CYCLE - Tablero de condición del compresor del cuarto frío
Taller en Énfasis II - Gestión de Mantenimiento · Grupo 5 · Versión ${FECHA}

CÓMO ABRIRLA
  Doble clic en ColdLifeCycle.html (Chrome, Edge o Firefox). Funciona sin instalar nada,
  sin internet y sin servidor: código, librerías y modelos 3D están dentro del archivo.

DATOS
  Arranca con datos SIMULADOS (franja «DATOS SIMULADOS» arriba). Elija el escenario de falla y
  use ▶ para recorrerlo de condición normal hasta el paro. Para datos reales: Datos y supuestos >
  Cargar CSV o Excel (hay plantilla y un ejemplo: ejemplo_mediciones.csv).
  Mediciones manuales y archivos cargados se guardan en el navegador de este equipo.
`;

const t0 = Date.now();
console.log(`Agrupando src/app.js con ${ESBUILD}…`);
const bundle = agrupar();
const mapa = recursos();
const { html, version } = construirHTML(bundle, mapa);
mkdirSync(DIST, { recursive: true });
writeFileSync(join(RAIZ, SALIDA), html);
const extra = existsSync(join(RAIZ, 'data/ejemplo_mediciones.csv')) ? [{ nombre: 'ColdLifeCycle/ejemplo_mediciones.csv', datos: readFileSync(join(RAIZ, 'data/ejemplo_mediciones.csv')) }] : [];
writeFileSync(join(DIST, 'ColdLifeCycle_entrega.zip'), zip([
  { nombre: `ColdLifeCycle/${SALIDA}`, datos: Buffer.from(html, 'utf8') },
  { nombre: 'ColdLifeCycle/LEEME.txt', datos: Buffer.from(LEEME.replace(/\n/g, '\r\n'), 'utf8') }, ...extra,
]));
const mb = (p) => (statSync(join(RAIZ, p)).size / 1048576).toFixed(1) + ' MB';
console.log(`Versión ${version}: ${Object.keys(mapa).length} modelos embebidos.`);
console.log(`  ${SALIDA}                   ${mb(SALIDA)}`);
console.log(`  dist/ColdLifeCycle_entrega.zip   ${mb('dist/ColdLifeCycle_entrega.zip')}`);
console.log(`Listo en ${((Date.now() - t0) / 1000).toFixed(1)} s.`);
