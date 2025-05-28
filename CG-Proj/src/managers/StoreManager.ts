import { GameConfig } from '../config/GameConfig';
import { UIManager } from './UIManager';

export class StoreManager {
    private score: number;
    private currentRound: number;
    private uiManager: UIManager;
    private onUpgrade: (type: string, cost: number) => void;

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
    }

    private getScaledCost(baseCost: number): number {
        const scaleFactor = Math.pow(GameConfig.DIFFICULTY.UPGRADE_COST_SCALE_FACTOR, this.currentRound - 1);
        return Math.floor(baseCost * scaleFactor);
    }

    private updateUpgradeButtons() {
        const upgrades = [
            { id: 'health-upgrade', cost: this.getScaledCost(GameConfig.UPGRADE_COSTS.HEALTH) },
            { id: 'damage-upgrade', cost: this.getScaledCost(GameConfig.UPGRADE_COSTS.DAMAGE) },
            { id: 'speed-upgrade', cost: this.getScaledCost(GameConfig.UPGRADE_COSTS.SPEED) },
            { id: 'firerate-upgrade', cost: this.getScaledCost(GameConfig.UPGRADE_COSTS.FIRE_RATE) },
            { id: 'nanite-upgrade', cost: this.getScaledCost(GameConfig.UPGRADE_COSTS.NANITE_DRONE) }
        ];

        const availableScore = document.getElementById('available-score');
        if (availableScore) {
            availableScore.textContent = `Available Score: ${this.score}`;
        }

        const scaledCosts = {
            HEALTH: upgrades[0].cost,
            DAMAGE: upgrades[1].cost,
            SPEED: upgrades[2].cost,
            FIRE_RATE: upgrades[3].cost,
            NANITE_DRONE: upgrades[4].cost
        };

        upgrades.forEach(({ id, cost }) => {
            const button = document.getElementById(id) as HTMLButtonElement;
            if (button) {
                button.disabled = this.score < cost;
            }
        });

        // Update cost displays in UI
        this.uiManager.updateUpgradeCosts(scaledCosts);
    }

    openStore() {
        const scaledCosts = {
            HEALTH: this.getScaledCost(GameConfig.UPGRADE_COSTS.HEALTH),
            DAMAGE: this.getScaledCost(GameConfig.UPGRADE_COSTS.DAMAGE),
            SPEED: this.getScaledCost(GameConfig.UPGRADE_COSTS.SPEED),
            FIRE_RATE: this.getScaledCost(GameConfig.UPGRADE_COSTS.FIRE_RATE)
        };
        this.uiManager.openStore(this.score, scaledCosts);
        this.updateUpgradeButtons();
    }

    private setupStoreListeners() {
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
            }
        ];

        upgrades.forEach(({ id, type, getCost }) => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', () => {
                    const currentCost = getCost();
                    if (this.score >= currentCost) {
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
    }
}
