import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig';

export class BulletManager {
    private scene: THREE.Scene;
    private playerShip: THREE.Group;
    private bullets: THREE.Mesh[] = [];
    private bulletDamage: number;
    private piercingLevel: number = 0; // Level 0 = no piercing, Level 1+ = piercing
    private superBulletLevel: number = 0; // Level 0 = no critical hits, Level 1+ = critical hits

    constructor(scene: THREE.Scene, playerShip: THREE.Group) {
        this.scene = scene;
        this.playerShip = playerShip;
        this.bulletDamage = GameConfig.INITIAL_BULLET_DAMAGE;
    }    shoot(mouseWorldPosition: THREE.Vector3) {
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
    }

    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            const bulletSpeed = GameConfig.BULLET_SPEED;
            
            bullet.position.x += bullet.userData.directionX * bulletSpeed;
            bullet.position.y += bullet.userData.directionY * bulletSpeed;
            
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
    }
}
