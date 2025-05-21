import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
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
import { BossEnemy, SpecialEnemy } from './models/EnemyTypes';

class Game {
    private sceneManager: SceneManager;
    private playerManager: PlayerManager;
    private enemyManager: EnemyManager;
    private bulletManager: BulletManager;
    private inputManager: InputManager;
    private uiManager: UIManager;
    private storeManager: StoreManager;
    private gameManager: GameManager; private gameOver: boolean = false;
    private score: number = 0;
    private currentRound: number = 1;
    private isStorePaused: boolean = false;
    private isDebugMode: boolean = false;
    private lastShotTime: number = 0;
    private currentFireRate: number = GameConfig.INITIAL_FIRE_RATE;
    private lastKnockbackTime: number = 0;

    constructor() {
        // Initialize managers
        this.sceneManager = new SceneManager();
        this.playerManager = new PlayerManager(this.sceneManager.getScene());
        this.enemyManager = new EnemyManager(this.sceneManager.getScene(), this.playerManager.getShip());
        this.bulletManager = new BulletManager(this.sceneManager.getScene(), this.playerManager.getShip());
        this.inputManager = InputManager.getInstance();
        this.uiManager = new UIManager();
        this.gameManager = GameManager.getInstance();

        this.storeManager = new StoreManager(this.uiManager, (type: string, cost: number) => {
            this.handleUpgrade(type, cost);
        });

        this.setupEventListeners();
        this.initializeGame();
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
        });

        document.getElementById('debug-spawn-boss')?.addEventListener('click', () => {
            if (!this.isDebugMode) return; try {
                this.enemyManager.spawnBossEnemy();
                this.showDebugFeedback('Boss enemy spawned');
                this.updateUI();
            } catch (error: any) {
                this.showDebugFeedback(error.message || 'Failed to spawn boss', true);
                console.error(error);
            }
        });

        document.getElementById('debug-apply')?.addEventListener('click', () => {
            if (!this.isDebugMode) return;
            const healthInput = document.getElementById('debug-health') as HTMLInputElement;
            const damageInput = document.getElementById('debug-damage') as HTMLInputElement;
            const speedInput = document.getElementById('debug-speed') as HTMLInputElement;
            const fireRateInput = document.getElementById('debug-firerate') as HTMLInputElement;

            if (healthInput && damageInput && speedInput && fireRateInput) {
                const health = Math.max(1, parseInt(healthInput.value));
                const damage = Math.max(1, parseInt(damageInput.value));
                const speed = Math.max(0.1, parseFloat(speedInput.value));
                const fireRate = Math.max(50, parseInt(fireRateInput.value));

                if (!isNaN(health)) {
                    this.playerManager.setHealth(health);
                    this.playerManager.setMaxHealth(health);
                }
                if (!isNaN(damage)) {
                    this.bulletManager.setBulletDamage(damage);
                }
                if (!isNaN(speed)) {
                    this.playerManager.setMoveSpeed(speed);
                }
                if (!isNaN(fireRate)) {
                    this.currentFireRate = fireRate;
                }

                // Update UI to reflect changes
                this.updateUI();
                // Show brief feedback
                const debugModal = document.getElementById('debug-modal');
                if (debugModal) {
                    const feedback = document.createElement('div');
                    feedback.textContent = 'Changes applied successfully!';
                    feedback.style.color = '#00ff00';
                    feedback.style.marginTop = '10px';
                    debugModal.appendChild(feedback);
                    setTimeout(() => feedback.remove(), 2000);
                }
            }
        });
        document.getElementById('debug-resume')?.addEventListener('click', () => this.closeDebugMenu());

        document.addEventListener('keydown', (event) => {
            if (event.key.toLowerCase() === 'j') {
                if (!this.isDebugMode) {
                    this.openDebugMenu();
                } else {
                    this.closeDebugMenu();
                }
            }
        });
    }
    private initializeGame() {
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
        this.enemyManager.setCurrentRound(this.currentRound);
    }
    private handleUpgrade(type: string, cost: number) {
        // Double check if player has enough score
        if (this.score < cost) {
            return;
        }

        // Apply cost
        this.score = Math.max(0, this.score - cost);        switch (type) {
            case 'health':
                const newMaxHealth = this.playerManager.getMaxHealth() + 150; // Reduced health gain
                this.playerManager.setMaxHealth(newMaxHealth);
                this.playerManager.setHealth(newMaxHealth);
                break;
            case 'damage':
                this.bulletManager.setBulletDamage(this.bulletManager.getBulletDamage() + 35); // Reduced damage increase
                break;
            case 'speed':
                this.playerManager.setMoveSpeed(this.playerManager.getMoveSpeed() + 0.015); // Smaller speed boost
                break;
            case 'firerate':
                this.currentFireRate = Math.max(120, this.currentFireRate - 35); // Smaller fire rate improvement, higher minimum
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
    }    private startNewRound() {
        this.currentRound++;
        this.enemyManager.setCurrentRound(this.currentRound);  // Update enemy manager's round counter
        this.playerManager.setHealth(this.playerManager.getMaxHealth());
        this.uiManager.resetWaveProgress(); // Reset wave progress counter
        this.updateUI();

        // Update store with current score before opening
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
        this.isDebugMode = true;
        this.uiManager.openDebugMenu(
            this.playerManager.getHealth(),
            this.bulletManager.getBulletDamage(),
            this.playerManager.getMoveSpeed(),
            this.currentFireRate
        );
    } 
    private closeDebugMenu() {
        this.isDebugMode = false;
        this.uiManager.closeDebugMenu();
    }
    private showDebugFeedback(message: string, isError: boolean = false) {
        const debugModal = document.getElementById('debug-modal');
        if (debugModal) {
            // Remove any existing feedback
            const existingFeedback = debugModal.querySelector('.debug-feedback');
            if (existingFeedback) {
                existingFeedback.remove();
            }

            const feedback = document.createElement('div');
            feedback.textContent = message;
            feedback.style.color = isError ? '#ff0000' : '#00ff00';
            feedback.style.marginTop = '10px';
            feedback.className = 'debug-feedback';
            debugModal.appendChild(feedback);
            setTimeout(() => feedback.remove(), 2000);
        }
    } 
    private restartGame() {
        this.gameOver = false;
        this.score = 0;
        this.currentRound = 1;
        this.currentFireRate = GameConfig.INITIAL_FIRE_RATE;

        // Reset player stats to initial values
        this.playerManager.setHealth(GameConfig.INITIAL_HEALTH);
        this.playerManager.setMaxHealth(GameConfig.INITIAL_MAX_HEALTH);
        this.playerManager.setMoveSpeed(GameConfig.INITIAL_MOVE_SPEED);
        this.bulletManager.setBulletDamage(GameConfig.INITIAL_BULLET_DAMAGE);

        // Reset game state
        this.playerManager.reset();
        this.enemyManager.clearEnemies();
        this.uiManager.closeGameOver();
        this.updateUI();
        this.enemyManager.createEnemyWave();
    } 
    private handleCollisions() {
        const bullets = this.bulletManager.getBullets();
        const enemies = this.enemyManager.getEnemies() as Enemy[];
        const playerPosition = this.playerManager.getShip().position;

        // Check enemy collisions with player
        for (let enemy of enemies) {
            const distance = new THREE.Vector3()
                .copy(enemy.position)
                .sub(playerPosition)
                .length(); if (distance < 1.5) {
                    const damageAmount = enemy instanceof BossEnemy ? GameConfig.ENEMY_BASE_DAMAGE.BOSS :
                        enemy instanceof SpecialEnemy ? GameConfig.ENEMY_BASE_DAMAGE.SPECIAL :
                            GameConfig.ENEMY_BASE_DAMAGE.NORMAL;

                    // Scale damage with round number (10% increase per round up to double damage)
                    const damageMult = Math.min(2.0, 1 + (this.currentRound - 1) * 0.1);
                    this.playerManager.takeDamage(Math.floor(damageAmount * damageMult));
                    this.enemyManager.removeEnemy(enemy);

                    // Create explosion effect
                    ParticleSystem.createExplosion(this.sceneManager.getScene(), enemy.position.clone(), 0xff0000); if (this.playerManager.getHealth() <= 0) {
                        this.gameOver = true;
                        this.uiManager.showGameOver(this.score, this.currentRound);
                    }
                    this.updateUI();
                }
        }

        // Check bullet collisions with enemies
        for (let bullet of bullets) {
            for (let enemy of enemies) {
                const bulletToEnemyDist = new THREE.Vector3()
                    .copy(bullet.position)
                    .sub(enemy.position)
                    .length(); if (bulletToEnemyDist < 1) {
                        const damage = this.bulletManager.getBulletDamage();
                        enemy.health = Math.max(0, enemy.health - damage);
                        enemy.startHitEffect();
                        enemy.updateHealthBar(this.sceneManager.getCamera());
                        this.bulletManager.removeBullet(bullet);

                        if (enemy.health <= 0) {                            let explosionColor = 0xff6600;
                            // Scale score values with round number
                            const { SCORE_SCALE_FACTOR } = GameConfig.DIFFICULTY;
                            const roundScoreMultiplier = Math.pow(SCORE_SCALE_FACTOR, this.currentRound - 1);
                            let scoreValue = Math.floor(75 * roundScoreMultiplier); // Base score for normal enemies

                            if (enemy instanceof BossEnemy) {
                                explosionColor = 0xff0000;
                                scoreValue = Math.floor(400 * roundScoreMultiplier);
                            } else if (enemy instanceof SpecialEnemy) {
                                explosionColor = 0x00ffff;
                                scoreValue = Math.floor(200 * roundScoreMultiplier);
                            }

                            ParticleSystem.createExplosion(this.sceneManager.getScene(), enemy.position.clone(), explosionColor);
                            this.enemyManager.removeEnemy(enemy);
                            this.score += scoreValue;
                            this.updateUI();
                        }
                    }
            }
        }
    }

    public animate() {
        requestAnimationFrame(() => this.animate());

        // Update input state
        this.inputManager.updateMouseWorldPosition(this.sceneManager.getCamera());

        // Update knockback cooldown UI
        const now = Date.now();
        const remainingCooldown = Math.max(0, 
            (this.lastKnockbackTime + GameConfig.KNOCKBACK.COOLDOWN) - now
        );
        this.uiManager.updateKnockbackCooldown(remainingCooldown, GameConfig.KNOCKBACK.COOLDOWN);

        // Update game state
        if (!this.gameOver && !this.isStorePaused && !this.isDebugMode) {
            // Update player
            this.playerManager.update(
                this.inputManager.moveLeft,
                this.inputManager.moveRight,
                this.inputManager.moveUp,
                this.inputManager.moveDown,
                this.inputManager.mouseWorldPosition
            );

            // Handle shooting
            if (this.inputManager.isShooting && Date.now() - this.lastShotTime > this.currentFireRate) {
                this.bulletManager.shoot(this.inputManager.mouseWorldPosition);
                this.lastShotTime = Date.now();
            }

            // Handle knockback ability
            const now = Date.now();
            if (this.inputManager.isKnockback && now - this.lastKnockbackTime >= GameConfig.KNOCKBACK.COOLDOWN) {
                this.enemyManager.applyKnockback();
                this.lastKnockbackTime = now;
            }

            // Update game objects
            this.bulletManager.updateBullets();
            this.enemyManager.updateEnemies(this.sceneManager.getCamera());
            this.handleCollisions();

            // Check round completion
            const activeEnemies = this.enemyManager.getEnemies().length;
            const remainingToSpawn = this.enemyManager.getRemainingEnemies();
            if (activeEnemies === 0 && remainingToSpawn === 0) {
                this.startNewRound();
            }
        }

        // Update camera and scene
        this.sceneManager.updateCamera(this.playerManager.getShip().position);
        this.sceneManager.updateStarfield(this.sceneManager.getCamera().position);
        this.sceneManager.render();
    }
}

// Start the game
const game = new Game();
game.animate();
