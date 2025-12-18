export enum GameState {
  MENU,
  PLAYING,
  PAUSED,
  GAME_OVER,
  VICTORY
}

export enum UpgradeType {
  DAMAGE = 'DAMAGE',
  SPEED = 'SPEED',
  SHIELD = 'SHIELD',
  MULTISHOT = 'MULTISHOT'
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Entity {
  id: string;
  pos: Vector3; // Using z for pseudo-3D height/depth effects
  vel: Vector3;
  radius: number;
  color: string;
  rotation: number;
}

export interface Player extends Entity {
  hp: number;
  maxHp: number;
  xp: number;
  level: number;
  nextLevelXp: number;
  stats: {
    damage: number;
    moveSpeed: number;
    fireRate: number; // Shots per second
    projectileCount: number;
    pickupRange: number;
  };
  lastFired: number;
  invulnerableUntil: number;
}

export type EnemyType = 
  | 'scout' 
  | 'fighter' 
  | 'heavy' 
  | 'tank'     // Lvl 7
  | 'speeder'  // Lvl 14
  | 'orbit'    // Lvl 21
  | 'swarmer'  // Lvl 28
  | 'elite'    // Lvl 35
  | 'boss';    // Every 5 levels

export interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  type: EnemyType;
  xpValue: number;
  spawnTimer: number; // Time in ms before enemy becomes active
  canShoot: boolean;
  lastFired: number;
}

export interface Projectile extends Entity {
  damage: number;
  duration: number;
  spawnTime: number;
  isEnemy: boolean; // True if fired by enemy (hurts player)
}

export interface Particle extends Entity {
  life: number;
  maxLife: number;
  size: number;
}

export interface Gem extends Entity {
  value: number;
  type: 'xp' | 'health';
}

export interface GameStats {
  enemiesKilled: number;
  timeAlive: number;
  score: number;
}