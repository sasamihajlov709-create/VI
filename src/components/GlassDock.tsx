/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  MessageSquare, 
  Users, 
  Settings, 
  User,
  LucideIcon
} from 'lucide-react';
import { playTapSound } from '../utils/audioEffects';
import { GlassLayer } from './GlassLayer';

interface GlassDockProps {
  activeTab: 'chats' | 'contacts' | 'settings' | 'profile';
  setActiveTab: (tab: 'chats' | 'contacts' | 'settings' | 'profile') => void;
  language: string;
  unreadCount?: number;
}

export const GlassDock: React.FC<GlassDockProps> = React.memo(({ 
  activeTab, 
  setActiveTab, 
  language,
  unreadCount = 0
}) => {
  const tabs: { id: 'chats' | 'contacts' | 'settings' | 'profile'; label: string; icon: LucideIcon }[] = [
    { id: 'chats', label: language === 'ru' ? 'Чаты' : 'Chats', icon: MessageSquare },
    { id: 'contacts', label: language === 'ru' ? 'Контакты' : 'Contacts', icon: Users },
    { id: 'settings', label: language === 'ru' ? 'Настройки' : 'Settings', icon: Settings },
    { id: 'profile', label: language === 'ru' ? 'Профиль' : 'Profile', icon: User },
  ];

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[600] pointer-events-none px-4 w-full max-w-[340px] md:max-w-[280px] pb-safe-bottom">
      <motion.div 
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <div className="relative group/dock pointer-events-auto">
          {/* Main Glass Vessel - Narrower and Sleeker */}
          <div className="absolute inset-0 bg-[#0a0a0a]/40 backdrop-blur-[32px] rounded-[28px] border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] overflow-hidden" />
          
          <div className="relative flex items-center justify-between px-1 h-[58px]">
            {/* Small Floating Active Indicator */}
            <div className="absolute inset-0 flex items-center px-1 pointer-events-none">
              <div className="relative w-full h-[80%]">
                <motion.div
                  layoutId="dockActiveIndicator"
                  className="absolute h-full bg-white/[0.08] rounded-[22px] border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
                  initial={false}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 35,
                    mass: 1
                  }}
                  style={{
                    width: `${100 / tabs.length}%`,
                    left: `${(tabs.findIndex(t => t.id === activeTab) * 100) / tabs.length}%`
                  }}
                >
                  <div className="absolute inset-0 rounded-[22px] bg-gradient-to-b from-white/5 to-transparent" />
                </motion.div>
              </div>
            </div>

            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    playTapSound();
                    setActiveTab(tab.id);
                    if ('vibrate' in navigator) navigator.vibrate(8);
                  }}
                  className={`relative flex flex-col items-center justify-center h-full flex-1 transition-all duration-300 group cursor-pointer z-10`}
                >
                  <motion.div 
                    whileTap={{ scale: 0.9 }}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <div className="relative">
                      <Icon 
                        className={`w-[20px] h-[20px] transition-all duration-300 ${
                          isActive 
                            ? 'text-cyan-400 stroke-[2.5px] scale-105' 
                            : 'text-slate-400/70 group-hover:text-slate-200 stroke-[2px]'
                        }`} 
                      />
                      
                      {tab.id === 'chats' && unreadCount > 0 && (
                        <motion.span 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1.5 -right-2.5 bg-rose-500 text-white text-[8px] font-black h-3.5 min-w-[14px] px-1 flex items-center justify-center rounded-full shadow-lg border border-white/20 z-20"
                        >
                          {unreadCount}
                        </motion.span>
                      )}
                    </div>
                    <span 
                      className={`text-[9px] font-bold tracking-tight transition-all duration-300 ${
                        isActive ? 'text-white opacity-100' : 'text-slate-500 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1'
                      }`}
                    >
                      {tab.label}
                    </span>
                  </motion.div>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
});
