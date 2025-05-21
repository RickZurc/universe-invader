import * as THREE from 'three';
import { Enemy } from './Enemy';
import { EnemyType } from '../types/types';

export class NormalEnemy extends Enemy {
    constructor(geometry: THREE.BoxGeometry, material: THREE.MeshBasicMaterial, baseHealth: number) {
        super(geometry, new THREE.MeshBasicMaterial({ color: 'red' }), baseHealth);
        this.scale.set(1, 1, 1);
        this.healthContainer.style.width = '40px';
        this.healthContainer.style.height = '4px';
        this.healthContainer.style.transform = 'scale(1)';
    }
}

export class BossEnemy extends Enemy {
    constructor(geometry: THREE.BoxGeometry, material: THREE.MeshBasicMaterial, baseHealth: number) {
        super(geometry, new THREE.MeshBasicMaterial({ color: 'purple' }), baseHealth * 3, EnemyType.Boss);
        this.scale.set(2, 2, 2);
        this.healthContainer.style.width = '80px';
        this.healthContainer.style.height = '6px';
        this.healthContainer.style.transform = 'scale(2)';
    }
}

export class SpecialEnemy extends Enemy {
    constructor(geometry: THREE.BoxGeometry, material: THREE.MeshBasicMaterial, baseHealth: number) {
        super(geometry, new THREE.MeshBasicMaterial({ color: 'cyan' }), baseHealth * 2, EnemyType.Special);
        this.scale.set(1.5, 1.5, 1.5);
        this.healthContainer.style.width = '60px';
        this.healthContainer.style.height = '5px';
        this.healthContainer.style.transform = 'scale(1.5)';
    }
}
