# CLAUDE.md — Cold Life Cycle (condición del compresor del cuarto frío)

## Qué es
Proyecto final del Taller en Énfasis II (Gestión de Mantenimiento, Grupo 5): tablero de condición del compresor hermético de un cuarto frío 3 × 3 × 2,5 m. Usa el AMFEC del grupo, el plan de mantenimiento del informe de ciclo de vida, la curva P-F y el RCM. Enunciado: «Proyecto final.pdf» (pestañas Estado, Tendencias, Alertas y acciones, Datos y supuestos + indicadores de proceso). Idioma de UI, código y comentarios: **español**. Proyecto hermano y referencia de estilo: `../Failaria`.

## Stack (igual que Failaria; no cambiar sin preguntar)
- HTML + CSS + JavaScript vanilla con ES modules, sin framework ni npm en runtime. esbuild solo al construir (`node herramientas/empaquetar.mjs` → `ColdLifeCycle.html` + `dist/`).
- `vendor/`: Three.js r160 (+ OrbitControls, GLTFLoader, BufferGeometryUtils), Chart.js 4.4.1 + annotation, SheetJS.
- Persistencia: `localStorage` clave `coldlife.v1` con respaldo en memoria (visores aislados).

## Reglas de trabajo
- `simulador.js`, `analisis.js`, `datos.js` y `config.js` no tocan el DOM: `node tests/verify.cjs` tras cada cambio de lógica.
- Todo número con origen: umbrales, tasas, costos y objetivos viven en `config.js` con su fuente; nada hardcodeado en las vistas.
- Cada dato mostrado lleva etiqueta Medido / Inferido / Supuesto (`origenHTML`); los simulados además llevan «sim». Nunca presentar simulado como medido.
- Vacío = **N/I**, nunca 0. Datos de archivo fuera de rango físico → N/I con aviso.
- El análisis usa solo datos hasta el día de análisis (`app.cursor`); no mostrar «el futuro» de la serie simulada.
- Semáforo = peor estado de las variables (regla de veto en el índice); `tests/verify.cjs` lo comprueba día a día en todos los escenarios.
- Poco texto en pantalla: explicaciones dentro de `info('…')` (ⓘ).
- Rutas a assets siempre por `recurso()` (en la entrega los GLB van embebidos en `window.__RECURSOS`).
- Prueba visual: abrir `ColdLifeCycle.html` por file:// con Playwright (chromium, `--use-angle=swiftshader`), recorrer las 6 pestañas y exigir 0 errores de consola.
- Colores de estado fijos: normal `#2e9e5b`, alerta `#e0a020`, alarma `#d64545`, falla `#8e1b1b`, N/I `#7a8599`.
