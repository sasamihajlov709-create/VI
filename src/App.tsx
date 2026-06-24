/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessengerProvider, useMessenger } from './context/MessengerContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { ProfilePanel } from './components/ProfilePanel';
import { CallScreen } from './components/CallScreen';
import { Onboarding } from './components/Onboarding';
import { 
  Lock, 
  Mail, 
  User, 
  Github, 
  ShieldAlert, 
  RefreshCw, 
  UserCheck,
  Globe
} from 'lucide-react';

const MessengerContent: React.FC = () => {
  const { 
    currentUser, 
    userProfile, 
    isAuthInitialized,
    activeChat, 
    isRightPanelOpen, 
    setIsRightPanelOpen,
    activeCall,
    dialerCall,
    loginEmail,
    signupEmail,
    loginGoogle,
    resetPassword,
    theme
  } = useMessenger();

  const { t, language, setLanguage } = useLanguage();

  // Auth local inputs
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');

  const [isLocalStorageOffline, setIsLocalStorageOffline] = useState(!navigator.onLine);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleViewportResize = () => {
      if (window.visualViewport) {
        document.documentElement.style.setProperty('--app-height', `${window.visualViewport.height}px`);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
      window.visualViewport.addEventListener('scroll', handleViewportResize);
      handleViewportResize();
    } else {
      document.documentElement.style.setProperty('--app-height', '100dvh');
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
        window.visualViewport.removeEventListener('scroll', handleViewportResize);
      }
    };
  }, []);

  React.useEffect(() => {
    const handleOnline = () => setIsLocalStorageOffline(false);
    const handleOffline = () => setIsLocalStorageOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (isSignUp) {
        if (!authUsername.trim() || authUsername.trim().length < 3) {
          throw new Error(language === 'ru' ? 'Имя пользователя должно быть не менее 3 символов.' : 'Username must be at least 3 characters long.');
        }
        await signupEmail(authEmail, authPassword, authDisplayName, authUsername);
      } else {
        await loginEmail(authEmail, authPassword);
      }
      
      // Request notifications permission upon successful auth
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      
    } catch (err: any) {
      setAuthError(err.message || (language === 'ru' ? 'Аутентификация не удалась. Пожалуйста, проверьте учетные данные.' : 'Authentication failed. Please verify credentials.'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setResetSuccess('');
    setAuthLoading(true);
    try {
      await resetPassword(authEmail);
      setResetSuccess(language === 'ru' 
        ? 'Инструкции по восстановлению пароля отправлены на ваш email!' 
        : 'Password recovery instructions have been sent to your email!');
    } catch (err: any) {
      setAuthError(err.message || (language === 'ru' 
        ? 'Не удалось отправить email для восстановления пароля.' 
        : 'Failed to send password recovery email.'));
    } finally {
      setAuthLoading(false);
    }
  };

  // 1. Initial bootloader state
  if (!isAuthInitialized || (currentUser !== null && !userProfile)) {
    return (
      <div className={`fixed inset-0 bg-[#0A0A0A] flex flex-col items-center justify-center text-slate-450 select-none ${theme}`}>
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-500 mb-2" />
        <span className="text-sm font-mono tracking-widest text-[11px] uppercase">{t.retrievingSession}</span>
      </div>
    );
  }

  // 2. Authenticated user panel views
  if (currentUser && userProfile) {
    if (!userProfile.isOnboarded) {
      return <Onboarding />;
    }

    return (
      <div 
        className={`flex w-screen text-[var(--glass-text)] overflow-hidden relative font-sans ${theme}`}
        style={{ height: 'var(--app-height, 100dvh)' }}
      >
        {/* Background Ambient Glows (VisionOS Depth) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-40">
           <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] ambient-aurora-glow-1 blur-[120px]" />
           <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] ambient-aurora-glow-2 blur-[120px]" />
        </div>

        {/* Offline connection status bar */}
        {isLocalStorageOffline && (
          <div className="absolute top-0 inset-x-0 bg-red-650/90 text-white py-1 px-4 text-center text-xs font-mono tracking-wider flex items-center justify-center gap-2 z-50 shadow">
            <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
            {t.offlineBanner}
          </div>
        )}

        <div className="flex flex-1 overflow-hidden h-full z-10">
          {/* 1. Left Navigation sidebar */}
          <Sidebar />

          {/* 2. Interactive Feed window */}
          <ChatWindow />

          {/* 3. Details right column metadata (Toggleable desktop drawer) */}
          <AnimatePresence>
            {activeChat && isRightPanelOpen && (
              <>
                {/* Mobile Overlay Background */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsRightPanelOpen(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] lg:hidden"
                />

                {/* The Panel itself (desktop is sliding column, mobile is sliding drawer) */}
                <motion.div 
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: window.innerWidth >= 1024 ? 320 : '85vw', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="fixed right-0 top-0 bottom-0 z-[210] lg:static lg:z-auto lg:shrink-0 overflow-hidden border-l border-white/5 bg-[#0a0f1a] lg:bg-transparent shadow-2xl lg:shadow-none flex flex-col"
                  style={{ maxWidth: '320px' }}
                >
                  <div className="w-full h-full min-w-[280px]">
                    <ProfilePanel />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Floating WebRTC Ringing overlays */}
        {(activeCall || dialerCall) && <CallScreen />}
      </div>
    );
  }

  // 3. Guest authentication wizard login / Onboarding layout
  return (
    <div 
      className={`w-screen flex items-center justify-center p-4 relative overflow-hidden font-sans select-none ${theme}`}
      style={{ height: 'var(--app-height, 100dvh)' }}
    >
      {/* Floating Language Swapper in login */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 glass-panel px-3 py-1.5 rounded-full shadow-lg">
        <Globe className="w-3.5 h-3.5 text-slate-400" />
        <button 
          onClick={() => setLanguage('en')} 
          className={`text-[11px] font-semibold cursor-pointer ${language === 'en' ? 'text-cyan-500 font-bold' : 'text-slate-400 hover:text-cyan-400'}`}
        >
          EN
        </button>
        <span className="text-[10px] text-slate-600">|</span>
        <button 
          onClick={() => setLanguage('ru')} 
          className={`text-[11px] font-semibold cursor-pointer ${language === 'ru' ? 'text-cyan-500 font-bold' : 'text-slate-400 hover:text-cyan-400'}`}
        >
          RU
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-panel glass-highlight rounded-3xl overflow-hidden p-6 relative z-10"
      >
        {/* Branding header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[#C4B4E6] rounded-full flex items-center justify-center font-serif font-extrabold text-[#FFFFFF] shadow-lg shadow-[#C4B4E6]/10 border-2 border-slate-900 mx-auto mb-3 text-3xl">
            V
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">{t.appName}</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {t.loginSubtitle}
          </p>
        </div>

        {isForgotPassword ? (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">
                {language === 'ru' ? 'Электронная почта' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input 
                  type="email" 
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="developer@vix.net"
                  required
                  className="w-full bg-slate-950/60 text-slate-200 border border-slate-800 px-10 py-3 rounded-xl text-xs focus:outline-none focus:border-cyan-500 transition-all placeholder-slate-500 shadow"
                />
              </div>
            </div>

            {/* Success Notification */}
            {resetSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-505/20 rounded-xl text-emerald-450 text-xs font-medium space-y-1">
                <p>{resetSuccess}</p>
              </div>
            )}

            {/* Error notifications */}
            {authError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-medium space-y-1">
                <p>{authError}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={authLoading}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-600 hover:to-sky-600 text-slate-950 font-bold uppercase tracking-wider text-xs rounded-xl shadow-xl shadow-cyan-500/15 cursor-pointer transform active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-55"
            >
              {authLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                language === 'ru' ? 'Получить ссылку' : 'Send reset link'
              )}
            </button>

            <div className="text-center pt-2">
              <span 
                onClick={() => { setIsForgotPassword(false); setAuthError(''); setResetSuccess(''); }}
                className="text-slate-400 hover:text-cyan-400 text-xs cursor-pointer transition underline inline-block"
              >
                {language === 'ru' ? 'Вернуться к входу' : 'Return to login'}
              </span>
            </div>
          </form>
        ) : (
          <>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {/* SignUp exclusive fields */}
              {isSignUp && (
                <>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">
                      {language === 'ru' ? 'Имя человека (ФИО)' : 'Human Name'}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                      <input 
                        type="text" 
                        value={authDisplayName}
                        onChange={(e) => setAuthDisplayName(e.target.value)}
                        placeholder={language === 'ru' ? 'например, Виктор Соколов' : 'e.g. Viktor Sokolov'}
                        required
                        className="w-full bg-slate-950/60 text-slate-200 border border-slate-800 px-10 py-3 rounded-xl text-xs focus:outline-none focus:border-cyan-500 transition-all placeholder-slate-500 shadow"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">
                      {language === 'ru' ? 'Имя пользователя (уникальный ник @)' : 'Username (Unique handle)'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-slate-500 text-sm font-semibold">@</span>
                      <input 
                        type="text" 
                        value={authUsername}
                        onChange={(e) => setAuthUsername(e.target.value)}
                        placeholder="username"
                        required
                        className="w-full bg-slate-950/60 text-slate-200 border border-slate-800 px-9 py-2.5 rounded-xl text-xs focus:outline-none focus:border-cyan-500 transition-all placeholder-slate-500 shadow"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">
                  {language === 'ru' ? 'Электронная почта' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input 
                    type="email" 
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="developer@vix.net"
                    required
                    className="w-full bg-slate-950/60 text-slate-200 border border-slate-800 px-10 py-3 rounded-xl text-xs focus:outline-none focus:border-cyan-500 transition-all placeholder-slate-500 shadow"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">
                  {language === 'ru' ? 'Секретный ключ / Пароль' : 'Secret Key / Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input 
                    type="password" 
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="********"
                    required
                    className="w-full bg-slate-950/60 text-slate-200 border border-slate-800 px-10 py-3 rounded-xl text-xs focus:outline-none focus:border-cyan-500 transition-all placeholder-slate-500 shadow"
                  />
                </div>
                {!isSignUp && (
                  <div className="text-right mt-1.5">
                    <span 
                      onClick={() => { setIsForgotPassword(true); setAuthError(''); setResetSuccess(''); }}
                      className="text-[11px] text-slate-450 hover:text-cyan-400 cursor-pointer transition select-none font-medium"
                    >
                      {language === 'ru' ? 'Забыли пароль?' : 'Forgot your password?'}
                    </span>
                  </div>
                )}
              </div>

              {/* Error visual triggers */}
              {authError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-medium space-y-1">
                  <span className="font-semibold block flex items-center gap-1">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    {language === 'ru' ? 'Предупреждение защиты подключения:' : 'Connection Guard warning:'}
                  </span>
                  <p>{authError}</p>
                </div>
              )}

              <button 
                type="submit" 
                disabled={authLoading}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-600 hover:to-sky-600 text-slate-950 font-bold uppercase tracking-wider text-xs rounded-xl shadow-xl shadow-cyan-500/15 cursor-pointer transform active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-55"
              >
                {authLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  isSignUp ? (language === 'ru' ? 'Создать аккаунт' : 'Construct user') : (language === 'ru' ? 'Войти в систему' : 'Authenticate entry')
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-800 text-center space-y-3.5">
              {/* Google SSO trigger selection */}
              <button 
                onClick={loginGoogle}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 rounded-xl border border-slate-800 text-slate-300 font-semibold text-xs tracking-wide flex items-center justify-center gap-2 cursor-pointer shadow transform active:scale-95 transition"
              >
                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6a5.64 5.64 0 0 1-2.44 3.7l3.78 2.93c2.21-2.03 3.8-5.03 3.8-8.46Z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.78-2.93c-1.05.7-2.4 1.13-4.15 1.13-3.2 0-5.91-2.16-6.87-5.07L1.31 17.38C3.26 21.28 7.31 24 12 24Z"/>
                  <path fill="#FBBC05" d="M5.13 14.22c-.24-.71-.38-1.48-.38-2.27s.14-1.56.38-2.27L1.31 6.74C.47 8.35 0 10.13 0 12s.47 3.65 1.31 5.26l3.82-3.04Z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.72 1.31 6.62l3.82 3.04c.96-2.91 3.67-5.07 6.87-5.07Z"/>
                </svg>
                {language === 'ru' ? 'Подключить Google Аккаунт' : 'Bridge Google Account Authenticator'}
              </button>

              <span 
                onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }}
                className="text-slate-400 hover:text-cyan-400 text-xs cursor-pointer transition underline inline-block"
              >
                {isSignUp ? (language === 'ru' ? 'Уже зарегистрированы? Войдите' : 'Already authenticated? Access current node') : (language === 'ru' ? 'Нет аккаунта? Зарегистрироваться' : 'New device? Build customized user profile')}
              </span>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

import { LogViewer } from './components/LogViewer';

export default function App() {
  return (
    <LanguageProvider>
      <MessengerProvider>
        <MessengerContent />
        <LogViewer />
      </MessengerProvider>
    </LanguageProvider>
  );
}
