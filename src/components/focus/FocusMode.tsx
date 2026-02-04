import React, { useState, useEffect } from 'react';
import { Play, Pause, Clock, CheckCircle2, RotateCcw, Trophy } from 'lucide-react';
import { Task } from '@/types/task';
import { useUserProgress } from '@/hooks/useUserProgress';
import { useTasks } from '@/hooks/useTasks';
import { useToast } from '@/hooks/use-toast';
import XPBar from '@/components/xp/XPBar';

interface FocusModeProps {
  selectedTask: Task | null;
}

const FocusMode: React.FC<FocusModeProps> = ({ selectedTask }) => {
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [initialTime, setInitialTime] = useState(25 * 60);
  const { addXP, getXPPerEnergy } = useUserProgress();
  const { toggleTaskComplete } = useTasks();
  const { toast } = useToast();

  // Sync timer with task duration when task changes
  useEffect(() => {
    if (selectedTask) {
      const durationInSeconds = selectedTask.duration * 60;
      setTimeLeft(durationInSeconds);
      setInitialTime(durationInSeconds);
      setTimerActive(false);
    }
  }, [selectedTask]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      handleTimerComplete();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timeLeft]);

  const handleTimerComplete = async () => {
    if (selectedTask && selectedTask.status !== 'completed') {
      // Award XP based on task energy
      const { leveledUp, newLevel } = await addXP(selectedTask.energy);
      
      // Mark task as complete
      await toggleTaskComplete(selectedTask.id);
      
      const xpGained = selectedTask.energy * getXPPerEnergy();
      
      if (leveledUp) {
        toast({
          title: `🎉 Level Up! You're now Level ${newLevel}!`,
          description: `+${xpGained} XP earned from completing "${selectedTask.title}"`,
        });
      } else {
        toast({
          title: "Task Complete! 🎉",
          description: `+${xpGained} XP earned`,
        });
      }
    }
  };

  const handleManualComplete = async () => {
    if (selectedTask && selectedTask.status !== 'completed') {
      const { leveledUp, newLevel } = await addXP(selectedTask.energy);
      await toggleTaskComplete(selectedTask.id);
      
      const xpGained = selectedTask.energy * getXPPerEnergy();
      
      if (leveledUp) {
        toast({
          title: `🎉 Level Up! You're now Level ${newLevel}!`,
          description: `+${xpGained} XP earned`,
        });
      } else {
        toast({
          title: "Task Complete! 🎉",
          description: `+${xpGained} XP earned`,
        });
      }
      
      setTimerActive(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const resetTimer = () => {
    setTimeLeft(initialTime);
    setTimerActive(false);
  };

  const progressPercentage = initialTime > 0 ? ((initialTime - timeLeft) / initialTime) * 100 : 0;

  return (
    <div className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-6 sm:space-y-8 animate-zoom-in px-4 pb-28">
      {/* XP Bar */}
      <div className="w-full max-w-xs">
        <XPBar />
      </div>

      {/* Timer Display */}
      <div className="relative group">
        <div className="absolute -inset-8 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition duration-1000"></div>
        <div className="relative text-center">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary opacity-60">
            Focus Block
          </span>
          <h2 className="text-6xl sm:text-8xl font-black text-foreground font-mono mt-4 tabular-nums tracking-tighter">
            {formatTime(timeLeft)}
          </h2>
          
          {/* Progress Bar */}
          <div className="mt-4 w-full max-w-xs mx-auto h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          
          {selectedTask && (
            <p className="mt-2 text-xs text-muted-foreground">
              {selectedTask.duration} min session • {selectedTask.energy}⚡ = {selectedTask.energy * getXPPerEnergy()} XP
            </p>
          )}
        </div>
      </div>

      {/* Active Task */}
      {selectedTask ? (
        <div className="bg-card p-4 sm:p-5 rounded-pill shadow-elevated border border-border/50 w-full max-w-xs flex items-center gap-4 animate-slide-up">
          <div className="bg-primary p-3 rounded-pill-sm text-primary-foreground shadow-glow flex-shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
              Active Task
            </p>
            <p className="font-bold text-foreground text-sm leading-tight mt-1 truncate">
              {selectedTask.title}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {selectedTask.due} • {selectedTask.energy}⚡
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-card/50 p-5 rounded-pill border border-dashed border-border w-full max-w-xs text-center">
          <p className="text-sm text-muted-foreground">
            Tap a task from Dashboard to start focusing
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-4 sm:gap-6 relative">
        <button 
          onClick={() => setTimerActive(!timerActive)}
          disabled={!selectedTask}
          className={`w-16 h-16 sm:w-20 sm:h-20 rounded-pill flex items-center justify-center text-primary-foreground transition-all shadow-elevated ${
            !selectedTask
              ? 'bg-muted cursor-not-allowed'
              : timerActive 
                ? 'bg-amber-500 hover:bg-amber-600' 
                : 'bg-primary hover:opacity-90 shadow-glow'
          }`}
        >
          {timerActive ? <Pause size={28} className="sm:w-8 sm:h-8" /> : <Play size={28} className="ml-1 sm:w-8 sm:h-8" />}
        </button>
        <button 
          onClick={resetTimer}
          disabled={!selectedTask}
          className={`w-16 h-16 sm:w-20 sm:h-20 rounded-pill flex items-center justify-center transition border shadow-soft ${
            !selectedTask
              ? 'bg-muted cursor-not-allowed text-muted-foreground border-muted'
              : 'bg-card text-muted-foreground hover:bg-secondary border-border'
          }`}
        >
          <RotateCcw size={24} className="sm:w-7 sm:h-7" />
        </button>
        {selectedTask && selectedTask.status !== 'completed' && (
          <button 
            onClick={handleManualComplete}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-pill flex items-center justify-center transition border shadow-soft bg-green-500 hover:bg-green-600 text-white"
            title="Mark as complete and earn XP"
          >
            <Trophy size={24} className="sm:w-7 sm:h-7" />
          </button>
        )}
      </div>
    </div>
  );
};

export default FocusMode;
