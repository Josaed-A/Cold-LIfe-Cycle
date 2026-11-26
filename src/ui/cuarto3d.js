// Escena 3D del cuarto frío. Modelos CC0 de Poly Haven (assets/modelos, ver LICENCIAS.md) para la
// unidad condensadora, estanterías, canastas, tablero eléctrico y luminaria; el compresor hermético es
// paramétrico (no hay un modelo libre con descarga directa) y tiene vista en corte con sus partes
// ligadas a los modos del AMFEC. Las piezas donde se lee cada variable son clicables y se tiñen con su estado;
// la escena además reacciona a los datos: vibración del compresor, calor en la descarga, escarcha y aire de la cámara.
import { COLOR, NOMBRE_ESTADO, fVal, recurso } from './formato.js';

const M = (ruta) => `assets/modelos/${ruta}.glb`;

async function cargarGLB(loader, ruta) {
  const src = recurso(ruta);
  if (src.startsWith('data:')) { // versión entregable: el modelo viene embebido, sin fetch
    const bin = Uint8Array.from(atob(src.slice(src.indexOf(',') + 1)), (c) => c.charCodeAt(0));
    return loader.parseAsync(bin.buffer, '');
  }
  return loader.loadAsync(src);
}

/** Escala uniforme para que la dimensión `dim` (x|y|z) mida `med` y apoya el objeto en `pos` (base en y). */
function encajar(THREE, obj, dim, med, pos, rotY = 0) {
  obj.rotation.y = rotY; obj.updateMatrixWorld(true);
  let b = new THREE.Box3().setFromObject(obj); const s = b.getSize(new THREE.Vector3());
  obj.scale.multiplyScalar(med / s[dim]); obj.updateMatrixWorld(true);
  b = new THREE.Box3().setFromObject(obj); const c = b.getCenter(new THREE.Vector3());
  obj.position.add(new THREE.Vector3(pos[0] - c.x, pos[1] - b.min.y, pos[2] - c.z));
  return obj;
}

/** Etiqueta con un punto del color de estado; `sp.userData.pintar(color)` la repinta cuando el estado cambia. */
function etiqueta(THREE, txt, color = '#e6ebf3') {
  const F = '600 34px system-ui, sans-serif';
  const c = document.createElement('canvas'); const g = c.getContext('2d'); g.font = F;
  const w = Math.ceil(g.measureText(txt).width) + 50; c.width = w; c.height = 50;
  const tex = new THREE.CanvasTexture(c);
  const pintar = (punto) => {
    g.clearRect(0, 0, w, 50); g.font = F; g.fillStyle = 'rgba(10,16,27,.82)'; g.beginPath(); g.roundRect(0, 0, w, 50, 10); g.fill();
    g.fillStyle = punto; g.beginPath(); g.arc(21, 25, 8, 0, Math.PI * 2); g.fill();
    g.fillStyle = color; g.textBaseline = 'middle'; g.fillText(txt, 38, 26); tex.needsUpdate = true;
  };
  pintar(COLOR.NI);
  // sizeAttenuation false: la etiqueta mide lo mismo en pantalla a cualquier distancia.
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, sizeAttenuation: false }));
  sp.scale.set(w / 50 * 0.032, 0.032, 1); sp.renderOrder = 10; sp.userData.pintar = pintar; return sp;
}

/**
 * @param {HTMLElement} cont
 * @param {{onClick?:(varId:string)=>void, variables:object[]}} op
 */
