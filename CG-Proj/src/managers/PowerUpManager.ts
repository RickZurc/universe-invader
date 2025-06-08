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
                collectedType = powerUp.getType();                // Create pickup effect with different colors for different types
                const effectColor = powerUp.getType() === PowerUpType.SUPER_NOVA ? 0xffaa00 : 0xff00ff;
                ParticleSystem.createExplosion(
                    this.scene,
                    powerUp.position.clone(),
                    effectColor
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
            Math.random() * (GameConfig.POWER_UP.MAX_SPAWN_DISTANCE - GameConfig.POWER_UP.MIN_SPAWN_DISTANCE);        const x = this.playerShip.position.x + Math.cos(angle) * distance;
        const y = this.playerShip.position.y + Math.sin(angle) * distance;

        // Determine power-up type - Super Nova is very rare!
        const powerUpType = Math.random() < GameConfig.POWER_UP.SUPER_NOVA_CHANCE 
            ? PowerUpType.SUPER_NOVA 
            : PowerUpType.HOMING_MISSILE;

        const powerUp = new PowerUp(powerUpType, new THREE.Vector3(x, y, 0));

        this.powerUps.push(powerUp);
        this.scene.add(powerUp);        // Create spawn effect with different colors for different types  
        const spawnEffectColor = powerUpType === PowerUpType.SUPER_NOVA ? 0xffaa00 : 0xff00ff;
        ParticleSystem.createExplosion(
            this.scene,
            new THREE.Vector3(x, y, 0).clone(),
            spawnEffectColor
        );
    }    // Create massive Super Nova explosion effect
    createSuperNovaExplosion(position: THREE.Vector3) {
        // Create multiple explosion waves with different colors and sizes
        const explosionColors = [0xffaa00, 0xff6600, 0xffffff, 0xffdd00];
        
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                const randomOffset = new THREE.Vector3(
                    (Math.random() - 0.5) * 6,
                    (Math.random() - 0.5) * 6,
                    0
                );
                const explosionPos = position.clone().add(randomOffset);
                const color = explosionColors[i % explosionColors.length];
                
                ParticleSystem.createExplosion(this.scene, explosionPos, color);
                
                // Add additional smaller explosions around each main explosion
                if (i % 2 === 0) {
                    for (let j = 0; j < 3; j++) {
                        setTimeout(() => {
                            const smallOffset = new THREE.Vector3(
                                (Math.random() - 0.5) * 2,
                                (Math.random() - 0.5) * 2,
                                0
                            );
                            ParticleSystem.createExplosion(
                                this.scene, 
                                explosionPos.clone().add(smallOffset), 
                                0xffff00
                            );
                        }, j * 50);
                    }
                }
            }, i * 80);
        }

        // Create expanding shockwave effect
        this.createShockwaveEffect(position);
    }

    // Create visual shockwave effect
    private createShockwaveEffect(position: THREE.Vector3) {
        // Create expanding ring geometry
        const ringGeometry = new THREE.RingGeometry(0.5, 1, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const shockwave = new THREE.Mesh(ringGeometry, ringMaterial);
        shockwave.position.copy(position);
        this.scene.add(shockwave);

        // Animate the shockwave expansion
        let scale = 1;
        let opacity = 0.6;
        const expandInterval = setInterval(() => {
            scale += 2;
            opacity -= 0.03;
            
            shockwave.scale.setScalar(scale);
            ringMaterial.opacity = Math.max(0, opacity);
            
            if (opacity <= 0) {
                this.scene.remove(shockwave);
                clearInterval(expandInterval);
            }
        }, 50);
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
