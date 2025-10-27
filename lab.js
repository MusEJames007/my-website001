// Three.js + cannon-es physics lab with: materials, velocity vector, save/load
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import * as CANNON from "https://cdn.skypack.dev/cannon-es";

const el = document.getElementById("scene");

// ---------------- Three.js ----------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
el.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(60, 2, 0.1, 200);
camera.position.set(6, 6, 10);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const hemi = new THREE.HemisphereLight(0xffffff, 0xcfeeee, 0.8);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0x81D8D0, 0.9);
dir.position.set(5, 10, 2);
dir.castShadow = true;
scene.add(dir);

// Ground
const gGeo = new THREE.PlaneGeometry(20, 20);
const gMat = new THREE.MeshStandardMaterial({ color: 0xeffbfb, metalness: 0.1, roughness: 0.9 });
const groundMesh = new THREE.Mesh(gGeo, gMat);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.receiveShadow = true;
scene.add(groundMesh);
const grid = new THREE.GridHelper(20, 20, 0x81D8D0, 0xdddddd);
grid.position.y = 0.01;
scene.add(grid);

// Velocity arrow helper
const arrowMat = new THREE.LineBasicMaterial({ color: 0x5fbcb4 });
const arrowGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1,0,0)]);
const arrow = new THREE.Line(arrowGeo, arrowMat);
arrow.visible = true;
scene.add(arrow);

// ---------------- Physics ----------------
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.8, 0) });
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;

// Base material + ground
const matDefault = new CANNON.Material("default");
world.defaultContactMaterial = new CANNON.ContactMaterial(matDefault, matDefault, { friction: 0.3, restitution: 0.5 });

const groundBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane(), material: matDefault });
groundBody.quaternion.setFromEuler(-Math.PI/2, 0, 0);
world.addBody(groundBody);

// Material library (friction, restitution, density-ish via mass scale)
const MATERIALS = {
  glass:  { fric:0.1, rest:0.7, massScale:0.7, color:0xa7ece9 },
  rubber: { fric:0.25, rest:0.9, massScale:1.0, color:0x5fbcb4 },
  metal:  { fric:0.3, rest:0.5, massScale:1.6, color:0x6e7f91 },
  wood:   { fric:0.5, rest:0.3, massScale:1.2, color:0xc89f7a }
};

// UI refs
const gSlider  = document.getElementById("gravity");
const gVal     = document.getElementById("gVal");
const chkWire  = document.getElementById("wire");
const matSel   = document.getElementById("material");
const vxEl     = document.getElementById("vx");
const vyEl     = document.getElementById("vy");
const vzEl     = document.getElementById("vz");
const showVec  = document.getElementById("showVec");

// store
const items = []; // {mesh, body, type, size, materialKey}

// Geometries
const boxGeo = new THREE.BoxGeometry(1,1,1);
const sphGeo = new THREE.SphereGeometry(0.5, 32, 32);

function makeMaterial(key) {
  const def = MATERIALS[key] ?? MATERIALS.rubber;
  const mat = new CANNON.Material(key);
  const contact = new CANNON.ContactMaterial(mat, matDefault, { friction:def.fric, restitution:def.rest });
  world.addContactMaterial(contact);
  return { cannon: mat, visual: new THREE.MeshStandardMaterial({ color: def.color }), massScale: def.massScale };
}

function addBox({ x=0, y=5, z=0, key=matSel.value, size=null } = {}) {
  const s = size ?? (0.5 + Math.random()*0.8);
  const def = makeMaterial(key);
  const mesh = new THREE.Mesh(boxGeo, def.visual);
  mesh.scale.set(s, s, s);
  mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);

  const shape = new CANNON.Box(new CANNON.Vec3(s/2, s/2, s/2));
  const body = new CANNON.Body({
    mass: def.massScale * s,
    shape,
    material: def.cannon,
    position: new CANNON.Vec3(x, y, z)
  });
  world.addBody(body);

  items.push({ mesh, body, type:"box", size:s, materialKey:key });
}

