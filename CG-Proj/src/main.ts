

/*

TO BE ADDED LATER

- Add special ability to the player ship (like homing missiles)
- Add enemy types with different behaviors (e.g., faster, slower, more health, throw projectiles)
- Add power-ups that spawn randomly

*/



import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

// Game state variables
let playerShip: THREE.Group // Change type to Group to hold the loaded model
let bullets: THREE.Mesh[] = []
let enemies: Enemy[] = []
let gameOver = false
let score = 0
let moveLeft = false
let moveRight = false
let moveUp = false
let moveDown = false
let playerHealth = 1000
let maxHealth = 1000
let currentRound = 1
let baseEnemyRows = 3
let baseEnemyCols = 5
let bulletDamage = 100
let moveSpeed = 0.2
let isStorePaused = false
let canShoot = true
let fireRate = 200
let lastShotTime = 0
let isShooting = false
let mouse = new THREE.Vector2()
let mouseWorldPosition = new THREE.Vector3()

// Scene setup
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
document.body.appendChild(renderer.domElement)
camera.position.z = 30

// Lighting setup
const ambientLight = new THREE.AmbientLight(0x404080, 4) // Increased intensity
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1) // Increased intensity
directionalLight.position.set(0, 1, 1)
scene.add(directionalLight)

// Create starfield
const starGeometry = new THREE.BufferGeometry()
const starVertices = []
for(let i = 0; i < 10000; i++) {
    const x = (Math.random() - 0.5) * 2000
    const y = (Math.random() - 0.5) * 2000
    const z = -Math.random() * 2000
    starVertices.push(x, y, z)
}
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3))
const starMaterial = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 1 })
const starField = new THREE.Points(starGeometry, starMaterial)
scene.add(starField)

// Create player ship
const tempGeometry = new THREE.ConeGeometry(1, 2, 3)
const tempMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x00ff00,
    emissive: 0x002200,
    shininess: 50
})
const tempShip = new THREE.Mesh(tempGeometry, tempMaterial)
playerShip = new THREE.Group()
playerShip.add(tempShip)
playerShip.position.y = -8
scene.add(playerShip)

// Load the actual model
const loader = new GLTFLoader()
loader.load(
    '/src/SpaceshipPlayer.glb',
    (gltf) => {
        // Remove temporary ship
        playerShip.remove(tempShip)
        
        // Add the loaded model
        const model = gltf.scene
        model.scale.set(0.005, 0.005, 0.005) // Adjust scale as needed
        model.rotation.set(90, Math.PI, 0) // Adjust rotation to face up
        
        // Apply materials to the model
        // model.traverse((child) => {
        //     if (child instanceof THREE.Mesh) {
        //         child.material = new THREE.MeshPhongMaterial({
        //             // color: 0x00ff00,
        //             // emissive: 0x002200,
        //             shininess: 50,
        //         })
        //     }
        // })
        
        playerShip.add(model)
        
        // Re-add thrusters to the new model
        if (thrusterParticles) {
            thrusterParticles.position.y = -1.5 // Adjust position for new model
            playerShip.add(thrusterParticles)
        }
    },
    undefined,
    (error) => {
        console.error('An error occurred loading the model:', error)
    }
)

// Enemy spawn variables
let enemySpawnTimer = 0
let timeBetweenSpawns = 2000
let enemiesRemainingToSpawn = 0
let lastSpawnTime = Date.now()

// Replace the enum with this object
const EnemyType = {
    Normal: 0,
    Boss: 1,
    Special: 2
} as const

// Add a type for type safety
type EnemyTypeKey = keyof typeof EnemyType

class Enemy extends THREE.Mesh {
    health: number;
    maxHealth: number;
    isHit: boolean;
    hitTime: number;
    healthContainer: HTMLDivElement;
    healthBar: HTMLDivElement;
    enemyType: typeof EnemyType[EnemyTypeKey];
    color: string;

