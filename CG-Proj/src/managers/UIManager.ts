import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig';

export class UIManager {
    private scoreElement: HTMLElement;
    private healthBar: HTMLElement;
    private healthText: HTMLElement;
    private enemiesElement: HTMLElement;
    private roundElement: HTMLElement;
    private storeModal: HTMLElement;
    private gameOverModal: HTMLElement;
    private debugModal: HTMLElement;
    private knockbackTimer: HTMLElement;
    private knockbackReady: HTMLElement;

    constructor() {
        this.scoreElement = document.getElementById('score')!;
        this.healthBar = document.getElementById('health-bar')!;
        this.healthText = document.getElementById('health-text')!;
        this.enemiesElement = document.getElementById('enemies-remaining')!;
        this.roundElement = document.getElementById('round')!;
        this.storeModal = document.getElementById('store-modal')!;
        this.gameOverModal = document.getElementById('gameover-modal')!;
        this.debugModal = document.getElementById('debug-modal')!;
        this.knockbackTimer = document.getElementById('knockback-timer')!;
        this.knockbackReady = document.getElementById('knockback-ready')!;
    }

    updateScore(score: number) {
        if (this.scoreElement) {
            this.scoreElement.textContent = `Score: ${score}`;
        }
    }

    updateHealth(health: number, maxHealth: number) {
        if (this.healthBar && this.healthText) {
            const healthPercentage = (health / maxHealth) * 100;
            this.healthBar.style.width = `${healthPercentage}%`;
            this.healthText.textContent = `${Math.ceil(health)}/${maxHealth}`;
            
            if (healthPercentage > 60) {
                this.healthBar.style.backgroundColor = '#0f0';
            } else if (healthPercentage > 30) {
                this.healthBar.style.backgroundColor = '#ff0';
            } else {
                this.healthBar.style.backgroundColor = '#f00';
            }
        }
    }    updateEnemiesCounter(enemiesCount: number, remainingToSpawn: number) {
        if (this.enemiesElement) {
            const currentTotal = enemiesCount + remainingToSpawn;
            const initialTotal = this.getInitialEnemyCount(remainingToSpawn, enemiesCount);
            const cleared = initialTotal - currentTotal;
            const progress = Math.round((cleared / initialTotal) * 100);
            
            this.enemiesElement.textContent = `Enemies Remaining: ${currentTotal} (${progress}% cleared)`;
        }
    }

    private getInitialEnemyCount(remainingToSpawn: number, currentEnemies: number): number {
        // Track the initial wave size for accurate progress
        if (!this._initialWaveSize || remainingToSpawn + currentEnemies > this._initialWaveSize) {
            this._initialWaveSize = remainingToSpawn + currentEnemies;
        }
        return this._initialWaveSize;
    }

    private _initialWaveSize: number = 0;

    resetWaveProgress() {
        this._initialWaveSize = 0;
    }

    updateRound(round: number) {
        if (this.roundElement) {
            this.roundElement.textContent = `Round: ${round}`;
        }
    }

    private updateUpgradeCosts() {
        // Get all cost value spans
        const costSpans = document.querySelectorAll('.cost-value');
        const costs = [
            GameConfig.UPGRADE_COSTS.HEALTH,
            GameConfig.UPGRADE_COSTS.DAMAGE,
            GameConfig.UPGRADE_COSTS.SPEED,
            GameConfig.UPGRADE_COSTS.FIRE_RATE
        ];
        
        costSpans.forEach((span, index) => {
            if (costs[index] !== undefined) {
                span.textContent = costs[index].toString();
            }
        });
    }

    openStore(score: number) {
        const scoreSpan = document.getElementById('available-score');
        if (this.storeModal && scoreSpan) {
            this.storeModal.style.display = 'block';
            scoreSpan.textContent = `Available Score: ${score}`;
            this.updateUpgradeCosts();
        }
    }

    closeStore() {
        if (this.storeModal) {
            this.storeModal.style.display = 'none';
        }
    }    showGameOver(score: number, round: number) {
        try {
            const finalRound = document.getElementById('final-round');
            const finalScore = document.getElementById('final-score');
            
            if (!this.gameOverModal || !finalRound || !finalScore) {
                console.error('Game over modal elements not found');
                return;
            }

            finalRound.textContent = round.toString();
            finalScore.textContent = score.toString();
            this.gameOverModal.style.display = 'block';
        } catch (error) {
            console.error('Error showing game over modal:', error);
        }
    }    
    closeGameOver() {
        try {
            if (!this.gameOverModal) {
                console.error('Game over modal not found');
                return;
            }
            this.gameOverModal.style.display = 'none';
        } catch (error) {
            console.error('Error closing game over modal:', error);
        }
    }

    openDebugMenu(playerHealth: number, bulletDamage: number, moveSpeed: number, fireRate: number) {
        if (this.debugModal) {
            (document.getElementById('debug-health') as HTMLInputElement).value = playerHealth.toString();
            (document.getElementById('debug-damage') as HTMLInputElement).value = bulletDamage.toString();
            (document.getElementById('debug-speed') as HTMLInputElement).value = moveSpeed.toString();
            (document.getElementById('debug-firerate') as HTMLInputElement).value = fireRate.toString();
            this.debugModal.style.display = 'block';
        }
    }

    closeDebugMenu() {
        if (this.debugModal) {
            this.debugModal.style.display = 'none';
        }
    }

    updateKnockbackCooldown(remainingCooldown: number, totalCooldown: number) {
        if (!this.knockbackTimer || !this.knockbackReady) return;

        const progress = (totalCooldown - remainingCooldown) / totalCooldown;
        const percentage = Math.min(100, progress * 100);
        
        // Update the circular progress using conic gradient
        this.knockbackTimer.style.background = 
            `conic-gradient(transparent ${percentage}%, #00aaff ${percentage}%)`;

        if (remainingCooldown <= 0) {
            this.knockbackTimer.style.boxShadow = '0 0 15px #00aaff';
            this.knockbackReady.style.opacity = '1';
        } else {
            this.knockbackTimer.style.boxShadow = '0 0 10px #00aaff';
            this.knockbackReady.style.opacity = '0';
        }
    }
}
