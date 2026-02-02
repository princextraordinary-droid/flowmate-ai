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
    <div className="space-y-6 animate-fade-in pb-24">
      <div className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Your Flow</h2>
          <p className="text-xs text-muted-foreground font-medium tracking-tight">
            Eisenhower Matrix Dashboard
          </p>
        </div>
        <div className="flex gap-2">
          {hasMissedTasks && (
            <button
              onClick={autoFixMissedTasks}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-pill text-xs font-bold flex items-center gap-2 hover:opacity-90 shadow-glow transition-all"
            >
              <Zap size={14} /> Auto-Fix
            </button>
          )}
          <AddTaskDialog onAddTask={addTask} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
