class Game {
  constructor() {
    if (!Detector.webgl) Detector.addGetWebGLMessage();

    this.modes = Object.freeze({
      NONE: Symbol("none"),
      PRELOAD: Symbol("preload"),
      INITIALISING: Symbol("initialising"),
      CREATING_LEVEL: Symbol("creating_level"),
      ACTIVE: Symbol("active"),
      GAMEOVER: Symbol("gameover"),
    });
    this.mode = this.modes.NONE;

    this.container;
    this.stats;
    this.controls;
    this.camera;
    this.scene;
    this.renderer;
    this.interactive = false;
    this.levelIndex = 0;
    this._hints = 0;
    this.score = 0;
    this.fixedTimeStep = 1.0 / 60.0;
    this.js = { forward: 0, turn: 0 };
    this.keyboardState = {};
    this.timer;

    this.firstKey = false;

    this.score = 0;

    this.container = document.createElement("div");
    this.container.style.height = "100%";
    document.body.appendChild(this.container);

    this.gameoverElement = document.getElementById("gameover");
    this.finishedElement = document.getElementById("finished");
    this.welcomeElement = document.getElementById("welcome");

    const sfxExt = SFX.supportsAudioType("mp3") ? "mp3" : "ogg";
    const game = this;

    const options = {
      assets: [
        "../assets/new_track.fbx",
        "../assets/images/nx.jpg",
        "../assets/images/px.jpg",
        "../assets/images/ny.jpg",
        "../assets/images/py.jpg",
        "../assets/images/nz.jpg",
        "../assets/images/pz.jpg",
        `../assets/sfx/bump.${sfxExt}`,
        `../assets/sfx/click.${sfxExt}`,
        `../assets/sfx/engine.${sfxExt}`,
        `../assets/sfx/skid.${sfxExt}`,
        `../assets/sfx/coin.${sfxExt}`,
      ],
      oncomplete: function () {
        game.init();
        game.animate();
      },
    };

    this.mode = this.modes.PRELOAD;
    this.motion = { forward: 0, turn: 0 };
    this.clock = new THREE.Clock();

    this.initSfx();

    // TODO move this after we have start game button or something else
    this.sfx.engine.play();
    this.sfx.engine.autoplay = true;

    if ("ontouchstart" in window) {
      document
        .getElementById("reset-btn")
        .addEventListener("touchstart", function () {
          game.resetCar();
        });
    } else {
      document.getElementById("reset-btn").onclick = function () {
        game.resetCar();
      };
    }

    const preloader = new Preloader(options);


    window.onError = function (error) {
      console.error(JSON.stringify(error));
    };
  }

  /** Reset the car to the latest checkpoint */
  resetCar() {
    this.sfx.skid.play();

    let checkpoint;
    let distance = 10000000000;
    const carPos = this.vehicle.chassisBody.position;
    this.checkpoints.forEach(function (obj) {
      const pos = obj.position.clone();
      pos.y = carPos.y;
      const dist = pos.distanceTo(carPos);
      if (dist < distance) {
        checkpoint = obj;
        distance = dist;
      }
    });
    this.vehicle.chassisBody.position.copy(checkpoint.position);
    this.vehicle.chassisBody.quaternion.copy(checkpoint.quaternion);
    this.vehicle.chassisBody.velocity.set(0, 0, 0);
    this.vehicle.chassisBody.angularVelocity.set(0, 0, 0);
  }

