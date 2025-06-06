import * as THREE from 'three';

export class ParticleSystem {
    static createExplosion(scene: THREE.Scene, position: THREE.Vector3, color: number) {
        const particleCount = 50;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities: THREE.Vector3[] = [];
        
        // Create initial positions and velocities
        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = position.x;
            positions[i + 1] = position.y;
            positions[i + 2] = position.z;
            
            velocities.push(new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3
            ));
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color: color,
            size: 0.2,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 1
        });
        
        const particles = new THREE.Points(geometry, material);
        scene.add(particles);
        
        // Animation variables
        let life = 1.0;
        const decay = 0.05;
        
        function animateExplosion() {
            if (life <= 0) {
                scene.remove(particles);
                return;
            }
            
            const positions = particles.geometry.attributes.position.array;
            
            // Update particle positions based on velocities
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += velocities[i/3].x;
                positions[i + 1] += velocities[i/3].y;
                positions[i + 2] += velocities[i/3].z;
                
                // Add some gravity effect
                velocities[i/3].y -= 0.01;
            }
            
            particles.geometry.attributes.position.needsUpdate = true;
            
            // Fade out
            material.opacity = life;
            life -= decay;
            
            requestAnimationFrame(animateExplosion);
        }
        
        animateExplosion();
    }

    static createThrusterParticles(): THREE.Points {
        const thrusterGeometry = new THREE.BufferGeometry();
        const thrusterVertices = new Float32Array(300); // 100 particles * 3 coordinates
        const thrusterColors = new Float32Array(300); // 100 particles * 3 color values

        // Initialize particles with random positions
        for (let i = 0; i < 300; i += 3) {
            thrusterVertices[i] = 0;
            thrusterVertices[i + 1] = 0;
            thrusterVertices[i + 2] = 0;
            
            // Green to yellow colors for thrust
            thrusterColors[i] = Math.random() * 0.5 + 0.5; // R: 0.5-1.0
            thrusterColors[i + 1] = Math.random() * 0.5 + 0.5; // G: 0.5-1.0
            thrusterColors[i + 2] = 0; // B: 0
        }

        thrusterGeometry.setAttribute('position', new THREE.BufferAttribute(thrusterVertices, 3));
        thrusterGeometry.setAttribute('color', new THREE.BufferAttribute(thrusterColors, 3));

        const thrusterMaterial = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.8
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
        material.opacity = 0.7;
        material.size = 0.12;
    }

    static createWaveEffect(scene: THREE.Scene, position: THREE.Vector3, color: number, radius: number) {
        const particleCount = 200; // More particles for a denser wave
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
