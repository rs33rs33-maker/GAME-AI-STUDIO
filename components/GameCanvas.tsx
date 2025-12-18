
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  COLORS, 
  TWO_PI,
  BASE_MAX_ENEMIES
} from '../constants';
import { 
  GameState, 
  Player, 
  Enemy, 
  Projectile, 
  Particle, 
  Gem, 
  UpgradeType,
  Vector3
} from '../types';
import { 
  createPlayer, 
  spawnEnemy, 
  spawnBoss,
  checkCollision, 
  getClosestEnemy, 
  uuid 
} from '../services/gameLogic';
import { playShootSfx, playExplosionSfx, startMusic, stopMusic } from '../services/audio';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (s: GameState) => void;
  onLevelUp: (player: Player) => void;
  onGameOver: (stats: any) => void;
  onTogglePause: () => void;
  upgradeSelection: UpgradeType | null; 
  resetSignal: number; 
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameState, 
  setGameState, 
  onLevelUp,
  onGameOver,
  onTogglePause,
  upgradeSelection,
  resetSignal
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const playerRef = useRef<Player>(createPlayer());
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const gemsRef = useRef<Gem[]>([]);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const cameraRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const timeAliveRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  
  // Track boss spawns to avoid duplicate spawns on the same level
  const bossSpawnedForLevelRef = useRef<number[]>([]);

  const pointerRef = useRef({
    isDown: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
  });
  
  // Audio Management
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
        startMusic();
    } else {
        stopMusic();
    }
    return () => stopMusic();
  }, [gameState]);

  // Apply Upgrade Effect
  useEffect(() => {
    if (!upgradeSelection) return;
    const p = playerRef.current;
    
    switch (upgradeSelection) {
      case UpgradeType.DAMAGE:
        p.stats.damage *= 1.2;
        break;
      case UpgradeType.SPEED:
        p.stats.moveSpeed *= 1.1;
        p.stats.fireRate *= 1.1;
        break;
      case UpgradeType.SHIELD:
        p.maxHp += 50;
        p.hp = p.maxHp; 
        break;
      case UpgradeType.MULTISHOT:
        p.stats.projectileCount += 1;
        break;
    }
    
    lastTimeRef.current = performance.now();
  }, [upgradeSelection]);

  // Reset Game
  useEffect(() => {
    if (resetSignal === 0) return;
    playerRef.current = createPlayer();
    enemiesRef.current = [];
    projectilesRef.current = [];
    particlesRef.current = [];
    gemsRef.current = [];
    bossSpawnedForLevelRef.current = []; // Reset boss history
    scoreRef.current = 0;
    timeAliveRef.current = 0;
    cameraRef.current = { x: 0, y: 0 };
    pointerRef.current.isDown = false;
    lastTimeRef.current = performance.now();
  }, [resetSignal]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Escape') {
            onTogglePause();
        }
        keysRef.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current[e.code] = false;
    
    const handlePointerDown = (x: number, y: number) => {
      if (gameState !== GameState.PLAYING) return;
      pointerRef.current.isDown = true;
      pointerRef.current.startX = x;
      pointerRef.current.startY = y;
      pointerRef.current.currentX = x;
      pointerRef.current.currentY = y;
    };

    const handlePointerMove = (x: number, y: number) => {
      if (!pointerRef.current.isDown) return;
      pointerRef.current.currentX = x;
      pointerRef.current.currentY = y;
    };

    const handlePointerUp = () => {
      pointerRef.current.isDown = false;
    };

    const onMouseDown = (e: MouseEvent) => handlePointerDown(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
    const onMouseUp = () => handlePointerUp();

    const onTouchStart = (e: TouchEvent) => {
        const t = e.changedTouches[0];
        handlePointerDown(t.clientX, t.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
        if (pointerRef.current.isDown) e.preventDefault();
        const t = e.changedTouches[0];
        handlePointerMove(t.clientX, t.clientY);
    };
    const onTouchEnd = (e: TouchEvent) => handlePointerUp();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [gameState, onTogglePause]);

  // Main Game Loop
  const gameLoop = useCallback((time: number) => {
    if (gameState !== GameState.PLAYING) return;

    const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = time;
    timeAliveRef.current += dt;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;

    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    const player = playerRef.current;
    
    // 1. Player Movement
    let dx = 0;
    let dy = 0;
    
    if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) dy -= 1;
    if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) dy += 1;
    if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) dx -= 1;
    if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) dx += 1;

    if (dx === 0 && dy === 0 && pointerRef.current.isDown) {
        const pdx = pointerRef.current.currentX - pointerRef.current.startX;
        const pdy = pointerRef.current.currentY - pointerRef.current.startY;
        const dist = Math.sqrt(pdx * pdx + pdy * pdy);
        if (dist > 10) {
            dx = pdx / dist;
            dy = pdy / dist;
        }
    }

    if (dx !== 0 || dy !== 0) {
      const inputLen = Math.sqrt(dx*dx + dy*dy);
      if (inputLen > 1) {
          dx /= inputLen;
          dy /= inputLen;
      }
      player.pos.x += dx * player.stats.moveSpeed;
      player.pos.y += dy * player.stats.moveSpeed;
      
      const targetRot = Math.atan2(dy, dx);
      let diff = targetRot - player.rotation;
      while (diff < -Math.PI) diff += TWO_PI;
      while (diff > Math.PI) diff -= TWO_PI;
      player.rotation += diff * 0.1;
    }

    cameraRef.current.x += (player.pos.x - cameraRef.current.x) * 0.1;
    cameraRef.current.y += (player.pos.y - cameraRef.current.y) * 0.1;

    // 2. Enemy Spawning
    const difficultyMultiplier = 1 + (timeAliveRef.current / 60);
    const spawnRate = Math.max(0.1, 2 - (timeAliveRef.current / 100));
    
    const maxEnemies = BASE_MAX_ENEMIES + player.level;

    // Boss Spawning Logic (Every 5 levels)
    if (player.level % 5 === 0 && !bossSpawnedForLevelRef.current.includes(player.level)) {
        enemiesRef.current.push(spawnBoss(player.pos, player.level));
        bossSpawnedForLevelRef.current.push(player.level);
    }

    // Normal spawning (only if under cap)
    if (enemiesRef.current.length < maxEnemies) {
        if (Math.random() < (dt / spawnRate)) {
          enemiesRef.current.push(spawnEnemy(player.pos, difficultyMultiplier, player.level));
        }
    }

    // 3. Enemy Logic
    enemiesRef.current.forEach(enemy => {
      if (enemy.spawnTimer > 0) {
        enemy.spawnTimer -= dt * 1000;
        return;
      }

      const angle = Math.atan2(player.pos.y - enemy.pos.y, player.pos.x - enemy.pos.x);
      enemy.vel.x = Math.cos(angle) * enemy.speed;
      enemy.vel.y = Math.sin(angle) * enemy.speed;
      enemy.pos.x += enemy.vel.x;
      enemy.pos.y += enemy.vel.y;
      enemy.rotation = angle;

      // Enemy Shooting Logic (Boss only currently)
      if (enemy.canShoot && time > enemy.lastFired + 2000) { // Shoot every 2s
          projectilesRef.current.push({
             id: uuid(),
             pos: { ...enemy.pos, z: 10 },
             vel: { x: Math.cos(angle) * 8, y: Math.sin(angle) * 8, z: 0 },
             radius: 8,
             color: COLORS.enemyProjectile,
             rotation: angle,
             damage: enemy.damage,
             duration: 3000,
             spawnTime: time,
             isEnemy: true
          });
          enemy.lastFired = time;
          playShootSfx(); 
      }

      // Collision with Player (Body slam)
      if (checkCollision(player, enemy) && player.invulnerableUntil < time) {
        player.hp -= enemy.damage;
        player.invulnerableUntil = time + 500; 
        
        const kick = 15;
        player.pos.x += Math.cos(angle) * kick;
        player.pos.y += Math.sin(angle) * kick;

        createExplosion(player.pos, COLORS.player, 5);

        if (player.hp <= 0) {
            setGameState(GameState.GAME_OVER);
            onGameOver({
                score: scoreRef.current,
                timeAlive: timeAliveRef.current,
                level: player.level
            });
        }
      }
    });

    // 4. Combat / Shooting (Player)
    if (time > player.lastFired + (1000 / player.stats.fireRate)) {
      const target = getClosestEnemy(player, enemiesRef.current);
      if (target || enemiesRef.current.some(e => e.spawnTimer <= 0)) { 
         let shootAngle = player.rotation;
         if (target) {
             shootAngle = Math.atan2(target.pos.y - player.pos.y, target.pos.x - player.pos.x);
         } else {
             const e = enemiesRef.current.find(e => e.spawnTimer <= 0);
             if (e) shootAngle = Math.atan2(e.pos.y - player.pos.y, e.pos.x - player.pos.x);
         }

         playShootSfx();

         const count = Math.floor(player.stats.projectileCount);
         const spread = 0.2;
         const startAngle = shootAngle - (spread * (count - 1)) / 2;

         for (let i = 0; i < count; i++) {
            const angle = startAngle + i * spread;
            projectilesRef.current.push({
                id: uuid(),
                pos: { ...player.pos, z: 5 },
                vel: { x: Math.cos(angle) * 15, y: Math.sin(angle) * 15, z: 0 },
                radius: 3,
                color: COLORS.projectile,
                rotation: angle,
                damage: player.stats.damage,
                duration: 2000, 
                spawnTime: time,
                isEnemy: false
            });
         }
         player.lastFired = time;
      }
    }

    // 5. Projectiles Logic
    for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
      const p = projectilesRef.current[i];
      p.pos.x += p.vel.x;
      p.pos.y += p.vel.y;
      
      if (time > p.spawnTime + p.duration) {
        projectilesRef.current.splice(i, 1);
        continue;
      }

      if (p.isEnemy) {
          // Check Collision with Player
          if (checkCollision(p, player)) {
              if (player.invulnerableUntil < time) {
                  player.hp -= p.damage;
                  player.invulnerableUntil = time + 500;
                  createExplosion(player.pos, COLORS.player, 5);
                  projectilesRef.current.splice(i, 1);
                  
                  if (player.hp <= 0) {
                    setGameState(GameState.GAME_OVER);
                    onGameOver({
                        score: scoreRef.current,
                        timeAlive: timeAliveRef.current,
                        level: player.level
                    });
                  }
              }
              continue;
          }
      } else {
          // Check collision with enemies (Player bullets)
          for (let j = enemiesRef.current.length - 1; j >= 0; j--) {
            const enemy = enemiesRef.current[j];
            if (enemy.spawnTimer > 0) continue;
    
            if (checkCollision(p, enemy)) {
              enemy.hp -= p.damage;
              createExplosion(p.pos, p.color, 3);
              projectilesRef.current.splice(i, 1); // Remove bullet
    
              if (enemy.hp <= 0) {
                playExplosionSfx();
                createExplosion(enemy.pos, enemy.color, 8);
                
                // Big boom for boss
                if (enemy.type === 'boss') {
                    createExplosion(enemy.pos, '#ffffff', 30);
                }
                
                gemsRef.current.push({
                    id: uuid(),
                    pos: { ...enemy.pos },
                    vel: { x: 0, y: 0, z: 0 },
                    radius: 5,
                    color: COLORS.gem,
                    rotation: 0,
                    value: enemy.xpValue,
                    type: 'xp'
                });
    
                if (Math.random() < 0.1) {
                    gemsRef.current.push({
                        id: uuid(),
                        pos: { ...enemy.pos, x: enemy.pos.x + 10 },
                        vel: { x: 0, y: 0, z: 0 },
                        radius: 6,
                        color: COLORS.healthPack,
                        rotation: 0,
                        value: 25,
                        type: 'health'
                    });
                }
    
                enemiesRef.current.splice(j, 1);
                scoreRef.current += enemy.xpValue;
              }
              break;
            }
          }
      }
    }

    // 6. Gems Logic
    for (let i = gemsRef.current.length - 1; i >= 0; i--) {
        const gem = gemsRef.current[i];
        const distToPlayer = Math.sqrt(Math.pow(player.pos.x - gem.pos.x, 2) + Math.pow(player.pos.y - gem.pos.y, 2));
        
        if (distToPlayer < player.stats.pickupRange) {
            gem.pos.x += (player.pos.x - gem.pos.x) * 0.1;
            gem.pos.y += (player.pos.y - gem.pos.y) * 0.1;
        }

        if (distToPlayer < player.radius + gem.radius) {
            if (gem.type === 'health') {
                const healAmount = player.maxHp * (gem.value / 100);
                player.hp = Math.min(player.maxHp, player.hp + healAmount);
            } else {
                player.xp += gem.value;
            }
            
            gemsRef.current.splice(i, 1);
            
            if (gem.type === 'xp' && player.xp >= player.nextLevelXp && player.level < 100) {
                player.level++;
                player.xp -= player.nextLevelXp;
                player.nextLevelXp = Math.floor(player.nextLevelXp * 1.2);
                onLevelUp({ ...player }); 
                pointerRef.current.isDown = false;
                return; 
            }
        }
    }

    // 7. Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.pos.x += p.vel.x;
        p.pos.y += p.vel.y;
        p.life -= dt * 1000;
        if (p.life <= 0) particlesRef.current.splice(i, 1);
    }

    // --- RENDER LOGIC ---
    
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    const cx = width / 2;
    const cy = height / 2;
    const offsetX = cx - cameraRef.current.x;
    const offsetY = cy - cameraRef.current.y;

    drawGrid(ctx, offsetX, offsetY, width, height);

    gemsRef.current.forEach(gem => {
        if (gem.type === 'health') {
            drawHealthPack(ctx, gem.pos.x + offsetX, gem.pos.y + offsetY, gem.radius, gem.color, time);
        } else {
            drawIsoShape(ctx, gem.pos.x + offsetX, gem.pos.y + offsetY, gem.radius, gem.color, time * 0.005, 4);
        }
    });

    particlesRef.current.forEach(p => {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.pos.x + offsetX, p.pos.y + offsetY, p.size, 0, TWO_PI);
        ctx.fill();
        ctx.globalAlpha = 1;
    });

    // Draw Enemies
    // Sort enemies by Z (y position) for cheap depth sorting, though not strictly necessary for this top-down view
    enemiesRef.current.forEach(enemy => {
        if (enemy.spawnTimer > 0) {
            // Use simplified max timer for visual calculation
            const ratio = Math.max(0, 1 - (enemy.spawnTimer / 3000));
            
            ctx.save();
            ctx.translate(enemy.pos.x + offsetX, enemy.pos.y + offsetY);
            
            ctx.strokeStyle = enemy.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 1 - ratio;
            ctx.beginPath();
            ctx.arc(0, 0, enemy.radius * 3 * ratio, 0, TWO_PI);
            ctx.stroke();
            
            ctx.globalAlpha = ratio;
            ctx.scale(ratio, ratio);
            draw3DShip(ctx, 0, 0, enemy.radius, enemy.rotation, enemy.color, 0, enemy.type);
            
            ctx.restore();
        } else {
            const zOffset = Math.sin(time * 0.005 + enemy.id.charCodeAt(0)) * 5;
            draw3DShip(ctx, enemy.pos.x + offsetX, enemy.pos.y + offsetY, enemy.radius, enemy.rotation, enemy.color, zOffset, enemy.type);
            
            if (enemy.hp < enemy.maxHp) {
                const hpPct = enemy.hp / enemy.maxHp;
                ctx.fillStyle = 'red';
                const barW = enemy.radius * 2;
                ctx.fillRect(enemy.pos.x + offsetX - barW/2, enemy.pos.y + offsetY - enemy.radius - 10, barW, 4);
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(enemy.pos.x + offsetX - barW/2, enemy.pos.y + offsetY - enemy.radius - 10, barW * hpPct, 4);
            }
        }
    });

    projectilesRef.current.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.pos.x + offsetX, p.pos.y + offsetY, p.radius, 0, TWO_PI);
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    if (player.hp > 0) {
        if (player.invulnerableUntil > time && Math.floor(time / 50) % 2 === 0) {
        } else {
            const tilt = (dx < 0) ? -0.3 : (dx > 0) ? 0.3 : 0;
            draw3DShip(ctx, player.pos.x + offsetX, player.pos.y + offsetY, player.radius, player.rotation, player.color, 0, 'player', tilt);
        }
    }

    ctx.restore();

    if (pointerRef.current.isDown) {
        const { startX, startY, currentX, currentY } = pointerRef.current;
        const maxRadius = 50;
        let jDx = currentX - startX;
        let jDy = currentY - startY;
        const dist = Math.sqrt(jDx*jDx + jDy*jDy);
        
        if (dist > maxRadius) {
            const angle = Math.atan2(jDy, jDx);
            jDx = Math.cos(angle) * maxRadius;
            jDy = Math.sin(angle) * maxRadius;
        }
        
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 4;
        ctx.arc(startX, startY, maxRadius, 0, TWO_PI);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
        ctx.arc(startX + jDx, startY + jDy, 25, 0, TWO_PI);
        ctx.fill();
    }

    if (Math.floor(timeAliveRef.current * 10) % 5 === 0) {
        const event = new CustomEvent('game-update', { detail: {
            hp: player.hp,
            maxHp: player.maxHp,
            xp: player.xp,
            nextLevelXp: player.nextLevelXp,
            level: player.level,
            score: Math.floor(scoreRef.current),
            time: timeAliveRef.current
        }});
        window.dispatchEvent(event);
    }

    frameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, setGameState, onLevelUp, onGameOver, onTogglePause]);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
        cancelAnimationFrame(frameRef.current);
        lastTimeRef.current = performance.now();
        frameRef.current = requestAnimationFrame(gameLoop);
    } else {
        cancelAnimationFrame(frameRef.current);
    }
    return () => cancelAnimationFrame(frameRef.current);
  }, [gameState, gameLoop]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const createExplosion = (pos: Vector3, color: string, count: number) => {
    for(let i=0; i<count; i++) {
        const angle = Math.random() * TWO_PI;
        const speed = Math.random() * 5;
        particlesRef.current.push({
            id: uuid(),
            pos: { ...pos },
            vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed, z: 0 },
            radius: 0,
            color: color,
            rotation: 0,
            life: 500 + Math.random() * 500,
            maxLife: 1000,
            size: Math.random() * 3 + 1
        });
    }
  };

  return <canvas ref={canvasRef} className="w-full h-full block touch-none" />;
};

