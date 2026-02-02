import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
const Header: React.FC = () => {
  const {
    user,
    signOut
  } = useAuth();
  return <header className="p-6 md:p-8 flex justify-between items-center glass sticky top-0 z-40 border-b border-border/50">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-primary leading-none">Flowmate</h1>
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.4em] mt-1.5">PRODUCTIVITY COMPANION</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">ENERGY LEVEL</p>
          <div className="flex justify-end gap-1">
            {[...Array(5)].map((_, i) => <div key={i} className={`h-1.5 w-4 rounded-full transition-colors ${i < 3 ? 'bg-primary' : 'bg-border'}`} />)}
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-12 h-12 bg-card rounded-pill-sm border border-border p-0.5 shadow-soft hover:border-primary/50 transition cursor-pointer">
              <img className="rounded-pill-sm w-full h-full object-cover" src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'Alex'}&backgroundColor=c0aede`} alt="Avatar" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 border-b border-border mb-1">
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
              <LogOut size={16} className="mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>;
};
export default Header;