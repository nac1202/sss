
import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import MainMenu from './components/MainMenu';
import HelpScreen from './components/HelpScreen';
import GameOver from './components/GameOver';
import { GameState } from './types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [finalScore, setFinalScore] = useState(0);

  return (
    <div className="w-full h-screen relative bg-black overflow-hidden select-none">
      {/* Background Logic / Canvas */}
      <GameCanvas 
        gameState={gameState} 
        setGameState={setGameState} 
        setFinalScore={setFinalScore} 
      />

      {/* UI Overlays */}
      {gameState === GameState.MENU && (
        <MainMenu setGameState={setGameState} />
      )}
      
      {gameState === GameState.HELP && (
        <HelpScreen setGameState={setGameState} />
      )}

      {(gameState === GameState.GAME_OVER || gameState === GameState.GAME_CLEARED) && (
        <GameOver 
          score={finalScore} 
          setGameState={setGameState} 
          isVictory={gameState === GameState.GAME_CLEARED}
        />
      )}
      
      {/* Pause Overlay */}
      {gameState === GameState.PAUSED && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
            <h2 className="text-4xl font-bold text-white tracking-widest">PAUSED</h2>
        </div>
      )}

    </div>
  );
};

export default App;
