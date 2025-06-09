import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig';

interface BulletPool {
    geometry: THREE.CylinderGeometry;
    normalMaterial: THREE.MeshPhongMaterial;
    criticalMaterial: THREE.MeshPhongMaterial;
    glitchedMaterial: THREE.MeshPhongMaterial;
    light: THREE.PointLight;
}

export class BulletManager {
    private scene: THREE.Scene;
    private playerShip: THREE.Group;
    private bullets: THREE.Mesh[] = [];
    private bulletDamage: number;
    private piercingLevel: number = 0; // Level 0 = no piercing, Level 1+ = piercing
    private superBulletLevel: number = 0; // Level 0 = no critical hits, Level 1+ = critical hits
    private glitchedBulletLevel: number = 0; // Level 0 = no glitched bullets, Level 1+ = glitched bullets
    // Object pooling for performance
    private bulletPool!: BulletPool;
    private maxBullets: number = 75; // Limit total bullets to prevent performance issues
    private sharedLight!: THREE.PointLight; // Single shared light instead of per-bullet lights

    constructor(scene: THREE.Scene, playerShip: THREE.Group) {
        this.scene = scene;
        this.playerShip = playerShip;
        this.bulletDamage = GameConfig.INITIAL_BULLET_DAMAGE;
        this.initializeBulletPool();
        this.initializeSharedLight();
    }

