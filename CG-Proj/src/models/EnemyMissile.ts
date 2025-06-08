import * as THREE from 'three';
import { ParticleSystem } from '../systems/ParticleSystem';

export class EnemyMissile extends THREE.Mesh {
    private velocity: THREE.Vector3;
    private target: THREE.Vector3;
    private scene: THREE.Scene;
    private creationTime: number;
    private trailParticles: THREE.Points;
    private trailPositions: Float32Array;
    private trailColors: Float32Array;
    private trailIndex: number = 0;
    private readonly TRAIL_LENGTH = 15;
    private accuracy: number;
    private onPlayerHit: (() => void) | null = null;

    constructor(
        scene: THREE.Scene,
        position: THREE.Vector3,
        targetPosition: THREE.Vector3,
        accuracy: number = 0.8,
        onPlayerHit?: () => void
    ) {
        // Create missile geometry - smaller and red for enemy missiles
        const geometry = new THREE.ConeGeometry(0.15, 0.6, 6);
        const material = new THREE.MeshPhongMaterial({
            color: 0xff4444,
            emissive: 0x441111,
            shininess: 20
        });

        super(geometry, material);
        this.scene = scene;
        this.position.copy(position);
        this.accuracy = accuracy;
        this.onPlayerHit = onPlayerHit || null;
        this.creationTime = Date.now();

        // Calculate initial target with some inaccuracy
        this.target = targetPosition.clone();
        if (accuracy < 1.0) {
            const inaccuracy = (1.0 - accuracy) * 5; // Max 5 units of inaccuracy
            this.target.x += (Math.random() - 0.5) * inaccuracy;
            this.target.y += (Math.random() - 0.5) * inaccuracy;
        }

        // Calculate initial velocity toward target
        const direction = new THREE.Vector3()
            .copy(this.target)
            .sub(this.position)
            .normalize();
        
        this.velocity = direction.multiplyScalar(0.3); // Moderate speed

        // Setup missile trail
        this.trailPositions = new Float32Array(this.TRAIL_LENGTH * 3);
        this.trailColors = new Float32Array(this.TRAIL_LENGTH * 3);
        const trailGeometry = new THREE.BufferGeometry();
        trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
        trailGeometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));

        const trailMaterial = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.6
        });

        this.trailParticles = new THREE.Points(trailGeometry, trailMaterial);
        scene.add(this.trailParticles);

        // Initialize trail positions
        for (let i = 0; i < this.TRAIL_LENGTH * 3; i += 3) {
            this.trailPositions[i] = position.x;
            this.trailPositions[i + 1] = position.y;
            this.trailPositions[i + 2] = position.z;
        }
    }

    update(playerPosition: THREE.Vector3): boolean {
        // Check if missile has expired (5 second lifetime)
        if (Date.now() - this.creationTime > 5000) {
            this.explode();
            return false;
        }

        // Update target position slightly toward current player position for some tracking
        if (this.accuracy > 0.5) {
            const trackingStrength = (this.accuracy - 0.5) * 0.1; // Very subtle tracking
            this.target.lerp(playerPosition, trackingStrength);
        }

        // Calculate direction to target
        const toTarget = new THREE.Vector3()
            .copy(this.target)
            .sub(this.position)
            .normalize();

        // Smoothly adjust velocity toward target
        this.velocity.lerp(
            toTarget.multiplyScalar(0.3),
            0.05 // Low turn rate for realistic missile physics
        );

        // Update position
        this.position.add(this.velocity);

        // Update rotation to face movement direction
        this.lookAt(this.position.clone().add(this.velocity));

        // Update trail
        this.updateTrail();

        // Check for collision with player (simple distance check)
        if (this.position.distanceTo(playerPosition) < 1.5) {
            this.explode();
            if (this.onPlayerHit) {
                this.onPlayerHit();
            }
            return false;
        }

        return true;
    }

    private updateTrail() {
        // Add new trail point
        const baseIndex = this.trailIndex * 3;
        this.trailPositions[baseIndex] = this.position.x;
        this.trailPositions[baseIndex + 1] = this.position.y;
        this.trailPositions[baseIndex + 2] = this.position.z;

        // Set color with fade out - red trail
        const intensity = 1 - (this.trailIndex / this.TRAIL_LENGTH);
        this.trailColors[baseIndex] = 1; // R
        this.trailColors[baseIndex + 1] = intensity * 0.3; // G
        this.trailColors[baseIndex + 2] = intensity * 0.3; // B

        this.trailIndex = (this.trailIndex + 1) % this.TRAIL_LENGTH;

        // Update geometry
        this.trailParticles.geometry.attributes.position.needsUpdate = true;
        this.trailParticles.geometry.attributes.color.needsUpdate = true;
    }

    explode(): void {
        // Create red explosion effect
        ParticleSystem.createExplosion(
            this.scene,
            this.position.clone(),
            0xff4444
        );

        // Clean up missile
        this.scene.remove(this.trailParticles);
        this.scene.remove(this);
    }

    destroy(): void {
        this.scene.remove(this.trailParticles);
        this.scene.remove(this);
    }
}
