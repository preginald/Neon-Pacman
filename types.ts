export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE';

export interface Point {
  x: number;
  y: number;
}

export interface Entity {
  x: number;
  y: number;
  dir: Direction;
  nextDir: Direction;
  speed: number;
}

export interface Ghost extends Entity {
  color: string;
  mode: 'SCATTER' | 'CHASE' | 'FRIGHTENED' | 'EATEN';
  id: number;
}

export interface GameState {
  score: number;
  lives: number;
  status: 'IDLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'WON';
  level: number;
}

export type TileType = '#' | '.' | 'O' | ' ' | '-' | 'P' | 'G';
// # Wall, . Dot, O Power, - Gate, P Pacman Start, G Ghost Start, Space Empty

export interface LevelData {
  grid: string[];
  width: number;
  height: number;
}