// Verificación de la lógica pura (config, simulador, analisis, datos) con node, sin dependencias.
// Uso: node tests/verify.cjs
const path = require('path');
const raiz = path.join(__dirname, '..');

let fallos = 0, ok = 0;
function check(nombre, cond, detalle) {
  if (cond) { ok++; console.log('  ✔ ' + nombre); }
  else { fallos++; console.log('  ✘ ' + nombre + (detalle !== undefined ? '  → ' + JSON.stringify(detalle) : '')); }
}
const cerca = (a, b, tol) => Math.abs(a - b) <= tol;

(async () => {
  const url = (f) => 'file:///' + path.join(raiz, f).replace(/\\/g, '/');
  const { CONFIG, VARIABLES: V } = await import(url('src/config.js'));
  const S = await import(url('src/simulador.js'));
  const A = await import(url('src/analisis.js'));
  const D = await import(url('src/datos.js'));

  console.log('\nModelo (AMFEC, variables, umbrales)');
  check('10 modos con C = S × O', Object.values(CONFIG.modos).length === 10 && Object.values(CONFIG.modos).every((m) => m.C === m.S * m.O));
  check('NPR = S × O × D', Object.values(CONFIG.modos).every((m) => m.NPR === m.S * m.O * m.D));
  check('Entre 4 y 6 variables', CONFIG.variables.length >= 4 && CONFIG.variables.length <= 6);
  const asignados = CONFIG.variables.flatMap((v) => v.modos);
  check('Ningún modo asignado a dos variables', new Set(asignados).size === asignados.length);
  check('Todo modo tiene tarea RCM', Object.keys(CONFIG.modos).every((m) => CONFIG.tareas[m]?.tarea));
  check('Umbrales ordenados P < alarma < F en el sentido de la falla', CONFIG.variables.every((v) => { const s = v.sentido === 'baja' ? -1 : 1; const u = v.umbrales; return s * (u.alarma.v - u.alerta.v) > 0 && s * (u.falla.v - u.alarma.v) > 0 && s * (u.alerta.v - v.base) > 0; }));
  check('Cada tasa de degradación (curva P-F) cita su fuente', CONFIG.variables.every((v) => v.degradacion.fuente?.length > 40));
  check('Cada umbral cita su fuente', CONFIG.variables.every((v) => ['alerta', 'alarma', 'falla'].every((k) => v.umbrales[k].fuente?.length > 10)));
  const W = A.pesos(CONFIG);
  check('Pesos suman 1', cerca(Object.values(W).reduce((s, x) => s + x.w, 0), 1, 1e-9));
  check('Peso ∝ suma de C (vibración = ciclo útil = 64)', W.vib.sumaC === 64 && W.ciclo.sumaC === 64 && W.tdesc.sumaC === 45);

  console.log('\nIntervalo P-F y frecuencia de medición');
  const pf = Object.fromEntries(CONFIG.variables.map((v) => [v.id, A.intervaloPF(v).pf]));
  check('P-F T descarga ≈ 30 d (exponencial)', cerca(pf.tdesc, 30, 0.5), pf.tdesc);
  check('P-F ciclo útil = 50 d (lineal)', cerca(pf.ciclo, 50, 1e-9), pf.ciclo);
  check('P-F T cámara = 2 h', cerca(pf.tcam * 24, 2, 1e-6), pf.tcam);
  check('P-F vibración ≈ 60 d', cerca(pf.vib, 60, 0.5), pf.vib);
  check('Tramos P→alarma + alarma→F = P-F', CONFIG.variables.every((v) => { const p = A.intervaloPF(v); return cerca(p.pAlarma + p.alarmaF, p.pf, 1e-9); }));
  check('Frecuencia propuesta ≤ P-F/2 en todas', CONFIG.variables.every((v) => v.frecuencia.propuesta <= pf[v.id] / 2), CONFIG.variables.map((v) => [v.id, v.frecuencia.propuesta, pf[v.id] / 2]));
  check('Plan actual del informe no cumple P-F/2 en corriente y T cámara', CONFIG.variables.filter((v) => v.frecuencia.plan > pf[v.id] / 2).map((v) => v.id).join() .includes('corriente') && 90 > pf.corriente / 2 && 1 > pf.tcam / 2);

  console.log('\nEstado, subíndice e índice de salud');
  const vt = V.tdesc, vs = V.sh;
  check('Estados T descarga', ['normal', 'alerta', 'alarma', 'falla'].join() === [90, 95, 110, 140].map((x) => A.estadoDe(vt, x)).join());
  check('Estados sobrecalentamiento (baja)', ['normal', 'alerta', 'alarma', 'falla'].join() === [9, 7, 4, 0.5].map((x) => A.estadoDe(vs, x)).join());
  check('Vacío = N/I, nunca 0', A.estadoDe(vt, null) === 'NI' && A.subindice(vt, null, CONFIG) === null);
  check('Subíndice 100/60/20/0 en base/P/alarma/F', [80, 95, 107, 135].map((x) => Math.round(A.subindice(vt, x, CONFIG))).join() === '100,60,20,0');
  const base = Object.fromEntries(CONFIG.variables.map((v) => [v.id, v.base]));
  const h0 = A.indiceSalud(base, CONFIG);
  check('Todo en la base → 100 y verde', h0.hi === 100 && h0.semaforo === 'verde');
  const h1 = A.indiceSalud({ ...base, tdesc: 100 }, CONFIG);
  check('Una variable en alerta → amarillo (veto, índice ≤ 60)', h1.semaforo === 'amarillo' && h1.hi <= 60 && h1.veto, h1.hi);
  const h2 = A.indiceSalud({ ...base, sh: 4.5 }, CONFIG);
  check('Una variable en alarma → rojo (índice ≤ 20)', h2.semaforo === 'rojo' && h2.hi <= 20, h2.hi);
  const h3 = A.indiceSalud({ ...base, vib: null, sh: null }, CONFIG);
  check('Variables N/I se excluyen y se renormaliza', h3.hi === 100 && h3.sub.vib.estado === 'NI');

  console.log('\nTendencia y tiempo hasta el umbral');
  const tl = [...Array(20).keys()]; const yl = tl.map((t) => 60 + 0.8 * t);
  const fl = A.ajustar(tl, yl, V.ciclo);
  check('Lineal exacta: pendiente 0,8 y R² = 1', fl.modelo === 'lineal' && cerca(fl.pendiente, 0.8, 1e-9) && cerca(fl.r2, 1, 1e-9));
  const tc = A.tiempoHasta(fl, 75, V.ciclo, 19, yl[19]);
  check('Tiempo hasta 75 % = (75 − 75,2)… ya superado', tc.ya === true);
  const t90 = A.tiempoHasta(fl, 90, V.ciclo, 19, yl[19]);
  check('Tiempo hasta 90 % = 18,5 d', cerca(t90.dias, (90 - 60) / 0.8 - 19, 1e-6), t90);
  const t30 = [...Array(30).keys()]; const ye = t30.map((t) => 80 + 2 * Math.exp(0.08 * t));
  const fe = A.ajustar(t30, ye, vt);
  check('Exponencial reconocida (k = 0,08)', fe.modelo === 'exponencial' && cerca(fe.exp.k, 0.08, 1e-6), fe.modelo);
  const te = A.tiempoHasta(fe, 135, vt, 29, ye[29]);
  check('Tiempo exponencial hasta 135 °C', cerca(te.dias, Math.log(55 / 2) / 0.08 - 29, 1e-4), te);
  check('Mecanismo lineal con curvatura suave: se queda con la lineal', A.ajustar(tl, tl.map((t) => 58 + 2 * Math.exp(0.05 * t)), V.ciclo).modelo === 'lineal');
  const plano = A.ajustar(tl, tl.map((t) => 80 + (t % 2 ? 0.4 : -0.4)), vt);
  check('Serie plana: sin degradación, tiempo no estimable', plano.degrada === false && A.tiempoHasta(plano, 107, vt, 19, 80) === null);
  const yb = tl.map((t) => 10 - 0.25 * t);
  const fb = A.ajustar(tl, yb, vs);
  check('Variable que baja: tiempo hasta 5 K', cerca(A.tiempoHasta(fb, 5, vs, 10, yb[10]).dias, 10, 1e-6));

  console.log('\nSimulador y escenarios');
  const n = S.simular(CONFIG, { escenario: 'normal' });
  const hn = A.historia(n, CONFIG);
  check('Escenario normal: 180 días sin alarmas', n.fechas.length === 180 && hn.every((d) => d.semaforo !== 'rojo'));
  check('Escenario normal: ≤ 3 % de días en amarillo (falsas alertas)', hn.filter((d) => d.semaforo === 'amarillo').length <= 0.03 * hn.length, hn.filter((d) => d.semaforo === 'amarillo').length);
  check('Variables semanales con un dato cada 7 días', n.valores.vib.filter((x) => x !== null).length === Math.ceil(180 / 7));
  check('Reproducible con la misma semilla', JSON.stringify(S.simular(CONFIG, {}).valores) === JSON.stringify(S.simular(CONFIG, {}).valores));
  for (const id of Object.keys(CONFIG.escenarios).filter((e) => e !== 'normal')) {
    const s = S.simular(CONFIG, { escenario: id }); const h = A.historia(s, CONFIG); const esc = CONFIG.escenarios[id];
    const primer = (niv) => { for (const d of h) for (const v of CONFIG.variables) if (A.NIVEL[d.estados[v.id]] >= niv) return { var: v.id, i: d.i }; return null; };
    const pa = primer(1), pr = primer(2), pff = primer(3);
    check(`${id}: recorre normal → alerta → alarma (paro) → F`, h[0].semaforo === 'verde' && pa && pr && pff && pa.i < pr.i && pr.i <= pff.i, { pa, pr, pff });
    check(`${id}: la primera alerta la da la variable primaria (${esc.primaria})`, pa?.var === esc.primaria, pa);
    const a = A.analizar(s, CONFIG, s.meta.dP + Math.round((s.meta.dAlarma - s.meta.dP) / 2));
    const o = a.ordenes.find((x) => x.var === esc.primaria);
    check(`${id}: orden sugerida con modo del AMFEC y tarea RCM`, o && CONFIG.variables.find((v) => v.id === esc.primaria).modos.includes(o.modo) && o.tarea && o.recurso && o.plazoDias > 0, o && { modo: o.modo, p: o.p });
    check(`${id}: semáforo coherente con el peor estado todos los días`, h.every((d) => { const peor = Math.max(...Object.values(d.estados).map((e) => A.NIVEL[e])); return d.semaforo === (peor >= 2 ? 'rojo' : peor === 1 ? 'amarillo' : 'verde'); }));
  }
  const sc = S.simular(CONFIG, { escenario: 'condensador' });
  const ac = A.analizar(sc, CONFIG, sc.meta.dP + 5);
  const tA = ac.vars.tdesc.tiempos.alarma.dias; const real = sc.meta.dAlarma - (sc.meta.dP + 5);
  check('Condensador: tiempo estimado a la alarma cerca del real (±40 %)', Number.isFinite(tA) && Math.abs(tA - real) <= 0.4 * real + 2, { tA, real });
  check('Condensador: modelo exponencial para T descarga', ac.vars.tdesc.fit.modelo === 'exponencial', ac.vars.tdesc.fit.modelo);
  check('Condensador: prioridad P2 en alerta (C = 45)', ac.ordenes[0].p === 'P2' && ac.ordenes[0].C === 45, ac.ordenes[0]);
  const ar = A.analizar(sc, CONFIG, sc.meta.dAlarma + 1);
  check('Condensador en alarma: P1, paro obligatorio, plazo ≤ 4 h', ar.ordenes[0].p === 'P1' && ar.ordenes[0].paro && cerca(ar.ordenes[0].plazoDias, 4 / 24, 1e-9));
  const rapido = S.simular(CONFIG, { escenario: 'fuga', ritmo: 2 });
  check('Ritmo ×2 acorta la distancia P → F a la mitad', cerca(rapido.meta.dF - rapido.meta.dP, A.intervaloPF(V.ciclo).pf / 2, 1.01));

  console.log('\nPrioridad por criticidad');
  check('Alarma C ≥ 40 → P1 ≤ 4 h', A.prioridadDe('alarma', 45, CONFIG).p === 'P1');
  check('Alerta C 30–39 → P3; C < 30 → P4', A.prioridadDe('alerta', 36, CONFIG).p === 'P3' && A.prioridadDe('alerta', 28, CONFIG).p === 'P4');

  console.log('\nCarga de archivos');
  const csv = 'Fecha;Temperatura de descarga;Corriente (A);Ciclo útil;T cámara;origen\n01/07/2026;82,5;7,7;60;4,1;medido\n01/07/2026;83,5;7,9;62;4,3;medido\n03/07/2026;abc;8;;4;\n04/07/2026;999;8,1;63;4,2;supuesto';
  const sd = D.serieDeFilas(D.filasDeCSV(csv), CONFIG, 'prueba.csv');
  check('CSV con ; y coma decimal, fechas dd/mm/aaaa', sd.fechas[0] === '2026-07-01' && sd.fechas.length === 4);
  check('Varias lecturas el mismo día se promedian', sd.valores.tdesc[0] === 83 && sd.valores.corriente[0] === 7.8, sd.valores.tdesc[0]);
  check('Día sin lecturas queda N/I (no 0)', sd.valores.tdesc[1] === null && sd.valores.tcam[1] === null);
  check('Texto no numérico y fuera de rango → N/I con aviso', sd.valores.tdesc[2] === null && sd.valores.tdesc[3] === null && sd.avisos.some((a) => a.includes('no numérico')) && sd.avisos.some((a) => a.includes('fuera del rango')));
  check('Columna origen por fila', sd.origen.tdesc[3] === 'supuesto' && sd.origen.tdesc[0] === 'medido');
  check('Variables sin columna se avisan', sd.avisos.some((a) => a.includes('Sobrecalentamiento')));
  check('Serial de Excel → fecha', D.fechaISO(46204) === '2026-07-01', D.fechaISO(46204));
  check('Miles con punto', D.numero('1.837.500') === 1837500 && D.numero('4,5') === 4.5);
  const ev = D.eventosDeFilas([{ Fecha: '2026-07-10', Tipo: 'Falla', Modo: 'm1', 'Horas parada': '5', Costo: '350.000' }]);
  check('Eventos: tipo, modo, horas y costo', ev[0].tipo === 'falla' && ev[0].modo === 'M1' && ev[0].horasParada === 5 && ev[0].costo === 350000, ev[0]);

  console.log('\nIndicadores de proceso');
  const evs = A.eventosPeriodo(CONFIG, CONFIG.eventos, '2026-11-30');
  const k = A.indicadores(CONFIG, evs, '2026-11-30');
  check('12 meses desde la puesta en servicio', k.meses.length === 12 && k.meses[0].mes === '2025-12');
  check('3 fallas y 28 h de parada', k.nFallas === 3 && k.meses.reduce((s, m) => s + m.parada, 0) === 28);
  check('MTTR = 28/3 h', cerca(k.mttr, 28 / 3, 1e-9));
  check('MTBF = (horas − parada)/fallas', cerca(k.mtbf, (k.horas - 28) / 3, 1e-9));
  check('Disponibilidad de abril < 99 % y de mayo = 100 %', k.meses.find((m) => m.mes === '2026-04').disp < 99 && k.meses.find((m) => m.mes === '2026-05').disp === 100);
  check('Presupuesto acumulado ≈ anual al cierre', cerca(k.presupuestoAcum, CONFIG.objetivos.presupuestoAnual.v, 1));

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallidas.`);
  process.exit(fallos ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
