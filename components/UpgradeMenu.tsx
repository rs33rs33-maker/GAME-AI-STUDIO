import React from 'react';
import { UpgradeType, Player } from '../types';
import { Zap, Shield, Crosshair, ChevronsUp } from 'lucide-react';

interface UpgradeMenuProps {
  onSelect: (type: UpgradeType) => void;
  player: Player | null;
}

const UpgradeMenu: React.FC<UpgradeMenuProps> = ({ onSelect, player }) => {
  const upgrades = [
    {
      type: UpgradeType.DAMAGE,
      title: 'Plasma Output',
      desc: 'Increases damage by 20%.',
      icon: <Zap className="w-8 h-8 text-yellow-400" />,
      color: 'border-yellow-500 hover:bg-yellow-500/20'
    },
    {
      type: UpgradeType.SPEED,
      title: 'Thruster Overdrive',
      desc: 'Increases movement speed & fire rate by 10%.',
      icon: <ChevronsUp className="w-8 h-8 text-cyan-400" />,
      color: 'border-cyan-500 hover:bg-cyan-500/20'
    },
    {
      type: UpgradeType.MULTISHOT,
      title: 'Split Chamber',
      desc: 'Adds +1 projectile to every shot.',
      icon: <Crosshair className="w-8 h-8 text-green-400" />,
      color: 'border-green-500 hover:bg-green-500/20'
    },
    {
      type: UpgradeType.SHIELD,
      title: 'Shield Capacitor',
      desc: 'Heals fully & increases Max HP by 50.',
      icon: <Shield className="w-8 h-8 text-purple-400" />,
      color: 'border-purple-500 hover:bg-purple-500/20'
    }
  ];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="max-w-4xl w-full p-8 text-center">
        <h2 className="text-5xl font-bold text-white mb-2 tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(0,255,255,0.8)]">
          System Upgrade Available
        </h2>
        <p className="text-cyan-200 mb-12 font-mono text-lg">CHOOSE A MODULE TO INSTALL</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {upgrades.map((u) => (
            <button
              key={u.type}
              onClick={() => onSelect(u.type)}
              className={`group relative flex items-center p-6 bg-gray-900/80 border-2 ${u.color} transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(0,0,0,0.5)] text-left rounded-xl`}
            >
              <div className="bg-gray-800 p-4 rounded-full mr-6 border border-white/10 group-hover:border-white/30 transition-colors">
                {u.icon}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-1 font-mono group-hover:text-cyan-300 transition-colors">{u.title}</h3>
                <p className="text-gray-400 text-sm">{u.desc}</p>
              </div>
              
              {/* Retro corner bits */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white/50" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-white/50" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-white/50" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white/50" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UpgradeMenu;