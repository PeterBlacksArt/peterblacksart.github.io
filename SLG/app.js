import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

/**
 * VR GLB Explorer & Viewer Main Application
 */
class VRGLBViewer {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.currentModel = null;
    this.modelAnimations = [];
    this.mixer = null;
    this.activeAction = null;
    this.clock = new THREE.Clock();

    // Navigation State
    this.navMode = 'orbit'; // 'orbit' | 'walk'
    this.isPointerLocked = false;
    this.walkKeys = { forward: false, backward: false, left: false, right: false, up: false, down: false, sprint: false };
    this.walkSpeed = 5.0; // meters per second
    this.sprintMultiplier = 2.5;
    this.cameraEuler = new THREE.Euler(0, 0, 0, 'YXZ');

    // VR Teleportation & Locomotion State
    this.vrLocomotionMode = 'both'; // 'teleport' | 'smooth' | 'both'
    this.vrTurnMode = 'snap'; // 'snap' | 'smooth'
    this.snapTurnDebounce = false;
    this.vrHeightOffset = 0.0;
    this.teleportActive = false;
    this.teleportTarget = new THREE.Vector3();
    this.teleportValid = false;
    this.vrExitButtonDown = false;

    // Viewport Helpers
    this.gridHelper = null;
    this.boxHelper = null;
    this.groundPlane = null;
    this.autoRotate = false;

    this.initScene();
    this.initLoaders();
    this.initLighting();
    this.initDesktopControls();
    this.initWebXR();
    this.initUI();
    this.initDragAndDrop();

