import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserSettings {
  gemini_api_key: string | null;
}

interface ApiUsage {
  used: number;
  limit: number;
  remaining: number;
}

const FREE_DAILY_LIMIT = 15;

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [usage, setUsage] = useState<ApiUsage>({ used: 0, limit: FREE_DAILY_LIMIT, remaining: FREE_DAILY_LIMIT });
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      
      setUserId(user.id);

      // Fetch settings
      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('gemini_api_key')
        .eq('user_id', user.id)
        .maybeSingle();

      setSettings(settingsData || { gemini_api_key: null });

      // Fetch today's usage
      const today = new Date().toISOString().split('T')[0];
      const { data: usageData } = await supabase
        .from('api_usage')
        .select('request_count')
        .eq('user_id', user.id)
        .eq('usage_date', today)
        .maybeSingle();

      const used = usageData?.request_count || 0;
      setUsage({
        used,
        limit: FREE_DAILY_LIMIT,
        remaining: Math.max(0, FREE_DAILY_LIMIT - used)
      });

      setLoading(false);
    };

    fetchSettings();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchSettings();
    });

    return () => subscription.unsubscribe();
  }, []);

  const saveApiKey = async (apiKey: string) => {
    if (!userId) {
      toast({ title: "Error", description: "Please log in first", variant: "destructive" });
      return false;
    }

    const { data: existing } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from('user_settings')
        .update({ gemini_api_key: apiKey })
        .eq('user_id', userId));
    } else {
      ({ error } = await supabase
        .from('user_settings')
        .insert({ user_id: userId, gemini_api_key: apiKey }));
    }

    if (error) {
      toast({ title: "Error", description: "Failed to save API key", variant: "destructive" });
      return false;
    }

    setSettings({ gemini_api_key: apiKey });
    toast({ title: "Success", description: "API key saved successfully" });
    return true;
  };

  const refreshUsage = async () => {
    if (!userId) return;
    
    const today = new Date().toISOString().split('T')[0];
    const { data: usageData } = await supabase
      .from('api_usage')
      .select('request_count')
      .eq('user_id', userId)
      .eq('usage_date', today)
      .maybeSingle();

    const used = usageData?.request_count || 0;
    setUsage({
      used,
      limit: FREE_DAILY_LIMIT,
      remaining: Math.max(0, FREE_DAILY_LIMIT - used)
    });
  };

  return {
    settings,
    usage,
    loading,
    hasApiKey: !!settings?.gemini_api_key,
    saveApiKey,
    refreshUsage
  };
}
