import React, { useState } from 'react';
import { Users, UserPlus, Sparkles, Pin, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';

interface SidebarContactsViewProps {
  contactsList: UserProfile[];
  globalUsers: UserProfile[];
  onlineUsers: { [key: string]: string };
  addContactByUsername: (username: string) => Promise<void>;
  createDirectChat: (user: UserProfile) => Promise<any>;
  setSidebarView: (view: 'chats' | 'contacts' | 'settings' | 'profile') => void;
  language: 'ru' | 'en';
}

export const SidebarContactsView: React.FC<SidebarContactsViewProps> = ({
  contactsList,
  globalUsers,
  onlineUsers,
  addContactByUsername,
  createDirectChat,
  setSidebarView,
  language
}) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [searchContactQuery, setSearchContactQuery] = useState('');

  const handleAddContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    const targetQuery = usernameInput.trim().replace(/^@/, '');
    if (!targetQuery) {
      setErrorMsg(language === 'ru' ? 'Введите username пользователя' : 'Input user username first');
      return;
    }

    setIsAdding(true);
    try {
      await addContactByUsername(targetQuery);
      setSuccessMsg(language === 'ru' ? 'Контакт успешно добавлен!' : 'Contact successfully appended!');
      setUsernameInput('');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || (language === 'ru' ? 'Имя пользователя не найдено' : 'Specified username is missing'));
    } finally {
      setIsAdding(false);
    }
  };

  const filteredContacts = contactsList.filter(c => {
    const q = searchContactQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.displayName.toLowerCase().includes(q) ||
      c.username.toLowerCase().includes(q) ||
      (c.statusMessage && c.statusMessage.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 text-slate-100 font-sans">
      {/* Header Area */}
      <div className="pt-6 pb-4 px-5 border-b border-white/10 flex gap-4 shrink-0 bg-white/[0.02] backdrop-blur-3xl shadow-lg">
        <h2 className="text-xl font-black tracking-tight text-slate-100 flex items-center gap-2">
          {language === 'ru' ? 'Контакты' : 'Contacts'}
        </h2>
      </div>

      {/* Add Contact Form Segment */}
      <div className="p-5 border-b border-white/10 bg-black/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[60px] pointer-events-none" />
        <form onSubmit={handleAddContactSubmit} className="space-y-3 relative z-10">
          <label className="block text-[10.5px] uppercase font-bold tracking-widest text-cyan-400/90 pl-1">
            {language === 'ru' ? 'Новый контакт по @username' : 'New connection via @username'}
          </label>
          <div className="flex gap-2.5">
            <div className="relative flex-1">
              <span className="absolute left-4 top-3 text-[13px] text-slate-500 font-bold">@</span>
              <input 
                type="text"
                placeholder={language === 'ru' ? 'colleague_name' : 'colleague_name'}
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-black/30 text-[13px] rounded-[18px] border border-white/10 focus:border-cyan-400/50 focus:bg-black/50 focus:outline-none placeholder-slate-600 text-slate-100 transition-all font-bold shadow-inner"
              />
            </div>
            <motion.button 
              type="submit"
              disabled={isAdding}
              whileTap={{ scale: 0.94 }}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-sky-600 hover:opacity-95 disabled:opacity-30 text-white text-[13px] font-black rounded-[18px] cursor-pointer shadow-[0_4px_15px_rgba(6,182,212,0.3)] transition shrink-0 border border-white/10"
            >
              {isAdding ? '...' : (language === 'ru' ? 'Добавить' : 'Add')}
            </motion.button>
          </div>

          {/* Feedback alerts */}
          <AnimatePresence>
            {errorMsg && (
              <motion.p 
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-[10px] text-rose-400 font-semibold leading-tight pt-1 pl-1"
              >
                ⚠️ {errorMsg}
              </motion.p>
            )}
            {successMsg && (
              <motion.p 
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-[10px] text-emerald-400 font-semibold leading-tight pt-1 pl-1"
              >
                ✓ {successMsg}
              </motion.p>
            )}
          </AnimatePresence>
        </form>
      </div>

      {/* Local search in contacts if there are list items */}
      {contactsList.length > 0 && (
        <div className="p-3 border-b border-white/5 bg-black/5 relative">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input 
              type="text"
              placeholder={language === 'ru' ? 'Поиск среди контактов...' : 'Search within contacts...'}
              value={searchContactQuery}
              onChange={(e) => setSearchContactQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-black/15 text-xs rounded-xl border border-white/5 focus:border-cyan-500/20 focus:outline-none placeholder-slate-600 text-slate-100 transition-all font-sans"
            />
          </div>
        </div>
      )}

      {/* Contacts List stream */}
      <div className="flex-1 overflow-y-auto p-3 pb-32 space-y-1.5 custom-scrollbar">
        {filteredContacts.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-14 text-center space-y-8 px-4"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 bg-gradient-to-br from-white/[0.02] to-white/[0.05] rounded-full border border-white/5 flex items-center justify-center mx-auto text-slate-500 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-8 h-8 bg-cyan-500/5 rounded-full blur-lg pointer-events-none" />
                <UserPlus className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-300">
                  {contactsList.length === 0 
                    ? (language === 'ru' ? 'Контакты не обнаружены' : 'No connections here yet')
                    : (language === 'ru' ? 'Ничего не найдено' : 'No contacts matched')}
                </p>
                <p className="text-[10px] text-slate-500 mt-1.5 max-w-[200px] mx-auto leading-relaxed">
                  {contactsList.length === 0 
                    ? (language === 'ru' 
                      ? 'Введите @username вашего коллеги выше для незамедлительного старта диалога.' 
                      : 'Specify @username of your team member above to start chat securely.')
                    : (language === 'ru' ? 'Попробуйте изменить запрос.' : 'Try adjusting your search query.')}
                </p>
              </div>
            </div>

            {contactsList.length === 0 && globalUsers.length > contactsList.length && (
              <div className="text-left space-y-3 px-2">
                <p className="text-[10px] uppercase font-bold text-slate-600 tracking-wider pl-1">
                  {language === 'ru' ? 'Рекомендуемые' : 'Suggested for you'}
                </p>
                <div className="space-y-1.5">
                  {globalUsers.filter(u => !contactsList.find(c => c.uid === u.uid)).slice(0, 3).map(user => (
                    <div key={user.uid} className="flex items-center justify-between p-2 bg-white/[0.02] rounded-xl border border-white/5">
                      <div className="flex items-center gap-2">
                        <img src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName)}`} className="w-7 h-7 rounded-full" />
                        <span className="text-xs font-bold text-slate-300">{user.displayName}</span>
                      </div>
                      <button 
                        onClick={async () => { await addContactByUsername(user.username); }}
                        className="text-[10px] bg-white/5 hover:bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-md transition"
                      >
                        {language === 'ru' ? 'Добавить' : 'Add'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="space-y-1">
            <AnimatePresence initial={false}>
              {filteredContacts.map((contact, idx) => {
                const isOnline = onlineUsers[contact.uid] === 'online';
                return (
                  <motion.div 
                    key={contact.uid}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.3) }}
                    onClick={async () => {
                      await createDirectChat(contact);
                      setSidebarView('chats');
                    }}
                    className="group flex items-center gap-3 p-2.5 bg-white/[0.01] hover:bg-white/[0.04] active:bg-white/[0.02] active:scale-[0.99] rounded-2xl cursor-pointer transition-all border border-transparent hover:border-white/5 shadow-sm"
                  >
                    {/* Avatar with Status indicator */}
                    <div className="relative shrink-0">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      <img 
                        src={contact.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(contact.displayName)}`} 
                        alt={contact.displayName} 
                        className="w-10.5 h-10.5 rounded-full object-cover border border-white/5 bg-slate-950 group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#0F0F12] ${
                        isOnline ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]' : 'bg-slate-500'
                      }`} />
                    </div>

                    {/* Meta details */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-baseline justify-between gap-1 mb-0.5">
                        <h4 className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors truncate leading-tight">
                          {contact.displayName}
                        </h4>
                        {contact.emojiStatus && (
                          <span className="text-xs shrink-0 select-none animate-bounce" style={{ animationDuration: '3s' }}>
                            {contact.emojiStatus}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 group-hover:text-cyan-400/70 transition-colors truncate font-mono">
                        @{contact.username}
                      </p>
                      {contact.statusMessage && (
                        <p className="text-[10.5px] text-slate-400 truncate italic mt-1 max-w-[170px] border-l border-white/5 pl-1.5">
                          {contact.statusMessage}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