    constructor(geometry: THREE.BoxGeometry, material: THREE.MeshBasicMaterial, baseHealth: number, type: typeof EnemyType[EnemyTypeKey] = EnemyType.Normal) {
        const enemyMaterial = new THREE.MeshPhongMaterial({
            color: type === EnemyType.Boss ? 0xff0000 : type === EnemyType.Special ? 0x00ffff : 0xff0000,
            emissive: type === EnemyType.Boss ? 0x440000 : type === EnemyType.Special ? 0x004444 : 0x220000,
            shininess: 30
        })
        super(geometry, enemyMaterial)
        
        // Add enemy glow light
        const enemyLight = new THREE.PointLight(
            type === EnemyType.Boss ? 0xff0000 : type === EnemyType.Special ? 0x00ffff : 0xff0000,
            0.5,
            3
        )
        enemyLight.position.set(0, 0, 0)
        this.add(enemyLight)
        
        this.health = baseHealth;
        this.maxHealth = baseHealth;
        this.isHit = false;
        this.hitTime = 0;
        this.enemyType = type;
        this.color = "red"; // Default color for normal enemies
        
        // Create health bar elements
        this.healthContainer = document.createElement('div');
        this.healthContainer.className = 'enemy-health-container';
        this.healthBar = document.createElement('div');
        this.healthBar.className = 'enemy-health-bar';
        this.healthContainer.appendChild(this.healthBar);
        document.body.appendChild(this.healthContainer);

        // Set health bar styles
        this.healthContainer.style.position = 'absolute';
        this.healthContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.healthContainer.style.borderRadius = '5px';
        this.healthContainer.style.pointerEvents = 'none'; // Prevent mouse events
        this.healthContainer.style.zIndex = '10'; // Ensure it's above other elements
        this.healthBar.style.height = '100%';
        this.healthBar.style.backgroundColor = '#ff0000';
        this.healthBar.style.borderRadius = '5px';
        this.healthBar.style.transition = 'width 0.2s'; // Smooth transition for health bar
        this.healthContainer.style.transform = 'translate(-50%, -100%)'; // Center the health bar
    }

    updateHealthBar() {
        const vector = this.position.clone();
        vector.project(camera);
        
        // Convert 3D position to screen coordinates
        const widthHalf = window.innerWidth / 2;
        const heightHalf = window.innerHeight / 2;
        const x = (vector.x * widthHalf) + widthHalf;
        const y = -(vector.y * heightHalf) + heightHalf;
        
        // Position health bar above enemy
        this.healthContainer.style.left = `${x - 20}px`; // Center the 40px wide bar
        this.healthContainer.style.top = `${y - 30}px`; // Position above enemy
        this.healthBar.style.width = `${(this.health / this.maxHealth) * 100}%`;
    }

    startHitEffect() {
        this.isHit = true;
        this.hitTime = Date.now();
        (this.material as THREE.MeshBasicMaterial).color.setHex(0xff8080); // Light red glow
    }

    updateHitEffect() {
        if (this.isHit && Date.now() - this.hitTime > 500) { // 500ms = 0.5 seconds
            this.isHit = false;
            // Fix color reversion based on enemy type
            let originalColor;
            switch (this.enemyType) {
                case EnemyType.Boss:
                    originalColor = 'purple';
                    break;
                case EnemyType.Special:
                    originalColor = 'cyan'; // Changed from 0x00ff00 (green) to cyan
                    break;
                default:
                    originalColor = 'red';
            }
            (this.material as THREE.MeshBasicMaterial).color.set(originalColor);
        }
    }

    destroy() {
        document.body.removeChild(this.healthContainer);
    }
}


class NormalEnemy extends Enemy {
    constructor(geometry: THREE.BoxGeometry, material: THREE.MeshBasicMaterial   , baseHealth: number) {
        super(geometry, new THREE.MeshBasicMaterial({ color: 'red' }), baseHealth);
        this.scale.set(1, 1, 1); // Normal size
        this.healthContainer.style.width = '40px';
        this.healthContainer.style.height = '4px';
        this.healthContainer.style.transform = 'scale(1)';
    }
}

