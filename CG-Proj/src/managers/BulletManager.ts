import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig';

export class BulletManager {
    private scene: THREE.Scene;
    private playerShip: THREE.Group;
    private bullets: THREE.Mesh[] = [];
    private bulletDamage: number;
    private piercingLevel: number = 0; // Level 0 = no piercing, Level 1+ = piercing

    constructor(scene: THREE.Scene, playerShip: THREE.Group) {
        this.scene = scene;
        this.playerShip = playerShip;
        this.bulletDamage = GameConfig.INITIAL_BULLET_DAMAGE;
    }

    shoot(mouseWorldPosition: THREE.Vector3) {
        const bulletGeometry = new THREE.SphereGeometry(0.2);
        const bulletMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffff00,
            emissive: 0x444400,
            shininess: 30
        });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // Add point light to bullet
        const bulletLight = new THREE.PointLight(0xffff00, 0.5, 3);
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
          bullet.userData.directionX = normalizedDx;
        bullet.userData.directionY = normalizedDy;
        bullet.userData.piercingLeft = this.piercingLevel > 0 ? 
            GameConfig.PIERCING_BULLETS.BASE_PENETRATION + (this.piercingLevel - 1) * GameConfig.PIERCING_BULLETS.PENETRATION_PER_LEVEL : 0;
        bullet.userData.hitEnemies = new Set(); // Track which enemies this bullet has hit
        
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
    }

    getPiercingLevel() {
        return this.piercingLevel;
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
