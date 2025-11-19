
export enum GameState {
  MENU,
  PLAYING,
  PAUSED,
  GAME_OVER,
  GAME_CLEARED,
  HELP
}

export interface Vector2 {
  x: number;
  y: number;
}

export enum EntityType {
  PLAYER,
  BULLET_PLAYER,
  BULLET_ENEMY,
  BEAM_ENEMY,     // New: Massive Stage 3 Laser
  ENEMY_DRONE,    // Basic Sine Wave Swarmer
  ENEMY_SHOOTER,  // Heavy Stop-and-Shoot
  ENEMY_CHASER,   // Fast Kamikaze
  BOSS,
  PARTICLE,
  SHOCKWAVE,
  POWERUP_SHIELD  // New: Shield Item
}

export interface BossPart {
  id: number;
  relX: number; // Relative to boss center
  relY: number;
  hp: number;
  maxHp: number;
  active: boolean;
  angleOffset: number;
  shootTimer?: number; // For Stage 2 Funnels
  type?: string;
}

export interface Entity {
  id: number;
  type: EntityType;
  pos: Vector2;
  vel: Vector2;
  width: number;
  height: number;
  color: string;
  active: boolean;
  hp: number;
  maxHp: number;
  rotation: number; // radians
  
  // Visuals
  glowIntensity?: number;
  scale?: number;
  damageFlashTimer?: number; // New: For boss hit flashing effect
  
  // Particles
  life?: number;
  decay?: number;
  
  // AI / Patterns
  initialX?: number; // For sine wave calculations
  phase?: number;
  timer?: number;
  
  // Boss Specific
  parts?: BossPart[];
  shieldActive?: boolean;

  // Player specific
  invulnerableTimer?: number;
  shieldTimer?: number; // New: Player Shield Duration
  
  // Special Attack
  specialGauge?: number; // 0 to SPECIAL_CHARGE_FRAMES
  specialActive?: boolean;
  specialTimer?: number; // Remaining duration
}

export interface GameStats {
  score: number;
  wave: number;
  lives: number;
  bossActive: boolean;
  combo: number;
  nextBossScoreThreshold: number; // New: Control when boss spawns relative to current score
}

export interface SoundState {
  ctx: AudioContext | null;
  masterGain: GainNode | null;
  muted: boolean;
}
