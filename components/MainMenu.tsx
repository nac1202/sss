
import React from 'react';
import { GameState } from '../types';
import { Play, HelpCircle } from 'lucide-react';
import { NEON_BLUE_WIRE, NEON_RED } from '../constants';

interface MainMenuProps {
  setGameState: (state: GameState) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ setGameState }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 text-white">
      {/* Grid Background Effect */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ 
             backgroundImage: `linear-gradient(${NEON_BLUE_WIRE} 1px, transparent 1px), linear-gradient(90deg, ${NEON_RED} 1px, transparent 1px)`,
             backgroundSize: '40px 40px',
             transform: 'perspective(500px) rotateX(60deg) translateY(0)',
             transformOrigin: 'center bottom'
           }} 
      />

      <div className="relative z-10 mb-16">
        {/* Glitch Shadow Layer - Removed blur for sharp look */}
        <h1 className="text-8xl md:text-[10rem] font-black tracking-tighter title-font absolute top-1 left-1 opacity-70 select-none" 
            style={{ color: NEON_RED }}>
          VECTOR
        </h1>
        {/* Main Text Layer - Removed textShadow for no glow */}
        <h1 className="text-8xl md:text-[10rem] font-black tracking-tighter title-font relative select-none" 
            style={{ 
              color: 'transparent',
              WebkitTextStroke: `3px ${NEON_BLUE_WIRE}`
            }}>
          VECTOR
        </h1>
        <div className="absolute -bottom-4 right-0 font-mono text-red-500 tracking-[1em] text-sm font-bold">
          SYSTEM VER. 3.0
        </div>
      </div>

      <div className="flex flex-col gap-6 w-72 relative z-10">
        <button 
          onClick={() => setGameState(GameState.PLAYING)}
          className="group relative px-8 py-4 bg-black border-2 text-blue-500 font-bold uppercase tracking-[0.2em] hover:bg-blue-500 hover:text-black hover:shadow-[0_0_50px_#3b82f6] transition-all duration-200 flex items-center justify-between overflow-hidden"
          style={{ borderColor: NEON_BLUE_WIRE, color: NEON_BLUE_WIRE }}
        >
          <span>GAME START</span>
          <Play className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          <div className="absolute inset-0 bg-blue-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 mix-blend-difference" style={{ backgroundColor: NEON_BLUE_WIRE }} />
        </button>

        <button 
          onClick={() => setGameState(GameState.HELP)}
          className="group px-8 py-4 bg-black border-2 text-red-500 font-bold uppercase tracking-[0.2em] hover:bg-red-500 hover:text-black hover:shadow-[0_0_50px_#ef4444] transition-all duration-200 flex items-center justify-between"
          style={{ borderColor: NEON_RED, color: NEON_RED }}
        >
          <span>HELP</span>
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-16 font-mono text-blue-400/50 text-sm animate-pulse">
        INSERT COIN OR PRESS START
      </div>
    </div>
  );
};

export default MainMenu;
