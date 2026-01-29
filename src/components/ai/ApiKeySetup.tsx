import React, { useState } from 'react';
import { Key, ExternalLink, Check, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ApiKeySetupProps {
  onSave: (apiKey: string) => Promise<boolean>;
  hasExistingKey?: boolean;
}

const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onSave, hasExistingKey }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    const success = await onSave(apiKey.trim());
    if (success) {
      setApiKey('');
    }
    setSaving(false);
  };

  return (
    <div className="bg-card p-6 rounded-pill shadow-elevated border border-border/50">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
          <Key className="text-primary" size={20} />
        </div>
        <div>
          <h3 className="font-bold text-foreground">
            {hasExistingKey ? 'Update Your Gemini API Key' : 'Add Your Gemini API Key'}
          </h3>
          <p className="text-xs text-muted-foreground">
            Each user manages their own API key for billing
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-secondary/30 p-4 rounded-pill-sm">
          <p className="text-sm text-muted-foreground mb-2">
            To use AI features, you need your own Gemini API key. This keeps costs under your control.
          </p>
          <a 
            href="https://aistudio.google.com/app/apikey" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-primary text-sm font-medium hover:underline"
          >
            Get your free API key <ExternalLink size={14} />
          </a>
        </div>

        <div className="relative">
          <Input
            type={showKey ? 'text' : 'password'}
            placeholder="Enter your Gemini API key..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={!apiKey.trim() || saving}
          className="w-full gap-2"
        >
          <Check size={16} />
          {saving ? 'Saving...' : hasExistingKey ? 'Update API Key' : 'Save API Key'}
        </Button>

        {hasExistingKey && (
          <p className="text-xs text-center text-muted-foreground">
            ✓ You already have an API key saved. Enter a new one to update it.
          </p>
        )}
      </div>
    </div>
  );
};

export default ApiKeySetup;
