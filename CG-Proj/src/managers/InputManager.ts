import * as THREE from 'three';

export class InputManager {
    private static instance: InputManager;
    
    moveLeft: boolean = false;
    moveRight: boolean = false;
    moveUp: boolean = false;
    moveDown: boolean = false;
    isShooting: boolean = false;
    isKnockback: boolean = false;
    isSecondaryFire: boolean = false;
    private _isEMPDeploy: boolean = false;
    private _isShieldOverdrive: boolean = false;
    mouse: THREE.Vector2;
    mouseWorldPosition: THREE.Vector3;

    get isEMPDeploy(): boolean {
        return this._isEMPDeploy;
    }

    get isShieldOverdrive(): boolean {
        return this._isShieldOverdrive;
    }

    private constructor() {
        this.mouse = new THREE.Vector2();
        this.mouseWorldPosition = new THREE.Vector3();
        this.setupEventListeners();
    }

    static getInstance(): InputManager {
        if (!InputManager.instance) {
            InputManager.instance = new InputManager();
        }
        return InputManager.instance;
    }

    private setupEventListeners() {
        document.addEventListener('keydown', (event) => this.handleKeyDown(event));
        document.addEventListener('keyup', (event) => this.handleKeyUp(event));
        document.addEventListener('mousemove', (event) => this.handleMouseMove(event));
    }

    private handleKeyDown(event: KeyboardEvent) {
        switch (event.key.toLowerCase()) {
            case 'a': this.moveLeft = true; break;
            case 'd': this.moveRight = true; break;
            case 'w': this.moveUp = true; break;
            case 's': this.moveDown = true; break;
            case ' ': this.isShooting = true; break;
            case 'q': this.isKnockback = true; break;
            case 'e': this._isEMPDeploy = true; break;
            case 'f': this._isShieldOverdrive = true; break;
            case 'r': this.isSecondaryFire = true; break;
        }
    }

    private handleKeyUp(event: KeyboardEvent) {
        switch (event.key.toLowerCase()) {
            case 'a': this.moveLeft = false; break;
            case 'd': this.moveRight = false; break;
            case 'w': this.moveUp = false; break;
            case 's': this.moveDown = false; break;
            case ' ': this.isShooting = false; break;
            case 'q': this.isKnockback = false; break;
            case 'e': this._isEMPDeploy = false; break;
            case 'f': this._isShieldOverdrive = false; break;
            case 'r': this.isSecondaryFire = false; break;
        }
    }

    private handleMouseMove(event: MouseEvent) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    updateMouseWorldPosition(camera: THREE.Camera) {
        const vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5);
        vector.unproject(camera);
        const dir = vector.sub(camera.position).normalize();
        const distance = -camera.position.z / dir.z;
        this.mouseWorldPosition.copy(camera.position).add(dir.multiplyScalar(distance));
        this.mouseWorldPosition.z = 0;
    }

    isMoving(): boolean {
        return this.moveLeft || this.moveRight || this.moveUp || this.moveDown;
    }
}
