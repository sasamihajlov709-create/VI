import React, { useState } from 'react';
import { User, LogOut, Check, Camera, Trash2, Calendar, History, Smile, Bookmark } from 'lucide-react';
import { motion } from 'motion/react';
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
  createDirectChat: (user: UserProfile) => Promise<any>;
  logout: () => void;
  language: 'ru' | 'en';
}

const PRESET_EMOJIS = ['🚀', '💻', '🌴', '😴', '🤫', '🔥', '🧠', '🍕', '🎉', '🌟', '🍿', '💡'];

export const SidebarProfileView: React.FC<SidebarProfileViewProps> = ({
  userProfile,
  uploadAvatar,
  deleteAvatar,
  updateMyProfile,
  createDirectChat,
  logout,
  language
}) => {
  const [editDisplayName, setEditDisplayName] = useState(userProfile?.displayName || '');
  const [editBio, setEditBio] = useState(userProfile?.bio || '');
  const [editStatus, setEditStatus] = useState(userProfile?.statusMessage || '');
  const [editEmojiStatus, setEditEmojiStatus] = useState(userProfile?.emojiStatus || '');
  const [editPhoneNumber, setEditPhoneNumber] = useState(userProfile?.phoneNumber || '');
  const [editBirthday, setEditBirthday] = useState(userProfile?.birthday || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

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
        editPhoneNumber,
        undefined,
        editBirthday
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      alert(language === 'ru' ? 'Ошибка сохранения: ' + err.message : 'Error saving profile: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 text-slate-100 font-sans select-none scrollbar-hidden">
      {/* Header Area */}
      <div className="pt-6 pb-4 px-5 border-b border-white/10 flex gap-4 shrink-0 bg-white/[0.02] backdrop-blur-3xl shadow-lg">
        <h2 className="text-xl font-black tracking-tight text-slate-100 flex items-center gap-2">
          {language === 'ru' ? 'Мой Профиль' : 'My Profile'}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {/* Profile Card Block */}
        <div className="relative overflow-hidden vision-floating-header rounded-[28px] border border-white/10 shadow-2xl flex flex-col">
          {/* Cover Banner with matching gradient */}
          <div className="h-20 bg-gradient-to-r from-cyan-500/20 via-indigo-500/20 to-purple-500/20 relative border-b border-white/10">
            <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" />
          </div>
          
          <div className="px-5 pb-6 flex flex-col items-center -mt-10 relative z-10">
            <div className="relative group w-24 h-24 mb-3">
              {/* Glowing ring */}
              <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-cyan-500 to-sky-500 opacity-25 group-hover:opacity-45 blur-md transition-all duration-300" />
              
              <img 
                src={userProfile?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userProfile?.displayName || 'VI')}`} 
                alt={userProfile?.displayName} 
                className="w-full h-full rounded-full border-4 border-[#12141a] object-cover shadow-2xl bg-slate-900 relative z-10 transition-transform duration-400 group-hover:scale-[1.05]" 
                referrerPolicy="no-referrer"
              />
              
              {/* Camera Overlay */}
              <label className="absolute inset-0 bg-slate-950/70 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer text-center p-1 border border-white/10 z-20">
                <Camera className="w-4 h-4 text-cyan-400 mb-0.5" />
                <span className="text-[7.5px] font-bold text-cyan-400 uppercase tracking-wider">{language === 'ru' ? 'Изменить' : 'Upload'}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setAvatarLoading(true);
                      try {
                        await uploadAvatar(file);
                      } catch (err: any) {
                        alert(language === 'ru' ? 'Ошибка: ' + err.message : 'Error: ' + err.message);
                      } finally {
                        setAvatarLoading(false);
                      }
                    }
                  }}
                  className="hidden" 
                />
              </label>

              {avatarLoading && (
                <div className="absolute inset-0 bg-slate-950/80 rounded-full flex items-center justify-center z-30">
                  <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            
            {userProfile?.photoURL && !userProfile.photoURL.includes('dicebear') && (
              <button 
                type="button"
                onClick={async () => {
                  if (window.confirm(language === 'ru' ? 'Удалить аватар?' : 'Delete avatar?')) {
                    await deleteAvatar();
                  }
                }}
                className="text-[9px] font-semibold text-rose-400 hover:text-rose-350 hover:bg-rose-500/10 px-2.5 py-1 rounded-lg border border-transparent hover:border-rose-500/10 transition-all flex items-center gap-1 cursor-pointer mb-2"
              >
                <Trash2 className="w-3 h-3" />
                {language === 'ru' ? 'Удалить фото' : 'Delete photo'}
              </button>
            )}

            <div className="text-center mt-1">
              <div className="font-bold text-sm text-slate-100 flex items-center justify-center gap-1.5">
                {userProfile?.displayName}
              </div>
              <div className="text-xs font-mono text-cyan-400/90 mt-0.5">@{userProfile?.username}</div>
              <div className="text-[9px] text-slate-500 font-mono mt-2 bg-black/20 px-2 py-0.5 rounded-full inline-block border border-white/5">
                {language === 'ru' ? 'Регистрация:' : 'Member since:'} {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Saved Messages Quick Access */}
        <motion.button
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.06)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => userProfile && createDirectChat(userProfile)}
          className="w-full p-5 bg-white/[0.03] rounded-[24px] border border-white/10 flex items-center gap-4 cursor-pointer group transition-all shadow-md"
        >
          <div className="w-12 h-12 rounded-[18px] bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 flex items-center justify-center border border-cyan-500/20 group-hover:border-cyan-500/40 transition-colors">
            <Bookmark className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-[15px] font-black text-slate-100 tracking-tight">{language === 'ru' ? 'Избранное' : 'Saved Messages'}</div>
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{language === 'ru' ? 'Ваши заметки и файлы' : 'Your personal cloud storage'}</div>
          </div>
        </motion.button>

        {/* Profile Inputs Form */}
        <form onSubmit={handleProfileSave} className="space-y-4 bg-slate-900/10 p-4 rounded-2xl border border-white/5">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
              {language === 'ru' ? 'Имя в системе' : 'Display Name'}
            </label>
            <input 
              type="text" 
              value={editDisplayName} 
              onChange={(e) => setEditDisplayName(e.target.value)}
              className="w-full bg-black/25 text-slate-100 border border-white/5 px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-cyan-500/30 focus:bg-black/35 focus:ring-1 focus:ring-cyan-500/10 transition-all font-sans" 
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
                {language === 'ru' ? 'Смайлик' : 'Emoji Badge'}
              </label>
              <input 
                type="text" 
                placeholder="🚀, 💻, 🌴"
                value={editEmojiStatus} 
                onChange={(e) => setEditEmojiStatus(e.target.value)}
                maxLength={4}
                className="w-full bg-black/25 text-slate-100 border border-white/5 px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-cyan-500/30 focus:bg-black/35 focus:ring-1 focus:ring-cyan-500/10 transition-all font-mono text-center" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
                {language === 'ru' ? 'Номер телефона' : 'Phone'}
              </label>
              <input 
                type="text" 
                placeholder="+1..."
                value={editPhoneNumber} 
                onChange={(e) => setEditPhoneNumber(e.target.value)}
                className="w-full bg-black/25 text-slate-100 border border-white/5 px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-cyan-500/30 focus:bg-black/35 focus:ring-1 focus:ring-cyan-500/10 transition-all font-mono" 
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 pl-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              {language === 'ru' ? 'Дата рождения' : 'Birthday Date'}
            </label>
            <input 
              type="date" 
              value={editBirthday} 
              onChange={(e) => setEditBirthday(e.target.value)}
              className="w-full bg-black/25 text-slate-100 border border-white/5 px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-cyan-500/30 focus:bg-black/35 focus:ring-1 focus:ring-cyan-500/10 transition-all font-mono" 
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
              {language === 'ru' ? 'Дополнительный Статус' : 'Status Message'}
            </label>
            <input 
              type="text" 
              value={editStatus} 
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full bg-black/25 text-slate-100 border border-white/5 px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-cyan-500/30 focus:bg-black/35 focus:ring-1 focus:ring-cyan-500/10 transition-all font-sans" 
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
              {language === 'ru' ? 'О себе (Описание)' : 'About Bio'}
            </label>
            <textarea 
              value={editBio} 
              onChange={(e) => setEditBio(e.target.value)}
              placeholder={language === 'ru' ? 'Короткий рассказ о себе...' : 'Write profile description...'}
              className="w-full h-18 bg-black/25 text-slate-100 border border-white/5 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-cyan-500/30 focus:bg-black/35 focus:ring-1 focus:ring-cyan-500/10 transition-all font-sans resize-none" 
            />
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <motion.button 
              type="submit"
              disabled={isSaving}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow transition duration-150 ${
                saveSuccess 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_2px_15px_rgba(16,185,129,0.3)]' 
                  : 'bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 font-bold hover:opacity-95'
              }`}
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  {language === 'ru' ? 'Изменения внесены!' : 'Changes Saved!'}
                </>
              ) : (
                isSaving ? '...' : (language === 'ru' ? 'Сохранить профиль' : 'Save Profile')
              )}
            </motion.button>
            
            <motion.button 
              onClick={logout}
              type="button"
              whileTap={{ scale: 0.98 }}
              className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/15 text-rose-400 rounded-xl text-xs font-bold tracking-wide transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              {language === 'ru' ? 'Выйти из системы' : 'Revoke Session / Logout'}
            </motion.button>
          </div>
        </form>
      </div>
    </div>
  );
};
