import React from 'react';

interface HeaderProps {
  energyLevel: number;
}

const Header: React.FC<HeaderProps> = ({ energyLevel }) => {
  return (
    <header className="p-6 md:p-8 flex justify-between items-center glass sticky top-0 z-40 border-b border-border/50">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-primary leading-none">Flowmate</h1>
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.4em] mt-1.5">
          AI Productivity Companion
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
            Energy State
          </p>
          <div className="flex justify-end gap-1">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 w-4 rounded-full transition-colors ${
                  i < energyLevel ? 'bg-primary' : 'bg-border'
                }`}
              />
            ))}
          </div>
        </div>
        <div className="w-12 h-12 bg-card rounded-pill-sm border border-border p-0.5 shadow-soft">
          <img 
            className="rounded-pill-sm w-full h-full object-cover" 
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=c0aede" 
            alt="Avatar" 
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
