/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
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
  ChevronUp,
  ChevronDown,
  Edit2,
  Trash2,
  Sliders,
  Sparkles,
  ShieldAlert,
  Folder,
  FolderOpen,
  Globe,
  Bookmark,
  User
} from 'lucide-react';
import { useMessenger } from '../context/MessengerContext';
import { useLanguage } from '../context/LanguageContext';
import { useVirtual } from '../hooks/useVirtual';
import { Chat, UserProfile, Story } from '../types';
import { logger } from '../lib/logger';
import { SidebarContactsView } from './SidebarContactsView';
import { SidebarProfileView } from './SidebarProfileView';
import { SidebarSettingsView } from './SidebarSettingsView';

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
    updateFolder,
    deleteFolder,
    sortFolders,
    activeFolder,
    setActiveFolder,
    onlineUsers,
    uploadAvatar,
    deleteAvatar,
    joinChatByInviteCode,
    terminateOtherSessions,
    resolveReport,
    globalReports,
    globalAuditLogs
  } = useMessenger();

  const { t, language, setLanguage } = useLanguage();

  // Dialog / Modal State Managers
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  
  // Search state
  const [sidebarCtxMenu, setSidebarCtxMenu] = useState<string | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartRef = useRef<number | null>(null);
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
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);

  // Story state
  const [activeStoryView, setActiveStoryView] = useState<UserProfile | null>(null);

  // Settings State fields
  const [editDisplayName, setEditDisplayName] = useState(userProfile?.displayName || '');
  const [editBio, setEditBio] = useState(userProfile?.bio || '');
  const [editStatus, setEditStatus] = useState(userProfile?.statusMessage || '');
  const [editEmojiStatus, setEditEmojiStatus] = useState(userProfile?.emojiStatus || '');
  const [editPhoneNumber, setEditPhoneNumber] = useState(userProfile?.phoneNumber || '');
  const [privacyNumber, setPrivacyNumber] = useState<'all' | 'contacts' | 'nobody'>(userProfile?.privacySettings?.phoneNumber || 'all');
  const [privacyStatus, setPrivacyStatus] = useState<'all' | 'contacts' | 'nobody'>(userProfile?.privacySettings?.statusMessage || 'all');
  const [privacyPhoto, setPrivacyPhoto] = useState<'all' | 'contacts' | 'nobody'>(userProfile?.privacySettings?.photoURL || 'all');
  const [privacyLastSeen, setPrivacyLastSeen] = useState<'all' | 'contacts' | 'nobody'>(userProfile?.privacySettings?.lastSeen || 'all');
  const [privacyOnline, setPrivacyOnline] = useState<'all' | 'contacts' | 'nobody'>(userProfile?.privacySettings?.onlineStatus || 'all');
  
  // Settings Tab and Device/UX-specific preference states
  const [settingsTab, setSettingsTab] = useState<'account' | 'chats' | 'notifications' | 'privacy' | 'data' | 'admin'>('account');
  const [textSizeSelection, setTextSizeSelection] = useState<string>(() => localStorage.getItem('vi-chat-text-size') || 'sm');
  const [wallpaperSelection, setWallpaperSelection] = useState<string>(() => localStorage.getItem('vi-chat-wallpaper') || 'cosmic');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => localStorage.getItem('vi-sound-notifications') !== 'false');
  const [vibeEnabled, setVibeEnabled] = useState<boolean>(() => localStorage.getItem('vi-vibe-notifications') !== 'false');

  // Tick timer to automatically expire showing typing states
  const [sidebarTick, setSidebarTick] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setSidebarTick(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Multi-view navigation and helper state variables
  const [sidebarView, setSidebarView] = useState<'chats' | 'contacts' | 'settings' | 'profile'>('chats');
  const [contactUsername, setContactUsername] = useState('');
  const [contactStatusMsg, setContactStatusMsg] = useState<{ type: 'error' | 'success', msg: string } | null>(null);

  // Integrated back gesture for Mobile matching UX requests
  useEffect(() => {
    if (showSettings || showCreateChat || showFolderModal || sidebarView !== 'chats' || activeChat) {
      // Small delay prevents weird history jumping if called rapid-fire
      const timer = setTimeout(() => {
        window.history.pushState({ modalOpen: true }, '');
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showSettings, showCreateChat, showFolderModal, sidebarView, activeChat]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const g = window as any;
      if (g.__VI_BACK_HANDLED === e.timeStamp) return;

      // Stack unwinding priority
      if (showSettings) {
        setShowSettings(false);
        g.__VI_BACK_HANDLED = e.timeStamp;
      } else if (showCreateChat) {
        setShowCreateChat(false);
        g.__VI_BACK_HANDLED = e.timeStamp;
      } else if (showFolderModal) {
        setShowFolderModal(false);
        g.__VI_BACK_HANDLED = e.timeStamp;
      } else if (sidebarView !== 'chats') {
        setSidebarView('chats');
        g.__VI_BACK_HANDLED = e.timeStamp;
      } else if (activeChat) {
        setActiveChat(null);
        g.__VI_BACK_HANDLED = e.timeStamp;
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showSettings, showCreateChat, showFolderModal, sidebarView, activeChat, setActiveChat]);

  // Keep states in sync when userProfile updates in real-time
  React.useEffect(() => {
    if (userProfile) {
      setEditDisplayName(userProfile.displayName || '');
      setEditBio(userProfile.bio || '');
      setEditStatus(userProfile.statusMessage || '');
      setEditEmojiStatus(userProfile.emojiStatus || '');
      setEditPhoneNumber(userProfile.phoneNumber || '');
      setPrivacyNumber(userProfile.privacySettings?.phoneNumber || 'all');
      setPrivacyStatus(userProfile.privacySettings?.statusMessage || 'all');
      setPrivacyPhoto(userProfile.privacySettings?.photoURL || 'all');
      setPrivacyLastSeen(userProfile.privacySettings?.lastSeen || 'all');
      setPrivacyOnline(userProfile.privacySettings?.onlineStatus || 'all');
    }
  }, [userProfile]);

  // Keyboard navigation & productivity hotkeys for Desktop
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Search trigger: Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('sidebar-search-input');
        if (input) {
          input.focus();
        }
      }
      // 2. Escape triggers: Close modals & drop context menus
      if (e.key === 'Escape') {
        setShowSettings(false);
        setShowCreateChat(false);
        setShowFolderModal(false);
        setSidebarCtxMenu(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
    if (editingFolderId && editingFolderId !== 'new') {
      await updateFolder(editingFolderId, newFolderName, 'FolderOpen', newFolderChats);
    } else {
      await createFolder(newFolderName, 'FolderOpen', newFolderChats);
    }
    setNewFolderName('');
    setNewFolderChats([]);
    setEditingFolderId(null);
    setShowFolderModal(false);
  };

  const handleCreatePreset = async (presetType: 'work' | 'channels' | 'unread') => {
    let folderName = '';
    let includedChatIds: string[] = [];
    
    if (presetType === 'work') {
      folderName = language === 'ru' ? 'Работа' : 'Work';
      includedChatIds = chats.filter(c => c.type === 'group' || c.type === 'direct').map(c => c.id);
    } else if (presetType === 'channels') {
      folderName = language === 'ru' ? 'Каналы' : 'Channels';
      includedChatIds = chats.filter(c => c.type === 'channel').map(c => c.id);
    } else if (presetType === 'unread') {
      folderName = language === 'ru' ? 'Непрочитанные' : 'Unread';
      includedChatIds = chats.filter(c => currentUser && c.unreadCounts && (c.unreadCounts[currentUser.uid] || 0) > 0).map(c => c.id);
    }
    
    if (folderName) {
      await createFolder(folderName, 'FolderOpen', includedChatIds);
    }
  };

  const handleMoveFolder = async (idx: number, direction: 'up' | 'down') => {
    const list = [...(userProfile?.folders || [])];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    
    await sortFolders(list);
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

  const handlePullTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0) {
      pullStartRef.current = e.touches[0].clientY;
    }
  };

  const handlePullTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (pullStartRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - pullStartRef.current;
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.45, 95));
      if (e.cancelable) e.preventDefault();
    }
  };

  const handlePullTouchEnd = () => {
    if (pullStartRef.current === null) return;
    if (pullDistance >= 65) {
      setActiveFolder('archived');
      if ('vibrate' in navigator) navigator.vibrate(20);
    }
    pullStartRef.current = null;
    setPullDistance(0);
  };

  const handlePullMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0) {
      pullStartRef.current = e.clientY;
    }
  };

  const handlePullMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (pullStartRef.current === null) return;
    const diff = e.clientY - pullStartRef.current;
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.45, 95));
    }
  };

  const handlePullMouseUp = () => {
    if (pullStartRef.current === null) return;
    if (pullDistance >= 65) {
      setActiveFolder('archived');
      if ('vibrate' in navigator) navigator.vibrate(20);
    }
    pullStartRef.current = null;
    setPullDistance(0);
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

    // 2. Search query matches title, display name, username of other user, member names, or last message content
    if (searchQuery.trim().length > 0) {
      const queryLower = searchQuery.toLowerCase().replace(/^@/, ''); // handle both typing @username or just username text
      const matchesTitle = chat.title?.toLowerCase().includes(queryLower);
      
      let matchesUserLower = false;
      if (chat.type === 'direct' && currentUser) {
        const counterpartId = chat.members.find(m => m !== currentUser.uid) || currentUser.uid;
        const counterpartProfile = globalUsers.find(u => u.uid === counterpartId);
        if (counterpartProfile) {
          const nameMatches = counterpartProfile.displayName?.toLowerCase().includes(queryLower);
          const usernameMatches = counterpartProfile.username?.toLowerCase().includes(queryLower);
          matchesUserLower = !(!nameMatches && !usernameMatches);
        }
      }

      let matchesMemberName = false;
      if (currentUser && chat.members && globalUsers) {
        const matchingMembers = globalUsers.filter(u => 
          chat.members.includes(u.uid) && 
          (u.displayName?.toLowerCase().includes(queryLower) || u.username?.toLowerCase().includes(queryLower))
        );
        if (matchingMembers.length > 0) {
          matchesMemberName = true;
        }
      }

      const matchesLastMessage = chat.lastMessage?.text?.toLowerCase().includes(queryLower);
      
      return matchesTitle || matchesUserLower || matchesMemberName || matchesLastMessage;
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
    const typingList = Object.entries(chat.typing)
      .filter(([uid, timestamp]) => uid !== currentUser?.uid && sidebarTick - (timestamp as number) < 5000)
      .map(([uid]) => {
        const u = globalUsers.find((p) => p.uid === uid);
        return u ? u.displayName : (language === 'ru' ? 'Кто-то' : 'Someone');
      });
    if (typingList.length === 0) return null;
    return typingList.join(', ') + ' ' + (typingList.length > 1 ? (language === 'ru' ? 'печатают...' : 'are typing...') : (language === 'ru' ? 'печатает...' : 'is typing...'));
  };

  return (
    <div className={`w-full md:w-[350px] border-r border-[#1B1B1E] flex flex-col h-full shrink-0 relative overflow-hidden bg-[#0C1322] select-none ${activeChat ? 'hidden md:flex' : 'flex'}`} style={{ background: 'var(--glass-sidebar-bg)' }}>
      {sidebarView === 'chats' ? (
        <>
          {/* Dynamic Header */}
          <div className="p-4 flex flex-col gap-3 border-b border-white/5" style={{ background: 'rgba(255, 255, 255, 0.01)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-cyan-700/80 flex items-center justify-center font-bold text-cyan-200 border border-cyan-500/20 shadow-lg shadow-cyan-500/10">
                  VI
                </div>
                <span className="font-semibold tracking-tight text-lg text-slate-100">{t.appName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Language Toggle */}
                <button 
                  className="p-1 px-1.5 hover:bg-slate-800/60 rounded-lg text-slate-400 hover:text-cyan-400 font-mono font-bold text-[11px] transition-all cursor-pointer border border-[#222]"
                  title={language === 'en' ? 'Переключить на русский' : 'Switch to English'}
                  onClick={() => setLanguage(language === 'en' ? 'ru' : 'en')}
                >
                  {language === 'en' ? 'RU' : 'EN'}
                </button>

                {/* Saved Messages */}
                <button 
                  className="p-1.5 hover:bg-slate-800/60 rounded-lg text-slate-400 hover:text-cyan-400 transition-all cursor-pointer"
                  title={language === 'ru' ? 'Избранное' : 'Saved Messages'}
                  onClick={async () => {
                    if (userProfile) {
                      await createDirectChat(userProfile);
                    }
                  }}
                >
                  <Bookmark className="w-5 h-5" />
                </button>

                {/* Create Chat */}
                <button 
                  className="p-1.5 hover:bg-slate-800/60 rounded-lg text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                  title={t.configureChat}
                  onClick={() => {
                    setChatTypeSelection('group');
                    setShowCreateChat(true);
                  }}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Global Prefix Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
              <input 
                id="sidebar-search-input"
                type="text" 
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={handleQueryChange}
                className="w-full pl-9.5 pr-4 py-1.5 bg-black/15 hover:bg-black/25 text-xs rounded-full border border-white/5 focus:border-[var(--glass-border-focus)] focus:bg-black/30 focus:outline-none placeholder-slate-500 text-slate-100 transition-all shadow-inner font-sans"
              />
            </div>

            {/* Segmented Chats vs. Channels control */}
            <div className="pt-1">
              <div className="grid grid-cols-2 p-0.5 bg-black/20 rounded-xl border border-white/5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveFolder('all')}
                  className={`py-1.5 rounded-lg font-semibold cursor-pointer transition-all ${
                    activeFolder !== 'channels' 
                      ? 'bg-[var(--glass-accent-muted)] text-[var(--glass-accent)] border border-[var(--glass-accent)]/15 shadow' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {language === 'ru' ? 'Чаты' : 'Chats'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFolder('channels')}
                  className={`py-1.5 rounded-lg font-semibold cursor-pointer transition-all ${
                    activeFolder === 'channels' 
                      ? 'bg-[var(--glass-accent-muted)] text-[var(--glass-accent)] border border-[var(--glass-accent)]/15 shadow' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {language === 'ru' ? 'Каналы' : 'Channels'}
                </button>
              </div>
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

      {/* Main Chat List view (Virtualized density and pull-down gesture support) */}
      <div 
        ref={listContainerRef} 
        className="flex-1 overflow-y-auto relative" 
        onClick={() => setSidebarCtxMenu(null)}
        onTouchStart={handlePullTouchStart}
        onTouchMove={handlePullTouchMove}
        onTouchEnd={handlePullTouchEnd}
        onMouseDown={handlePullMouseDown}
        onMouseMove={handlePullMouseMove}
        onMouseUp={handlePullMouseUp}
        onMouseLeave={handlePullMouseUp}
      >
        {/* Dynamic Pull-to-reveal visual feedback banner */}
        {pullDistance > 0 && (
          <div 
            style={{ height: `${pullDistance}px` }} 
            className="w-full flex items-center justify-center bg-zinc-950/20 text-xs border-b border-white/[0.02] overflow-hidden text-slate-400 select-none shrink-0"
          >
            <div className="flex items-center gap-2 animate-pulse font-mono tracking-wider">
              <Archive className={`w-4 h-4 text-cyan-400 transition-transform ${pullDistance >= 65 ? 'scale-125 rotate-6 text-amber-500' : ''}`} />
              <span className="text-[10px] font-bold uppercase">
                {pullDistance >= 65 
                  ? (language === 'ru' ? 'Отпустите для открытия Архива' : 'Release to open Archive')
                  : (language === 'ru' ? 'Потяните для открытия Архива' : 'Pull down to open Archive')
                }
              </span>
            </div>
          </div>
        )}

        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-start p-6 text-center text-slate-500 overflow-y-auto h-full scrollbar-hidden">
            <div className="py-4">
              <div className="w-12 h-12 bg-[#C4B4E6]/10 rounded-2xl flex items-center justify-center border border-white/5 mx-auto mb-2.5">
                <MessageSquare className="w-6 h-6 text-cyan-400" />
              </div>
              <p className="text-sm font-bold text-slate-200">{t.noActiveChats}</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">{t.noActiveChatsSub}</p>
            </div>

            <div className="w-full space-y-2.5 pt-2">
              <button 
                onClick={() => {
                  setChatTypeSelection('group');
                  setShowCreateChat(true);
                }}
                className="w-full p-3.5 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-2xl text-left transition-all tracking-wide cursor-pointer flex items-center gap-3.5 group"
              >
                <div className="w-9 h-9 bg-cyan-500/10 rounded-xl flex items-center justify-center shrink-0 border border-cyan-500/10 group-hover:scale-105 transition-transform">
                  <Plus className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">
                    {language === 'ru' ? 'Новый Чат / Пин-код' : 'Initiate New Transfer'}
                  </p>
                  <p className="text-[10px] text-slate-450 mt-0.5">
                    {language === 'ru' ? 'Начать личный чат, группу или канал' : 'Direct dialogs, secure workspaces'}
                  </p>
                </div>
              </button>

              <button 
                onClick={async () => {
                  if (userProfile) {
                    await createDirectChat(userProfile);
                  }
                }}
                className="w-full p-3.5 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-2xl text-left transition-all tracking-wide cursor-pointer flex items-center gap-3.5 group"
              >
                <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0 border border-amber-500/10 group-hover:scale-105 transition-transform">
                  <Bookmark className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition-colors">
                    {language === 'ru' ? 'Избранное / Сейв' : 'Saved Messages / cloud'}
                  </p>
                  <p className="text-[10px] text-slate-450 mt-0.5">
                    {language === 'ru' ? 'Личное облачное хранилище данных' : 'Your personal secure file cloud'}
                  </p>
                </div>
              </button>

              <button 
                onClick={() => {
                  const el = document.getElementById('sidebar-search-input');
                  if (el) el.focus();
                }}
                className="w-full p-3.5 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-2xl text-left transition-all tracking-wide cursor-pointer flex items-center gap-3.5 group"
              >
                <div className="w-9 h-9 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0 border border-indigo-500/10 group-hover:scale-105 transition-transform">
                  <Search className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">
                    {language === 'ru' ? 'Поиск Пользователей' : 'Discover Global Channels'}
                  </p>
                  <p className="text-[10px] text-slate-450 mt-0.5">
                    {language === 'ru' ? 'Найти людей или каналы по никнейму' : 'Query unique usernames or tag catalogs'}
                  </p>
                </div>
              </button>

              <button 
                onClick={() => {
                  setShowSettings(true);
                  setSettingsTab('account');
                }}
                className="w-full p-3.5 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-2xl text-left transition-all tracking-wide cursor-pointer flex items-center gap-3.5 group"
              >
                <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0 border border-emerald-500/10 group-hover:scale-105 transition-transform">
                  <Settings className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">
                    {language === 'ru' ? 'Настроить Профиль' : 'Refine Global Settings'}
                  </p>
                  <p className="text-[10px] text-slate-450 mt-0.5">
                    {language === 'ru' ? 'Задать описание, статус или приватность' : 'Alter handle identities, block hosts'}
                  </p>
                </div>
              </button>
            </div>
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
                  className="relative border-b border-white/[0.04] overflow-hidden"
                >
                  {/* Swipe Background Reveal Layer */}
                  <div className="absolute inset-0 flex justify-between items-center px-6 pointer-events-none bg-slate-800/20">
                     <div id={`chat-icon-right-${chat.id}`} className="flex items-center text-emerald-500 gap-2 opacity-0 transition-none">
                        <Pin className="w-5 h-5 opacity-80" />
                     </div>
                     <div id={`chat-icon-left-${chat.id}`} className="flex items-center text-amber-500 gap-2 opacity-0 transition-none">
                        <Archive className="w-5 h-5 opacity-80" />
                     </div>
                  </div>

                   <motion.div
                    drag="x"
                    dragDirectionLock
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={{ left: 0.2, right: 0.2 }}
                    onDrag={(e, info) => {
                      const leftIcon = document.getElementById(`chat-icon-left-${chat.id}`);
                      const rightIcon = document.getElementById(`chat-icon-right-${chat.id}`);
                      const swipeDist = info.offset.x;
                      if (swipeDist < 0 && leftIcon) {
                        const progress = Math.min(Math.abs(swipeDist) / 60, 1);
                        leftIcon.style.opacity = progress.toString();
                        leftIcon.style.transform = `scale(${0.5 + progress * 0.5})`;
                        if (rightIcon) rightIcon.style.opacity = '0';
                        if (progress === 1 && leftIcon.dataset.vibrated !== 'true') {
                          if ('vibrate' in navigator) navigator.vibrate(10);
                          leftIcon.dataset.vibrated = 'true';
                        } else if (progress < 1) {
                          leftIcon.dataset.vibrated = 'false';
                        }
                      } else if (swipeDist > 0 && rightIcon) {
                        const progress = Math.min(Math.abs(swipeDist) / 60, 1);
                        rightIcon.style.opacity = progress.toString();
                        rightIcon.style.transform = `scale(${0.5 + progress * 0.5})`;
                        if (leftIcon) leftIcon.style.opacity = '0';
                        if (progress === 1 && rightIcon.dataset.vibrated !== 'true') {
                          if ('vibrate' in navigator) navigator.vibrate(10);
                          rightIcon.dataset.vibrated = 'true';
                        } else if (progress < 1) {
                          rightIcon.dataset.vibrated = 'false';
                        }
                      }
                    }}
                    onDragEnd={(e, info) => {
                      const leftIcon = document.getElementById(`chat-icon-left-${chat.id}`);
                      const rightIcon = document.getElementById(`chat-icon-right-${chat.id}`);
                      if (leftIcon) {
                        leftIcon.style.opacity = '0';
                        leftIcon.dataset.vibrated = 'false';
                      }
                      if (rightIcon) {
                        rightIcon.style.opacity = '0';
                        rightIcon.dataset.vibrated = 'false';
                      }
                      if (info.offset.x < -60) {
                         toggleArchiveChat(chat.id);
                      } else if (info.offset.x > 60) {
                         togglePinChat(chat.id);
                      }
                    }}
                    onClick={() => setActiveChat(chat)}
                    onTouchStart={(e) => {
                      const timer = setTimeout(() => {
                        setSidebarCtxMenu(chat.id);
                        if ('vibrate' in navigator) navigator.vibrate(15);
                      }, 350);
                      e.currentTarget.dataset.lph = timer.toString();
                    }}
                    onTouchEnd={(e) => {
                      const timer = e.currentTarget.dataset.lph;
                      if (timer) clearTimeout(parseInt(timer));
                    }}
                    onTouchMove={(e) => {
                      const timer = e.currentTarget.dataset.lph;
                      if (timer) clearTimeout(parseInt(timer));
                    }}
                    onTouchCancel={(e) => {
                      const timer = e.currentTarget.dataset.lph;
                      if (timer) clearTimeout(parseInt(timer));
                    }}
                    onContextMenu={(e: React.MouseEvent) => {
                      e.preventDefault();
                      setSidebarCtxMenu(chat.id);
                    }}
                    className={`flex h-full w-full items-center gap-3 cursor-pointer select-none relative bg-[#121215] ${isActive ? 'bg-white/[0.07] border-l-2 border-[var(--glass-accent)] px-5' : 'hover:bg-white/[0.03] px-5 py-2'}`}
                  >
                    {/* Context Menu Overlay */}
                    {sidebarCtxMenu === chat.id && (
                      <div 
                        className="absolute inset-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-md flex items-center justify-around px-4 shadow-2xl animate-fade-in-up"
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
                  </motion.div>
                </div>
              );
            })}
          </div>
        )}
      </div>
        </>
      ) : sidebarView === 'contacts' ? (
        <SidebarContactsView
          contactsList={contactsList}
          globalUsers={globalUsers}
          onlineUsers={onlineUsers}
          addContactByUsername={addContactByUsername}
          createDirectChat={createDirectChat}
          setSidebarView={setSidebarView}
          language={language}
        />
      ) : sidebarView === 'settings' ? (
        <SidebarSettingsView
          userProfile={userProfile}
          currentUser={currentUser}
          globalReports={globalReports}
          globalAuditLogs={globalAuditLogs}
          resolveReport={resolveReport}
          terminateOtherSessions={terminateOtherSessions}
          updateMyProfile={updateMyProfile}
          uploadAvatar={uploadAvatar}
          deleteAvatar={deleteAvatar}
          language={language}
          theme={theme}
          setTheme={setTheme}
        />
      ) : (
        <SidebarProfileView
          userProfile={userProfile}
          uploadAvatar={uploadAvatar}
          deleteAvatar={deleteAvatar}
          updateMyProfile={updateMyProfile}
          logout={logout}
          language={language}
        />
      )}

      {/* Bottom Navigation Dock */}
      <div className="grid grid-cols-4 border-t border-white/5 bg-[#0a0a0d]/65 backdrop-blur-md text-slate-450 text-[10px] select-none shrink-0" style={{ height: '56px' }}>
        {[
          { id: 'chats', label: language === 'ru' ? 'Чаты' : 'Chats', icon: MessageSquare },
          { id: 'contacts', label: language === 'ru' ? 'Контакты' : 'Contacts', icon: Users },
          { id: 'settings', label: language === 'ru' ? 'Настройки' : 'Settings', icon: Sliders },
          { id: 'profile', label: language === 'ru' ? 'Профиль' : 'Profile', icon: User },
        ].map((btn) => {
          const Icon = btn.icon;
          const isActive = sidebarView === btn.id;
          return (
            <button
              key={btn.id}
              onClick={() => {
                setSidebarView(btn.id as any);
                setSearchQuery('');
              }}
              className={`flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${isActive ? 'text-cyan-400 font-bold bg-white/[0.02]' : 'hover:text-slate-200 hover:bg-white/[0.01]'}`}
            >
              <Icon className={`w-4.5 h-4.5 ${isActive ? 'scale-110 text-cyan-400 stroke-[2.2px]' : 'scale-100 opacity-65'}`} />
              <span className="text-[10px] tracking-tight">{btn.label}</span>
            </button>
          );
        })}
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
            {editingFolderId === null ? (
              // --- MODE A: LISTING & ORDERING ALL FOLDERS ---
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-cyan-400" />
                    <span className="font-semibold text-[var(--glass-text)]">
                      {language === 'ru' ? 'Управление папками чатов' : 'Manage Chat Folders'}
                    </span>
                  </div>
                  <button onClick={() => setShowFolderModal(false)} className="text-slate-500 hover:text-slate-200 pointer-events-auto cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* All Folders List */}
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {(!userProfile?.folders || userProfile.folders.length === 0) ? (
                    <div className="text-center py-6 text-xs text-slate-500 font-sans">
                      {language === 'ru' 
                        ? 'У вас пока нет папок. Создайте свою или добавьте готовый пресет ниже.' 
                        : 'No custom folders yet. Create your first folder or choose a preset below.'}
                    </div>
                  ) : (
                    userProfile.folders.map((f, idx) => {
                      const listLength = userProfile.folders!.length;
                      return (
                        <div 
                          key={f.id} 
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition"
                        >
                          <div className="flex items-center gap-2.5">
                            <Folder className="w-4 h-4 text-cyan-500/80" />
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-[var(--glass-text)]">{f.name}</span>
                              <span className="text-[10px] text-slate-550 font-mono">
                                {f.chatIds?.length || 0} {language === 'ru' ? 'чатов' : 'chats'}
                              </span>
                            </div>
                          </div>

                          {/* Controls Row */}
                          <div className="flex items-center gap-1">
                            {/* Sort Up */}
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveFolder(idx, 'up')}
                              className="p-1 rounded text-slate-450 hover:text-cyan-400 hover:bg-white/5 disabled:opacity-25 disabled:hover:text-slate-450 cursor-pointer disabled:cursor-not-allowed"
                              title="Move Up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            {/* Sort Down */}
                            <button
                              type="button"
                              disabled={idx === listLength - 1}
                              onClick={() => handleMoveFolder(idx, 'down')}
                              className="p-1 rounded text-slate-450 hover:text-cyan-400 hover:bg-white/5 disabled:opacity-25 disabled:hover:text-slate-450 cursor-pointer disabled:cursor-not-allowed"
                              title="Move Down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingFolderId(f.id);
                                setNewFolderName(f.name);
                                setNewFolderChats(f.chatIds || []);
                              }}
                              className="p-1 rounded text-slate-450 hover:text-cyan-400 hover:bg-white/5 cursor-pointer"
                              title="Edit Folder"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => deleteFolder(f.id)}
                              className="p-1 rounded text-slate-450 hover:text-rose-400 hover:bg-white/5 cursor-pointer"
                              title="Delete Folder"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Preset Fast Creation Row */}
                <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-2">
                  <span className="block text-[10px] font-mono text-cyan-400/80 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {language === 'ru' ? 'Шаблоны папок (Прекрасный пресет)' : 'Quick-Start Presets'}
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleCreatePreset('work')}
                      className="px-2.5 py-1 text-[10px] font-semibold bg-white/5 border border-white/10 rounded-lg hover:border-cyan-500/40 hover:bg-white/10 text-slate-200 cursor-pointer transition"
                    >
                      💼 {language === 'ru' ? '+ Работа' : '+ Work/Groups'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreatePreset('channels')}
                      className="px-2.5 py-1 text-[10px] font-semibold bg-white/5 border border-white/10 rounded-lg hover:border-cyan-500/40 hover:bg-white/10 text-slate-200 cursor-pointer transition"
                    >
                      📢 {language === 'ru' ? '+ Каналы' : '+ Channels'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreatePreset('unread')}
                      className="px-2.5 py-1 text-[10px] font-semibold bg-white/5 border border-white/10 rounded-lg hover:border-cyan-500/40 hover:bg-white/10 text-slate-200 cursor-pointer transition"
                    >
                      🔵 {language === 'ru' ? '+ Новые' : '+ Unread'}
                    </button>
                  </div>
                </div>

                {/* Add Custom / General Actions */}
                <div className="pt-3 border-t border-white/5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFolderId('new');
                      setNewFolderName('');
                      setNewFolderChats([]);
                    }}
                    className="flex-1 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-xl text-xs font-semibold shadow hover:opacity-95 text-center cursor-pointer transition-all active:scale-95"
                  >
                    🚀 {language === 'ru' ? 'Создать свою папку' : 'Create Custom Folder'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowFolderModal(false)}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-slate-300 font-semibold cursor-pointer"
                  >
                    {language === 'ru' ? 'Закрыть' : 'Close'}
                  </button>
                </div>
              </div>
            ) : (
              // --- MODE B: FORM FOR ADDING / EDITING ---
              <div>
                <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-4">
                  <span className="font-semibold text-[var(--glass-text)] text-sm">
                    {editingFolderId === 'new' 
                      ? (language === 'ru' ? 'Создание новой папки' : 'Create Custom Folder')
                      : (language === 'ru' ? 'Редактирование папки' : 'Edit Folder Settings')
                    }
                  </span>
                  <button 
                    onClick={() => {
                      setEditingFolderId(null);
                      setNewFolderName('');
                      setNewFolderChats([]);
                    }} 
                    className="text-slate-500 hover:text-slate-200 pointer-events-auto cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateFolderSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-[var(--glass-text-muted)] mb-1">
                      {language === 'ru' ? 'Название папки' : 'Folder Name'}
                    </label>
                    <input 
                      type="text" 
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder={language === 'ru' ? 'например: Работа, Семья, Блоги' : 'Work, Squad, Channels'}
                      className="w-full bg-black/15 text-[var(--glass-text)] border border-white/5 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[var(--glass-border-focus)] focus:bg-black/25 transition-all text-slate-200 placeholder-slate-650 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[var(--glass-text-muted)] mb-1">
                      {language === 'ru' ? 'Выберите диалоги для папки' : 'Select Chats to Include'}
                    </label>
                    <div className="max-h-[160px] overflow-y-auto space-y-1 bg-black/15 p-2 rounded-xl border border-white/5">
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
                            className="rounded text-[var(--glass-accent)] border-white/10 focus:ring-0 bg-transparent cursor-pointer" 
                          />
                          <img src={c.photoURL} alt={c.title} className="w-6 h-6 rounded-full inline-block border border-white/5 shrink-0" />
                          <span className="font-medium text-slate-200 max-w-[200px] truncate">{c.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex justify-end gap-2 text-xs font-semibold">
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingFolderId(null);
                        setNewFolderName('');
                        setNewFolderChats([]);
                      }} 
                      className="px-4 py-2 bg-black/10 hover:bg-black/20 rounded-xl text-slate-400 cursor-pointer"
                    >
                      {language === 'ru' ? 'Назад' : 'Back to List'}
                    </button>
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white font-semibold shadow cursor-pointer active:scale-95 transition"
                    >
                      {language === 'ru' ? 'Сохранить папку' : 'Save Folder'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Profile Settings Drawer view */}
      {false && showSettings && (
        <div className="fixed inset-y-0 left-0 w-full sm:w-[350px] border-r border-white/5 shadow-2xl flex flex-col z-50 glass-panel" style={{ background: 'var(--glass-sidebar-bg)' }}>
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
            <span className="font-semibold text-slate-200">My Profile Settings</span>
            <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-slate-200 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Category Tabs Switcher */}
          <div className="flex border-b border-white/5 bg-white/[0.02] text-[10px] uppercase font-bold tracking-wider font-mono overflow-x-auto shrink-0 scrollbar-none">
            {[
              { id: 'account', label: language === 'ru' ? 'Аккаунт' : 'Account' },
              { id: 'chats', label: language === 'ru' ? 'Чаты' : 'Chats' },
              { id: 'notifications', label: language === 'ru' ? 'Увед.' : 'Notif.' },
              { id: 'privacy', label: language === 'ru' ? 'Приват.' : 'Privacy' },
              { id: 'data', label: language === 'ru' ? 'Данные' : 'Data' },
              ...(currentUser?.email === 'sasamihajlov709@gmail.com' ? [{ id: 'admin', label: language === 'ru' ? 'Админ' : 'Admin' }] : [])
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSettingsTab(tab.id as any)}
                className={`px-3 py-3 text-center border-b-2 transition cursor-pointer shrink-0 ${settingsTab === tab.id ? 'border-[var(--glass-accent)] text-[var(--glass-accent)] bg-white/[0.03]' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 p-5 overflow-y-auto space-y-5">
            {settingsTab === 'account' && (
              <>
                {/* Visual Header */}
                <div className="flex flex-col items-center gap-2 pb-4 border-b border-white/5 relative">
                  <div className="relative group w-20 h-20">
                    <img src={userProfile?.photoURL} alt={userProfile?.displayName} className="w-20 h-20 rounded-full border-2 border-[var(--glass-accent)] object-cover shadow-xl shadow-cyan-400/5 mb-1" />
                    <label className="absolute inset-0 bg-black/55 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-center p-1">
                      <span className="text-[9px] font-bold text-white uppercase">{language === 'ru' ? 'Изменить' : 'Change'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              await uploadAvatar(file);
                            } catch (err: any) {
                              alert(language === 'ru' ? 'Ошибка загрузки аватара: ' + err.message : 'Error uploading avatar: ' + err.message);
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
                      className="text-[9px] font-semibold text-rose-450 hover:text-rose-400 underline transition cursor-pointer"
                    >
                      {language === 'ru' ? 'Удалить фото' : 'Delete photo'}
                    </button>
                  )}
                  <div className="font-semibold text-lg text-slate-200 mt-1">{userProfile?.displayName}</div>
                  <div className="text-xs font-mono text-[var(--glass-accent)]">@{userProfile?.username}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {language === 'ru' ? 'Регистрация:' : 'Registered:'} {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>

                {/* Profile fields Editing */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">{language === 'ru' ? 'Имя' : 'Display Name'}</label>
                    <input 
                      type="text" 
                      value={editDisplayName} 
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      className="w-full bg-black/15 text-slate-100 border border-white/5 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--glass-border-focus)] focus:bg-black/25 transition-all" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">{language === 'ru' ? 'Статус' : 'Status Message'}</label>
                    <input 
                      type="text" 
                      value={editStatus} 
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full bg-black/15 text-slate-100 border border-white/5 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--glass-border-focus)] focus:bg-black/25 transition-all" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1">{language === 'ru' ? 'Emoji статус' : 'Emoji Status'}</label>
                      <input 
                        type="text" 
                        placeholder="🚀, 💻, 🌴"
                        value={editEmojiStatus} 
                        onChange={(e) => setEditEmojiStatus(e.target.value)}
                        maxLength={3}
                        className="w-full bg-black/15 text-slate-100 border border-white/5 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--glass-border-focus)] focus:bg-black/25 transition-all text-center" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1">{language === 'ru' ? 'Телефон' : 'Phone Number'}</label>
                      <input 
                        type="text" 
                        placeholder="+7 999..."
                        value={editPhoneNumber} 
                        onChange={(e) => setEditPhoneNumber(e.target.value)}
                        className="w-full bg-black/15 text-slate-100 border border-white/5 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--glass-border-focus)] focus:bg-black/25 transition-all" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">{language === 'ru' ? 'О себе (Bio)' : 'Bio'}</label>
                    <textarea 
                      value={editBio} 
                      onChange={(e) => setEditBio(e.target.value)} 
                      className="w-full bg-black/15 text-slate-100 border border-white/5 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--glass-border-focus)] focus:bg-black/25 h-16 resize-none animate-fade-in-up" 
                    />
                  </div>
                </div>

                {/* Invite Group shortcode */}
                <div className="p-3 bg-cyan-950/15 rounded-2xl border border-cyan-500/10 space-y-2 pt-2.5 pb-3">
                  <span className="block text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                    {language === 'ru' ? 'Присоединиться к группе' : 'Join chat by Invite Code'}
                  </span>
                  <div className="flex gap-1 text-xs">
                    <input 
                      type="text" 
                      placeholder="invite_..."
                      id="invite-input-field"
                      className="flex-1 bg-black/30 text-slate-100 border border-cyan-500/10 px-2 py-1 rounded-xl text-xs focus:outline-none focus:border-cyan-500" 
                    />
                    <button 
                      onClick={async () => {
                        const input = document.getElementById('invite-input-field') as HTMLInputElement;
                        if (input && input.value.trim()) {
                          try {
                            const chatObj = await joinChatByInviteCode(input.value.trim());
                            alert(language === 'ru' ? `Успешно вошли в: ${chatObj.title}` : `Successfully joined: ${chatObj.title}`);
                            input.value = '';
                          } catch (err: any) {
                            alert(language === 'ru' ? 'Ошибка вступления: ' + err.message : 'Join error: ' + err.message);
                          }
                        }
                      }}
                      className="p-1 px-3.5 bg-cyan-900/40 hover:bg-cyan-800 text-cyan-200 font-mono text-[10px] rounded-xl border border-cyan-500/30 font-semibold align-middle cursor-pointer uppercase transition duration-150 active:scale-95"
                    >
                      {language === 'ru' ? 'Войти' : 'Join'}
                    </button>
                  </div>
                </div>

                {/* Add mutual contact shortcut */}
                <div className="pt-2 border-t border-white/5">
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
              </>
            )}

            {settingsTab === 'chats' && (
              <div className="space-y-4">
                {/* Premium Theme Selector glass card */}
                <div className="p-3.5 bg-black/15 rounded-2xl border border-white/5 space-y-2">
                  <span className="block text-xs font-mono text-slate-400 mb-1 uppercase tracking-wider">
                    {language === 'ru' ? 'Выберите тему Glass UI' : 'Select Glass UI Theme'}
                  </span>
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {[
                      { id: 'theme-light-glass', name: language === 'ru' ? 'Светлая' : 'Light', bg: 'bg-slate-200 border-slate-300' },
                      { id: 'theme-dark-glass', name: language === 'ru' ? 'Тёмная' : 'Dark', bg: 'bg-slate-900 border-slate-700' },
                      { id: 'theme-midnight-glass', name: language === 'ru' ? 'Космос' : 'Midnight', bg: 'bg-indigo-950 border-indigo-900' },
                      { id: 'theme-arctic-glass', name: language === 'ru' ? 'Арктика' : 'Arctic', bg: 'bg-sky-200 border-sky-300' },
                      { id: 'theme-ocean-glass', name: language === 'ru' ? 'Океан' : 'Ocean', bg: 'bg-teal-900 border-teal-700' }
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
                        <span className="text-[9px] font-medium tracking-tight mt-1 text-slate-300 block truncate max-w-full text-center">
                          {tTheme.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font/Text Size Settings */}
                <div className="p-3.5 bg-black/15 rounded-2xl border border-white/5 space-y-2">
                  <span className="block text-xs font-mono text-slate-400 uppercase tracking-wider">
                    {language === 'ru' ? 'Размер шрифта чата' : 'Chat Text Size'}
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'xs', name: language === 'ru' ? 'Мелкий' : 'Small' },
                      { id: 'sm', name: language === 'ru' ? 'Средний' : 'Medium' },
                      { id: 'base', name: language === 'ru' ? 'Крупный' : 'Large' }
                    ].map((sOpt) => (
                      <button
                        key={sOpt.id}
                        type="button"
                        onClick={() => {
                          setTextSizeSelection(sOpt.id);
                          localStorage.setItem('vi-chat-text-size', sOpt.id);
                          window.dispatchEvent(new Event('vi-settings-changed'));
                        }}
                        className={`py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition ${
                          textSizeSelection === sOpt.id
                            ? 'bg-[var(--glass-accent-muted)] border-[var(--glass-accent)] text-slate-100'
                            : 'bg-black/10 border-white/5 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {sOpt.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wallpaper Settings */}
                <div className="p-3.5 bg-black/15 rounded-2xl border border-white/5 space-y-2">
                  <span className="block text-xs font-mono text-slate-400 uppercase tracking-wider">
                    {language === 'ru' ? 'Фон чата' : 'Chat Wallpaper'}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'cosmic', name: language === 'ru' ? 'Космос' : 'Cosmic Slate' },
                      { id: 'aurora', name: language === 'ru' ? 'Аврора' : 'Aurora Dream' },
                      { id: 'minimal', name: language === 'ru' ? 'Темный' : 'Minimal Charcoal' },
                      { id: 'warm', name: language === 'ru' ? 'Теплый' : 'Warm Sunset' }
                    ].map((pOpt) => (
                      <button
                        key={pOpt.id}
                        type="button"
                        onClick={() => {
                          setWallpaperSelection(pOpt.id);
                          localStorage.setItem('vi-chat-wallpaper', pOpt.id);
                          window.dispatchEvent(new Event('vi-settings-changed'));
                        }}
                        className={`py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition ${
                          wallpaperSelection === pOpt.id
                            ? 'bg-[var(--glass-accent-muted)] border-[var(--glass-accent)] text-slate-100'
                            : 'bg-black/10 border-white/5 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {pOpt.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {settingsTab === 'notifications' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-black/15 rounded-2xl border border-white/5 space-y-3">
                  <span className="block text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">
                    {language === 'ru' ? 'Звук и Вибрация' : 'Sound & Vibration'}
                  </span>

                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
                    <span className="text-xs text-slate-300">{language === 'ru' ? 'Звуковые уведомления' : 'Sound Notifications'}</span>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded accent-[var(--glass-accent)] cursor-pointer"
                      checked={soundEnabled}
                      onChange={(e) => {
                        setSoundEnabled(e.target.checked);
                        localStorage.setItem('vi-sound-notifications', String(e.target.checked));
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">{language === 'ru' ? 'Вибро-отклик (Swipe/Send)' : 'Haptic Vibration on Swipes'}</span>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded accent-[var(--glass-accent)] cursor-pointer"
                      checked={vibeEnabled}
                      onChange={(e) => {
                        setVibeEnabled(e.target.checked);
                        localStorage.setItem('vi-vibe-notifications', String(e.target.checked));
                      }}
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-black/10 rounded-2xl border border-white/5">
                  <span className="block text-xs font-mono text-slate-400 uppercase mb-1">Mute Chats Overrides</span>
                  <p className="text-[10px] text-slate-505 leading-relaxed font-sans">
                    {language === 'ru' 
                      ? 'Чтобы отключить звук для конкретного диалога, удерживайте или кликайте правой кнопкой мыши по чату в левом списке и выберите "Mute".' 
                      : 'To mute sounds on a specific conversation, right click or long press Chat in sidebar and toggle "Mute".'}
                  </p>
                </div>
              </div>
            )}

            {settingsTab === 'privacy' && (
              <div className="space-y-4">
                {/* Privacy Settings Accordion */}
                <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/5 space-y-3">
                  <span className="block text-xs font-mono text-slate-300 font-bold uppercase tracking-wider">
                    {language === 'ru' ? 'Приватность аккаунта' : 'Privacy Settings'}
                  </span>
                  
                  <div className="space-y-2 text-xs">
                    {[
                      { label: language === 'ru' ? 'Номер телефона' : 'Phone Number', val: privacyNumber, set: setPrivacyNumber },
                      { label: language === 'ru' ? 'Статус-сообщение' : 'Status Message', val: privacyStatus, set: setPrivacyStatus },
                      { label: language === 'ru' ? 'Фото профиля' : 'Profile Avatar', val: privacyPhoto, set: setPrivacyPhoto },
                      { label: language === 'ru' ? 'Последний визит' : 'Last Seen Time', val: privacyLastSeen, set: setPrivacyLastSeen },
                      { label: language === 'ru' ? 'Статус онлайн' : 'Online Status', val: privacyOnline, set: setPrivacyOnline }
                    ].map((field, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-1 border-b border-white/[0.02] pb-1.5 last:border-0 last:pb-0">
                        <span className="text-slate-400 font-sans">{field.label}</span>
                        <select 
                          value={field.val} 
                          onChange={(e) => field.set(e.target.value as any)}
                          className="bg-black/40 text-slate-200 border border-white/5 text-[10px] rounded px-1.5 py-0.5 focus:outline-none focus:border-[var(--glass-border-focus)] font-mono shrink-0 cursor-pointer"
                        >
                          <option value="all">{language === 'ru' ? 'Все' : 'Everyone'}</option>
                          <option value="contacts">{language === 'ru' ? 'Контакты' : 'Contacts'}</option>
                          <option value="nobody">{language === 'ru' ? 'Никто' : 'Nobody'}</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {settingsTab === 'data' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-black/15 rounded-2xl border border-white/5 space-y-2.5">
                  <span className="block text-xs font-mono text-slate-400 uppercase tracking-wider">
                    {language === 'ru' ? 'Память и Кэш' : 'Storage Metrics'}
                  </span>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">{language === 'ru' ? 'База данных Firestore' : 'Firestore Queries'}</span>
                    <span className="font-mono text-cyan-400">Online Sync (Active)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">{language === 'ru' ? 'Локальное хранилище' : 'Local Sandbox Size'}</span>
                    <span className="font-mono text-slate-300">~1.2 MB</span>
                  </div>
                </div>

                {/* Active Sessions Manager (Zero-Trust Compliance) */}
                <div className="p-3.5 bg-black/15 rounded-2xl border border-white/5 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="block text-xs font-mono text-amber-500 uppercase tracking-wider font-bold">
                      {language === 'ru' ? 'Активные Сессии' : 'Active Sessions'}
                    </span>
                    <button 
                      onClick={() => {
                        terminateOtherSessions().then(() => {
                          alert(language === 'ru' ? 'Все другие сессии успешно завершены!' : 'All other device sessions revoked!');
                        });
                      }}
                      className="text-[9px] uppercase font-mono px-2 py-1 bg-amber-500/15 border border-amber-500/30 rounded hover:bg-amber-500/25 text-amber-300 cursor-pointer transition active:scale-95"
                    >
                      {language === 'ru' ? 'Выйти на других' : 'Terminate Others'}
                    </button>
                  </div>
                  <div className="space-y-2 text-xs divide-y divide-white/5 max-h-[140px] overflow-y-auto pr-1">
                    {(userProfile?.activeSessions || []).map((session, idx) => {
                      const isCurrent = navigator.userAgent.substring(0, 30) === session.deviceName.substring(0, 30);
                      return (
                        <div key={session.id || idx} className="pt-1.5 first:pt-0 flex justify-between items-start gap-1">
                          <div className="space-y-0.5">
                            <span className="font-mono text-[10px] text-slate-200 block truncate max-w-[180px]">
                              {session.deviceName}
                            </span>
                            <span className="text-[9px] text-slate-500 block font-mono">
                              Active: {new Date(session.lastActive || Date.now()).toLocaleString()}
                            </span>
                          </div>
                          {isCurrent ? (
                            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-500/15 px-1 rounded uppercase">Current</span>
                          ) : (
                            <span className="text-[9px] font-mono text-slate-400 bg-slate-900/40 border border-slate-800 px-1 rounded">Offline</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3.5 bg-rose-950/10 rounded-2xl border border-rose-500/10 space-y-2">
                  <span className="block text-xs font-mono text-rose-400 uppercase tracking-wider">{language === 'ru' ? 'Опасная зона' : 'Dangerous Zone'}</span>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                    {language === 'ru' 
                      ? 'Очистка кэша удалит все ваши локальные черновики, кэшированные авы и системные параметры.'
                      : 'Clearing cache removes local draft previews, offline caches and reset preferences.'}
                  </p>
                  <button 
                    onClick={() => {
                      localStorage.clear();
                      alert(language === 'ru' ? 'Локальный кэш успешно очищен!' : 'Local cache cleaned up!');
                      window.location.reload();
                    }}
                    className="w-full py-2 bg-rose-900/35 hover:bg-rose-800 hover:text-white border border-rose-500/30 rounded-xl font-mono uppercase text-[10px] font-bold text-rose-300 cursor-pointer transition active:scale-95"
                  >
                    {language === 'ru' ? 'Очистить кэш приложения' : 'Clear Application Cache'}
                  </button>
                </div>
              </div>
            )}

            {settingsTab === 'admin' && currentUser?.email === 'sasamihajlov709@gmail.com' && (
              <div className="space-y-4">
                {/* Reports Panel */}
                <div className="p-3.5 bg-black/20 rounded-2xl border border-rose-500/10 space-y-3 font-sans">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="block text-xs font-mono text-rose-400 uppercase tracking-wider font-bold">
                      {language === 'ru' ? 'Жалобы пользователей' : 'Pending Abuse Reports'} ({globalReports?.length || 0})
                    </span>
                  </div>
                  
                  {(!globalReports || globalReports.length === 0) ? (
                    <p className="text-[10px] text-slate-500 italic py-2">
                      {language === 'ru' ? 'Жалоб на нарушения политик не обнаружено.' : 'No pending abuse complaints in queue.'}
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {globalReports.map((r) => (
                        <div key={r.id} className="p-2.5 bg-rose-950/10 border border-rose-500/15 rounded-xl space-y-1.5 hover:bg-rose-950/20 transition text-[10px]">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="text-rose-300 font-bold block truncate max-w-[170px]">
                                Target: {r.reportedUserId}
                              </span>
                              <span className="text-slate-400 font-mono text-[9px] block">
                                Complainant: {r.reporterId}
                              </span>
                            </div>
                            <button 
                              onClick={() => {
                                resolveReport(r.id).then(() => {
                                  alert(language === 'ru' ? 'Жалоба успешно решена!' : 'Abuse report marked as resolved.');
                                });
                              }}
                              className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[8px] font-mono hover:bg-emerald-500/25 rounded cursor-pointer transition active:scale-95 text-xs font-bold"
                            >
                              Resolve
                            </button>
                          </div>
                          <p className="text-slate-300 leading-relaxed border-l-2 border-rose-500/30 pl-2 whitespace-pre-wrap py-0.5">
                            {r.reason}
                          </p>
                          <span className="text-[8px] text-slate-500 block font-mono">
                            Logged: {new Date(r.createdAt || Date.now()).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Audit Logs System Trail */}
                <div className="p-3.5 bg-black/15 rounded-2xl border border-white/5 space-y-2.5 font-sans">
                  <div className="flex items-center justify-between">
                    <span className="block text-xs font-mono text-cyan-400 uppercase tracking-wider font-bold">
                      {language === 'ru' ? 'Журнал Аудита' : 'System Security Logs'} ({globalAuditLogs?.length || 0})
                    </span>
                    <span className="text-[8px] text-slate-500 font-mono tracking-wider animate-pulse">● LIVE SYNC</span>
                  </div>
                  
                  {(!globalAuditLogs || globalAuditLogs.length === 0) ? (
                    <p className="text-[10px] text-slate-500 italic py-2">
                      {language === 'ru' ? 'Записи аудита не найдены.' : 'Audit logs stream is empty.'}
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 font-mono text-[9px] divide-y divide-white/5">
                      {globalAuditLogs.map((log, idx) => {
                        let badgeColor = 'text-cyan-400 bg-cyan-950/20 border-cyan-500/10';
                        if (log.action?.includes('ban') || log.action?.includes('kick') || log.action?.includes('delete')) {
                          badgeColor = 'text-rose-400 bg-rose-950/20 border-rose-500/10';
                        } else if (log.action?.includes('role')) {
                          badgeColor = 'text-amber-400 bg-amber-950/20 border-amber-500/10';
                        } else if (log.action?.includes('login')) {
                          badgeColor = 'text-emerald-400 bg-emerald-950/20 border-emerald-500/10';
                        }
                        
                        return (
                          <div key={log.id || idx} className="pt-1.5 first:pt-0 pb-0.5 leading-snug">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className={`text-[8px] uppercase tracking-wider px-1 rounded border ${badgeColor} font-bold`}>
                                {log.action || 'system_event'}
                              </span>
                              <span className="text-slate-500 text-[8px] shrink-0 font-sans">
                                {new Date(log.timestamp || Date.now()).toLocaleTimeString()}
                              </span>
                            </div>
                            <span className="text-slate-300 font-sans block leading-tight text-xs">
                              {log.details || 'No event details specified.'}
                            </span>
                            <span className="text-slate-500 text-[8px] block mt-0.5 font-mono">
                              Actor: {log.actorName || 'Authorized User'} ({log.actorId ? log.actorId.substring(0, 6) : 'Sys'})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
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
                await updateMyProfile(
                  editDisplayName, 
                  editBio, 
                  editStatus, 
                  undefined, 
                  editEmojiStatus, 
                  editPhoneNumber,
                  {
                    phoneNumber: privacyNumber,
                    statusMessage: privacyStatus,
                    photoURL: privacyPhoto,
                    lastSeen: privacyLastSeen,
                    onlineStatus: privacyOnline
                  }
                );
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
