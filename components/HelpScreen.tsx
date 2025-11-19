
import React from 'react';
import { GameState } from '../types';
import { ArrowLeft, Keyboard, Crosshair, ShieldAlert, Zap, Smartphone } from 'lucide-react';
import { NEON_BLUE_WIRE, NEON_RED, NEON_YELLOW } from '../constants';

interface HelpScreenProps {
  setGameState: (state: GameState) => void;
}

const HelpScreen: React.FC<HelpScreenProps> = ({ setGameState }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md z-20 text-white overflow-y-auto p-4 font-sans">
      <div className="max-w-2xl w-full border-2 p-6 md:p-10 bg-black relative" style={{ borderColor: NEON_BLUE_WIRE, boxShadow: `0 0 30px ${NEON_BLUE_WIRE}40` }}>
        
        <div className="absolute top-0 left-0 text-black font-bold px-4 py-1 text-sm" style={{ backgroundColor: NEON_BLUE_WIRE }}>
          VECTOR_MANUAL_V3.1
        </div>

        <h2 className="text-4xl md:text-6xl font-black mb-10 tracking-tighter title-font text-center border-b border-gray-800 pb-6" 
            style={{ color: NEON_BLUE_WIRE, textShadow: `0 0 15px ${NEON_BLUE_WIRE}` }}>
          VECTOR MANUAL
        </h2>

        <div className="grid grid-cols-1 gap-8">
          
          {/* Controls */}
          <div className="bg-[#051015] p-6 border relative overflow-hidden" style={{ borderColor: `${NEON_BLUE_WIRE}40` }}>
             <div className="absolute top-0 right-0 p-2 opacity-20 flex flex-col gap-2">
                 <Keyboard className="w-12 h-12 ml-auto" style={{ color: NEON_BLUE_WIRE }} />
                 <Smartphone className="w-12 h-12 ml-auto" style={{ color: NEON_BLUE_WIRE }} />
             </div>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3" style={{ color: NEON_RED }}>
              <span className="inline-block w-2 h-8" style={{ backgroundColor: NEON_RED }}></span>
              基本操作 (CONTROLS)
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
                {/* PC Controls */}
                <ul className="space-y-4 text-gray-300 font-mono text-sm md:text-base">
                  <li className="text-xs text-gray-500 uppercase tracking-widest mb-1">KEYBOARD / PC</li>
                  <li className="flex items-center justify-between border-b border-gray-800 pb-2">
                    <span>移動</span>
                    <span className="font-bold" style={{ color: NEON_BLUE_WIRE }}>WASD / 矢印</span>
                  </li>
                  <li className="flex items-center justify-between border-b border-gray-800 pb-2">
                    <span>ショット</span>
                    <span className="font-bold" style={{ color: NEON_BLUE_WIRE }}>SPACE / ENTER</span>
                  </li>
                   <li className="flex items-center justify-between border-b border-gray-800 pb-2">
                    <span className="text-yellow-400 font-bold flex items-center gap-1"><Zap className="w-3 h-3"/> HYPER</span>
                    <span className="text-yellow-400 font-bold">X + SPACE</span>
                  </li>
                </ul>

                {/* Touch Controls */}
                <ul className="space-y-4 text-gray-300 font-mono text-sm md:text-base">
                  <li className="text-xs text-gray-500 uppercase tracking-widest mb-1">TOUCH / MOBILE</li>
                  <li className="flex items-center justify-between border-b border-gray-800 pb-2">
                    <span>移動 & ショット</span>
                    <span className="font-bold" style={{ color: NEON_BLUE_WIRE }}>画面ドラッグ</span>
                  </li>
                   <li className="flex items-center justify-between border-b border-gray-800 pb-2">
                    <span className="text-yellow-400 font-bold flex items-center gap-1"><Zap className="w-3 h-3"/> HYPER</span>
                    <span className="text-yellow-400 font-bold">ボタンタップ</span>
                  </li>
                </ul>
            </div>
          </div>

          {/* Mechanics */}
          <div className="bg-[#051015] p-6 border" style={{ borderColor: `${NEON_BLUE_WIRE}40` }}>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3" style={{ color: NEON_RED }}>
              <span className="inline-block w-2 h-8" style={{ backgroundColor: NEON_RED }}></span>
              ミッション概要 (MISSION)
            </h3>
            <div className="space-y-5 text-gray-300 leading-relaxed text-sm md:text-base">
              <p className="flex gap-3">
                <Crosshair className="w-6 h-6 shrink-0" style={{ color: NEON_BLUE_WIRE }} />
                <span>
                  <strong className="block mb-1" style={{ color: NEON_BLUE_WIRE }}>電脳空間の突破:</strong> 
                  無限に広がるグリッド領域を進行し、襲い来る不正プログラムやドローンを迎撃してください。
                </span>
              </p>
              <p className="flex gap-3">
                <Zap className="w-6 h-6 text-yellow-400 shrink-0" />
                <span>
                  <strong className="text-yellow-400 block mb-1">ハイパービームシステム:</strong> 
                  30秒ごとにゲージがチャージされます。発動すると10秒間、虹色の極太レーザーを照射し、敵の弾幕を消去しつつ大ダメージを与えます。
                </span>
              </p>
              
              <div className="flex gap-4 items-start mt-6 p-4 border border-red-500/50 bg-red-950/20 relative overflow-hidden">
                 <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhYWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==')] opacity-20"></div>
                 <ShieldAlert className="w-10 h-10 text-red-500 shrink-0 relative z-10" />
                 <div className="relative z-10">
                   <strong className="text-red-500 block text-lg tracking-widest mb-1">WARNING: BOSS APPROACHING</strong>
                   <span className="text-sm text-red-200">
                     一定スコア到達で<span className="font-bold text-white">巨大防衛プログラム</span>が出現します。
                     触手のような有機的な動きをするコアパーツを破壊し、次のウェーブへ進んでください。
                   </span>
                 </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <button 
            onClick={() => setGameState(GameState.MENU)}
            className="group relative px-12 py-4 text-black font-black text-xl uppercase tracking-widest hover:bg-white transition-all duration-200 flex items-center gap-2 clip-path-slant overflow-hidden"
            style={{ backgroundColor: NEON_BLUE_WIRE }}
          >
            <div className="absolute inset-0 bg-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-200"></div>
            <span className="relative z-10 flex items-center gap-2">
              <ArrowLeft className="w-6 h-6" /> メニューに戻る
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpScreen;
