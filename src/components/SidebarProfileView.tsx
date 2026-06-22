import React, { useState } from 'react';
import { User, LogOut, Check, Sliders } from 'lucide-react';
import { UserProfile } from '../types';

interface SidebarProfileViewProps {
  userProfile: UserProfile | null;
  uploadAvatar: (file: File) => Promise<void>;
  deleteAvatar: () => Promise<void>;
  updateMyProfile: (
    displayName: string,
    bio: string,
    statusMessage: string,
    photoURL?: string,
    emojiStatus?: string,
    phoneNumber?: string,
    privacySettings?: any,
    birthday?: string,
    customSettings?: any
  ) => Promise<void>;
  logout: () => void;
  language: 'ru' | 'en';
}

export const SidebarProfileView: React.FC<SidebarProfileViewProps> = ({
  userProfile,
  uploadAvatar,
  deleteAvatar,
  updateMyProfile,
  logout,
  language
}) => {
  const [editDisplayName, setEditDisplayName] = useState(userProfile?.displayName || '');
  const [editBio, setEditBio] = useState(userProfile?.bio || '');
  const [editStatus, setEditStatus] = useState(userProfile?.statusMessage || '');
  const [editEmojiStatus, setEditEmojiStatus] = useState(userProfile?.emojiStatus || '');
  const [editPhoneNumber, setEditPhoneNumber] = useState(userProfile?.phoneNumber || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await updateMyProfile(
        editDisplayName,
        editBio,
        editStatus,
        undefined,
        editEmojiStatus,
        editPhoneNumber
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      alert(language === 'ru' ? 'Ошибка сохранения: ' + err.message : 'Error description: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 text-slate-100 font-sans select-none scrollbar-hidden">
      {/* Header Area */}
      <div className="p-4 border-b border-white/5 flex flex-col gap-1.5 shrink-0" style={{ background: 'rgba(255, 255, 255, 0.01)' }}>
        <h2 className="text-base font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <User className="w-5 h-5 text-cyan-400" />
          {language === 'ru' ? 'Мой Профиль' : 'My Profile'}
        </h2>
        <span className="text-[10px] text-slate-400 font-medium">
          {language === 'ru' ? 'Персонализация вашего аккаунта VI' : 'Manage your VI workspace identity'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        {/* Avatar Area */}
        <div className="flex flex-col items-center gap-2.5 pb-4 border-b border-white/5">
          <div className="relative group w-20 h-20">
            <img 
              src={userProfile?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userProfile?.displayName || 'VI')}`} 
              alt={userProfile?.displayName} 
              className="w-20 h-20 rounded-full border-2 border-cyan-500/30 object-cover shadow-xl bg-slate-950" 
            />
            <label className="absolute inset-0 bg-black/70 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer text-center p-1 border border-white/15">
              <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-wider">{language === 'ru' ? 'Изменить' : 'Choose'}</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      await uploadAvatar(file);
                    } catch (err: any) {
                      alert(language === 'ru' ? 'Ошибка: ' + err.message : 'Error: ' + err.message);
                    }
                  }
                }}
                className="hidden" 
              />
            </label>
          </div>
          {userProfile?.photoURL && !userProfile.photoURL.includes('dicebear') && (
            <button 
              onClick={async () => {
                if (window.confirm(language === 'ru' ? 'Удалить аватар?' : 'Delete avatar?')) {
                  await deleteAvatar();
                }
              }}
              className="text-[9px] font-semibold text-rose-400 hover:text-rose-300 underline cursor-pointer hover:bg-rose-500/10 px-2 py-1 rounded"
            >
              {language === 'ru' ? 'Удалить фото' : 'Delete photo'}
            </button>
          )}

          <div className="text-center">
            <div className="font-semibold text-sm text-slate-100">{userProfile?.displayName}</div>
            <div className="text-xs font-mono text-cyan-400 mt-0.5">@{userProfile?.username}</div>
            <div className="text-[9px] text-slate-500 font-mono mt-1">
              {language === 'ru' ? 'Аккаунт зарегистрирован:' : 'Member since:'} {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>

        {/* Profile Inputs Form */}
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wide mb-1.5">
              {language === 'ru' ? 'Имя в системе' : 'Display Name'}
            </label>
            <input 
              type="text" 
              value={editDisplayName} 
              onChange={(e) => setEditDisplayName(e.target.value)}
              className="w-full bg-black/15 text-slate-100 border border-white/5 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--glass-border-focus)] focus:bg-black/25 focus:ring-0 transition-all font-sans" 
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wide mb-1.5">
                {language === 'ru' ? 'Смайлик' : 'Emoji Badge'}
              </label>
              <input 
                type="text" 
                placeholder="🚀, 💻, 🌴"
                value={editEmojiStatus} 
                onChange={(e) => setEditEmojiStatus(e.target.value)}
                maxLength={4}
                className="w-full bg-black/15 text-slate-100 border border-white/5 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--glass-border-focus)] focus:bg-black/25 focus:ring-0 transition-all font-mono text-center" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wide mb-1.5">
                {language === 'ru' ? 'Номер телефона' : 'Phone'}
              </label>
              <input 
                type="text" 
                placeholder="+1..."
                value={editPhoneNumber} 
                onChange={(e) => setEditPhoneNumber(e.target.value)}
                className="w-full bg-black/15 text-slate-100 border border-white/5 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--glass-border-focus)] focus:bg-black/25 focus:ring-0 transition-all font-mono" 
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wide mb-1.5">
              {language === 'ru' ? 'Дополнительный Статус' : 'Status Message'}
            </label>
            <input 
              type="text" 
              value={editStatus} 
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full bg-black/15 text-slate-100 border border-white/5 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--glass-border-focus)] focus:bg-black/25 focus:ring-0 transition-all font-sans" 
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wide mb-1.5">
              {language === 'ru' ? 'О себе (Описание)' : 'About Bio'}
            </label>
            <textarea 
              value={editBio} 
              onChange={(e) => setEditBio(e.target.value)}
              placeholder={language === 'ru' ? 'Короткий рассказ о себе...' : 'Write team details...'}
              className="w-full h-16 bg-black/15 text-slate-100 border border-white/5 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--glass-border-focus)] focus:bg-black/25 focus:ring-0 transition-all font-sans resize-none" 
            />
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button 
              type="submit"
              disabled={isSaving}
              className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow transition active:scale-95 ${
                saveSuccess 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-[var(--glass-accent)] text-white hover:opacity-95'
              }`}
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  {language === 'ru' ? 'Изменения внесены!' : 'Changes Saved!'}
                </>
              ) : (
                isSaving ? '...' : (language === 'ru' ? 'Сохранить профиль' : 'Save Profile')
              )}
            </button>
            
            <button 
              onClick={logout}
              type="button"
              className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/15 text-rose-400 rounded-xl text-xs font-bold tracking-wide transition duration-150 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              {language === 'ru' ? 'Выйти из системы' : 'Revoke Session / Logout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
