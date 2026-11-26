# Informe breve: supuestos, fuentes y limitaciones

**Cold Life Cycle** — tablero de condición del compresor del cuarto frío
Taller en Énfasis II · Gestión de Mantenimiento · 2026-II · Grupo 5 (conservación de alimentos)

## 1. Activo y componente

| | |
|---|---|
| Activo | Cuarto frío 3 × 3 × 2,5 m FrigoMaster, enfriamiento/preservación (0–10 °C) — alternativa elegida en el informe de ciclo de vida |
| Caso | Restaurante de gran capacidad, referencia Andrés D.C. (Bogotá) |
| Función | Mantener 4 °C ± 2 °C (Res. 2674 de 2013, art. 18 num. 3.1), 8 760 h/año |
| Componente monitoreado | Compresor hermético de la unidad condensadora, el componente crítico del AMFEC del grupo |

## 2. Variables de condición y vínculo con el AMFEC

Cada modo del AMFEC se asigna a **una** variable, la que lo detecta antes, para no contarlo dos veces. El peso de cada variable es la suma de la criticidad C (= S × O) de sus modos dividida por 289 (suma de los modos cubiertos).

| Variable | Unidad | Método | Origen | Modos (C) | Peso |
|---|---|---|---|---|---|
| Temperatura de descarga | °C | Termocupla K en la línea de descarga, datalogger | Medido | M4 Sobrecalentamiento (45) | 15,6 % |
| Corriente del compresor | A | Transformador de corriente; pinza de verificación | Medido | M2 Bobinado (30), M10 Bloqueo (20) | 17,3 % |
| Ciclo útil | % | Tiempo en marcha / 24 h desde la señal de corriente | Inferido | M3 Pérdida de capacidad (32), M7 Fuga (32) | 22,1 % |
| Temperatura de cámara | °C | Sonda NTC del controlador a 1,5 m | Medido | M1 No arranque (36) | 12,5 % |
| Sobrecalentamiento de succión | K | T succión − T saturación (manómetro, tabla R-404A) | Inferido | M5 Retorno de líquido (30) | 10,4 % |
| Vibración de la carcasa | mm/s RMS | Acelerómetro (app del celular o sensor) en la base | Medido | M6 Lubricación (36), M9 Vibración (28) | 22,1 % |

**Frente a las candidatas del enunciado** (grupo 5: temperatura de cámara, ciclo útil, corriente, temperatura del condensador, aperturas de puerta):

- T de cámara, ciclo útil y corriente se usan: anticipan M1, M3/M7 y M2/M10.
- La temperatura del condensador se cambia por la de descarga. Las dos suben con el condensador sucio (M4, C 45, el modo más crítico), pero la descarga es la que limita el fabricante (107 °C en la línea) y la que degrada el aceite y el aislamiento, que es el efecto de M4; la del condensador sigue mucho al ambiente.
- Las aperturas de puerta no se usan: son una causa de carga térmica y no anticipan un modo del compresor (pesarían 0 en el índice). Su efecto ya aparece en la temperatura de cámara, el ciclo útil y la escarcha.
- Se añaden vibración y sobrecalentamiento: cubren M6/M9 (NPR 216, el mayor del AMFEC) y M5 (NPR 210, el segundo), que ninguna candidata anticipa.

**M8 Humedad/ácidos (C 27)** no tiene variable continua: se cubre con la tarea programada del RCM (prueba de acidez anual y tras toda falla eléctrica del motor).

## 3. Umbrales (P, paro, F) y fuentes

La alerta se ubica en **P** (falla detectable) y la alarma (**paro obligatorio**) antes de **F** (falla funcional).

