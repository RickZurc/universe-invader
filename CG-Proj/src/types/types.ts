export type EnemyTypeKey = keyof typeof EnemyType;

export const EnemyType = {
    Normal: 0,
    Boss: 1,
    Special: 2
} as const;

export interface GameState {
    score: number;
    playerHealth: number;
    maxHealth: number;
    currentRound: number;
    bulletDamage: number;
    moveSpeed: number;
    hasShieldOverdrive: boolean;
    lastShieldTime: number;
    piercingLevel: number;
    superBulletLevel: number;
}
