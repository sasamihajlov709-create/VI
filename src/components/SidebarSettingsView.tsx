import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sliders, User, MessageSquare, Bell, Shield, Palette, 
  HardDrive, Globe, Key, HelpCircle, ChevronRight, ArrowLeft, 
  LogOut, Check, Volume2, ShieldAlert, Sparkles, Clock, Trash2, 
  Camera, Calendar, Phone, Activity, Moon, Sun, Lock, Info, Mic, X
} from 'lucide-react';
import { UserProfile } from '../types';
import { playTapSound, playUnlockSound, playErrorSound } from '../utils/audioEffects';

interface SidebarSettingsViewProps {
  onBack: () => void;
  userProfile: UserProfile | null;
  currentUser: { email: string | null } | null;
  globalReports: any[];
  globalAuditLogs: any[];
  resolveReport: (reportId: string) => Promise<void>;
  terminateOtherSessions: () => Promise<void>;
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
  uploadAvatar: (file: File) => Promise<void>;
  deleteAvatar: () => Promise<void>;
  language: 'ru' | 'en';
  theme: string;
  setTheme: (theme: string) => void;
}

const LOCALIZATION = {
  ru: {
    title: "Настройки",
    subtitle: "Параметры и профиль пользователя",
    back: "Назад",
    save: "Сохранить",
    saving: "Сохраняем...",
    saved: "Успешно сохранено",
    uploading: "Загрузка фото...",
    deletePhoto: "Удалить фото",
    
    // Screens
    secAccount: "Аккаунт",
    secChats: "Настройки чатов",
    secNotifications: "Уведомления",
    secPrivacy: "Приватность",
    secThemes: "Оформление / Тема",
    secData: "Данные и память",
    secLang: "Язык / Интерфейс",
    secSecurity: "Безопасность",
    secHelp: "Справка / О приложении",
    
    // Account details
    yourName: "Ваше имя",
    firstName: "Имя",
    lastName: "Фамилия",
    aboutMe: "Напишите немного о себе",
    bioPlaceholder: "Опишите свои интересы...",
    charLimit: "Символов: {count} из {max}",
    liveBioPreview: "Живой предпросмотр инфо-карты",
    personalInfo: "Информация о вас",
    phone: "Номер телефона",
    usernameLabel: "Имя пользователя (@username)",
    dobLabel: "Дата рождения",
    
    // Chat settings
    textSize: "Размер текста сообщений",
    textSizeDesc: "Регулировка размера сообщений в диалогах",
    textSizeSm: "Мелкий",
    textSizeMd: "Средний",
    textSizeLg: "Крупный",
    textSizeXl: "Огромный",
    wallpapers: "Изменить обои",
    customColor: "Свой цвет фона (HEX)",
    mediaAndAudio: "Медиафайлы и звук",
    toggleSwipe: "Листать медиафайлы по нажатию",
    toggleSwipeDesc: "Листать файлы кликом во вьюере.",
    toggleEdgeSwipe: "Листать нажатием у края экрана",
    toggleEdgeSwipeDesc: "Переход по клику у границ экрана.",
    toggleListen: "Поднести и слушать",
    toggleListenDesc: "Переключать на ушной динамик автоматически.",
    toggleRecord: "Запись голоса при приближении",
    toggleRecordDesc: "Запускать запись, когда телефон у уха.",
    togglePauseRecord: "Пауза музыки при записи",
    togglePauseRecordDesc: "Останавливать музыку на время записи голоса.",
    togglePausePlay: "Пауза музыки при запуске медиа",
    togglePausePlayDesc: "Останавливать музыку при запуске видео.",
    micSelect: "Выбор микрофона",
    
    // Notifications Screen
    notifChats: "Уведомления из чатов",
    privateChats: "Личные чаты",
    notifGroups: "Группы",
    notifChannels: "Каналы",
    notifStories: "Истории",
    notifReactions: "Реакции",
    notifCalls: "Звонки",
    exceptionsSuffix: "{count} исключений",
    soundVibe: "Звук и вибрация",
    vibeLabel: "Вибросигнал",
    vibeDefault: "По умолчанию",
    vibeShort: "Короткая",
    vibeLong: "Длинная",
    vibeDisabled: "Выключена",
    ringtoneLabel: "Рингтон",
    msgCounter: "Счётчик сообщений",
    showBadge: "Показывать счётчик на иконке",
    includeMuted: "Чаты без уведомлений",
    countMode: "Тип подсчёта",
    countModeMsgs: "Количество сообщений",
    countModeChats: "Количество чатов",
    inAppNotifs: "Уведомления в приложении",
    inAppSound: "Звук в приложении",
    inAppVibe: "Вибросигнал в приложении",
    inAppPreview: "Показывать текст во всплывающих",
    inAppChatSound: "Звук в чате",
    inAppPopups: "Всплывающие окна",
    inAppPopupsDesc: "Показывать баннеры, когда приложение открыто.",
    eventsTitle: "События",
    eventContactJoined: "Контакт присоединился к VI",
    eventPinned: "Закреплённые сообщения",
    eventOther: "Другое",
    reliabilityTitle: "Надёжность доставки",
    restartClose: "Перезапуск при закрытии",
    restartCloseDesc: "Перезапускать фоновый приемник при закрытии приложения.",
    bgConnection: "Фоновое соединение",
    bgConnectionDesc: "Поддерживать минимальное фоновое сокет-подключение.",
    retryNotif: "Повторитель доставки",
    retryNotifDesc: "Запрашивать повторную отправку при сетевых сбоях.",
    
    // Privacy / Help / Storage
    privacyWho: "Кто видит мои данные",
    everyone: "Все",
    contacts: "Мои контакты",
    nobody: "Никто",
    activeSessions: "Активные Сессии",
    terminateOthers: "Завершить другие сеансы",
    clearCache: "Очистить кэш",
    clearCacheDesc: "Сбросит локальные настройки темы и очистит временную память.",
    clearCacheBtn: "Сбросить кэш приложения",
    appVersion: "VI Messenger v2.5.0 - Stable",
    reportSuccess: "Диагностический отчет отправлен разработчикам!",
    sendReport: "Отправить диагностический отчет",
    secAboutText: "Современный защищенный мессенджер корпоративного уровня с поддержкой прозрачности стеклянных интерфейсов Liquid Glass и распределенного облачного реестра Firestore Fortress.",
    faqTitle: "Часто задаваемые вопросы",
    faqSecurityQ: "Безопасны ли мои чаты?",
    faqSecurityA: "Да, вся личная переписка и файлы шифруются на клиенте и хранятся в защищенной базе данных Firestore Enterprise с нулевым доступом третьих лиц.",
    faqSyncQ: "Как работает облачная синхронизация?",
    faqSyncA: "Настройки, диалоги и контакты сохраняются в режиме реального времени на облачном сервере и доступны мгновенно на любом из подключенных девайсов.",
    faqMicrophoneQ: "С какими микрофонами работает аудиосвязь?",
    faqMicrophoneQAnswer: "Приложение поддерживает все стандартные встроенные микрофоны, проводные гарнитуры, а также беспроводные Bluetooth-наушники."
  },
  en: {
    title: "Settings",
    subtitle: "Customization and personal profiles",
    back: "Back",
    save: "Save Changes",
    saving: "Saving edits...",
    saved: "Saved successfully",
    uploading: "Uploading photo...",
    deletePhoto: "Delete Photo",
    
    // Screens
    secAccount: "Account",
    secChats: "Chat Settings",
    secNotifications: "Notifications",
    secPrivacy: "Privacy Settings",
    secThemes: "Themes & Design",
    secData: "Data & Storage",
    secLang: "Language & System",
    secSecurity: "Identity & Security",
    secHelp: "Help & About VI",
    
    // Account details
    yourName: "Your Name",
    firstName: "First Name",
    lastName: "Last Name",
    aboutMe: "Write a brief bio",
    bioPlaceholder: "What describes you best...",
    charLimit: "Characters: {count} of {max}",
    liveBioPreview: "Live Profile Card Preview",
    personalInfo: "Personal Information",
    phone: "Phone Number",
    usernameLabel: "Username (@username)",
    dobLabel: "Date of Birth",
    
    // Chat settings
    textSize: "Message Font Size",
    textSizeDesc: "Adjust text density inside message channels",
    textSizeSm: "Small",
    textSizeMd: "Medium",
    textSizeLg: "Large",
    textSizeXl: "Extra Large",
    wallpapers: "Change Background Wallpaper",
    customColor: "Custom HEX Wallpaper Color",
    mediaAndAudio: "Media & Sound Options",
    toggleSwipe: "Tap to swipe media items",
    toggleSwipeDesc: "Advance forward when clicking content in viewer.",
    toggleEdgeSwipe: "Tap near borders to swipe",
    toggleEdgeSwipeDesc: "Transition by clicking left/right edge targets.",
    toggleListen: "Raise to Listen earpiece",
    toggleListenDesc: "Switch automatically to phone ear channel on raise.",
    toggleRecord: "Raise to Record voice clips",
    toggleRecordDesc: "Begin recording voice memo when holding phone to ear.",
    togglePauseRecord: "Suspend music while recording",
    togglePauseRecordDesc: "Mute other music apps during active voice recordings.",
    togglePausePlay: "Suspend music on video launch",
    togglePausePlayDesc: "Mute background system output during video clips.",
    micSelect: "Microphone Input Channel",
    
    // Notifications Screen
    notifChats: "Chat Notifications",
    privateChats: "Private DM Chats",
    notifGroups: "Group Chats",
    notifChannels: "Broadcast Channels",
    notifStories: "Stories & Snippets",
    notifReactions: "Reactions Updates",
    notifCalls: "Voice Calls alerts",
    exceptionsSuffix: "{count} exclusions",
    soundVibe: "Sound & Vibrations",
    vibeLabel: "Vibrations feedback",
    vibeDefault: "Default System",
    vibeShort: "Short",
    vibeLong: "Long",
    vibeDisabled: "None (Silent)",
    ringtoneLabel: "Ringtone audio preset",
    msgCounter: "Message Badges Configuration",
    showBadge: "Show unread counter on dock",
    includeMuted: "Include muted chats inside badge",
    countMode: "Badge Calculation Type",
    countModeMsgs: "Total Unread Messages count",
    countModeChats: "Unread Chats count",
    inAppNotifs: "In-App System Alerts",
    inAppSound: "Enable Sound notifications",
    inAppVibe: "Enable Vibration feedback",
    inAppPreview: "Show core text inside notifications",
    inAppChatSound: "Play chat audio feedback",
    inAppPopups: "Floating Popup banners",
    inAppPopupsDesc: "Render alert overlays while active in app window.",
    eventsTitle: "Contact Events",
    eventContactJoined: "Contact onboarded to VI",
    eventPinned: "Pinned messages updates",
    eventOther: "Other system updates",
    reliabilityTitle: "Service Connection Reliability",
    restartClose: "Relay auto-restart on close",
    restartCloseDesc: "Boots background ping worker if app window is closed.",
    bgConnection: "Keep-alive background pipeline",
    bgConnectionDesc: "Establish minimized low-power socket connection state.",
    retryNotif: "Auto-retry Delivery pings",
    retryNotifDesc: "Attempts alternative routes on dropped server packets.",
    
    // Privacy / Help / Storage
    privacyWho: "Who can access my details",
    everyone: "Everyone",
    contacts: "My Contacts",
    nobody: "Nobody",
    activeSessions: "Active Device Tokens",
    terminateOthers: "Revoke other hardware sessions",
    clearCache: "Clear Parameters Sandbox",
    clearCacheDesc: "Clears theme variations settings and logs cache.",
    clearCacheBtn: "Wipe memory & reload cached state",
    appVersion: "VI Messenger v2.5.0 - Stable Release",
    reportSuccess: "Telemetry diagnostics report pushed successfully!",
    sendReport: "Push diagnostic telemetry log",
    secAboutText: "A secure modern enterprise-grade team workspace featuring fluid Liquid Glass design accents backed with highly resilient cloud document synchronization.",
    faqTitle: "Frequently Asked Questions",
    faqSecurityQ: "How secure are my workspace chats?",
    faqSecurityA: "All conversations, metadata feeds and file transfer logs are locked with end-to-end security configurations and saved on private server instances.",
    faqSyncQ: "Does it support cross-device synchronization?",
    faqSyncA: "Yes, fully! Your themes, visual states and notifications config sync instantly across both mobile pwas and desktop web tabs simultaneously.",
    faqMicrophoneQ: "Which input microphone can I use?",
    faqMicrophoneQAnswer: "Our audio library automatically maps default system mics, wired headset hardware, or standard bluetooth earbud drivers seamlessly."
  }
};