| Variable | Alerta · P | Alarma · paro | F | Fuentes |
|---|---|---|---|---|
| T descarga | ≥ 95 °C | ≥ 107 °C | ≥ 135 °C | P: línea base + 15 K (RCM G5). Paro: 225 °F en la línea (ACHR News, práctica de fabricantes). F: válvula ≈ 42 K más caliente ⇒ ≈ 177 °C (350 °F), descomposición del aceite mineral |
| Corriente | ≥ 9,5 A | ≥ 11,4 A | ≥ 13,3 A | P: 100 % RLA (supuesta 9,5 A). Paro: 120 % RLA (RCM G5). F: disparo del relé ≤ 140 % RLA (NEC 440.52(A)(1)) |
| Ciclo útil | ≥ 75 % | ≥ 90 % | 100 % | P: diseño 16–18 h/día (Heatcraft H-ENGM0408). Paro: < 2,4 h/día de paro impide el deshielo (RCM G5). F: marcha continua sin setpoint (FF2) |
| T cámara | ≥ 5,0 °C | ≥ 5,5 °C | ≥ 6,0 °C | P: setpoint + diferencial 1 K. Paro: 0,5 K de margen (RCM G5). F: Res. 2674/2013 |
| Sobrecalentamiento | ≤ 7 K | ≤ 5 K | ≤ 1 K | P: bajo la banda de ajuste 8–12 K (RCM G5). Paro: mínimo 5 K (Danfoss). F: vapor saturado, golpe hidráulico |
| Vibración | ≥ 1,8 mm/s | ≥ 2,8 mm/s | ≥ 4,5 mm/s | P y F: ISO 10816-1 clase I (hoy ISO 20816-1), límites B/C y C/D. Paro: zona C media (RCM G5) |

## 4. Curva P-F e intervalo P-F

El RCM y la curva P-F se construyen en este proyecto con supuestos basados en referencias de los equipos e investigación. El intervalo se calcula con la forma y la tasa de degradación de cada mecanismo: lineal (F − P)/tasa; exponencial ln((F − base)/(P − base))/k.

| Variable | Mecanismo | Forma y tasa | P-F | P → paro | Medir cada ≤ P-F/2 |
|---|---|---|---|---|---|
| T descarga | Condensador sucio | exponencial, k 0,0433/d | 30 d | 13,6 d | 15 d: propuesta diaria ✓ · plan mensual ✗ |
| Corriente | Aislamiento / fricción | exponencial, k 0,0244/d | 45 d | 28 d | 22 d: propuesta continua ✓ · plan trimestral ✗ |
| Ciclo útil | Fuga lenta | lineal, 0,5 %/d | 50 d | 30 d | 25 d: propuesta diaria ✓ · plan semestral ✗ |
| T cámara | Compresor detenido | lineal, 0,5 K/h | 2 h | 1 h | 1 h: propuesta 15 min con alarma ✓ · plan diario ✗ |
| Sobrecalentamiento | Escarcha / expansión | lineal, 0,3 K/d | 20 d | 6,7 d | 10 d: propuesta semanal ✓ · plan semestral ✗ |
| Vibración | Desgaste por lubricación | exponencial, k 0,0246/d | 60 d | 33 d | 30 d: propuesta semanal ✓ · plan mensual ✓ |

Referencias de cada tasa:

- **T descarga:** un condensador sucio eleva la condensación, la temperatura de descarga y el amperaje (ACHR News). No hay una tasa publicada en el tiempo (los estudios de laboratorio dan efectos variables), así que el P-F de 30 d es un supuesto conservador por la grasa del ambiente de cocina.
- **Corriente:** el aislamiento se degrada con tendencia progresiva hasta un umbral (tesis U. Leeds), aunque algunas fallas de estator escalan en horas. Los 45 d son un supuesto, menor que el de vibración porque las pruebas eléctricas detectan más tarde en la curva P-F (ISA InTech, 2019).
- **Ciclo útil:** la fuga promedio de la industria es ≈ 25 %/año de la carga (EPA GreenChill). Se supone una fuga localizada más rápida: ≈ 25 % de la carga en 3 meses.
- **T cámara:** un refrigerador cerrado y sin frío mantiene ≤ 5 °C hasta ≈ 4 h (Iowa DIAL) y ≈ 6 h sin abrir (estudio FIU). Con 0,5 K/h se pasa de 4 °C a 6 °C en 4 h.
- **Sobrecalentamiento:** la escarcha aísla el serpentín, baja el sobrecalentamiento y lleva al retorno de líquido (ACHR News; Danfoss). Sin tasa publicada, los 20 d son un supuesto para la acumulación gradual; un deshielo que falla por completo es más rápido.
- **Vibración:** en máquinas con rodamientos el P-F es de semanas a meses (Pumps & Systems / Schaeffler) y el desgaste se sigue 12–18 meses (Fluke), así que 60 d es conservador.

