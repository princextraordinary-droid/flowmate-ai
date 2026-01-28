import React from 'react';

interface CheckInProps {
  energyLevel: number;
  onEnergyChange: (level: number) => void;
}

const CheckIn: React.FC<CheckInProps> = ({ energyLevel, onEnergyChange }) => {
  return (
    <div className="max-w-md mx-auto space-y-10 py-6 animate-fade-in pb-28">
      <div className="text-center">
        <h2 className="text-3xl font-black text-foreground">Check-in</h2>
        <p className="text-muted-foreground text-[10px] font-bold mt-1 uppercase tracking-[0.3em]">
          Sync your energy state
        </p>
      </div>

      <div className="space-y-8">
        {/* Energy Selector */}
        <div>
          <div className="flex justify-between items-center gap-2">
            {[1, 2, 3, 4, 5].map(lvl => (
              <button 
                key={lvl}
                onClick={() => onEnergyChange(lvl)}
                className={`w-14 h-14 rounded-pill font-black text-lg transition-all ${
                  energyLevel === lvl 
                    ? 'bg-primary text-primary-foreground scale-110 shadow-glow' 
                    : 'bg-card text-muted-foreground hover:text-foreground shadow-soft border border-border'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-6 px-1 font-bold uppercase tracking-widest opacity-60">
            <span>Low Energy</span>
            <span>Unstoppable</span>
          </div>
        </div>

        {/* Reflection Card */}
        <div className="bg-card p-8 rounded-pill shadow-elevated border border-border/50 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block ml-1">
              Today's Reflection
            </label>
            <textarea 
              className="w-full bg-secondary/50 p-5 rounded-pill-sm border-none text-sm outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50 resize-none h-32" 
              placeholder="Wins, challenges, or thoughts..."
            />
          </div>
          <button className="w-full bg-foreground text-background py-4 rounded-pill font-black text-sm hover:opacity-90 transition shadow-elevated">
            Complete Daily Sync
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckIn;
