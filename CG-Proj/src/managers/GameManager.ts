import type { GameState } from '../types/types';

export class GameManager {
    private static instance: GameManager;
    
    private constructor() {}

    static getInstance(): GameManager {
        if (!GameManager.instance) {
            GameManager.instance = new GameManager();
        }
        return GameManager.instance;
    }

    saveGame(gameState: GameState) {
        try {
            localStorage.setItem('universeInvaderSave', JSON.stringify({
                ...gameState,
                lastSaveTime: Date.now()
            }));
            return true;
        } catch (error) {
            console.error('Failed to save game:', error);
            return false;
        }
    }

    loadGame(): GameState | null {
        try {
            const savedGame = localStorage.getItem('universeInvaderSave');
            if (savedGame) {
                const parsed = JSON.parse(savedGame);
                return {
                    score: parsed.score,
                    playerHealth: parsed.playerHealth,
                    maxHealth: parsed.maxHealth,
                    currentRound: parsed.currentRound,
                    bulletDamage: parsed.bulletDamage,
                    moveSpeed: parsed.moveSpeed,
                    hasShieldOverdrive: parsed.hasShieldOverdrive || false,
                    lastShieldTime: parsed.lastShieldTime || 0
                };
            }
        } catch (error) {
            console.error('Failed to load game:', error);
        }
        return null;
    }

    clearSave() {
        localStorage.removeItem('universeInvaderSave');
    }
}
