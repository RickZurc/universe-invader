import * as THREE from 'three';

export const PowerUpType = {
    HOMING_MISSILE: 'HOMING_MISSILE',
    SUPER_NOVA: 'SUPER_NOVA'
} as const;

export type PowerUpType = typeof PowerUpType[keyof typeof PowerUpType];

export class PowerUp extends THREE.Mesh {    public type: PowerUpType;
    private startTime: number;
    private startY: number;    constructor(type: PowerUpType, position: THREE.Vector3) {
        // Create geometry based on power-up type
        let geometry: THREE.BufferGeometry;
        let material: THREE.MeshPhongMaterial;
        
        if (type === PowerUpType.SUPER_NOVA) {
            // Super Nova: Large star-shaped geometry with intense glow
            geometry = new THREE.SphereGeometry(0.8, 16, 12);
            material = new THREE.MeshPhongMaterial({
                color: 0xffaa00,     // Bright orange/gold
                emissive: 0xff6600,  // Intense orange glow
                shininess: 100,
                transparent: true,
                opacity: 0.9
            });
        } else {
            // Default (Homing Missile): Octahedron
            geometry = new THREE.OctahedronGeometry(0.5);
            material = new THREE.MeshPhongMaterial({
                color: 0xff00ff,     // Purple color for homing missiles
                emissive: 0x4f004f,
                shininess: 50,
                transparent: true,
                opacity: 0.8
            });
        }

        super(geometry, material);
        
        this.type = type;
        this.position.copy(position);
        this.startTime = Date.now();
        this.startY = position.y;
        
        // Add point light for Super Nova
        if (type === PowerUpType.SUPER_NOVA) {
            const light = new THREE.PointLight(0xffaa00, 2, 10);
            this.add(light);
        }
    }

    getType(): PowerUpType {
        return this.type;
    }    update() {
        // Make the power-up float up and down
        const time = (Date.now() - this.startTime) * 0.002;
        this.position.y = this.startY + Math.sin(time) * 0.3;
        
        // Different rotation speeds based on type
        if (this.type === PowerUpType.SUPER_NOVA) {
            // Super Nova rotates faster and pulses
            this.rotation.y += 0.05;
            this.rotation.x += 0.03;
            
            // Pulsing effect for Super Nova
            const pulseFactor = 0.8 + 0.4 * Math.sin(time * 3);
            this.scale.setScalar(pulseFactor);
        } else {
            // Regular rotation for other power-ups
            this.rotation.y += 0.02;
        }
    }
}
