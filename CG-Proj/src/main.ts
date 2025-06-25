import './style.css';
import * as THREE from 'three';
import { GameConfig } from './config/GameConfig';
import { SceneManager } from './managers/SceneManager';
import { PlayerManager } from './managers/PlayerManager';
import { EnemyManager } from './managers/EnemyManager';
import { BulletManager } from './managers/BulletManager';
import { InputManager } from './managers/InputManager';
import { UIManager } from './managers/UIManager';
import { StoreManager } from './managers/StoreManager';
import { GameManager } from './managers/GameManager';
import { ParticleSystem } from './systems/ParticleSystem';
import { Enemy } from './models/Enemy';
import { BossEnemy, SpecialEnemy, ShifterEnemy, DestroyerEnemy } from './models/EnemyTypes';
import { PowerUpType } from './models/PowerUp';
import type { GameState } from './types/types';
import { PowerUpManager } from './managers/PowerUpManager';
import { MissileManager } from './managers/MissileManager';
import { EMPBombManager } from './managers/EMPBombManager';
import { NaniteDroneManager } from './managers/NaniteDroneManager';
import { DamagePopup } from './utils/DamagePopup';

class Game {
    private sceneManager: SceneManager;
    private playerManager: PlayerManager;
    private enemyManager: EnemyManager;
    private bulletManager: BulletManager;
    private inputManager: InputManager;
    private uiManager: UIManager;
    private storeManager: StoreManager;
    private gameManager: GameManager;
    private powerUpManager: PowerUpManager;
    private missileManager: MissileManager;
    private empBombManager: EMPBombManager;
    private naniteDroneManager: NaniteDroneManager;
    private gameOver: boolean = false;
    private score: number = 0;
    private currentRound: number = 1;
    private isStorePaused: boolean = false;
    private isDebugMode: boolean = false;
    private lastShotTime: number = 0;
    private lastMissileTime: number = 0;
    private currentFireRate: number = GameConfig.INITIAL_FIRE_RATE;
    private lastKnockbackTime: number = 0;
    private homingMissiles: number = 0;
    private lastEMPTime: number = 0;
    private hasShieldOverdrive: boolean = false;
    private lastShieldTime: number = 0;
    private isShieldActive: boolean = false;
    private shieldEndTime: number = 0;
    
    // FPS tracking
    private fpsElement: HTMLElement | null = null;
    private frameCount: number = 0;
    private lastFpsUpdate: number = 0;
    private fps: number = 0;

    constructor() {
        // Initialize managers
        this.sceneManager = new SceneManager();
        this.playerManager = new PlayerManager(this.sceneManager.getScene());
        this.enemyManager = new EnemyManager(this.sceneManager.getScene(), this.playerManager.getShip());
        this.bulletManager = new BulletManager(this.sceneManager.getScene(), this.playerManager.getShip());
        this.powerUpManager = new PowerUpManager(this.sceneManager.getScene(), this.playerManager.getShip());
        this.missileManager = new MissileManager(this.sceneManager.getScene(), this.enemyManager, this.sceneManager);
        this.empBombManager = new EMPBombManager(this.sceneManager.getScene(), this.sceneManager.getCamera());
        this.naniteDroneManager = new NaniteDroneManager(this.sceneManager.getScene());
        this.inputManager = InputManager.getInstance();
        this.uiManager = new UIManager();
        this.gameManager = GameManager.getInstance();

        this.storeManager = new StoreManager(this.uiManager, (type: string, cost: number) => {
            this.handleUpgrade(type, cost);
        });

        // Initialize damage popups
        DamagePopup.initialize();
        
        // Initialize FPS counter
        this.initializeFpsCounter();        this.setupEventListeners();
        this.initializeGame();
    }

