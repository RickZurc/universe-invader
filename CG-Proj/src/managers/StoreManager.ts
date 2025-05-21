import { GameConfig } from '../config/GameConfig';
import { UIManager } from './UIManager';

export class StoreManager {
    private score: number;
    private uiManager: UIManager;
    private onUpgrade: (type: string, cost: number) => void;

    constructor(uiManager: UIManager, onUpgrade: (type: string, cost: number) => void) {
        this.score = 0;
        this.uiManager = uiManager;
        this.onUpgrade = onUpgrade;
        this.setupStoreListeners();
    }    private setupStoreListeners() {
        const upgrades = [
            { id: 'health-upgrade', type: 'health', cost: GameConfig.UPGRADE_COSTS.HEALTH },
            { id: 'damage-upgrade', type: 'damage', cost: GameConfig.UPGRADE_COSTS.DAMAGE },
            { id: 'speed-upgrade', type: 'speed', cost: GameConfig.UPGRADE_COSTS.SPEED },
            { id: 'firerate-upgrade', type: 'firerate', cost: GameConfig.UPGRADE_COSTS.FIRE_RATE }
        ];

        upgrades.forEach(({ id, type, cost }) => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', () => {
                    if (this.score >= cost) {
                        this.onUpgrade(type, cost);
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
    }    setScore(score: number) {
        this.score = score;
        this.updateUpgradeButtons();
    }
      private updateUpgradeButtons() {
        const upgrades = [
            { id: 'health-upgrade', cost: GameConfig.UPGRADE_COSTS.HEALTH },
            { id: 'damage-upgrade', cost: GameConfig.UPGRADE_COSTS.DAMAGE },
            { id: 'speed-upgrade', cost: GameConfig.UPGRADE_COSTS.SPEED },
            { id: 'firerate-upgrade', cost: GameConfig.UPGRADE_COSTS.FIRE_RATE }
        ];

        const availableScore = document.getElementById('available-score');
        if (availableScore) {
            availableScore.textContent = `Available Score: ${this.score}`;
        }

        upgrades.forEach(({ id, cost }) => {
            const button = document.getElementById(id) as HTMLButtonElement;
            if (button) {
                button.disabled = this.score < cost;
            }
        });
    }

    openStore() {
        this.uiManager.openStore(this.score);
    }
}
