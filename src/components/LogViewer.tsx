import React, { useState, useEffect, useRef } from 'react';
import { logger } from '../lib/logger';
import { Terminal, Trash2, X, ChevronDown, ChevronUp, Filter, Maximize2, Minimize2 } from 'lucide-react';

type FilterLevel = 'all' | 'info' | 'warn' | 'error';

export const LogViewer: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [logs, setLogs] = useState(logger.getLogs());
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial fetch
    setLogs(logger.getLogs());

    // Subscribe to logger updates
    const unsubscribe = logger.subscribe(() => {
      setLogs(logger.getLogs());
    });

    // Setup keyboard shortcut (Ctrl + Shift + L)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setVisible(v => !v);
      }
    };

    // Setup touch gestures for mobile (3 finger tap or 5 rapid single taps)
    let tapCount = 0;
    let tapTimer: ReturnType<typeof setTimeout>;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 3) {
        setVisible(v => !v);
        return;
      }

      tapCount++;
      clearTimeout(tapTimer);
      
      if (tapCount >= 5) {
        setVisible(v => !v);
        tapCount = 0;
      } else {
        tapTimer = setTimeout(() => {
          tapCount = 0;
        }, 400);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart);
    return () => {
      unsubscribe();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      clearTimeout(tapTimer);
    };
  }, []);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, expanded, visible, autoScroll]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
    setAutoScroll(isAtBottom);
  };

  const filteredLogs = logs.filter(log => filterLevel === 'all' || log.level === filterLevel);

  if (!visible) return null;

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'warn': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'info': return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  return (
    <div 
      className={`fixed ${expanded ? 'inset-4 rounded-xl' : 'bottom-0 left-0 right-0 h-80 rounded-t-xl'} z-[9999] bg-[#0A0A0A] border border-white/10 shadow-2xl flex flex-col font-mono text-sm overflow-hidden transition-all duration-200`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-slate-200 uppercase tracking-wider text-xs">System Logger</span>
          <span className="text-xs text-slate-500 bg-black/40 px-2 py-0.5 rounded-full">{logs.length} logs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            {(['all', 'info', 'warn', 'error'] as const).map(level => (
              <button
                key={level}
                onClick={() => setFilterLevel(level)}
                className={`px-2 py-1 uppercase text-[10px] font-bold rounded flex items-center transition-colors ${filterLevel === level ? getLevelColor(level) : 'text-slate-500 hover:bg-white/10'}`}
              >
                {level}
              </button>
            ))}
          </div>

          <button 
            onClick={() => logger.clearLogs()}
            title="Clear Logs"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-white/10 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Restore down" : "Maximize"}
            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-white/10 rounded transition-colors"
          >
            {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button 
            onClick={() => setVisible(false)}
            title="Close"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Log Output Area */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-1 scroll-smooth bg-black/50"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-600 text-xs uppercase tracking-widest">
            No logs to display
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div key={index} className="flex gap-3 text-[11px] md:text-xs leading-relaxed group border-b border-white/[0.02] pb-1">
              <div className="text-slate-600 shrink-0 select-none">
                {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}.{new Date(log.timestamp).getMilliseconds().toString().padStart(3, '0')}
              </div>
              <div className={`uppercase w-12 shrink-0 font-bold ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-cyan-400'}`}>
                {log.level}
              </div>
              <div className="flex-1 text-slate-300 break-words font-sans">
                {log.message}
                {log.context && (
                  <pre className="mt-1 p-2 bg-black/60 rounded text-[10px] text-slate-400 overflow-x-auto border border-white/[0.02]">
                    {JSON.stringify(log.context, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Status Bar */}
      <div className="px-4 py-1.5 bg-black/80 border-t border-white/5 text-[10px] text-slate-500 uppercase flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span>{autoScroll ? 'Auto-scroll Enabled' : 'Auto-scroll Paused'}</span>
          {!autoScroll && (
            <button onClick={() => setAutoScroll(true)} className="text-cyan-400 hover:underline">
              Resume
            </button>
          )}
        </div>
        <div>
          Shortcut: Ctrl+Shift+L <span className="opacity-50">|</span> 5x Tap / 3-finger Tap
        </div>
      </div>
    </div>
  );
};
