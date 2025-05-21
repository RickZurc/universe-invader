import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GameConfig } from '../config/GameConfig';
import { ParticleSystem } from '../systems/ParticleSystem';

export class PlayerManager {
    private scene: THREE.Scene;
    private playerShip: THREE.Group;
    private health: number;
    private maxHealth: number;
    private moveSpeed: number;
    private thrusterParticles: THREE.Points;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.health = GameConfig.INITIAL_HEALTH;
        this.maxHealth = GameConfig.INITIAL_MAX_HEALTH;
        this.moveSpeed = GameConfig.INITIAL_MOVE_SPEED;
        
        // Create player ship group
        this.playerShip = new THREE.Group();
        this.createTemporaryShip();
        this.loadPlayerModel();
        
        // Create player light
        const playerLight = new THREE.PointLight(0x00ff00, 2, 15);
        playerLight.position.copy(this.playerShip.position);
        scene.add(playerLight);
        
        // Create thruster particles
        this.thrusterParticles = ParticleSystem.createThrusterParticles();
        this.thrusterParticles.position.y = -1;
        this.playerShip.add(this.thrusterParticles);
        
        // Set initial position
        this.playerShip.position.y = -8;
        scene.add(this.playerShip);
    }

    private createTemporaryShip() {
        const tempGeometry = new THREE.ConeGeometry(1, 2, 3);
        const tempMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x00ff00,
            emissive: 0x002200,
            shininess: 50
        });
        const tempShip = new THREE.Mesh(tempGeometry, tempMaterial);
        this.playerShip.add(tempShip);
    }

    private loadPlayerModel() {
        const loader = new GLTFLoader();
        loader.load(
            '/src/SpaceshipPlayer.glb',
            (gltf) => {
                // Remove temporary ship
                this.playerShip.remove(this.playerShip.children[0]);
                
                // Add the loaded model
                const model = gltf.scene;
                model.scale.set(0.005, 0.005, 0.005);
                model.rotation.set(90, Math.PI, 0);
                
                this.playerShip.add(model);
                
                // Reposition thrusters for new model
                if (this.thrusterParticles) {
                    this.thrusterParticles.position.y = -1.5;
                }
            },
            undefined,
            (error) => {
                console.error('An error occurred loading the model:', error);
            }
        );
    }

    update(
        moveLeft: boolean, 
        moveRight: boolean, 
        moveUp: boolean, 
        moveDown: boolean,
        mouseWorldPosition: THREE.Vector3
    ) {
        // Update movement
        if (moveLeft) this.playerShip.position.x -= this.moveSpeed;
        if (moveRight) this.playerShip.position.x += this.moveSpeed;
        if (moveUp) this.playerShip.position.y += this.moveSpeed;
        if (moveDown) this.playerShip.position.y -= this.moveSpeed;

        // Update rotation
        const dx = mouseWorldPosition.x - this.playerShip.position.x;
        const dy = mouseWorldPosition.y - this.playerShip.position.y;
        const angle = Math.atan2(dy, dx);
        this.playerShip.rotation.z = angle - Math.PI / 2;

        // Update thruster particles
        const isMoving = moveLeft || moveRight || moveUp || moveDown;
        ParticleSystem.updateThrusterParticles(
            this.thrusterParticles,
            isMoving,
            moveUp,
            moveDown,
            moveLeft,
            moveRight
        );
    }

    getShip() {
        return this.playerShip;
    }

    getHealth() {
        return this.health;
    }

    getMaxHealth() {
        return this.maxHealth;
    }

    getMoveSpeed(): number {
        return this.moveSpeed;
    }

    setHealth(health: number) {
        this.health = health;
    }

    setMaxHealth(maxHealth: number) {
        this.maxHealth = maxHealth;
    }

    setMoveSpeed(speed: number) {
        this.moveSpeed = speed;
    }

    takeDamage(damage: number) {
        this.health -= damage;
        // Create damage effect
        ParticleSystem.createExplosion(this.scene, this.playerShip.position.clone(), 0xff0000);
    }

    reset() {
        this.health = GameConfig.INITIAL_HEALTH;
        this.maxHealth = GameConfig.INITIAL_MAX_HEALTH;
        this.moveSpeed = GameConfig.INITIAL_MOVE_SPEED;
        this.playerShip.position.set(0, 0, 0);
    }
}
