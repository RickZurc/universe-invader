import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig';
import { Enemy } from '../models/Enemy';
import { BossEnemy, NormalEnemy, SpecialEnemy } from '../models/EnemyTypes';
import { ParticleSystem } from '../systems/ParticleSystem';

export class EnemyManager {    private scene: THREE.Scene;
    private playerShip: THREE.Group;
    private enemies: THREE.Mesh[] = [];
    private enemiesRemainingToSpawn: number = 0;
    private totalEnemiesForRound: number = 0;
    private lastSpawnTime: number = Date.now();
    private timeBetweenSpawns: number = GameConfig.ENEMY_SPAWN_TIME;
    private currentRound: number;

    private enemiesBeingKnockedBack: Map<Enemy, {
        direction: THREE.Vector3,
        endTime: number
    }> = new Map();

    constructor(scene: THREE.Scene, playerShip: THREE.Group) {
        this.scene = scene;
        this.playerShip = playerShip;
        this.currentRound = 1;
    }      createEnemyWave() {
        const { 
            MAX_ENEMIES_PER_WAVE, 
            SPAWN_SPEED_SCALE_CAP, 
            MAX_SPAWN_REDUCTION, 
            WAVE_SIZE_INCREASE, 
            MAX_BOSSES_PER_WAVE 
        } = GameConfig.DIFFICULTY;
        
        // Calculate base enemies with gradual scaling
        const baseEnemies = GameConfig.BASE_ENEMY_ROWS * GameConfig.BASE_ENEMY_COLS;
        const extraEnemiesPerRound = (this.currentRound - 1) * WAVE_SIZE_INCREASE;
        const regularEnemies = Math.min(baseEnemies + extraEnemiesPerRound, MAX_ENEMIES_PER_WAVE);
        
        // Boss wave logic:
        // - Start spawning bosses from round 3
        // - One boss every 3 rounds
        // - Maximum of 2 bosses per wave in later rounds
        const bossCount = this.currentRound >= 3 ? 
            Math.min(Math.floor((this.currentRound - 3) / 3) + 1, MAX_BOSSES_PER_WAVE) : 0;
        
        this.totalEnemiesForRound = regularEnemies + bossCount;
        this.enemiesRemainingToSpawn = this.totalEnemiesForRound;
        
        // Calculate spawn speed scaling
        const spawnSpeedReduction = Math.min(SPAWN_SPEED_SCALE_CAP, this.currentRound - 1) * 0.1;
        const spawnTime = GameConfig.ENEMY_SPAWN_TIME * Math.pow(0.9, spawnSpeedReduction);
        this.timeBetweenSpawns = Math.max(MAX_SPAWN_REDUCTION, spawnTime);
        
        console.log(`Round ${this.currentRound}:`);
        console.log(`- Regular enemies: ${regularEnemies}`);
        console.log(`- Boss enemies: ${bossCount}`);
        console.log(`- Spawn interval: ${this.timeBetweenSpawns}ms`);
        
        this.lastSpawnTime = Date.now();
    }    
    spawnSingleEnemy(): Enemy | null {
        if (this.enemiesRemainingToSpawn <= 0) return null;
        
        // Check if we should spawn a boss
        const existingBosses = this.enemies.filter(e => e instanceof BossEnemy).length;
        const bossWaveInterval = this.currentRound >= 3 ? this.currentRound % 3 === 0 : false;
        const shouldSpawnBoss = bossWaveInterval && 
            existingBosses < GameConfig.DIFFICULTY.MAX_BOSSES_PER_WAVE;

        // Calculate health with round-based scaling
        const { HEALTH_SCALE_CAP, HEALTH_SCALE_FACTOR } = GameConfig.DIFFICULTY;
        const cappedRound = Math.min(HEALTH_SCALE_CAP, this.currentRound - 1);
        const healthMultiplier = Math.pow(HEALTH_SCALE_FACTOR, cappedRound);
        const baseHealth = GameConfig.ENEMY_BASE_HEALTH * healthMultiplier;

        // Create enemy geometry
        const enemyGeometry = new THREE.BoxGeometry(1, 1, 1);
        let enemy: Enemy;

        if (shouldSpawnBoss) {
            // Boss health scales faster and gets significant boosts every 5 rounds
            const { BOSS_HEALTH_INCREASE_PER_5_ROUNDS } = GameConfig.DIFFICULTY;
            const bossBonus = 1 + Math.floor(this.currentRound / 5) * BOSS_HEALTH_INCREASE_PER_5_ROUNDS;
            const bossHealth = Math.floor(baseHealth * 3 * bossBonus);
            enemy = new BossEnemy(enemyGeometry, null!, bossHealth);
            console.log(`Spawning boss (HP: ${bossHealth}) in round ${this.currentRound}`);
        } else if (Math.random() < this.calculateSpecialEnemyChance()) {
            // Special enemies have 50% more health than normal enemies
            enemy = new SpecialEnemy(enemyGeometry, null!, Math.floor(baseHealth * 1.5));
        } else {
            enemy = new NormalEnemy(enemyGeometry, null!, Math.floor(baseHealth));
        }
        
        // Position and add enemy
        this.positionEnemy(enemy);
        this.enemies.push(enemy);
        this.scene.add(enemy);
        this.enemiesRemainingToSpawn--;

        return enemy;
    }    
    private positionEnemy(enemy: THREE.Mesh) {
        const SAFE_DISTANCE = 25; // Minimum distance from player
        const MAX_DISTANCE = 35;  // Maximum distance from player
        const MIN_ENEMY_SPACING = enemy instanceof BossEnemy ? 4 : 2;
        const MAX_ATTEMPTS = 100; // Prevent infinite loops
        
        let validPosition = false;
        let attempts = 0;
        const baseAngle = Math.atan2(this.playerShip.position.y, this.playerShip.position.x);
        
        while (!validPosition && attempts < MAX_ATTEMPTS) {
            // Generate a random position in an arc opposite to player's current movement direction
            const arcSize = Math.PI * 0.75; // 135 degree arc
            const randomArc = (Math.random() - 0.5) * arcSize;
            const angle = baseAngle + Math.PI + randomArc; // Spawn in a wide arc opposite to player
            
            const distance = SAFE_DISTANCE + Math.random() * (MAX_DISTANCE - SAFE_DISTANCE);
            
            const x = this.playerShip.position.x + Math.cos(angle) * distance;
            const y = this.playerShip.position.y + Math.sin(angle) * distance;
            
            // Check distance from other enemies
            const tooCloseToOtherEnemies = this.enemies.some(otherEnemy => {
                const dx = x - otherEnemy.position.x;
                const dy = y - otherEnemy.position.y;
                return Math.sqrt(dx * dx + dy * dy) < MIN_ENEMY_SPACING;
            });
            
            if (!tooCloseToOtherEnemies) {
                enemy.position.set(x, y, 0);
                validPosition = true;
            }
            
            attempts++;
        }
        
        // If we couldn't find a valid position after max attempts, just place it at a safe distance
        if (!validPosition) {
            const fallbackAngle = baseAngle + Math.PI; // Directly opposite to player
            const x = this.playerShip.position.x + Math.cos(fallbackAngle) * SAFE_DISTANCE;
            const y = this.playerShip.position.y + Math.sin(fallbackAngle) * SAFE_DISTANCE;
            enemy.position.set(x, y, 0);
        }
    }
    applyKnockback() {
        const { RADIUS, FORCE, EFFECT_DURATION } = GameConfig.KNOCKBACK;
        const now = Date.now();

        // Clear expired knockback effects
        for (const [enemy, data] of this.enemiesBeingKnockedBack.entries()) {
            if (now >= data.endTime) {
                this.enemiesBeingKnockedBack.delete(enemy);
            }
        }

        // Find enemies in range and apply knockback
        for (const enemy of this.enemies) {
            if (!(enemy instanceof Enemy)) continue;

            const toEnemy = new THREE.Vector3()
                .copy(enemy.position)
                .sub(this.playerShip.position);
            
            const distance = toEnemy.length();
            
            if (distance <= RADIUS) {
                // Normalize direction and apply force
                const direction = toEnemy.normalize().multiplyScalar(FORCE);                // Create shockwave particle effects
                // Blue wave expanding outward
                ParticleSystem.createWaveEffect(
                    this.scene,
                    this.playerShip.position.clone(),
                    0x00aaff, // Bright blue
                    RADIUS
                );
                
                // Secondary inner explosion for extra effect
                ParticleSystem.createExplosion(
                    this.scene,
                    this.playerShip.position.clone(),
                    0x4444ff
                );
                
                this.enemiesBeingKnockedBack.set(enemy, {
                    direction: direction,
                    endTime: now + EFFECT_DURATION
                });
            }
        }
    }
    updateEnemies(camera: THREE.Camera) {
        const now = Date.now();
        const { ENEMY_SPEED_INCREASE_PER_ROUND } = GameConfig.DIFFICULTY;
        const speedMultiplier = 1 + (ENEMY_SPEED_INCREASE_PER_ROUND * (this.currentRound - 1));

        // Spawn new enemies if needed
        if (this.enemiesRemainingToSpawn > 0 && now - this.lastSpawnTime >= this.timeBetweenSpawns) {
            this.spawnSingleEnemy();
            this.lastSpawnTime = now;
        }

        for (const enemy of this.enemies) {
            if (!(enemy instanceof Enemy)) continue;

            // Update enemy stun state and health bar
            enemy.updateStunState();
            enemy.updateHealthBar(camera);
            enemy.updateHitEffect();

            // Skip movement if stunned or frozen
            if (enemy.isStunned() || enemy.isFrozenState()) {
                continue;
            }

            // Handle knockback if active
            if (this.enemiesBeingKnockedBack.has(enemy)) {
                const knockbackData = this.enemiesBeingKnockedBack.get(enemy)!;
                if (now < knockbackData.endTime) {
                    enemy.position.add(knockbackData.direction);
                } else {
                    this.enemiesBeingKnockedBack.delete(enemy);
                }
                continue;
            }

            // Normal enemy movement
            const direction = new THREE.Vector3()
                .copy(this.playerShip.position)
                .sub(enemy.position)
                .normalize();

            const baseSpeed = enemy instanceof BossEnemy ? 0.03 : 
                            enemy instanceof SpecialEnemy ? 0.06 : 0.04;
            const speed = baseSpeed * speedMultiplier;

            enemy.position.add(direction.multiplyScalar(speed));

            // Update enemy orientation to face player
            enemy.lookAt(this.playerShip.position);
        }
    }

