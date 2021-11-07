class CannonHelper {
  /**
   *
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
  }

  /**
   *
   * @param {THREE.Renderer} renderer
   */
  addLights(renderer) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

    // LIGHTS
    const ambient = new THREE.AmbientLight(0x888888);
    this.scene.add(ambient);

    const light = new THREE.DirectionalLight(0xdddddd);
    light.position.set(3, 10, 4);
    light.target.position.set(0, 0, 0);

    light.castShadow = true;

    const lightSize = 10;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 50;
    light.shadow.camera.left = light.shadow.camera.bottom = -lightSize;
    light.shadow.camera.right = light.shadow.camera.top = lightSize;

    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;

    this.sun = light;
    this.scene.add(light);
  }

  /**
   *
   * @param {CANNON.Body} body
   * @param {string} name
   * @param {boolean} castShadow
   * @param {boolean} receiveShadow
   */
  addVisual(body, name, castShadow = true, receiveShadow = true) {
    body.name = name;
    if (this.currentMaterial === undefined)
      this.currentMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });

    // What geometry should be used?
    let mesh;
    if (body instanceof CANNON.Body)
      mesh = this.shape2Mesh(body, castShadow, receiveShadow);

    if (mesh) {
      // Add body
      body.threemesh = mesh;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      this.scene.add(mesh);
    }
  }

  /**
   *
   * @param {CANNON.Body} body
   * @param {boolean} castShadow
   * @param {boolean} receiveShadow
   * @returns
   */
  shape2Mesh(body, castShadow, receiveShadow) {
    const obj = new THREE.Object3D();
    const material = this.currentMaterial;
    let index = 0;

    body.shapes.forEach(function (shape) {
      let mesh;
      let geometry;

      switch (shape.type) {
        case CANNON.Shape.types.SPHERE:
          const sphere_geometry = new THREE.SphereGeometry(shape.radius, 8, 8);
          mesh = new THREE.Mesh(sphere_geometry, material);
          break;

        case CANNON.Shape.types.PLANE:
          geometry = new THREE.PlaneGeometry(10, 10, 4, 4);
          mesh = new THREE.Object3D();
          const submesh = new THREE.Object3D();
          const ground = new THREE.Mesh(geometry, material);
          ground.scale.set(100, 100, 100);
          submesh.add(ground);

          mesh.add(submesh);
          break;

        case CANNON.Shape.types.BOX:
          const box_geometry = new THREE.BoxGeometry(
            shape.halfExtents.x * 2,
            shape.halfExtents.y * 2,
            shape.halfExtents.z * 2
          );
          mesh = new THREE.Mesh(box_geometry, material);
          break;

        default:
          throw "Visual type not recognized: " + shape.type;
      }

      mesh.receiveShadow = receiveShadow;
      mesh.castShadow = castShadow;

      mesh.traverse(function (child) {
        if (child.isMesh) {
          child.castShadow = castShadow;
          child.receiveShadow = receiveShadow;
        }
      });

      var o = body.shapeOffsets[index];
      var q = body.shapeOrientations[index++];
      mesh.position.set(o.x, o.y, o.z);
      mesh.quaternion.set(q.x, q.y, q.z, q.w);

      obj.add(mesh);
    });

    return obj;
  }

  updateBodies(world) {
    world.bodies.forEach(function (body) {
      if (body.threemesh != undefined) {
        body.threemesh.position.copy(body.position);
        body.threemesh.quaternion.copy(body.quaternion);
      }
    });
  }
}
