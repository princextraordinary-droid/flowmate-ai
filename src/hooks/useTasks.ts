import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/task';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import * as offlineDb from '@/lib/offlineDb';

// Parse due date string to Date object for sorting
function parseDueDate(due: string): Date {
  if (!due) return new Date(9999, 11, 31); // Put tasks without due date at the end
  
  // Try to parse various formats
  // Format: "Feb 4, 2025 at 10:30 AM" or similar
  const dateMatch = due.match(/(\w+)\s+(\d+),?\s+(\d{4})(?:\s+at\s+(\d+):(\d+)\s*(AM|PM)?)?/i);
  if (dateMatch) {
    const [, month, day, year, hours, minutes, ampm] = dateMatch;
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthIndex = monthNames.findIndex(m => month.toLowerCase().startsWith(m));
    
    let hour = parseInt(hours || '0');
    if (ampm?.toLowerCase() === 'pm' && hour !== 12) hour += 12;
    if (ampm?.toLowerCase() === 'am' && hour === 12) hour = 0;
    
    return new Date(parseInt(year), monthIndex, parseInt(day), hour, parseInt(minutes || '0'));
  }
  
  // Try ISO format
  const isoDate = new Date(due);
  if (!isNaN(isoDate.getTime())) return isoDate;
  
  // Special cases
  if (due.toLowerCase() === 'today') return new Date();
  if (due.toLowerCase() === 'tomorrow') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  
  return new Date(9999, 11, 31);
}

// Sort tasks by due date (ascending)
function sortTasksByDueDate(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const dateA = parseDueDate(a.due);
    const dateB = parseDueDate(b.due);
    return dateA.getTime() - dateB.getTime();
  });
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Callback to award XP when task is completed
  const [onTaskComplete, setOnTaskComplete] = useState<((energy: number) => void) | null>(null);
  const [onTaskUncomplete, setOnTaskUncomplete] = useState<((energy: number) => void) | null>(null);

  const registerXPCallbacks = (
    completeCallback: (energy: number) => void,
    uncompleteCallback: (energy: number) => void
  ) => {
    setOnTaskComplete(() => completeCallback);
    setOnTaskUncomplete(() => uncompleteCallback);
  };

  // Load tasks from both IndexedDB and Supabase
  const loadTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      // First load from IndexedDB for instant display
      const offlineTasks = await offlineDb.getAll<Task>('tasks', user.id);
      if (offlineTasks.length > 0) {
        setTasks(sortTasksByDueDate(offlineTasks));
      }

      // Then sync with Supabase if online
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id);

        if (error) throw error;

        const supabaseTasks: Task[] = (data || []).map(t => ({
          id: t.id,
          title: t.title,
          quadrant: t.quadrant as Task['quadrant'],
          energy: t.energy,
          duration: t.duration,
          status: t.status as Task['status'],
          due: t.due || ''
        }));

        // Update IndexedDB with server data
        for (const task of supabaseTasks) {
          await offlineDb.put('tasks', { ...task, user_id: user.id });
        }

        setTasks(sortTasksByDueDate(supabaseTasks));
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const addTask = async (taskData: Omit<Task, 'id'>): Promise<Task | null> => {
    if (!user) return null;

    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID()
    };

    // Optimistic update with sorting
    setTasks(prev => sortTasksByDueDate([newTask, ...prev]));

    // Save to IndexedDB first
    await offlineDb.put('tasks', { ...newTask, user_id: user.id });

    if (navigator.onLine) {
      try {
        const { error } = await supabase.from('tasks').insert({
          id: newTask.id,
          user_id: user.id,
          title: newTask.title,
          quadrant: newTask.quadrant,
          energy: newTask.energy,
          duration: newTask.duration,
          status: newTask.status,
          due: newTask.due
        });

        if (error) throw error;
        toast({ title: "Task created", description: "Your task has been saved" });
      } catch (error) {
        console.error('Error saving task to server:', error);
        // Queue for later sync
        await offlineDb.addToSyncQueue('create', 'tasks', newTask.id, { ...newTask, user_id: user.id });
        toast({ title: "Saved offline", description: "Task will sync when you're back online" });
      }
    } else {
      await offlineDb.addToSyncQueue('create', 'tasks', newTask.id, { ...newTask, user_id: user.id });
      toast({ title: "Saved offline", description: "Task will sync when you're back online" });
    }

    return newTask;
  };

  const updateTask = async (taskId: string, updates: Partial<Task>): Promise<void> => {
    if (!user) return;

    // Optimistic update with re-sorting if due date changed
    setTasks(prev => {
      const updated = prev.map(t => t.id === taskId ? { ...t, ...updates } : t);
      return updates.due !== undefined ? sortTasksByDueDate(updated) : updated;
    });

    // Get current task and update
    const currentTask = tasks.find(t => t.id === taskId);
    if (!currentTask) return;

    const updatedTask = { ...currentTask, ...updates, user_id: user.id };
    await offlineDb.put('tasks', updatedTask);

    if (navigator.onLine) {
      try {
        const { error } = await supabase
          .from('tasks')
          .update({
            title: updatedTask.title,
            quadrant: updatedTask.quadrant,
            energy: updatedTask.energy,
            duration: updatedTask.duration,
            status: updatedTask.status,
            due: updatedTask.due
          })
          .eq('id', taskId)
          .eq('user_id', user.id);

        if (error) throw error;
      } catch (error) {
        console.error('Error updating task:', error);
        await offlineDb.addToSyncQueue('update', 'tasks', taskId, updatedTask);
      }
    } else {
      await offlineDb.addToSyncQueue('update', 'tasks', taskId, updatedTask);
    }
  };

  const deleteTask = async (taskId: string): Promise<void> => {
    if (!user) return;

    // Optimistic update
    setTasks(prev => prev.filter(t => t.id !== taskId));

    await offlineDb.remove('tasks', taskId);

    if (navigator.onLine) {
      try {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId)
          .eq('user_id', user.id);

        if (error) throw error;
      } catch (error) {
        console.error('Error deleting task:', error);
        await offlineDb.addToSyncQueue('delete', 'tasks', taskId, {});
      }
    } else {
      await offlineDb.addToSyncQueue('delete', 'tasks', taskId, {});
    }
  };

  const toggleTaskComplete = async (taskId: string): Promise<void> => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await updateTask(taskId, { status: newStatus });
    
    // Award or remove XP based on status change
    if (newStatus === 'completed' && onTaskComplete) {
      onTaskComplete(task.energy);
    } else if (newStatus === 'pending' && onTaskUncomplete) {
      onTaskUncomplete(task.energy);
    }

    toast({ 
      title: newStatus === 'completed' ? "Task completed! 🎉" : "Task reopened",
      description: task.title
    });
  };

  const autoFixMissedTasks = async (): Promise<void> => {
    const missedTasks = tasks.filter(t => t.status === 'missed');
    for (const task of missedTasks) {
      await updateTask(task.id, { status: 'pending', due: 'Tomorrow' });
    }
    toast({ title: "Tasks rescheduled", description: `${missedTasks.length} task(s) moved to tomorrow` });
  };

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskComplete,
    autoFixMissedTasks,
    reload: loadTasks,
    registerXPCallbacks
  };
}
