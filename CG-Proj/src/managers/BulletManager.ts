import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig';

export class BulletManager {
    private scene: THREE.Scene;
    private playerShip: THREE.Group;
    private bullets: THREE.Mesh[] = [];
    private bulletDamage: number;
    private piercingLevel: number = 0; // Level 0 = no piercing, Level 1+ = piercing
    private superBulletLevel: number = 0; // Level 0 = no critical hits, Level 1+ = critical hits
    private glitchedBulletLevel: number = 0; // Level 0 = no glitched bullets, Level 1+ = glitched bullets

    constructor(scene: THREE.Scene, playerShip: THREE.Group) {
        this.scene = scene;
        this.playerShip = playerShip;
        this.bulletDamage = GameConfig.INITIAL_BULLET_DAMAGE;
    }shoot(mouseWorldPosition: THREE.Vector3) {
        // Determine if this is a critical hit
        const critChance = this.superBulletLevel * GameConfig.SUPER_BULLET.CRIT_CHANCE_PER_LEVEL;
        const isCritical = Math.random() * 100 < critChance;
        
        // Create laser-like bullet using cylinder geometry
        const baseSize = isCritical ? 0.07 * GameConfig.SUPER_BULLET.VISUAL_SCALE : 0.05;
        const bulletLength = isCritical ? 1.2 * GameConfig.SUPER_BULLET.VISUAL_SCALE : 1.0;
        const bulletGeometry = new THREE.CylinderGeometry(baseSize, baseSize, bulletLength, 8);
        
        // Different colors for critical vs normal bullets
        const bulletColor = isCritical ? 0xffaa00 : 0x00ffff; // Orange for critical, cyan for normal
        const emissiveColor = isCritical ? 0x664400 : 0x004444;
        
        const bulletMaterial = new THREE.MeshPhongMaterial({ 
            color: bulletColor,
            emissive: emissiveColor,
            shininess: 100,
            transparent: true,
            opacity: 0.9
        });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // Add point light to bullet with appropriate intensity and color
        const lightIntensity = isCritical ? 1.2 * GameConfig.SUPER_BULLET.LIGHT_INTENSITY : 0.8;
        const bulletLight = new THREE.PointLight(bulletColor, lightIntensity, 4);
        bullet.add(bulletLight);
        const offset = 1;
        bullet.position.set(
            this.playerShip.position.x + Math.cos(this.playerShip.rotation.z + Math.PI/2) * offset,
            this.playerShip.position.y + Math.sin(this.playerShip.rotation.z + Math.PI/2) * offset,
            0
        );
        
        const dx = mouseWorldPosition.x - bullet.position.x;
        const dy = mouseWorldPosition.y - bullet.position.y;
        
        const length = Math.sqrt(dx * dx + dy * dy);
        const normalizedDx = dx / length;
        const normalizedDy = dy / length;
        
        // Orient the cylinder to point in the direction of travel
        const angle = Math.atan2(dy, dx);
        bullet.rotation.z = angle - Math.PI/2; // Adjust for cylinder's default orientation
          bullet.userData.directionX = normalizedDx;
        bullet.userData.directionY = normalizedDy;
        bullet.userData.piercingLeft = this.piercingLevel > 0 ? 
            GameConfig.PIERCING_BULLETS.BASE_PENETRATION + (this.piercingLevel - 1) * GameConfig.PIERCING_BULLETS.PENETRATION_PER_LEVEL : 0;
        bullet.userData.hitEnemies = new Set(); // Track which enemies this bullet has hit
        bullet.userData.isCritical = isCritical; // Track if this is a critical hit
        
        this.bullets.push(bullet);
        this.scene.add(bullet);
    }    updateBullets() {
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
                this.scene.remove(bullet);
                this.bullets.splice(i, 1);
            }
        }
    }

    getBullets() {
        return this.bullets;
    }

    removeBullet(bullet: THREE.Mesh) {
        const index = this.bullets.indexOf(bullet);
        if (index > -1) {
            this.scene.remove(bullet);
            this.bullets.splice(index, 1);
        }
    }

    setBulletDamage(damage: number) {
        this.bulletDamage = damage;
    }    getBulletDamage() {
        return this.bulletDamage;
    }

    setPiercingLevel(level: number) {
        this.piercingLevel = Math.max(0, Math.min(level, GameConfig.PIERCING_BULLETS.MAX_LEVEL));
    }    getPiercingLevel() {
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

        // Performance safeguard: limit total bullets
        const currentBulletCount = this.bullets.length;
        if (currentBulletCount > 50) return; // Prevent too many bullets

        const numBullets = Math.min(
            this.glitchedBulletLevel * GameConfig.GLITCHED_BULLET.BULLETS_PER_LEVEL,
            enemies.length - (excludeEnemy ? 1 : 0) // Don't create more bullets than available targets
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
    }

    // Create a single glitched bullet
    private createGlitchedBullet(fromPosition: THREE.Vector3, targetPosition: THREE.Vector3) {
        // Create glitched bullet with unique visual style
        const bulletGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6); // Hexagonal for "glitched" look
        const bulletMaterial = new THREE.MeshPhongMaterial({ 
            color: GameConfig.GLITCHED_BULLET.VISUAL_COLOR,
            emissive: 0x440044,
            shininess: 100,
            transparent: true,
            opacity: 0.8
        });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // Add pulsing light effect
        const bulletLight = new THREE.PointLight(GameConfig.GLITCHED_BULLET.VISUAL_COLOR, 0.6, 3);
        bullet.add(bulletLight);
        
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
}
