import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useMessenger } from '../context/MessengerContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Sparkles,
  User,
  Shield,
  Eye,
  Sliders,
  Bell,
  CheckCircle,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Users,
  Grid,
  Zap
} from 'lucide-react';

export const Onboarding: React.FC = () => {
  const { currentUser, userProfile, completeOnboarding, logout } = useMessenger();
  const { t, language } = useLanguage();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [username, setUsername] = useState(userProfile?.username || '');
  const [bio, setBio] = useState(userProfile?.bio || 'Let\'s collaborate on VI');
  
  // Custom Dicebear styles
  const [avatarStyle, setAvatarStyle] = useState<'adventurer' | 'bottts' | 'fun-emoji' | 'initials'>('adventurer');
  const [avatarSeed, setAvatarSeed] = useState(userProfile?.username || 'vi-node');
  
  // Settings states
  const [theme, setTheme] = useState<'slate' | 'cobalt' | 'light' | 'emerald'>('slate');
  const [density, setDensity] = useState<'cozy' | 'compact' | 'comfortable'>('cozy');
  
  // Privacy states
  const [lastSeenPrivacy, setLastSeenPrivacy] = useState<'all' | 'contacts' | 'nobody'>('all');
  const [statusMessagePrivacy, setStatusMessagePrivacy] = useState<'all' | 'contacts' | 'nobody'>('all');
  
  // Notifications state
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const getGeneratedAvatarUrl = () => {
    return `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(avatarSeed)}`;
  };

  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (!displayName.trim()) {
        setError(language === 'ru' ? 'Введите ваше имя' : 'Please provide your full name');
        return;
      }
      if (!username.trim() || username.length < 3) {
        setError(language === 'ru' ? 'Имя пользователя должно быть не менее 3 символов' : 'Username must be at least 3 characters');
        return;
      }
      // Basic username pattern
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setError(language === 'ru' ? 'Никнейм должен состоять из латинских букв и цифр' : 'Nicknames must contain only letters, numbers or underscores');
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(prev => Math.max(0, prev - 1));
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
      }
    }
  };

  const handleFinish = async () => {
    setError('');
    setLoading(true);
    try {
      await completeOnboarding({
        displayName,
        username,
        photoURL: getGeneratedAvatarUrl(),
        bio,
        theme,
        themeDensity: density,
        privacySettings: {
          lastSeen: lastSeenPrivacy,
          statusMessage: statusMessagePrivacy,
          phoneNumber: 'contacts',
          photoURL: 'all',
          onlineStatus: 'all'
        }
      });
    } catch (err: any) {
      setError(err.message || (language === 'ru' ? 'Произошла ошибка при сохранении' : 'Failed to save onboarding options'));
    } finally {
      setLoading(false);
    }
  };

  const stepsCount = 5;

  return (
    <div className="min-h-screen w-screen bg-[#070708] flex items-center justify-center p-4 relative font-sans select-none overflow-hidden">
      {/* Background ambient noise grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl glass-panel text-slate-100 rounded-3xl overflow-hidden p-6 md:p-8 relative z-10 shadow-2xl border border-white/5 flex flex-col min-h-[520px] justify-between">
        
        {/* Onboarding Header with Progress Dots */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-1.5 font-mono text-cyan-400 font-bold text-xs uppercase tracking-widest">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-spin-slow" />
            <span>Setup Node VI</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: stepsCount }).map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-5 bg-cyan-400 shadow-md shadow-cyan-400/25' : 'w-2 bg-white/10'}`} 
              />
            ))}
          </div>
        </div>

        {/* Content Slider/Frame */}
        <div className="flex-1 py-6 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div 
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: -20, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-2 text-center md:text-left">
                  <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider font-mono bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/10">
                    Step 1: Introduction
                  </span>
                  <h2 className="text-2xl font-black text-slate-100 tracking-tight leading-none pt-1">
                    {language === 'ru' ? 'Добро пожаловать в VI' : 'Welcome to VI'}
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans pt-1">
                    {language === 'ru' 
                      ? 'Ваш узел связи практически готов. Давайте за несколько простых шагов адаптируем мессенджер под ваш персональный стиль работы.' 
                      : 'Your secure node is almost fully established. Let\'s fine-tune the interface and configuration to suit your style in seconds.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-3">
                  <div className="flex items-start gap-3 bg-white/[0.01] border border-white/5 rounded-2xl p-4.5 hover:bg-white/[0.02]">
                    <Zap className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest font-mono">
                        {language === 'ru' ? 'Интерфейс Telegram-Класса' : 'Telegram-Class Speed'}
                      </h4>
                      <p className="text-[11px] text-slate-450 mt-1 leading-relaxed">
                        {language === 'ru' 
                          ? 'Мгновенный отклик, быстрое управление свайпами, закрепы, архив и папки для продуктивной работы.' 
                          : 'High-density components, swift gesture triggers, and intuitive multi-folders organization.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white/[0.01] border border-white/5 rounded-2xl p-4.5 hover:bg-white/[0.02]">
                    <Users className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest font-mono">
                        {language === 'ru' ? 'Гибридные Группы и Каналы' : 'Hybrid Groups & Channels'}
                      </h4>
                      <p className="text-[11px] text-slate-450 mt-1 leading-relaxed">
                        {language === 'ru' 
                          ? 'Создавайте приватные чаты или публичные форумы с поддержкой комментариев.' 
                          : 'Build private workspaces or public community channels with integrated comments.'}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: -20, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider font-mono bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/10">
                    Step 2: Profile Setup
                  </span>
                  <h2 className="text-xl font-bold text-slate-100">
                    {language === 'ru' ? 'Регистрация Профиля' : 'Configure Custom Profile'}
                  </h2>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                      {language === 'ru' ? 'Отображаемое Имя' : 'Display Name'}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                      <input 
                        type="text" 
                        value={displayName} 
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Victor Sokolov"
                        className="w-full bg-slate-950/60 text-slate-200 border border-slate-800 px-10 py-3 rounded-xl text-xs focus:outline-none focus:border-cyan-500 transition-all placeholder-slate-500 shadow"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                      {language === 'ru' ? 'Уникальный Никнейм (@)' : 'Unique UsernameHandle'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm font-semibold">@</span>
                      <input 
                        type="text" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value.toLowerCase())}
                        placeholder="viktors"
                        className="w-full bg-slate-950/60 text-slate-200 border border-slate-800 px-9 py-2.5 rounded-xl text-xs focus:outline-none focus:border-cyan-500 transition-all placeholder-slate-500 shadow"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                      {language === 'ru' ? 'О Себе (Био)' : 'Short Biography'}
                    </label>
                    <textarea 
                      value={bio} 
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={140}
                      rows={2}
                      placeholder={language === 'ru' ? 'Пара слов о вас для коллег...' : 'Some biographical context...'}
                      className="w-full bg-slate-950/60 text-slate-200 border border-slate-800 p-3 rounded-xl text-xs focus:outline-none focus:border-cyan-500 resize-none transition-all placeholder-slate-500 shadow"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: -20, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider font-mono bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/10">
                    Step 3: Avatar Constructor
                  </span>
                  <h2 className="text-xl font-bold text-slate-100">
                    {language === 'ru' ? 'Генератор Аватаров' : 'Avatar Vector Generator'}
                  </h2>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                  <div className="shrink-0 p-2 bg-slate-950/40 border border-white/5 rounded-full shadow-inner relative group">
                    <img 
                      src={getGeneratedAvatarUrl()} 
                      alt="Avatar generator preview" 
                      className="w-24 h-24 object-cover rounded-full bg-slate-900 border-2 border-cyan-500/40 group-hover:border-cyan-500"
                    />
                  </div>

                  <div className="flex-1 w-full space-y-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                        {language === 'ru' ? 'Тип Изображения' : 'Graphic Aesthetic style'}
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(['adventurer', 'bottts', 'fun-emoji', 'initials'] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => setAvatarStyle(s)}
                            className={`py-1.5 text-[9px] font-mono uppercase font-black rounded-lg border cursor-pointer transition-all ${avatarStyle === s ? 'bg-cyan-500/10 text-[var(--glass-accent)] border-cyan-500/20 shadow' : 'bg-transparent border-white/5 text-slate-400 hover:text-slate-200'}`}
                          >
                            {s === 'adventurer' ? 'Hero' : s === 'bottts' ? 'Bot' : s === 'fun-emoji' ? 'Smile' : 'Initials'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                        {language === 'ru' ? 'Генератор Сида (Текст)' : 'Graphic Seed (Customize)'}
                      </label>
                      <input 
                        type="text" 
                        value={avatarSeed} 
                        onChange={(e) => setAvatarSeed(e.target.value)}
                        placeholder="Type anything to randomize generator..."
                        className="w-full bg-slate-950/60 text-slate-200 border border-slate-800 p-2.5 rounded-xl text-xs focus:outline-none focus:border-cyan-500 transition-all placeholder-slate-500 shadow"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: -20, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider font-mono bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/10">
                    Step 4: Aesthetics & Density
                  </span>
                  <h2 className="text-xl font-bold text-slate-100">
                    {language === 'ru' ? 'Персонализация Темы' : 'Theme Preferences'}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 header-indicator">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      {language === 'ru' ? 'Цветовой Профиль' : 'Color Blueprint Theme'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setTheme('slate')}
                        className={`p-3 text-left rounded-xl border transition-all hover:bg-white/[0.01] cursor-pointer ${theme === 'slate' ? 'border-cyan-500 bg-cyan-500/[0.02]' : 'border-white/5 bg-transparent'}`}
                      >
                        <p className="text-xs font-bold text-slate-200">{language === 'ru' ? 'Сумерки' : 'Slate Twilight'}</p>
                        <span className="text-[9px] font-mono text-slate-500">Deep neutral zincs</span>
                      </button>

                      <button 
                        onClick={() => setTheme('cobalt')}
                        className={`p-3 text-left rounded-xl border transition-all hover:bg-white/[0.01] cursor-pointer ${theme === 'cobalt' ? 'border-sky-500 bg-sky-500/[0.02]' : 'border-white/5 bg-transparent'}`}
                      >
                        <p className="text-xs font-bold text-slate-200">{language === 'ru' ? 'Кобальт' : 'Cobalt Space'}</p>
                        <span className="text-[9px] font-mono text-slate-500">Hi-tech custom blues</span>
                      </button>

                      <button 
                        onClick={() => setTheme('emerald')}
                        className={`p-3 text-left rounded-xl border transition-all hover:bg-white/[0.01] cursor-pointer ${theme === 'emerald' ? 'border-emerald-500 bg-emerald-500/[0.02]' : 'border-white/5 bg-transparent'}`}
                      >
                        <p className="text-xs font-bold text-slate-200">{language === 'ru' ? 'Изумруд' : 'Emerald Forest'}</p>
                        <span className="text-[9px] font-mono text-slate-500">Organic workspace greens</span>
                      </button>

                      <button 
                        onClick={() => setTheme('light')}
                        className={`p-3 text-left rounded-xl border transition-all hover:bg-white/[0.01] cursor-pointer ${theme === 'light' ? 'border-amber-500 bg-amber-500/[0.02]' : 'border-white/5 bg-transparent'}`}
                      >
                        <p className="text-xs font-bold text-slate-200">{language === 'ru' ? 'Светлый' : 'Daylight Node'}</p>
                        <span className="text-[9px] font-mono text-slate-500">Sleek grey light theme</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 header-indicator font-medium">
                      <Grid className="w-3.5 h-3.5 text-cyan-400" />
                      {language === 'ru' ? 'Плотность Списков' : 'Interface Density'}
                    </label>
                    <div className="space-y-2">
                      <button 
                        onClick={() => setDensity('cozy')}
                        className={`w-full p-2.5 rounded-xl border text-left transition-all hover:bg-white/[0.01] cursor-pointer flex justify-between items-center ${density === 'cozy' ? 'border-cyan-500 bg-cyan-500/[0.02]' : 'border-white/5 bg-transparent'}`}
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-200">{language === 'ru' ? 'Стандарт' : 'Standard Cozy'}</p>
                          <span className="text-[9px] font-mono text-slate-550">Beautiful readability & balance</span>
                        </div>
                        {density === 'cozy' && <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />}
                      </button>

                      <button 
                        onClick={() => setDensity('compact')}
                        className={`w-full p-2.5 rounded-xl border text-left transition-all hover:bg-white/[0.01] cursor-pointer flex justify-between items-center ${density === 'compact' ? 'border-cyan-500 bg-cyan-500/[0.02]' : 'border-white/5 bg-transparent'}`}
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-200">{language === 'ru' ? 'Плотный' : 'Extreme Compact'}</p>
                          <span className="text-[9px] font-mono text-slate-550">Maximized view, micro spacings</span>
                        </div>
                        {density === 'compact' && <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />}
                      </button>

                      <button 
                        onClick={() => setDensity('comfortable')}
                        className={`w-full p-2.5 rounded-xl border text-left transition-all hover:bg-white/[0.01] cursor-pointer flex justify-between items-center ${density === 'comfortable' ? 'border-cyan-500 bg-cyan-500/[0.02]' : 'border-white/5 bg-transparent'}`}
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-200">{language === 'ru' ? 'Просторный' : 'Comfortable Touch'}</p>
                          <span className="text-[9px] font-mono text-slate-550">Generous padding, touch-friendly</span>
                        </div>
                        {density === 'comfortable' && <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: -20, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider font-mono bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/10">
                    Step 5: Security & Permissions
                  </span>
                  <h2 className="text-xl font-bold text-slate-100">
                    {language === 'ru' ? 'Приватность и Уведомления' : 'Privacy Control & Alerts'}
                  </h2>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                        <Bell className="w-4 h-4 text-cyan-400 shrink-0" />
                        {language === 'ru' ? 'Включить пуш-уведомления' : 'Push Notification Service'}
                      </h4>
                      <p className="text-[10px] text-slate-450 leading-relaxed font-sans max-w-sm">
                        {language === 'ru' 
                          ? 'Получайте мгновенные уведомления о входящих WebRTC звонках и сообщениях напрямую без задержек.' 
                          : 'Highly-requested to hear active ringers or urgent text transfers when browser is minimized.'}
                      </p>
                    </div>
                    <button 
                      onClick={requestNotificationPermission}
                      className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider font-mono rounded-xl cursor-pointer transition flex items-center gap-1 shrink-0 ${notificationsEnabled ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-cyan-500 hover:bg-cyan-600 text-slate-950 shadow-md shadow-cyan-500/10'}`}
                    >
                      {notificationsEnabled ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          {language === 'ru' ? 'Включено' : 'Enabled'}
                        </>
                      ) : (
                        language === 'ru' ? 'Разрешить' : 'Grant flow'
                      )}
                    </button>
                  </div>

                  <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                      <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
                      {language === 'ru' ? 'Базовая защита данных' : 'Default Ingress Privacy'}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Eye className="w-3 h-3 text-cyan-400" />
                          {language === 'ru' ? 'Кто видит статус "В Сети"' : 'Last Seen Visibility'}
                        </label>
                        <select 
                          value={lastSeenPrivacy} 
                          onChange={(e: any) => setLastSeenPrivacy(e.target.value)}
                          className="w-full bg-slate-950/60 text-slate-350 border border-slate-800 p-2 rounded-xl text-xs focus:outline-none"
                        >
                          <option value="all">{language === 'ru' ? 'Все пользователи' : 'Everybody'}</option>
                          <option value="contacts">{language === 'ru' ? 'Только контакты' : 'My Contacts'}</option>
                          <option value="nobody">{language === 'ru' ? 'Никто' : 'Nobody'}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Eye className="w-3 h-3 text-indigo-400" />
                          {language === 'ru' ? 'Кто видит статус-сообщение' : 'Bio Details Visibility'}
                        </label>
                        <select 
                          value={statusMessagePrivacy} 
                          onChange={(e: any) => setStatusMessagePrivacy(e.target.value)}
                          className="w-full bg-slate-950/60 text-slate-350 border border-slate-800 p-2 rounded-xl text-xs focus:outline-none"
                        >
                          <option value="all">{language === 'ru' ? 'Все пользователи' : 'Everybody'}</option>
                          <option value="contacts">{language === 'ru' ? 'Только контакты' : 'My Contacts'}</option>
                          <option value="nobody">{language === 'ru' ? 'Никто' : 'Nobody'}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action errors display */}
        {error && (
          <div className="p-3 mb-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Bottom Navigator Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-white/5">
          {step > 0 ? (
            <button 
              onClick={handleBack} 
              className="px-4 py-2.5 rounded-xl border border-white/5 hover:bg-white/5 text-slate-300 font-bold text-xs uppercase tracking-wider cursor-pointer transition select-none flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4 shrink-0" />
              {language === 'ru' ? 'Назад' : 'Back'}
            </button>
          ) : (
            <button 
              onClick={logout} 
              className="px-4 py-2.5 rounded-xl border border-dashed border-rose-500/15 text-rose-400 hover:bg-rose-500/5 font-bold text-xs uppercase tracking-wider cursor-pointer transition select-none"
            >
              {language === 'ru' ? 'Выход' : 'Log out'}
            </button>
          )}

          {step < stepsCount - 1 ? (
            <button 
              onClick={handleNext} 
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-600 hover:to-sky-600 text-slate-950 font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-cyan-500/10 cursor-pointer transition flex items-center gap-1 font-mono"
            >
              {language === 'ru' ? 'Продолжить' : 'Proceed'}
              <ChevronRight className="w-4 h-4 shrink-0" />
            </button>
          ) : (
            <button 
              onClick={handleFinish} 
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-extrabold text-xs uppercase tracking-widest rounded-xl shadow-xl shadow-amber-500/20 cursor-pointer transition flex items-center gap-1.5 font-mono disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent animate-spin rounded-full shrink-0" />
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 shrink-0" />
                  {language === 'ru' ? 'Запустить VI' : 'Quick Start'}
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
