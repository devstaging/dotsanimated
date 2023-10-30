import * as THREE from "https://cdn.skypack.dev/three@0.124.0";
import ky from "https://cdn.skypack.dev/kyouka@1.2.2";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.124.0/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.124.0/examples/jsm/loaders/GLTFLoader";
import { FBXLoader } from "https://cdn.skypack.dev/three@0.124.0/examples/jsm/loaders/FBXLoader";
import { EffectComposer } from "https://cdn.skypack.dev/three@0.124.0/examples/jsm/postprocessing/EffectComposer";
import Stats from "https://cdn.skypack.dev/three@0.124.0/examples/jsm/libs/stats.module";
import * as dat from "https://cdn.skypack.dev/dat.gui@0.7.7";

const calcAspect = (el: HTMLElement) => el.clientWidth / el.clientHeight;

class Base {
  debug: boolean;
  container: HTMLElement | null;
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  rendererParams!: Record<string, any>;
  perspectiveCameraParams!: Record<string, any>;
  orthographicCameraParams!: Record<string, any>;
  cameraPosition!: THREE.Vector3;
  lookAtPosition!: THREE.Vector3;
  renderer!: THREE.WebGLRenderer;
  controls!: OrbitControls;
  mousePos!: THREE.Vector2;
  raycaster!: THREE.Raycaster;
  sound!: THREE.Audio;
  stats!: Stats;
  composer!: EffectComposer;
  constructor(sel: string, debug = false) {
    this.debug = debug;
    this.container = document.querySelector(sel);
    this.perspectiveCameraParams = {
      fov: 75,
      near: 0.1,
      far: 100
    };
    this.orthographicCameraParams = {
      zoom: 2,
      near: -100,
      far: 1000
    };
    this.cameraPosition = new THREE.Vector3(0, 3, 10);
    this.lookAtPosition = new THREE.Vector3(0, 0, 0);
    this.rendererParams = {
      outputEncoding: THREE.LinearEncoding,
      config: {
        alpha: true,
        antialias: true
      }
    };
    this.mousePos = new THREE.Vector2(0, 0);
  }
  // 初始化
  init() {
    this.createScene();
    this.createPerspectiveCamera();
    this.createRenderer();
    this.createMesh({});
    this.createLight();
    this.createOrbitControls();
    this.addListeners();
    this.setLoop();
  }
  // 创建场景
  createScene() {
    const scene = new THREE.Scene();
    if (this.debug) {
      scene.add(new THREE.AxesHelper());
      const stats = Stats();
      this.container!.appendChild(stats.dom);
      this.stats = stats;
    }
    this.scene = scene;
  }
  // 创建透视相机
  createPerspectiveCamera() {
    const { perspectiveCameraParams, cameraPosition, lookAtPosition } = this;
    const { fov, near, far } = perspectiveCameraParams;
    const aspect = calcAspect(this.container!);
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.copy(cameraPosition);
    camera.lookAt(lookAtPosition);
    this.camera = camera;
  }
  // 创建正交相机
  createOrthographicCamera() {
    const { orthographicCameraParams, cameraPosition, lookAtPosition } = this;
    const { left, right, top, bottom, near, far } = orthographicCameraParams;
    const camera = new THREE.OrthographicCamera(
      left,
      right,
      top,
      bottom,
      near,
      far
    );
    camera.position.copy(cameraPosition);
    camera.lookAt(lookAtPosition);
    this.camera = camera;
  }
  // 更新正交相机参数
  updateOrthographicCameraParams() {
    const { container } = this;
    const { zoom, near, far } = this.orthographicCameraParams;
    const aspect = calcAspect(container!);
    this.orthographicCameraParams = {
      left: -zoom * aspect,
      right: zoom * aspect,
      top: zoom,
      bottom: -zoom,
      near,
      far,
      zoom
    };
  }
  // 创建渲染
  createRenderer() {
    const { rendererParams } = this;
    const { outputEncoding, config } = rendererParams;
    const renderer = new THREE.WebGLRenderer(config);
    renderer.setSize(this.container!.clientWidth, this.container!.clientHeight);
    renderer.outputEncoding = outputEncoding;
    this.resizeRendererToDisplaySize();
    this.container?.appendChild(renderer.domElement);
    this.renderer = renderer;
    this.renderer.setClearColor(0x2A647B, 0);
  }
  // 允许投影
  enableShadow() {
    this.renderer.shadowMap.enabled = true;
  }
  // 调整渲染器尺寸
  resizeRendererToDisplaySize() {
    const { renderer } = this;
    if (!renderer) {
      return;
    }
    const canvas = renderer.domElement;
    const pixelRatio = window.devicePixelRatio;
    const { clientWidth, clientHeight } = canvas;
    const width = (clientWidth * pixelRatio) | 0;
    const height = (clientHeight * pixelRatio) | 0;
    const isResizeNeeded = canvas.width !== width || canvas.height !== height;
    if (isResizeNeeded) {
      renderer.setSize(width, height, false);
    }
    return isResizeNeeded;
  }
  // 创建网格
  createMesh(
    meshObject: MeshObject,
    container: THREE.Scene | THREE.Mesh = this.scene
  ) {
    const {
      geometry = new THREE.BoxGeometry(1, 1, 1),
      material = new THREE.MeshStandardMaterial({
        color: new THREE.Color("#000000")
      }),
      position = new THREE.Vector3(0, 0, 0)
    } = meshObject;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    container.add(mesh);
    return mesh;
  }
  // 创建光源
  createLight() {
    const dirLight = new THREE.DirectionalLight(
      new THREE.Color("#000000"),
      0.5
    );
    dirLight.position.set(0, 50, 0);
    this.scene.add(dirLight);
    const ambiLight = new THREE.AmbientLight(new THREE.Color("#2A647B"), 1);
    this.scene.add(ambiLight);
  }
  // 创建轨道控制
  createOrbitControls() {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    const { lookAtPosition } = this;
    controls.target.copy(lookAtPosition);
    controls.update();
    this.controls = controls;
  }
  // 监听事件
  addListeners() {
    this.onResize();
  }
  // 监听画面缩放
  onResize() {
    window.addEventListener("resize", (e) => {
      if (this.camera instanceof THREE.PerspectiveCamera) {
        const aspect = calcAspect(this.container!);
        const camera = this.camera as THREE.PerspectiveCamera;
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      } else if (this.camera instanceof THREE.OrthographicCamera) {
        this.updateOrthographicCameraParams();
        const camera = this.camera as THREE.OrthographicCamera;
        const {
          left,
          right,
          top,
          bottom,
          near,
          far
        } = this.orthographicCameraParams;
        camera.left = left;
        camera.right = right;
        camera.top = top;
        camera.bottom = bottom;
        camera.near = near;
        camera.far = far;
        camera.updateProjectionMatrix();
      }
      this.renderer.setSize(
        this.container!.clientWidth,
        this.container!.clientHeight
      );
    });
  }
  // 动画
  update() {
    console.log("animation");
  }
  // 渲染
  setLoop() {
    this.renderer.setAnimationLoop(() => {
      this.resizeRendererToDisplaySize();
      this.update();
      if (this.controls) {
        this.controls.update();
      }
      if (this.stats) {
        this.stats.update();
      }
      if (this.composer) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    });
  }
  // 创建文本
  createText(
    text = "",
    config: THREE.TextGeometryParameters,
    material: THREE.Material = new THREE.MeshStandardMaterial({
      color: "#ffffff"
    })
  ) {
    const geo = new THREE.TextGeometry(text, config);
    const mesh = new THREE.Mesh(geo, material);
    return mesh;
  }
  // 创建音效源
  createAudioSource() {
    const listener = new THREE.AudioListener();
    this.camera.add(listener);
    const sound = new THREE.Audio(listener);
    this.sound = sound;
  }
  // 加载音效
  loadAudio(url: string): Promise<AudioBuffer> {
    const loader = new THREE.AudioLoader();
    return new Promise((resolve) => {
      loader.load(url, (buffer) => {
        this.sound.setBuffer(buffer);
        resolve(buffer);
      });
    });
  }
  // 加载模型
  loadModel(url: string): Promise<THREE.Object3D> {
    const loader = new GLTFLoader();
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          resolve(model);
        },
        undefined,
        (err) => {
          console.log(err);
          reject();
        }
      );
    });
  }
  // 加载FBX模型
  loadFBXModel(url: string): Promise<THREE.Object3D> {
    const loader = new FBXLoader();
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (obj) => {
          resolve(obj);
        },
        undefined,
        (err) => {
          console.log(err);
          reject();
        }
      );
    });
  }
  // 加载字体
  loadFont(url: string): Promise<THREE.Font> {
    const loader = new THREE.FontLoader();
    return new Promise((resolve) => {
      loader.load(url, (font) => {
        resolve(font);
      });
    });
  }
  // 创建点选模型
  createRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.trackMousePos();
  }
  // 追踪鼠标位置
  trackMousePos() {
    window.addEventListener("mousemove", (e) => {
      this.setMousePos(e);
    });
    window.addEventListener("mouseout", () => {
      this.clearMousePos();
    });
    window.addEventListener("mouseleave", () => {
      this.clearMousePos();
    });
    window.addEventListener(
      "touchstart",
      (e: TouchEvent) => {
        e.preventDefault();
        this.setMousePos(e.touches[0]);
      },
      { passive: false }
    );
    window.addEventListener("touchmove", (e: TouchEvent) => {
      this.setMousePos(e.touches[0]);
    });
    window.addEventListener("touchend", () => {
      this.clearMousePos();
    });
  }
  // 设置鼠标位置
  setMousePos(e: MouseEvent | Touch) {
    const { x, y } = getNormalizedMousePos(e);
    this.mousePos.x = x;
    this.mousePos.y = y;
  }
  // 清空鼠标位置
  clearMousePos() {
    this.mousePos.x = -100000;
    this.mousePos.y = -100000;
  }
  // 获取点击物
  getInterSects(): THREE.Intersection[] {
    this.raycaster.setFromCamera(this.mousePos, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.scene.children,
      true
    );
    return intersects;
  }
  // 选中点击物时
  onChooseIntersect(target: THREE.Object3D) {
    const intersects = this.getInterSects();
    const intersect = intersects[0];
    if (!intersect || !intersect.face) {
      return null;
    }
    const { object } = intersect;
    return target === object ? intersect : null;
  }
}

