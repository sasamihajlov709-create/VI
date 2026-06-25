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

interface GlassDockProps {
  activeTab: 'chats' | 'contacts' | 'settings' | 'profile';
  setActiveTab: (tab: 'chats' | 'contacts' | 'settings' | 'profile') => void;
  language: string;
  unreadCount?: number;
}

export const GlassDock: React.FC<GlassDockProps> = ({ 
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
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[600] pointer-events-none px-4 w-full max-w-[420px] md:max-w-[380px] pb-safe-bottom">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-panel glass-highlight pointer-events-auto flex items-center justify-between p-1.5 rounded-[30px] shadow-[0_25px_55px_rgba(0,0,0,0.5)] border border-white/10 relative overflow-hidden group/dock"
      >
        {/* Backdrop Blur Layer */}
        <div className="absolute inset-0 bg-[var(--glass-bg)] backdrop-blur-[45px] saturate-[180%] -z-10" />
        
        {/* Subtle Edge Reflection */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        {/* Moving Active Capsule (The Blob) */}
        <div className="absolute inset-0 flex items-center px-1.5 pointer-events-none">
          <div className="relative w-full h-[82%] flex items-center">
             <motion.div
              layoutId="dockActiveCapsule"
              className="absolute h-full bg-white/10 rounded-[24px] border border-white/10 shadow-[inset_0_0.5px_0_rgba(255,255,255,0.2),0_4px_12px_rgba(0,0,0,0.2)]"
              initial={false}
              transition={{
                type: 'spring',
                stiffness: 450,
                damping: 35,
                mass: 0.8
              }}
              style={{
                width: `${100 / tabs.length}%`,
                left: `${(tabs.findIndex(t => t.id === activeTab) * 100) / tabs.length}%`
              }}
            >
              {/* Internal glow for the blob */}
              <div className="absolute inset-0 rounded-[24px] bg-cyan-400/5 blur-[8px]" />
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
                setActiveTab(tab.id);
                if ('vibrate' in navigator) navigator.vibrate(8);
              }}
              className={`relative flex flex-col items-center justify-center py-2 px-1 flex-1 transition-all duration-400 group cursor-pointer z-10 ${
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <motion.div 
                whileTap={{ scale: 0.88 }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-0.5">
                  <Icon 
                    className={`w-[22px] h-[22px] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isActive 
                        ? 'scale-110 stroke-[2.2px] text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]' 
                        : 'scale-100 group-hover:scale-110 opacity-70 group-hover:opacity-100'
                    }`} 
                  />
                  
                  {tab.id === 'chats' && unreadCount > 0 && (
                    <motion.span 
                      initial={{ scale: 0, x: 5, y: -5 }}
                      animate={{ scale: 1, x: 0, y: 0 }}
                      className="absolute -top-1.5 -right-2.5 bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white text-[9px] font-black h-4 min-w-[16px] px-1.5 flex items-center justify-center rounded-full shadow-[0_4px_12px_rgba(6,182,212,0.5)] border border-white/20 z-20"
                    >
                      {unreadCount}
                    </motion.span>
                  )}
                </div>
                <span 
                  className={`text-[10px] tracking-tight transition-all duration-400 ${
                    isActive ? 'font-bold opacity-100 transform translate-y-0' : 'font-medium opacity-50 group-hover:opacity-100 transform translate-y-0.5 group-hover:translate-y-0'
                  }`}
                >
                  {tab.label}
                </span>
              </motion.div>

              {/* Active Tab Indicator Glow Dot */}
              {isActive && (
                <motion.div 
                  layoutId="activeDot"
                  className="absolute -bottom-1 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </motion.div>
    </div>
  );
};