class BossEnemy extends Enemy {
    constructor(geometry: THREE.BoxGeometry, material: THREE.MeshBasicMaterial, baseHealth: number) {
        super(geometry, new THREE.MeshBasicMaterial({ color: 'purple' }), baseHealth * 3, EnemyType.Boss);
        this.scale.set(2, 2, 2);
        this.healthContainer.style.width = '80px';
        this.healthContainer.style.height = '6px';
        this.healthContainer.style.transform = 'scale(2)';
    }
}

class SpecialEnemy extends Enemy {
    constructor(geometry: THREE.BoxGeometry, material: THREE.MeshBasicMaterial, baseHealth: number) {
        super(geometry, new THREE.MeshBasicMaterial({ color: 'cyan' }), baseHealth * 2, EnemyType.Special);
        this.scale.set(1.5, 1.5, 1.5);
        this.healthContainer.style.width = '60px';
        this.healthContainer.style.height = '5px';
        this.healthContainer.style.transform = 'scale(1.5)';
    }
}

// Create enemies wave
function createEnemies() {
    const extraEnemies = Math.floor(currentRound / 2)
    const totalEnemies = (baseEnemyRows * baseEnemyCols) + extraEnemies
    
    // Add boss after round 3
    if (currentRound > 3) {
        enemiesRemainingToSpawn = totalEnemies + 1 // +1 for boss
    } else {
        enemiesRemainingToSpawn = totalEnemies
    }
    
    lastSpawnTime = Date.now()
    timeBetweenSpawns = Math.max(500, 2000 - (currentRound * 100))
    updateEnemiesCounter() // Add this
}

// Spawn single enemy
function spawnSingleEnemy() {
    const enemyGeometry = new THREE.BoxGeometry(1, 1, 1)
    const baseHealth = 500 + (currentRound - 1) * 100
    
    let enemy: Enemy;

    if (currentRound > 3 && enemiesRemainingToSpawn === 1) {
        // Boss spawn
        enemy = new BossEnemy(enemyGeometry, null!, baseHealth);
    } else if (Math.random() < 0.2) { // 20% chance for special enemy
        // Special enemy spawn
        enemy = new SpecialEnemy(enemyGeometry, null!, baseHealth);
    } else {
        // Normal enemy spawn
        enemy = new NormalEnemy(enemyGeometry, null!, baseHealth);
    }

    let validPosition = false
    while (!validPosition) {
        const angle = Math.random() * Math.PI * 2
        const distance = 20 + Math.random() * 10
        
        const x = playerShip.position.x + Math.cos(angle) * distance
        const y = playerShip.position.y + Math.sin(angle) * distance
        
        const tooCloseToOtherEnemies = enemies.some(otherEnemy => {
            const dx = x - otherEnemy.position.x
            const dy = y - otherEnemy.position.y
            return Math.sqrt(dx * dx + dy * dy) < (enemy instanceof BossEnemy ? 4 : 2) // Larger spacing for boss
        })
        
        if (!tooCloseToOtherEnemies) {
            enemy.position.set(x, y, 0)
            validPosition = true
        }
    }
    
    enemies.push(enemy)
    scene.add(enemy)
    enemiesRemainingToSpawn--
    updateEnemiesCounter() // Add this
}

