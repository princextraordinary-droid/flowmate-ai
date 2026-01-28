import React, { useState, useEffect } from 'react';
import { Play, Pause, Clock, CheckCircle2 } from 'lucide-react';
import { Task } from '@/types/task';

interface FocusModeProps {
  selectedTask: Task | null;
}

const FocusMode: React.FC<FocusModeProps> = ({ selectedTask }) => {
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
      setTimerActive(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const resetTimer = () => {
    setTimeLeft(25 * 60);
    setTimerActive(false);
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-12 animate-zoom-in">
      {/* Timer Display */}
      <div className="relative group">
        <div className="absolute -inset-8 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition duration-1000"></div>
        <div className="relative text-center">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary opacity-60">
            Focus Block
          </span>
          <h2 className="text-8xl font-black text-foreground font-mono mt-4 tabular-nums tracking-tighter">
            {formatTime(timeLeft)}
          </h2>
        </div>
      </div>

      {/* Active Task */}
      {selectedTask && (
        <div className="bg-card p-5 rounded-pill shadow-elevated border border-border/50 w-full max-w-xs flex items-center gap-4 animate-slide-up">
          <div className="bg-primary p-3 rounded-pill-sm text-primary-foreground shadow-glow">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
              Active Task
            </p>
            <p className="font-bold text-foreground text-sm leading-none mt-1">
              {selectedTask.title}
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-6 relative">
        <button 
          onClick={() => setTimerActive(!timerActive)}
          className={`w-20 h-20 rounded-pill flex items-center justify-center text-primary-foreground transition-all shadow-elevated ${
            timerActive 
              ? 'bg-amber-500 hover:bg-amber-600' 
              : 'bg-primary hover:opacity-90 shadow-glow'
          }`}
        >
          {timerActive ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
        </button>
        <button 
          onClick={resetTimer}
          className="w-20 h-20 rounded-pill bg-card text-muted-foreground flex items-center justify-center hover:bg-secondary transition border border-border shadow-soft"
        >
          <Clock size={28} />
        </button>
      </div>
    </div>
  );
};

export default FocusMode;