function drawGrid(ctx: CanvasRenderingContext2D, ox: number, oy: number, w: number, h: number) {
    ctx.strokeStyle = 'rgba(20, 50, 80, 0.5)';
    ctx.lineWidth = 1;
    const gridSize = 100;
    
    const startX = Math.floor(-ox / gridSize) * gridSize;
    const startY = Math.floor(-oy / gridSize) * gridSize;

    ctx.beginPath();
    for (let x = startX; x < startX + w + gridSize * 2; x += gridSize) {
        ctx.moveTo(x + ox, 0);
        ctx.lineTo(x + ox, h);
    }
    for (let y = startY; y < startY + h + gridSize * 2; y += gridSize) {
        ctx.moveTo(0, y + oy);
        ctx.lineTo(w, y + oy);
    }
    ctx.stroke();
}

function draw3DShip(
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    radius: number, 
    rotation: number, 
    color: string, 
    zOffset: number = 0,
    type: string,
    tilt: number = 0
) {
    ctx.save();
    ctx.translate(x, y - zOffset);
    ctx.rotate(rotation);

    const depth = type === 'boss' ? 20 : 10; 
    
    ctx.fillStyle = shadeColor(color, -50);
    drawShipPath(ctx, radius, type);
    ctx.fill();
    
    ctx.translate(0, -depth / 2); 
    // Tilt applied to top layers
    if (type === 'player') ctx.rotate(tilt);

    ctx.fillStyle = shadeColor(color, -20);
    drawShipPath(ctx, radius, type);
    ctx.fill();

    ctx.translate(0, -depth / 2); 
    ctx.fillStyle = color;
    drawShipPath(ctx, radius, type);
    ctx.fill();
    
    // Cockpit / Detail
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    if (type === 'boss') {
        ctx.arc(0, 0, radius * 0.4, 0, TWO_PI); // Central eye
    } else {
        ctx.arc(0, 5, radius * 0.3, 0, TWO_PI);
    }
    ctx.fill();

    // Engine glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (type === 'player') ctx.rect(-radius/2, radius - 5, radius, 4);
    else ctx.rect(-radius/2, radius - 5, radius, 2);
    ctx.fill();

    ctx.restore();
}

