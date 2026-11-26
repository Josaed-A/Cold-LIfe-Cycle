# Modelos 3D

Descargados de [Poly Haven](https://polyhaven.com) (licencia **CC0 1.0**, dominio público: uso libre, sin atribución obligatoria) el 25-nov-2026, en resolución 1k. Se convirtieron a GLB con `@gltf-transform/cli` (texturas reducidas a 512/256 px en JPEG y sin la variante oxidada) para que la versión entregable pese poco.

| Archivo | Modelo original | Uso en la escena |
|---|---|---|
| `exterior_aircon_unit.glb` | [Exterior Aircon Unit](https://polyhaven.com/a/exterior_aircon_unit) | Unidad condensadora |
| `power_box_01.glb` | [Power Box 01](https://polyhaven.com/a/power_box_01) | Tablero eléctrico / controlador (sensor de ciclo útil) |
| `steel_frame_shelves_01.glb` | [Steel Frame Shelves 01](https://polyhaven.com/a/steel_frame_shelves_01) | Estanterías del cuarto |
| `plastic_crate_01.glb` | [Plastic Crate 01](https://polyhaven.com/a/plastic_crate_01) | Canastas de alimentos |
| `mounted_fluorescent_lights.glb` | [Mounted Fluorescent Lights](https://polyhaven.com/a/mounted_fluorescent_lights) | Luminaria interior |

**Compresor hermético:** no se encontró un modelo con licencia libre y descarga directa (GrabCAD, Sketchfab y CGTrader exigen cuenta; Thingiverse bloquea la descarga automática). Se modela paramétricamente en `src/ui/cuarto3d.js` (carcasa, placa con gomas, caja de bornes y, en la vista de corte, bobinado, rotor, bloque de compresión y aceite). El cuarto, la puerta, la cortina de lamas, el evaporador y las tuberías también son paramétricos.
