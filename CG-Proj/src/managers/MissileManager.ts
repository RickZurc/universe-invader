import * as THREE from 'three';
import { HomingMissile } from '../models/HomingMissile';
import { Enemy } from '../models/Enemy';
import { EnemyManager } from './EnemyManager';
import { SceneManager } from './SceneManager';

export class MissileManager {
    private scene: THREE.Scene;
    private missiles: HomingMissile[] = [];
    private enemyManager: EnemyManager;
    private sceneManager: SceneManager;

    constructor(scene: THREE.Scene, enemyManager: EnemyManager, sceneManager: SceneManager) {
        this.scene = scene;
        this.enemyManager = enemyManager;
        this.sceneManager = sceneManager;
    }

    launchMissile(
        position: THREE.Vector3,
        direction: THREE.Vector3,
        currentRound: number,
        onEnemyDestroyed?: (enemy: Enemy, score: number) => void
    ) {
        const missile = new HomingMissile(
            this.scene,
            position,
            direction,
            this.enemyManager,
            this.sceneManager,
            currentRound,
            onEnemyDestroyed
        );
        this.missiles.push(missile);
        this.scene.add(missile);
    }

    updateMissiles(enemies: Enemy[]) {
        this.missiles = this.missiles.filter(missile => {
            const isActive = missile.update(enemies);
            if (!isActive) {
                this.scene.remove(missile);
            }
            return isActive;
        });
    }

    clear() {
        this.missiles.forEach(missile => {
            missile.explode();
            this.scene.remove(missile);
        });
        this.missiles = [];
    }
}
