
import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import UpgradeMenu from './components/UpgradeMenu';
import { GameState, Player, UpgradeType } from './types';
import { Play, RefreshCw, PlayCircle } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [upgradeSelection, setUpgradeSelection] = useState<UpgradeType | null>(null);
  const [levelUpPlayer, setLevelUpPlayer] = useState<Player | null>(null);
  const [gameOverStats, setGameOverStats] = useState<any>(null);
  const [resetSignal, setResetSignal] = useState(0);
  
  // Logic for multiple upgrades
  const [pendingUpgrades, setPendingUpgrades] = useState(0);

  const handleLevelUp = (playerSnapshot: Player) => {
    setLevelUpPlayer(playerSnapshot);
    
    // Every 5 levels, give 2 upgrades
    if (playerSnapshot.level % 5 === 0) {
        setPendingUpgrades(2);
    } else {
        setPendingUpgrades(1);
    }
    
    setGameState(GameState.PAUSED); 
  };

  const handleUpgradeSelect = (type: UpgradeType) => {
    setUpgradeSelection(type);
    // Quick reset signal for the canvas prop
    setTimeout(() => setUpgradeSelection(null), 50); 
    
    setPendingUpgrades(prev => prev - 1);

    // If we still have upgrades pending, do not resume yet
    if (pendingUpgrades - 1 <= 0) {
        setGameState(GameState.PLAYING);
    }
  };

  const handleGameOver = (stats: any) => {
    setGameOverStats(stats);
    setGameState(GameState.GAME_OVER);
  };

  const togglePause = () => {
    if (gameState === GameState.PLAYING) {
        setGameState(GameState.PAUSED);
    } else if (gameState === GameState.PAUSED) {
        // Only allow unpause if we are NOT in the middle of a level-up selection
        if (pendingUpgrades === 0) {
            setGameState(GameState.PLAYING);
        }
    }
  };

  const startGame = () => {
    setResetSignal(s => s + 1);
    setPendingUpgrades(0);
    setGameState(GameState.PLAYING);
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
      
      {/* The Game Engine */}
      <GameCanvas 
        gameState={gameState} 
        setGameState={setGameState}
        onLevelUp={handleLevelUp}
        onGameOver={handleGameOver}
        onTogglePause={togglePause}
        upgradeSelection={upgradeSelection}
        resetSignal={resetSignal}
      />

      {/* Scanline Overlay */}
      <div className="scanlines absolute inset-0 pointer-events-none z-10" />

      {/* HUD - Only visible when playing or paused (so you can see stats while paused) */}
      {(gameState === GameState.PLAYING || gameState === GameState.PAUSED) && (
        <HUD onPause={togglePause} />
      )}

      {/* Upgrade Menu - Overlay */}
      {gameState === GameState.PAUSED && pendingUpgrades > 0 && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center">
             <UpgradeMenu onSelect={handleUpgradeSelect} player={levelUpPlayer} />
             {pendingUpgrades > 1 && (
                 <div className="mt-4 text-2xl text-yellow-400 font-bold animate-pulse bg-black/50 px-4 py-2 rounded">
                     BONUS: CHOOSE {pendingUpgrades} MODULES!
                 </div>
             )}
        </div>
      )}

      {/* Pause Menu - Overlay (Only if NO upgrades pending) */}
      {gameState === GameState.PAUSED && pendingUpgrades === 0 && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
            <h2 className="text-6xl font-bold text-white mb-8 tracking-widest">PAUSED</h2>
            <button 
                onClick={togglePause}
                className="flex items-center gap-3 px-10 py-4 bg-cyan-600 hover:bg-cyan-500 text-white text-xl font-bold rounded transition-all"
            >
                <PlayCircle /> RESUME MISSION
            </button>
        </div>
      )}

      {/* Main Menu */}
      {gameState === GameState.MENU && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90">
          <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-blue-600 tracking-tighter mb-8 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">
            RETRO VOID
          </h1>
          <button 
            onClick={startGame}
            className="flex items-center gap-3 px-12 py-4 bg-cyan-600 hover:bg-cyan-500 text-white text-2xl font-bold rounded-sm transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(0,255,255,0.6)]"
          >
            <Play className="fill-current" /> INITIALIZE
          </button>
          <p className="mt-8 text-gray-500 font-mono">WASD to Move • Auto-Fire Active • ESC to Pause</p>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === GameState.GAME_OVER && gameOverStats && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-900/20 backdrop-blur-md">
          <h2 className="text-7xl font-black text-red-500 mb-6 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">CRITICAL FAILURE</h2>
          
          <div className="grid grid-cols-2 gap-8 mb-12 font-mono text-xl text-white">
            <div className="text-right text-gray-400">SURVIVAL TIME</div>
            <div className="text-yellow-400">{Math.floor(gameOverStats.timeAlive)}s</div>
            
            <div className="text-right text-gray-400">FINAL SCORE</div>
            <div className="text-green-400">{gameOverStats.score.toLocaleString()}</div>
            
            <div className="text-right text-gray-400">LEVEL REACHED</div>
            <div className="text-cyan-400">{gameOverStats.level}</div>
          </div>

          <button 
            onClick={startGame}
            className="flex items-center gap-3 px-10 py-4 bg-white text-black hover:bg-gray-200 text-xl font-bold rounded-sm transition-all"
          >
            <RefreshCw /> REBOOT SYSTEM
          </button>
        </div>
      )}
    </div>
  );
}
