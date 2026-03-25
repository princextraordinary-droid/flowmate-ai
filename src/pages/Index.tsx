import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Dashboard from '@/components/dashboard/Dashboard';
import AIWorkspace from '@/components/ai/AIWorkspace';
import FocusMode from '@/components/focus/FocusMode';
import CheckIn from '@/components/checkin/CheckIn';
import NotesView from '@/components/notes/NotesView';
import { initSyncManager } from '@/lib/syncManager';
import { LocalNotifications } from '@capacitor/local-notifications';

type View = 'dashboard' | 'ai' | 'focus' | 'checkin' | 'notes';

const Index: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [selectedTask, setSelectedTask] = useState<any>(null);

  useEffect(() => {
    const cleanup = initSyncManager();
    return cleanup;
  }, []);

  // AUTOMATIC NOTIFICATION LOGIC
 const updateNotification = async (taskName: string, time: string) => {
  await LocalNotifications.schedule({
    notifications: [{
      id: 1,
      title: `Focus: ${taskName}`,
      body: `⏱️ Time remaining: ${time}`,
      ongoing: true,
      actionTypeId: 'TIMER_CONTROLS', // This links to your custom buttons
    }]
  });
};

  const handleTaskClick = async (task: any) => {
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
    setSelectedTask(task);
    setView('focus');
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="max-w-4xl mx-auto flex flex-col min-h-screen relative">
        <Header />

        <main className="flex-1 px-4 md:px-6 pt-8">
          {view === 'dashboard' && <Dashboard onTaskClick={handleTaskClick} />}
          {view === 'ai' && <AIWorkspace />}
          {view === 'focus' && (
            <FocusMode
              selectedTask={selectedTask}
              onTick={(time) => updateNotification(selectedTask?.title || 'Task', time)}
            />
          )}
          {view === 'checkin' && <CheckIn />}
          {view === 'notes' && <NotesView />}
        </main>

        <BottomNav
          currentView={view}
          onViewChange={async (newView) => {
            if (newView !== 'focus') {
              // This kills the sticky timer when you leave the study screen
              await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
            }
            setView(newView);
          }}
        />
      </div>
    </div>
  );
};

export default Index;
