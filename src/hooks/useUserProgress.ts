import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import confetti from 'canvas-confetti';

interface UserProgress {
  id: string;
  user_id: string;
  current_xp: number;
  current_level: number;
  total_xp_earned: number;
}

// XP required for a full bar based on level tier
function getXPRequiredForLevel(level: number): number {
  const tier = Math.floor(level / 10);
  return 1000 + (tier * 1000); // 0-9: 1000, 10-19: 2000, etc.
}

// XP gained per energy point based on level tier
function getXPPerEnergy(level: number): number {
  const tier = Math.floor(level / 10);
  return 50 + (tier * 25); // 0-9: 50, 10-19: 75, etc.
}

export function useUserProgress() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadProgress = useCallback(async () => {
    if (!user) {
      setProgress(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProgress(data);
      } else {
        // Create initial progress record
        const { data: newProgress, error: createError } = await supabase
          .from('user_progress')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (createError) throw createError;
        setProgress(newProgress);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const triggerConfetti = () => {
    // Fire confetti from multiple points
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55, origin: { x: 0.2, y: 0.7 } });
    fire(0.2, { spread: 60, origin: { x: 0.5, y: 0.7 } });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, origin: { x: 0.8, y: 0.7 } });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, origin: { x: 0.5, y: 0.5 } });
    fire(0.1, { spread: 120, startVelocity: 45, origin: { x: 0.5, y: 0.6 } });
  };

  const addXP = async (energy: number): Promise<{ leveledUp: boolean; newLevel: number }> => {
    if (!user || !progress) return { leveledUp: false, newLevel: 0 };

    const xpPerEnergy = getXPPerEnergy(progress.current_level);
    const xpGained = energy * xpPerEnergy;
    
    let newXP = progress.current_xp + xpGained;
    let newLevel = progress.current_level;
    let leveledUp = false;

    // Check for level ups
    while (newLevel < 100) {
      const xpRequired = getXPRequiredForLevel(newLevel);
      if (newXP >= xpRequired) {
        newXP -= xpRequired;
        newLevel++;
        leveledUp = true;
      } else {
        break;
      }
    }

    // Cap at level 100
    if (newLevel >= 100) {
      newLevel = 100;
      newXP = 0;
    }

    try {
      const { error } = await supabase
        .from('user_progress')
        .update({
          current_xp: newXP,
          current_level: newLevel,
          total_xp_earned: progress.total_xp_earned + xpGained,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setProgress(prev => prev ? {
        ...prev,
        current_xp: newXP,
        current_level: newLevel,
        total_xp_earned: prev.total_xp_earned + xpGained,
      } : null);

      if (leveledUp) {
        triggerConfetti();
      }

      return { leveledUp, newLevel };
    } catch (error) {
      console.error('Error updating progress:', error);
      return { leveledUp: false, newLevel: progress.current_level };
    }
  };

  const getXPProgress = () => {
    if (!progress) return { current: 0, required: 1000, percentage: 0 };
    const required = getXPRequiredForLevel(progress.current_level);
    const percentage = Math.min((progress.current_xp / required) * 100, 100);
    return { current: progress.current_xp, required, percentage };
  };

  return {
    progress,
    loading,
    addXP,
    getXPProgress,
    getXPPerEnergy: () => progress ? getXPPerEnergy(progress.current_level) : 50,
    reload: loadProgress,
  };
}