    private initializeFpsCounter() {
        // Create FPS counter element
        this.fpsElement = document.createElement('div');
        this.fpsElement.id = 'fps-counter';
        this.fpsElement.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            color: #00ff41;
            font-family: 'Courier New', monospace;
            font-size: 16px;
            font-weight: bold;
            text-shadow: 0 0 5px #00ff41;
            z-index: 1000;
            pointer-events: none;
            background: rgba(0, 0, 0, 0.5);
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid rgba(0, 255, 65, 0.3);
        `;
        this.fpsElement.textContent = 'FPS: 60';
        document.body.appendChild(this.fpsElement);
        
        this.lastFpsUpdate = performance.now();
    }

    private updateFps() {
        this.frameCount++;
        const currentTime = performance.now();
        
        // Update FPS display every 500ms
        if (currentTime - this.lastFpsUpdate >= 500) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
            
            if (this.fpsElement) {
                this.fpsElement.textContent = `FPS: ${this.fps}`;
            }
        }
    }

    private setupEventListeners() {
        document.getElementById('restart-button')?.addEventListener('click', () => this.restartGame());

        // Debug menu controls
        document.getElementById('debug-spawn-enemy')?.addEventListener('click', () => {
            if (!this.isDebugMode) return;
            try {
                const enemy = this.enemyManager.spawnSingleEnemy();
                if (enemy) {
                    this.showDebugFeedback('Normal enemy spawned');
                    this.updateUI();
                } else {
                    this.showDebugFeedback('No more enemies to spawn', true);
                }
            } catch (error) {
                this.showDebugFeedback('Failed to spawn enemy', true);
                console.error(error);
            }
        });        document.getElementById('debug-spawn-boss')?.addEventListener('click', () => {
            if (!this.isDebugMode) return;
            try {
                this.enemyManager.spawnBossEnemy();
                this.showDebugFeedback('Boss enemy spawned');
                this.updateUI();
            } catch (error: any) {
                this.showDebugFeedback(error.message || 'Failed to spawn boss', true);
                console.error(error);
            }
        });

        document.getElementById('debug-spawn-shifter')?.addEventListener('click', () => {
            if (!this.isDebugMode) return;
            try {
                this.enemyManager.spawnShifterEnemy();
                this.showDebugFeedback('Shifter enemy spawned');
                this.updateUI();
            } catch (error: any) {
                this.showDebugFeedback(error.message || 'Failed to spawn shifter', true);
                console.error(error);
            }
        });

        document.getElementById('debug-spawn-destroyer')?.addEventListener('click', () => {
            if (!this.isDebugMode) return;
            try {
                this.enemyManager.spawnDestroyerEnemy();
                this.showDebugFeedback('Destroyer enemy spawned');
                this.updateUI();
            } catch (error: any) {
                this.showDebugFeedback(error.message || 'Failed to spawn destroyer', true);
                console.error(error);
            }
        });

        document.getElementById('debug-apply')?.addEventListener('click', () => {
            if (!this.isDebugMode) return;
            
            try {
                const healthInput = document.getElementById('debug-health') as HTMLInputElement;
                const damageInput = document.getElementById('debug-damage') as HTMLInputElement;
                const speedInput = document.getElementById('debug-speed') as HTMLInputElement;
                const fireRateInput = document.getElementById('debug-firerate') as HTMLInputElement;
                const scoreInput = document.getElementById('debug-score') as HTMLInputElement;                const missilesInput = document.getElementById('debug-missiles') as HTMLInputElement;
                const dronesInput = document.getElementById('debug-drones') as HTMLInputElement;
                const superBulletInput = document.getElementById('debug-super-bullet') as HTMLInputElement;
                const glitchedBulletInput = document.getElementById('debug-glitched-bullet') as HTMLInputElement;

                let changes: string[] = [];

                // Apply basic stats
                if (healthInput && !isNaN(parseInt(healthInput.value))) {
                    const health = Math.max(1, parseInt(healthInput.value));
                    this.playerManager.setHealth(health);
                    this.playerManager.setMaxHealth(health);
                    changes.push('Health');
                }
                
                if (damageInput && !isNaN(parseInt(damageInput.value))) {
                    const damage = Math.max(1, parseInt(damageInput.value));
                    this.bulletManager.setBulletDamage(damage);
                    changes.push('Damage');
                }
                
                if (speedInput && !isNaN(parseFloat(speedInput.value))) {
                    const speed = Math.max(0.1, parseFloat(speedInput.value));
                    this.playerManager.setMoveSpeed(speed);
                    changes.push('Speed');
                }
                
                if (fireRateInput && !isNaN(parseInt(fireRateInput.value))) {
                    const fireRate = Math.max(50, parseInt(fireRateInput.value));
                    this.currentFireRate = fireRate;
                    changes.push('Fire Rate');
                }

                // Apply new debug features
                if (scoreInput && !isNaN(parseInt(scoreInput.value))) {
                    const newScore = Math.max(0, parseInt(scoreInput.value));
                    this.score = newScore;
                    changes.push('Score');
                }

                if (missilesInput && !isNaN(parseInt(missilesInput.value))) {
                    const missiles = Math.max(0, Math.min(99, parseInt(missilesInput.value)));
                    this.homingMissiles = missiles;
                    changes.push('Missiles');
                }

                if (dronesInput && !isNaN(parseInt(dronesInput.value))) {
                    const targetDrones = Math.max(0, Math.min(5, parseInt(dronesInput.value)));
                    const currentDrones = this.naniteDroneManager.getDroneCount();
                    
                    // Add or remove drones to match target count
                    if (targetDrones > currentDrones) {
                        for (let i = currentDrones; i < targetDrones; i++) {
                            this.naniteDroneManager.addDrone();
                        }
                    } else if (targetDrones < currentDrones) {
                        // Remove excess drones by clearing and re-adding the target amount
                        this.naniteDroneManager.clear();
                        for (let i = 0; i < targetDrones; i++) {
                            this.naniteDroneManager.addDrone();
                        }
                    }
                    changes.push('Drones');
                }                if (superBulletInput && !isNaN(parseInt(superBulletInput.value))) {
                    const level = Math.max(0, Math.min(10, parseInt(superBulletInput.value)));
                    this.bulletManager.setSuperBulletLevel(level);
                    changes.push('Super Bullet Level');
                }

                if (glitchedBulletInput && !isNaN(parseInt(glitchedBulletInput.value))) {
                    const level = Math.max(0, Math.min(5, parseInt(glitchedBulletInput.value)));
                    this.bulletManager.setGlitchedBulletLevel(level);
                    changes.push('Glitched Bullet Level');
                }

                // Update UI to reflect all changes
                this.updateUI();
                
                // Show success feedback
                const changesText = changes.length > 0 ? changes.join(', ') : 'No valid changes';
                this.showDebugFeedback(`Applied: ${changesText}`, false);
                
            } catch (error) {
                this.showDebugFeedback('Error applying changes', true);
                console.error('Debug apply error:', error);
            }
        });

        document.getElementById('debug-resume')?.addEventListener('click', () => this.closeDebugMenu());

        document.getElementById('debug-super-nova')?.addEventListener('click', () => {
            if (!this.isDebugMode) return;
            try {
                this.triggerSuperNova();
                this.showDebugFeedback('Super Nova triggered!');
            } catch (error) {
                this.showDebugFeedback('Failed to trigger Super Nova', true);
                console.error(error);
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key.toLowerCase() === 'j') {
                if (!this.isDebugMode) {
                    this.openDebugMenu();
                } else {
                    this.closeDebugMenu();
                }
            } else if (event.key.toLowerCase() === 's' && event.ctrlKey) {
                event.preventDefault();                const gameState: GameState = {
                    score: this.score,
                    playerHealth: this.playerManager.getHealth(),
                    maxHealth: this.playerManager.getMaxHealth(),
                    currentRound: this.currentRound,
                    bulletDamage: this.bulletManager.getBulletDamage(),
                    moveSpeed: this.playerManager.getMoveSpeed(),
                    hasShieldOverdrive: this.hasShieldOverdrive,
                    lastShieldTime: this.lastShieldTime,
                    piercingLevel: this.bulletManager.getPiercingLevel(),
                    superBulletLevel: this.bulletManager.getSuperBulletLevel(),
                    glitchedBulletLevel: this.bulletManager.getGlitchedBulletLevel()
                };
                
                if (this.gameManager.saveGame(gameState)) {
                    this.showDebugFeedback('Game saved successfully!', false);
                } else {
                    this.showDebugFeedback('Failed to save game', true);
                }
            }
        });

        // Toggle shield debug button
        document.getElementById('debug-toggle-shield')?.addEventListener('click', () => {
            if (!this.isDebugMode) return;
            
            try {
                this.hasShieldOverdrive = !this.hasShieldOverdrive;
                
                if (this.hasShieldOverdrive) {
                    this.uiManager.showShieldOverdriveUI();
                    this.showDebugFeedback('Shield Overdrive UNLOCKED', false);
                } else {
                    this.uiManager.hideShieldOverdriveUI();
                    this.showDebugFeedback('Shield Overdrive LOCKED', false);
                }
                
                // Update button text
                const button = document.getElementById('debug-toggle-shield') as HTMLButtonElement;
                if (button) {
                    button.textContent = this.hasShieldOverdrive ? 'Lock Shield Overdrive' : 'Unlock Shield Overdrive';
                }
            } catch (error) {
                this.showDebugFeedback('Error toggling shield', true);
                console.error('Shield toggle error:', error);
            }
        });
    }    private initializeGame() {
        // Set up the enemy manager callback to handle Destroyer missile hits
        this.enemyManager.setPlayerHitCallback(() => {
            // Calculate missile damage, scaling with round number
            const baseDamage = GameConfig.DESTROYER.MISSILE_DAMAGE;
            const damageMult = Math.min(2.0, 1 + (this.currentRound - 1) * 0.1);
            const finalDamage = Math.floor(baseDamage * damageMult);
            
            // Only damage player if shield is not active
            if (!this.isShieldActive) {
                this.playerManager.takeDamage(finalDamage);
                
                // Show damage popup near player
                const playerPosition = this.playerManager.getShip().position;
                DamagePopup.show(finalDamage, playerPosition.clone().add(new THREE.Vector3(0, 1, 0)), this.sceneManager.getCamera());
                
                if (this.playerManager.getHealth() <= 0) {
                    this.gameOver = true;
                    this.uiManager.showGameOver(this.score, this.currentRound);
                }
                this.updateUI();
            }
        });
        
        const savedGame = this.gameManager.loadGame();
        if (savedGame) {
            this.loadGameState(savedGame);
        } else {
            this.enemyManager.createEnemyWave();
        }
        this.updateUI();
    }

    private loadGameState(state: any) {
        this.score = state.score;
        this.playerManager.setHealth(state.playerHealth);
        this.playerManager.setMaxHealth(state.maxHealth);
        this.currentRound = state.currentRound;
        this.bulletManager.setBulletDamage(state.bulletDamage);
        this.playerManager.setMoveSpeed(state.moveSpeed);
        this.hasShieldOverdrive = state.hasShieldOverdrive || false;
        this.lastShieldTime = state.lastShieldTime || 0;

        // Load piercing level if available
        if (state.piercingLevel !== undefined) {
            this.bulletManager.setPiercingLevel(state.piercingLevel);
            this.storeManager.setPiercingLevel(state.piercingLevel);
        }        // Load super bullet level if available
        if (state.superBulletLevel !== undefined) {
            this.bulletManager.setSuperBulletLevel(state.superBulletLevel);
        }

        // Load glitched bullet level if available
        if (state.glitchedBulletLevel !== undefined) {
            this.bulletManager.setGlitchedBulletLevel(state.glitchedBulletLevel);
            this.storeManager.setGlitchedBulletLevel(state.glitchedBulletLevel);
        }

        // Show shield UI if unlocked
        if (this.hasShieldOverdrive) {
            this.uiManager.showShieldOverdriveUI();
        }

        // Update managers with loaded state
        this.enemyManager.setCurrentRound(this.currentRound);
        this.storeManager.setRound(this.currentRound);
        this.storeManager.setScore(this.score);
    }

    private handleUpgrade(type: string, cost: number) {
        if (this.score < cost) {
            return;
        }
        
        this.score = Math.max(0, this.score - cost);
        
        switch (type) {
            case 'health':
                const newMaxHealth = this.playerManager.getMaxHealth() + 150;
                this.playerManager.setMaxHealth(newMaxHealth);
                this.playerManager.setHealth(newMaxHealth);
                break;
            case 'damage':
                this.bulletManager.setBulletDamage(this.bulletManager.getBulletDamage() + 35);
                break;
            case 'speed':
                this.playerManager.setMoveSpeed(this.playerManager.getMoveSpeed() + 0.015);
                break;
            case 'firerate':
                this.currentFireRate = Math.max(120, this.currentFireRate - 35);
                break;
            case 'nanite':
                this.naniteDroneManager.addDrone();
                break;            case 'piercing':
                const currentLevel = this.bulletManager.getPiercingLevel();
                this.bulletManager.setPiercingLevel(currentLevel + 1);
                this.storeManager.setPiercingLevel(currentLevel + 1);
                break;
            case 'super-bullet':
                const currentSuperLevel = this.bulletManager.getSuperBulletLevel();
                this.bulletManager.setSuperBulletLevel(currentSuperLevel + 1);
                this.storeManager.setSuperBulletLevel(currentSuperLevel + 1);
                break;
            case 'glitched-bullet':
                const currentGlitchedLevel = this.bulletManager.getGlitchedBulletLevel();
                this.bulletManager.setGlitchedBulletLevel(currentGlitchedLevel + 1);
                this.storeManager.setGlitchedBulletLevel(currentGlitchedLevel + 1);
                break;
            case 'shield':
                this.hasShieldOverdrive = true;
                this.uiManager.showShieldOverdriveUI();
                break;
        }

        // Update UI and store
        this.updateUI();
        this.storeManager.setScore(this.score);
    }

    private updateUI() {
        this.uiManager.updateScore(this.score);
        this.uiManager.updateHealth(this.playerManager.getHealth(), this.playerManager.getMaxHealth());
        const totalEnemies = this.enemyManager.getRemainingEnemies();
        this.uiManager.updateEnemiesCounter(this.enemyManager.getEnemies().length, totalEnemies);
        this.uiManager.updateRound(this.currentRound);
        this.uiManager.updateMissileCount(this.homingMissiles);
    }

    private startNewRound() {
        this.currentRound++;
        this.enemyManager.setCurrentRound(this.currentRound);
        this.playerManager.setHealth(this.playerManager.getMaxHealth());
        this.uiManager.resetWaveProgress();
        this.updateUI();

        // Update store with current score and round before opening
        this.storeManager.setRound(this.currentRound);
        this.storeManager.setScore(this.score);
        this.storeManager.openStore();
        this.isStorePaused = true;

        // Add listener for continue button
        const continueButton = document.getElementById('continue-button');
        if (continueButton) {
            const handler = () => {
                this.isStorePaused = false;
                this.enemyManager.createEnemyWave();
                continueButton.removeEventListener('click', handler);
            };
            continueButton.addEventListener('click', handler);
        }
    }

    private openDebugMenu() {
        this.isDebugMode = true;        this.uiManager.openDebugMenu(
            this.playerManager.getHealth(),
            this.bulletManager.getBulletDamage(),
            this.playerManager.getMoveSpeed(),
            this.currentFireRate,
            this.score,
            this.homingMissiles,
            this.naniteDroneManager.getDroneCount(),
            this.bulletManager.getSuperBulletLevel(),
            this.bulletManager.getGlitchedBulletLevel()
        );
    }

    private closeDebugMenu() {
        this.isDebugMode = false;
        this.uiManager.closeDebugMenu();
    }

    private showDebugFeedback(message: string, isError: boolean = false) {
        this.uiManager.showDebugFeedback(message, isError);
    }

    private restartGame() {
        this.gameOver = false;
        this.score = 0;
        this.currentRound = 1;
        this.currentFireRate = GameConfig.INITIAL_FIRE_RATE;
        this.homingMissiles = 0;
        this.lastEMPTime = 0;
        this.lastShieldTime = 0;
        this.hasShieldOverdrive = false;
        this.isShieldActive = false;

        // Reset player stats to initial values
        this.playerManager.setHealth(GameConfig.INITIAL_HEALTH);
        this.playerManager.setMaxHealth(GameConfig.INITIAL_MAX_HEALTH);
        this.playerManager.setMoveSpeed(GameConfig.INITIAL_MOVE_SPEED);        this.bulletManager.setBulletDamage(GameConfig.INITIAL_BULLET_DAMAGE);
        this.bulletManager.setPiercingLevel(0);
        this.bulletManager.setSuperBulletLevel(0);
        this.bulletManager.setGlitchedBulletLevel(0);
        this.playerManager.deactivateShieldOverdrive();

        // Reset game state
        this.playerManager.reset();
        this.enemyManager.clearEnemies();
        this.powerUpManager.clear();
        this.missileManager.clear();
        this.empBombManager.clear();
        this.naniteDroneManager.clear();
        this.uiManager.closeGameOver();
        this.uiManager.hideShieldOverdriveUI();        // Reset store state
        this.storeManager.setRound(this.currentRound);
        this.storeManager.setScore(this.score);
        this.storeManager.setPiercingLevel(0);
        this.storeManager.setSuperBulletLevel(0);
        this.storeManager.setGlitchedBulletLevel(0);

        this.updateUI();
        this.enemyManager.createEnemyWave();
    }

    private handleCollisions() {
        const bullets = this.bulletManager.getBullets();
        const enemies = this.enemyManager.getEnemies() as Enemy[];
        const playerPosition = this.playerManager.getShip().position;        // Check power-up collisions
        const pickedUpType = this.powerUpManager.checkCollisions();
        if (pickedUpType !== null) {
            if (pickedUpType === PowerUpType.HOMING_MISSILE) {
                this.homingMissiles += 3;
                this.updateUI();
            } else if (pickedUpType === PowerUpType.SUPER_NOVA) {
                this.triggerSuperNova();
            }
        }

        // Check enemy collisions with player
        for (let enemy of enemies) {
            const distance = new THREE.Vector3()
                .copy(enemy.position)
                .sub(playerPosition)
                .length();
            if (distance < 1.5) {
                // Only damage player if shield is not active
                if (!this.isShieldActive) {
                    const damageAmount = enemy instanceof BossEnemy ? GameConfig.ENEMY_BASE_DAMAGE.BOSS :
                        enemy instanceof SpecialEnemy ? GameConfig.ENEMY_BASE_DAMAGE.SPECIAL :
                            GameConfig.ENEMY_BASE_DAMAGE.NORMAL;

                    // Scale damage with round number
                    const damageMult = Math.min(2.0, 1 + (this.currentRound - 1) * 0.1);
                    const finalDamage = Math.floor(damageAmount * damageMult);
                    
                    this.playerManager.takeDamage(finalDamage);

                    // Show damage popup near player
                    DamagePopup.show(finalDamage, playerPosition.clone().add(new THREE.Vector3(0, 1, 0)), this.sceneManager.getCamera());

                    if (this.playerManager.getHealth() <= 0) {
                        this.gameOver = true;
                        this.uiManager.showGameOver(this.score, this.currentRound);
                    }
                    this.updateUI();
                }
                
                // Always remove enemy and create explosion, regardless of shield status
                this.enemyManager.removeEnemy(enemy);
                ParticleSystem.createExplosion(this.sceneManager.getScene(), enemy.position.clone(), 0xff0000);
            }        }        // Check if Shifter enemies should teleport to avoid bullets
        for (let enemy of enemies) {
            if (enemy instanceof ShifterEnemy) {
                if (enemy.shouldTeleport(bullets)) {
                    enemy.teleport();
                }
            }
        }

        // Check bullet collisions with enemies
        for (let bullet of bullets) {
            for (let enemy of enemies) {
                const bulletToEnemyDist = new THREE.Vector3()
                    .copy(bullet.position)
                    .sub(enemy.position)
                    .length();

                if (bulletToEnemyDist < 1) {                    // Check if bullet can hit this enemy (for piercing logic)
                    if (!this.bulletManager.canBulletHitEnemy(bullet, enemy)) {
                        continue;
                    }

                    const damage = this.bulletManager.getBulletDamageForBullet(bullet);
                    enemy.health = Math.max(0, enemy.health - damage);
                    enemy.startHitEffect();
                    enemy.updateHealthBar(this.sceneManager.getCamera());                    // Show damage popup that follows the enemy
                    DamagePopup.show(damage, enemy.position.clone().add(new THREE.Vector3(0, 1, 0)), 
                        this.sceneManager.getCamera(), { followTarget: enemy });

                    // Create glitched bullets if feature is enabled (only for non-glitched bullets to prevent recursion)
                    if (this.bulletManager.getGlitchedBulletLevel() > 0 && !bullet.userData.isGlitched) {
                        this.bulletManager.createGlitchedBullets(
                            enemy.position.clone(),
                            this.enemyManager.getEnemies() as Enemy[],
                            enemy
                        );
                    }

                    // Handle bullet piercing logic
                    const shouldRemoveBullet = this.bulletManager.handleBulletHit(bullet, enemy);

                    if (enemy.health <= 0) {
                        let explosionColor = 0xff6600;
                        // Scale score values with round number
                        const { SCORE_SCALE_FACTOR } = GameConfig.DIFFICULTY;
                        const roundScoreMultiplier = Math.pow(SCORE_SCALE_FACTOR, this.currentRound - 1);
                        let scoreValue = Math.floor(75 * roundScoreMultiplier);                        if (enemy instanceof BossEnemy) {
                            explosionColor = 0xff0000;
                            scoreValue = Math.floor(400 * roundScoreMultiplier);
                        } else if (enemy instanceof SpecialEnemy) {
                            explosionColor = 0x00ffff;
                            scoreValue = Math.floor(200 * roundScoreMultiplier);
                        } else if (enemy instanceof ShifterEnemy) {
                            explosionColor = 0xffa500;
                            scoreValue = Math.floor(150 * roundScoreMultiplier); // Mid-range score for agile enemy
                        }ParticleSystem.createExplosion(this.sceneManager.getScene(), enemy.position.clone(), explosionColor);
                        this.enemyManager.removeEnemy(enemy);
                        this.score += scoreValue;
                        this.updateUI();
                    }                    // Remove bullet if piercing logic says it should be removed
                    if (shouldRemoveBullet) {
                        this.bulletManager.removeBullet(bullet);
                        break;
                    }
                }
            }
        }        // Check bullet collisions with enemy missiles (Destroyer missiles)
        for (let bullet of bullets) {
            for (let enemy of enemies) {
                if (enemy instanceof DestroyerEnemy) {
                    // Get enemy missiles from DestroyerEnemy
                    const enemyMissiles = enemy.getEnemyMissiles();
                    if (enemyMissiles && enemyMissiles.length > 0) {
                        for (let i = enemyMissiles.length - 1; i >= 0; i--) {
                            const missile = enemyMissiles[i];
                            const bulletToMissileDist = new THREE.Vector3()
                                .copy(bullet.position)
                                .sub(missile.position)
                                .length();                            if (bulletToMissileDist < 0.8) {
                                // Bullet hit enemy missile - destroy both
                                
                                // First, let the missile explode to clean up its trail particles
                                missile.explode();
                                
                                // Create additional explosion effect at missile position
                                ParticleSystem.createExplosion(
                                    this.sceneManager.getScene(), 
                                    missile.position.clone(), 
                                    0xffaa00 // Orange explosion for destroyed missile
                                );

                                // Award points for destroying enemy missile
                                const missileScore = 25; // Small bonus for defensive play
                                this.score += missileScore;
                                  // Show damage popup for missile destruction
                                DamagePopup.show(
                                    missileScore, 
                                    missile.position.clone().add(new THREE.Vector3(0, 1, 0)), 
                                    this.sceneManager.getCamera(),
                                    { type: 'powerup' }
                                );

                                // Remove missile from destroyer's missile array and scene
                                enemy.removeMissile(missile);

                                // Remove bullet
                                this.bulletManager.removeBullet(bullet);
                                
                                // Update UI to reflect score change
                                this.updateUI();
                                
                                // Break out of missile loop since bullet is destroyed
                                break;
                            }
                        }
                    }
                }
            }
        }
    }private triggerSuperNova() {
        // Get all enemies on screen - create a copy to avoid modification issues
        const enemies = [...this.enemyManager.getEnemies()];
        const playerPosition = this.playerManager.getShip().position;
        
        // Calculate total score from destroyed enemies
        let totalScore = 0;
        const { SCORE_SCALE_FACTOR } = GameConfig.DIFFICULTY;
        const roundScoreMultiplier = Math.pow(SCORE_SCALE_FACTOR, this.currentRound - 1);
        
        // Destroy all enemies and calculate score
        for (const enemy of enemies) {
            // Make sure this is actually an Enemy object
            if (!(enemy instanceof Enemy)) continue;
            
            let scoreValue = Math.floor(75 * roundScoreMultiplier);
            
            if (enemy instanceof BossEnemy) {
                scoreValue = Math.floor(400 * roundScoreMultiplier);
            } else if (enemy instanceof SpecialEnemy) {
                scoreValue = Math.floor(200 * roundScoreMultiplier);
            }
            
            // Apply Super Nova score multiplier
            totalScore += Math.floor(scoreValue * GameConfig.SUPER_NOVA.SCORE_MULTIPLIER);
            
            // Create individual explosion for each enemy
            ParticleSystem.createExplosion(
                this.sceneManager.getScene(), 
                enemy.position.clone(), 
                0xffaa00
            );
            
            this.enemyManager.removeEnemy(enemy);
        }
        
        // Add score
        this.score += totalScore;
          // Create massive explosion effect at player position
        this.powerUpManager.createSuperNovaExplosion(playerPosition.clone());
        
        // Screen flash effect
        this.uiManager.createScreenFlash();
        
        console.log(`🌟 SUPER NOVA! Destroyed ${enemies.length} enemies for ${totalScore} points!`);        
        this.updateUI();
    }

    public animate() {
        requestAnimationFrame(() => this.animate());

        // Calculate and update FPS
        this.updateFps();

        // Update input state
        this.inputManager.updateMouseWorldPosition(this.sceneManager.getCamera());        // Update ability cooldown UIs
        const currentTime = Date.now();
        const knockbackCooldown = Math.max(0, 
            (this.lastKnockbackTime + GameConfig.KNOCKBACK.COOLDOWN) - currentTime
        );
        const empCooldown = Math.max(0,
            (this.lastEMPTime + GameConfig.EMP_BOMB.COOLDOWN) - currentTime
        );
        const shieldCooldown = Math.max(0,
            (this.lastShieldTime + GameConfig.SHIELD_OVERDRIVE.COOLDOWN) - currentTime
        );
        
        this.uiManager.updateKnockbackCooldown(knockbackCooldown, GameConfig.KNOCKBACK.COOLDOWN);
        this.uiManager.updateEMPCooldown(empCooldown, GameConfig.EMP_BOMB.COOLDOWN);
        this.uiManager.updateShieldOverdriveCooldown(shieldCooldown, GameConfig.SHIELD_OVERDRIVE.COOLDOWN);        // Check if Shield Overdrive should end
        if (this.isShieldActive && currentTime >= this.shieldEndTime) {
            this.isShieldActive = false;
            this.playerManager.deactivateShieldOverdrive();
        }

        // Game logic updates
        if (!this.gameOver && !this.isStorePaused && !this.isDebugMode) {
            // Handle Shield Overdrive activation
            if (this.hasShieldOverdrive && this.inputManager.isShieldOverdrive && 
                currentTime - this.lastShieldTime >= GameConfig.SHIELD_OVERDRIVE.COOLDOWN) {
                this.isShieldActive = true;
                this.lastShieldTime = currentTime;
                this.shieldEndTime = currentTime + GameConfig.SHIELD_OVERDRIVE.DURATION;
                this.playerManager.activateShieldOverdrive();
            }

            // Handle collisions - shield protection is handled inside the method
            this.handleCollisions();

            // Update power-ups
            this.powerUpManager.update();

            // Update missiles
            this.missileManager.updateMissiles(this.enemyManager.getEnemies() as Enemy[]);

            // Update nanite drones and check for drone kills
            const droneKillResult = this.naniteDroneManager.updateDrones(
                this.playerManager.getShip().position, 
                this.enemyManager.getEnemies() as Enemy[]
            );
            if (droneKillResult) {
                this.score += droneKillResult.score;
                this.updateUI();
            }

            // Update player
            this.playerManager.update(
                this.inputManager.moveLeft,
                this.inputManager.moveRight,
                this.inputManager.moveUp,
                this.inputManager.moveDown,
                this.inputManager.mouseWorldPosition
            );

            // Handle regular shooting
            if (this.inputManager.isShooting && Date.now() - this.lastShotTime > this.currentFireRate) {
                this.bulletManager.shoot(this.inputManager.mouseWorldPosition);
                this.lastShotTime = Date.now();
            }

            // Handle missile launching (independent from shooting)
            if (this.inputManager.isSecondaryFire && this.homingMissiles > 0 && Date.now() - this.lastMissileTime > GameConfig.HOMING_MISSILE.COOLDOWN) {
                // Launch homing missile
                const direction = new THREE.Vector3()
                    .copy(this.inputManager.mouseWorldPosition)
                    .sub(this.playerManager.getShip().position)
                    .normalize();

                this.missileManager.launchMissile(
                    this.playerManager.getShip().position.clone(),
                    direction,
                    this.currentRound,
                    (_, score: number) => {
                        this.score += score;
                        this.updateUI();
                    }
                );
                this.homingMissiles--;
                this.lastMissileTime = Date.now();
                this.updateUI();
            }

            // Handle knockback ability
            if (this.inputManager.isKnockback && Date.now() - this.lastKnockbackTime >= GameConfig.KNOCKBACK.COOLDOWN) {
                this.enemyManager.applyKnockback();
                this.lastKnockbackTime = Date.now();
            }

            // Handle EMP deployment
            if (this.inputManager.isEMPDeploy && Date.now() - this.lastEMPTime >= GameConfig.EMP_BOMB.COOLDOWN) {
                const deployed = this.empBombManager.deployEMP(this.playerManager.getShip().position.clone());
                if (deployed) {
                    this.lastEMPTime = Date.now();
                }
            }            // Update game objects
            this.bulletManager.updateBullets();
            this.enemyManager.updateEnemies(this.sceneManager.getCamera());
            this.empBombManager.updateEMPs(this.enemyManager.getEnemies() as Enemy[]);

            // Update enemy indicators when 10 or fewer enemies remain
            this.uiManager.updateEnemyIndicators(
                this.enemyManager.getEnemies() as Enemy[],
                this.sceneManager.getCamera(),
                this.playerManager.getShip().position
            );

            // Check round completion
            const activeEnemies = this.enemyManager.getEnemies().length;
            const remainingToSpawn = this.enemyManager.getRemainingEnemies();
            if (activeEnemies === 0 && remainingToSpawn === 0) {
                this.startNewRound();
            }
        }        // Update camera and scene
        this.sceneManager.updateCamera(this.playerManager.getShip().position);
        this.sceneManager.updateStarfield(this.sceneManager.getCamera().position);
        this.sceneManager.render();
    }
}

// Start the game
const game = new Game();
game.animate();
