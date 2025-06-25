import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Enemy } from './Enemy';
import { EnemyType } from '../types/types';
import { GameConfig } from '../config/GameConfig';

export class NormalEnemy extends Enemy {
    constructor(geometry: THREE.BoxGeometry, _material: THREE.MeshBasicMaterial, baseHealth: number) {
        console.log('NormalEnemy constructor called');
        super(geometry, new THREE.MeshBasicMaterial(), baseHealth);
        this.scale.set(1, 1, 1);
        this.healthContainer.style.width = '40px';
        this.healthContainer.style.height = '4px';
        this.healthContainer.style.transform = 'scale(1)';
        
        console.log('About to load normal enemy model');
        // Load the spaceship model
        this.loadNormalEnemyModel();
    }    private loadNormalEnemyModel() {
        const loader = new GLTFLoader();
        console.log('Attempting to load normal enemy model from:', '/SpaceshipNormalEnemy.glb');
        
        loader.load(
            '/SpaceshipNormalEnemy.glb',
            (gltf) => {
                console.log('Normal enemy model loaded successfully:', gltf);
                console.log('Model scene:', gltf.scene);
                console.log('Model children:', gltf.scene.children);
                
                // Add the loaded model as a child
                const model = gltf.scene.clone(); // Clone to avoid issues
                model.scale.set(0.6, 0.6, 0.6);
                model.rotation.set(90, Math.PI, 0);
                
                // Apply red coloring to the model materials
                model.traverse((child) => {
                    if (child instanceof THREE.Mesh && child.material) {
                        console.log('Found mesh in model:', child.name || 'unnamed', child.material);
                        const material = child.material;
                        if (Array.isArray(material)) {
                            material.forEach(mat => {
                                if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial) {
                                    // mat.color.setHex(0xff0000); // Red color for normal enemies
                                    mat.emissive.setHex(0x220000); // Dark red emissive
                                    console.log('Applied red color to material');
                                }
                            });
                        } else if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhongMaterial) {
                            // material.color.setHex(0xff0000); // Red color for normal enemies
                            material.emissive.setHex(0x220000); // Dark red emissive
                            console.log('Applied red color to single material');
                        }
                    }
                });
                
                // Add the model as a child (don't replace the base geometry, just add on top)
                this.add(model);
                console.log('Normal enemy model added to scene. Enemy children count:', this.children.length);
                
                // Hide the original box geometry by making it transparent
                if (this.material instanceof THREE.Material) {
                    this.material.transparent = true;
                    this.material.opacity = 0;
                }
            },
            (progress) => {
                console.log('Loading progress:', progress.loaded, '/', progress.total);
            },
            (error) => {
                console.error('An error occurred loading the normal enemy model:', error);
                console.error('Error details:', error);
                // Keep the original box geometry if model fails to load
            }
        );
    }
}

export class BossEnemy extends Enemy {
    constructor(geometry: THREE.BoxGeometry, _material: THREE.MeshBasicMaterial, baseHealth: number) {
        super(geometry, new THREE.MeshBasicMaterial({ color: 'purple' }), baseHealth * 3, EnemyType.Boss);
        this.scale.set(2, 2, 2);
        this.healthContainer.style.width = '80px';
        this.healthContainer.style.height = '6px';
        this.healthContainer.style.transform = 'scale(2)';
    }
}

export class SpecialEnemy extends Enemy {
    constructor(geometry: THREE.BoxGeometry, _material: THREE.MeshBasicMaterial, baseHealth: number) {
        super(geometry, new THREE.MeshBasicMaterial({ color: 'cyan' }), baseHealth * 2, EnemyType.Special);
        this.scale.set(1.5, 1.5, 1.5);
        this.healthContainer.style.width = '60px';
        this.healthContainer.style.height = '5px';
        this.healthContainer.style.transform = 'scale(1.5)';
    }
}

export class ShifterEnemy extends Enemy {
    private lastTeleportTime: number = 0;
    private teleportCooldown: number = 2000; // 2 seconds cooldown