Conclusión: con las frecuencias del plan de la Etapa 6 del informe, cinco de las seis variables se medirían con un intervalo mayor que P-F/2. Eso justifica la mejora de **monitoreo remoto ($700 000)** que el propio informe propone.

## 5. Índice de salud, tendencia y órdenes

- **Subíndice** por variable: 100 en la línea base, 60 en P, 20 en el paro, 0 en F (lineal por tramos). **Índice** = promedio ponderado. **Regla de veto:** una variable en alerta limita el índice a 60 y una en alarma a 20, así el semáforo (verde > 60, amarillo 20–60, rojo ≤ 20) siempre coincide con los umbrales.
- **Tendencia:** lineal o exponencial de la desviación respecto de la base (mínimos cuadrados en escala original). Se parte de la forma física esperada y se cambia si el otro modelo mejora R² en 0,02 o más. La ventana arranca donde la variable dejó la zona de la base. Tiempo hasta el umbral con banda ±2σ. En los cinco escenarios simulados, el error mediano del tiempo estimado hasta la alarma, medido desde que se cruza P, es del 12 %.
- **¿Alcanza para planear?** Se compara el tiempo hasta el paro con la preparación de la tarea RCM (técnico y repuesto): alcanza (≥ 1,5 ×), justo (≥ 1 ×) o no alcanza.
- **Orden sugerida:** modo del AMFEC (el de mayor C si la variable anticipa dos; el otro como diagnóstico diferencial), tarea RCM, recurso, horas-hombre, repuestos, prioridad por criticidad (alarma: P1 ≤ 4–8 h si C ≥ 30; alerta: P2 ≤ 3 d si C ≥ 40, P3 ≤ 7 d si C ≥ 30, P4 ≤ 14 d) y plazo, que se acorta si la tendencia dice que el paro llega antes. Costo de intervenir frente al costo de llegar a F ($6,5 M y 72 h para el compresor, Etapa 9 del informe).

## 6. Supuestos

| Parámetro | Valor | Justificación | Cómo validarlo |
|---|---|---|---|
| Datos de condición | Simulados con ruido y falla progresiva | El cuarto no tiene sensores | Instalar el monitoreo y cargar archivos |
| RCM y P-F | Construidos en este proyecto | Supuestos basados en referencias de equipos e investigación (sección 4); tareas desde el AMFEC y la Etapa 6 | Historial de fallas y tendencias reales |
| RLA | 9,5 A (≈ 2 HP, 220 V 3F) | Sin placa publicada | Placa del compresor |
| Línea base | 80 °C · 7,6 A · 58 % · 4 °C · 10 K · 1,0 mm/s | Valores típicos de media temperatura con R-404A | Dos semanas de medición tras mantenimiento |
| Tasas de degradación | Tabla de la sección 4 | Sin historial propio; acotadas con las referencias de la sección 4 | Tendencias reales de cada falla |
| Diferencial del controlador | 1 K | Ajuste de fábrica usual | Parámetro del controlador |
| Umbrales del fabricante | Genéricos | Marca y modelo desconocidos | Manual del compresor |
| Costos y preparación de tareas | Ver «Alertas y acciones» | Sin cotizaciones | Cotizar con técnico RAC |
| MTBF / MTTR objetivo | ≥ 2 190 h · ≤ 12 h | Coherentes con disponibilidad ≥ 99 % | Revisar al cerrar el año |
| Bitácora de mantenimiento | Simulada dic-2025 a nov-2026 | Sin registros | Cargar la bitácora real |
| Refrigerante | R-404A | Usual en media temperatura | Placa de la unidad |

