import React, { useState } from 'react';
import { Sparkles, Mic, Image as ImageIcon, Send, Layers, CheckCircle2, FileCode } from 'lucide-react';
import { AIResult } from '@/types/task';

type FileType = 'text' | 'pdf' | 'image' | 'html';

const AIWorkspace: React.FC = () => {
  const [aiInput, setAiInput] = useState('');
  const [overlayPrompt, setOverlayPrompt] = useState('');
  const [fileType, setFileType] = useState<FileType>('text');
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState('');

  const handleSimulateMultimodalAI = async () => {
    setIsGenerating(true);
    setAiResult(null);
    
    setGenStep(`Extracting data from ${fileType.toUpperCase()}...`);
    await new Promise(r => setTimeout(r, 800));

    setGenStep("Applying Instruction Overlay...");
    await new Promise(r => setTimeout(r, 1000));

    const isDiagramRequested = overlayPrompt.toLowerCase().includes('diagram') || 
                               overlayPrompt.toLowerCase().includes('chart') || 
                               overlayPrompt.toLowerCase().includes('cycle');
    const isImageRequested = overlayPrompt.toLowerCase().includes('picture') || 
                             overlayPrompt.toLowerCase().includes('image') || 
                             overlayPrompt.toLowerCase().includes('illustration');

    const result: AIResult = {
      summary: `The provided ${fileType} contains details about systematic processes. Based on your instruction "${overlayPrompt || 'General Summary'}", here is the breakdown.`,
      keyPoints: ["Fundamental core concepts", "Process sequence", "Variable outcomes"],
      actionItems: ["Review specific methodology", "Test application of theory"],
    };

    if (isDiagramRequested) {
      setGenStep("Architecting Mermaid.js Diagram...");
      await new Promise(r => setTimeout(r, 1200));
      result.mermaid = `graph TD\nA[Start] --> B(Process Data)\nB --> C{Decision}\nC -->|Yes| D[Result A]\nC -->|No| E[Result B]`;
    }

    if (isImageRequested) {
      setGenStep("Generating AI Illustration...");
      await new Promise(r => setTimeout(r, 1500));
      result.imagePlaceholder = {
        title: "AI Generated Concept Art",
        prompt: overlayPrompt,
        style: "Educational / 3D Render"
      };
    }

    setAiResult(result);
    setIsGenerating(false);
    setGenStep('');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-28">
      {/* Input Card */}
      <div className="bg-card p-6 rounded-pill shadow-elevated border border-border/50">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            <Sparkles className="text-primary" size={24} /> Knowledge Suite
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

        <div className="relative">
          <textarea 
            className="w-full h-40 p-5 bg-secondary/50 border-none rounded-pill-sm focus:ring-2 focus:ring-primary/20 outline-none transition text-foreground placeholder:text-muted-foreground/50 placeholder:italic resize-none"
            placeholder={`Paste ${fileType} content here...`}
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
          />
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button className="p-2 bg-card rounded-full shadow-soft text-muted-foreground hover:text-primary transition">
              <Mic size={18}/>
            </button>
            <button className="p-2 bg-card rounded-full shadow-soft text-muted-foreground hover:text-primary transition">
              <ImageIcon size={18}/>
            </button>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-primary/5 rounded-pill-sm border border-primary/10">
          <label className="text-[10px] font-black text-primary/70 uppercase mb-2 block tracking-widest">
            Instruction Overlay
          </label>
          <div className="flex gap-2">
            <input 
              type="text"
              placeholder="e.g. 'Generate a flow diagram' or 'Explain like I'm 5'"
              className="flex-1 bg-card/80 border-none p-3 rounded-pill-sm text-sm outline-none placeholder:text-muted-foreground/50"
              value={overlayPrompt}
              onChange={(e) => setOverlayPrompt(e.target.value)}
            />
            <button 
              onClick={handleSimulateMultimodalAI}
              disabled={!aiInput || isGenerating}
              className="bg-primary text-primary-foreground w-12 h-12 rounded-pill-sm flex items-center justify-center hover:opacity-90 disabled:opacity-30 shadow-glow transition-all"
            >
              <Send size={18} />
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
            <h3 className="text-lg font-black text-foreground mb-3">Augmented Summary</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">{aiResult.summary}</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Layers size={14} /> Key Concepts
                </h4>
                <ul className="space-y-2">
                  {aiResult.keyPoints.map((p, i) => (
                    <li key={i} className="text-xs font-bold text-foreground bg-secondary/50 p-2.5 rounded-pill-sm flex items-center gap-2">
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
                    <li key={i} className="text-xs font-bold text-foreground bg-green-50 p-2.5 rounded-pill-sm border border-green-100">
                      ✅ {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Diagram Render */}
          {aiResult.mermaid && (
            <div className="bg-foreground p-8 rounded-pill shadow-elevated overflow-hidden relative group">
              <div className="absolute top-4 left-6 flex items-center gap-2">
                <FileCode className="text-primary" size={16} />
                <span className="text-[10px] font-black text-muted uppercase tracking-widest">Mermaid Visualizer</span>
              </div>
              <div className="mt-8 flex flex-col items-center">
                <div className="w-full max-w-xs space-y-4">
                  <div className="h-10 w-24 bg-primary/20 border border-primary/50 rounded-xl flex items-center justify-center text-[10px] text-card font-bold mx-auto">START</div>
                  <div className="w-px h-8 bg-primary/30 mx-auto"></div>
                  <div className="h-14 w-48 bg-card/5 border border-card/10 rounded-pill-sm flex items-center justify-center text-[10px] text-primary-foreground/80 font-bold mx-auto px-4 text-center">ANALYZE CONTENT</div>
                  <div className="w-px h-8 bg-primary/30 mx-auto"></div>
                  <div className="w-20 h-20 bg-primary/10 border border-primary/50 rotate-45 mx-auto flex items-center justify-center">
                    <span className="-rotate-45 text-[10px] text-card font-black">VALID?</span>
                  </div>
                </div>
              </div>
              <button className="absolute bottom-4 right-6 bg-card/10 text-card/60 px-4 py-1.5 rounded-full text-[10px] font-bold hover:bg-card hover:text-foreground transition">
                Download SVG
              </button>
            </div>
          )}

          {/* AI Image Illustration */}
          {aiResult.imagePlaceholder && (
            <div className="bg-primary p-1 rounded-pill shadow-elevated overflow-hidden group">
              <div className="relative aspect-video bg-primary/80 flex flex-col items-center justify-center text-center p-8 rounded-[2.3rem]">
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent"></div>
                <ImageIcon className="text-primary-foreground/60 mb-4 animate-pulse-soft" size={48} />
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
