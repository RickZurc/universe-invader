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

class Game {
    private sceneManager: SceneManager;
    private playerManager: PlayerManager;
    private enemyManager: EnemyManager;
    private bulletManager: BulletManager;
    private inputManager: InputManager;
    private uiManager: UIManager;
    private storeManager: StoreManager;
    private gameManager: GameManager;

    private gameOver: boolean = false;
    private score: number = 0;
    private currentRound: number = 1;
    private isStorePaused: boolean = false;
    private isDebugMode: boolean = false;
    private lastShotTime: number = 0;

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
        document.getElementById('debug-spawn-enemy')?.addEventListener('click', () => this.enemyManager.spawnSingleEnemy());
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
        this.score -= cost;
        switch (type) {
            case 'health':
                const newMaxHealth = this.playerManager.getMaxHealth() + 200;
                this.playerManager.setMaxHealth(newMaxHealth);
                this.playerManager.setHealth(newMaxHealth);
                break;
            case 'damage':
                this.bulletManager.setBulletDamage(this.bulletManager.getBulletDamage() + 50);
                break;
            case 'speed':
                this.playerManager.setMoveSpeed(0.05);
                break;
            case 'firerate':
                // Handle fire rate upgrade
                break;
        }
        this.updateUI();
    }

    private updateUI() {
        this.uiManager.updateScore(this.score);
        this.uiManager.updateHealth(this.playerManager.getHealth(), this.playerManager.getMaxHealth());
        this.uiManager.updateEnemiesCounter(this.enemyManager.getEnemies().length, 0);
        this.uiManager.updateRound(this.currentRound);
    }

    private startNewRound() {
        this.currentRound++;
        this.playerManager.setHealth(this.playerManager.getMaxHealth());
        this.updateUI();
        this.storeManager.openStore();
        this.isStorePaused = true;
    }

    private openDebugMenu() {
        this.isDebugMode = true;
        this.uiManager.openDebugMenu(
            this.playerManager.getHealth(),
            this.bulletManager.getBulletDamage(),
            0.2,
            200
        );
    }

    private closeDebugMenu() {
        this.isDebugMode = false;
        this.uiManager.closeDebugMenu();
    }

    private restartGame() {
        this.gameOver = false;
        this.score = 0;
        this.currentRound = 1;
        
        this.playerManager.reset();
        this.enemyManager.clearEnemies();
        this.updateUI();
        this.enemyManager.createEnemyWave();
    }

    private handleCollisions() {
        const bullets = this.bulletManager.getBullets();
        const enemies = this.enemyManager.getEnemies() as Enemy[];

        for (let bullet of bullets) {
            for (let enemy of enemies) {
                if (bullet.position.distanceTo(enemy.position) < 1) {
                    enemy.health -= this.bulletManager.getBulletDamage();
                    enemy.startHitEffect();
                    this.bulletManager.removeBullet(bullet);

                    if (enemy.health <= 0) {
                        const explosionColor = enemy.enemyType === 0 ? 0xff6600 : 
                                             enemy.enemyType === 1 ? 0xff0000 : 0x00ffff;
                        ParticleSystem.createExplosion(this.sceneManager.getScene(), enemy.position.clone(), explosionColor);
                        
                        this.enemyManager.removeEnemy(enemy);
                        this.score += enemy.enemyType === 1 ? 500 : enemy.enemyType === 2 ? 250 : 100;
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
            if (this.inputManager.isShooting && Date.now() - this.lastShotTime > GameConfig.INITIAL_FIRE_RATE) {
                this.bulletManager.shoot(this.inputManager.mouseWorldPosition);
                this.lastShotTime = Date.now();
            }

            // Update game objects
            this.bulletManager.updateBullets();
            this.enemyManager.updateEnemies();
            this.handleCollisions();

            // Check round completion
            if (this.enemyManager.getRemainingEnemies() === 0) {
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
