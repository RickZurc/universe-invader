import { GameConfig } from '../config/GameConfig';
import { UIManager } from './UIManager';

export class StoreManager {
    private score: number;
    private currentRound: number;
    private uiManager: UIManager;
    private onUpgrade: (type: string, cost: number) => void;
    private piercingLevel: number = 0; // Track current piercing level
    private superBulletLevel: number = 0; // Track current super bullet level
    private glitchedBulletLevel: number = 0; // Track current glitched bullet level

    constructor(uiManager: UIManager, onUpgrade: (type: string, cost: number) => void) {
        this.score = 0;
        this.currentRound = 1;
        this.uiManager = uiManager;
        this.onUpgrade = onUpgrade;
        this.setupStoreListeners();
    }

    setScore(score: number) {
        this.score = score;
        this.updateUpgradeButtons();
    }

    setRound(round: number) {
        this.currentRound = round;
        this.updateUpgradeButtons();
    }    setPiercingLevel(level: number) {
        this.piercingLevel = level;
        this.updateUpgradeButtons();
    }

    getPiercingLevel(): number {
        return this.piercingLevel;
    }

    setSuperBulletLevel(level: number) {
        this.superBulletLevel = level;
        this.updateUpgradeButtons();
    }

    getSuperBulletLevel(): number {
        return this.superBulletLevel;
    }

    setGlitchedBulletLevel(level: number) {
        this.glitchedBulletLevel = level;
        this.updateUpgradeButtons();
    }

    getGlitchedBulletLevel(): number {
        return this.glitchedBulletLevel;
    }

