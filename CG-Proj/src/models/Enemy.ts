import * as THREE from 'three';
import { EnemyType } from '../types/types';
import type { EnemyTypeKey } from '../types/types';

export class Enemy extends THREE.Mesh {
    health: number;
    maxHealth: number;
    isHit: boolean;
    hitTime: number;
    healthContainer!: HTMLDivElement;
    healthBar!: HTMLDivElement;
    enemyType: typeof EnemyType[EnemyTypeKey];
    color: string;
    private isFrozen: boolean = false;
    private frozenEndTime: number = 0;
    private normalMaterial: THREE.MeshPhongMaterial;
    private frozenMaterial: THREE.MeshBasicMaterial;    constructor(geometry: THREE.BoxGeometry, _material: THREE.MeshBasicMaterial, baseHealth: number, type: typeof EnemyType[EnemyTypeKey] = EnemyType.Normal) {
        const enemyMaterial = new THREE.MeshPhongMaterial({
            color: type === EnemyType.Boss ? 0xff0000 : 
                   type === EnemyType.Special ? 0x00ffff : 
                   type === EnemyType.Shifter ? 0xffa500 : 
                   type === EnemyType.Destroyer ? 0x44ff44 : 0xff0000,
            emissive: type === EnemyType.Boss ? 0x440000 : 
                      type === EnemyType.Special ? 0x004444 : 
                      type === EnemyType.Shifter ? 0x442200 : 
                      type === EnemyType.Destroyer ? 0x114411 : 0x220000,
            shininess: 30
        });
        super(geometry, enemyMaterial);
        
        const enemyLight = new THREE.PointLight(
            type === EnemyType.Boss ? 0xff0000 : 
            type === EnemyType.Special ? 0x00ffff : 
            type === EnemyType.Shifter ? 0xffa500 : 
            type === EnemyType.Destroyer ? 0x44ff44 : 0xff0000,
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
        
        this.normalMaterial = enemyMaterial;
        this.frozenMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8
        });

        this.setupHealthBar();
    }private setupHealthBar() {
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

        // Ensure camera matrices are up to date
        if (!camera.matrixWorldInverse || camera.matrixWorldInverse.determinant() === 0) {
            camera.updateMatrixWorld();
            camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
        }

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

            // Update health percentage and color
            const healthPercent = Math.max(0, Math.min(100, (this.health / this.maxHealth) * 100));
            this.healthBar.style.width = `${healthPercent}%`;

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
    }    updateHitEffect() {
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
                case EnemyType.Shifter:
                    originalColor = 'orange';
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

    freeze() {
        this.isFrozen = true;
        this.material = this.frozenMaterial;
    }

    unfreeze() {
        this.isFrozen = false;
        this.material = this.normalMaterial;
    }

    isFrozenState(): boolean {
        return this.isFrozen;
    }    stun(duration: number) {
        if (!this.isFrozen) {
            this.isFrozen = true;
            this.frozenEndTime = Date.now() + duration;
            (this.material as THREE.Material).dispose();
            this.material = this.frozenMaterial;

            // Add ice crystal particles around the enemy
            const crystalGeometry = new THREE.IcosahedronGeometry(0.2);
            const crystalMaterial = new THREE.MeshPhongMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.6,
                shininess: 90
            });

            // Add multiple ice crystals in random positions around the enemy
            for (let i = 0; i < 8; i++) {
                const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
                const angle = (Math.PI * 2 / 8) * i + Math.random() * 0.5;
                const radius = 0.8 + Math.random() * 0.4;
                crystal.position.set(
                    Math.cos(angle) * radius,
                    Math.sin(angle) * radius,
                    0
                );
                crystal.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );
                this.add(crystal);
            }
        }
    }    updateStunState() {
        if (this.isFrozen && Date.now() >= this.frozenEndTime) {
            this.isFrozen = false;
            (this.material as THREE.Material).dispose();
            this.material = this.normalMaterial;

            // Remove all ice crystal meshes
            this.children.slice().forEach(child => {
                if (child instanceof THREE.Mesh && 
                    child.geometry instanceof THREE.IcosahedronGeometry) {
                    this.remove(child);
                    child.geometry.dispose();
                    child.material.dispose();
                }
            });

            // Create shatter effect
            const particleCount = 20;
            const particles: THREE.Points[] = [];
            
            const particleGeometry = new THREE.BufferGeometry();
            const particleMaterial = new THREE.PointsMaterial({
                color: 0x00ffff,
                size: 0.1,
                transparent: true,
                opacity: 0.8
            });

            const positions = new Float32Array(particleCount * 3);
            const velocities: THREE.Vector3[] = [];

            for (let i = 0; i < particleCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = 0.5 + Math.random() * 0.5;
                positions[i * 3] = Math.cos(angle) * radius;
                positions[i * 3 + 1] = Math.sin(angle) * radius;
                positions[i * 3 + 2] = 0;

                velocities.push(new THREE.Vector3(
                    (Math.random() - 0.5) * 0.1,
                    (Math.random() - 0.5) * 0.1,
                    0
                ));
            }

            particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
            this.add(particleSystem);
            particles.push(particleSystem);

            // Animate particles
            let frame = 0;
            const animate = () => {                if (frame++ >= 30) { // Run for 30 frames
                    particles.forEach(p => {
                        this.remove(p);
                        p.geometry.dispose();
                        if (Array.isArray(p.material)) {
                            p.material.forEach((m: THREE.Material) => m.dispose());
                        } else {
                            (p.material as THREE.Material).dispose();
                        }
                    });
                    return;
                }

                const positions = particleGeometry.attributes.position.array as Float32Array;
                for (let i = 0; i < particleCount; i++) {
                    positions[i * 3] += velocities[i].x;
                    positions[i * 3 + 1] += velocities[i].y;
                    velocities[i].y -= 0.001; // Add gravity effect
                }
                particleGeometry.attributes.position.needsUpdate = true;
                particleMaterial.opacity -= 0.02;

                requestAnimationFrame(animate);
            };
            animate();
        }
    }

    isStunned(): boolean {
        return this.isFrozen;
    }
}
