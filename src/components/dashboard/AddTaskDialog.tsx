import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Task, QuadrantId } from '@/types/task';
import { QUADRANTS } from '@/data/constants';

interface AddTaskDialogProps {
  onAddTask: (task: Omit<Task, 'id'>) => void;
}

const AddTaskDialog: React.FC<AddTaskDialogProps> = ({ onAddTask }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [quadrant, setQuadrant] = useState<QuadrantId>('Q1_DO');
  const [energy, setEnergy] = useState(3);
  const [duration, setDuration] = useState(30);
  const [due, setDue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !due.trim()) return;

    onAddTask({
      title: title.trim(),
      quadrant,
      energy,
      duration,
      status: 'pending',
      due: due.trim(),
    });

    // Reset form
    setTitle('');
    setQuadrant('Q1_DO');
    setEnergy(3);
    setDuration(30);
    setDue('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="bg-card border border-border p-2.5 rounded-pill text-muted-foreground shadow-soft hover:shadow-md transition-all">
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
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quadrant">Quadrant</Label>
            <Select value={quadrant} onValueChange={(val) => setQuadrant(val as QuadrantId)}>
              <SelectTrigger>
                <SelectValue placeholder="Select quadrant" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(QUADRANTS).map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.icon} {q.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="energy">Energy (1-5)</Label>
              <Select value={energy.toString()} onValueChange={(val) => setEnergy(parseInt(val))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <SelectItem key={level} value={level.toString()}>
                      {level} ⚡
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input
                id="duration"
                type="number"
                min={5}
                max={480}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due">Due Date</Label>
            <Input
              id="due"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              placeholder="e.g., Today 2PM, Tomorrow, Friday"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Task</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskDialog;
