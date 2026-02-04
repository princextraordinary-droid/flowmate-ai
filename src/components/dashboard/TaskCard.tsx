import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { Task, QuadrantId } from '@/types/task';
import TaskMenu from './TaskMenu';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onToggleComplete?: () => void;
  onEdit?: () => void;
  onMoveToQuadrant?: (quadrantId: QuadrantId) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onClick, 
  onToggleComplete,
  onEdit,
  onMoveToQuadrant
}) => {
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleComplete?.();
  };

  return (
    <div
      onClick={onClick}
      className="bg-card/90 backdrop-blur-sm p-3.5 rounded-pill-sm shadow-soft border border-border/50 flex justify-between items-center group cursor-pointer hover:scale-[1.02] hover:shadow-md transition-all duration-200"
    >
      <div className={`flex-1 min-w-0 ${task.status === 'completed' ? 'opacity-50' : ''}`}>
        <p className={`text-sm font-bold truncate ${
          task.status === 'missed' 
            ? 'text-destructive' 
            : task.status === 'completed'
            ? 'text-muted-foreground line-through'
            : 'text-foreground'
        }`}>
          {task.title}
        </p>
        <div className="flex gap-2 text-[10px] mt-1 text-muted-foreground font-bold uppercase tracking-wide">
          <span className="truncate">{task.due}</span>
          <span>•</span>
          <span>{task.energy}⚡</span>
          <span>•</span>
          <span>{task.duration}min</span>
        </div>
      </div>
      
      <div className="flex items-center gap-1 flex-shrink-0">
        {onEdit && onMoveToQuadrant && (
          <TaskMenu 
            task={task} 
            onEdit={onEdit} 
            onMoveToQuadrant={onMoveToQuadrant} 
          />
        )}
        <button
          onClick={handleToggle}
          className="p-2 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
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
    </div>
  );
};

export default TaskCard;
