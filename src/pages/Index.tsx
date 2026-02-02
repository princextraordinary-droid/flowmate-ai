import React, { useState, useEffect } from 'react';
import { Task } from '@/types/task';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Dashboard from '@/components/dashboard/Dashboard';
import AIWorkspace from '@/components/ai/AIWorkspace';
import FocusMode from '@/components/focus/FocusMode';
import CheckIn from '@/components/checkin/CheckIn';
import NotesView from '@/components/notes/NotesView';
import { initSyncManager } from '@/lib/syncManager';

type View = 'dashboard' | 'ai' | 'focus' | 'checkin' | 'notes';

const Index: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Initialize sync manager for offline support
  useEffect(() => {
    const cleanup = initSyncManager();
    return cleanup;
  }, []);

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    }
  }, []);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setView('focus');
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/10 selection:text-primary">
      <div className="max-w-4xl mx-auto flex flex-col min-h-screen relative">
        <Header />

        <main className="flex-1 px-4 md:px-6 pt-8">
          {view === 'dashboard' && (
            <Dashboard onTaskClick={handleTaskClick} />
          )}
          {view === 'ai' && <AIWorkspace />}
          {view === 'focus' && <FocusMode selectedTask={selectedTask} />}
          {view === 'checkin' && <CheckIn />}
          {view === 'notes' && <NotesView />}
        </main>

        <BottomNav currentView={view} onViewChange={setView} />
      </div>
    </div>
  );
};

export default Index;
