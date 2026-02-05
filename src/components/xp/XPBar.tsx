import React from 'react';
import { Sparkles } from 'lucide-react';
import { useUserProgress } from '@/hooks/useUserProgress';
import { Progress } from '@/components/ui/progress';

interface XPBarProps {
  size?: 'compact' | 'large';
}

const XPBar: React.FC<XPBarProps> = ({ size = 'compact' }) => {
  const { progress, loading, getXPProgress, getXPPerEnergy } = useUserProgress();

  if (loading || !progress) {
    return null;
  }

  const { current, required, percentage } = getXPProgress();
  const xpPerEnergy = getXPPerEnergy();

  if (size === 'large') {
    return (
      <div className="bg-card/90 backdrop-blur-sm rounded-2xl p-4 sm:p-5 shadow-soft border border-border/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-glow">
              <span className="text-base font-black text-white">{progress.current_level}</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Level</p>
              <p className="text-lg font-black text-foreground">{progress.current_level} / 100</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full">
            <Sparkles size={16} />
            <span className="text-sm font-bold">{xpPerEnergy} XP/⚡</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <Progress 
            value={percentage} 
            className="h-4 bg-secondary"
          />
          <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-wide">
            <span>{current.toLocaleString()} XP</span>
            <span>{required.toLocaleString()} XP needed</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-pill p-3 shadow-soft border border-border/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-glow">
            <span className="text-xs font-black text-white">{progress.current_level}</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Level</p>
            <p className="text-sm font-black text-foreground">{progress.current_level} / 100</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-amber-500">
          <Sparkles size={14} />
          <span className="text-xs font-bold">{xpPerEnergy} XP/⚡</span>
        </div>
      </div>
      
      <div className="space-y-1">
        <Progress 
          value={percentage} 
          className="h-2 bg-secondary"
        />
        <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase tracking-wide">
          <span>{current.toLocaleString()} XP</span>
          <span>{required.toLocaleString()} XP</span>
        </div>
      </div>
    </div>
  );
};

export default XPBar;
