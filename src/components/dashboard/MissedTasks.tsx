import React, { useState } from 'react';
import { AlertTriangle, Calendar, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Task } from '@/types/task';
import { Button } from '@/components/ui/button';
import DateTimePicker from './DateTimePicker';
import { format } from 'date-fns';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface MissedTasksProps {
  tasks: Task[];
  onReschedule: (taskId: string, newDue: string) => Promise<void>;
  onComplete: (taskId: string) => Promise<void>;
}

const MissedTasks: React.FC<MissedTasksProps> = ({ tasks, onReschedule, onComplete }) => {
  const [rescheduleTaskId, setRescheduleTaskId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();
  const [isOpen, setIsOpen] = useState(true);

  const missedTasks = tasks.filter(t => t.status === 'missed');

  if (missedTasks.length === 0) return null;

  const handleReschedule = async (taskId: string) => {
    if (rescheduleDate) {
      const dueString = format(rescheduleDate, "MMM d, h:mm a");
      await onReschedule(taskId, dueString);
      setRescheduleTaskId(null);
      setRescheduleDate(undefined);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-missed/10 border-2 border-missed rounded-xl p-4 animate-fade-in">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-missed" size={20} />
              <h3 className="text-base font-bold text-missed">
                Missed Tasks ({missedTasks.length})
              </h3>
            </div>
            {isOpen ? <ChevronUp className="text-missed" size={20} /> : <ChevronDown className="text-missed" size={20} />}
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="mt-3 space-y-2">
            {missedTasks.map(task => (
              <div 
                key={task.id} 
                className="bg-card rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground">Due: {task.due}</p>
                </div>
                
                {rescheduleTaskId === task.id ? (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="flex-1 sm:w-48">
                      <DateTimePicker 
                        value={rescheduleDate} 
                        onChange={setRescheduleDate} 
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleReschedule(task.id)}
                        disabled={!rescheduleDate}
                        className="flex-1 sm:flex-none min-h-[44px]"
                      >
                        Save
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setRescheduleTaskId(null);
                          setRescheduleDate(undefined);
                        }}
                        className="flex-1 sm:flex-none min-h-[44px]"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setRescheduleTaskId(task.id)}
                      className="flex-1 sm:flex-none min-h-[44px] gap-1"
                    >
                      <Calendar size={14} />
                      Reschedule
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => onComplete(task.id)}
                      className="flex-1 sm:flex-none min-h-[44px] gap-1"
                    >
                      <Check size={14} />
                      Complete
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default MissedTasks;