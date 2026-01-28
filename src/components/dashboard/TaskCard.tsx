import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Task } from '@/types/task';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-card/90 backdrop-blur-sm p-3.5 rounded-pill-sm shadow-soft border border-border/50 flex justify-between items-center group cursor-pointer hover:scale-[1.02] hover:shadow-md transition-all duration-200"
    >
      <div>
        <p className={`text-sm font-bold ${
          task.status === 'missed' ? 'text-destructive' : 'text-foreground'
        }`}>
          {task.title}
        </p>
        <div className="flex gap-2 text-[10px] mt-1 text-muted-foreground font-bold uppercase tracking-wide">
          <span>{task.due}</span>
          <span>•</span>
          <span>{task.energy}⚡</span>
        </div>
      </div>
      <CheckCircle2 
        size={18} 
        className="text-border group-hover:text-green-500 transition-colors" 
      />
    </div>
  );
};

export default TaskCard;
