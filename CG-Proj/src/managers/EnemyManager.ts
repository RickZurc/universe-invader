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
        const { MAX_ENEMIES_PER_WAVE, SPAWN_SPEED_SCALE_CAP, MAX_SPAWN_REDUCTION, WAVE_SIZE_INCREASE } = GameConfig.DIFFICULTY;
        
        // Calculate base enemies with gradual scaling
        const baseEnemies = GameConfig.BASE_ENEMY_ROWS * GameConfig.BASE_ENEMY_COLS;
        const extraEnemiesPerRound = (this.currentRound - 1) * WAVE_SIZE_INCREASE; // Add 1 enemy per round after first
        const totalEnemies = Math.min(baseEnemies + extraEnemiesPerRound, MAX_ENEMIES_PER_WAVE);
        
        // Determine if this round should have a boss
        const shouldHaveBoss = this.currentRound >= 3 && (this.currentRound % 3 === 0);
        const bossCount = shouldHaveBoss ? 1 : 0;
        
        console.log(`Round ${this.currentRound}: Spawning ${totalEnemies} enemies and ${bossCount} bosses`);
        
        this.totalEnemiesForRound = totalEnemies + bossCount;
        this.enemiesRemainingToSpawn = this.totalEnemiesForRound;
        
        // Calculate spawn speed with smoother scaling and boss priority
        const baseSpawnTime = shouldHaveBoss ? 500 : GameConfig.ENEMY_SPAWN_TIME; // Faster initial spawn on boss rounds
        const spawnSpeedMultiplier = Math.pow(0.95, Math.min(SPAWN_SPEED_SCALE_CAP, this.currentRound - 1)); // Slower spawn speed reduction
        this.timeBetweenSpawns = Math.max(MAX_SPAWN_REDUCTION, baseSpawnTime * spawnSpeedMultiplier);
        
        this.lastSpawnTime = Date.now();
    }    
    spawnSingleEnemy(): Enemy | null {
        if (this.enemiesRemainingToSpawn <= 0) return null;
        const enemyGeometry = new THREE.BoxGeometry(1, 1, 1);
        
        // Calculate health with round-based scaling and caps
        const { HEALTH_SCALE_CAP, HEALTH_SCALE_FACTOR } = GameConfig.DIFFICULTY;
        const cappedRound = Math.min(HEALTH_SCALE_CAP, this.currentRound - 1);
        const roundFactor = Math.pow(HEALTH_SCALE_FACTOR, cappedRound);
        const baseHealth = GameConfig.ENEMY_BASE_HEALTH * roundFactor;
        
        let enemy: NormalEnemy | BossEnemy | SpecialEnemy;
        
        // Boss enemy spawning logic
        const isBossRound = this.currentRound >= 3 && this.currentRound % 3 === 0;
        const shouldSpawnBoss = isBossRound && !this.enemies.some(e => e instanceof BossEnemy);
        
        if (shouldSpawnBoss) {
            const { BOSS_HEALTH_INCREASE_PER_5_ROUNDS } = GameConfig.DIFFICULTY;
            const roundsMultiplier = 1 + Math.floor(this.currentRound / 5) * BOSS_HEALTH_INCREASE_PER_5_ROUNDS;
            const bossHealth = baseHealth * 3 * roundsMultiplier;
            enemy = new BossEnemy(enemyGeometry, null!, bossHealth);
            console.log(`Spawning boss with ${bossHealth} health at round ${this.currentRound}`);
        } else if (Math.random() < this.calculateSpecialEnemyChance()) {
            enemy = new SpecialEnemy(enemyGeometry, null!, baseHealth * 1.5);
        } else {
            enemy = new NormalEnemy(enemyGeometry, null!, baseHealth);
        }
        
        // Position enemy and add to scene
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
        const currentTime = Date.now();
        if (this.enemiesRemainingToSpawn > 0 && currentTime - this.lastSpawnTime >= this.timeBetweenSpawns) {
            this.spawnSingleEnemy();
            this.lastSpawnTime = currentTime;
        }

        // Update enemy movement and health bars
        this.enemies.forEach(enemy => {
            if (enemy instanceof Enemy) {
                let moveX = 0;
                let moveY = 0;

                // Check if enemy is being knocked back
                const knockback = this.enemiesBeingKnockedBack.get(enemy);
                if (knockback && currentTime < knockback.endTime) {
                    // Apply knockback movement
                    moveX += knockback.direction.x;
                    moveY += knockback.direction.y;
                } else {
                    // Normal enemy movement towards player
                    const directionX = this.playerShip.position.x - enemy.position.x;
                    const directionY = this.playerShip.position.y - enemy.position.y;
                    
                    const length = Math.sqrt(directionX * directionX + directionY * directionY);
                    const speed = enemy instanceof BossEnemy ? 0.05 : 
                                enemy instanceof SpecialEnemy ? 0.15 : 0.1;
                    
                    if (length > 0) {
                        const roundSpeedMultiplier = Math.min(2.0, 1 + (this.currentRound - 1) * 0.05);
                        const adjustedSpeed = speed * roundSpeedMultiplier;
                        
                        moveX += (directionX / length) * adjustedSpeed;
                        moveY += (directionY / length) * adjustedSpeed;
                    }
                }

                // Apply final movement
                enemy.position.x += moveX;
                enemy.position.y += moveY;
                
                // Rotate enemy to face player
                enemy.rotation.z = Math.atan2(
                    this.playerShip.position.y - enemy.position.y,
                    this.playerShip.position.x - enemy.position.x
                ) + Math.PI / 2;

                // Update health bar position and value
                enemy.updateHealthBar(camera);

                // Update hit effect if active
                enemy.updateHitEffect();
            }
        });
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