function drawShipPath(ctx: CanvasRenderingContext2D, r: number, type: string) {
    ctx.beginPath();
    if (type === 'heavy' || type === 'tank') {
        // Hexagon / Blocky
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
    } else if (type === 'boss') {
        // Spiky Star shape
        for (let i = 0; i < 16; i++) {
            const angle = (TWO_PI / 16) * i;
            const dist = i % 2 === 0 ? r : r * 0.6;
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
    } else if (type === 'speeder') {
        // Needle
        ctx.moveTo(0, -r * 2);
        ctx.lineTo(r * 0.5, r);
        ctx.lineTo(-r * 0.5, r);
    } else if (type === 'swarmer') {
        // Diamond
        ctx.moveTo(0, -r);
        ctx.lineTo(r, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r, 0);
    } else if (type === 'orbit') {
        // Crescent
        ctx.arc(0, 0, r, 0, TWO_PI);
    } else {
        // Standard Triangle (Scout, Fighter, Player)
        ctx.moveTo(0, -r * 1.5); 
        ctx.lineTo(r, r); 
        ctx.lineTo(0, r * 0.5); 
        ctx.lineTo(-r, r); 
    }
    ctx.closePath();
}

function drawIsoShape(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, rot: number, sides: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
        const angle = (TWO_PI / sides) * i;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawHealthPack(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, time: number) {
    ctx.save();
    ctx.translate(x, y);
    const bob = Math.sin(time * 0.005) * 3;
    ctx.translate(0, bob);
    ctx.fillStyle = color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    const w = r * 0.6;
    const h = r * 1.4;
    ctx.beginPath();
    ctx.rect(-w/2, -h/2, w, h);
    ctx.rect(-h/2, -w/2, h, w);
    ctx.fill();
    ctx.restore();
}

function shadeColor(color: string, percent: number) {
    let R = parseInt(color.substring(1,3),16);
    let G = parseInt(color.substring(3,5),16);
    let B = parseInt(color.substring(5,7),16);

    R = Math.floor(R * (100 + percent) / 100);
    G = Math.floor(G * (100 + percent) / 100);
    B = Math.floor(B * (100 + percent) / 100);

    R = (R<255)?R:255;  
    G = (G<255)?G:255;  
    B = (B<255)?B:255;  

    R = (R>0)?R:0;  
    G = (G>0)?G:0;  
    B = (B>0)?B:0;

    const RR = ((R.toString(16).length===1)?"0"+R.toString(16):R.toString(16));
    const GG = ((G.toString(16).length===1)?"0"+G.toString(16):G.toString(16));
    const BB = ((B.toString(16).length===1)?"0"+B.toString(16):B.toString(16));

    return "#"+RR+GG+BB;
}

export default GameCanvas;