// Shooting function
function shoot() {
    const bulletGeometry = new THREE.SphereGeometry(0.2)
    const bulletMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffff00,
        emissive: 0x444400,
        shininess: 30
    })
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial)
    
    // Add point light to bullet
    const bulletLight = new THREE.PointLight(0xffff00, 0.5, 3)
    bullet.add(bulletLight)
    
    const offset = 1
    bullet.position.set(
        playerShip.position.x + Math.cos(playerShip.rotation.z + Math.PI/2) * offset,
        playerShip.position.y + Math.sin(playerShip.rotation.z + Math.PI/2) * offset,
        0
    )
    
    const dx = mouseWorldPosition.x - bullet.position.x
    const dy = mouseWorldPosition.y - bullet.position.y
    
    const length = Math.sqrt(dx * dx + dy * dy)
    const normalizedDx = dx / length
    const normalizedDy = dy / length
    
    bullet.userData.directionX = normalizedDx
    bullet.userData.directionY = normalizedDy
    
    bullets.push(bullet)
    scene.add(bullet)
}

// UI update functions
function updateScoreDisplay() {
    const scoreElement = document.getElementById('score')
    if (scoreElement) {
        scoreElement.textContent = `Score: ${score}`
    }
}

function updateHealthBar() {
    const healthBar = document.getElementById('health-bar')
    const healthText = document.getElementById('health-text')
    if (healthBar && healthText) {
        const healthPercentage = (playerHealth / maxHealth) * 100
        healthBar.style.width = `${healthPercentage}%`
        healthText.textContent = `${Math.ceil(playerHealth)}/${maxHealth}`
        
        if (healthPercentage > 60) {
            healthBar.style.backgroundColor = '#0f0'
        } else if (healthPercentage > 30) {
            healthBar.style.backgroundColor = '#ff0'
        } else {
            healthBar.style.backgroundColor = '#f00'
        }
    }
}

function updateEnemiesCounter() {
    const enemiesElement = document.getElementById('enemies-remaining')
    if (enemiesElement) {
        const total = enemies.length + enemiesRemainingToSpawn
        enemiesElement.textContent = `Enemies Remaining: ${total}`
    }
}

// Store functions
function openStore() {
    const modal = document.getElementById('store-modal')
    const scoreSpan = document.getElementById('available-score')
    if (modal && scoreSpan) {
        modal.style.display = 'block'
        scoreSpan.textContent = score.toString()
        isStorePaused = true
    }

    const availableScoreElement = document.getElementById('available-score')
    if (availableScoreElement) {
      availableScoreElement.textContent = `Available Score: ${score}`
    }
}

function closeStore() {
    const modal = document.getElementById('store-modal')
    if (modal) {
        modal.style.display = 'none'
        isStorePaused = false
    }
}

function startNewRound() {
    currentRound++
    
    // Restore player health
    playerHealth = maxHealth
    updateHealthBar()
    
    openStore()

    document.getElementById('health-upgrade')?.addEventListener('click', () => {
        if (score >= 500) {
            score -= 500
            maxHealth += 200
            playerHealth = maxHealth
            updateHealthBar()
            updateScoreDisplay()
        }
    })

    document.getElementById('damage-upgrade')?.addEventListener('click', () => {
        if (score >= 300) {
            score -= 300
            bulletDamage += 50
            updateScoreDisplay()
        }
    })

    document.getElementById('speed-upgrade')?.addEventListener('click', () => {
        if (score >= 200) {
            score -= 200
            moveSpeed += 0.05
            updateScoreDisplay()
        }
    })

    document.getElementById('continue-button')?.addEventListener('click', () => {
        closeStore()
        createEnemies()
        updateScoreDisplay()
        const roundElement = document.getElementById('round')
        if (roundElement) {
            roundElement.textContent = `Round: ${currentRound}`
        }
    })

    document.getElementById('save-game')?.addEventListener('click', () => {
        saveGame()
    })

    document.getElementById('firerate-upgrade')?.addEventListener('click', () => {
        if (score >= 400) {
            score -= 400
            fireRate = Math.max(50, fireRate - 25) // Minimum 50ms between shots
            updateScoreDisplay()
        }
    })
}

// Game save/load functions
function saveGame() {
    const gameState = {
        score,
        playerHealth,
        maxHealth,
        currentRound,
        bulletDamage,
        moveSpeed
    }
    
    localStorage.setItem('universeInvaderSave', JSON.stringify(gameState))
    alert('Game saved successfully!')
}