    constructor(geometry: THREE.BoxGeometry, _material: THREE.MeshBasicMaterial, baseHealth: number) {
        super(geometry, new THREE.MeshBasicMaterial({ color: 'orange' }), Math.floor(baseHealth * 0.4), EnemyType.Shifter);
        this.scale.set(0.8, 0.8, 0.8);
        this.healthContainer.style.width = '30px';
        this.healthContainer.style.height = '3px';
        this.healthContainer.style.transform = 'scale(0.8)';
        
        // Add a subtle glow effect to indicate teleportation ability
        const glowLight = new THREE.PointLight(0xffa500, 0.3, 2);
        glowLight.position.set(0, 0, 0);
        this.add(glowLight);
    }    // Check if the enemy should teleport to dodge incoming bullets
    shouldTeleport(bullets: THREE.Mesh[]): boolean {
        const now = Date.now();
        
        // Can't teleport if on cooldown
        if (now - this.lastTeleportTime < this.teleportCooldown) {
            return false;
        }

        // Check if any bullet enters the detection radius around the Shifter
        const detectionRadius = 5; // Larger radius for easier triggering
        for (const bullet of bullets) {
            const distance = this.position.distanceTo(bullet.position);
            
            // If bullet is within detection radius, teleport immediately
            if (distance < detectionRadius) {
                return true;
            }
        }
        
        return false;
    }    teleport(): void {
        const now = Date.now();
        this.lastTeleportTime = now;

        // Create teleport effect at current position
        this.createTeleportEffect(this.position.clone());

        // Calculate new position
        const newPosition = this.calculateTeleportPosition();
        this.position.copy(newPosition);

        // Create teleport effect at new position
        this.createTeleportEffect(this.position.clone());

        console.log(`Shifter teleported to avoid bullet!`);
    }    private calculateTeleportPosition(): THREE.Vector3 {
        // Teleport to a completely random position on the screen
        // Assuming screen bounds are roughly -20 to 20 on both axes
        const screenBounds = 18; // Stay slightly within bounds to avoid edge cases
        
        const newPos = new THREE.Vector3(
            (Math.random() - 0.5) * 2 * screenBounds, // Random X from -18 to 18
            (Math.random() - 0.5) * 2 * screenBounds, // Random Y from -18 to 18
            0
        );

        return newPos;
    }

    private createTeleportEffect(position: THREE.Vector3): void {
        if (!this.parent) return;

        // Create a brief orange flash effect
        const effectGeometry = new THREE.RingGeometry(0.5, 1.5, 8);
        const effectMaterial = new THREE.MeshBasicMaterial({
            color: 0xffa500,
            transparent: true,
            opacity: 0.8
        });
        
        const effect = new THREE.Mesh(effectGeometry, effectMaterial);
        effect.position.copy(position);
        this.parent.add(effect);

        // Animate the effect
        let opacity = 0.8;
        let scale = 1;
        const animate = () => {
            opacity -= 0.05;
            scale += 0.1;
            effectMaterial.opacity = opacity;
            effect.scale.setScalar(scale);

            if (opacity <= 0) {
                this.parent?.remove(effect);
                effectGeometry.dispose();
                effectMaterial.dispose();
            } else {
                requestAnimationFrame(animate);
            }
        };
        animate();
    }

    // Override the hit effect to show teleportation theme
    startHitEffect() {
        super.startHitEffect();
        // Add a brief flicker effect to suggest the shifter is "phasing"
        const material = this.material as THREE.MeshBasicMaterial;
        material.transparent = true;
        material.opacity = 0.7;
        
        setTimeout(() => {
            material.opacity = 1;
            material.transparent = false;
        }, 200);
    }
}

export class DestroyerEnemy extends Enemy {
    private lastMissileFireTime: number = Date.now() - 3000; // Start ready to fire immediately
    private enemyMissiles: import('./EnemyMissile').EnemyMissile[] = [];constructor(geometry: THREE.BoxGeometry, _material: THREE.MeshBasicMaterial, baseHealth: number) {
        super(geometry, new THREE.MeshBasicMaterial({ color: 0x44ff44 }), Math.floor(baseHealth * 1.2), EnemyType.Destroyer);
        this.scale.set(1.1, 1.1, 1.1);
        this.healthContainer.style.width = '50px';
        this.healthContainer.style.height = '4px';
        this.healthContainer.style.transform = 'scale(1.1)';
        
        // Add green glow effect for destroyer theme
        const glowLight = new THREE.PointLight(0x44ff44, 0.4, 3);
        glowLight.position.set(0, 0, 0);
        this.add(glowLight);
    }    // Update method for distance-keeping AI and missile firing
    updateDestroyerBehavior(playerPosition: THREE.Vector3, onPlayerHit?: () => void): void {
        const now = Date.now();
        const config = GameConfig.DESTROYER;
        
        // Calculate distance to player
        const distanceToPlayer = this.position.distanceTo(playerPosition);
        
        // Movement AI - maintain preferred distance
        const movement = new THREE.Vector3();
        
        if (distanceToPlayer < config.MIN_DISTANCE) {
            // Too close - retreat
            movement.copy(this.position).sub(playerPosition).normalize().multiplyScalar(config.RETREAT_SPEED);
        } else if (distanceToPlayer > config.MAX_DISTANCE) {
            // Too far - advance
            movement.copy(playerPosition).sub(this.position).normalize().multiplyScalar(config.ADVANCE_SPEED);
        } else {
            // At good distance - strafe to maintain position while avoiding being stationary
            const strafeDirection = new THREE.Vector3(-1 + Math.random() * 2, -1 + Math.random() * 2, 0).normalize();
            movement.copy(strafeDirection).multiplyScalar(config.STRAFE_SPEED);
        }
        
        // Apply movement
        this.position.add(movement);
          // Missile firing
        if (now - this.lastMissileFireTime >= config.MISSILE_FIRE_RATE) {
            console.log(`Destroyer firing missile! Distance to player: ${distanceToPlayer.toFixed(2)}`);
            this.fireMissileAtPlayer(playerPosition, onPlayerHit);
            this.lastMissileFireTime = now;
        }
        
        // Update existing missiles
        this.updateMissiles(playerPosition);
    }    private async fireMissileAtPlayer(playerPosition: THREE.Vector3, onPlayerHit?: () => void): Promise<void> {
        try {
            // Dynamic import to avoid circular dependencies
            const { EnemyMissile } = await import('./EnemyMissile');
            
            if (!this.parent) {
                console.log('Destroyer cannot fire missile: no parent scene');
                return;
            }
            
            console.log('Creating enemy missile from Destroyer position:', this.position.clone());
            const missile = new EnemyMissile(
                this.parent as THREE.Scene,
                this.position.clone(),
                playerPosition.clone(),
                GameConfig.DESTROYER.MISSILE_ACCURACY,
                onPlayerHit
            );
            
            this.enemyMissiles.push(missile);
            (this.parent as THREE.Scene).add(missile);
            console.log('Enemy missile created and added to scene. Total missiles:', this.enemyMissiles.length);
        } catch (error) {
            console.error('Failed to create enemy missile:', error);
        }
    }

    private updateMissiles(playerPosition: THREE.Vector3): void {
        this.enemyMissiles = this.enemyMissiles.filter(missile => {
            const isActive = missile.update(playerPosition);
            if (!isActive && this.parent) {
                this.parent.remove(missile);
            }
            return isActive;
        });
    }

    // Public method to access enemy missiles for collision detection
    getEnemyMissiles(): import('./EnemyMissile').EnemyMissile[] {
        return this.enemyMissiles;
    }

    // Public method to remove a specific missile (for collision handling)
    removeMissile(missile: import('./EnemyMissile').EnemyMissile): void {
        const index = this.enemyMissiles.indexOf(missile);
        if (index > -1) {
            if (this.parent) {
                this.parent.remove(missile);
            }
            this.enemyMissiles.splice(index, 1);
        }
    }

    // Clean up missiles when destroyer is destroyed
    cleanup(): void {
        if (this.parent) {
            this.enemyMissiles.forEach(missile => {
                this.parent!.remove(missile);
            });
        }
        this.enemyMissiles = [];
    }    // Override the hit effect to show destroyer theme
    startHitEffect() {
        super.startHitEffect();
        // Add a brief green flash effect
        const material = this.material as THREE.MeshBasicMaterial;
        const originalColor = material.color.getHex();
        material.color.setHex(0xaaffaa);
        
        setTimeout(() => {
            material.color.setHex(originalColor);
        }, 150);
    }
}
