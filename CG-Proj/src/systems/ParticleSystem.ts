import * as THREE from 'three';

export class ParticleSystem {
    // Performance tracking for adaptive particle count
    private static performanceMode: boolean = false;
    private static activeParticleCount: number = 0;
    private static maxParticles: number = 200; // Global particle limit
    
    static setPerformanceMode(enabled: boolean) {
        this.performanceMode = enabled;
    }
    
    static createExplosion(scene: THREE.Scene, position: THREE.Vector3, color: number) {
        // Skip explosion if too many particles are active
        if (this.activeParticleCount > this.maxParticles) return;
        
        // Adaptive particle count based on performance
        const baseParticleCount = this.performanceMode ? 8 : 15; // Reduced from 20/50
        const particleCount = Math.min(baseParticleCount, this.maxParticles - this.activeParticleCount);
        
        if (particleCount <= 0) return;
        
        this.activeParticleCount += particleCount;
        
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities: THREE.Vector3[] = [];
        
        // Create initial positions and velocities
        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = position.x;
            positions[i + 1] = position.y;
            positions[i + 2] = position.z;
            
            velocities.push(new THREE.Vector3(
                (Math.random() - 0.5) * 0.25, // Reduced spread for performance
                (Math.random() - 0.5) * 0.25,
                (Math.random() - 0.5) * 0.25
            ));
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
            color: color,
            size: this.performanceMode ? 0.1 : 0.15, // Smaller particles in performance mode
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 1
        });
        
        const particles = new THREE.Points(geometry, material);
        scene.add(particles);
        
        // Animation variables
        let life = 1.0;
        const decay = this.performanceMode ? 0.12 : 0.08; // Faster decay in performance mode
        
        function animateExplosion() {
            if (life <= 0) {
                scene.remove(particles);
                geometry.dispose();
                material.dispose();
                // Decrement active particle count when cleaned up
                ParticleSystem.activeParticleCount -= particleCount;
                return;
            }
            
            const positions = particles.geometry.attributes.position.array;
            
            // Update particle positions based on velocities
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += velocities[i/3].x;
                positions[i + 1] += velocities[i/3].y;
                positions[i + 2] += velocities[i/3].z;
                
                // Reduced gravity effect for performance
                velocities[i/3].y -= 0.005;
            }
            
            particles.geometry.attributes.position.needsUpdate = true;
            
            // Fade out
            material.opacity = life;
            life -= decay;
            
            requestAnimationFrame(animateExplosion);
        }
        
        animateExplosion();
    }    static createThrusterParticles(): THREE.Points {
        const thrusterGeometry = new THREE.BufferGeometry();
        // Reduced from 150 to 90 (30 particles) for better performance
        const particleCount = this.performanceMode ? 20 : 30;
        const thrusterVertices = new Float32Array(particleCount * 3);
        const thrusterColors = new Float32Array(particleCount * 3);

        // Initialize particles positioned behind the ship (inverse direction) - constant positioning
        for (let i = 0; i < particleCount * 3; i += 3) {
            const particleIndex = i / 3;
            const angle = (particleIndex / particleCount) * Math.PI * 2; // Evenly distribute particles in a circle
            const radius = 0.15; // Constant radius for thruster nozzle
            
            // Start particles in a circular pattern behind the ship center
            thrusterVertices[i] = Math.cos(angle) * radius; // X position
            thrusterVertices[i + 1] = -0.3; // Constant Y position behind ship
            thrusterVertices[i + 2] = Math.sin(angle) * radius; // Z position
            
            // Constant colors for thrust (orange/yellow flame)
            thrusterColors[i] = 1.0; // R: full red
            thrusterColors[i + 1] = 0.7; // G: orange-yellow
            thrusterColors[i + 2] = 0.0; // B: no blue
        }

        thrusterGeometry.setAttribute('position', new THREE.BufferAttribute(thrusterVertices, 3));
        thrusterGeometry.setAttribute('color', new THREE.BufferAttribute(thrusterColors, 3));

        const thrusterMaterial = new THREE.PointsMaterial({
            size: this.performanceMode ? 0.06 : 0.08, // Smaller thruster particles in performance mode
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: this.performanceMode ? 0.4 : 0.6 // Reduced opacity in performance mode
        });

        return new THREE.Points(thrusterGeometry, thrusterMaterial);
    }    static updateThrusterParticles(
        thrusterParticles: THREE.Points, 
        shipRotation: number
    ) {
        const positions = thrusterParticles.geometry.attributes.position.array;
        const material = thrusterParticles.material as THREE.PointsMaterial;

        // Calculate the direction opposite to where the ship is facing
        // Ship rotation is in radians, and ship faces forward (positive Y) at rotation 0
        const thrustDirection = new THREE.Vector3(
            -Math.sin(shipRotation + Math.PI / 2), // Opposite X component
            -Math.cos(shipRotation + Math.PI / 2), // Opposite Y component  
            0
        );

        // Always update particles - thrusters are always active
        for (let i = 0; i < positions.length; i += 3) {
            const particleSpeed = 0.1;
            
            // Move particle in thrust direction
            positions[i] += thrustDirection.x * particleSpeed;
            positions[i + 1] += thrustDirection.y * particleSpeed;
            
            // Add slight random spread
            positions[i] += (Math.random() - 0.5) * 0.02;
            positions[i + 1] += (Math.random() - 0.5) * 0.02;

            const distanceFromCenter = Math.sqrt(
                positions[i] * positions[i] + 
                positions[i + 1] * positions[i + 1]
            );

            // Reset particles that go too far, spawn them near the ship rear
            if (distanceFromCenter > 2) {
                // Spawn particles slightly behind the ship center
                const spawnDistance = 0.3;
                positions[i] = thrustDirection.x * -spawnDistance + (Math.random() - 0.5) * 0.2;
                positions[i + 1] = thrustDirection.y * -spawnDistance + (Math.random() - 0.5) * 0.2;
                positions[i + 2] = (Math.random() - 0.5) * 0.1;
            }
        }

        thrusterParticles.geometry.attributes.position.needsUpdate = true;
          // Thrusters are always visible but with varying intensity
        material.opacity = 0.5; // Reduced opacity
        material.size = 0.08; // Smaller size
    }    static createWaveEffect(scene: THREE.Scene, position: THREE.Vector3, color: number, radius: number) {
        const particleCount = 80; // Reduced from 200 to 80
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities: THREE.Vector3[] = [];
        
        // Create particles in a circle
        for (let i = 0; i < particleCount * 3; i += 3) {
            const angle = (i / 3) * (Math.PI * 2 / (particleCount / 3));
            const startRadius = 1; // Start close to player
            
            positions[i] = position.x + Math.cos(angle) * startRadius;
            positions[i + 1] = position.y + Math.sin(angle) * startRadius;
            positions[i + 2] = position.z;
            
            // Velocity points outward from center
            velocities.push(new THREE.Vector3(
                Math.cos(angle) * 0.4,
                Math.sin(angle) * 0.4,
                0
            ));
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color: color,
            size: 0.3,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 1
        });
        
        const particles = new THREE.Points(geometry, material);
        scene.add(particles);
        
        // Animation variables
        let life = 1.0;
        const decay = 0.02; // Slower decay for longer lasting effect
        const maxRadius = radius;
        let currentRadius = 1;
        
        function animateWave() {
            if (life <= 0 || currentRadius >= maxRadius) {
                scene.remove(particles);
                return;
            }
            
            const positions = particles.geometry.attributes.position.array;
            currentRadius += 0.5; // Speed of expansion
            
            // Update particle positions, maintaining the circular shape while expanding
            for (let i = 0; i < positions.length; i += 3) {
                const angle = (i / 3) * (Math.PI * 2 / (particleCount / 3));
                positions[i] = position.x + Math.cos(angle) * currentRadius;
                positions[i + 1] = position.y + Math.sin(angle) * currentRadius;
            }
            
            particles.geometry.attributes.position.needsUpdate = true;
            
            // Fade out gradually
            material.opacity = life;
            life -= decay;
            
            requestAnimationFrame(animateWave);
        }
        
        animateWave();
    }
}