    private getScaledCost(baseCost: number): number {
        const scaleFactor = Math.pow(GameConfig.DIFFICULTY.UPGRADE_COST_SCALE_FACTOR, this.currentRound - 1);
        return Math.floor(baseCost * scaleFactor);
    }    private updateUpgradeButtons() {        const upgrades = [
            { id: 'health-upgrade', cost: this.getScaledCost(GameConfig.UPGRADE_COSTS.HEALTH) },
            { id: 'damage-upgrade', cost: this.getScaledCost(GameConfig.UPGRADE_COSTS.DAMAGE) },
            { id: 'speed-upgrade', cost: this.getScaledCost(GameConfig.UPGRADE_COSTS.SPEED) },
            { id: 'firerate-upgrade', cost: this.getScaledCost(GameConfig.UPGRADE_COSTS.FIRE_RATE) },
            { id: 'nanite-upgrade', cost: this.getScaledCost(GameConfig.UPGRADE_COSTS.NANITE_DRONE) },
            { id: 'piercing-upgrade', cost: this.getPiercingUpgradeCost() },
            { id: 'super-bullet-upgrade', cost: this.getSuperBulletUpgradeCost() },
            { id: 'glitched-bullet-upgrade', cost: this.getGlitchedBulletUpgradeCost() },
            { id: 'shield-upgrade', cost: this.getScaledCost(GameConfig.UPGRADE_COSTS.SHIELD_OVERDRIVE) }
        ];

        const availableScore = document.getElementById('available-score');
        if (availableScore) {
            availableScore.textContent = `Available Score: ${this.score}`;
        }        upgrades.forEach(({ id, cost }) => {
            const button = document.getElementById(id) as HTMLButtonElement;
            if (button) {
                const canAfford = this.score >= cost;
                  // Special handling for piercing upgrade - disable if max level reached
                const isPiercingMaxLevel = id === 'piercing-upgrade' && this.piercingLevel >= GameConfig.PIERCING_BULLETS.MAX_LEVEL;
                const isSuperBulletMaxLevel = id === 'super-bullet-upgrade' && this.superBulletLevel >= GameConfig.SUPER_BULLET.MAX_LEVEL;
                const isGlitchedBulletMaxLevel = id === 'glitched-bullet-upgrade' && this.glitchedBulletLevel >= GameConfig.GLITCHED_BULLET.MAX_LEVEL;
                const isMaxLevel = isPiercingMaxLevel || isSuperBulletMaxLevel || isGlitchedBulletMaxLevel;
                
                button.disabled = !canAfford || isMaxLevel;
                if (canAfford && !isMaxLevel) {
                    button.classList.remove('disabled');
                } else {
                    button.classList.add('disabled');
                }
                
                const costSpan = button.querySelector('.upgrade-cost');
                if (costSpan) {
                    if (isMaxLevel) {
                        costSpan.textContent = 'MAX';
                    } else {
                        costSpan.textContent = cost.toString();
                    }
                }
                  // Update button text to show current level for piercing
                if (id === 'piercing-upgrade' && this.piercingLevel > 0) {
                    const buttonText = button.querySelector('.upgrade-name') || button.childNodes[0];
                    if (buttonText) {
                        buttonText.textContent = `Piercing Bullets Lv.${this.piercingLevel}`;
                    }
                }
                
                // Update button text to show current level for super bullet
                if (id === 'super-bullet-upgrade' && this.superBulletLevel > 0) {
                    const buttonText = button.querySelector('.upgrade-name') || button.childNodes[0];
                    if (buttonText) {
                        const critChance = this.superBulletLevel * GameConfig.SUPER_BULLET.CRIT_CHANCE_PER_LEVEL;
                        buttonText.textContent = `Super Bullet Lv.${this.superBulletLevel} (${critChance}% Crit)`;
                    }
                }

                // Update button text to show current level for glitched bullet
                if (id === 'glitched-bullet-upgrade' && this.glitchedBulletLevel > 0) {
                    const buttonText = button.querySelector('.upgrade-name') || button.childNodes[0];
                    if (buttonText) {
                        buttonText.textContent = `Glitched Bullet Lv.${this.glitchedBulletLevel}`;
                    }
                }
            }
        });
    }    openStore() {
        const scaledCosts = {
            HEALTH: this.getScaledCost(GameConfig.UPGRADE_COSTS.HEALTH),
            DAMAGE: this.getScaledCost(GameConfig.UPGRADE_COSTS.DAMAGE),
            SPEED: this.getScaledCost(GameConfig.UPGRADE_COSTS.SPEED),
            FIRE_RATE: this.getScaledCost(GameConfig.UPGRADE_COSTS.FIRE_RATE),
            NANITE_DRONE: this.getScaledCost(GameConfig.UPGRADE_COSTS.NANITE_DRONE),
            PIERCING_BULLETS: this.getPiercingUpgradeCost(),
            SUPER_BULLET: this.getSuperBulletUpgradeCost(),
            SHIELD_OVERDRIVE: this.getScaledCost(GameConfig.UPGRADE_COSTS.SHIELD_OVERDRIVE)
        };
        this.uiManager.openStore(this.score, scaledCosts);
        this.updateUpgradeButtons();
    }private setupStoreListeners() {
        const upgrades = [
            { 
                id: 'health-upgrade', 
                type: 'health',
                getCost: () => this.getScaledCost(GameConfig.UPGRADE_COSTS.HEALTH)
            },
            { 
                id: 'damage-upgrade', 
                type: 'damage',
                getCost: () => this.getScaledCost(GameConfig.UPGRADE_COSTS.DAMAGE)
            },
            { 
                id: 'speed-upgrade', 
                type: 'speed',
                getCost: () => this.getScaledCost(GameConfig.UPGRADE_COSTS.SPEED)
            },
            { 
                id: 'firerate-upgrade', 
                type: 'firerate',
                getCost: () => this.getScaledCost(GameConfig.UPGRADE_COSTS.FIRE_RATE)
            },
            {
                id: 'nanite-upgrade',
                type: 'nanite',
                getCost: () => this.getScaledCost(GameConfig.UPGRADE_COSTS.NANITE_DRONE)
            },            {
                id: 'piercing-upgrade',
                type: 'piercing',
                getCost: () => this.getPiercingUpgradeCost()
            },            {
                id: 'super-bullet-upgrade',
                type: 'super-bullet',
                getCost: () => this.getSuperBulletUpgradeCost()
            },
            {
                id: 'glitched-bullet-upgrade',
                type: 'glitched-bullet',
                getCost: () => this.getGlitchedBulletUpgradeCost()
            },
            {
                id: 'shield-upgrade',
                type: 'shield',
                getCost: () => this.getScaledCost(GameConfig.UPGRADE_COSTS.SHIELD_OVERDRIVE)
            }
        ];upgrades.forEach(({ id, type, getCost }) => {
            const button = document.getElementById(id) as HTMLButtonElement;
            if (button) {
                button.addEventListener('click', () => {
                    const currentCost = getCost();
                    if (this.score >= currentCost && !button.disabled) {
                        this.onUpgrade(type, currentCost);
                    }
                });
            }
        });

        document.getElementById('continue-button')?.addEventListener('click', () => {
            this.uiManager.closeStore();
        });

        document.getElementById('save-game')?.addEventListener('click', () => {
            // This will be handled by GameManager
        });
    }    // Calculate cost for piercing upgrade based on current level
    private getPiercingUpgradeCost(): number {
        if (this.piercingLevel >= GameConfig.PIERCING_BULLETS.MAX_LEVEL) {
            return Infinity; // Max level reached
        }
        
        const nextLevel = this.piercingLevel + 1;
        const baseCost = GameConfig.PIERCING_BULLETS.BASE_COST;
        const multiplier = Math.pow(GameConfig.PIERCING_BULLETS.COST_MULTIPLIER, nextLevel - 1);
        const levelCost = Math.floor(baseCost * multiplier);
        
        // Apply round scaling
        return this.getScaledCost(levelCost);
    }

    // Calculate cost for super bullet upgrade based on current level
    private getSuperBulletUpgradeCost(): number {
        if (this.superBulletLevel >= GameConfig.SUPER_BULLET.MAX_LEVEL) {
            return Infinity; // Max level reached
        }
        
        const nextLevel = this.superBulletLevel + 1;
        const baseCost = GameConfig.SUPER_BULLET.BASE_COST;
        const multiplier = Math.pow(GameConfig.SUPER_BULLET.COST_MULTIPLIER, nextLevel - 1);
        const levelCost = Math.floor(baseCost * multiplier);
        
        // Apply round scaling
        return this.getScaledCost(levelCost);
    }

    // Calculate cost for glitched bullet upgrade based on current level
    private getGlitchedBulletUpgradeCost(): number {
        if (this.glitchedBulletLevel >= GameConfig.GLITCHED_BULLET.MAX_LEVEL) {
            return Infinity; // Max level reached
        }
        
        const nextLevel = this.glitchedBulletLevel + 1;
        const baseCost = GameConfig.GLITCHED_BULLET.BASE_COST;
        const multiplier = Math.pow(GameConfig.GLITCHED_BULLET.COST_MULTIPLIER, nextLevel - 1);
        const levelCost = Math.floor(baseCost * multiplier);
        
        // Apply round scaling
        return this.getScaledCost(levelCost);
    }
}
