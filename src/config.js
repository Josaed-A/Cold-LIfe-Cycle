// Parámetros de la plataforma. Todo lo que el informe del grupo, el AMFEC o una fuente externa fija
// está aquí, con su origen: las vistas y la lógica no traen números propios.
// Etiquetas de origen (enunciado, sección 4): 'medido' | 'inferido' | 'supuesto'.

export const CONFIG = {
  storageKey: 'coldlife.v1',

  activo: {
    nombre: 'Cuarto frío 3 × 3 × 2,5 m',
    referencia: 'FrigoMaster · enfriamiento/preservación (0–10 °C)',
    caso: 'Restaurante de gran capacidad · caso de referencia Andrés D.C., Bogotá',
    componente: 'Compresor hermético de la unidad condensadora',
    codigo: 'CF-01 / CMP-01',
    setpoint: 4, banda: [2, 6],
    refrigerante: 'R-404A',
    operacionHorasAnio: 8760,
  },

  // AMFEC del compresor (documento «AMFEC del compresor del cuarto frío», Grupo 5). C = S × O.
  modos: {
    M1: { nombre: 'No arranque eléctrico', causa: 'Contactor, fusible, relé o alimentación defectuosa', efecto: 'No hay compresión; el inventario queda en riesgo.', S: 9, O: 4, D: 3, NPR: 108, C: 36 },
    M2: { nombre: 'Falla de bobinado', causa: 'Aislamiento degradado, sobrecorriente o sobretemperatura', efecto: 'Parada total y posible contaminación del circuito.', S: 10, O: 3, D: 6, NPR: 180, C: 30 },
    M3: { nombre: 'Pérdida de capacidad', causa: 'Desgaste interno, válvulas o elementos deteriorados', efecto: 'Enfriamiento lento, ciclos largos y salida de banda.', S: 8, O: 4, D: 5, NPR: 160, C: 32 },
    M4: { nombre: 'Sobrecalentamiento', causa: 'Alta presión de descarga o condensación deficiente', efecto: 'Degrada aceite y aislamiento; acelera el daño.', S: 9, O: 5, D: 4, NPR: 180, C: 45 },
    M5: { nombre: 'Retorno de líquido', causa: 'Sobrecalentamiento bajo o deshielo/expansión mal ajustados', efecto: 'Golpe hidráulico y pérdida súbita de compresión.', S: 10, O: 3, D: 7, NPR: 210, C: 30 },
    M6: { nombre: 'Lubricación deficiente', causa: 'Bajo nivel, mala separación/retorno de aceite o migración', efecto: 'Desgaste de cojinetes y riesgo de gripado.', S: 9, O: 4, D: 6, NPR: 216, C: 36 },
    M7: { nombre: 'Fuga de refrigerante', causa: 'Conexiones, válvulas o carcasa con pérdida', efecto: 'Baja carga, menor capacidad y liberación al ambiente.', S: 8, O: 4, D: 5, NPR: 160, C: 32 },
    M8: { nombre: 'Humedad / ácidos', causa: 'Vacío deficiente o ingreso de humedad/contaminación', efecto: 'Corrosión interna y fallas eléctricas repetitivas.', S: 9, O: 3, D: 7, NPR: 189, C: 27 },
    M9: { nombre: 'Vibración excesiva', causa: 'Soportes deteriorados, tubería forzada o desbalance', efecto: 'Fatiga de tuberías/conexiones y aumento de fugas.', S: 7, O: 4, D: 4, NPR: 112, C: 28 },
    M10: { nombre: 'Bloqueo mecánico', causa: 'Gripado o partículas en el mecanismo', efecto: 'Disparo de protección y pérdida total de refrigeración.', S: 10, O: 2, D: 8, NPR: 160, C: 20 },
  },

  // Tareas RCM por modo de falla. Construidas desde las «acciones de control» del AMFEC y el plan de
  // mantenimiento del informe (Etapa 6). horas = horas-hombre; preparacion = días para tener técnico y
  // repuesto en sitio; costo = intervenir a tiempo; falla = costo y parada si se deja llegar a F.
  // Costos y tiempos son supuestos (el informe no tiene cotizaciones); la falla del compresor usa la Etapa 9.
  tareas: {
    M1: { tarea: 'Revisar alimentación, contactor, relé de arranque, protector y fusibles; medir tensión y corriente de arranque; activar plan de contingencia del inventario.', tipo: 'Búsqueda de falla + alarma en tiempo real', recurso: 'Técnico RAC + electricista', horas: 2, repuestos: 'Contactor, relé, fusibles (kit inicial del informe)', preparacion: 0.25, costo: 350000, falla: { costo: 1150000, horas: 6 } },
    M2: { tarea: 'Medir resistencia de aislamiento (megóhmetro 500 V) y de devanados, desbalance de tensión/corriente; revisar contactor y protecciones.', tipo: 'A condición', recurso: 'Técnico RAC + electricista', horas: 3, repuestos: 'Contactor, protector térmico', preparacion: 2, costo: 450000, falla: { costo: 6500000, horas: 72 } },
    M3: { tarea: 'Medir presiones, sobrecalentamiento y subenfriamiento; prueba de bombeo del compresor; decidir reparar o cambiar (Etapa 9 del informe).', tipo: 'A condición', recurso: 'Técnico RAC', horas: 4, repuestos: 'Según diagnóstico', preparacion: 3, costo: 500000, falla: { costo: 6500000, horas: 72 } },
    M4: { tarea: 'Lavar el serpentín del condensador, verificar ventilador y presión de descarga; corregir la condensación deficiente.', tipo: 'A condición', recurso: 'Técnico RAC', horas: 2, repuestos: 'Limpiador de serpentín; motor de ventilador si aplica', preparacion: 1, costo: 250000, falla: { costo: 6500000, horas: 72 } },
    M5: { tarea: 'Ajustar la válvula de expansión (sobrecalentamiento 8–12 K), verificar bulbo, ventiladores y ciclo de deshielo del evaporador; revisar acumulador de succión.', tipo: 'A condición', recurso: 'Técnico RAC', horas: 3, repuestos: 'Elemento de válvula de expansión', preparacion: 1, costo: 300000, falla: { costo: 6500000, horas: 72 } },
    M6: { tarea: 'Verificar nivel y retorno de aceite (visor), temperatura de carcasa y ruido; corregir trampas de aceite; análisis de aceite.', tipo: 'A condición', recurso: 'Técnico RAC', horas: 3, repuestos: 'Aceite POE', preparacion: 3, costo: 400000, falla: { costo: 6500000, horas: 72 } },
    M7: { tarea: 'Detección electrónica de fugas, reparar, vacío ≤ 500 µm, cambiar filtro secador y recargar por peso (Guía MinAmbiente 2025).', tipo: 'A condición', recurso: 'Técnico RAC certificado', horas: 5, repuestos: 'Refrigerante R-404A, filtro secador, varilla de soldadura', preparacion: 2, costo: 900000, falla: { costo: 2300000, horas: 24 } },
    M8: { tarea: 'Prueba de acidez del aceite y cambio de filtro secador; vacío profundo si hay humedad.', tipo: 'Programada (anual y tras toda falla eléctrica del motor)', recurso: 'Técnico RAC', horas: 3, repuestos: 'Kit de prueba de acidez, filtro secador', preparacion: 2, costo: 400000, falla: { costo: 6500000, horas: 72 } },
    M9: { tarea: 'Revisar soportes antivibratorios, fijaciones, abrazaderas y eliminadores de vibración de la tubería.', tipo: 'A condición', recurso: 'Técnico RAC', horas: 2, repuestos: 'Gomas antivibratorias, abrazaderas', preparacion: 1, costo: 200000, falla: { costo: 2300000, horas: 24 } },
    M10: { tarea: 'Verificar corriente de rotor bloqueado y arranque; si hay gripado, cambiar el compresor.', tipo: 'A falla (sin anticipación práctica)', recurso: 'Servicio especializado', horas: 8, repuestos: 'Compresor', preparacion: 5, costo: 6500000, falla: { costo: 6500000, horas: 72 } },
  },

  // Candidatas del enunciado para el grupo 5 (sección 3) y qué se hizo con cada una.
  candidatas: [
    ['T de cámara, ciclo útil y corriente', 'Se usan: anticipan M1, M3/M7 y M2/M10.'],
    ['T del condensador', 'Se cambia por la T de descarga. Las dos suben con el condensador sucio (M4, C 45, el modo más crítico), pero la descarga es la que limita el fabricante (107 °C en la línea) y la que degrada el aceite y el aislamiento, que es el efecto de M4; la del condensador sigue mucho al ambiente.'],
    ['Aperturas de puerta', 'No se usa: es una causa de carga térmica, no anticipa un modo del compresor (pesaría 0 en el índice). Su efecto ya aparece en la T de cámara, el ciclo útil y la escarcha.'],
    ['Añadidas: vibración y sobrecalentamiento', 'Cubren M6/M9 (NPR 216, el mayor del AMFEC) y M5 (NPR 210, el segundo), que ninguna candidata anticipa.'],
  ],

  // Variables de condición. Cada modo del AMFEC se asigna a UNA variable (la que lo detecta antes),
  // así ningún modo se cuenta dos veces en los pesos. M8 no tiene variable continua (tarea programada).
  // Umbrales: alerta = P de la curva P-F; alarma = paro obligatorio (antes de F); falla = F.
  // degradacion: forma y tasa típica del mecanismo (supuesto) → de aquí sale el intervalo P-F.
  variables: [
    {
      id: 'tdesc', nombre: 'Temperatura de descarga', corto: 'T descarga', unidad: '°C', dec: 1, sentido: 'sube',
      origen: 'medido', metodo: 'Termocupla tipo K adherida y aislada en la línea de descarga, cerca del compresor; datalogger IoT.',
      frecuencia: { plan: 30, planTxt: 'Mensual (inspección del condensador, Etapa 6)', propuesta: 1, propuestaTxt: 'Continua cada 15 min; se usa el promedio diario' },
      modos: ['M4'], base: 80, ruido: 1.5,
      umbrales: {
        alerta: { v: 95, fuente: 'RCM G5: línea base de puesta en marcha (80 °C) + 15 K, fuera de la variación normal' },
        alarma: { v: 107, fuente: 'Límite de la línea de descarga 107 °C (225 °F) — ACHR News / práctica de fabricantes de compresores' },
        falla: { v: 135, fuente: 'Válvula ≈ 42 K más caliente que la línea: 135 °C en línea ≈ 177 °C (350 °F) en la válvula, inicio de descomposición del aceite mineral' },
      },
      degradacion: { forma: 'exponencial', k: 0.0433, mecanismo: 'Ensuciamiento del condensador: sube la presión de condensación y la relación de compresión',
        fuente: 'Mecanismo: el condensador sucio eleva la condensación, la temperatura de descarga y el amperaje (ACHR News). No se halló una tasa publicada en el tiempo (los estudios de laboratorio dan efectos variables): P-F de 30 d, conservador por la grasa del ambiente de cocina.' },
    },
    {
      id: 'corriente', nombre: 'Corriente del compresor', corto: 'Corriente', unidad: 'A', dec: 2, sentido: 'sube',
      origen: 'medido', metodo: 'Transformador de corriente (CT) en la fase del compresor; verificación con pinza amperimétrica.',
      frecuencia: { plan: 90, planTxt: 'Trimestral (medir corriente y tensión, Etapa 6)', propuesta: 1, propuestaTxt: 'Continua; se usa el promedio diario en marcha' },
      modos: ['M2', 'M10'], base: 7.6, ruido: 0.15, rla: 9.5,
      umbrales: {
        alerta: { v: 9.5, fuente: '100 % de la corriente nominal de placa (RLA): operar por encima es sobrecarga (RLA supuesta 9,5 A)' },
        alarma: { v: 11.4, fuente: 'RCM G5: 120 % RLA, margen antes del disparo del relé de sobrecarga' },
        falla: { v: 13.3, fuente: 'NEC art. 440.52(A)(1): el relé de sobrecarga dispara a ≤ 140 % RLA → parada del compresor' },
      },
      degradacion: { forma: 'exponencial', k: 0.0244, mecanismo: 'Degradación del aislamiento / fricción creciente: la corriente sube cada vez más rápido',
        fuente: 'El aislamiento se degrada con tendencia progresiva hasta un umbral definido (tesis U. Leeds), aunque algunas fallas de estator escalan en horas. Sin intervalo publicado: 45 d, menor que el de vibración porque las pruebas eléctricas detectan más tarde en la curva P-F (ISA InTech, 2019).' },
    },
    {
      id: 'ciclo', nombre: 'Ciclo útil del compresor', corto: 'Ciclo útil', unidad: '%', dec: 1, sentido: 'sube',
      origen: 'inferido', metodo: 'Tiempo en marcha / 24 h, calculado con la señal de corriente (compresor encendido si I > 2 A).',
      frecuencia: { plan: 180, planTxt: 'Semestral (desempeño del circuito, Etapa 6)', propuesta: 1, propuestaTxt: 'Diaria (calculada del registro continuo de corriente)' },
      modos: ['M3', 'M7'], base: 58, ruido: 2,
      umbrales: {
        alerta: { v: 75, fuente: 'Diseño de cámaras de media temperatura a 16–18 h de marcha por día (Heatcraft H-ENGM0408): sobre 18 h/24 h falta capacidad' },
        alarma: { v: 90, fuente: 'RCM G5: con menos de 2,4 h/día de paro no se completa el deshielo por ciclo de paro' },
        falla: { v: 100, fuente: 'Marcha continua sin alcanzar el setpoint: pérdida de capacidad (falla funcional FF2 del AMFEC)' },
      },
      degradacion: { forma: 'lineal', r: 0.5, mecanismo: 'Fuga lenta de refrigerante: la capacidad cae a ritmo casi constante',
        fuente: 'Fuga promedio de la industria ≈ 25 %/año de la carga (EPA GreenChill). Se supone una fuga localizada más rápida (≈ 25 % de la carga en 3 meses), que lleva el ciclo útil de 58 % a 100 % en ≈ 84 d.' },
    },
    {
      id: 'tcam', nombre: 'Temperatura de cámara', corto: 'T cámara', unidad: '°C', dec: 2, sentido: 'sube',
      origen: 'medido', metodo: 'Sonda NTC del controlador y datalogger a 1,5 m de altura, lejos de la puerta; promedio diario sin deshielos.',
      frecuencia: { plan: 1, planTxt: 'Diaria (verificar temperatura, Etapa 6)', propuesta: 0.0104, propuestaTxt: 'Continua cada 15 min con alarma remota (mejora IoT del informe)' },
      modos: ['M1'], base: 4, ruido: 0.12,
      umbrales: {
        alerta: { v: 5, fuente: 'Setpoint 4 °C + diferencial del controlador 1 K (supuesto, manual Full Gauge)' },
        alarma: { v: 5.5, fuente: 'RCM G5: 0,5 K de margen antes del límite sanitario para contener el inventario' },
        falla: { v: 6, fuente: 'Resolución 2674 de 2013, art. 18 num. 3.1: refrigeración no mayor de 4 °C ± 2 °C' },
      },
      degradacion: { forma: 'lineal', r: 12, mecanismo: 'Compresor detenido (no arranque): la cámara se calienta ≈ 0,5 K/h con la puerta cerrada',
        fuente: 'Un refrigerador cerrado y sin frío mantiene ≤ 5 °C solo unas horas: hasta 4 h (Iowa DIAL) y ≈ 6 h sin abrir (estudio FIU). Con 0,5 K/h la cámara pasa de 4 °C a 6 °C en 4 h.' },
    },
    {
      id: 'sh', nombre: 'Sobrecalentamiento de succión', corto: 'Sobrecalentamiento', unidad: 'K', dec: 1, sentido: 'baja',
      origen: 'inferido', metodo: 'T de succión (termómetro de contacto) − T de saturación a la presión de succión (manómetro, tabla R-404A).',
      frecuencia: { plan: 180, planTxt: 'Semestral (desempeño del circuito, Etapa 6)', propuesta: 7, propuestaTxt: 'Semanal con manómetros y termómetro de contacto' },
      modos: ['M5'], base: 10, ruido: 0.5,
      umbrales: {
        alerta: { v: 7, fuente: 'RCM G5: por debajo de la banda de ajuste de la válvula de expansión (8–12 K)' },
        alarma: { v: 5, fuente: 'Danfoss, guías de aplicación de compresores: sobrecalentamiento mínimo 5 K (riesgo de retorno de líquido)' },
        falla: { v: 1, fuente: 'Vapor casi saturado en la succión: entra líquido al compresor (golpe hidráulico, modo M5)' },
      },
      degradacion: { forma: 'lineal', r: 0.3, mecanismo: 'Escarcha creciente en el evaporador o deriva de la válvula de expansión',
        fuente: 'La escarcha aísla el serpentín, baja el sobrecalentamiento y la válvula pierde el control hasta inundar el compresor (ACHR News; Danfoss, diagnóstico de cuartos fríos). Sin tasa publicada: 20 d para la acumulación gradual; un deshielo que falla por completo es más rápido (días).' },
    },
    {
      id: 'vib', nombre: 'Vibración de la carcasa', corto: 'Vibración', unidad: 'mm/s', dec: 2, sentido: 'sube',
      origen: 'medido', metodo: 'Velocidad RMS en la base del compresor con acelerómetro (app de vibración del celular o sensor IoT).',
      frecuencia: { plan: 30, planTxt: 'Mensual (ruidos y vibraciones, Etapa 6)', propuesta: 7, propuestaTxt: 'Semanal' },
      modos: ['M6', 'M9'], base: 1.0, ruido: 0.08,
      umbrales: {
        alerta: { v: 1.8, fuente: 'ISO 10816-1, clase I (≤ 15 kW): límite zona B/C, no apta para operación continua. La norma fue reemplazada por ISO 20816-1:2016, que conserva las zonas A–D' },
        alarma: { v: 2.8, fuente: 'RCM G5: punto medio de la zona C (serie de valores ISO 10816)' },
        falla: { v: 4.5, fuente: 'ISO 10816-1 (hoy ISO 20816-1), clase I: límite zona C/D, vibración que causa daño' },
      },
      degradacion: { forma: 'exponencial', k: 0.0246, mecanismo: 'Desgaste de cojinetes por lubricación deficiente: crecimiento acelerado',
        fuente: 'En máquinas con rodamientos el P-F por vibración es de semanas a meses (Pumps & Systems / Schaeffler) y el desgaste se puede seguir 12–18 meses (Fluke): 60 d es conservador.' },
    },
  ],

  // Escenarios del simulador. primaria = variable que anticipa el modo; acoples = fracción de su propio
  // rango (F − base) que se mueve cada variable cuando la primaria llega a F (s = 1); tardia = solo
  // responde al final (s > 0,8), como la temperatura de cámara cuando ya falta capacidad.
  escenarios: {
    normal: { nombre: 'Operación normal', modo: null },
    condensador: { nombre: 'Condensador sucio → sobrecalentamiento', modo: 'M4', primaria: 'tdesc', acoples: { corriente: 0.45, ciclo: 0.55 }, tardia: { tcam: 1.15 } },
    fuga: { nombre: 'Fuga lenta de refrigerante', modo: 'M7', primaria: 'ciclo', acoples: { sh: -0.6, tdesc: 0.35, corriente: -0.15 }, tardia: { tcam: 1.15 } },
    lubricacion: { nombre: 'Lubricación deficiente → desgaste', modo: 'M6', primaria: 'vib', acoples: { corriente: 0.35, tdesc: 0.3 } },
    expansion: { nombre: 'Escarcha / expansión → retorno de líquido', modo: 'M5', primaria: 'sh', acoples: { vib: 0.4, ciclo: 0.3, tdesc: -0.15 }, tardia: { tcam: 0.9 } },
    bobinado: { nombre: 'Aislamiento del bobinado degradado', modo: 'M2', primaria: 'corriente', acoples: { tdesc: 0.3, vib: 0.15 } },
  },
  simulacion: { inicio: '2026-06-01', dias: 180, diaFalla: 165, escenario: 'condensador', semilla: 7, ruido: 1, ritmo: 1 },

  // Índice de salud: subíndice por variable (100 en la línea base, 60 en P, 20 en la alarma, 0 en F)
  // y semáforo por bandas; una variable en alerta/alarma limita el índice (regla de veto).
  indice: { hP: 60, hAlarma: 20, verde: 60, rojo: 20 },

  // Prioridad de la orden: sale de la criticidad C del AMFEC y del nivel; plazo máximo en días.
  prioridad: {
    alarma: [{ cMin: 40, p: 'P1', plazo: 4 / 24, txt: 'Emergencia' }, { cMin: 30, p: 'P1', plazo: 8 / 24, txt: 'Emergencia' }, { cMin: 0, p: 'P2', plazo: 1, txt: 'Urgente' }],
    alerta: [{ cMin: 40, p: 'P2', plazo: 3, txt: 'Urgente' }, { cMin: 30, p: 'P3', plazo: 7, txt: 'Programada' }, { cMin: 0, p: 'P4', plazo: 14, txt: 'Programable' }],
  },

  // Indicadores de proceso. Disponibilidad ≥ 99 % y presupuesto salen del informe (Etapas 5 y 7);
  // MTBF y MTTR objetivo son supuestos coherentes con esa disponibilidad.
  objetivos: {
    disponibilidad: { v: 99, fuente: 'Informe del grupo, Etapa 5 (meta inicial ≥ 99 %)' },
    mtbf: { v: 2190, fuente: 'Supuesto: ≤ 4 fallas/año (8 760 h / 4)' },
    mttr: { v: 12, fuente: 'Supuesto: respuesta del técnico + reparación menor; con MTBF 2 190 h da A ≥ 99,4 %' },
    presupuestoAnual: { v: 1837500, fuente: 'Informe, Etapa 7: preventivo 700 000 + repuestos 350 000 + correctivos 350 000 + calibración 175 000 + consumibles 262 500' },
  },
  puestaEnServicio: '2025-12-01',
  // Historial de mantenimiento simulado (no hay registros reales del equipo).
  eventos: [
    { fecha: '2026-01-12', tipo: 'falla', modo: 'M1', descripcion: 'Contactor del compresor con contactos quemados', horasParada: 5, costo: 350000 },
    { fecha: '2026-03-03', tipo: 'preventivo', modo: null, descripcion: 'Trimestral: corriente, tensión, conexiones y deshielo', horasParada: 0, costo: 180000 },
    { fecha: '2026-04-21', tipo: 'falla', modo: 'M4', descripcion: 'Ventilador del condensador detenido; disparo por alta presión', horasParada: 9, costo: 420000 },
    { fecha: '2026-06-02', tipo: 'preventivo', modo: 'M7', descripcion: 'Semestral: fugas, sensor y desempeño del circuito', horasParada: 0, costo: 260000 },
    { fecha: '2026-08-18', tipo: 'falla', modo: 'M7', descripcion: 'Fuga en unión abocinada de la línea de líquido', horasParada: 14, costo: 900000 },
    { fecha: '2026-09-01', tipo: 'preventivo', modo: null, descripcion: 'Trimestral: corriente, tensión, conexiones y deshielo', horasParada: 0, costo: 180000 },
  ],
  preventivoMensual: { costo: 58000, descripcion: 'Mensual: condensador, ventiladores, ruidos y vibraciones' },

  supuestos: [
    ['Datos de condición', 'Simulados con ruido y degradación progresiva', 'El cuarto frío no tiene sensores instalados; el informe propone el monitoreo remoto ($700 000, Etapa 8).', 'Instalar sensores y reemplazar el simulador por la carga de archivos.'],
    ['RCM y curva P-F', 'Construidos en este proyecto', 'Se construyen con supuestos basados en referencias de los equipos e investigación: las tareas salen de las «acciones de control» del AMFEC y del plan de la Etapa 6; cada tasa de degradación cita su fuente.', 'Con el historial de fallas y las tendencias reales del equipo.'],
    ['Corriente nominal RLA', '9,5 A (unidad ≈ 2 HP, 220 V trifásica)', 'El fabricante no publica la placa de la unidad del cuarto 3 × 3.', 'Leer la placa del compresor.'],
    ['Línea base por variable', '80 °C · 7,6 A · 58 % · 4 °C · 10 K · 1,0 mm/s', 'Valores típicos de media temperatura con R-404A en Bogotá.', 'Medir dos semanas tras un mantenimiento completo.'],
    ['Tasas de degradación', 'Ver «Variables y P-F»', 'Sin historial propio; tomadas o acotadas con la referencia citada bajo cada curva P-F. Donde la literatura describe el mecanismo pero no una tasa, el valor es un supuesto declarado.', 'Ajustar con las tendencias reales de cada falla.'],
    ['Diferencial del controlador', '1 K', 'Ajuste usual de fábrica en controladores Full Gauge/Carel.', 'Revisar el parámetro del controlador instalado.'],
    ['Umbrales del fabricante', 'Genéricos de compresores herméticos', 'No se conoce la marca ni el modelo del compresor.', 'Reemplazar con el manual del compresor instalado.'],
    ['Costos y tiempos de las tareas', 'Ver «Alertas y acciones»', 'El informe no tiene cotizaciones de servicio.', 'Cotizar con el técnico RAC.'],
    ['Costo de falla del compresor', '$6 500 000 y 72 h de parada', 'Etapa 9 del informe (repuesto, refrigerante, mano de obra y producto en riesgo).', 'Cotización real del proveedor.'],
    ['MTBF y MTTR objetivo', '≥ 2 190 h · ≤ 12 h', 'El informe solo pide tendencia; se fijan para que sean coherentes con disponibilidad ≥ 99 %.', 'Revisar al cerrar el primer año.'],
    ['Historial de mantenimiento', 'Simulado (dic-2025 a nov-2026)', 'No hay registros de fallas del equipo.', 'Cargar la bitácora real en «Datos y supuestos».'],
    ['Refrigerante', 'R-404A', 'El informe menciona R-404A/R-134a; R-404A es el usual en media temperatura.', 'Confirmar en la placa de la unidad.'],
  ],

  limitaciones: [
    'La tendencia extrapola el mecanismo actual: no anticipa fallas súbitas (no arranque M1, bloqueo M10), cuyo P-F es de horas o nulo.',
    'Los promedios diarios ocultan picos (deshielos, aperturas de puerta); la temperatura de cámara necesita alarma en tiempo real.',
    'Humedad/ácidos (M8) no tiene variable continua: se cubre con la tarea programada de prueba de acidez.',
    'El índice de salud resume severidad; no es una probabilidad de falla.',
    'Los pesos usan la criticidad estática del AMFEC; si el AMFEC cambia, hay que actualizarlos.',
    'Solo se monitorea el compresor; evaporador, deshielo y puerta entran solo a través de la temperatura de cámara y el sobrecalentamiento.',
    'Los datos registrados se guardan en el navegador de este equipo; para moverlos se exporta el respaldo.',
  ],

  fuentes: [
    ['Grupo 5', 'AMFEC del compresor del cuarto frío (modos, S/O/D, NPR y criticidad C).'],
    ['Grupo 5', 'Ciclo de vida del cuarto frío: setpoint, plan de mantenimiento (Etapa 6), OPEX (Etapa 7), reparación del compresor (Etapa 9).'],
    ['MinSalud', 'Resolución 2674 de 2013, art. 18 num. 3.1: refrigeración no mayor de 4 °C ± 2 °C.'],
    ['NFPA 70 (NEC)', 'Art. 440.52(A)(1): relé de sobrecarga del motocompresor ≤ 140 % de la corriente nominal.'],
    ['ISO 10816-1:1995', 'Severidad de vibración, clase I (máquinas ≤ 15 kW): 0,71 / 1,8 / 4,5 mm/s (sustituida por ISO 20816-1).'],
    ['Danfoss', 'Guías de aplicación de compresores (p. ej. PSH019): sobrecalentamiento de succión mínimo 5 K.'],
    ['Heatcraft', 'H-ENGM0408, guía de cálculo de carga: equipos dimensionados para 16–18 h de marcha por día.'],
    ['ACHR News', 'Temperaturas de descarga del compresor: 225 °F (107 °C) en la línea; la válvula ≈ 75 °F más caliente; aceite mineral ≈ 350 °F.'],
    ['Moubray, RCM II', 'Curva P-F: el intervalo de inspección no debe superar la mitad del intervalo P-F.'],
    ['MinAmbiente (2025)', 'Guía para el control de fugas de refrigerante.'],
    ['EPA GreenChill', 'Tasa de fuga promedio de la industria de refrigeración comercial ≈ 25 % de la carga por año.'],
    ['Iowa DIAL · FIU Hospitality Review', 'Un refrigerador cerrado sin energía mantiene el alimento frío hasta ≈ 4 h (guía) y ≈ 6 h sin abrir (estudio).'],
    ['ISA InTech (2019) · Pumps & Systems · Fluke', 'Curva P-F: orden de detección por técnica; P-F de semanas a meses en máquinas con rodamientos; desgaste de rodamientos seguido 12–18 meses.'],
    ['ACHR News · Danfoss', 'Condensador sucio → mayor condensación, descarga y amperaje; escarcha en el evaporador → bajo sobrecalentamiento y retorno de líquido.'],
    ['U. Leeds (tesis)', 'Degradación del aislamiento de motores con tendencia progresiva hasta un umbral de falla.'],
  ],
};

export const VARIABLES = Object.fromEntries(CONFIG.variables.map((v) => [v.id, v]));
