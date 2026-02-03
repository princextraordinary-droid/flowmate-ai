import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEnergyLevel } from '@/hooks/useEnergyLevel';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  const { energyLevel } = useEnergyLevel();

  // Get color based on energy level
  const getEnergyColor = (level: number) => {
    if (level <= 1) return 'bg-destructive';
    if (level === 2) return 'bg-orange-500';
    if (level === 3) return 'bg-yellow-500';
    if (level === 4) return 'bg-lime-500';
    return 'bg-green-500';
  };

  const getEnergyLabel = (level: number) => {
    const labels = ['Exhausted', 'Low', 'Moderate', 'Good', 'Peak'];
    return labels[level - 1] || 'Unknown';
  };

  return (
    <header className="p-4 sm:p-6 md:p-8 flex justify-between items-center glass sticky top-0 z-40 border-b border-border/50">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-primary leading-none">Flowmate</h1>
        <p className="text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase tracking-[0.3em] sm:tracking-[0.4em] mt-1 sm:mt-1.5">
          PRODUCTIVITY COMPANION
        </p>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Energy Level Bar */}
        <div className="text-right">
          <p className="text-[8px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
            <span className="hidden xs:inline">ENERGY: </span>{getEnergyLabel(energyLevel)}
          </p>
          <div className="flex justify-end gap-0.5 sm:gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 sm:h-2 w-3 sm:w-4 rounded-full transition-all duration-300",
                  i <= energyLevel ? getEnergyColor(energyLevel) : 'bg-muted'
                )}
              />
            ))}
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-10 h-10 sm:w-12 sm:h-12 bg-card rounded-full border border-border p-0.5 shadow-soft hover:border-primary/50 transition cursor-pointer shrink-0">
              <img 
                className="rounded-full w-full h-full object-cover" 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'Alex'}&backgroundColor=c0aede`} 
                alt="Avatar" 
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 border-b border-border mb-1">
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer min-h-[44px]">
              <LogOut size={16} className="mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
