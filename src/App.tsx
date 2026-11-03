import { useState, useEffect, useCallback, useRef } from 'react';

// Types
type Mode = 'focus' | 'shortBreak' | 'longBreak';

interface Settings {
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
}

interface TodayStats {
  date: string;
  sessions: number;
  totalFocusSeconds: number;
}

// Constants
const DEFAULT_SETTINGS: Settings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
};

const MODE_CONFIG = {
  focus: { label: 'Focus', color: '#ef4444', bgColor: 'bg-red-500', textColor: 'text-red-400' },
  shortBreak: { label: 'Short Break', color: '#22c55e', bgColor: 'bg-green-500', textColor: 'text-green-400' },
  longBreak: { label: 'Long Break', color: '#3b82f6', bgColor: 'bg-blue-500', textColor: 'text-blue-400' },
};

// Utility functions
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function loadSettings(): Settings {
  try {
    const saved = localStorage.getItem('pomodoro-settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: Settings): void {
  localStorage.setItem('pomodoro-settings', JSON.stringify(settings));
}

function loadStats(): TodayStats {
  try {
    const saved = localStorage.getItem('pomodoro-stats');
    if (saved) {
      const stats = JSON.parse(saved);
      if (stats.date === getToday()) return stats;
    }
  } catch { /* ignore */ }
  return { date: getToday(), sessions: 0, totalFocusSeconds: 0 };
}

function saveStats(stats: TodayStats): void {
  localStorage.setItem('pomodoro-stats', JSON.stringify(stats));
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// Circular Progress Component
function CircularProgress({ progress, color, size = 280, strokeWidth = 8 }: {
  progress: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="timer-ring"
      />
    </svg>
  );
}

// Settings Modal Component
function SettingsModal({ settings, onSave, onClose }: {
  settings: Settings;
  onSave: (s: Settings) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<Settings>({ ...settings });

  const handleSave = () => {
    onSave(local);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-slate-800 border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-6 text-center">⚙️ Timer Settings</h2>

        <div className="space-y-5">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Focus Duration (minutes)</label>
            <input
              type="number"
              min={1}
              max={120}
              value={local.focusDuration}
              onChange={(e) => setLocal({ ...local, focusDuration: parseInt(e.target.value) || 1 })}
              className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Short Break (minutes)</label>
            <input
              type="number"
              min={1}
              max={30}
              value={local.shortBreakDuration}
              onChange={(e) => setLocal({ ...local, shortBreakDuration: parseInt(e.target.value) || 1 })}
              className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Long Break (minutes)</label>
            <input
              type="number"
              min={1}
              max={60}
              value={local.longBreakDuration}
              onChange={(e) => setLocal({ ...local, longBreakDuration: parseInt(e.target.value) || 1 })}
              className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Long Break After (sessions)</label>
            <input
              type="number"
              min={2}
              max={10}
              value={local.longBreakInterval}
              onChange={(e) => setLocal({ ...local, longBreakInterval: parseInt(e.target.value) || 2 })}
              className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// Main App Component
export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [mode, setMode] = useState<Mode>('focus');
  const [timeLeft, setTimeLeft] = useState(settings.focusDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [stats, setStats] = useState<TodayStats>(loadStats);
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedFocusRef = useRef(0);

  const totalDuration = mode === 'focus'
    ? settings.focusDuration * 60
    : mode === 'shortBreak'
      ? settings.shortBreakDuration * 60
      : settings.longBreakDuration * 60;

  const progress = 1 - timeLeft / totalDuration;

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Timer completed
            handleTimerComplete();
            return 0;
          }
          if (mode === 'focus') {
            elapsedFocusRef.current += 1;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, mode]);

  // Update document title
  useEffect(() => {
    const modeLabel = MODE_CONFIG[mode].label;
    document.title = `${formatTime(timeLeft)} - ${modeLabel} | Pomodoro`;
    return () => { document.title = 'Pomodoro Focus Timer'; };
  }, [timeLeft, mode]);

  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);
    elapsedFocusRef.current = 0;

    if (mode === 'focus') {
      const newSessions = sessionsCompleted + 1;
      setSessionsCompleted(newSessions);

      // Update stats
      const newStats: TodayStats = {
        date: getToday(),
        sessions: stats.sessions + 1,
        totalFocusSeconds: stats.totalFocusSeconds + settings.focusDuration * 60,
      };
      setStats(newStats);
      saveStats(newStats);

      // Auto-switch to break
      if (newSessions % settings.longBreakInterval === 0) {
        switchMode('longBreak');
      } else {
        switchMode('shortBreak');
      }
    } else {
      // Break completed, switch back to focus
      switchMode('focus');
    }

    // Play notification sound
    playNotification();
  }, [mode, sessionsCompleted, settings, stats]);

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    const duration = newMode === 'focus'
      ? settings.focusDuration * 60
      : newMode === 'shortBreak'
        ? settings.shortBreakDuration * 60
        : settings.longBreakDuration * 60;
    setTimeLeft(duration);
    setIsRunning(false);
    elapsedFocusRef.current = 0;
  };

  const handleStart = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);

  const handleReset = () => {
    setIsRunning(false);
    elapsedFocusRef.current = 0;
    const duration = mode === 'focus'
      ? settings.focusDuration * 60
      : mode === 'shortBreak'
        ? settings.shortBreakDuration * 60
        : settings.longBreakDuration * 60;
    setTimeLeft(duration);
  };

  const handleModeChange = (newMode: Mode) => {
    if (isRunning) {
      if (!confirm('Timer is running. Switch mode?')) return;
    }
    switchMode(newMode);
  };

  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    // Reset timer with new duration if not running
    if (!isRunning) {
      const duration = mode === 'focus'
        ? newSettings.focusDuration * 60
        : mode === 'shortBreak'
          ? newSettings.shortBreakDuration * 60
          : newSettings.longBreakDuration * 60;
      setTimeLeft(duration);
    }
  };

  const handleResetStats = () => {
    if (confirm('Reset today\'s statistics?')) {
      const emptyStats: TodayStats = { date: getToday(), sessions: 0, totalFocusSeconds: 0 };
      setStats(emptyStats);
      saveStats(emptyStats);
      setSessionsCompleted(0);
    }
  };

  const playNotification = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime + i * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.2 + 0.4);
        osc.start(audioCtx.currentTime + i * 0.2);
        osc.stop(audioCtx.currentTime + i * 0.2 + 0.4);
      });
    } catch { /* ignore audio errors */ }
  };

  const currentColor = MODE_CONFIG[mode].color;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient */}
      <div
        className="absolute inset-0 opacity-20 transition-all duration-1000"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${currentColor}33 0%, transparent 70%)`,
        }}
      />

      {/* Header */}
      <div className="relative z-10 w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-lg font-bold text-white/90">🍅 Pomodoro</h1>
          <button
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <span className="text-lg">⚙️</span>
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-2 justify-center mb-10">
          {(Object.keys(MODE_CONFIG) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`mode-btn ${
                mode === m
                  ? `active ${MODE_CONFIG[m].bgColor} text-white`
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {MODE_CONFIG[m].label}
            </button>
          ))}
        </div>

        {/* Timer Display */}
        <div className="flex justify-center mb-10">
          <div className="relative">
            <CircularProgress progress={progress} color={currentColor} size={280} strokeWidth={6} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-mono font-bold tracking-wider text-white">
                {formatTime(timeLeft)}
              </span>
              <span className={`text-sm mt-2 font-medium ${MODE_CONFIG[mode].textColor}`}>
                {MODE_CONFIG[mode].label}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 mb-10">
          <button
            onClick={handleReset}
            className="control-btn bg-white/5 border border-white/10 hover:bg-white/10"
            title="Reset"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button
            onClick={isRunning ? handlePause : handleStart}
            className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-lg"
            style={{ backgroundColor: currentColor }}
            title={isRunning ? 'Pause' : 'Start'}
          >
            {isRunning ? (
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => {
              const nextMode: Mode = mode === 'focus' ? 'shortBreak' : 'focus';
              handleModeChange(nextMode);
            }}
            className="control-btn bg-white/5 border border-white/10 hover:bg-white/10"
            title="Skip"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 5l0 14" />
            </svg>
          </button>
        </div>

        {/* Session Counter */}
        <div className="flex justify-center gap-2 mb-8">
          {Array.from({ length: settings.longBreakInterval }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                i < (sessionsCompleted % settings.longBreakInterval)
                  ? 'bg-red-400 scale-110'
                  : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Today's Statistics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card">
            <div className="text-2xl font-bold text-white">{stats.sessions}</div>
            <div className="text-xs text-slate-400 mt-1">Sessions</div>
          </div>
          <div className="stat-card">
            <div className="text-2xl font-bold text-white">{formatDuration(stats.totalFocusSeconds)}</div>
            <div className="text-xs text-slate-400 mt-1">Focus Time</div>
          </div>
          <div className="stat-card">
            <div className="text-2xl font-bold text-white">
              {stats.sessions > 0 ? Math.round(stats.totalFocusSeconds / stats.sessions / 60) : 0}m
            </div>
            <div className="text-xs text-slate-400 mt-1">Avg/Session</div>
          </div>
        </div>

        {/* Reset Stats */}
        <div className="flex justify-center mt-4">
          <button
            onClick={handleResetStats}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Reset today's stats
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
