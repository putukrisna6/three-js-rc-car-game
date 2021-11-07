import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/controls/OrbitControls.js";

/** @type {THREE.PerspectiveCamera} */
let camera;
/** @type {THREE.Scene} */
let scene;
/** @type {THREE.WebGLRenderer} */
let renderer;
/** @type {CANNON.world} */
let world;
/** @type {CannonHelper} */
let helper;

/** @type {CANNON.Sphere} */
let sphere;
/** @type {CANNON.Box} */
let box;

/** @type {number} */
let damping;
/** @type {number} */
let fixedTimeStep;

(function init() {
  // set up three.js scene
  scene = new THREE.Scene();

  const tloader = new THREE.CubeTextureLoader();
  tloader.setPath("assets/images/");

  const textureCube = tloader.load([
    "px.jpg",
    "nx.jpg",
    "py.jpg",
    "ny.jpg",
    "pz.jpg",
    "nz.jpg",
  ]);

  scene.background = textureCube;

  // Camera
  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 2, 8);

  // Render
  renderer = new THREE.WebGLRenderer({ antialias: true });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.enableZoom = true;

  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const buttons = document.getElementById("gui").childNodes;
  buttons[1].onclick = function () {
    addSphere();
  };
  buttons[3].onclick = function () {
    addBox();
  };

  helper = new CannonHelper(scene);
  helper.addLights(renderer);

  initPhysics();
})();

function addSphere() {
  const material = new CANNON.Material();
  const body = new CANNON.Body({
    mass: 5,
    material: material,
  });

  body.addShape(sphere);

  const x = Math.random() * 0.3 + 1;
  body.position.set(-x, 5, 0);
  body.linearDamping = damping;
  world.add(body);

  helper.addVisual(body, "sphere", true, true);

  const contactMaterial = new CANNON.ContactMaterial(
    new CANNON.Material(),
    material,
    {
      friction: 0.2,
      restitution: 0.7,
    }
  );

  world.addContactMaterial(contactMaterial);
}

function addBox() {
  const material = new CANNON.Material();
  const body = new CANNON.Body({
    mass: 5,
    material: material,
  });

  body.addShape(box);

  const x = Math.random() * 0.3 + 1;
  body.position.set(x, 5, 0);
  body.linearDamping = damping;
  world.add(body);

  helper.addVisual(body, "box", true, true);

  const contactMaterial = new CANNON.ContactMaterial(
    new CANNON.Material(),
    material,
    {
      friction: 0.2,
      restitution: 0.1,
    }
  );

  world.addContactMaterial(contactMaterial);
}

function initPhysics() {
  world = new CANNON.World();
  fixedTimeStep = 1.0 / 60.0;
  damping = 0.01;

  world.broadphase = new CANNON.NaiveBroadphase();
  world.gravity.set(0, -9.8, 0);

  const groundShape = new CANNON.Plane();
  const groundMaterial = new CANNON.Material();
  const groundBody = new CANNON.Body({
    mass: 0,
    material: groundMaterial,
  });
  groundBody.quaternion.setFromAxisAngle(
    new CANNON.Vec3(1, 0, 0),
    -Math.PI / 2
  );
  groundBody.addShape(groundShape);
  world.add(groundBody);

  helper.addVisual(groundBody, "ground", false, true);

  sphere = new CANNON.Sphere(0.5);
  box = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));

  animate();
}

function animate() {
  requestAnimationFrame(function () {
    animate();
  });

  world.step(fixedTimeStep);

  helper.updateBodies(world);

  renderer.render(scene, camera);
}
