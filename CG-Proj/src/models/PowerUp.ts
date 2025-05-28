import * as THREE from 'three';

export enum PowerUpType {
    HOMING_MISSILE = 'HOMING_MISSILE'
}

export class PowerUp extends THREE.Mesh {    public type: PowerUpType;
    private startTime: number;
    private startY: number;

    constructor(type: PowerUpType, position: THREE.Vector3) {
        // Create an octahedron geometry for the power-up
        const geometry = new THREE.OctahedronGeometry(0.5);
        const material = new THREE.MeshPhongMaterial({
            color: 0xff00ff, // Purple color for power-ups
            emissive: 0x4f004f,
            shininess: 50,
            transparent: true,
            opacity: 0.8
        });

        super(geometry, material);
        
        this.type = type;
        this.position.copy(position);
        this.startTime = Date.now();
        this.startY = position.y;
    }

    getType(): PowerUpType {
        return this.type;
    }

    update() {
        // Make the power-up float up and down
        const time = (Date.now() - this.startTime) * 0.002;
        this.position.y = this.startY + Math.sin(time) * 0.3;
        
        // Rotate the power-up
        this.rotation.y += 0.02;
    }
}
