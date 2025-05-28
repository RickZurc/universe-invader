export const GameConfig = {    // Initial player stats - more challenging early game
    INITIAL_HEALTH: 650,
    INITIAL_MAX_HEALTH: 650,
    INITIAL_BULLET_DAMAGE: 120,
    INITIAL_MOVE_SPEED: 0.2,
    INITIAL_FIRE_RATE: 300,  // Slower initial fire rate for more tactical gameplay

    // Base game settings
    BASE_ENEMY_ROWS: 2,      // Start with fewer enemies
    BASE_ENEMY_COLS: 3,
    CAMERA_SMOOTHNESS: 0.1,
    BULLET_SPEED: 0.6,       // Faster bullets for better feel
    PARTICLE_COUNT: 50,
    STAR_COUNT: 10000,    // Enemy base stats
    ENEMY_BASE_HEALTH: 400,  // Higher base health for more challenge
    ENEMY_SPAWN_TIME: 1200,  // Faster spawns for increased pressure
    ENEMY_BASE_DAMAGE: {
        NORMAL: 25,          // Increased damage to punish mistakes
        SPECIAL: 40,
        BOSS: 60
    },
      // Difficulty scaling
    DIFFICULTY: {
        // Wave scaling
        MAX_ENEMIES_PER_WAVE: 30,    // More enemies per wave for increased challenge
        MAX_BOSSES_PER_WAVE: 2,      // Keep max 2 bosses for balance
        HEALTH_SCALE_CAP: 20,        // Health scales longer for sustained difficulty
        SPEED_SCALE_CAP: 15,         // Speed scales longer
        SPAWN_SPEED_SCALE_CAP: 12,   // Spawn speed scales longer
        MAX_SPAWN_REDUCTION: 300,     // Faster minimum spawn time for intensity
          // Enemy type scaling
        SPECIAL_ENEMY_BASE_CHANCE: 0.2,       // Higher initial special enemy chance
        SPECIAL_ENEMY_MAX_CHANCE: 0.6,        // Higher max special enemy chance
        SPECIAL_ENEMY_INCREASE_PER_ROUND: 0.04, // Faster special enemy scaling
        
        // Boss scaling
        BOSS_HEALTH_INCREASE_PER_5_ROUNDS: 0.4,  // 40% more health every 5 rounds
        ENEMY_SPEED_INCREASE_PER_ROUND: 0.04,    // 4% faster each round
          // Round scaling factors
        HEALTH_SCALE_FACTOR: 1.12,   // 12% health increase per round
        SCORE_SCALE_FACTOR: 1.25,    // 25% score increase per round
        WAVE_SIZE_INCREASE: 2,       // Add 2 enemies per round
        UPGRADE_COST_SCALE_FACTOR: 1.15  // 15% upgrade cost increase per round
    },    // Store costs - base costs before round scaling
    UPGRADE_COSTS: {
        HEALTH: 600,    // Significant investment for survivability
        DAMAGE: 500,    // Higher cost for offensive power
        SPEED: 450,     // Movement is crucial for survival
        FIRE_RATE: 650  // Most impactful upgrade has highest cost
    },

    // Knockback ability settings
    KNOCKBACK: {
        RADIUS: 10,           // Units from player
        FORCE: 0.5,          // Force multiplier
        COOLDOWN: 5000,      // 5 seconds in milliseconds
        EFFECT_DURATION: 500  // How long knockback effect lasts in ms
    },

    // Power-up settings
    POWER_UP: {
        SPAWN_INTERVAL: 15000,     // Try to spawn every 15 seconds
        SPAWN_CHANCE: 0.3,         // 30% chance to spawn when interval is met
        MAX_ACTIVE: 3,            // Maximum number of power-ups active at once
        MIN_SPAWN_DISTANCE: 15,    // Minimum distance from player
        MAX_SPAWN_DISTANCE: 25,    // Maximum distance from player
        PICKUP_RADIUS: 2,          // How close player needs to be to pick up
    },    
    // Homing missile settings
    HOMING_MISSILE: {
        DAMAGE: 250,              // Base damage
        BLAST_RADIUS: 5,          // Explosion radius
        BLAST_DAMAGE_FALLOFF: 0.5, // Damage reduction per unit from center
        SPEED: 0.20,              // Movement speed (reduced for better tracking visibility)
        TURN_SPEED: 0.1,          // How fast it can turn to track enemies
        LIFETIME: 5000,           // How long the missile exists before expiring
        COOLDOWN: 1000,          // How long before the player can use another missile
    },

    // EMP Bomb settings
    EMP_BOMB: {        
        RADIUS: 8,                // Area of effect radius
        EFFECT_DURATION: 4000,    // How long enemies remain frozen (4 seconds)
        LIFETIME: 5000,          // How long the EMP field exists (10 seconds)
        MAX_ACTIVE: 3,           // Maximum number of active EMP fields
        COOLDOWN: 8000,          // Cooldown between uses (8 seconds)
        VISUAL_PULSE_RATE: 500,  // How often the visual effect pulses (1 second)
        PULSE_INTENSITY: 0.8,     // Visual intensity of the pulse effect
        CHAIN_RADIUS: 2,          // Distance for chain freezing between enemies
        CHAIN_CHANCE: 0.5,        // Chance to chain to nearby enemies
        COLOR: 0x00ffff,         // Cyan color for all EMP effects
    },
} as const;
