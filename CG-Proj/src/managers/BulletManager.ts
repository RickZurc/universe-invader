import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig';

export class BulletManager {
    private scene: THREE.Scene;
    private playerShip: THREE.Group;
    private bullets: THREE.Mesh[] = [];
    private bulletDamage: number;

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
    }

    getBulletDamage() {
        return this.bulletDamage;
    }
}
