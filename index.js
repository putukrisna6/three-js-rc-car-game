/** @type {THREE.OrthographicCamera} */
let camera;
/** @type {THREE.Scene} */
let scene;
/** @type {THREE.WebGLRenderer} */
let renderer;

(function init() {
  // set up three.js scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color("lightGray");

  //lights
  const ambientLight = new THREE.AmbientLight("white", 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight("white", 0.6);
  directionalLight.position.set(10, 20, 0);
  scene.add(directionalLight);

  // Camera
  const width = 10;
  const height = width * (window.innerHeight / window.innerWidth);
  camera = new THREE.OrthographicCamera(
    width / -2,
    width / 2,
    height / 2,
    height / -2,
    1,
    100
  );
  camera.position.set(4, 4, 4);
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  // Render
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animation);
  renderer.render(scene, camera);
  document.body.appendChild(renderer.domElement);
})();

function animation() {
    renderer.render(scene, camera);
}