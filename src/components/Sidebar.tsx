/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  MessageSquare, 
  Users, 
  Tv, 
  Pin, 
  Archive, 
  Settings, 
  Plus, 
  LogOut, 
  UserPlus, 
  X, 
  FolderPlus, 
  Volume2, 
  VolumeX, 
  ChevronRight,
  ShieldAlert,
  FolderOpen,
  Globe
} from 'lucide-react';
import { useMessenger } from '../context/MessengerContext';
import { useLanguage } from '../context/LanguageContext';
import { useVirtual } from '../hooks/useVirtual';
import { Chat, UserProfile, Story } from '../types';
import { logger } from '../lib/logger';

export const Sidebar: React.FC = () => {
  const { 
    currentUser,
    userProfile,
    chats, 
    activeChat, 
    setActiveChat, 
    globalUsers,
    stories,
    viewStory,
    addStoryReaction,
    publishStory,
    theme,
    setTheme,
    logout,
    createDirectChat,
    createGroupOrChannel,
    togglePinChat,
    toggleArchiveChat,
    toggleMuteChat,
    searchUsersByPrefix,
    addContactByUsername,
    contactsList,
    createFolder,
    activeFolder,
    setActiveFolder,
    onlineUsers
  } = useMessenger();

  const { t, language, setLanguage } = useLanguage();

  // Dialog / Modal State Managers
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  
  // Search state
  const [sidebarCtxMenu, setSidebarCtxMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState('');

  // Group / Channel Creation form
  const [chatTypeSelection, setChatTypeSelection] = useState<'group' | 'channel'>('group');
  const [newChatTitle, setNewChatTitle] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [groupRules, setGroupRules] = useState('');
  const [groupWelcome, setGroupWelcome] = useState('');

  // Folder creation form
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderChats, setNewFolderChats] = useState<string[]>([]);

  // Story state
  const [activeStoryView, setActiveStoryView] = useState<UserProfile | null>(null);

  // Settings State fields
  const [editDisplayName, setEditDisplayName] = useState(userProfile?.displayName || '');
  const [editBio, setEditBio] = useState(userProfile?.bio || '');
  const [editStatus, setEditStatus] = useState(userProfile?.statusMessage || '');
  const { updateMyProfile } = useMessenger();

  // Handle live user searching
  const handleQueryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchQuery(term);
    if (term.trim().length > 1) {
      if (term.startsWith('@')) {
        const list = await searchUsersByPrefix(term.substring(1));
        setSearchResults(list);
      } else {
        const list = await searchUsersByPrefix(term);
        setSearchResults(list);
      }
    } else {
      setSearchResults([]);
    }
  };

  // Add mutual contact by username
  const handleAddContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError('');
    setUsernameSuccess('');
    try {
      await addContactByUsername(usernameInput);
      setUsernameSuccess(language === 'ru' ? 'Контакт успешно добавлен!' : 'Contact added successfully!');
      setUsernameInput('');
    } catch (err: any) {
      setUsernameError(err.message || 'Error occurred');
    }
  };

  // Create chat / channel dispatch
  const handleCreateChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatTitle.trim()) return;
    try {
      await createGroupOrChannel(
        newChatTitle,
        chatTypeSelection,
        selectedMembers,
        groupRules,
        groupWelcome
      );
      // Reset
      setShowCreateChat(false);
      setNewChatTitle('');
      setSelectedMembers([]);
      setGroupRules('');
      setGroupWelcome('');
    } catch (e: any) {
      logger.error("Failed to create chat group", { error: e.message });
    }
  };

  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName, 'FolderOpen', newFolderChats);
    setNewFolderName('');
    setNewFolderChats([]);
    setShowFolderModal(false);
  };

  // Handle custom stories file uploads
  const handleStoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const type = file.type.startsWith('video') ? 'video' : 'image';
      try {
        await publishStory(file, type);
        alert(language === 'ru' ? "История успешно загружена и будет доступна 24 часа!" : "Story successfully uploaded and visible for 24 hours!");
      } catch (e: any) {
        logger.error("Failed to upload story asset", { error: e.message });
        alert(language === 'ru' ? "Не удалось загрузить историю." : "Failed to upload story.");
      }
    }
  };

  // Dynamic Filtering of Chats based on Navigation Drawer Folder selection and searching
  const filteredChats = chats.filter(chat => {
    // 1. Apply folder filters
    if (activeFolder === 'direct' && chat.type !== 'direct') return false;
    if (activeFolder === 'groups' && chat.type !== 'group') return false;
    if (activeFolder === 'channels' && chat.type !== 'channel') return false;
    
    const isArchived = chat.archivedIds?.includes(currentUser?.uid || '');
    if (activeFolder === 'archived') {
      if (!isArchived) return false;
    } else {
      // Don't show archived in other lists by default
      if (isArchived) return false;
    }

    // Custom folder items
    if (activeFolder !== 'all' && activeFolder !== 'direct' && activeFolder !== 'groups' && activeFolder !== 'channels' && activeFolder !== 'archived') {
      const folderObj = userProfile?.folders?.find(f => f.id === activeFolder);
      if (folderObj && !folderObj.chatIds.includes(chat.id)) return false;
    }

    // 2. Search query matches title
    if (searchQuery.trim().length > 0 && !searchQuery.startsWith('@')) {
      return chat.title.toLowerCase().includes(searchQuery.toLowerCase());
    }

    return true;
  });

  const listContainerRef = useRef<HTMLDivElement>(null);
  const { virtualItems, totalHeight } = useVirtual({
    itemCount: filteredChats.length,
    itemHeight: 76,
    containerRef: listContainerRef,
    buffer: 5,
  });

  // Calculate stories grouped by user uid representation
  const storiesByUser: { [uid: string]: { user: UserProfile, list: Story[] } } = {};
  stories.forEach((story) => {
    // Exclude blocked or blockedUsers
    const belongsToMe = story.userId === currentUser?.uid;
    const isContact = userProfile?.contacts?.includes(story.userId);
    
    if (belongsToMe || isContact) {
      if (!storiesByUser[story.userId]) {
        storiesByUser[story.userId] = {
          user: {
            uid: story.userId,
            displayName: story.userDisplayName,
            photoURL: story.userPhotoURL,
            username: '',
          } as UserProfile,
          list: []
        };
      }
      storiesByUser[story.userId].list.push(story);
    }
  });

  const getChatTypingIndicator = (chat: Chat) => {
    if (!chat.typing) return null;
    const now = Date.now();
    const typingList = Object.entries(chat.typing)
      .filter(([uid, timestamp]) => uid !== currentUser?.uid && now - (timestamp as number) < 5000)
      .map(([uid]) => {
        const u = globalUsers.find((p) => p.uid === uid);
        return u ? u.displayName : (language === 'ru' ? 'Кто-то' : 'Someone');
      });
    if (typingList.length === 0) return null;
    return typingList.join(', ') + ' ' + (typingList.length > 1 ? (language === 'ru' ? 'печатают...' : 'are typing...') : (language === 'ru' ? 'печатает...' : 'is typing...'));
  };

  return (
    <div className={`w-full md:w-[350px] border-r border-white/5 flex flex-col h-full shrink-0 relative glass-panel ${activeChat ? 'hidden md:flex' : 'flex'}`} style={{ background: 'var(--glass-sidebar-bg)' }}>
      {/* Dynamic Header */}
      <div className="p-4 flex flex-col gap-3 border-b border-white/5" style={{ background: 'rgba(255, 255, 255, 0.01)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center font-bold text-slate-900 shadow-lg shadow-cyan-500/20 glass-highlight">
              VI
            </div>
            <span className="font-semibold tracking-tight text-lg text-slate-100">{t.appName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Elegant Language toggle in header */}
            <button 
              className="p-1 px-1.5 hover:bg-slate-800/60 rounded-lg text-slate-400 hover:text-cyan-400 font-mono font-bold text-[11px] transition-all cursor-pointer border border-[#222]"
              title={language === 'en' ? 'Переключить на русский' : 'Switch to English'}
              onClick={() => setLanguage(language === 'en' ? 'ru' : 'en')}
            >
              {language === 'en' ? 'RU' : 'EN'}
            </button>

            <button 
              className="p-1.5 hover:bg-slate-800/60 rounded-lg text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              title={t.configureChat}
              onClick={() => setShowCreateChat(true)}
            >
              <Plus className="w-5 h-5" />
            </button>
            <button 
              className="p-1.5 hover:bg-slate-800/60 rounded-lg text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              title={t.profileSettings}
              onClick={() => {
                setEditDisplayName(userProfile?.displayName || '');
                setEditBio(userProfile?.bio || '');
                setEditStatus(userProfile?.statusMessage || '');
                setShowSettings(true);
              }}
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              className="p-1.5 hover:bg-slate-800/60 rounded-lg text-slate-400 hover:text-red-400 transition-all cursor-pointer"
              title={t.logout}
              onClick={logout}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Chat / Context Prefix Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
          <input 
            type="text" 
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={handleQueryChange}
            className="w-full pl-9.5 pr-4 py-1.5 bg-black/15 hover:bg-black/25 text-xs rounded-full border border-white/5 focus:border-[var(--glass-border-focus)] focus:bg-black/30 focus:outline-none placeholder-slate-500 text-slate-100 transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Prefix live search results dropdown */}
      {searchResults.length > 0 && (
        <div className="absolute top-[110px] left-0 w-full glass-panel backdrop-blur-xl bg-slate-900/90 dark:bg-slate-950/90 shadow-2xl border-b border-white/5 z-20 max-h-[220px] overflow-y-auto divide-y divide-white/5 rounded-b-2xl">
          <div className="p-2.5 text-[11px] uppercase font-mono text-[var(--glass-accent)] tracking-wider">
            {language === 'ru' ? 'Результаты поиска' : 'Search Results'}
          </div>
          {searchResults.map((user) => (
            <div 
              key={user.uid} 
              onClick={async () => {
                await createDirectChat(user);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="flex items-center gap-3 p-3 hover:bg-[var(--glass-item-active)] cursor-pointer transition-all"
            >
              <img src={user.photoURL} alt={user.displayName} className="w-9 h-9 rounded-full object-cover border border-white/10" />
              <div>
                <div className="text-sm font-medium text-[var(--glass-text)]">{user.displayName}</div>
                <div className="text-xs text-[var(--glass-text-muted)]">@{user.username}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Folders Navigation Strip */}
      <div className="flex border-b border-white/5 text-xs px-2 shadow-sm shrink-0 overflow-x-auto gap-1 py-1 text-slate-400 select-none bg-white/[0.01]">
        <button 
          onClick={() => setActiveFolder('all')}
          className={`px-3 py-1.5 rounded-full transition-all font-medium cursor-pointer ${activeFolder === 'all' ? 'bg-[var(--glass-accent-muted)] text-[var(--glass-accent)] font-semibold border border-[var(--glass-accent)]/15 shadow-sm' : 'hover:bg-white/5 hover:text-slate-200'}`}
        >
          {language === 'ru' ? 'Все' : 'All'}
        </button>
        <button 
          onClick={() => setActiveFolder('direct')}
          className={`px-3 py-1.5 rounded-full transition-all font-medium cursor-pointer ${activeFolder === 'direct' ? 'bg-[var(--glass-accent-muted)] text-[var(--glass-accent)] font-semibold border border-[var(--glass-accent)]/15 shadow-sm' : 'hover:bg-white/5 hover:text-slate-200'}`}
        >
          {language === 'ru' ? 'Личные' : 'Direct'}
        </button>
        <button 
          onClick={() => setActiveFolder('groups')}
          className={`px-3 py-1.5 rounded-full transition-all font-medium cursor-pointer ${activeFolder === 'groups' ? 'bg-[var(--glass-accent-muted)] text-[var(--glass-accent)] font-semibold border border-[var(--glass-accent)]/15 shadow-sm' : 'hover:bg-white/5 hover:text-slate-200'}`}
        >
          {language === 'ru' ? 'Группы' : 'Groups'}
        </button>
        <button 
          onClick={() => setActiveFolder('channels')}
          className={`px-3 py-1.5 rounded-full transition-all font-medium cursor-pointer ${activeFolder === 'channels' ? 'bg-[var(--glass-accent-muted)] text-[var(--glass-accent)] font-semibold border border-[var(--glass-accent)]/15 shadow-sm' : 'hover:bg-white/5 hover:text-slate-200'}`}
        >
          {language === 'ru' ? 'Каналы' : 'Channels'}
        </button>
        <button 
          onClick={() => setActiveFolder('archived')}
          className={`px-3 py-1.5 rounded-full transition-all font-medium cursor-pointer flex items-center gap-1 ${activeFolder === 'archived' ? 'bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/15 shadow-sm' : 'hover:bg-white/5 hover:text-slate-200'}`}
        >
          <Archive className="w-3.5 h-3.5" />
          {language === 'ru' ? 'Архив' : 'Archive'}
        </button>
        {userProfile?.folders?.map((folder) => (
          <button 
            key={folder.id}
            onClick={() => setActiveFolder(folder.id)}
            className={`px-3 py-1.5 rounded-full transition-all font-medium cursor-pointer flex items-center gap-1 ${activeFolder === folder.id ? 'bg-[var(--glass-accent-muted)] text-[var(--glass-accent)] font-semibold border border-[var(--glass-accent)]/15 shadow-sm' : 'hover:bg-white/5 hover:text-slate-200'}`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            {folder.name}
          </button>
        ))}
        <button 
          onClick={() => setShowFolderModal(true)}
          className="p-1 px-1.5 hover:bg-white/5 rounded-full text-slate-500 hover:text-slate-300 transition-all flex items-center cursor-pointer border border-transparent hover:border-white/5"
          title={t.createFolder}
        >
          <FolderPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Horizontal Stories deck */}
      <div className="flex gap-3 px-4 py-3 bg-white/[0.01] border-b border-white/[0.04] select-none overflow-x-auto scrollbar-none">
        {/* Your story publishing bubble */}
        <label className="flex flex-col items-center gap-1 cursor-pointer shrink-0">
          <div className="relative w-12 h-12 rounded-full border-2 border-dashed border-slate-500/30 hover:border-[var(--glass-accent)] flex items-center justify-center transition-all bg-black/10">
            <Plus className="w-5 h-5 text-slate-500 hover:text-[var(--glass-accent)]" />
            {userProfile?.photoURL && (
              <img src={userProfile.photoURL} alt="Me" className="w-10 h-10 rounded-full object-cover opacity-30 absolute inset-1 pointer-events-none" />
            )}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">{t.yourStory}</span>
          <input type="file" accept="image/*,video/*" onChange={handleStoryUpload} className="hidden" />
        </label>

        {Object.keys(storiesByUser).map((uid) => {
          const payload = storiesByUser[uid];
          return (
            <div 
              key={uid} 
              onClick={() => setActiveStoryView(payload.user)}
              className="flex flex-col items-center gap-1 cursor-pointer shrink-0"
            >
              <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-cyan-400 to-sky-500 shadow-md transform active:scale-95 transition-all">
                <img 
                  src={payload.user.photoURL} 
                  alt={payload.user.displayName} 
                  className="w-full h-full rounded-full object-cover bg-slate-950 border-2 border-[#0c1626]" 
                />
              </div>
              <span className="text-[10px] text-slate-300 font-medium max-w-[50px] truncate">
                {payload.user.uid === currentUser?.uid ? (language === 'ru' ? 'Я' : 'Me') : payload.user.displayName.split(' ')[0]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Main Chat List view (Virtualized density) */}
      <div ref={listContainerRef} className="flex-1 overflow-y-auto relative" onClick={() => setSidebarCtxMenu(null)}>
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 h-2/3">
            <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm font-medium">{t.noActiveChats}</p>
            <p className="text-xs text-slate-605 mt-1">{t.noActiveChatsSub}</p>
          </div>
        ) : (
          <div style={{ height: totalHeight, width: '100%', position: 'relative' }}>
            {virtualItems.map((item) => {
              const chat = filteredChats[item.index];
              const hasUnread = currentUser && chat.unreadCounts && (chat.unreadCounts[currentUser.uid] || 0) > 0;
              const unreadCount = currentUser && chat.unreadCounts ? chat.unreadCounts[currentUser.uid] || 0 : 0;
              const isPinned = currentUser && chat.pinnedIds?.includes(currentUser.uid);
              const isArchived = currentUser && chat.archivedIds?.includes(currentUser.uid);
              const isMuted = currentUser && chat.muteIds?.includes(currentUser.uid);
              const isActive = activeChat?.id === chat.id;

              return (
                <div 
                  key={chat.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: item.size,
                    transform: `translateY(${item.start}px)`,
                  }}
                  onClick={() => setActiveChat(chat)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setSidebarCtxMenu(chat.id);
                  }}
                  className={`flex items-center gap-3 border-b border-white/[0.04] cursor-pointer select-none transition-all duration-200 relative ${isActive ? 'bg-white/[0.07] border-l-2 border-[var(--glass-accent)] px-5 py-4' : 'hover:bg-white/[0.03] px-5 py-4'}`}
                >
                  {/* Context Menu Overlay */}
                  {sidebarCtxMenu === chat.id && (
                    <div 
                      className="absolute inset-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-md flex items-center justify-around px-4 rounded-xl shadow-2xl animate-fade-in-up"
                      onClick={(e) => { e.stopPropagation(); setSidebarCtxMenu(null); }}
                      onMouseLeave={() => setSidebarCtxMenu(null)}
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); togglePinChat(chat.id); setSidebarCtxMenu(null); }} 
                        className="flex flex-col items-center gap-1.5 p-2 hover:bg-slate-800 rounded-xl transition text-cyan-400"
                        title={isPinned ? 'Unpin' : 'Pin'}
                      >
                        <Pin className="w-4 h-4" />
                        <span className="text-[10px] uppercase font-bold font-mono tracking-wider">{isPinned ? 'Unpin' : 'Pin'}</span>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleArchiveChat(chat.id); setSidebarCtxMenu(null); }} 
                        className="flex flex-col items-center gap-1.5 p-2 hover:bg-slate-800 rounded-xl transition text-slate-300"
                        title={isArchived ? 'Unarchive' : 'Archive'}
                      >
                        <Archive className="w-4 h-4" />
                        <span className="text-[10px] uppercase font-bold font-mono tracking-wider">{isArchived ? 'Unarchive' : 'Archive'}</span>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleMuteChat(chat.id); setSidebarCtxMenu(null); }} 
                        className="flex flex-col items-center gap-1.5 p-2 hover:bg-slate-800 rounded-xl transition text-slate-300"
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        <span className="text-[10px] uppercase font-bold font-mono tracking-wider">{isMuted ? 'Unmute' : 'Mute'}</span>
                      </button>
                    </div>
                  )}

                  {/* Chat Thumbnail */}
                  <div className="relative">
                    <img 
                      src={chat.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(chat.title)}`} 
                      alt={chat.title} 
                      className="w-11 h-11 rounded-full object-cover shadow-md bg-white/[0.02] border border-white/10" 
                    />
                    {chat.type === 'direct' && (
                      <div className={`w-3 h-3 rounded-full border-2 border-[#121215] absolute right-0 bottom-0 ${
                        chat.members.find(id => id !== currentUser?.uid) && onlineUsers[chat.members.find(id => id !== currentUser?.uid) || ''] === 'online' 
                          ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' 
                          : 'bg-slate-500'
                      }`} />
                    )}
                  </div>

                  {/* Info block */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className="text-sm font-semibold truncate text-slate-200">{chat.title}</h3>
                      {chat.lastMessage && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(chat.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate pr-4">
                      {getChatTypingIndicator(chat) ? (
                        <span className="text-cyan-400 font-medium animate-pulse font-mono text-[11px]">
                          {getChatTypingIndicator(chat)}
                        </span>
                      ) : chat.lastMessage ? (
                        <>
                          <span className="font-medium text-slate-300">
                            {chat.lastMessage.senderId === currentUser?.uid ? (language === 'ru' ? 'Вы: ' : 'You: ') : `${chat.lastMessage.senderName}: `}
                          </span>
                          {chat.lastMessage.text}
                        </>
                      ) : (
                        <span className="italic text-slate-500">
                          {language === 'ru' ? 'Нет сообщений' : 'No messages yet'}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Status metrics */}
                  <div className="flex flex-col items-end justify-center gap-1.5">
                    <div className="flex gap-1.5 items-center">
                      {isMuted && <VolumeX className="w-3 h-3 text-slate-500" />}
                      {isPinned && <Pin className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/10" />}
                    </div>
                    {hasUnread && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-3 ${isMuted ? 'bg-slate-700 text-slate-300' : 'bg-cyan-500 text-slate-900'}`}>
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {showCreateChat && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md glass-panel rounded-2xl overflow-hidden p-5 shadow-2xl relative" style={{ background: 'var(--glass-sidebar-bg)' }}
          >
            <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-4">
              <span className="font-semibold text-[var(--glass-text)]">Configure Platform Chat</span>
              <button onClick={() => setShowCreateChat(false)} className="text-slate-500 hover:text-slate-200 pointer-events-auto cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChatSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-mono tracking-wider text-[var(--glass-accent)] mb-1.5 font-semibold">Conversation Class</label>
                <div className="grid grid-cols-2 gap-2 text-sm text-[var(--glass-text)]">
                  <button 
                    type="button"
                    onClick={() => setChatTypeSelection('group')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer transition-all ${chatTypeSelection === 'group' ? 'border-[var(--glass-accent)] bg-[var(--glass-accent-muted)] text-[var(--glass-accent)] font-semibold' : 'border-white/5 bg-black/10 hover:border-white/10 hover:bg-black/20'}`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Group Chat</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setChatTypeSelection('channel')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer transition-all ${chatTypeSelection === 'channel' ? 'border-[var(--glass-accent)] bg-[var(--glass-accent-muted)] text-[var(--glass-accent)] font-semibold' : 'border-white/5 bg-black/10 hover:border-white/10 hover:bg-black/20'}`}
                  >
                    <Tv className="w-4 h-4" />
                    <span>Channel</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--glass-text-muted)] mb-1">Title</label>
                <input 
                  type="text" 
                  value={newChatTitle}
                  onChange={(e) => setNewChatTitle(e.target.value)}
                  placeholder="Insert title..."
                  className="w-full bg-black/15 text-[var(--glass-text)] border border-white/5 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[var(--glass-border-focus)] focus:bg-black/25 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--glass-text-muted)] mb-1">Rules / Info</label>
                <textarea 
                  value={groupRules}
                  onChange={(e) => setGroupRules(e.target.value)}
                  placeholder="Information or behavior rules..."
                  className="w-full bg-black/15 text-[var(--glass-text)] border border-white/5 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--glass-border-focus)] focus:bg-black/25 transition-all h-16 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--glass-text-muted)] mb-1">Invite Contacts</label>
                <div className="max-h-[120px] overflow-y-auto space-y-1 bg-black/15 p-2 rounded-xl border border-white/5">
                  {contactsList.length === 0 ? (
                    <span className="text-xs text-[var(--glass-text-muted)] italic block p-1">No contacts added yet.</span>
                  ) : (
                    contactsList.map((c) => (
                      <label key={c.uid} className="flex items-center gap-3 p-1.5 hover:bg-[var(--glass-item-active)] rounded-lg cursor-pointer text-xs text-[var(--glass-text)]">
                        <input 
                          type="checkbox"
                          checked={selectedMembers.includes(c.uid)}
                          onChange={() => {
                            setSelectedMembers(prev => 
                              prev.includes(c.uid) ? prev.filter(x => x !== c.uid) : [...prev, c.uid]
                            );
                          }}
                          className="rounded text-[var(--glass-accent)] border-white/10 focus:ring-0 bg-transparent" 
                        />
                        <img src={c.photoURL} alt={c.displayName} className="w-6 h-6 rounded-full" />
                        <span className="font-medium text-[var(--glass-text)]">{c.displayName}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 flex justify-end gap-2 text-sm">
                <button 
                  type="button" 
                  onClick={() => setShowCreateChat(false)}
                  className="px-4 py-2 bg-black/10 hover:bg-black/20 rounded-xl text-[var(--glass-text-muted)] cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[var(--glass-accent)] hover:opacity-90 rounded-xl text-white font-semibold cursor-pointer shadow"
                >
                  Build Chat
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Directory Folder Creation Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md glass-panel rounded-2xl overflow-hidden p-5 shadow-2xl relative" style={{ background: 'var(--glass-sidebar-bg)' }}
          >
            <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-4">
              <span className="font-semibold text-[var(--glass-text)]">Create Navigation Folder</span>
              <button onClick={() => setShowFolderModal(false)} className="text-slate-500 hover:text-slate-200 pointer-events-auto cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFolderSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[var(--glass-text-muted)] mb-1">Folder Name</label>
                <input 
                  type="text" 
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Work, Family, Channels"
                  className="w-full bg-black/15 text-[var(--glass-text)] border border-white/5 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[var(--glass-border-focus)] focus:bg-black/25 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--glass-text-muted)] mb-1">Select Included Chats</label>
                <div className="max-h-[150px] overflow-y-auto space-y-1 bg-black/15 p-2 rounded-xl border border-white/5">
                  {chats.map((c) => (
                    <label key={c.id} className="flex items-center gap-3 p-1.5 hover:bg-[var(--glass-item-active)] rounded-lg cursor-pointer text-xs text-[var(--glass-text)]">
                      <input 
                        type="checkbox"
                        checked={newFolderChats.includes(c.id)}
                        onChange={() => {
                          setNewFolderChats(prev => 
                            prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id]
                          );
                        }}
                        className="rounded text-[var(--glass-accent)] border-white/10 focus:ring-0 bg-transparent" 
                      />
                      <img src={c.photoURL} alt={c.title} className="w-6 h-6 rounded-full" />
                      <span className="font-medium text-[var(--glass-text)]">{c.title}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 flex justify-end gap-2 text-sm">
                <button type="button" onClick={() => setShowFolderModal(false)} className="px-4 py-2 bg-black/10 hover:bg-black/20 rounded-xl text-[var(--glass-text-muted)] cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[var(--glass-accent)] rounded-xl text-white font-semibold shadow hover:opacity-90 cursor-pointer">Save Folder</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Profile Settings Drawer view */}
      {showSettings && (
        <div className="fixed inset-y-0 left-0 w-full sm:w-[350px] border-r border-white/5 shadow-2xl flex flex-col z-50 glass-panel" style={{ background: 'var(--glass-sidebar-bg)' }}>
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
            <span className="font-semibold text-slate-200">My Profile Settings</span>
            <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-slate-200 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 p-5 overflow-y-auto space-y-5">
            {/* Visual Header */}
            <div className="flex flex-col items-center gap-2 pb-4 border-b border-white/5">
              <img src={userProfile?.photoURL} alt={userProfile?.displayName} className="w-20 h-20 rounded-full border-2 border-[var(--glass-accent)] object-cover shadow-xl shadow-cyan-400/5 mb-1" />
              <div className="font-semibold text-lg text-slate-200">{userProfile?.displayName}</div>
              <div className="text-xs font-mono text-[var(--glass-accent)]">@{userProfile?.username}</div>
            </div>

            {/* Premium Theme Selector glass card */}
            <div className="p-3.5 bg-black/15 rounded-2xl border border-white/5 space-y-2">
              <span className="block text-xs font-mono text-slate-400 mb-1 uppercase tracking-wider">
                {language === 'ru' ? 'Выберите тему Glass UI' : 'Select Glass UI Theme'}
              </span>
              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {[
                  { id: 'theme-light-glass', name: language === 'ru' ? 'Светлая' : 'Light', bg: 'bg-slate-200 border-slate-350' },
                  { id: 'theme-dark-glass', name: language === 'ru' ? 'Тёмная' : 'Dark', bg: 'bg-slate-900 border-slate-755' },
                  { id: 'theme-midnight-glass', name: language === 'ru' ? 'Космос' : 'Midnight', bg: 'bg-indigo-950 border-indigo-900' },
                  { id: 'theme-arctic-glass', name: language === 'ru' ? 'Арктика' : 'Arctic', bg: 'bg-sky-200 border-sky-305' },
                  { id: 'theme-ocean-glass', name: language === 'ru' ? 'Океан' : 'Ocean', bg: 'bg-teal-900 border-teal-750' }
                ].map((tTheme) => (
                  <button
                    key={tTheme.id}
                    type="button"
                    title={tTheme.name}
                    onClick={() => setTheme(tTheme.id)}
                    className={`relative flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all cursor-pointer ${
                      theme === tTheme.id 
                        ? 'bg-[var(--glass-accent-muted)] border-[var(--glass-accent)] shadow-md scale-105' 
                        : 'bg-black/10 border-transparent hover:border-white/10 hover:bg-black/20'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full ${tTheme.bg} border shrink-0`} />
                    <span className="text-[9px] font-medium tracking-tight mt-1 text-slate-305 block truncate max-w-full text-center">
                      {tTheme.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Profile fields Editing */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Display Name</label>
                <input 
                  type="text" 
                  value={editDisplayName} 
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full bg-black/15 text-slate-100 border border-white/5 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--glass-border-focus)] focus:bg-black/25 transition-all" 
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Status Message</label>
                <input 
                  type="text" 
                  value={editStatus} 
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-black/15 text-slate-100 border border-white/5 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--glass-border-focus)] focus:bg-black/25 transition-all" 
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Bio</label>
                <textarea 
                  value={editBio} 
                  onChange={(e) => setEditBio(e.target.value)} 
                  className="w-full bg-black/15 text-slate-100 border border-white/5 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--glass-border-focus)] focus:bg-black/25 h-20 resize-none animate-fade-in-up" 
                />
              </div>
            </div>

            {/* Add mutual contact form shortcut */}
            <div className="pt-4 border-t border-white/5">
              <span className="block text-xs font-mono text-slate-400 mb-2">Connect New User</span>
              <form onSubmit={handleAddContactSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-2 text-slate-500 text-xs">@</span>
                  <input 
                    type="text" 
                    placeholder="username" 
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full pl-6 pr-2 bg-black/15 text-slate-100 border border-white/5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-[var(--glass-border-focus)] focus:bg-black/25" 
                  />
                </div>
                <button type="submit" className="p-1.5 px-3 bg-[var(--glass-accent)] hover:opacity-90 rounded-lg text-white font-semibold text-xs shrink-0 cursor-pointer">
                  Add
                </button>
              </form>
              {usernameError && <div className="text-rose-450 text-[10px] mt-1 font-medium">{usernameError}</div>}
              {usernameSuccess && <div className="text-emerald-450 text-[10px] mt-1 font-medium">{usernameSuccess}</div>}
            </div>
          </div>

          <div className="p-4 bg-white/[0.01] border-t border-white/5 flex justify-end gap-2 text-xs">
            <button 
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 bg-black/15 hover:bg-black/25 text-slate-300 rounded-xl transition duration-150 active:scale-95"
            >
              Close
            </button>
            <button 
              onClick={async () => {
                await updateMyProfile(editDisplayName, editBio, editStatus);
                setShowSettings(false);
              }}
              className="px-4 py-2 bg-[var(--glass-accent)] hover:opacity-90 text-white font-semibold rounded-xl transition duration-150 active:scale-95"
            >
              Save Parameters
            </button>
          </div>
        </div>
      )}

      {/* Stories Viewer Modal */}
      {activeStoryView && storiesByUser[activeStoryView.uid] && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-4 z-50">
          <div className="flex justify-between items-center max-w-lg mx-auto w-full text-slate-200 pb-2 border-b border-slate-800/60">
            <div className="flex items-center gap-3">
              <img src={activeStoryView.photoURL} alt={activeStoryView.displayName} className="w-10 h-10 rounded-full" />
              <div>
                <span className="font-semibold text-sm">{activeStoryView.displayName}</span>
                <span className="block text-[10px] text-slate-400">Visible for 24 Hours</span>
              </div>
            </div>
            <button onClick={() => setActiveStoryView(null)} className="text-slate-400 hover:text-slate-100 p-1 pointer-events-auto cursor-pointer">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Stories loop visual container */}
          <div className="flex-1 max-w-lg mx-auto w-full flex items-center justify-center p-3">
            {storiesByUser[activeStoryView.uid].list.map((story, i) => (
              <div key={story.id} className="relative w-full max-h-[75vh] rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center">
                {story.mediaType === 'video' ? (
                  <video src={story.mediaUrl} controls autoPlay className="max-w-full max-h-full" />
                ) : (
                  <img src={story.mediaUrl} alt="" className="max-w-full max-h-full object-contain" />
                )}
                {/* Floating Heart Reaction bar shortcut */}
                <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 flex items-center gap-3.5 bg-slate-950/60 backdrop-blur px-5 py-2.5 rounded-full border border-slate-800 shadow">
                  <button onClick={() => addStoryReaction(story.id, '❤️')} className="hover:scale-125 transition">❤️</button>
                  <button onClick={() => addStoryReaction(story.id, '🔥')} className="hover:scale-125 transition">🔥</button>
                  <button onClick={() => addStoryReaction(story.id, '👍')} className="hover:scale-125 transition">👍</button>
                  <button onClick={() => addStoryReaction(story.id, '😲')} className="hover:scale-125 transition">😲</button>
                  {story.reactions && Object.keys(story.reactions).length > 0 && (
                    <span className="text-xs text-slate-300 border-l border-slate-800 pl-3 font-medium">
                      Reactions: {Object.keys(story.reactions).length}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="text-xs text-slate-500 text-center max-w-md mx-auto w-full py-2">
            Click outside / press Escape or close to return.
          </div>
        </div>
      )}
    </div>
  );
};
