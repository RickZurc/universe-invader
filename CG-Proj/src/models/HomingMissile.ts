import * as THREE from 'three';
import { Enemy } from './Enemy';
import { BossEnemy, SpecialEnemy } from './EnemyTypes';
import { GameConfig } from '../config/GameConfig';
import { ParticleSystem } from '../systems/ParticleSystem';
import type { EnemyManager } from '../managers/EnemyManager';
import { SceneManager } from '../managers/SceneManager';

export class HomingMissile extends THREE.Mesh {
    private velocity: THREE.Vector3;
    private target: Enemy | null = null;
    private scene: THREE.Scene;
    private creationTime: number;
    private trailParticles: THREE.Points;
    private trailPositions: Float32Array;
    private trailColors: Float32Array;
    private trailIndex: number = 0;
    private readonly TRAIL_LENGTH = 20;
    private enemyManager: EnemyManager;
    private sceneManager: SceneManager;
    private currentRound: number;
    private onEnemyDestroyed: ((enemy: Enemy, score: number) => void) | null = null;

    constructor(
        scene: THREE.Scene,
        position: THREE.Vector3,
        direction: THREE.Vector3,
        enemyManager: EnemyManager,
        sceneManager: SceneManager,
        currentRound: number,
        onEnemyDestroyed?: (enemy: Enemy, score: number) => void
    ) {
        // Create missile geometry
        const geometry = new THREE.ConeGeometry(0.2, 0.8, 8);
        const material = new THREE.MeshPhongMaterial({
            color: 0xff00ff,
            emissive: 0x4f004f,
            shininess: 30
        });        super(geometry, material);
        this.scene = scene;
        this.enemyManager = enemyManager;
        this.sceneManager = sceneManager;
        this.position.copy(position);
        this.velocity = direction.normalize().multiplyScalar(GameConfig.HOMING_MISSILE.SPEED);
        this.creationTime = Date.now();
        this.currentRound = currentRound;
        this.onEnemyDestroyed = onEnemyDestroyed || null;

        // Setup missile trail
        this.trailPositions = new Float32Array(this.TRAIL_LENGTH * 3);
        this.trailColors = new Float32Array(this.TRAIL_LENGTH * 3);
        const trailGeometry = new THREE.BufferGeometry();
        trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
        trailGeometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));

        const trailMaterial = new THREE.PointsMaterial({
            size: 0.2,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.6
        });

        this.trailParticles = new THREE.Points(trailGeometry, trailMaterial);
        scene.add(this.trailParticles);
    }

    update(enemies: Enemy[]): boolean {
        // Check if missile has expired
        if (Date.now() - this.creationTime > GameConfig.HOMING_MISSILE.LIFETIME) {
            this.explode();
            return false;
        }

        // Find nearest enemy if we don't have a target or target is dead
        if (!this.target || this.target.health <= 0) {
            let nearestDist = Infinity;
            let nearestEnemy = null;

            for (const enemy of enemies) {
                const dist = enemy.position.distanceTo(this.position);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestEnemy = enemy;
                }
            }
            this.target = nearestEnemy;
        }

        // Update missile movement
        if (this.target) {
            // Calculate direction to target
            const toTarget = new THREE.Vector3()
                .copy(this.target.position)
                .sub(this.position)
                .normalize();

            // Smoothly adjust velocity towards target
            this.velocity.lerp(
                toTarget.multiplyScalar(GameConfig.HOMING_MISSILE.SPEED),
                GameConfig.HOMING_MISSILE.TURN_SPEED
            );

            // Check if we hit the target
            if (this.position.distanceTo(this.target.position) < 1) {
                this.explode();
                return false;
            }
        }

        // Update position
        this.position.add(this.velocity);

        // Update rotation to face movement direction
        this.lookAt(this.position.clone().add(this.velocity));

        // Update trail
        this.updateTrail();

        return true;
    }

    private updateTrail() {
        // Add new trail point
        const baseIndex = this.trailIndex * 3;
        this.trailPositions[baseIndex] = this.position.x;
        this.trailPositions[baseIndex + 1] = this.position.y;
        this.trailPositions[baseIndex + 2] = this.position.z;

        // Set color with fade out
        const intensity = 1 - (this.trailIndex / this.TRAIL_LENGTH);
        this.trailColors[baseIndex] = 1; // R
        this.trailColors[baseIndex + 1] = intensity * 0.5; // G
        this.trailColors[baseIndex + 2] = 1; // B

        this.trailIndex = (this.trailIndex + 1) % this.TRAIL_LENGTH;

        // Update geometry
        this.trailParticles.geometry.attributes.position.needsUpdate = true;
        this.trailParticles.geometry.attributes.color.needsUpdate = true;
    }

    explode(): void {
        // Create main explosion effect
        ParticleSystem.createExplosion(
            this.scene,
            this.position.clone(),
            0xff00ff
        );

        // Create blast radius visualization
        ParticleSystem.createWaveEffect(
            this.scene,
            this.position.clone(),
            0xff00ff, // Purple color matching missile
            GameConfig.HOMING_MISSILE.BLAST_RADIUS
        );

        // Apply blast damage to nearby enemies
        const enemies = this.enemyManager.getEnemies() as Enemy[];
        const blastRadius = GameConfig.HOMING_MISSILE.BLAST_RADIUS;

        for (const enemy of enemies) {
            const distance = enemy.position.distanceTo(this.position);
            if (distance <= blastRadius) {
                // Calculate damage falloff based on distance
                const damageMultiplier = 1 - (distance / blastRadius) * GameConfig.HOMING_MISSILE.BLAST_DAMAGE_FALLOFF;                
                const damage = Math.floor(GameConfig.HOMING_MISSILE.DAMAGE * damageMultiplier);
                
                enemy.health = Math.max(0, enemy.health - damage);
                enemy.startHitEffect();

                // Update camera matrices before updating health bars
                const camera = this.sceneManager.getCamera();
                camera.updateMatrixWorld();
                camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
                enemy.updateHealthBar(camera);                if (enemy.health <= 0) {
                    // Calculate score based on enemy type and round
                    const { SCORE_SCALE_FACTOR } = GameConfig.DIFFICULTY;
                    const roundScoreMultiplier = Math.pow(SCORE_SCALE_FACTOR, this.currentRound - 1);
                    let scoreValue = Math.floor(75 * roundScoreMultiplier); // Base score for normal enemies

                    if (enemy instanceof BossEnemy) {
                        scoreValue = Math.floor(400 * roundScoreMultiplier);
                    } else if (enemy instanceof SpecialEnemy) {
                        scoreValue = Math.floor(200 * roundScoreMultiplier);
                    }

                    // Remove enemy and trigger callback with score value
                    this.enemyManager.removeEnemy(enemy);
                    if (this.onEnemyDestroyed) {
                        this.onEnemyDestroyed(enemy, scoreValue);
                    }
                }
            }
        }

        // Clean up missile
        this.scene.remove(this.trailParticles);
        this.scene.remove(this);
    }
}
