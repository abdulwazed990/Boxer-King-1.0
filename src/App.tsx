/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Info, 
  Settings, 
  Zap, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  Download,
  Trophy
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import confetti from 'canvas-confetti';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Constants & Types ---

interface SymbolType {
  id: string;
  name: string;
  img: string;
  value: number;
  isWild?: boolean;
  isScatter?: boolean;
}

const SYMBOLS: SymbolType[] = [
  { id: 'king', name: 'KING', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-01.png', value: 50 },
  { id: 'master', name: 'MASTER', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-02.png', value: 30 },
  { id: 'glove', name: 'GLOVE', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-03.png', value: 20 },
  { id: 'strike', name: 'STRIKE', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-04.png', value: 15 },
  { id: 'wild', name: 'WILD', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-05.png', value: 0, isWild: true },
  { id: 'free', name: 'FREE', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-06.png', value: 0, isScatter: true },
  { id: 'bell', name: 'BELL', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-07.png', value: 10 },
  { id: 'q', name: 'Q', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-11.png', value: 5 },
  { id: 'j', name: 'J', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-12.png', value: 2 },
];

const REEL_COUNT = 5;
const ROW_COUNT = 3;

// --- Components ---

const SymbolIcon = ({ symbol, isWinning }: { symbol: SymbolType; isWinning?: boolean }) => (
  <div className={cn(
    "h-16 w-full flex items-center justify-center relative border border-white/5 rounded-sm overflow-hidden transition-all duration-300",
    symbol.isScatter ? "bg-purple-500/10" : "bg-zinc-900",
    isWinning && "scale-110 z-10 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]"
  )}>
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden group bg-zinc-900/30 rounded-lg">
      <div className="absolute inset-0 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] pointer-events-none" />
      
      {/* Glow effects for special symbols */}
      {symbol.isWild && (
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-400 to-orange-600 opacity-5 blur-xl group-hover:opacity-10 transition-opacity" />
      )}
      {symbol.isScatter && (
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500 to-pink-600 opacity-5 blur-xl group-hover:opacity-10 transition-opacity" />
      )}
      {symbol.id === 'strike' && (
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500 to-blue-800 opacity-5 blur-xl group-hover:opacity-10 transition-opacity" />
      )}
      {symbol.id === 'glove' && (
        <div className="absolute inset-0 bg-gradient-to-b from-red-500 to-red-800 opacity-5 blur-xl group-hover:opacity-10 transition-opacity" />
      )}
      {symbol.id === 'master' && (
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600 to-cyan-400 opacity-5 blur-xl group-hover:opacity-10 transition-opacity" />
      )}
      {symbol.id === 'king' && (
        <div className="absolute inset-0 bg-gradient-to-b from-red-600 to-orange-600 opacity-5 blur-xl group-hover:opacity-10 transition-opacity" />
      )}

      <div className="relative z-10 w-full h-full p-1 flex items-center justify-center">
        <img 
          src={symbol.img} 
          alt={symbol.name}
          className={cn(
            "w-full h-full object-contain transition-transform duration-300 group-hover:scale-110",
            (symbol.isWild || symbol.isScatter) && "animate-pulse"
          )}
          style={{ mixBlendMode: 'multiply', filter: 'contrast(1.2) brightness(1.1)' }}
          referrerPolicy="no-referrer"
        />
      </div>
      
      <div className="absolute bottom-0.5 right-1 text-[6px] font-bold text-white/20 uppercase italic tracking-widest">
        {symbol.name}
      </div>

      {isWinning && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1.05 }}
          className="absolute inset-0 border-2 border-yellow-500 rounded-lg pointer-events-none"
        />
      )}
    </div>
  </div>
);

export default function App() {
  const [balance, setBalance] = useState(2690);
  const [bet, setBet] = useState(10);
  const [winAmount, setWinAmount] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showBigWin, setShowBigWin] = useState(false);
  const [reels, setReels] = useState<SymbolType[][]>(
    Array(REEL_COUNT).fill(null).map(() => 
      Array(ROW_COUNT).fill(null).map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
    )
  );
  const [winningCells, setWinningCells] = useState<boolean[][]>(
    Array(REEL_COUNT).fill(null).map(() => Array(ROW_COUNT).fill(false))
  );

  const spinAudio = useRef<HTMLAudioElement | null>(null);
  const winAudio = useRef<HTMLAudioElement | null>(null);

  const handleSpin = useCallback(() => {
    if (isSpinning || balance < bet) return;

    setIsSpinning(true);
    setShowBigWin(false);
    setWinAmount(0);
    setBalance(prev => prev - bet);
    setWinningCells(Array(REEL_COUNT).fill(null).map(() => Array(ROW_COUNT).fill(false)));

    // Simulate spinning delay
    setTimeout(() => {
      const newReels = Array(REEL_COUNT).fill(null).map(() => 
        Array(ROW_COUNT).fill(null).map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
      );
      setReels(newReels);

      // Simple win detection (3 or more of the same symbol in a row)
      let totalWin = 0;
      const newWinningCells = Array(REEL_COUNT).fill(null).map(() => Array(ROW_COUNT).fill(false));
      let hasWin = false;

      for (let r = 0; r < ROW_COUNT; r++) {
        const firstSymbol = newReels[0][r];
        let count = 1;
        for (let c = 1; c < REEL_COUNT; c++) {
          if (newReels[c][r].id === firstSymbol.id || newReels[c][r].isWild || firstSymbol.isWild) {
            count++;
          } else {
            break;
          }
        }

        if (count >= 3) {
          hasWin = true;
          const winValue = (firstSymbol.isWild ? SYMBOLS[0].value : firstSymbol.value) * count * (bet / 10);
          totalWin += winValue;
          for (let c = 0; c < count; c++) {
            newWinningCells[c][r] = true;
          }
        }
      }

      setWinningCells(newWinningCells);
      setWinAmount(totalWin);
      setBalance(prev => prev + totalWin);
      setIsSpinning(false);

      if (totalWin >= bet * 10) {
        setShowBigWin(true);
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FF4500']
        });
      }
    }, 1200);
  }, [isSpinning, balance, bet]);

  const adjustBet = (amount: number) => {
    setBet(prev => Math.max(10, prev + amount));
  };

  return (
    <div className="h-screen w-full bg-[#050505] text-white font-sans overflow-hidden flex justify-center items-center p-0 md:p-4">
      {/* Main Game Container */}
      <div className="w-full h-full max-w-[500px] bg-black relative overflow-hidden flex flex-col shadow-[0_0_60px_rgba(255,0,0,0.7)] md:rounded-[20px] md:border md:border-red-900/30">
        
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[#0a0010] z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_#1a0033_0%,_#050005_100%)]" />
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-20 left-[-10%] w-[60%] h-[60%] bg-pink-600/20 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute top-20 right-[-10%] w-[60%] h-[60%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
          
          {/* Decorative Ring */}
          <div className="absolute top-[2%] left-1/2 -translate-x-1/2 w-[140%] aspect-[2/1] opacity-30">
            <svg viewBox="0 0 800 400" className="w-full h-full">
              <path d="M50 200 Q400 50 750 200 Q400 350 50 200" fill="none" stroke="#444" stroke-width="10" />
              <circle cx="150" cy="145" r="8" fill="#fff" />
              <circle cx="250" cy="135" r="8" fill="#fff" />
              <circle cx="400" cy="120" r="8" fill="#fff" />
              <circle cx="550" cy="135" r="8" fill="#fff" />
              <circle cx="650" cy="145" r="8" fill="#fff" />
            </svg>
          </div>
        </div>

        {/* Game Content */}
        <div className="relative z-10 flex flex-col h-full">
          
          {/* Header */}
          <div className="pt-6 pb-0 flex flex-col items-center shrink-0 relative z-50">
            <motion.h1 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-black italic tracking-tighter bg-gradient-to-b from-yellow-200 via-yellow-500 to-orange-600 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
            >
              BOXING KING
            </motion.h1>
            <div className="flex gap-1 mt-0.5">
              {[1, 2, 3].map(i => (
                <Flame key={i} className="w-2.5 h-2.5 text-orange-500 fill-current" />
              ))}
            </div>
          </div>

          {/* Character / Visual Area */}
          <div className="flex-1 relative flex items-center justify-center min-h-0">
            <div className="w-full h-full max-h-[44vh]">
              <div className="relative w-full h-full flex items-end justify-center">
                <motion.div 
                  animate={{ 
                    y: isSpinning ? [0, -5, 0] : 0,
                    filter: isSpinning ? 'brightness(1.2) contrast(1.1)' : 'brightness(1) contrast(1)'
                  }}
                  transition={{ repeat: isSpinning ? Infinity : 0, duration: 0.2 }}
                  className="relative z-10 w-full h-full flex items-end justify-center"
                >
                  <div className="relative w-full h-full flex items-end justify-center overflow-visible">
                    <img 
                      src="https://supremeking.live/wp-content/uploads/2024/08/picks-image.png" 
                      alt="Boxing King"
                      className="w-full h-full object-contain object-bottom drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] scale-115 origin-bottom"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/40 to-transparent mix-blend-multiply" />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Big Win Overlay */}
            <AnimatePresence>
              {showBigWin && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl overflow-hidden"
                >
                  <motion.div 
                    animate={{ scale: [1, 1.3, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="absolute w-[600px] h-[600px] bg-yellow-500/20 rounded-full blur-[120px]"
                  />
                  
                  <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <motion.div 
                      initial={{ y: -100, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="absolute top-16 z-20 text-center"
                    >
                      <motion.h2 
                        animate={{ scale: [1, 1.1, 1], rotate: [0, 2, -2, 0] }}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                        className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-400 to-orange-700 italic tracking-tighter drop-shadow-[0_15px_40px_rgba(0,0,0,1)]"
                      >
                        BIG WIN!
                      </motion.h2>
                    </motion.div>

                    <motion.div 
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="relative w-80 h-80 md:w-[450px] md:h-[450px] z-10"
                    >
                      <div className="w-full h-full rounded-full overflow-hidden border-8 border-yellow-500 shadow-[0_0_100px_rgba(255,215,0,0.7)] relative">
                        <img 
                          src="https://supremeking.live/wp-content/uploads/2024/08/picks-image.png" 
                          alt="Boxing King Big Win"
                          className="w-full h-full object-cover"
                          style={{ filter: 'brightness(1.2) contrast(1.2)' }}
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      </div>
                      
                      {/* Shine effect */}
                      <motion.div 
                        animate={{ left: ['-100%', '200%'] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        className="absolute top-1/2 right-0 w-40 h-40 bg-white rounded-full blur-3xl opacity-0"
                        style={{ transform: 'scale(0.5)' }}
                      />
                    </motion.div>

                    <motion.div 
                      initial={{ y: 100, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="absolute bottom-20 z-20 text-center"
                    >
                      <div className="text-7xl font-black text-white drop-shadow-[0_10px_25px_rgba(0,0,0,0.9)]">
                        <span className="text-yellow-400">$</span>{winAmount}
                      </div>
                      <div className="text-yellow-500 font-bold tracking-[0.6em] mt-3 text-base uppercase">
                        Mega Payout
                      </div>
                    </motion.div>

                    {/* KO Text Background */}
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="absolute text-[12rem] font-black text-red-600 italic opacity-0 pointer-events-none select-none drop-shadow-2xl"
                    >
                      KO!
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Small Win Indicator */}
            <AnimatePresence>
              {winAmount > 0 && !showBigWin && (
                <motion.div 
                  initial={{ y: 50, opacity: 0, scale: 0 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: -50, opacity: 0 }}
                  className="absolute z-30 font-black text-5xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-orange-500 drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)] italic tracking-tighter"
                >
                  WIN!
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Slot Grid Area */}
          <div className="px-3 py-2 shrink-0">
            <div className="bg-gradient-to-b from-zinc-800 to-zinc-950 rounded-xl border-2 border-zinc-700 p-1 shadow-xl relative">
              <div className="grid grid-cols-5 gap-0.5 bg-black rounded-lg overflow-hidden h-[192px] relative">
                {reels.map((reel, colIndex) => (
                  <div key={colIndex} className="relative h-full overflow-hidden">
                    <motion.div 
                      animate={{ 
                        y: isSpinning ? [0, -500] : 0 
                      }}
                      transition={{ 
                        repeat: isSpinning ? Infinity : 0, 
                        duration: 0.1,
                        ease: "linear"
                      }}
                      className="flex flex-col gap-0.5"
                    >
                      {reel.map((symbol, rowIndex) => (
                        <div key={`${colIndex}-${rowIndex}`}>
                          <SymbolIcon 
                            symbol={symbol} 
                            isWinning={winningCells[colIndex][rowIndex]}
                          />
                        </div>
                      ))}
                    </motion.div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="bg-gradient-to-t from-black to-zinc-900 border-t border-zinc-800 p-3 pb-6 shrink-0">
            <div className="flex flex-col gap-3">
              
              {/* Stats Bar */}
              <div className="flex justify-between items-center bg-zinc-950/80 rounded-xl px-4 py-2 border border-zinc-800">
                <div className="flex flex-col">
                  <span className="text-[8px] text-zinc-500 uppercase font-bold">Balance</span>
                  <span className="font-mono text-sm font-bold text-yellow-500">${balance.toFixed(2)}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-zinc-500 uppercase font-bold">Win</span>
                  <span className="text-sm font-black text-emerald-400 italic">${winAmount.toFixed(2)}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[8px] text-zinc-500 uppercase font-bold">Bet</span>
                  <span className="font-mono text-sm font-bold text-white">{bet}</span>
                </div>
              </div>

              {/* Main Buttons */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1.5">
                  <button className="w-9 h-9 flex items-center justify-center bg-zinc-800 rounded-lg text-zinc-400">
                    <Info className="w-4 h-4" />
                  </button>
                  <button className="w-9 h-9 flex items-center justify-center bg-zinc-800 rounded-lg text-zinc-400">
                    <Settings className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button className="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all border-zinc-700 text-zinc-500">
                    <Zap className="w-5 h-5" />
                  </button>
                  
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSpin}
                    disabled={isSpinning}
                    className={cn(
                      "w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all relative group",
                      isSpinning ? "bg-zinc-800" : "bg-gradient-to-br from-red-500 via-red-600 to-red-800"
                    )}
                  >
                    <div className="absolute inset-1 rounded-full border border-white/20" />
                    <span className="font-black text-xl italic tracking-tighter text-center leading-none">
                      {isSpinning ? "..." : "SPIN"}
                    </span>
                  </motion.button>

                  <button className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-zinc-700 text-zinc-500">
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-col items-center bg-zinc-800 px-1 rounded-xl border border-zinc-700">
                  <button onClick={() => adjustBet(10)} className="p-1 text-zinc-400">
                    <ChevronRight className="w-4 h-4 rotate-[-90deg]" />
                  </button>
                  <span className="font-black text-xs text-yellow-500">{bet}</span>
                  <button onClick={() => adjustBet(-10)} className="p-1 text-zinc-400">
                    <ChevronLeft className="w-4 h-4 rotate-[-90deg]" />
                  </button>
                </div>

                <button 
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-800 border border-zinc-700 text-yellow-500 hover:bg-zinc-700 transition-colors"
                  title="Download Game"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
