
import React from 'react';
import { GameState } from '../types';
import { RefreshCw, Home, Trophy } from 'lucide-react';
import { NEON_RED, NEON_GREEN, NEON_CYAN } from '../constants';

interface GameOverProps {
  score: number;
  setGameState: (state: GameState) => void;
  isVictory?: boolean;
}

const GameOver: React.FC<GameOverProps> = ({ score, setGameState, isVictory }) => {
  const title = isVictory ? "MISSION ACCOMPLISHED" : "CRITICAL FAILURE";
  const subtitle = isVictory ? "ALL SYSTEMS SECURE" : "SIGNAL LOST";
  const color = isVictory ? NEON_GREEN : NEON_RED;
  const glow = isVictory ? NEON_CYAN : NEON_RED;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 backdrop-blur-md" style={{
      backgroundColor: isVictory ? 'rgba(0, 20, 10, 0.8)' : 'rgba(40, 0, 0, 0.8)'
    }}>
      <h2 className="text-5xl md:text-7xl font-black text-white mb-2 title-font tracking-tighter text-center" style={{
        textShadow: `0 0 30px ${glow}`
      }}>
        {title}
      </h2>
      <p className="font-mono text-lg mb-8 tracking-widest" style={{ color: color }}>{subtitle}</p>
      
      <div className="bg-black/50 p-8 border mb-8 text-center min-w-[300px]" style={{ borderColor: color }}>
        <div className="text-sm text-gray-400 uppercase tracking-widest mb-2">Final Score</div>
        <div className="text-5xl font-bold text-white font-mono">{score.toLocaleString()}</div>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={() => setGameState(GameState.PLAYING)}
          className="px-8 py-3 text-black font-bold uppercase hover:scale-105 transition-transform flex items-center gap-2"
          style={{ backgroundColor: color, boxShadow: `0 0 20px ${color}` }}
        >
          <RefreshCw className="w-5 h-5" /> {isVictory ? "Replay Mission" : "Reboot System"}
        </button>
        
        <button 
          onClick={() => setGameState(GameState.MENU)}
          className="px-8 py-3 bg-transparent border-2 border-white/20 text-white font-bold uppercase hover:border-white transition-colors flex items-center gap-2"
        >
          <Home className="w-5 h-5" /> Menu
        </button>
      </div>
    </div>
  );
};

export default GameOver;