    private initializeBulletPool() {
        // Create reusable geometry and materials
        this.bulletPool = {
            geometry: new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8),
            normalMaterial: new THREE.MeshPhongMaterial({
                color: 0x00ffff,
                emissive: 0x004444,
                shininess: 100,
                transparent: true,
                opacity: 0.9
            }),
            criticalMaterial: new THREE.MeshPhongMaterial({
                color: 0xffaa00,
                emissive: 0x664400,
                shininess: 100,
                transparent: true,
                opacity: 0.9
            }),
            glitchedMaterial: new THREE.MeshPhongMaterial({
                color: 0xaa00aa,
                emissive: 0x440044,
                shininess: 100,
                transparent: true,
                opacity: 0.8
            }),
            light: new THREE.PointLight(0x00ffff, 0.8, 4)
        };
    } private initializeSharedLight() {
        // Create a single shared light that follows bullets instead of per-bullet lights
        this.sharedLight = new THREE.PointLight(0x00ffff, 1.5, 8);
        this.sharedLight.position.set(0, 0, 0.5);
        this.scene.add(this.sharedLight);
    }

    private updateSharedLight() {
        // Update shared light to follow the player's position for better lighting
        if (this.bullets.length > 0) {
            // Position light near the player where bullets are being fired
            this.sharedLight.position.copy(this.playerShip.position);
            this.sharedLight.position.z = 0.5;
        }
    } 
    shoot(mouseWorldPosition: THREE.Vector3) {
        // Performance check: limit total bullet count
        if (this.bullets.length >= this.maxBullets) {
            return; // Don't create more bullets if at limit
        }

        // Determine if this is a critical hit
        const critChance = this.superBulletLevel * GameConfig.SUPER_BULLET.CRIT_CHANCE_PER_LEVEL;
        const isCritical = Math.random() * 100 < critChance;

        // Use pooled geometry and material instead of creating new ones
        const material = isCritical ? this.bulletPool.criticalMaterial : this.bulletPool.normalMaterial;
        const bullet = new THREE.Mesh(this.bulletPool.geometry, material);

        // Scale for critical bullets
        if (isCritical) {
            const scale = GameConfig.SUPER_BULLET.VISUAL_SCALE;
            bullet.scale.set(scale, scale, scale);
        }

        // Position calculation
        const offset = 1;
        bullet.position.set(
            this.playerShip.position.x + Math.cos(this.playerShip.rotation.z + Math.PI / 2) * offset,
            this.playerShip.position.y + Math.sin(this.playerShip.rotation.z + Math.PI / 2) * offset,
            0
        );

        const dx = mouseWorldPosition.x - bullet.position.x;
        const dy = mouseWorldPosition.y - bullet.position.y;

        const length = Math.sqrt(dx * dx + dy * dy);
        const normalizedDx = dx / length;
        const normalizedDy = dy / length;

        // Orient the cylinder to point in the direction of travel
        const angle = Math.atan2(dy, dx);
        bullet.rotation.z = angle - Math.PI / 2; // Adjust for cylinder's default orientation

        // Set bullet data
        bullet.userData.directionX = normalizedDx;
        bullet.userData.directionY = normalizedDy;
        bullet.userData.piercingLeft = this.piercingLevel > 0 ?
            GameConfig.PIERCING_BULLETS.BASE_PENETRATION + (this.piercingLevel - 1) * GameConfig.PIERCING_BULLETS.PENETRATION_PER_LEVEL : 0;
        bullet.userData.hitEnemies = new Set(); // Track which enemies this bullet has hit
        bullet.userData.isCritical = isCritical; // Track if this is a critical hit

        this.bullets.push(bullet);
        this.scene.add(bullet);

        // Update shared light position to follow the most recent bullet
        this.updateSharedLight();
    } 
    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];

            // Handle movement for different bullet types
            if (bullet.userData.isGlitched) {
                // Glitched bullets use their stored direction and speed
                const speed = bullet.userData.speed || GameConfig.BULLET_SPEED;
                bullet.position.add(bullet.userData.direction.clone().multiplyScalar(speed));
            } else {
                // Regular bullets use the old system
                const bulletSpeed = GameConfig.BULLET_SPEED;
                bullet.position.x += bullet.userData.directionX * bulletSpeed;
                bullet.position.y += bullet.userData.directionY * bulletSpeed;
            }

            if (bullet.position.distanceTo(this.playerShip.position) > 30) {
                this.removeBulletAtIndex(i);
            }
        }

        // Update shared light position
        this.updateSharedLight();
    }

    private removeBulletAtIndex(index: number) {
        if (index >= 0 && index < this.bullets.length) {
            const bullet = this.bullets[index];

            // Reset scale for reuse
            bullet.scale.set(1, 1, 1);

            // Remove from scene and array
            this.scene.remove(bullet);
            this.bullets.splice(index, 1);
        }
    }

    getBullets() {
        return this.bullets;
    } 
    removeBullet(bullet: THREE.Mesh) {
        const index = this.bullets.indexOf(bullet);
        if (index > -1) {
            this.removeBulletAtIndex(index);
        }
    }

    setBulletDamage(damage: number) {
        this.bulletDamage = damage;
    } 
    getBulletDamage() {
        return this.bulletDamage;
    }

    setPiercingLevel(level: number) {
        this.piercingLevel = Math.max(0, Math.min(level, GameConfig.PIERCING_BULLETS.MAX_LEVEL));
    } 
    getPiercingLevel() {
        return this.piercingLevel;
    }

    setSuperBulletLevel(level: number) {
        this.superBulletLevel = Math.max(0, Math.min(level, GameConfig.SUPER_BULLET.MAX_LEVEL));
    }

    getSuperBulletLevel() {
        return this.superBulletLevel;
    }

    setGlitchedBulletLevel(level: number) {
        this.glitchedBulletLevel = Math.max(0, Math.min(level, GameConfig.GLITCHED_BULLET.MAX_LEVEL));
    }

    getGlitchedBulletLevel() {
        return this.glitchedBulletLevel;
    }

    // Get bullet damage, accounting for critical hits
    getBulletDamageForBullet(bullet: THREE.Mesh): number {
        const baseDamage = this.bulletDamage;
        if (bullet.userData.isCritical) {
            return Math.floor(baseDamage * GameConfig.SUPER_BULLET.CRIT_DAMAGE_MULTIPLIER);
        }
        return baseDamage;
    }

    // Check if bullet can hit this enemy (for piercing logic)
    canBulletHitEnemy(bullet: THREE.Mesh, enemy: any): boolean {
        // If bullet has already hit this enemy, don't hit again
        if (bullet.userData.hitEnemies && bullet.userData.hitEnemies.has(enemy)) {
            return false;
        }
        return true;
    }

    // Mark that bullet has hit an enemy and check if it should be removed
    handleBulletHit(bullet: THREE.Mesh, enemy: any): boolean {
        if (!bullet.userData.hitEnemies) {
            bullet.userData.hitEnemies = new Set();
        }

        // Mark this enemy as hit
        bullet.userData.hitEnemies.add(enemy);

        // If no piercing, remove bullet immediately
        if (this.piercingLevel === 0) {
            return true; // Should remove bullet
        }

        // Decrease piercing count
        if (bullet.userData.piercingLeft > 0) {
            bullet.userData.piercingLeft--;
        }

        // Remove bullet if no more piercing left
        return bullet.userData.piercingLeft <= 0;
    }    // Create glitched bullets that target the closest enemy
    createGlitchedBullets(fromPosition: THREE.Vector3, enemies: any[], excludeEnemy?: any) {
        if (this.glitchedBulletLevel === 0 || enemies.length === 0) return;

        // Performance safeguard: limit total bullets (reduced from 50 to align with maxBullets)
        const currentBulletCount = this.bullets.length;
        if (currentBulletCount >= this.maxBullets - 5) return; // Leave some room for regular bullets

        const numBullets = Math.min(
            this.glitchedBulletLevel * GameConfig.GLITCHED_BULLET.BULLETS_PER_LEVEL,
            enemies.length - (excludeEnemy ? 1 : 0), // Don't create more bullets than available targets
            this.maxBullets - currentBulletCount // Don't exceed bullet limit
        );

        for (let i = 0; i < numBullets; i++) {
            // Find closest enemy (excluding the one that was just hit)
            let closestEnemy = null;
            let closestDistance = Infinity;

            for (const enemy of enemies) {
                if (enemy === excludeEnemy) continue;

                const distance = new THREE.Vector3()
                    .copy(fromPosition)
                    .sub(enemy.position)
                    .length();

                if (distance <= GameConfig.GLITCHED_BULLET.SEARCH_RADIUS && distance < closestDistance) {
                    closestDistance = distance;
                    closestEnemy = enemy;
                }
            }

            if (closestEnemy) {
                this.createGlitchedBullet(fromPosition, closestEnemy.position);
            }
        }
    }    // Create a single glitched bullet
    private createGlitchedBullet(fromPosition: THREE.Vector3, targetPosition: THREE.Vector3) {
        // Use pooled geometry and material for glitched bullets
        const bullet = new THREE.Mesh(this.bulletPool.geometry, this.bulletPool.glitchedMaterial);

        // Scale down slightly for glitched bullets visual difference
        bullet.scale.set(0.8, 0.8, 0.8);

        // Position the bullet
        bullet.position.copy(fromPosition);

        // Calculate direction to target
        const direction = new THREE.Vector3()
            .copy(targetPosition)
            .sub(fromPosition)
            .normalize();

        // Store bullet data - glitched bullets don't pierce and don't trigger more glitched bullets
        bullet.userData = {
            direction: direction,
            speed: GameConfig.BULLET_SPEED * GameConfig.GLITCHED_BULLET.SPEED_MULTIPLIER,
            isGlitched: true,
            isCritical: false,
            piercingLeft: 0, // Glitched bullets never pierce
            hitEnemies: new Set() // Always initialize for tracking
        };

        this.bullets.push(bullet);
        this.scene.add(bullet);
    }

    // Cleanup method for proper resource disposal
    dispose() {
        // Remove all bullets from scene
        this.bullets.forEach(bullet => {
            this.scene.remove(bullet);
        });
        this.bullets = [];

        // Remove shared light
        if (this.sharedLight) {
            this.scene.remove(this.sharedLight);
        }

        // Dispose of pooled materials and geometry
        if (this.bulletPool) {
            this.bulletPool.geometry.dispose();
            this.bulletPool.normalMaterial.dispose();
            this.bulletPool.criticalMaterial.dispose();
            this.bulletPool.glitchedMaterial.dispose();
        }
    }
}