function loadGame() {
    const savedGame = localStorage.getItem('universeInvaderSave')
    if (savedGame) {
        const gameState = JSON.parse(savedGame)
        score = gameState.score
        playerHealth = gameState.playerHealth
        maxHealth = gameState.maxHealth
        currentRound = gameState.currentRound
        bulletDamage = gameState.bulletDamage
        moveSpeed = gameState.moveSpeed
        
        updateScoreDisplay()
        updateHealthBar()
        const roundElement = document.getElementById('round')
        if (roundElement) {
            roundElement.textContent = `Round: ${currentRound}`
        }
        return true
    }
    return false
}

// Camera and player update functions
function updateCamera() {
    const smoothness = 0.1
    camera.position.x += (playerShip.position.x - camera.position.x) * smoothness
    camera.position.y += (playerShip.position.y - camera.position.y) * smoothness
    camera.position.z = 30
    
    camera.lookAt(playerShip.position.x, playerShip.position.y, 0)
}

function updatePlayerRotation() {
    // Get direction from player to mouse
    const dx = mouseWorldPosition.x - playerShip.position.x
    const dy = mouseWorldPosition.y - playerShip.position.y
    
    // Calculate angle and set ship rotation
    const angle = Math.atan2(dy, dx)
    playerShip.rotation.z = angle - Math.PI / 2
}

// Add with other game state variables
let isDebugMode = false;

// Add debug functions
function openDebugMenu() {
    const modal = document.getElementById('debug-modal');
    if (modal) {
        // Update input values
        (document.getElementById('debug-health') as HTMLInputElement).value = playerHealth.toString();
        (document.getElementById('debug-damage') as HTMLInputElement).value = bulletDamage.toString();
        (document.getElementById('debug-speed') as HTMLInputElement).value = moveSpeed.toString();
        (document.getElementById('debug-firerate') as HTMLInputElement).value = fireRate.toString();
        
        modal.style.display = 'block';
        isDebugMode = true;
    }
}

function closeDebugMenu() {
    const modal = document.getElementById('debug-modal');
    if (modal) {
        modal.style.display = 'none';
        isDebugMode = false;
    }
}

function setupDebugListeners() {
    document.getElementById('debug-spawn-enemy')?.addEventListener('click', () => {
        spawnSingleEnemy();
    });

    document.getElementById('debug-spawn-boss')?.addEventListener('click', () => {
        const enemyGeometry = new THREE.BoxGeometry(1, 1, 1);
        const enemyMaterial = new THREE.MeshBasicMaterial({ color: 0x880000 });
        const boss = new BossEnemy(enemyGeometry, enemyMaterial, 500);
        
        let validPosition = false;
        while (!validPosition) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * 10;
            const x = playerShip.position.x + Math.cos(angle) * distance;
            const y = playerShip.position.y + Math.sin(angle) * distance;

            const tooCloseToOtherEnemies = enemies.some(otherEnemy => {
            const dx = x - otherEnemy.position.x;
            const dy = y - otherEnemy.position.y;
            return Math.sqrt(dx * dx + dy * dy) < 4; // Larger spacing for boss
            });

            if (!tooCloseToOtherEnemies) {
            boss.position.set(x, y, 0);
            validPosition = true;
            }
        }
        
        enemies.push(boss);
        scene.add(boss);
    });

    document.getElementById('debug-apply')?.addEventListener('click', () => {
        playerHealth = parseInt((document.getElementById('debug-health') as HTMLInputElement).value);
        bulletDamage = parseInt((document.getElementById('debug-damage') as HTMLInputElement).value);
        moveSpeed = parseFloat((document.getElementById('debug-speed') as HTMLInputElement).value);
        fireRate = parseInt((document.getElementById('debug-firerate') as HTMLInputElement).value);
        
        updateHealthBar();
    });

    document.getElementById('debug-resume')?.addEventListener('click', closeDebugMenu);
}

