# Space Shooter Game - Relatório Técnico Completo

## Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Sistemas de Jogo](#sistemas-de-jogo)
4. [Tipos de Inimigos](#tipos-de-inimigos)
5. [Sistema de Armas](#sistema-de-armas)
6. [Power-ups](#power-ups)
7. [Sistema de Loja](#sistema-de-loja)
8. [Menu de Debug](#menu-de-debug)
9. [Configurações](#configurações)
10. [Controles](#controles)
11. [Instalação e Execução](#instalação-e-execução)

## Visão Geral

Este é um jogo de nave espacial 3D desenvolvido em TypeScript utilizando a biblioteca Three.js. O jogador controla uma nave espacial que deve sobreviver a ondas de inimigos progressivamente mais difíceis, utilizando diversos tipos de armamento e melhorias compradas entre as rondas.

### Características Principais
- **Engine**: Three.js para renderização 3D
- **Linguagem**: TypeScript para type safety
- **Arquitetura**: Sistema modular baseado em managers
- **Gameplay**: Wave-based survival com progressão RPG
- **Visual**: Efeitos de partículas e iluminação dinâmica

## Arquitetura do Sistema

### Estrutura de Pastas
```
src/
├── config/          # Configurações do jogo
├── managers/        # Gestores dos sistemas principais
├── models/          # Classes dos objetos do jogo
├── types/           # Definições de tipos TypeScript
├── utils/           # Utilitários e helpers
└── main.ts          # Classe principal do jogo
```

### Managers Principais

#### 1. **SceneManager**
- Gestão da cena Three.js
- Configuração de câmera, iluminação e renderer
- Controlo de viewport e redimensionamento

#### 2. **PlayerManager**
- Controlo da nave do jogador
- Sistema de vida e escudo
- Movimentação e física

#### 3. **EnemyManager**
- Spawn e gestão de inimigos
- IA de diferentes tipos de inimigos
- Sistema de waves progressivas

#### 4. **BulletManager**
- Gestão de projéteis do jogador
- Sistema de piercing e balas críticas
- Balas "glitched" com auto-targeting

#### 5. **PowerUpManager**
- Spawn de power-ups
- Sistema de colisões e efeitos
- Gestão de raridade (incluindo Super Nova)

#### 6. **StoreManager**
- Sistema de loja entre rondas
- Cálculo de preços e melhorias
- Interface de compras

#### 7. **UIManager**
- Interface do utilizador
- HUD de informações de jogo
- Menus e overlays

#### 8. **GameManager**
- Sistema de save/load
- Persistência de progresso
- Gestão de estado global

### Sistemas Auxiliares

#### **MissileManager**
- Mísseis teleguiados do jogador
- Sistema de targeting automático

#### **EMPBombManager**
- Bombas EMP que paralisam inimigos
- Efeitos de área

#### **NaniteDroneManager**
- Drones que reparam automaticamente a nave
- Regeneração de vida

## Sistemas de Jogo

### Sistema de Progressão
O jogo utiliza um sistema baseado em rondas onde:
- Cada ronda aumenta a dificuldade
- Inimigos ficam mais fortes (vida e dano escalados)
- Novos tipos de inimigos aparecem em rondas específicas
- Entre rondas, o jogador pode comprar melhorias na loja

### Sistema de Pontuação
```typescript
// Pontuações base por tipo de inimigo:
Normal Enemy: 100 pontos
Special Enemy: 200 pontos
Boss Enemy: 500 pontos
Shifter Enemy: 150 pontos
Destroyer Enemy: 300 pontos

// Bônus especiais:
Super Nova (por inimigo): 200 pontos (2x multiplier)
Míssil destruído: 25 pontos
Críticos: Dano aumentado (não afeta pontuação)
```

### Sistema de Vida e Escudo
- **Vida Inicial**: 100 HP
- **Regeneração**: Através de power-ups ou nanite drones
- **Escudo Overcharge**: Proteção temporária com barra visual
- **Dano por tipo**: Escalado por ronda com diferentes multipliers

## Tipos de Inimigos

### 1. **Normal Enemy (Vermelho)**
- **Vida**: Base escalada por ronda
- **Comportamento**: Movimento direto em direção ao jogador
- **Spawn**: Desde a ronda 1
- **Pontos**: 100

### 2. **Special Enemy (Azul)**
- **Vida**: 150% da vida base
- **Comportamento**: Movimento mais agressivo
- **Spawn**: A partir da ronda 3 (10% chance inicial)
- **Pontos**: 200

### 3. **Boss Enemy (Roxo)**
- **Vida**: 300% da vida base
- **Comportamento**: Tanque pesado, movimento lento
- **Spawn**: A partir da ronda 5 (5% chance inicial)
- **Pontos**: 500

### 4. **Shifter Enemy (Laranja)**
- **Vida**: 40% da vida base (baixa resistência)
- **Comportamento**: **Teletransporte defensivo**
  - Deteta projéteis num raio de 5 unidades
  - Teletransporta-se para posição aleatória no ecrã
  - Cooldown de 2 segundos entre teletransportes
  - Efeitos visuais: anéis laranjas no ponto de partida e chegada
- **Spawn**: A partir da ronda 2 (5% chance inicial, +2% por ronda, máx 15%)
- **Pontos**: 150

### 5. **Destroyer Enemy (Verde)**
- **Vida**: 120% da vida base
- **Comportamento**: **Combate à distância**
  - Mantém distância do jogador (8-12 unidades)
  - Dispara mísseis teleguiados de 3 em 3 segundos
  - Mísseis podem ser destruídos por balas do jogador
  - IA tática: recua quando jogador se aproxima
- **Spawn**: A partir da ronda 4 (3% chance inicial, +1% por ronda, máx 10%)
- **Pontos**: 300
- **Mísseis**: 35 de dano base, escalado por ronda

## Sistema de Armas

### Armas Base
- **Dano Inicial**: 100
- **Cadência**: 200ms entre disparos
- **Projéteis**: Cilíndricos azuis ciano

### Melhorias de Armas

#### 1. **Piercing Bullets**
- **Custo Base**: 800 pontos
- **Níveis**: 1-5
- **Efeito**: Projéteis atravessam múltiplos inimigos
- **Escalação**: Multiplier 1.8x por nível

#### 2. **Super Bullets (Críticos)**
- **Custo Base**: 1000 pontos
- **Níveis**: 1-10
- **Efeito**: 
  - Chance de crítico: 5% por nível
  - Dano crítico: 2.0x do dano base
  - Visual: Projéteis laranjas maiores com brilho intenso
- **Escalação**: Multiplier 2.2x por nível

#### 3. **Glitched Bullets**
- **Custo Base**: 1200 pontos (upgrade mais caro)
- **Níveis**: 1-5
- **Efeito**: 
  - Ao atingir inimigo, cria 1 projétil adicional por nível
  - Projéteis criados são autoguiados ao inimigo mais próximo
  - Visual: Projéteis roxos hexagonais
  - Velocidade: 20% mais rápida que projéteis normais
- **Escalação**: Multiplier 2.0x por nível
- **Limitações**: 
  - Projéteis glitched não criam mais projéteis (evita recursão)
  - Sem piercing (destroem-se ao primeiro impacto)
  - Limite de 50 projéteis simultâneos para performance

## Power-ups

### Power-ups Comuns (85% spawn chance)

#### 1. **Health Pack (Verde)**
- **Efeito**: Restaura 50 HP
- **Visual**: Cubo verde com cruz médica

#### 2. **Homing Missiles (Azul)**
- **Efeito**: +3 mísseis teleguiados
- **Uso**: Tecla Space para disparar
- **Visual**: Cubo azul com efeito de brilho

### Power-ups Raros (10% spawn chance)

#### 3. **Shield Overcharge (Amarelo)**
- **Efeito**: Escudo temporário que absorve todo o dano
- **Duração**: 15 segundos
- **Visual**: Cubo amarelo + UI de escudo ativo
- **Cooldown**: 3 segundos entre ativações

#### 4. **EMP Bomb (Roxo)**
- **Efeito**: Paralisa todos os inimigos por 5 segundos
- **Uso**: Ativação automática ou manual
- **Visual**: Cubo roxo + onda expansiva roxa
- **Alcance**: Todo o ecrã

### Power-ups Ultra Raros (5% spawn chance)

#### 5. **Super Nova (Dourado)**
- **Efeito**: **Destrói TODOS os inimigos no ecrã**
- **Pontuação**: 2x multiplier para todos os inimigos destruídos
- **Visual**: 
  - Esfera dourada grande com luz intensa
  - Animação de pulsação e rotação acelerada
  - Efeitos de explosão múltipla em cascata
  - Flash branco no ecrã
  - Texto "SUPER NOVA!" em dourado
- **Spawn**: 5% de chance, power-up mais raro do jogo

## Sistema de Loja

### Melhorias Disponíveis

#### **Categoria: Jogador**
1. **Health Upgrade**: +25 HP máximo (500 pontos base)
2. **Speed Upgrade**: +15% velocidade movimento (400 pontos base)

#### **Categoria: Armas**
1. **Damage Upgrade**: +25 dano base (600 pontos base)
2. **Fire Rate**: -20ms intervalo entre disparos (700 pontos base)
3. **Piercing Bullets**: Atravessam inimigos (800 pontos base)
4. **Super Bullets**: Balas críticas (1000 pontos base)
5. **Glitched Bullets**: Balas que criam autoguiados (1200 pontos base)

#### **Categoria: Equipamento**
1. **Homing Missiles**: +1 míssil por compra (300 pontos base)
2. **Shield Overcharge**: Proteção temporária (900 pontos base)

### Sistema de Preços
```typescript
// Fórmula de escalação de preços:
finalCost = baseCost * (costMultiplier ^ currentLevel) * (1 + (round - 1) * 0.1)

// Multipliers por item:
Health: 1.5x
Damage: 1.8x
Speed: 1.6x
Fire Rate: 1.7x
Piercing: 1.8x
Super Bullets: 2.2x
Glitched Bullets: 2.0x
Missiles: 1.4x
Shield: 2.0x
```

## Menu de Debug

### Funcionalidades de Debug
- **Ativação**: Tecla 'J' ou botão na interface
- **Stats Editáveis**:
  - Vida do jogador (1-999)
  - Dano das balas (1-999)
  - Velocidade movimento (1-10)
  - Cadência de tiro (50-1000ms)
  - Pontuação (0-999999)
  - Quantidade de mísseis (0-99)
  - Nanite drones (0-10)
  - Nível Super Bullets (0-10)
  - Nível Glitched Bullets (0-5)

### Botões de Spawn
- **Spawn Normal Enemy**: Cria inimigo básico
- **Spawn Boss Enemy**: Cria boss inimigo
- **Spawn Shifter Enemy**: Cria inimigo teletransportador
- **Spawn Destroyer Enemy**: Cria inimigo que dispara mísseis
- **Trigger Super Nova**: Ativa efeito Super Nova imediatamente

### Funcionalidades de Teste
- **Reset Game**: Reinicia jogo com stats originais
- **Apply Changes**: Aplica modificações instantaneamente
- **Feedback Visual**: Confirmações de ações realizadas

## Configurações

### GameConfig.ts - Parâmetros Principais

#### **Configurações de Jogador**
```typescript
INITIAL_HEALTH: 100
INITIAL_MAX_HEALTH: 100
INITIAL_MOVE_SPEED: 0.3
INITIAL_BULLET_DAMAGE: 100
INITIAL_FIRE_RATE: 200 // ms
```

#### **Configurações de Inimigos**
```typescript
ENEMY_BASE_HEALTH: 100
ENEMY_HEALTH_MULTIPLIER: 0.2 // +20% por ronda
ENEMY_DAMAGE_MULTIPLIER: 0.1 // +10% por ronda
BOSS_HEALTH_MULTIPLIER: 3.0
SPECIAL_HEALTH_MULTIPLIER: 1.5
```

#### **Configurações de Shifter**
```typescript
SHIFTER: {
    HEALTH_MULTIPLIER: 0.4,        // 40% da vida base
    DETECTION_RADIUS: 5,           // Raio de detecção
    TELEPORT_COOLDOWN: 2000,       // 2 segundos
    TELEPORT_BOUNDS: 18,           // Limites do mapa
    COLOR: 0xffa500               // Laranja
}
```

#### **Configurações de Destroyer**
```typescript
DESTROYER: {
    HEALTH_MULTIPLIER: 1.2,        // 120% da vida base
    MISSILE_FIRE_RATE: 3000,       // 3 segundos entre mísseis
    MISSILE_DAMAGE: 35,            // Dano base dos mísseis
    PREFERRED_DISTANCE: 10,        // Distância preferida do jogador
    RETREAT_SPEED: 0.08,           // Velocidade de recuo
    COLOR: 0x44ff44               // Verde
}
```

#### **Configurações de Power-ups**
```typescript
POWER_UP_SPAWN_CHANCE: 15,         // 15% chance por inimigo morto
SUPER_NOVA_SPAWN_CHANCE: 5,        // 5% dos power-ups
HEALTH_RESTORE_AMOUNT: 50,
MISSILE_PACK_AMOUNT: 3,
SHIELD_DURATION: 15000            // 15 segundos
```

## Controles

### Controles Básicos
- **Movimento**: WASD ou setas direcionais
- **Disparo**: Clique esquerdo do rato (auto-fire contínuo)
- **Míssil Teleguiado**: Barra de espaço
- **Pausa**: Tecla P
- **Loja**: Tecla E (entre rondas)

### Controles de Debug
- **Menu Debug**: Tecla J
- **Debug Buttons**: Cliques nos botões da interface

### Controles de UI
- **Fechar Menus**: Tecla Escape ou botões X
- **Aplicar Mudanças**: Botão "Apply Changes" no debug
- **Navegação**: Mouse para todos os menus

## Instalação e Execução

### Pré-requisitos
- Node.js (versão 16 ou superior)
- NPM ou Yarn
- Browser moderno com suporte WebGL

### Instalação
```bash
# Clonar repositório
git clone <repository-url>
cd CG-Proj

# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Build para produção
npm run build
```

### Estrutura de Build
```
dist/
├── index.html
├── assets/
│   ├── index.js      # Código JavaScript compilado
│   └── index.css     # Estilos CSS
└── ...
```

### Dependências Principais
```json
{
  "three": "^0.158.0",           // Engine 3D
  "typescript": "^5.0.0",        // Type safety
  "vite": "^4.4.0"              // Build tool
}
```

## Performance e Otimizações

### Otimizações Implementadas
1. **Object Pooling**: Reutilização de projéteis e partículas
2. **Culling**: Remoção de objetos fora do viewport
3. **Limite de Objetos**: Máximo de 50 projéteis simultâneos
4. **Cleanup Automático**: Limpeza de trails e efeitos
5. **Event Batching**: Agrupamento de updates de UI

### Limitações de Performance
- **Máximo de inimigos**: ~30 simultâneos
- **Máximo de projéteis**: 50 simultâneos
- **Máximo de partículas**: Controlado pelo ParticleSystem
- **Resolução recomendada**: 1920x1080 ou inferior

## Sistema de Partículas

### Efeitos Visuais
1. **Explosões**: Múltiplas cores baseadas no tipo de objeto
2. **Trails**: Rastros de mísseis e projéteis especiais
3. **Teleporte**: Anéis expansivos para Shifter enemies
4. **Super Nova**: Sistema de explosões em cascata
5. **EMP**: Ondas de energia roxa expansiva

### ParticleSystem Manager
- Criação dinâmica de partículas
- Cleanup automático após animações
- Otimização de transparência e blending
- Suporte a múltiplas cores e tamanhos

## Save/Load System

### GameState Persistido
```typescript
interface GameState {
    round: number;
    score: number;
    health: number;
    maxHealth: number;
    moveSpeed: number;
    bulletDamage: number;
    fireRate: number;
    homingMissiles: number;
    hasShieldOverdrive: boolean;
    piercingLevel: number;
    superBulletLevel: number;
    glitchedBulletLevel: number;
}
```

### LocalStorage Integration
- Salvamento automático a cada compra/upgrade
- Carregamento no início do jogo
- Backup de segurança em caso de corrupção
- Reset manual através do debug menu

---

**Desenvolvido com Three.js e TypeScript**  
**Versão**: 1.0  
**Data**: Dezembro 2024