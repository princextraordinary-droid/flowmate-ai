import React from 'react';
import { Quadrant, Task, QuadrantId } from '@/types/task';
import TaskCard from './TaskCard';

interface QuadrantCardProps {
  quadrant: Quadrant;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onToggleComplete: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onMoveToQuadrant: (taskId: string, quadrantId: QuadrantId) => void;
}

const QuadrantCard: React.FC<QuadrantCardProps> = ({ 
  quadrant, 
  tasks, 
  onTaskClick, 
  onToggleComplete,
  onEditTask,
  onMoveToQuadrant
}) => {
  const filteredTasks = tasks.filter(t => t.quadrant === quadrant.id);

  return (
  <div className={`relative overflow-hidden p-5 rounded-[2rem] bg-white/10 backdrop-blur-2xl border border-white/10 shadow-2xl transition-all duration-500 hover:bg-white/10 hover:-translate-y-1 group min-h-[200px]`}>
    {/* 2025 Glass Reflection */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
    
    <div className="relative z-10"> {/* Keeps content above the glass glow */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{quadrant.icon}</span>
          <h3 className="font-bold uppercase tracking-widest text-[11px] text-white/90">
            {quadrant.title}
          </h3>
        </div>
        <span className="bg-white/10 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md border border-white/5">
          {filteredTasks.length}
        </span>
      </div>

     <div className="space-y-3">
          {filteredTasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onClick={() => onTaskClick(task)}
              onToggleComplete={() => onToggleComplete(task.id)}
              onEdit={() => onEditTask(task)}
              onMoveToQuadrant={(targetQuadrant) => onMoveToQuadrant(task.id, targetQuadrant)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuadrantCard;