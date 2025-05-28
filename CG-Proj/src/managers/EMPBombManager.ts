import * as THREE from 'three';
import { Enemy } from '../models/Enemy';
import { GameConfig } from '../config/GameConfig';
import { DamagePopup } from '../utils/DamagePopup';

export class EMPBombManager {
    private scene: THREE.Scene;
    private activeEMPs: THREE.Mesh[];
    private camera: THREE.Camera;
    private chainLightnings: THREE.Line[] = [];

    constructor(scene: THREE.Scene, camera: THREE.Camera) {
        this.scene = scene;
        this.activeEMPs = [];
        this.camera = camera;
    }

    private freezeEnemyWithChain(enemy: Enemy, allEnemies: Enemy[], processedEnemies: Set<Enemy>, depth: number) {
        if (processedEnemies.has(enemy) || depth > 5) return;
        processedEnemies.add(enemy);

        // Freeze the current enemy
        enemy.stun(GameConfig.EMP_BOMB.EFFECT_DURATION);
                    
        // Show freeze popup that follows the enemy
        DamagePopup.show('FROZEN!', enemy.position.clone().add(new THREE.Vector3(0, 1, 0)),
            this.camera, {
                type: 'freeze',
                followTarget: enemy
            });

        // Look for nearby enemies to chain to
        for (const nearbyEnemy of allEnemies) {
            if (processedEnemies.has(nearbyEnemy)) continue;
            
            const distance = enemy.position.distanceTo(nearbyEnemy.position);
            if (distance <= GameConfig.EMP_BOMB.CHAIN_RADIUS && Math.random() < GameConfig.EMP_BOMB.CHAIN_CHANCE) {
                // Create lightning effect between enemies
                const points = [
                    enemy.position.clone(),
                    nearbyEnemy.position.clone()
                ];
                
                // Add some zigzag points for lightning effect
                const midPoint = enemy.position.clone().lerp(nearbyEnemy.position, 0.5);
                midPoint.x += (Math.random() - 0.5) * 0.5;
                midPoint.y += (Math.random() - 0.5) * 0.5;
                points.splice(1, 0, midPoint);

                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const material = new THREE.LineBasicMaterial({
                    color: GameConfig.EMP_BOMB.COLOR,
                    transparent: true,
                    opacity: 0.8
                });
                const lightning = new THREE.Line(geometry, material);
                this.scene.add(lightning);
                this.chainLightnings.push(lightning);

                // Fade out and remove the lightning effect
                setTimeout(() => {
                    const fadeOut = () => {
                        material.opacity -= 0.1;
                        if (material.opacity <= 0) {
                            this.scene.remove(lightning);
                            geometry.dispose();
                            material.dispose();
                            const index = this.chainLightnings.indexOf(lightning);
                            if (index > -1) {
                                this.chainLightnings.splice(index, 1);
                            }
                        } else {
                            requestAnimationFrame(fadeOut);
                        }
                    };
                    fadeOut();
                }, 200);

                // Chain freeze to the nearby enemy
                this.freezeEnemyWithChain(nearbyEnemy, allEnemies, processedEnemies, depth + 1);
            }
        }
    }

    deployEMP(position: THREE.Vector3): boolean {
        if (this.activeEMPs.length >= GameConfig.EMP_BOMB.MAX_ACTIVE) {
            return false;
        }        // Create main EMP sphere
        const geometry = new THREE.SphereGeometry(GameConfig.EMP_BOMB.RADIUS, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.2,
            wireframe: true
        });