    // Load the first model from models/models.json unless a URL model is provided.
    this.loadInitialModel();

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
  }

  /* -------------------------------------------------------------------------- */
  /*                                SCENE SETUP                                 */
  /* -------------------------------------------------------------------------- */
  initScene() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0e14);

    // Camera (default lower eye height 1.1m at z=2.5)
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 1000);
    this.camera.position.set(0, 1.1, 2.5);

    // Camera Rig (crucial for WebXR roomscale & teleportation)
    this.cameraRig = new THREE.Group();
    this.cameraRig.name = "CameraRig";
    this.cameraRig.add(this.camera);
    this.scene.add(this.cameraRig);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.xr.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // Ground Grid & Shadow Receiver
    this.initHelpers();

    // Start Render Loop
    this.renderer.setAnimationLoop((time, frame) => this.render(time, frame));
  }

  initHelpers() {
    // Visual Ground Grid
    this.gridHelper = new THREE.GridHelper(40, 40, 0x3b82f6, 0x1f293d);
    this.gridHelper.position.y = -0.001;
    this.scene.add(this.gridHelper);

    // Invisible Ground Plane for Raycasting / Teleportation & Shadow Receiving
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    this.groundPlane = new THREE.Mesh(groundGeo, groundMat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = 0;
    this.groundPlane.receiveShadow = true;
    this.groundPlane.name = "GroundPlane";
    this.scene.add(this.groundPlane);
  }

  /* -------------------------------------------------------------------------- */
  /*                             LIGHTING & ENVIRONMENT                         */
  /* -------------------------------------------------------------------------- */
  initLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.7);
    this.hemiLight.position.set(0, 20, 0);
    this.scene.add(this.hemiLight);

    this.mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    this.mainLight.position.set(8, 16, 10);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.width = 2048;
    this.mainLight.shadow.mapSize.height = 2048;
    this.mainLight.shadow.camera.near = 0.5;
    this.mainLight.shadow.camera.far = 60;
    const d = 15;
    this.mainLight.shadow.camera.left = -d;
    this.mainLight.shadow.camera.right = d;
    this.mainLight.shadow.camera.top = d;
    this.mainLight.shadow.camera.bottom = -d;
    this.mainLight.shadow.bias = -0.0005;
    this.scene.add(this.mainLight);

    // Secondary Accent / Fill Light
    this.fillLight = new THREE.DirectionalLight(0x60a5fa, 0.4);
    this.fillLight.position.set(-8, 6, -8);
    this.scene.add(this.fillLight);
  }

  setLightingPreset(preset) {
    switch (preset) {
      case 'studio':
        this.scene.background.set(0x0f1117);
        this.ambientLight.color.set(0xffffff);
        this.ambientLight.intensity = 0.8;
        this.mainLight.color.set(0xffffff);
        this.mainLight.intensity = 1.5;
        this.fillLight.color.set(0x93c5fd);
        this.fillLight.intensity = 0.5;
        break;
      case 'sunset':
        this.scene.background.set(0x1a101f);
        this.ambientLight.color.set(0xfca5a5);
        this.ambientLight.intensity = 0.6;
        this.mainLight.color.set(0xfb923c);
        this.mainLight.intensity = 2.0;
        this.mainLight.position.set(15, 6, 12);
        this.fillLight.color.set(0xc084fc);
        this.fillLight.intensity = 0.8;
        break;
      case 'cyberpunk':
        this.scene.background.set(0x05050d);
        this.ambientLight.color.set(0x06b6d4);
        this.ambientLight.intensity = 0.4;
        this.mainLight.color.set(0xec4899);
        this.mainLight.intensity = 2.2;
        this.fillLight.color.set(0x06b6d4);
        this.fillLight.intensity = 1.6;
        break;
      case 'outdoor':
        this.scene.background.set(0x60a5fa);
        this.ambientLight.color.set(0xffffff);
        this.ambientLight.intensity = 1.0;
        this.mainLight.color.set(0xfffbeb);
        this.mainLight.intensity = 2.2;
        this.fillLight.color.set(0x93c5fd);
        this.fillLight.intensity = 0.8;
        break;
      case 'dark':
        this.scene.background.set(0x030305);
        this.ambientLight.color.set(0x64748b);
        this.ambientLight.intensity = 0.2;
        this.mainLight.color.set(0xffffff);
        this.mainLight.intensity = 0.8;
        this.fillLight.color.set(0x38bdf8);
        this.fillLight.intensity = 0.3;
        break;
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                            LOADERS (GLTF + DRACO)                          */
  /* -------------------------------------------------------------------------- */
  initLoaders() {
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
  }

  /* -------------------------------------------------------------------------- */
  /*                            DESKTOP CONTROLS                                */
  /* -------------------------------------------------------------------------- */
  initDesktopControls() {
    // 1. Orbit Controls (Target eye-level 1.1m)
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.06;
    this.orbitControls.maxDistance = 200;
    this.orbitControls.minDistance = 0.1;
    this.orbitControls.target.set(0, 1.1, 0);
    this.orbitControls.update();

    // 2. Keyboard & Mouse Listeners for Walk Mode
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));

    // Canvas click triggers PointerLock when in Walk Mode
    this.renderer.domElement.addEventListener('click', () => {
      if (this.navMode === 'walk' && !this.renderer.xr.isPresenting) {
        this.renderer.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
      const banner = document.getElementById('pointer-lock-banner');
      if (this.navMode === 'walk' && !this.isPointerLocked) {
        banner.classList.remove('hidden');
      } else {
        banner.classList.add('hidden');
      }
    });
  }

  setNavMode(mode) {
    this.navMode = mode;
    const btnOrbit = document.getElementById('mode-orbit');
    const btnWalk = document.getElementById('mode-walk');
    const banner = document.getElementById('pointer-lock-banner');

    if (mode === 'orbit') {
      btnOrbit.classList.add('active');
      btnWalk.classList.remove('active');
      banner.classList.add('hidden');

      // Transfer cameraRig position to camera and reset cameraRig
      const worldPos = new THREE.Vector3();
      this.camera.getWorldPosition(worldPos);
      this.cameraRig.position.set(0, 0, 0);
      this.camera.position.copy(worldPos);

      this.orbitControls.enabled = true;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      this.orbitControls.target.copy(this.camera.position).addScaledVector(forward, 2.5);
      this.orbitControls.update();

      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    } else {
      btnWalk.classList.add('active');
      btnOrbit.classList.remove('active');
      this.orbitControls.enabled = false;
      banner.classList.remove('hidden');

      // Transfer camera world position into cameraRig, and set camera local position to 0
      const worldPos = new THREE.Vector3();
      this.camera.getWorldPosition(worldPos);
      this.cameraRig.position.copy(worldPos);
      this.camera.position.set(0, 0, 0);

      // Sync camera euler with current camera orientation
      this.cameraEuler.setFromQuaternion(this.camera.quaternion);
    }
  }

  onKeyDown(e) {
    if (e.repeat) return;
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.walkKeys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.walkKeys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.walkKeys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.walkKeys.right = true;
        break;
      case 'Space':
        this.walkKeys.up = true;
        break;
      case 'KeyC':
        this.walkKeys.down = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.walkKeys.sprint = true;
        break;
      case 'KeyF':
        this.fitCameraToBounds();
        break;
    }
  }

  onKeyUp(e) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.walkKeys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.walkKeys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.walkKeys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.walkKeys.right = false;
        break;
      case 'Space':
        this.walkKeys.up = false;
        break;
      case 'KeyC':
        this.walkKeys.down = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.walkKeys.sprint = false;
        break;
    }
  }

  onMouseMove(e) {
    if (this.navMode === 'walk' && this.isPointerLocked) {
      const movementX = e.movementX || 0;
      const movementY = e.movementY || 0;
      const sensitivity = 0.0022;

      this.cameraEuler.y -= movementX * sensitivity;
      this.cameraEuler.x -= movementY * sensitivity;

      // Clamp vertical pitch to avoid flipping
      this.cameraEuler.x = Math.max(-Math.PI / 2.05, Math.min(Math.PI / 2.05, this.cameraEuler.x));
      this.camera.quaternion.setFromEuler(this.cameraEuler);
    }
  }

  updateDesktopWalk(delta) {
    if (this.navMode !== 'walk' || !this.isPointerLocked) return;

    const actualSpeed = (this.walkKeys.sprint ? this.walkSpeed * this.sprintMultiplier : this.walkSpeed) * delta;
    const moveDir = new THREE.Vector3();

    if (this.walkKeys.forward) moveDir.z -= 1;
    if (this.walkKeys.backward) moveDir.z += 1;
    if (this.walkKeys.left) moveDir.x -= 1;
    if (this.walkKeys.right) moveDir.x += 1;
    moveDir.normalize();

    // Move in direction the camera is facing horizontally
    const cameraYaw = new THREE.Euler(0, this.cameraEuler.y, 0, 'YXZ');
    moveDir.applyEuler(cameraYaw);
    moveDir.multiplyScalar(actualSpeed);

    this.cameraRig.position.add(moveDir);

    // Vertical flight elevation (Space up, C down - unclamped to allow ground level and basement exploration)
    if (this.walkKeys.up) this.cameraRig.position.y += actualSpeed;
    if (this.walkKeys.down) this.cameraRig.position.y -= actualSpeed;
  }

  /* -------------------------------------------------------------------------- */
  /*                               WEBXR / VR SETUP                             */
  /* -------------------------------------------------------------------------- */
  initWebXR() {
    // Add VR Button to the top-bar slot
    const vrButton = VRButton.createButton(this.renderer);
    document.getElementById('vr-button-slot').appendChild(vrButton);

    // WebXR Session Listeners
    this.renderer.xr.addEventListener('sessionstart', () => {
      this.vrExitButtonDown = false;
      this.showToast('Entered VR Session', 'vr');
      this.cameraRig.position.set(0, this.vrHeightOffset, 3);
    });

    this.renderer.xr.addEventListener('sessionend', () => {
      this.vrExitButtonDown = false;
      this.showToast('Exited VR Session', 'vr');
    });

    // Controllers Setup
    this.controller1 = this.renderer.xr.getController(0);
    this.controller2 = this.renderer.xr.getController(1);

    this.controller1.addEventListener('selectstart', (e) => this.onVRSelectStart(e, 0));
    this.controller1.addEventListener('selectend', (e) => this.onVRSelectEnd(e, 0));
    this.controller2.addEventListener('selectstart', (e) => this.onVRSelectStart(e, 1));
    this.controller2.addEventListener('selectend', (e) => this.onVRSelectEnd(e, 1));

    this.cameraRig.add(this.controller1);
    this.cameraRig.add(this.controller2);

    // Controller visual rays / laser pointers
    this.laser1 = this.createControllerLaser();
    this.laser2 = this.createControllerLaser();
    this.controller1.add(this.laser1);
    this.controller2.add(this.laser2);

    // Standard Controller 3D Models
    const controllerModelFactory = new XRControllerModelFactory();
    this.controllerGrip1 = this.renderer.xr.getControllerGrip(0);
    this.controllerGrip1.add(controllerModelFactory.createControllerModel(this.controllerGrip1));
    this.cameraRig.add(this.controllerGrip1);

    this.controllerGrip2 = this.renderer.xr.getControllerGrip(1);
    this.controllerGrip2.add(controllerModelFactory.createControllerModel(this.controllerGrip2));
    this.cameraRig.add(this.controllerGrip2);

    // Teleportation Target Landing Ring
    this.initTeleportReticle();
  }

  createControllerLaser() {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -5)
    ]);
    const material = new THREE.LineBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.6,
      linewidth: 2
    });
    const line = new THREE.Line(geometry, material);
    line.name = "LaserPointer";
    return line;
  }

  initTeleportReticle() {
    // Glowing animated target ring for VR teleportation
    const ringGeo = new THREE.RingGeometry(0.3, 0.42, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    this.teleportReticle = new THREE.Mesh(ringGeo, ringMat);
    this.teleportReticle.rotation.x = -Math.PI / 2;
    this.teleportReticle.visible = false;
    this.scene.add(this.teleportReticle);

    // Inner pulsing dot
    const innerDotGeo = new THREE.CircleGeometry(0.12, 16);
    const innerDotMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const innerDot = new THREE.Mesh(innerDotGeo, innerDotMat);
    innerDot.position.z = 0.001;
    this.teleportReticle.add(innerDot);
  }

  onVRSelectStart(event, controllerIndex) {
    if (this.vrLocomotionMode === 'teleport' || this.vrLocomotionMode === 'both') {
      this.activeTeleportController = controllerIndex === 0 ? this.controller1 : this.controller2;
      this.teleportActive = true;
      this.teleportReticle.visible = true;
    }
  }

  onVRSelectEnd(event, controllerIndex) {
    if (this.teleportActive && this.teleportValid) {
      // Execute Teleportation: Translate cameraRig to the landing target
      this.cameraRig.position.x = this.teleportTarget.x;
      this.cameraRig.position.z = this.teleportTarget.z;
      this.cameraRig.position.y = this.teleportTarget.y + this.vrHeightOffset;
      this.showToast('Teleported', 'vr');
    }
    this.teleportActive = false;
    this.teleportReticle.visible = false;
  }

  updateVRLocomotion(delta, frame) {
    if (!this.renderer.xr.isPresenting) return;

    const session = this.renderer.xr.getSession();
    if (!session) return;

    // 1. Update Teleport Arc / Raycasting
    if (this.teleportActive && this.activeTeleportController) {
      const tempMatrix = new THREE.Matrix4();
      tempMatrix.extractRotation(this.activeTeleportController.matrixWorld);

      const raycaster = new THREE.Raycaster();
      const origin = new THREE.Vector3().setFromMatrixPosition(this.activeTeleportController.matrixWorld);
      const direction = new THREE.Vector3(0, 0, -1).applyMatrix4(tempMatrix).normalize();
      raycaster.set(origin, direction);

      // Raycast against ground plane and current model meshes
      const targets = [this.groundPlane];
      if (this.currentModel) targets.push(this.currentModel);

      const intersects = raycaster.intersectObjects(targets, true);
      if (intersects.length > 0) {
        const hit = intersects[0];
        // Only accept reasonably horizontal surfaces
        if (hit.face && hit.face.normal.y > 0.4 || hit.object === this.groundPlane) {
          this.teleportTarget.copy(hit.point);
          this.teleportReticle.position.copy(hit.point);
          // this.teleportReticle.position.y += 0.01;
          this.teleportValid = true;
          this.teleportReticle.material.color.set(0x8b5cf6);
        } else {
          this.teleportValid = false;
          this.teleportReticle.material.color.set(0xef4444);
        }
      } else {
        this.teleportValid = false;
      }
    }

    // 2. Continuous Thumbstick Locomotion & Snap Turning
    for (const source of session.inputSources) {
      if (!source.gamepad) continue;

      // Left controller X button is button 4 in the XR standard gamepad mapping.
      const xButtonPressed = source.handedness === 'left'
        && source.gamepad.buttons[4]?.pressed === true;
      if (xButtonPressed && !this.vrExitButtonDown) {
        this.vrExitButtonDown = true;
        session.end();
        return;
      }
      if (!xButtonPressed && source.handedness === 'left') {
        this.vrExitButtonDown = false;
      }

      const axes = source.gamepad.axes;
      if (!axes || axes.length < 2) continue;

      // Primary thumbstick axes: usually indices [2, 3] or [0, 1]
      const axisX = axes.length >= 4 ? axes[2] : axes[0];
      const axisY = axes.length >= 4 ? axes[3] : axes[1];
      const deadzone = 0.15;

      // LEFT CONTROLLER -> Movement (Smooth Locomotion)
      if (source.handedness === 'left' && (this.vrLocomotionMode === 'smooth' || this.vrLocomotionMode === 'both')) {
        if (Math.abs(axisX) > deadzone || Math.abs(axisY) > deadzone) {
          const headsetEuler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
          const yaw = this.cameraRig.rotation.y + headsetEuler.y;
          const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
          const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

          const speed = 2.5 * delta;
          const moveVector = new THREE.Vector3()
            .addScaledVector(forward, -axisY * speed)
            .addScaledVector(right, axisX * speed);

          this.cameraRig.position.add(moveVector);
        }
      }

      // RIGHT CONTROLLER -> Turning (Snap Turn or Smooth Turn)
      if (source.handedness === 'right') {
        if (this.vrTurnMode === 'snap') {
          if (Math.abs(axisX) > 0.6) {
            if (!this.snapTurnDebounce) {
              const snapAngle = (axisX > 0 ? -1 : 1) * (Math.PI / 4); // 45 degrees
              this.cameraRig.rotateY(snapAngle);
              this.snapTurnDebounce = true;
            }
          } else {
            this.snapTurnDebounce = false;
          }
        } else if (this.vrTurnMode === 'smooth') {
          if (Math.abs(axisX) > deadzone) {
            const turnSpeed = 1.5 * delta;
            this.cameraRig.rotateY(-axisX * turnSpeed);
          }
        }
      }
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                            MODEL INGESTION & PARSING                       */
  /* -------------------------------------------------------------------------- */
  async loadInitialModel() {
    // 1. Check URL query parameters (e.g. ?model=my_model.glb)
    const urlParams = new URLSearchParams(window.location.search);
    const modelParam = urlParams.get('model') || urlParams.get('file');

    if (modelParam) {
      const name = modelParam.split('/').pop() || 'Model';
      this.loadGLBUrl(modelParam, name);
      return;
    }

    try {
      const models = await this.loadModelManifest();
      if (models.length > 0) {
        const model = models[0];
        this.loadGLBUrl(model.url, model.name);
        return;
      }
    } catch (error) {
      console.error('Unable to load models.json:', error);
    }

    this.showToast('No models found in the models folder', 'error');
  }

  loadModelManifest() {
    if (!this.modelManifestPromise) {
      this.modelManifestPromise = fetch('models/models.json', { cache: 'no-store' })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then((entries) => {
          if (!Array.isArray(entries)) throw new Error('models.json must contain an array');

          return entries
            .filter((entry) => typeof entry === 'string' && entry.trim())
            .map((fileName) => ({
              name: fileName,
              url: `models/${fileName.split('/').map(encodeURIComponent).join('/')}`
            }));
        });
    }

    return this.modelManifestPromise;
  }

  async populateModelMenu() {
    const menu = document.getElementById('local-model-menu');

    try {
      const models = await this.loadModelManifest();
      menu.replaceChildren();

      if (models.length === 0) {
        menu.textContent = 'No models found';
        return;
      }

      models.forEach((model) => {
        const item = document.createElement('button');
        item.className = 'menu-item';
        item.textContent = model.name;
        item.addEventListener('click', () => {
          document.getElementById('sample-menu').classList.remove('show');
          this.loadGLBUrl(model.url, model.name);
        });
        menu.appendChild(item);
      });
    } catch (error) {
      console.error('Unable to populate model menu:', error);
      menu.textContent = 'Unable to load models';
    }
  }

  loadGLBFile(file) {
    this.showSpinner(`Loading ${file.name}...`);
    const reader = new FileReader();

    reader.addEventListener('load', (event) => {
      const contents = event.target.result;
      this.gltfLoader.parse(
        contents,
        '',
        (gltf) => {
          this.processLoadedModel(gltf.scene, gltf.animations, file.name);
          this.hideSpinner();
          this.showToast(`Loaded "${file.name}"`, 'success');
        },
        (error) => {
          console.error('Error parsing GLB:', error);
          this.hideSpinner();
          this.showToast('Failed to parse 3D file', 'error');
        }
      );
    });

    reader.addEventListener('error', () => {
      this.hideSpinner();
      this.showToast('Error reading file', 'error');
    });

    reader.readAsArrayBuffer(file);
  }

  loadGLBUrl(url, displayName) {
    this.showSpinner(`Downloading ${displayName}...`);
    this.gltfLoader.load(
      url,
      (gltf) => {
        this.processLoadedModel(gltf.scene, gltf.animations, displayName);
        this.hideSpinner();
        this.showToast(`Loaded ${displayName}`, 'success');
      },
      (xhr) => {
        if (xhr.lengthComputable) {
          const percent = Math.round((xhr.loaded / xhr.total) * 100);
          this.showSpinner(`Downloading ${displayName} (${percent}%)...`);
        }
      },
      (error) => {
        console.error('Error loading remote GLB:', error);
        this.hideSpinner();
        this.showToast(`Error loading remote model: ${error.message || 'CORS / Network'}`, 'error');
      }
    );
  }

  processLoadedModel(modelScene, animations = [], name = '3D Model') {
    // 1. Clean up existing model
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      if (this.boxHelper) this.scene.remove(this.boxHelper);
      this.currentModel.traverse((node) => {
        if (node.isMesh) {
          node.geometry.dispose();
          if (Array.isArray(node.material)) {
            node.material.forEach((mat) => mat.dispose());
          } else if (node.material) {
            node.material.dispose();
          }
        }
      });
    }

    this.currentModel = modelScene;
    this.currentModel.name = name;

    // Enable shadows on all child meshes
    this.currentModel.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    this.scene.add(this.currentModel);
    document.getElementById('model-filename').textContent = name;

    // Calculate dimensions & bounding box
    const bbox = new THREE.Box3().setFromObject(this.currentModel);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    // Bounding Box Helper
    this.boxHelper = new THREE.BoxHelper(this.currentModel, 0x60a5fa);
    this.boxHelper.visible = document.getElementById('toggle-bbox').checked;
    this.scene.add(this.boxHelper);

    // Inspect statistics
    this.updateModelStats(this.currentModel, size);

    // Setup Animations
    this.setupAnimations(animations);

    // Set starting view to comfortable lower human eye height (1.1m)
    this.resetCameraToVRStart();
  }

  updateModelStats(model, size) {
    let triangles = 0;
    let vertices = 0;
    let meshes = 0;
    const materialSet = new Set();

    model.traverse((node) => {
      if (node.isMesh) {
        meshes++;
        if (node.geometry) {
          const geo = node.geometry;
          if (geo.index) {
            triangles += geo.index.count / 3;
          } else if (geo.attributes.position) {
            triangles += geo.attributes.position.count / 3;
          }
          if (geo.attributes.position) {
            vertices += geo.attributes.position.count;
          }
        }
        if (node.material) {
          if (Array.isArray(node.material)) {
            node.material.forEach((m) => materialSet.add(m));
          } else {
            materialSet.add(node.material);
          }
        }
      }
    });

    document.getElementById('stat-triangles').textContent = triangles.toLocaleString();
    document.getElementById('stat-vertices').textContent = vertices.toLocaleString();
    document.getElementById('stat-meshes').textContent = meshes.toLocaleString();
    document.getElementById('stat-materials').textContent = materialSet.size.toLocaleString();
    document.getElementById('stat-dimensions').textContent = 
      `${size.x.toFixed(2)}m × ${size.y.toFixed(2)}m × ${size.z.toFixed(2)}m`;
  }

  /* -------------------------------------------------------------------------- */
  /*                               ANIMATION SYSTEM                             */
  /* -------------------------------------------------------------------------- */
  setupAnimations(animations) {
    this.modelAnimations = animations || [];
    const animBar = document.getElementById('anim-bar');
    const animSelect = document.getElementById('anim-select');

    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }

    if (this.modelAnimations.length === 0) {
      animBar.classList.add('hidden');
      return;
    }

    animBar.classList.remove('hidden');
    animSelect.innerHTML = '';

    this.mixer = new THREE.AnimationMixer(this.currentModel);

    this.modelAnimations.forEach((clip, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = clip.name || `Clip ${index + 1}`;
      animSelect.appendChild(option);
    });

    this.playAnimationClip(0);
  }

  playAnimationClip(index) {
    if (!this.mixer || !this.modelAnimations[index]) return;

    if (this.activeAction) {
      this.activeAction.fadeOut(0.2);
    }

    const clip = this.modelAnimations[index];
    this.activeAction = this.mixer.clipAction(clip);
    this.activeAction.reset().fadeIn(0.2).play();

    this.updatePlayPauseIcon(true);
  }

  toggleAnimationPlayback() {
    if (!this.activeAction) return;
    if (this.activeAction.paused) {
      this.activeAction.paused = false;
      this.updatePlayPauseIcon(true);
    } else {
      this.activeAction.paused = true;
      this.updatePlayPauseIcon(false);
    }
  }

  updatePlayPauseIcon(isPlaying) {
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    if (isPlaying) {
      playIcon.classList.add('hidden');
      pauseIcon.classList.remove('hidden');
    } else {
      playIcon.classList.remove('hidden');
      pauseIcon.classList.add('hidden');
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                             CAMERA PRESET VIEWS                            */
  /* -------------------------------------------------------------------------- */
  resetCameraToVRStart() {
    const height = 1.1 + this.vrHeightOffset;
    if (this.navMode === 'walk') {
      this.cameraRig.position.set(0, height, 2.5);
      this.camera.position.set(0, 0, 0);
      this.cameraEuler.set(0, 0, 0, 'YXZ');
      this.camera.quaternion.setFromEuler(this.cameraEuler);
    } else {
      this.cameraRig.position.set(0, 0, 0);
      this.camera.position.set(0, height, 2.5);
      this.camera.lookAt(0, height * 0.9, 0);
      this.cameraEuler.set(0, 0, 0, 'YXZ');
      this.camera.quaternion.setFromEuler(this.cameraEuler);
      if (this.orbitControls) {
        this.orbitControls.target.set(0, height * 0.9, 0);
        this.orbitControls.update();
      }
    }
  }

  fitCameraToBounds() {
    if (!this.currentModel) return;

    const bbox = new THREE.Box3().setFromObject(this.currentModel);
    const sphere = bbox.getBoundingSphere(new THREE.Sphere());
    const radius = Math.max(sphere.radius, 1.0);
    const fov = this.camera.fov * (Math.PI / 180);
    const distance = (radius / Math.sin(fov / 2)) * 1.35;

    this.cameraRig.position.set(0, 0, 0);
    this.camera.position.set(sphere.center.x, sphere.center.y + radius * 0.4, sphere.center.z + distance);
    this.camera.lookAt(sphere.center);

    this.orbitControls.target.copy(sphere.center);
    this.orbitControls.update();
  }

  setViewPreset(view) {
    if (!this.currentModel) return;

    const bbox = new THREE.Box3().setFromObject(this.currentModel);
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 2.0);
    const distance = maxDim * 1.8;

    this.cameraRig.position.set(0, 0, 0);

    switch (view) {
      case 'top':
        this.camera.position.set(center.x, center.y + distance, center.z + 0.001);
        break;
      case 'front':
        this.camera.position.set(center.x, center.y, center.z + distance);
        break;
      case 'iso':
        this.camera.position.set(center.x + distance * 0.7, center.y + distance * 0.6, center.z + distance * 0.7);
        break;
    }

    this.camera.lookAt(center);
    this.orbitControls.target.copy(center);
    this.orbitControls.update();
  }

  /* -------------------------------------------------------------------------- */
  /*                              USER INTERFACE                                */
  /* -------------------------------------------------------------------------- */
  initUI() {
    // 1. File Input
    const fileInput = document.getElementById('file-input');
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.loadGLBFile(e.target.files[0]);
      }
    });

    // 2. Sample Models Dropdown
    const sampleBtn = document.getElementById('sample-models-btn');
    const sampleMenu = document.getElementById('sample-menu');
    sampleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sampleMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      sampleMenu.classList.remove('show');
    });

    this.populateModelMenu();

    // 3. Navigation Modes
    document.getElementById('mode-orbit').addEventListener('click', () => this.setNavMode('orbit'));
    document.getElementById('mode-walk').addEventListener('click', () => this.setNavMode('walk'));

    // View presets
    document.getElementById('btn-view-reset').addEventListener('click', () => this.resetCameraToVRStart());
    document.getElementById('btn-fit-view').addEventListener('click', () => this.fitCameraToBounds());
    document.getElementById('btn-view-top').addEventListener('click', () => this.setViewPreset('top'));
    document.getElementById('btn-view-front').addEventListener('click', () => this.setViewPreset('front'));
    document.getElementById('btn-view-iso').addEventListener('click', () => this.setViewPreset('iso'));

    // 4. Animation Bar Controls
    document.getElementById('anim-play-pause').addEventListener('click', () => this.toggleAnimationPlayback());
    document.getElementById('anim-select').addEventListener('change', (e) => {
      this.playAnimationClip(parseInt(e.target.value, 10));
    });
    document.getElementById('anim-speed').addEventListener('change', (e) => {
      if (this.mixer) this.mixer.timeScale = parseFloat(e.target.value);
    });

    const scrub = document.getElementById('anim-scrub');
    scrub.addEventListener('input', (e) => {
      if (this.activeAction) {
        this.activeAction.paused = true;
        this.activeAction.time = parseFloat(e.target.value) * this.activeAction.getClip().duration;
        this.mixer.update(0);
        this.updatePlayPauseIcon(false);
      }
    });

    // 5. Side Panel Toggle
    const sidePanel = document.getElementById('side-panel');
    document.getElementById('toggle-panel-btn').addEventListener('click', () => {
      sidePanel.classList.toggle('collapsed');
    });
    document.getElementById('close-panel-btn').addEventListener('click', () => {
      sidePanel.classList.add('collapsed');
    });

    // 6. Lighting & View Options
    document.getElementById('env-preset').addEventListener('change', (e) => {
      this.setLightingPreset(e.target.value);
    });

    document.getElementById('light-intensity').addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.mainLight.intensity = val * 1.25;
      this.ambientLight.intensity = val * 0.6;
    });

    document.getElementById('exposure').addEventListener('input', (e) => {
      this.renderer.toneMappingExposure = parseFloat(e.target.value);
    });

    document.getElementById('bg-color').addEventListener('input', (e) => {
      this.scene.background.set(e.target.value);
    });

    // View Checkboxes
    document.getElementById('toggle-grid').addEventListener('change', (e) => {
      this.gridHelper.visible = e.target.checked;
    });

    document.getElementById('toggle-shadows').addEventListener('change', (e) => {
      this.groundPlane.visible = e.target.checked;
    });

    document.getElementById('toggle-wireframe').addEventListener('change', (e) => {
      if (this.currentModel) {
        this.currentModel.traverse((node) => {
          if (node.isMesh && node.material) {
            if (Array.isArray(node.material)) {
              node.material.forEach((m) => (m.wireframe = e.target.checked));
            } else {
              node.material.wireframe = e.target.checked;
            }
          }
        });
      }
    });

    document.getElementById('toggle-bbox').addEventListener('change', (e) => {
      if (this.boxHelper) this.boxHelper.visible = e.target.checked;
    });

    document.getElementById('toggle-autorotate').addEventListener('change', (e) => {
      this.autoRotate = e.target.checked;
    });

    // VR Settings
    document.getElementById('vr-locomotion-mode').addEventListener('change', (e) => {
      this.vrLocomotionMode = e.target.value;
    });

    document.getElementById('vr-turn-mode').addEventListener('change', (e) => {
      this.vrTurnMode = e.target.value;
    });

    document.getElementById('vr-height-offset').addEventListener('input', (e) => {
      const oldOffset = this.vrHeightOffset;
      this.vrHeightOffset = parseFloat(e.target.value);
      const diff = this.vrHeightOffset - oldOffset;
      if (this.navMode === 'walk') {
        this.cameraRig.position.y += diff;
      } else if (!this.renderer.xr.isPresenting) {
        this.camera.position.y += diff;
        this.orbitControls.target.y += diff;
      }
    });

    // 7. Help Modal Dialog
    const helpDialog = document.getElementById('help-dialog');
    document.getElementById('help-btn').addEventListener('click', () => helpDialog.showModal());
    document.getElementById('close-help-btn').addEventListener('click', () => helpDialog.close());
    document.getElementById('close-help-confirm-btn').addEventListener('click', () => helpDialog.close());
  }

  /* -------------------------------------------------------------------------- */
  /*                            DRAG AND DROP HANDLERS                          */
  /* -------------------------------------------------------------------------- */
  initDragAndDrop() {
    const overlay = document.getElementById('drop-overlay');
    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      overlay.classList.add('active');
    });

    window.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        overlay.classList.remove('active');
      }
    });

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      overlay.classList.remove('active');

      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.name.match(/\.(glb|gltf)$/i)) {
          this.loadGLBFile(file);
        } else {
          this.showToast('Please drop a .glb or .gltf file', 'error');
        }
      }
    });
  }

  /* -------------------------------------------------------------------------- */
  /*                             RENDER & ANIMATION LOOP                        */
  /* -------------------------------------------------------------------------- */
  render(time, frame) {
    const delta = this.clock.getDelta();

    // 1. Update Animation Mixer
    if (this.mixer) {
      this.mixer.update(delta);

      if (this.activeAction && !this.activeAction.paused) {
        const duration = this.activeAction.getClip().duration;
        const progress = duration > 0 ? (this.activeAction.time % duration) / duration : 0;
        document.getElementById('anim-scrub').value = progress;
        
        const curSec = Math.floor(this.activeAction.time % duration);
        const totSec = Math.floor(duration);
        document.getElementById('anim-time').textContent = 
          `${Math.floor(curSec / 60)}:${(curSec % 60).toString().padStart(2, '0')} / ${Math.floor(totSec / 60)}:${(totSec % 60).toString().padStart(2, '0')}`;
      }
    }

    // 2. Auto-rotate Model
    if (this.autoRotate && this.currentModel && !this.renderer.xr.isPresenting) {
      this.currentModel.rotation.y += delta * 0.4;
      if (this.boxHelper) this.boxHelper.update();
    }

    // 3. Desktop Controls Update
    if (!this.renderer.xr.isPresenting) {
      if (this.navMode === 'orbit') {
        this.orbitControls.update();
      } else if (this.navMode === 'walk') {
        this.updateDesktopWalk(delta);
      }
    }

    // 4. WebXR VR Locomotion Update
    this.updateVRLocomotion(delta, frame);

    // 5. Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /* -------------------------------------------------------------------------- */
  /*                             TOASTS & FEEDBACK                              */
  /* -------------------------------------------------------------------------- */
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  showSpinner(text = 'Loading 3D Model...') {
    const spinner = document.getElementById('loading-spinner');
    document.getElementById('loading-text').textContent = text;
    spinner.classList.remove('hidden');
  }

  hideSpinner() {
    document.getElementById('loading-spinner').classList.add('hidden');
  }
}

// Initialize Application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new VRGLBViewer();
});
