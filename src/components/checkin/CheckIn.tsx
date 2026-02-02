import React, { useState, useEffect } from 'react';
import { History, ChevronDown, ChevronUp, Loader2, CheckCircle } from 'lucide-react';
import { useDailySyncs, DailySync } from '@/hooks/useDailySyncs';
import { Button } from '@/components/ui/button';

const CheckIn: React.FC = () => {
  const { syncs, todaySync, loading, saveSync } = useDailySyncs();
  const [energyLevel, setEnergyLevel] = useState(3);
  const [reflection, setReflection] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load today's sync data
  useEffect(() => {
    if (todaySync) {
      setEnergyLevel(todaySync.energy_level);
      setReflection(todaySync.reflection || '');
    }
  }, [todaySync]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSync(energyLevel, reflection);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

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
                onClick={() => setEnergyLevel(lvl)}
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
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-4 rounded-pill font-black text-sm shadow-elevated"
          >
            {isSaving ? (
              <Loader2 className="animate-spin mr-2" size={16} />
            ) : saved ? (
              <CheckCircle className="mr-2" size={16} />
            ) : null}
            {saved ? 'Saved!' : 'Complete Daily Sync'}
          </Button>
        </div>

        {/* History Section */}
        <div className="space-y-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-4 py-3 bg-card rounded-pill-sm border border-border/50 hover:border-primary/30 transition"
          >
            <div className="flex items-center gap-2">
              <History size={16} className="text-muted-foreground" />
              <span className="text-sm font-bold">Sync History</span>
            </div>
            {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showHistory && (
            <div className="space-y-2 animate-fade-in">
              {syncs.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No syncs yet. Start your first check-in!
                </p>
              ) : (
                syncs.slice(0, 7).map((sync) => (
                  <div
                    key={sync.id}
                    className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium">{formatDate(sync.sync_date)}</p>
                      {sync.reflection && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                          {sync.reflection}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <div
                          key={lvl}
                          className={`w-2 h-2 rounded-full ${
                            lvl <= sync.energy_level ? 'bg-primary' : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckIn;
