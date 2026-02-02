import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import * as offlineDb from '@/lib/offlineDb';

export interface DailySync {
  id: string;
  user_id: string;
  energy_level: number;
  reflection: string | null;
  sync_date: string;
  created_at: string;
}

export function useDailySyncs() {
  const [syncs, setSyncs] = useState<DailySync[]>([]);
  const [todaySync, setTodaySync] = useState<DailySync | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const loadSyncs = useCallback(async () => {
    if (!user) {
      setSyncs([]);
      setTodaySync(null);
      setLoading(false);
      return;
    }

    try {
      // First load from IndexedDB
      const offlineSyncs = await offlineDb.getAll<DailySync>('dailySyncs', user.id);
      if (offlineSyncs.length > 0) {
        setSyncs(offlineSyncs.sort((a, b) => 
          new Date(b.sync_date).getTime() - new Date(a.sync_date).getTime()
        ));
        const today = getTodayDate();
        setTodaySync(offlineSyncs.find(s => s.sync_date === today) || null);
      }

      // Sync with Supabase if online
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('daily_syncs')
          .select('*')
          .eq('user_id', user.id)
          .order('sync_date', { ascending: false });

        if (error) throw error;

        const serverSyncs = data || [];
        
        // Update IndexedDB
        for (const sync of serverSyncs) {
          await offlineDb.put('dailySyncs', sync);
        }

        setSyncs(serverSyncs);
        const today = getTodayDate();
        setTodaySync(serverSyncs.find(s => s.sync_date === today) || null);
      }
    } catch (error) {
      console.error('Error loading daily syncs:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSyncs();
  }, [loadSyncs]);

  const saveSync = async (energyLevel: number, reflection: string): Promise<DailySync | null> => {
    if (!user) return null;

    const today = getTodayDate();
    const syncData: DailySync = {
      id: todaySync?.id || crypto.randomUUID(),
      user_id: user.id,
      energy_level: energyLevel,
      reflection: reflection || null,
      sync_date: today,
      created_at: todaySync?.created_at || new Date().toISOString()
    };

    // Optimistic update
    setTodaySync(syncData);
    setSyncs(prev => {
      const filtered = prev.filter(s => s.sync_date !== today);
      return [syncData, ...filtered];
    });

    // Save to IndexedDB
    await offlineDb.put('dailySyncs', syncData);

    if (navigator.onLine) {
      try {
        if (todaySync) {
          // Update existing
          const { error } = await supabase
            .from('daily_syncs')
            .update({
              energy_level: energyLevel,
              reflection: reflection || null
            })
            .eq('id', syncData.id)
            .eq('user_id', user.id);

          if (error) throw error;
        } else {
          // Create new
          const { error } = await supabase
            .from('daily_syncs')
            .insert({
              id: syncData.id,
              user_id: user.id,
              energy_level: energyLevel,
              reflection: reflection || null,
              sync_date: today
            });

          if (error) throw error;
        }
        
        toast({ title: "Daily sync saved! ✨", description: "Your check-in has been recorded" });
      } catch (error) {
        console.error('Error saving sync to server:', error);
        await offlineDb.addToSyncQueue(
          todaySync ? 'update' : 'create',
          'daily_syncs',
          syncData.id,
          syncData
        );
        toast({ title: "Saved offline", description: "Will sync when you're back online" });
      }
    } else {
      await offlineDb.addToSyncQueue(
        todaySync ? 'update' : 'create',
        'daily_syncs',
        syncData.id,
        syncData
      );
      toast({ title: "Saved offline", description: "Will sync when you're back online" });
    }

    return syncData;
  };

  return {
    syncs,
    todaySync,
    loading,
    saveSync,
    reload: loadSyncs
  };
}
