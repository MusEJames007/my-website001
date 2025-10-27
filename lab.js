// Minimal 3D physics lab using Three.js + cannon-es
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import * as CANNON from "https://cdn.skypack.dev/cannon-es";

const el = document.getElementById("scene");

// --- Three.js scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
el.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(60, 2, 0.1, 200);
camera.position.set(6, 6, 10);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Tiffany lights
const hemi = new THREE.HemisphereLight(0xffffff, 0xcfeeee, 0.8);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0x81D8D0, 0.9);
dir.position.set(5, 10, 2);
dir.castShadow = true;
scene.add(dir);

// Ground (Three)
const gGeo = new THREE.PlaneGeometry(20, 20);
const gMat = new THREE.MeshStandardMaterial({ color: 0xeffbfb, metalness: 0.1, roughness: 0.9 });
const groundMesh = new THREE.Mesh(gGeo, gMat);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.receiveShadow = true;
scene.add(groundMesh);

// Grid for reference
const grid = new THREE.GridHelper(20, 20, 0x81D8D0, 0xdddddd);
grid.position.y = 0.01;
scene.add(grid);

// --- Physics world (cannon-es) ---
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.8, 0) });
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;

// Materials & contact
const matDefault = new CANNON.Material("default");
const contact = new CANNON.ContactMaterial(matDefault, matDefault, { friction: 0.3, restitution: 0.5 });
world.defaultContactMaterial = contact;

// Ground (physics)
const groundBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane(), material: matDefault });
groundBody.quaternion.setFromEuler(-Math.PI/2, 0, 0);
world.addBody(groundBody);

// Object store
const items = []; // { mesh, body, type }

// Factories
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const sphGeo = new THREE.SphereGeometry(0.5, 32, 32);
const tiffany = new THREE.Color(0x81D8D0);

function addBox({ x=0, y=5, z=0 } = {}) {
  const s = 0.5 + Math.random()*0.8;
  const mesh = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: tiffany }));
  mesh.scale.set(s, s, s);
  mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);

  const shape = new CANNON.Box(new CANNON.Vec3((s)/2, (s)/2, (s)/2));
  const body = new CANNON.Body({ mass: 1.2*s, shape, material: matDefault, position: new CANNON.Vec3(x, y, z) });
  world.addBody(body);

  items.push({ mesh, body, type:"box" });
}

function addSphere({ x=0, y=6, z=0 } = {}) {
  const r = 0.35 + Math.random()*0.6;
  const mesh = new THREE.Mesh(sphGeo, new THREE.MeshStandardMaterial({ color: 0x5fbcb4 }));
  mesh.scale.set(r*2, r*2, r*2);
  mesh.castShadow = true;
  scene.add(mesh);

  const shape = new CANNON.Sphere(r);
  const body = new CANNON.Body({ mass: 0.8*r, shape, material: matDefault, position: new CANNON.Vec3(x, y, z) });
  world.addBody(body);

  items.push({ mesh, body, type:"sphere" });
}

// UI
const gSlider = document.getElementById("gravity");
const gVal = document.getElementById("gVal");
const chkWire = document.getElementById("wire");
document.getElementById("addSphere").onclick = () => addSphere({ x: rand(-2,2), z: rand(-2,2) });
document.getElementById("addBox").onclick    = () => addBox({ x: rand(-2,2), z: rand(-2,2) });
document.getElementById("reset").onclick     = reset;

gSlider.addEventListener("input", () => {
  const g = Number(gSlider.value);
  world.gravity.set(0, g, 0);
  gVal.textContent = g.toFixed(1);
});

chkWire.addEventListener("change", () => {
  items.forEach(({mesh}) => {
    mesh.material.wireframe = chkWire.checked;
  });
});

// Helpers
function reset(){
  // remove meshes/bodies
  items.forEach(({mesh, body}) => {
    scene.remove(mesh);
    world.removeBody(body);
  });
  items.length = 0;
}

function rand(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }

// Resize
function onResize(){
  const w = el.clientWidth;
  const h = el.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", onResize);
onResize();

// Prime the lab with a few objects
for (let i=0;i<3;i++) addBox({x:rand(-2,2), z:rand(-2,2), y:4+i});
for (let i=0;i<2;i++) addSphere({x:rand(-2,2), z:rand(-2,2), y:5+i});

// Main loop
const step = 1/60;
let last = performance.now();
function tick(now){
  const dt = Math.min(0.05, (now - last)/1000);
  last = now;
  world.step(step, dt);

  // Sync meshes
  for (const {mesh, body} of items){
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
