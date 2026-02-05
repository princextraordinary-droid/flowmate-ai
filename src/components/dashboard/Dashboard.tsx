import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { QUADRANTS } from '@/data/constants';
import { Task, QuadrantId } from '@/types/task';
import { useTasks } from '@/hooks/useTasks';
import { useUserProgress } from '@/hooks/useUserProgress';
import { useToast } from '@/hooks/use-toast';
import QuadrantCard from './QuadrantCard';
import AddTaskDialog from './AddTaskDialog';
import EditTaskDialog from './EditTaskDialog';
import MissedTasks from './MissedTasks';
import CalendarOverview from './CalendarOverview';
import XPBar from '@/components/xp/XPBar';

interface DashboardProps {
  onTaskClick: (task: Task) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onTaskClick }) => {
  const {
    tasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskComplete,
    registerXPCallbacks
  } = useTasks();
  
  const { addXP, removeXP, getXPPerEnergy } = useUserProgress();
  const { toast } = useToast();

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Register XP callbacks for task completion
  useEffect(() => {
    const handleComplete = async (energy: number) => {
      const xpPerEnergy = getXPPerEnergy();
      const xpGained = energy * xpPerEnergy;
      const result = await addXP(energy);
      
      toast({
        title: result.leveledUp ? `🎉 Level Up! Level ${result.newLevel}` : `+${xpGained} XP earned!`,
        description: result.leveledUp ? "Congratulations on reaching a new level!" : `Energy ${energy} ⚡ = ${xpGained} XP`,
      });
    };

    const handleUncomplete = async (energy: number) => {
      const xpPerEnergy = getXPPerEnergy();
      const xpLost = energy * xpPerEnergy;
      await removeXP(energy);
      
      toast({
        title: `-${xpLost} XP`,
        description: "Task marked as incomplete",
        variant: "destructive",
      });
    };

    registerXPCallbacks(handleComplete, handleUncomplete);
  }, [addXP, removeXP, getXPPerEnergy, registerXPCallbacks, toast]);

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setEditDialogOpen(true);
  };

  const handleMoveToQuadrant = async (taskId: string, quadrantId: QuadrantId) => {
    await updateTask(taskId, { quadrant: quadrantId });
  };

  const handleRescheduleMissedTask = async (taskId: string, newDue: string) => {
    await updateTask(taskId, { due: newDue, status: 'pending' });
    toast({ title: "Task rescheduled", description: "The task has been rescheduled" });
  };

  const handleCompleteMissedTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      await updateTask(taskId, { status: 'completed' });
      const xpPerEnergy = getXPPerEnergy();
      const xpGained = task.energy * xpPerEnergy;
      const result = await addXP(task.energy);
      
      toast({
        title: result.leveledUp ? `🎉 Level Up! Level ${result.newLevel}` : `Task completed! +${xpGained} XP`,
        description: task.title,
      });
    }
  };

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
          <CalendarOverview tasks={tasks} />
          <AddTaskDialog onAddTask={addTask} />
        </div>
      </div>

      {/* XP Bar - Large version */}
      <XPBar size="large" />

      {/* Missed Tasks Section */}
      <MissedTasks 
        tasks={tasks}
        onReschedule={handleRescheduleMissedTask}
        onComplete={handleCompleteMissedTask}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {Object.values(QUADRANTS).map(quadrant => (
          <QuadrantCard 
            key={quadrant.id} 
            quadrant={quadrant} 
            tasks={tasks} 
            onTaskClick={onTaskClick} 
            onToggleComplete={toggleTaskComplete}
            onEditTask={handleEditTask}
            onMoveToQuadrant={handleMoveToQuadrant}
          />
        ))}
      </div>

      <EditTaskDialog
        task={editingTask}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUpdateTask={updateTask}
        onDeleteTask={deleteTask}
      />
    </div>
  );
};

export default Dashboard;
