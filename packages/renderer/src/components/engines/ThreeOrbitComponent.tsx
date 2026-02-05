import * as THREE from 'three';
import { ThreeSceneBase, type ThreeSceneProps } from '../../engines/ThreeSceneBase.js';
import { resolveCssVar } from '../../engines/utils.js';

export type ThreeOrbitProps = ThreeSceneProps & {
  cubeSize?: number;
};

export class ThreeOrbitComponent extends ThreeSceneBase<ThreeOrbitProps> {
  static defaultProps = {
    dataEngine: 'three',
  };

  private cube: THREE.Mesh | null = null;
  private ring: THREE.Mesh | null = null;
  private dirLight: THREE.DirectionalLight | null = null;

  protected buildScene(size: { width: number; height: number }) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, size.width / size.height, 0.1, 2000);
    camera.position.set(0, 0, 600);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const cubeSize = this.props.cubeSize ?? 160;
    const cubeGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const cubeMat = new THREE.MeshStandardMaterial({
      color: 0x4f46e5,
      roughness: 0.35,
      metalness: 0.1,
      flatShading: true,
    });
    this.cube = new THREE.Mesh(cubeGeo, cubeMat);
    scene.add(this.cube);

    const ringGeo = new THREE.TorusGeometry(cubeSize * 0.9, 6, 16, 100);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.8,
      metalness: 0,
      flatShading: true,
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    scene.add(this.ring);

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.05);
    dir.position.set(220, 260, 420);
    scene.add(dir);
    this.dirLight = dir;

    return { scene, camera, renderer };
  }

  protected renderFrame(ctx: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer }, frame: number, fps: number) {
    if (this.cube) {
      const t = frame / Math.max(1, fps);
      this.cube.rotation.x = t * 0.7;
      this.cube.rotation.y = t * 1.1;
    }
    if (this.ring) {
      const t = frame / Math.max(1, fps);
      this.ring.rotation.x = t * 0.3;
      this.ring.rotation.y = t * 0.5;
    }

    const container = this.containerRef.current;
    if (container) {
      const accent = resolveCssVar(container, '--color-accent', '#4f46e5');
      const surface = resolveCssVar(container, '--color-muted-more', '#334155');
      if (this.cube) {
        (this.cube.material as THREE.MeshStandardMaterial).color = new THREE.Color(accent);
      }
      if (this.ring) {
        (this.ring.material as THREE.MeshStandardMaterial).color = new THREE.Color(surface);
      }
      if (this.dirLight) {
        // Slightly warm key light keeps the cube readable in dark mode themes.
        this.dirLight.color = new THREE.Color('#ffffff');
      }
    }

    ctx.scene.position.z = 0;
  }
}
