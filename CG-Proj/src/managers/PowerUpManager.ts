import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig';
import { PowerUp, PowerUpType } from '../models/PowerUp';
import { ParticleSystem } from '../systems/ParticleSystem';

export class PowerUpManager {
    private scene: THREE.Scene;
    private playerShip: THREE.Group;
    private powerUps: PowerUp[] = [];
    private lastSpawnTime: number = 0;

    constructor(scene: THREE.Scene, playerShip: THREE.Group) {
        this.scene = scene;
        this.playerShip = playerShip;
    }

    update() {
        const now = Date.now();

        // Check if we should spawn a new power-up
        if (now - this.lastSpawnTime > GameConfig.POWER_UP.SPAWN_INTERVAL && 
            this.powerUps.length < GameConfig.POWER_UP.MAX_ACTIVE &&
            Math.random() < GameConfig.POWER_UP.SPAWN_CHANCE) {
            this.spawnPowerUp();
            this.lastSpawnTime = now;
        }

        // Update existing power-ups
        this.powerUps.forEach(powerUp => {
            powerUp.update();
        });
    }

    checkCollisions(): PowerUpType | null {
        const pickupRadius = GameConfig.POWER_UP.PICKUP_RADIUS;
        let collectedType: PowerUpType | null = null;

        this.powerUps = this.powerUps.filter(powerUp => {
            const distance = powerUp.position.distanceTo(this.playerShip.position);

            if (distance < pickupRadius) {
                collectedType = powerUp.getType();
                // Create pickup effect
                ParticleSystem.createExplosion(
                    this.scene,
                    powerUp.position.clone(),
                    0xff00ff
                );

                this.scene.remove(powerUp);
                return false;
            }
            return true;
        });

        return collectedType;
    }

    private spawnPowerUp() {
        if (this.powerUps.length >= GameConfig.POWER_UP.MAX_ACTIVE) {
            return;
        }

        // Random angle around player
        const angle = Math.random() * Math.PI * 2;
        const distance = GameConfig.POWER_UP.MIN_SPAWN_DISTANCE + 
            Math.random() * (GameConfig.POWER_UP.MAX_SPAWN_DISTANCE - GameConfig.POWER_UP.MIN_SPAWN_DISTANCE);

        const x = this.playerShip.position.x + Math.cos(angle) * distance;
        const y = this.playerShip.position.y + Math.sin(angle) * distance;        // Only spawn homing missiles now
        const powerUp = new PowerUp(PowerUpType.HOMING_MISSILE, new THREE.Vector3(x, y, 0));

        this.powerUps.push(powerUp);
        this.scene.add(powerUp);

        // Create spawn effect
        ParticleSystem.createExplosion(
            this.scene,
            new THREE.Vector3(x, y, 0).clone(),
            0xff00ff
        );
    }

    getPowerUps() {
        return this.powerUps;
    }

    clear() {
        this.powerUps.forEach(powerUp => {
            this.scene.remove(powerUp);
        });
        this.powerUps = [];
    }
}