// Event listeners
document.addEventListener('keydown', (event) => {
    if (gameOver) return

    switch (event.key.toLowerCase()) {
        case 'a': moveLeft = true; break
        case 'd': moveRight = true; break
        case 'w': moveUp = true; break
        case 's': moveDown = true; break
        case ' ': isShooting = true; break
        case 'j': 
            if (!isDebugMode) {
                openDebugMenu();
            } else {
                closeDebugMenu();
            }
            break;
    }
})

document.addEventListener('keyup', (event) => {
    switch (event.key.toLowerCase()) {
        case 'a': moveLeft = false; break
        case 'd': moveRight = false; break
        case 'w': moveUp = false; break
        case 's': moveDown = false; break
        case ' ': isShooting = false; break
    }
})

document.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
})

// Add restart game functionality
document.getElementById('restart-button')?.addEventListener('click', () => {
    // Reset game state
    gameOver = false;
    score = 0;
    playerHealth = 1000;
    maxHealth = 1000;
    currentRound = 1;
    bulletDamage = 100;
    moveSpeed = 0.2;
    fireRate = 200;
    
    // Clear existing enemies
    enemies.forEach(enemy => {
        scene.remove(enemy);
        enemy.destroy();
    });
    enemies = []
    updateEnemiesCounter() // Add this
    
    // Reset player position
    playerShip.position.set(0, -8, 0);
    
    // Hide game over modal
    const modal = document.getElementById('gameover-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Reset UI
    updateScoreDisplay();
    updateHealthBar();
    const roundElement = document.getElementById('round');
    if (roundElement) {
        roundElement.textContent = `Round: ${currentRound}`;
    }
    
    // Start new game
    createEnemies()
})

// Create player light
const playerLight = new THREE.PointLight(0x00ff00, 2, 15)
playerLight.position.copy(playerShip.position)
scene.add(playerLight)

// Create particle system for thrusters
const thrusterGeometry = new THREE.BufferGeometry()
const thrusterVertices = new Float32Array(300) // 100 particles * 3 coordinates
const thrusterColors = new Float32Array(300) // 100 particles * 3 color values

// Initialize particles with random positions
for (let i = 0; i < 300; i += 3) {
    thrusterVertices[i] = 0
    thrusterVertices[i + 1] = 0
    thrusterVertices[i + 2] = 0
    
    // Green to yellow colors for thrust
    thrusterColors[i] = Math.random() * 0.5 + 0.5 // R: 0.5-1.0
    thrusterColors[i + 1] = Math.random() * 0.5 + 0.5 // G: 0.5-1.0
    thrusterColors[i + 2] = 0 // B: 0
}

thrusterGeometry.setAttribute('position', new THREE.BufferAttribute(thrusterVertices, 3))
thrusterGeometry.setAttribute('color', new THREE.BufferAttribute(thrusterColors, 3))

const thrusterMaterial = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.8
})

const thrusterParticles = new THREE.Points(thrusterGeometry, thrusterMaterial)
playerShip.add(thrusterParticles)
thrusterParticles.position.y = -1 // Position behind the ship

