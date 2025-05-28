import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig';
import { Enemy } from './Enemy';

export class NaniteDrone extends THREE.Mesh {
    private angle: number;
    private orbitSpeed: number = GameConfig.NANITE_DRONE.ORBIT_SPEED;
    private lightPulse: THREE.PointLight;
    private targetEnemy: Enemy | null = null;
    private attackSpeed: number = 0.3; // Speed when attacking an enemy
    private attackRange: number = 5; // Units from player when drone starts seeking enemies

    constructor(index: number, totalDrones: number) {
        // Create glowing drone geometry
        const geometry = new THREE.OctahedronGeometry(GameConfig.NANITE_DRONE.SIZE);
        const material = new THREE.MeshPhongMaterial({
            color: 0x00ff88,
            emissive: 0x004422,
            shininess: 90,
            transparent: true,
            opacity: 0.9
        });
        
        super(geometry, material);

        // Set initial angle based on position in drone array
        this.angle = (Math.PI * 2 / totalDrones) * index;
        
        // Add point light for glow effect
        this.lightPulse = new THREE.PointLight(0x00ff88, 0.5, 2);
        this.add(this.lightPulse);

        // Start pulse animation
        this.pulseLights();
    }

    private pulseLights() {
        const intensity = 0.5 + Math.sin(Date.now() * 0.005) * 0.3;
        this.lightPulse.intensity = intensity;
        const scale = 1 + Math.sin(Date.now() * 0.003) * 0.1;
        this.scale.set(scale, scale, scale);
    }

    setTarget(enemy: Enemy | null) {
        this.targetEnemy = enemy;
    }

    hasTarget(): boolean {
        return this.targetEnemy !== null;
    }

    getTarget(): Enemy | null {
        return this.targetEnemy;
    }

    update(playerPosition: THREE.Vector3) {
        // If we have a target and it's not stunned, chase it
        if (this.targetEnemy && !this.targetEnemy.isStunned()) {
            const direction = new THREE.Vector3()
                .copy(this.targetEnemy.position)
                .sub(this.position)
                .normalize();
            
            this.position.add(direction.multiplyScalar(this.attackSpeed));
            this.lookAt(this.targetEnemy.position);
        } else {
            // Clear invalid target
            this.targetEnemy = null;
            
            // Normal orbit behavior
            this.angle += this.orbitSpeed;
            const radius = GameConfig.NANITE_DRONE.ORBIT_RADIUS;
            
            this.position.x = playerPosition.x + Math.cos(this.angle) * radius;
            this.position.y = playerPosition.y + Math.sin(this.angle) * radius;
            this.position.z = playerPosition.z;

            // Make drone always look at player
            this.lookAt(playerPosition);
        }

        // Update the light pulse effect
        this.pulseLights();
    }

    destroy() {
        if (this.parent) {
            this.parent.remove(this);
        }
        this.geometry.dispose();
        (this.material as THREE.Material).dispose();
        this.lightPulse.dispose();
    }
}
