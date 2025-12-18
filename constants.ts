
export const CANVAS_WIDTH = window.innerWidth;
export const CANVAS_HEIGHT = window.innerHeight;

export const COLORS = {
  background: '#050505',
  player: '#00ffff',
  playerShield: '#00aaFF',
  
  // Basic Enemies
  enemyScout: '#ff0055',   // Red
  enemyFighter: '#ffaa00', // Orange
  enemyHeavy: '#aa00ff',   // Purple
  
  // Advanced Enemies
  enemyTank: '#00ff00',    // Green (Bulky)
  enemySpeeder: '#00ffff', // Cyan (Fast)
  enemyOrbit: '#ffff00',   // Yellow
  enemySwarmer: '#ff00ff', // Magenta (Small)
  enemyElite: '#ffffff',   // White (Strong)
  
  enemyBoss: '#ff3333',    // Bright Red / Threatening
  
  projectile: '#ffff00',
  enemyProjectile: '#ff0000',
  
  gem: '#00ff00',
  healthPack: '#ff3333',
  text: '#ffffff',
};

export const BASE_STATS = {
  hp: 100,
  damage: 10,
  speed: 5,
  fireRate: 2,
  projectileCount: 1,
  pickupRange: 100,
};

export const LEVEL_CAP = 100;
export const BASE_MAX_ENEMIES = 7;

// Math helpers
export const TWO_PI = Math.PI * 2;
export const DEG_TO_RAD = Math.PI / 180;