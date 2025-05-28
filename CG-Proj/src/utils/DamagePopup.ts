import * as THREE from 'three';

interface PopupOptions {
    type?: 'damage' | 'freeze' | 'heal' | 'missile' | 'powerup';
    color?: string;
    text?: string;
    followTarget?: THREE.Object3D;
}

export class DamagePopup {
    private static container: HTMLElement;
    private static activePopups: Map<HTMLElement, { target?: THREE.Object3D, camera: THREE.Camera }> = new Map();

    static initialize() {
        // Create container for damage popups if it doesn't exist
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.style.position = 'fixed';
            this.container.style.top = '0';
            this.container.style.left = '0';
            this.container.style.width = '100%';
            this.container.style.height = '100%';
            this.container.style.pointerEvents = 'none';
            document.body.appendChild(this.container);

            // Update positions of following popups every frame
            const updatePositions = () => {
                this.activePopups.forEach((data, element) => {
                    if (data.target && element.parentElement) {
                        const vector = data.target.position.clone();
                        vector.project(data.camera);
                        
                        const x = (vector.x + 1) / 2 * window.innerWidth;
                        const y = -(vector.y - 1) / 2 * window.innerHeight;
                        
                        element.style.left = `${x}px`;
                        element.style.top = `${y}px`;
                    }
                });
                requestAnimationFrame(updatePositions);
            };
            updatePositions();
        }
    }

    static show(value: number | string, worldPosition: THREE.Vector3, camera: THREE.Camera, options: PopupOptions = {}) {
        const {
            type = 'damage',
            color = type === 'damage' ? '#ff4444' : '#00ffff',
            text = typeof value === 'number' ? Math.floor(value).toString() : value,
            followTarget
        } = options;

        // Create popup element
        const element = document.createElement('div');
        element.className = 'damage-popup';
        element.textContent = text;
        element.style.color = color;

        // Position popup
        const vector = worldPosition.clone();
        vector.project(camera);
        const x = (vector.x + 1) / 2 * window.innerWidth;
        const y = -(vector.y - 1) / 2 * window.innerHeight;
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;

        // Add to container
        this.container.appendChild(element);

        // Track if following a target
        if (followTarget) {
            this.activePopups.set(element, { target: followTarget, camera });
        }

        // Remove after animation completes
        setTimeout(() => {
            this.activePopups.delete(element);
            element.remove();
        }, 1000);

        return element;
    }

    static clear() {
        if (this.container) {
            this.container.innerHTML = '';
            this.activePopups.clear();
        }
    }
}
