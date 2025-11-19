import React, { useRef, useEffect, useState } from 'react';
import { GameState, Entity, EntityType, GameStats, BossPart } from '../types';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_SPEED, PLAYER_SIZE, 
  FIRE_RATE, ENEMY_SPEED_BASE, BOSS_HP, BOSS_SPAWN_SCORE_BASE,
  NEON_CYAN, NEON_MAGENTA, NEON_GREEN, NEON_ORANGE, NEON_WHITE, NEON_RED, NEON_YELLOW, NEON_PURPLE, NEON_GOLD, NEON_BLUE_WIRE,
  KEYS,
  PLAYER_HITBOX,
  PLAYER_INVULNERABILITY,
  SPECIAL_CHARGE_FRAMES,
  SPECIAL_DURATION_FRAMES,
  MAX_STAGES,
  STAGE_3_BEAM_INTERVAL,
  STAGE_3_BEAM_DURATION,
  SHIELD_DURATION
} from '../constants';
import { soundEngine } from './SoundEngine';
import { Zap } from 'lucide-react';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setFinalScore: (score: number) => void;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
  color: string;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState, setFinalScore }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Game State
  const playerRef = useRef<Entity>({
    id: 0, type: EntityType.PLAYER, 
    pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 150 }, 
    vel: { x: 0, y: 0 },
    width: PLAYER_SIZE, height: PLAYER_SIZE, 
    color: NEON_BLUE_WIRE,
    active: true, hp: 100, maxHp: 100, rotation: 0,
    invulnerableTimer: 0,
    specialGauge: 0,
    specialActive: false,
    specialTimer: 0,
    shieldTimer: 0
  });

  // React state for UI updates (Gauge)
  const [gaugeValue, setGaugeValue] = useState(0);

  const entitiesRef = useRef<Entity[]>([]);
  const particlesRef = useRef<Entity[]>([]);
  // Initialize nextBossScoreThreshold
  const statsRef = useRef<GameStats>({ 
      score: 0, 
      wave: 1, 
      lives: 3, 
      bossActive: false, 
      combo: 0,
      nextBossScoreThreshold: BOSS_SPAWN_SCORE_BASE 
  });
  const inputRef = useRef<{ [key: string]: boolean }>({});
  const frameCountRef = useRef(0);
  const screenShakeRef = useRef(0);
  const stageTransitionTimerRef = useRef(0); // >0 means transitioning
  const powerupConfigRef = useRef({ nextSpawnFrame: 0, spawned: false });
  
  // Touch State
  const touchRef = useRef<{x: number, y: number} | null>(null);
  const manualSpecialTriggerRef = useRef(false);

  // Background State
  const starsRef = useRef<Star[]>([]);
  const nebulaRef = useRef<{x: number, y: number, r: number, color: string}[]>([]);

  // Init Stars
  useEffect(() => {
    const stars: Star[] = [];
    for(let i=0; i<150; i++) {
        const depth = Math.random(); // 0 to 1
        stars.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: Math.random() * 2 + (depth * 2),
            speed: 0.5 + (depth * 3), // Parallax speed
            brightness: Math.random(),
            // Use Blue/Red theme for stars
            color: Math.random() > 0.8 ? NEON_BLUE_WIRE : (Math.random() > 0.9 ? NEON_RED : NEON_WHITE)
        });
    }
    starsRef.current = stars;

    // Init Nebula
    const nebula = [];
    for(let i=0; i<5; i++) {
        nebula.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            r: 200 + Math.random() * 300,
            color: i % 2 === 0 ? '#100020' : '#000020' // Deep red/blue tones
        });
    }
    nebulaRef.current = nebula;
  }, []);

  // Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      inputRef.current[e.key] = true;
      if(['ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      inputRef.current[e.key] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Audio Init
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      soundEngine.init();
      if (statsRef.current.bossActive) {
          soundEngine.startBossBGM();
      } else {
          soundEngine.startBGM();
      }
      soundEngine.playStart();
    } else {
      soundEngine.stopBGM();
      soundEngine.stopBeam();
    }
  }, [gameState]);

  // Reset Game
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      playerRef.current = {
        id: 0, type: EntityType.PLAYER, 
        pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 150 }, 
        vel: { x: 0, y: 0 },
        width: PLAYER_SIZE, height: PLAYER_SIZE, color: NEON_BLUE_WIRE,
        active: true, hp: 100, maxHp: 100, rotation: 0,
        invulnerableTimer: PLAYER_INVULNERABILITY,
        specialGauge: 0, specialActive: false, specialTimer: 0,
        shieldTimer: 0
      };
      entitiesRef.current = [];
      particlesRef.current = [];
      // Reset threshold logic
      statsRef.current = { 
          score: 0, 
          wave: 1, 
          lives: 3, 
          bossActive: false, 
          combo: 0,
          nextBossScoreThreshold: BOSS_SPAWN_SCORE_BASE 
      };
      frameCountRef.current = 0;
      screenShakeRef.current = 0;
      stageTransitionTimerRef.current = 180; // Start with a "STAGE 1 START"
      
      // Powerup logic: random spawn between 10s (600 frames) and 20s (1200 frames)
      powerupConfigRef.current = {
          spawned: false,
          nextSpawnFrame: 600 + Math.random() * 600
      };
      setGaugeValue(0);
    }
  }, [gameState]);

  // --- Touch Handlers for Mobile ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (gameState !== GameState.PLAYING) return;
    const touch = e.touches[0];
    touchRef.current = { x: touch.clientX, y: touch.clientY };
    // Auto-fire on touch
    inputRef.current[' '] = true; 
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (gameState !== GameState.PLAYING || !touchRef.current) return;
    const touch = e.touches[0];
    
    // Calculate delta
    const dx = touch.clientX - touchRef.current.x;
    const dy = touch.clientY - touchRef.current.y;
    
    // Direct Position Update (1:1 movement)
    const p = playerRef.current;
    p.pos.x += dx;
    p.pos.y += dy;
    
    // Visual rotation based on drag
    p.rotation = Math.max(-0.4, Math.min(0.4, dx * 0.05));

    // Update ref for next frame
    touchRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = () => {
    touchRef.current = null;
    inputRef.current[' '] = false; // Stop auto-fire
  };

  const createExplosion = (x: number, y: number, color: string, scale: number) => {
    soundEngine.playExplosion();
    const particleCount = 10 * scale;
    
    // Standard dots
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      particlesRef.current.push({
        id: Math.random(),
        type: EntityType.PARTICLE,
        pos: { x, y },
        vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        width: Math.random() * 4 + 2,
        height: 0,
        color: i % 2 === 0 ? color : NEON_WHITE,
        active: true, hp: 0, maxHp: 0, rotation: 0,
        life: 1.0,
        decay: 0.03 + Math.random() * 0.04
      });
    }

    // "Sparks" - Lines that move fast (Flashy effect)
    for (let i = 0; i < particleCount / 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 12 + 5;
      particlesRef.current.push({
        id: Math.random(),
        type: EntityType.PARTICLE, // We'll render these differently based on speed
        pos: { x, y },
        vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        width: 2, // Line width
        height: 0,
        color: Math.random() > 0.5 ? NEON_YELLOW : NEON_WHITE,
        active: true, hp: 0, maxHp: 0, rotation: angle,
        life: 0.6,
        decay: 0.06
      });
    }

    // Shockwave
    particlesRef.current.push({
        id: Math.random(),
        type: EntityType.SHOCKWAVE,
        pos: { x, y },
        vel: { x: 0, y: 0 },
        width: 10,
        height: 0,
        color: color,
        active: true, hp: 0, maxHp: 0, rotation: 0,
        life: 1.0,
        decay: 0.05,
        scale: 1
    });
  };

  const createBossExplosion = (x: number, y: number) => {
      soundEngine.playMassiveExplosion();
      screenShakeRef.current = 60;
      
      // Multiple Shockwaves
      for(let i=0; i<5; i++) {
          setTimeout(() => {
            particlesRef.current.push({
                id: Math.random(), type: EntityType.SHOCKWAVE,
                pos: { x, y }, vel: { x: 0, y: 0 },
                width: 10, height: 0, color: [NEON_BLUE_WIRE, NEON_RED, NEON_YELLOW][i%3],
                active: true, hp: 0, maxHp: 0, rotation: 0,
                life: 1.5, decay: 0.03
            });
          }, i * 200);
      }

      // Massive debris field (Rainbow)
      const colors = [NEON_RED, NEON_ORANGE, NEON_YELLOW, NEON_GREEN, NEON_CYAN, NEON_BLUE_WIRE, NEON_PURPLE, NEON_MAGENTA];
      for (let i = 0; i < 200; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 15 + 2;
          const color = colors[Math.floor(Math.random() * colors.length)];
          particlesRef.current.push({
            id: Math.random(),
            type: EntityType.PARTICLE,
            pos: { x, y },
            vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
            width: Math.random() * 6 + 2,
            height: 0,
            color: color,
            active: true, hp: 0, maxHp: 0, rotation: 0,
            life: 2.0,
            decay: 0.01 + Math.random() * 0.02
          });
      }
  };

  const update = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (gameState !== GameState.PLAYING) return;
    frameCountRef.current++;

    // --- Definitions ---
    const handleBossDeath = (boss: Entity) => {
        boss.active = false;
        statsRef.current.score += 50000;
        createBossExplosion(boss.pos.x, boss.pos.y); // New Massive Explosion
        statsRef.current.bossActive = false;
        statsRef.current.wave++;
        
        // Set new threshold for next boss: Current Score + Base Requirement
        // This ensures the player must play through the stage to spawn the next boss
        statsRef.current.nextBossScoreThreshold = statsRef.current.score + BOSS_SPAWN_SCORE_BASE;

        soundEngine.stopBGM(); // Stop tense music

        if (statsRef.current.wave > MAX_STAGES) {
            setFinalScore(statsRef.current.score);
            setGameState(GameState.GAME_CLEARED);
        } else {
            // Start Stage Transition
            stageTransitionTimerRef.current = 240; // 4 seconds pause
            playerRef.current.hp = playerRef.current.maxHp; // Heal
            soundEngine.startBGM(); // Back to normal music
            entitiesRef.current = entitiesRef.current.filter(e => e.type === EntityType.PLAYER || e.type === EntityType.POWERUP_SHIELD); // Clear enemies but keep powerups
            
            // Reset Powerup Logic for new stage
            // Wait until transition ends (roughly frameCount + 240) + random(600-1200)
            powerupConfigRef.current = {
                spawned: false,
                nextSpawnFrame: frameCountRef.current + 240 + 600 + Math.random() * 600
            };
        }
    };

    // Screen Shake Decay
    if (screenShakeRef.current > 0) screenShakeRef.current *= 0.9;
    if (screenShakeRef.current < 0.5) screenShakeRef.current = 0;

    // Transition Handling
    if (stageTransitionTimerRef.current > 0) {
        stageTransitionTimerRef.current--;
        if (stageTransitionTimerRef.current <= 0) {
            // Transition ended
        }
    }

    // --- Update Background ---
    starsRef.current.forEach(star => {
        star.y += star.speed + (statsRef.current.bossActive ? 12 : 0);
        if (star.y > height) {
            star.y = 0;
            star.x = Math.random() * width;
        }
    });
    nebulaRef.current.forEach(n => {
        n.y += 0.5;
        if (n.y - n.r > height) n.y = -n.r;
    });

    // --- Player Movement & Logic ---
    const p = playerRef.current;
    if (p.invulnerableTimer && p.invulnerableTimer > 0) {
        p.invulnerableTimer--;
    }
    if (p.shieldTimer && p.shieldTimer > 0) {
        p.shieldTimer--;
    }

    if (p.active) {
        // Charge Special Gauge
        if (!p.specialActive && p.specialGauge! < SPECIAL_CHARGE_FRAMES) {
            p.specialGauge! += 1;
            // Sync UI occasionally
            if (frameCountRef.current % 10 === 0) {
                setGaugeValue(Math.min(100, (p.specialGauge! / SPECIAL_CHARGE_FRAMES) * 100));
            }
        }

        // Activate Special
        if (!p.specialActive && p.specialGauge! >= SPECIAL_CHARGE_FRAMES) {
            const isSpecialKeyPressed = KEYS.SPECIAL.some(k => inputRef.current[k]);
            const isShootPressed = KEYS.SHOOT.some(k => inputRef.current[k]);
            const isManualTrigger = manualSpecialTriggerRef.current;

            if ((isSpecialKeyPressed && isShootPressed) || isManualTrigger) {
                p.specialActive = true;
                p.specialTimer = SPECIAL_DURATION_FRAMES;
                p.specialGauge = 0;
                setGaugeValue(0);
                soundEngine.startBeam();
                screenShakeRef.current = 5;
                manualSpecialTriggerRef.current = false;
            }
        }

        // Special Logic
        if (p.specialActive) {
            p.specialTimer!--;
            screenShakeRef.current = Math.max(screenShakeRef.current, 2);
            if (p.specialTimer! <= 0) {
                p.specialActive = false;
                soundEngine.stopBeam();
            }
        }

        // Movement (Keyboard) - Only apply if not touching (Touch handles its own movement)
        if (!touchRef.current) {
            let dx = 0;
            let dy = 0;
            if (KEYS.LEFT.some(k => inputRef.current[k])) dx = -PLAYER_SPEED;
            if (KEYS.RIGHT.some(k => inputRef.current[k])) dx = PLAYER_SPEED;
            if (KEYS.UP.some(k => inputRef.current[k])) dy = -PLAYER_SPEED;
            if (KEYS.DOWN.some(k => inputRef.current[k])) dy = PLAYER_SPEED;

            p.pos.x += dx;
            p.pos.y += dy;

             const targetRot = dx * 0.04;
            p.rotation += (targetRot - p.rotation) * 0.15;
        } else {
            // Smoothly return rotation to 0 if touching stops moving but still touching
             // Or if we want it to feel like 'drag to tilt' we keep existing logic
        }
        
        // If NO input (keyboard or touch), auto-level
        if (!touchRef.current && !KEYS.LEFT.some(k => inputRef.current[k]) && !KEYS.RIGHT.some(k => inputRef.current[k])) {
             p.rotation *= 0.8;
        }

        // Clamp Position
        p.pos.x = Math.max(p.width, Math.min(width - p.width, p.pos.x));
        p.pos.y = Math.max(p.height, Math.min(height - p.height, p.pos.y));

        // Shooting (3-Way Spread)
        if (KEYS.SHOOT.some(k => inputRef.current[k]) && !p.specialActive && frameCountRef.current % FIRE_RATE === 0) {
            soundEngine.playShoot();
            
            const bulletSpeed = 25;
            // 0 degrees (Center), -30 degrees (Left), +30 degrees (Right)
            const angles = [0, -30 * (Math.PI / 180), 30 * (Math.PI / 180)]; 

            angles.forEach(angle => {
                entitiesRef.current.push({
                    id: Math.random(),
                    type: EntityType.BULLET_PLAYER,
                    pos: { x: p.pos.x, y: p.pos.y - 30 },
                    vel: { 
                        x: Math.sin(angle) * bulletSpeed, 
                        y: -Math.cos(angle) * bulletSpeed 
                    },
                    width: 8, height: 40, color: NEON_CYAN, // Updated to NEON_CYAN
                    active: true, hp: 1, maxHp: 1, 
                    rotation: angle
                });
            });
        }
    }

    // --- Spawning ---
    
    // Powerup Spawn Logic
    if (!powerupConfigRef.current.spawned && frameCountRef.current >= powerupConfigRef.current.nextSpawnFrame) {
        powerupConfigRef.current.spawned = true;
        entitiesRef.current.push({
            id: Math.random(),
            type: EntityType.POWERUP_SHIELD,
            pos: { x: Math.random() * (width - 100) + 50, y: -50 },
            vel: { x: 0, y: 1.5 }, // Slow drop
            width: 30, height: 30, color: NEON_YELLOW,
            active: true, hp: 1, maxHp: 1, rotation: 0
        });
    }

    // Only spawn enemies if no boss and not transitioning
    if (!statsRef.current.bossActive && stageTransitionTimerRef.current <= 0) {
      const spawnRate = Math.max(30, 70 - statsRef.current.wave * 5);
      if (frameCountRef.current % spawnRate === 0) {
        const rand = Math.random();
        let type = EntityType.ENEMY_DRONE;
        let color = NEON_ORANGE;
        let hp = 30 + (statsRef.current.wave * 10);

        if (rand > 0.8) {
            type = EntityType.ENEMY_SHOOTER;
            color = NEON_MAGENTA;
            hp = 100 + (statsRef.current.wave * 20);
        } else if (rand > 0.5) {
            type = EntityType.ENEMY_CHASER;
            color = NEON_GREEN;
            hp = 40 + (statsRef.current.wave * 10);
        }

        const x = Math.random() * (width - 100) + 50;
        
        // Note: SoundEngine updates for enemy fall sound would go here
        // if requested in previous turn, but keeping minimal as requested.
        
        entitiesRef.current.push({
          id: Math.random(),
          type,
          pos: { x, y: -60 },
          vel: { x: 0, y: ENEMY_SPEED_BASE + (statsRef.current.wave * 0.5) },
          width: 40, height: 40, color,
          active: true, hp: hp, maxHp: hp,
          rotation: 0,
          initialX: x,
          timer: Math.random() * 100
        });
      }

      // Spawn Boss logic using the calculated threshold
      if (statsRef.current.score > statsRef.current.nextBossScoreThreshold) {
        statsRef.current.bossActive = true;
        soundEngine.startBossBGM();
        screenShakeRef.current = 30;
        
        const wave = statsRef.current.wave;
        const bossParts: BossPart[] = [];
        
        let bossColor = NEON_RED;
        let bossHP = BOSS_HP * (1 + wave * 0.5);
        let bossWidth = 250;

        // Boss Setup Based on Wave
        if (wave === 1) {
            // Stage 1: Geometric Mandala Snake Boss
            bossColor = NEON_BLUE_WIRE;
            const numTentacles = 12; // Increased for mandala look
            for(let i=0; i<numTentacles; i++) {
                bossParts.push({
                    id: i, relX: 0, relY: 0,
                    hp: 400, maxHp: 400, active: true,
                    angleOffset: (Math.PI * 2 / numTentacles) * i,
                    type: i % 2 === 0 ? 'RED_SNAKE' : 'GREEN_SNAKE' // Alternating types
                });
            }
        } else if (wave === 2) {
            // Stage 2: Diamond Mandala Boss
            bossColor = NEON_CYAN; // Blue core
            bossHP *= 1.2;
            // Funnels (Diamond shaped)
            const numFunnels = 8;
            for(let i=0; i<numFunnels; i++) {
                bossParts.push({
                    id: i, relX: 0, relY: 0,
                    hp: 300, maxHp: 300, active: true,
                    angleOffset: (Math.PI * 2 / numFunnels) * i,
                    type: 'DIAMOND_FUNNEL',
                    shootTimer: Math.random() * 100
                });
            }
        } else if (wave === 3) {
            // Stage 3: Geometric Laser Mandala
            bossColor = NEON_BLUE_WIRE;
            bossHP *= 1.5;
            bossWidth = 300;
            const numEmitters = 8;
            for(let i=0; i<numEmitters; i++) {
                bossParts.push({
                    id: i, relX: 0, relY: 0,
                    hp: 400, maxHp: 400, active: true,
                    angleOffset: (Math.PI * 2 / numEmitters) * i,
                    type: i % 2 === 0 ? 'RED_LASER' : 'GREEN_LASER'
                });
            }
        }

        entitiesRef.current.push({
          id: 9999,
          type: EntityType.BOSS,
          pos: { x: width / 2, y: -400 },
          vel: { x: 0, y: 2 },
          width: bossWidth, height: bossWidth, 
          color: bossColor,
          active: true, 
          hp: bossHP, maxHp: bossHP,
          rotation: 0,
          phase: 0, timer: 0,
          damageFlashTimer: 0,
          parts: bossParts.length > 0 ? bossParts : undefined,
          shieldActive: bossParts.length > 0 // Shield active if parts exist
        });
      }
    }

    // --- Entity Updates ---
    entitiesRef.current.forEach(e => {
        e.timer = (e.timer || 0) + 1;
        if (e.damageFlashTimer && e.damageFlashTimer > 0) e.damageFlashTimer--;

        if (e.type === EntityType.BOSS) {
            const wave = statsRef.current.wave;
            
            // Entrance
            if (e.pos.y < 200) e.pos.y += 1.5; 
            else {
                // Floating pattern
                e.pos.x += Math.sin(frameCountRef.current * 0.015) * 2;
                e.pos.y += Math.cos(frameCountRef.current * 0.02) * 1.5;
            }
            e.rotation += 0.005;

            // Boss Parts Logic
            if (e.parts) {
                let activeParts = 0;
                e.parts.forEach(part => {
                    if (!part.active) return;
                    activeParts++;
                    
                    // STAGE 1: Tentacles Swirl (Geometric Snake)
                    if (wave === 1) {
                        const baseR = 130;
                        const sway = Math.sin(frameCountRef.current * 0.04 + part.angleOffset * 2) * 40;
                        const spin = frameCountRef.current * 0.01;
                        part.relX = Math.cos(part.angleOffset + spin) * (baseR + sway);
                        part.relY = Math.sin(part.angleOffset + spin) * (baseR + sway);
                    }
                    // STAGE 2: Diamond Funnels Orbit and Shoot Smoke
                    else if (wave === 2) {
                        const orbitR = 180;
                        const orbitSpeed = frameCountRef.current * 0.015;
                        part.relX = Math.cos(part.angleOffset + orbitSpeed) * orbitR;
                        part.relY = Math.sin(part.angleOffset + orbitSpeed) * orbitR;

                        // Smoke Trail
                        if (frameCountRef.current % 4 === 0) {
                             particlesRef.current.push({
                                id: Math.random(),
                                type: EntityType.PARTICLE,
                                pos: { x: e.pos.x + part.relX, y: e.pos.y + part.relY },
                                vel: { x: (Math.random()-0.5), y: (Math.random()-0.5) + 1 }, // drift down/random
                                width: Math.random() * 4 + 2,
                                height: 0,
                                color: '#ffffff', // White smoke
                                active: true, hp: 0, maxHp: 0, rotation: Math.random()*Math.PI,
                                life: 0.8, decay: 0.04
                             });
                        }

                        // Funnel Shooting
                        if (part.shootTimer !== undefined) {
                            part.shootTimer--;
                            if (part.shootTimer <= 0) {
                                part.shootTimer = 120 + Math.random() * 60; // Fire every 2-3 seconds
                                // Fire at player
                                const angle = Math.atan2(p.pos.y - (e.pos.y + part.relY), p.pos.x - (e.pos.x + part.relX));
                                entitiesRef.current.push({
                                    id: Math.random(),
                                    type: EntityType.BULLET_ENEMY,
                                    pos: { x: e.pos.x + part.relX, y: e.pos.y + part.relY },
                                    vel: { x: Math.cos(angle) * 5, y: Math.sin(angle) * 5 },
                                    width: 12, height: 12, color: NEON_BLUE_WIRE,
                                    active: true, hp: 1, maxHp: 1, rotation: angle
                                });
                            }
                        }
                    }
                    // STAGE 3: Laser Emitters Orbit
                    else if (wave === 3) {
                        const orbitR = 160;
                        // Rotate with boss
                        part.relX = Math.cos(part.angleOffset + e.rotation) * orbitR;
                        part.relY = Math.sin(part.angleOffset + e.rotation) * orbitR;
                    }
                });
                
                // Check Shield State
                if (activeParts === 0 && e.shieldActive) {
                    e.shieldActive = false;
                    screenShakeRef.current = 20;
                    soundEngine.playExplosion();
                    particlesRef.current.push({
                        id: Math.random(), type: EntityType.SHOCKWAVE,
                        pos: { ...e.pos }, vel: { x: 0, y: 0 },
                        width: 150, height: 0, color: NEON_BLUE_WIRE,
                        active: true, hp: 0, maxHp: 0, rotation: 0, life: 1, decay: 0.02
                    });
                }
            }

            // Boss Main Attacks
            if (wave === 1) {
                // Spiral Attack
                if (e.timer % 15 === 0) { 
                    const angle = frameCountRef.current * 0.1;
                    for(let k=0; k<3; k++) {
                        entitiesRef.current.push({
                            id: Math.random(), type: EntityType.BULLET_ENEMY,
                            pos: { x: e.pos.x, y: e.pos.y },
                            vel: { x: Math.cos(angle + k*2) * 6, y: Math.sin(angle + k*2) * 6 },
                            width: 18, height: 18, color: NEON_RED,
                            active: true, hp: 1, maxHp: 1, rotation: angle
                        });
                    }
                }
            } 
            else if (wave === 2) {
                // Stage 2: Main Body Ring Attack
                 if (e.timer % 120 === 0) { // Every 2 seconds
                    const numBullets = 16;
                    for (let i = 0; i < numBullets; i++) {
                         const angle = (Math.PI * 2 / numBullets) * i + e.rotation;
                         entitiesRef.current.push({
                            id: Math.random(),
                            type: EntityType.BULLET_ENEMY,
                            pos: { x: e.pos.x, y: e.pos.y },
                            vel: { x: Math.cos(angle) * 4, y: Math.sin(angle) * 4 },
                            width: 15, height: 15, color: NEON_ORANGE,
                            active: true, hp: 1, maxHp: 1, rotation: angle
                        });
                    }
                }
            }
            else if (wave === 3) {
                // Stage 3: 8-Way Doomsday Beam FROM EMITTERS
                const beamCycle = e.timer % STAGE_3_BEAM_INTERVAL;
                
                // Rapid Fire Targeted Spread (While waiting for beam)
                if (e.timer % 20 === 0) {
                    const angle = Math.atan2(p.pos.y - e.pos.y, p.pos.x - e.pos.x);
                    // 3-Way Spread
                    for(let i=-1; i<=1; i++) {
                        entitiesRef.current.push({
                            id: Math.random(),
                            type: EntityType.BULLET_ENEMY,
                            pos: { x: e.pos.x, y: e.pos.y },
                            vel: { x: Math.cos(angle + i*0.2) * 6, y: Math.sin(angle + i*0.2) * 6 },
                            width: 12, height: 12, color: NEON_MAGENTA,
                            active: true, hp: 1, maxHp: 1, rotation: angle + i*0.2
                        });
                    }
                }

                // Charge Up (Last 300 frames)
                if (beamCycle > STAGE_3_BEAM_INTERVAL - 120) {
                     if (frameCountRef.current % 10 === 0) {
                        particlesRef.current.push({
                            id: Math.random(), type: EntityType.PARTICLE,
                            pos: { x: e.pos.x + (Math.random()-0.5)*100, y: e.pos.y + (Math.random()-0.5)*100 },
                            vel: { x: (e.pos.x - p.pos.x)*0.01, y: (e.pos.y - p.pos.y)*0.01 }, // suck in
                            width: 5, color: NEON_PURPLE, active: true, life: 0.5, decay: 0.05
                        });
                     }
                }

                // FIRE
                if (beamCycle === 0) { // Trigger at 0 (after loop reset)
                    soundEngine.startBeam(); // Re-use beam sound for boss
                    screenShakeRef.current = 50;
                    
                    // Fire from each active part
                    if (e.parts) {
                        e.parts.forEach(part => {
                            if(!part.active) return;
                            const angle = part.angleOffset + e.rotation;
                            const color = part.type === 'RED_LASER' ? NEON_RED : NEON_GREEN;
                            entitiesRef.current.push({
                                id: Math.random(),
                                type: EntityType.BEAM_ENEMY,
                                pos: { x: e.pos.x + part.relX, y: e.pos.y + part.relY },
                                vel: { x: Math.cos(angle) * 20, y: Math.sin(angle) * 20 },
                                width: 40, height: 1200, // Thinner beams but more of them
                                color: color,
                                active: true, hp: 999, maxHp: 999, 
                                rotation: angle,
                                life: STAGE_3_BEAM_DURATION,
                                decay: 1,
                                // Store ref to part to follow it
                                phase: part.id // use phase to store part ID logic if needed, but simple rotation update is enough
                            });
                        });
                    }

                    // Stop sound after duration
                    setTimeout(() => soundEngine.stopBeam(), 2000);
                }
            }
        }
        else if (e.type === EntityType.BEAM_ENEMY) {
            e.life! -= 1;
            if (e.life! <= 0) e.active = false;
            e.rotation += 0.005; // Match boss rotation speed
        }
        // Standard AI
        else if (e.type === EntityType.ENEMY_DRONE) {
            e.pos.y += e.vel.y;
            e.pos.x = (e.initialX || 0) + Math.sin(frameCountRef.current * 0.05 + e.id * 10) * 100;
        }
        else if (e.type === EntityType.ENEMY_CHASER) {
            e.pos.y += e.vel.y * 1.5;
            if (e.pos.y < p.pos.y) {
                const dx = p.pos.x - e.pos.x;
                e.pos.x += dx * 0.03;
            }
        }
        else if (e.type === EntityType.ENEMY_SHOOTER) {
            if (e.pos.y < 150 || e.pos.y > 300) {
                e.pos.y += e.vel.y * 0.8;
            } else {
                e.pos.y += Math.sin(frameCountRef.current * 0.05);
                if (Math.floor(e.timer) % 100 === 0) {
                    for(let i=-1; i<=1; i++) {
                        entitiesRef.current.push({
                            id: Math.random(),
                            type: EntityType.BULLET_ENEMY,
                            pos: { x: e.pos.x, y: e.pos.y + 20 },
                            vel: { x: i * 2, y: 6 },
                            width: 15, height: 15, color: NEON_MAGENTA,
                            active: true, hp: 1, maxHp: 1, rotation: 0
                        });
                    }
                }
                if (e.timer > 400) e.pos.y += 2; 
            }
        }
        else if (e.type === EntityType.POWERUP_SHIELD) {
             e.pos.y += e.vel.y;
        }
        else if (e.type === EntityType.BULLET_ENEMY) {
             e.pos.x += e.vel.x;
             e.pos.y += e.vel.y;
             e.rotation += 0.2;
        }
        else {
            e.pos.x += e.vel.x;
            e.pos.y += e.vel.y;
        }
      
        // Cull
        if (e.pos.y > height + 100 || e.pos.y < -500 || e.pos.x < -200 || e.pos.x > width + 200) {
            e.active = false;
        }
    });

    // Particle Updates
    particlesRef.current.forEach(pt => {
      if (pt.type === EntityType.SHOCKWAVE) {
          pt.width += 5;
          pt.life! -= pt.decay!;
      } else {
          pt.pos.x += pt.vel.x;
          pt.pos.y += pt.vel.y;
          pt.life! -= pt.decay!;
      }
      if (pt.life! <= 0) pt.active = false;
    });

    // --- Collisions ---
    const playerBullets = entitiesRef.current.filter(e => e.type === EntityType.BULLET_PLAYER);
    const enemies = entitiesRef.current.filter(e => [EntityType.ENEMY_DRONE, EntityType.ENEMY_SHOOTER, EntityType.ENEMY_CHASER, EntityType.BOSS].includes(e.type));
    const powerups = entitiesRef.current.filter(e => e.type === EntityType.POWERUP_SHIELD);

    // POWERUP COLLECTION
    powerups.forEach(pow => {
        if (!pow.active) return;
        if (Math.hypot(p.pos.x - pow.pos.x, p.pos.y - pow.pos.y) < (p.width + pow.width)) {
            pow.active = false;
            soundEngine.playPowerup();
            p.shieldTimer = SHIELD_DURATION;
            particlesRef.current.push({id: Math.random(), type: EntityType.SHOCKWAVE, pos: {...p.pos}, vel:{x:0,y:0}, width:10, color:NEON_YELLOW, active:true, life:1, decay:0.05});
        }
    });
    
    // SPECIAL BEAM COLLISION
    if (p.active && p.specialActive) {
        const beamWidth = 80;
        enemies.forEach(e => {
            if (!e.active) return;
            
            let hit = false;
            if (e.pos.x > p.pos.x - beamWidth/2 && e.pos.x < p.pos.x + beamWidth/2 && e.pos.y < p.pos.y) {
                hit = true;
            }

            if (hit) {
                if (e.type === EntityType.BOSS) {
                    e.damageFlashTimer = 4; // Flash on hit
                    if (e.shieldActive && e.parts) {
                         e.parts.forEach(part => {
                             if (part.active) {
                                 if (Math.abs((e.pos.x + part.relX) - p.pos.x) < beamWidth/2) {
                                     part.hp -= 5; 
                                     particlesRef.current.push({id: Math.random(), type: EntityType.PARTICLE, pos: {x: e.pos.x+part.relX, y: e.pos.y+part.relY}, vel: {x:(Math.random()-0.5)*10, y:(Math.random()-0.5)*10}, width: 4, color: NEON_WHITE, active:true, life:0.5, decay:0.1});
                                     if (part.hp <= 0) {
                                         part.active = false;
                                         soundEngine.playHeavyDamage();
                                     }
                                 }
                             }
                         });
                    } else {
                        e.hp -= 3; 
                         if (e.hp <= 0) {
                            handleBossDeath(e);
                        }
                    }
                } else {
                    e.hp -= 20; 
                    if (e.hp <= 0) {
                        e.active = false;
                        statsRef.current.score += 200;
                        createExplosion(e.pos.x, e.pos.y, e.color, 1.5);
                    }
                }
            }
        });

        entitiesRef.current.forEach(e => {
            if (e.type === EntityType.BULLET_ENEMY && e.active) {
                if (e.pos.x > p.pos.x - beamWidth/2 && e.pos.x < p.pos.x + beamWidth/2 && e.pos.y < p.pos.y) {
                    e.active = false;
                    particlesRef.current.push({id: Math.random(), type: EntityType.PARTICLE, pos: {x: e.pos.x, y: e.pos.y}, vel: {x:0, y:0}, width: 3, color: NEON_WHITE, active:true, life:0.3, decay:0.1});
                }
            }
        });
    }

    playerBullets.forEach(b => {
      enemies.forEach(e => {
        if (!b.active || !e.active) return;
        
        if (e.type === EntityType.BOSS) {
            let hitRegistered = false;
            if (e.parts) {
                e.parts.forEach(part => {
                    if (!part.active || hitRegistered) return;
                    const px = e.pos.x + part.relX;
                    const py = e.pos.y + part.relY;
                    const dist = Math.hypot(b.pos.x - px, b.pos.y - py);
                    
                    if (dist < 40) { 
                        hitRegistered = true;
                        b.active = false;
                        part.hp -= 10;
                        e.damageFlashTimer = 4; // Flash boss entity when part hit
                        createExplosion(px, py, NEON_RED, 0.2);

                        if (part.hp <= 0) {
                            part.active = false;
                            statsRef.current.score += 500;
                            soundEngine.playHeavyDamage();
                            screenShakeRef.current += 5;
                            createExplosion(px, py, NEON_RED, 3);
                        }
                    }
                });
            }

            if (!hitRegistered) {
                const dist = Math.hypot(b.pos.x - e.pos.x, b.pos.y - e.pos.y);
                if (dist < 80) { 
                    b.active = false;
                    if (e.shieldActive) {
                        soundEngine.playRicochet();
                        particlesRef.current.push({id: Math.random(), type: EntityType.SHOCKWAVE, pos: {x:b.pos.x, y:b.pos.y}, vel:{x:0,y:0}, width:5, color:NEON_BLUE_WIRE, active:true, life:0.5, decay:0.1});
                    } else {
                        e.hp -= 10;
                        e.damageFlashTimer = 4; // Flash
                        particlesRef.current.push({id: Math.random(), type: EntityType.PARTICLE, pos: {x:b.pos.x, y:b.pos.y}, vel:{x:0,y:-5}, width:6, color:NEON_PURPLE, active:true, life:0.3, decay:0.1});
                        if (e.hp <= 0) handleBossDeath(e);
                    }
                }
            }
        }
        else {
            if (Math.hypot(b.pos.x - e.pos.x, b.pos.y - e.pos.y) < 35) {
              b.active = false;
              e.hp -= 10;
              if (e.hp <= 0) {
                e.active = false;
                statsRef.current.score += 200;
                createExplosion(e.pos.x, e.pos.y, e.color, 1);
              }
            }
        }
      });
    });

    // Player Damage Check
    if (p.active && (!p.invulnerableTimer || p.invulnerableTimer <= 0)) {
        const hostiles = entitiesRef.current.filter(e => 
            [EntityType.ENEMY_DRONE, EntityType.ENEMY_SHOOTER, EntityType.ENEMY_CHASER, EntityType.BOSS, EntityType.BULLET_ENEMY, EntityType.BEAM_ENEMY].includes(e.type)
        );

        hostiles.forEach(h => {
            if (!h.active) return;
            let collided = false;
            
            if (h.type === EntityType.BOSS) {
                 h.parts?.forEach(part => {
                     if (part.active && Math.hypot((h.pos.x+part.relX)-p.pos.x, (h.pos.y+part.relY)-p.pos.y) < 40+PLAYER_HITBOX) collided = true;
                 });
                 if (Math.hypot(h.pos.x-p.pos.x, h.pos.y-p.pos.y) < 80+PLAYER_HITBOX) collided = true;
            } 
            else if (h.type === EntityType.BEAM_ENEMY) {
                if (Math.hypot(h.pos.x - p.pos.x, h.pos.y - p.pos.y) < h.width/2 + PLAYER_HITBOX) collided = true;
            }
            else {
                if (Math.hypot(h.pos.x - p.pos.x, h.pos.y - p.pos.y) < (20 + PLAYER_HITBOX)) {
                    collided = true;
                    // If shield is active, DESTROY THE ENEMY instead of taking damage
                    if (p.shieldTimer && p.shieldTimer > 0) {
                        if (h.type !== EntityType.BOSS && h.type !== EntityType.BEAM_ENEMY) {
                            h.active = false;
                            statsRef.current.score += 100;
                            createExplosion(h.pos.x, h.pos.y, h.color, 1);
                            soundEngine.playExplosion();
                        }
                        // Prevent damage
                        collided = false; 
                    } else {
                         if (h.type !== EntityType.BOSS && h.type !== EntityType.BEAM_ENEMY) h.active = false;
                    }
                }
            }

            if (collided) {
                // Double check shield for boss/beam collision (which sets collided=true but skips above block)
                if (p.shieldTimer && p.shieldTimer > 0) {
                    // Invincible, do nothing
                } else {
                    p.hp -= h.type === EntityType.BEAM_ENEMY ? 50 : 25;
                    screenShakeRef.current += 10;
                    createExplosion(p.pos.x, p.pos.y, NEON_RED, 0.5);
                    if (p.hp <= 0) {
                        createExplosion(p.pos.x, p.pos.y, NEON_BLUE_WIRE, 4);
                        statsRef.current.lives--;
                        p.active = false;
                        p.invulnerableTimer = PLAYER_INVULNERABILITY;
                        if (p.specialActive) { p.specialActive = false; soundEngine.stopBeam(); }
                        
                        if (statsRef.current.lives > 0) {
                            setTimeout(() => {
                                p.active = true;
                                p.hp = p.maxHp;
                                p.pos = { x: width/2, y: height - 150 };
                                entitiesRef.current = entitiesRef.current.filter(e => e.type !== EntityType.BULLET_ENEMY);
                            }, 1000);
                        } else {
                            setFinalScore(statsRef.current.score);
                            setGameState(GameState.GAME_OVER);
                            soundEngine.stopBGM();
                        }
                    }
                }
            }
        });
    }

    entitiesRef.current = entitiesRef.current.filter(e => e.active);
    particlesRef.current = particlesRef.current.filter(e => e.active);

    // --- Rendering ---
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw Nebula
    nebulaRef.current.forEach(n => {
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        grad.addColorStop(0, n.color + '40');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(n.x - n.r, n.y - n.r, n.r*2, n.r*2);
    });

    // Draw Stars
    starsRef.current.forEach(s => {
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.brightness * 0.8;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI*2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Apply Shake
    ctx.save();
    if (screenShakeRef.current > 0) {
      const sx = (Math.random() - 0.5) * screenShakeRef.current;
      const sy = (Math.random() - 0.5) * screenShakeRef.current;
      ctx.translate(sx, sy);
    }

    // Draw Entities
    const allEntities = [...entitiesRef.current, ...particlesRef.current];
    if (p.active) allEntities.push(p);

    allEntities.sort((a, b) => (a.type === EntityType.BOSS ? -1 : 1));

    // SPECIAL BEAM RENDER
    if (p.active && p.specialActive) {
        const hue = (frameCountRef.current * 10) % 360;
        const beamGrad = ctx.createLinearGradient(p.pos.x - 40, 0, p.pos.x + 40, 0);
        beamGrad.addColorStop(0, `hsla(${hue}, 100%, 50%, 0)`);
        beamGrad.addColorStop(0.2, `hsla(${hue}, 100%, 50%, 0.5)`);
        beamGrad.addColorStop(0.5, '#fff');
        beamGrad.addColorStop(0.8, `hsla(${hue + 180}, 100%, 50%, 0.5)`);
        beamGrad.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
        
        ctx.fillStyle = beamGrad;
        ctx.fillRect(p.pos.x - 50, 0, 100, p.pos.y);

        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y - 20, 40 + Math.random() * 10, 0, Math.PI*2);
        ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.7; ctx.fill(); ctx.globalAlpha = 1;
    }

    allEntities.forEach(e => {
      ctx.save();
      ctx.translate(e.pos.x, e.pos.y);
      ctx.rotate(e.rotation);
      
      if (e.type === EntityType.PLAYER) {
          if (e.invulnerableTimer! > 0 && Math.floor(frameCountRef.current / 4) % 2 === 0) {
             ctx.globalAlpha = 0.5;
          }
          
          // PLAYER SHIELD RENDER
          if (e.shieldTimer! > 0) {
              ctx.save();
              const shieldPulse = Math.sin(frameCountRef.current * 0.2) * 5;
              ctx.beginPath();
              ctx.arc(0, 0, e.width * 1.5 + shieldPulse, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(0, 243, 255, ${0.1 + Math.abs(shieldPulse)/20})`; // Blueish shield
              ctx.fill();
              ctx.strokeStyle = NEON_BLUE_WIRE;
              ctx.lineWidth = 2;
              ctx.shadowColor = NEON_BLUE_WIRE;
              ctx.shadowBlur = 20;
              ctx.stroke();
              
              // Spinning ring
              ctx.rotate(frameCountRef.current * 0.1);
              ctx.beginPath();
              ctx.arc(0, 0, e.width * 1.8, 0, Math.PI * 1.5);
              ctx.strokeStyle = NEON_WHITE;
              ctx.stroke();
              ctx.restore();
          }
      }

      ctx.shadowBlur = 10; ctx.shadowColor = e.color; ctx.fillStyle = e.color;

      switch(e.type) {
        case EntityType.PLAYER:
            // RED & BLUE 2-TONE WIREFRAME DESIGN
            const scale = 1.2; 
            ctx.scale(scale, scale);
            
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            // 1. Main Fuselage - BLUE
            ctx.strokeStyle = NEON_BLUE_WIRE;
            ctx.shadowColor = NEON_BLUE_WIRE;
            ctx.beginPath();
            // Nose
            ctx.moveTo(0, -25);
            ctx.lineTo(4, -8);
            ctx.lineTo(4, 15);
            // Tail center
            ctx.lineTo(0, 20); 
            ctx.lineTo(-4, 15);
            ctx.lineTo(-4, -8);
            ctx.closePath();
            ctx.stroke();

            // Cockpit - CYAN (Glass)
            ctx.strokeStyle = NEON_CYAN;
            ctx.shadowColor = NEON_CYAN;
            ctx.beginPath();
            ctx.moveTo(0, -8);
            ctx.lineTo(3, 2);
            ctx.lineTo(0, 8);
            ctx.lineTo(-3, 2);
            ctx.closePath();
            ctx.stroke();
            
            // 2. Wings & Engines - RED
            ctx.strokeStyle = NEON_RED;
            ctx.shadowColor = NEON_RED;
            ctx.beginPath();
            // Right Engine/Wing
            ctx.moveTo(4, 0);
            ctx.lineTo(12, 22); // Engine rear
            ctx.lineTo(25, 18); // Wing tip rear
            ctx.lineTo(25, 10); // Wing tip front
            ctx.lineTo(6, -5);  // Wing root
            // Left Engine/Wing
            ctx.moveTo(-4, 0);
            ctx.lineTo(-12, 22);
            ctx.lineTo(-25, 18);
            ctx.lineTo(-25, 10);
            ctx.lineTo(-6, -5);
            ctx.stroke();

            // Engine Particles (Mixed Blue/Red)
            if (frameCountRef.current % 3 === 0) {
                 ctx.fillStyle = NEON_BLUE_WIRE;
                 ctx.globalAlpha = 0.6;
                 ctx.beginPath(); ctx.arc(-8, 22, 2, 0, Math.PI*2); ctx.fill();
                 ctx.beginPath(); ctx.arc(8, 22, 2, 0, Math.PI*2); ctx.fill();
                 ctx.globalAlpha = 1;
            }
            break;
        
        case EntityType.ENEMY_DRONE:
            // 2-Tone: Orange Body + Cyan Core
            // Main Body
            ctx.fillStyle = '#210'; ctx.strokeStyle = NEON_ORANGE; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, 15); ctx.lineTo(12, -5); ctx.lineTo(0, -15); ctx.lineTo(-12, -5); ctx.closePath(); ctx.fill(); ctx.stroke();
            // Inner Core
            ctx.fillStyle = NEON_CYAN; 
            ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(4, -2); ctx.lineTo(0, -8); ctx.lineTo(-4, -2); ctx.fill();
            break;

        case EntityType.ENEMY_CHASER:
            // 2-Tone: Green Body + Purple Thrusters/Spikes
            // Main Body
            ctx.fillStyle = '#010'; ctx.strokeStyle = NEON_GREEN; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(10, -15); ctx.lineTo(0, -5); ctx.lineTo(-10, -15); ctx.closePath(); ctx.fill(); ctx.stroke();
            // Spikes/Thrusters
            ctx.strokeStyle = NEON_PURPLE;
            ctx.beginPath(); ctx.moveTo(-10, -15); ctx.lineTo(-15, -20); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(10, -15); ctx.lineTo(15, -20); ctx.stroke();
            break;

        case EntityType.ENEMY_SHOOTER:
            // 2-Tone: Magenta Hull + Gold Core
            // Main Hull
            ctx.fillStyle = '#101'; ctx.strokeStyle = NEON_MAGENTA; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.rect(-15, -15, 30, 30); ctx.fill(); ctx.stroke();
            // Inner Core
            ctx.strokeStyle = NEON_GOLD; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.stroke();
            ctx.moveTo(-15, -15); ctx.lineTo(-5, -5); ctx.stroke();
            ctx.moveTo(15, -15); ctx.lineTo(5, -5); ctx.stroke();
            ctx.moveTo(15, 15); ctx.lineTo(5, 5); ctx.stroke();
            ctx.moveTo(-15, 15); ctx.lineTo(-5, 5); ctx.stroke();
            break;
            
        case EntityType.POWERUP_SHIELD:
             const pPulse = Math.sin(frameCountRef.current * 0.1) * 0.2 + 0.8;
             ctx.scale(pPulse, pPulse);
             ctx.shadowBlur = 20; ctx.shadowColor = NEON_YELLOW;
             ctx.fillStyle = NEON_YELLOW; 
             ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill();
             ctx.fillStyle = '#000'; ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
             ctx.fillText("S", 0, 1);
             break;

        case EntityType.BOSS:
            // Check flash timer for hit effect
            const isFlashing = e.damageFlashTimer !== undefined && e.damageFlashTimer > 0;
            
            if (e.parts) {
                e.parts.forEach(part => {
                    if (!part.active) return;
                    ctx.save();
                    const wave = statsRef.current.wave;
                    
                    if (isFlashing) {
                        ctx.strokeStyle = NEON_WHITE;
                        ctx.fillStyle = NEON_WHITE;
                        ctx.shadowColor = NEON_WHITE;
                    }

                    if (wave === 1) { // Tentacles (Geometric Snake Wireframe)
                        const segments = 16; // Increased for smoother wave
                        // Colors: Red (outer) and Green (inner) alternating based on type
                        const isRedSnake = part.type === 'RED_SNAKE';
                        const snakeColor = isFlashing ? NEON_WHITE : (isRedSnake ? NEON_RED : NEON_GREEN);
                        
                        ctx.strokeStyle = snakeColor;
                        ctx.lineWidth = 2;
                        ctx.shadowColor = snakeColor;
                        ctx.shadowBlur = 10;

                        // Draw segmented wireframe body with Undulating Wave
                        const angleBase = Math.atan2(part.relY, part.relX);
                        const perpX = -Math.sin(angleBase);
                        const perpY = Math.cos(angleBase);

                        for(let i=0; i<=segments; i++) {
                            const t = i / segments;
                            const lx = part.relX * t;
                            const ly = part.relY * t;
                            const waveAmp = 25 * Math.sin(t * Math.PI); 
                            const waveOffset = Math.sin(frameCountRef.current * 0.2 + t * 4 * Math.PI) * waveAmp;
                            
                            const px = lx + perpX * waveOffset;
                            const py = ly + perpY * waveOffset;

                            const size = 12 * (1 - t) + 6; 
                            
                            if (i === segments) { // Head
                                ctx.translate(part.relX, part.relY); 
                                ctx.rotate(part.angleOffset + frameCountRef.current * 0.05); 
                                ctx.fillStyle = snakeColor;
                                ctx.beginPath(); 
                                ctx.moveTo(0, -size*1.5); 
                                ctx.lineTo(size, size); 
                                ctx.lineTo(-size, size); 
                                ctx.closePath();
                                ctx.fill();
                                // Eyes
                                ctx.fillStyle = '#fff';
                                ctx.beginPath(); ctx.arc(-3, 0, 2, 0, Math.PI*2); ctx.fill();
                                ctx.beginPath(); ctx.arc(3, 0, 2, 0, Math.PI*2); ctx.fill();
                            } else { // Body Segments (Hollow Rects)
                                ctx.beginPath();
                                ctx.strokeRect(px - size/2, py - size/2, size, size);
                            }
                        }
                    } else if (wave === 2) { // Diamond Funnels (Red/Green)
                        ctx.translate(part.relX, part.relY);
                        ctx.rotate(-e.rotation * 2); // Counter rotate
                        
                        // Diamond Shape
                        const drawDiamond = (sz: number) => {
                            ctx.beginPath();
                            ctx.moveTo(0, -sz);
                            ctx.lineTo(sz/1.5, 0);
                            ctx.lineTo(0, sz);
                            ctx.lineTo(-sz/1.5, 0);
                            ctx.closePath();
                        }

                        // Outer Red Wireframe
                        drawDiamond(25);
                        ctx.strokeStyle = isFlashing ? NEON_WHITE : NEON_RED; ctx.lineWidth = 3; ctx.stroke();
                        
                        // Inner Green Wireframe
                        drawDiamond(15);
                        ctx.strokeStyle = isFlashing ? NEON_WHITE : NEON_GREEN; ctx.lineWidth = 2; ctx.stroke();
                        
                        // Glow center
                        ctx.fillStyle = isFlashing ? NEON_WHITE : 'rgba(0, 255, 100, 0.2)'; ctx.fill();
                    }
                    else if (wave === 3) { // Stage 3 Laser Emitters
                         ctx.translate(part.relX, part.relY);
                         ctx.rotate(part.angleOffset + e.rotation + Math.PI/2); // Point outward
                         const color = isFlashing ? NEON_WHITE : (part.type === 'RED_LASER' ? NEON_RED : NEON_GREEN);
                         ctx.strokeStyle = color; ctx.lineWidth = 2;
                         ctx.shadowColor = color; ctx.shadowBlur = 10;

                         // Wireframe Cone
                         ctx.beginPath();
                         ctx.moveTo(-10, 0); ctx.lineTo(-20, -30);
                         ctx.moveTo(10, 0); ctx.lineTo(20, -30);
                         ctx.stroke();
                         ctx.strokeRect(-10, 0, 20, 10); // Base
                         
                         // Inner Glow
                         ctx.fillStyle = color; ctx.globalAlpha = 0.3;
                         ctx.beginPath(); ctx.moveTo(-10,0); ctx.lineTo(-20,-30); ctx.lineTo(20,-30); ctx.lineTo(10,0); ctx.fill();
                         ctx.globalAlpha = 1;
                    }
                    ctx.restore();
                });
            }

            // Core Draw
            const wave = statsRef.current.wave;
            const coreColor = isFlashing ? NEON_WHITE : NEON_CYAN;
            const wireColor = isFlashing ? NEON_WHITE : NEON_BLUE_WIRE;
            
            if (isFlashing) {
                 ctx.strokeStyle = NEON_WHITE;
                 ctx.shadowColor = NEON_WHITE;
                 ctx.fillStyle = NEON_WHITE;
            }

            if (wave === 1) {
                // Geometric Mandala Core (Blue Neon)
                ctx.shadowColor = coreColor; ctx.shadowBlur = 30;
                ctx.strokeStyle = coreColor; ctx.lineWidth = 2;
                
                // Rotating Squares
                const time = frameCountRef.current * 0.02;
                for(let i=0; i<3; i++) {
                    ctx.save();
                    ctx.rotate(time * (i%2===0 ? 1 : -1) + (Math.PI/4)*i);
                    ctx.strokeRect(-40 + i*5, -40 + i*5, 80 - i*10, 80 - i*10);
                    ctx.restore();
                }

                // Inner Star
                ctx.beginPath();
                const spikes = 8; const outerRadius = 30; const innerRadius = 15;
                for(let i=0; i<spikes; i++) {
                    let x = Math.cos(time) * outerRadius;
                    let y = Math.sin(time) * outerRadius;
                    ctx.lineTo(Math.cos(time + i * Math.PI / (spikes/2)) * outerRadius, Math.sin(time + i * Math.PI / (spikes/2)) * outerRadius);
                    ctx.lineTo(Math.cos(time + (i * Math.PI / (spikes/2)) + Math.PI/spikes) * innerRadius, Math.sin(time + (i * Math.PI / (spikes/2)) + Math.PI/spikes) * innerRadius);
                }
                ctx.closePath();
                ctx.strokeStyle = wireColor; ctx.stroke();
                ctx.fillStyle = isFlashing ? NEON_WHITE : 'rgba(0, 243, 255, 0.2)'; ctx.fill();

            } else if (wave === 2) {
                // Blue Geometric Mandala Core
                ctx.shadowColor = coreColor; ctx.shadowBlur = 25;
                
                // Outer Ring
                ctx.strokeStyle = coreColor; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI*2); ctx.stroke();
                
                // Inner Geometric interlaced circles/triangles
                ctx.strokeStyle = wireColor; ctx.lineWidth = 2;
                const time = frameCountRef.current * 0.02;
                
                for(let i=0; i<4; i++) {
                    ctx.save();
                    ctx.rotate(time + (Math.PI/2)*i);
                    ctx.beginPath();
                    ctx.moveTo(0, -50);
                    ctx.quadraticCurveTo(30, 0, 0, 50);
                    ctx.quadraticCurveTo(-30, 0, 0, -50);
                    ctx.stroke();
                    ctx.restore();
                }
                
                // Center Star
                ctx.fillStyle = coreColor;
                ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill();

            } else if (wave === 3) {
                 // Stage 3: Geometric Octagon Core
                ctx.shadowColor = wireColor; ctx.shadowBlur = 40;
                ctx.strokeStyle = wireColor; ctx.lineWidth = 3;

                const time = frameCountRef.current * 0.01;
                
                // Spinning Octagon wireframes
                for(let k=0; k<3; k++) {
                    ctx.save();
                    ctx.rotate(time * (k%2===0 ? 1 : -1) + k*0.5);
                    ctx.beginPath();
                    for(let i=0; i<8; i++) {
                        const a = (Math.PI*2/8) * i;
                        const r = 50 - k*10;
                        if(i===0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r);
                        else ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
                    }
                    ctx.closePath();
                    ctx.stroke();
                    ctx.restore();
                }
                
                ctx.fillStyle = isFlashing ? NEON_WHITE : 'rgba(0, 100, 255, 0.3)'; ctx.fill();
                ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill();
            }
            
            // Shield
            if (e.shieldActive) {
                ctx.resetTransform(); ctx.translate(e.pos.x, e.pos.y); ctx.rotate(e.rotation);
                ctx.beginPath(); ctx.arc(0, 0, 90, 0, Math.PI*2); ctx.strokeStyle = NEON_BLUE_WIRE; ctx.lineWidth = 3;
                ctx.globalAlpha = 0.3 + Math.sin(frameCountRef.current * 0.2) * 0.1; ctx.stroke(); ctx.globalAlpha = 1;
            }
            break;

        case EntityType.BEAM_ENEMY:
             // Massive beam rendering
             const beamW = e.width + Math.sin(frameCountRef.current * 0.5) * 10;
             // It's a projectile, so we draw a rotated rect
             ctx.fillStyle = e.color;
             ctx.shadowBlur = 20;
             ctx.fillRect(-beamW/2, -e.height/2, beamW, e.height);
             // White core
             ctx.fillStyle = '#fff';
             ctx.shadowBlur = 10;
             ctx.fillRect(-beamW/4, -e.height/2, beamW/2, e.height);
             break;

        case EntityType.BULLET_PLAYER:
             // Thicker glowing cyan beam
             ctx.lineCap = 'round';
             ctx.shadowBlur = 20; 
             ctx.shadowColor = NEON_CYAN;
             
             // Outer
             ctx.strokeStyle = NEON_CYAN;
             ctx.lineWidth = 6; 
             ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(0, 10); ctx.stroke();
             
             // Inner
             ctx.strokeStyle = '#ffffff';
             ctx.lineWidth = 2;
             ctx.beginPath(); ctx.moveTo(0, -35); ctx.lineTo(0, 5); ctx.stroke();
             break;
        case EntityType.BULLET_ENEMY:
             ctx.fillStyle = NEON_RED; ctx.shadowBlur = 5;
             const bSize = e.width / 2;
             ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.moveTo(0, 0); ctx.lineTo(bSize, -bSize/2); ctx.lineTo(bSize, bSize/2); } ctx.fill();
             break;
        case EntityType.PARTICLE:
             // If it's a "Spark" (high velocity), draw as line
             const speed = Math.hypot(e.vel.x, e.vel.y);
             ctx.globalAlpha = e.life || 1; 
             ctx.fillStyle = e.color;
             if (speed > 5) {
                 ctx.beginPath();
                 ctx.moveTo(0, 0);
                 ctx.lineTo(-e.vel.x * 2, -e.vel.y * 2); // Tail behind
                 ctx.lineWidth = e.width;
                 ctx.strokeStyle = e.color;
                 ctx.stroke();
             } else {
                 ctx.beginPath(); ctx.arc(0, 0, e.width, 0, Math.PI*2); ctx.fill();
             }
             break;
        case EntityType.SHOCKWAVE:
             ctx.globalAlpha = e.life || 1; ctx.strokeStyle = e.color; ctx.lineWidth = 4 * (e.life || 1); ctx.beginPath(); ctx.arc(0, 0, e.width, 0, Math.PI*2); ctx.stroke();
             break;
      }
      ctx.restore();
    });
    
    ctx.restore(); // End Shake

    // --- HUD ---
    ctx.fillStyle = 'rgba(0, 10, 20, 0.8)'; ctx.fillRect(0, 0, width, 80);
    ctx.strokeStyle = NEON_BLUE_WIRE; ctx.beginPath(); ctx.moveTo(0, 80); ctx.lineTo(width, 80); ctx.stroke();

    // Score
    ctx.save(); ctx.translate(20, 20);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; ctx.strokeStyle = NEON_BLUE_WIRE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(200, 0); ctx.lineTo(220, 20); ctx.lineTo(200, 40); ctx.lineTo(0, 40); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.font = "bold 28px 'Orbitron'"; ctx.fillStyle = NEON_BLUE_WIRE; ctx.fillText(statsRef.current.score.toString().padStart(6, '0'), 20, 32);
    ctx.restore();

    // Stage Indicator
    ctx.save(); ctx.translate(240, 20);
    ctx.font = "bold 20px 'Orbitron'"; ctx.fillStyle = NEON_RED; ctx.fillText(`STAGE ${statsRef.current.wave}`, 0, 32);
    ctx.restore();

    // Stage Transition Overlay
    if (stageTransitionTimerRef.current > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, height/2 - 100, width, 200);
        ctx.textAlign = 'center';
        ctx.font = "900 60px 'Orbitron'";
        ctx.fillStyle = NEON_BLUE_WIRE;
        ctx.shadowColor = NEON_BLUE_WIRE; ctx.shadowBlur = 20;
        
        if (stageTransitionTimerRef.current > 120) {
            // CLEAR MESSAGE
             if (statsRef.current.wave === 1) { // Initial Start
                ctx.fillText("MISSION START", width/2, height/2 + 20);
             } else {
                ctx.fillText("CLEAR THE STAGE", width/2, height/2 + 20);
             }
        } else {
            // NEXT STAGE START MESSAGE
            ctx.fillText(`STAGE ${statsRef.current.wave}`, width/2, height/2 + 20);
        }
        ctx.restore();
    }

    // Boss HP Bar
    if (statsRef.current.bossActive) {
       const boss = entitiesRef.current.find(e => e.type === EntityType.BOSS);
       if (boss) {
         const barW = width - 40; const barX = 20; const barY = 90;
         let displayPct = 0;
         if (boss.shieldActive && boss.parts) {
             const totalMax = boss.parts.length * (boss.parts[0].maxHp);
             const current = boss.parts.reduce((sum, p) => sum + (p.active ? p.hp : 0), 0);
             displayPct = current / totalMax;
             ctx.fillStyle = NEON_ORANGE; 
         } else {
             displayPct = boss.hp / boss.maxHp;
             ctx.fillStyle = NEON_RED; 
         }
         ctx.fillStyle = 'rgba(50, 0, 0, 0.8)'; ctx.fillRect(barX, barY, barW, 15);
         // Flash bar white on hit too
         if (boss.damageFlashTimer && boss.damageFlashTimer > 0) {
              ctx.fillStyle = NEON_WHITE;
         } else {
              ctx.fillStyle = boss.shieldActive ? NEON_ORANGE : NEON_RED;
         }
         ctx.fillRect(barX, barY, barW * displayPct, 15);
         ctx.strokeStyle = NEON_WHITE; ctx.strokeRect(barX, barY, barW, 15);
       }
    }

    // Shield HUD
    const hudY = height - 80;
    ctx.save();
    const centerX = 80; const centerY = hudY + 40; const radius = 40; const hpPct = p.hp / p.maxHp;
    ctx.beginPath(); ctx.arc(centerX, centerY, radius, Math.PI, Math.PI * 2); ctx.strokeStyle = '#333'; ctx.lineWidth = 10; ctx.stroke();
    ctx.beginPath(); ctx.arc(centerX, centerY, radius, Math.PI + (1-hpPct)*Math.PI, Math.PI * 2);
    ctx.strokeStyle = hpPct < 0.3 ? NEON_RED : NEON_GREEN; ctx.stroke();
    ctx.fillStyle = NEON_WHITE; ctx.font = "bold 16px 'Orbitron'"; ctx.textAlign = "center"; ctx.fillText(`${Math.ceil(p.hp)}%`, centerX, centerY);
    ctx.restore();

    // Hyper Gauge
    ctx.save();
    ctx.translate(width/2 - 100, hudY + 50);
    const gaugePct = Math.min(1, p.specialGauge! / SPECIAL_CHARGE_FRAMES);
    ctx.fillStyle = '#222'; ctx.fillRect(0, 0, 200, 10);
    if (p.specialActive) {
        const hue = (frameCountRef.current * 10) % 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`; ctx.fillRect(0, 0, 200 * (p.specialTimer! / SPECIAL_DURATION_FRAMES), 10);
    } else if (gaugePct >= 1) {
        const hue = (frameCountRef.current * 10) % 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`; ctx.fillRect(0, 0, 200, 10);
        ctx.font = "bold 12px 'Orbitron'"; ctx.fillStyle = '#fff'; ctx.fillText("HYPER READY (X + SPACE)", 20, -5);
    } else {
        ctx.fillStyle = NEON_BLUE_WIRE; ctx.fillRect(0, 0, 200 * gaugePct, 10);
    }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(0, 0, 200, 10);
    ctx.restore();

    // Lives
    ctx.save(); ctx.translate(width - 140, hudY + 20);
    for(let i=0; i<statsRef.current.lives; i++) {
        const lx = i * 35;
        ctx.fillStyle = 'rgba(0, 243, 255, 0.5)'; ctx.strokeStyle = NEON_BLUE_WIRE;
        ctx.beginPath(); ctx.moveTo(lx, 10); ctx.lineTo(lx+20, 10); ctx.lineTo(lx+25, 25); ctx.lineTo(lx-5, 25); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  };

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    update(ctx, canvas.width, canvas.height);
    requestRef.current = requestAnimationFrame(render);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(render);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState]);

  return (
    <div className="relative w-full h-full touch-none">
        <canvas 
            ref={canvasRef} 
            className="block w-full h-full bg-[#020205] cursor-crosshair" 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        />
        
        {/* Mobile / Hybrid Controls Overlay */}
        {gameState === GameState.PLAYING && (
            <div className="absolute bottom-24 right-6 z-20 pointer-events-auto">
                 <button 
                    className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] active:scale-95
                        ${gaugeValue >= 100 
                            ? 'bg-yellow-500 border-white animate-pulse shadow-[0_0_30px_#eab308]' 
                            : 'bg-gray-800/50 border-gray-600 opacity-50'
                        }`}
                    onClick={() => {
                        manualSpecialTriggerRef.current = true;
                    }}
                 >
                     <Zap className={`w-10 h-10 ${gaugeValue >= 100 ? 'text-white' : 'text-gray-400'}`} />
                     {gaugeValue >= 100 && (
                         <span className="absolute -top-8 font-bold text-yellow-400 font-mono text-sm tracking-widest drop-shadow-md">HYPER</span>
                     )}
                 </button>
            </div>
        )}
    </div>
  );
};

export default GameCanvas;