/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { logger } from '../lib/logger';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  arrayUnion, 
  arrayRemove, 
  increment,
  runTransaction,
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { 
  ref as storageRef, 
  uploadBytesResumable, 
  getDownloadURL 
} from 'firebase/storage';
import { auth, db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  UserProfile, 
  Chat, 
  Message, 
  CallSession, 
  Story, 
  ChatFolder,
  ActiveSession,
  CustomInviteLink,
  JoinRequest,
  AdminAction
} from '../types';

interface MessengerContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  chats: Chat[];
  messages: Message[];
  activeChat: Chat | null;
  stories: Story[];
  activeCall: CallSession | null;
  dialerCall: CallSession | null;
  blockedUsersList: string[];
  contactsList: UserProfile[];
  globalUsers: UserProfile[];
  onlineUsers: { [uid: string]: 'online' | 'offline' };
  activeFolder: string; // 'all' | folderId
  searchQuery: string;
  isSidebarOpen: boolean;
  isRightPanelOpen: boolean;
  uploadProgress: { [msgId: string]: number };
  
  // Auth actions
  loginEmail: (email: string, pass: string) => Promise<void>;
  signupEmail: (email: string, pass: string, displayName: string, username: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateMyProfile: (
    displayName: string, 
    bio: string, 
    statusMsg: string, 
    photoURL?: string, 
    emojiStatus?: string, 
    phoneNumber?: string,
    privacySettings?: UserProfile['privacySettings']
  ) => Promise<void>;
  completeOnboarding: (data: {
    displayName: string;
    username: string;
    photoURL: string;
    bio: string;
    theme: string;
    themeDensity: 'cozy' | 'compact' | 'comfortable';
    privacySettings?: UserProfile['privacySettings'];
  }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  deleteAvatar: () => Promise<void>;
  updateFolder: (folderId: string, name: string, icon: string, chatIds: string[], rules?: ('direct' | 'group' | 'channel' | 'unread' | 'work' | 'friends')[]) => Promise<void>;
  sortFolders: (folders: ChatFolder[]) => Promise<void>;
  getRecommendedUsers: () => Promise<UserProfile[]>;
  terminateSession: (sessionId: string) => Promise<void>;
  
  // Chat actions
  createDirectChat: (targetUser: UserProfile) => Promise<Chat>;
  createGroupOrChannel: (title: string, type: 'group' | 'channel', memberIds: string[], rules?: string, welcomeMessage?: string) => Promise<Chat>;
  setActiveChat: (chat: Chat | null) => void;
  togglePinChat: (chatId: string) => Promise<void>;
  toggleArchiveChat: (chatId: string) => Promise<void>;
  toggleMuteChat: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  setActiveFolder: (folderId: string) => void;
  createFolder: (name: string, icon: string, chatIds: string[]) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  
  // Message actions
  sendTextMessage: (text: string, replyTo?: Message, forwardFrom?: Message, topicId?: string, silent?: boolean, scheduledAt?: number) => Promise<void>;
  sendFileMessage: (file: File, type: 'image' | 'video' | 'file') => Promise<void>;
  sendVoiceMessage: (audioBlob: Blob, durationSeconds: number) => Promise<void>;
  sendStickerMessage: (stickerUrl: string) => Promise<void>;
  uploadSticker: (file: File) => Promise<void>;
  sendTypingStatus: (chatId: string) => Promise<void>;
  saveChatDraft: (chatId: string, text: string) => Promise<void>;
  editMessage: (messageId: string, newText: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  saveMessageToFavorites: (message: Message) => Promise<void>;
  addMessageReaction: (messageId: string, emoji: string) => Promise<void>;
  removeMessageReaction: (messageId: string) => Promise<void>;
  pinMessage: (chatId: string, messageId: string | null) => Promise<void>;
  sendPollMessage: (question: string, options: string[], isAnonymous: boolean, isMultiple: boolean, isQuiz?: boolean, correctOptionIndex?: number) => Promise<void>;
  voteInPoll: (messageId: string, optionIndex: number) => Promise<void>;
  createTopic: (chatId: string, name: string, icon?: string) => Promise<void>;
  closeTopic: (chatId: string, topicId: string, closed: boolean) => Promise<void>;
  
  // Contacts & Profiles operations
  addContactByUsername: (username: string) => Promise<void>;
  removeContact: (uid: string) => Promise<void>;
  toggleBlockUser: (uid: string) => Promise<void>;
  searchUsersByPrefix: (prefix: string) => Promise<UserProfile[]>;
  
  // Stories
  publishStory: (file: File, mediaType: 'image' | 'video') => Promise<void>;
  viewStory: (storyId: string) => Promise<void>;
  addStoryReaction: (storyId: string, emoji: string) => Promise<void>;
  
  // Calling (WebRTC signaling placeholders/dispatches)
  initiateCall: (receiverId: string, type: 'voice' | 'video') => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  setDialerCall: (session: CallSession | null) => void;
  setActiveCall: (session: CallSession | null) => void;
  
  // UI states
  setSearchQuery: (query: string) => void;
  setIsSidebarOpen: (open: boolean) => void;
  setIsRightPanelOpen: (open: boolean) => void;
  theme: string;
  setTheme: (t: string) => void;
  selectedUserProfile: UserProfile | null;
  setSelectedUserProfile: (profile: UserProfile | null) => void;
  addMemberToChat: (chatId: string, targetUid: string) => Promise<void>;
  joinChatByInviteCode: (inviteCode: string) => Promise<Chat>;
  updateGroupInfo: (chatId: string, title: string, description?: string, photoURL?: string) => Promise<void>;
  updateChatDetails: (chatId: string, details: { title?: string; description?: string; photoURL?: string; isPublic?: boolean; username?: string; slowModeSeconds?: number; rules?: string; welcomeMessage?: string }) => Promise<void>;
  updateMemberRole: (chatId: string, memberId: string, role: 'admin' | 'moderator' | 'member' | 'restricted', targetName: string) => Promise<void>;
  kickMember: (chatId: string, memberId: string, targetName: string) => Promise<void>;
  banMember: (chatId: string, memberId: string, targetName: string) => Promise<void>;
  unbanMember: (chatId: string, memberId: string, targetName: string) => Promise<void>;
  muteMember: (chatId: string, memberId: string, targetName: string, durationMinutes?: number) => Promise<void>;
  unmuteMember: (chatId: string, memberId: string, targetName: string) => Promise<void>;
  generateInviteLink: (chatId: string, usageLimit: number | null, expiresHours: number | null) => Promise<CustomInviteLink>;
  revokeInviteLink: (inviteId: string) => Promise<void>;
  submitJoinRequest: (chatId: string, reason?: string) => Promise<void>;
  handleJoinRequest: (requestId: string, action: 'approved' | 'rejected') => Promise<void>;
  terminateOtherSessions: () => Promise<void>;
  submitReport: (reportedUserId: string, chatId?: string, messageId?: string, reason: string) => Promise<void>;
  resolveReport: (reportId: string) => Promise<void>;
  writeAuditLog: (action: string, details: string, chatId?: string, targetId?: string) => Promise<void>;
  globalReports: ReportItem[];
  globalAuditLogs: any[];
}

const MessengerContext = createContext<MessengerContextType | undefined>(undefined);

export const MessengerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChat, setActiveChatState] = useState<Chat | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [dialerCall, setDialerCall] = useState<CallSession | null>(null);
  const [blockedUsersList, setBlockedUsersList] = useState<string[]>([]);
  const [contactsList, setContactsList] = useState<UserProfile[]>([]);
  const [globalUsers, setGlobalUsers] = useState<UserProfile[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<{ [uid: string]: 'online' | 'offline' }>({});
  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<{ [msgId: string]: number }>({});
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null);
  const [theme, setThemeState] = useState<string>(() => localStorage.getItem('app-theme') || 'theme-dark-glass');
  const [globalReports, setGlobalReports] = useState<ReportItem[]>([]);
  const [globalAuditLogs, setGlobalAuditLogs] = useState<any[]>([]);

  const setTheme = async (t: string) => {
    setThemeState(t);
    localStorage.setItem('app-theme', t);
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), { theme: t });
      } catch (e) {
        console.warn("Failed to sync theme to firestore:", e);
      }
    }
  };
  const activeChatRef = useRef<Chat | null>(null);
  const chatsRef = useRef<Chat[]>([]);
  const lastTypingSent = useRef<{ [chatId: string]: number }>({});

  // Sync ref to maintain access to currently open chat within real-time listeners (avoids stale closures)
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  // Admin and Moderation Real-Time Collections Sync
  useEffect(() => {
    if (!currentUser || currentUser.email !== 'sasamihajlov709@gmail.com') {
      setGlobalReports([]);
      setGlobalAuditLogs([]);
      return;
    }

    const unsubReports = onSnapshot(collection(db, 'reports'), (snap) => {
      const list: ReportItem[] = [];
      snap.forEach(d => list.push(d.data() as ReportItem));
      setGlobalReports(list.sort((a,b) => b.createdAt - a.createdAt));
    }, (err) => {
      console.log('Failing reports sub (rules enforced):', err);
    });

    const unsubLogs = onSnapshot(collection(db, 'auditLogs'), (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push(d.data()));
      setGlobalAuditLogs(list.sort((a,b) => b.timestamp - a.timestamp));
    }, (err) => {
      console.log('Failing logs sub (rules enforced):', err);
    });

    return () => {
      unsubReports();
      unsubLogs();
    };
  }, [currentUser]);

  // Auth & Session Restore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Core Presence Heartbeat (Keep user active)
        const userRef = doc(db, 'users', user.uid);
        const snapped = await getDoc(userRef);
        
        let profileDetails: UserProfile;
        if (!snapped.exists()) {
          // Provision default user info on first login
          const cleanUsername = user.email?.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Math.floor(Math.random() * 900 + 100);
          profileDetails = {
            uid: user.uid,
            displayName: user.displayName || 'Anonymous User',
            username: cleanUsername.toLowerCase(),
            email: user.email || '',
            photoURL: user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName || 'VI')}`,
            bio: 'Hello, I am using VI Messenger!',
            statusMessage: 'Productive and connected',
            onlineStatus: 'online',
            lastSeen: Date.now(),
            createdAt: Date.now(),
            contacts: [],
            blockedUsers: [],
            folders: []
          };
          await setDoc(userRef, profileDetails);
        } else {
          profileDetails = snapped.data() as UserProfile;
          // Refresh presence status to online
          await updateDoc(userRef, {
            onlineStatus: 'online',
            lastSeen: Date.now()
          });
        }
        
        // Auto-register current device session
        const currentSessions = profileDetails.activeSessions || [];
        const isDeviceRegistered = currentSessions.some(s => s.deviceName.includes(navigator.userAgent.substring(0, 30)));
        if (!isDeviceRegistered) {
          const freshSession: ActiveSession = {
            id: Math.random().toString(36).substring(2, 9),
            deviceName: `${navigator.userAgent.split(')')[0].split('(')[1] || 'Web Session'} - Browser`,
            lastActive: Date.now()
          };
          await updateDoc(userRef, {
            activeSessions: [...currentSessions, freshSession]
          });
        } else {
          const updated = currentSessions.map(s => {
            if (s.deviceName.includes(navigator.userAgent.substring(0, 30))) {
              return { ...s, lastActive: Date.now() };
            }
            return s;
          });
          await updateDoc(userRef, {
            activeSessions: updated
          });
        }
        
        setUserProfile(profileDetails);
        setBlockedUsersList(profileDetails.blockedUsers || []);

        try {
          const cleanDevName = navigator.userAgent.substring(0, 50);
          const logId = doc(collection(db, 'auditLogs')).id;
          const logEntry = {
            id: logId,
            actorId: user.uid,
            actorName: profileDetails.displayName || 'Authorized User',
            action: 'login',
            details: `User successfully authenticated (Device: ${cleanDevName})`,
            chatId: '',
            targetId: '',
            timestamp: Date.now()
          };
          setDoc(doc(db, 'auditLogs', logId), logEntry).catch(() => {});
        } catch (_) {}
        
        // Listen to currentUser's profile changes dynamically
        const unsubProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const up = docSnap.data() as UserProfile;
            setUserProfile(up);
            setBlockedUsersList(up.blockedUsers || []);
            // Bidirectional Real-time Theme synchronization
            if (up.theme && up.theme !== localStorage.getItem('app-theme')) {
              setThemeState(up.theme);
              localStorage.setItem('app-theme', up.theme);
            }
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        });

        // Online/Offline automatic presence hook on window exit
        const setOfflinePresence = async () => {
          if (user) {
            await updateDoc(doc(db, 'users', user.uid), {
              onlineStatus: 'offline',
              lastSeen: Date.now()
            });
          }
        };
        
        window.addEventListener('beforeunload', setOfflinePresence);
        
        return () => {
          unsubProfile();
          window.removeEventListener('beforeunload', setOfflinePresence);
        };
      } else {
        setUserProfile(null);
        setChats([]);
        setMessages([]);
        setActiveChatState(null);
        setStories([]);
        setActiveCall(null);
        setDialerCall(null);
        setContactsList([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync users list to populate online/offline metrics plus contact cards
  useEffect(() => {
    if (!currentUser) return;
    
    // Simple global users listener to sync presence and profiles in real-time
    const q = query(collection(db, 'users'), limit(150));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const statuses: { [uid: string]: 'online' | 'offline' } = {};
      const contacts: UserProfile[] = [];
      const allUsers: UserProfile[] = [];
      const userContactsUids = userProfile?.contacts || [];

      snapshot.docs.forEach((d) => {
        const u = d.data() as UserProfile;
        statuses[u.uid] = u.onlineStatus;
        allUsers.push(u);
        if (userContactsUids.includes(u.uid)) {
          contacts.push(u);
        }
      });
      setOnlineUsers(statuses);
      setContactsList(contacts);
      setGlobalUsers(allUsers);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, [currentUser, userProfile?.contacts]);

  // Real-time Chat List synchronizations
  useEffect(() => {
    if (!currentUser) return;

    // Listen to chats where current user is listed as a member OR are public/channels
    const chatsQuery = query(
      collection(db, 'chats'),
      where('members', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const chatsData: Chat[] = [];
      snapshot.docs.forEach((doc) => {
        const chat = doc.data() as Chat;
        chatsData.push({ ...chat, id: doc.id });
      });

      // Show notifications for background chats
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const chat = change.doc.data() as Chat;
          const prevChat = chatsRef.current.find(c => c.id === chat.id);
          const oldUnreads = prevChat?.unreadCounts?.[currentUser.uid] || 0;
          const newUnreads = chat.unreadCounts?.[currentUser.uid] || 0;
          
          if (newUnreads > oldUnreads && chat.lastMessage?.senderId !== currentUser.uid && chat.id !== activeChatRef.current?.id) {
            // New message arrived from someone else in background chat
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                const tone = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=message-incoming-132044.mp3');
                tone.play().catch(() => {});
                
                const notif = new Notification(chat.title || chat.lastMessage?.senderName || 'New Message', {
                  body: chat.lastMessage?.text || 'Sent an attachment',
                  icon: chat.photoURL || 'https://img.icons8.com/color/192/speech-bubble.png',
                  silent: true
                });
                notif.onclick = () => {
                  window.focus();
                  const url = new URL(window.location.href);
                  url.searchParams.set('chatId', chat.id);
                  window.history.pushState(null, '', url.toString());
                  // We could manually trigger router ref updates, but popstate works.
                };
              } catch (err) {}
            }
          }
        }
      });
      
      // Sort chats by updatedAt descending
      chatsData.sort((a, b) => b.updatedAt - a.updatedAt);
      setChats(chatsData);

      // Refresh the currently active chat object to catch title edits, members, or lastMessage additions
      if (activeChatRef.current) {
        const refreshed = chatsData.find(c => c.id === activeChatRef.current?.id);
        if (refreshed) {
          setActiveChatState(refreshed);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Synchronize URL query/hash parameter with activeChat state
  useEffect(() => {
    if (!currentUser) return;

    const syncUrlAndState = () => {
      logger.info("Syncing URL state with chats library");
      const urlParams = new URLSearchParams(window.location.search);
      let targetChatId = urlParams.get('chatId') || urlParams.get('chat');
      
      // also fallback to hash parsing
      if (!targetChatId && window.location.hash) {
        const hashMatch = window.location.hash.match(/#chatId=(.+)/) || window.location.hash.match(/#chat=(.+)/) || window.location.hash.match(/#(.+)/);
        if (hashMatch && hashMatch[1]) {
          targetChatId = hashMatch[1];
        }
      }

      if (targetChatId) {
        // check if already active
        if (activeChatRef.current && activeChatRef.current.id === targetChatId) {
          return; 
        }

        const foundChat = chats.find(c => c.id === targetChatId);
        if (foundChat) {
          setActiveChatState(foundChat);
        } else if (chats.length > 0) {
          // Attempt direct fetch from Firestore if it hasn't propagated to preloaded state or is deep-linked
          const chatDocRef = doc(db, 'chats', targetChatId);
          getDoc(chatDocRef).then((snap) => {
            if (snap.exists()) {
              const chatObj = { ...snap.data() as Chat, id: snap.id };
              // Ensure user has access
              if (chatObj.members && chatObj.members.includes(currentUser.uid)) {
                setChats(prev => {
                  if (prev.some(c => c.id === chatObj.id)) return prev;
                  return [chatObj, ...prev];
                });
                setActiveChatState(chatObj);
              } else {
                logger.warn("User is not authorized for fetched chat", { targetChatId });
              }
            } else {
              logger.warn("Chat document does not exist in Firestore", { targetChatId });
            }
          }).catch((err: any) => {
            logger.error("Direct fetch of chat document failed", { error: err.message });
          });
        }
      }
    };

    // Run initial sync
    syncUrlAndState();

    // Listen to popstate (back/forward browser clicks)
    const handlePopState = () => {
      syncUrlAndState();
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, [currentUser, chats]);

  // Real-time Message Listener for currently active chat
  useEffect(() => {
    if (!currentUser || !activeChat) {
      setMessages([]);
      return;
    }

    const messagesQuery = query(
      collection(db, 'messages'),
      where('chatId', '==', activeChat.id)
    );

    // Dynamic listener updates messages array automatically
    const unsubscribe = onSnapshot(messagesQuery, { includeMetadataChanges: true }, async (snapshot) => {
      const msgs: Message[] = [];
      snapshot.docs.forEach((doc) => {
        const data = doc.data() as Message;
        // Mark as pending if sending from local offline cache
        // However, if the message has a specific status already, preserve it locally
        if (doc.metadata.hasPendingWrites && data.senderId === currentUser.uid) {
           data.status = 'sending';
        }
        msgs.push({ ...data, id: doc.id });
      });
      
      // Sort messages chronologically
      msgs.sort((a, b) => a.createdAt - b.createdAt);
      setMessages(msgs);

      // Perform real-time read receipt updates in a single batch transaction to avoid O(N) snapshot loops
      const unreadMsgs = msgs.filter(m => m.senderId !== currentUser.uid && !m.readBy?.includes(currentUser.uid) && m.status !== 'sending');
      if (unreadMsgs.length > 0) {
        const batch = writeBatch(db);
        unreadMsgs.forEach((msg) => {
          batch.update(doc(db, 'messages', msg.id), {
            readBy: arrayUnion(currentUser.uid)
          });
        });
        
        // Reset the read counter in Firestore transaction-safely
        if (activeChat) {
          batch.update(doc(db, 'chats', activeChat.id), {
            [`unreadCounts.${currentUser.uid}`]: 0
          });
        }
        
        batch.commit().catch(err => console.error("Batch read receipt error", err));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });

    return () => unsubscribe();
  }, [currentUser, activeChat?.id]);

  // Real-time WebRTC Calls Signaling & Dialer Receiver listener
  useEffect(() => {
    if (!currentUser) return;

    // Direct caller & receiver tracking
    const callsInQuery = query(
      collection(db, 'calls'),
      where('receiverId', '==', currentUser.uid),
      where('status', '==', 'ringing')
    );

    const unsubscribeIn = onSnapshot(callsInQuery, (snapshot) => {
      if (!snapshot.empty) {
        const activeCallSession = { ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as CallSession;
        setDialerCall(activeCallSession);
      } else {
        setDialerCall(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'calls');
    });

    // Listen to current active call changes (SDP Exchanges)
    if (activeCall?.id) {
      const activeCallDocRef = doc(db, 'calls', activeCall.id);
      const unsubscribeActive = onSnapshot(activeCallDocRef, (snap) => {
        if (snap.exists()) {
          const callData = snap.data() as CallSession;
          setActiveCall(callData);
          if (callData.status === 'ended' || callData.status === 'rejected') {
            setActiveCall(null);
          }
        } else {
          setActiveCall(null);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `calls/${activeCall.id}`);
      });
      return () => {
        unsubscribeIn();
        unsubscribeActive();
      };
    }

    return () => {
      unsubscribeIn();
    };
  }, [currentUser, activeCall?.id]);

  // Real-time Stories lifecycle subscriber (active stories under 24 hours expiry)
  useEffect(() => {
    if (!currentUser) return;

    const currentTimestamp = Date.now();
    const storiesQuery = query(
      collection(db, 'stories'),
      where('expiresAt', '>', currentTimestamp)
    );

    const unsubscribe = onSnapshot(storiesQuery, (snapshot) => {
      const list: Story[] = [];
      snapshot.docs.forEach((doc) => {
        list.push({ ...doc.data() as Story, id: doc.id });
      });
      // Sort chronologically
      list.sort((a, b) => b.createdAt - a.createdAt);
      setStories(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'stories');
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Authentication Handler Functions
  const loginEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signupEmail = async (email: string, pass: string, displayName: string, username: string) => {
    // 1. Verify username uniqueness prefix-safely
    const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase().trim()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      throw new Error('This username is already taken. Please choose another.');
    }

    // 2. Create User Credentials
    const credentials = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(credentials.user, { displayName });

    // 3. Setup User Profile
    const userRef = doc(db, 'users', credentials.user.uid);
    const profileDetails: UserProfile = {
      uid: credentials.user.uid,
      displayName: displayName,
      username: username.toLowerCase().trim(),
      email: email,
      photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
      bio: 'Hello! I am using VI Messenger.',
      statusMessage: 'Connected and busy',
      onlineStatus: 'online',
      lastSeen: Date.now(),
      createdAt: Date.now(),
      contacts: [],
      blockedUsers: [],
      folders: []
    };
    await setDoc(userRef, profileDetails);
    setUserProfile(profileDetails);
  };

  const loginGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    if (currentUser) {
      // Gracefully signal offline presence before logging out
      try {
        await writeAuditLog('logout', 'User logged out voluntarily');
        await updateDoc(doc(db, 'users', currentUser.uid), {
          onlineStatus: 'offline',
          lastSeen: Date.now()
        });
      } catch (e) {
        console.warn("Auth presence clean fail during logoff:", e);
      }
    }
    await signOut(auth);
  };

  const updateMyProfile = async (
    displayName: string, 
    bio: string, 
    statusMsg: string, 
    photoURL?: string, 
    emojiStatus?: string, 
    phoneNumber?: string,
    privacySettings?: UserProfile['privacySettings']
  ) => {
    if (!currentUser || !userProfile) return;
    
    const history = userProfile.profileChangeHistory || [];
    const newHistory = [...history];
    
    const recordChange = (field: string, oldValue: string, newValue: string) => {
      if (oldValue !== newValue) {
        newHistory.push({ field, oldValue, newValue, timestamp: Date.now() });
      }
    };
    
    recordChange('displayName', userProfile.displayName || '', displayName);
    recordChange('bio', userProfile.bio || '', bio);
    recordChange('statusMessage', userProfile.statusMessage || '', statusMsg);
    recordChange('emojiStatus', userProfile.emojiStatus || '', emojiStatus || '');
    recordChange('phoneNumber', userProfile.phoneNumber || '', phoneNumber || '');
    
    const updates: any = {
      displayName: displayName.trim(),
      bio: bio.trim(),
      statusMessage: statusMsg.trim(),
      emojiStatus: emojiStatus || '',
      phoneNumber: phoneNumber || '',
      profileChangeHistory: newHistory,
      lastSeen: Date.now()
    };
    
    if (photoURL) {
      recordChange('photoURL', userProfile.photoURL || '', photoURL);
      updates.photoURL = photoURL;
      await updateProfile(currentUser, { photoURL });
    }
    
    if (privacySettings) {
      updates.privacySettings = privacySettings;
    }
    
    await updateDoc(doc(db, 'users', currentUser.uid), updates);
    await updateProfile(currentUser, { displayName: displayName.trim() });

    // Write profile and privacy changes audits
    const changedFields = newHistory.map(h => h.field);
    if (privacySettings) changedFields.push('privacySettings');
    if (changedFields.length > 0) {
      await writeAuditLog('profile_change', `User modified their public identity attributes: [${changedFields.join(', ')}]`);
    }
  };

  const completeOnboarding = async (data: {
    displayName: string;
    username: string;
    photoURL: string;
    bio: string;
    theme: string;
    themeDensity: 'cozy' | 'compact' | 'comfortable';
    privacySettings?: UserProfile['privacySettings'];
  }) => {
    if (!currentUser) return;
    
    const userLanguage = localStorage.getItem('vi_messenger_lang') || 'en';
    
    // Check username uniqueness
    const q = query(collection(db, 'users'), where('username', '==', data.username.toLowerCase().trim()));
    const snap = await getDocs(q);
    const takenByOther = snap.docs.some(doc => doc.id !== currentUser.uid);
    if (takenByOther) {
      throw new Error(userLanguage === 'ru' ? 'Этот никнейм уже занят.' : 'This username is already taken. Please choose another.');
    }

    const updates: any = {
      displayName: data.displayName.trim(),
      username: data.username.toLowerCase().trim(),
      photoURL: data.photoURL,
      bio: data.bio.trim(),
      theme: data.theme,
      themeDensity: data.themeDensity,
      isOnboarded: true,
      lastSeen: Date.now()
    };

    if (data.privacySettings) {
      updates.privacySettings = data.privacySettings;
    }

    await updateDoc(doc(db, 'users', currentUser.uid), updates);
    await updateProfile(currentUser, { 
      displayName: data.displayName.trim(),
      photoURL: data.photoURL
    });
  };

  const uploadAvatar = async (file: File) => {
    if (!currentUser || !userProfile) return;
    const fileExtensionRef = file.name.split('.').pop() || 'png';
    const filePath = `avatars/${currentUser.uid}.${fileExtensionRef}`;
    const storageTargetRef = storageRef(storage, filePath);
    await uploadBytesResumable(storageTargetRef, file);
    const downloadUrl = await getDownloadURL(storageTargetRef);
    
    const history = userProfile.profileChangeHistory || [];
    const entry = {
      field: 'photoURL',
      oldValue: userProfile.photoURL,
      newValue: downloadUrl,
      timestamp: Date.now()
    };
    
    await updateDoc(doc(db, 'users', currentUser.uid), {
      photoURL: downloadUrl,
      profileChangeHistory: [...history, entry]
    });
    await updateProfile(currentUser, { photoURL: downloadUrl });
  };

  const deleteAvatar = async () => {
    if (!currentUser || !userProfile) return;
    const placeholder = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userProfile.displayName || 'VI')}`;
    
    const history = userProfile.profileChangeHistory || [];
    const entry = {
      field: 'photoURL',
      oldValue: userProfile.photoURL,
      newValue: placeholder,
      timestamp: Date.now()
    };
    
    await updateDoc(doc(db, 'users', currentUser.uid), {
      photoURL: placeholder,
      profileChangeHistory: [...history, entry]
    });
    await updateProfile(currentUser, { photoURL: placeholder });
  };

  const getRecommendedUsers = async (): Promise<UserProfile[]> => {
    try {
      const q = query(collection(db, 'users'), limit(30));
      const snap = await getDocs(q);
      const existingContacts = new Set(userProfile?.contacts || []);
      const recs: UserProfile[] = [];
      snap.docs.forEach(docSnap => {
        const u = docSnap.data() as UserProfile;
        if (u.uid !== currentUser?.uid && !existingContacts.has(u.uid)) {
          recs.push(u);
        }
      });
      return recs.slice(0, 5);
    } catch (e) {
      console.error("Error fetching recommended users:", e);
      return [];
    }
  };

  const writeAuditLog = async (
    action: string,
    details: string,
    chatId?: string,
    targetId?: string
  ) => {
    if (!currentUser || !userProfile) return;
    try {
      const logId = doc(collection(db, 'auditLogs')).id;
      const logEntry = {
        id: logId,
        actorId: currentUser.uid,
        actorName: userProfile.displayName || 'Authorized User',
        action,
        details: details.substring(0, 5000), // Enforce size constraint
        chatId: chatId || '',
        targetId: targetId || '',
        timestamp: Date.now()
      };
      await setDoc(doc(db, 'auditLogs', logId), logEntry);
    } catch (err) {
      console.log('Failed audit log write:', err);
    }
  };

  const terminateSession = async (sessionId: string) => {
    if (!currentUser || !userProfile) return;
    const currentSessions = userProfile.activeSessions || [];
    const updated = currentSessions.filter(s => s.id !== sessionId);
    await updateDoc(doc(db, 'users', currentUser.uid), {
      activeSessions: updated
    });
    await writeAuditLog('session_terminate', `Terminated active device session: ${sessionId}`);
  };

  const terminateOtherSessions = async () => {
    if (!currentUser || !userProfile) return;
    try {
      const currentSessions = userProfile.activeSessions || [];
      const currentDeviceToken = navigator.userAgent.substring(0, 30);
      const updated = currentSessions.filter(s => s.deviceName.includes(currentDeviceToken));
      await updateDoc(doc(db, 'users', currentUser.uid), {
        activeSessions: updated
      });
      await writeAuditLog('security_action', 'Terminated all other active device sessions');
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.uid}`);
    }
  };

  const submitReport = async (reportedUserId: string, chatId?: string, messageId?: string, reason: string) => {
    if (!currentUser) throw new Error('Not authenticated');
    try {
      const reportId = doc(collection(db, 'reports')).id;
      const newReport = {
        id: reportId,
        reporterId: currentUser.uid,
        reportedUserId,
        chatId: chatId || '',
        messageId: messageId || '',
        reason: reason.substring(0, 2000), // Enforce size limit
        createdAt: Date.now()
      };
      await setDoc(doc(db, 'reports', reportId), newReport);
      await writeAuditLog('report_submit', `Abuse report submitted on user: ${reportedUserId}`, chatId);
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, `reports/${reportId}`);
    }
  };

  const resolveReport = async (reportId: string) => {
    if (!currentUser) throw new Error('Not authenticated');
    try {
      await deleteDoc(doc(db, 'reports', reportId));
      await writeAuditLog('report_resolved', `Resolved/Deleted abuse report ID: ${reportId}`);
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, `reports/${reportId}`);
    }
  };

  // Direct Chats & Chat Creation Procedures
  const createDirectChat = async (targetUser: UserProfile): Promise<Chat> => {
    if (!currentUser || !userProfile) throw new Error('Not authenticated');

    const isSelf = targetUser.uid === currentUser.uid;

    // 1. Check if direct chat already exists
    const existing = chats.find(c => 
      c.type === 'direct' && 
      (isSelf 
        ? c.members.length === 1 && c.members[0] === currentUser.uid
        : c.members.length === 2 && c.members.includes(currentUser.uid) && c.members.includes(targetUser.uid)
      )
    );
    if (existing) {
      setActiveChat(existing);
      return existing;
    }

    // 2. Otherwise create transactional-safely
    const newChatId = doc(collection(db, 'chats')).id;
    const membersList = isSelf ? [currentUser.uid] : [currentUser.uid, targetUser.uid];
    const language = localStorage.getItem('vi_messenger_lang') || 'ru';
    const newChat: Chat = {
      id: newChatId,
      type: 'direct',
      title: isSelf ? (language === 'ru' ? 'Избранное' : 'Saved Messages') : targetUser.displayName,
      photoURL: isSelf ? '' : targetUser.photoURL,
      members: membersList,
      admins: membersList,
      creatorId: currentUser.uid,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      unreadCounts: isSelf ? { [currentUser.uid]: 0 } : {
        [currentUser.uid]: 0,
        [targetUser.uid]: 0
      }
    };

    await setDoc(doc(db, 'chats', newChatId), newChat);
    setActiveChat(newChat);
    return newChat;
  };

  const createGroupOrChannel = async (
    title: string, 
    type: 'group' | 'channel', 
    memberIds: string[],
    rules?: string,
    welcomeMessage?: string
  ): Promise<Chat> => {
    if (!currentUser || !userProfile) throw new Error('Not authenticated');

    const newChatId = doc(collection(db, 'chats')).id;
    const allMembers = [currentUser.uid, ...memberIds];
    const initialUnreads: { [uid: string]: number } = {};
    allMembers.forEach(uid => {
      initialUnreads[uid] = 0;
    });

    const newGroupChat: Chat = {
      id: newChatId,
      type: type,
      title: title.trim(),
      photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(title)}`,
      members: allMembers,
      admins: [currentUser.uid],
      creatorId: currentUser.uid,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      unreadCounts: initialUnreads,
      rules: rules || 'Please remain respectful and professional.',
      welcomeMessage: welcomeMessage || `Welcome to ${title}!`
    };

    await setDoc(doc(db, 'chats', newChatId), newGroupChat);
    
    // Auto-create initial system notification message
    const msgId = doc(collection(db, 'messages')).id;
    const systemMsg: Message = {
      id: msgId,
      chatId: newChatId,
      senderId: 'SYSTEM',
      senderName: 'VI Assistant',
      senderPhotoURL: 'https://img.icons8.com/color/192/speech-bubble.png',
      text: `${type === 'group' ? 'Group chat' : 'Channel'} "${title}" successfully initiated by ${userProfile.displayName}`,
      type: 'text',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      readBy: [currentUser.uid]
    };
    await setDoc(doc(db, 'messages', msgId), systemMsg);
    
    setActiveChat(newGroupChat);
    return newGroupChat;
  };

  const setActiveChat = (chat: Chat | null) => {
    setActiveChatState(chat);
    try {
      const url = new URL(window.location.href);
      if (chat) {
        url.searchParams.set('chatId', chat.id);
        if (currentUser) {
          updateDoc(doc(db, 'chats', chat.id), {
            [`unreadCounts.${currentUser.uid}`]: 0
          }).catch(err => handleFirestoreError(err, OperationType.WRITE, `chats/${chat.id}`));
        }
      } else {
        url.searchParams.delete('chatId');
      }
      window.history.pushState(null, '', url.toString());
    } catch (err: any) {
      logger.error("Error synchronizing URL parameters for selected chat:", { error: err.message });
    }
  };

  const togglePinChat = async (chatId: string) => {
    if (!currentUser) return;
    const chatDoc = doc(db, 'chats', chatId);
    const isPinned = chats.find(c => c.id === chatId)?.pinnedIds?.includes(currentUser.uid);
    
    await updateDoc(chatDoc, {
      pinnedIds: isPinned ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
    });
  };

  const toggleArchiveChat = async (chatId: string) => {
    if (!currentUser) return;
    const chatDoc = doc(db, 'chats', chatId);
    const isArchived = chats.find(c => c.id === chatId)?.archivedIds?.includes(currentUser.uid);
    
    await updateDoc(chatDoc, {
      archivedIds: isArchived ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
    });
  };

  const toggleMuteChat = async (chatId: string) => {
    if (!currentUser) return;
    const chatDoc = doc(db, 'chats', chatId);
    const isMuted = chats.find(c => c.id === chatId)?.muteIds?.includes(currentUser.uid);
    
    await updateDoc(chatDoc, {
      muteIds: isMuted ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
    });
  };

  const deleteChat = async (chatId: string) => {
    if (!currentUser) return;
    await updateDoc(doc(db, 'chats', chatId), {
      members: arrayRemove(currentUser.uid)
    });
    if (activeChat?.id === chatId) {
      setActiveChatState(null);
    }
  };

  const addMemberToChat = async (chatId: string, targetUid: string) => {
    if (!currentUser || !userProfile) throw new Error('Not authenticated');
    const chatDocRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatDocRef);
    if (!chatSnap.exists()) throw new Error('Chat not found');
    const chatData = chatSnap.data() as Chat;

    if (chatData.members.includes(targetUid)) {
      throw new Error('User is already a member of this chat');
    }

    // Load target user profile
    const targetSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', targetUid)));
    if (targetSnap.empty) throw new Error('User not found');
    const targetProfile = targetSnap.docs[0].data() as UserProfile;

    await updateDoc(chatDocRef, {
      members: arrayUnion(targetUid)
    });

    // Send system message
    const systemMsgId = doc(collection(db, 'messages')).id;
    const systemMsg: Message = {
      id: systemMsgId,
      chatId: chatId,
      senderId: 'SYSTEM',
      senderName: 'VI Assistant',
      senderPhotoURL: 'https://img.icons8.com/color/192/speech-bubble.png',
      text: `${targetProfile.displayName} was added to the chat by ${userProfile.displayName}.`,
      type: 'text',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      readBy: [currentUser.uid]
    };
    await setDoc(doc(db, 'messages', systemMsgId), systemMsg);
  };

  const joinChatByInviteCode = async (inviteCode: string) => {
    if (!currentUser || !userProfile) throw new Error('Not authenticated');
    let chatIdOrInviteId = inviteCode.trim();
    if (chatIdOrInviteId.includes('/join/')) {
      chatIdOrInviteId = chatIdOrInviteId.split('/join/').pop() || '';
    } else if (chatIdOrInviteId.includes('/invite/')) {
      chatIdOrInviteId = chatIdOrInviteId.split('/invite/').pop() || '';
    } else if (chatIdOrInviteId.startsWith('invite_')) {
      chatIdOrInviteId = chatIdOrInviteId.substring(7);
    }

    if (!chatIdOrInviteId) throw new Error('Invalid invite link or code');

    // Attempt to lookup in custom invites collection first
    const inviteDocRef = doc(db, 'invites', chatIdOrInviteId);
    let inviteSnap;
    try {
      inviteSnap = await getDoc(inviteDocRef);
    } catch (e) {
      // ignore, might be legacy chatId join
    }

    let targetChatId = chatIdOrInviteId;
    let customInviteUsed = false;

    if (inviteSnap && inviteSnap.exists()) {
      const inviteData = inviteSnap.data() as CustomInviteLink;
      if (inviteData.isRevoked) {
        throw new Error('This invite link has been revoked');
      }
      if (inviteData.expiresAt && Date.now() > inviteData.expiresAt) {
        throw new Error('This invite link has expired');
      }
      if (inviteData.usageLimit && inviteData.usageCount >= inviteData.usageLimit) {
        throw new Error('This invite link has reached its usage limit');
      }
      targetChatId = inviteData.chatId;
      customInviteUsed = true;
    }

    const chatDocRef = doc(db, 'chats', targetChatId);
    const chatSnap = await getDoc(chatDocRef);
    if (!chatSnap.exists()) {
      throw new Error('Group or channel not found');
    }

    const chatData = chatSnap.data() as Chat;
    if (chatData.members.includes(currentUser.uid)) {
      throw new Error('You are already a member of this chat');
    }

    await updateDoc(chatDocRef, {
      members: arrayUnion(currentUser.uid),
      [`unreadCounts.${currentUser.uid}`]: 0
    });

    if (customInviteUsed) {
      await updateDoc(inviteDocRef, {
        usageCount: increment(1)
      });
    }

    // Send system message
    const systemMsgId = doc(collection(db, 'messages')).id;
    const systemMsg: Message = {
      id: systemMsgId,
      chatId: targetChatId,
      senderId: 'SYSTEM',
      senderName: 'VI Assistant',
      senderPhotoURL: 'https://img.icons8.com/color/192/speech-bubble.png',
      text: `${userProfile.displayName} has joined the chat${customInviteUsed ? ' via invite link' : ''}.`,
      type: 'text',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      readBy: [currentUser.uid]
    };
    await setDoc(doc(db, 'messages', systemMsgId), systemMsg);

    return { ...chatData, members: [...chatData.members, currentUser.uid] };
  };

  const updateChatDetails = async (
    chatId: string,
    details: { title?: string; description?: string; photoURL?: string; isPublic?: boolean; username?: string; slowModeSeconds?: number; rules?: string; welcomeMessage?: string }
  ) => {
    if (!currentUser) throw new Error('Not authenticated');
    const chatDocRef = doc(db, 'chats', chatId);
    const upd: any = { updatedAt: Date.now() };
    if (details.title !== undefined) upd.title = details.title.trim();
    if (details.description !== undefined) upd.description = details.description.trim();
    if (details.photoURL !== undefined) upd.photoURL = details.photoURL;
    if (details.isPublic !== undefined) upd.isPublic = details.isPublic;
    if (details.username !== undefined) upd.username = details.username.trim().toLowerCase().replace(/^@/, '');
    if (details.slowModeSeconds !== undefined) upd.slowModeSeconds = details.slowModeSeconds;
    if (details.rules !== undefined) upd.rules = details.rules;
    if (details.welcomeMessage !== undefined) upd.welcomeMessage = details.welcomeMessage;

    await updateDoc(chatDocRef, upd);
  };

  const logAdminAction = async (chatId: string, actionName: 'ban' | 'unban' | 'mute' | 'unmute' | 'promote' | 'demote' | 'kick' | 'pin' | 'unpin', targetId: string, targetName: string) => {
    if (!currentUser || !userProfile) return;
    const actionId = doc(collection(db, 'chats')).id;
    const newLogAction: AdminAction = {
      id: actionId,
      adminId: currentUser.uid,
      adminName: userProfile.displayName || 'Admin',
      action: actionName,
      targetId,
      targetName,
      timestamp: Date.now()
    };
    
    await updateDoc(doc(db, 'chats', chatId), {
      adminActionsHistory: arrayUnion(newLogAction)
    });

    const systemMsgId = doc(collection(db, 'messages')).id;
    const verbs = {
      ban: 'banned',
      unban: 'unbanned',
      mute: 'muted',
      unmute: 'unmuted',
      promote: 'promoted',
      demote: 'demoted',
      kick: 'removed',
      pin: 'pinned a message',
      unpin: 'unpinned a message'
    };
    const verb = verbs[actionName] || actionName;
    const notificationText = `🛡️ Admin Action: ${newLogAction.adminName} ${verb} ${targetName}`;
    const sysMsg: Message = {
      id: systemMsgId,
      chatId,
      senderId: 'SYSTEM',
      senderName: 'System Monitor',
      senderPhotoURL: 'https://img.icons8.com/color/192/automatic.png',
      text: notificationText,
      type: 'text',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      readBy: [currentUser.uid]
    };
    await setDoc(doc(db, 'messages', systemMsgId), sysMsg);
  };

  const updateMemberRole = async (chatId: string, memberId: string, role: 'admin' | 'moderator' | 'member' | 'restricted', targetName: string) => {
    if (!currentUser) throw new Error('Not authenticated');
    const chatRef = doc(db, 'chats', chatId);

    if (role === 'admin') {
      await updateDoc(chatRef, {
        admins: arrayUnion(memberId),
        moderatorIds: arrayRemove(memberId),
        restrictedIds: arrayRemove(memberId)
      });
      await logAdminAction(chatId, 'promote', memberId, targetName);
      await writeAuditLog('role_change', `Promoted user ${targetName} to administrator role`, chatId, memberId);
    } else if (role === 'moderator') {
      await updateDoc(chatRef, {
        admins: arrayRemove(memberId),
        moderatorIds: arrayUnion(memberId),
        restrictedIds: arrayRemove(memberId)
      });
      await logAdminAction(chatId, 'promote', memberId, `${targetName} (Moderator)`);
      await writeAuditLog('role_change', `Promoted user ${targetName} to moderator role`, chatId, memberId);
    } else if (role === 'restricted') {
      await updateDoc(chatRef, {
        admins: arrayRemove(memberId),
        moderatorIds: arrayRemove(memberId),
        restrictedIds: arrayUnion(memberId)
      });
      await logAdminAction(chatId, 'demote', memberId, `${targetName} (Restricted)`);
      await writeAuditLog('role_change', `Applied restriction modifications on user ${targetName}`, chatId, memberId);
    } else {
      await updateDoc(chatRef, {
        admins: arrayRemove(memberId),
        moderatorIds: arrayRemove(memberId),
        restrictedIds: arrayRemove(memberId)
      });
      await logAdminAction(chatId, 'demote', memberId, targetName);
      await writeAuditLog('role_change', `Demoted user ${targetName} to standard participant status`, chatId, memberId);
    }
  };

  const kickMember = async (chatId: string, memberId: string, targetName: string) => {
    if (!currentUser) throw new Error('Not authenticated');
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      members: arrayRemove(memberId),
      admins: arrayRemove(memberId),
      moderatorIds: arrayRemove(memberId),
      restrictedIds: arrayRemove(memberId)
    });
    await logAdminAction(chatId, 'kick', memberId, targetName);
    await writeAuditLog('moderation_kick', `Kicked participant ${targetName} from the conversation`, chatId, memberId);
  };

  const banMember = async (chatId: string, memberId: string, targetName: string) => {
    if (!currentUser) throw new Error('Not authenticated');
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      members: arrayRemove(memberId),
      admins: arrayRemove(memberId),
      moderatorIds: arrayRemove(memberId),
      restrictedIds: arrayRemove(memberId),
      bannedIds: arrayUnion(memberId)
    });
    await logAdminAction(chatId, 'ban', memberId, targetName);
    await writeAuditLog('moderation_ban', `Banned participant ${targetName} from entering the chat`, chatId, memberId);
  };

  const unbanMember = async (chatId: string, memberId: string, targetName: string) => {
    if (!currentUser) throw new Error('Not authenticated');
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      bannedIds: arrayRemove(memberId)
    });
    await logAdminAction(chatId, 'unban', memberId, targetName);
    await writeAuditLog('moderation_unban', `Revoked chat access ban for user ${targetName}`, chatId, memberId);
  };

  const muteMember = async (chatId: string, memberId: string, targetName: string, durationMinutes?: number) => {
    if (!currentUser) throw new Error('Not authenticated');
    const chatRef = doc(db, 'chats', chatId);
    
    if (durationMinutes && durationMinutes > 0) {
      const until = Date.now() + durationMinutes * 60 * 1000;
      await updateDoc(chatRef, {
        mutedIds: arrayUnion(memberId),
        [`mutedUntil.${memberId}`]: until
      });
      await logAdminAction(chatId, 'mute', memberId, `${targetName} for ${durationMinutes} mins`);
      await writeAuditLog('moderation_mute', `Muted participant ${targetName} for ${durationMinutes} minutes`, chatId, memberId);
    } else {
      await updateDoc(chatRef, {
        mutedIds: arrayUnion(memberId)
      });
      await logAdminAction(chatId, 'mute', memberId, targetName);
      await writeAuditLog('moderation_mute', `Muted participant ${targetName} indefinitely`, chatId, memberId);
    }
  };

  const unmuteMember = async (chatId: string, memberId: string, targetName: string) => {
    if (!currentUser) throw new Error('Not authenticated');
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      mutedIds: arrayRemove(memberId),
      [`mutedUntil.${memberId}`]: 0
    });
    await logAdminAction(chatId, 'unmute', memberId, targetName);
    await writeAuditLog('moderation_unmute', `Restored voice capabilities for user ${targetName}`, chatId, memberId);
  };

  const generateInviteLink = async (chatId: string, usageLimit: number | null, expiresHours: number | null): Promise<CustomInviteLink> => {
    if (!currentUser || !userProfile) throw new Error('Not authenticated');
    
    const inviteId = doc(collection(db, 'invites')).id;
    const expiresAt = expiresHours ? Date.now() + expiresHours * 60 * 60 * 1000 : null;
    const chatObj = chats.find(c => c.id === chatId);
    const cachedTitle = chatObj?.title || 'Private Group';

    const linkObj: CustomInviteLink = {
      id: inviteId,
      chatId,
      chatTitle: cachedTitle,
      creatorId: currentUser.uid,
      creatorName: userProfile.displayName || userProfile.email || 'Admin',
      createdAt: Date.now(),
      expiresAt,
      usageLimit,
      usageCount: 0,
      isRevoked: false
    };

    await setDoc(doc(db, 'invites', inviteId), linkObj);
    
    // Update inviteLink on chat metadata to represent the active URL
    await updateDoc(doc(db, 'chats', chatId), {
      inviteLink: `https://vi-messenger.app/join/${inviteId}`
    });

    await writeAuditLog('invite_create', `Created standard invite registration: ${inviteId} (Limit: ${usageLimit || 'infinite'})`, chatId);

    return linkObj;
  };

  const revokeInviteLink = async (inviteId: string) => {
    const inviteRef = doc(db, 'invites', inviteId);
    let cid = '';
    try {
      const snap = await getDoc(inviteRef);
      if (snap.exists()) {
        cid = snap.data().chatId || '';
      }
    } catch (_) {}

    await updateDoc(inviteRef, {
      isRevoked: true
    });

    await writeAuditLog('invite_revoke', `Revoked standard invite reference: ${inviteId}`, cid);
  };

  const submitJoinRequest = async (chatId: string, reason?: string) => {
    if (!currentUser || !userProfile) throw new Error('Not authenticated');
    
    const requestId = `${currentUser.uid}_${chatId}`;
    const targetChat = chats.find(c => c.id === chatId);
    const chatTitle = targetChat?.title || 'Private Chat';

    const requestObj: JoinRequest = {
      id: requestId,
      userId: currentUser.uid,
      userDisplayName: userProfile.displayName || 'User',
      userPhotoURL: userProfile.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser.uid}`,
      chatId,
      chatTitle,
      status: 'pending',
      reason: reason || '',
      createdAt: Date.now()
    };

    await setDoc(doc(db, 'joinRequests', requestId), requestObj);
  };

  const handleJoinRequest = async (requestId: string, action: 'approved' | 'rejected') => {
    if (!currentUser) throw new Error('Not authenticated');
    const reqDoc = doc(db, 'joinRequests', requestId);
    const reqSnap = await getDoc(reqDoc);
    if (!reqSnap.exists()) return;
    const requestData = reqSnap.data() as JoinRequest;

    if (action === 'approved') {
      const chatRef = doc(db, 'chats', requestData.chatId);
      await updateDoc(chatRef, {
        members: arrayUnion(requestData.userId),
        [`unreadCounts.${requestData.userId}`]: 0
      });
      await updateDoc(reqDoc, {
        status: 'approved'
      });
      
      // Auto welcome system message
      const systemMsgId = doc(collection(db, 'messages')).id;
      const systemMsg: Message = {
        id: systemMsgId,
        chatId: requestData.chatId,
        senderId: 'SYSTEM',
        senderName: 'VI Assistant',
        senderPhotoURL: 'https://img.icons8.com/color/192/speech-bubble.png',
        text: `Join Request Approved: ${requestData.userDisplayName} has been welcomed into this chat.`,
        type: 'text',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        readBy: [currentUser.uid]
      };
      await setDoc(doc(db, 'messages', systemMsgId), systemMsg);
    } else {
      await updateDoc(reqDoc, {
        status: 'rejected'
      });
    }
  };

  const updateGroupInfo = async (chatId: string, title: string, description?: string, photoURL?: string) => {
    if (!currentUser) throw new Error('Not authenticated');
    const chatDocRef = doc(db, 'chats', chatId);
    await updateDoc(chatDocRef, {
      title: title.trim(),
      description: description?.trim() || '',
      photoURL: photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(title)}`,
      updatedAt: Date.now()
    });
  };

  // Folders state managers
  const createFolder = async (name: string, icon: string, chatIds: string[], rules?: ('direct' | 'group' | 'channel' | 'unread' | 'work' | 'friends')[]) => {
    if (!currentUser || !userProfile) return;
    const finalFolder: ChatFolder = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      icon,
      chatIds,
      rules: rules || []
    };
    const currentFolders = userProfile.folders || [];
    await updateDoc(doc(db, 'users', currentUser.uid), {
      folders: [...currentFolders, finalFolder]
    });
  };

  const updateFolder = async (folderId: string, name: string, icon: string, chatIds: string[], rules?: ('direct' | 'group' | 'channel' | 'unread' | 'work' | 'friends')[]) => {
    if (!currentUser || !userProfile) return;
    const updatedFolders = (userProfile.folders || []).map(f => {
      if (f.id === folderId) {
        return { ...f, name, icon, chatIds, rules: rules || [] };
      }
      return f;
    });
    await updateDoc(doc(db, 'users', currentUser.uid), {
      folders: updatedFolders
    });
  };

  const sortFolders = async (sortedFolders: ChatFolder[]) => {
    if (!currentUser || !userProfile) return;
    await updateDoc(doc(db, 'users', currentUser.uid), {
      folders: sortedFolders
    });
  };

  const deleteFolder = async (folderId: string) => {
    if (!currentUser || !userProfile) return;
    const remFolders = (userProfile.folders || []).filter(f => f.id !== folderId);
    await updateDoc(doc(db, 'users', currentUser.uid), {
      folders: remFolders
    });
    if (activeFolder === folderId) {
      setActiveFolder('all');
    }
  };

  // Realtime Messages sending functions with resilient offline states
  const sendTextMessage = async (text: string, replyTo?: Message, forwardFrom?: Message, topicId?: string, silent?: boolean, scheduledAt?: number) => {
    if (!currentUser || !activeChat || !userProfile) return;

    const messageId = doc(collection(db, 'messages')).id;
    const newMessage: Message = {
      id: messageId,
      chatId: activeChat.id,
      senderId: currentUser.uid,
      senderName: userProfile.displayName,
      senderPhotoURL: userProfile.photoURL,
      text: text.trim(),
      type: 'text',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      replyTo: replyTo ? {
        messageId: replyTo.id,
        text: replyTo.text,
        senderName: replyTo.senderName
      } : undefined,
      forwardFrom: forwardFrom ? {
        senderId: forwardFrom.senderId,
        senderName: forwardFrom.senderName
      } : undefined,
      reactions: {},
      readBy: [currentUser.uid],
      status: 'sending',
      topicId,
      silent,
      scheduledAt
    };

    try {
      // 1. Submit content to Firestore (local cache will immediately trigger onSnapshot)
      await setDoc(doc(db, 'messages', messageId), {
        ...newMessage,
        status: 'sent'
      });

      // 2. Update Chat's last message metrics
      if (!scheduledAt || scheduledAt <= Date.now()) {
        const increments: { [key: string]: any } = {};
        activeChat.members.forEach((uid) => {
          if (uid !== currentUser.uid) {
            increments[`unreadCounts.${uid}`] = increment(1);
          }
        });

        await updateDoc(doc(db, 'chats', activeChat.id), {
          lastMessage: {
            text: text.trim(),
            senderId: currentUser.uid,
            senderName: userProfile.displayName,
            timestamp: Date.now()
          },
          updatedAt: Date.now(),
          ...increments
        });
      }
    } catch (e: any) {
      logger.warn("Initial direct message failed. Retrying transparently with local persistent storage offline queue.", { error: e.message });
      // Let Firestore's persistent offline storage sync queue execute later, keeping 'sending' status
    }
  };

  const sendFileMessage = async (file: File, type: 'image' | 'video' | 'file') => {
    if (!currentUser || !activeChat || !userProfile) return;

    const messageId = doc(collection(db, 'messages')).id;
    
    // 1. Establish optimistic file entry with loading progress state
    setUploadProgress(prev => ({ ...prev, [messageId]: 1 }));
    
    const fileExtensionRef = file.name.split('.').pop();
    const filePath = `chats/${activeChat.id}/${messageId}.${fileExtensionRef}`;
    const storageTargetRef = storageRef(storage, filePath);
    
    const uploadTask = uploadBytesResumable(storageTargetRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setUploadProgress(prev => ({ ...prev, [messageId]: progress }));
      }, 
      (error) => {
        console.error("Resumable upload failed completely:", error);
        setUploadProgress(prev => {
          const u = { ...prev };
          delete u[messageId];
          return u;
        });
      }, 
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        
        const fileMessage: Message = {
          id: messageId,
          chatId: activeChat.id,
          senderId: currentUser.uid,
          senderName: userProfile.displayName,
          senderPhotoURL: userProfile.photoURL,
          text: `Attachment File: ${file.name}`,
          type: type,
          fileUrl: url,
          fileName: file.name,
          fileSize: file.size,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          reactions: {},
          readBy: [currentUser.uid],
          status: 'sent'
        };

        // Write file record
        await setDoc(doc(db, 'messages', messageId), fileMessage);

        // Update last message overview
        const increments: { [key: string]: any } = {};
        activeChat.members.forEach((uid) => {
          if (uid !== currentUser.uid) {
            increments[`unreadCounts.${uid}`] = increment(1);
          }
        });

        await updateDoc(doc(db, 'chats', activeChat.id), {
          lastMessage: {
            text: `[${type.toUpperCase()}] ${file.name}`,
            senderId: currentUser.uid,
            senderName: userProfile.displayName,
            timestamp: Date.now()
          },
          updatedAt: Date.now(),
          ...increments
        });

        // Resolve status progress clean
        setUploadProgress(prev => {
          const u = { ...prev };
          delete u[messageId];
          return u;
        });
      }
    );
  };

  const sendVoiceMessage = async (audioBlob: Blob, durationSeconds: number) => {
    if (!currentUser || !activeChat || !userProfile) return;

    const messageId = doc(collection(db, 'messages')).id;
    const filePath = `chats/${activeChat.id}/voices/${messageId}.ogg`;
    const storageTargetRef = storageRef(storage, filePath);

    await uploadBytesResumable(storageTargetRef, audioBlob);
    const audioUrl = await getDownloadURL(storageTargetRef);

    const voiceMessage: Message = {
      id: messageId,
      chatId: activeChat.id,
      senderId: currentUser.uid,
      senderName: userProfile.displayName,
      senderPhotoURL: userProfile.photoURL,
      text: '🎙️ Voice Message',
      type: 'voice',
      fileUrl: audioUrl,
      fileName: 'Voice_Note.ogg',
      duration: parseFloat(durationSeconds.toFixed(1)),
      fileSize: audioBlob.size,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      reactions: {},
      readBy: [currentUser.uid],
      status: 'sent'
    };

    await setDoc(doc(db, 'messages', messageId), voiceMessage);

    // Update last message overview
    const increments: { [key: string]: any } = {};
    activeChat.members.forEach((uid) => {
      if (uid !== currentUser.uid) {
        increments[`unreadCounts.${uid}`] = increment(1);
      }
    });

    await updateDoc(doc(db, 'chats', activeChat.id), {
      lastMessage: {
        text: '🎙️ Voice Message',
        senderId: currentUser.uid,
        senderName: userProfile.displayName,
        timestamp: Date.now()
      },
      updatedAt: Date.now(),
      ...increments
    });
  };

  const sendStickerMessage = async (stickerUrl: string) => {
    if (!currentUser || !activeChat || !userProfile) return;

    const messageId = doc(collection(db, 'messages')).id;
    const stickerMessage: Message = {
      id: messageId,
      chatId: activeChat.id,
      senderId: currentUser.uid,
      senderName: userProfile.displayName,
      senderPhotoURL: userProfile.photoURL,
      text: '🎨 Sticker',
      type: 'sticker',
      fileUrl: stickerUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      reactions: {},
      readBy: [currentUser.uid],
      status: 'sent'
    };

    try {
      await setDoc(doc(db, 'messages', messageId), stickerMessage);

      // Update last message overview
      const increments: { [key: string]: any } = {};
      activeChat.members.forEach((uid) => {
        if (uid !== currentUser.uid) {
          increments[`unreadCounts.${uid}`] = increment(1);
        }
      });

      await updateDoc(doc(db, 'chats', activeChat.id), {
        lastMessage: {
          text: '🎨 Sticker',
          senderId: currentUser.uid,
          senderName: userProfile.displayName,
          timestamp: Date.now()
        },
        updatedAt: Date.now(),
        ...increments
      });
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, `messages/${messageId}`);
    }
  };

  const uploadSticker = async (file: File) => {
    if (!currentUser || !userProfile) return;

    const stickerId = doc(collection(db, 'stickers')).id;
    const fileExtensionRef = file.name.split('.').pop() || 'png';
    const filePath = `stickers/${currentUser.uid}/${stickerId}.${fileExtensionRef}`;
    const storageTargetRef = storageRef(storage, filePath);

    await uploadBytesResumable(storageTargetRef, file);
    const downloadUrl = await getDownloadURL(storageTargetRef);

    // Update User Profile stickers list
    const currentStickers = userProfile.stickers || [];
    await updateDoc(doc(db, 'users', currentUser.uid), {
      stickers: [...currentStickers, downloadUrl]
    });
  };

  const sendTypingStatus = async (chatId: string) => {
    if (!currentUser) return;
    const now = Date.now();
    // Throttled: only write to firebase at most once every 3 seconds per chat
    const lastSent = lastTypingSent.current[chatId] || 0;
    if (now - lastSent < 3000) return;

    lastTypingSent.current[chatId] = now;
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        [`typing.${currentUser.uid}`]: now
      });
    } catch (e: any) {
      logger.warn("Typing transmission error (often due to write rules, which we will secure):", { error: e.message });
    }
  };

  const saveChatDraft = async (chatId: string, text: string) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        [`drafts.${currentUser.uid}`]: text
      });
    } catch (e: any) {
      logger.warn("Failed saving draft to cloud:", { error: e.message });
    }
  };

  const editMessage = async (messageId: string, newText: string) => {
    const existingMsg = messages.find(m => m.id === messageId);
    const entry = { text: existingMsg?.text || '', updatedAt: Date.now() };
    const history = existingMsg?.editHistory ? [...existingMsg.editHistory, entry] : [entry];

    await updateDoc(doc(db, 'messages', messageId), {
      text: newText.trim(),
      updatedAt: Date.now(),
      editHistory: history
    });
  };

  const deleteMessage = async (messageId: string) => {
    // Soft message deletion pattern
    await updateDoc(doc(db, 'messages', messageId), {
      text: '🚫 This message was deleted',
      type: 'text',
      fileUrl: '',
      updatedAt: Date.now()
    });
    await writeAuditLog('message_delete', `Soft deleted message ID: ${messageId}`);
  };

  const saveMessageToFavorites = async (originalMsg: Message) => {
    if (!currentUser || !userProfile) throw new Error('Not authenticated');

    // Make sure 'Saved Messages' self-chat exists
    let savedChat = chats.find(c => c.type === 'direct' && c.members.length === 1 && c.members[0] === currentUser.uid);
    if (!savedChat) {
       savedChat = await createDirectChat(userProfile);
    }

    const newMsgId = doc(collection(db, 'messages')).id;
    const copiedMsg: Message = {
      ...originalMsg,
      id: newMsgId,
      chatId: savedChat.id,
      senderId: currentUser.uid,
      senderName: userProfile.displayName,
      senderPhotoURL: userProfile.photoURL || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      readBy: [currentUser.uid],
      reactions: {},
      forwardFrom: {
         id: originalMsg.id,
         senderId: originalMsg.senderId,
         senderName: originalMsg.senderName,
      }
    };

    await setDoc(doc(db, 'messages', newMsgId), copiedMsg);
  };

  const addMessageReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    const targetMsg = messages.find(m => m.id === messageId);
    if (targetMsg && targetMsg.reactions && targetMsg.reactions[currentUser.uid] === emoji) {
      const { deleteField } = await import('firebase/firestore');
      await updateDoc(doc(db, 'messages', messageId), {
        [`reactions.${currentUser.uid}`]: deleteField()
      });
    } else {
      await updateDoc(doc(db, 'messages', messageId), {
        [`reactions.${currentUser.uid}`]: emoji
      });
    }
  };

  const pinMessage = async (chatId: string, messageId: string | null) => {
    await updateDoc(doc(db, 'chats', chatId), {
      pinnedMessageId: messageId || null
    });
  };

  const sendPollMessage = async (question: string, options: string[], isAnonymous: boolean, isMultiple: boolean, isQuiz?: boolean, correctOptionIndex?: number) => {
    if (!currentUser || !activeChat || !userProfile) return;
    const messageId = doc(collection(db, 'messages')).id;
    const pollOptions = options.map(opt => ({ text: opt, votes: [] }));
    const newMessage: Message = {
      id: messageId,
      chatId: activeChat.id,
      senderId: currentUser.uid,
      senderName: userProfile.displayName,
      senderPhotoURL: userProfile.photoURL,
      text: `📊 ${question}`,
      type: 'poll',
      poll: {
        question,
        options: pollOptions,
        isAnonymous,
        isMultiple,
        isQuiz,
        correctOptionIndex,
        closed: false
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      reactions: {},
      readBy: [currentUser.uid],
      status: 'sending'
    };

    try {
      await setDoc(doc(db, 'messages', messageId), {
        ...newMessage,
        status: 'sent'
      });

      const increments: { [key: string]: any } = {};
      activeChat.members.forEach((uid) => {
        if (uid !== currentUser.uid) {
          increments[`unreadCounts.${uid}`] = increment(1);
        }
      });

      await updateDoc(doc(db, 'chats', activeChat.id), {
        lastMessage: {
          text: `📊 ${question}`,
          senderId: currentUser.uid,
          senderName: userProfile.displayName,
          timestamp: Date.now()
        },
        updatedAt: Date.now(),
        ...increments
      });
    } catch (e: any) {
      logger.warn("Poll sending failed, retrying on connection restoration", { error: e.message });
    }
  };

  const voteInPoll = async (messageId: string, optionIndex: number) => {
    if (!currentUser) return;
    const msg = messages.find(m => m.id === messageId);
    if (!msg || !msg.poll) return;

    const updatedOptions = msg.poll.options.map((opt, idx) => {
      let nextVotes = [...opt.votes];
      if (idx === optionIndex) {
        if (nextVotes.includes(currentUser.uid)) {
          nextVotes = nextVotes.filter(vuid => vuid !== currentUser.uid);
        } else {
          nextVotes.push(currentUser.uid);
        }
      } else if (!msg.poll?.isMultiple) {
        nextVotes = nextVotes.filter(vuid => vuid !== currentUser.uid);
      }
      return { ...opt, votes: nextVotes };
    });

    await updateDoc(doc(db, 'messages', messageId), {
      'poll.options': updatedOptions,
      updatedAt: Date.now()
    });
  };

  const createTopic = async (chatId: string, name: string, icon?: string) => {
    if (!currentUser) return;
    const chatRef = doc(db, 'chats', chatId);
    const newTopic = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      createdAt: Date.now(),
      creatorId: currentUser.uid,
      closed: false,
      icon: icon || '💬'
    };
    await updateDoc(chatRef, {
      topics: arrayUnion(newTopic)
    });
  };

  const closeTopic = async (chatId: string, topicId: string, closed: boolean) => {
    const chat = chats.find(c => c.id === chatId);
    if (!chat || !chat.topics) return;
    const updatedTopics = chat.topics.map(t => {
      if (t.id === topicId) return { ...t, closed };
      return t;
    });
    await updateDoc(doc(db, 'chats', chatId), {
      topics: updatedTopics
    });
  };

  const removeMessageReaction = async (messageId: string) => {
    if (!currentUser) return;
    const msgRef = doc(db, 'messages', messageId);
    const snap = await getDoc(msgRef);
    if (snap.exists()) {
      const data = snap.data() as Message;
      if (data.reactions && currentUser.uid in data.reactions) {
        const temp = { ...data.reactions };
        delete temp[currentUser.uid];
        await updateDoc(msgRef, { reactions: temp });
      }
    }
  };

  // Contacts Management & Profiles search operations
  const addContactByUsername = async (username: string) => {
    if (!currentUser || !userProfile) return;
    const lowercaseName = username.toLowerCase().trim();
    
    // 1. Search username matching document
    const q = query(collection(db, 'users'), where('username', '==', lowercaseName));
    const snap = await getDocs(q);
    if (snap.empty) {
      throw new Error(`User with username "@${username}" not found.`);
    }

    const tUser = snap.docs[0].data() as UserProfile;
    if (tUser.uid === currentUser.uid) {
      throw new Error("You cannot add yourself to your contacts.");
    }

    // 2. Save mutually
    await updateDoc(doc(db, 'users', currentUser.uid), {
      contacts: arrayUnion(tUser.uid)
    });
  };

  const removeContact = async (uid: string) => {
    if (!currentUser) return;
    await updateDoc(doc(db, 'users', currentUser.uid), {
      contacts: arrayRemove(uid)
    });
  };

  const toggleBlockUser = async (uid: string) => {
    if (!currentUser || !userProfile) return;
    const isAlreadyBlocked = (userProfile.blockedUsers || []).includes(uid);
    await updateDoc(doc(db, 'users', currentUser.uid), {
      blockedUsers: isAlreadyBlocked ? arrayRemove(uid) : arrayUnion(uid)
    });
  };

  const searchUsersByPrefix = async (prefix: string): Promise<UserProfile[]> => {
    if (!prefix) return [];
    const prefixNorm = prefix.toLowerCase().trim();
    const endNorm = prefixNorm + '\uf8ff';
    
    const q = query(
      collection(db, 'users'), 
      where('username', '>=', prefixNorm), 
      where('username', '<=', endNorm)
    );
    const snap = await getDocs(q);
    const list: UserProfile[] = [];
    snap.docs.forEach((doc) => {
      list.push(doc.data() as UserProfile);
    });
    return list;
  };

  // Stories
  const publishStory = async (file: File, mediaType: 'image' | 'video') => {
    if (!currentUser || !userProfile) return;

    const storyId = doc(collection(db, 'stories')).id;
    const fileExtensionRef = file.name.split('.').pop();
    const storageTargetRef = storageRef(storage, `stories/${currentUser.uid}/${storyId}.${fileExtensionRef}`);

    await uploadBytesResumable(storageTargetRef, file);
    const mediaUrl = await getDownloadURL(storageTargetRef);

    const newStory: Story = {
      id: storyId,
      userId: currentUser.uid,
      userDisplayName: userProfile.displayName,
      userPhotoURL: userProfile.photoURL,
      mediaUrl: mediaUrl,
      mediaType: mediaType,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      views: [currentUser.uid],
      reactions: {}
    };

    await setDoc(doc(db, 'stories', storyId), newStory);
  };

  const viewStory = async (storyId: string) => {
    if (!currentUser) return;
    await updateDoc(doc(db, 'stories', storyId), {
      views: arrayUnion(currentUser.uid)
    });
  };

  const addStoryReaction = async (storyId: string, emoji: string) => {
    if (!currentUser) return;
    await updateDoc(doc(db, 'stories', storyId), {
      [`reactions.${currentUser.uid}`]: emoji
    });
  };

  // Calling Signaling State Dispatch
  const initiateCall = async (receiverId: string, type: 'voice' | 'video') => {
    if (!currentUser || !userProfile) return;
    
    const callId = doc(collection(db, 'calls')).id;

    // Fetch receiver details for caller info aesthetics
    const rSnap = await getDoc(doc(db, 'users', receiverId));
    const rData = rSnap.exists() ? rSnap.data() as UserProfile : null;

    const newCallDoc: CallSession = {
      id: callId,
      callerId: currentUser.uid,
      callerName: userProfile.displayName,
      callerPhotoURL: userProfile.photoURL,
      receiverId: receiverId,
      receiverName: rData?.displayName || 'Contact',
      receiverPhotoURL: rData?.photoURL || '',
      status: 'ringing',
      type: type,
      createdAt: Date.now()
    };

    setDialerCall(newCallDoc); // Displays the calling screen natively
    await setDoc(doc(db, 'calls', callId), newCallDoc);
    setActiveCall(newCallDoc);
  };

  const acceptCall = async () => {
    if (!dialerCall || !currentUser) return;
    await updateDoc(doc(db, 'calls', dialerCall.id), {
      status: 'connected'
    });
    setActiveCall({ ...dialerCall, status: 'connected' });
    setDialerCall(null);
  };

  const rejectCall = async () => {
    if (!dialerCall) return;
    await updateDoc(doc(db, 'calls', dialerCall.id), {
      status: 'rejected',
      endedAt: Date.now()
    });
    setDialerCall(null);
    setActiveCall(null);
  };

  const endCall = async () => {
    const targetCall = activeCall || dialerCall;
    if (!targetCall) return;
    await updateDoc(doc(db, 'calls', targetCall.id), {
      status: 'ended',
      endedAt: Date.now()
    });
    setActiveCall(null);
    setDialerCall(null);
  };

  return (
    <MessengerContext.Provider value={{
      currentUser,
      userProfile,
      chats,
      messages,
      activeChat,
      stories,
      activeCall,
      dialerCall,
      blockedUsersList,
      contactsList,
      globalUsers,
      onlineUsers,
      activeFolder,
      searchQuery,
      isSidebarOpen,
      isRightPanelOpen,
      uploadProgress,
      
      loginEmail,
      signupEmail,
      loginGoogle,
      resetPassword,
      logout,
      updateMyProfile,
      completeOnboarding,
      uploadAvatar,
      deleteAvatar,
      updateFolder,
      sortFolders,
      getRecommendedUsers,
      terminateSession,
      
      createDirectChat,
      createGroupOrChannel,
      setActiveChat,
      togglePinChat,
      toggleArchiveChat,
      toggleMuteChat,
      deleteChat,
      setActiveFolder,
      createFolder,
      deleteFolder,
      
      sendTextMessage,
      sendFileMessage,
      sendVoiceMessage,
      sendStickerMessage,
      uploadSticker,
      sendTypingStatus,
      saveChatDraft,
      editMessage,
      deleteMessage,
      saveMessageToFavorites,
      addMessageReaction,
      removeMessageReaction,
      pinMessage,
      sendPollMessage,
      voteInPoll,
      createTopic,
      closeTopic,
      
      addContactByUsername,
      removeContact,
      toggleBlockUser,
      searchUsersByPrefix,
      
      publishStory,
      viewStory,
      addStoryReaction,
      
      initiateCall,
      acceptCall,
      rejectCall,
      endCall,
      setDialerCall,
      setActiveCall,
      
      setSearchQuery,
      setIsSidebarOpen,
      setIsRightPanelOpen,
      theme,
      setTheme,
      selectedUserProfile,
      setSelectedUserProfile,
      addMemberToChat,
      joinChatByInviteCode,
      updateGroupInfo,
      updateChatDetails,
      updateMemberRole,
      kickMember,
      banMember,
      unbanMember,
      muteMember,
      unmuteMember,
      generateInviteLink,
      revokeInviteLink,
      submitJoinRequest,
      handleJoinRequest,
      terminateOtherSessions,
      submitReport,
      resolveReport,
      writeAuditLog,
      globalReports,
      globalAuditLogs
    }}>
      {children}
    </MessengerContext.Provider>
  );
};

export const useMessenger = () => {
  const context = useContext(MessengerContext);
  if (context === undefined) {
    throw new Error('useMessenger must be used within a MessengerProvider');
  }
  return context;
};