    getEnemies() {
        return this.enemies;
    }

    removeEnemy(enemy: THREE.Mesh) {
        const index = this.enemies.indexOf(enemy);
        if (index > -1) {
            this.enemies.splice(index, 1);
            this.scene.remove(enemy);
            if (enemy instanceof Enemy) {
                enemy.destroy();
            }
        }
    }    getRemainingEnemies() {
        return this.enemiesRemainingToSpawn;
    }

    getTotalEnemies() {
        return this.enemies.length + this.enemiesRemainingToSpawn;
    }    setCurrentRound(round: number) {
        this.currentRound = round;
        console.log(`EnemyManager round updated to ${round}`); // Add debug log
    }clearEnemies() {
        this.enemies.forEach(enemy => {
            this.scene.remove(enemy);
            if (enemy instanceof Enemy) {
                enemy.destroy();
            }
        });
        this.enemies = [];
        this.enemiesRemainingToSpawn = 0;
        console.log(`Cleared enemies. Current round is ${this.currentRound}`); // Add debug log
    }

    spawnBossEnemy(): BossEnemy {
        const enemyGeometry = new THREE.BoxGeometry(1, 1, 1);
        const baseHealth = GameConfig.ENEMY_BASE_HEALTH + (this.currentRound - 1) * 100;
        const boss = new BossEnemy(enemyGeometry, null!, baseHealth * 3);
        
        // Find valid spawn position
        let validPosition = false;        let x: number = 0;
        let y: number = 0;
        let attempts = 0;
        const maxAttempts = 100;

        while (!validPosition && attempts < maxAttempts) {
            x = (Math.random() - 0.5) * 20;
            y = (Math.random() - 0.5) * 20;
            
            // Check distance from player and other enemies
            const tooCloseToPlayer = new THREE.Vector3(x, y, 0)
                .distanceTo(this.playerShip.position) < 5;
            
            const tooCloseToOtherEnemies = this.enemies.some(otherEnemy => {
                const dx = otherEnemy.position.x - x;
                const dy = otherEnemy.position.y - y;
                return Math.sqrt(dx * dx + dy * dy) < 4;
            });
            
            if (!tooCloseToPlayer && !tooCloseToOtherEnemies) {
                validPosition = true;
                boss.position.set(x, y, 0);
            }
            attempts++;
        }
        
        if (!validPosition) {
            throw new Error('Could not find valid boss spawn position');
        }

        this.enemies.push(boss);
        this.scene.add(boss);
        return boss;
    }    
    private calculateSpecialEnemyChance(): number {
        const { SPECIAL_ENEMY_BASE_CHANCE, SPECIAL_ENEMY_MAX_CHANCE, SPECIAL_ENEMY_INCREASE_PER_ROUND } = GameConfig.DIFFICULTY;
        return Math.min(
            SPECIAL_ENEMY_MAX_CHANCE,
            SPECIAL_ENEMY_BASE_CHANCE + (this.currentRound - 1) * SPECIAL_ENEMY_INCREASE_PER_ROUND
        );
    }
}