function addSphere({ x=0, y=6, z=0, key=matSel.value, radius=null, velocity=null } = {}) {
  const r = radius ?? (0.35 + Math.random()*0.6);
  const def = makeMaterial(key);
  const mesh = new THREE.Mesh(sphGeo, def.visual);
  mesh.scale.set(r*2, r*2, r*2);
  mesh.castShadow = true;
  scene.add(mesh);

  const shape = new CANNON.Sphere(r);
  const body = new CANNON.Body({
    mass: def.massScale * r,
    shape,
    material: def.cannon,
    position: new CANNON.Vec3(x, y, z)
  });
  if (velocity) body.velocity.set(velocity.x, velocity.y, velocity.z);
  world.addBody(body);

  items.push({ mesh, body, type:"sphere", size:r, materialKey:key });
}

function reset(){
  items.forEach(({mesh, body}) => {
    scene.remove(mesh);
    world.removeBody(body);
  });
  items.length = 0;
}

// ---------- UI wiring ----------
document.getElementById("addSphere").onclick = () => addSphere({ x: rand(-2,2), z: rand(-2,2) });
document.getElementById("addBox").onclick    = () => addBox({ x: rand(-2,2), z: rand(-2,2) });
document.getElementById("reset").onclick     = reset;

document.getElementById("shootSphere").onclick = () => {
  const vx = Number(vxEl.value)||0, vy = Number(vyEl.value)||0, vz = Number(vzEl.value)||0;
  addSphere({ x:0, y:1, z:0, velocity: {x: vx, y: vy, z: vz} });
  // update arrow to show initial velocity
  setArrow(new THREE.Vector3(0,1,0), new THREE.Vector3(vx, vy, vz));
};

gSlider.addEventListener("input", () => {
  const g = Number(gSlider.value);
  world.gravity.set(0, g, 0);
  gVal.textContent = g.toFixed(1);
});

chkWire.addEventListener("change", () => {
  items.forEach(({mesh}) => mesh.material.wireframe = chkWire.checked );
});
showVec.addEventListener("change", ()=> arrow.visible = showVec.checked);

// Save / Load
document.getElementById("save").onclick = () => {
  const data = items.map(({body, type, size, materialKey}) => ({
    type, size, materialKey,
    p: [body.position.x, body.position.y, body.position.z],
    q: [body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w],
    v: [body.velocity.x, body.velocity.y, body.velocity.z]
  }));
  localStorage.setItem("tiffany_lab_scene", JSON.stringify({
    gravity: world.gravity.y,
    list: data
  }));
  toast("Scene saved.");
};
document.getElementById("load").onclick = () => {
  const raw = localStorage.getItem("tiffany_lab_scene");
  if (!raw){ toast("No saved scene found."); return; }
  const obj = JSON.parse(raw);
  reset();
  world.gravity.set(0, obj.gravity ?? -9.8, 0);
  gSlider.value = obj.gravity ?? -9.8; gVal.textContent = (obj.gravity ?? -9.8).toFixed(1);

  for (const it of obj.list || []) {
    if (it.type === "box") {
      addBox({ x: it.p[0], y: it.p[1], z: it.p[2], key: it.materialKey, size: it.size });
      const last = items[items.length-1];
      last.body.quaternion.set(it.q[0], it.q[1], it.q[2], it.q[3]);
      last.body.velocity.set(it.v[0], it.v[1], it.v[2]);
    } else {
      addSphere({ x: it.p[0], y: it.p[1], z: it.p[2], key: it.materialKey, radius: it.size });
      const last = items[items.length-1];
      last.body.quaternion.set(it.q[0], it.q[1], it.q[2], it.q[3]);
      last.body.velocity.set(it.v[0], it.v[1], it.v[2]);
    }
  }
  toast("Scene loaded.");
};

// ------------- helpers -------------
function setArrow(origin, vec){
  const scale = 0.5; // shorten for display
  const end = origin.clone().add(vec.clone().multiplyScalar(scale));
  arrow.geometry.setFromPoints([origin, end]);
  arrow.visible = showVec.checked;
}
function toast(msg){
  console.log(msg); // 简单点，后续可做浮层提示
}
function rand(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }

function onResize(){
  const w = el.clientWidth, h = el.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", onResize);
onResize();

// Seed
for (let i=0;i<2;i++) addBox({x:rand(-2,2), z:rand(-2,2), y:4+i});
for (let i=0;i<2;i++) addSphere({x:rand(-2,2), z:rand(-2,2), y:5+i});

// Main loop
const step = 1/60;
let last = performance.now();
function tick(now){
  const dt = Math.min(0.05, (now - last)/1000);
  last = now;
  world.step(step, dt);

  for (const {mesh, body} of items){
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
