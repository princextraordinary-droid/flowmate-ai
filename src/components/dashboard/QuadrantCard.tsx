import React from 'react';
import { Quadrant, Task } from '@/types/task';
import TaskCard from './TaskCard';

interface QuadrantCardProps {
  quadrant: Quadrant;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const QuadrantCard: React.FC<QuadrantCardProps> = ({ quadrant, tasks, onTaskClick }) => {
  const filteredTasks = tasks.filter(t => t.quadrant === quadrant.id);

  return (
    <div className={`p-4 rounded-pill border-2 ${quadrant.bgClass} min-h-[180px] shadow-soft transition-all hover:shadow-md`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl drop-shadow-sm">{quadrant.icon}</span>
        <h3 className={`font-bold uppercase text-[10px] tracking-widest ${quadrant.colorClass} opacity-80`}>
          {quadrant.title}
        </h3>
      </div>
      <div className="space-y-2">
        {filteredTasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task} 
            onClick={() => onTaskClick(task)} 
          />
        ))}
        {filteredTasks.length === 0 && (
          <p className="text-xs text-muted-foreground italic opacity-60 text-center py-4">
            No tasks here
          </p>
        )}
      </div>
    </div>
  );
};

export default QuadrantCard;
