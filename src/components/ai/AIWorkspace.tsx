import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  Mic, 
  Image as ImageIcon, 
  Send, 
  Layers, 
  CheckCircle2, 
  FileCode, 
  Settings,
  FileText,
  Globe,
  X,
  Loader2,
  Wand2
} from 'lucide-react';
import { AIResult } from '@/types/task';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useKnowledgeItems, KnowledgeItem } from '@/hooks/useKnowledgeItems';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ApiKeySetup from './ApiKeySetup';
import UsageIndicator from './UsageIndicator';
import AttachmentButtons from '@/components/knowledge/AttachmentButtons';
import KnowledgeItemCard from '@/components/knowledge/KnowledgeItemCard';

type FileType = 'text' | 'pdf' | 'image' | 'html';

const AIWorkspace: React.FC = () => {
  const [aiInput, setAiInput] = useState('');
  const [overlayPrompt, setOverlayPrompt] = useState('');
  const [fileType, setFileType] = useState<FileType>('text');
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  const { settings, usage, loading, hasApiKey, saveApiKey, refreshUsage } = useUserSettings();
  const { items, addItem, uploadFile, deleteItem } = useKnowledgeItems();
  const { toast } = useToast();

  const handleItemSelect = (item: KnowledgeItem) => {
    setSelectedItems(prev => 
      prev.includes(item.id)
        ? prev.filter(id => id !== item.id)
        : [...prev, item.id]
    );
  };

  const buildContext = (): string => {
    const selectedKnowledge = items.filter(i => selectedItems.includes(i.id));
    let context = '';

    for (const item of selectedKnowledge) {
      context += `\n\n--- ${item.item_type.toUpperCase()}: ${item.title || 'Untitled'} ---\n`;
      
      if (item.extracted_text) {
        context += item.extracted_text;
      } else if (item.content) {
        context += item.content;
      } else if (item.original_url) {
        context += `URL: ${item.original_url}`;
      } else if (item.file_url) {
        context += `[File attached: ${item.title}]`;
      }
    }

    return context;
  };

  const handleAIRequest = async () => {
    if (!aiInput.trim() && selectedItems.length === 0) return;
    
    if (!hasApiKey) {
      setShowSettings(true);
      toast({ 
        title: "API Key Required", 
        description: "Please add your Gemini API key first",
        variant: "destructive"
      });
      return;
    }

    if (usage.remaining <= 0) {
      toast({ 
        title: "Daily Limit Reached", 
        description: "Your free requests reset at midnight UTC",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setAiResult(null);
    setGenStep('Building context from selected items...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "Please log in to use AI features", variant: "destructive" });
        setIsGenerating(false);
        return;
      }

      const context = buildContext();
      const fullPrompt = `${aiInput}\n\n${context}`;

      setGenStep(`Processing with AI...`);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            prompt: fullPrompt,
            fileType,
            overlayPrompt
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'NO_API_KEY') {
          setShowSettings(true);
          toast({ title: "API Key Missing", description: data.message, variant: "destructive" });
        } else if (data.error === 'INVALID_API_KEY') {
          setShowSettings(true);
          toast({ title: "Invalid API Key", description: "Please check your Gemini API key", variant: "destructive" });
        } else {
          toast({ title: "Error", description: data.message || "AI request failed", variant: "destructive" });
        }
        setIsGenerating(false);
        return;
      }

      setGenStep('Generating response...');
      
      const result: AIResult = {
        summary: data.summary,
        keyPoints: data.keyPoints,
        actionItems: data.actionItems,
        mermaid: data.mermaid,
        imagePlaceholder: data.imagePlaceholder
      };

      setAiResult(result);
      await refreshUsage();
      
    } catch (error) {
      console.error('AI request error:', error);
      toast({ title: "Error", description: "Failed to connect to AI service", variant: "destructive" });
    } finally {
      setIsGenerating(false);
      setGenStep('');
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-28">
      {/* Usage & Settings */}
      <div className="flex gap-4">
        <div className="flex-1">
          <UsageIndicator {...usage} />
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`px-4 rounded-pill-sm border flex items-center gap-2 transition ${
            showSettings ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border/50 hover:border-primary/50'
          }`}
        >
          <Settings size={16} />
          <span className="text-sm font-medium">API Key</span>
        </button>
      </div>

      {/* API Key Setup */}
      {showSettings && (
        <ApiKeySetup onSave={saveApiKey} hasExistingKey={hasApiKey} />
      )}

      {/* Knowledge Suite Items */}
      {items.length > 0 && (
        <div className="bg-card p-4 rounded-xl border border-border/50 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers size={16} className="text-primary" />
              Knowledge Suite
              {selectedItems.length > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  {selectedItems.length} selected
                </span>
              )}
            </h3>
            {selectedItems.length > 0 && (
              <button
                onClick={() => setSelectedItems([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear selection
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
            {items.map(item => (
              <KnowledgeItemCard
                key={item.id}
                item={item}
                onDelete={deleteItem}
                onSelect={handleItemSelect}
                isSelected={selectedItems.includes(item.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Input Card */}
      <div className="bg-card p-6 rounded-pill shadow-elevated border border-border/50">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            <Sparkles className="text-primary" size={24} /> AI Workspace
          </h2>
          <select 
            className="text-[10px] font-bold uppercase tracking-widest bg-secondary border-none rounded-full px-3 py-1.5 text-muted-foreground outline-none cursor-pointer"
            value={fileType}
            onChange={(e) => setFileType(e.target.value as FileType)}
          >
            <option value="text">Text Note</option>
            <option value="pdf">PDF Doc</option>
            <option value="image">Image/Vision</option>
            <option value="html">Web/HTML</option>
          </select>
        </div>

        {/* Attachment Buttons */}
        <div className="mb-4">
          <AttachmentButtons
            onAddItem={addItem}
            onUploadFile={uploadFile}
            disabled={isGenerating}
          />
        </div>

        <div className="relative">
          <textarea 
            className="w-full h-32 p-5 bg-secondary/50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition text-foreground placeholder:text-muted-foreground/50 placeholder:italic resize-none"
            placeholder="Enter your content or select items from Knowledge Suite above..."
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
          />
        </div>
        
        {/* Instruction Overlay */}
        <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
          <label className="text-[10px] font-black text-primary/70 uppercase mb-2 block tracking-widest flex items-center gap-2">
            <Wand2 size={12} />
            Instruction Overlay
          </label>
          <div className="flex gap-2">
            <input 
              type="text"
              placeholder="e.g. 'Summarize this PDF' or 'Create a study guide from selected items'"
              className="flex-1 bg-card/80 border-none p-3 rounded-lg text-sm outline-none placeholder:text-muted-foreground/50"
              value={overlayPrompt}
              onChange={(e) => setOverlayPrompt(e.target.value)}
            />
            <button 
              onClick={handleAIRequest}
              disabled={(!aiInput && selectedItems.length === 0) || isGenerating || !hasApiKey || usage.remaining <= 0}
              className="bg-primary text-primary-foreground w-12 h-12 rounded-xl flex items-center justify-center hover:opacity-90 disabled:opacity-30 shadow-glow transition-all"
              title={!hasApiKey ? "Add your API key first" : usage.remaining <= 0 ? "Daily limit reached" : "Process with AI"}
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>

        {isGenerating && (
          <div className="mt-6 flex flex-col items-center justify-center py-4 space-y-3">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay:'0ms'}}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay:'150ms'}}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay:'300ms'}}></div>
            </div>
            <p className="text-[10px] font-black text-primary uppercase tracking-widest">{genStep}</p>
          </div>
        )}
      </div>

      {/* Results */}
      {aiResult && (
        <div className="space-y-4 animate-slide-up">
          {/* Main Content */}
          <div className="bg-card p-7 rounded-pill shadow-elevated border border-border/50">
            <h3 className="text-lg font-black text-foreground mb-3">AI Response</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">{aiResult.summary}</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Layers size={14} /> Key Concepts
                </h4>
                <ul className="space-y-2">
                  {aiResult.keyPoints.map((p, i) => (
                    <li key={i} className="text-xs font-bold text-foreground bg-secondary/50 p-2.5 rounded-lg flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div> {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 size={14} /> Action Items
                </h4>
                <ul className="space-y-2">
                  {aiResult.actionItems.map((p, i) => (
                    <li key={i} className="text-xs font-bold text-foreground bg-green-50 dark:bg-green-950/20 p-2.5 rounded-lg border border-green-100 dark:border-green-900">
                      ✅ {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Diagram Render */}
          {aiResult.mermaid && (
            <div className="bg-foreground p-8 rounded-xl shadow-elevated overflow-hidden relative group">
              <div className="absolute top-4 left-6 flex items-center gap-2">
                <FileCode className="text-primary" size={16} />
                <span className="text-[10px] font-black text-muted uppercase tracking-widest">Mermaid Diagram</span>
              </div>
              <div className="mt-8 flex flex-col items-center">
                <pre className="text-xs text-card bg-card/5 p-4 rounded-lg overflow-auto max-w-full">
                  {aiResult.mermaid}
                </pre>
              </div>
            </div>
          )}

          {/* AI Image Illustration */}
          {aiResult.imagePlaceholder && (
            <div className="bg-primary p-1 rounded-xl shadow-elevated overflow-hidden group">
              <div className="relative aspect-video bg-primary/80 flex flex-col items-center justify-center text-center p-8 rounded-[0.65rem]">
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent"></div>
                <ImageIcon className="text-primary-foreground/60 mb-4 animate-pulse" size={48} />
                <div className="relative z-10">
                  <p className="text-primary-foreground font-black text-lg">{aiResult.imagePlaceholder.title}</p>
                  <p className="text-primary-foreground/70 text-[10px] mt-2 italic max-w-xs uppercase tracking-tighter">
                    "Prompt: {aiResult.imagePlaceholder.prompt}"
                  </p>
                </div>
                <div className="absolute top-4 right-6 px-3 py-1 bg-foreground/20 backdrop-blur-md rounded-full text-[8px] font-black text-primary-foreground uppercase tracking-widest">
                  AI Output
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIWorkspace;
