import React from 'react';
import { Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface UsageIndicatorProps {
  used: number;
  limit: number;
  remaining: number;
}

const UsageIndicator: React.FC<UsageIndicatorProps> = ({ used, limit, remaining }) => {
  const percentage = (used / limit) * 100;
  const isLow = remaining <= 3;
  const isEmpty = remaining === 0;

  return (
    <div className={`p-4 rounded-pill-sm border ${
      isEmpty ? 'bg-destructive/10 border-destructive/30' : 
      isLow ? 'bg-yellow-50 border-yellow-200' : 
      'bg-secondary/30 border-border/50'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap size={16} className={isEmpty ? 'text-destructive' : isLow ? 'text-yellow-600' : 'text-primary'} />
          <span className="text-sm font-medium text-foreground">Daily Requests</span>
        </div>
        <span className={`text-sm font-bold ${
          isEmpty ? 'text-destructive' : isLow ? 'text-yellow-600' : 'text-primary'
        }`}>
          {remaining} left
        </span>
      </div>
      
      <Progress 
        value={percentage} 
        className="h-2"
      />
      
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-muted-foreground">{used} used</span>
        <span className="text-[10px] text-muted-foreground">{limit} daily limit</span>
      </div>

      {isEmpty && (
        <p className="text-xs text-destructive mt-2 text-center">
          Daily limit reached. Resets at midnight UTC.
        </p>
      )}
    </div>
  );
};

export default UsageIndicator;
