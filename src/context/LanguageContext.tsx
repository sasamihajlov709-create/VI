import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ru';

export interface Translations {
  appName: string;
  loginSubtitle: string;
  retrievingSession: string;
  offlineBanner: string;
  profileSettings: string;
  privateSecureIngress: string;
  welcomeInstructions: string;
  noActiveChats: string;
  noActiveChatsSub: string;
  encryptedSandboxInfo: string;
  members: string;
  initiateVoice: string;
  initiateVideo: string;
  configureChat: string;
  createFolder: string;
  chatAttributes: string;
  activeCall: string;
  connecting: string;
  searchPlaceholder: string;
  searchMessagesPlaceholder: string;
  stories: string;
  yourStory: string;
  publish: string;
  blockedUsers: string;
  saveProfile: string;
  logout: string;
  reply: string;
  forward: string;
  edit: string;
  delete: string;
  copyText: string;
  react: string;
  forwardedFrom: string;
  you: string;
  voiceMessage: string;
  attachment: string;
  usernameLabel: string;
  displayNameLabel: string;
  bioLabel: string;
  avatarUrlLabel: string;
  newChatType: string;
  groupTitleLabel: string;
  chatMembersPlaceholder: string;
  createButton: string;
  cancelButton: string;
  writeMessagePlaceholder: string;
  folderNameLabel: string;
  allDirectories: string;
  unassigned: string;
  stickersTitle: string;
  addCustomSticker: string;
  chooseSticker: string;
  noCustomStickers: string;
}

const translations: Record<Language, Translations> = {
  en: {
    appName: "VI Messenger Node",
    loginSubtitle: "Connect to highly-secure, unified WebRTC peer calls and real-time community boards.",
    retrievingSession: "Retrieving credential session...",
    offlineBanner: "OFFLINE PERSISTENCE ENABLED - READING LOCAL INDEXEDDB CACHE",
    profileSettings: "My Profile settings",
    privateSecureIngress: "Private Secure Ingress",
    welcomeInstructions: "Select or build an authenticated direct chat, group workspace, or channel directory list to transmit.",
    noActiveChats: "No active chats located",
    noActiveChatsSub: "Start a direct chat or create a group/channel above.",
    encryptedSandboxInfo: "Transmitting is fully encrypted and sandboxed. Write a message below...",
    members: "Members",
    initiateVoice: "Initiate Voice Channel",
    initiateVideo: "Initiate Secure Video Call",
    configureChat: "Configure Platform Chat",
    createFolder: "Create Navigation Folder",
    chatAttributes: "Chat Attributes",
    activeCall: "Active Call",
    connecting: "Connecting...",
    searchPlaceholder: "Search users, channels, or tags...",
    searchMessagesPlaceholder: "Search messages...",
    stories: "Stories",
    yourStory: "Your Story",
    publish: "Publish",
    blockedUsers: "Blocked Users",
    saveProfile: "Save Profile",
    logout: "Logout",
    reply: "Reply",
    forward: "Forward",
    edit: "Edit",
    delete: "Delete",
    copyText: "Copy text",
    react: "React",
    forwardedFrom: "Forwarded from",
    you: "You",
    voiceMessage: "Voice Message",
    attachment: "Attachment",
    usernameLabel: "Username handle (lowercase)",
    displayNameLabel: "Display name",
    bioLabel: "Bio biography",
    avatarUrlLabel: "Avatar Photo URLs",
    newChatType: "New Chat Connection type",
    groupTitleLabel: "Group or Channel Title Name",
    chatMembersPlaceholder: "Select user memberships",
    createButton: "Create",
    cancelButton: "Cancel",
    writeMessagePlaceholder: "Transmitting message content...",
    folderNameLabel: "Folder directory title",
    allDirectories: "All Directories",
    unassigned: "Unassigned Assets",
    stickersTitle: "Stickers",
    addCustomSticker: "Add Sticker",
    chooseSticker: "Choose Sticker",
    noCustomStickers: "Drag-drop or select an image to upload custom stickers!"
  },
  ru: {
    appName: "VI Messenger Node",
    loginSubtitle: "Подключайтесь к высокозащищенным пиринговым WebRTC звонкам и доскам сообществ в реальном времени.",
    retrievingSession: "Получение сессии учетных данных...",
    offlineBanner: "РЕЖИМ ОФЛАЙН-ХРАНИЛИЩА - ЧТЕНИЕ ИЗ ЛОКАЛЬНОГО КЭША INDEXEDDB",
    profileSettings: "Настройки моего профиля",
    privateSecureIngress: "Закрытый защищенный канал",
    welcomeInstructions: "Выберите или создайте чат, групповую рабочую область или канал для передачи сообщений.",
    noActiveChats: "Активные чаты не найдены",
    noActiveChatsSub: "Начните личный чат или создайте группу/канал выше.",
    encryptedSandboxInfo: "Передача полностью зашифрована и изолирована. Напишите сообщение ниже...",
    members: "участников",
    initiateVoice: "Начать голосовой звонок",
    initiateVideo: "Начать защищенный видеозвонок",
    configureChat: "Настройка чата платформы",
    createFolder: "Создать папку навигации",
    chatAttributes: "Атрибуты чата",
    activeCall: "Активный звонок",
    connecting: "Подключение...",
    searchPlaceholder: "Поиск пользователей, каналов, тегов...",
    searchMessagesPlaceholder: "Поиск сообщений...",
    stories: "Истории",
    yourStory: "Ваша история",
    publish: "Опубликовать",
    blockedUsers: "Заблокированные пользователи",
    saveProfile: "Сохранить профиль",
    logout: "Выйти из системы",
    reply: "Ответить",
    forward: "Переслать",
    edit: "Изменить",
    delete: "Удалить",
    copyText: "Копировать текст",
    react: "Реакция",
    forwardedFrom: "Переслано от",
    you: "Вы",
    voiceMessage: "Голосовое сообщение",
    attachment: "Вложение",
    usernameLabel: "Имя пользователя (строчные буквы)",
    displayNameLabel: "Отображаемое имя",
    bioLabel: "О себе",
    avatarUrlLabel: "URL фотографии профиля",
    newChatType: "Тип нового подключения",
    groupTitleLabel: "Название группы или канала",
    chatMembersPlaceholder: "Выберите участников",
    createButton: "Создать",
    cancelButton: "Отмена",
    writeMessagePlaceholder: "Отправка содержимого сообщения...",
    folderNameLabel: "Название папки каталога",
    allDirectories: "Все каталоги",
    unassigned: "Без папки",
    stickersTitle: "Стикеры",
    addCustomSticker: "Добавить стикер",
    chooseSticker: "Выбрать стикер",
    noCustomStickers: "Перетащите или выберите картинку, чтобы загрузить свои стикеры!"
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('vi_messenger_lang');
    return (saved === 'ru' || saved === 'en') ? saved : 'ru';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('vi_messenger_lang', lang);
  };

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