## 7. Limitaciones

- La tendencia extrapola el mecanismo actual: no anticipa fallas súbitas (M1, M10), cuyo P-F es de horas o nulo.
- Los promedios diarios ocultan picos (deshielos, aperturas de puerta); la temperatura de cámara necesita alarma en tiempo real.
- M8 sin variable continua; el índice resume severidad, no probabilidad de falla; los pesos usan la criticidad estática del AMFEC.
- Con lecturas semanales (sobrecalentamiento, vibración) hay pocos puntos y el error del tiempo estimado es mayor. En el escenario de retorno de líquido, con P-F de 20 d, la plataforma llega a decir «no alcanza».
- Solo se monitorea el compresor; los datos registrados quedan en el navegador del equipo.

## 8. Fuentes

1. Grupo 5. *AMFEC del compresor del cuarto frío* y *Ciclo de vida de un activo: cuarto frío* (2026).
2. Ministerio de Salud y Protección Social. Resolución 2674 de 2013, art. 18 num. 3.1.
3. NFPA 70, *National Electrical Code*, art. 440.52(A)(1).
4. ISO 10816-1:1995, *Mechanical vibration — Evaluation of machine vibration* (clase I), sustituida por ISO 20816-1.
5. Danfoss. Guías de aplicación de compresores (p. ej. PSH019): sobrecalentamiento mínimo 5 K.
6. Heatcraft. *Commercial Refrigeration Cooling and Freezing Load Calculations*, H-ENGM0408.
7. ACHR News. Artículos sobre temperaturas de descarga del compresor (225 °F en la línea, aceite ≈ 350 °F).
8. Moubray, J. *Reliability-Centred Maintenance II*: curva P-F e intervalo de inspección ≤ P-F/2.
9. MinAmbiente (2025). *Guía para el control de fugas de refrigerante*.
10. EPA GreenChill: tasa de fuga promedio de la industria ≈ 25 %/año.
11. Iowa DIAL, guía para cortes de energía en establecimientos de alimentos; FIU Hospitality Review, estudio de conservación en refrigeradores sin energía.
12. ISA InTech (2019), *Improving maintenance by adopting a P-F curve method*; Pumps & Systems (Schaeffler), P-F en máquinas con rodamientos; Fluke, monitoreo de vibración.
13. ACHR News: condensadores sucios y evaporadores escarchados; Danfoss: diagnóstico de fallas en cuartos fríos.
14. Universidad de Leeds (tesis): degradación del aislamiento de motores alimentados por variador.
15. Poly Haven: modelos 3D CC0 (ver `assets/modelos/LICENCIAS.md`).

## 9. Demostración para la sustentación (normal → paro)

1. **Estado** con el escenario «M4 · Condensador sucio» (C 45, el modo más crítico). Pulse **⏮** y luego **▶**: el semáforo pasa de verde a amarillo cuando la temperatura de descarga cruza P (95 °C) y a rojo en el paro (107 °C). Use **Ir a: Normal / Alerta / Alarma** para mostrar los tres estados.
2. En amarillo, abra **Tendencias**: ajuste exponencial, tiempo hasta el paro con su rango, P-F de 30 d y veredicto «sí alcanza» frente a 1 d de preparación.
3. **Alertas y acciones:** orden P2 (C 45) con tarea RCM, recurso, plazo y costo. Avance al rojo: P1, paro obligatorio en 4 h.
4. **Variables y P-F:** justifique pesos, umbrales y la regla «medir cada ≤ P-F/2» (el plan actual no la cumple).
5. **Datos y supuestos:** descargue el ejemplo con **Ejemplo CSV** y cárguelo con **Cargar CSV o Excel** para mostrar que la misma plataforma procesa datos externos, y agregue una medición manual.
6. Cambie a «M5 · Escarcha / expansión»: con lecturas semanales y P-F de 20 d el veredicto pasa a «no alcanza». Es el caso que muestra el límite del método.