  /** Loads all of the SFX with preconfigured volume
   * @see SFX class in ./utils/sfx.js
   */
  initSfx() {
    this.sfx = {};
    this.sfx.context = new (window.AudioContext || window.webkitAudioContext)();
    this.sfx.bump = new SFX({
      context: this.sfx.context,
      src: {
        mp3: "../assets/sfx/bump.mp3",
        ogg: "../assets/sfx/bump.ogg",
      },
      loop: false,
      volume: 0.3,
    });
    this.sfx.click = new SFX({
      context: this.sfx.context,
      src: {
        mp3: "../assets/sfx/click.mp3",
        ogg: "../assets/sfx/click.ogg",
      },
      loop: false,
      volume: 0.3,
    });
    this.sfx.engine = new SFX({
      context: this.sfx.context,
      src: {
        mp3: "../assets/sfx/engine.mp3",
        ogg: "../assets/sfx/engine.ogg",
      },
      loop: true,
      volume: 0.1,
    });
    this.sfx.skid = new SFX({
      context: this.sfx.context,
      src: {
        mp3: "../assets/sfx/skid.mp3",
        ogg: "../assets/sfx/skid.ogg",
      },
      loop: false,
      volume: 0.3,
    });
    this.sfx.coin = new SFX({
      context: this.sfx.context,
      src: {
        mp3: "../assets/sfx/coin.mp3",
      },
      loop: false,
      volume: 0.4,
    });
  }

