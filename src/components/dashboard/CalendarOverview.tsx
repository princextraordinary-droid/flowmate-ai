import React, { useState, useMemo } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { Task, QuadrantId } from '@/types/task';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { format, isSameDay, parse } from 'date-fns';

interface CalendarOverviewProps {
  tasks: Task[];
}

// Quadrant to color mapping
const QUADRANT_COLORS: Record<QuadrantId, string> = {
  'Q1_DO': 'bg-quadrant-urgent',
  'Q2_SCHEDULE': 'bg-quadrant-schedule',
  'Q3_DELEGATE': 'bg-quadrant-delegate',
  'Q4_ELIMINATE': 'bg-quadrant-eliminate',
};

function parseDueDate(due: string): Date | null {
  if (!due) return null;
  
  const dateMatch = due.match(/(\w+)\s+(\d+),?\s*(\d{4})?/i);
  if (dateMatch) {
    const [, month, day, year] = dateMatch;
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthIndex = monthNames.findIndex(m => month.toLowerCase().startsWith(m));
    if (monthIndex >= 0) {
      const taskYear = year ? parseInt(year) : new Date().getFullYear();
      return new Date(taskYear, monthIndex, parseInt(day));
    }
  }
  
  const isoDate = new Date(due);
  if (!isNaN(isoDate.getTime())) return isoDate;
  
  return null;
}

const CalendarOverview: React.FC<CalendarOverviewProps> = ({ tasks }) => {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    tasks.forEach(task => {
      const date = parseDueDate(task.due);
      if (date) {
        const key = format(date, 'yyyy-MM-dd');
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  // Get tasks for selected date
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, 'yyyy-MM-dd');
    return tasksByDate[key] || [];
  }, [selectedDate, tasksByDate]);

  // Custom day content to show task dots
  const renderDayContent = (day: Date) => {
    const key = format(day, 'yyyy-MM-dd');
    const dayTasks = tasksByDate[key] || [];
    
    // Group tasks by quadrant and count
    const quadrantCounts: Record<QuadrantId, number> = {
      'Q1_DO': 0,
      'Q2_SCHEDULE': 0,
      'Q3_DELEGATE': 0,
      'Q4_ELIMINATE': 0,
    };
    
    dayTasks.forEach(task => {
      quadrantCounts[task.quadrant]++;
    });
    
    // Create dots array
    const dots: { color: string; count: number }[] = [];
    (Object.keys(quadrantCounts) as QuadrantId[]).forEach(quadrant => {
      const count = quadrantCounts[quadrant];
      if (count > 0) {
        for (let i = 0; i < Math.min(count, 5); i++) {
          dots.push({ color: QUADRANT_COLORS[quadrant], count });
        }
      }
    });

    return (
      <div className="flex flex-col items-center">
        <span>{day.getDate()}</span>
        {dots.length > 0 && (
          <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center max-w-[24px]">
            {dots.slice(0, 6).map((dot, idx) => (
              <div 
                key={idx} 
                className={cn("w-1.5 h-1.5 rounded-full", dot.color)} 
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="border border-border p-2.5 rounded-pill text-muted-foreground shadow-soft hover:shadow-md transition-all bg-gradient-to-br from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20">
          <CalendarDays size={20} className="text-primary" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Task Calendar</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border pointer-events-auto"
            components={{
              DayContent: ({ date }) => renderDayContent(date),
            }}
          />
          
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-quadrant-urgent" />
              <span>Do First</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-quadrant-schedule" />
              <span>Schedule</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-quadrant-delegate" />
              <span>Delegate</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-quadrant-eliminate" />
              <span>Eliminate</span>
            </div>
          </div>
          
          {/* Selected date tasks */}
          {selectedDate && selectedDateTasks.length > 0 && (
            <div className="mt-4 p-3 bg-card rounded-lg border">
              <h4 className="font-semibold text-sm mb-2">
                Tasks for {format(selectedDate, 'MMMM d, yyyy')}
              </h4>
              <div className="space-y-2">
                {selectedDateTasks.map(task => (
                  <div 
                    key={task.id} 
                    className="flex items-center gap-2 text-sm"
                  >
                    <div className={cn("w-2 h-2 rounded-full", QUADRANT_COLORS[task.quadrant])} />
                    <span className={task.status === 'completed' ? 'line-through text-muted-foreground' : ''}>
                      {task.title}
                    </span>
                    {task.status === 'completed' && (
                      <span className="text-xs text-primary">✓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {selectedDate && selectedDateTasks.length === 0 && (
            <div className="mt-4 p-3 bg-muted/30 rounded-lg text-center text-sm text-muted-foreground">
              No tasks for {format(selectedDate, 'MMMM d, yyyy')}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CalendarOverview;