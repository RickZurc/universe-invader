import * as THREE from 'three';
import { Enemy } from '../models/Enemy';

interface IndicatorElement {
    element: HTMLElement;
    arrow: HTMLElement;
    distance: HTMLElement;
    inUse: boolean;
}

/**
 * Manages enemy position indicators at screen edges
 * Shows arrows pointing to enemies when there are 10 or fewer remaining
 */
export class EnemyIndicators {
    private indicators: IndicatorElement[] = [];
    private container!: HTMLElement;
    private maxIndicators: number = 10;
    private isVisible: boolean = false;

    constructor() {
        this.createContainer();
        this.createIndicatorPool();
    }

    private createContainer(): void {
        this.container = document.createElement('div');
        this.container.id = 'enemy-indicators-container';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 100;
        `;
        document.body.appendChild(this.container);
    }

    private createIndicatorPool(): void {
        for (let i = 0; i < this.maxIndicators; i++) {
            const indicator = this.createIndicator();
            this.indicators.push(indicator);
            this.container.appendChild(indicator.element);
        }
    }

    private createIndicator(): IndicatorElement {
        const element = document.createElement('div');
        element.style.cssText = `
            position: absolute;
            width: 60px;
            height: 40px;
            display: none;
            background: rgba(255, 0, 0, 0.8);
            border: 2px solid #ff4444;
            border-radius: 8px;
            padding: 4px;
            font-family: Arial, sans-serif;
            font-size: 10px;
            color: white;
            text-align: center;
            box-shadow: 0 0 10px rgba(255, 0, 0, 0.6);
            transform: translate(-50%, -50%);
        `;

        const arrow = document.createElement('div');
        arrow.style.cssText = `
            position: absolute;
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-top: 12px solid #ff4444;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
        `;

        const distance = document.createElement('div');
        distance.style.cssText = `
            font-size: 9px;
            font-weight: bold;
            margin-top: 2px;
        `;

        element.appendChild(arrow);
        element.appendChild(distance);

        return {
            element,
            arrow,
            distance,
            inUse: false
        };
    }

    /**
     * Update indicators for the given enemies
     * @param enemies Array of enemies to track
     * @param camera The camera for world-to-screen projection
     * @param playerPosition The player's current position
     */
    updateIndicators(enemies: Enemy[], camera: THREE.Camera, playerPosition: THREE.Vector3): void {
        // Only show indicators when there are 10 or fewer enemies
        const shouldShow = enemies.length <= 10 && enemies.length > 0;
        
        if (!shouldShow) {
            this.hideAll();
            return;
        }

        this.isVisible = true;

        // Reset all indicators
        this.indicators.forEach(indicator => indicator.inUse = false);

        // Update camera matrices
        camera.updateMatrixWorld();
        if (camera.matrixWorldInverse.determinant() === 0) {
            camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
        }

        let indicatorIndex = 0;
        
        for (const enemy of enemies) {
            if (indicatorIndex >= this.maxIndicators) break;
            if (enemy.health <= 0) continue;

            const screenPos = this.getScreenPosition(enemy.position, camera);
            const isOnScreen = this.isPositionOnScreen(screenPos);

            // Only show indicator for off-screen enemies
            if (!isOnScreen) {
                const indicator = this.indicators[indicatorIndex];
                this.updateIndicator(indicator, enemy, screenPos, playerPosition);
                indicatorIndex++;
            }
        }

        // Hide unused indicators
        for (let i = indicatorIndex; i < this.indicators.length; i++) {
            this.indicators[i].element.style.display = 'none';
        }
    }

    private getScreenPosition(worldPosition: THREE.Vector3, camera: THREE.Camera): THREE.Vector3 {
        const vector = worldPosition.clone();
        vector.project(camera);

        // Convert to screen coordinates
        const widthHalf = window.innerWidth / 2;
        const heightHalf = window.innerHeight / 2;
        
        return new THREE.Vector3(
            vector.x * widthHalf + widthHalf,
            -vector.y * heightHalf + heightHalf,
            vector.z
        );
    }

    private isPositionOnScreen(screenPos: THREE.Vector3): boolean {
        const margin = 50; // Margin from screen edge
        return screenPos.x >= margin && 
               screenPos.x <= window.innerWidth - margin &&
               screenPos.y >= margin && 
               screenPos.y <= window.innerHeight - margin &&
               screenPos.z < 1; // In front of camera
    }

    private updateIndicator(
        indicator: IndicatorElement, 
        enemy: Enemy, 
        screenPos: THREE.Vector3, 
        playerPosition: THREE.Vector3
    ): void {
        indicator.inUse = true;
        indicator.element.style.display = 'block';

        // Calculate edge position
        const edgePos = this.getEdgePosition(screenPos);
        
        // Position indicator at screen edge
        indicator.element.style.left = `${edgePos.x}px`;
        indicator.element.style.top = `${edgePos.y}px`;

        // Calculate arrow rotation to point toward enemy
        const angle = Math.atan2(
            screenPos.y - edgePos.y,
            screenPos.x - edgePos.x
        );
        
        // Rotate arrow to point toward enemy
        indicator.arrow.style.transform = `translate(-50%, -50%) rotate(${angle + Math.PI/2}rad)`;

        // Update distance text
        const distance = Math.round(enemy.position.distanceTo(playerPosition));
        indicator.distance.textContent = `${distance}m`;

        // Color based on enemy type
        const color = this.getEnemyColor(enemy);
        indicator.element.style.background = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;
        indicator.element.style.borderColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
        indicator.arrow.style.borderTopColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
    }

    private getEdgePosition(screenPos: THREE.Vector3): { x: number, y: number } {
        const margin = 30;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        // Direction from screen center to target
        const dirX = screenPos.x - centerX;
        const dirY = screenPos.y - centerY;
        
        // Normalize direction
        const length = Math.sqrt(dirX * dirX + dirY * dirY);
        const normalDirX = dirX / length;
        const normalDirY = dirY / length;
        
        // Find intersection with screen edges
        let edgeX: number, edgeY: number;
        
        const leftEdge = margin;
        const rightEdge = window.innerWidth - margin;
        const topEdge = margin;
        const bottomEdge = window.innerHeight - margin;
        
        // Calculate intersection with each edge
        const tLeft = normalDirX !== 0 ? (leftEdge - centerX) / normalDirX : Infinity;
        const tRight = normalDirX !== 0 ? (rightEdge - centerX) / normalDirX : Infinity;
        const tTop = normalDirY !== 0 ? (topEdge - centerY) / normalDirY : Infinity;
        const tBottom = normalDirY !== 0 ? (bottomEdge - centerY) / normalDirY : Infinity;
        
        // Find the closest positive intersection
        const intersections = [
            { t: tLeft, x: leftEdge, y: centerY + tLeft * normalDirY },
            { t: tRight, x: rightEdge, y: centerY + tRight * normalDirY },
            { t: tTop, x: centerX + tTop * normalDirX, y: topEdge },
            { t: tBottom, x: centerX + tBottom * normalDirX, y: bottomEdge }
        ].filter(intersection => 
            intersection.t > 0 && 
            intersection.x >= leftEdge && intersection.x <= rightEdge &&
            intersection.y >= topEdge && intersection.y <= bottomEdge
        );
        
        if (intersections.length > 0) {
            // Use the closest intersection
            const closest = intersections.reduce((min, current) => 
                current.t < min.t ? current : min
            );
            edgeX = closest.x;
            edgeY = closest.y;
        } else {
            // Fallback: just clamp to screen bounds
            edgeX = Math.max(leftEdge, Math.min(rightEdge, screenPos.x));
            edgeY = Math.max(topEdge, Math.min(bottomEdge, screenPos.y));
        }
        
        return { x: edgeX, y: edgeY };
    }

    private getEnemyColor(enemy: Enemy): { r: number, g: number, b: number } {
        // Get color based on enemy type
        const material = enemy.material as THREE.MeshPhongMaterial;
        const color = material.color;
        
        return {
            r: Math.round(color.r * 255),
            g: Math.round(color.g * 255),
            b: Math.round(color.b * 255)
        };
    }

    hideAll(): void {
        if (!this.isVisible) return;
        
        this.isVisible = false;
        this.indicators.forEach(indicator => {
            indicator.element.style.display = 'none';
            indicator.inUse = false;
        });
    }

    destroy(): void {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