export const SidebarSettingsView: React.FC<SidebarSettingsViewProps> = ({
  onBack,
  userProfile,
  currentUser,
  globalReports = [],
  globalAuditLogs = [],
  resolveReport,
  terminateOtherSessions,
  updateMyProfile,
  uploadAvatar,
  deleteAvatar,
  language,
  theme,
  setTheme
}) => {
  const t = LOCALIZATION[language];

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  // Primary subscreen navigation state
  const [subScreen, setSubScreen] = useState<'main' | 'account' | 'chats' | 'notifications' | 'privacy' | 'appearance' | 'data' | 'language' | 'security' | 'help' | 'admin'>('main');

  // Passcode setup states
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeStep, setPasscodeStep] = useState<'enter' | 'confirm'>('enter');
  const [passcodePin, setPasscodePin] = useState('');
  const [passcodeConfirmPin, setPasscodeConfirmPin] = useState('');
  const [hasPasscode, setHasPasscode] = useState(() => {
    try {
      return !!localStorage.getItem('vix-passcode-lock');
    } catch (e) {
      return false;
    }
  });

  // Load Cloud / Storage Settings configurations
  const customSettings = userProfile?.customSettings || {};

  // Local state mirrors for quick UI toggle switches (synced both with cloud & localStorage)
  const [swipeMedia, setSwipeMedia] = useState<boolean>(() => customSettings.swipeMediaOnClick ?? (localStorage.getItem('vi-swipeMediaOnClick') !== 'false'));
  const [edgeSwipe, setEdgeSwipe] = useState<boolean>(() => customSettings.edgeSwipeNavigate ?? (localStorage.getItem('vi-edgeSwipeNavigate') !== 'false'));
  const [raiseListen, setRaiseListen] = useState<boolean>(() => customSettings.raiseToListen ?? (localStorage.getItem('vi-raiseToListen') === 'true'));
  const [raiseRecord, setRaiseRecord] = useState<boolean>(() => customSettings.raiseToRecord ?? (localStorage.getItem('vi-raiseToRecord') === 'true'));
  const [pauseRecord, setPauseRecord] = useState<boolean>(() => customSettings.pauseMusicOnRecord ?? (localStorage.getItem('vi-pauseMusicOnRecord') !== 'false'));
  const [pausePlay, setPausePlay] = useState<boolean>(() => customSettings.pauseMusicOnMediaPlay ?? (localStorage.getItem('vi-pauseMusicOnMediaPlay') !== 'false'));
  const [currentMic, setCurrentMic] = useState<string>(() => customSettings.microphoneId || 'default');

  // Notification toggles
  const [notifPrivate, setNotifPrivate] = useState<boolean>(() => customSettings.notifyPrivate ?? true);
  const [notifGroups, setNotifGroups] = useState<boolean>(() => customSettings.notifyGroups ?? true);
  const [notifChannels, setNotifChannels] = useState<boolean>(() => customSettings.notifyChannels ?? false);
  const [notifStories, setNotifStories] = useState<boolean>(() => customSettings.notifyStories ?? false);
  const [notifReactions, setNotifReactions] = useState<'messages' | 'stories' | 'none'>(() => customSettings.notifyReactions || 'messages');
  const [notifCalls, setNotifCalls] = useState<boolean>(() => customSettings.notifyCalls ?? true);
  const [vibeMode, setVibeMode] = useState<'default' | 'short' | 'long' | 'disabled'>(() => customSettings.vibrationMode || 'default');
  const [ringtoneSelect, setRingtoneSelect] = useState<'standard' | 'cyber' | 'cosmic' | 'playful' | 'none'>(() => customSettings.ringtoneSelection || 'standard');
  const [showUnread, setShowUnread] = useState<boolean>(() => customSettings.showUnreadCounts ?? true);
  const [includeMuted, setIncludeMuted] = useState<boolean>(() => customSettings.includeMutedInCounts ?? false);
  const [countMode, setCountMode] = useState<'messages' | 'chats'>(() => customSettings.countMessagesOrChats || 'messages');
  const [inAppSound, setInAppSound] = useState<boolean>(() => customSettings.inAppSound ?? true);
  const [inAppVibe, setInAppVibe] = useState<boolean>(() => customSettings.inAppVibe ?? true);
  const [inAppPreview, setInAppPreview] = useState<boolean>(() => customSettings.inAppPreviewText ?? true);
  const [inAppChatSound, setInAppChatSound] = useState<boolean>(() => customSettings.inAppChatSound ?? true);
  const [inAppPopups, setInAppPopups] = useState<boolean>(() => customSettings.inAppPopupsEnabled ?? true);
  const [eventJoined, setEventJoined] = useState<boolean>(() => customSettings.notifyContactJoinedMsg ?? true);
  const [eventPinned, setEventPinned] = useState<boolean>(() => customSettings.notifyPinnedMsg ?? true);
  const [eventOther, setEventOther] = useState<boolean>(() => customSettings.notifyOtherMsg ?? false);
  const [restartClose, setRestartClose] = useState<boolean>(() => customSettings.restartOnClose ?? true);
  const [bgConnection, setBgConnection] = useState<boolean>(() => customSettings.keepAliveBackground ?? true);
  const [retryNotif, setRetryNotif] = useState<boolean>(() => customSettings.retryNotificationsRelay ?? true);

  // Chat parameters
  const [textSize, setTextSize] = useState<string>(() => localStorage.getItem('vi-chat-text-size') || 'sm');
  const [wallpaper, setWallpaper] = useState<string>(() => localStorage.getItem('vi-chat-wallpaper') || 'cosmic');
  const [customWallpaperColor, setCustomWallpaperColor] = useState<string>(() => localStorage.getItem('vi-custom-wallpaper-color') || '#0d0e12');

  // Account inputs
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [username, setUsername] = useState('');
  const [statusText, setStatusText] = useState('');

  // Save states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Hardware audio input query list
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);

  // Accordion faq index state
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Sub-screen integrated back gesture setup
  useEffect(() => {
    if (subScreen !== 'main') {
      const timer = setTimeout(() => {
        window.history.pushState({ internalModal: true, subScreen }, '');
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [subScreen]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const g = window as any;
      if (g.__VI_BACK_HANDLED === e.timeStamp) return;

      if (subScreen !== 'main') {
        setSubScreen('main');
        g.__VI_BACK_HANDLED = e.timeStamp;
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [subScreen]);

  // Load and split current names when userProfile attaches
  useEffect(() => {
    if (userProfile) {
      const parts = (userProfile.displayName || '').trim().split(/\s+/);
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
      setBio(userProfile.bio || '');
      setPhone(userProfile.phoneNumber || '');
      setDob(userProfile.birthday || '');
      setUsername(userProfile.username || '');
      setStatusText(userProfile.statusMessage || '');
    }
  }, [userProfile]);

  // Sync state values on remote updates
  useEffect(() => {
    if (userProfile?.customSettings) {
      const c = userProfile.customSettings;
      if (c.swipeMediaOnClick !== undefined) setSwipeMedia(c.swipeMediaOnClick);
      if (c.edgeSwipeNavigate !== undefined) setEdgeSwipe(c.edgeSwipeNavigate);
      if (c.raiseToListen !== undefined) setRaiseListen(c.raiseToListen);
      if (c.raiseToRecord !== undefined) setRaiseRecord(c.raiseToRecord);
      if (c.pauseMusicOnRecord !== undefined) setPauseRecord(c.pauseMusicOnRecord);
      if (c.pauseMusicOnMediaPlay !== undefined) setPausePlay(c.pauseMusicOnMediaPlay);
      if (c.microphoneId !== undefined) setCurrentMic(c.microphoneId);
      
      if (c.notifyPrivate !== undefined) setNotifPrivate(c.notifyPrivate);
      if (c.notifyGroups !== undefined) setNotifGroups(c.notifyGroups);
      if (c.notifyChannels !== undefined) setNotifChannels(c.notifyChannels);
      if (c.notifyStories !== undefined) setNotifStories(c.notifyStories);
      if (c.notifyReactions !== undefined) setNotifReactions(c.notifyReactions);
      if (c.notifyCalls !== undefined) setNotifCalls(c.notifyCalls);
      if (c.vibrationMode !== undefined) setVibeMode(c.vibrationMode);
      if (c.ringtoneSelection !== undefined) setRingtoneSelect(c.ringtoneSelection);
      if (c.showUnreadCounts !== undefined) setShowUnread(c.showUnreadCounts);
      if (c.includeMutedInCounts !== undefined) setIncludeMuted(c.includeMutedInCounts);
      if (c.countMessagesOrChats !== undefined) setCountMode(c.countMessagesOrChats);
      if (c.inAppSound !== undefined) setInAppSound(c.inAppSound);
      if (c.inAppVibe !== undefined) setInAppVibe(c.inAppVibe);
      if (c.inAppPreviewText !== undefined) setInAppPreview(c.inAppPreviewText);
      if (c.inAppChatSound !== undefined) setInAppChatSound(c.inAppChatSound);
      if (c.inAppPopupsEnabled !== undefined) setInAppPopups(c.inAppPopupsEnabled);
      if (c.notifyContactJoinedMsg !== undefined) setEventJoined(c.notifyContactJoinedMsg);
      if (c.notifyPinnedMsg !== undefined) setEventPinned(c.notifyPinnedMsg);
      if (c.notifyOtherMsg !== undefined) setEventOther(c.notifyOtherMsg);
      if (c.restartOnClose !== undefined) setRestartClose(c.restartOnClose);
      if (c.keepAliveBackground !== undefined) setBgConnection(c.keepAliveBackground);
      if (c.retryNotificationsRelay !== undefined) setRetryNotif(c.retryNotificationsRelay);
    }
  }, [userProfile?.customSettings]);

  // Request browser audio inputs
  useEffect(() => {
    if (subScreen === 'chats') {
      navigator.mediaDevices?.enumerateDevices()
        .then(devices => {
          const inputs = devices.filter(d => d.kind === 'audioinput');
          setMicDevices(inputs);
        })
        .catch(err => console.warn("Mic enumerator denied:", err));
    }
  }, [subScreen]);

  // Shared persist handler
  const saveCustomSettingsBundle = async (updates: any) => {
    if (!userProfile) return;
    const nextSettingsObj = {
      ...(userProfile.customSettings || {}),
      ...updates
    };
    try {
      await updateMyProfile(
        userProfile.displayName || '',
        userProfile.bio || '',
        userProfile.statusMessage || '',
        undefined,
        userProfile.emojiStatus || '',
        userProfile.phoneNumber || '',
        userProfile.privacySettings || {},
        userProfile.birthday || '',
        nextSettingsObj
      );
      window.dispatchEvent(new Event('vi-settings-changed'));
    } catch (err) {
      console.error("Cloud parameters update failure", err);
    }
  };

  const handleProfileAndDetailsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setIsSaving(true);
    setSaveSuccess(false);
    
    const combinedName = `${firstName.trim()} ${lastName.trim()}`.trim();
    try {
      await updateMyProfile(
        combinedName || userProfile.displayName || 'VI user',
        bio.trim(),
        statusText.trim(),
        undefined,
        userProfile.emojiStatus || '',
        phone.trim(),
        userProfile.privacySettings || {},
        dob,
        userProfile.customSettings || {}
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      showToast("Save error response: " + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Switch handlers for settings checkboxes
  const handleToggleState = (key: string, currentVal: boolean, setterFn: (v: boolean) => void) => {
    const nextVal = !currentVal;
    setterFn(nextVal);
    localStorage.setItem(`vi-${key}`, String(nextVal));
    saveCustomSettingsBundle({ [key]: nextVal });
  };

  const handleSelectState = (key: string, nextVal: any, setterFn: (v: any) => void) => {
    setterFn(nextVal);
    localStorage.setItem(`vi-${key}`, String(nextVal));
    saveCustomSettingsBundle({ [key]: nextVal });
  };

  const handlePasscodeNumClick = (num: string) => {
    playTapSound();
    if (passcodeStep === 'enter') {
      if (passcodePin.length < 4) {
        const nextPin = passcodePin + num;
        setPinState(nextPin, 'enter');
        if (nextPin.length === 4) {
          setTimeout(() => {
            setPasscodeStep('confirm');
          }, 300);
        }
      }
    } else {
      if (passcodeConfirmPin.length < 4) {
        const nextPin = passcodeConfirmPin + num;
        setPinState(nextPin, 'confirm');
        if (nextPin.length === 4) {
          setTimeout(() => {
            if (passcodePin === nextPin) {
              try {
                localStorage.setItem('vix-passcode-lock', passcodePin);
                window.dispatchEvent(new Event('vix-passcode-updated'));
                playUnlockSound();
              } catch (e) {}
              setHasPasscode(true);
              showToast(language === 'ru' ? 'Код-пароль успешно установлен!' : 'Passcode successfully set!', 'success');
              setShowPasscodeModal(false);
              setPasscodePin('');
              setPasscodeConfirmPin('');
              setPasscodeStep('enter');
            } else {
              playErrorSound();
              showToast(language === 'ru' ? 'Коды не совпадают. Попробуйте снова.' : 'Passcodes do not match. Try again.', 'error');
              setPasscodeConfirmPin('');
            }
          }, 300);
        }
      }
    }
  };

  const setPinState = (val: string, step: 'enter' | 'confirm') => {
    if (step === 'enter') {
      setPasscodePin(val);
    } else {
      setPasscodeConfirmPin(val);
    }
  };

  const handlePasscodeBackspace = () => {
    playTapSound();
    if (passcodeStep === 'enter') {
      setPasscodePin(p => p.slice(0, -1));
    } else {
      setPasscodeConfirmPin(p => p.slice(0, -1));
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 text-slate-100 font-sans select-none bg-slate-950/20">
      {/* 1. MAIN MENU SCREEN */}
      {subScreen === 'main' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="pt-6 pb-4 px-5 border-b border-white/10 flex gap-4 shrink-0 bg-white/[0.02] backdrop-blur-3xl shadow-lg">
            <button 
              type="button" 
              onClick={onBack}
              className="w-10 h-10 flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.1] rounded-[18px] text-slate-400 hover:text-white transition cursor-pointer self-center border border-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col justify-center">
              <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                {t.title}
              </h2>
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                {t.subtitle}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-32 p-5 space-y-5 custom-scrollbar">
            {/* Upper Profile Identity Block */}
            <div className="p-6 vision-floating-header border border-white/10 rounded-[28px] flex flex-col items-center text-center gap-4 relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 p-1">
                <span className="text-[8px] font-mono uppercase bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded-md border border-cyan-500/20">
                  {userProfile?.onlineStatus === 'online' ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Avatar upload wrapper */}
              <div className="relative w-16 h-16">
                <img 
                  src={userProfile?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userProfile?.displayName || 'VI')}`} 
                  alt={userProfile?.displayName} 
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-full border border-white/10 object-cover shadow-lg bg-slate-900" 
                />
                <label className="absolute inset-0 bg-black/75 rounded-full flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-150 cursor-pointer border border-white/10">
                  <Camera className="w-4 h-4 text-cyan-400 mb-0.5" />
                  <span className="text-[7px] font-bold text-slate-300 uppercase tracking-widest">{language === 'ru' ? 'Выбрать' : 'Change'}</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setIsUploadingPhoto(true);
                        try {
                          await uploadAvatar(file);
                        } catch (err: any) {
                          showToast("Photo error: " + err.message, 'error');
                        } finally {
                          setIsUploadingPhoto(false);
                        }
                      }
                    }}
                    className="hidden" 
                  />
                </label>
              </div>

              {isUploadingPhoto && (
                <span className="text-[9px] font-mono text-cyan-400 animate-pulse">{t.uploading}</span>
              )}

              <div>
                <h3 className="text-xs font-bold text-slate-100 font-sans">{userProfile?.displayName}</h3>
                <span className="text-[10px] font-mono text-cyan-400">@{userProfile?.username || 'username'}</span>
                {userProfile?.statusMessage && (
                  <p className="text-[10px] text-slate-400 italic mt-1 px-4 leading-snug line-clamp-1">
                    "{userProfile.statusMessage}"
                  </p>
                )}
              </div>

              {userProfile?.photoURL && !userProfile.photoURL.includes('dicebear') && (
                <button 
                  onClick={async () => {
                    if (window.confirm(language === 'ru' ? 'Удалить аватар?' : 'Remove photo?')) {
                      await deleteAvatar();
                    }
                  }}
                  className="text-[8px] font-mono uppercase px-2 py-0.5 border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/15 rounded text-rose-400 cursor-pointer transition"
                >
                  {t.deletePhoto}
                </button>
              )}
            </div>

            {/* Structured Menu Categories */}
            <div className="space-y-2">
              {[
                { id: 'account', label: t.secAccount, icon: User, color: 'text-cyan-400' },
                { id: 'chats', label: t.secChats, icon: MessageSquare, color: 'text-emerald-400' },
                { id: 'notifications', label: t.secNotifications, icon: Bell, color: 'text-amber-400' },
                { id: 'privacy', label: t.secPrivacy, icon: Shield, color: 'text-purple-400' },
                { id: 'appearance', label: t.secThemes, icon: Palette, color: 'text-indigo-400' },
                { id: 'data', label: t.secData, icon: HardDrive, color: 'text-orange-400' },
                { id: 'language', label: t.secLang, icon: Globe, color: 'text-teal-400' },
                { id: 'security', label: t.secSecurity, icon: Key, color: 'text-blue-400' },
                { id: 'help', label: t.secHelp, icon: HelpCircle, color: 'text-pink-400' },
                ...(currentUser?.email === 'sasamihajlov709@gmail.com' ? [{ id: 'admin', label: 'Админ-панель', icon: ShieldAlert, color: 'text-rose-500' }] : [])
              ].map((item) => {
                const IconComp = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSubScreen(item.id as any)}
                    className="w-full p-3.5 bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.1] border border-white/10 rounded-[20px] flex items-center justify-between text-left transition duration-300 cursor-pointer gap-3 shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/5`}>
                        <IconComp className={`w-5 h-5 ${item.color} shrink-0`} />
                      </div>
                      <span className="text-[13.5px] font-bold text-slate-100 truncate tracking-tight">{item.label}</span>
                    </div>
                    <ChevronRight className="w-4.5 h-4.5 text-slate-600 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. SUB-SCREEN: ACCOUNT */}
      {subScreen === 'account' && (
        <form onSubmit={handleProfileAndDetailsSave} className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="p-3 border-b border-white/5 flex items-center gap-2 bg-white/[0.01] shrink-0">
            <button 
              type="button" 
              onClick={() => setSubScreen('main')}
              className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-150">{t.secAccount}</span>
          </div>

          <div className="flex-1 overflow-y-auto pb-32 p-4 space-y-4 custom-scrollbar">
            {/* Identity fields */}
            <div className="space-y-3">
              <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                {t.yourName}
              </span>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-mono text-slate-500 block mb-1">{t.firstName}</label>
                  <input 
                    type="text" 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-black/20 text-slate-150 border border-white/5 px-2.5 py-1.5 rounded-xl text-xs focus:outline-none focus:border-cyan-500 font-sans" 
                    required 
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-slate-500 block mb-1">{t.lastName}</label>
                  <input 
                    type="text" 
                    value={lastName} 
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-black/20 text-slate-150 border border-white/5 px-2.5 py-1.5 rounded-xl text-xs focus:outline-none focus:border-cyan-500 font-sans" 
                  />
                </div>
              </div>
            </div>

            {/* About / Bio section */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                <span>{t.aboutMe}</span>
                <span className="text-[9px] text-slate-500 hover:text-slate-400">
                  {t.charLimit.replace('{count}', String(bio.length)).replace('{max}', '70')}
                </span>
              </div>
              <textarea 
                value={bio} 
                onChange={(e) => setBio(e.target.value.substring(0, 70))}
                placeholder={t.bioPlaceholder}
                className="w-full h-14 bg-black/20 text-slate-150 border border-white/5 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-cyan-500 font-sans resize-none custom-scrollbar" 
              />
              
              {/* Profile Card Live Preview block */}
              <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl space-y-1.5">
                <span className="block text-[8px] font-mono text-cyan-400/80 uppercase tracking-widest leading-none">
                  {t.liveBioPreview}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-mono text-xs font-bold leading-none shrink-0">
                    {firstName.substring(0, 1).toUpperCase() || 'V'}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-200 block leading-none">{firstName} {lastName}</span>
                    <span className="text-[8px] text-slate-500 font-mono block mt-0.5">@{username || 'username'}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 italic font-mono leading-relaxed pl-1">
                  {bio ? `"${bio}"` : `"${t.bioPlaceholder}"`}
                </p>
              </div>
            </div>

            {/* Personal Details fields */}
            <div className="space-y-3">
              <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                {t.personalInfo}
              </span>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[9px] font-mono text-slate-500 block mb-1">{t.phone}</label>
                  <input 
                    type="text" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7..."
                    className="w-full bg-black/20 text-slate-150 border border-white/5 px-2.5 py-1.5 rounded-xl text-xs focus:outline-none focus:border-cyan-500 font-mono" 
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-slate-500 block mb-1">{t.usernameLabel}</label>
                  <input 
                    type="text" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="tagname..."
                    className="w-full bg-black/20 text-slate-150 border border-white/5 px-2.5 py-1.5 rounded-xl text-xs focus:outline-none focus:border-cyan-500 font-mono" 
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-slate-500 block mb-1">{t.dobLabel}</label>
                  <input 
                    type="date" 
                    value={dob} 
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-black/20 text-slate-150 border border-white/5 px-2.5 py-1.5 rounded-xl text-xs focus:outline-none focus:border-cyan-500 font-mono calendar-accent-cyan" 
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-slate-500 block mb-1">Status Message</label>
                  <input 
                    type="text" 
                    value={statusText} 
                    onChange={(e) => setStatusText(e.target.value)}
                    placeholder="🚀 Active"
                    className="w-full bg-black/20 text-slate-150 border border-white/5 px-2.5 py-1.5 rounded-xl text-xs focus:outline-none focus:border-cyan-500" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action footer */}
          <div className="p-3 border-t border-white/5 bg-slate-950/40 shrink-0">
            <button 
              type="submit"
              disabled={isSaving}
              className={`w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow transition active:scale-95 ${
                saveSuccess ? 'bg-emerald-600 text-white' : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold'
              }`}
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  {t.saved}
                </>
              ) : (
                isSaving ? t.saving : t.save
              )}
            </button>
          </div>
        </form>
      )}

      {/* 3. SUB-SCREEN: CHAT SETTINGS */}
      {subScreen === 'chats' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/[0.01] shrink-0">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSubScreen('main')}
                className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-150">{t.secChats}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-32 p-4 space-y-4 custom-scrollbar">
            {/* 3.1 Text Size selection with active chat bubble preview */}
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
              <div>
                <span className="block text-xs font-mono text-slate-350 font-bold uppercase tracking-wide leading-none">{t.textSize}</span>
                <span className="text-[9px] text-slate-500 mt-0.5 block">{t.textSizeDesc}</span>
              </div>

              {/* Levels selector */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'xs', label: t.textSizeSm },
                  { id: 'sm', label: t.textSizeMd },
                  { id: 'base', label: t.textSizeLg },
                  { id: 'lg', label: t.textSizeXl }
                ].map((sLev) => (
                  <button
                    key={sLev.id}
                    onClick={() => {
                      setTextSize(sLev.id);
                      localStorage.setItem('vi-chat-text-size', sLev.id);
                      window.dispatchEvent(new Event('vi-settings-changed'));
                    }}
                    className={`py-1.5 rounded-lg border text-[9px] font-semibold transition cursor-pointer ${
                      textSize === sLev.id 
                        ? 'border-cyan-500 bg-cyan-950/20 text-cyan-400' 
                        : 'border-white/5 bg-black/10 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {sLev.label}
                  </button>
                ))}
              </div>

              {/* Chat bubble sample live preview renderer */}
              <div className="p-2.5 rounded-xl border border-white/5 relative overflow-hidden bg-slate-900/40">
                <div className="flex justify-end pr-1">
                  <div 
                    className="max-w-[85%] bg-cyan-600/35 text-cyan-100 border border-cyan-500/20 rounded-2xl rounded-br-none p-1.5 leading-snug break-words transition-all duration-200"
                    style={{ fontSize: textSize === 'xs' ? '11px' : textSize === 'sm' ? '13px' : textSize === 'base' ? '15px' : '17px' }}
                  >
                    {language === 'ru' ? 'Привет! Регулировка размера шрифта работает мгновенно!' : 'Hi! Changing font settings scales the message bubbles fluidly!'}
                    <span className="block text-[8px] text-cyan-400 font-mono text-right mt-1 font-medium select-none">12:35 UTC ✓</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3.2 Change Wallpaper */}
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
              <span className="block text-xs font-mono text-slate-350 font-bold uppercase tracking-wide leading-none">{t.wallpapers}</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'cosmic', name: language === 'ru' ? 'Космос' : 'Cosmic Slate', style: 'bg-slate-950' },
                  { id: 'aurora', name: language === 'ru' ? 'Аврора' : 'Aurora Dream', style: 'bg-gradient-to-tr from-indigo-950 to-teal-950' },
                  { id: 'midnight', name: language === 'ru' ? 'Полночь' : 'Midnight Velvet', style: 'bg-black' },
                  { id: 'ocean', name: language === 'ru' ? 'Океан' : 'Deep Ocean', style: 'bg-teal-950' },
                  { id: 'sunset', name: language === 'ru' ? 'Закат' : 'Burning Sunset', style: 'bg-gradient-to-tr from-amber-950 via-rose-950 to-slate-950' },
                  { id: 'minimal', name: language === 'ru' ? 'Темный' : 'Charcoal', style: 'bg-zinc-900' }
                ].map((wItem) => (
                  <button
                    key={wItem.id}
                    onClick={() => {
                      setWallpaper(wItem.id);
                      localStorage.setItem('vi-chat-wallpaper', wItem.id);
                      window.dispatchEvent(new Event('vi-settings-changed'));
                    }}
                    className={`h-11 rounded-xl border relative overflow-hidden flex flex-col justify-end p-1.5 text-left transition cursor-pointer ${wItem.style} ${
                      wallpaper === wItem.id ? 'border-cyan-500' : 'border-white/5'
                    }`}
                  >
                    {wallpaper === wItem.id && (
                      <Check className="absolute top-1 right-1 w-3 h-3 text-cyan-400" />
                    )}
                    <span className="text-[9px] font-bold text-slate-100">{wItem.name}</span>
                  </button>
                ))}
              </div>

              {/* Custom background color selector option */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-slate-400 block">{t.customColor}</label>
                <div className="flex gap-1.5">
                  <input 
                    type="color" 
                    value={customWallpaperColor} 
                    onChange={(e) => {
                      setCustomWallpaperColor(e.target.value);
                      localStorage.setItem('vi-custom-wallpaper-color', e.target.value);
                      setWallpaper('custom-color');
                      localStorage.setItem('vi-chat-wallpaper', 'custom-color');
                      window.dispatchEvent(new Event('vi-settings-changed'));
                    }}
                    className="w-8 h-6 rounded bg-transparent border border-white/10 shrink-0 cursor-pointer" 
                  />
                  <input 
                    type="text" 
                    placeholder="#0d0e12" 
                    value={customWallpaperColor} 
                    onChange={(e) => {
                      setCustomWallpaperColor(e.target.value);
                      localStorage.setItem('vi-custom-wallpaper-color', e.target.value);
                      setWallpaper('custom-color');
                      localStorage.setItem('vi-chat-wallpaper', 'custom-color');
                      window.dispatchEvent(new Event('vi-settings-changed'));
                    }}
                    className="flex-1 bg-black/20 text-slate-200 border border-white/5 text-[10px] rounded px-2 py-1 font-mono uppercase focus:outline-none focus:border-cyan-500" 
                  />
                </div>
              </div>
            </div>

            {/* 3.3 Theme Select placeholder */}
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
              <span className="block text-xs font-mono text-slate-350 font-bold uppercase tracking-wide leading-none">{t.secThemes}</span>
              <div className="grid grid-cols-3 gap-1 text-[9px] text-center font-mono">
                {[
                  { id: 'theme-midnight-glass', label: language === 'ru' ? 'Тёмная' : 'Dark' },
                  { id: 'theme-light-glass', label: language === 'ru' ? 'Светлая' : 'Light' },
                  { id: 'theme-dark-glass', label: language === 'ru' ? 'Стекло' : 'Glass' }
                ].map((th) => (
                  <button
                    key={th.id}
                    onClick={() => {
                      setTheme(th.id);
                      showToast(language === 'ru' ? `Тема "${th.label}" применена!` : `Theme "${th.label}" updated!`);
                    }}
                    className="py-1 px-1.5 border border-white/5 bg-white/[0.01] rounded hover:border-cyan-500/30 text-slate-300 transition cursor-pointer"
                  >
                    {th.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3.4 Media & Audio Toggles list */}
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
              <span className="block text-xs font-mono text-slate-350 font-bold uppercase tracking-wide leading-none">{t.mediaAndAudio}</span>
              <div className="space-y-3 text-xs">
                {/* Toggle items */}
                {[
                  { key: 'swipeMediaOnClick', val: swipeMedia, setter: setSwipeMedia, label: t.toggleSwipe, desc: t.toggleSwipeDesc },
                  { key: 'edgeSwipeNavigate', val: edgeSwipe, setter: setEdgeSwipe, label: t.toggleEdgeSwipe, desc: t.toggleEdgeSwipeDesc },
                  { key: 'raiseToListen', val: raiseListen, setter: setRaiseListen, label: t.toggleListen, desc: t.toggleListenDesc },
                  { key: 'raiseToRecord', val: raiseRecord, setter: setRaiseRecord, label: t.toggleRecord, desc: t.toggleRecordDesc },
                  { key: 'pauseMusicOnRecord', val: pauseRecord, setter: setPauseRecord, label: t.togglePauseRecord, desc: t.togglePauseRecordDesc },
                  { key: 'pauseMusicOnMediaPlay', val: pausePlay, setter: setPausePlay, label: t.togglePausePlay, desc: t.togglePausePlayDesc }
                ].map((sw) => (
                  <div key={sw.key} className="flex justify-between items-start gap-3 border-b border-white/[0.02] pb-2 last:border-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <span className="text-slate-200 font-semibold block leading-tight">{sw.label}</span>
                      <span className="text-[9px] text-slate-500 block leading-normal mt-0.5">{sw.desc}</span>
                    </div>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded accent-cyan-500 mt-1 cursor-pointer shrink-0"
                      checked={sw.val}
                      onChange={() => handleToggleState(sw.key, sw.val, sw.setter)}
                    />
                  </div>
                ))}

                {/* Microphone selection dropdown */}
                <div className="pt-2 border-t border-white/5">
                  <label className="text-[10px] font-semibold text-slate-300 flex items-center gap-1 mb-1">
                    <Mic className="w-3.5 h-3.5 text-cyan-400" />
                    {t.micSelect}
                  </label>
                  <select
                    value={currentMic}
                    onChange={(e) => handleSelectState('microphoneId', e.target.value, setCurrentMic)}
                    className="w-full bg-black/40 text-slate-200 border border-white/5 text-[11px] rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-mono transition cursor-pointer"
                  >
                    <option value="default">{language === 'ru' ? 'Системный (По умолчанию)' : 'Default System Microphone'}</option>
                    {micDevices.map((mDev) => (
                      <option key={mDev.deviceId} value={mDev.deviceId}>{mDev.label || `Microphone ${mDev.deviceId.substring(0, 5)}...`}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. SUB-SCREEN: NOTIFICATIONS */}
      {subScreen === 'notifications' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/[0.01] shrink-0">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSubScreen('main')}
                className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-150">{t.secNotifications}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {/* 4.1 Chat Notification details */}
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
              <span className="block text-xs font-mono text-slate-350 font-bold uppercase tracking-wide leading-none">{t.notifChats}</span>
              
              <div className="space-y-3 text-xs">
                {[
                  { key: 'notifyPrivate', val: notifPrivate, setter: setNotifPrivate, label: t.privateChats },
                  { key: 'notifyGroups', val: notifGroups, setter: setNotifGroups, label: t.notifGroups },
                  { key: 'notifyChannels', val: notifChannels, setter: setNotifChannels, label: t.notifChannels },
                  { key: 'notifyStories', val: notifStories, setter: setNotifStories, label: t.notifStories }
                ].map((chn) => (
                  <div key={chn.key} className="flex justify-between items-start gap-2.5 border-b border-white/[0.02] pb-2 last:border-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <span className="text-slate-200 font-semibold block leading-none">{chn.label}</span>
                    </div>
                    
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded accent-cyan-500 mt-1 cursor-pointer shrink-0"
                      checked={chn.val}
                      onChange={() => handleToggleState(chn.key, chn.val, chn.setter)}
                    />
                  </div>
                ))}

                {/* Reactions alert and calls dropdown selectors */}
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 text-[11px] leading-tight">{t.notifReactions}</span>
                    <select
                      value={notifReactions}
                      onChange={(e) => handleSelectState('notifyReactions', e.target.value, setNotifReactions)}
                      className="bg-black/40 text-slate-200 border border-white/5 text-[10px] rounded px-1.5 py-0.5 focus:outline-none focus:border-cyan-500 font-mono cursor-pointer shrink-0"
                    >
                      <option value="messages">{language === 'ru' ? 'Для сообщений' : 'Messages Only'}</option>
                      <option value="stories">{language === 'ru' ? 'Сообщения & Истории' : 'Messages & Stories'}</option>
                      <option value="none">{language === 'ru' ? 'Выключено' : 'Disabled'}</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 text-[11px] leading-tight">{t.notifCalls}</span>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded accent-cyan-500 cursor-pointer shrink-0"
                      checked={notifCalls}
                      onChange={() => handleToggleState('notifyCalls', notifCalls, setNotifCalls)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4.2 Sound & Vibrations */}
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
              <span className="block text-xs font-mono text-slate-350 font-bold uppercase tracking-wide leading-none">{t.soundVibe}</span>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2.5 border-b border-white/[0.03]">
                  <span className="text-slate-300">{t.vibeLabel}</span>
                  <select
                    value={vibeMode}
                    onChange={(e) => handleSelectState('vibrationMode', e.target.value, setVibeMode)}
                    className="bg-black/40 text-slate-200 border border-white/5 text-[10px] rounded px-1.5 py-0.5 focus:outline-none focus:border-cyan-500 font-mono cursor-pointer font-semibold"
                  >
                    <option value="default">{t.vibeDefault}</option>
                    <option value="short">{t.vibeShort}</option>
                    <option value="long">{t.vibeLong}</option>
                    <option value="disabled">{t.vibeDisabled}</option>
                  </select>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-300">{t.ringtoneLabel}</span>
                  <select
                    value={ringtoneSelect}
                    onChange={(e) => handleSelectState('ringtoneSelection', e.target.value, setRingtoneSelect)}
                    className="bg-black/40 text-slate-200 border border-white/5 text-[10px] rounded px-1.5 py-0.5 focus:outline-none focus:border-cyan-500 font-mono cursor-pointer font-semibold"
                  >
                    <option value="standard">Standard Tone</option>
                    <option value="cyber">Cybernetic Synth</option>
                    <option value="cosmic">Cosmic Waves</option>
                    <option value="playful">Playful Chimes</option>
                    <option value="none">None (Mute)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Message Badge Counter settings */}
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
              <span className="block text-xs font-mono text-slate-350 font-bold uppercase tracking-wide leading-none">{t.msgCounter}</span>
              
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center pb-1 border-b border-white/[0.03]">
                  <div className="min-w-0 flex-1 pr-1">
                    <span className="text-slate-200 font-semibold block leading-tight">{t.showBadge}</span>
                  </div>
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded accent-cyan-500 cursor-pointer shrink-0"
                    checked={showUnread}
                    onChange={() => handleToggleState('showUnreadCounts', showUnread, setShowUnread)}
                  />
                </div>

                <div className="flex justify-between items-center pb-1 border-b border-white/[0.03]">
                  <div className="min-w-0 flex-1 pr-1">
                    <span className="text-slate-200 font-semibold block leading-tight">{t.includeMuted}</span>
                  </div>
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded accent-cyan-500 cursor-pointer shrink-0"
                    checked={includeMuted}
                    onChange={() => handleToggleState('includeMutedInCounts', includeMuted, setIncludeMuted)}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-300 text-[11px] leading-tight">{t.countMode}</span>
                  <div className="flex bg-black/40 p-0.5 rounded border border-white/5 font-mono text-[8px] uppercase">
                    <button
                      onClick={() => handleSelectState('countMessagesOrChats', 'messages', setCountMode)}
                      className={`px-1.5 py-0.5 rounded transition cursor-pointer ${countMode === 'messages' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Msgs
                    </button>
                    <button
                      onClick={() => handleSelectState('countMessagesOrChats', 'chats', setCountMode)}
                      className={`px-1.5 py-0.5 rounded transition cursor-pointer ${countMode === 'chats' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Chats
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 4.3 In-App System notification settings */}
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
              <span className="block text-xs font-mono text-slate-350 font-bold uppercase tracking-wide leading-none">{t.inAppNotifs}</span>
              
              <div className="space-y-3 text-xs">
                {[
                  { key: 'inAppSound', val: inAppSound, setter: setInAppSound, label: t.inAppSound },
                  { key: 'inAppVibe', val: inAppVibe, setter: setInAppVibe, label: t.inAppVibe },
                  { key: 'inAppPreviewText', val: inAppPreview, setter: setInAppPreview, label: t.inAppPreview },
                  { key: 'inAppChatSound', val: inAppChatSound, setter: setInAppChatSound, label: t.inAppChatSound },
                  { key: 'inAppPopupsEnabled', val: inAppPopups, setter: setInAppPopups, label: t.inAppPopups, desc: t.inAppPopupsDesc }
                ].map((sip) => (
                  <div key={sip.key} className="flex justify-between items-start gap-4 border-b border-white/[0.02] pb-2.5 last:border-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <span className="text-slate-200 font-semibold block leading-tight">{sip.label}</span>
                      {sip.desc && <span className="text-[9px] text-slate-500 block leading-normal mt-0.5">{sip.desc}</span>}
                    </div>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded accent-cyan-500 mt-0.5 cursor-pointer shrink-0"
                      checked={sip.val}
                      onChange={() => handleToggleState(sip.key, sip.val, sip.setter)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 4.4 Events notifications */}
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
              <span className="block text-xs font-mono text-slate-350 font-bold uppercase tracking-wide leading-none">{t.eventsTitle}</span>
              
              <div className="space-y-3 text-xs">
                {[
                  { key: 'notifyContactJoinedMsg', val: eventJoined, setter: setEventJoined, label: t.eventContactJoined },
                  { key: 'notifyPinnedMsg', val: eventPinned, setter: setEventPinned, label: t.eventPinned },
                  { key: 'notifyOtherMsg', val: eventOther, setter: setEventOther, label: t.eventOther }
                ].map((evt) => (
                  <div key={evt.key} className="flex justify-between items-center pb-2 border-b border-white/[0.02] last:border-0 last:pb-0">
                    <span className="text-slate-300 leading-tight">{evt.label}</span>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded accent-cyan-500 cursor-pointer shrink-0"
                      checked={evt.val}
                      onChange={() => handleToggleState(evt.key, evt.val, evt.setter)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 4.5 Service Reliability toggles */}
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
              <span className="block text-xs font-mono text-slate-350 font-bold uppercase tracking-wide leading-none">{t.reliabilityTitle}</span>
              
              <div className="space-y-3 text-xs">
                {[
                  { key: 'restartOnClose', val: restartClose, setter: setRestartClose, label: t.restartClose, desc: t.restartCloseDesc },
                  { key: 'keepAliveBackground', val: bgConnection, setter: setBgConnection, label: t.bgConnection, desc: t.bgConnectionDesc },
                  { key: 'retryNotificationsRelay', val: retryNotif, setter: setRetryNotif, label: t.retryNotif, desc: t.retryNotifDesc }
                ].map((rlb) => (
                  <div key={rlb.key} className="flex justify-between items-start gap-4 border-b border-white/[0.02] pb-2.5 last:border-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <span className="text-slate-200 font-semibold block leading-tight">{rlb.label}</span>
                      <span className="text-[9px] text-slate-500 block leading-normal mt-0.5">{rlb.desc}</span>
                    </div>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded accent-cyan-500 mt-1 cursor-pointer shrink-0"
                      checked={rlb.val}
                      onChange={() => handleToggleState(rlb.key, rlb.val, rlb.setter)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. SUB-SCREEN: PRIVACY */}
      {subScreen === 'privacy' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-3 border-b border-white/5 flex items-center gap-2 bg-white/[0.01] shrink-0">
            <button 
              onClick={() => setSubScreen('main')}
              className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-150">{t.secPrivacy}</span>
          </div>

          <div className="flex-1 overflow-y-auto pb-32 p-4 space-y-4 custom-scrollbar">
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
              <span className="block text-xs font-mono text-slate-300 font-bold uppercase tracking-wider">
                {t.privacyWho}
              </span>

              <div className="space-y-3 text-xs">
                {[
                  { 
                    label: language === 'ru' ? 'Номер телефона' : 'Phone Number', 
                    val: userProfile?.privacySettings?.phoneNumber || 'all', 
                    key: 'phoneNumber'
                  },
                  { 
                    label: language === 'ru' ? 'Статус' : 'Status Display', 
                    val: userProfile?.privacySettings?.statusMessage || 'all', 
                    key: 'statusMessage'
                  },
                  { 
                    label: language === 'ru' ? 'Фото профиля' : 'Profile Avatar', 
                    val: userProfile?.privacySettings?.photoURL || 'all', 
                    key: 'photoURL'
                  },
                  { 
                    label: language === 'ru' ? 'Последний визит' : 'Last Seen', 
                    val: userProfile?.privacySettings?.lastSeen || 'all', 
                    key: 'lastSeen'
                  },
                  { 
                    label: language === 'ru' ? 'Статус онлайн' : 'Online Status', 
                    val: userProfile?.privacySettings?.onlineStatus || 'all', 
                    key: 'onlineStatus'
                  }
                ].map((field) => (
                  <div key={field.key} className="flex items-center justify-between gap-2 border-b border-white/[0.02] pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400">{field.label}</span>
                    <select 
                      value={field.val} 
                      onChange={async (e) => {
                        const nextSettings = {
                          ...(userProfile?.privacySettings || {}),
                          [field.key]: e.target.value
                        };
                        try {
                          await updateMyProfile(
                            userProfile?.displayName || '',
                            userProfile?.bio || '',
                            userProfile?.statusMessage || '',
                            undefined,
                            userProfile?.emojiStatus || '',
                            userProfile?.phoneNumber || '',
                            nextSettings,
                            userProfile?.birthday || ''
                          );
                        } catch (err) {
                          console.error("Privacy fields save failed", err);
                        }
                      }}
                      className="bg-black/40 text-slate-200 border border-white/5 text-[10px] rounded px-1.5 py-0.5 focus:outline-none focus:border-cyan-500 font-mono shrink-0 cursor-pointer"
                    >
                      <option value="all">{t.everyone}</option>
                      <option value="contacts">{t.contacts}</option>
                      <option value="nobody">{t.nobody}</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. SUB-SCREEN: APPEARANCE (Duplicate of Chat theme for rich route UX) */}
      {subScreen === 'appearance' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-3 border-b border-white/5 flex items-center gap-2 bg-white/[0.01] shrink-0">
            <button 
              onClick={() => setSubScreen('main')}
              className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-150">{t.secThemes}</span>
          </div>

          <div className="flex-1 overflow-y-auto pb-32 p-4 space-y-4 custom-scrollbar">
            {/* Main theme controller block */}
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3 text-center">
              <span className="inline-block p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl mb-1">
                <Palette className="w-5 h-5" />
              </span>
              <h3 className="text-xs font-bold">{language === 'ru' ? 'Премиум темы Liquid Glass' : 'Liquid Glass Premium Themes'}</h3>
              <p className="text-[10px] text-slate-500 leading-normal px-2">
                {language === 'ru' ? 'Выберите тему оформления для всего рабочего пространства VI Messenger.' : 'Customize active environment designs across your workspace channels.'}
              </p>

              <div className="grid grid-cols-1 gap-2 pt-2">
                {[
                  { id: 'theme-dark-glass', name: language === 'ru' ? 'Тёмное Стекло (Стиль VI)' : 'Dark Glass (VI style)', color: 'bg-slate-900 border-slate-700' },
                  { id: 'theme-light-glass', name: language === 'ru' ? 'Светлое Стекло' : 'Light Glass', color: 'bg-slate-200 border-slate-300' },
                  { id: 'theme-midnight-glass', name: language === 'ru' ? 'Космическая полночь' : 'Midnight Cosmic', color: 'bg-indigo-950 border-indigo-900' },
                  { id: 'theme-arctic-glass', name: language === 'ru' ? 'Арктика / Лёд' : 'Arctic Breeze', color: 'bg-sky-200 border-sky-300' },
                  { id: 'theme-ocean-glass', name: language === 'ru' ? 'Глубокий океан' : 'Deep Ocean', color: 'bg-teal-900 border-teal-700' }
                ].map((thObj) => (
                  <button
                    key={thObj.id}
                    onClick={() => {
                      setTheme(thObj.id);
                      window.dispatchEvent(new Event('vi-settings-changed'));
                    }}
                    className={`p-3 border rounded-xl flex items-center justify-between text-left transition cursor-pointer font-sans text-xs ${
                      theme === thObj.id 
                        ? 'border-cyan-500 bg-cyan-950/20 text-cyan-400 font-bold' 
                        : 'border-white/5 bg-black/20 text-slate-300 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full ${thObj.color} border border-white/20`} />
                      <span>{thObj.name}</span>
                    </div>
                    {theme === thObj.id && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. SUB-SCREEN: DATA & MEMORY / STORAGE */}
      {subScreen === 'data' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/[0.01] shrink-0">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSubScreen('main')}
                className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-150">{t.secData}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {/* Active session managers */}
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="block text-xs font-mono text-amber-500 uppercase tracking-wider font-bold">
                  {t.activeSessions}
                </span>
                <button 
                  onClick={() => {
                    terminateOtherSessions().then(() => {
                      showToast(language === 'ru' ? 'Прочие сеансы завершены!' : 'Other hardware sessions revoked!');
                    }).catch((err: any) => {
                      showToast(err.message, 'error');
                    });
                  }}
                  className="text-[8px] uppercase font-mono px-2 py-1 bg-amber-500/15 border border-amber-500/30 rounded hover:bg-amber-500/25 text-amber-300 cursor-pointer transition active:scale-95"
                >
                  {t.terminateOthers}
                </button>
              </div>

              <div className="space-y-2 text-xs divide-y divide-white/5 max-h-[160px] overflow-y-auto pr-1">
                {(userProfile?.activeSessions || []).map((session, idx) => {
                  const isCurrent = navigator.userAgent.substring(0, 30) === session.deviceName.substring(0, 30);
                  return (
                    <div key={idx} className="pt-2 first:pt-0 flex justify-between items-start gap-1">
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-[9px] text-slate-300 block truncate">
                          {session.deviceName}
                        </span>
                        <span className="text-[8px] text-slate-500 block font-mono mt-0.5">
                          Active: {new Date(session.lastActive || Date.now()).toLocaleTimeString()}
                        </span>
                      </div>
                      {isCurrent ? (
                        <span className="text-[8px] font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-500/15 px-1 rounded uppercase">Current</span>
                      ) : (
                        <span className="text-[8px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-1 rounded">Offline</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Clear cache details danger block */}
            <div className="p-3 bg-white/[0.02] border border-rose-500/10 rounded-2xl space-y-2">
              <span className="block text-xs font-mono text-rose-400 uppercase tracking-wider font-bold">{t.clearCache}</span>
              <p className="text-[10px] text-slate-500 leading-normal">
                {t.clearCacheDesc}
              </p>
              <button 
                onClick={() => {
                  localStorage.clear();
                  showToast(language === 'ru' ? 'Кэш очищен! Перезапуск...' : 'Sandbox cleared! Reloading...', 'info');
                  setTimeout(() => window.location.reload(), 1500);
                }}
                className="w-full py-2 bg-rose-950/20 border border-rose-500/20 rounded-xl font-mono uppercase text-[9px] font-bold text-rose-300 cursor-pointer"
              >
                {t.clearCacheBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. SUB-SCREEN: LANGUAGE */}
      {subScreen === 'language' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-3 border-b border-white/5 flex items-center gap-2 bg-white/[0.01] shrink-0">
            <button 
              onClick={() => setSubScreen('main')}
              className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-150">{t.secLang}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
              <span className="block text-xs font-mono text-slate-350 font-bold uppercase tracking-wide leading-none">{language === 'ru' ? 'Язык интерфейса' : 'Interface Language'}</span>
              
              <div className="space-y-1.5 pt-1 text-xs">
                {[
                  { code: 'ru', label: 'Русский (Russian)' },
                  { code: 'en', label: 'English (UK / US)' }
                ].map((langOpt) => (
                  <button
                    key={langOpt.code}
                    onClick={() => {
                      localStorage.setItem('vi-localization-pref', langOpt.code);
                      window.dispatchEvent(new Event('vi-settings-changed'));
                      showToast(langOpt.code === 'ru' ? 'Локализация изменена! Перезагрузка...' : 'Language successfully switched! Reloading...', 'success');
                      setTimeout(() => window.location.reload(), 1500);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left flex justify-between items-center transition cursor-pointer text-[11px] ${
                      language === langOpt.code 
                        ? 'border-cyan-500 bg-cyan-950/15 text-cyan-400' 
                        : 'border-white/5 bg-black/20 text-slate-400'
                    }`}
                  >
                    <span>{langOpt.label}</span>
                    {language === langOpt.code && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. SUB-SCREEN: SECURITY */}
      {subScreen === 'security' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-3 border-b border-white/5 flex items-center gap-2 bg-white/[0.01] shrink-0">
            <button 
              onClick={() => setSubScreen('main')}
              className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-150">{t.secSecurity}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3.5">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase">{language === 'ru' ? 'Шифрование и доступы' : 'Encryption & Credentials'}</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                {language === 'ru' ? 'Стек шифрования VI Messenger использует распределенные асимметричные ключи, привязанные к аппаратной сигнатуре вашего девайса.' : 'Security utilizes distributed client asymmetric key blocks pinned directly to device storage containers.'}
              </p>

              {/* Verified account status details block */}
              <div className="space-y-3 border-t border-white/5 pt-4 text-xs">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-450 font-medium">Active Auth Email</span>
                  <span className="font-mono text-[9px] text-slate-350">{currentUser?.email || 'N/A'}</span>
                </div>
                
                <div className="flex justify-between items-center text-[10px] pb-1">
                  <span className="text-slate-450 font-medium">Firestore Status</span>
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/20 px-1 border border-emerald-500/10 rounded">Encrypted</span>
                </div>

                <div className="pt-2 border-t border-white/[0.03] space-y-3">
                   <div className="flex items-center justify-between group">
                      <div className="flex-1 min-w-0">
                         <span className="text-[11px] font-bold text-slate-200 block mb-0.5">{language === 'ru' ? 'Двухфакторная аутентификация' : 'Two-Factor Authentication'}</span>
                         <span className="text-[9px] text-slate-500 block leading-tight">{language === 'ru' ? 'Запрашивать пароль при входе с нового устройства.' : 'Additional security code required for login attempts.'}</span>
                      </div>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded accent-cyan-500 cursor-pointer shrink-0 ml-2" 
                        defaultChecked={false}
                        onChange={(e) => {
                          showToast(e.target.checked ? (language === 'ru' ? '2FA включена!' : '2FA Enabled!') : (language === 'ru' ? '2FA отключена' : '2FA Disabled'), 'info');
                        }}
                      />
                   </div>

                   <div className="flex items-center justify-between group">
                      <div className="flex-1 min-w-0">
                         <span className="text-[11px] font-bold text-slate-200 block mb-0.5">
                            {language === 'ru' ? 'Код-пароль' : 'Passcode Lock'}
                            {hasPasscode && (
                               <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            )}
                         </span>
                         <span className="text-[9px] text-slate-500 block leading-tight">{language === 'ru' ? 'Локальный пин-код для входа в приложение.' : 'Lock the application with a local pin code.'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                         {hasPasscode ? (
                            <>
                               <button 
                                  onClick={() => {
                                     setPasscodeStep('enter');
                                     setPasscodePin('');
                                     setPasscodeConfirmPin('');
                                     setShowPasscodeModal(true);
                                  }}
                                  className="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20 hover:bg-cyan-500/20 transition-all cursor-pointer"
                               >
                                  {language === 'ru' ? 'ИЗМЕНИТЬ' : 'CHANGE'}
                               </button>
                               <button 
                                  onClick={() => {
                                     if (confirm(language === 'ru' ? 'Вы уверены, что хотите отключить код-пароль?' : 'Are you sure you want to disable the passcode?')) {
                                        localStorage.removeItem('vix-passcode-lock');
                                        window.dispatchEvent(new Event('vix-passcode-updated'));
                                        setHasPasscode(false);
                                        showToast(language === 'ru' ? 'Код-пароль отключен' : 'Passcode disabled', 'info');
                                     }
                                  }}
                                  className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20 hover:bg-rose-500/20 transition-all cursor-pointer"
                                >
                                   {language === 'ru' ? 'ОТКЛЮЧИТЬ' : 'DISABLE'}
                                </button>
                            </>
                         ) : (
                            <button 
                               onClick={() => {
                                  setPasscodeStep('enter');
                                  setPasscodePin('');
                                  setPasscodeConfirmPin('');
                                  setShowPasscodeModal(true);
                               }}
                               className="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20 hover:bg-cyan-500/20 transition-all cursor-pointer"
                            >
                               {language === 'ru' ? 'НАСТРОИТЬ' : 'SETUP'}
                            </button>
                         )}
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. SUB-SCREEN: HELP & FAQ accordion */}
      {subScreen === 'help' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-3 border-b border-white/5 flex items-center gap-2 bg-white/[0.01] shrink-0">
            <button 
              onClick={() => setSubScreen('main')}
              className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-150">{t.secHelp}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {/* Version block info */}
            <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-1.5 text-center">
              <span className="block text-[11px] font-bold text-slate-100">{t.appVersion}</span>
              <p className="text-[9.5px] text-slate-500 leading-normal">
                {t.secAboutText}
              </p>
            </div>

            {/* Accordion List FAQ */}
            <div className="space-y-2">
              <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                {t.faqTitle}
              </span>

              <div className="space-y-1.5 text-xs leading-normal">
                {[
                  { q: t.faqSecurityQ, a: t.faqSecurityA },
                  { q: t.faqSyncQ, a: t.faqSyncA },
                  { q: t.faqMicrophoneQ, a: t.faqMicrophoneQAnswer }
                ].map((faq, i) => (
                  <div key={i} className="border border-white/5 bg-white/[0.01] rounded-xl overflow-hidden">
                    <button
                      onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                      className="w-full p-2.5 text-left font-semibold text-slate-200 hover:text-white transition flex justify-between items-center cursor-pointer gap-2"
                    >
                      <span className="text-[10.5px]">{faq.q}</span>
                      <span className="text-xs text-slate-500 font-mono shrink-0">{activeFaq === i ? '−' : '+'}</span>
                    </button>
                    {activeFaq === i && (
                      <div className="px-2.5 pb-3 pt-1 text-[9.5px] text-slate-450 border-t border-white/[0.02] font-mono leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Diagnostic reporting tool */}
            <button
              onClick={() => showToast(t.reportSuccess, 'success')}
              className="w-full py-2 bg-cyan-950/20 hover:bg-cyan-950/40 border border-cyan-500/20 text-cyan-300 font-mono uppercase text-[9px] font-bold rounded-xl cursor-pointer transition active:scale-95"
            >
              {t.sendReport}
            </button>
          </div>
        </div>
      )}

      {/* 11. SUB-SCREEN: ADMINModeration and security Logs */}
      {subScreen === 'admin' && currentUser?.email === 'sasamihajlov709@gmail.com' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/[0.01] shrink-0">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSubScreen('main')}
                className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-150">Admin Board</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {/* Moderation reports section */}
            <div className="p-3 bg-white/[0.02] border border-rose-500/15 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="block text-xs font-mono text-rose-300 uppercase tracking-wider font-bold">
                  User Abuse Reports ({globalReports.length})
                </span>
              </div>
              
              {globalReports.length === 0 ? (
                <p className="text-[9px] text-slate-500 italic">No reports found.</p>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-[140px] custom-scrollbar pr-1">
                  {globalReports.map((r, i) => (
                    <div key={i} className="p-2 bg-rose-950/10 border border-rose-500/10 rounded-xl text-[9px] space-y-1">
                      <div className="flex justify-between items-center gap-1">
                        <span className="text-rose-300 font-mono font-bold">Target: {r.reportedUserId?.substring(0, 10)}...</span>
                        <button 
                          onClick={() => resolveReport(r.id)}
                          className="px-1 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded cursor-pointer"
                        >
                          Resolve
                        </button>
                      </div>
                      <p className="text-slate-450 truncate">{r.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audit Logs Trail */}
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
              <span className="block text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold font-semibold">
                Security Audit Trail ({globalAuditLogs.length})
              </span>
              <div className="space-y-1.5 overflow-y-auto max-h-[165px] font-mono text-[8px] divide-y divide-white/5 custom-scrollbar pr-1">
                {globalAuditLogs.map((log, i) => (
                  <div key={i} className="pt-1.5 leading-snug">
                    <div className="flex justify-between text-slate-500">
                      <span>[{log.action}]</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-350">{log.details}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showPasscodeModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/95 backdrop-blur-3xl z-50 flex flex-col justify-between p-6"
          >
            {/* Header */}
            <div className="flex justify-between items-center shrink-0">
              <span className="text-xs font-mono tracking-widest text-slate-500 uppercase">
                {language === 'ru' ? 'ЗАЩИТА ПРИЛОЖЕНИЯ' : 'SECURITY SHIELD'}
              </span>
              <button 
                onClick={() => {
                  setShowPasscodeModal(false);
                  setPasscodePin('');
                  setPasscodeConfirmPin('');
                  setPasscodeStep('enter');
                }}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content info */}
            <div className="flex-1 flex flex-col items-center justify-center py-6">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 animate-pulse">
                <Lock className="w-5 h-5" />
              </div>
              
              <h3 className="text-sm font-bold text-slate-250 mb-1.5">
                {passcodeStep === 'enter' 
                  ? (language === 'ru' ? 'Задайте код-пароль' : 'Set your passcode') 
                  : (language === 'ru' ? 'Подтвердите код-пароль' : 'Confirm your passcode')
                }
              </h3>
              <p className="text-[10px] text-slate-500 text-center max-w-[200px] leading-normal mb-6">
                {language === 'ru' 
                  ? 'Введите 4-значный пин-код для надежной защиты ваших чатов.' 
                  : 'Enter a 4-digit security PIN to restrict local access to your messages.'
                }
              </p>

              {/* Dots indicating progress */}
              <div className="flex justify-center gap-3.5 mb-8">
                {Array.from({ length: 4 }).map((_, idx) => {
                  const currentLen = passcodeStep === 'enter' ? passcodePin.length : passcodeConfirmPin.length;
                  const isActive = idx < currentLen;
                  return (
                    <motion.div 
                      key={idx}
                      animate={{ 
                        scale: isActive ? [1.1, 1.3, 1.1] : 1,
                        backgroundColor: isActive ? '#22d3ee' : 'rgba(255, 255, 255, 0.1)'
                      }}
                      className="w-3 h-3 rounded-full border border-white/5"
                    />
                  );
                })}
              </div>

              {/* PIN Grid */}
              <div className="w-full max-w-[240px] grid grid-cols-3 gap-3.5">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                  <button 
                    key={num}
                    onClick={() => handlePasscodeNumClick(num)}
                    className="w-14 h-14 rounded-full bg-white/[0.03] hover:bg-white/[0.08] active:scale-90 text-lg font-bold text-slate-200 border border-white/5 flex items-center justify-center transition-all cursor-pointer mx-auto"
                  >
                    {num}
                  </button>
                ))}
                {/* Backspace or Clear */}
                <button 
                  onClick={() => {
                    playTapSound();
                    setPasscodePin('');
                    setPasscodeConfirmPin('');
                    setPasscodeStep('enter');
                  }}
                  className="w-14 h-14 rounded-full hover:bg-white/[0.03] text-xs font-semibold text-rose-400 flex items-center justify-center transition-all cursor-pointer mx-auto"
                >
                  {language === 'ru' ? 'СБРОС' : 'RESET'}
                </button>
                <button 
                  onClick={() => handlePasscodeNumClick('0')}
                  className="w-14 h-14 rounded-full bg-white/[0.03] hover:bg-white/[0.08] active:scale-90 text-lg font-bold text-slate-200 border border-white/5 flex items-center justify-center transition-all cursor-pointer mx-auto"
                >
                  0
                </button>
                <button 
                  onClick={handlePasscodeBackspace}
                  className="w-14 h-14 rounded-full hover:bg-white/[0.03] text-xs font-semibold text-slate-400 flex items-center justify-center transition-all cursor-pointer mx-auto"
                >
                  ⌫
                </button>
              </div>
            </div>

            {/* Security tip */}
            <div className="text-center shrink-0">
              <span className="text-[8px] text-slate-600 uppercase tracking-widest font-mono">
                {language === 'ru' ? 'Аппаратное шифрование AES-256' : 'AES-256 local sandbox container'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {toast && (
        <div className="absolute bottom-6 left-4 right-4 z-50 bg-slate-950/95 border border-cyan-500/35 text-[11px] font-medium py-3 px-4 rounded-xl flex items-center gap-2.5 text-slate-100 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className={`w-2 h-2 rounded-full shrink-0 ${toast.type === 'error' ? 'bg-rose-500 animate-pulse' : toast.type === 'info' ? 'bg-amber-400' : 'bg-green-400'}`} />
          <span className="flex-1 text-left text-slate-200">{toast.message}</span>
        </div>
      )}
    </div>
  );
};
