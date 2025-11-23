import React, { useState, useEffect, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import { DEFAULT_LEVEL_GRID, TILE_SIZE } from './constants';
import { generateLevelWithAI } from './services/geminiService';
import { GameState } from './types';

const App: React.FC = () => {
  // Game Data
  const [grid, setGrid] = useState<string[]>(DEFAULT_LEVEL_GRID);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState<GameState['status']>('IDLE');
  const [resetSignal, setResetSignal] = useState(0);
  
  // UI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('pac_highscore');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  const updateHighScore = (newScore: number) => {
    if (newScore > highScore) {
      setHighScore(newScore);
      localStorage.setItem('pac_highscore', newScore.toString());
    }
  };

  const handleScoreUpdate = useCallback((newScore: number) => {
    setScore(newScore);
    updateHighScore(newScore);
  }, [highScore]);

  const handleLivesUpdate = useCallback((newLives: number) => {
    setLives(newLives);
  }, []);

  const handleGameOver = useCallback((won: boolean) => {
    setGameState(won ? 'WON' : 'GAMEOVER');
  }, []);

  const startGame = () => {
    setGameState('PLAYING');
    setScore(0);
    setLives(3);
    setResetSignal(s => s + 1);
    setErrorMsg(null);
  };

  const generateLevel = async (difficulty: string) => {
    if (!process.env.API_KEY) {
      setErrorMsg("API Key missing! Cannot generate level.");
      return;
    }

    setIsGenerating(true);
    setGameState('IDLE');
    try {
      const newGrid = await generateLevelWithAI(difficulty);
      // Basic validation
      if (newGrid && newGrid.length > 5 && newGrid[0].length > 5) {
        setGrid(newGrid);
        setResetSignal(s => s + 1);
        setErrorMsg(null);
      } else {
        throw new Error("Invalid grid generated");
      }
    } catch (err) {
      setErrorMsg("Failed to generate level. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 text-yellow-400 p-4 selection:bg-yellow-900 selection:text-yellow-200">
      
      <header className="mb-6 text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-lg animate-pulse">
          NEON PAC-AI
        </h1>
        <p className="mt-2 text-blue-400 text-xs md:text-sm uppercase tracking-widest">
          Gemini Powered • Retro Arcade
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 items-start max-w-6xl w-full">
        
        {/* Left Sidebar: Controls & Stats */}
        <div className="flex-1 w-full lg:max-w-xs space-y-6 order-2 lg:order-1">
          
          {/* Score Board */}
          <div className="bg-neutral-900 border-2 border-blue-900 p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-end mb-2">
              <span className="text-blue-300 text-sm">SCORE</span>
              <span className="text-2xl font-bold">{score.toString().padStart(6, '0')}</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-pink-300 text-sm">HIGH</span>
              <span className="text-xl">{highScore.toString().padStart(6, '0')}</span>
            </div>
            <div className="mt-4 flex items-center gap-2">
               <span className="text-sm text-gray-400">LIVES:</span>
               <div className="flex gap-1">
                 {Array.from({length: Math.max(0, lives)}).map((_, i) => (
                   <div key={i} className="w-4 h-4 bg-yellow-400 rounded-full" />
                 ))}
               </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg">
            <h3 className="text-white mb-4 text-sm font-bold uppercase border-b border-neutral-700 pb-2">Controls</h3>
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
               <div className="flex flex-col items-center bg-neutral-950 p-2 rounded">
                 <span className="text-xl mb-1">⬆️⬇️⬅️➡️</span>
                 <span>Move</span>
               </div>
               <div className="flex flex-col items-center bg-neutral-950 p-2 rounded justify-center">
                  <span className="text-white font-bold">Space</span>
                  <span className="mt-1">Start / Restart</span> 
                  {/* Note: Space binding is implicit in button focus usually, or added to window listener. 
                      For this simple version, we rely on UI buttons. */}
               </div>
            </div>
            
            <div className="mt-6 space-y-3">
              {gameState !== 'PLAYING' ? (
                <button 
                  onClick={startGame}
                  className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded transition-colors shadow-[0_0_10px_rgba(234,179,8,0.4)]"
                >
                  {gameState === 'IDLE' ? 'INSERT COIN (START)' : 'TRY AGAIN'}
                </button>
              ) : (
                <button 
                  onClick={() => setGameState('PAUSED')}
                  className="w-full py-3 bg-neutral-700 hover:bg-neutral-600 text-white font-bold rounded transition-colors"
                >
                  PAUSE
                </button>
              )}
              
              {gameState === 'PAUSED' && (
                 <button 
                 onClick={() => setGameState('PLAYING')}
                 className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded transition-colors"
               >
                 RESUME
               </button>
              )}
            </div>
          </div>

          {/* AI Generator */}
          <div className="bg-neutral-900 border border-purple-900/50 p-6 rounded-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-1 bg-purple-900 text-[10px] text-white font-bold rounded-bl">BETA</div>
            <h3 className="text-purple-300 mb-4 text-sm font-bold uppercase flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              Level Generator
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Use Gemini AI to dream up a new maze. Warning: AI might make impossible levels!
            </p>
            
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => generateLevel('Easy')}
                disabled={isGenerating}
                className="py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs rounded disabled:opacity-50"
              >
                Easy Layout
              </button>
              <button 
                onClick={() => generateLevel('Hard')}
                disabled={isGenerating}
                className="py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs rounded disabled:opacity-50"
              >
                Hard Layout
              </button>
            </div>
            {isGenerating && <p className="text-xs text-purple-400 mt-2 animate-pulse">Dreaming up maze...</p>}
            {errorMsg && <p className="text-xs text-red-500 mt-2">{errorMsg}</p>}
          </div>

        </div>

        {/* Center: Game View */}
        <div className="flex-2 order-1 lg:order-2 relative group">
           {/* Overlay for Game Over / Win */}
           {(gameState === 'GAMEOVER' || gameState === 'WON') && (
             <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 backdrop-blur-sm rounded">
               <h2 className={`text-4xl font-bold mb-4 ${gameState === 'WON' ? 'text-green-400' : 'text-red-500'}`}>
                 {gameState === 'WON' ? 'YOU WON!' : 'GAME OVER'}
               </h2>
               <p className="text-white mb-6 text-sm">FINAL SCORE: {score}</p>
               <button 
                  onClick={startGame}
                  className="px-8 py-3 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors"
                >
                  PLAY AGAIN
                </button>
             </div>
           )}

           <GameCanvas 
             grid={grid}
             gameState={gameState}
             onScoreUpdate={handleScoreUpdate}
             onLivesUpdate={handleLivesUpdate}
             onGameOver={handleGameOver}
             resetSignal={resetSignal}
           />
           
           <div className="mt-2 text-center text-neutral-600 text-[10px]">
             Map Size: {grid[0].length}x{grid.length} • {TILE_SIZE}px Tiles
           </div>
        </div>

      </div>
      
      <footer className="mt-12 text-neutral-700 text-xs text-center">
        <p>Powered by React 18 + Tailwind + Gemini 2.5 Flash</p>
      </footer>
    </div>
  );
};

export default App;