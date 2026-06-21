/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, 
  Video, 
  Send, 
  Paperclip, 
  X, 
  Check, 
  CheckCheck, 
  Reply, 
  Edit2, 
  Trash2, 
  Forward, 
  Smile, 
  Pin, 
  Mic, 
  Download, 
  CornerUpLeft, 
  Copy,
  FolderLock,
  Plus,
  Camera,
  Play,
  Pause,
  Loader2,
  Volume2,
  VolumeX,
  Search,
  MessageSquare,
  Lock,
  Clock,
  Square,
  Bookmark,
  Info,
  Sparkles,
  UserCheck,
  Globe
} from 'lucide-react';
import { useMessenger } from '../context/MessengerContext';
import { useLanguage } from '../context/LanguageContext';
import { Message, UserProfile } from '../types';
import { logger } from '../lib/logger';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import TextareaAutosize from 'react-textarea-autosize';

const DEFAULT_STICKERS = [
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=happy',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=laugh',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=cool',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=love',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=wink',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=shocked',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=sad',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=angry'
];

const POPULAR_EMOJIS = [
  '🌟', '❤️', '🔥', '👍', '😂', '😮', '😢', '🎉', '🚀', '👏', 
  '🤔', '💡', '✨', '👑', '👌', '👀', '😍', '😎', '🙏', '💯', 
  '🎈', '🎁', '⚡', '☕', '🍕', '🐱', '🐾', '🌍', '🧭', '💪'
];

const formatMarkdownText = (text: string) => {
  if (!text) return '';
  const rules = [
    { regex: /\*\*(.*?)\*\*/g, repl: '<strong class="font-bold text-slate-100">$1</strong>' },
    { regex: /\*(.*?)\*/g, repl: '<em class="italic text-slate-300">$1</em>' },
    { regex: /`(.*?)`/g, repl: '<code class="bg-[#050505] px-1.5 py-0.5 rounded border border-white/5 font-mono text-cyan-400 text-xs">$1</code>' },
    { regex: /^&gt;&gt; (.*?)$/gm, repl: '<blockquote class="border-l-4 border-cyan-500 bg-slate-950/25 pl-3 py-1 my-1 rounded text-xs text-slate-400">$1</blockquote>' },
    { regex: /^&gt; (.*?)$/gm, repl: '<blockquote class="border-l-2 border-slate-700 bg-slate-950/15 pl-2 py-0.5 my-1 rounded text-xs text-slate-400">$1</blockquote>' }
  ];
  
  let escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
    
  rules.forEach(rule => {
    escaped = escaped.replace(rule.regex, rule.repl);
  });
  
  return <span dangerouslySetInnerHTML={{ __html: escaped }} />;
};

const getFileIcon = (fileName: string) => {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return '📕';
  if (['doc', 'docx'].includes(ext || '')) return '📘';
  if (['xls', 'xlsx'].includes(ext || '')) return '📗';
  if (['zip', 'rar', 'tar', 'gz'].includes(ext || '')) return '🗜️';
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')) return '🎵';
  return '📁';
};

