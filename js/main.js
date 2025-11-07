import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { VRButton } from 'three/addons/webxr/VRBUTTON.js';

let camera, scene, renderer, controls, mixer;
const clock = new THREE.Clock();

init();

function init() {
  // ===== Renderer =====
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // === Botón VR visible (centrado y forzado) ===
  const vrButton = VRButton.createButton(renderer);
  vrButton.id = 'VRButton';
  vrButton.style.position = 'absolute';
  vrButton.style.bottom = '40px';
  vrButton.style.left = '50%';
  vrButton.style.transform = 'translateX(-50%)';
  vrButton.style.padding = '12px 24px';
  vrButton.style.background = '#111';
  vrButton.style.border = '1px solid #555';
  vrButton.style.color = '#fff';
  vrButton.style.fontFamily = 'system-ui';
  vrButton.style.fontSize = '14px';
  vrButton.style.borderRadius = '10px';
  vrButton.style.opacity = '0.9';
  vrButton.style.cursor = 'pointer';
  vrButton.style.zIndex = '9999';
  document.body.appendChild(vrButton);

  // ===== Escena =====
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x20232a);

  // ===== Cámara =====
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 1.6, 4); // 1.6m altura, 4m distancia
  camera.lookAt(0, 1.2, 0);

  // ===== Luces =====
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
  hemi.position.set(0, 20, 0);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(5, 10, 7);
  dir.castShadow = true;
  scene.add(dir);

  // ===== Piso =====
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x2e3138, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ===== Cuadrícula =====
  const grid = new THREE.GridHelper(40, 40, 0x666666, 0x333333);
  grid.position.y = 0.01;
  scene.add(grid);

  // ===== Controles (modo no VR) =====
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // ===== Modelo FBX =====
  const loader = new FBXLoader();
  loader.load(
    'models/fbx/Taunt.fbx',
    (fbx) => {
      fbx.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });

      // Escalar y colocar el modelo frente a la cámara
      const s = 0.01;
      fbx.scale.setScalar(s);
      fbx.position.set(0, 0, -2);
      fbx.rotation.y = 0; // ✅ Mirando hacia la cámara (de frente)
      scene.add(fbx);

      // Animación
      if (fbx.animations && fbx.animations.length) {
        mixer = new THREE.AnimationMixer(fbx);
        const action = mixer.clipAction(fbx.animations[0]);
        action.play();
      }
    },
    undefined,
    (err) => console.error('Error al cargar FBX:', err)
  );

  // ===== Eventos =====
  window.addEventListener('resize', onWindowResize);

  // ===== Loop VR =====
  renderer.setAnimationLoop(render);

  // ===== Diagnóstico WebXR =====
  if ('xr' in navigator) {
    navigator.xr.isSessionSupported('immersive-vr').then(supported => {
      console.log('WebXR immersive-vr support:', supported);
      const msg = document.createElement('div');
      msg.style.position = 'fixed';
      msg.style.left = '50%';
      msg.style.bottom = '15px';
      msg.style.transform = 'translateX(-50%)';
      msg.style.padding = '8px 16px';
      msg.style.borderRadius = '10px';
      msg.style.color = '#fff';
      msg.style.fontFamily = 'system-ui';
      msg.style.fontSize = '14px';
      msg.style.zIndex = '999';
      msg.textContent = supported
        ? '✅ WebXR disponible: el botón debería mostrarse.'
        : '❌ Este navegador no soporta modo VR (immersive-vr).';
      msg.style.background = supported ? 'rgba(0,150,0,0.6)' : 'rgba(255,0,0,0.6)';
      document.body.appendChild(msg);
    });
  } else {
    const msg = document.createElement('div');
    msg.textContent = '⚠️ navigator.xr no existe (sin soporte WebXR).';
    msg.style.position = 'fixed';
    msg.style.left = '50%';
    msg.style.bottom = '15px';
    msg.style.transform = 'translateX(-50%)';
    msg.style.background = 'rgba(255,0,0,0.6)';
    msg.style.color = '#fff';
    msg.style.padding = '8px 16px';
    msg.style.borderRadius = '10px';
    msg.style.fontFamily = 'system-ui';
    msg.style.zIndex = '999';
    document.body.appendChild(msg);
  }
}

// ===== Evento resize =====
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ===== Loop animación =====
function render() {
  const dt = clock.getDelta();
  if (mixer) mixer.update(dt);
  controls?.update();
  renderer.render(scene, camera);
}
