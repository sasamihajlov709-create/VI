type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
}

const MAX_LOGS = 1000;

class Logger {
  private logs: LogEntry[] = [];
  private initialized = false;
  private listeners: (() => void)[] = [];

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  private addLog(level: LogLevel, message: string, context?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };
    
    this.logs.push(entry);
    if (this.logs.length > MAX_LOGS) {
      this.logs.shift();
    }
    
    if (level === 'error') {
      console.error(`[${entry.timestamp}] ${message}`, context || '');
    } else if (level === 'warn') {
      console.warn(`[${entry.timestamp}] ${message}`, context || '');
    } else {
      console.log(`[${entry.timestamp}] ${message}`, context || '');
    }

    try {
      localStorage.setItem('messenger_app_logs', JSON.stringify(this.logs));
    } catch (e) {
      // Ignore quota exceeded
    }
    
    this.notify();
  }

  public init() {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const saved = localStorage.getItem('messenger_app_logs');
      if (saved) {
        this.logs = JSON.parse(saved);
      }
    } catch (e) {}

    window.addEventListener('error', (event) => {
      this.error('Unhandled Exception', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', {
        reason: event.reason?.message || String(event.reason),
        stack: event.reason?.stack
      });
    });
  }

  public info(message: string, context?: any) {
    this.addLog('info', message, context);
  }

  public warn(message: string, context?: any) {
    this.addLog('warn', message, context);
  }

  public error(message: string, context?: any) {
    this.addLog('error', message, context);
  }

  public getLogs() {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    localStorage.removeItem('messenger_app_logs');
    this.notify();
  }
}

export const logger = new Logger();

// Optionally expose to window for easy debugging in console
if (typeof window !== 'undefined') {
  (window as any).appLogger = logger;
}
