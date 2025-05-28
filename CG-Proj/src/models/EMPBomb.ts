import * as THREE from 'three';
import { Enemy } from './Enemy';
import { GameConfig } from '../config/GameConfig';
import { ParticleSystem } from '../systems/ParticleSystem';

export class EMPBomb extends THREE.Mesh {
    private creationTime: number;
    private scene: THREE.Scene;
    private affectedEnemies: Map<Enemy, number> = new Map(); // enemy -> unfreeze time
    private lastPulseTime: number = 0;
    private effectMesh: THREE.Mesh;

    constructor(scene: THREE.Scene, position: THREE.Vector3) {
        // Create the base geometry
        const geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 8);
        const material = new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            emissive: 0x003333,
            transparent: true,
            opacity: 0.7
        });
        super(geometry, material);

        this.scene = scene;
        this.position.copy(position);
        this.creationTime = Date.now();

        // Create the effect radius visualization
        const effectGeometry = new THREE.RingGeometry(1, GameConfig.EMP_BOMB.RADIUS, 32);
        const effectMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        this.effectMesh = new THREE.Mesh(effectGeometry, effectMaterial);
        this.effectMesh.rotation.x = -Math.PI; // Lay flat on the ground
        this.add(this.effectMesh);

        // Initial visual effect
        ParticleSystem.createWaveEffect(
            scene,
            position.clone(),
            0x00ffff,
            GameConfig.EMP_BOMB.RADIUS
        );
    }

    update(enemies: Enemy[]): boolean {
        const now = Date.now();

        // Check if bomb has expired
        if (now - this.creationTime > GameConfig.EMP_BOMB.LIFETIME) {
            this.remove(this.effectMesh);
            return false;
        }

        // Visual pulse effect
        if (now - this.lastPulseTime >= GameConfig.EMP_BOMB.VISUAL_PULSE_RATE) {
            ParticleSystem.createWaveEffect(
                this.scene,
                this.position.clone(),
                0x00ffff,
                GameConfig.EMP_BOMB.RADIUS
            );
            this.lastPulseTime = now;

            // Pulse the effect mesh
            this.effectMesh.material.opacity = 0.5;
            setTimeout(() => {
                if (this.effectMesh) {
                    this.effectMesh.material.opacity = 0.3;
                }
            }, 200);
        }

        // Check for enemies in range and apply effect
        for (const enemy of enemies) {
            const distance = enemy.position.distanceTo(this.position);
            
            if (distance <= GameConfig.EMP_BOMB.RADIUS) {
                if (!this.affectedEnemies.has(enemy)) {
                    // Newly affected enemy
                    this.affectedEnemies.set(enemy, now + GameConfig.EMP_BOMB.EFFECT_DURATION);
                    enemy.freeze(); // We'll need to add this method to Enemy class
                }
            }
        }

        // Clean up expired effects
        for (const [enemy, unfreezeTime] of this.affectedEnemies.entries()) {
            if (now >= unfreezeTime) {
                enemy.unfreeze(); // We'll need to add this method to Enemy class
                this.affectedEnemies.delete(enemy);
            }
        }

        return true;
    }

    destroy() {
        // Unfreeze all affected enemies
        for (const [enemy] of this.affectedEnemies) {
            enemy.unfreeze();
        }
        this.affectedEnemies.clear();
        this.remove(this.effectMesh);
    }
}
