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
        localStorage.setItem('universeInvaderSave', JSON.stringify(gameState));
    }

    loadGame(): GameState | null {
        const savedGame = localStorage.getItem('universeInvaderSave');
        if (savedGame) {
            return JSON.parse(savedGame);
        }
        return null;
    }

    clearSave() {
        localStorage.removeItem('universeInvaderSave');
    }
}