export async function crearCuarto3D(cont, op) {
  const THREE = await import('three');
  const { OrbitControls } = await import('../../vendor/OrbitControls.js');
  const { GLTFLoader } = await import('../../vendor/GLTFLoader.js');
  const w = () => cont.clientWidth || 600; const h = () => cont.clientHeight || 400;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(w(), h());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  cont.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(40, w() / h(), 0.05, 100);
  const ctrl = new OrbitControls(cam, renderer.domElement);
  ctrl.enableDamping = true; ctrl.maxPolarAngle = Math.PI * 0.495; ctrl.minDistance = 0.6; ctrl.maxDistance = 16;
  scene.add(new THREE.HemisphereLight(0xdfeeff, 0x1c2433, 1.25));
  const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(6, 9, 7); scene.add(sol);
  const rel = new THREE.DirectionalLight(0x9fc3ff, 0.5); rel.position.set(-7, 4, -5); scene.add(rel);
  const luzInt = new THREE.PointLight(0xdff2ff, 1.4, 5, 1.5); luzInt.position.set(0, 2.3, 0); scene.add(luzInt);
  const ro = new ResizeObserver(() => { renderer.setSize(w(), h()); cam.aspect = w() / h(); cam.updateProjectionMatrix(); });
  ro.observe(cont);

  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15, ...o });
  const caja = (sx, sy, sz, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); scene.add(b); return b; };

  // Piso y losa exterior.
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), mat(0x1a2230, { roughness: 0.95 })); piso.rotation.x = -Math.PI / 2; scene.add(piso);
  const grid = new THREE.GridHelper(14, 28, 0x2a3850, 0x1f2a3d); grid.position.y = 0.002; scene.add(grid);

  // ---- Cuarto frío 3 × 3 × 2,5 m (paneles de poliuretano). La puerta está en la cara +z.
  const panel = mat(0xe8edf2, { roughness: 0.5 }); const panelT = mat(0xe8edf2, { transparent: true, opacity: 0.14, depthWrite: false });
  const paredes = { fijas: [], ver: [] };
  const pared = (sx, sy, sz, x, y, z, vidrio = false) => { const p = caja(sx, sy, sz, vidrio ? panelT : panel, x, y, z); (vidrio ? paredes.ver : paredes.fijas).push(p); const e = new THREE.LineSegments(new THREE.EdgesGeometry(p.geometry), new THREE.LineBasicMaterial({ color: 0x8a96a8, transparent: true, opacity: 0.5 })); p.add(e); return p; };
  pared(3.2, 2.6, 0.1, 0, 1.3, -1.55);              // fondo
  pared(0.1, 2.6, 3.2, -1.55, 1.3, 0);              // izquierda
  pared(0.1, 2.6, 3.2, 1.55, 1.3, 0, true);         // derecha (lado de la unidad): translúcida
  pared(1.35, 2.6, 0.1, -0.925, 1.3, 1.55, true);   // frente, a la izquierda de la puerta
  pared(0.95, 2.6, 0.1, 1.125, 1.3, 1.55, true);    // frente, a la derecha
  pared(0.9, 0.6, 0.1, 0.2, 2.3, 1.55, true);       // dintel
  pared(3.2, 0.1, 3.2, 0, 2.65, 0, true);           // techo
  caja(3.0, 0.04, 3.0, mat(0xb9c3cf), 0, 0.02, 0);  // piso sanitario
  const puerta = caja(0.88, 1.98, 0.07, mat(0xc9d2db, { metalness: 0.55, roughness: 0.35, transparent: true, opacity: 0.55 }), 0.2, 1.0, 1.6);
  caja(0.05, 0.3, 0.05, mat(0x2a2f37, { metalness: 0.6 }), 0.55, 1.05, 1.66);
  for (let i = 0; i < 6; i++) caja(0.14, 1.9, 0.004, mat(0xbfe6ff, { transparent: true, opacity: 0.22, depthWrite: false }), -0.17 + i * 0.148, 1.02, 1.44); // cortina de lamas (mejora del informe)
  // Aire de la cámara: se calienta de azul a rojo con la temperatura de cámara.
  const aire = caja(2.9, 2.5, 2.9, new THREE.MeshBasicMaterial({ color: 0x4aa3df, transparent: true, opacity: 0.05, depthWrite: false }), 0, 1.3, 0);

  // ---- Evaporador en el muro del fondo, con ventiladores y escarcha.
  const evap = new THREE.Group(); scene.add(evap); evap.position.set(0, 2.22, -1.26);
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.42, 0.46), mat(0xd7dde4, { metalness: 0.3 })); evap.add(cuerpo);
  const rejilla = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.34, 0.01), mat(0x3a4352)); rejilla.position.z = 0.235; evap.add(rejilla);
  const aspas = [];
  for (const x of [-0.27, 0.27]) {
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.012, 8, 32), mat(0x9aa6b5, { metalness: 0.5 })); aro.position.set(x, 0, 0.245); evap.add(aro);
    const a = new THREE.Group(); a.position.set(x, 0, 0.25); evap.add(a); aspas.push(a);
    for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.008), mat(0x5d6878)); b.rotation.z = k * Math.PI / 2; a.add(b); }
  }
  const escarcha = new THREE.Mesh(new THREE.BoxGeometry(1.19, 0.46, 0.5), new THREE.MeshStandardMaterial({ color: 0xf4fbff, roughness: 1, transparent: true, opacity: 0, depthWrite: false })); evap.add(escarcha);

  // ---- Base de la unidad condensadora (exterior, lado derecho).
  const acero = mat(0x55606e, { metalness: 0.6, roughness: 0.4 });
  caja(0.95, 0.06, 2.0, acero, 2.75, 0.32, -0.1);
  for (const [x, z] of [[2.32, -1.05], [3.18, -1.05], [2.32, 0.85], [3.18, 0.85]]) caja(0.05, 0.32, 0.05, acero, x, 0.16, z);

  // ---- Compresor hermético paramétrico (con interior visible en la vista de corte).
  const comp = new THREE.Group(); scene.add(comp); comp.position.set(2.62, 0.35, 0.5);
  const carcasaMat = mat(0x262b33, { metalness: 0.45, roughness: 0.45 });
  const perfil = [[0, 0.012], [0.11, 0.012], [0.148, 0.04], [0.16, 0.09], [0.16, 0.27], [0.15, 0.32], [0.12, 0.36], [0.07, 0.383], [0, 0.39]].map(([r, y]) => new THREE.Vector2(r, y));
  const carcasa = new THREE.Mesh(new THREE.LatheGeometry(perfil, 48), carcasaMat); comp.add(carcasa);
  const costura = new THREE.Mesh(new THREE.TorusGeometry(0.161, 0.005, 8, 48), mat(0x3b424d, { metalness: 0.6 })); costura.rotation.x = Math.PI / 2; costura.position.y = 0.2; comp.add(costura);
  const placa = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.012, 0.32), acero); placa.position.y = 0.006; comp.add(placa);
  for (const [x, z] of [[-0.17, -0.12], [0.17, -0.12], [-0.17, 0.12], [0.17, 0.12]]) { const g = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 16), mat(0x111111, { roughness: 0.9 })); g.position.set(x, -0.01, z); comp.add(g); }
  const bornes = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.085), mat(0x1b1f25)); bornes.position.set(0.17, 0.19, 0); comp.add(bornes);
  const cobre = mat(0xb87333, { metalness: 0.8, roughness: 0.3 });
  const tubo = (pts, r, m) => { const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))); const t = new THREE.Mesh(new THREE.TubeGeometry(c, 64, r, 10, false), m); scene.add(t); return { t, c }; };
  // Partes internas (solo en la vista de corte): bobinado, rotor, bloque de compresión y aceite.
  const interior = new THREE.Group(); interior.visible = false; comp.add(interior);
  const parte = (geo, color, y, txt, modo, lado) => { const m = new THREE.Mesh(geo, mat(color, { metalness: 0.4, emissive: 0x000000 })); m.position.y = y; interior.add(m); const e = etiqueta(THREE, txt); e.position.set(lado * 0.22, y, lado * 0.22); e.visible = false; comp.add(e); return { m, e, modo, nombre: txt }; };
  const partes = {
    bobinado: parte(new THREE.CylinderGeometry(0.12, 0.12, 0.11, 32, 1, true), 0xb87333, 0.15, 'Bobinado · M2', 'corriente', -1),
    rotor: parte(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 24), 0x8f99a6, 0.11, 'Rotor / cojinetes · M6, M10', 'vib', 1),
    bloque: parte(new THREE.BoxGeometry(0.2, 0.07, 0.13), 0x9aa3ad, 0.29, 'Válvulas y compresión · M3, M4', 'tdesc', -1),
    aceite: parte(new THREE.CylinderGeometry(0.145, 0.145, 0.035, 32), 0xd9a520, 0.035, 'Aceite del cárter · M6', 'vib', 1),
  };
  partes.aceite.m.material.transparent = true; partes.aceite.m.material.opacity = 0.85;
  const eje = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 12), mat(0xcfd6de, { metalness: 0.8 })); eje.position.y = 0.17; interior.add(eje);

  // ---- Tuberías: descarga (cobre), líquido (cobre fino) y succión (aislada, negra).
  const descarga = tubo([[2.62, 0.72, 0.5], [2.62, 0.86, 0.5], [2.62, 0.9, 0.25], [2.62, 0.9, -0.05], [2.78, 0.78, -0.2]], 0.009, cobre);
  const descargaMat = descarga.t.material = cobre.clone();
  tubo([[2.4, 0.5, -0.6], [2.2, 0.55, -0.85], [1.75, 2.35, -0.95], [1.4, 2.4, -1.05], [0.55, 2.4, -1.15], [0.45, 2.25, -1.05]], 0.0065, cobre);
  const succion = tubo([[-0.45, 2.25, -1.05], [-0.55, 2.47, -1.1], [1.3, 2.47, -0.7], [1.75, 2.3, -0.3], [2.15, 0.9, 0.55], [2.4, 0.62, 0.62], [2.5, 0.52, 0.6]], 0.02, mat(0x16191e, { roughness: 0.9 }));

  // ---- Modelos descargados (CC0). Si fallan, la escena sigue con lo paramétrico.
  const carga = document.createElement('div'); carga.className = 'carga'; carga.textContent = 'Cargando modelos 3D…'; cont.appendChild(carga);
  const loader = new GLTFLoader();
  const modelos = Promise.allSettled([
    cargarGLB(loader, M('exterior_aircon_unit')).then((g) => { const u = g.scene; encajar(THREE, u, 'z', 1.1, [2.72, 0.35, -0.45], -Math.PI / 2); scene.add(u); }),
    cargarGLB(loader, M('power_box_01')).then((g) => { const u = g.scene; encajar(THREE, u, 'y', 0.55, [1.15, 1.2, 1.66]); tablero(u); }),
    cargarGLB(loader, M('mounted_fluorescent_lights')).then((g) => { const u = g.scene; encajar(THREE, u, 'x', 0.9, [0, 2.53, 0.25]); u.traverse((o) => { if (o.material?.name?.includes('glass')) o.material.emissive = new THREE.Color(0xeaf6ff); }); scene.add(u); }),
    Promise.all([cargarGLB(loader, M('steel_frame_shelves_01')), cargarGLB(loader, M('plastic_crate_01'))]).then(([est, can]) => {
      for (const z of [-0.6, 0.55]) {
        const e = est.scene.clone(true); encajar(THREE, e, 'y', 1.95, [-1.22, 0.04, z], Math.PI / 2); scene.add(e);
        const b = new THREE.Box3().setFromObject(e);
        const H = b.max.y - b.min.y;
        for (const f of [0.035, 0.27, 0.505]) for (const dz of [-0.22, 0.22]) {
          const c = can.scene.clone(true); encajar(THREE, c, 'y', 0.24, [-1.22, b.min.y + f * H + 0.03, z + dz], Math.PI / 2); scene.add(c);
        }
      }
    }),
  ]).then((r) => { carga.remove(); r.filter((x) => x.status === 'rejected').forEach((x) => console.warn('Modelo 3D no cargado', x.reason)); });

  // ---- Piezas seleccionables. Cada variable se lee en una pieza del modelo: la pieza se tiñe con el color de
  // su estado (alerta, alarma o falla, con pulso) y su etiqueta lleva un punto de ese color (verde en normal).
  const anclas = { // dónde va la etiqueta de cada variable, sobre su pieza
    tcam: new THREE.Vector3(0.25, 1.5, -0.2),
    tdesc: descarga.c.getPointAt(0.12),
    sh: succion.c.getPointAt(0.97).add(new THREE.Vector3(0, 0.04, 0)),
    corriente: new THREE.Vector3(2.62 + 0.21, 0.35 + 0.19, 0.5),
    ciclo: new THREE.Vector3(1.15, 1.5, 1.78),
    vib: new THREE.Vector3(2.62, 0.35 + 0.16, 0.5 + 0.17),
  };
  // Las cuatro del compresor están juntas: cada etiqueta sale hacia un lado distinto de la vista general.
  const desvio = { tdesc: [0, 0.3, 0], sh: [-0.3, 0.12, 0.22], corriente: [0.3, 0.02, -0.22], vib: [-0.12, -0.22, 0.2] };
  const lect = Object.fromEntries(op.variables.map((v) => {
    const e = etiqueta(THREE, v.corto); e.position.copy(anclas[v.id] || new THREE.Vector3()).add(new THREE.Vector3(...(desvio[v.id] || [0, 0.09, 0]))); scene.add(e);
    return [v.id, { v, e, estado: 'NI', x: null }];
  }));
  const etiquetas = [...Object.values(lect).map((l) => [l.e, l.v.id]), ...Object.values(partes).filter((p) => lect[p.modo]).map((p) => [p.e, p.modo])];

  const capaMat = (opacidad, sobreTodo) => new THREE.MeshBasicMaterial({ color: 0x4aa3df, transparent: true, opacity: opacidad, depthTest: !sobreTodo, depthWrite: false });
  // Capa azul del resalte: la misma geometría, algo mayor, colgada del objeto (crece con él).
  const capaDe = (m, k = 1.06, opacidad = 0.32, padre = m, sobreTodo = true) => { const c = new THREE.Mesh(m.geometry, capaMat(opacidad, sobreTodo)); c.scale.setScalar(k); padre.add(c); return c; };
  // Tubos finos: un tubo grueso sobre la misma curva es el blanco del mouse (invisible) y, visible, la capa azul.
  const funda = (tb, r) => { const g = new THREE.TubeGeometry(tb.c, 64, r, 12, false); const hit = new THREE.Mesh(g); hit.visible = false; const capa = new THREE.Mesh(g, capaMat(0.4, true)); scene.add(hit, capa); return { hit, capa }; };
  const sel = [];
  /**
   * hit: malla que mira el rayo · capa: malla azul · obj: lo que crece · mats: materiales que se tiñen ·
   * encima: se dibuja sobre todo al resaltarla (solo piezas convexas de una malla) · en: vista donde se selecciona ·
   * fondo: pierde frente a cualquier otra pieza (el aire de la cámara envuelve al resto).
   */
  const pieza = (id, nombre, o) => {
    if (!lect[id]) return;
    const it = { id, nombre, crece: 1.1, en: 'ambas', mats: [], ...o };
    it.capa.visible = false; it.capa.renderOrder = 12; it.capa.raycast = () => {};
    it.mats.forEach((m) => { m.userData.e0 = m.emissive?.clone(); }); sel.push(it);
  };
  pieza('tdesc', 'Línea de descarga', { ...funda(descarga, 0.03), mats: [descargaMat] });
  pieza('sh', 'Línea de succión (aislada)', { ...funda(succion, 0.045), mats: [succion.t.material] });
  const bornesHit = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.15, 0.13)); bornesHit.visible = false; bornesHit.position.copy(bornes.position); comp.add(bornesHit);
  pieza('corriente', 'Caja de bornes del compresor', { hit: bornesHit, obj: bornes, capa: capaDe(bornes, 1.2), mats: [bornes.material], crece: 1.3, encima: true });
  pieza('vib', 'Carcasa del compresor', { hit: carcasa, obj: carcasa, capa: capaDe(carcasa, 1.04), mats: [carcasaMat], crece: 1.08, encima: true, en: 'instalacion' });
  pieza('tcam', 'Aire de la cámara', { hit: aire, capa: capaDe(aire, 1, 0.1, aire, false), fondo: true, en: 'instalacion',
    tinte: (it, col, k) => { aire.material.color.copy(col); aire.material.opacity = 0.05 + 0.2 * k; },
    reposo: () => { aire.material.color.setRGB(0.29, 0.64, 0.87); aire.material.opacity = 0.05; } });
  for (const p of Object.values(partes)) pieza(p.modo, p.nombre, { hit: p.m, obj: p.m, capa: capaDe(p.m), mats: [p.m.material], encima: true, en: 'corte' });
  // Tablero eléctrico (GLB, llega después): su controlador calcula el ciclo útil. Va en un pivote centrado para crecer sobre sí.
  function tablero(u) {
    const b = new THREE.Box3().setFromObject(u); const c = b.getCenter(new THREE.Vector3()); const s = b.getSize(new THREE.Vector3());
    const piv = new THREE.Group(); piv.position.copy(c); u.position.sub(c); piv.add(u); scene.add(piv);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(s.x, s.y, s.z)); hit.visible = false; piv.add(hit);
    const mats = []; u.traverse((o) => { if (o.material?.emissive && !mats.includes(o.material)) mats.push(o.material); });
    pieza('ciclo', 'Tablero eléctrico y controlador', { hit, obj: piv, capa: capaDe(hit, 1.04, 0.32, piv), mats });
  }
  const TINTE = { alerta: new THREE.Color(COLOR.alerta), alarma: new THREE.Color(COLOR.alarma), falla: new THREE.Color(COLOR.falla) };
  const tinteBase = (it, col, k) => it.mats.forEach((m) => m.emissive?.copy(col).multiplyScalar(k));
  const reposoBase = (it) => it.mats.forEach((m) => m.emissive?.copy(m.userData.e0));

  // ---- Resalte bajo el mouse: la pieza crece, la cubre la capa azul y la vista se acerca un poco al punto señalado.
  let sobre = null; const punto = new THREE.Vector3(); const foco = { s: null, f: 0, p: new THREE.Vector3() }; // f = fracción ya acercada hacia foco.p
  const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)');
  function resaltar(it, si) {
    if (!it) return; it.capa.visible = si;
    // Encima de todo, etiquetas incluidas (van en la lista transparente con renderOrder 10).
    if (it.encima) { it.mats.forEach((m) => { if (si) m.userData.t0 = m.transparent; m.transparent = si || m.userData.t0; m.depthTest = !si; }); it.obj.renderOrder = si ? 11 : 0; }
  }
  const poner = (it) => { if (it === sobre) return; resaltar(sobre, false); sobre = it; resaltar(it, true); };

  // ---- Vistas
  let modo = 'instalacion'; let interiorVisible = true; let enfoque = null;
  const VISTAS = { instalacion: { cam: [5.6, 3.9, 6.4], tgt: [0.75, 1.0, 0] }, compresor: { cam: [3.55, 0.95, 1.55], tgt: [2.62, 0.55, 0.5] } };
  function vista(m) {
    poner(null); // antes de tocar la carcasa: el resalte guarda y repone su transparencia
    modo = m; const c = VISTAS[m]; enfoque = { cam: new THREE.Vector3(...c.cam), tgt: new THREE.Vector3(...c.tgt), k: 0 };
    const corte = m === 'compresor';
    carcasaMat.transparent = corte; carcasaMat.opacity = corte ? 0.2 : 1; carcasaMat.depthWrite = !corte; carcasaMat.needsUpdate = true;
    interior.visible = corte; Object.values(partes).forEach((p) => { p.e.visible = corte; }); Object.values(lect).forEach((l) => { l.e.visible = !corte; });
    ctrl.minDistance = corte ? 0.35 : 0.6; foco.f = 0; // la transición fija la cámara: el acercamiento parte de cero
  }
  function verInterior(si) { interiorVisible = si; panelT.transparent = si; panelT.opacity = si ? 0.14 : 1; panelT.depthWrite = !si; panelT.needsUpdate = true; puerta.material.opacity = si ? 0.55 : 1; }
  cam.position.set(...VISTAS.instalacion.cam); ctrl.target.set(...VISTAS.instalacion.tgt); ctrl.update();

  // ---- Estado desde el análisis
  let vib = 1; let marcha = true;
  function actualizar(A) {
    for (const l of Object.values(lect)) { const a = A.vars[l.v.id]; l.estado = a.estado; l.x = a.x; }
    for (const [e, id] of etiquetas) if (e.userData.estado !== lect[id].estado) { e.userData.estado = lect[id].estado; e.userData.pintar(COLOR[lect[id].estado]); }
    const x = (id) => A.vars[id]?.x;
    vib = x('vib') ?? 1;
    // En normal la descarga brilla según su temperatura (reposo); en alerta o peor toma el color del estado.
    const td = x('tdesc'); const calor = td === null || td === undefined ? 0 : Math.max(0, Math.min(1, (td - 88) / 45));
    descargaMat.userData.e0 = new THREE.Color(0xff3300).multiplyScalar(calor * 0.9);
    const sh = x('sh'); escarcha.material.opacity = sh === null || sh === undefined ? 0 : Math.max(0, Math.min(0.85, (9 - sh) / 7));
    marcha = (x('corriente') ?? 1) > 0.5;
  }

  // ---- Interacción
  const ray = new THREE.Raycaster(); const ptr = new THREE.Vector2();
  const tip = document.createElement('div'); tip.className = 'tip'; cont.appendChild(tip);
  const pick = (ev) => {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, cam);
    // El rayo no mira la visibilidad: cada pieza se filtra por la vista en la que existe.
    const objs = sel.filter((o) => o.en === 'ambas' || o.en === (modo === 'compresor' ? 'corte' : 'instalacion'));
    const hits = ray.intersectObjects(objs.map((o) => o.hit), false); const de = (h) => objs.find((o) => o.hit === h.object);
    const h = hits.find((x) => !de(x).fondo) ?? hits[0];
    return h ? { s: de(h), punto: h.point, x: ev.clientX - r.left, y: ev.clientY - r.top } : null;
  };
  const onMove = (ev) => {
    if (ev.buttons) { poner(null); tip.style.display = 'none'; return; } // arrastrando la cámara: sin resalte
    const p = pick(ev); renderer.domElement.style.cursor = p ? 'pointer' : 'grab';
    if (p && p.s !== sobre) punto.copy(p.punto);
    poner(p ? p.s : null);
    if (!p) { tip.style.display = 'none'; return; }
    const l = lect[p.s.id];
    tip.innerHTML = `<b>${p.s.nombre}</b><br>${l.v.corto}: ${fVal(l.v, l.x)} · <span style="color:${COLOR[l.estado]}">${NOMBRE_ESTADO[l.estado]}</span><br><small>Clic: ver tendencia</small>`;
    tip.style.display = 'block'; tip.style.left = Math.min(p.x + 14, cont.clientWidth - 220) + 'px'; tip.style.top = (p.y + 12) + 'px';
  };
  let down = null;
  const onDown = (ev) => { down = [ev.clientX, ev.clientY]; };
  const onUp = (ev) => { if (!down || Math.hypot(ev.clientX - down[0], ev.clientY - down[1]) > 5) return; const p = pick(ev); if (p && op.onClick) op.onClick(p.s.id); };
  renderer.domElement.addEventListener('pointermove', onMove);
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);
  renderer.domElement.addEventListener('pointerleave', () => { tip.style.display = 'none'; poner(null); });

  let vivo = true; const t0 = performance.now(); const base = comp.position.clone(); let tAnt = 0;
  (function bucle() {
    if (!vivo) return;
    const t = (performance.now() - t0) / 1000;
    const suave = (tau) => 1 - Math.exp(-Math.min(0.1, t - tAnt) / tau); // suavizado por tiempo, igual a cualquier fps
    if (enfoque) { enfoque.k = Math.min(1, enfoque.k + 0.06); cam.position.lerp(enfoque.cam, enfoque.k); ctrl.target.lerp(enfoque.tgt, enfoque.k); if (enfoque.k >= 1) enfoque = null; }
    // Vibración del compresor (exagerada para que se vea) proporcional a la medida.
    const amp = marcha ? 0.0012 * Math.max(0, vib - 0.4) : 0;
    comp.position.set(base.x + amp * Math.sin(t * 67), base.y + amp * 0.5 * Math.sin(t * 53), base.z + amp * Math.cos(t * 61));
    if (marcha) { aspas.forEach((a) => { a.rotation.z = t * 14; }); partes.rotor.m.rotation.y = t * 25; }
    for (const it of sel) {
      if (it.obj) { const meta = it === sobre ? it.crece : 1; const s = it.obj.scale.x; it.obj.scale.setScalar(s + (meta - s) * suave(0.08)); }
      // Color de estado sobre la pieza: pulso más rápido cuanto más grave; la falla queda fija.
      const e = lect[it.id].estado;
      if (TINTE[e]) (it.tinte || tinteBase)(it, TINTE[e], e === 'falla' ? 0.6 : e === 'alarma' ? 0.35 + 0.3 * (0.5 + 0.5 * Math.sin(t * 6)) : 0.2 + 0.2 * (0.5 + 0.5 * Math.sin(t * 3)));
      else (it.reposo || reposoBase)(it);
    }
    // Acercamiento: homotecia con centro en el punto señalado (cámara y objetivo hacia él), así ese punto no se
    // mueve en pantalla y la pieza sigue bajo el cursor. Al cambiar de pieza primero se deshace el anterior.
    if (!enfoque) {
      const meta = sobre && !sinMovimiento.matches && (foco.s === sobre || foco.f < 1e-3) ? 0.16 : 0;
      if (meta && foco.s !== sobre) { foco.s = sobre; foco.p.copy(punto); }
      let f = foco.f + (meta - foco.f) * suave(0.14); if (Math.abs(f - meta) < 1e-4) f = meta;
      if (foco.s && f !== foco.f) { const P = foco.p; const r = (1 - f) / (1 - foco.f); cam.position.sub(P).multiplyScalar(r).add(P); ctrl.target.sub(P).multiplyScalar(r).add(P); }
      foco.f = f;
    }
    tAnt = t; ctrl.update(); renderer.render(scene, cam);
    requestAnimationFrame(bucle);
  })();

  return {
    actualizar, vista, verInterior, modelos,
    get modo() { return modo; }, get interior() { return interiorVisible; },
    destruir() { vivo = false; ro.disconnect(); ctrl.dispose(); renderer.dispose(); scene.traverse((o) => { o.geometry?.dispose?.(); o.material?.map?.dispose?.(); o.material?.dispose?.(); }); cont.innerHTML = ''; },
  };
}