  /**
   * THREE.js initialization such as Camera, light
   */
  init() {
    this.mode = this.modes.INITIALISING;

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      500
    );
    this.camera.position.set(0, 6, -15);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa0a0a0);

    // LIGHTS
    const ambient = new THREE.AmbientLight(0xaaaaaa);
    this.scene.add(ambient);

    const light = new THREE.DirectionalLight(0xaaaaaa);
    light.position.set(30, 100, 40);
    light.target.position.set(0, 0, 0);

    light.castShadow = true;

    const lightSize = 30;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 500;
    light.shadow.camera.left = light.shadow.camera.bottom = -lightSize;
    light.shadow.camera.right = light.shadow.camera.top = lightSize;

    light.shadow.bias = 0.0039;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;

    this.sun = light;
    this.scene.add(light);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    this.loadAssets();

    window.addEventListener(
      "resize",
      function () {
        game.onWindowResize();
      },
      false
    );

    this.onKeyboard();
  }

  /**
   * Loads fbx assets such as the terrain, and car
   */
  loadAssets() {
    const game = this;
    const loader = new THREE.FBXLoader();

    loader.load(
      "../assets/new_track.fbx",
      function (object) {
        const euler = new THREE.Euler();
        game.proxies = {};
        game.checkpoints = [];

        game.car = {
          chassis: null,
          bonnet: null,
          engine: null,
          wheel: null,
          seat: null,
          xtra: null,
        };

        game.coins = [];

        object.traverse(function (child) {
          let receiveShadow = true;
          if (child.isMesh) {
            if (child.name == "Chassis") {
              game.car.chassis = child;
              game.followCam = new THREE.Object3D();
              game.followCam.position.copy(game.camera.position);
              game.scene.add(game.followCam);
              game.followCam.parent = child;
              game.sun.target = child;
              child.castShadow = true;
              receiveShadow = false;
            } else if (child.name.includes("Bonnet")) {
              game.car.bonnet = child;
              child.castShadow = true;
              receiveShadow = false;
            } else if (child.name.includes("Engine")) {
              game.car.engine = child;
              child.castShadow = true;
              receiveShadow = false;
            } else if (child.name.includes("Seat")) {
              game.car.seat = child;
              receiveShadow = false;
            } else if (
              child.name.includes("Wheel") &&
              child.children.length > 0
            ) {
              game.car.wheel = child;
              child.parent = game.scene;
              child.castShadow = true;
              receiveShadow = false;
            } else if (child.name == "ShadowBounds") {
              child.visible = false;
            } else if (child.name == "CarShadow") {
              child.visible = false;
            } else if (child.name.includes("Coin")) {
              child.castShadow = true;
              child.picked = false;
              game.coins.push(child);
            }

            child.receiveShadow = receiveShadow;
          } else {
            if (child.name.includes("Checkpoint")) {
              game.checkpoints.push(child);
              child.position.y += 1;
            }
          }
        });

        game.assets = object;
        game.scene.add(object);

        const tloader = new THREE.CubeTextureLoader();
        tloader.setPath("../assets/images/");

        var textureCube = tloader.load([
          "px.jpg",
          "nx.jpg",
          "py.jpg",
          "ny.jpg",
          "pz.jpg",
          "nz.jpg",
        ]);

        game.scene.background = textureCube;

        const maxCoins = game?.coins.length ?? 0;
        document.getElementById("max-score").innerText = maxCoins;

        game.initPhysics();
      },
      null,
      function (error) {
        console.error(error);
      }
    );
  }

  updatePhysics() {
    if (this.physics.debugRenderer !== undefined)
      this.physics.debugRenderer.scene.visible = true;
  }

  /**
   * Initialize Cannon.js physics
   */
  initPhysics() {
    this.physics = {};

    const game = this;
    const mass = 150;
    const world = new CANNON.World();
    this.world = world;

    world.broadphase = new CANNON.SAPBroadphase(world);
    world.gravity.set(0, -10, 0);
    world.defaultContactMaterial.friction = 0;

    const groundMaterial = new CANNON.Material("groundMaterial");
    const wheelMaterial = new CANNON.Material("wheelMaterial");
    const wheelGroundContactMaterial = new CANNON.ContactMaterial(
      wheelMaterial,
      groundMaterial,
      {
        friction: 0.9,
        restitution: 0,
        contactEquationStiffness: 1000,
      }
    );

    // We must add the contact materials to the world
    world.addContactMaterial(wheelGroundContactMaterial);

    const chassisShape = new CANNON.Box(new CANNON.Vec3(1, 0.3, 2));
    const chassisBody = new CANNON.Body({ mass: mass });
    const pos = this.car.chassis.position.clone();
    pos.y += 1;
    chassisBody.addShape(chassisShape);
    chassisBody.position.copy(pos);
    chassisBody.position.z = -18;
    chassisBody.position.x = 9;
    chassisBody.angularVelocity.set(0, 0, 0);
    chassisBody.threemesh = this.car.chassis;

    this.followCam = new THREE.Object3D();
    this.followCam.position.copy(this.camera.position);
    this.scene.add(this.followCam);
    this.followCam.parent = chassisBody.threemesh;

    const options = {
      radius: 0.3,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: 45,
      suspensionRestLength: 0.4,
      frictionSlip: 5,
      dampingRelaxation: 2.3,
      dampingCompression: 4.5,
      maxSuspensionForce: 200000,
      rollInfluence: 0.01,
      axleLocal: new CANNON.Vec3(-1, 0, 0),
      chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
      maxSuspensionTravel: 0.25,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true,
    };

    // Create the vehicle
    const vehicle = new CANNON.RaycastVehicle({
      chassisBody: chassisBody,
      indexRightAxis: 0,
      indexUpAxis: 1,
      indexForwardAxis: 2,
    });

    const axlewidth = 0.8;
    options.chassisConnectionPointLocal.set(axlewidth, 0, -1);
    vehicle.addWheel(options);

    options.chassisConnectionPointLocal.set(-axlewidth, 0, -1);
    vehicle.addWheel(options);

    options.chassisConnectionPointLocal.set(axlewidth, 0, 1);
    vehicle.addWheel(options);

    options.chassisConnectionPointLocal.set(-axlewidth, 0, 1);
    vehicle.addWheel(options);

    vehicle.addToWorld(world);

    const wheelBodies = [];
    let index = 0;
    const wheels = [this.car.wheel];
    for (let i = 0; i < 3; i++) {
      let wheel = this.car.wheel.clone();
      this.scene.add(wheel);
      wheels.push(wheel);
    }

    vehicle.wheelInfos.forEach(function (wheel) {
      const cylinderShape = new CANNON.Cylinder(
        wheel.radius,
        wheel.radius,
        wheel.radius / 2,
        20
      );
      const wheelBody = new CANNON.Body({ mass: 1 });
      const q = new CANNON.Quaternion();
      q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
      wheelBody.addShape(cylinderShape, new CANNON.Vec3(), q);
      wheelBodies.push(wheelBody);
      wheelBody.threemesh = wheels[index++];
    });
    game.car.wheels = wheelBodies;
    // Update wheels
    world.addEventListener("postStep", function () {
      let index = 0;
      game.vehicle.wheelInfos.forEach(function (wheel) {
        game.vehicle.updateWheelTransform(index);
        const t = wheel.worldTransform;
        wheelBodies[index].threemesh.position.copy(t.position);
        wheelBodies[index].threemesh.quaternion.copy(t.quaternion);
        index++;
      });
    });

    this.vehicle = vehicle;

    this.createColliders();
  }

  /**
   * Create colliders according to the assets
   */
  createColliders() {
    const world = this.world;
    const scaleAdjust = 0.9;
    const divisor = 2 / scaleAdjust;
    this.assets.children.forEach(function (child) {
      if (child.isMesh && child.name.includes("Collider")) {
        child.visible = true;
        const halfExtents = new CANNON.Vec3(
          child.scale.x / divisor,
          child.scale.y / divisor,
          child.scale.z / divisor
        );
        const box = new CANNON.Box(halfExtents);
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(box);
        body.position.copy(child.position);
        body.quaternion.copy(child.quaternion);
        world.add(body);
      }
    });
  }

  /**
   * Keyboard controls using wasd
   * also handles brake when there is no key pressed
   */
  onKeyboard() {
    const forwardIncrease = 0.06;
    const turnIncrease = 0.02;

    const forwardThreshold = 0.25;
    const turnThreshold = 0.25;

    window.addEventListener("keydown", (event) => {
      if (!this.firstKey) {
        this.timer = new Timer(0.1);
        this.timer.start(() => {
          this.gameoverElement.style.display = "flex"
          document.getElementById('time').innerHTML = '00:00:00';
        });
        this.firstKey = true;
        this.welcomeElement.style.display = 'none';
      }

      if (event.key === 'r') {
        window.location.reload();
      }

      if (event.key === "w") {
        this.keyboardState["w"] = true;
      } else if (event.key === "s") {
        this.keyboardState["s"] = true;
      } else if (event.key === "a") {
        this.keyboardState["a"] = true;
      } else if (event.key === "d") {
        this.keyboardState["d"] = true;
      }

      if (this.keyboardState["w"] && this.js.forward >= -1) {
        if (this.js.forward === 0) this.js.forward = -forwardThreshold;
        this.js.forward += -forwardIncrease;
      } else if (this.keyboardState["s"] && this.js.forward <= 1) {
        if (this.js.forward === 0) this.js.forward = forwardThreshold;
        this.js.forward += forwardIncrease;
      } else if (this.keyboardState["a"] && this.js.turn <= 1) {
        if (this.js.turn === 0) this.js.turn = turnThreshold;
        this.js.turn += turnIncrease;
      } else if (this.keyboardState["d"] && this.js.turn >= -1) {
        if (this.js.turn === 0) this.js.turn = -turnThreshold;
        this.js.turn += -turnIncrease;
      }
    });

    window.addEventListener("keyup", (event) => {
      if (event.key === "w") {
        this.keyboardState["w"] = false;
        this.js.forward = 0;
      } else if (event.key === "s") {
        this.keyboardState["s"] = false;
        this.js.forward = 0;
      } else if (event.key === "a") {
        this.keyboardState["a"] = false;
        this.js.turn = 0;
      } else if (event.key === "d") {
        this.keyboardState["d"] = false;
        this.js.turn = 0;
      }

      if (
        !this.keyboardState["w"] &&
        !this.keyboardState["s"] &&
        !this.keyboardState["a"] &&
        !this.keyboardState["d"]
      ) {
        this.js.forward = 0;
        this.js.turn = 0;
      }
    });
  }

  /**
   * Handles logic of running the car:
   * - Applying slow start by giving brake
   * - Incrementally slow the car when there is no forward value
   * - Handling the turning of the car
   */
  updateDrive(forward = this.js.forward, turn = this.js.turn) {
    this.sfx.engine.volume = Math.abs(forward) * 0.1 + 0.05;

    const maxSteerVal = 0.6;
    const maxForce = 500;
    const brakeForce = 10;

    const force = maxForce * forward;
    const steer = maxSteerVal * turn;

    if (forward != 0) {
      this.vehicle.setBrake(0, 0);
      this.vehicle.setBrake(0, 1);
      this.vehicle.setBrake(0, 2);
      this.vehicle.setBrake(0, 3);

      this.vehicle.applyEngineForce(force, 0);
      this.vehicle.applyEngineForce(force, 1);
    } else {
      this.vehicle.setBrake(brakeForce, 0);
      this.vehicle.setBrake(brakeForce, 1);
      this.vehicle.setBrake(brakeForce, 2);
      this.vehicle.setBrake(brakeForce, 3);
    }

    this.vehicle.setSteeringValue(steer, 2);
    this.vehicle.setSteeringValue(steer, 3);
  }

  /**
   * Function to handle window resize so the screen is not cropped
   */
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Move the camera by following the car
   */
  updateCamera() {
    if (this.followCam === undefined) return;
    const pos = this.car.chassis.position.clone();
    pos.y += 0.3;
    if (this.controls !== undefined) {
      this.controls.target.copy(pos);
      this.controls.update();
    } else {
      this.camera.position.lerp(
        this.followCam.getWorldPosition(new THREE.Vector3()),
        0.05
      );
      if (this.camera.position.y < 1) this.camera.position.y = 1;
      this.camera.lookAt(pos);
    }

    if (this.sun != undefined) {
      this.sun.position.copy(this.camera.position);
      this.sun.position.y += 10;
    }
  }

  /**
   * Animate function, controls the updateDrive also the camera
   */
  animate() {
    const game = this;

    requestAnimationFrame(function () {
      game.animate();
    });

    const now = Date.now();
    if (this.lastTime === undefined) this.lastTime = now;
    const dt = (Date.now() - this.lastTime) / 1000.0;
    this.FPSFactor = dt;
    this.lastTime = now;

    if (this.world !== undefined) {
      this.updateDrive();

      this.world.step(this.fixedTimeStep, dt, 10);

      this.world.bodies.forEach(function (body) {
        if (body.threemesh != undefined) {
          body.threemesh.position.copy(body.position);
          body.threemesh.quaternion.copy(body.quaternion);
          if (body == game.vehicle.chassisBody) {
            const elements = body.threemesh.matrix.elements;
            const yAxis = new THREE.Vector3(
              elements[4],
              elements[5],
              elements[6]
            );
            body.threemesh.position.sub(yAxis.multiplyScalar(0.6));
          }
        }
      });
    }

    for (let i = 0; i < this.coins.length; i++) {
      if (
        this.badIntersects(
          this.coins[i].position,
          this.vehicle.chassisBody.position
        )
      ) {
        this.coins[i].visible = false;
        if (!this.coins[i].picked) {
          document.getElementById("score").innerText = ++this.score;
          this.coins[i].picked = true;
          this.sfx.coin.play();
        }
      }
      this.coins[i].rotateY(0.01);
    }

    if (this.score == 20) {
      this.timer.stop();
      this.finishedElement.style.display = 'flex';
    }

    this.updateCamera();

    if (this.debugRenderer !== undefined) this.debugRenderer.update();

    this.renderer.render(this.scene, this.camera);

    if (this.stats != undefined) this.stats.update();
  }

  badIntersects(coinPosition, vehiclePosition) {
    const diffX = Math.abs(coinPosition.x - vehiclePosition.x);
    const diffY = Math.abs(coinPosition.y - vehiclePosition.y);
    const diffZ = Math.abs(coinPosition.z - vehiclePosition.z);

    return diffX < 1.5 && diffY < 1.5 && diffZ < 1.5;
  }
}