// Animation loop
function animate() {
    requestAnimationFrame(animate)
    
    // Calculate mouse world position
    const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5)
    vector.unproject(camera)
    const dir = vector.sub(camera.position).normalize()
    const distance = -camera.position.z / dir.z
    mouseWorldPosition.copy(camera.position).add(dir.multiplyScalar(distance))
    mouseWorldPosition.z = 0
    
    // Always update player rotation
    updatePlayerRotation()
    
    // Game state check
    if (gameOver || isStorePaused || isDebugMode) {
        // Still render the scene even when paused
        renderer.render(scene, camera)
        return
    }

    const delta = 0.016

    // Player movement
    if (moveLeft) playerShip.position.x -= moveSpeed * delta * 60
    if (moveRight) playerShip.position.x += moveSpeed * delta * 60
    if (moveUp) playerShip.position.y += moveSpeed * delta * 60
    if (moveDown) playerShip.position.y -= moveSpeed * delta * 60

    // Move camera update here after movement
    updateCamera()
    
    // Update player light position
    playerLight.position.copy(playerShip.position)
    
    // Handle shooting
    if (isShooting && Date.now() - lastShotTime > fireRate) {
        shoot()
        lastShotTime = Date.now()
    }

    // Bullet movement and collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i]
        const bulletSpeed = 0.5
        
        bullet.position.x += bullet.userData.directionX * bulletSpeed
        bullet.position.y += bullet.userData.directionY * bulletSpeed
        
        if (bullet.position.distanceTo(playerShip.position) > 30) {
            scene.remove(bullet)
            bullets.splice(i, 1)
            continue
        }

        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j] as Enemy
            if (bullet.position.distanceTo(enemy.position) < 1) {
                enemy.health -= bulletDamage;
                enemy.startHitEffect();
                scene.remove(bullet);
                bullets.splice(i, 1);
                
                if (enemy.health <= 0) {
                    // Create explosion effect
                    const explosionColor = enemy.enemyType === EnemyType.Boss ? 0xff0000 : 
                                          enemy.enemyType === EnemyType.Special ? 0x00ffff : 
                                          0xff6600
                    createExplosion(enemy.position.clone(), explosionColor)
                    
                    scene.remove(enemy);
                    enemy.destroy();
                    enemies.splice(j, 1);
                    updateEnemiesCounter() // Add this
                    // Different score rewards based on enemy type
                    switch (enemy.enemyType) {
                        case EnemyType.Boss:
                            score += 500;
                            break;
                        case EnemyType.Special:
                            score += 250;
                            break;
                        default:
                            score += 100;
                    }
                    updateScoreDisplay();
                }
                break;
            }
        }
    }

    // Enemy movement and spawning
    enemies.forEach((enemy) => {
        const directionX = playerShip.position.x - enemy.position.x
        const directionY = playerShip.position.y - enemy.position.y
        
        const length = Math.sqrt(directionX * directionX + directionY * directionY)
        const normalizedX = directionX / length
        const normalizedY = directionY / length
        
        const enemySpeed = 0.05 + (currentRound * 0.01)
        enemy.position.x += normalizedX * enemySpeed
        enemy.position.y += normalizedY * enemySpeed
        
        enemy.updateHealthBar(); // Update health bar position
        enemy.updateHitEffect();
        
        if (enemy.position.distanceTo(playerShip.position) < 1.5) {
            // Different damage based on enemy type
            switch (enemy.enemyType) {
                case EnemyType.Boss:
                    playerHealth -= 400; // Boss deals double damage
                    break;
                case EnemyType.Special:
                    playerHealth -= 300; // Special enemy deals 1.5x damage
                    break;
                default:
                    playerHealth -= 200; // Normal enemy base damage
            }
            
            updateHealthBar();
            scene.remove(enemy);
            enemy.destroy();
            enemies = enemies.filter(e => e !== enemy);
            
            if (playerHealth <= 0) {
                gameOver = true;
                localStorage.removeItem('universeInvaderSave');
                
                // Show game over modal
                const modal = document.getElementById('gameover-modal');
                const finalRound = document.getElementById('final-round');
                const finalScore = document.getElementById('final-score');
                
                if (modal && finalRound && finalScore) {
                    finalRound.textContent = currentRound.toString();
                    finalScore.textContent = score.toString();
                    modal.style.display = 'block';
                }
            }
        }
    })

    // Enemy spawning logic
    const currentTime = Date.now()
    if (enemiesRemainingToSpawn > 0 && currentTime - lastSpawnTime >= timeBetweenSpawns) {
        spawnSingleEnemy()
        lastSpawnTime = currentTime
    }

    // Check round completion
    if (enemies.length === 0 && enemiesRemainingToSpawn === 0) {
        startNewRound()
    }

    // Animate starfield
    starField.rotation.z += 0.0001
    starField.position.x = camera.position.x * 0.3
    starField.position.y = camera.position.y * 0.3

    // Update thruster particles
    const positions = thrusterParticles.geometry.attributes.position.array
    const isMoving = moveUp || moveDown || moveLeft || moveRight

    if (isMoving) {
        // Move existing particles
        for (let i = 0; i < positions.length; i += 3) {
            // Base particle movement
            const particleSpeed = 0.1

            // Calculate movement direction
            let xOffset = 0
            let yOffset = 0

            if (moveUp) yOffset = -particleSpeed
            if (moveDown) yOffset = particleSpeed
            if (moveLeft) xOffset = particleSpeed
            if (moveRight) xOffset = -particleSpeed

            // Move particles based on ship movement
            positions[i] += xOffset
            positions[i + 1] += yOffset

            // Reset particles that go too far
            const distanceFromCenter = Math.sqrt(
                positions[i] * positions[i] + 
                positions[i + 1] * positions[i + 1]
            )

            if (distanceFromCenter > 2) {
                // Reset to origin with slight randomization
                positions[i] = (Math.random() - 0.5) * 0.2
                positions[i + 1] = (Math.random() - 0.5) * 0.2
                positions[i + 2] = (Math.random() - 0.5) * 0.2
            }
        }
    } else {
        // Clear all particles when ship is not moving
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] = 0
            positions[i + 1] = 0
            positions[i + 2] = 0
        }
    }

    thrusterParticles.geometry.attributes.position.needsUpdate = true

    // Update particle appearance based on movement
    thrusterMaterial.opacity = isMoving ? 0.8 : 0
    thrusterMaterial.size = isMoving ? 0.15 : 0.1

    // Rotate particles container based on movement direction
    if (isMoving) {
        let angle = 0
        if (moveUp && !moveLeft && !moveRight) angle = Math.PI
        else if (moveDown && !moveLeft && !moveRight) angle = 0
        else if (moveLeft && !moveUp && !moveDown) angle = -Math.PI/2
        else if (moveRight && !moveUp && !moveDown) angle = Math.PI/2
        else if (moveUp && moveLeft) angle = -Math.PI * 3/4
        else if (moveUp && moveRight) angle = Math.PI * 3/4
        else if (moveDown && moveLeft) angle = -Math.PI/4
        else if (moveDown && moveRight) angle = Math.PI/4

        thrusterParticles.rotation.z = angle
    }

    renderer.render(scene, camera)
}

