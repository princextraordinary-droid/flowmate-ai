import React from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { QUADRANTS } from '@/data/constants';
import { Task } from '@/types/task';
import { useTasks } from '@/hooks/useTasks';
import QuadrantCard from './QuadrantCard';
import AddTaskDialog from './AddTaskDialog';

interface DashboardProps {
  onTaskClick: (task: Task) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onTaskClick }) => {
  const {
    tasks,
    loading,
    addTask,
    toggleTaskComplete,
    autoFixMissedTasks
  } = useTasks();

  const hasMissedTasks = tasks.some(t => t.status === 'missed');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in pb-24 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-quadrant-schedule">Your Flow</h2>
          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium tracking-tight">Tasks Dashboard</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {hasMissedTasks && (
            <button 
              onClick={autoFixMissedTasks} 
              className="bg-primary text-primary-foreground px-3 sm:px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 hover:opacity-90 shadow-glow transition-all min-h-[44px]"
            >
              <Zap size={14} /> Auto-Fix
            </button>
          )}
          <AddTaskDialog onAddTask={addTask} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {Object.values(QUADRANTS).map(quadrant => (
          <QuadrantCard 
            key={quadrant.id} 
            quadrant={quadrant} 
            tasks={tasks} 
            onTaskClick={onTaskClick} 
            onToggleComplete={toggleTaskComplete} 
          />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
