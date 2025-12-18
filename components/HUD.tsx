
import React, { useEffect, useState } from 'react';
import { LEVEL_CAP } from '../constants';
import { Pause } from 'lucide-react';

interface HUDProps {
    onPause: () => void;
}

const HUD: React.FC<HUDProps> = ({ onPause }) => {
  const [data, setData] = useState({
    hp: 100,
    maxHp: 100,
    xp: 0,
    nextLevelXp: 100,
    level: 1,
    score: 0,
    time: 0
  });

  useEffect(() => {
    const handler = (e: any) => {
      setData(e.detail);
    };
    window.addEventListener('game-update', handler);
    return () => window.removeEventListener('game-update', handler);
  }, []);

  const xpPct = Math.min(100, (data.xp / data.nextLevelXp) * 100);
  const hpPct = (data.hp / data.maxHp) * 100;

  // Format time MM:SS
  const mins = Math.floor(data.time / 60).toString().padStart(2, '0');
  const secs = Math.floor(data.time % 60).toString().padStart(2, '0');

  return (
    <div className="absolute inset-0 flex flex-col justify-between p-6 font-mono text-white select-none pointer-events-none">
      {/* Top Bar */}
      <div className="flex justify-between items-start w-full">
        
        {/* HP & Level */}
        <div className="flex flex-col gap-2 w-64">
          <div className="flex justify-between items-end">
             <span className="text-xl font-bold text-cyan-400">LVL {data.level}</span>
             <span className="text-xs text-gray-400">{data.level >= LEVEL_CAP ? 'MAX' : `${Math.floor(data.xp)}/${data.nextLevelXp}`}</span>
          </div>
          <div className="h-3 w-full bg-gray-800 border border-gray-600 skew-x-[-12deg] overflow-hidden relative">
             <div 
                className="h-full bg-yellow-400 transition-all duration-200" 
                style={{ width: `${xpPct}%` }} 
             />
          </div>

          <div className="mt-2">
            <div className="flex justify-between text-xs text-red-400 mb-1">
                <span>SHIELD INTEGRITY</span>
                <span>{Math.max(0, Math.floor(data.hp))} / {data.maxHp}</span>
            </div>
            <div className="h-4 w-full bg-gray-900 border border-red-900 relative">
               <div 
                 className="h-full bg-red-600 transition-all duration-200" 
                 style={{ width: `${hpPct}%` }} 
               />
            </div>
          </div>
        </div>

        {/* Right Side: Timer, Score, Pause */}
        <div className="flex flex-col items-end gap-4">
            <div className="text-right">
                <div className="text-4xl font-bold tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                    {mins}:{secs}
                </div>
                <div className="text-xl text-green-400 mt-1">
                    SCORE: {data.score.toLocaleString()}
                </div>
            </div>
            
            <button 
                onClick={(e) => {
                    // pointer-events-none is on parent, need to re-enable for this button
                    // Wait, simpler to make parent not block everything, or make this pointer-events-auto
                    onPause();
                }}
                className="pointer-events-auto p-2 bg-cyan-900/50 border border-cyan-500 rounded hover:bg-cyan-800/80 transition-colors"
            >
                <Pause className="w-6 h-6 text-cyan-300" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default HUD;