// Helper components for inline players to preserve reactive focus and layout isolation
const CircularVideoNote: React.FC<{ src: string }> = ({ src }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(videoRef.current.muted);
    }
  };

  return (
    <div className="relative w-40 h-40 md:w-44 md:h-44 rounded-full overflow-hidden border-2 border-cyan-500/30 bg-black cursor-pointer shadow-lg mx-auto md:mx-0 my-1 group-all shrink-0">
      <video 
        ref={videoRef}
        src={src} 
        loop 
        muted={muted} 
        playsInline 
        autoPlay 
        className="w-full h-full object-cover" 
      />
      <button 
        type="button"
        onClick={toggleMute}
        className="absolute bottom-2 right-2 p-1.5 rounded-full bg-slate-950/80 hover:bg-slate-900 text-cyan-400 border border-slate-800 text-xs shadow transition-all"
        title="Mute/Unmute"
      >
        {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};

const AudioWavePlayer: React.FC<{ src: string, duration?: number }> = ({ src, duration }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const progressContainerRef = useRef<HTMLDivElement>(null);

  const handlePlayToggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.playbackRate = speed;
      audioRef.current.play().catch(err => console.warn("Audio play prevented:", err));
    }
  };

  const handleSpeedToggle = () => {
    let nextSpeed = 1;
    if (speed === 1) nextSpeed = 1.5;
    else if (speed === 1.5) nextSpeed = 2;
    else nextSpeed = 1;

    setSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // Some browsers return Infinity for WebM duration until played or completely loaded
    const checkDuration = () => {
      if (audio.duration && audio.duration !== Infinity && duration === undefined) {
        // use audio.duration if no duration prop
      }
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', checkDuration);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', checkDuration);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [duration]);

  // Use provided duration from prop, fallback to audio element duration, default to 0
  const totalDuration = duration 
    ? duration 
    : (audioRef.current && isFinite(audioRef.current.duration) ? audioRef.current.duration : 0);
    
  const progressRatio = totalDuration > 0 ? (currentTime / totalDuration) : 0;

  // stable wave bars based on src hashing
  const bars = useMemo(() => {
    let hash = 0;
    const str = src || "stabilizer_hash";
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const result: number[] = [];
    for (let i = 0; i < 28; i++) {
      const val = 4 + Math.abs(Math.sin(hash + i) * 20); // heights value between 4px and 24px
      result.push(val);
    }
    return result;
  }, [src]);

  // Click on waveform to seek/scrub
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressContainerRef.current || !audioRef.current || totalDuration === 0) return;
    const rect = progressContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    audioRef.current.currentTime = percent * totalDuration;
    setCurrentTime(percent * totalDuration);
  };

  return (
    <div className="flex items-center gap-2.5 p-2 px-3 bg-black/20 hover:bg-black/35 rounded-2xl border border-white/5 max-w-xs my-1 select-none backdrop-blur-sm shadow-md">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      {/* Play/Pause Button */}
      <button 
        type="button"
        onClick={handlePlayToggle}
        className="w-8.5 h-8.5 rounded-full bg-[var(--glass-accent)] hover:opacity-90 text-white flex items-center justify-center cursor-pointer transition shrink-0 shadow-lg active:scale-95"
      >
        {playing ? <Pause className="w-4 h-4 text-white fill-white" /> : <Play className="w-4 h-4 ml-0.5 text-white fill-white" />}
      </button>
      
      {/* Waveform and Progress */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {/* Interactive Waves bars */}
        <div 
          ref={progressContainerRef}
          onClick={handleSeek}
          className="flex items-center gap-0.5 h-7 cursor-pointer hover:opacity-90 py-1"
        >
          {bars.map((height, i) => {
            const barFraction = i / bars.length;
            const isActive = progressRatio >= barFraction;
            return (
              <span 
                key={i} 
                className="w-0.5 rounded-full transition-colors duration-150 shrink-0"
                style={{ 
                  height: `${height}px`,
                  backgroundColor: isActive ? 'var(--glass-accent)' : 'rgba(255, 255, 255, 0.2)' 
                }}
              />
            );
          })}
        </div>
        
        {/* Time stamps */}
        <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono leading-none mt-1">
          <span>{Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')}</span>
          <span>{totalDuration > 0 ? `${Math.floor(totalDuration / 60)}:${(Math.floor(totalDuration % 60)).toString().padStart(2, '0')}` : '--:--'}</span>
        </div>
      </div>

      {/* Speed Rate Control (1x / 1.5x / 2x) */}
      <button 
        type="button"
        onClick={handleSpeedToggle}
        className="text-[9px] font-bold font-mono px-1.5 py-1 bg-white/5 hover:bg-white/10 rounded-md text-slate-300 cursor-pointer border border-white/5 hover:text-white transition shrink-0 active:scale-95 animate-fade-in"
        title="Playback Speed"
      >
        {speed}x
      </button>
    </div>
  );
};

import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

export const ChatWindow: React.FC = () => {
  const { 
    currentUser, 
    userProfile,
    activeChat, 
    setActiveChat,
    isRightPanelOpen,
    setIsRightPanelOpen,
    messages, 
    globalUsers,
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
    pinMessage,
    sendPollMessage,
    voteInPoll,
    createTopic,
    closeTopic,
    initiateCall,
    uploadProgress,
    selectedUserProfile,
    setSelectedUserProfile,
    createDirectChat,
    addMemberToChat,
    addContactByUsername,
    onlineUsers
  } = useMessenger();

  const { t, language } = useLanguage();

  // Scroll Container ref and input focal element
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Core inputs state machinery
  const [inputText, setInputText] = useState('');
  const draftTimeoutRef = useRef<any>(null);

  // Pagination & performance optimization states for long chat histories
  const [renderLimit, setRenderLimit] = useState(50);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const prevScrollHeightRef = useRef<number>(0);
  const prevScrollTopRef = useRef<number>(0);

  // Sync and Restore Drafts
  useEffect(() => {
    if (!activeChat || !currentUser) return;

    // Load draft for new active chat
    const localDraft = localStorage.getItem(`vi_draft_${activeChat.id}`);
    const cloudDraft = activeChat.drafts?.[currentUser.uid] || '';
    
    // Prioritize Cloud draft if newer/exists, fall back to local draft
    const draftToLoad = cloudDraft !== undefined && cloudDraft !== '' ? cloudDraft : (localDraft || '');
    setInputText(draftToLoad);

    return () => {
      if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
    };
  }, [activeChat?.id]);

  const handleInputChange = (text: string) => {
    setInputText(text);
    if (!activeChat) return;

    // Immediate local persistence
    localStorage.setItem(`vi_draft_${activeChat.id}`, text);

    // Debounce cloud persistence to avoid Firestore bill overhead
    if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
    draftTimeoutRef.current = setTimeout(() => {
      saveChatDraft(activeChat.id, text);
    }, 1200);
  };

  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Message | null>(null);
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null); // messageId
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [stickerTrayTab, setStickerTrayTab] = useState<'emoji' | 'stickers'>('emoji');
  const [uploadingSticker, setUploadingSticker] = useState(false);

  // Advanced contextual searches & scheduling
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [viewScheduledMode, setViewScheduledMode] = useState(false);
  const [searchInChatQuery, setSearchInChatQuery] = useState('');
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showAttachmentDropdown, setShowAttachmentDropdown] = useState(false);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Poll state variables
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptionsInput, setPollOptionsInput] = useState('');
  const [pollIsMultiple, setPollIsMultiple] = useState(false);
  const [pollIsAnonymous, setPollIsAnonymous] = useState(true);
  
  const [isSilent, setIsSilent] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<number | null>(null);
  const [initialUnreadId, setInitialUnreadId] = useState<string | null>(null);
  const currentChatIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeChat) {
       currentChatIdRef.current = null;
       setInitialUnreadId(null);
       return;
    }
    if (activeChat.id !== currentChatIdRef.current) {
       currentChatIdRef.current = activeChat.id;
       const firstUnread = messages.find(m => currentUser && m.senderId !== currentUser.uid && !m.readBy?.includes(currentUser.uid));
       setInitialUnreadId(firstUnread ? firstUnread.id : null);
    }
  }, [activeChat?.id, messages, currentUser?.uid]);

  const {
    isRecording,
    recordDuration,
    recordingState,
    recordGestures,
    recordingAmplitudes,
    voicePreviewBlob,
    voicePreviewUrl,
    voicePreviewDuration,
    handleRecordStart: startRecording,
    handleRecordMove,
    handleRecordRelease,
    cancelRecording,
    stopRecording,
    sendPreviewVoiceMessage,
    resetRecordingState,
    setRecordingState,
    shouldSendOnStopRef
  } = useVoiceRecorder(sendVoiceMessage);

  const handleEmojiInsert = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  const handleCustomStickerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingSticker(true);
      await uploadSticker(file);
    } catch (err: any) {
      alert(language === 'ru' ? 'Ошибка загрузки стикера: ' + err.message : 'Error uploading sticker: ' + err.message);
    } finally {
      setUploadingSticker(false);
    }
  };

  // Live Circular Camera Recording parameters
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordVideoDuration, setRecordVideoDuration] = useState(0);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const videoTimerRef = useRef<any>(null);

  // File Upload Draft tracker
  const [selectedDraftFile, setSelectedDraftFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Slow Mode state & active cooldown countdown
  const myLastMessage = useMemo(() => {
    if (!currentUser || !messages || !activeChat) return null;
    const chatMsgs = messages.filter(m => m.chatId === activeChat.id && m.senderId === currentUser.uid);
    if (chatMsgs.length === 0) return null;
    return chatMsgs.reduce((latest, current) => current.createdAt > latest.createdAt ? current : latest, chatMsgs[0]);
  }, [messages, activeChat?.id, currentUser?.uid]);

  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    if (!activeChat || !activeChat.slowModeSeconds || !myLastMessage || !currentUser) {
      setCooldownRemaining(0);
      return;
    }
    
    // Admins and Creator are immune to slowMode
    const isAdmin = activeChat.creatorId === currentUser.uid || activeChat.admins?.includes(currentUser.uid);
    if (isAdmin) {
      setCooldownRemaining(0);
      return;
    }

    const calcCooldown = () => {
      const elapsed = Date.now() - myLastMessage.createdAt;
      const totalCooldownMs = activeChat.slowModeSeconds! * 1000;
      const remaining = Math.max(0, Math.ceil((totalCooldownMs - elapsed) / 1000));
      setCooldownRemaining(remaining);
    };

    calcCooldown();
    const timer = setInterval(calcCooldown, 500);
    return () => clearInterval(timer);
  }, [activeChat?.id, activeChat?.slowModeSeconds, myLastMessage?.createdAt, currentUser?.uid]);

  // Filter messages based on views (search, scheduler queue, forum topics)
  const visibleMessages = useMemo(() => {
    let list = [...messages];

    // Filter normal vs scheduled queue messages
    if (viewScheduledMode) {
      list = list.filter(m => m.scheduledAt && Date.now() < m.scheduledAt);
    } else {
      list = list.filter(m => !m.scheduledAt || Date.now() >= m.scheduledAt);
    }

    // Filter topics
    if (activeChat?.topics && activeChat.topics.length > 0 && activeTopicId) {
      list = list.filter(m => m.topicId === activeTopicId);
    }

    // Class text searching inside conversation history
    if (searchInChatQuery.trim()) {
      list = list.filter(m => m.text?.toLowerCase().includes(searchInChatQuery.toLowerCase()));
    }

    // Sort ascending chronologically
    return list.sort((a, b) => a.createdAt - b.createdAt);
  }, [messages, viewScheduledMode, activeChat, activeTopicId, searchInChatQuery]);

  // Slice to only render up to the latest `renderLimit` messages for UI rendering performance
  const paginatedMessages = useMemo(() => {
    if (visibleMessages.length <= renderLimit) {
      return visibleMessages;
    }
    return visibleMessages.slice(visibleMessages.length - renderLimit);
  }, [visibleMessages, renderLimit]);

  // Adjust scroll position when older messages are loaded at the top to prevent scroll jumps
  useLayoutEffect(() => {
    if (scrollContainerRef.current && prevScrollHeightRef.current > 0) {
      const { scrollHeight } = scrollContainerRef.current;
      const heightDifference = scrollHeight - prevScrollHeightRef.current;
      if (heightDifference > 0) {
        scrollContainerRef.current.scrollTop = prevScrollTopRef.current + heightDifference;
      }
      prevScrollHeightRef.current = 0;
    }
  }, [paginatedMessages.length]);

  // Who is typing parsing (throttle 5 seconds)
  const typingUsers = useMemo(() => {
    if (!activeChat || !activeChat.typing) return [];
    const now = Date.now();
    return Object.entries(activeChat.typing)
      .filter(([uid, val]) => uid !== currentUser?.uid && now - (val as number) < 5000)
      .map(([uid]) => {
        const u = globalUsers.find((p) => p.uid === uid);
        return u ? u.displayName : (language === 'ru' ? 'Кто-то' : 'Someone');
      });
  }, [activeChat, globalUsers, currentUser, language]);

  // Keep bottom-scrolled automatically on message list expansion/height change
  const scrollToBottom = useCallback((smooth = false) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  }, []);
  
  const [isAtBottom, setIsAtBottom] = useState(true);
  
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      setIsAtBottom(scrollHeight - scrollTop - clientHeight < 150);

      // Trigger loads for older history when scrolling past top threshold (< 80px)
      if (scrollTop < 80 && !isLoadingMore && visibleMessages.length > renderLimit) {
        setIsLoadingMore(true);
        prevScrollHeightRef.current = scrollHeight;
        prevScrollTopRef.current = scrollTop;
        
        // Timeout debounce simulates natural smooth visual loading
        setTimeout(() => {
          setRenderLimit(prev => Math.min(prev + 50, visibleMessages.length));
          setIsLoadingMore(false);
        }, 400);
      }
    }
  }, [visibleMessages.length, renderLimit, isLoadingMore]);

  const activeMenuMessage = activeMessageMenuId ? visibleMessages.find(m => m.id === activeMessageMenuId) : null;

  // When active chat fundamentally changes or loads for the first time
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    
    // Reset chunk limit on chat context swap
    setRenderLimit(50);
    setIsLoadingMore(false);
    prevScrollHeightRef.current = 0;
    prevScrollTopRef.current = 0;
    
    if (initialUnreadId) {
      // Jump to unread
      setTimeout(() => {
        const el = document.getElementById(`msg-${initialUnreadId}`);
        if (el && scrollContainerRef.current) {
          el.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
      }, 50);
    } else {
      setTimeout(() => scrollToBottom(false), 50);
    }
  }, [activeChat?.id, initialUnreadId, scrollToBottom]);

  // When new messages arrive on the active thread
  useEffect(() => {
     if (isAtBottom && paginatedMessages.length > 0) {
        scrollToBottom(true);
     }
  }, [paginatedMessages.length, isAtBottom, scrollToBottom]);

  // Trigger scroll to bottom on keyboard popup or focus states
  useEffect(() => {
    const handleViewportResize = () => {
      if (isAtBottom) scrollToBottom();
    };
    window.addEventListener('resize', handleViewportResize);
    return () => window.removeEventListener('resize', handleViewportResize);
  }, [isAtBottom, scrollToBottom]);

  // Video Note Circular camera recording
  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: { width: 320, height: 320, facingMode: 'user' } 
      });
      videoStreamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
      
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
      videoRecorderRef.current = recorder;
      videoChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        try {
          const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
          if (videoBlob.size > 1000) {
            // Wrapped as file with specific name triggers circular player in message log rendering
            const videoFile = new File([videoBlob], 'video-note.webm', { type: 'video/webm' });
            await sendFileMessage(videoFile, 'video');
          }
        } catch (err: any) {
          logger.error("Failed to send video message during onstop", { error: err.message, stack: err.stack });
        } finally {
          setRecordVideoDuration(0);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      recorder.start();
      setIsRecordingVideo(true);
      setRecordVideoDuration(0);

      videoTimerRef.current = setInterval(() => {
        setRecordVideoDuration(prev => {
          if (prev >= 60) {
            stopVideoRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      logger.error("Camera webcam capture initiation error:", { error: err.message, stack: err.stack });
      alert(language === 'ru' ? 'Ошибка запуска веб-камеры. Проверьте права доступа в браузере.' : 'Failed to launch circular video note capture. Verify permissions.');
    }
  };

  const stopVideoRecording = () => {
    if (videoRecorderRef.current && isRecordingVideo) {
      videoRecorderRef.current.stop();
      setIsRecordingVideo(false);
      clearInterval(videoTimerRef.current);
    }
  };

  const cancelVideoRecording = () => {
    if (videoRecorderRef.current && isRecordingVideo) {
      videoRecorderRef.current.onstop = null;
      videoRecorderRef.current.stop();
      setIsRecordingVideo(false);
      clearInterval(videoTimerRef.current);
      setRecordVideoDuration(0);
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(t => t.stop());
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleMessageSend(e as unknown as React.FormEvent);
    }
  };

  // Submit messages
  const handleMessageSend = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. If we have a draft file staged in preview row, upload it first before basic texts
    if (selectedDraftFile) {
      const fileToUpload = selectedDraftFile;
      setSelectedDraftFile(null);
      const isImg = fileToUpload.type.startsWith('image/');
      const isVid = fileToUpload.type.startsWith('video/');
      const type = isImg ? 'image' : isVid ? 'video' : 'file';
      await sendFileMessage(fileToUpload, type);
      
      // Focus element on file transmit completed
      setTimeout(() => inputRef.current?.focus(), 150);
      return;
    }

    if (!inputText.trim()) return;

    if (editTarget) {
      await editMessage(editTarget.id, inputText);
      setEditTarget(null);
    } else {
      await sendTextMessage(
        inputText,
        replyTarget || undefined,
        undefined,
        activeTopicId || undefined,
        isSilent,
        scheduledTime || undefined
      );
    }

    setInputText('');
    setReplyTarget(null);
    setIsSilent(false);
    setScheduledTime(null);
    
    if (activeChat) {
      localStorage.removeItem(`vi_draft_${activeChat.id}`);
      saveChatDraft(activeChat.id, '');
    }
    
    // Smoothly focus input keyboard to facilitate continuous messaging
    setTimeout(() => {
      inputRef.current?.focus();
    }, 30);
  };

  // Fast drag & drop handler callbacks
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedDraftFile(file);
    }
  };

  const handleImmediateFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedDraftFile(file);
    }
  };

  const triggerCopyAction = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(language === 'ru' ? 'Текст скопирован в буфер обмена' : 'Text copied to clipboard');
  };

  if (!activeChat) {
    const getGreeting = () => {
      const hours = new Date().getHours();
      if (hours < 6) return language === 'ru' ? 'Доброй ночи' : 'Good night';
      if (hours < 12) return language === 'ru' ? 'Доброе утро' : 'Good morning';
      if (hours < 18) return language === 'ru' ? 'Добрый день' : 'Good afternoon';
      return language === 'ru' ? 'Добрый вечер' : 'Good evening';
    };

    const contactSuggestions = (globalUsers || [])
      .filter(u => currentUser && u.uid !== currentUser.uid)
      .slice(0, 3);

    return (
      <div className="hidden md:flex flex-1 bg-[#09090A] flex-col p-8 md:p-12 overflow-y-auto h-full justify-center select-none">
        <div className="max-w-3xl w-full mx-auto space-y-8 animate-fade-in-up">
          
          {/* Main welcome banner with dynamic greeting & user avatar */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 bg-white/[0.02] border border-white/5 p-6 md:p-8 rounded-3xl backdrop-blur-md relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative shrink-0">
              <img 
                src={userProfile?.photoURL || 'https://api.dicebear.com/7.x/adventurer/svg'} 
                alt="Profile" 
                className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-2 border-[var(--glass-accent)] shadow-lg shadow-cyan-500/10"
              />
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#121215] shadow-inner" />
            </div>
            
            <div className="text-center md:text-left space-y-2 min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--glass-accent)] font-mono px-2.5 py-1 bg-cyan-500/10 rounded-full border border-cyan-500/10">
                {language === 'ru' ? 'Добро пожаловать' : 'Welcome to VI'}
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight leading-none mt-2">
                {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-400 font-black">{userProfile?.displayName}</span>!
              </h1>
              <p className="text-xs text-slate-400 font-medium font-mono">@{userProfile?.username}</p>
              
              {userProfile?.bio && (
                <p className="text-xs text-slate-400 leading-relaxed bg-black/20 p-2.5 rounded-xl border border-white/[0.03] mt-3">
                  <span className="font-mono text-[9px] text-slate-500 block uppercase tracking-wider mb-0.5">{language === 'ru' ? 'О себе' : 'Bio'}</span>
                  {userProfile.bio}
                </p>
              )}
            </div>
          </div>

          {/* Bento-style dashboard grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Bento Card 1: Saved Messages shortcut */}
            <div 
              onClick={async () => {
                if (userProfile) {
                  await createDirectChat(userProfile);
                }
              }}
              className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl hover:bg-white/[0.04] hover:border-cyan-500/20 active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between group shadow-lg min-h-[180px]"
            >
              <div className="flex justify-between items-start">
                <div className="p-3 bg-cyan-500/10 text-[var(--glass-accent)] rounded-2xl border border-cyan-500/15 group-hover:scale-110 transition-transform">
                  <Bookmark className="w-6.5 h-6.5" />
                </div>
                <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">
                  {language === 'ru' ? 'Избранное' : 'Cloud Sandbox'}
                </span>
              </div>
              <div className="space-y-1.5 pt-4">
                <h3 className="text-sm font-bold text-slate-200 group-hover:text-[var(--glass-accent)] transition-colors">
                  {language === 'ru' ? 'Избранные сообщения' : 'Saved Messages'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  {language === 'ru' 
                    ? 'Ваше личное облачное хранилище для хранения файлов, текстовых заметок, ссылок и черновиков.' 
                    : 'Your personal encrypted sandbox cloud to store files, voice notes, code snippets or drafts.'}
                </p>
              </div>
            </div>

            {/* Bento Card 2: Contact suggestions */}
            <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl shadow-lg min-h-[180px] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/15">
                    <UserCheck className="w-6.5 h-6.5" />
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">
                    {language === 'ru' ? 'Рекомендации' : 'Live Contacts'}
                  </span>
                </div>
                
                <h3 className="text-sm font-bold text-slate-200">
                  {language === 'ru' ? 'Быстрый доступ к контактам' : 'Connect with Contacts'}
                </h3>
                
                {contactSuggestions.length > 0 ? (
                  <div className="space-y-2 mt-3">
                    {contactSuggestions.map((u) => (
                      <div 
                        key={u.uid} 
                        onClick={async () => {
                          await createDirectChat(u);
                        }}
                        className="flex items-center justify-between p-2 rounded-xl bg-black/25 hover:bg-white/5 border border-white/5 hover:border-cyan-500/10 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img src={u.photoURL} alt={u.displayName} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-200 truncate group-hover:text-[var(--glass-accent)]">{u.displayName}</h4>
                            <p className="text-[10px] font-mono text-slate-500 truncate">@{u.username}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold font-mono tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/10 px-2 py-0.5 rounded-md uppercase">
                          {language === 'ru' ? 'Чат' : 'Chat'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 font-sans mt-2">
                    {language === 'ru' 
                      ? 'Другие зарегистрированные пользователи пока не найдены.' 
                      : 'No other active node users found in this workspace context.'}
                  </p>
                )}
              </div>
            </div>

          </div>

          {/* Quick tips & stats strip */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 px-6 bg-white/[0.01] border border-white/[0.03] rounded-2xl text-xs text-slate-450 select-none">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                {language === 'ru' 
                  ? 'Совет: Проведите пальцем влево на сообщении для мгновенного ответа!' 
                  : 'Pro Tip: Swipe left on any message for a lightning fast reply!'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
              <span>Secure Ingress Protection ACTIVE</span>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Find active uploading states
  const activeUploadsList = Object.entries(uploadProgress);

  return (
    <div 
      className="flex-1 bg-[#090909] flex flex-col h-full relative overflow-hidden"
      onDragEnter={handleDrag}
      onClick={(e) => {
        // If clicking outside an active menu, close it
        if (activeMessageMenuId) {
           setActiveMessageMenuId(null);
        }
      }}
    >
      {/* File Drag Over Transparent Backdrop */}
      {dragActive && (
        <div 
          className="absolute inset-0 bg-[#0A0A0A]/95 z-50 flex flex-col items-center justify-center border-4 border-dashed border-cyan-500/30 p-10 text-center pointer-events-auto"
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <div className="p-5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-4 animate-bounce">
            <Paperclip className="w-10 h-10" />
          </div>
          <p className="text-lg font-bold text-slate-100 font-sans">
            {language === 'ru' ? 'Отпустите файлы здесь' : 'Drop files here to upload'}
          </p>
          <p className="text-xs text-slate-500 font-mono mt-1">
            {language === 'ru' ? 'Мгновенная зашифрованная отправка в этот чат' : 'Secure instant transfer inside this sandbox'}
          </p>
        </div>
      )}

      {/* Dynamic Header */}
      <div className="px-3.5 md:px-6 py-2 md:py-3 bg-[#0A0A0A]/95 border-b border-[#1A1A1A] flex justify-between items-center z-20 shrink-0 shadow-lg">
        <div className="flex items-center gap-2 md:gap-3.5 min-w-0">
          {/* Back button on mobile */}
          <button 
            type="button"
            onClick={() => setActiveChat(null)}
            className="md:hidden text-cyan-400 hover:text-cyan-300 transition shrink-0 p-1 mr-0.5"
            title={language === 'ru' ? 'Назад к чатам' : 'Back to chats'}
          >
            <span className="text-xl leading-none">&larr;</span>
          </button>
          
          <div 
            onClick={() => {
              if (activeChat.type === 'direct') {
                const partnerId = activeChat.members?.find(id => id !== currentUser?.uid);
                const partnerProfile = globalUsers.find(u => u.uid === partnerId);
                if (partnerProfile) {
                  setSelectedUserProfile(partnerProfile);
                }
              } else {
                setIsRightPanelOpen(true);
              }
            }}
            className="flex items-center gap-2 md:gap-3.5 min-w-0 cursor-pointer hover:opacity-85 transition"
          >
            <img src={activeChat.photoURL} alt={activeChat.title} className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover border border-slate-800" />
            
            <div className="min-w-0">
              <h3 className="font-semibold text-[13px] md:text-sm text-slate-100 truncate leading-tight">{activeChat.title}</h3>
              {typingUsers.length > 0 ? (
                <span className="text-[10px] md:text-[11px] text-cyan-400 font-semibold animate-pulse flex items-center gap-1 leading-none mt-0.5">
                  <span className="flex gap-0.5">
                    <span className="w-0.5 h-0.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-0.5 h-0.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-0.5 h-0.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                  {typingUsers.join(', ')} {typingUsers.length > 1 ? (language === 'ru' ? 'печатают...' : 'are typing...') : (language === 'ru' ? 'печатает...' : 'is typing...')}
                </span>
              ) : (
                <span className="text-[10px] md:text-[11px] text-slate-400 flex items-center gap-1 font-sans mt-0.5 leading-none">
                  <span className="capitalize text-cyan-500/80 font-medium">
                    {activeChat.type === 'direct' ? (language === 'ru' ? 'Личный' : 'Direct') : activeChat.type === 'group' ? (language === 'ru' ? 'Группа' : 'Group') : (language === 'ru' ? 'Канал' : 'Channel')}
                  </span> 
                  <span>&bull;</span> 
                  <span>{activeChat.members?.length || 0} {language === 'ru' ? 'участников' : 'members'}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action bar channels */}
        <div className="flex items-center gap-1.5 md:gap-2">
          <button 
            type="button"
            onClick={() => {
              setShowInChatSearch(!showInChatSearch);
              if (viewScheduledMode) setViewScheduledMode(false);
              if (showInChatSearch) setSearchInChatQuery('');
            }}
            className={`p-1.5 rounded-lg cursor-pointer transition-all ${showInChatSearch ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'}`}
            title={language === 'ru' ? 'Поиск сообщений' : 'Search Message History'}
          >
            <Search className="w-4 h-4" />
          </button>

          {activeChat.type === 'direct' && (
            <>
              <button 
                type="button"
                onClick={() => initiateCall(activeChat.members.find(id => id !== currentUser?.uid) || '', 'voice')}
                className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg cursor-pointer transition"
                title={language === 'ru' ? 'Начать голосовой звонок' : 'Initiate Voice Channel'}
              >
                <Phone className="w-4 h-4" />
              </button>
              <button 
                type="button"
                onClick={() => initiateCall(activeChat.members.find(id => id !== currentUser?.uid) || '', 'video')}
                className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg cursor-pointer transition"
                title={language === 'ru' ? 'Начать видеозвонок' : 'Initiate Secure Video Call'}
              >
                <Video className="w-4 h-4" />
              </button>
            </>
          )}

          <button 
            type="button"
            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
            className={`p-1.5 rounded-lg cursor-pointer transition-all ${isRightPanelOpen ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'}`}
            title={language === 'ru' ? 'Информация о чате' : 'Chat & User Metadata'}
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Inline Content Search */}
      {showInChatSearch && (
        <div className="px-6 py-2.5 bg-[#0A0A0A]/95 border-b border-[#1F1F1F] flex items-center gap-3 z-10 shrink-0.5 animate-fade-in select-none">
          <input 
            type="text"
            value={searchInChatQuery}
            onChange={(e) => setSearchInChatQuery(e.target.value)}
            placeholder={language === 'ru' ? 'Поиск сообщений в истории диалога...' : 'Search messages in this chat...'}
            className="bg-slate-950 border border-slate-850 text-slate-250 text-xs px-3.5 py-2 rounded-lg focus:outline-none focus:border-cyan-500 flex-1 font-mono placeholder-slate-600"
          />
          {searchInChatQuery && (
            <span className="text-[10px] text-cyan-400 font-mono font-medium background-cyan-400/5 px-2 py-0.5 rounded border border-cyan-400/10">
              {visibleMessages.length} {language === 'ru' ? 'найдено' : 'found'}
            </span>
          )}
          <button type="button" onClick={() => { setShowInChatSearch(false); setSearchInChatQuery(''); }} className="text-slate-500 hover:text-slate-300 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pinned Msg Banner */}
      {activeChat.pinnedMessageId && (
        <div className="px-6 py-2 bg-cyan-950/10 border-b border-cyan-800/10 flex justify-between items-center text-xs text-slate-300 select-none animate-fade-in z-10 shrink-0">
          <div className="flex items-center gap-2 truncate flex-1 min-w-0 mr-3">
            <Pin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <div className="truncate cursor-pointer text-slate-300 hover:text-white" onClick={() => {
              const pinnedDiv = document.getElementById(`msg-${activeChat.pinnedMessageId}`);
              if (pinnedDiv) pinnedDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}>
              <span className="font-semibold text-cyan-400 mr-1.5">{language === 'ru' ? 'Закреплённое:' : 'Pinned:'}</span>
              <span className="text-slate-300 italic truncate text-[11px]">
                {messages.find(m => m.id === activeChat.pinnedMessageId)?.text || (language === 'ru' ? 'Кликнуть для просмотра' : 'Click to view')}
              </span>
            </div>
          </div>
          <button type="button" onClick={() => pinMessage(activeChat.id, null)} className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Topics tab selector (Forum Mode enabled) */}
      {activeChat.type === 'group' && activeChat.topics && activeChat.topics.length > 0 && (
        <div className="px-6 py-2 bg-[#0A0A0A]/90 border-b border-slate-900/60 flex items-center gap-2 overflow-x-auto scrollbar-none z-10 shrink-0 select-none">
          <button 
            type="button"
            onClick={() => setActiveTopicId(null)}
            className={`px-3 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-all ${!activeTopicId ? 'bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/25' : 'bg-slate-950/80 text-slate-400 hover:bg-slate-900 border border-transparent'}`}
          >
            💬 {language === 'ru' ? 'Все темы (General)' : 'General Forum'}
          </button>
          
          {activeChat.topics.map(topic => (
            <div key={topic.id} className="flex items-center shrink-0">
              <button 
                type="button"
                onClick={() => setActiveTopicId(topic.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-all ${activeTopicId === topic.id ? 'bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/25' : 'bg-slate-950/80 text-slate-400 hover:bg-slate-900 border border-transparent'}`}
              >
                <span>{topic.icon || '📌'}</span>
                <span>{topic.name}</span>
              </button>
              {topic.creatorId === currentUser?.uid && (
                <button 
                  type="button"
                  onClick={async () => {
                    const confirmClose = confirm(language === 'ru' ? `Управление темой "${topic.name}". Изменить активность?` : `Toggle status of topic "${topic.name}"?`);
                    if (confirmClose) {
                      await closeTopic(activeChat.id, topic.id, !topic.closed);
                    }
                  }} 
                  className="text-slate-600 hover:text-slate-450 p-0.5 cursor-pointer ml-1"
                  title="Close or open topic"
                >
                  {topic.closed ? '🔓' : '🔒'}
                </button>
              )}
            </div>
          ))}
          
          <button 
            type="button"
            onClick={() => {
              const name = prompt(language === 'ru' ? 'Введите название новой темы:' : 'Enter new forum topic name:');
              if (name && name.trim()) {
                createTopic(activeChat.id, name.trim());
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] bg-slate-950 text-cyan-400 hover:bg-slate-900 font-semibold border border-dashed border-cyan-900/50 cursor-pointer transition-all shrink-0"
          >
            <Plus className="w-3 h-3" />
            <span>{language === 'ru' ? 'Новая тема' : 'Add Topic'}</span>
          </button>
        </div>
      )}

      {/* Message Scrollable Window Stream */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 md:px-6 py-4 relative bg-transparent flex flex-col gap-2.5 scroll-smooth custom-scrollbar"
      >
        {visibleMessages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-650 p-8 text-center select-none max-w-sm mx-auto my-auto py-16">
            <div className="p-4 rounded-full bg-slate-950 border border-slate-900 text-cyan-500/40 mb-3 animate-pulse">
              <MessageSquare className="w-7 h-7" />
            </div>
            <p className="text-xs font-mono lowercase text-slate-550 leading-relaxed">
              {language === 'ru' ? 'Переписка зашифрована. Начните диалог первым, чтобы сохранить историю.' : t.encryptedSandboxInfo}
            </p>
          </div>
        ) : (
          (() => {
            const elements: React.ReactNode[] = [];
            let lastDateStr = '';

            paginatedMessages.forEach((msg, idx) => {
              // 1. Group by day date separator headings
              const msgDate = new Date(msg.createdAt);
              const dateStr = msgDate.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              });
              
              if (dateStr !== lastDateStr) {
                lastDateStr = dateStr;
                elements.push(
                  <div key={`date-header-${msg.id}`} className="flex justify-center my-4 select-none shrink-0">
                    <span className="px-3.5 py-1 text-[10px] md:text-xs font-semibold bg-slate-900 border border-[#1A1A1A] text-slate-450 rounded-full shadow-md uppercase tracking-wider font-mono">
                      {dateStr}
                    </span>
                  </div>
                );
              }

              if (initialUnreadId === msg.id) {
                elements.push(
                  <div key="unread-separator" className="flex items-center w-full my-4 opacity-80 select-none">
                    <div className="flex-1 border-t border-cyan-500/30"></div>
                    <span className="px-3 text-[10px] uppercase font-bold tracking-wider text-cyan-400 bg-[#090909] rounded-full">
                      {language === 'ru' ? 'Непрочитанные сообщения' : 'Unread Messages'}
                    </span>
                    <div className="flex-1 border-t border-cyan-500/30"></div>
                  </div>
                );
              }

              const isMe = msg.senderId === currentUser?.uid;
              const isRead = msg.readBy && msg.readBy.length > 1;

              // 2. Continuous message grouping by the same user within 3 mins (Telegram style clustering)
              const prevMsg = paginatedMessages[idx - 1];
              const isConsecutive = prevMsg && prevMsg.senderId === msg.senderId && (msg.createdAt - prevMsg.createdAt < 3 * 60 * 1000);

              elements.push(
                <motion.div 
                  key={msg.id}
                  id={`msg-${msg.id}`}
                  className={`flex gap-1.5 max-w-[88%] md:max-w-[70%] select-none ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'} ${isConsecutive ? 'mt-0.5' : 'mt-2'} relative`}
                  drag="x"
                  dragDirectionLock
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={{ left: 0.15, right: 0 }}
                  onDragEnd={(e, info) => {
                    if (info.offset.x < -40) {
                       setReplyTarget(msg);
                       if ('vibrate' in navigator) navigator.vibrate(20);
                    }
                  }}
                  onContextMenu={(e: React.MouseEvent) => {
                     e.preventDefault();
                     setActiveMessageMenuId(msg.id);
                  }}
                >
                  {/* Reply icon indicator that opacity-fades in when dragged */}
                  <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 text-slate-400 p-1 bg-slate-900 rounded-full shadow pointer-events-none" id={`reply-icon-${msg.id}`}>
                     <Reply className="w-3.5 h-3.5" />
                  </div>
                  {/* Left Avatar for other users (Hidden on consecutive piles) */}
                  {!isMe && (
                    <div 
                      onClick={() => {
                        const profile = globalUsers.find(u => u.uid === msg.senderId);
                        if (profile) {
                          setSelectedUserProfile(profile);
                        } else {
                          setSelectedUserProfile({
                            uid: msg.senderId,
                            displayName: msg.senderName,
                            photoURL: msg.senderPhotoURL,
                            username: msg.senderName.toLowerCase().replace(/[^a-z0-9]/g, ''),
                            bio: 'Hello, I am using VI Messenger!',
                            createdAt: msg.createdAt
                          } as any);
                        }
                      }}
                      className={`w-7 h-7 md:w-8 md:h-8 rounded-full overflow-hidden shrink-0 ${!isConsecutive ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                    >
                      {!isConsecutive ? (
                        <img src={msg.senderPhotoURL} alt={msg.senderName} className="w-full h-full object-cover border border-slate-900 shadow" />
                      ) : (
                        <div className="w-full h-full" />
                      )}
                    </div>
                  )}

                  {/* Message Core Box Stack */}
                  <div className="flex flex-col gap-0.5 group relative">
                    {/* Compact sender title display for non-me on starting bundle */}
                    {!isMe && !isConsecutive && (
                      <span className="text-[10px] md:text-[11px] font-bold text-cyan-400 pl-1 mb-0.5 font-sans leading-none">
                        {msg.senderName}
                      </span>
                    )}

                    {/* Highly stylized bubble with tail margins */}
                    <div 
                      onPointerDown={(e) => {
                         const target = e.currentTarget;
                         target.dataset.pointerDownStarted = Date.now().toString();
                         target.dataset.longPressTriggered = 'false';
                         target.dataset.timeoutId = setTimeout(() => {
                           target.dataset.longPressTriggered = 'true';
                           setActiveMessageMenuId(msg.id);
                           if ('vibrate' in navigator) navigator.vibrate(20);
                         }, 400).toString();
                      }}
                      onPointerUp={(e) => {
                         const target = e.currentTarget;
                         clearTimeout(parseInt(target.dataset.timeoutId || '0'));
                         if (target.dataset.longPressTriggered !== 'true') {
                            setActiveMessageMenuId(activeMessageMenuId === msg.id ? null : msg.id);
                         }
                      }}
                      onPointerCancel={(e) => {
                         const target = e.currentTarget;
                         clearTimeout(parseInt(target.dataset.timeoutId || '0'));
                      }}
                      className={`relative rounded-2xl py-1.5 px-3 md:py-2 md:px-3.5 border transition-colors ${
                        msg.type === 'sticker' 
                          ? 'border-transparent bg-transparent py-0 px-0 shadow-none' 
                          : isMe 
                            ? 'glass-bubble-out glass-highlight rounded-tr-sm shadow-sm font-sans' 
                            : 'glass-bubble-in rounded-tl-sm shadow-sm font-sans'
                      } ${activeMessageMenuId === msg.id ? 'ring-2 ring-cyan-500/50' : ''}`}
                    >
                      {/* Reply To info block */}
                      {msg.replyTo && (
                        <div className="border-l-2 border-cyan-400 bg-black/45 px-2.5 py-1 rounded-r-lg mb-1.5 text-[10px] md:text-xs">
                          <span className="font-bold text-[10px] text-cyan-400 block truncate leading-none mb-0.5">{msg.replyTo.senderName}</span>
                          <p className="truncate text-slate-400 leading-tight block">{msg.replyTo.text}</p>
                        </div>
                      )}

                      {/* Forward indicator */}
                      {msg.forwardFrom && (
                        <div className="text-[9px] md:text-[10px] text-slate-500 italic mb-1">
                          {language === 'ru' ? 'Переслано оригиналом от: ' : 'Forwarded source: '}
                          <span className="font-bold text-cyan-500/80">{msg.forwardFrom.senderName}</span>
                        </div>
                      )}

                      {/* Message Rich Formats Rendering */}
                      {msg.type === 'sticker' && (
                        <div className="relative select-none max-w-[130px] p-0 mb-0.5">
                          <img 
                            src={msg.fileUrl} 
                            alt="Sticker asset file" 
                            className="w-28 h-28 object-contain hover:scale-105 transition-all duration-300 cursor-pointer" 
                          />
                        </div>
                      )}

                      {msg.type === 'image' && (
                        <div 
                          className="mb-2.5 rounded-xl overflow-hidden shadow-xl max-w-xs border border-slate-900/60 bg-black/55 cursor-pointer hover:opacity-95 transition"
                          onClick={() => setSelectedImage(msg.fileUrl || null)}
                        >
                          <img src={msg.fileUrl} alt="Visual content upload" className="w-full h-auto object-cover max-h-[220px]" />
                        </div>
                      )}

                      {msg.type === 'video' && (
                        (() => {
                          const isCircularVideo = msg.fileName === 'video-note.webm' || msg.fileName?.includes('video-note');
                          if (isCircularVideo) {
                            return <CircularVideoNote src={msg.fileUrl || ''} />;
                          }
                          return (
                            <div className="mb-2.5 rounded-xl overflow-hidden shadow-xl max-w-xs bg-black">
                              <video src={msg.fileUrl} controls className="w-full h-auto" />
                            </div>
                          );
                        })()
                      )}

                      {msg.type === 'voice' && (
                        <AudioWavePlayer src={msg.fileUrl || ''} duration={msg.duration} />
                      )}

                      {msg.type === 'file' && (
                        <a 
                          href={msg.fileUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="mb-2 flex items-center gap-3 p-2.5 bg-slate-950/45 hover:bg-slate-950/70 rounded-xl border border-slate-900 max-w-xs cursor-pointer text-xs transition"
                        >
                          <span className="text-xl shrink-0 p-1 bg-slate-900 border border-slate-800 rounded-lg shadow-inner">
                            {getFileIcon(msg.fileName || '')}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold truncate text-slate-100">{msg.fileName}</p>
                            {msg.fileSize && (
                              <p className="text-[10px] font-mono text-slate-500 mt-0.5">{(msg.fileSize / 1024).toFixed(1)} KB</p>
                            )}
                          </div>
                          <Download className="w-4 h-4 text-cyan-400 shrink-0 select-none ml-1" />
                        </a>
                      )}

                      {/* Dynamic interactive polls */}
                      {msg.type === 'poll' && msg.poll && (
                        <div className="p-3 bg-slate-950/65 rounded-xl border border-slate-900 w-full max-w-sm space-y-3.5 shadow-inner my-1">
                          <div className="flex justify-between items-start gap-2 border-b border-slate-900 pb-1.5">
                            <h4 className="font-semibold text-xs text-slate-200">{msg.poll.question}</h4>
                            <span className="text-[9px] bg-cyan-500/10 text-cyan-400 font-semibold px-2 py-0.5 rounded-full font-mono shrink-0">
                              {msg.poll.isAnonymous ? (language === 'ru' ? 'Анонимно' : 'Anon') : (language === 'ru' ? 'Публичный' : 'Public')}
                            </span>
                          </div>
                          
                          <div className="space-y-1.5">
                            {msg.poll.options.map((opt, oIdx) => {
                              const totalVotes = msg.poll?.options.reduce((acc, current) => acc + current.votes.length, 0) || 0;
                              const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes.length / totalVotes) * 100);
                              const isMyVote = opt.votes.includes(currentUser?.uid || '');

                              return (
                                <div 
                                  key={oIdx} 
                                  onClick={() => voteInPoll(msg.id, oIdx)}
                                  className={`p-2.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex justify-between items-center text-[11px] ${isMyVote ? 'bg-cyan-950/15 border-cyan-500/35 text-cyan-300' : 'bg-slate-900/40 border-slate-900 text-slate-350 hover:bg-slate-850'}`}
                                >
                                  <div 
                                    className="absolute inset-y-0 left-0 bg-cyan-500/10 transition-all duration-300" 
                                    style={{ width: `${percentage}%` }}
                                  />
                                  <div className="flex items-center gap-2 relative z-10 truncate max-w-[80%] leading-none">
                                    {isMyVote && <span className="text-cyan-400 font-bold">✓</span>}
                                    <span className="truncate">{opt.text}</span>
                                  </div>
                                  <span className="relative z-10 font-mono text-[10px] text-slate-505 shrink-0 select-none">
                                    {opt.votes.length} ({percentage}%)
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Central raw formatted message texts */}
                      {msg.type !== 'sticker' && msg.type !== 'poll' && (
                        <p className="text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap select-text break-words pr-2">
                          {formatMarkdownText(msg.text)}
                        </p>
                      )}

                      {/* Small visual anchor footer of state, ticks and date */}
                      <div className={`flex justify-end items-center gap-1 mt-1 select-none text-[9px] text-slate-500/80 float-right ml-2.5 ${
                        msg.type === 'sticker' 
                          ? 'bg-black/75 px-1.5 py-0.5 rounded-full border border-slate-900 text-[9px] w-fit ml-auto shadow-md mt-1' 
                          : ''
                      }`}>
                        {msg.silent && (
                          <span className="text-[10px]" title="Silent message">🔕</span>
                        )}
                        
                        {msg.editHistory && msg.editHistory.length > 0 && (
                          <span 
                            className="text-[8px] text-cyan-400/80 font-medium font-mono lowercase scale-90"
                            title="Message edited"
                          >
                            {language === 'ru' ? 'изм.' : 'edited'}
                          </span>
                        )}
                        
                        <span className="text-[9px] font-mono text-slate-500/80 tracking-tight">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        
                        {isMe && (
                          <span className="shrink-0">
                            {msg.status === 'sending' ? (
                              <div className="w-2.5 h-2.5 rounded-full border border-slate-500 border-t-transparent animate-spin ml-0.5" />
                            ) : isRead ? (
                              <CheckCheck className="w-3 h-3 text-cyan-400" />
                            ) : (
                              <Check className="w-3 h-3 text-slate-500" />
                            )}
                          </span>
                        )}
                      </div>

                      {/* Reactions display badges under bubble */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="absolute -bottom-2 right-2 flex items-center gap-1 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded-full text-[10px] shadow select-none leading-none z-10 scale-95">
                          {Object.values(msg.reactions).map((emoji, idx) => (
                            <span key={idx}>{emoji}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Inline Actions hovering toolbar on Desktop or Active on Mobile */}
                    <div className={`items-center gap-1.5 bg-slate-950 border border-slate-850 px-2 py-1 rounded-xl shadow-2xl absolute -top-8 right-2.5 z-[100] scale-90 select-none transition-all duration-200 ${activeMessageMenuId === msg.id ? 'flex' : 'hidden md:group-hover:flex'}`}>
                      <button type="button" onClick={() => { setReplyTarget(msg); setActiveMessageMenuId(null); }} title="Reply" className="hover:text-cyan-400 cursor-pointer p-0.5 rounded hover:bg-slate-900"><Reply className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => { pinMessage(activeChat.id, msg.id); setActiveMessageMenuId(null); }} title="Pin" className="hover:text-cyan-400 cursor-pointer p-0.5 rounded hover:bg-slate-900"><Pin className="w-3.5 h-3.5" /></button>
                      {isMe && (
                        <>
                          <button type="button" onClick={() => { setEditTarget(msg); setInputText(msg.text); setActiveMessageMenuId(null); }} title="Edit" className="hover:text-cyan-400 cursor-pointer p-0.5 rounded hover:bg-slate-900"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => { deleteMessage(msg.id); setActiveMessageMenuId(null); }} title="Delete" className="hover:text-red-400 cursor-pointer p-0.5 rounded hover:bg-slate-900"><Trash2 className="w-3.5 h-3.5" /></button>
                        </>
                      )}
                      <button type="button" onClick={() => { triggerCopyAction(msg.text); setActiveMessageMenuId(null); }} title="Copy" className="hover:text-cyan-400 cursor-pointer p-0.5 rounded hover:bg-slate-900"><Copy className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => { 
                        // Forward logic: We can copy the message content natively or push to a forward state
                        // Here we just prepare the text with a forward prefix for now to not build a full forward modal
                        setInputText(`[Forwarded from ${msg.senderName}]:\n${msg.text}`); 
                        setActiveMessageMenuId(null);
                      }} title="Forward" className="hover:text-cyan-400 cursor-pointer p-0.5 rounded hover:bg-slate-900"><Forward className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => { 
                        saveMessageToFavorites(msg);
                        setActiveMessageMenuId(null);
                      }} title="Save to Favorites" className="hover:text-cyan-400 cursor-pointer p-0.5 rounded hover:bg-slate-900"><Bookmark className="w-3.5 h-3.5" /></button>
                      
                      {/* Emoji fast reply overlays */}
                      {['❤️', '🔥', '👍', '😂'].map((emoji) => (
                        <button 
                          key={emoji}
                          type="button"
                          onClick={() => {
                            addMessageReaction(msg.id, emoji);
                            setActiveMessageMenuId(null);
                          }}
                          className="hover:scale-125 transition text-xs cursor-pointer px-0.5"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            });

            return elements;
          })()
        )}

        {/* Real-time Dynamic Upload indicator for pending assets */}
        {activeUploadsList.map(([id, progress]) => (
          <div key={id} className="flex gap-2.5 max-w-[80%] ml-auto flex-row-reverse mb-2 shrink-0 select-none items-center">
            <div className="bg-[#152e2a]/95 border border-emerald-500/10 px-4 py-2.5 rounded-2xl text-slate-200 relative shadow-md">
              <div className="flex items-center gap-2.5 text-xs font-mono">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                <span className="font-semibold text-slate-100">{language === 'ru' ? 'Отправка вложения...' : 'Uploading attachment...'} {progress}%</span>
              </div>
              <div className="w-full bg-slate-850 h-1 rounded-full overflow-hidden mt-2 border border-black/10">
                <div className="bg-cyan-400 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {!isAtBottom && paginatedMessages.length > 5 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            className="absolute bottom-20 right-4 md:right-8 z-[60]"
          >
            <button
              onClick={() => scrollToBottom(true)}
              className="bg-slate-800/80 hover:bg-slate-700/90 text-cyan-400 border border-slate-700 p-2.5 rounded-full shadow-xl shadow-black/50 backdrop-blur-md cursor-pointer transition-all active:scale-95"
              title="Jump to bottom"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              {initialUnreadId && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                </span>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating live circular camera preview for video note capturing */}
      <AnimatePresence>
        {isRecordingVideo && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-20 left-12 md:left-[35%] z-[100] p-3 rounded-3xl bg-slate-950/95 border border-cyan-500/25 shadow-2xl flex flex-col items-center select-none"
          >
            {/* Round display frame */}
            <div className="w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden border border-cyan-400 relative bg-black shadow-inner">
              <video 
                ref={videoPreviewRef} 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-full object-cover rounded-full" 
              />
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 bg-rose-600 px-3 py-1 rounded-full text-[9px] font-mono text-white animate-pulse flex items-center gap-1.5 tracking-wider font-extrabold shadow uppercase pb-0.5">
                <span className="w-1.5 h-1.5 bg-white rounded-full" />
                {recordVideoDuration}s
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3 w-full justify-center">
              <button 
                type="button"
                onClick={cancelVideoRecording}
                className="px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-rose-450 hover:text-rose-400 text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-all text-center leading-none"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {language === 'ru' ? 'Отмена' : 'Cancel'}
              </button>
              
              <button 
                type="button"
                onClick={stopVideoRecording}
                className="px-4 py-1.5 rounded-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 text-xs font-extrabold cursor-pointer flex items-center gap-1.5 shadow-lg shadow-cyan-500/10 transition-all leading-none"
              >
                <Send className="w-3.5 h-3.5" />
                {language === 'ru' ? 'Снять и отправить' : 'Send video note'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply or Editing bar notification drafts */}
      <AnimatePresence>
        {(replyTarget || editTarget || selectedDraftFile) && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-6 py-2.5 bg-[#0D0D0E]/95 border-t border-[#1C1C1D] flex justify-between items-center text-xs text-slate-350 shadow z-20 shrink-0"
          >
            <div className="flex items-center gap-2.5 min-w-0 mr-3">
              <CornerUpLeft className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="truncate">
                {editTarget ? (
                  <>
                    <span className="font-bold block text-[10px] text-cyan-400 uppercase tracking-widest">{language === 'ru' ? 'Редактировать сообщение' : 'Edit Message'}</span>
                    <p className="truncate text-slate-400 font-medium font-sans">{editTarget.text}</p>
                  </>
                ) : replyTarget ? (
                  <>
                    <span className="font-bold block text-[10px] text-cyan-400 uppercase tracking-widest">{language === 'ru' ? 'Ответ пользователю' : 'Reply interaction'} &bull; {replyTarget.senderName}</span>
                    <p className="truncate text-slate-400 font-medium font-sans">{replyTarget.text}</p>
                  </>
                ) : selectedDraftFile ? (
                  <>
                    <span className="font-bold block text-[10px] text-cyan-400 uppercase tracking-widest">{language === 'ru' ? 'Прикреплен файл' : 'Attachment drafted'}</span>
                    <p className="truncate text-slate-300 font-mono text-[11px] font-extrabold">{selectedDraftFile.name} ({(selectedDraftFile.size / 1024).toFixed(1)} KB)</p>
                  </>
                ) : null}
              </div>
            </div>
            
            <button 
              type="button" 
              onClick={() => { setEditTarget(null); setReplyTarget(null); setSelectedDraftFile(null); setInputText(''); }} 
              className="text-slate-500 hover:text-slate-300 pointer-events-auto cursor-pointer p-0.5 bg-[#1C1C1D] rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Integrated keyboard trays (Emoji / Stickers pack) */}
      <AnimatePresence>
        {showStickerPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#0B0B0C] border-t border-[#1C1C1D] flex flex-col gap-3 py-3.5 px-6 relative z-30 shadow-2xl overflow-hidden shrink-0"
          >
            {/* Header / Tabs selectors */}
            <div className="flex items-center justify-between border-b border-[#1A1A1E] pb-2 text-xs">
              <div className="flex items-center gap-3 select-none">
                <button 
                  type="button"
                  onClick={() => setStickerTrayTab('emoji')}
                  className={`px-3 py-1 rounded-lg font-bold border transition ${stickerTrayTab === 'emoji' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-[#141416]/80 text-slate-400 border-transparent hover:text-slate-200'}`}
                >
                  😀 {language === 'ru' ? 'Смайлики' : 'Emojis'}
                </button>
                <button 
                  type="button"
                  onClick={() => setStickerTrayTab('stickers')}
                  className={`px-3 py-1 rounded-lg font-bold border transition ${stickerTrayTab === 'stickers' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-[#141416]/80 text-slate-400 border-transparent hover:text-slate-200'}`}
                >
                  🎨 {language === 'ru' ? 'Стикерпак' : 'Stickers'}
                </button>
              </div>
              <button 
                type="button"
                onClick={() => setShowStickerPicker(false)}
                className="text-slate-500 hover:text-slate-350 p-1 bg-slate-900 border border-slate-800 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scrolling View body */}
            <div className="max-h-[190px] overflow-y-auto pr-1 space-y-4 custom-scrollbar select-none">
              {stickerTrayTab === 'emoji' && (
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2.5 p-1">
                  {POPULAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleEmojiInsert(emoji)}
                      className="p-2 bg-slate-950/80 hover:bg-slate-900 hover:scale-130 transition rounded-xl flex items-center justify-center text-lg cursor-pointer border border-[#1A1A1E]"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {stickerTrayTab === 'stickers' && (
                <div className="space-y-4 pt-1">
                  {/* Default Stickers */}
                  <div>
                    <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest block mb-2">
                      {language === 'ru' ? 'Стандартный набор' : 'Default Pack'}
                    </span>
                    <div className="grid grid-cols-5 gap-3.5 sm:grid-cols-7 md:grid-cols-9">
                      {DEFAULT_STICKERS.map((stickUrl, idx) => (
                        <button
                          key={`def-stk-${idx}`}
                          type="button"
                          onClick={() => {
                            sendStickerMessage(stickUrl);
                            setShowStickerPicker(false);
                          }}
                          className="p-1 hover:bg-slate-900 hover:scale-115 rounded-xl transition duration-300 flex items-center justify-center cursor-pointer relative bg-slate-950/20"
                        >
                          <img src={stickUrl} alt="Sticker illustration" className="w-12 h-12 object-contain" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* My Stickers */}
                  <div className="border-t border-[#1C1C1D] pt-3.5">
                    <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest leading-none mb-1 flex items-center justify-between">
                      <span>{language === 'ru' ? 'Пользовательские стикеры' : 'Custom Stickers'}</span>
                      {uploadingSticker && (
                        <span className="text-[9px] text-cyan-400 font-mono tracking-wider animate-pulse uppercase">
                          {language === 'ru' ? 'загрузка...' : 'uploading...'}
                        </span>
                      )}
                    </span>

                    <div className="grid grid-cols-5 gap-3.5 sm:grid-cols-7 md:grid-cols-9 pt-2">
                      {/* Upload Card */}
                      <label className="aspect-square flex flex-col items-center justify-center border border-dashed border-slate-800 hover:border-cyan-500 bg-slate-950 hover:bg-slate-900 rounded-xl cursor-pointer p-2 transition text-slate-500 hover:text-cyan-400 min-h-[64px] relative">
                        <Plus className="w-5 h-5 mb-1" />
                        <span className="text-[8px] font-mono font-bold tracking-wider text-center block uppercase">
                          {uploadingSticker ? '...' : (language === 'ru' ? 'Загрузить' : 'Select')}
                        </span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleCustomStickerUpload} 
                          className="hidden" 
                          disabled={uploadingSticker} 
                        />
                      </label>

                      {userProfile?.stickers?.map((stickUrl, idx) => (
                        <button
                          key={`cust-stk-${idx}`}
                          type="button"
                          onClick={() => {
                            sendStickerMessage(stickUrl);
                            setShowStickerPicker(false);
                          }}
                          className="p-1 hover:bg-slate-900 hover:scale-115 rounded-xl transition duration-300 flex items-center justify-center cursor-pointer relative bg-slate-950/20"
                        >
                          <img src={stickUrl} alt="Custom user sticker" className="w-12 h-12 object-contain" />
                        </button>
                      ))}

                      {(!userProfile?.stickers || userProfile.stickers.length === 0) && (
                        <div className="col-span-4 sm:col-span-6 md:col-span-8 flex items-center text-[10px] font-mono text-slate-550 pl-2 italic">
                          {t.noCustomStickers}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Composer Bottom Input Area bar */}
      <div className="p-2 md:p-3.5 border-t border-white/[0.04] z-20 shrink-0 pb-safe-bottom shadow-2xl relative backdrop-blur-md" style={{ background: 'var(--glass-header-bg)' }}>
        <div className="max-w-4xl mx-auto flex items-end gap-2 relative">
          
          {/* Floating Expandable Attachment Dropdown Menu */}
          <AnimatePresence>
            {showAttachmentDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-12 right-2 z-40 border border-white/5 rounded-2xl shadow-2xl p-2 min-w-[215px] space-y-1 text-slate-200 select-none animate-fade-in glass-panel backdrop-blur-lg"
                style={{ background: 'var(--glass-modal-bg)' }}
              >
                <div className="text-[9px] uppercase font-mono font-bold tracking-widest text-[var(--glass-accent)] px-2 pb-1.5 border-b border-white/[0.04]">
                  {language === 'ru' ? 'Действия и вложения' : 'Actions & Assets'}
                </div>

                {/* A. Document Upload */}
                <label className="flex items-center gap-3 px-2.5 py-1.5 hover:bg-white/[0.04] rounded-xl cursor-pointer text-xs font-semibold hover:text-[var(--glass-accent)] transition-all">
                  <span className="text-sm shrink-0">📁</span>
                  <div>
                    <span className="leading-tight block">{language === 'ru' ? 'Загрузить файл' : 'Upload File'}</span>
                    <span className="text-[8px] text-slate-500 font-normal leading-none block mt-0.5">{language === 'ru' ? 'Документы, фото, видео' : 'Docs, images, videos'}</span>
                  </div>
                  <input type="file" onChange={(e) => { handleImmediateFileUpload(e); setShowAttachmentDropdown(false); }} className="hidden" />
                </label>

                {/* B. Camera Circular note */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachmentDropdown(false);
                    if (isRecordingVideo) {
                      stopVideoRecording();
                    } else {
                      startVideoRecording();
                    }
                  }}
                  className="w-full text-left flex items-center gap-3 px-2.5 py-1.5 hover:bg-white/[0.04] rounded-xl cursor-pointer text-xs font-semibold hover:text-[var(--glass-accent)] transition-all font-sans"
                >
                  <span className="text-sm shrink-0">📹</span>
                  <div>
                    <span className="leading-tight block">{language === 'ru' ? 'Записать кружочек' : 'Circular Video'}</span>
                    <span className="text-[8px] text-slate-500 font-normal leading-none block mt-0.5">{language === 'ru' ? 'Видеосообщение' : 'Video note message'}</span>
                  </div>
                </button>

                {/* C. Create Poll */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachmentDropdown(false);
                    setShowPollCreator(true);
                  }}
                  className="w-full text-left flex items-center gap-3 px-2.5 py-1.5 hover:bg-white/[0.04] rounded-xl cursor-pointer text-xs font-semibold hover:text-[var(--glass-accent)] transition-all font-sans"
                >
                  <span className="text-sm shrink-0">📊</span>
                  <div>
                    <span className="leading-tight block">{language === 'ru' ? 'Создать опрос' : 'Create Poll'}</span>
                    <span className="text-[8px] text-slate-500 font-normal leading-none block mt-0.5">{language === 'ru' ? 'Интерактивное голосование' : 'Interactive group voting'}</span>
                  </div>
                </button>

                {/* D. Silent Mode Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setIsSilent(!isSilent);
                    setShowAttachmentDropdown(false);
                  }}
                  className="w-full text-left flex items-center gap-3 px-2.5 py-1.5 hover:bg-white/[0.04] rounded-xl cursor-pointer text-xs font-semibold hover:text-[var(--glass-accent)] transition-all font-sans"
                >
                  <span className="text-sm shrink-0">{isSilent ? '🔔' : '🔕'}</span>
                  <div>
                    <span className="leading-tight block font-sans">
                      {isSilent 
                        ? (language === 'ru' ? 'Включить звук' : 'Send with Audio') 
                        : (language === 'ru' ? 'Отправить без звука' : 'Send Silently')
                      }
                    </span>
                    <span className="text-[8px] text-slate-500 font-normal leading-none block mt-0.5 animate-pulse font-mono">
                      {isSilent
                        ? (language === 'ru' ? 'Обычная отправка' : 'Notify with sound')
                        : (language === 'ru' ? 'Без звука получателя' : 'No push notification sound')
                      }
                    </span>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Transparent full-screen holding overlay to detect swipes & gestures cleanly */}
          {recordingState === 'holding' && (
            <div 
              className="fixed inset-0 z-[9999] cursor-grabbing bg-black/10 backdrop-blur-[0.5px] select-none touch-none"
              onMouseMove={(e) => handleRecordMove(e.clientX, e.clientY)}
              onTouchMove={(e) => {
                const touch = e.touches[0];
                handleRecordMove(touch.clientX, touch.clientY);
              }}
              onMouseUp={handleRecordRelease}
              onTouchEnd={handleRecordRelease}
            />
          )}

          {/* Unified capsule style composer block */}
          <form onSubmit={handleMessageSend} className="flex-1 flex items-center gap-1.5 relative">
            {voicePreviewBlob ? (
              <div className="flex-1 flex items-center justify-between bg-black/45 hover:bg-black/55 border border-white/5 px-3 py-1.5 rounded-full text-xs text-slate-100 font-semibold shadow-inner select-none gap-2 min-h-[46px] animate-fade-in-up md:p-2 backdrop-blur-md">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <div className="text-[var(--glass-accent)] font-semibold text-[10px] uppercase font-mono px-1.5 shrink-0 hidden sm:block">
                    {language === 'ru' ? 'Черновик' : 'Draft'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <AudioWavePlayer src={voicePreviewUrl || ''} duration={voicePreviewDuration} />
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0 pr-1">
                  {/* Delete / Discard */}
                  <button 
                    type="button" 
                    onClick={resetRecordingState}
                    className="p-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-full text-[10px] font-mono cursor-pointer transition-all border border-rose-500/15"
                    title={language === 'ru' ? 'Удалить черновик' : 'Discard draft'}
                  >
                    {language === 'ru' ? 'Удалить' : 'Delete'}
                  </button>
                  {/* Send previewed note */}
                  <button 
                    type="button" 
                    onClick={sendPreviewVoiceMessage}
                    className="p-2 bg-[var(--glass-accent)] text-white hover:opacity-95 rounded-full text-[10px] font-semibold cursor-pointer transition-all flex items-center justify-center h-8 w-8"
                    title={language === 'ru' ? 'Отправить голосовое сообщение' : 'Send Voice Note'}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : isRecording ? (
              <div className="flex flex-1 items-center justify-between bg-[#0B0B0D]/95 md:bg-black/45 md:border border-white/5 px-2 md:px-3 py-1.5 rounded-full text-xs text-slate-100 font-semibold shadow-inner select-none min-h-[46px] animate-fade-in-up md:p-2 backdrop-blur-md gap-3">
                {/* 1. Header Row (especially on mobile) with indicators and status */}
                <div className="flex items-center justify-between md:justify-start gap-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                    </span>
                    <span className="font-bold text-rose-500 font-mono tracking-wider text-[11px] uppercase">
                      {language === 'ru' ? 'ЗАПИСЬ' : 'REC'}
                    </span>
                  </div>

                  <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
                    {recordingState === 'holding' 
                      ? (language === 'ru' ? 'Удерживание' : 'Holding') 
                      : (language === 'ru' ? 'Закреплено' : 'Locked')}
                  </div>
                </div>

                {/* 2. Waveform inside the middle area */}
                <div className="flex-1 flex gap-[3px] items-center justify-center px-1 overflow-hidden min-h-[22px] max-w-[140px] md:max-w-xs mx-auto">
                  {recordingAmplitudes.length === 0 ? (
                    [6, 12, 18, 12, 6, 8, 14, 18, 10, 6, 12, 16, 9, 5].map((h, idx) => (
                      <span key={idx} className="w-0.5 bg-rose-500/50 rounded-full" style={{ height: `${h}px` }} />
                    ))
                  ) : (
                    recordingAmplitudes.map((amp, idx) => (
                      <span key={idx} className="w-0.5 bg-rose-500/80 rounded-full transition-all duration-75" style={{ height: `${amp}px` }} />
                    ))
                  )}
                </div>

                {/* 3. Timer & Controls Row */}
                <div className="flex items-center justify-between md:justify-end gap-2 px-1">
                  <div className="font-mono text-xs text-rose-400 bg-rose-950/40 border border-rose-500/10 px-2.5 py-1 rounded-lg">
                    {Math.floor(recordDuration / 60)}:{(recordDuration % 60).toString().padStart(2, '0')}
                  </div>

                  {/* Complete interactive controls grouping */}
                  <div className="flex items-center gap-1.5">
                    {/* Discard trash button */}
                    <button 
                      type="button" 
                      onClick={cancelRecording}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl cursor-pointer transition-all border border-rose-500/15 flex items-center gap-1.5 text-[11px] font-bold"
                      title={language === 'ru' ? 'Удалить запись' : 'Cancel recording'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{language === 'ru' ? 'Удалить' : 'Delete'}</span>
                    </button>
                    
                    {/* Stop and Review/Preview button */}
                    <button 
                      type="button" 
                      onClick={() => {
                        shouldSendOnStopRef.current = false;
                        stopRecording();
                      }}
                      className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/15 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 text-[11px] font-bold"
                      title={language === 'ru' ? 'Остановить запись и прослушать' : 'Stop and review'}
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{language === 'ru' ? 'Слушать' : 'Stop'}</span>
                    </button>

                    {/* Send direct button */}
                    <button 
                      type="button" 
                      onClick={() => {
                        shouldSendOnStopRef.current = true;
                        stopRecording();
                      }}
                      className="p-2 bg-[var(--glass-accent)] text-white hover:opacity-95 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 font-bold text-[11px]"
                      title={language === 'ru' ? 'Отправить голосовое' : 'Send voice note'}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{language === 'ru' ? 'Отправить' : 'Send'}</span>
                    </button>
                  </div>
                </div>

                {/* Gesture Swipe Lock indicator tooltip in holding mode */}
                {recordingState === 'holding' && (
                  <div className="absolute inset-x-0 -top-8 flex justify-center pointer-events-none animate-pulse">
                    <div className="bg-slate-900/95 text-[9px] text-[var(--glass-accent)] border border-cyan-500/15 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-lg backdrop-blur-md">
                      <Lock className="w-2.5 h-2.5" />
                      <span>{language === 'ru' ? 'Свайп вверх ⬆️ для фиксации или влево ⬅️ для отмены' : 'Swipe up ⬆️ to lock or left ⬅️ to cancel'}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 bg-black/15 hover:bg-black/25 focus-within:bg-black/30 border border-white/5 rounded-full px-3.5 py-1.5 flex items-center gap-2 min-h-[38px] transition-all focus-within:border-[var(--glass-border-focus)] shadow-inner">
                
                {/* 1. Smile Sticker picker */}
                <button
                  type="button"
                  onClick={() => setShowStickerPicker(!showStickerPicker)}
                  className={`text-slate-400 hover:text-[var(--glass-accent)] transition cursor-pointer shrink-0`}
                  title={language === 'ru' ? 'Выбрать стикер/эмодзи' : t.chooseSticker}
                >
                  <Smile className="w-4.5 h-4.5" />
                </button>

                {/* 2. Compact text input Area */}
                <TextareaAutosize 
                  ref={inputRef as any}
                  value={inputText}
                  disabled={cooldownRemaining > 0}
                  maxRows={5}
                  onChange={(e) => {
                    handleInputChange(e.target.value);
                    if (activeChat) sendTypingStatus(activeChat.id);
                  }}
                  onKeyDown={handleKeyDown}
                  onPaste={(e) => {
                    if (e.clipboardData.files && e.clipboardData.files[0]) {
                      const file = e.clipboardData.files[0];
                      setSelectedDraftFile(file);
                      e.preventDefault();
                    }
                  }}
                  placeholder={
                    cooldownRemaining > 0 
                      ? (language === 'ru' ? `Медленный режим: Подождите ${cooldownRemaining}с...` : `Slow Mode: Wait ${cooldownRemaining}s...`)
                      : editTarget 
                        ? (language === 'ru' ? "Изменить..." : "Change text...") 
                        : (language === 'ru' ? "Cообщение..." : "Message...")
                  }
                  className="flex-1 bg-transparent text-slate-100 text-sm focus:outline-none placeholder-slate-650 min-h-[20px] outline-none disabled:opacity-50 resize-none overflow-y-auto custom-scrollbar my-1 py-1"
                />

                {/* 3. Dropdown trigger action menu button and File Picker */}
                <button 
                  type="button"
                  disabled={cooldownRemaining > 0}
                  onClick={() => setShowAttachmentDropdown(!showAttachmentDropdown)}
                  className={`hover:text-[var(--glass-accent)] transition cursor-pointer shrink-0 disabled:opacity-30 ${showAttachmentDropdown ? 'text-[var(--glass-accent)]' : 'text-slate-400'}`}
                  title={language === 'ru' ? 'Прикрепить файл или действие' : 'Attachment & actions'}
                >
                  <Paperclip className="w-4.5 h-4.5" />
                </button>
              </div>
            )}

            {/* Flight Send command or voice message recorder key (adjacent round button) */}
            {!voicePreviewBlob && !isRecording && (
              <div className="shrink-0 animate-fade-in">
                {cooldownRemaining > 0 ? (
                  <button
                    type="button"
                    disabled
                    className="p-2 bg-slate-900/40 border border-slate-800/80 rounded-full text-amber-500 shrink-0 transition-all shadow-md h-9 w-9 flex items-center justify-center"
                    title={language === 'ru' ? `Медленный режим: Подождите еще ${cooldownRemaining}с` : `Slow Mode: Wait ${cooldownRemaining}s`}
                  >
                    <Clock className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
                  </button>
                ) : inputText.trim() || selectedDraftFile ? (
                  <button 
                    type="submit" 
                    disabled={!inputText.trim() && !selectedDraftFile}
                    className="p-2 bg-[var(--glass-accent)] hover:opacity-90 disabled:opacity-30 rounded-full text-white font-bold shadow-lg flex items-center justify-center h-9 w-9 transition-all border border-white/10 cursor-pointer active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      startRecording(e.clientX, e.clientY);
                    }}
                    onTouchStart={(e) => {
                      if (document.activeElement instanceof HTMLElement) {
                        document.activeElement.blur();
                      }
                      const touch = e.touches[0];
                      startRecording(touch.clientX, touch.clientY);
                    }}
                    className="p-2 bg-black/15 border border-white/5 hover:bg-black/25 rounded-full text-[var(--glass-accent)] hover:text-rose-500 shrink-0 transition-all shadow-md cursor-pointer select-none h-9 w-9 flex items-center justify-center active:scale-95"
                    title={language === 'ru' ? 'Удерживайте для записи голоса' : 'Hold to Record Audio'}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Poll Creator Portal Overlay */}
      {showPollCreator && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="w-full max-w-sm bg-[#0E0E10] border border-slate-850 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span className="font-bold text-slate-205 text-sm flex items-center gap-1.5">📊 {language === 'ru' ? 'Создать новый опрос' : 'Create Poll'}</span>
              <button type="button" onClick={() => setShowPollCreator(false)} className="text-slate-500 hover:text-slate-300 cursor-pointer text-sm font-bold bg-[#1A1A1E] px-2 py-0.5 rounded-md">✕</button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1">{language === 'ru' ? 'Вопрос опроса' : 'Question title'}</label>
                <input 
                  type="text" 
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder={language === 'ru' ? 'Введите вопрос опроса...' : 'Enter question...'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1">{language === 'ru' ? 'Варианты ответов (через запятую)' : 'Answers options (separated by comma)'}</label>
                <textarea 
                  value={pollOptionsInput}
                  onChange={(e) => setPollOptionsInput(e.target.value)}
                  placeholder={language === 'ru' ? 'Черный, Белый, Серый' : 'Choice A, Choice B, Choice C'}
                  className="w-full h-16 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-220 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-3.5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-450">
                  <input 
                    type="checkbox"
                    checked={pollIsMultiple}
                    onChange={(e) => setPollIsMultiple(e.target.checked)}
                    className="rounded border-slate-800 text-cyan-500 focus:ring-0 cursor-pointer bg-slate-950"
                  />
                  <span>{language === 'ru' ? 'Выбор нескольких' : 'Multiple selection'}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-450">
                  <input 
                    type="checkbox"
                    checked={pollIsAnonymous}
                    onChange={(e) => setPollIsAnonymous(e.target.checked)}
                    className="rounded border-slate-800 text-cyan-500 focus:ring-0 cursor-pointer bg-slate-950"
                  />
                  <span>{language === 'ru' ? 'Анонимно' : 'Anonymous'}</span>
                </label>
              </div>
            </div>

            <button 
              type="button"
              onClick={async () => {
                if (!pollQuestion.trim() || !pollOptionsInput.trim()) return;
                const opts = pollOptionsInput.split(',').map(s => s.trim()).filter(Boolean);
                if (opts.length < 2) {
                  alert(language === 'ru' ? 'Пожалуйста, введите как минимум 2 варианта ответа!' : 'Enter at least 2 distinct options!');
                  return;
                }
                await sendPollMessage(pollQuestion.trim(), opts, pollIsAnonymous, pollIsMultiple);
                setPollQuestion('');
                setPollOptionsInput('');
                setShowPollCreator(false);
                setTimeout(() => scrollContainerRef.current?.scrollTo({ top: 9999999 }), 200);
              }}
              className="w-full py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shrink-0 cursor-pointer"
            >
              🚀 {language === 'ru' ? 'Выпустить опрос в эфир' : 'Publish interactive poll'}
            </button>
          </div>
        </div>
      )}

      {/* Selected Image Fullscreen Modal Viewer */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur z-[200] flex items-center justify-center p-2 sm:p-4 select-none cursor-zoom-out"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition cursor-pointer z-10 border border-white/10"
            title={language === 'ru' ? 'Закрыть' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
          
          <img 
            src={selectedImage} 
            alt="Fullscreen preview" 
            className="max-w-full max-h-full object-contain cursor-default" 
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={() => setSelectedImage(null)} 
          />
        </div>
      )}

      {/* Selected User Full Profile Modal Viewer */}
      {selectedUserProfile && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm glass-panel text-slate-100 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col relative animate-scale-up" style={{ background: 'var(--glass-sidebar-bg)' }}>
            
            {/* Upper cover area */}
            <div className="h-24 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-purple-500/10 border-b border-white/5 relative shrink-0">
              <button 
                onClick={() => setSelectedUserProfile(null)}
                className="absolute top-3.5 right-3.5 p-1 bg-black/35 hover:bg-black/55 text-slate-350 hover:text-white rounded-full transition cursor-pointer"
                title={language === 'ru' ? 'Закрыть' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Avatar overlay */}
            <div className="flex flex-col items-center px-6 -mt-12 pb-6 relative">
              <div className="relative">
                <img 
                  src={selectedUserProfile.photoURL} 
                  alt={selectedUserProfile.displayName} 
                  className="w-24 h-24 rounded-full border-4 border-slate-950/40 object-cover shadow-2xl relative bg-slate-950" 
                />
                {selectedUserProfile.emojiStatus && (
                  <span className="absolute bottom-0 right-0 w-7 h-7 bg-black/75 border border-white/15 rounded-full flex items-center justify-center text-xs shadow-lg animate-bounce" style={{ animationDuration: '3s' }}>
                    {selectedUserProfile.emojiStatus}
                  </span>
                )}
              </div>

              <div className="font-semibold text-lg text-slate-100 mt-3 text-center flex items-center justify-center gap-1.5 leading-tight">
                {selectedUserProfile.displayName}
              </div>
              <div className="text-xs font-mono text-cyan-400 mt-1">@{selectedUserProfile.username}</div>
              
              {/* Online indicator */}
              <div className="mt-2.5 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${onlineUsers[selectedUserProfile.uid] === 'online' ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                  {onlineUsers[selectedUserProfile.uid] === 'online' 
                    ? (language === 'ru' ? 'Онлайн' : 'Online') 
                    : (selectedUserProfile.lastSeen 
                        ? `${language === 'ru' ? 'Был(а) в сети:' : 'Last Seen:'} ${new Date(selectedUserProfile.lastSeen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` 
                        : (language === 'ru' ? 'Офлайн' : 'Offline'))}
                </span>
              </div>

              {/* Status & Biography cards */}
              <div className="w-full mt-5 space-y-3.5 text-xs">
                {selectedUserProfile.statusMessage && (
                  <div className="p-3 bg-black/15 rounded-2xl border border-white/5">
                    <span className="block text-[9px] font-mono text-slate-405 uppercase tracking-wider mb-1">{language === 'ru' ? 'Текущий статус' : 'Current Status'}</span>
                    <span className="text-slate-200">{selectedUserProfile.statusMessage}</span>
                  </div>
                )}

                <div className="p-3 bg-black/15 rounded-2xl border border-white/5 space-y-2">
                  <div>
                    <span className="block text-[9px] font-mono text-slate-405 uppercase tracking-wider mb-0.5">{language === 'ru' ? 'О себе (Bio)' : 'Biography'}</span>
                    <span className="text-slate-305 italic">{selectedUserProfile.bio || '—'}</span>
                  </div>
                  
                  {/* Subject to privacy settings (If they don't hide it) */}
                  {selectedUserProfile.phoneNumber && selectedUserProfile.privacySettings?.phoneNumber !== 'nobody' && (
                    <div className="pt-2 border-t border-white/[0.03] flex justify-between items-center">
                      <span className="text-slate-450">{language === 'ru' ? 'Телефон' : 'Phone'}</span>
                      <span className="font-mono text-slate-200">{selectedUserProfile.phoneNumber}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/[0.03] flex justify-between items-center text-[10px] font-mono text-slate-500">
                    <span>{language === 'ru' ? 'Регистрация' : 'Registered'}</span>
                    <span>{selectedUserProfile.createdAt ? new Date(selectedUserProfile.createdAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Action operations buttons */}
              <div className="w-full grid grid-cols-2 gap-2 mt-5 text-xs font-mono">
                {selectedUserProfile.uid !== currentUser?.uid ? (
                  <>
                    <button
                      onClick={async () => {
                        try {
                          const directChat = await createDirectChat(selectedUserProfile);
                          setActiveChat(directChat);
                          setSelectedUserProfile(null);
                        } catch (err: any) {
                          alert(language === 'ru' ? 'Ошибка начала чата: ' + err.message : 'Error starting chat: ' + err.message);
                        }
                      }}
                      className="py-2.5 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-xl transition duration-150 active:scale-95 text-center cursor-pointer"
                    >
                      💬 {language === 'ru' ? 'Чат' : 'Message'}
                    </button>

                    <button
                      onClick={async () => {
                        try {
                          await addContactByUsername(selectedUserProfile.username);
                          alert(language === 'ru' ? 'Пользователь добавлен в контакты!' : 'User added to contacts!');
                          // Toggle component refresh
                          const refreshedProfileSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', selectedUserProfile.uid)));
                          if (!refreshedProfileSnap.empty) {
                            setSelectedUserProfile(refreshedProfileSnap.docs[0].data() as UserProfile);
                          }
                        } catch (err: any) {
                          alert(err.message);
                        }
                      }}
                      disabled={userProfile?.contacts?.includes(selectedUserProfile.uid)}
                      className={`py-2.5 rounded-xl border font-bold transition duration-150 active:scale-95 text-center cursor-pointer ${
                        userProfile?.contacts?.includes(selectedUserProfile.uid)
                          ? 'bg-transparent border-white/5 text-slate-500 cursor-not-allowed'
                          : 'bg-black/25 hover:bg-black/35 border-white/10 text-slate-300'
                      }`}
                    >
                      👤 {userProfile?.contacts?.includes(selectedUserProfile.uid) ? (language === 'ru' ? 'В контактах' : 'Is Contact') : (language === 'ru' ? 'В контакты' : 'Add Contact')}
                    </button>
                  </>
                ) : (
                  <div className="col-span-2 text-center text-slate-500 text-[10px] uppercase font-mono italic p-2 tracking-wider bg-black/10 rounded-xl border border-white/5">
                    {language === 'ru' ? 'Это ваш публичный профиль' : 'This is your public profile'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Context Menu Bottom Sheet */}
      <AnimatePresence>
        {activeMenuMessage && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed flex md:hidden inset-0 bg-black/60 z-[150] touch-none"
              onClick={() => setActiveMessageMenuId(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[160] bg-slate-900 border-t border-slate-800 rounded-t-3xl p-4 flex md:hidden flex-col shadow-2xl pb-safe"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(e, info) => {
                if (info.offset.y > 60) setActiveMessageMenuId(null);
              }}
            >
              <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4" />
              
              <div className="flex gap-4 justify-around mb-6 text-2xl bg-black/20 p-3 rounded-2xl border border-white/5">
                {['❤️', '🔥', '👍', '😂', '😢', '😡'].map((emoji) => (
                   <button 
                     key={emoji}
                     onClick={() => {
                       addMessageReaction(activeMenuMessage.id, emoji);
                       setActiveMessageMenuId(null);
                     }}
                     className="hover:scale-125 transition cursor-pointer active:scale-95"
                   >
                     {emoji}
                   </button>
                ))}
              </div>

              <div className="flex flex-col gap-1.5">
                <button 
                  onClick={() => { setReplyTarget(activeMenuMessage); setActiveMessageMenuId(null); }}
                  className="flex items-center gap-3 w-full p-3.5 bg-slate-800/40 hover:bg-slate-800 rounded-xl text-left text-sm font-semibold active:scale-95 transition"
                >
                  <Reply className="w-5 h-5 text-cyan-400" />
                  {language === 'ru' ? 'Ответить' : 'Reply'}
                </button>

                <button 
                  onClick={() => { triggerCopyAction(activeMenuMessage.text); setActiveMessageMenuId(null); }}
                  className="flex items-center gap-3 w-full p-3.5 bg-slate-800/40 hover:bg-slate-800 rounded-xl text-left text-sm font-semibold active:scale-95 transition"
                >
                  <Copy className="w-5 h-5 text-cyan-400" />
                  {language === 'ru' ? 'Копировать' : 'Copy'}
                </button>

                {activeMenuMessage.senderId === currentUser?.uid && (
                  <>
                    <button 
                      onClick={() => { setEditTarget(activeMenuMessage); setInputText(activeMenuMessage.text); setActiveMessageMenuId(null); }}
                      className="flex items-center gap-3 w-full p-3.5 bg-slate-800/40 hover:bg-slate-800 rounded-xl text-left text-sm font-semibold active:scale-95 transition"
                    >
                      <Edit2 className="w-5 h-5 text-cyan-400" />
                      {language === 'ru' ? 'Изменить' : 'Edit'}
                    </button>
                    <button 
                      onClick={() => { deleteMessage(activeMenuMessage.id); setActiveMessageMenuId(null); }}
                      className="flex items-center gap-3 w-full p-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-left text-sm font-semibold active:scale-95 transition"
                    >
                      <Trash2 className="w-5 h-5" />
                      {language === 'ru' ? 'Удалить' : 'Delete'}
                    </button>
                  </>
                )}
                
                <button 
                  onClick={() => { saveMessageToFavorites(activeMenuMessage); setActiveMessageMenuId(null); }}
                  className="flex items-center gap-3 w-full p-3.5 bg-slate-800/40 hover:bg-slate-800 rounded-xl text-left text-sm font-semibold active:scale-95 transition"
                >
                  <Bookmark className="w-5 h-5 text-cyan-400" />
                  {language === 'ru' ? 'В избранное' : 'Save to Favorites'}
                </button>

                <button 
                  onClick={() => { pinMessage(activeChat?.id || '', activeMenuMessage.id); setActiveMessageMenuId(null); }}
                  className="flex items-center gap-3 w-full p-3.5 bg-slate-800/40 hover:bg-slate-800 rounded-xl text-left text-sm font-semibold active:scale-95 transition"
                >
                  <Pin className="w-5 h-5 text-cyan-400" />
                  {language === 'ru' ? 'Закрепить' : 'Pin'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