class GridWave extends Base {
  params: any;
  dimension: number;
  clock: THREE.Clock;
  points: THREE.Points | null;
  geo: THREE.BufferGeometry | null;
  mat: THREE.PointsMaterial | null;
  positions: any[];
  constructor(sel: string, debug: boolean) {
    super(sel, debug);
    this.dimension = 3;
    this.clock = new THREE.Clock();
    this.points = null;
    this.geo = null;
    this.mat = null;
    this.positions = [];
    this.perspectiveCameraParams.fov = 30;
    this.perspectiveCameraParams.near = 1;
    this.perspectiveCameraParams.far = 1500;
    this.cameraPosition = new THREE.Vector3(0, 15, 33);
    this.params = {
      row: 128,
      col: 128,
      size: 0.1,
      speed: 2,
      rate: 6
    };
  }
  // 初始化
  async init() {
    this.createScene();
    this.createPerspectiveCamera();
    this.createRenderer();
    this.createGrid();
    this.createLight();
    this.createOrbitControls();
    // this.createDebugPanel();
    this.addListeners();
    this.setLoop();
  }
  // 创建网格数组
  createGridArray(row: number, col: number) {
    const gridArray = ky.initialize2DArray(row, col);
    for (let i = 0; i < row; i++) {
      for (let j = 0; j < col; j++) {
        gridArray[i][j] = [i, 0, j];
      }
    }
    return gridArray;
  }
  // 创建网格
  createGrid() {
    const { params, dimension } = this;
    const { row, col, size } = params;
    const geo = new THREE.BufferGeometry();
    const rawPositions = this.createGridArray(row, col);
    this.positions = rawPositions;
    const positions = new Float32Array(rawPositions.flat(2));
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, dimension)
    );
    this.geo = geo;
    const mat = new THREE.PointsMaterial({
      size,
      color: 0x2A647B,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.mat = mat;
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    points.position.set(-(row - 1) / 2, 0, -(col - 1) / 2);
    this.points = points;
  }
  // 动画
  update() {
    if (this.points) {
      const { params, positions, clock, geo } = this;
      const { row, col, speed, rate } = params;
      const elapsedTime = clock.getElapsedTime();
      for (let i = 0; i < row; i++) {
        for (let j = 0; j < col; j++) {
          const pos = positions[i][j];
          const xValue = pos[0];
          const zValue = pos[2];
          pos[1] = Math.sin(elapsedTime * speed + (xValue + zValue) / rate);
        }
      }
      geo.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(positions.flat(2)), 3)
      );
      geo.attributes.position.needsUpdate = true;
    }
  }
  // 创建调试面板
  createDebugPanel() {
    const gui = new dat.GUI();
    gui
      .add(this.params, "row")
      .min(2)
      .max(256)
      .step(1)
      .onFinishChange(() => {
        this.regenerateGrid();
      });
    gui
      .add(this.params, "col")
      .min(2)
      .max(256)
      .step(1)
      .onFinishChange(() => {
        this.regenerateGrid();
      });
    gui
      .add(this.params, "size")
      .min(0.001)
      .max(1)
      .step(0.001)
      .onFinishChange(() => {
        this.regenerateGrid();
      });
    gui
      .add(this.params, "speed")
      .min(1)
      .max(10)
      .step(0.1)
      .onFinishChange(() => {
        this.regenerateGrid();
      });
    gui
      .add(this.params, "rate")
      .min(1)
      .max(10)
      .step(0.1)
      .onFinishChange(() => {
        this.regenerateGrid();
      });
  }
  // 重新生成网格
  regenerateGrid() {
    this.geo.dispose();
    this.mat.dispose();
    this.scene.remove(this.points!);
    this.createGrid();
  }
}

const start = () => {
  const gridWave = new GridWave(".grid-wave", false);
  gridWave.init();
};

start();
