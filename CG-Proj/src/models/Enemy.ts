import * as THREE from 'three';
import { EnemyType } from '../types/types';
import type { EnemyTypeKey } from '../types/types';

export class Enemy extends THREE.Mesh {
    health: number;
    maxHealth: number;
    isHit: boolean;
    hitTime: number;    healthContainer!: HTMLDivElement;
    healthBar!: HTMLDivElement;
    enemyType: typeof EnemyType[EnemyTypeKey];
    color: string;

    constructor(geometry: THREE.BoxGeometry, _material: THREE.MeshBasicMaterial, baseHealth: number, type: typeof EnemyType[EnemyTypeKey] = EnemyType.Normal) {
        const enemyMaterial = new THREE.MeshPhongMaterial({
            color: type === EnemyType.Boss ? 0xff0000 : type === EnemyType.Special ? 0x00ffff : 0xff0000,
            emissive: type === EnemyType.Boss ? 0x440000 : type === EnemyType.Special ? 0x004444 : 0x220000,
            shininess: 30
        });
        super(geometry, enemyMaterial);
        
        const enemyLight = new THREE.PointLight(
            type === EnemyType.Boss ? 0xff0000 : type === EnemyType.Special ? 0x00ffff : 0xff0000,
            0.5,
            3
        );
        enemyLight.position.set(0, 0, 0);
        this.add(enemyLight);
        
        this.health = baseHealth;
        this.maxHealth = baseHealth;
        this.isHit = false;
        this.hitTime = 0;
        this.enemyType = type;
        this.color = "red";
        
        this.setupHealthBar();
    }    private setupHealthBar() {
        // Create container
        this.healthContainer = document.createElement('div');
        this.healthContainer.className = 'enemy-health-container';
        
        // Create health bar
        this.healthBar = document.createElement('div');
        this.healthBar.className = 'enemy-health-bar';
        
        // Add to DOM
        this.healthContainer.appendChild(this.healthBar);
        document.body.appendChild(this.healthContainer);
        
        // Initial position off-screen to avoid flashing
        this.healthContainer.style.left = '-1000px';
        this.healthContainer.style.top = '-1000px';
    }    updateHealthBar(camera: THREE.Camera) {
        if (!this.healthContainer || !this.healthBar) return;

        // Get the vector from the enemy to the camera
        const vector = new THREE.Vector3();
        this.getWorldPosition(vector);
        
        // Project position to screen space
        vector.project(camera);

        // Convert to screen coordinates
        const widthHalf = window.innerWidth / 2;
        const heightHalf = window.innerHeight / 2;
        const x = Math.round(vector.x * widthHalf + widthHalf);
        const y = Math.round(-vector.y * heightHalf + heightHalf);

        // Only show if in front of camera
        if (vector.z < 1) {
            // Position health bar
            this.healthContainer.style.display = 'block';
            this.healthContainer.style.transform = `translate(-50%, -100%)`; // Center horizontally and position above
            this.healthContainer.style.left = `${x}px`;
            this.healthContainer.style.top = `${y - 20}px`; // 20px above enemy

            // Update health percentage
            const healthPercent = Math.max(0, Math.min(100, (this.health / this.maxHealth) * 100));
            this.healthBar.style.width = `${healthPercent}%`;

            // Update color based on health
            if (healthPercent > 60) {
                this.healthBar.style.backgroundColor = '#00ff00'; // Green
            } else if (healthPercent > 30) {
                this.healthBar.style.backgroundColor = '#ffff00'; // Yellow
            } else {
                this.healthBar.style.backgroundColor = '#ff0000'; // Red
            }
        } else {
            this.healthContainer.style.display = 'none';
        }
    }

    startHitEffect() {
        this.isHit = true;
        this.hitTime = Date.now();
        (this.material as THREE.MeshBasicMaterial).color.setHex(0xff8080);
    }

    updateHitEffect() {
        if (this.isHit && Date.now() - this.hitTime > 500) {
            this.isHit = false;
            let originalColor;
            switch (this.enemyType) {
                case EnemyType.Boss:
                    originalColor = 'purple';
                    break;
                case EnemyType.Special:
                    originalColor = 'cyan';
                    break;
                default:
                    originalColor = 'red';
            }
            (this.material as THREE.MeshBasicMaterial).color.set(originalColor);
        }
    }

    destroy() {
        if (this.healthContainer && this.healthContainer.parentNode) {
            this.healthContainer.parentNode.removeChild(this.healthContainer);
        }
    }
}
