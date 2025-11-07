import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Octree } from 'three/addons/math/Octree.js';
import { OctreeHelper } from 'three/addons/helpers/OctreeHelper.js';
import { Capsule } from 'three/addons/math/Capsule.js';
import { VRButton } from 'three/addons/webxr/VRBUTTON2.js';

// =====================
// Escena, cámara y base
// =====================
const clock = new THREE.Clock();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x88ccee);
scene.fog = new THREE.Fog(0x88ccee, 0, 80);

// Cámara
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);
camera.rotation.order = 'YXZ';

// "Cuerpo" del jugador (para moverlo igual en VR y no VR)
const playerRoot = new THREE.Group();
playerRoot.position.set(0, 1.6, 5); // altura natural (~1.6m) y alejados del centro
playerRoot.add(camera);
scene.add(playerRoot);

// Luces
const hemi = new THREE.HemisphereLight(0x8dc1de, 0x00668d, 1.5);
hemi.position.set(2, 1, 1);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 2.3);
dir.position.set(-5, 25, -1);
dir.castShadow = true;
dir.shadow.mapSize.set(1024, 1024);
scene.add(dir);

// Renderer
const container = document.getElementById('container') || document.body;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor'); // piso físico en VR
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild(renderer.domElement);

// Botón VR
const vrBtn = VRButton.createButton(renderer);
vrBtn.style.position = 'absolute';
vrBtn.style.left = '50%';
vrBtn.style.bottom = '28px';
vrBtn.style.transform = 'translateX(-50%)';
vrBtn.style.padding = '12px 24px';
vrBtn.style.background = '#111';
vrBtn.style.border = '1px solid #555';
vrBtn.style.color = '#fff';
vrBtn.style.fontFamily = 'system-ui';
vrBtn.style.fontSize = '14px';
vrBtn.style.borderRadius = '10px';
vrBtn.style.opacity = '0.9';
vrBtn.style.cursor = 'pointer';
vrBtn.style.zIndex = '9999';
document.body.appendChild(vrBtn);

// Stats
const stats = new Stats();
stats.dom.style.position = 'absolute';
stats.dom.style.top = '0';
container.appendChild(stats.dom);

// =====================
// Físicas (sin esferas)
// =====================
const GRAVITY = 30;
const STEPS_PER_FRAME = 5;

const worldOctree = new Octree(); // colisionador del mundo

// Cápsula del jugador (pies a cabeza)
const playerCollider = new Capsule(
  new THREE.Vector3(0, 0.35, 0), // start
  new THREE.Vector3(0, 1.6, 0),  // end (altura jugador ~1.6m)
  0.35                           // radio de la cápsula/anchura hombros
);

const playerVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();
let playerOnFloor = false;

// =====================
// Entrada de usuario
// =====================
const keyStates = {};
document.addEventListener('keydown', e => keyStates[e.code] = true);
document.addEventListener('keyup',   e => keyStates[e.code] = false);

// PointerLock sólo fuera de VR
const canvasEl = renderer.domElement;
canvasEl.addEventListener('click', () => {
  if (!renderer.xr.isPresenting) canvasEl.requestPointerLock();
});

document.addEventListener('mousemove', (event) => {
  if (renderer.xr.isPresenting) return; // en VR la cabeza controla la vista
  if (document.pointerLockElement === canvasEl) {
    camera.rotation.y -= event.movementX * 0.002;
    camera.rotation.x -= event.movementY * 0.002;
    camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
  }
});

window.addEventListener('resize', onWindowResize);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// =====================
// Utilidades de movimiento
// =====================
function getForwardVector() {
  // dirección hacia donde mira la "cabeza"
  camera.getWorldDirection(playerDirection);
  playerDirection.y = 0;
  playerDirection.normalize();
  return playerDirection;
}
function getSideVector() {
  camera.getWorldDirection(playerDirection);
  playerDirection.y = 0;
  playerDirection.normalize();
  playerDirection.cross(camera.up);
  return playerDirection;
}

