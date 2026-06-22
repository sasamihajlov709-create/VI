import React, { useState } from 'react';
import { Users, UserPlus, Sparkles, Pin } from 'lucide-react';
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
    } catch (err: any) {
      setErrorMsg(err.message || (language === 'ru' ? 'Имя пользователя не найдено' : 'Specified username is missing'));
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 text-slate-100 font-sans">
      {/* Header Area */}
      <div className="p-4 border-b border-white/5 flex flex-col gap-1.5" style={{ background: 'rgba(255, 255, 255, 0.01)' }}>
        <h2 className="text-base font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" />
          {language === 'ru' ? 'Контакты' : 'Contacts'}
        </h2>
        <span className="text-[10px] text-slate-400 font-medium">
          {language === 'ru' ? `${contactsList.length} в вашей записной книжке` : `${contactsList.length} connections in your book`}
        </span>
      </div>

      {/* Add Contact Form Segment */}
      <div className="p-4 border-b border-white/5 bg-black/10">
        <form onSubmit={handleAddContactSubmit} className="space-y-2">
          <label className="block text-[10px] uppercase font-mono tracking-wider text-cyan-400/80 font-bold">
            {language === 'ru' ? 'Новый контакт по @username' : 'New connection via @username'}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-2 py-0.5 text-xs text-slate-500 font-mono">@</span>
              <input 
                type="text"
                placeholder={language === 'ru' ? 'colleague_name' : 'colleague_name'}
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full pl-7.5 pr-3 py-2 bg-black/15 text-xs rounded-xl border border-white/5 focus:border-[var(--glass-border-focus)] focus:bg-black/25 focus:outline-none placeholder-slate-600 text-slate-100 transition-all font-mono"
              />
            </div>
            <button 
              type="submit"
              disabled={isAdding}
              className="px-4 py-2 bg-[var(--glass-accent)] hover:opacity-95 disabled:opacity-30 text-white text-xs font-semibold rounded-xl cursor-pointer shadow transition active:scale-95 shrink-0"
            >
              {isAdding ? '...' : (language === 'ru' ? 'Добавить' : 'Add')}
            </button>
          </div>

          {/* Feedback alerts */}
          {errorMsg && (
            <p className="text-[10px] text-rose-400 font-semibold leading-tight pt-1 animate-fade-in pl-1">
              ⚠️ {errorMsg}
            </p>
          )}
          {successMsg && (
            <p className="text-[10px] text-emerald-400 font-semibold leading-tight pt-1 animate-fade-in pl-1">
              ✓ {successMsg}
            </p>
          )}
        </form>
      </div>

      {/* Contacts List stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
        {contactsList.length === 0 ? (
          <div className="py-14 text-center space-y-3 px-4">
            <div className="w-10 h-10 bg-slate-900 rounded-full border border-white/5 flex items-center justify-center mx-auto text-slate-500">
              <UserPlus className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-300">
                {language === 'ru' ? 'Контакты не обнаружены' : 'No connections here yet'}
              </p>
              <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] mx-auto leading-relaxed">
                {language === 'ru' 
                  ? 'Введите @username вашего коллеги выше для незамедлительного старта диалога.' 
                  : 'Specify @username of your team member above to start chat securely.'}
              </p>
            </div>
          </div>
        ) : (
          contactsList.map((contact) => {
            const isOnline = onlineUsers[contact.uid] === 'online';
            return (
              <div 
                key={contact.uid}
                onClick={async () => {
                  await createDirectChat(contact);
                  setSidebarView('chats');
                }}
                className="flex items-center gap-3 p-2.5 hover:bg-white/[0.03] rounded-xl cursor-pointer transition-all border border-transparent hover:border-white/[0.02]"
              >
                {/* Avatar with Status indicator */}
                <div className="relative">
                  <img 
                    src={contact.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(contact.displayName)}`} 
                    alt={contact.displayName} 
                    className="w-10 h-10 rounded-full object-cover border border-white/5 bg-slate-950"
                  />
                  <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-1.5 border-[#0F0F12] ${
                    isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-500'
                  }`} />
                </div>

                {/* Meta details */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-baseline justify-between gap-1 mb-0.5">
                    <h4 className="text-xs font-bold text-slate-200 truncate leading-tight">
                      {contact.displayName}
                    </h4>
                    {contact.emojiStatus && (
                      <span className="text-xs shrink-0">{contact.emojiStatus}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-450 truncate font-mono">
                    @{contact.username}
                  </p>
                  {contact.statusMessage && (
                    <p className="text-[10px] text-slate-400 truncate italic mt-0.5 max-w-[170px]">
                      {contact.statusMessage}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
