import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Task, QuadrantId } from '@/types/task';
import { QUADRANTS } from '@/data/constants';
import DateTimePicker from './DateTimePicker';

interface AddTaskDialogProps {
  onAddTask: (task: Omit<Task, 'id'>) => Promise<Task | null>;
}

const AddTaskDialog: React.FC<AddTaskDialogProps> = ({
  onAddTask
}) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [quadrant, setQuadrant] = useState<QuadrantId>('Q1_DO');
  const [energy, setEnergy] = useState(3);
  const [duration, setDuration] = useState(30);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;
    setIsSubmitting(true);
    try {
      const dueString = format(dueDate, "MMM d, h:mm a");
      
      await onAddTask({
        title: title.trim(),
        quadrant,
        energy,
        duration,
        status: 'pending',
        due: dueString
      });

      // Reset form
      setTitle('');
      setQuadrant('Q1_DO');
      setEnergy(3);
      setDuration(30);
      setDueDate(undefined);
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="border border-border p-2.5 rounded-pill text-muted-foreground shadow-soft hover:shadow-md transition-all bg-blue-400 hover:bg-blue-300">
          <Plus size={20} />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter task title..." required className="min-h-[44px]" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quadrant">Quadrant</Label>
            <Select value={quadrant} onValueChange={val => setQuadrant(val as QuadrantId)}>
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder="Select quadrant" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(QUADRANTS).map(q => <SelectItem key={q.id} value={q.id}>
                    {q.icon} {q.title}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="energy">Energy (1-5)</Label>
              <Select value={energy.toString()} onValueChange={val => setEnergy(parseInt(val))}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(level => <SelectItem key={level} value={level.toString()}>
                      {level} ⚡
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input id="duration" type="number" min={5} max={480} value={duration} onChange={e => setDuration(parseInt(e.target.value) || 30)} className="min-h-[44px]" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <DateTimePicker value={dueDate} onChange={setDueDate} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="min-h-[44px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !dueDate} className="min-h-[44px]">
              {isSubmitting && <Loader2 className="mr-2 animate-spin" size={16} />}
              Add Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>;
};
export default AddTaskDialog;