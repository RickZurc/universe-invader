import * as THREE from 'three';
import { NaniteDrone } from '../models/NaniteDrone';
import { Enemy } from '../models/Enemy';
import { GameConfig } from '../config/GameConfig';
import { ParticleSystem } from '../systems/ParticleSystem';

export class NaniteDroneManager {
    private scene: THREE.Scene;
    private drones: NaniteDrone[] = [];

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    addDrone(): boolean {
        if (this.drones.length >= GameConfig.NANITE_DRONE.MAX_DRONES) {
            return false;
        }

        const newDrone = new NaniteDrone(this.drones.length, this.drones.length + 1);
        this.drones.push(newDrone);
        this.scene.add(newDrone);
        return true;
    }

    updateDrones(playerPosition: THREE.Vector3, enemies: Enemy[]): { enemy: Enemy, score: number } | null {
        let result = null;

        // Update each drone's position and check for collisions
        for (let i = this.drones.length - 1; i >= 0; i--) {
            const drone = this.drones[i];
            const currentTarget = drone.getTarget();

            // If drone doesn't have a target or its target is stunned, look for a new one
            if (!currentTarget || currentTarget.isStunned()) {
                let closestEnemy: Enemy | null = null;
                let closestDistance = 5; // Attack range

                for (const enemy of enemies) {
                    // Skip stunned enemies
                    if (enemy.isStunned()) continue;

                    // Skip enemies that are already targeted by other drones
                    let alreadyTargeted = false;
                    for (const otherDrone of this.drones) {
                        if (otherDrone !== drone && otherDrone.getTarget() === enemy) {
                            alreadyTargeted = true;
                            break;
                        }
                    }
                    if (alreadyTargeted) continue;

                    const distance = enemy.position.distanceTo(drone.position);
                    if (distance < closestDistance) {
                        closestEnemy = enemy;
                        closestDistance = distance;
                    }
                }

                drone.setTarget(closestEnemy);
            }

            // Update drone position
            drone.update(playerPosition);

            // Check for collisions with enemies
            for (const enemy of enemies) {
                if (enemy.position.distanceTo(drone.position) < 1) {
                    // Damage the enemy
                    const oldHealth = enemy.health;
                    enemy.health = Math.max(0, enemy.health - GameConfig.NANITE_DRONE.DAMAGE);
                    enemy.startHitEffect();

                    // Create explosion effect
                    ParticleSystem.createExplosion(
                        this.scene,
                        drone.position.clone(),
                        0x00ff88
                    );

                    // Remove the drone
                    this.removeDrone(drone);

                    // If enemy was killed, return score data
                    if (oldHealth > 0 && enemy.health <= 0) {
                        result = {
                            enemy: enemy,
                            score: 100 // Base score for drone kill
                        };
                    }
                    break;
                }
            }
        }

        return result;
    }

    private removeDrone(drone: NaniteDrone) {
        const index = this.drones.indexOf(drone);
        if (index > -1) {
            drone.destroy();
            this.drones.splice(index, 1);
            
            // Redistribute remaining drones
            this.rebalanceDrones();
        }
    }

    private rebalanceDrones() {
        // Recreate drones with new angles based on current count
        const positions = this.drones.map(drone => drone.position.clone());
        
        for (let i = 0; i < this.drones.length; i++) {
            const drone = this.drones[i];
            drone.destroy();
            
            const newDrone = new NaniteDrone(i, this.drones.length);
            newDrone.position.copy(positions[i]);
            this.scene.add(newDrone);
            this.drones[i] = newDrone;
        }
    }

    clear() {
        for (const drone of this.drones) {
            drone.destroy();
        }
        this.drones = [];
    }

    getDroneCount(): number {
        return this.drones.length;
    }
}
