import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Task, QuadrantId } from '@/types/task';
import { QUADRANTS } from '@/data/constants';
import DateTimePicker from './DateTimePicker';

interface EditTaskDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
}

const EditTaskDialog: React.FC<EditTaskDialogProps> = ({
  task,
  open,
  onOpenChange,
  onUpdateTask,
  onDeleteTask
}) => {
  const [title, setTitle] = useState('');
  const [quadrant, setQuadrant] = useState<QuadrantId>('Q1_DO');
  const [energy, setEnergy] = useState(3);
  const [duration, setDuration] = useState(30);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setQuadrant(task.quadrant);
      setEnergy(task.energy);
      setDuration(task.duration);
      
      // Try to parse existing due date
      if (task.due) {
        const parsed = new Date(task.due);
        if (!isNaN(parsed.getTime())) {
          setDueDate(parsed);
        } else {
          setDueDate(undefined);
        }
      }
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !title.trim()) return;

    setIsSubmitting(true);
    try {
      const dueString = dueDate ? format(dueDate, "MMM d, h:mm a") : task.due;
      
      await onUpdateTask(task.id, {
        title: title.trim(),
        quadrant,
        energy,
        duration,
        due: dueString
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    setIsSubmitting(true);
    try {
      await onDeleteTask(task.id);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modify Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Task Title</Label>
            <Input 
              id="edit-title" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="Enter task title..." 
              required 
              className="min-h-[44px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-quadrant">Quadrant</Label>
            <Select value={quadrant} onValueChange={val => setQuadrant(val as QuadrantId)}>
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder="Select quadrant" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(QUADRANTS).map(q => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.icon} {q.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-energy">Energy (1-5)</Label>
              <Select value={energy.toString()} onValueChange={val => setEnergy(parseInt(val))}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(level => (
                    <SelectItem key={level} value={level.toString()}>
                      {level} ⚡
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-duration">Duration (min)</Label>
              <Input 
                id="edit-duration" 
                type="number" 
                min={5} 
                max={480} 
                value={duration} 
                onChange={e => setDuration(parseInt(e.target.value) || 30)} 
                className="min-h-[44px]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <DateTimePicker value={dueDate} onChange={setDueDate} />
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1 min-h-[44px]"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1 min-h-[44px]"
              >
                {isSubmitting && <Loader2 className="mr-2 animate-spin" size={16} />}
                Save Changes
              </Button>
            </div>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isSubmitting}
              className="w-full min-h-[44px]"
            >
              Delete Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTaskDialog;
