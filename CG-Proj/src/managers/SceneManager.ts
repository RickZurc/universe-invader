import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig';

export class SceneManager {    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private starField!: THREE.Points;

    constructor() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        this.setupRenderer();
        this.setupCamera();
        this.setupLighting();
        this.createStarfield();
        this.setupWindowResize();
    }

    private setupRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);
    }

    private setupCamera() {
        this.camera.position.z = 30;
    }

    private setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404080, 4);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
        directionalLight.position.set(0, 1, 1);
        this.scene.add(directionalLight);
    }

    private createStarfield() {
        const starGeometry = new THREE.BufferGeometry();
        const starVertices = [];
        
        for(let i = 0; i < GameConfig.STAR_COUNT; i++) {
            const x = (Math.random() - 0.5) * 2000;
            const y = (Math.random() - 0.5) * 2000;
            const z = -Math.random() * 2000;
            starVertices.push(x, y, z);
        }
        
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        const starMaterial = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 1 });
        this.starField = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(this.starField);
    }

    private setupWindowResize() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    updateCamera(playerPosition: THREE.Vector3) {
        const smoothness = GameConfig.CAMERA_SMOOTHNESS;
        this.camera.position.x += (playerPosition.x - this.camera.position.x) * smoothness;
        this.camera.position.y += (playerPosition.y - this.camera.position.y) * smoothness;
        this.camera.lookAt(playerPosition.x, playerPosition.y, 0);
    }

    updateStarfield(cameraPosition: THREE.Vector3) {
        this.starField.rotation.z += 0.0001;
        this.starField.position.x = cameraPosition.x * 0.3;
        this.starField.position.y = cameraPosition.y * 0.3;
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    getScene() {
        return this.scene;
    }

    getCamera() {
        return this.camera;
    }
}
