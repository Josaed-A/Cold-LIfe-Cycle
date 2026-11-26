// Genera la versión entregable: UN solo archivo HTML que se abre con doble clic, sin servidor,
// sin Python, sin internet y sin GitHub.
//
//   node herramientas/empaquetar.mjs
//
// Salida: ColdLifeCycle.html, el entregable completo: código, librerías, estilos, modelos 3D y el CSV de
// ejemplo. El informe de supuestos, fuentes y limitaciones se imprime desde «Datos y supuestos».
//
// Los módulos ES no cargan desde file://, así que src/app.js se agrupa con esbuild en un script clásico
// (IIFE) y se incrusta con vendor/ y src/estilos.css. Los .glb de assets/modelos y data/*.csv van como data URL en
// window.__RECURSOS (src/ui/formato.js → recurso). esbuild solo se usa para construir (npx).

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
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

const MIME = { '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.csv': 'text/csv' };
function archivos(dir) {
  const abs = join(RAIZ, dir); if (!existsSync(abs)) return [];
  return readdirSync(abs).flatMap((n) => { const p = join(abs, n); return statSync(p).isDirectory() ? archivos(relative(RAIZ, p)) : [relative(RAIZ, p)]; });
}
function recursos() {
  return Object.fromEntries([...archivos('assets'), ...archivos('data')].filter((p) => MIME[extname(p).toLowerCase()])
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

const t0 = Date.now();
console.log(`Agrupando src/app.js con ${ESBUILD}…`);
const bundle = agrupar();
const mapa = recursos();
const { html, version } = construirHTML(bundle, mapa);
writeFileSync(join(RAIZ, SALIDA), html);
const mb = (p) => (statSync(join(RAIZ, p)).size / 1048576).toFixed(1) + ' MB';
console.log(`Versión ${version}: ${Object.keys(mapa).length} recursos embebidos (modelos 3D y CSV de ejemplo).`);
console.log(`  ${SALIDA}   ${mb(SALIDA)}  (entregable único)`);
console.log(`Listo en ${((Date.now() - t0) / 1000).toFixed(1)} s.`);
