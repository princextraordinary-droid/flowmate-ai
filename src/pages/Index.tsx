import React, { useState } from 'react';
import { INITIAL_TASKS } from '@/data/constants';
import { Task } from '@/types/task';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Dashboard from '@/components/dashboard/Dashboard';
import AIWorkspace from '@/components/ai/AIWorkspace';
import FocusMode from '@/components/focus/FocusMode';
import CheckIn from '@/components/checkin/CheckIn';

type View = 'dashboard' | 'ai' | 'focus' | 'checkin';

const Index: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setView('focus');
  };

  const handleAutoFix = () => {
    setTasks(tasks.map(t => 
      t.status === 'missed' 
        ? { ...t, status: 'pending', due: 'Tomorrow' } 
        : t
    ));
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/10 selection:text-primary">
      <div className="max-w-4xl mx-auto flex flex-col min-h-screen relative">
        <Header energyLevel={energyLevel} />

        <main className="flex-1 px-4 md:px-6 pt-8">
          {view === 'dashboard' && (
            <Dashboard 
              tasks={tasks} 
              onTaskClick={handleTaskClick} 
              onAutoFix={handleAutoFix}
            />
          )}
          {view === 'ai' && <AIWorkspace />}
          {view === 'focus' && <FocusMode selectedTask={selectedTask} />}
          {view === 'checkin' && (
            <CheckIn 
              energyLevel={energyLevel} 
              onEnergyChange={setEnergyLevel} 
            />
          )}
        </main>

        <BottomNav currentView={view} onViewChange={setView} />
      </div>
    </div>
  );
};

export default Index;
