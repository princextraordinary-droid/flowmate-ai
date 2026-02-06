import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, Send, BookOpen, X, Brain, 
  FileUp, FileDown, History, Trash2,
  Settings, Loader2, Square, User, LogOut,
  FileText, Link, ImageIcon
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { extractTextFromPdf } from '@/lib/pdfExtractor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SavedGuide {
  id: number;
  name: string;
  date: string;
  messages: Message[];
}

interface Attachment {
  id: string;
  type: 'pdf' | 'image' | 'link' | 'audio';
  name: string;
  data?: string;
  mime?: string;
  extractedText?: string;
}

const FlowmateAI: React.FC = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [savedGuides, setSavedGuides] = useState<SavedGuide[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved guides from localStorage (scoped to user)
  useEffect(() => {
    if (!user) return;
    
    const storageKey = `flowmate_${user.id}_saved_guides`;
    const guides = JSON.parse(localStorage.getItem(storageKey) || '[]');
    setSavedGuides(guides);
  }, [user]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Load jsPDF dynamically
  useEffect(() => {
    if (!(window as any).jspdf) {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const saveGuidesToStorage = (guides: SavedGuide[]) => {
    if (!user) return;
    const storageKey = `flowmate_${user.id}_saved_guides`;
    localStorage.setItem(storageKey, JSON.stringify(guides));
    setSavedGuides(guides);
  };

  const exportToPDF = () => {
    if (messages.length === 0 || !(window as any).jspdf) {
      toast({ title: "No messages to export", variant: "destructive" });
      return;
    }

    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();
    let yOffset = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxLineWidth = pageWidth - (margin * 2);

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(99, 102, 241); // Indigo-500
    doc.text("FLOWMATE STUDY GUIDE", margin, yOffset);
    yOffset += 15;

    messages.forEach((m) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(m.role === 'user' ? 99 : 34, m.role === 'user' ? 102 : 197, m.role === 'user' ? 241 : 94);
      doc.text(m.role === 'user' ? "QUERY" : "STUDY NOTE", margin, yOffset);
      yOffset += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      const lines = doc.splitTextToSize(m.content, maxLineWidth);
      lines.forEach((line: string) => {
        if (yOffset > 280) { doc.addPage(); yOffset = 20; }
        doc.text(line, margin, yOffset);
        yOffset += 6;
      });
      yOffset += 6;
    });

    const filename = `Flowmate_Guide_${Date.now()}.pdf`;
    doc.save(filename);

    // Save to history
    const newGuide: SavedGuide = { 
      id: Date.now(), 
      name: filename, 
      date: new Date().toLocaleString(),
      messages: [...messages]
    };
    saveGuidesToStorage([newGuide, ...savedGuides]);
    toast({ title: "PDF exported!", description: filename });
  };

  const deleteGuide = (id: number) => {
    const filtered = savedGuides.filter(g => g.id !== id);
    saveGuidesToStorage(filtered);
  };

  // --- AI LOGIC ---
  const handleAiAction = async () => {
    if (!input.trim() && attachments.length === 0) return;

    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please log in", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      // Build context from attachments
      let attachmentContext = '';
      for (const att of attachments) {
        attachmentContext += `\n\n--- ${att.type.toUpperCase()}: ${att.name} ---\n`;
        if (att.extractedText) {
          attachmentContext += att.extractedText;
        } else if (att.data) {
          attachmentContext += `[${att.type} content attached]`;
        }
      }

      // Build conversation history for context
      const conversationHistory = messages.map(m => 
        `${m.role === 'user' ? 'Student' : 'Flowmate'}: ${m.content}`
      ).join('\n\n');

      const fullPrompt = `
Previous conversation:
${conversationHistory}

${attachmentContext ? `\nAttached materials:${attachmentContext}` : ''}

Student's new message: ${input || "Please analyze the attached content."}

You are Flowmate, a personalized student companion for ${user?.email || 'the student'}. 
Format your response with:
- Use ALL CAPS for section headers
- Use '•' bullet points for all lists
- Be encouraging, academic, and actionable
- If the student asks for study notes, create comprehensive study materials
- If analyzing content, provide key insights and action items
`;

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
            fileType: attachments.length > 0 ? attachments[0].type : 'text',
            overlayPrompt: 'Respond as Flowmate, the student companion. Be helpful and academic.'
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
        setIsLoading(false);
        return;
      }

      const aiText = data.fullResponse || data.summary || "I couldn't generate a response. Please try again.";

      setMessages(prev => [...prev, 
        { role: 'user', content: input || "Attachment analysis" },
        { role: 'assistant', content: aiText }
      ]);
      
      setInput('');
      setAttachments([]);
      
    } catch (error) {
      console.error('AI error:', error);
      toast({ title: "Error", description: "Failed to connect to AI service", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // --- FILE HANDLERS ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      setExtractionProgress(`Extracting text from ${file.name}...`);
      try {
        const extractedText = await extractTextFromPdf(file);
        setAttachments(prev => [...prev, {
          id: crypto.randomUUID(),
          type: 'pdf',
          name: file.name,
          extractedText
        }]);
        toast({ title: "PDF processed", description: `Extracted ${extractedText.length} characters` });
      } catch (error) {
        toast({ title: "PDF extraction failed", variant: "destructive" });
      } finally {
        setExtractionProgress(null);
      }
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result?.toString().split(',')[1];
        setAttachments(prev => [...prev, {
          id: crypto.randomUUID(),
          type: 'image',
          name: file.name,
          data: base64,
          mime: file.type,
          extractedText: `[Image: ${file.name}]`
        }]);
      };
      reader.readAsDataURL(file);
      toast({ title: "Image added" });
    }
    e.target.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result?.toString().split(',')[1];
          setAttachments(prev => [...prev, {
            id: crypto.randomUUID(),
            type: 'audio',
            name: "Voice Note",
            data: base64,
            mime: 'audio/wav',
            extractedText: '[Voice recording attached]'
          }]);
          toast({ title: "Voice note added" });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const clearConversation = () => {
    setMessages([]);
    setAttachments([]);
    toast({ title: "Conversation cleared" });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] bg-background text-foreground overflow-hidden rounded-xl border border-border">
      {/* NAVBAR */}
      <nav className="p-4 bg-card border-b border-border flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-xl text-primary-foreground shadow-lg">
            <Brain size={22} />
          </div>
          <div>
            <h1 className="font-bold text-foreground leading-none">Flowmate AI</h1>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1">Student Companion</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <>
              <Button variant="ghost" size="icon" onClick={exportToPDF} title="Export PDF">
                <FileDown size={20} />
              </Button>
              <Button variant="ghost" size="icon" onClick={clearConversation} title="Clear">
                <Trash2 size={18} />
              </Button>
            </>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-foreground">{user?.email?.split('@')[0] || 'Guest'}</p>
              <p className="text-[10px] text-muted-foreground">History & Settings</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <User size={16} />
            </div>
          </Button>
        </div>
      </nav>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-border animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-primary text-primary-foreground flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold">Personal Portal</h2>
                <p className="text-xs opacity-80">Synced with {user?.email || 'Guest Account'}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowSettings(false)}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <X size={18}/>
              </Button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">
                  <History size={12} className="inline mr-1" />
                  Saved Study Guides
                </label>
                {savedGuides.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center border-2 border-dashed border-border rounded-2xl italic">
                    No study guides saved yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {savedGuides.map(g => (
                      <div key={g.id} className="flex items-center justify-between p-3 bg-secondary rounded-xl border border-border group">
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-foreground truncate">{g.name}</p>
                          <p className="text-[10px] text-muted-foreground">{g.date}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteGuide(g.id)}
                          className="opacity-0 group-hover:opacity-100 transition-all text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={14}/>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-4">
                  AI powered by Lovable Gateway - no API key required!
                </p>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={signOut}
                >
                  <LogOut size={16} className="mr-2" /> Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHAT DISPLAY */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-xs mx-auto">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mb-4">
              <BookOpen size={32} />
            </div>
            <h3 className="font-bold text-foreground">What are we studying today?</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Upload your lecture notes, record a voice memo, or just ask a question.
            </p>
          </div>
        )}
        
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] p-4 rounded-2xl shadow-sm ${
              m.role === 'user' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-card border border-border'
            }`}>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {m.content}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-center gap-2 text-primary font-bold text-xs animate-pulse">
            <Loader2 className="animate-spin" size={14} /> Thinking...
          </div>
        )}
      </div>

      {/* INPUT BAR */}
      <div className="p-4 bg-card border-t border-border shrink-0">
        {/* Extraction Progress */}
        {extractionProgress && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary p-3 rounded-lg mb-3">
            <Loader2 className="animate-spin" size={16} />
            {extractionProgress}
          </div>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto py-1">
            {attachments.map((att) => (
              <div key={att.id} className="flex items-center gap-2 bg-secondary border border-border px-3 py-1 rounded-full shrink-0">
                {att.type === 'pdf' && <FileText size={12} className="text-primary" />}
                {att.type === 'image' && <ImageIcon size={12} className="text-green-500" />}
                {att.type === 'link' && <Link size={12} className="text-blue-500" />}
                {att.type === 'audio' && <Mic size={12} className="text-orange-500" />}
                <span className="text-[10px] font-bold text-foreground truncate max-w-[100px]">{att.name}</span>
                <button onClick={() => removeAttachment(att.id)} className="hover:text-destructive">
                  <X size={12}/>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 bg-secondary rounded-[24px] p-2 pr-3 focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,image/*"
            onChange={handleFileUpload}
          />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="text-muted-foreground hover:text-primary"
          >
            <FileUp size={20} />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            className={isRecording ? 'text-destructive bg-destructive/10 animate-pulse' : 'text-muted-foreground hover:text-primary'}
          >
            {isRecording ? <Square size={20} /> : <Mic size={20} />}
          </Button>
          
          <Textarea 
            className="flex-1 bg-transparent border-none focus-visible:ring-0 text-sm py-2 max-h-32 resize-none min-h-[40px]"
            placeholder="Message Flowmate..."
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { 
              if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                handleAiAction(); 
              } 
            }}
          />
          
          <Button 
            onClick={handleAiAction}
            disabled={isLoading || (!input.trim() && attachments.length === 0)}
            size="icon"
            className="rounded-full shadow-lg"
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FlowmateAI;