// Movimiento WASD (aplica a playerRoot + cápsula)
function controls(delta) {
  const speed = delta * (playerOnFloor ? 25 : 8);

  if (keyStates['KeyW']) {
    const f = getForwardVector().multiplyScalar(speed);
    playerVelocity.add(f);
  }
  if (keyStates['KeyS']) {
    const b = getForwardVector().multiplyScalar(-speed);
    playerVelocity.add(b);
  }
  if (keyStates['KeyA']) {
    const l = getSideVector().multiplyScalar(-speed);
    playerVelocity.add(l);
  }
  if (keyStates['KeyD']) {
    const r = getSideVector().multiplyScalar(speed);
    playerVelocity.add(r);
  }
  if (playerOnFloor && keyStates['Space']) {
    playerVelocity.y = 15; // salto
  }
}

// Colisión jugador ↔ mundo
function playerCollisions() {
  const result = worldOctree.capsuleIntersect(playerCollider);
  playerOnFloor = false;

  if (result) {
    playerOnFloor = result.normal.y > 0;

    if (!playerOnFloor) {
      playerVelocity.addScaledVector(result.normal, -result.normal.dot(playerVelocity));
    }

    if (result.depth >= 1e-10) {
      playerCollider.translate(result.normal.multiplyScalar(result.depth));
    }
  }
}

// Actualizar jugador
function updatePlayer(delta) {
  let damping = Math.exp(-4 * delta) - 1;

  if (!playerOnFloor) {
    playerVelocity.y -= GRAVITY * delta;
    damping *= 0.1;
  }

  // amortiguación ligera
  playerVelocity.addScaledVector(playerVelocity, damping);

  // mover cápsula con la velocidad
  const deltaPosition = playerVelocity.clone().multiplyScalar(delta);
  playerCollider.translate(deltaPosition);

  // colisiones con el mundo
  playerCollisions();

  // sincronizar la posición del "cuerpo" del jugador (y por ende la cámara)
  // usamos el punto superior (head) de la cápsula como posición del playerRoot
  playerRoot.position.copy(playerCollider.end);
}

// Evitar caer infinito
function teleportPlayerIfOob() {
  if (playerRoot.position.y <= -25) {
    playerCollider.start.set(0, 0.35, 0);
    playerCollider.end.set(0, 1.6, 0);
    playerCollider.radius = 0.35;
    playerRoot.position.copy(playerCollider.end);
    camera.rotation.set(0, 0, 0);
    playerVelocity.set(0, 0, 0);
  }
}

// =====================
// Cargar escenario GLB
// =====================
const loader = new GLTFLoader().setPath('./models/gltf/');
loader.load(
  'gm_car_park.glb',
  (gltf) => {
    const sceneModel = gltf.scene;
    scene.add(sceneModel);

    // Genera el octree para colisiones
    worldOctree.fromGraphNode(sceneModel);

    // sombras / anisotropía
    sceneModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material && child.material.map) child.material.map.anisotropy = 4;
      }
    });

    // (Opcional) helper de depuración del octree
    // const helper = new OctreeHelper(worldOctree);
    // helper.visible = false;
    // scene.add(helper);

    // Posición inicial del jugador
    playerRoot.position.copy(playerCollider.end);
  },
  undefined,
  (err) => console.error('Error cargando GLB:', err)
);

// =====================
// Bucle principal
// =====================
function animate() {
  const dt = Math.min(0.05, clock.getDelta()) / STEPS_PER_FRAME;

  for (let i = 0; i < STEPS_PER_FRAME; i++) {
    controls(dt);
    updatePlayer(dt);
    teleportPlayerIfOob();
  }

  renderer.render(scene, camera);
  stats.update();
}

// Iniciar
renderer.setAnimationLoop(animate);

// Diagnóstico WebXR (opcional visual)
if ('xr' in navigator) {
  navigator.xr.isSessionSupported('immersive-vr').then(supported => {
    console.log('WebXR immersive-vr support:', supported);
    const msg = document.createElement('div');
    msg.textContent = supported
      ? '✅ WebXR disponible'
      : '❌ WebXR no disponible (immersive-vr)';
    Object.assign(msg.style, {
      position: 'fixed', left: '50%', bottom: '70px',
      transform: 'translateX(-50%)',
      background: supported ? 'rgba(0,150,0,0.6)' : 'rgba(255,0,0,0.6)',
      color: '#fff', padding: '6px 12px', borderRadius: '10px',
      fontFamily: 'system-ui', fontSize: '12px', zIndex: 999
    });
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 4000);
  });
}
