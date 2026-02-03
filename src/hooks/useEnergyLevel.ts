import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import * as offlineDb from '@/lib/offlineDb';

export function useEnergyLevel() {
  const [energyLevel, setEnergyLevel] = useState<number>(3);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const loadEnergyLevel = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // First check localStorage for immediate UI update
      const cached = localStorage.getItem(`energy_${user.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.date === getTodayDate()) {
          setEnergyLevel(parsed.level);
        }
      }

      // Load from IndexedDB
      const offlineSyncs = await offlineDb.getAll<any>('dailySyncs', user.id);
      const today = getTodayDate();
      const todaySync = offlineSyncs.find(s => s.sync_date === today);
      
      if (todaySync) {
        setEnergyLevel(todaySync.energy_level);
        localStorage.setItem(`energy_${user.id}`, JSON.stringify({
          date: today,
          level: todaySync.energy_level
        }));
      }

      // Sync with Supabase if online
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('daily_syncs')
          .select('energy_level')
          .eq('user_id', user.id)
          .eq('sync_date', today)
          .maybeSingle();

        if (!error && data) {
          setEnergyLevel(data.energy_level);
          localStorage.setItem(`energy_${user.id}`, JSON.stringify({
            date: today,
            level: data.energy_level
          }));
        }
      }
    } catch (error) {
      console.error('Error loading energy level:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadEnergyLevel();
    
    // Listen for energy level changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes('energy_') && user) {
        loadEnergyLevel();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom event from check-in
    const handleEnergyUpdate = () => loadEnergyLevel();
    window.addEventListener('energy-updated', handleEnergyUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('energy-updated', handleEnergyUpdate);
    };
  }, [loadEnergyLevel, user]);

  return { energyLevel, loading, reload: loadEnergyLevel };
}