        // Create outer glowing sphere
        const glowGeometry = new THREE.SphereGeometry(GameConfig.EMP_BOMB.RADIUS * 1.05, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });

        const emp = new THREE.Mesh(geometry, material);
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        emp.add(glow);
        emp.position.copy(position);
        emp.userData.spawnTime = Date.now();
        emp.userData.lastPulseTime = Date.now();

        // Create initial pulse effect
        const pulseGeometry = new THREE.SphereGeometry(0.1, 32, 32);
        const pulseMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.5
        });
        const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
        pulse.position.copy(position);
        this.scene.add(pulse);

        // Animate pulse outward
        const expandPulse = () => {
            const scale = pulse.scale.x + 0.2;
            pulse.scale.set(scale, scale, scale);
            pulse.material.opacity -= 0.02;
            if (pulse.material.opacity > 0) {
                requestAnimationFrame(expandPulse);
            } else {
                this.scene.remove(pulse);
            }
        };
        expandPulse();

        this.scene.add(emp);
        this.activeEMPs.push(emp);
        return true;
    }

    updateEMPs(enemies: Enemy[]) {
        const now = Date.now();
        
        // Update active EMPs
        for (const emp of [...this.activeEMPs]) {
            // Update pulse effect
            if (now - emp.userData.lastPulseTime >= GameConfig.EMP_BOMB.VISUAL_PULSE_RATE) {
                // Create a new pulse ring
                const pulseGeometry = new THREE.TorusGeometry(GameConfig.EMP_BOMB.RADIUS, 0.1, 16, 32);
                const pulseMaterial = new THREE.MeshBasicMaterial({
                    color: GameConfig.EMP_BOMB.COLOR,
                    transparent: true,
                    opacity: GameConfig.EMP_BOMB.PULSE_INTENSITY
                });
                const pulseRing = new THREE.Mesh(pulseGeometry, pulseMaterial);
                pulseRing.position.copy(emp.position);
                pulseRing.rotation.x = Math.PI / 2; // Align with XY plane
                this.scene.add(pulseRing);

                // Animate ring outward
                const expandRing = () => {
                    pulseRing.scale.multiplyScalar(1.05);
                    pulseMaterial.opacity -= 0.05;
                    if (pulseMaterial.opacity > 0) {
                        requestAnimationFrame(expandRing);
                    } else {
                        this.scene.remove(pulseRing);
                        pulseGeometry.dispose();
                        pulseMaterial.dispose();
                    }
                };
                expandRing();
                emp.userData.lastPulseTime = now;

                // Find enemies in range and apply chain freeze effect
                const processedEnemies = new Set<Enemy>();
                
                // Initial freeze of enemies in EMP range
                for (const enemy of enemies) {
                    if (processedEnemies.has(enemy)) continue;
                    
                    const distance = enemy.position.distanceTo(emp.position);
                    if (distance <= GameConfig.EMP_BOMB.RADIUS && !enemy.isStunned()) {
                        this.freezeEnemyWithChain(enemy, enemies, processedEnemies, 0);
                    }
                }
            }

            // Remove expired EMPs
            if (now - emp.userData.spawnTime >= GameConfig.EMP_BOMB.LIFETIME) {
                this.scene.remove(emp);
                if (emp.material instanceof THREE.Material) {
                    emp.material.dispose();
                } else if (Array.isArray(emp.material)) {
                    emp.material.forEach(m => m.dispose());
                }
                emp.geometry.dispose();
                this.activeEMPs = this.activeEMPs.filter(e => e !== emp);
            }
        }
        
        // Clean up expired chain lightning effects
        for (const lightning of [...this.chainLightnings]) {
            if (lightning.material instanceof THREE.LineBasicMaterial && lightning.material.opacity <= 0) {
                this.scene.remove(lightning);
                lightning.geometry.dispose();
                lightning.material.dispose();
                const index = this.chainLightnings.indexOf(lightning);
                if (index > -1) {
                    this.chainLightnings.splice(index, 1);
                }
            }
        }
    }    clear() {
        // Clean up EMPs
        for (const emp of this.activeEMPs) {
            this.scene.remove(emp);
            if (emp.material instanceof THREE.Material) {
                emp.material.dispose();
            } else if (Array.isArray(emp.material)) {
                emp.material.forEach(m => m.dispose());
            }
            emp.geometry.dispose();
        }
        this.activeEMPs = [];

        // Clean up chain lightning effects
        for (const lightning of this.chainLightnings) {
            this.scene.remove(lightning);
            lightning.geometry.dispose();
            if (lightning.material instanceof THREE.LineBasicMaterial) {
                lightning.material.dispose();
            }
        }
        this.chainLightnings = [];
    }
}
