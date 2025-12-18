
import { Enemy, EnemyType, GameStats, Gem, Particle, Player, Projectile, Vector2, Vector3 } from "../types";
import { BASE_STATS, CANVAS_HEIGHT, CANVAS_WIDTH, COLORS } from "../constants";

// Helper to generate UUIDs
export const uuid = () => Math.random().toString(36).substr(2, 9);

export const createPlayer = (): Player => ({
  id: 'player',
  pos: { x: 0, y: 0, z: 0 },
  vel: { x: 0, y: 0, z: 0 },
  radius: 15,
  color: COLORS.player,
  rotation: 0,
  hp: BASE_STATS.hp,
  maxHp: BASE_STATS.hp,
  xp: 0,
  level: 1,
  nextLevelXp: 100,
  stats: {
    damage: BASE_STATS.damage,
    moveSpeed: BASE_STATS.speed,
    fireRate: BASE_STATS.fireRate,
    projectileCount: BASE_STATS.projectileCount,
    pickupRange: BASE_STATS.pickupRange,
  },
  lastFired: 0,
  invulnerableUntil: 0,
});

export const spawnBoss = (playerPos: Vector3, level: number): Enemy => {
  const angle = Math.random() * Math.PI * 2;
  const dist = 500;
  
  const x = playerPos.x + Math.cos(angle) * dist;
  const y = playerPos.y + Math.sin(angle) * dist;

  const scale = Math.min(3, 1 + (level * 0.05)); // Scaling factor for boss

  return {
    id: `boss-${uuid()}`,
    pos: { x, y, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
    radius: 40 * scale, // Grows with level
    color: COLORS.enemyBoss,
    rotation: 0,
    hp: 500 * (level * 0.5),
    maxHp: 500 * (level * 0.5),
    damage: 20 + level,
    speed: 1.5, // Slow but imposing
    type: 'boss',
    xpValue: 500 * level,
    spawnTimer: 3000, // 3s warning time
    canShoot: true,
    lastFired: 0
  };
};

export const spawnEnemy = (playerPos: Vector3, difficultyFactor: number, playerLevel: number): Enemy => {
  const angle = Math.random() * Math.PI * 2;
  const dist = 350 + Math.random() * 250; 
  
  const x = playerPos.x + Math.cos(angle) * dist;
  const y = playerPos.y + Math.sin(angle) * dist;

  // Determine available types based on level
  const availableTypes: EnemyType[] = ['scout'];
  
  // Progressive unlock every 7 levels
  if (playerLevel >= 3) availableTypes.push('fighter');
  if (playerLevel >= 5) availableTypes.push('heavy');
  if (playerLevel >= 7) availableTypes.push('tank');
  if (playerLevel >= 14) availableTypes.push('speeder');
  if (playerLevel >= 21) availableTypes.push('orbit');
  if (playerLevel >= 28) availableTypes.push('swarmer');
  if (playerLevel >= 35) availableTypes.push('elite');

  // Select type based on random weight
  const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];

  let hp = 20;
  let speed = 3;
  let radius = 12;
  let color = COLORS.enemyScout;
  let xpBase = 10;
  let damage = 10;

  switch (type) {
    case 'scout':
        hp = 20; speed = 3 + Math.random(); radius = 12; color = COLORS.enemyScout; xpBase = 10;
        break;
    case 'fighter':
        hp = 40; speed = 2.5 + Math.random(); radius = 15; color = COLORS.enemyFighter; xpBase = 20;
        break;
    case 'heavy':
        hp = 100; speed = 1.5; radius = 20; color = COLORS.enemyHeavy; xpBase = 50; damage = 15;
        break;
    case 'tank':
        hp = 200; speed = 1.0; radius = 25; color = COLORS.enemyTank; xpBase = 80; damage = 20;
        break;
    case 'speeder':
        hp = 30; speed = 5.0; radius = 10; color = COLORS.enemySpeeder; xpBase = 40;
        break;
    case 'orbit':
        hp = 60; speed = 3.5; radius = 14; color = COLORS.enemyOrbit; xpBase = 50;
        break;
    case 'swarmer':
        hp = 10; speed = 4.5; radius = 8; color = COLORS.enemySwarmer; xpBase = 15;
        break;
    case 'elite':
        hp = 300; speed = 2.5; radius = 18; color = COLORS.enemyElite; xpBase = 150; damage = 25;
        break;
  }

  // Scale stats with difficulty
  hp *= difficultyFactor;
  damage *= difficultyFactor;
  const scaledXp = Math.floor(xpBase * difficultyFactor);

  return {
    id: uuid(),
    pos: { x, y, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
    radius,
    color,
    rotation: 0,
    hp,
    maxHp: hp,
    damage,
    speed,
    type,
    xpValue: scaledXp,
    spawnTimer: 1000,
    canShoot: false, // Only Boss shoots for now (unless we want elite to shoot later)
    lastFired: 0
  };
};

export const checkCollision = (a: {pos: Vector3, radius: number}, b: {pos: Vector3, radius: number}) => {
  const dx = a.pos.x - b.pos.x;
  const dy = a.pos.y - b.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < (a.radius + b.radius);
};

export const getClosestEnemy = (player: Player, enemies: Enemy[]): Enemy | null => {
  let closest = null;
  let minDst = Infinity;

  for (const enemy of enemies) {
    // Ignore spawning enemies
    if (enemy.spawnTimer > 0) continue;

    const dx = enemy.pos.x - player.pos.x;
    const dy = enemy.pos.y - player.pos.y;
    const dst = dx * dx + dy * dy;
    if (dst < minDst) {
      minDst = dst;
      closest = enemy;
    }
  }
  
  // Max targeting range (screen size approx)
  if (minDst > (1500 * 1500)) return null;

  return closest;
};