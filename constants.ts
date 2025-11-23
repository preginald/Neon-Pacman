export const TILE_SIZE = 24; // Pixels per tile
export const PACMAN_SPEED = 3; // Pixels per frame (must be divisible into TILE_SIZE ideally or handled via delta)
export const GHOST_SPEED = 2;
export const FRIGHTENED_SPEED = 1.5;

export const COLORS = {
  WALL: '#1d4ed8', // blue-700
  BG: '#000000',
  PACMAN: '#fbbf24', // yellow-400
  PELLET: '#fca5a5', // red-300 (pale)
  POWER_PELLET: '#f87171', // red-400
  GATE: '#pink',
};

export const GHOST_COLORS = [
  '#ef4444', // Blinky (Red)
  '#ec4899', // Pinky (Pink)
  '#06b6d4', // Inky (Cyan)
  '#f97316', // Clyde (Orange)
];

// A classic-ish default layout (21x21 approx)
export const DEFAULT_LEVEL_GRID = [
  "#####################",
  "#.........#.........#",
  "#.###.###.#.###.###.#",
  "#O###.###.#.###.###O#",
  "#.###.###.#.###.###.#",
  "#...................#",
  "#.###.#.#####.#.###.#",
  "#.###.#.#####.#.###.#",
  "#.....#...#...#.....#",
  "#####.### # ###.#####",
  "    #.# G G G #.#    ",
  "#####.# #---# #.#####",
  "      . #   # .      ",
  "#####.# ##### #.#####",
  "    #.#       #.#    ",
  "#####.#.#####.#.#####",
  "#.........#.........#",
  "#.###.###.#.###.###.#",
  "#O..#.....P.....#..O#",
  "###.#.#####.#####.#.#",
  "#.....#.........#...#",
  "#####################"
];
