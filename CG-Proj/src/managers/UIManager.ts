import { GameConfig } from '../config/GameConfig';
import { EnemyIndicators } from '../utils/EnemyIndicators';

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
    private empTimer: HTMLElement;
    private empReady: HTMLElement;    private shieldTimer: HTMLElement;
    private shieldReady: HTMLElement;
    private shieldContainer: HTMLElement;    private shieldControlItem: HTMLElement;
    private missileCountElement: HTMLElement;
    private empCountElement: HTMLElement;
    private enemyIndicators: EnemyIndicators;

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
        this.empTimer = document.getElementById('emp-timer')!;        this.empReady = document.getElementById('emp-ready')!;        this.shieldTimer = document.getElementById('shield-timer')!;
        this.shieldReady = document.getElementById('shield-ready')!;
        this.shieldContainer = document.getElementById('shield-container')!;
        
        // Shield control item might not exist, so we handle it safely
        const shieldControlElement = document.getElementById('shield-control-item');
        if (shieldControlElement) {
            this.shieldControlItem = shieldControlElement;
        } else {
            // Create a dummy element to avoid null reference errors
            this.shieldControlItem = document.createElement('div');
            this.shieldControlItem.style.display = 'none';
        };        // Create missile count element
        this.missileCountElement = document.createElement('div');
        this.missileCountElement.id = 'missile-count';
        this.missileCountElement.style.cssText = `
            position: fixed;
            bottom: 90px;
            left: 20px;
            color: #ff00ff;
            font-family: Arial, sans-serif;
            font-size: 20px;
            font-weight: bold;
            text-shadow: 0 0 5px #ff00ff;
            z-index: 101;
        `;
        document.body.appendChild(this.missileCountElement);

        // Create EMP bomb count element
        this.empCountElement = document.createElement('div');
        this.empCountElement.id = 'emp-count';
        this.empCountElement.style.position = 'fixed';
        this.empCountElement.style.bottom = '20px';
        this.empCountElement.style.left = '20px';
        this.empCountElement.style.color = '#00ffff';
        this.empCountElement.style.fontFamily = 'Arial, sans-serif';
        this.empCountElement.style.fontSize = '18px';
        this.empCountElement.style.textShadow = '0 0 5px #00ffff';        
        document.body.appendChild(this.empCountElement);

        this.updateMissileCount(0);
        
        // Initialize enemy indicators
        this.enemyIndicators = new EnemyIndicators();
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

    updateUpgradeCosts(scaledCosts: { 
        HEALTH: number, 
        DAMAGE: number, 
        SPEED: number, 
        FIRE_RATE: number,
        NANITE_DRONE: number
    }) {
        // Get all cost value spans
        const costSpans = document.querySelectorAll('.cost-value');
        const costs = [
            scaledCosts.HEALTH,
            scaledCosts.DAMAGE,
            scaledCosts.SPEED,
            scaledCosts.FIRE_RATE,
            scaledCosts.NANITE_DRONE
        ];
        
        costSpans.forEach((span, index) => {
            if (costs[index] !== undefined) {
                span.textContent = costs[index].toString();
            }
        });
    }    openStore(score: number, scaledCosts: { 
        HEALTH: number, 
        DAMAGE: number, 
        SPEED: number, 
        FIRE_RATE: number,
        NANITE_DRONE: number,
        SUPER_BULLET?: number
    }) {
        const scoreSpan = document.getElementById('available-score');
        if (this.storeModal && scoreSpan) {
            this.storeModal.style.display = 'block';
            scoreSpan.textContent = `Available Score: ${score}`;
            this.updateUpgradeCosts(scaledCosts);
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
    }    openDebugMenu(playerHealth: number, bulletDamage: number, moveSpeed: number, fireRate: number, score?: number, missiles?: number, drones?: number, superBulletLevel?: number, glitchedBulletLevel?: number) {
        if (this.debugModal) {
            (document.getElementById('debug-health') as HTMLInputElement).value = playerHealth.toString();
            (document.getElementById('debug-damage') as HTMLInputElement).value = bulletDamage.toString();
            (document.getElementById('debug-speed') as HTMLInputElement).value = moveSpeed.toString();
            (document.getElementById('debug-firerate') as HTMLInputElement).value = fireRate.toString();
            
            // Update new debug fields if provided
            if (score !== undefined) {
                (document.getElementById('debug-score') as HTMLInputElement).value = score.toString();
            }
            if (missiles !== undefined) {
                (document.getElementById('debug-missiles') as HTMLInputElement).value = missiles.toString();
            }
            if (drones !== undefined) {
                (document.getElementById('debug-drones') as HTMLInputElement).value = drones.toString();
            }
            if (superBulletLevel !== undefined) {
                (document.getElementById('debug-super-bullet') as HTMLInputElement).value = superBulletLevel.toString();
            }
            if (glitchedBulletLevel !== undefined) {
                (document.getElementById('debug-glitched-bullet') as HTMLInputElement).value = glitchedBulletLevel.toString();
            }
            
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
    }    updateMissileCount(count: number) {
        if (this.missileCountElement) {
            this.missileCountElement.textContent = `Homing Missiles: ${count}`;
            this.missileCountElement.style.opacity = count > 0 ? '1' : '0.5';
        }
    }    updateEMPCooldown(remainingCooldown: number, totalCooldown: number) {
        // Update circular progress
        if (this.empTimer && this.empReady) {
            const progress = (totalCooldown - remainingCooldown) / totalCooldown;
            const percentage = Math.min(100, progress * 100);
            
            // Update the circular progress using conic gradient
            this.empTimer.style.background = 
                `conic-gradient(transparent ${percentage}%, #00ffff ${percentage}%)`;

            if (remainingCooldown <= 0) {
                this.empTimer.style.boxShadow = '0 0 15px #00ffff';
                this.empReady.style.opacity = '1';
            } else {
                this.empTimer.style.boxShadow = '0 0 10px #00ffff';
                this.empReady.style.opacity = '0';
            }
        }

        // Update text display
        if (this.empCountElement) {
            if (remainingCooldown > 0) {
                const seconds = (remainingCooldown / 1000).toFixed(1);
                this.empCountElement.textContent = `EMP: ${seconds}s`;
                this.empCountElement.style.opacity = '0.5';
            } else {
                this.empCountElement.textContent = 'EMP: Ready';
                this.empCountElement.style.opacity = '1';
            }
        }
    }    updateShieldOverdriveCooldown(remainingCooldown: number, totalCooldown: number) {
        if (this.shieldTimer && this.shieldReady) {
            const cooldownPercentage = (remainingCooldown / totalCooldown) * 100;
            
            // Update the circular progress using conic gradient
            this.shieldTimer.style.background = 
                `conic-gradient(transparent ${cooldownPercentage}%, #4444ff ${cooldownPercentage}%)`;

            if (remainingCooldown <= 0) {
                this.shieldTimer.style.boxShadow = '0 0 15px #4444ff';
                this.shieldReady.style.opacity = '1';
            } else {
                this.shieldTimer.style.boxShadow = '0 0 10px #4444ff';
                this.shieldReady.style.opacity = '0';
            }
        }
    }    /**
     * Show Shield Overdrive UI elements when the ability is unlocked
     */
    showShieldOverdriveUI() {
        if (this.shieldContainer) {
            this.shieldContainer.style.display = 'block';
        }
        if (this.shieldControlItem && this.shieldControlItem.id === 'shield-control-item') {
            this.shieldControlItem.style.display = 'flex';
        }
    }

    /**
     * Hide Shield Overdrive UI elements when the ability is locked or on game reset
     */
    hideShieldOverdriveUI() {
        if (this.shieldContainer) {
            this.shieldContainer.style.display = 'none';
        }
        if (this.shieldControlItem && this.shieldControlItem.id === 'shield-control-item') {
            this.shieldControlItem.style.display = 'none';
        }
    }

    showDebugFeedback(message: string, isError: boolean = false) {
        const feedbackDiv = document.getElementById('debug-feedback');
        if (feedbackDiv) {
            feedbackDiv.textContent = message;
            feedbackDiv.className = `debug-feedback ${isError ? 'error' : 'success'}`;
            
            // Clear the message after 3 seconds
            setTimeout(() => {
                feedbackDiv.textContent = '';
                feedbackDiv.className = 'debug-feedback';
            }, 3000);
        }    }

    /**
     * Update enemy position indicators
     * Shows arrows at screen edges pointing to enemies when there are 10 or fewer
     */
    updateEnemyIndicators(enemies: any[], camera: any, playerPosition: any): void {
        this.enemyIndicators.updateIndicators(enemies, camera, playerPosition);
    }

    // Create screen flash effect for Super Nova
    createScreenFlash() {
        // Create flash overlay
        const flashOverlay = document.createElement('div');
        flashOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,170,0,0.6) 50%, rgba(255,100,0,0.3) 100%);
            z-index: 9999;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.1s ease-out;
        `;
        
        document.body.appendChild(flashOverlay);
        
        // Flash sequence
        setTimeout(() => {
            flashOverlay.style.opacity = '1';
        }, 10);
        
        setTimeout(() => {
            flashOverlay.style.opacity = '0';
        }, GameConfig.SUPER_NOVA.SCREEN_FLASH_DURATION);
        
        setTimeout(() => {
            document.body.removeChild(flashOverlay);
        }, GameConfig.SUPER_NOVA.SCREEN_FLASH_DURATION + 200);
        
        // Create Super Nova text popup
        this.showSuperNovaText();
    }

    // Show "SUPER NOVA!" text
    private showSuperNovaText() {
        const textElement = document.createElement('div');
        textElement.textContent = '🌟 SUPER NOVA! 🌟';
        textElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            font-weight: bold;
            color: #ffaa00;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(255,170,0,0.8);
            z-index: 10000;
            pointer-events: none;
            animation: superNovaText 2s ease-out forwards;
        `;
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes superNovaText {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                20% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                80% { opacity: 1; transform: translate(-50%, -50%) scale(1.0); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(textElement);
        
        // Remove after animation
        setTimeout(() => {
            document.body.removeChild(textElement);
            document.head.removeChild(style);
        }, 2000);
    }
}
