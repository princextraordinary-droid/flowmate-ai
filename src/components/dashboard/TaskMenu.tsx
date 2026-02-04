import React from 'react';
import { MoreVertical, Edit, ArrowRight } from 'lucide-react';
import { Task, QuadrantId } from '@/types/task';
import { QUADRANTS } from '@/data/constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TaskMenuProps {
  task: Task;
  onEdit: () => void;
  onMoveToQuadrant: (quadrantId: QuadrantId) => void;
}

const TaskMenu: React.FC<TaskMenuProps> = ({ task, onEdit, onMoveToQuadrant }) => {
  const otherQuadrants = Object.values(QUADRANTS).filter(q => q.id !== task.quadrant);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className="p-2 rounded-full hover:bg-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical size={18} className="text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} className="min-h-[44px]">
          <Edit className="mr-2 h-4 w-4" />
          Modify Task
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="min-h-[44px]">
            <ArrowRight className="mr-2 h-4 w-4" />
            Move to Quadrant
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {otherQuadrants.map((q) => (
              <DropdownMenuItem 
                key={q.id} 
                onClick={(e) => { e.stopPropagation(); onMoveToQuadrant(q.id); }}
                className="min-h-[44px]"
              >
                {q.icon} {q.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TaskMenu;
