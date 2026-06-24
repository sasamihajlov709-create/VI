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
  User,
  Check,
  CheckSquare,
  CheckCircle2,
  Bell,
  ShieldCheck,
  Lock,
  Phone,
  Camera,
  Clock,
  Activity,
  Database,
  RefreshCw,
  Terminal,
  Palette,
  Forward
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
    deleteChat,
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
    updateMyProfile,
    joinChatByInviteCode,
    terminateOtherSessions,
    resolveReport,
    globalReports,
    globalAuditLogs
  } = useMessenger();

  const { t, language, setLanguage } = useLanguage();

  const getFolderIcon = (iconName: string) => {
    switch (iconName) {
      case 'archive': return <Archive className="w-4.5 h-4.5" />;
      case 'users': return <Users className="w-4.5 h-4.5" />;
      case 'tv': return <Tv className="w-4.5 h-4.5" />;
      case 'sparkles': return <Sparkles className="w-4.5 h-4.5" />;
      case 'bookmark': return <Bookmark className="w-4.5 h-4.5" />;
      default: return <Folder className="w-4.5 h-4.5" />;
    }
  };

  // Dialog / Modal State Managers
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  
  // Custom non-blocking visual Toast Notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  
  // Search state
  const [sidebarCtxMenu, setSidebarCtxMenu] = useState<string | null>(null);
  const [deleteConfirmChatId, setDeleteConfirmChatId] = useState<string | null>(null);
  const [pendingDeleteChatId, setPendingDeleteChatId] = useState<string | null>(null);
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

  // Multi-delete states
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [showMultiDeleteConfirm, setShowMultiDeleteConfirm] = useState(false);

  // Hidden Default Folders states
  const [hiddenDefaultFolderIds, setHiddenDefaultFolderIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('messenger_hidden_folders');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [folderToDelete, setFolderToDelete] = useState<{ id: string; name: string } | null>(null);

  const hideDefaultFolder = (id: string) => {
    const updated = [...hiddenDefaultFolderIds, id];
    setHiddenDefaultFolderIds(updated);
    localStorage.setItem('messenger_hidden_folders', JSON.stringify(updated));
    if (activeFolder === id) {
      setActiveFolder('all');
    }
  };

  const showDefaultFolder = (id: string) => {
    const updated = hiddenDefaultFolderIds.filter(x => x !== id);
    setHiddenDefaultFolderIds(updated);
    localStorage.setItem('messenger_hidden_folders', JSON.stringify(updated));
  };

  const handleBulkDelete = async () => {
    if (selectedChatIds.length === 0) return;
    try {
      // Filter out Favorites chat so it is never deleted
      const safeChatIds = selectedChatIds.filter(id => {
        const c = chats.find(chat => chat.id === id);
        const isFavorites = c?.type === 'direct' && c?.members.length === 1 && c?.members[0] === currentUser?.uid;
        return !isFavorites;
      });
      if (safeChatIds.length > 0) {
        await Promise.all(safeChatIds.map(id => deleteChat(id)));
      }
      setSelectedChatIds([]);
      setIsSelectionMode(false);
      setShowMultiDeleteConfirm(false);
    } catch (err) {
      console.error("Error bulk deleting chats", err);
    }
  };

  const handleFolderDelete = async () => {
    if (!folderToDelete) return;
    try {
      await deleteFolder(folderToDelete.id);
      setFolderToDelete(null);
      if (activeFolder === folderToDelete.id) {
        setActiveFolder('all');
      }
    } catch (err) {
      console.error("Error deleting folder", err);
    }
  };

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
      const newChat = await createGroupOrChannel(
        newChatTitle,
        chatTypeSelection,
        selectedMembers,
        groupRules,
        groupWelcome
      );
      if (chatTypeSelection === 'channel') {
        setActiveFolder('channels');
      } else {
        setActiveFolder('all');
      }
      setActiveChat(newChat);
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
        showToast(language === 'ru' ? "История успешно загружена и будет доступна 24 часа!" : "Story successfully uploaded and visible for 24 hours!", 'success');
      } catch (e: any) {
        logger.error("Failed to upload story asset", { error: e.message });
        showToast(language === 'ru' ? "Не удалось загрузить историю." : "Failed to upload story.", 'error');
      }
    }
  };

  // Gesture-based swipe navigation across tabs (direct DOM mutation for butter-smooth 120 FPS)
  const gestureDxRef = useRef<number>(0);
  const swipeContainerRef = useRef<HTMLDivElement>(null);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const swipeMouseStartX = useRef<number | null>(null);
  const swipeMouseStartY = useRef<number | null>(null);
  const swipeLockDirection = useRef<'none' | 'horizontal' | 'vertical'>('none');
  const animationFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  const handleGestureTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('input') || 
      target.closest('textarea') || 
      target.closest('[role="slider"]') ||
      target.closest('.no-swipe')
    ) {
      return;
    }
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
    swipeLockDirection.current = 'none';
    gestureDxRef.current = 0;
  };

  const handleGestureTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (swipeStartX.current === null || swipeStartY.current === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - swipeStartX.current;
    const diffY = currentY - swipeStartY.current;

    if (swipeLockDirection.current === 'none') {
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);
      if (absX > 10 || absY > 10) {
        if (absX > absY) {
          swipeLockDirection.current = 'horizontal';
        } else {
          swipeLockDirection.current = 'vertical';
        }
      }
    }

    if (swipeLockDirection.current === 'horizontal') {
      if (e.cancelable) e.preventDefault();
      gestureDxRef.current = diffX;

      if (!animationFrameIdRef.current) {
        animationFrameIdRef.current = requestAnimationFrame(() => {
          if (swipeContainerRef.current) {
            swipeContainerRef.current.style.transition = 'none';
            swipeContainerRef.current.style.transform = `translate3d(calc(${-activeIndex * 25}% + ${gestureDxRef.current}px), 0, 0)`;
          }
          animationFrameIdRef.current = null;
        });
      }
    }
  };

  const handleGestureTouchEnd = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    if (swipeStartX.current === null) return;
    const threshold = 50; // Low threshold for high responsiveness
    const viewsOrder: ('chats' | 'contacts' | 'settings' | 'profile')[] = ['chats', 'contacts', 'settings', 'profile'];
    const idx = viewsOrder.indexOf(sidebarView);
    const dX = gestureDxRef.current;

    let targetIdx = idx;

    if (swipeLockDirection.current === 'horizontal') {
      if (dX < -threshold) {
        // Swipe left -> next tab, wrapping around
        targetIdx = (idx + 1) % viewsOrder.length;
      } else if (dX > threshold) {
        // Swipe right -> previous tab, wrapping around
        targetIdx = (idx - 1 + viewsOrder.length) % viewsOrder.length;
      }
    }

    if (swipeContainerRef.current) {
      swipeContainerRef.current.style.transition = 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)';
      swipeContainerRef.current.style.transform = `translate3d(${-targetIdx * 25}%, 0, 0)`;
    }

    if (targetIdx !== idx) {
      setSidebarView(viewsOrder[targetIdx]);
      setSearchQuery('');
      if ('vibrate' in navigator) navigator.vibrate(10);
    }

    swipeStartX.current = null;
    swipeStartY.current = null;
    swipeLockDirection.current = 'none';
    gestureDxRef.current = 0;
  };

  const handleGestureMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('input') || 
      target.closest('textarea') || 
      target.closest('[role="slider"]') ||
      target.closest('.no-swipe') ||
      e.button !== 0
    ) {
      return;
    }
    swipeMouseStartX.current = e.clientX;
    swipeMouseStartY.current = e.clientY;
    swipeLockDirection.current = 'none';
    gestureDxRef.current = 0;
  };

  const handleGestureMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (swipeMouseStartX.current === null || swipeMouseStartY.current === null) return;
    const diffX = e.clientX - swipeMouseStartX.current;
    const diffY = e.clientY - swipeMouseStartY.current;

    if (swipeLockDirection.current === 'none') {
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);
      if (absX > 15 || absY > 15) {
        if (absX > absY) {
          swipeLockDirection.current = 'horizontal';
        } else {
          swipeLockDirection.current = 'vertical';
        }
      }
    }

    if (swipeLockDirection.current === 'horizontal') {
      e.preventDefault();
      gestureDxRef.current = diffX;

      if (!animationFrameIdRef.current) {
        animationFrameIdRef.current = requestAnimationFrame(() => {
          if (swipeContainerRef.current) {
            swipeContainerRef.current.style.transition = 'none';
            swipeContainerRef.current.style.transform = `translate3d(calc(${-activeIndex * 25}% + ${gestureDxRef.current}px), 0, 0)`;
          }
          animationFrameIdRef.current = null;
        });
      }
    }
  };

  const handleGestureMouseUp = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    if (swipeMouseStartX.current === null) return;
    const threshold = 50;
    const viewsOrder: ('chats' | 'contacts' | 'settings' | 'profile')[] = ['chats', 'contacts', 'settings', 'profile'];
    const idx = viewsOrder.indexOf(sidebarView);
    const dX = gestureDxRef.current;

    let targetIdx = idx;

    if (swipeLockDirection.current === 'horizontal') {
      if (dX < -threshold) {
        // Swipe left -> next tab, wrapping around
        targetIdx = (idx + 1) % viewsOrder.length;
      } else if (dX > threshold) {
        // Swipe right -> previous tab, wrapping around
        targetIdx = (idx - 1 + viewsOrder.length) % viewsOrder.length;
      }
    }

    if (swipeContainerRef.current) {
      swipeContainerRef.current.style.transition = 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)';
      swipeContainerRef.current.style.transform = `translate3d(${-targetIdx * 25}%, 0, 0)`;
    }

    if (targetIdx !== idx) {
      setSidebarView(viewsOrder[targetIdx]);
      setSearchQuery('');
    }

    swipeMouseStartX.current = null;
    swipeMouseStartY.current = null;
    swipeLockDirection.current = 'none';
    gestureDxRef.current = 0;
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
    if (activeFolder !== 'all' && activeFolder !== 'channels' && chat.type === 'channel') return false;
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

  const viewsOrder: ('chats' | 'contacts' | 'settings' | 'profile')[] = ['chats', 'contacts', 'settings', 'profile'];
  const activeIndex = viewsOrder.indexOf(sidebarView);

  return (
    <div 
      onTouchStart={handleGestureTouchStart}
      onTouchMove={handleGestureTouchMove}
      onTouchEnd={handleGestureTouchEnd}
      onMouseDown={handleGestureMouseDown}
      onMouseMove={handleGestureMouseMove}
      onMouseUp={handleGestureMouseUp}
      onMouseLeave={handleGestureMouseUp}
      className={`w-full md:w-[422px] border-r border-[var(--glass-border)] flex h-full shrink-0 relative overflow-hidden backdrop-blur-3xl bg-[var(--glass-bg)] select-none ${activeChat ? 'hidden md:flex' : 'flex'}`} 
    >
      <div className="hidden md:flex w-[82px] h-full bg-[var(--glass-bg-hover)] backdrop-blur-[45px] border-r border-[var(--glass-border)] flex-col items-center py-8 gap-7 shrink-0 no-swipe z-30 relative shadow-[12px_0_40px_rgba(0,0,0,0.3)]">
        <div 
          onClick={() => {
            setActiveFolder('all');
            setActiveChat(null);
          }}
          className={`w-13 h-13 rounded-[22px] flex items-center justify-center cursor-pointer transition-all duration-400 relative group ${activeFolder === 'all' && !activeChat ? 'text-white' : 'text-slate-500 hover:text-slate-200'}`}
          title={language === 'ru' ? 'Все чаты' : 'All Chats'}
        >
          {activeFolder === 'all' && !activeChat && (
            <motion.div 
              layoutId="railActiveIndicator"
              className="absolute inset-0 bg-white/12 rounded-[22px] border border-white/20 shadow-[0_4px_15px_rgba(0,0,0,0.3)]"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <div className="font-black text-[12px] uppercase tracking-tighter relative z-10">All</div>
        </div>

        {/* Favorites Quick Access Rail Item */}
        <div 
          onClick={() => {
            const favChat = chats.find(c => c.type === 'direct' && [...new Set(c.members)].length === 1 && c.members[0] === currentUser?.uid);
            if (favChat) {
              setActiveChat(favChat);
              setActiveFolder('all');
            } else if (userProfile) {
              createDirectChat(userProfile);
              setActiveFolder('all');
            }
          }}
          className={`w-13 h-13 rounded-[22px] flex items-center justify-center cursor-pointer transition-all duration-400 relative group ${activeChat?.type === 'direct' && [...new Set(activeChat.members)].length === 1 ? 'text-white' : 'text-slate-500 hover:text-cyan-400'}`}
          title={language === 'ru' ? 'Избранное' : 'Saved Messages'}
        >
          {activeChat?.type === 'direct' && [...new Set(activeChat.members)].length === 1 && (
            <motion.div 
              layoutId="railActiveIndicator"
              className="absolute inset-0 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-[22px] shadow-[0_4px_20px_rgba(34,211,238,0.4)] border border-white/20"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <Bookmark className="w-6 h-6 relative z-10" />
        </div>

        {userProfile?.folders?.map((folder) => (
          <div 
            key={folder.id}
            onClick={() => setActiveFolder(folder.id)}
            className={`w-13 h-13 rounded-[22px] flex items-center justify-center cursor-pointer transition-all duration-400 relative group ${activeFolder === folder.id ? 'text-white' : 'text-slate-500 hover:text-white'}`}
            title={folder.name}
          >
            {activeFolder === folder.id && (
              <motion.div 
                layoutId="railActiveIndicator"
                className="absolute inset-0 bg-white/12 rounded-[22px] border border-white/20 shadow-[0_4px_15px_rgba(0,0,0,0.3)]"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <div className="relative z-10 scale-115">{getFolderIcon(folder.icon)}</div>
            <div className="absolute left-20 px-3 py-1.5 vision-floating-header text-[11px] font-bold text-white rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[100] border border-white/20 font-sans shadow-2xl transition-all translate-x-[-10px] group-hover:translate-x-0">
              {folder.name}
            </div>
          </div>
        ))}

        <div className="mt-auto flex flex-col gap-6 pb-4">
          <button 
            onClick={() => setShowFolderModal(true)}
            className="w-13 h-13 rounded-[22px] flex items-center justify-center bg-white/[0.05] text-slate-500 hover:text-cyan-400 hover:bg-white/[0.1] border border-dashed border-white/20 cursor-pointer transition-all duration-400 hover:border-cyan-500/50"
            title={language === 'ru' ? 'Управление папками' : 'Manage Folders'}
          >
            <Plus className="w-7 h-7" />
          </button>

          <div 
            onClick={() => setSidebarView('settings')}
            className={`w-13 h-13 rounded-[22px] flex items-center justify-center cursor-pointer transition-all duration-400 relative ${sidebarView === 'settings' ? 'text-white' : 'text-slate-500 hover:text-white'}`}
            title={language === 'ru' ? 'Настройки' : 'Settings'}
          >
            {sidebarView === 'settings' && (
              <motion.div 
                layoutId="railActiveIndicator"
                className="absolute inset-0 bg-white/12 rounded-[22px] border border-white/20 shadow-[0_4px_15px_rgba(0,0,0,0.3)]"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <Settings className="w-6 h-6 relative z-10" />
          </div>
        </div>
      </div>


      {/* Scrollable / Swipeable content container wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <div 
          className="flex-1 overflow-hidden relative"
        >
        <div 
          ref={swipeContainerRef}
          className="flex h-full w-[400%]"
          style={{
            transform: `translate3d(${-activeIndex * 25}%, 0, 0)`,
            transition: 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'transform'
          }}
        >
          {/* Panel 0: Chats */}
          <div className="w-[25%] h-full shrink-0 flex flex-col overflow-hidden relative">
            {/* Dynamic Header - Optimized for Telegram look */}
            <div className="pt-1 pb-1 px-4 flex flex-col gap-1 backdrop-blur-3xl shadow-xl transition-all duration-300 relative z-20 border-b border-white/5" style={{ background: 'var(--glass-header-bg)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[12px] bg-gradient-to-br from-purple-800 to-indigo-900 flex items-center justify-center font-black text-white text-[11px] shadow-lg shadow-purple-500/25 border border-white/20 overflow-hidden">
                    VI
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold tracking-tight text-md text-[var(--glass-text)]">{language === 'ru' ? 'Чаты' : 'Chats'}</span>
                    <div className="flex items-center gap-1 mt-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)] animate-pulse" />
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.1em] font-mono">{language === 'ru' ? 'Онлайн' : 'Online'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Settings button removed to resolve duplicate settings */}
                  <button 
                    className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-cyan-400 transition-all cursor-pointer md:hidden border border-white/10 active:scale-95 shadow-lg"
                    onClick={() => setShowCreateChat(true)}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Global Prefix Search Bar */}
              <div className="relative group/search">
                <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/search:text-cyan-400 transition-colors" />
                <input 
                  id="sidebar-search-input"
                  type="text" 
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={handleQueryChange}
                  className="w-full pl-13 pr-6 py-3.5 bg-black/30 border border-white/10 hover:border-white/20 text-[15px] rounded-[24px] focus:border-cyan-400/50 focus:bg-black/50 focus:outline-none placeholder-slate-600 text-slate-100 transition-all duration-300 font-medium shadow-inner backdrop-blur-xl"
                />
              </div>

              {/* Stories Strip - VisionOS Style avatars */}
              <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1 select-none">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="relative group cursor-pointer">
                    <input 
                      type="file" 
                      id="story-upload-input" 
                      className="hidden" 
                      accept="image/*,video/*"
                      onChange={handleStoryUpload}
                    />
                    <label 
                      htmlFor="story-upload-input"
                      className="w-13 h-13 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-400/50 transition-all cursor-pointer overflow-hidden shadow-lg"
                    >
                      <Plus className="w-6 h-6" />
                    </label>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{language === 'ru' ? 'Моя' : 'Yours'}</span>
                </div>

                {Object.values(storiesByUser).map(({ user, list }) => (
                  <div 
                    key={user.uid}
                    className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group"
                    onClick={() => setActiveStoryView(user)}
                  >
                    <div className="w-13 h-13 rounded-full p-[2px] bg-gradient-to-tr from-cyan-400 to-indigo-500 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-300">
                      <div className="w-full h-full rounded-full border-2 border-[#0C1322] overflow-hidden">
                        <img src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName)}`} alt={user.displayName} className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest max-w-[52px] truncate">{user.displayName.split(' ')[0]}</span>
                  </div>
                ))}
              </div>

              {/* Horizontal Folder Tabs (Mobile only) */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-1 md:hidden relative h-11 select-none">
                <button
                  onClick={() => {
                    setActiveFolder('all');
                    if ('vibrate' in navigator) navigator.vibrate(5);
                  }}
                  className={`relative px-6 h-10 flex items-center transition-all duration-400 whitespace-nowrap cursor-pointer rounded-full ${
                    activeFolder === 'all' 
                      ? 'text-white font-bold' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {activeFolder === 'all' && (
                    <motion.div 
                      layoutId="activeFolderMobile"
                      className="absolute inset-0 bg-white/10 vision-floating-header rounded-full border border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="text-[14px] tracking-tight relative z-10">{language === 'ru' ? 'Все' : 'All'}</span>
                </button>

              <button
                onClick={() => {
                  const favChat = chats.find(c => c.type === 'direct' && [...new Set(c.members)].length === 1 && c.members[0] === currentUser?.uid);
                  if (favChat) {
                    setActiveChat(favChat);
                    setActiveFolder('all');
                  } else if (userProfile) {
                    createDirectChat(userProfile);
                    setActiveFolder('all');
                  }
                  if ('vibrate' in navigator) navigator.vibrate(5);
                }}
                className={`relative px-5 h-9 flex items-center transition-all duration-400 whitespace-nowrap cursor-pointer rounded-full ${
                  activeChat?.type === 'direct' && [...new Set(activeChat.members)].length === 1
                    ? 'text-white font-bold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {activeChat?.type === 'direct' && [...new Set(activeChat.members)].length === 1 && (
                  <motion.div 
                    layoutId="activeFolderMobile"
                    className="absolute inset-0 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-full shadow-[0_4px_15px_rgba(34,211,238,0.3)] border border-white/20"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="text-[13.5px] tracking-tight relative z-10">{language === 'ru' ? 'Избранное' : 'Favorites'}</span>
              </button>

              {userProfile?.folders?.map(folder => {
                const isActive = activeFolder === folder.id;
                const hasUnreads = chats.some(c => folder.chatIds.includes(c.id) && currentUser && (c.unreadCounts?.[currentUser.uid] || 0) > 0);
                return (
                  <button
                    key={folder.id}
                    onClick={() => {
                      setActiveFolder(folder.id);
                      if ('vibrate' in navigator) navigator.vibrate(5);
                    }}
                    className={`relative px-4 h-8 flex items-center transition-all duration-300 whitespace-nowrap cursor-pointer rounded-full ${
                      isActive 
                        ? 'text-white font-bold' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="activeFolderMobile"
                        className="absolute inset-0 bg-white/10 rounded-full border border-white/10"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="text-[13px] tracking-wide relative z-10">{folder.name}</span>
                    {hasUnreads && !isActive && (
                      <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.4)] relative z-10" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Segmented Chats vs. Channels control (Desktop Only or Fallback) */}
            <div className="hidden md:block pt-2">
              <div className="grid grid-cols-2 p-1.5 vision-floating-header rounded-[22px] border border-white/10 text-[12px] shadow-2xl relative overflow-hidden">
                <button
                  type="button"
                  onClick={() => setActiveFolder('all')}
                  className={`py-2.5 rounded-[18px] font-black cursor-pointer transition-all duration-400 relative z-10 ${
                    activeFolder !== 'channels' 
                      ? 'text-white' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {activeFolder !== 'channels' && (
                    <motion.div 
                      layoutId="segmentIndicator"
                      className="absolute inset-0 bg-white/10 rounded-[18px] border border-white/20 shadow-lg"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-20 uppercase tracking-widest">{language === 'ru' ? 'Чаты' : 'Chats'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFolder('channels')}
                  className={`py-2.5 rounded-[18px] font-black cursor-pointer transition-all duration-400 relative z-10 ${
                    activeFolder === 'channels' 
                      ? 'text-white' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {activeFolder === 'channels' && (
                    <motion.div 
                      layoutId="segmentIndicator"
                      className="absolute inset-0 bg-white/10 rounded-[18px] border border-white/20 shadow-lg"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-20 uppercase tracking-widest">{language === 'ru' ? 'Каналы' : 'Channels'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      {/* Prefix live search results dropdown */}
      {searchResults.length > 0 && (
        <div className="absolute top-[125px] left-5 right-5 vision-context-menu backdrop-blur-[50px] shadow-[0_25px_60px_rgba(0,0,0,0.6)] z-[100] max-h-[380px] overflow-y-auto rounded-[32px] border border-white/20 p-3 space-y-1.5 custom-scrollbar animate-in fade-in zoom-in duration-300">
          <div className="px-5 py-2.5 text-[11px] uppercase font-black text-cyan-400 tracking-[0.2em] font-mono">
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
              className="flex items-center gap-4 p-4 hover:bg-white/[0.12] active:bg-white/[0.18] rounded-[24px] cursor-pointer transition-all duration-300 border border-transparent hover:border-white/10 group"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/10 group-hover:scale-105 transition-transform duration-300 shadow-lg">
                  <img src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName)}`} alt={user.displayName} className="w-full h-full object-cover" />
                </div>
                {onlineUsers[user.uid] === 'online' && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#0C1322] shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15.5px] font-bold text-white truncate tracking-tight">{user.displayName}</div>
                <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider font-mono">@{user.username}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Chat List view (Virtualized density and pull-down gesture support) */}
      <div 
        ref={listContainerRef} 
        className="flex-1 overflow-y-auto relative bg-transparent scrollbar-none" 
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
            className="w-full flex items-center justify-center bg-white/5 text-xs border-b border-white/[0.02] overflow-hidden text-slate-400 select-none shrink-0 backdrop-blur-md"
          >
            <div className="flex items-center gap-2 animate-pulse font-sans tracking-wide">
              <Archive className={`w-4 h-4 text-cyan-400 transition-transform ${pullDistance >= 65 ? 'scale-125 rotate-6 text-amber-400' : ''}`} />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
                {pullDistance >= 65 
                  ? (language === 'ru' ? 'ОТПУСТИТЕ ДЛЯ АРХИВА' : 'RELEASE FOR ARCHIVE')
                  : (language === 'ru' ? 'ПОТЯНИТЕ ДЛЯ АРХИВА' : 'PULL FOR ARCHIVE')
                }
              </span>
            </div>
          </div>
        )}

        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center h-full">
            <div className="w-16 h-16 bg-white/[0.03] rounded-[24px] flex items-center justify-center border border-white/5 mx-auto mb-4 shadow-inner">
              <MessageSquare className="w-7 h-7 text-cyan-400/70" />
            </div>
            <p className="text-[15px] font-bold text-slate-100">{t.noActiveChats}</p>
            <p className="text-[12px] text-slate-500 mt-1.5 max-w-[200px] mx-auto leading-relaxed">{t.noActiveChatsSub}</p>
            
            <div className="mt-8 w-full space-y-2">
              <button 
                onClick={() => {
                  setChatTypeSelection('group');
                  setShowCreateChat(true);
                }}
                className="w-full py-3.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/10 rounded-2xl text-cyan-400 text-sm font-bold transition-all active:scale-95 cursor-pointer"
              >
                {language === 'ru' ? 'Новый чат' : 'New Chat'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ height: totalHeight, width: '100%', position: 'relative' }}>
            {virtualItems.map((item) => {
              const chat = filteredChats[item.index];
              if (!chat) return null;
              const hasUnread = currentUser && chat.unreadCounts && (chat.unreadCounts[currentUser.uid] || 0) > 0;
              const unreadCount = currentUser && chat.unreadCounts ? chat.unreadCounts[currentUser.uid] || 0 : 0;
              const isMuted = currentUser && chat.muteIds?.includes(currentUser.uid);
              const isPinned = currentUser && chat.pinnedIds?.includes(currentUser.uid);
              const isActive = activeChat?.id === chat.id;
              const uniqueMembers = [...new Set(chat.members || [])];
              const isItemFavorites = chat.type === 'direct' && uniqueMembers.length === 1 && uniqueMembers[0] === currentUser?.uid;

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
                  className="px-3 pt-1.5"
                >
                  <motion.div
                    drag={isSelectionMode ? false : "x"}
                    dragDirectionLock
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={{ left: 0.2, right: 0.2 }}
                    style={{ willChange: 'transform, opacity' }}
                    animate={pendingDeleteChatId === chat.id ? { opacity: 0, x: -350, scale: 0.85 } : { opacity: 1, x: 0, scale: 1 }}
                    transition={{ duration: 0.35, ease: [0.32, 0.94, 0.6, 1] }}
                    onClick={() => {
                      if (isSelectionMode) {
                        setSelectedChatIds(prev => 
                          prev.includes(chat.id) ? prev.filter(x => x !== chat.id) : [...prev, chat.id]
                        );
                      } else {
                        setActiveChat(chat);
                        if ('vibrate' in navigator) navigator.vibrate(10);
                      }
                    }}
                    className={`h-full rounded-[20px] flex items-center gap-4 px-4 cursor-pointer select-none relative transition-all duration-300 group overflow-hidden ${
                      isActive 
                        ? 'bg-white/[0.08] backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-white/[0.15]' 
                        : 'hover:bg-white/[0.05] active:bg-white/[0.08] border border-transparent hover:border-white/[0.05]'
                    }`}
                  >
                    {/* Active Chat indicator line */}
                    {isActive && (
                      <div className="absolute left-1.5 top-1/4 bottom-1/4 w-1 bg-cyan-500 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.6)]" />
                    )}

                    {/* Selection Mode Checkbox */}
                    {isSelectionMode && (
                      <div 
                        className="shrink-0 flex items-center justify-center pr-1" 
                        onClick={(e) => { e.stopPropagation(); }}
                      >
                        <button 
                          onClick={() => {
                            setSelectedChatIds(prev => 
                              prev.includes(chat.id) ? prev.filter(x => x !== chat.id) : [...prev, chat.id]
                            );
                          }}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                            selectedChatIds.includes(chat.id) 
                              ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)] text-slate-950 font-bold' 
                              : 'border-white/20 hover:border-cyan-400 bg-white/[0.02]'
                          }`}
                        >
                          {selectedChatIds.includes(chat.id) && <Check className="w-4 h-4 text-slate-950 stroke-[4]" />}
                        </button>
                      </div>
                    )}

                    {/* Chat Thumbnail */}
                    <div className="relative shrink-0 select-none">
                      {isItemFavorites ? (
                        <div className="w-[48px] h-[48px] rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg border border-white/10 shrink-0">
                          <Bookmark className="w-5.5 h-5.5 text-white fill-white/20" />
                        </div>
                      ) : (
                        <div className="w-[48px] h-[48px] rounded-full overflow-hidden border border-white/10 bg-slate-800 shadow-sm">
                          <img 
                            src={chat.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(chat.title)}`} 
                            alt={chat.title} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                      )}
                      {chat.type === 'direct' && !isItemFavorites && (
                        <div className={`w-3.5 h-3.5 rounded-full border-2 border-[#0C1322] absolute -right-0.5 -bottom-0.5 shadow-sm ${
                          chat.members.find(id => id !== currentUser?.uid) && onlineUsers[chat.members.find(id => id !== currentUser?.uid) || ''] === 'online' 
                            ? 'bg-emerald-500' 
                            : 'bg-slate-600'
                        }`} />
                      )}
                    </div>

                    {/* Info block */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[15.5px] font-bold truncate text-slate-100 tracking-tight">
                          {isItemFavorites ? (language === 'ru' ? 'Избранное' : 'Saved Messages') : chat.title}
                        </span>
                        {chat.lastMessage && (
                          <div className="flex items-center gap-2 pl-2 shrink-0">
                            {isPinned && <Pin className="w-3 h-3 text-cyan-400 -rotate-45" />}
                            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider font-mono">
                              {new Date(chat.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <p className="text-[13.5px] text-slate-400 truncate pr-2 flex items-center gap-1.5 font-medium">
                          {getChatTypingIndicator(chat) ? (
                            <span className="text-cyan-400 font-bold animate-pulse">{getChatTypingIndicator(chat)}</span>
                          ) : chat.lastMessage ? (
                            <>
                              {chat.lastMessage.senderId === currentUser?.uid && (
                                <span className="text-cyan-500 shrink-0">
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M16 6L5 17L0 12" className="translate-x-1" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </span>
                              )}
                              <span className="truncate opacity-80">
                                {chat.type === 'group' && chat.lastMessage.senderId !== currentUser?.uid && (
                                  <span className="text-slate-300 font-bold">{chat.lastMessage.senderName}: </span>
                                )}
                                {chat.lastMessage.text}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-500 italic opacity-60 font-normal">{language === 'ru' ? 'Нет сообщений' : 'No messages yet'}</span>
                          )}
                        </p>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isMuted && <VolumeX className="w-3.5 h-3.5 text-slate-600" />}
                          {hasUnread && (
                            <span className={`text-[10px] font-black min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full leading-none text-white ${isMuted ? 'bg-slate-700' : 'bg-cyan-600 shadow-[0_0_10px_rgba(8,145,178,0.5)]'}`}>
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        )}

        {/* Floating Multi-select Action Bar */}
        <AnimatePresence>
          {isSelectionMode && selectedChatIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute bottom-4 left-4 right-4 z-40 bg-slate-950/95 backdrop-blur-xl border border-white/10 p-3.5 rounded-2xl flex items-center justify-between shadow-2xl"
            >
              <div className="flex flex-col select-none">
                <span className="text-xs font-semibold text-slate-100">
                  {language === 'ru' 
                    ? `Выбрано диалогов: ${selectedChatIds.length}` 
                    : `Selected Chats: ${selectedChatIds.length}`}
                </span>
                <span className="text-[10px] text-slate-400 font-sans">
                  {language === 'ru' ? 'Выберите действие' : 'Choose action'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedChatIds([]);
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 active:scale-95 transition text-[11px] font-bold text-slate-300 rounded-xl cursor-pointer"
                >
                  {language === 'ru' ? 'Отмена' : 'Cancel'}
                </button>
                <button
                  onClick={() => setShowMultiDeleteConfirm(true)}
                  className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 active:scale-95 transition text-[11px] font-bold text-rose-450 rounded-xl cursor-pointer flex items-center gap-1 shadow-lg shadow-rose-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5 animate-bounce-gentle" />
                  {language === 'ru' ? 'Удалить' : 'Delete'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulk Deletion Confirmation Dialog Modal */}
        <AnimatePresence>
          {showMultiDeleteConfirm && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-sm vision-floating-header p-6 rounded-[32px] shadow-[0_30px_70px_rgba(0,0,0,0.6)] text-center animate-in fade-in zoom-in-95 duration-300"
              >
                <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/5">
                  <Trash2 className="w-7 h-7 text-rose-400 animate-pulse" />
                </div>
                <h3 className="text-base font-bold text-slate-100 uppercase tracking-widest mb-2">
                  {language === 'ru' ? 'Удаление чатов' : 'Bulk Delete'}
                </h3>
                <p className="text-[13px] text-slate-400 mb-6 leading-relaxed px-2">
                  {language === 'ru' 
                    ? `Вы действительно хотите удалить выбранные диалоги (${selectedChatIds.length})? Это действие необратимо.` 
                    : `Are you sure you want to delete all selected (${selectedChatIds.length}) chats? This action is irreversible.`}
                </p>
                <div className="flex justify-center gap-3 text-xs font-bold uppercase tracking-wider">
                  <button
                    onClick={() => setShowMultiDeleteConfirm(false)}
                    className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 active:scale-95 rounded-2xl text-slate-400 cursor-pointer transition border border-white/5"
                  >
                    {language === 'ru' ? 'Отмена' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 active:scale-95 rounded-2xl text-white cursor-pointer transition shadow-xl shadow-rose-500/20"
                  >
                    {language === 'ru' ? 'Удалить' : 'Delete'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Folder Deletion Confirmation Dialog Modal */}
        <AnimatePresence>
          {folderToDelete && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-sm glass-panel bg-[#0d1627]/95 border border-white/10 p-5 rounded-2xl shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200"
              >
                <div className="w-12 h-12 rounded-full bg-rose-500/15 border border-rose-500/20 flex items-center justify-center mx-auto mb-3.5">
                  <FolderOpen className="w-6 h-6 text-rose-450 animate-pulse" />
                </div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide mb-1.5">
                  {language === 'ru' ? 'Удаление папки' : 'Delete Folder'}
                </h3>
                <p className="text-xs text-slate-400 mb-5 leading-normal md:px-2">
                  {language === 'ru' 
                    ? `Вы уверены, что хотите удалить папку «${folderToDelete.name}»? Все чаты останутся невредимыми.` 
                    : `Are you sure you want to delete folder "${folderToDelete.name}"? The chats inside will remain untampered.`}
                </p>
                <div className="flex justify-end gap-2 text-xs font-semibold">
                  <button
                    onClick={() => setFolderToDelete(null)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 active:scale-95 rounded-xl text-slate-350 cursor-pointer transition"
                  >
                    {language === 'ru' ? 'Отмена' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleFolderDelete}
                    className="px-4 py-2 bg-rose-500 hover:bg-rose-600 active:scale-95 rounded-xl text-white font-bold cursor-pointer transition shadow-lg shadow-rose-500/25"
                  >
                    {language === 'ru' ? 'Да, удалить' : 'Yes, Delete'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Chat Actions Context Menu Modal */}
        <AnimatePresence>
          {sidebarCtxMenu && (() => {
            const ctxChat = chats.find(c => c.id === sidebarCtxMenu);
            if (!ctxChat) return null;
            const isFavorites = ctxChat.type === 'direct' && ctxChat.members.length === 1 && ctxChat.members[0] === currentUser?.uid;
            const isPinned = currentUser && ctxChat.pinnedIds?.includes(currentUser.uid);
            const isMuted = currentUser && ctxChat.muteIds?.includes(currentUser.uid);
            const isArchived = currentUser && ctxChat.archivedIds?.includes(currentUser.uid);

            return (
              <div 
                className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={() => setSidebarCtxMenu(null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="w-full max-w-sm vision-floating-header p-6 rounded-[32px] shadow-[0_30px_70px_rgba(0,0,0,0.5)] space-y-5 animate-in fade-in zoom-in-95 duration-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-4 pb-4 border-b border-white/10">
                    <img 
                      src={ctxChat.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(ctxChat.title)}`} 
                      alt={ctxChat.title} 
                      className="w-12 h-12 rounded-full object-cover border border-white/20 shadow-lg" 
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[15px] font-bold text-slate-100 truncate tracking-tight">{ctxChat.title}</h4>
                      <p className="text-[11.5px] text-slate-500 font-medium truncate uppercase tracking-widest mt-0.5">
                        {isFavorites 
                          ? (language === 'ru' ? 'Личное облако' : 'Personal Cloud')
                          : ctxChat.type === 'group' 
                            ? (language === 'ru' ? 'Группа' : 'Group Chat') 
                            : (language === 'ru' ? 'Диалог' : 'Direct Message')
                        }
                      </p>
                    </div>
                  </div>

                  {isFavorites && (
                    <div className="p-3 bg-cyan-500/10 border border-cyan-500/15 rounded-xl text-[11px] text-cyan-400 leading-normal font-sans text-center">
                      {language === 'ru' 
                        ? 'Это ваше личное избранное облако. Здесь можно хранить заметки, файлы и ссылки. Этот чат нельзя удалить.' 
                        : 'This is your personal Favorites cloud. You can store notes, files, and links here. This chat cannot be deleted.'}
                    </div>
                  )}

                  <div className="space-y-2">
                    {/* Pin Action */}
                    <button
                      onClick={async () => {
                        await togglePinChat(ctxChat.id);
                        setSidebarCtxMenu(null);
                      }}
                      className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.1] active:scale-[0.98] border border-white/10 text-xs font-bold text-slate-100 transition-all cursor-pointer group shadow-sm"
                    >
                      <div className="flex items-center gap-3.5">
                        <Pin className={`w-4.5 h-4.5 text-cyan-400 transition-transform group-hover:rotate-12 ${isPinned ? 'fill-cyan-400' : ''}`} />
                        <span>{isPinned ? (language === 'ru' ? 'Открепить' : 'Unpin Chat') : (language === 'ru' ? 'Закрепить' : 'Pin Chat')}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono tracking-tighter uppercase opacity-60">Swipe Right</span>
                    </button>

                    {!isFavorites && (
                      <>
                        {/* Mute Action */}
                        <button
                          onClick={async () => {
                            await toggleMuteChat(ctxChat.id);
                            setSidebarCtxMenu(null);
                          }}
                          className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.1] active:scale-[0.98] border border-white/10 text-xs font-bold text-slate-100 transition-all cursor-pointer group shadow-sm"
                        >
                          {isMuted ? (
                            <Volume2 className="w-4.5 h-4.5 text-emerald-400" />
                          ) : (
                            <VolumeX className="w-4.5 h-4.5 text-slate-400 group-hover:text-amber-400" />
                          )}
                          <span>{isMuted ? (language === 'ru' ? 'Включить звук' : 'Unmute Chat') : (language === 'ru' ? 'Выключить звук' : 'Mute Chat')}</span>
                        </button>

                        {/* Archive Action */}
                        <button
                          onClick={async () => {
                            await toggleArchiveChat(ctxChat.id);
                            setSidebarCtxMenu(null);
                          }}
                          className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.1] active:scale-[0.98] border border-white/10 text-xs font-bold text-slate-100 transition-all cursor-pointer group shadow-sm"
                        >
                          <div className="flex items-center gap-3.5">
                            <Archive className="w-4.5 h-4.5 text-amber-500" />
                            <span>{isArchived ? (language === 'ru' ? 'Вернуть из архива' : 'Unarchive Chat') : (language === 'ru' ? 'В архив' : 'Archive Chat')}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 font-mono tracking-tighter uppercase opacity-60">Swipe Left</span>
                        </button>

                        {/* Delete Action */}
                        <button
                          onClick={() => {
                            setSidebarCtxMenu(null);
                            setDeleteConfirmChatId(ctxChat.id);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/10 text-xs font-semibold text-rose-400 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-rose-450 animate-bounce-gentle" />
                          <span>{language === 'ru' ? 'Удалить диалог' : 'Delete Chat'}</span>
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => setSidebarCtxMenu(null)}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-350 rounded-xl transition cursor-pointer text-center"
                  >
                    {language === 'ru' ? 'Закрыть' : 'Close'}
                  </button>
                </motion.div>
              </div>
            );
          })()}
        </AnimatePresence>

        {/* Single Chat Deletion Confirmation Dialog Modal */}
        <AnimatePresence>
          {deleteConfirmChatId && (() => {
            const chatToDelete = chats.find(c => c.id === deleteConfirmChatId);
            if (!chatToDelete) return null;
            return (
              <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-full max-w-sm glass-panel bg-[#0d1627]/95 border border-white/10 p-5 rounded-2xl shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200"
                >
                  <div className="w-12 h-12 rounded-full bg-rose-500/15 border border-rose-500/20 flex items-center justify-center mx-auto mb-3.5">
                    <Trash2 className="w-6 h-6 text-rose-450 animate-pulse" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide mb-1.5">
                    {language === 'ru' ? 'Удаление чата' : 'Delete Chat'}
                  </h3>
                  <p className="text-xs text-slate-400 mb-5 leading-normal md:px-2">
                    {language === 'ru' 
                      ? `Вы уверены, что хотите удалить чат «${chatToDelete.title}»? Это действие необратимо.` 
                      : `Are you sure you want to delete the chat "${chatToDelete.title}"? This action is irreversible.`}
                  </p>
                  <div className="flex justify-end gap-2 text-xs font-semibold">
                    <button
                      onClick={() => setDeleteConfirmChatId(null)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 active:scale-95 rounded-xl text-slate-350 cursor-pointer transition"
                    >
                      {language === 'ru' ? 'Отмена' : 'Cancel'}
                    </button>
                    <button
                      onClick={async () => {
                        await deleteChat(deleteConfirmChatId);
                        setDeleteConfirmChatId(null);
                      }}
                      className="px-4 py-2 bg-rose-500 hover:bg-rose-600 active:scale-95 rounded-xl text-white font-bold cursor-pointer transition shadow-lg shadow-rose-500/25"
                    >
                      {language === 'ru' ? 'Да, удалить' : 'Yes, Delete'}
                    </button>
                  </div>
                </motion.div>
              </div>
            );
          })()}
        </AnimatePresence>
      </div>

      {/* Panel 1: Contacts */}
          <div className="w-[25%] h-full shrink-0 flex flex-col overflow-y-auto relative border-l border-white/[0.02]">
            <SidebarContactsView
              contactsList={contactsList}
              globalUsers={globalUsers}
              onlineUsers={onlineUsers}
              addContactByUsername={addContactByUsername}
              createDirectChat={createDirectChat}
              setSidebarView={setSidebarView}
              language={language}
            />
          </div>

          {/* Panel 2: Settings */}
          <div className="w-[25%] h-full shrink-0 flex flex-col overflow-y-auto relative border-l border-white/[0.02]">
            <SidebarSettingsView
              userProfile={userProfile}
              theme={theme}
              setTheme={setTheme}
              language={language}
            />
          </div>

          {/* Panel 3: Profile */}
          <div className="w-[25%] h-full shrink-0 flex flex-col overflow-y-auto relative border-l border-white/[0.02]">
            <SidebarProfileView
              userProfile={userProfile}
              uploadAvatar={uploadAvatar}
              deleteAvatar={deleteAvatar}
              updateMyProfile={updateMyProfile}
              createDirectChat={createDirectChat}
              logout={logout}
              language={language}
            />
          </div>
        </div>

        {/* Swipe cue indicator removed per request */}
      </div>

      {/* Bottom Navigation Dock */}
      <div className="grid grid-cols-4 border-t border-white/5 bg-[#0a0a0d]/65 backdrop-blur-md text-slate-450 text-[10px] select-none shrink-0 relative md:hidden" style={{ height: '56px' }}>
        {(() => {
          const totalUnreads = chats.reduce((acc, chat) => {
            const isArchived = currentUser && chat.archivedIds?.includes(currentUser.uid);
            if (isArchived) return acc;
            const count = currentUser && chat.unreadCounts ? chat.unreadCounts[currentUser.uid] || 0 : 0;
            return acc + count;
          }, 0);

          return [
            { id: 'chats', label: language === 'ru' ? 'Чаты' : 'Chats', icon: MessageSquare },
            { id: 'contacts', label: language === 'ru' ? 'Контакты' : 'Contacts', icon: Users },
            { id: 'settings', label: language === 'ru' ? 'Настройки' : 'Settings', icon: Sliders },
            { id: 'profile', label: language === 'ru' ? 'Профиль' : 'Profile', icon: User },
          ].map((btn) => {
            const Icon = btn.icon;
            const isActive = sidebarView === btn.id;
            return (
              <motion.button
                key={btn.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSidebarView(btn.id as any);
                  setSearchQuery('');
                }}
                className={`flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all relative ${isActive ? 'text-cyan-400 font-bold' : 'hover:text-slate-200 text-slate-450'}`}
              >
                <div className="relative">
                  <Icon className={`w-4.5 h-4.5 transition-transform duration-300 ${isActive ? 'scale-110 text-cyan-400 stroke-[2.2px]' : 'scale-100 opacity-65'}`} />
                  
                  {/* Total unread badge for Chats button */}
                  {btn.id === 'chats' && totalUnreads > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 text-[9px] font-black h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full shadow-[0_2px_8px_rgba(6,182,212,0.6)] leading-none">
                      {totalUnreads}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight">{btn.label}</span>

                {/* Animated active navigation tab underline/glow */}
                {isActive && (
                  <motion.div
                    layoutId="activeNavTab"
                    className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-gradient-to-r from-cyan-400 to-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.7)] rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          });
        })()}
        </div>
      </div>

      {/* Creation Modal */}
      {showCreateChat && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 z-[500] select-none">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-md bg-[#0E0E10]/95 border border-white/10 rounded-[32px] p-7 shadow-2xl relative backdrop-blur-3xl"
          >
            <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-5">
              <span className="font-bold text-slate-100 text-[17px]">{language === 'ru' ? 'Новый чат' : 'New Chat'}</span>
              <button onClick={() => setShowCreateChat(false)} className="text-slate-400 hover:text-white p-1.5 bg-white/5 rounded-full transition active:scale-90 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChatSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-[0.2em] text-cyan-400/80 mb-2.5 ml-1">{language === 'ru' ? 'КЛАСС БЕСЕДЫ' : 'CONVERSATION CLASS'}</label>
                <div className="grid grid-cols-2 gap-3 text-sm text-[var(--glass-text)]">
                  <button 
                    type="button"
                    onClick={() => setChatTypeSelection('group')}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 ${chatTypeSelection === 'group' ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.1)]' : 'border-white/5 bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.06]'}`}
                  >
                    <div className={`p-2.5 rounded-xl transition-colors ${chatTypeSelection === 'group' ? 'bg-cyan-500/20' : 'bg-white/5'}`}>
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="font-semibold">{language === 'ru' ? 'Группа' : 'Group Chat'}</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setChatTypeSelection('channel')}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 ${chatTypeSelection === 'channel' ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.1)]' : 'border-white/5 bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.06]'}`}
                  >
                    <div className={`p-2.5 rounded-xl transition-colors ${chatTypeSelection === 'channel' ? 'bg-cyan-500/20' : 'bg-white/5'}`}>
                      <Tv className="w-5 h-5" />
                    </div>
                    <span className="font-semibold">{language === 'ru' ? 'Канал' : 'Channel'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 mb-2 ml-1">{language === 'ru' ? 'НАЗВАНИЕ' : 'TITLE'}</label>
                <input 
                  type="text" 
                  value={newChatTitle}
                  onChange={(e) => setNewChatTitle(e.target.value)}
                  placeholder={language === 'ru' ? 'Назовите ваш чат...' : 'Insert title...'}
                  className="w-full bg-white/[0.03] text-slate-100 border border-white/5 px-4 py-3 rounded-2xl text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.05] transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 mb-2 ml-1">{language === 'ru' ? 'ОПИСАНИЕ / ПРАВИЛА' : 'INFO / RULES'}</label>
                <textarea 
                  value={groupRules}
                  onChange={(e) => setGroupRules(e.target.value)}
                  placeholder={language === 'ru' ? 'Информация о канале или правила...' : 'Information or behavior rules...'}
                  className="w-full bg-white/[0.03] text-slate-100 border border-white/5 px-4 py-3 rounded-2xl text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.05] transition-all h-20 resize-none custom-scrollbar shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 mb-2 ml-1">{language === 'ru' ? 'ПРИГЛАСИТЬ УЧАСТНИКОВ' : 'INVITE MEMBERS'}</label>
                <div className="max-h-[140px] overflow-y-auto space-y-1.5 bg-white/[0.03] p-2.5 rounded-2xl border border-white/5 custom-scrollbar shadow-inner">
                  {contactsList.length === 0 ? (
                    <div className="text-xs text-slate-500 italic p-3 text-center">
                      {language === 'ru' ? 'У вас пока нет контактов.' : 'No contacts added yet.'}
                    </div>
                  ) : (
                    contactsList.map((c) => (
                      <label key={c.uid} className="flex items-center gap-3.5 p-2.5 hover:bg-white/5 rounded-xl cursor-pointer text-sm text-slate-200 transition-colors group">
                        <div className="relative">
                          <input 
                            type="checkbox"
                            checked={selectedMembers.includes(c.uid)}
                            onChange={() => {
                              setSelectedMembers(prev => 
                                prev.includes(c.uid) ? prev.filter(x => x !== c.uid) : [...prev, c.uid]
                              );
                            }}
                            className="hidden" 
                          />
                          <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${selectedMembers.includes(c.uid) ? 'bg-cyan-500 border-cyan-500' : 'bg-white/5 border-white/10 group-hover:border-white/20'}`}>
                            {selectedMembers.includes(c.uid) && <Check className="w-3.5 h-3.5 text-slate-950 font-bold" />}
                          </div>
                        </div>
                        <img src={c.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.displayName || 'U')}`} alt={c.displayName || 'User'} className="w-7 h-7 rounded-lg object-cover border border-white/10" />
                        <span className="font-medium truncate">{c.displayName || 'User'}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-2xl text-sm transition shadow-[0_10px_25px_rgba(34,211,238,0.2)] active:scale-95 cursor-pointer"
                >
                  {language === 'ru' ? 'Создать чат' : 'Initialize Chat'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Directory Folder Creation Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 z-[500] select-none">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-md bg-[#0E0E10]/95 border border-white/10 rounded-[32px] p-7 shadow-2xl relative backdrop-blur-3xl"
          >
            {editingFolderId === null ? (
              // --- MODE A: LISTING & ORDERING ALL FOLDERS ---
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-5 border-b border-white/10">
                  <div className="flex flex-col">
                    <span className="font-black text-white text-[22px] tracking-tight">{language === 'ru' ? 'Папки' : 'Folders'}</span>
                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{language === 'ru' ? 'Управление категориями' : 'Manage categories'}</span>
                  </div>
                  <button onClick={() => setShowFolderModal(false)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05] rounded-[18px] transition active:scale-90 cursor-pointer border border-white/10">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1.5 custom-scrollbar">
                  {(!userProfile?.folders || userProfile.folders.length === 0) ? (
                    <div className="text-center py-12 bg-white/[0.02] rounded-[28px] border border-dashed border-white/10">
                      <div className="text-4xl mb-3 opacity-30">📁</div>
                      <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">
                        {language === 'ru' 
                          ? 'Список пуст' 
                          : 'No folders'}
                      </p>
                    </div>
                  ) : (
                    userProfile.folders.map((f, idx) => {
                      const listLength = userProfile.folders!.length;
                      return (
                        <div 
                          key={f.id} 
                          className="group p-4 bg-white/[0.03] border border-white/10 rounded-[22px] flex items-center justify-between transition-all hover:bg-white/[0.08] hover:border-white/20 shadow-md"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-[18px] bg-white/[0.05] flex items-center justify-center text-cyan-400 border border-white/10 group-hover:scale-105 transition-transform">
                              <Folder className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="text-[15px] font-black text-white tracking-tight">{f.name}</div>
                              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                {f.chatIds?.length || 0} {language === 'ru' ? 'диалогов' : 'chats'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveFolder(idx, 'up')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/10 disabled:opacity-20 cursor-pointer transition"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === listLength - 1}
                              onClick={() => handleMoveFolder(idx, 'down')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/10 disabled:opacity-20 cursor-pointer transition"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingFolderId(f.id);
                                setNewFolderName(f.name);
                                setNewFolderChats(f.chatIds || []);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/10 cursor-pointer transition"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteFolder(f.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10 cursor-pointer transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-2.5">
                    <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 ml-1">
                      {language === 'ru' ? 'БЫСТРЫЕ ПРЕСЕТЫ' : 'QUICK PRESETS'}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleCreatePreset('work')}
                        className="flex-1 px-4 py-3 text-xs font-bold bg-white/[0.03] border border-white/5 rounded-2xl hover:border-cyan-500/40 hover:bg-cyan-500/5 text-slate-300 hover:text-cyan-400 cursor-pointer transition-all active:scale-95"
                      >
                        💼 {language === 'ru' ? 'Работа' : 'Work/Groups'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCreatePreset('channels')}
                        className="flex-1 px-4 py-3 text-xs font-bold bg-white/[0.03] border border-white/5 rounded-2xl hover:border-cyan-500/40 hover:bg-cyan-500/5 text-slate-300 hover:text-cyan-400 cursor-pointer transition-all active:scale-95"
                      >
                        📢 {language === 'ru' ? 'Каналы' : 'Channels'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFolderId('new');
                      setNewFolderName('');
                      setNewFolderChats([]);
                    }}
                    className="flex-1 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-2xl text-sm font-bold shadow-[0_10px_20px_rgba(34,211,238,0.2)] text-center cursor-pointer transition-all active:scale-95"
                  >
                    {language === 'ru' ? 'Создать папку' : 'Create Custom'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowFolderModal(false)}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm text-slate-300 font-bold cursor-pointer transition-all active:scale-95"
                  >
                    {language === 'ru' ? 'Закрыть' : 'Close'}
                  </button>
                </div>
              </div>
            ) : (
              // --- MODE B: FORM FOR ADDING / EDITING ---
              <div>
                <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-6">
                  <span className="font-bold text-slate-100 text-[17px]">
                    {editingFolderId === 'new' 
                      ? (language === 'ru' ? 'Новая папка' : 'New Folder')
                      : (language === 'ru' ? 'Настройки папки' : 'Folder Settings')
                    }
                  </span>
                  <button 
                    onClick={() => {
                      setEditingFolderId(null);
                      setNewFolderName('');
                      setNewFolderChats([]);
                    }} 
                    className="text-slate-400 hover:text-white p-1.5 bg-white/5 rounded-full transition active:scale-90 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateFolderSubmit} className="space-y-6">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 mb-2.5 ml-1">
                      {language === 'ru' ? 'НАЗВАНИЕ ПАПКИ' : 'FOLDER NAME'}
                    </label>
                    <input 
                      type="text" 
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder={language === 'ru' ? 'например: Работа, Семья' : 'e.g. Work, Family'}
                      className="w-full bg-white/[0.03] text-slate-100 border border-white/5 px-4 py-3 rounded-2xl text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.05] transition-all shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 mb-2.5 ml-1">
                      {language === 'ru' ? 'ВЫБЕРИТЕ ДИАЛОГИ' : 'SELECT CHATS'}
                    </label>
                    <div className="max-h-[200px] overflow-y-auto space-y-1.5 bg-white/[0.03] p-2.5 rounded-2xl border border-white/5 shadow-inner custom-scrollbar">
                      {chats.map((c) => (
                        <label key={c.id} className="flex items-center gap-3.5 p-2.5 hover:bg-white/5 rounded-xl cursor-pointer text-sm text-slate-200 transition-colors group">
                          <div className="relative">
                            <input 
                              type="checkbox"
                              checked={newFolderChats.includes(c.id)}
                              onChange={() => {
                                setNewFolderChats(prev => 
                                  prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id]
                                );
                              }}
                              className="hidden" 
                            />
                            <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${newFolderChats.includes(c.id) ? 'bg-cyan-500 border-cyan-500' : 'bg-white/5 border-white/10 group-hover:border-white/20'}`}>
                              {newFolderChats.includes(c.id) && <Check className="w-3.5 h-3.5 text-slate-950 font-bold" />}
                            </div>
                          </div>
                          <img src={c.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.title)}`} alt={c.title} className="w-7 h-7 rounded-lg object-cover border border-white/10 shrink-0" />
                          <span className="font-medium truncate">{c.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingFolderId(null);
                        setNewFolderName('');
                        setNewFolderChats([]);
                      }} 
                      className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 font-bold transition active:scale-95 cursor-pointer"
                    >
                      {language === 'ru' ? 'Назад' : 'Back'}
                    </button>
                    <button 
                      type="submit" 
                      className="flex-[2] py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-2xl text-sm shadow-[0_10px_20px_rgba(34,211,238,0.2)] active:scale-95 cursor-pointer transition"
                    >
                      {language === 'ru' ? 'Сохранить' : 'Save Folder'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Profile Settings Drawer view */}
      {showSettings && (
        <div className="fixed inset-y-0 left-0 w-full sm:w-[400px] bg-black/20 backdrop-blur-[40px] border-r border-white/20 shadow-[20px_0_60px_rgba(0,0,0,0.4)] flex flex-col z-[400] transition-all duration-400">
          <div className="pt-8 pb-6 px-7 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
            <div className="flex flex-col">
              <span className="font-black text-white text-[22px] tracking-tight">{language === 'ru' ? 'Настройки' : 'Settings'}</span>
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{language === 'ru' ? 'ВАШ АККАУНТ' : 'YOUR ACCOUNT'}</span>
            </div>
            <button onClick={() => setShowSettings(false)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05] rounded-[18px] transition active:scale-90 cursor-pointer border border-white/10">
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Category Tabs Switcher */}
          <div className="flex border-b border-white/10 bg-white/[0.02] p-1.5 gap-1.5 overflow-x-auto scrollbar-none shrink-0 px-4">
            {[
              { id: 'account', label: language === 'ru' ? 'Профиль' : 'Profile' },
              { id: 'chats', label: language === 'ru' ? 'Чаты' : 'Chats' },
              { id: 'notifications', label: language === 'ru' ? 'Увед.' : 'Notif.' },
              { id: 'privacy', label: language === 'ru' ? 'Приват.' : 'Privacy' },
              { id: 'data', label: language === 'ru' ? 'Данные' : 'Data' },
              ...(currentUser?.email === 'sasamihajlov709@gmail.com' ? [{ id: 'admin', label: language === 'ru' ? 'Админ' : 'Admin' }] : [])
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSettingsTab(tab.id as any)}
                className={`flex-1 min-w-[80px] py-2.5 px-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${settingsTab === tab.id ? 'bg-cyan-500 text-slate-950 shadow-[0_4px_12px_rgba(34,211,238,0.3)]' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar">
            {settingsTab === 'account' && (
              <>
                {/* Visual Header */}
                <div className="flex flex-col items-center gap-3 pb-6 border-b border-white/5 relative">
                  <div className="relative group w-24 h-24">
                    <img src={userProfile?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userProfile?.displayName || 'U')}`} alt={userProfile?.displayName} className="w-24 h-24 rounded-[32px] border-2 border-white/10 object-cover shadow-2xl transition-transform group-hover:scale-105" />
                    <label className="absolute inset-0 bg-black/60 rounded-[32px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-center p-2 backdrop-blur-sm">
                      <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center mb-1">
                        <Camera className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">{language === 'ru' ? 'Сменить' : 'Update'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              await uploadAvatar(file);
                            } catch (err: any) {
                              showToast(language === 'ru' ? 'Ошибка загрузки: ' + err.message : 'Upload error: ' + err.message, 'error');
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
                      className="text-[10px] font-bold text-rose-500 uppercase tracking-widest hover:text-rose-400 transition cursor-pointer"
                    >
                      {language === 'ru' ? 'Удалить фото' : 'Remove Photo'}
                    </button>
                  )}
                  <div className="text-center">
                    <div className="font-bold text-xl text-slate-100">{userProfile?.displayName}</div>
                    <div className="text-xs font-bold text-cyan-400/80 mt-0.5">@{userProfile?.username}</div>
                  </div>
                </div>

                {/* Profile fields Editing */}
                <div className="space-y-5">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 mb-2 ml-1">{language === 'ru' ? 'ИМЯ В СИСТЕМЕ' : 'DISPLAY NAME'}</label>
                      <input 
                        type="text" 
                        value={editDisplayName} 
                        onChange={(e) => setEditDisplayName(e.target.value)}
                        className="w-full bg-white/[0.03] text-slate-100 border border-white/5 px-4 py-3 rounded-2xl text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.05] transition-all shadow-inner" 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 mb-2 ml-1">{language === 'ru' ? 'ВАШ СТАТУС' : 'YOUR STATUS'}</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="🚀"
                          value={editEmojiStatus} 
                          onChange={(e) => setEditEmojiStatus(e.target.value)}
                          maxLength={3}
                          className="w-16 bg-white/[0.03] text-slate-100 border border-white/5 px-3 py-3 rounded-2xl text-center text-lg focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.05] transition-all shadow-inner" 
                        />
                        <input 
                          type="text" 
                          placeholder={language === 'ru' ? 'Что нового?' : 'Status message...'}
                          value={editStatus} 
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="flex-1 bg-white/[0.03] text-slate-100 border border-white/5 px-4 py-3 rounded-2xl text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.05] transition-all shadow-inner" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 mb-2 ml-1">{language === 'ru' ? 'НОМЕР ТЕЛЕФОНА' : 'PHONE NUMBER'}</label>
                      <input 
                        type="text" 
                        placeholder="+1 234 567 89..."
                        value={editPhoneNumber} 
                        onChange={(e) => setEditPhoneNumber(e.target.value)}
                        className="w-full bg-white/[0.03] text-slate-100 border border-white/5 px-4 py-3 rounded-2xl text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.05] transition-all shadow-inner" 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 mb-2 ml-1">{language === 'ru' ? 'ИНФОРМАЦИЯ О СЕБЕ' : 'BIO'}</label>
                      <textarea 
                        value={editBio} 
                        onChange={(e) => setEditBio(e.target.value)} 
                        placeholder={language === 'ru' ? 'Расскажите о себе...' : 'Tell something about yourself...'}
                        className="w-full bg-white/[0.03] text-slate-100 border border-white/5 px-4 py-3 rounded-2xl text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.05] transition-all h-24 resize-none shadow-inner custom-scrollbar" 
                      />
                    </div>
                  </div>

                  <button 
                    onClick={async () => {
                      try {
                        await updateMyProfile(
                          editDisplayName,
                          editBio,
                          editStatus,
                          undefined, // photoURL
                          editEmojiStatus,
                          editPhoneNumber
                        );
                        showToast(language === 'ru' ? 'Профиль обновлен' : 'Profile updated', 'success');
                      } catch (err: any) {
                        showToast(err.message, 'error');
                      }
                    }}
                    className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-2xl text-sm shadow-[0_10px_25px_rgba(34,211,238,0.2)] active:scale-95 transition-all cursor-pointer"
                  >
                    {language === 'ru' ? 'Сохранить изменения' : 'Synchronize Profile'}
                  </button>
                </div>

                {/* Additional Actions */}
                <div className="pt-6 border-t border-white/5 space-y-3">
                  <span className="block text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 ml-1">{language === 'ru' ? 'БЫСТРЫЕ ДЕЙСТВИЯ' : 'QUICK ACTIONS'}</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setSettingsTab('chats')}
                      className="flex items-center justify-center gap-2 py-3 bg-white/[0.03] border border-white/5 rounded-2xl text-xs font-bold text-slate-300 hover:bg-white/5 transition active:scale-95"
                    >
                      <Palette className="w-4 h-4 text-cyan-400" />
                      {language === 'ru' ? 'Тема' : 'Theme'}
                    </button>
                    <button 
                      onClick={() => setSettingsTab('notifications')}
                      className="flex items-center justify-center gap-2 py-3 bg-white/[0.03] border border-white/5 rounded-2xl text-xs font-bold text-slate-300 hover:bg-white/5 transition active:scale-95"
                    >
                      <Bell className="w-4 h-4 text-cyan-400" />
                      {language === 'ru' ? 'Увед.' : 'Alerts'}
                    </button>
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
                            showToast(language === 'ru' ? `Успешно вошли в: ${chatObj.title}` : `Successfully joined: ${chatObj.title}`, 'success');
                            input.value = '';
                          } catch (err: any) {
                            showToast(language === 'ru' ? 'Ошибка вступления: ' + err.message : 'Join error: ' + err.message, 'error');
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
              <div className="space-y-6">
                {/* Premium Theme Selector glass card */}
                <div className="space-y-3">
                  <label className="block text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 mb-2 ml-1">
                    {language === 'ru' ? 'ЦВЕТОВАЯ ТЕМА' : 'VISUAL THEME'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'theme-light-glass', name: language === 'ru' ? 'Светлая' : 'Light Glass', icon: '☀️' },
                      { id: 'theme-dark-glass', name: language === 'ru' ? 'Тёмная' : 'Dark Space', icon: '🌑' },
                      { id: 'theme-midnight-glass', name: language === 'ru' ? 'Космос' : 'Midnight', icon: '🌌' },
                      { id: 'theme-arctic-glass', name: language === 'ru' ? 'Арктика' : 'Arctic Blue', icon: '❄️' },
                      { id: 'theme-ocean-glass', name: language === 'ru' ? 'Океан' : 'Deep Ocean', icon: '🌊' }
                    ].map((tTheme) => (
                      <button
                        key={tTheme.id}
                        type="button"
                        onClick={() => setTheme(tTheme.id)}
                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                          theme === tTheme.id 
                            ? 'bg-cyan-500/10 border-cyan-500 shadow-[0_4px_15px_rgba(34,211,238,0.2)]' 
                            : 'bg-white/[0.03] border-white/5 hover:bg-white/5'
                        }`}
                      >
                        <span className="text-xl">{tTheme.icon}</span>
                        <div className="flex flex-col items-start">
                          <span className={`text-xs font-bold ${theme === tTheme.id ? 'text-cyan-400' : 'text-slate-200'}`}>{tTheme.name}</span>
                          <span className="text-[9px] text-slate-500 font-medium uppercase tracking-tighter">{tTheme.id.split('-')[1]}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font/Text Size Settings */}
                <div className="space-y-3">
                  <label className="block text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 mb-2 ml-1">
                    {language === 'ru' ? 'РАЗМЕР ШРИФТА' : 'TEXT DENSITY'}
                  </label>
                  <div className="flex bg-white/[0.03] border border-white/5 p-1.5 rounded-[20px] shadow-inner">
                    {[
                      { id: 'xs', name: language === 'ru' ? 'Мелкий' : 'Small' },
                      { id: 'sm', name: language === 'ru' ? 'Средний' : 'Normal' },
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
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          textSizeSelection === sOpt.id
                            ? 'bg-cyan-500 text-slate-950 shadow-lg'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {sOpt.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wallpaper Settings */}
                <div className="space-y-3">
                  <label className="block text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 mb-2 ml-1">
                    {language === 'ru' ? 'ФОНОВЫЕ ОБОИ' : 'CHAT WALLPAPER'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'cosmic', name: language === 'ru' ? 'Космос' : 'Cosmic Slate' },
                      { id: 'aurora', name: language === 'ru' ? 'Аврора' : 'Aurora Dream' },
                      { id: 'minimal', name: language === 'ru' ? 'Темный' : 'Minimal' },
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
                        className={`py-4 rounded-2xl border text-xs font-bold transition-all ${
                          wallpaperSelection === pOpt.id
                            ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-lg'
                            : 'bg-white/[0.03] border-white/5 text-slate-400 hover:text-slate-200'
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
              <div className="space-y-6">
                <div className="p-4 bg-white/[0.03] rounded-3xl border border-white/10 space-y-4 shadow-inner">
                  <div className="flex items-center gap-3 mb-2 px-1">
                    <div className="p-2 bg-cyan-500/10 rounded-xl">
                      <Bell className="w-4 h-4 text-cyan-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-100 uppercase tracking-widest">
                      {language === 'ru' ? 'Оповещения' : 'Alert Settings'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3.5 bg-black/20 rounded-2xl border border-white/5 group transition-all hover:border-white/10">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-200">{language === 'ru' ? 'Звук' : 'Sound Notifications'}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-mono tracking-tighter">System Audio</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={soundEnabled}
                          onChange={(e) => {
                            setSoundEnabled(e.target.checked);
                            localStorage.setItem('vi-sound-notifications', String(e.target.checked));
                          }}
                        />
                        <div className="w-10 h-5 bg-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-white peer-checked:after:border-white"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-black/20 rounded-2xl border border-white/5 group transition-all hover:border-white/10">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-200">{language === 'ru' ? 'Вибро-отклик' : 'Haptic Feedback'}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-mono tracking-tighter">Swipe & Send Actions</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={vibeEnabled}
                          onChange={(e) => {
                            setVibeEnabled(e.target.checked);
                            localStorage.setItem('vi-vibe-notifications', String(e.target.checked));
                          }}
                        />
                        <div className="w-10 h-5 bg-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-white peer-checked:after:border-white"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-cyan-950/20 border border-cyan-500/10 rounded-3xl flex items-start gap-3">
                  <div className="p-1.5 bg-cyan-500/10 rounded-lg shrink-0 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <p className="text-[10px] text-cyan-400/80 leading-relaxed font-sans">
                    {language === 'ru' 
                      ? 'Совет: Вы можете отключить уведомления для конкретных чатов в меню их контекстных действий.' 
                      : 'Tip: You can silence individual conversations through their specific context action menu.'}
                  </p>
                </div>
              </div>
            )}

            {settingsTab === 'privacy' && (
              <div className="space-y-6">
                <div className="p-4 bg-white/[0.03] rounded-3xl border border-white/10 space-y-4 shadow-inner">
                  <div className="flex items-center gap-3 mb-2 px-1">
                    <div className="p-2 bg-indigo-500/10 rounded-xl">
                      <Lock className="w-4 h-4 text-indigo-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-100 uppercase tracking-widest">
                      {language === 'ru' ? 'Приватность' : 'Privacy Control'}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {[
                      { label: language === 'ru' ? 'Номер телефона' : 'Phone Number', val: privacyNumber, set: setPrivacyNumber, icon: <Phone className="w-3.5 h-3.5" /> },
                      { label: language === 'ru' ? 'Статус-сообщение' : 'Status Message', val: privacyStatus, set: setPrivacyStatus, icon: <MessageSquare className="w-3.5 h-3.5" /> },
                      { label: language === 'ru' ? 'Фото профиля' : 'Profile Photo', val: privacyPhoto, set: setPrivacyPhoto, icon: <Camera className="w-3.5 h-3.5" /> },
                      { label: language === 'ru' ? 'Последний вход' : 'Last Seen', val: privacyLastSeen, set: setPrivacyLastSeen, icon: <Clock className="w-3.5 h-3.5" /> },
                      { label: language === 'ru' ? 'Сетевой статус' : 'Online Status', val: privacyOnline, set: setPrivacyOnline, icon: <Activity className="w-3.5 h-3.5" /> }
                    ].map((p) => (
                      <div key={p.label} className="flex items-center justify-between p-3 rounded-2xl bg-black/15 border border-white/5 transition-all hover:bg-black/25">
                        <div className="flex items-center gap-3">
                          <div className="text-slate-500">{p.icon}</div>
                          <span className="text-xs font-semibold text-slate-300">{p.label}</span>
                        </div>
                        <select 
                          value={p.val}
                          onChange={(e) => p.set(e.target.value as any)}
                          className="bg-transparent text-[var(--glass-accent)] font-bold text-[11px] outline-none cursor-pointer text-right appearance-none hover:text-cyan-300 transition-colors"
                        >
                          <option value="all" className="bg-slate-900">{language === 'ru' ? 'Все' : 'Everyone'}</option>
                          <option value="contacts" className="bg-slate-900">{language === 'ru' ? 'Контакты' : 'Contacts'}</option>
                          <option value="nobody" className="bg-slate-900">{language === 'ru' ? 'Никто' : 'Nobody'}</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-indigo-950/20 border border-indigo-500/10 rounded-3xl">
                  <p className="text-[10px] text-indigo-400/80 leading-relaxed italic text-center">
                    {language === 'ru' 
                      ? 'Ваши данные защищены сквозным шифрованием на стороне клиента.' 
                      : 'Your personal metadata is secured via client-side propagation limits.'}
                  </p>
                </div>
              </div>
            )}

            {settingsTab === 'data' && (
              <div className="space-y-6">
                <div className="p-4 bg-white/[0.03] rounded-3xl border border-white/10 space-y-5 shadow-inner">
                  <div className="flex items-center gap-3 mb-1 px-1">
                    <div className="p-2 bg-amber-500/10 rounded-xl">
                      <Database className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-100 uppercase tracking-widest">
                      {language === 'ru' ? 'Данные и Память' : 'Data & Storage'}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-slate-200">{language === 'ru' ? 'Использование хранилища' : 'Storage Usage'}</span>
                        <span className="text-[11px] font-mono text-cyan-400">12.4 MB</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="w-[15%] h-full bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)]"></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button 
                        onClick={() => {
                          showToast(language === 'ru' ? 'Кэш очищен' : 'Local cache cleared', 'info');
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <Trash2 className="w-4 h-4 text-slate-500 group-hover:text-rose-400" />
                          <span className="text-xs font-semibold text-slate-300">{language === 'ru' ? 'Очистить кэш' : 'Clear Cache'}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">2.1 MB</span>
                      </button>

                      <button 
                        onClick={() => {
                          window.location.reload();
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <RefreshCw className="w-4 h-4 text-slate-500 group-hover:text-cyan-400" />
                          <span className="text-xs font-semibold text-slate-300">{language === 'ru' ? 'Перезагрузить сессию' : 'Reload Session'}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">Force</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-950/20 border border-amber-500/10 rounded-3xl text-center">
                  <p className="text-[10px] text-amber-400/80 leading-relaxed uppercase font-bold tracking-widest">
                    {language === 'ru' ? 'Версия клиента: 2.4.0-Glass' : 'Client Node v2.4.0-Glass'}
                  </p>
                </div>
              </div>
            )}

            {settingsTab === 'admin' && (
              <div className="space-y-6">
                <div className="p-4 bg-white/[0.03] rounded-3xl border border-white/10 space-y-5 shadow-inner">
                  <div className="flex items-center gap-3 mb-1 px-1">
                    <div className="p-2 bg-rose-500/10 rounded-xl">
                      <Terminal className="w-4 h-4 text-rose-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-100 uppercase tracking-widest">
                      {language === 'ru' ? 'Панель Администратора' : 'Admin Console'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-black/20 rounded-2xl border border-white/5 text-center">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mb-1">Users</div>
                      <div className="text-xl font-bold text-rose-400 font-mono">1,204</div>
                    </div>
                    <div className="p-4 bg-black/20 rounded-2xl border border-white/5 text-center">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mb-1">Uptime</div>
                      <div className="text-xl font-bold text-rose-400 font-mono">99.9%</div>
                    </div>
                  </div>

                  <div className="p-4 bg-rose-950/20 border border-rose-500/15 rounded-2xl space-y-3">
                    <span className="block text-[10px] font-mono text-rose-300 font-bold uppercase tracking-widest">System Health</span>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Database Engine</span>
                        <span className="text-emerald-400 font-mono">Stable</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">WebSocket Node</span>
                        <span className="text-emerald-400 font-mono">Active</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Auth Gateway</span>
                        <span className="text-emerald-400 font-mono">Synced</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => showToast('Command executed', 'info')}
                  className="w-full py-4 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/20 text-rose-400 font-bold rounded-2xl text-xs uppercase tracking-[0.2em] transition active:scale-95 shadow-lg shadow-rose-500/5"
                >
                  {language === 'ru' ? 'СБРОСИТЬ СИСТЕМУ' : 'HARD RESET SYSTEM'}
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Toast Notification overlay */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-7 py-4 rounded-[28px] vision-floating-header border z-[600] flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-w-[320px] pointer-events-none border-white/30 ${
              toast.type === 'error' ? 'text-rose-200' : 
              toast.type === 'info' ? 'text-cyan-200' : 
              'text-emerald-200'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              toast.type === 'error' ? 'bg-rose-500/20' : 
              toast.type === 'info' ? 'bg-cyan-500/20' : 
              'bg-emerald-500/20'
            }`}>
              {toast.type === 'error' ? <ShieldAlert className="w-5 h-5" /> : <Sparkles className="w-5 h-5 text-cyan-400" />}
            </div>
            <span className="text-[15px] font-black tracking-tight">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
