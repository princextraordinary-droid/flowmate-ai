import { Quadrant, Task } from '@/types/task';

export const QUADRANTS: Record<string, Quadrant> = {
  Q1: { 
    id: 'Q1_DO', 
    title: 'Urgent + Important', 
    colorClass: 'text-quadrant-urgent',
    bgClass: 'bg-red-50 border-red-100',
    icon: '🔥' 
  },
  Q2: { 
    id: 'Q2_SCHEDULE', 
    title: 'Not Urgent + Important', 
    colorClass: 'text-quadrant-schedule',
    bgClass: 'bg-blue-50 border-blue-100',
    icon: '📅' 
  },
  Q3: { 
    id: 'Q3_DELEGATE', 
    title: 'Urgent + Not Important', 
    colorClass: 'text-quadrant-delegate',
    bgClass: 'bg-amber-50 border-amber-100',
    icon: '👤' 
  },
  Q4: { 
    id: 'Q4_ELIMINATE', 
    title: 'Not Urgent + Not Important', 
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-secondary border-border',
    icon: '🗑️' 
  },
};

export const INITIAL_TASKS: Task[] = [
  { id: '1', title: 'Calculus Assignment', quadrant: 'Q1_DO', energy: 4, duration: 60, status: 'pending', due: 'Today 2PM' },
  { id: '2', title: 'Update Resume', quadrant: 'Q2_SCHEDULE', energy: 2, duration: 45, status: 'pending', due: 'Friday' },
  { id: '3', title: 'Buy Groceries', quadrant: 'Q3_DELEGATE', energy: 1, duration: 30, status: 'pending', due: 'Today' },
  { id: '4', title: 'History Reading', quadrant: 'Q2_SCHEDULE', energy: 3, duration: 90, status: 'missed', due: 'Yesterday' },
];
