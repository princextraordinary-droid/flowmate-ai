import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { Task } from '@/types/task';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onToggleComplete?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onToggleComplete }) => {
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleComplete?.();
  };

  return (
    <div
      onClick={onClick}
      className="bg-card/90 backdrop-blur-sm p-3.5 rounded-pill-sm shadow-soft border border-border/50 flex justify-between items-center group cursor-pointer hover:scale-[1.02] hover:shadow-md transition-all duration-200"
    >
      <div className={`flex-1 ${task.status === 'completed' ? 'opacity-50' : ''}`}>
        <p className={`text-sm font-bold ${
          task.status === 'missed' 
            ? 'text-destructive' 
            : task.status === 'completed'
            ? 'text-muted-foreground line-through'
            : 'text-foreground'
        }`}>
          {task.title}
        </p>
        <div className="flex gap-2 text-[10px] mt-1 text-muted-foreground font-bold uppercase tracking-wide">
          <span>{task.due}</span>
          <span>•</span>
          <span>{task.energy}⚡</span>
        </div>
      </div>
      <button
        onClick={handleToggle}
        className="p-1 rounded-full transition-colors"
        title={task.status === 'completed' ? 'Mark as pending' : 'Mark as completed'}
      >
        {task.status === 'completed' ? (
          <CheckCircle2 
            size={20} 
            className="text-green-500 fill-green-500/20" 
          />
        ) : (
          <Circle 
            size={20} 
            className="text-border group-hover:text-green-500 transition-colors" 
          />
        )}
      </button>
    </div>
  );
};

export default TaskCard;
