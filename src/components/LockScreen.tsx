import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ShieldCheck, RefreshCw } from 'lucide-react';
import { playTapSound, playUnlockSound, playErrorSound } from '../utils/audioEffects';

interface LockScreenProps {
  onUnlock: () => void;
  language: 'ru' | 'en';
  theme: string;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, language, theme }) => {
  const [pin, setPin] = useState('');
  const [errorShake, setErrorShake] = useState(false);
  const [successFade, setSuccessFade] = useState(false);

  const savedPin = localStorage.getItem('vix-passcode-lock') || '';

  const handleNumInput = (num: string) => {
    if (successFade) return;
    playTapSound();
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      
      if (nextPin.length === 4) {
        if (nextPin === savedPin) {
          // Success!
          setSuccessFade(true);
          playUnlockSound();
          if ('vibrate' in navigator) navigator.vibrate([10, 10]);
          setTimeout(() => {
            onUnlock();
          }, 400);
        } else {
          // Wrong PIN
          setTimeout(() => {
            setErrorShake(true);
            playErrorSound();
            if ('vibrate' in navigator) navigator.vibrate([40, 60, 40]);
            setPin('');
            setTimeout(() => setErrorShake(false), 500);
          }, 150);
        }
      }
    }
  };

  const handleBackspace = () => {
    if (successFade) return;
    playTapSound();
    setPin(p => p.slice(0, -1));
  };

  // Keyboard support for desktop convenience!
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (successFade) return;
      if (e.key >= '0' && e.key <= '9') {
        handleNumInput(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        setPin('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pin, successFade]);

  return (
    <div className={`fixed inset-0 bg-[#060813] flex flex-col justify-between p-6 z-[9999] select-none font-sans ${theme}`}>
      {/* Dynamic blurred abstract nodes in background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-30">
        <div className="absolute top-[20%] left-[10%] w-[60%] h-[40%] bg-cyan-500/20 rounded-full blur-[140px]" />
        <div className="absolute bottom-[20%] right-[10%] w-[50%] h-[40%] bg-indigo-500/10 rounded-full blur-[140px]" />
      </div>

      {/* Header section */}
      <div className="w-full text-center pt-8 z-10">
        <div className="flex items-center justify-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
            {language === 'ru' ? 'Защищенный контейнер VI' : 'VI Secure Session'}
          </span>
        </div>
        <h2 className="text-xl font-black text-white tracking-tight">
          {language === 'ru' ? 'Доступ заблокирован' : 'Access Suspended'}
        </h2>
      </div>

      {/* Display and keypad */}
      <div className="w-full max-w-sm mx-auto flex flex-col items-center justify-center py-6 z-10">
        {/* Animated Icon status block */}
        <motion.div 
          animate={
            successFade 
              ? { scale: [1, 1.2, 0.9], opacity: 0 } 
              : errorShake 
                ? { x: [-10, 10, -8, 8, -5, 5, 0] } 
                : { y: [0, -4, 0] }
          }
          transition={{ duration: errorShake ? 0.4 : 2, repeat: errorShake ? 0 : Infinity }}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border transition-all ${
            successFade 
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-450' 
              : errorShake 
                ? 'bg-rose-500/20 border-rose-500/30 text-rose-450' 
                : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
          }`}
        >
          <Lock className="w-6 h-6" />
        </motion.div>

        {/* Enter instruction */}
        <p className={`text-xs font-semibold text-center mb-6 transition-colors duration-250 ${errorShake ? 'text-rose-400' : 'text-slate-400'}`}>
          {errorShake 
            ? (language === 'ru' ? 'Неверный код доступа' : 'Incorrect Passcode') 
            : (language === 'ru' ? 'Введите ваш код-пароль' : 'Enter security PIN code')
          }
        </p>

        {/* PIN Indicators */}
        <div className={`flex justify-center gap-4 mb-10 ${errorShake ? 'animate-bounce' : ''}`}>
          {Array.from({ length: 4 }).map((_, idx) => {
            const isActive = idx < pin.length;
            return (
              <motion.div 
                key={idx}
                animate={{
                  scale: isActive ? [1, 1.3, 1] : 1,
                  backgroundColor: isActive 
                    ? (errorShake ? '#f87171' : '#22d3ee') 
                    : 'rgba(255, 255, 255, 0.08)'
                }}
                className={`w-4 h-4 rounded-full border ${errorShake ? 'border-rose-500/30' : 'border-white/5'}`}
              />
            );
          })}
        </div>

        {/* Core Keypad */}
        <div className="grid grid-cols-3 gap-x-5 gap-y-4 w-full max-w-[260px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button 
              key={num}
              onClick={() => handleNumInput(num)}
              className="w-16 h-16 rounded-full bg-white/[0.03] hover:bg-white/[0.07] active:bg-white/[0.12] text-xl font-bold text-slate-100 border border-white/5 flex items-center justify-center transition-all cursor-pointer mx-auto shadow-sm active:scale-95"
            >
              {num}
            </button>
          ))}
          {/* Reset/Cancel */}
          <button 
            onClick={() => { playTapSound(); setPin(''); }}
            className="w-16 h-16 rounded-full text-xs font-bold text-slate-500 hover:text-slate-350 flex items-center justify-center transition-all cursor-pointer mx-auto active:scale-95"
          >
            {language === 'ru' ? 'СБРОС' : 'CLEAR'}
          </button>
          
          <button 
            onClick={() => handleNumInput('0')}
            className="w-16 h-16 rounded-full bg-white/[0.03] hover:bg-white/[0.07] active:bg-white/[0.12] text-xl font-bold text-slate-100 border border-white/5 flex items-center justify-center transition-all cursor-pointer mx-auto shadow-sm active:scale-95"
          >
            0
          </button>

          {/* Backspace icon trigger */}
          <button 
            onClick={handleBackspace}
            className="w-16 h-16 rounded-full text-xs font-bold text-slate-500 hover:text-slate-350 flex items-center justify-center transition-all cursor-pointer mx-auto active:scale-95"
          >
            ⌫
          </button>
        </div>
      </div>

      {/* Footer system status */}
      <div className="w-full text-center pb-6 z-10">
        <span className="text-[8px] font-mono tracking-widest text-slate-600 uppercase">
          {language === 'ru' ? 'Полное сквозное шифрование' : 'SANDBOX CONTAINER AES-256 ACTIVE'}
        </span>
      </div>
    </div>
  );
};
