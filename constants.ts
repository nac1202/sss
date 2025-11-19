


// World settings
export const CANVAS_WIDTH = 600; // Narrower for vertical feel
export const CANVAS_HEIGHT = 1000; // Tall vertical play area

// Game Progression
export const MAX_STAGES = 3;

// Player
export const PLAYER_SPEED = 7; // Slightly slower for narrower screen
export const PLAYER_SIZE = 25; // Reduced size (was 40)
export const FIRE_RATE = 8; // Frames between shots
export const PLAYER_HITBOX = 4; // Smaller hitbox for precision dodging
export const PLAYER_INVULNERABILITY = 120; // Frames (2 seconds @ 60fps)

// Special Attack
export const SPECIAL_CHARGE_FRAMES = 1800; // 30 seconds @ 60fps
export const SPECIAL_DURATION_FRAMES = 600; // 10 seconds @ 60fps

// Items
export const SHIELD_DURATION = 1200; // 20 seconds @ 60fps

// Enemies
export const ENEMY_SPEED_BASE = 3;
export const BOSS_HP = 1500;
export const BOSS_SPAWN_SCORE_BASE = 1000; // Score required per wave to spawn boss

// Stage 3 Specific
export const STAGE_3_BEAM_INTERVAL = 1800; // 30 seconds
export const STAGE_3_BEAM_DURATION = 120; // 2 seconds duration

// Visuals
export const NEON_CYAN = '#00f3ff';
export const NEON_MAGENTA = '#ff00ff';
export const NEON_GREEN = '#00ff66';
export const NEON_ORANGE = '#ffaa00';
export const NEON_WHITE = '#ffffff';
export const NEON_RED = '#ff0044';
export const NEON_YELLOW = '#ffff00';
export const NEON_PURPLE = '#aa00ff';
export const NEON_GOLD = '#ffd700';
export const NEON_BLUE_WIRE = '#0080ff'; // New wireframe color
export const GRID_COLOR = 'rgba(0, 243, 255, 0.15)';

// Audio Frequencies
export const NOTES = {
  BASS: [55, 65.41, 73.42, 82.41], // A1, C2, D2, E2
  LEAD: [440, 523.25, 587.33, 659.25] // A4, C5, D5, E5
};

// Controls
export const KEYS = {
  LEFT: ['ArrowLeft', 'a', 'A'],
  RIGHT: ['ArrowRight', 'd', 'D'],
  UP: ['ArrowUp', 'w', 'W'],
  DOWN: ['ArrowDown', 's', 'S'],
  SHOOT: [' ', 'Enter'],
  SPECIAL: ['x', 'X'],
  PAUSE: ['p', 'P', 'Escape']
};
