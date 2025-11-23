import React, { useRef, useEffect, useCallback } from 'react';
import { TILE_SIZE, PACMAN_SPEED, GHOST_SPEED, COLORS, GHOST_COLORS, FRIGHTENED_SPEED } from '../constants';
import { Direction, Ghost, Entity, Point } from '../types';

interface GameCanvasProps {
  grid: string[];
  gameState: 'PLAYING' | 'IDLE' | 'PAUSED' | 'GAMEOVER' | 'WON';
  onScoreUpdate: (score: number) => void;
  onLivesUpdate: (lives: number) => void;
  onGameOver: (won: boolean) => void;
  resetSignal: number; // increment to reset round
}

const GameCanvas: React.FC<GameCanvasProps> = ({
  grid,
  gameState,
  onScoreUpdate,
  onLivesUpdate,
  onGameOver,
  resetSignal
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State Refs (Mutable for performance)
  const pacmanRef = useRef<Entity>({ x: 0, y: 0, dir: 'NONE', nextDir: 'NONE', speed: PACMAN_SPEED });
  const ghostsRef = useRef<Ghost[]>([]);
  const pelletsRef = useRef<Point[]>([]);
  const powerPelletsRef = useRef<Point[]>([]);
  const wallsRef = useRef<Point[]>([]);
  const gateRef = useRef<Point | null>(null);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const animationFrameRef = useRef<number>(0);
  const frightenedTimerRef = useRef<number | null>(null);

  // Helper: Check if a tile is walkable
  const isWalkable = useCallback((c: number, r: number, includeGate = false) => {
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) return false;
    const char = grid[r][c];
    if (char === '#') return false;
    if (char === '-' && !includeGate) return false;
    return true;
  }, [grid]);

  // Initialize Level Data
  const initLevel = useCallback(() => {
    if (!grid || grid.length === 0) return;

    const pPellets: Point[] = [];
    const ppPellets: Point[] = [];
    const pWalls: Point[] = [];
    const pGhosts: Ghost[] = [];
    let pStart: Point = { x: 1, y: 1 };
    let gStarts: Point[] = [];

    grid.forEach((row, r) => {
      row.split('').forEach((char, c) => {
        const x = c * TILE_SIZE + TILE_SIZE / 2;
        const y = r * TILE_SIZE + TILE_SIZE / 2;

        if (char === '#') pWalls.push({ x: c, y: r }); // Wall coords are grid based for rendering optim
        if (char === '.') pPellets.push({ x, y });
        if (char === 'O') ppPellets.push({ x, y });
        if (char === '-') gateRef.current = { x, y };
        if (char === 'P') pStart = { x, y };
        if (char === 'G') gStarts.push({ x, y });
      });
    });

    // Set Pacman
    pacmanRef.current = { ...pacmanRef.current, x: pStart.x, y: pStart.y, dir: 'NONE', nextDir: 'NONE' };

    // Set Ghosts
    // If no explicit 'G' in map, create random ones near center
    if (gStarts.length === 0) {
        gStarts.push({x: pStart.x, y: pStart.y - TILE_SIZE * 2});
    }
    
    ghostsRef.current = gStarts.map((start, i) => ({
      x: start.x,
      y: start.y,
      dir: (['LEFT', 'RIGHT'][i % 2]) as Direction,
      nextDir: 'NONE',
      speed: GHOST_SPEED,
      color: GHOST_COLORS[i % GHOST_COLORS.length],
      mode: 'SCATTER',
      id: i
    }));
    // Fill remaining ghosts if map has few Gs
    while(ghostsRef.current.length < 4) {
        const i = ghostsRef.current.length;
        ghostsRef.current.push({
            x: gStarts[0].x,
            y: gStarts[0].y,
            dir: 'UP',
            nextDir: 'NONE',
            speed: GHOST_SPEED,
            color: GHOST_COLORS[i % GHOST_COLORS.length],
            mode: 'SCATTER',
            id: i
        })
    }

    pelletsRef.current = pPellets;
    powerPelletsRef.current = ppPellets;
    wallsRef.current = pWalls;
  }, [grid]);

  // Initial Setup
  useEffect(() => {
    initLevel();
    scoreRef.current = 0;
    livesRef.current = 3;
    onScoreUpdate(0);
    onLivesUpdate(3);
  }, [grid, initLevel, resetSignal]); 

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING') return;
      switch (e.key) {
        case 'ArrowUp': pacmanRef.current.nextDir = 'UP'; break;
        case 'ArrowDown': pacmanRef.current.nextDir = 'DOWN'; break;
        case 'ArrowLeft': pacmanRef.current.nextDir = 'LEFT'; break;
        case 'ArrowRight': pacmanRef.current.nextDir = 'RIGHT'; break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Core Logic Helpers
  const getGridPos = (p: number) => Math.floor(p / TILE_SIZE);
  const isCentered = (val: number) => Math.abs(val % TILE_SIZE - TILE_SIZE / 2) < 2;

  const canMove = (x: number, y: number, dir: Direction, isGhost = false) => {
    const col = getGridPos(x);
    const row = getGridPos(y);
    
    let nextRow = row;
    let nextCol = col;

    if (dir === 'UP') nextRow--;
    if (dir === 'DOWN') nextRow++;
    if (dir === 'LEFT') nextCol--;
    if (dir === 'RIGHT') nextCol++;

    // Tunneling
    if (nextCol < 0 || nextCol >= grid[0].length) return true; 

    return isWalkable(nextCol, nextRow, isGhost);
  };

  const moveEntity = (entity: Entity, isGhost: boolean) => {
    // Attempt to change direction if centered
    if (entity.nextDir !== 'NONE' && isCentered(entity.x) && isCentered(entity.y)) {
      if (canMove(entity.x, entity.y, entity.nextDir, isGhost)) {
        entity.dir = entity.nextDir;
        entity.nextDir = 'NONE';
        // Snap to grid center to avoid drift
        entity.x = getGridPos(entity.x) * TILE_SIZE + TILE_SIZE / 2;
        entity.y = getGridPos(entity.y) * TILE_SIZE + TILE_SIZE / 2;
      }
    }

    if (entity.dir === 'NONE') return;

    // Check collision ahead
    if (isCentered(entity.x) && isCentered(entity.y)) {
      if (!canMove(entity.x, entity.y, entity.dir, isGhost)) {
        return; // Hit wall
      }
    }

    // Apply movement
    const moveSpeed = isGhost && (entity as Ghost).mode === 'FRIGHTENED' ? FRIGHTENED_SPEED : entity.speed;

    if (entity.dir === 'UP') entity.y -= moveSpeed;
    if (entity.dir === 'DOWN') entity.y += moveSpeed;
    if (entity.dir === 'LEFT') entity.x -= moveSpeed;
    if (entity.dir === 'RIGHT') entity.x += moveSpeed;

    // Wrap Around (Tunnel)
    const mapWidth = grid[0].length * TILE_SIZE;
    if (entity.x < -TILE_SIZE / 2) entity.x = mapWidth + TILE_SIZE / 2;
    if (entity.x > mapWidth + TILE_SIZE / 2) entity.x = -TILE_SIZE / 2;
  };

  const updateGhosts = () => {
    ghostsRef.current.forEach(ghost => {
      // Simple AI: Random choice at intersections
      if (isCentered(ghost.x) && isCentered(ghost.y)) {
        const possibleDirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
        const validDirs = possibleDirs.filter(d => canMove(ghost.x, ghost.y, d, true));
        
        // Don't reverse immediately unless dead end
        const opposite = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT', NONE: 'NONE' };
        const nonReverseDirs = validDirs.filter(d => d !== opposite[ghost.dir]);
        
        const choices = nonReverseDirs.length > 0 ? nonReverseDirs : validDirs;
        
        // Very basic tracking: Try to minimize distance to Pacman if chasing
        if (ghost.mode === 'CHASE' && Math.random() > 0.3) { // 70% smart
             // Sort choices by distance to pacman
             choices.sort((a, b) => {
                // simulate pos
                let ax = ghost.x, ay = ghost.y;
                if(a === 'UP') ay-=TILE_SIZE; if(a === 'DOWN') ay+=TILE_SIZE;
                if(a === 'LEFT') ax-=TILE_SIZE; if(a === 'RIGHT') ax+=TILE_SIZE;
                const adist = Math.hypot(ax - pacmanRef.current.x, ay - pacmanRef.current.y);

                let bx = ghost.x, by = ghost.y;
                if(b === 'UP') by-=TILE_SIZE; if(b === 'DOWN') by+=TILE_SIZE;
                if(b === 'LEFT') bx-=TILE_SIZE; if(b === 'RIGHT') bx+=TILE_SIZE;
                const bdist = Math.hypot(bx - pacmanRef.current.x, by - pacmanRef.current.y);
                
                return adist - bdist;
             });
        }
        
        if (choices.length > 0) {
           ghost.dir = choices[0];
           // Add some randomness so they don't all stack
           if (choices.length > 1 && Math.random() < 0.2) {
             ghost.dir = choices[Math.floor(Math.random() * choices.length)];
           }
        } else {
           // Dead end, reverse
           ghost.dir = opposite[ghost.dir] as Direction;
        }
      }
      moveEntity(ghost, true);
    });
  };

  const checkCollisions = () => {
    // 1. Pellet Collision
    const pRadius = 4;
    const pacX = pacmanRef.current.x;
    const pacY = pacmanRef.current.y;

    // Filter out eaten pellets
    let eaten = false;
    pelletsRef.current = pelletsRef.current.filter(p => {
      const dist = Math.hypot(p.x - pacX, p.y - pacY);
      if (dist < TILE_SIZE / 2) {
        scoreRef.current += 10;
        eaten = true;
        return false;
      }
      return true;
    });

    // Power Pellets
    powerPelletsRef.current = powerPelletsRef.current.filter(p => {
      const dist = Math.hypot(p.x - pacX, p.y - pacY);
      if (dist < TILE_SIZE / 2) {
        scoreRef.current += 50;
        eaten = true;
        // Frighten Ghosts
        ghostsRef.current.forEach(g => g.mode = 'FRIGHTENED');
        if (frightenedTimerRef.current) clearTimeout(frightenedTimerRef.current);
        frightenedTimerRef.current = window.setTimeout(() => {
           ghostsRef.current.forEach(g => g.mode = 'SCATTER');
        }, 8000);
        return false;
      }
      return true;
    });

    if (eaten) onScoreUpdate(scoreRef.current);

    // Win Condition
    if (pelletsRef.current.length === 0 && powerPelletsRef.current.length === 0) {
      onGameOver(true);
      return;
    }

    // 2. Ghost Collision
    for (const ghost of ghostsRef.current) {
      const dist = Math.hypot(ghost.x - pacX, ghost.y - pacY);
      if (dist < TILE_SIZE * 0.8) { // Overlap
        if (ghost.mode === 'FRIGHTENED') {
          // Eat Ghost
          scoreRef.current += 200;
          onScoreUpdate(scoreRef.current);
          // Send ghost home (respawn logic simplified: just reset pos)
          ghost.x = gateRef.current?.x || TILE_SIZE * 10; 
          ghost.y = (gateRef.current?.y || TILE_SIZE * 10) + TILE_SIZE;
          ghost.mode = 'SCATTER'; 
        } else if (ghost.mode !== 'EATEN') {
          // Pacman Dies
          livesRef.current -= 1;
          onLivesUpdate(livesRef.current);
          
          if (livesRef.current <= 0) {
            onGameOver(false);
          } else {
            // Reset positions but keep pellets
            initLevelPosOnly();
          }
        }
      }
    }
  };

  const initLevelPosOnly = () => {
     // Simple reset of positions
     // Re-find start P
     let pStart = { x: TILE_SIZE * 10, y: TILE_SIZE * 15 };
     let gStarts: Point[] = [];
      grid.forEach((row, r) => {
        row.split('').forEach((char, c) => {
            if(char === 'P') pStart = {x: c*TILE_SIZE + TILE_SIZE/2, y: r*TILE_SIZE + TILE_SIZE/2};
            if(char === 'G') gStarts.push({x: c*TILE_SIZE + TILE_SIZE/2, y: r*TILE_SIZE + TILE_SIZE/2});
        })
      });
      
      pacmanRef.current.x = pStart.x;
      pacmanRef.current.y = pStart.y;
      pacmanRef.current.dir = 'NONE';
      pacmanRef.current.nextDir = 'NONE';

      ghostsRef.current.forEach((g, i) => {
         const start = gStarts[i % gStarts.length] || pStart;
         g.x = start.x;
         g.y = start.y;
         g.mode = 'SCATTER';
      });
  };

  // Draw Loop
  const draw = (ctx: CanvasRenderingContext2D) => {
    // Clear
    ctx.fillStyle = COLORS.BG;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Walls
    ctx.fillStyle = COLORS.WALL;
    wallsRef.current.forEach(w => {
      ctx.fillRect(w.x * TILE_SIZE, w.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      // Make it look like walls have borders (simple inset)
      ctx.fillStyle = '#000';
      ctx.fillRect(w.x * TILE_SIZE + 4, w.y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      ctx.fillStyle = COLORS.WALL;
      ctx.fillRect(w.x * TILE_SIZE + 8, w.y * TILE_SIZE + 8, TILE_SIZE - 16, TILE_SIZE - 16);
    });
    
    // Gate
    if(gateRef.current) {
        ctx.fillStyle = COLORS.GATE;
        ctx.fillRect(gateRef.current.x - TILE_SIZE/2, gateRef.current.y - 2, TILE_SIZE, 4);
    }

    // Pellets
    ctx.fillStyle = COLORS.PELLET;
    pelletsRef.current.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Power Pellets
    const flicker = Math.floor(Date.now() / 200) % 2 === 0;
    if (flicker) {
      ctx.fillStyle = COLORS.POWER_PELLET;
      powerPelletsRef.current.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Pacman
    const pm = pacmanRef.current;
    ctx.fillStyle = COLORS.PACMAN;
    ctx.beginPath();
    
    // Simple mouth animation
    const mouthOpen = Math.abs(Math.sin(Date.now() / 100)) * 0.2 + 0.02;
    let angle = 0;
    if (pm.dir === 'UP') angle = -Math.PI / 2;
    if (pm.dir === 'DOWN') angle = Math.PI / 2;
    if (pm.dir === 'LEFT') angle = Math.PI;
    
    ctx.arc(pm.x, pm.y, TILE_SIZE / 2 - 2, angle + mouthOpen * Math.PI, angle + (2 - mouthOpen) * Math.PI);
    ctx.lineTo(pm.x, pm.y);
    ctx.fill();

    // Ghosts
    ghostsRef.current.forEach(g => {
      ctx.fillStyle = g.mode === 'FRIGHTENED' ? '#0000ff' : g.color;
      if (g.mode === 'FRIGHTENED' && (Date.now() % 500 < 250)) {
          // flash white near end of fright
          // simplified visual
      }
      
      // Body
      ctx.beginPath();
      ctx.arc(g.x, g.y - 2, TILE_SIZE / 2 - 2, Math.PI, 0);
      ctx.lineTo(g.x + TILE_SIZE / 2 - 2, g.y + TILE_SIZE / 2);
      // Feet
      ctx.lineTo(g.x - TILE_SIZE / 2 + 2, g.y + TILE_SIZE / 2);
      ctx.fill();
      
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(g.x - 4, g.y - 4, 3, 0, Math.PI * 2);
      ctx.arc(g.x + 4, g.y - 4, 3, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#000';
      ctx.beginPath();
      // Pupil direction
      let px = 0, py = 0;
      if (g.dir === 'LEFT') px = -1;
      if (g.dir === 'RIGHT') px = 1;
      if (g.dir === 'UP') py = -1;
      if (g.dir === 'DOWN') py = 1;
      
      ctx.arc(g.x - 4 + px, g.y - 4 + py, 1.5, 0, Math.PI * 2);
      ctx.arc(g.x + 4 + px, g.y - 4 + py, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  // Main Loop
  const loop = useCallback(() => {
    if (gameState === 'PLAYING') {
      moveEntity(pacmanRef.current, false);
      updateGhosts();
      checkCollisions();
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) draw(ctx);
    }

    animationFrameRef.current = requestAnimationFrame(loop);
  }, [gameState, grid]); // Deps usually static due to refs, but gameState important

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [loop]);

  if (!grid || grid.length === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      width={grid[0].length * TILE_SIZE}
      height={grid.length * TILE_SIZE}
      className="border-4 border-blue-800 shadow-[0_0_20px_rgba(30,64,175,0.6)] rounded-sm bg-black mx-auto"
    />
  );
};

export default GameCanvas;