// Initialize game
if (!loadGame()) {
    createEnemies()
}
setupDebugListeners()
updateScoreDisplay()
animate()

// Add after the Enemy class

function createExplosion(position: THREE.Vector3, color: number) {
    const particleCount = 50
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const velocities: THREE.Vector3[] = []
    
    // Create initial positions and velocities
    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = position.x
        positions[i + 1] = position.y
        positions[i + 2] = position.z
        
        velocities.push(new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3
        ))
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    const material = new THREE.PointsMaterial({
        color: color,
        size: 0.2,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 1
    })
    
    const particles = new THREE.Points(geometry, material)
    scene.add(particles)
    
    // Animation variables
    let life = 1.0
    const decay = 0.05
    
    function animateExplosion() {
        if (life <= 0) {
            scene.remove(particles)
            return
        }
        
        const positions = particles.geometry.attributes.position.array
        
        // Update particle positions based on velocities
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += velocities[i/3].x
            positions[i + 1] += velocities[i/3].y
            positions[i + 2] += velocities[i/3].z
            
            // Add some gravity effect
            velocities[i/3].y -= 0.01
        }
        
        particles.geometry.attributes.position.needsUpdate = true
        
        // Fade out
        material.opacity = life
        life -= decay
        
        requestAnimationFrame(animateExplosion)
    }
    
    animateExplosion()
}

