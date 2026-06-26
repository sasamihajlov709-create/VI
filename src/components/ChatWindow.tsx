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
  FileText,
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
  UserPlus,
  Globe,
  ThumbsUp,
  RefreshCw,
  Zap,
  ChevronLeft,
  ChevronDown,
  BarChart3,
  Bell,
  BellOff,
  MoreVertical,
  ShieldCheck,
  ShieldAlert,
  Eraser,
  Share2
} from 'lucide-react';
import { useMessenger } from '../context/MessengerContext';
import { useLanguage } from '../context/LanguageContext';
import { Message, UserProfile } from '../types';
import { logger } from '../lib/logger';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import TextareaAutosize from 'react-textarea-autosize';
import confetti from 'canvas-confetti';
import { playBubbleReactionSound, playTapSound, playUnlockSound, playLockSound, playErrorSound } from '../utils/audioEffects';

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

const formatMarkdownText = (text: string, searchQuery?: string) => {
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

  if (searchQuery && searchQuery.trim()) {
    try {
      const q = searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(${q})`, 'gi');
      escaped = escaped.replace(regex, '<mark class="bg-cyan-500/35 text-white font-semibold px-0.5 rounded-sm border-b border-cyan-400">$1</mark>');
    } catch (e) {}
  }
  
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

interface ScrapeResult {
  title: string;
  description: string;
  image: string;
  url: string;
}

const detectUrl = (text: string): string | null => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s<>'"]+(?:\([^\s()<>']+\)|[^\s()<>'".,;?!:]))/i;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
};

const LinkPreview: React.FC<{ text: string }> = ({ text }) => {
  const [preview, setPreview] = useState<ScrapeResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const url = detectUrl(text);

  useEffect(() => {
    if (!url) {
      setPreview(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setHasError(false);

    fetch(`/api/metadata/scrape?url=${encodeURIComponent(url)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Scrape failed");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          if (data && (data.title || data.description || data.image)) {
            setPreview(data);
          } else {
            setHasError(true);
          }
        }
      })
      .catch((err) => {
        console.warn("Link preview scraping error:", err);
        if (isMounted) {
          setHasError(true);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [url]);

  if (!url || hasError) return null;

  if (loading) {
    return (
      <div className="mt-2 p-2.5 rounded-lg bg-black/30 border border-white/5 flex items-center gap-3 animate-pulse max-w-sm">
        <div className="w-10 h-10 rounded-md bg-white/5 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-2.5 w-1/3 rounded bg-white/10" />
          <div className="h-2 w-2/3 rounded bg-white/5" />
        </div>
      </div>
    );
  }

  if (!preview) return null;

  let hostname = '';
  try {
    hostname = new URL(preview.url).hostname.replace('www.', '');
  } catch (_) {
    hostname = 'link';
  }

  return (
    <a 
      href={preview.url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="mt-2 block rounded-lg bg-black/40 hover:bg-black/60 border border-white/5 overflow-hidden transition-all duration-200 cursor-pointer group shadow-sm max-w-md"
    >
      <div className="flex flex-col xs:flex-row">
        {preview.image && (
          <div className="w-full xs:w-[100px] aspect-video xs:aspect-square shrink-0 relative overflow-hidden border-b xs:border-b-0 xs:border-r border-white/5 bg-black/30 flex items-center justify-center">
            <img 
              src={preview.image} 
              alt={preview.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="p-2.5 flex flex-col justify-center min-w-0 flex-1">
          <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-wider font-bold mb-0.5 block truncate">
            {hostname}
          </span>
          <h4 className="text-xs font-semibold text-slate-200 leading-snug line-clamp-1 mb-0.5 group-hover:text-cyan-400 transition-colors">
            {preview.title}
          </h4>
          {preview.description && (
            <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed font-sans font-light">
              {preview.description}
            </p>
          )}
        </div>
      </div>
    </a>
  );
};

// Format millisecond duration into m:ss format (e.g. 0:19)
const formatVideoNoteTime = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// Helper components for inline players to preserve reactive focus and layout isolation
const CircularVideoNote: React.FC<{ src: string, status?: string, isMe?: boolean }> = ({ src, status, isMe }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress(video.currentTime / video.duration);
        setCurrentTime(video.currentTime * 1000);
      }
    };

    const handleCanPlay = () => {
      if (playing) {
        video.play().catch(() => {
          setPlaying(false);
        });
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('canplay', handleCanPlay);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [playing]);

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
        setPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setPlaying(true);
      }
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(videoRef.current.muted);
    }
  };

  return (
    <div 
      onClick={handleVideoClick}
      className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full overflow-hidden border border-white/10 bg-black cursor-pointer shadow-2xl my-1 group shrink-0"
    >
      <video 
        ref={videoRef}
        src={src || undefined} 
        loop 
        muted={muted} 
        playsInline 
        autoPlay 
        crossOrigin="anonymous"
        className="w-full h-full object-cover rounded-full" 
      />
      
      <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
        <circle 
          cx="50" 
          cy="50" 
          r="49" 
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="2" 
          fill="transparent" 
        />
        <circle 
          cx="50" 
          cy="50" 
          r="49" 
          stroke="var(--glass-accent, #9d7cf6)"
          strokeWidth="2" 
          fill="transparent" 
          strokeDasharray={2 * Math.PI * 49}
          strokeDashoffset={2 * Math.PI * 49 * (1 - progress)}
          className="transition-all duration-100 ease-linear"
        />
      </svg>

      <div className={`absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-300 ${playing ? 'opacity-0' : 'opacity-100'}`}>
        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
          <Play className="w-7 h-7 text-white fill-white ml-1" />
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm text-[10px] text-white/90 z-20 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
        <span>{formatVideoNoteTime(currentTime)}</span>
        <div className="flex items-center">
          {status === 'read' ? (
            <CheckCheck className="w-3.5 h-3.5 text-[#9d7cf6]" />
          ) : (
            <Check className="w-3.5 h-3.5 text-white/70" />
          )}
        </div>
      </div>

      <button 
        type="button"
        onClick={toggleMute}
        className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/10 text-xs shadow-md transition-all active:scale-90 z-30 opacity-0 group-hover:opacity-100"
        title={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX className="w-4.5 h-4.5 text-slate-300" /> : <Volume2 className="w-4.5 h-4.5 text-cyan-400" />}
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
      <audio ref={audioRef} src={src || undefined} preload="metadata" />
      
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
import { useVisualViewport } from '../hooks/useVisualViewport';

export const ChatWindow: React.FC = () => {
  const { height: viewportHeight, offset: viewportOffset } = useVisualViewport();
  const { 
    currentUser, 
    userProfile,
    activeChat, 
    chats,
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
    deleteChat,
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
    onlineUsers,
    forwardingMessage,
    setForwardingMessage,
    isKeyboardOpen
  } = useMessenger();

  const { t, language } = useLanguage();

  const [showThreeDotMenu, setShowThreeDotMenu] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [showChatSettings, setShowChatSettings] = useState(false);
  
  // Floating menu position
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
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

  const handleTriggerReaction = (messageId: string, emoji: string) => {
    playBubbleReactionSound();
    
    // Play tailored confetti on specific emoji clicks!
    try {
      if (emoji === '🎉') {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.85 },
          colors: ['#f472b6', '#fbbf24', '#34d399', '#22d3ee', '#818cf8']
        });
      } else if (emoji === '❤️') {
        confetti({
          particleCount: 60,
          spread: 45,
          origin: { y: 0.85 },
          colors: ['#f43f5e', '#ec4899', '#fda4af']
        });
      } else if (emoji === '🔥') {
        confetti({
          particleCount: 65,
          spread: 50,
          origin: { y: 0.85 },
          colors: ['#f97316', '#ef4444', '#eab308']
        });
      } else if (emoji === '🚀') {
        confetti({
          particleCount: 70,
          spread: 55,
          origin: { y: 0.85 },
          colors: ['#a855f7', '#3b82f6', '#22d3ee']
        });
      } else if (emoji === '👍') {
        confetti({
          particleCount: 45,
          spread: 40,
          origin: { y: 0.85 },
          colors: ['#3b82f6', '#06b6d4', '#60a5fa']
        });
      } else if (emoji === '😂') {
        confetti({
          particleCount: 55,
          spread: 45,
          origin: { y: 0.85 },
          colors: ['#eab308', '#facc15', '#fbbf24']
        });
      } else if (['🌟', '✨'].includes(emoji)) {
        confetti({
          particleCount: 50,
          spread: 50,
          origin: { y: 0.85 },
          colors: ['#fbbf24', '#f59e0b', '#ffffff']
        });
      }
    } catch (e) {}
    
    addMessageReaction(messageId, emoji);
  };

  // Scroll Container ref and input focal element
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Core inputs state machinery
  const [inputText, setInputText] = useState('');
  const draftTimeoutRef = useRef<any>(null);

  // Pagination & performance optimization states for long chat histories
  const [renderLimit, setRenderLimit] = useState(50);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
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
  const [forwardSearchQuery, setForwardSearchQuery] = useState('');

  // Custom floating hearts on double-tap message bubble
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const nextHeartId = useRef(0);

  const triggerFloatHeart = (clientX: number, clientY: number) => {
    const id = nextHeartId.current++;
    setFloatingHearts(prev => [...prev, { id, x: clientX, y: clientY }]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== id));
    }, 850);
  };

  // Custom Edge Swipe back to close active chat on mobile
  const swipeBackDxRef = useRef(0);
  const swipeBackStartXRef = useRef(0);
  const swipeBackStartYRef = useRef(0);
  const swipeLockDirection = useRef<'none' | 'horizontal' | 'vertical'>('none');
  const isSwipeBackEligibleRef = useRef(false);
  const [swipeBackAnimateOut, setSwipeBackAnimateOut] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  const updateSwipeBackIndicator = (dx: number) => {
    const indicator = document.getElementById('swipe-back-indicator');
    if (!indicator) return;
    const progress = Math.min(dx / 120, 1);
    indicator.style.opacity = progress.toString();
    const scale = 0.5 + progress * 0.5;
    const rotate = progress * 15;
    indicator.style.transform = `translateY(-50%) translate3d(${Math.min(dx * 0.25, 40)}px, 0, 0) scale(${scale}) rotate(${rotate}deg)`;
  };

  const resetSwipeBackIndicator = () => {
    const indicator = document.getElementById('swipe-back-indicator');
    if (!indicator) return;
    indicator.style.opacity = '0';
    indicator.style.transform = 'translateY(-50%) scale(0.5)';
  };

  const handleChatTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (window.innerWidth >= 768) return;
    const target = e.target as HTMLElement;
    // Don't intercept swipe if they are interacting with horizontal scrolling elements or inputs
    if (target.closest('.no-swipe') || target.closest('input, textarea, button, [role="slider"], .message-swipe-container')) return;
    
    const touch = e.touches[0];
    swipeBackStartXRef.current = touch.clientX;
    swipeBackStartYRef.current = touch.clientY;
    isSwipeBackEligibleRef.current = true;
    swipeLockDirection.current = 'none';
    swipeBackDxRef.current = 0;
    setSwipeBackAnimateOut(false);
  };

  const handleChatTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isSwipeBackEligibleRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - swipeBackStartXRef.current;
    const dy = touch.clientY - swipeBackStartYRef.current;

    if (swipeLockDirection.current === 'none') {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10 && dx > 0) {
        swipeLockDirection.current = 'horizontal';
      } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
        swipeLockDirection.current = 'vertical';
      }
    }

    if (swipeLockDirection.current === 'horizontal' && dx > 0) {
      if (e.cancelable) e.preventDefault();
      swipeBackDxRef.current = dx;
      if (!animationFrameIdRef.current) {
        animationFrameIdRef.current = requestAnimationFrame(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.style.transition = 'none';
            chatContainerRef.current.style.transform = `translate3d(${swipeBackDxRef.current}px, 0, 0)`;
          }
          updateSwipeBackIndicator(swipeBackDxRef.current);
          animationFrameIdRef.current = null;
        });
      }
    }
  };

  const handleChatTouchEnd = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    
    resetSwipeBackIndicator();
    if (!isSwipeBackEligibleRef.current) return;
    isSwipeBackEligibleRef.current = false;
    if (swipeBackDxRef.current > 120) {
      playTapSound();
      setSwipeBackAnimateOut(true);
      if (chatContainerRef.current) {
        chatContainerRef.current.style.transition = 'transform 240ms cubic-bezier(0.16, 1, 0.3, 1)';
        chatContainerRef.current.style.transform = `translate3d(100%, 0, 0)`;
      }
      setTimeout(() => {
        setActiveChat(null);
        swipeBackDxRef.current = 0;
        setSwipeBackAnimateOut(false);
      }, 250);
    } else {
      swipeBackDxRef.current = 0;
      if (chatContainerRef.current) {
        chatContainerRef.current.style.transition = 'transform 240ms cubic-bezier(0.16, 1, 0.3, 1)';
        chatContainerRef.current.style.transform = `translate3d(0px, 0, 0)`;
      }
    }
  };

  const handleChatMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth >= 768) return;
    const target = e.target as HTMLElement;
    if (target.closest('.no-swipe') || target.closest('input, textarea, button, [role="slider"], .message-swipe-container')) return;

    swipeBackStartXRef.current = e.clientX;
    swipeBackStartYRef.current = e.clientY;
    isSwipeBackEligibleRef.current = true;
    swipeLockDirection.current = 'none';
    swipeBackDxRef.current = 0;
    setSwipeBackAnimateOut(false);
  };

  const handleChatMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSwipeBackEligibleRef.current) return;
    const dx = e.clientX - swipeBackStartXRef.current;
    const dy = e.clientY - swipeBackStartYRef.current;

    if (swipeLockDirection.current === 'none') {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10 && dx > 0) {
        swipeLockDirection.current = 'horizontal';
      } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
        swipeLockDirection.current = 'vertical';
      }
    }

    if (swipeLockDirection.current === 'horizontal' && dx > 0) {
      if (e.cancelable) e.preventDefault();
      swipeBackDxRef.current = dx;
      if (!animationFrameIdRef.current) {
        animationFrameIdRef.current = requestAnimationFrame(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.style.transition = 'none';
            chatContainerRef.current.style.transform = `translate3d(${swipeBackDxRef.current}px, 0, 0)`;
          }
          updateSwipeBackIndicator(swipeBackDxRef.current);
          animationFrameIdRef.current = null;
        });
      }
    }
  };

  const handleChatMouseUp = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    
    resetSwipeBackIndicator();
    if (!isSwipeBackEligibleRef.current) return;
    isSwipeBackEligibleRef.current = false;
    if (swipeBackDxRef.current > 120) {
      playTapSound();
      setSwipeBackAnimateOut(true);
      if (chatContainerRef.current) {
        chatContainerRef.current.style.transition = 'transform 240ms cubic-bezier(0.16, 1, 0.3, 1)';
        chatContainerRef.current.style.transform = `translate3d(100%, 0, 0)`;
      }
      setTimeout(() => {
        setActiveChat(null);
        swipeBackDxRef.current = 0;
        setSwipeBackAnimateOut(false);
      }, 250);
    } else {
      swipeBackDxRef.current = 0;
      if (chatContainerRef.current) {
        chatContainerRef.current.style.transition = 'transform 240ms cubic-bezier(0.16, 1, 0.3, 1)';
        chatContainerRef.current.style.transform = `translate3d(0px, 0, 0)`;
      }
    }
  };
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
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);

  // Floating emoji reaction animations state
  const [activeFloatingReactions, setActiveFloatingReactions] = useState<{
    id: string;
    emoji: string;
    x: number;
    y: number;
  }[]>([]);
  const prevReactionsRef = useRef<{ [msgId: string]: { [userId: string]: string } }>({});

  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const newReactionsToTrigger: { msgId: string; emoji: string }[] = [];

    messages.forEach((msg) => {
      const prev = prevReactionsRef.current[msg.id] || {};
      const curr = msg.reactions || {};

      // Check if any user added a new reaction
      Object.entries(curr).forEach(([uid, emoji]) => {
        if (prev[uid] !== emoji) {
          newReactionsToTrigger.push({ msgId: msg.id, emoji });
        }
      });

      // Update ref store
      prevReactionsRef.current[msg.id] = { ...curr };
    });

    if (newReactionsToTrigger.length > 0) {
      newReactionsToTrigger.forEach(({ msgId, emoji }) => {
        const el = document.getElementById(`msg-${msgId}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const id = Math.random().toString(36).substring(2, 9);
          // Calculate center of message bubble
          const x = rect.left + rect.width / 2;
          const y = rect.top;

          setActiveFloatingReactions((prev) => [
            ...prev,
            { id, emoji, x: x || window.innerWidth / 2, y: y || window.innerHeight / 2 },
          ]);

          setTimeout(() => {
            setActiveFloatingReactions((prev) => prev.filter((r) => r.id !== id));
          }, 1500);
        }
      });
    }
  }, [messages]);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Poll state variables
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptionsInput, setPollOptionsInput] = useState('');
  const [pollIsMultiple, setPollIsMultiple] = useState(false);
  const [pollIsAnonymous, setPollIsAnonymous] = useState(true);

  // Back gesture interceptor for full-screen modals inside chat
  useEffect(() => {
    if (selectedImage || selectedUserProfile || showPollCreator || activeMessageMenuId || showAttachmentDropdown || showStickerPicker) {
      const timer = setTimeout(() => {
        window.history.pushState({ internalModal: true }, '');
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedImage, selectedUserProfile, showPollCreator, activeMessageMenuId, showAttachmentDropdown, showStickerPicker]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const g = window as any;
      if (g.__VI_BACK_HANDLED === e.timeStamp) return;

      // Unwind deepest first
      if (selectedImage) {
        setSelectedImage(null);
        g.__VI_BACK_HANDLED = e.timeStamp;
      } else if (selectedUserProfile) {
        setSelectedUserProfile(null);
        g.__VI_BACK_HANDLED = e.timeStamp;
      } else if (showPollCreator) {
        setShowPollCreator(false);
        g.__VI_BACK_HANDLED = e.timeStamp;
      } else if (activeMessageMenuId) {
        setActiveMessageMenuId(null);
        g.__VI_BACK_HANDLED = e.timeStamp;
      } else if (showAttachmentDropdown) {
        setShowAttachmentDropdown(false);
        g.__VI_BACK_HANDLED = e.timeStamp;
      } else if (showStickerPicker) {
        setShowStickerPicker(false);
        g.__VI_BACK_HANDLED = e.timeStamp;
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedImage, selectedUserProfile, showPollCreator, activeMessageMenuId, showAttachmentDropdown, showStickerPicker]);
  
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
  } = useVoiceRecorder(sendVoiceMessage, () => {
    playTapSound();
    setRecordingMode(prev => prev === 'voice' ? 'video' : 'voice');
  });

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
      showToast(language === 'ru' ? 'Ошибка загрузки стикера: ' + err.message : 'Error uploading sticker: ' + err.message, 'error');
    } finally {
      setUploadingSticker(false);
    }
  };

  // Live Circular Camera Recording parameters
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [isRecorderHovered, setIsRecorderHovered] = useState(false);
  const [isVideoStreamReady, setIsVideoStreamReady] = useState(false);
  const [recordingMode, setRecordingMode] = useState<'voice' | 'video'>('voice');
  const pressStartTimeRef = useRef<number>(0);
  const [recordVideoDuration, setRecordVideoDuration] = useState(0);
  const [recordVideoMs, setRecordVideoMs] = useState(0);
  const [videoFacingMode, setVideoFacingMode] = useState<'user' | 'environment'>('user');
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [videoRecordingState, setVideoRecordingState] = useState<'idle' | 'holding' | 'locked'>('idle');
  const [videoGestures, setVideoGestures] = useState({ startX: 0, startY: 0, currentX: 0, currentY: 0 });
  const [videoZoom, setVideoZoom] = useState<number>(1);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const videoTimerRef = useRef<any>(null);
  const isVideoCancelledRef = useRef<boolean>(false);
  const recordingPressTimerRef = useRef<any>(null);

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

  const [wallpaperSelection, setWallpaperSelection] = useState<string>(() => localStorage.getItem('vi-chat-wallpaper') || 'cosmic');
  const [customWallpaperColor, setCustomWallpaperColor] = useState<string>(() => localStorage.getItem('vi-custom-wallpaper-color') || '#0d0e12');

  useEffect(() => {
    const handleSettingsChange = () => {
      setWallpaperSelection(localStorage.getItem('vi-chat-wallpaper') || 'cosmic');
      setCustomWallpaperColor(localStorage.getItem('vi-custom-wallpaper-color') || '#0d0e12');
    };
    window.addEventListener('vi-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('vi-settings-changed', handleSettingsChange);
  }, []);

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
      list = list.filter(m => m.scheduledAt && Date.now() < m.scheduledAt && m.senderId === currentUser?.uid);
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

  // Escape key handler for active overlays
  useEffect(() => {
    const handleGlobalEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedImage) {
          setSelectedImage(null);
        } else if (selectedUserProfile) {
          setSelectedUserProfile(null);
        } else if (showStickerPicker) {
          setShowStickerPicker(false);
        } else if (showAttachmentDropdown) {
          setShowAttachmentDropdown(false);
        } else if (showPollCreator) {
          setShowPollCreator(false);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalEsc);
    return () => {
      window.removeEventListener('keydown', handleGlobalEsc);
    };
  }, [selectedImage, selectedUserProfile, showStickerPicker, showAttachmentDropdown, showPollCreator]);

  // Tick timer to automatically expire showing typing states
  const [typingTick, setTypingTick] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingTick(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Who is typing parsing (throttle 5 seconds)
  const typingUsers = useMemo(() => {
    if (!activeChat || !activeChat.typing) return [];
    return Object.entries(activeChat.typing)
      .filter(([uid, val]) => uid !== currentUser?.uid && typingTick - (val as number) < 5000)
      .map(([uid]) => {
        const u = globalUsers.find((p) => p.uid === uid);
        return u ? u.displayName : (language === 'ru' ? 'Кто-то' : 'Someone');
      });
  }, [activeChat, globalUsers, currentUser, language, typingTick]);

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
      const atBottom = scrollHeight - scrollTop - clientHeight < 200;
      setIsAtBottom(atBottom);
      setShowScrollBottom(!atBottom && scrollHeight > clientHeight + 300);

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

  const handleForwardMessage = async (targetChatId: string) => {
    if (!forwardingMessage) return;
    try {
      await sendTextMessage('', undefined, forwardingMessage, undefined, false, undefined, targetChatId);
      setForwardingMessage(null);
      setToast({ message: language === 'ru' ? 'Сообщение переслано!' : 'Message forwarded!', type: 'success' });
    } catch (err: any) {
      setToast({ message: language === 'ru' ? 'Ошибка при пересылке' : 'Forward error: ' + err.message, type: 'error' });
    }
  };

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
  const startVideoRecording = async (clientX: number, clientY: number) => {
    try {
      isVideoCancelledRef.current = false;
      videoRecorderRef.current = null;
      setIsRecordingVideo(true);
      setIsVideoStreamReady(false);
      setRecordVideoDuration(0);
      setRecordVideoMs(0);
      setVideoRecordingState('holding');
      pressStartTimeRef.current = Date.now();
      setVideoGestures({ startX: clientX, startY: clientY, currentX: clientX, currentY: clientY });
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: { width: 240, height: 240, frameRate: 15, facingMode: videoFacingMode } 
      });
      if (isVideoCancelledRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      videoStreamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
      setIsVideoStreamReady(true);
      
      let options: MediaRecorderOptions = { videoBitsPerSecond: 200000, audioBitsPerSecond: 32000 };
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        options = { ...options, mimeType: 'video/webm;codecs=vp9,opus' };
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        options = { ...options, mimeType: 'video/webm' };
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        options = { ...options, mimeType: 'video/mp4' };
      }
      const recorder = new MediaRecorder(stream, options);
      videoRecorderRef.current = recorder;
      videoChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (isVideoCancelledRef.current) {
          setRecordVideoDuration(0);
          setRecordVideoMs(0);
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        try {
          const videoBlob = new Blob(videoChunksRef.current, { type: recorder.mimeType || 'video/mp4' });
          if (videoBlob.size > 100) {
            // Wrapped as file with specific name triggers circular player in message log rendering
            const videoFile = new File([videoBlob], 'video-note.webm', { type: recorder.mimeType || 'video/mp4' });
            await sendFileMessage(videoFile, 'video');
          }
        } catch (err: any) {
          logger.error("Failed to send video message during onstop", { error: err.message, stack: err.stack });
        } finally {
          setRecordVideoDuration(0);
          setRecordVideoMs(0);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      recorder.start();

      let startTime = Date.now();
      videoTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        setRecordVideoMs(elapsed);
        setRecordVideoDuration(Math.floor(elapsed / 1000));
        if (elapsed >= 60000) {
          stopVideoRecording();
        }
      }, 100);
    } catch (err: any) {
      setIsRecordingVideo(false);
      logger.error("Camera webcam capture initiation error:", { error: err.message, stack: err.stack });
      showToast(language === 'ru' ? 'Ошибка запуска веб-камеры. Проверьте права доступа в браузере.' : 'Failed to launch circular video note capture. Verify permissions.', 'error');
    }
  };

  const stopVideoRecording = () => {
    setVideoRecordingState('idle');
    setIsFlashOn(false);
    setIsVideoStreamReady(false);
    setVideoZoom(1);
    pressStartTimeRef.current = 0;
    if (!videoRecorderRef.current) {
      isVideoCancelledRef.current = true;
      setIsRecordingVideo(false);
      setRecordVideoMs(0);
      if (videoStreamRef.current) {
        try {
          videoStreamRef.current.getTracks().forEach(t => t.stop());
        } catch (e) {}
        videoStreamRef.current = null;
      }
    }
    if (videoRecorderRef.current && isRecordingVideo) {
      videoRecorderRef.current.stop();
      setIsRecordingVideo(false);
      clearInterval(videoTimerRef.current);
    }
  };

  const cancelVideoRecording = () => {
    isVideoCancelledRef.current = true;
    setVideoRecordingState('idle');
    setIsFlashOn(false);
    setIsVideoStreamReady(false);
    setVideoZoom(1);
    setRecordVideoMs(0);
    setIsRecordingVideo(false);
    clearInterval(videoTimerRef.current);
    setRecordVideoDuration(0);
    pressStartTimeRef.current = 0;
    if (videoRecorderRef.current) {
      try {
        videoRecorderRef.current.onstop = null;
        if (videoRecorderRef.current.state !== 'inactive') {
          videoRecorderRef.current.stop();
        }
      } catch (e) {}
    }
    if (videoStreamRef.current) {
      try {
        videoStreamRef.current.getTracks().forEach(t => t.stop());
      } catch (e) {}
      videoStreamRef.current = null;
    }
  };

  const flipVideoCamera = async () => {
    try {
      const nextFacingMode = videoFacingMode === 'user' ? 'environment' : 'user';
      setVideoFacingMode(nextFacingMode);
      
      if (videoStreamRef.current && isRecordingVideo) {
        setIsVideoStreamReady(false);
        // Stop current video track
        const currentVideoTrack = videoStreamRef.current.getVideoTracks()[0];
        if (currentVideoTrack) {
          currentVideoTrack.stop();
          videoStreamRef.current.removeTrack(currentVideoTrack);
        }
        
        // Request new track with nextFacingMode
        const tempStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 360, height: 360, facingMode: nextFacingMode }
        });
        const newVideoTrack = tempStream.getVideoTracks()[0];
        
        if (newVideoTrack) {
          videoStreamRef.current.addTrack(newVideoTrack);
          // Stop template other tracks
          tempStream.getAudioTracks().forEach(track => track.stop());
        }
        
        // Update live preview object
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
          videoPreviewRef.current.srcObject = videoStreamRef.current;
        }
        setIsVideoStreamReady(true);
      }
    } catch (err: any) {
      logger.error("Failed to flip video camera stream track:", err);
      showToast(language === 'ru' ? 'Камера не поддерживает быструю смену или заблокирована.' : 'Camera configuration change not supported on this device.', 'info');
    }
  };

  const toggleFlash = async () => {
    try {
      const videoTrack = videoStreamRef.current?.getVideoTracks()[0];
      if (!videoTrack) return;
      
      const capabilities = (videoTrack as any).getCapabilities?.() || {};
      if (capabilities.torch) {
        const nextFlash = !isFlashOn;
        await videoTrack.applyConstraints({
          advanced: [{ torch: nextFlash } as any]
        });
        setIsFlashOn(nextFlash);
      } else {
        showToast(language === 'ru' ? 'Режим вспышки не поддерживается данной камерой.' : 'Torch/Flash not supported on this camera layout.', 'info');
      }
    } catch (err: any) {
      logger.error("Error applying torch constraint:", err);
    }
  };

  const handleVideoRecordMove = (clientX: number, clientY: number) => {
    if (videoRecordingState !== 'holding' && pressStartTimeRef.current === 0) return;
    
    setVideoGestures(prev => {
      const startX = prev.startX || clientX;
      const startY = prev.startY || clientY;
      const current = { startX, startY, currentX: clientX, currentY: clientY };
      const distanceX = startX - clientX;
      const distanceY = startY - clientY;
      
      if (distanceX > 80) {
        setTimeout(() => cancelVideoRecording(), 10);
      } else if (distanceY > 60) {
        setVideoRecordingState('locked');
      }
      
      let computedZoom = 1;
      if (distanceY > 15) {
        computedZoom = Math.min(3.0, 1.0 + ((distanceY - 15) / 185) * 2.0);
      } else {
        computedZoom = 1.0;
      }
      setVideoZoom(computedZoom);
      
      if (videoStreamRef.current) {
        try {
          const videoTrack = videoStreamRef.current.getVideoTracks()[0];
          if (videoTrack) {
            const capabilities = videoTrack.getCapabilities() as any;
            if (capabilities && capabilities.zoom) {
              const minZoom = capabilities.zoom.min || 1;
              const maxZoom = capabilities.zoom.max || 3;
              const trackZoom = minZoom + (computedZoom - 1) * (maxZoom - minZoom) / 2;
              const targetZoom = Math.max(minZoom, Math.min(maxZoom, trackZoom));
              videoTrack.applyConstraints({ advanced: [{ zoom: targetZoom }] as any }).catch(() => {});
            }
          }
        } catch (err) {}
      }

      return current;
    });
  };

  const handleVideoRecordRelease = () => {
    if (videoRecordingState === 'holding' || pressStartTimeRef.current > 0) {
      const startX = videoGestures.startX || videoGestures.currentX;
      const startY = videoGestures.startY || videoGestures.currentY;
      const distanceX = startX - videoGestures.currentX;
      const distanceY = startY - videoGestures.currentY;
      const holdDuration = Date.now() - pressStartTimeRef.current;
      
      if (holdDuration < 250) {
        cancelVideoRecording();
        setRecordingMode('voice');
      } else if (distanceX > 80) {
        cancelVideoRecording();
      } else if (distanceY > 60) {
        setVideoRecordingState('locked');
      } else {
        stopVideoRecording();
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
    try {
      playTapSound();

      // 1. If we have a draft file staged in preview row, upload it first before basic texts
      if (selectedDraftFile) {
        const fileToUpload = selectedDraftFile;
        setSelectedDraftFile(null);
        const isImg = fileToUpload.type.startsWith('image/');
        const isVid = fileToUpload.type.startsWith('video/');
        const type = isImg ? 'image' : isVid ? 'video' : 'file';
        await sendFileMessage(fileToUpload, type);
        
        // If there is also text, send it as a separate message
        if (inputText.trim()) {
          await sendTextMessage(inputText);
        }
        
        // Focus element on file transmit completed
        setTimeout(() => inputRef.current?.focus(), 150);
        setInputText('');
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
          forwardingMessage || undefined,
          activeTopicId || undefined,
          isSilent,
          scheduledTime || undefined
        );
        if (forwardingMessage) setForwardingMessage(null);
        setReplyTarget(null);
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
    } catch (err: any) {
      setToast({ message: err.message || (language === 'ru' ? 'Ошибка при отправке' : 'Failed to send'), type: 'error' });
    }
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
      playBubbleReactionSound();
    }
  };

  const handleImmediateFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedDraftFile(file);
      playBubbleReactionSound();
    }
  };

  const triggerCopyAction = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(language === 'ru' ? 'Текст скопирован в буфер обмена' : 'Text copied to clipboard', 'success');
  };

  const getWallpaperStyle = (): { backgroundImage?: string; backgroundColor?: string; backgroundAttachment?: string } => {
    switch (wallpaperSelection) {
      case 'aurora':
        return {
          backgroundImage: `
            radial-gradient(circle at 10% 10%, rgba(20, 184, 166, 0.16), transparent 60%),
            radial-gradient(circle at 80% 90%, rgba(99, 102, 241, 0.16), transparent 60%),
            radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.08), transparent 70%)
          `,
          backgroundColor: '#030712',
          backgroundAttachment: 'fixed'
        };
      case 'midnight':
        return {
          backgroundColor: '#050505',
          backgroundImage: 'radial-gradient(circle at center, #0a0a0a 0%, #000 100%)',
          backgroundAttachment: 'fixed'
        };
      case 'ocean':
        return {
          backgroundImage: 'linear-gradient(180deg, #0d2e33 0%, #05161a 100%)',
          backgroundColor: '#05161a',
          backgroundAttachment: 'fixed'
        };
      case 'sunset':
        return {
          backgroundImage: 'linear-gradient(45deg, #1e1313 0%, #1a0b16 50%, #0c0c16 100%)',
          backgroundColor: '#0c0c16',
          backgroundAttachment: 'fixed'
        };
      case 'minimal':
        return {
          backgroundImage: 'none',
          backgroundColor: '#09090b',
          backgroundAttachment: 'fixed'
        };
      case 'warm':
        return {
          backgroundImage: `
            radial-gradient(circle at 90% 10%, rgba(245, 158, 11, 0.12), transparent 50%),
            radial-gradient(circle at 10% 90%, rgba(157, 23, 77, 0.12), transparent 60%),
            radial-gradient(circle at 50% 30%, rgba(124, 58, 237, 0.06), transparent 70%)
          `,
          backgroundColor: '#0a050d',
          backgroundAttachment: 'fixed'
        };
      case 'custom-color':
        return {
          backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.02), transparent 75%)',
          backgroundColor: customWallpaperColor || '#0d0e12',
          backgroundAttachment: 'fixed'
        };
      case 'cosmic':
      default:
        return {
          backgroundColor: '#0e1621',
          backgroundImage: 'none',
          backgroundAttachment: 'fixed'
        };
    }
  };

  if (!activeChat) {
    return (
      <div 
        className="hidden md:flex flex-1 flex-col items-center justify-center p-8 overflow-y-auto h-full select-none relative transition-colors duration-350 bg-[#0e1621]"
      >
        <div className="max-w-md w-full text-center space-y-4 animate-fade-in relative z-10">
          <div className="bg-[#1c242d] px-4 py-2 rounded-full inline-block">
            <span className="text-[13px] text-slate-300">
              {language === 'ru' ? 'Выберите чат, чтобы начать общение' : 'Select a chat to start messaging'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Find active uploading states
  const activeUploadsList = Object.entries(uploadProgress);

  return (
    <div 
      ref={chatContainerRef}
      className="flex-1 flex flex-col relative overflow-hidden"
      style={{ 
        height: viewportHeight > 0 ? viewportHeight : '100%', 
        backgroundColor: getWallpaperStyle().backgroundColor,
        transform: swipeBackAnimateOut ? 'translate3d(100%, 0, 0)' : 'translate3d(0px, 0, 0)',
        transition: 'transform 240ms cubic-bezier(0.16, 1, 0.3, 1), background-color 350ms ease'
      }}
      onDragEnter={handleDrag}
      onTouchStart={handleChatTouchStart}
      onTouchMove={handleChatTouchMove}
      onTouchEnd={handleChatTouchEnd}
      onMouseDown={handleChatMouseDown}
      onMouseMove={handleChatMouseMove}
      onMouseUp={handleChatMouseUp}
      onMouseLeave={handleChatMouseUp}
      onClick={(e) => {
        // If clicking outside an active menu, close it
        if (activeMessageMenuId) {
           setActiveMessageMenuId(null);
        }
      }}
    >
      {/* Edge Swipe Springy Back Arrow Indicator */}
      <div 
        id="swipe-back-indicator"
        className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none z-[400] h-16 w-8 rounded-r-3xl bg-white/10 backdrop-blur-md border border-l-0 border-white/20 flex items-center justify-start pl-1.5 shadow-[10px_0_30px_rgba(0,0,0,0.5)] opacity-0 transition-all duration-75 origin-left"
        style={{ transform: 'translateY(-50%) scale(0.5)' }}
      >
        <ChevronLeft className="w-5 h-5 text-cyan-400" />
      </div>

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

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={activeChat.id}
          initial={{ opacity: 0, scale: 0.96, filter: 'blur(12px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.96, filter: 'blur(12px)' }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 flex flex-col pointer-events-none"
        >
          <div className="flex-1 flex flex-col relative w-full h-full pointer-events-auto">

            {/* Redesigned Glass Header */}
            <div className="absolute top-0 left-0 right-0 z-[150] flex justify-center pointer-events-none p-0">
              <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="w-full h-[60px] bg-[#17212b]/95 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-2 md:px-4 pointer-events-auto shadow-md relative overflow-hidden"
              >
                <div className="flex items-center gap-1 min-w-0 flex-1 z-10">
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setActiveChat(null)}
                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer rounded-full md:hidden"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </motion.button>
                  
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
                    className="flex items-center gap-2.5 cursor-pointer group/profile hover:bg-white/5 px-2 py-1 rounded-xl transition-all min-w-0"
                  >
                    <div className="relative shrink-0">
                      <motion.img 
                        layoutId={`avatar-${activeChat.id}`}
                        src={activeChat.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(activeChat.title)}`} 
                        alt={activeChat.title} 
                        className="w-[38px] h-[38px] rounded-full object-cover border border-white/10" 
                      />
                      {activeChat.type === 'direct' && (
                        <div className={`absolute right-0 bottom-0 w-2.5 h-2.5 rounded-full border-2 border-[#17212b] ${
                          onlineUsers[activeChat.members.find(m => m !== currentUser?.uid) || ''] === 'online' ? 'bg-emerald-500' : 'bg-slate-600'
                        }`} />
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-[15px] text-white truncate leading-tight tracking-tight">
                        {activeChat.type === 'direct' && activeChat.members.length === 1 && activeChat.members[0] === currentUser?.uid
                          ? (language === 'ru' ? 'Избранное' : 'Saved Messages')
                          : activeChat.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        {typingUsers.length > 0 ? (
                          <span className="text-[10px] text-sky-400 font-medium flex items-center gap-1">
                            {typingUsers.join(', ')} {language === 'ru' ? 'печатает...' : 'is typing...'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium leading-none truncate opacity-80">
                            {activeChat.type === 'direct' 
                              ? (() => {
                                  const partnerId = activeChat.members.find(m => m !== currentUser?.uid) || currentUser?.uid;
                                  const partner = globalUsers.find(u => u.uid === partnerId);
                                  const isOnline = onlineUsers[partnerId || ''] === 'online';
                                  if (isOnline) return <span className="text-sky-400 font-bold">{language === 'ru' ? 'в сети' : 'online'}</span>;
                                  if (!partner?.lastSeen) return language === 'ru' ? 'был(а) недавно' : 'last seen recently';
                                  
                                  const diff = Date.now() - (partner.lastSeen || 0);
                                  const mins = Math.floor(diff / 60000);
                                  if (mins < 1) return language === 'ru' ? 'был(а) только что' : 'last seen just now';
                                  if (mins < 60) return language === 'ru' ? `был(а) ${mins} мин. назад` : `last seen ${mins}m ago`;
                                  return (language === 'ru' ? 'был(а) ' : 'last seen ') + new Date(partner.lastSeen).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                                })()
                              : `${activeChat.members?.length || 0} ${language === 'ru' ? 'участников' : 'members'}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 z-10">
                  <div className="flex items-center gap-0.5">
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={async () => {
                        try {
                          await initiateCall(activeChat.members.find(id => id !== currentUser?.uid) || '', 'voice');
                        } catch (err: any) {
                          setToast({ message: err.message, type: 'error' });
                        }
                      }}
                      className="w-10 h-10 text-slate-400 hover:text-white hover:bg-white/5 rounded-full cursor-pointer transition flex items-center justify-center"
                    >
                      <Phone className="w-[18px] h-[18px]" />
                    </motion.button>
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={async () => {
                        try {
                          await initiateCall(activeChat.members.find(id => id !== currentUser?.uid) || '', 'video');
                        } catch (err: any) {
                          setToast({ message: err.message, type: 'error' });
                        }
                      }}
                      className="w-10 h-10 text-slate-400 hover:text-white hover:bg-white/5 rounded-full cursor-pointer transition flex items-center justify-center"
                    >
                      <Video className="w-[18px] h-[18px]" />
                    </motion.button>
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowInChatSearch(!showInChatSearch)}
                      className={`w-10 h-10 rounded-full cursor-pointer transition-all flex items-center justify-center ${showInChatSearch ? 'text-sky-400 bg-white/5' : 'text-slate-400 hover:bg-white/5'}`}
                    >
                      <Search className="w-[18px] h-[18px]" />
                    </motion.button>
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuPosition({ x: rect.right - 200, y: rect.bottom + 10 });
                        setShowThreeDotMenu(!showThreeDotMenu);
                      }}
                      className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>

                {/* Floating Three-Dot Menu */}
                <AnimatePresence>
                  {showThreeDotMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-[1000] pointer-events-auto" 
                        onClick={() => setShowThreeDotMenu(false)} 
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        style={{ top: 74, right: 12 }}
                        className="absolute z-[1001] w-[220px] bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 pointer-events-auto overflow-hidden"
                      >
                        <div className="flex flex-col gap-1">
                          <button onClick={() => { setShowThreeDotMenu(false); setShowChatSettings(true); }} className="flex items-center gap-3 w-full p-2.5 hover:bg-white/5 rounded-lg text-sm text-slate-200 transition-all text-left">
                            <Bell className="w-4 h-4 text-slate-400" />
                            {language === 'ru' ? 'Уведомления' : 'Notifications'}
                          </button>
                          {activeChat.type === 'direct' && (
                            <button onClick={() => { setShowThreeDotMenu(false); initiateCall(activeChat.members.find(id => id !== currentUser?.uid) || '', 'video'); }} className="flex items-center gap-3 w-full p-2.5 hover:bg-white/5 rounded-lg text-sm text-slate-200 transition-all text-left">
                              <Video className="w-4 h-4 text-slate-400" />
                              {language === 'ru' ? 'Видеозвонок' : 'Video Call'}
                            </button>
                          )}
                          <button onClick={() => { setShowThreeDotMenu(false); setShowInChatSearch(true); }} className="flex items-center gap-3 w-full p-2.5 hover:bg-white/5 rounded-lg text-sm text-slate-200 transition-all text-left">
                            <Search className="w-4 h-4 text-slate-400" />
                            {language === 'ru' ? 'Поиск' : 'Search'}
                          </button>
                          <button onClick={() => { setShowThreeDotMenu(false); setShowWallpaperPicker(true); }} className="flex items-center gap-3 w-full p-2.5 hover:bg-white/5 rounded-lg text-sm text-slate-200 transition-all text-left">
                            <Sparkles className="w-4 h-4 text-slate-400" />
                            {language === 'ru' ? 'Изменить обои' : 'Change Wallpaper'}
                          </button>
                          <div className="h-px bg-white/5 my-1 mx-2" />
                          <button onClick={async () => { 
                            setShowThreeDotMenu(false); 
                            if (confirm(language === 'ru' ? 'Очистить историю сообщений?' : 'Clear message history?')) {
                              // Simulate clear
                              setToast({ message: language === 'ru' ? 'История очищена' : 'History cleared', type: 'info' });
                            }
                          }} className="flex items-center gap-3 w-full p-2.5 hover:bg-white/5 rounded-lg text-sm text-slate-200 transition-all text-left">
                            <Eraser className="w-4 h-4 text-slate-400" />
                            {language === 'ru' ? 'Очистить историю' : 'Clear History'}
                          </button>
                          <button onClick={async () => { 
                            setShowThreeDotMenu(false); 
                            if (confirm(language === 'ru' ? 'Вы уверены, что хотите удалить этот чат?' : 'Are you sure you want to delete this chat?')) {
                              try {
                                await deleteChat(activeChat.id);
                                setActiveChat(null);
                                setToast({ message: language === 'ru' ? 'Чат успешно удален' : 'Chat successfully deleted', type: 'success' });
                              } catch (err: any) {
                                setToast({ message: err.message, type: 'error' });
                              }
                            }
                          }} className="flex items-center gap-3 w-full p-2.5 hover:bg-rose-500/10 rounded-lg text-sm text-rose-400 transition-all text-left">
                            <Trash2 className="w-4 h-4 text-rose-500" />
                            {language === 'ru' ? 'Удалить чат' : 'Delete Chat'}
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

      {/* Pinned Message Bar */}
      {activeChat.pinnedMessageId && (
        <div 
          onClick={() => {
            const el = document.getElementById(`msg-${activeChat.pinnedMessageId}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('animate-highlight');
              setTimeout(() => el.classList.remove('animate-highlight'), 2000);
            }
          }}
          className="px-4 md:px-6 py-1.5 bg-[#0a0a0d]/60 backdrop-blur-md border-b border-white/[0.03] flex items-center gap-3 cursor-pointer hover:bg-white/[0.03] transition-all group z-10 shrink-0"
        >
          <div className="w-0.5 h-7 bg-cyan-500 rounded-full shrink-0 group-hover:scale-y-110 transition-transform" />
          <div className="flex-1 min-w-0">
            <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-tight leading-none mb-0.5">{language === 'ru' ? 'Закреплённое сообщение' : 'Pinned Message'}</h4>
            <p className="text-[11.5px] text-slate-300 truncate leading-tight">
              {(() => {
                const msg = messages.find(m => m.id === activeChat.pinnedMessageId);
                if (!msg) return language === 'ru' ? 'Загрузка...' : 'Loading...';
                if (msg.type === 'text') return msg.text;
                if (msg.type === 'image') return language === 'ru' ? '🖼️ Фото' : '🖼️ Photo';
                if (msg.type === 'video') return language === 'ru' ? '📹 Видео' : '📹 Video';
                if (msg.type === 'voice') return language === 'ru' ? '🎤 Голосовое' : '🎤 Voice Note';
                if (msg.type === 'sticker') return language === 'ru' ? '✨ Стикер' : '✨ Sticker';
                return language === 'ru' ? '📎 Файл' : '📎 File';
              })()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Pin className="w-3.5 h-3.5 text-slate-500 rotate-45 group-hover:text-cyan-400 transition-colors" />
            <button 
              onClick={(e) => {
                e.stopPropagation();
                pinMessage(activeChat.id, null);
              }}
              className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

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


      {/* Floating utility: Scroll to Bottom button with Unread count if applicable */}
      <AnimatePresence>
        {!isAtBottom && paginatedMessages.length > 5 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 10 }}
            onClick={() => { playTapSound(); scrollToBottom(true); }}
            className="absolute bottom-24 right-4 md:right-8 z-30 w-11 h-11 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-slate-300 hover:text-cyan-400 hover:bg-slate-800 shadow-2xl transition-all cursor-pointer group active:scale-90"
          >
            <svg className="w-5 h-5 transition-transform group-hover:translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
            </svg>
            {activeChat.unreadCounts?.[currentUser?.uid || ''] > 0 && (
              <span className="absolute -top-1.5 -left-1.5 bg-cyan-500 text-[10px] text-slate-950 font-black rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center border-2 border-slate-900 shadow-lg">
                {activeChat.unreadCounts[currentUser?.uid || '']}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

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

      {/* Scheduled Mode Banner */}
      {/* Scheduled Mode Banner */}
      {viewScheduledMode && (
        <div className="px-6 py-2 bg-amber-950/20 border-b border-amber-500/20 flex justify-between items-center text-xs text-amber-200 select-none animate-fade-in z-10 shrink-0">
          <div className="flex items-center gap-2 truncate flex-1 min-w-0 mr-3">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
            <span className="font-semibold">{language === 'ru' ? 'Вы просматриваете отложенные сообщения' : 'Viewing Scheduled Messages Queue'}</span>
          </div>
          <button type="button" onClick={() => setViewScheduledMode(false)} className="text-amber-500/70 hover:text-amber-300 p-1 cursor-pointer shrink-0 border border-amber-500/10 rounded-lg hover:border-amber-500/30 transition-all font-mono text-[9px] uppercase px-2 tracking-wider">
            {language === 'ru' ? 'Закрыть' : 'Close'}
          </button>
        </div>
      )}

      {/* Pinned Message Bar */}
      {activeChat?.pinnedMessageId && (
        <div className="absolute top-[72px] md:top-[80px] left-2 right-2 md:left-4 md:right-4 z-[140] flex justify-center pointer-events-none">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-4xl h-12 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl flex items-center px-3 gap-3 pointer-events-auto shadow-2xl relative overflow-hidden"
          >
            <div className="w-1 h-6 bg-cyan-400 rounded-full shrink-0" />
            <div 
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => {
                const el = document.getElementById(`msg-${activeChat.pinnedMessageId}`);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.classList.add('animate-highlight');
                  setTimeout(() => el.classList.remove('animate-highlight'), 2000);
                }
              }}
            >
              <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider leading-tight">
                {language === 'ru' ? 'Закреплённое сообщение' : 'Pinned Message'}
              </div>
              <div className="text-[11px] text-slate-300 truncate font-medium leading-tight">
                {messages.find(m => m.id === activeChat.pinnedMessageId)?.text || (language === 'ru' ? 'Вложение' : 'Attachment')}
              </div>
            </div>
            <button 
              onClick={() => pinMessage(activeChat.id, null)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      )}

      {/* Desktop Message Menu Backdrop */}
      <AnimatePresence>
        {activeMessageMenuId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="hidden md:block fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[150] transition-opacity"
            onClick={() => setActiveMessageMenuId(null)}
          />
        )}
      </AnimatePresence>

      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 md:px-6 py-4 relative flex flex-col gap-2.5 scroll-smooth custom-scrollbar z-10 transition-colors duration-350 vision-scroll-area"
        style={{ background: 'transparent' }}
      >
        {/* Spacer for Floating Header */}
        <div className="h-[72px] md:h-[80px] shrink-0" />
        
        {/* Simple Wallpaper Overlay */}
        <div 
          className="absolute inset-0 z-0 opacity-40 pointer-events-none transition-all duration-350 overflow-hidden" 
          style={{ ...getWallpaperStyle(), pointerEvents: 'none' }}
        />
        
        {visibleMessages.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none max-w-sm mx-auto my-auto relative z-10"
          >
            <div className="p-6 rounded-[24px] bg-black/20 border border-white/5 backdrop-blur-md flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-slate-400" />
              </div>
              <h4 className="text-[14px] font-bold text-white mb-2">
                {language === 'ru' ? 'Нет сообщений' : 'No messages'}
              </h4>
              <p className="text-[12px] text-slate-400">
                {language === 'ru' ? 'Напишите что-нибудь, чтобы начать общение' : 'Send a message to start the conversation'}
              </p>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {(() => {
              const elements: React.ReactNode[] = [];
              let lastDateStr = '';

              paginatedMessages.forEach((msg, idx) => {
                // 1. Group by day date separator headings
                const msgDate = new Date(msg.createdAt);
                const dateStr = msgDate.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { 
                  day: 'numeric', 
                  month: 'long', 
                });
                
                if (dateStr !== lastDateStr) {
                  lastDateStr = dateStr;
                  elements.push(
                    <div key={`date-header-${msg.id}`} className="flex justify-center my-6 select-none shrink-0">
                      <span className="px-4 py-1 text-[11px] font-bold bg-white/5 backdrop-blur-md text-slate-300 rounded-full border border-white/5 uppercase tracking-wider">
                        {dateStr}
                      </span>
                    </div>
                  );
                }

                if (initialUnreadId === msg.id) {
                  elements.push(
                    <div key="unread-separator" className="flex items-center w-full my-6 opacity-80 select-none">
                      <div className="flex-1 border-t border-cyan-500/20"></div>
                      <span className="px-3 text-[10px] font-bold text-cyan-400/80 bg-white/5 rounded-full uppercase tracking-widest py-0.5">
                        {language === 'ru' ? 'Новые сообщения' : 'New Messages'}
                      </span>
                      <div className="flex-1 border-t border-cyan-500/20"></div>
                    </div>
                  );
                }

                const isMe = msg.senderId === currentUser?.uid;
                const isRead = msg.readBy && msg.readBy.length > 0;
                const isDelivered = msg.status === 'delivered' || msg.status === 'read';

                // 2. Continuous message grouping by the same user within 5 mins
                const prevMsg = paginatedMessages[idx - 1];
                const nextMsg = paginatedMessages[idx + 1];
                const isConsecutivePrev = prevMsg && prevMsg.senderId === msg.senderId && (msg.createdAt - prevMsg.createdAt < 5 * 60 * 1000);
                const isConsecutiveNext = nextMsg && nextMsg.senderId === msg.senderId && (nextMsg.createdAt - msg.createdAt < 5 * 60 * 1000);

                const bubbleRadius = isMe 
                  ? `rounded-[18px] ${!isConsecutivePrev ? 'rounded-tr-[18px]' : 'rounded-tr-[6px]'} ${!isConsecutiveNext ? 'rounded-br-[18px]' : 'rounded-br-[6px]'}` 
                  : `rounded-[18px] ${!isConsecutivePrev ? 'rounded-tl-[18px]' : 'rounded-tl-[6px]'} ${!isConsecutiveNext ? 'rounded-bl-[18px]' : 'rounded-bl-[6px]'}`;

                elements.push(
                  <motion.div 
                    key={msg.id}
                    id={`msg-${msg.id}`}
                    className={`flex flex-col max-w-[85%] md:max-w-[75%] select-none active:scale-[0.99] transition-all duration-150 ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'} ${isConsecutivePrev ? 'mt-0.5' : 'mt-3'} relative ${activeMessageMenuId === msg.id ? 'z-[160]' : 'z-10'}`}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 450, damping: 35, mass: 0.8 }}
                    layout="position"
                  >
                    {!isMe && !isConsecutivePrev && activeChat.type === 'group' && (
                      <span className="text-[11px] font-bold text-sky-400 pl-2 mb-0.5 tracking-tight">{msg.senderName}</span>
                    )}

                    <div className={`relative flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div 
                        onPointerDown={(e) => {
                           const target = e.currentTarget;
                           target.dataset.timeoutId = setTimeout(() => {
                             setActiveMessageMenuId(msg.id);
                             if ('vibrate' in navigator) navigator.vibrate(20);
                           }, 450).toString();
                        }}
                        onPointerUp={(e) => {
                           const target = e.currentTarget;
                           clearTimeout(parseInt(target.dataset.timeoutId || '0'));
                           if (activeMessageMenuId === msg.id) return;
                           
                           // Handle double tap for reaction
                           const now = Date.now();
                           const lastTap = parseInt(target.dataset.lastTap || '0');
                           if (now - lastTap < 300) {
                             handleTriggerReaction(msg.id, '❤️');
                             triggerFloatHeart(e.clientX, e.clientY);
                             if ('vibrate' in navigator) navigator.vibrate([15, 30]);
                             target.dataset.lastTap = '0';
                           } else {
                             target.dataset.lastTap = now.toString();
                           }
                        }}
                        className={`message-bubble relative group/bubble min-w-[60px] transition-all ${
                          msg.type === 'image' || msg.type === 'video' 
                            ? 'p-0.5 overflow-hidden' 
                            : 'px-3 py-1.5'
                        } ${isMe ? 'glass-bubble-out' : 'glass-bubble-in'} ${bubbleRadius} shadow-md border border-white/10`}
                      >
                        {/* Reply Link */}
                        {msg.replyTo && (
                          <div 
                            onClick={() => {
                              const el = document.getElementById(`msg-${msg.replyTo?.messageId}`);
                              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                            className="mb-1.5 border-l-2 border-white/30 bg-white/10 px-2 py-1 rounded-r-lg text-[11px] cursor-pointer"
                          >
                            <span className="font-bold opacity-70 block truncate">{msg.replyTo.senderName}</span>
                            <span className="opacity-50 truncate block">{msg.replyTo.text}</span>
                          </div>
                        )}

                        {/* Content Rendering */}
                        <div className="flex flex-col gap-1">
                          {msg.type === 'text' && <p className="text-[14.5px] leading-snug whitespace-pre-wrap break-words">{msg.text}</p>}
                          
                          {msg.type === 'image' && (
                            <div className="relative group/media cursor-zoom-in">
                              <img 
                                src={msg.fileUrl || ''} 
                                className="rounded-[14px] max-w-full max-h-[340px] object-cover transition-transform group-hover/media:scale-[1.01]" 
                                onClick={() => setSelectedImage(msg.fileUrl || null)}
                                loading="lazy"
                              />
                            </div>
                          )}

                          {msg.type === 'video' && (
                            <div className={`relative ${msg.fileName === 'video-note.webm' ? 'w-48 h-48 rounded-full overflow-hidden border-2 border-white/20 shadow-xl' : 'rounded-[14px] overflow-hidden max-w-full max-h-[340px]'}`}>
                              <video 
                                src={msg.fileUrl || ''} 
                                controls={msg.fileName !== 'video-note.webm'}
                                autoPlay={msg.fileName === 'video-note.webm'}
                                loop={msg.fileName === 'video-note.webm'}
                                muted={msg.fileName === 'video-note.webm'}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          {msg.type === 'voice' && (
                            <div className="flex items-center gap-2 py-1 min-w-[180px] md:min-w-[220px]">
                              <AudioWavePlayer src={msg.fileUrl || ''} duration={msg.duration} />
                            </div>
                          )}

                          {msg.type === 'file' && (
                            <a 
                              href={msg.fileUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="flex items-center gap-3 p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all group/file"
                            >
                              <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover/file:bg-cyan-500 group-hover/file:text-white transition-all">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12.5px] font-bold truncate text-slate-100">{msg.fileName}</p>
                                <p className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter">{(msg.fileSize || 0) > 1024 * 1024 ? ((msg.fileSize || 0) / (1024 * 1024)).toFixed(1) + ' MB' : ((msg.fileSize || 0) / 1024).toFixed(1) + ' KB'}</p>
                              </div>
                            </a>
                          )}

                          {msg.type === 'poll' && msg.poll && (
                            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 w-full max-w-sm space-y-3 shadow-xl">
                              <div className="flex justify-between items-start gap-2 pb-1.5 border-b border-white/5">
                                <h4 className="font-bold text-[13px] text-white/90 leading-tight">{msg.poll.question}</h4>
                              </div>
                              <div className="space-y-1">
                                {msg.poll.options.map((opt, oIdx) => {
                                  const totalVotes = msg.poll?.options.reduce((acc, current) => acc + current.votes.length, 0) || 0;
                                  const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes.length / totalVotes) * 100);
                                  const isMyVote = opt.votes.includes(currentUser?.uid || '');
                                  return (
                                    <div 
                                      key={oIdx} 
                                      onClick={() => voteInPoll(msg.id, oIdx)}
                                      className={`p-2.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex justify-between items-center ${isMyVote ? 'bg-cyan-500/15 border-cyan-500/40' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                    >
                                      <div className="absolute inset-y-0 left-0 bg-cyan-500/10 transition-all duration-700" style={{ width: `${percentage}%` }} />
                                      <div className="flex items-center gap-2 relative z-10 truncate max-w-[80%]">
                                        {isMyVote && <Check className="w-3.5 h-3.5 text-cyan-400 font-bold" />}
                                        <span className={`text-[12px] font-medium ${isMyVote ? 'text-cyan-200' : 'text-slate-300'}`}>{opt.text}</span>
                                      </div>
                                      <span className="relative z-10 font-bold text-[10px] text-slate-400">{percentage}%</span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest text-center pt-1">
                                {msg.poll.options.reduce((acc, current) => acc + current.votes.length, 0)} {language === 'ru' ? 'ГОЛОСОВ' : 'VOTES'} • {msg.poll.isAnonymous ? (language === 'ru' ? 'АНОНИМНО' : 'ANONYMOUS') : (language === 'ru' ? 'ПУБЛИЧНО' : 'PUBLIC')}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Info Row (Time & Status) */}
                        <div className={`flex items-center gap-1 justify-end mt-0.5 select-none ${msg.type === 'text' ? 'float-right ml-4 -mr-1 mb-[-2px]' : 'absolute bottom-1.5 right-2 bg-black/30 backdrop-blur-sm px-1.5 py-0.5 rounded-full'}`}>
                          <span className={`text-[10px] font-medium opacity-60`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && (
                            <div className="flex items-center text-cyan-300">
                              {isRead ? <CheckCheck className="w-3 h-3" /> : isDelivered ? <Check className="w-3 h-3" /> : <Clock className="w-2.5 h-2.5 opacity-50" />}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Reactions Mini Tray */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className={`absolute -bottom-2 ${isMe ? 'right-2' : 'left-2'} flex items-center gap-0.5 bg-[#1c242d] border border-white/10 rounded-full px-1 py-0.5 shadow-sm z-20`}>
                          {Object.entries(msg.reactions).map(([uid, emoji], i) => (
                            <span key={uid} className="text-[10px]">{emoji}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              });

              return elements;
            })()}
          </AnimatePresence>
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

        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2.5 px-3.5 py-2 mt-1 bg-cyan-950/20 hover:bg-cyan-950/35 border border-cyan-500/20 text-cyan-400 rounded-2xl w-fit backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.06)] animate-fade-in-up font-sans relative z-10 select-none">
            <span className="flex gap-1 items-center h-2 shrink-0">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce shadow-[0_0_8px_rgba(34,211,238,0.85)]" style={{ animationDuration: '800ms', animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce shadow-[0_0_8px_rgba(34,211,238,0.85)]" style={{ animationDuration: '800ms', animationDelay: '180ms' }} />
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce shadow-[0_0_8px_rgba(34,211,238,0.85)]" style={{ animationDuration: '800ms', animationDelay: '360ms' }} />
            </span>
            <span className="text-[11px] leading-none text-slate-300 font-medium">
              <strong className="text-cyan-400 font-bold">{typingUsers.join(', ')}</strong> {typingUsers.length > 1 ? (language === 'ru' ? 'печатают...' : 'are typing...') : (language === 'ru' ? 'печатает...' : 'is typing...')}
            </span>
          </div>
        )}
      </div>

       <AnimatePresence>
         {showScrollBottom && (
           <motion.div
             initial={{ opacity: 0, y: 20, scale: 0.8 }}
             animate={{ opacity: 1, y: 0, scale: 1 }}
             exit={{ opacity: 0, y: 20, scale: 0.8 }}
             className="absolute bottom-[90px] right-4 md:right-8 z-[60]"
           >
             <button
               onClick={() => { playTapSound(); scrollToBottom(true); }}
               className="bg-slate-900/80 backdrop-blur-2xl hover:bg-slate-800 text-cyan-400 border border-white/10 p-2.5 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.5)] cursor-pointer transition-all duration-200 active:scale-90 flex items-center justify-center h-11 w-11 relative group"
               title="Jump to bottom"
             >
               <ChevronDown className="w-6 h-6 group-hover:translate-y-0.5 transition-transform" />
               {activeChat?.unreadCounts && currentUser && activeChat.unreadCounts[currentUser.uid] > 0 && (
                 <span className="absolute -top-1.5 -right-1.5 bg-cyan-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg border border-slate-950/20">
                   {activeChat.unreadCounts[currentUser.uid]}
                 </span>
               )}
             </button>
           </motion.div>
         )}
       </AnimatePresence>

      {/* Premium circular camera preview for video note capturing, mirroring high-end messenger apps */}
      <AnimatePresence>
        {isRecordingVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-slate-950/85 backdrop-blur-xl flex flex-col justify-between items-center py-10 px-6 select-none"
          >
            {/* Header description of active mode */}
            <div className="flex flex-col items-center mt-6 text-center">
              <span className="text-[10px] uppercase tracking-widest text-[#9d7cf6] font-extrabold">
                {language === 'ru' ? 'Запись видеосообщения' : 'Recording Video Note'}
              </span>
              <span className="text-xs text-slate-450 mt-1 md:mt-1.5 px-4 font-medium max-w-sm">
                {videoRecordingState === 'holding' 
                  ? (language === 'ru' ? 'Проведите пальцем вверх для фиксации режима записи' : 'Slide finger up to lock the recording mode') 
                  : (language === 'ru' ? 'Запись активна в фоновом режиме' : 'Video note recording is active')}
              </span>
            </div>

            {/* Giant Centered Circle visualizer wrapper */}
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-[350px] md:h-[350px] rounded-full overflow-hidden border-[6px] border-white/5 bg-slate-900 shadow-[0_0_60px_rgba(0,0,0,0.85)] flex items-center justify-center transition-all duration-300">
              <video 
                ref={videoPreviewRef} 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-full object-cover rounded-full transition-transform duration-100 ease-out" 
                style={{
                  transform: `${videoFacingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)'} scale(${videoZoom})`,
                }}
              />
              
              {/* Dynamic circular loader spinner when web camera stream object is not yet live */}
              {!isVideoStreamReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-slate-400 bg-slate-900 rounded-full">
                  <Loader2 className="w-9 h-9 animate-spin text-[#9d7cf6]" />
                  <span className="text-xs font-semibold">{language === 'ru' ? 'Подключение...' : 'Connecting camera...'}</span>
                </div>
              )}

              {/* Animated Progress Ring indicating active recording time (up to 60 seconds max) */}
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none select-none scale-[1.01]" viewBox="0 0 100 100">
                <circle 
                  cx="50" 
                  cy="50" 
                  r="48.5" 
                  stroke="rgba(255,255,255,0.06)" 
                  strokeWidth="1.2" 
                  fill="transparent" 
                />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="48.5" 
                  stroke="#9d7cf6" 
                  strokeWidth="1.5" 
                  fill="transparent" 
                  strokeDasharray={2 * Math.PI * 48.5}
                  strokeDashoffset={2 * Math.PI * 48.5 * (1 - (recordVideoMs / 60000))}
                  className="transition-all duration-100 ease-linear"
                />
              </svg>
            </div>

            {/* Control Layout at the bottom viewport boundary */}
            <div className="flex flex-col items-center gap-6 w-full max-w-md mb-6 z-30">
              {/* Duration Timer Badge & Cancel Trigger Pill */}
              <div className="flex items-center justify-between gap-10 px-6 py-3.5 bg-[#121214]/90 border border-white/5 shadow-2.5xl backdrop-blur-md rounded-full text-sm font-semibold select-none min-w-[270px]">
                <div className="flex items-center gap-2.5 pl-1">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping shrink-0" />
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full absolute shrink-0" />
                  <span className="font-mono tracking-wider font-extrabold text-white pl-1.5 text-base">
                    {formatVideoNoteTime(recordVideoMs)}
                  </span>
                </div>
                
                <button 
                  type="button" 
                  onClick={cancelVideoRecording}
                  className="text-rose-400 hover:text-rose-350 pr-1 uppercase tracking-widest text-[11px] font-black cursor-pointer transition-all hover:scale-105 active:scale-95 select-none"
                >
                  {language === 'ru' ? 'ОТМЕНА' : 'CANCEL'}
                </button>
              </div>

              {/* Utility actions group (camera direction switcher, device torch flash, and circular send trigger button) */}
              <div className="flex justify-between items-center w-full px-8">
                {/* Advanced Quick-toggles (Direction Swap + Camera Flash) */}
                <div className="flex items-center gap-3 bg-[#121214]/90 border border-white/5 p-1.5 rounded-full shadow-xl">
                  <button
                    type="button"
                    onClick={flipVideoCamera}
                    className="p-3 bg-white/[0.03] hover:bg-white/[0.08] active:scale-90 rounded-full text-slate-350 hover:text-white transition-all cursor-pointer"
                    title={language === 'ru' ? 'Сменить направление камеры' : 'Flip camera orientation'}
                  >
                    <RefreshCw className="w-5 h-5 text-slate-300" />
                  </button>

                  <button
                    type="button"
                    onClick={toggleFlash}
                    className={`p-3 bg-white/[0.03] hover:bg-white/[0.08] active:scale-90 rounded-full transition-all cursor-pointer ${
                      isFlashOn ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] bg-amber-500/10' : 'text-slate-350 hover:text-white'
                    }`}
                    title={language === 'ru' ? 'Включить вспышку' : 'Toggle camera torch state'}
                  >
                    <Zap className={`w-5 h-5 ${isFlashOn ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                  </button>
                </div>

                {/* Instant submission Action Button */}
                <button 
                  type="button"
                  onClick={stopVideoRecording}
                  className="w-14 h-14 rounded-full bg-[#9d7cf6] hover:bg-[#a586fb] text-white flex items-center justify-center shadow-[0_4px_24px_rgba(157,124,246,0.35)] transition-all transform hover:scale-110 active:scale-95 cursor-pointer"
                  title={language === 'ru' ? 'Завершить и отправить видеосообщение' : 'Submit active circular video note'}
                >
                  <Send className="w-5.5 h-5.5 text-white translate-x-[1px]" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply or Editing bar notification drafts */}
      <AnimatePresence>
        {(replyTarget || editTarget || selectedDraftFile || forwardingMessage) && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="px-4 py-3 mb-2 mx-4 bg-black/40 backdrop-blur-2xl border border-white/10 flex justify-between items-center text-xs text-slate-300 shadow-2xl z-20 shrink-0 rounded-[22px] relative overflow-hidden"
          >
            {/* Liquid Glass Reflection */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] to-transparent pointer-events-none" />
            
            <div className="flex items-center gap-3 min-w-0 mr-3 z-10">
              <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 shrink-0">
                {editTarget ? <Edit2 className="w-4 h-4" /> : <CornerUpLeft className="w-4 h-4" />}
              </div>
              <div className="truncate flex-1">
                {editTarget ? (
                  <>
                    <span className="font-bold block text-[10px] text-cyan-400 uppercase tracking-widest">{language === 'ru' ? 'Редактировать' : 'Edit Message'}</span>
                    <p className="truncate text-slate-400 font-medium">{editTarget.text}</p>
                  </>
                ) : replyTarget ? (
                  <>
                    <span className="font-bold block text-[10px] text-indigo-400 uppercase tracking-widest">{language === 'ru' ? 'Ответ' : 'Reply'} &bull; {replyTarget.senderName}</span>
                    <p className="truncate text-slate-400 font-medium">{replyTarget.text}</p>
                  </>
                ) : forwardingMessage ? (
                  <>
                    <span className="font-bold block text-[10px] text-emerald-400 uppercase tracking-widest">{language === 'ru' ? 'Переслать' : 'Forward'}</span>
                    <p className="truncate text-slate-400 font-medium">{forwardingMessage.text}</p>
                  </>
                ) : selectedDraftFile ? (
                  <>
                    <span className="font-bold block text-[10px] text-amber-400 uppercase tracking-widest">{language === 'ru' ? 'Файл' : 'File'}</span>
                    <p className="truncate text-slate-300 font-mono text-[11px] font-extrabold">{selectedDraftFile.name}</p>
                  </>
                ) : null}
              </div>
            </div>
            
            <motion.button 
              whileTap={{ scale: 0.9 }}
              type="button" 
              onClick={() => { setEditTarget(null); setReplyTarget(null); setSelectedDraftFile(null); setInputText(''); setForwardingMessage(null); }} 
              className="text-slate-400 hover:text-white pointer-events-auto cursor-pointer p-1.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors z-10 border border-white/5"
            >
              <X className="w-4 h-4" />
            </motion.button>
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
                  onClick={() => { playTapSound(); setStickerTrayTab('emoji'); }}
                  className={`px-3 py-1 rounded-lg font-bold border transition ${stickerTrayTab === 'emoji' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-[#141416]/80 text-slate-400 border-transparent hover:text-slate-200'}`}
                >
                  😀 {language === 'ru' ? 'Смайлики' : 'Emojis'}
                </button>
                <button 
                  type="button"
                  onClick={() => { playTapSound(); setStickerTrayTab('stickers'); }}
                  className={`px-3 py-1 rounded-lg font-bold border transition ${stickerTrayTab === 'stickers' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-[#141416]/80 text-slate-400 border-transparent hover:text-slate-200'}`}
                >
                  🎨 {language === 'ru' ? 'Стикерпак' : 'Stickers'}
                </button>
              </div>
              <button 
                type="button"
                onClick={() => { playTapSound(); setShowStickerPicker(false); }}
                className="text-slate-500 hover:text-slate-350 p-1 bg-slate-900 border border-slate-800 rounded-lg animate-fade-in"
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
                      onClick={() => { playTapSound(); handleEmojiInsert(emoji); }}
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
                            playBubbleReactionSound();
                            sendStickerMessage(stickUrl);
                            setShowStickerPicker(false);
                          }}
                          className="p-1 hover:bg-slate-900 hover:scale-115 rounded-xl transition duration-300 flex items-center justify-center cursor-pointer relative bg-slate-950/20"
                        >
                          <img src={stickUrl || undefined} alt="Sticker illustration" className="w-12 h-12 object-contain" />
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
                          onChange={(e) => { playTapSound(); handleCustomStickerUpload(e); }} 
                          className="hidden" 
                          disabled={uploadingSticker} 
                        />
                      </label>

                      {userProfile?.stickers?.map((stickUrl, idx) => (
                        <button
                          key={`cust-stk-${idx}`}
                          type="button"
                          onClick={() => {
                            playBubbleReactionSound();
                            sendStickerMessage(stickUrl);
                            setShowStickerPicker(false);
                          }}
                          className="p-1 hover:bg-slate-900 hover:scale-115 rounded-xl transition duration-300 flex items-center justify-center cursor-pointer relative bg-slate-950/20"
                        >
                          <img src={stickUrl || undefined} alt="Custom user sticker" className="w-12 h-12 object-contain" />
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

      {/* VisionOS Floating Composer Area */}
      <div className="px-3 md:px-6 pb-4 md:pb-6 relative z-[150] select-none">
        <div className="max-w-5xl mx-auto flex items-end gap-2 sm:gap-3 relative">
          
          {/* Floating Action Menu - Attachment Options Dropdown Overlay */}
          <AnimatePresence>
            {showAttachmentDropdown && (
              <>
                <div className="fixed inset-0 z-[199]" onClick={() => setShowAttachmentDropdown(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-[76px] left-0 z-[200] glass-surface-floating rounded-[32px] p-3 min-w-[260px] space-y-1.5 text-slate-200 select-none overflow-hidden"
                >
                  <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-cyan-400/80 px-4 py-2 mb-1 border-b border-white/5 opacity-80">
                    {language === 'ru' ? 'Вложения' : 'Attachments'}
                  </div>

                  <div className="grid grid-cols-1 gap-1">
                    <label className="flex items-center gap-4 px-4 py-3 hover:bg-white/10 rounded-2xl cursor-pointer transition-all active:scale-95 group">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white transition-all">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-bold block">{language === 'ru' ? 'Файл' : 'File'}</span>
                        <span className="text-[10px] text-slate-500 font-medium block">{language === 'ru' ? 'Документы, фото' : 'Documents, photos'}</span>
                      </div>
                      <input type="file" onChange={(e) => { handleImmediateFileUpload(e); setShowAttachmentDropdown(false); }} className="hidden" />
                    </label>

                    <button
                      type="button"
                      onClick={(e) => {
                        setShowAttachmentDropdown(false);
                        if (isRecordingVideo) stopVideoRecording();
                        else startVideoRecording(e.clientX, e.clientY);
                      }}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-white/10 rounded-2xl cursor-pointer transition-all active:scale-95 group w-full text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/20 group-hover:bg-purple-500 group-hover:text-white transition-all">
                        <Video className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-bold block">{language === 'ru' ? 'Видеосообщение' : 'Video Note'}</span>
                        <span className="text-[10px] text-slate-500 font-medium block">{language === 'ru' ? 'Кружок' : 'Circular video'}</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setShowAttachmentDropdown(false); setShowPollCreator(true); }}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-white/10 rounded-2xl cursor-pointer transition-all active:scale-95 group w-full text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-white transition-all">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-bold block">{language === 'ru' ? 'Опрос' : 'Poll'}</span>
                        <span className="text-[10px] text-slate-500 font-medium block">{language === 'ru' ? 'Голосование' : 'Interactive poll'}</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setIsSilent(!isSilent); setShowAttachmentDropdown(false); }}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-white/10 rounded-2xl cursor-pointer transition-all active:scale-95 group w-full text-left"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${isSilent ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-500/20 text-slate-400 border-slate-500/20 group-hover:bg-slate-500 group-hover:text-white'}`}>
                        {isSilent ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-bold block">{isSilent ? (language === 'ru' ? 'Со звуком' : 'With Sound') : (language === 'ru' ? 'Без звука' : 'Send Silently')}</span>
                        <span className="text-[10px] text-slate-500 font-medium block">{isSilent ? 'Notifications ON' : 'No push sound'}</span>
                      </div>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Transparent full-screen holding overlay to detect swipes & gestures cleanly */}
          {(recordingState === 'holding' || videoRecordingState === 'holding') && (
            <div 
              className="fixed inset-0 z-[9999] bg-black/10 backdrop-blur-[0.5px] select-none pointer-events-none touch-none"
            />
          )}

          {/* Redesigned Floating Capsule Composer */}
          <div className={`px-2 pb-4 sm:px-4 sm:pb-6 z-[200] max-w-5xl mx-auto w-full pointer-events-none mt-auto transition-all duration-300 ${!isKeyboardOpen ? 'mb-[80px]' : 'mb-0'}`}>
            <AnimatePresence>
              {replyTarget && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="mx-3 mb-2 p-2 glass-panel rounded-[18px] flex items-center gap-3 pointer-events-auto border border-white/10"
                >
                  <div className="w-1 bg-cyan-500 h-8 rounded-full shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-cyan-400 leading-tight mb-0.5">{replyTarget.senderName}</p>
                    <p className="text-[12px] text-slate-300 truncate opacity-80">{replyTarget.text}</p>
                  </div>
                  <button onClick={() => { playTapSound(); setReplyTarget(null); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

          <div className="flex items-end gap-2 pointer-events-auto px-2">
            <div className="flex-1 glass-panel rounded-[26px] relative flex items-end overflow-hidden border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] bg-white/[0.03] backdrop-blur-[40px]">
              <AnimatePresence mode="wait">
                {(recordingState !== 'idle' || videoRecordingState !== 'idle') ? (
                  <motion.div 
                    key="recording-ui"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex-1 flex items-center justify-between px-4 py-3 h-12"
                  >
                    <div className="flex items-center gap-3">
                      <motion.div 
                        animate={{ opacity: [1, 0.4, 1] }} 
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="w-2.5 h-2.5 bg-rose-500 rounded-full" 
                      />
                      <span className="text-[14px] font-mono font-bold text-white tabular-nums">
                        {(() => {
                          const dur = recordingMode === 'voice' ? recordDuration : recordVideoDuration;
                          return dur >= 60 ? `${Math.floor(dur/60)}:${(dur%60).toString().padStart(2, '0')}` : `0:${dur.toString().padStart(2, '0')}`;
                        })()}
                      </span>
                    </div>

                    <div className="flex-1 flex items-center justify-center gap-[2px] px-4 overflow-hidden h-6 opacity-60">
                      {[...Array(20)].map((_, i) => (
                        <motion.div 
                          key={i}
                          animate={{ height: ['40%', `${Math.random() * 100}%`, '40%'] }}
                          transition={{ repeat: Infinity, duration: 0.5 + Math.random() }}
                          className="w-[2px] bg-cyan-400 rounded-full"
                        />
                      ))}
                    </div>

                    {(recordingState === 'locked' || videoRecordingState === 'locked') && (
                      <button 
                        onClick={() => {
                          if (recordingMode === 'voice') cancelRecording();
                          else {
                            isVideoCancelledRef.current = true;
                            if (videoRecorderRef.current) videoRecorderRef.current.stop();
                            setIsRecordingVideo(false);
                            setVideoRecordingState('idle');
                          }
                        }}
                        className="text-[12px] font-bold text-rose-400 hover:text-rose-300 uppercase tracking-widest px-2"
                      >
                        {language === 'ru' ? 'Отмена' : 'Cancel'}
                      </button>
                    )}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="input-ui"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex items-end"
                  >
                    <motion.button 
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { playTapSound(); setShowAttachmentDropdown(!showAttachmentDropdown); }}
                      className={`w-12 h-12 flex items-center justify-center transition-colors shrink-0 ${showAttachmentDropdown ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      <Paperclip className="w-5 h-5" />
                    </motion.button>
                    
                    <TextareaAutosize
                      ref={inputRef as any}
                      autoFocus
                      placeholder={language === 'ru' ? 'Сообщение...' : 'Message...'}
                      value={inputText}
                      onChange={(e) => {
                        handleInputChange(e.target.value);
                        if (activeChat) sendTypingStatus(activeChat.id);
                      }}
                      onKeyDown={handleKeyDown}
                      className="flex-1 bg-transparent border-none text-white placeholder-slate-500 py-3 px-1 text-[15px] resize-none focus:outline-none max-h-[160px] min-h-[48px] leading-snug"
                    />
                    
                    <motion.button 
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { playTapSound(); setShowStickerPicker(!showStickerPicker); }}
                      className={`w-12 h-12 flex items-center justify-center transition-colors shrink-0 ${showStickerPicker ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      <Smile className="w-5 h-5" />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button 
              type="button"
              whileTap={{ scale: 0.9 }}
              onPointerDown={(e) => {
                if (!inputText.trim()) {
                  playUnlockSound();
                  try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
                  if (recordingMode === 'voice') startRecording(e.clientX, e.clientY);
                  else startVideoRecording(e.clientX, e.clientY);
                }
              }}
              onPointerMove={(e) => {
                if (recordingMode === 'voice') handleRecordMove(e.clientX, e.clientY);
                else handleVideoRecordMove(e.clientX, e.clientY);
              }}
              onPointerUp={(e) => {
                if (inputText.trim()) {
                  playTapSound();
                  handleMessageSend(e as any);
                } else {
                  playLockSound();
                  try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {}
                  if (recordingMode === 'voice') handleRecordRelease();
                  else handleVideoRecordRelease();
                }
              }}
              className={`w-[48px] h-[48px] rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 shrink-0 ${
                inputText.trim() ? 'bg-sky-500 text-white shadow-[0_0_20px_rgba(14,165,233,0.4)]' : 'bg-white/10 text-slate-300 backdrop-blur-xl border border-white/10'
              }`}
            >
              <AnimatePresence mode="wait">
                {inputText.trim() ? (
                  <motion.div key="send" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 45 }}>
                    <Send className="w-5 h-5 fill-white" />
                  </motion.div>
                ) : (
                  <motion.div key={recordingMode} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    {recordingMode === 'voice' ? <Mic className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
          </div>



            {/* No old recording UI overlay */}

            {/* Gesture Swipe Lock indicator tooltip in holding mode */}
                  {(recordingState === 'holding' || videoRecordingState === 'holding') && (() => {
                    const gestures = recordingState === 'holding' ? recordGestures : videoGestures;
                    return (
                      <>
                        <div className="absolute inset-x-0 -top-12 flex justify-center pointer-events-none transition-opacity duration-150 z-50">
                          <div className={`bg-slate-900/95 text-[10px] border px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all ${
                            gestures.startY - gestures.currentY > 30 
                              ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10 scale-110 font-bold' 
                              : gestures.startX - gestures.currentX > 40
                              ? 'border-rose-500/50 text-rose-400 bg-rose-500/10 scale-110 font-bold'
                              : 'border-cyan-500/15 text-[var(--glass-accent)]'
                          }`}>
                            {gestures.startY - gestures.currentY > 30 ? (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>{language === 'ru' ? 'Отпустите для фиксации' : 'Release to Lock'}</span>
                              </>
                            ) : gestures.startX - gestures.currentX > 40 ? (
                              <>
                                <Trash2 className="w-3 h-3" />
                                <span>{language === 'ru' ? 'Отпустите для отмены' : 'Release to Cancel'}</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>{language === 'ru' ? 'Свайп ⬆️ фиксация / ⬅️ отмена' : 'Swipe ⬆️ to lock / ⬅️ to cancel'}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {/* Floating Mic for gesture drag feedback representing the finger */}
                        <div 
                          className={`fixed z-[10000] pointer-events-none drop-shadow-[0_0_15px_rgba(6,182,212,0.6)] flex items-center justify-center p-3.5 rounded-full text-white shadow-xl transition-all ${
                            gestures.startX - gestures.currentX > 40 ? 'bg-rose-500' : 'bg-[var(--glass-accent)]'
                          }`}
                          style={{
                            left: gestures.currentX - 25,
                            top: gestures.currentY - 25,
                            transform: `scale(${gestures.startX - gestures.currentX > 40 ? 0.8 : gestures.startY - gestures.currentY > 30 ? 1.3 : 1.15})`,
                            opacity: gestures.startX - gestures.currentX > 40 ? 0.7 : 1
                          }}
                        >
                          {recordingState === 'holding' ? <Mic className="w-6 h-6 animate-pulse" /> : <Video className="w-6 h-6 animate-pulse text-amber-300" />}
                        </div>
                      </>
                    );
                  })()}
              {/* Poll Creator Portal Overlay */}
      <AnimatePresence>
        {showPollCreator && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-2xl flex items-center justify-center p-4 z-[600] select-none"
            onClick={() => setShowPollCreator(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30, filter: 'blur(20px)' }}
              animate={{ scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ scale: 0.9, y: 30, filter: 'blur(20px)' }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, info) => {
                if (Math.abs(info.offset.y) > 80) {
                  setShowPollCreator(false);
                }
              }}
              className="w-full max-w-sm vision-floating-header border border-white/20 rounded-[36px] p-7 shadow-[0_30px_70px_rgba(0,0,0,0.6)] space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div className="flex flex-col">
                  <span className="font-black text-white text-[20px] tracking-tight">{language === 'ru' ? 'Новый опрос' : 'New Poll'}</span>
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{language === 'ru' ? 'ОБЩЕСТВЕННОЕ МНЕНИЕ' : 'PUBLIC OPINION'}</span>
                </div>
                <button type="button" onClick={() => setShowPollCreator(false)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05] rounded-[18px] transition active:scale-90 cursor-pointer border border-white/10"><X className="w-5 h-5" /></button>
              </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[10.5px] text-cyan-400/90 font-black uppercase tracking-widest mb-2 ml-1">{language === 'ru' ? 'Вопрос' : 'Question'}</label>
                <input 
                  type="text" 
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder={language === 'ru' ? 'О чем спросим?' : 'What to ask?'}
                  className="w-full bg-black/30 border border-white/10 rounded-[22px] px-5 py-4 text-[15px] text-white focus:outline-none focus:border-cyan-400/50 focus:bg-black/50 transition-all shadow-inner font-bold placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-[10.5px] text-cyan-400/90 font-black uppercase tracking-widest mb-2 ml-1">{language === 'ru' ? 'Варианты (через запятую)' : 'Options (comma separated)'}</label>
                <textarea 
                  value={pollOptionsInput}
                  onChange={(e) => setPollOptionsInput(e.target.value)}
                  placeholder={language === 'ru' ? 'Да, Нет, Возможно' : 'Yes, No, Maybe'}
                  className="w-full h-28 bg-black/30 border border-white/10 rounded-[22px] px-5 py-4 text-[15px] text-white focus:outline-none focus:border-cyan-400/50 focus:bg-black/50 resize-none transition-all shadow-inner custom-scrollbar font-bold placeholder-slate-600"
                />
              </div>

              <div className="flex flex-wrap items-center gap-5 pt-1">
                <label className="flex items-center gap-3 cursor-pointer text-[13px] text-slate-200 group font-bold">
                  <div className={`w-6 h-6 rounded-[10px] border flex items-center justify-center transition-all duration-300 ${pollIsMultiple ? 'bg-cyan-500 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-white/5 border-white/20 group-hover:border-white/40'}`}>
                    {pollIsMultiple && <Check className="w-4 h-4 text-white font-black" />}
                  </div>
                  <input 
                    type="checkbox"
                    checked={pollIsMultiple}
                    onChange={(e) => setPollIsMultiple(e.target.checked)}
                    className="hidden"
                  />
                  <span>{language === 'ru' ? 'Несколько ответов' : 'Multiple choices'}</span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer text-[13px] text-slate-200 group font-bold">
                  <div className={`w-6 h-6 rounded-[10px] border flex items-center justify-center transition-all duration-300 ${pollIsAnonymous ? 'bg-cyan-500 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-white/5 border-white/20 group-hover:border-white/40'}`}>
                    {pollIsAnonymous && <Check className="w-4 h-4 text-white font-black" />}
                  </div>
                  <input 
                    type="checkbox"
                    checked={pollIsAnonymous}
                    onChange={(e) => setPollIsAnonymous(e.target.checked)}
                    className="hidden"
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
                  showToast(language === 'ru' ? 'Введите минимум 2 варианта!' : 'Enter at least 2 options!', 'error');
                  return;
                }
                await sendPollMessage(pollQuestion.trim(), opts, pollIsAnonymous, pollIsMultiple);
                setPollQuestion('');
                setPollOptionsInput('');
                setShowPollCreator(false);
                setTimeout(() => scrollContainerRef.current?.scrollTo({ top: 9999999 }), 200);
              }}
              className="w-full py-4.5 bg-gradient-to-r from-cyan-500 to-sky-600 hover:opacity-95 text-white font-black rounded-[22px] text-[15px] tracking-tight transition shadow-[0_15px_30px_rgba(6,182,212,0.3)] active:scale-95 cursor-pointer border border-white/10"
            >
              {language === 'ru' ? 'Создать опрос' : 'Create Poll'}
            </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Selected Image Fullscreen Modal Viewer */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(40px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            className="fixed inset-0 bg-black/40 z-[1000] flex items-center justify-center p-4 sm:p-8 select-none cursor-zoom-out overflow-hidden"
            onClick={() => setSelectedImage(null)}
          >
            <motion.button 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              type="button"
              onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
              className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-xl border border-white/20 transition-all z-[1010] cursor-pointer"
              title={language === 'ru' ? 'Закрыть' : 'Close'}
            >
              <X className="w-6 h-6" />
            </motion.button>
            
            <motion.img 
              initial={{ scale: 0.8, opacity: 0, filter: 'blur(20px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              exit={{ scale: 0.8, opacity: 0, filter: 'blur(20px)' }}
              transition={{ type: 'spring', stiffness: 260, damping: 25 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.4}
              onDragEnd={(e, info) => {
                if (Math.abs(info.offset.y) > 100) {
                  setSelectedImage(null);
                }
              }}
              src={selectedImage} 
              alt="Fullscreen preview" 
              className="max-w-full max-h-full object-contain rounded-[36px] shadow-[0_60px_120px_rgba(0,0,0,0.8)] border border-white/20 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected User Full Profile Modal Viewer */}
      <AnimatePresence>
        {selectedUserProfile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-hidden"
            onClick={() => setSelectedUserProfile(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.3}
              onDragEnd={(e, info) => {
                if (info.offset.y > 100 || info.offset.y < -100) {
                  setSelectedUserProfile(null);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm glass-panel text-slate-100 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col relative" 
              style={{ background: 'var(--glass-sidebar-bg)' }}
            >
              
              {/* Upper cover area */}
              <div className="h-24 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-purple-500/10 border-b border-white/5 relative shrink-0"
                   style={{ touchAction: 'none' }} // Prevents default touch moves acting strangely during drag
              >
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
                <div className="relative pointer-events-none">
                  <img 
                    src={selectedUserProfile.photoURL || undefined} 
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
                          setToast({ message: language === 'ru' ? 'Ошибка начала чата: ' + err.message : 'Error starting chat: ' + err.message, type: 'error' });
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
                          setToast({ message: language === 'ru' ? 'Контакт добавлен' : 'Contact added', type: 'success' });
                          const refreshedProfileSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', selectedUserProfile.uid)));
                          if (!refreshedProfileSnap.empty) {
                            setSelectedUserProfile(refreshedProfileSnap.docs[0].data() as UserProfile);
                          }
                        } catch (err: any) {
                          setToast({ message: err.message, type: 'error' });
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

                    <div className="flex flex-col gap-1 w-full mt-2 col-span-2">
                       <button
                         onClick={() => {
                           const shareUrl = `${window.location.origin}/user/${selectedUserProfile.username}`;
                           navigator.clipboard.writeText(shareUrl);
                           setToast({ message: language === 'ru' ? 'Ссылка на профиль скопирована' : 'Profile link copied', type: 'info' });
                         }}
                         className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center justify-center gap-2 cursor-pointer transition-all"
                       >
                         <Share2 className="w-3 h-3" />
                         {language === 'ru' ? 'Профиль' : 'Share'}
                       </button>
                       <button
                         onClick={() => {
                           setToast({ message: language === 'ru' ? 'Жалоба отправлена модераторам' : 'Report sent to moderators', type: 'info' });
                         }}
                         className="flex-1 py-2 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 rounded-xl text-[10px] uppercase font-bold tracking-widest text-rose-400 flex items-center justify-center gap-2 cursor-pointer transition-all"
                       >
                         <ShieldAlert className="w-3 h-3" />
                         {language === 'ru' ? 'Пожаловаться' : 'Report'}
                       </button>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 text-center text-slate-500 text-[10px] uppercase font-mono italic p-2 tracking-wider bg-black/10 rounded-xl border border-white/5">
                    {language === 'ru' ? 'Это ваш публичный профиль' : 'This is your public profile'}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

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
              transition={{ type: "spring", damping: 32, stiffness: 400 }}
              className="fixed bottom-0 left-0 right-0 z-[160] bg-black/60 backdrop-blur-3xl border-t border-white/10 rounded-t-[40px] px-6 pt-2 pb-10 flex md:hidden flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.6)]"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(e, info) => {
                if (info.offset.y > 100) setActiveMessageMenuId(null);
              }}
            >
              <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6 mt-2" />
              
              <div className="flex justify-between items-center mb-6 bg-white/5 p-4 rounded-[28px] border border-white/5 backdrop-blur-xl">
                {['👍', '❤️', '😂', '🔥', '😮', '🙏'].map((emoji) => (
                   <motion.button 
                     whileTap={{ scale: 1.4 }}
                     key={emoji}
                     onClick={() => {
                       handleTriggerReaction(activeMenuMessage.id, emoji);
                       setActiveMessageMenuId(null);
                     }}
                     className="text-2xl transition cursor-pointer"
                   >
                     {emoji}
                   </motion.button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => { setReplyTarget(activeMenuMessage); setActiveMessageMenuId(null); }}
                  className="flex items-center gap-3 w-full p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-left text-[13px] font-bold text-slate-100 active:scale-95 transition border border-white/5"
                >
                  <Reply className="w-5 h-5 text-cyan-400" />
                  {language === 'ru' ? 'Ответить' : 'Reply'}
                </button>

                <button 
                  onClick={() => { triggerCopyAction(activeMenuMessage.text); setActiveMessageMenuId(null); }}
                  className="flex items-center gap-3 w-full p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-left text-[13px] font-bold text-slate-100 active:scale-95 transition border border-white/5"
                >
                  <Copy className="w-5 h-5 text-slate-400" />
                  {language === 'ru' ? 'Копировать' : 'Copy'}
                </button>

                <button 
                  onClick={() => { setForwardingMessage(activeMenuMessage); setActiveMessageMenuId(null); }}
                  className="flex items-center gap-3 w-full p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-left text-[13px] font-bold text-slate-100 active:scale-95 transition border border-white/5"
                >
                  <Forward className="w-5 h-5 text-indigo-400" />
                  {language === 'ru' ? 'Переслать' : 'Forward'}
                </button>

                <button 
                  onClick={() => { saveMessageToFavorites(activeMenuMessage); setActiveMessageMenuId(null); }}
                  className="flex items-center gap-3 w-full p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-left text-[13px] font-bold text-slate-100 active:scale-95 transition border border-white/5"
                >
                  <Bookmark className="w-5 h-5 text-amber-400" />
                  {language === 'ru' ? 'В избранное' : 'Favorite'}
                </button>

                {activeMenuMessage.senderId === currentUser?.uid && (
                  <button 
                    onClick={() => { setEditTarget(activeMenuMessage); setInputText(activeMenuMessage.text); setActiveMessageMenuId(null); }}
                    className="flex items-center gap-3 w-full p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-left text-[13px] font-bold text-slate-100 active:scale-95 transition border border-white/5"
                  >
                    <Edit2 className="w-5 h-5 text-emerald-400" />
                    {language === 'ru' ? 'Изменить' : 'Edit'}
                  </button>
                )}

                <button 
                  onClick={() => { pinMessage(activeChat?.id || '', activeMenuMessage.id); setActiveMessageMenuId(null); }}
                  className="flex items-center gap-3 w-full p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-left text-[13px] font-bold text-slate-100 active:scale-95 transition border border-white/5"
                >
                  <Pin className="w-5 h-5 text-cyan-400" />
                  {language === 'ru' ? 'Закрепить' : 'Pin'}
                </button>
              </div>

              {activeMenuMessage.senderId === currentUser?.uid && (
                <button 
                  onClick={() => { deleteMessage(activeMenuMessage.id); setActiveMessageMenuId(null); }}
                  className="flex items-center gap-3 w-full p-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-2xl text-left text-[13px] font-bold active:scale-95 transition border border-rose-500/10 mt-2"
                >
                  <Trash2 className="w-5 h-5" />
                  {language === 'ru' ? 'Удалить для всех' : 'Delete for Everyone'}
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating emoji reactions canvas layer */}
      <AnimatePresence>
        {activeFloatingReactions.map((reaction) => (
          <motion.div
            key={reaction.id}
            initial={{ opacity: 0, scale: 0.3, y: reaction.y, x: reaction.x - 20 }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              scale: [0.3, 1.6, 1.4, 0.8],
              y: reaction.y - 120, // Float up by 120px
              x: reaction.x - 20 + Math.sin(reaction.y) * 15, // Sine wave sway
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{
              position: 'fixed',
              pointerEvents: 'none',
              zIndex: 9999,
              fontSize: '2.5rem',
              textShadow: '0 0 10px rgba(0,0,0,0.5)',
            }}
          >
            {reaction.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Forwarding Modal */}
      <AnimatePresence>
        {forwardingMessage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setForwardingMessage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-white/5 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">{language === 'ru' ? 'Переслать сообщение' : 'Forward Message'}</h3>
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">Select destination node</p>
                </div>
                <button onClick={() => setForwardingMessage(null)} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-white/5 border-b border-white/5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text"
                    autoFocus
                    placeholder={language === 'ru' ? 'Поиск чатов...' : 'Search chats...'}
                    value={forwardSearchQuery}
                    onChange={(e) => setForwardSearchQuery(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-all font-sans"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {chats
                  .filter(c => {
                    const name = c.type === 'direct' 
                      ? globalUsers.find(u => u.uid === c.members.find(m => m !== currentUser?.uid))?.displayName || 'Unknown'
                      : c.title;
                    return name.toLowerCase().includes(forwardSearchQuery.toLowerCase());
                  })
                  .map(c => {
                    const targetUser = c.type === 'direct' 
                      ? globalUsers.find(u => u.uid === c.members.find(m => m !== currentUser?.uid))
                      : null;
                    const chatName = c.type === 'direct' ? targetUser?.displayName || 'Unknown' : c.title;

                    return (
                      <button
                        key={c.id}
                        onClick={async () => {
                          await handleForwardMessage(c.id);
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.03] rounded-2xl transition group text-left"
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 shrink-0 border border-white/5">
                          <img src={c.type === 'direct' ? targetUser?.photoURL || undefined : c.photoURL || undefined} alt={chatName} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-200 truncate">{chatName}</div>
                          <div className="text-[10px] text-slate-500 font-mono uppercase tracking-tight">
                            {c.type === 'direct' ? `@${targetUser?.username || 'user'}` : `${c.members.length} members`}
                          </div>
                        </div>
                        <Send className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </button>
                    );
                  })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
      </div>
      </div>
    </motion.div>
  </AnimatePresence>

      {floatingHearts.map(heart => (
        <span 
          key={heart.id} 
          className="fixed text-4xl pointer-events-none select-none z-50 animate-float-heart"
          style={{
            left: heart.x - 20,
            top: heart.y - 45,
            transformOrigin: 'center'
          }}
        >
          ❤️
        </span>
      ))}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 border border-cyan-500/35 text-[11.5px] font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 text-slate-100 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-none max-w-sm w-[90%]">
          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-green-400" />
          <span className="text-center">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
