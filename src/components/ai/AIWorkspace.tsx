import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Send, 
  Layers, 
  CheckCircle2, 
  FileCode, 
  Loader2,
  Wand2,
  FileText,
  Link,
  Mic,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AIResult } from '@/types/task';
import { useKnowledgeItems, KnowledgeItem } from '@/hooks/useKnowledgeItems';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { extractTextFromPdf } from '@/lib/pdfExtractor';
import AttachmentButtons from '@/components/knowledge/AttachmentButtons';
import KnowledgeItemCard from '@/components/knowledge/KnowledgeItemCard';
import VoiceRecorder from '@/components/knowledge/VoiceRecorder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type FileType = 'text' | 'pdf' | 'image' | 'html';

interface LocalAttachment {
  id: string;
  type: 'pdf' | 'image' | 'link' | 'audio';
  name: string;
  extractedText?: string;
  file?: File;
}

const AIWorkspace: React.FC = () => {
  const [aiInput, setAiInput] = useState('');
  const [overlayPrompt, setOverlayPrompt] = useState('');
  const [fileType, setFileType] = useState<FileType>('text');
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [fullResponse, setFullResponse] = useState<string>('');
  const [showFullResponse, setShowFullResponse] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [localAttachments, setLocalAttachments] = useState<LocalAttachment[]>([]);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<string | null>(null);
  
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const { items, addItem, uploadFile, deleteItem } = useKnowledgeItems();
  const { toast } = useToast();

  const handleItemSelect = (item: KnowledgeItem) => {
    setSelectedItems(prev => 
      prev.includes(item.id)
        ? prev.filter(id => id !== item.id)
        : [...prev, item.id]
    );
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    for (const file of Array.from(files)) {
      if (file.type === 'application/pdf') {
        setExtractionProgress(`Extracting text from ${file.name}...`);
        try {
          const extractedText = await extractTextFromPdf(file);
          const attachment: LocalAttachment = {
            id: crypto.randomUUID(),
            type: 'pdf',
            name: file.name,
            extractedText,
            file
          };
          setLocalAttachments(prev => [...prev, attachment]);
          toast({ title: "PDF processed", description: `Extracted ${extractedText.length} characters` });
        } catch (error) {
          console.error('PDF extraction error:', error);
          toast({ 
            title: "PDF extraction failed", 
            description: "Could not extract text. The file may be scanned or protected.",
            variant: "destructive"
          });
        } finally {
          setExtractionProgress(null);
        }
      }
    }
    e.target.value = '';
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    for (const file of Array.from(files)) {
      const attachment: LocalAttachment = {
        id: crypto.randomUUID(),
        type: 'image',
        name: file.name,
        file,
        extractedText: `[Image: ${file.name} - visual content attached]`
      };
      setLocalAttachments(prev => [...prev, attachment]);
    }
    e.target.value = '';
    toast({ title: "Image added" });
  };

  const handleAddLink = () => {
    if (!linkInput.trim()) return;
    try {
      const url = new URL(linkInput);
      const attachment: LocalAttachment = {
        id: crypto.randomUUID(),
        type: 'link',
        name: url.hostname,
        extractedText: `Web Link: ${linkInput}\n[Please include key information from this URL in your analysis]`
      };
      setLocalAttachments(prev => [...prev, attachment]);
      setLinkInput('');
      setShowLinkInput(false);
      toast({ title: "Link added", description: url.hostname });
    } catch {
      toast({ title: "Invalid URL", variant: "destructive" });
    }
  };

  const handleVoiceRecorded = (audioBlob: Blob, duration: number) => {
    const attachment: LocalAttachment = {
      id: crypto.randomUUID(),
      type: 'audio',
      name: `Voice Recording (${duration}s)`,
      extractedText: '[Audio recording attached - transcription not available]'
    };
    setLocalAttachments(prev => [...prev, attachment]);
    setShowVoiceRecorder(false);
    toast({ title: "Recording added" });
  };

  const removeLocalAttachment = (id: string) => {
    setLocalAttachments(prev => prev.filter(a => a.id !== id));
  };

  const buildContext = (): string => {
    const selectedKnowledge = items.filter(i => selectedItems.includes(i.id));
    let context = '';

    // Add local attachments first
    for (const att of localAttachments) {
      context += `\n\n--- ${att.type.toUpperCase()}: ${att.name} ---\n`;
      if (att.extractedText) {
        context += att.extractedText;
      }
    }

    // Add knowledge suite items
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
    if (!aiInput.trim() && selectedItems.length === 0 && localAttachments.length === 0) {
      toast({ title: "Add content", description: "Please add text, attachments, or select items", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setAiResult(null);
    setFullResponse('');
    setGenStep('Building context from attachments...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "Please log in to use AI features", variant: "destructive" });
        setIsGenerating(false);
        return;
      }

      const context = buildContext();
      const fullPrompt = `${aiInput}\n\n${context}`;

      setGenStep('Processing with AI...');

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
            fileType: localAttachments.length > 0 ? localAttachments[0].type : fileType,
            overlayPrompt: overlayPrompt || 'Analyze this content and provide a detailed summary with key points and action items'
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          toast({ 
            title: "Rate Limited", 
            description: "Please try again in a moment", 
            variant: "destructive" 
          });
        } else if (response.status === 402) {
          toast({ 
            title: "Credits Exhausted", 
            description: "Please add AI credits in your Lovable workspace settings", 
            variant: "destructive" 
          });
        } else {
          toast({ title: "Error", description: data.message || "AI request failed", variant: "destructive" });
        }
        setIsGenerating(false);
        return;
      }

      setGenStep('Generating response...');
      
      setFullResponse(data.fullResponse || data.summary);
      
      const result: AIResult = {
        summary: data.summary,
        keyPoints: data.keyPoints,
        actionItems: data.actionItems,
        mermaid: data.mermaid,
        imagePlaceholder: data.imagePlaceholder
      };

      setAiResult(result);
      toast({ title: "Analysis complete! ✨" });
      
    } catch (error) {
      console.error('AI request error:', error);
      toast({ title: "Error", description: "Failed to connect to AI service", variant: "destructive" });
    } finally {
      setIsGenerating(false);
      setGenStep('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 pb-28 px-2 sm:px-0">
      {/* Knowledge Suite Items */}
      {items.length > 0 && (
        <div className="bg-card p-3 sm:p-4 rounded-xl border border-border/50 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
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
                className="text-xs text-muted-foreground hover:text-foreground min-h-[44px] px-2"
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
      <div className="bg-card p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-elevated border border-border/50">
        <div className="flex justify-between items-start mb-4 gap-2">
          <h2 className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2">
            <Sparkles className="text-primary" size={20} /> AI Workspace
          </h2>
          <select 
            className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest bg-secondary border-none rounded-full px-2 sm:px-3 py-1.5 text-muted-foreground outline-none cursor-pointer min-h-[36px]"
            value={fileType}
            onChange={(e) => setFileType(e.target.value as FileType)}
          >
            <option value="text">Text</option>
            <option value="pdf">PDF</option>
            <option value="image">Image</option>
            <option value="html">Web</option>
          </select>
        </div>

        {/* Quick Attachment Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => pdfInputRef.current?.click()}
            className="flex-1 sm:flex-none min-h-[44px] text-xs"
          >
            <FileText size={14} className="mr-1.5" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => imageInputRef.current?.click()}
            className="flex-1 sm:flex-none min-h-[44px] text-xs"
          >
            <ImageIcon size={14} className="mr-1.5" />
            Image
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLinkInput(!showLinkInput)}
            className="flex-1 sm:flex-none min-h-[44px] text-xs"
          >
            <Link size={14} className="mr-1.5" />
            Link
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
            className="flex-1 sm:flex-none min-h-[44px] text-xs"
          >
            <Mic size={14} className="mr-1.5" />
            Voice
          </Button>
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={handlePdfUpload}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        {/* Extraction Progress */}
        {extractionProgress && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg mb-4">
            <Loader2 className="animate-spin" size={16} />
            {extractionProgress}
          </div>
        )}

        {/* Link Input */}
        {showLinkInput && (
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="https://example.com"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
              className="flex-1 min-h-[44px]"
            />
            <Button onClick={handleAddLink} size="sm" className="min-h-[44px] px-4">
              Add
            </Button>
          </div>
        )}

        {/* Voice Recorder */}
        {showVoiceRecorder && (
          <div className="mb-4">
            <VoiceRecorder onRecordingComplete={handleVoiceRecorded} />
          </div>
        )}

        {/* Local Attachments Pills */}
        {localAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {localAttachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-2 rounded-full text-sm group"
              >
                {att.type === 'pdf' && <FileText size={14} className="text-primary" />}
                {att.type === 'image' && <ImageIcon size={14} className="text-green-500" />}
                {att.type === 'link' && <Link size={14} className="text-blue-500" />}
                {att.type === 'audio' && <Mic size={14} className="text-orange-500" />}
                <span className="max-w-[100px] sm:max-w-[150px] truncate text-xs font-medium">{att.name}</span>
                {att.type === 'pdf' && att.extractedText && (
                  <span className="text-[10px] text-muted-foreground">
                    ({Math.round(att.extractedText.length / 1000)}k chars)
                  </span>
                )}
                <button
                  onClick={() => removeLocalAttachment(att.id)}
                  className="opacity-50 group-hover:opacity-100 transition min-w-[24px] min-h-[24px] flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Knowledge Suite Buttons */}
        <div className="mb-4">
          <AttachmentButtons
            onAddItem={addItem}
            onUploadFile={uploadFile}
            disabled={isGenerating}
          />
        </div>

        <div className="relative">
          <textarea 
            className="w-full h-24 sm:h-32 p-4 sm:p-5 bg-secondary/50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition text-foreground placeholder:text-muted-foreground/50 placeholder:italic resize-none text-sm sm:text-base"
            placeholder="Enter additional context or select items from Knowledge Suite above..."
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
          />
        </div>
        
        {/* Instruction Overlay */}
        <div className="mt-4 p-3 sm:p-4 bg-primary/5 rounded-xl border border-primary/10">
          <label className="text-[9px] sm:text-[10px] font-black text-primary/70 uppercase mb-2 block tracking-widest flex items-center gap-2">
            <Wand2 size={12} />
            Instruction Overlay
          </label>
          <div className="flex gap-2">
            <input 
              type="text"
              placeholder="e.g. 'Summarize this PDF' or 'Create study guide'"
              className="flex-1 bg-card/80 border-none p-3 rounded-lg text-sm outline-none placeholder:text-muted-foreground/50 min-h-[44px]"
              value={overlayPrompt}
              onChange={(e) => setOverlayPrompt(e.target.value)}
            />
            <button 
              onClick={handleAIRequest}
              disabled={(!aiInput && selectedItems.length === 0 && localAttachments.length === 0) || isGenerating}
              className="bg-primary text-primary-foreground w-12 h-12 rounded-xl flex items-center justify-center hover:opacity-90 disabled:opacity-30 shadow-glow transition-all shrink-0"
              title="Process with AI"
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
          <div className="bg-card p-4 sm:p-7 rounded-xl sm:rounded-2xl shadow-elevated border border-border/50">
            <h3 className="text-lg font-black text-foreground mb-3 flex items-center gap-2">
              <Sparkles className="text-primary" size={18} />
              AI Analysis
            </h3>
            
            {/* Summary Card */}
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 mb-4">
              <p className="text-sm leading-relaxed">{aiResult.summary}</p>
            </div>

            {/* Full Response Toggle */}
            {fullResponse && fullResponse !== aiResult.summary && (
              <>
                <button
                  onClick={() => setShowFullResponse(!showFullResponse)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition w-full justify-between p-3 bg-secondary/30 rounded-lg mb-4"
                >
                  <span className="font-medium">View Full Response</span>
                  {showFullResponse ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showFullResponse && (
                  <div className="bg-secondary/30 p-4 rounded-xl max-h-[400px] overflow-y-auto mb-4">
                    <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">{fullResponse}</pre>
                  </div>
                )}
              </>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {aiResult.keyPoints.length > 0 && aiResult.keyPoints[0] !== 'Content analyzed successfully' && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Layers size={14} /> Key Concepts
                  </h4>
                  <ul className="space-y-2">
                    {aiResult.keyPoints.map((p, i) => (
                      <li key={i} className="text-xs font-bold text-foreground bg-secondary/50 p-2.5 rounded-lg flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 shrink-0"></div>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {aiResult.actionItems.length > 0 && aiResult.actionItems[0] !== 'Review the analysis above' && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 size={14} /> Action Items
                  </h4>
                  <ul className="space-y-2">
                    {aiResult.actionItems.map((p, i) => (
                      <li key={i} className="text-xs font-bold text-foreground bg-green-50 dark:bg-green-950/20 p-2.5 rounded-lg border border-green-100 dark:border-green-900 flex items-start gap-2">
                        <span>✅</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Diagram Render */}
          {aiResult.mermaid && (
            <div className="bg-card p-4 sm:p-8 rounded-xl shadow-elevated border border-border/50 overflow-hidden relative">
              <div className="flex items-center gap-2 mb-4">
                <FileCode className="text-primary" size={16} />
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Mermaid Diagram</span>
              </div>
              <div className="bg-secondary/50 p-4 rounded-lg overflow-x-auto">
                <pre className="text-xs whitespace-pre-wrap">{aiResult.mermaid}</pre>
              </div>
            </div>
          )}

          {/* AI Image Illustration */}
          {aiResult.imagePlaceholder && (
            <div className="bg-primary p-1 rounded-xl shadow-elevated overflow-hidden group">
              <div className="relative aspect-video bg-primary/80 flex flex-col items-center justify-center text-center p-4 sm:p-8 rounded-[0.65rem]">
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent"></div>
                <ImageIcon className="text-primary-foreground/60 mb-4 animate-pulse" size={48} />
                <div className="relative z-10">
                  <p className="text-primary-foreground font-black text-base sm:text-lg">{aiResult.imagePlaceholder.title}</p>
                  <p className="text-primary-foreground/70 text-[10px] mt-2 italic max-w-xs uppercase tracking-tighter">
                    "Prompt: {aiResult.imagePlaceholder.prompt}"
                  </p>
                </div>
                <div className="absolute top-4 right-4 sm:right-6 px-3 py-1 bg-foreground/20 backdrop-blur-md rounded-full text-[8px] font-black text-primary-foreground uppercase tracking-widest">
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
