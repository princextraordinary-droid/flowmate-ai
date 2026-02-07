import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, Send, BookOpen, X, Brain, 
  FileUp, FileDown, Trash2,
  Loader2, Square, User, LogOut, Settings, History
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { extractTextFromPdf } from '@/lib/pdfExtractor';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const GEMINI_MODEL = "gemini-2.5-flash";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Attachment {
  type: string;
  data: string;
  name: string;
  mime: string;
}

interface SavedGuide {
  id: number;
  name: string;
  date: string;
  messages: Message[];
}

const FlowmateAI: React.FC = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [userApiKey, setUserApiKey] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [savedGuides, setSavedGuides] = useState<SavedGuide[]>([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const storagePrefix = user?.id ? `flowmate_${user.id}_` : 'flowmate_';

  // --- SYNC WITH USER & PERSISTENCE ---
  useEffect(() => {
    const savedKey = localStorage.getItem(`${storagePrefix}api_key`);
    if (savedKey) {
      setUserApiKey(savedKey);
      setIsKeySaved(true);
    } else {
      setShowSettings(true);
    }

    const today = new Date().toDateString();
    const savedUsage = JSON.parse(localStorage.getItem(`${storagePrefix}usage`) || '{}');
    if (savedUsage.date !== today) {
      localStorage.setItem(`${storagePrefix}usage`, JSON.stringify({ date: today, count: 0 }));
      setRequestCount(0);
    } else {
      setRequestCount(savedUsage.count);
    }

    const guides = JSON.parse(localStorage.getItem(`${storagePrefix}saved_guides`) || '[]');
    setSavedGuides(guides);
  }, [user, storagePrefix]);

  const incrementUsage = () => {
    const today = new Date().toDateString();
    const newCount = requestCount + 1;
    localStorage.setItem(`${storagePrefix}usage`, JSON.stringify({ date: today, count: newCount }));
    setRequestCount(newCount);
  };

  const saveKey = () => {
    if (userApiKey.trim()) {
      localStorage.setItem(`${storagePrefix}api_key`, userApiKey.trim());
      setIsKeySaved(true);
      setShowSettings(false);
      toast({ title: "API key saved!", description: "You can now use Flowmate AI" });
    }
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  // --- PDF EXPORT ---
  const exportToPDF = () => {
    if (messages.length === 0) {
      toast({ title: "No messages to export", variant: "destructive" });
      return;
    }

    const doc = new jsPDF();
    let yOffset = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxLineWidth = pageWidth - (margin * 2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(67, 56, 202);
    doc.text("FLOWMATE STUDY GUIDE", margin, yOffset);
    yOffset += 15;

    messages.forEach((m) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(m.role === 'user' ? 79 : 30, m.role === 'user' ? 70 : 41, m.role === 'user' ? 229 : 59);
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

    const newGuide: SavedGuide = { 
      id: Date.now(), 
      name: filename, 
      date: new Date().toLocaleString(),
      messages: [...messages]
    };
    const updated = [newGuide, ...savedGuides];
    setSavedGuides(updated);
    localStorage.setItem(`${storagePrefix}saved_guides`, JSON.stringify(updated));
    toast({ title: "PDF exported!", description: filename });
  };

  // --- AI LOGIC WITH MEMORY (Direct Gemini API) ---
  const handleAiAction = async () => {
    if (!input && attachments.length === 0) return;
    if (!userApiKey) { 
      setShowSettings(true); 
      toast({ title: "API key required", description: "Please enter your Gemini API key", variant: "destructive" });
      return; 
    }

    setIsLoading(true);
    const currentPromptParts: any[] = [{ text: input || "Summarize the context." }];
    
    // Add attachments as inline data
    attachments.forEach(att => {
      if (att.type === 'image' || att.type === 'audio') {
        currentPromptParts.push({ 
          inlineData: { mimeType: att.mime, data: att.data } 
        });
      } else {
        // For PDF extracted text, add as text
        currentPromptParts.push({ text: `\n\n[${att.name}]:\n${att.data}` });
      }
    });

    // Build conversation history
    const history = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${userApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [...history, { role: 'user', parts: currentPromptParts }],
            systemInstruction: { 
              parts: [{ 
                text: `You are Flowmate, a personalized student companion for ${user?.user_metadata?.full_name || user?.email || 'the student'}. 
                Format: Use ALL CAPS for headers. Use '•' for all lists. Be encouraging and academic.` 
              }] 
            }
          })
        }
      );
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'API Error');
      }
      
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';

      setMessages(prev => [...prev, 
        { role: 'user', content: input || "Attachment analysis" },
        { role: 'assistant', content: aiText }
      ]);
      
      incrementUsage();
      setInput('');
      setAttachments([]);
    } catch (error) {
      console.error('Gemini API Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get response. Please check your API key.';
      setMessages(prev => [...prev,
        { role: 'user', content: input || "Attachment analysis" },
        { role: 'assistant', content: `Error: ${errorMessage}` }
      ]);
      toast({ title: "API Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // --- FILE HANDLERS ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Handle PDF extraction
    if (file.type === 'application/pdf') {
      try {
        toast({ title: "Processing PDF...", description: file.name });
        const text = await extractTextFromPdf(file);
        setAttachments(prev => [...prev, {
          type: 'pdf',
          data: text.substring(0, 30000), // Limit text length
          name: file.name,
          mime: 'text/plain'
        }]);
        toast({ title: "PDF processed", description: `Extracted ${text.length} characters` });
      } catch (error) {
        console.error('PDF extraction failed:', error);
        toast({ title: "PDF extraction failed", variant: "destructive" });
      }
      return;
    }

    // Handle images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = (ev.target?.result as string).split(',')[1];
        setAttachments(prev => [...prev, { 
          type: 'image', 
          data: base64, 
          name: file.name, 
          mime: file.type 
        }]);
        toast({ title: "Image added", description: file.name });
      };
      reader.readAsDataURL(file);
    }
    
    e.target.value = '';
  };

  // --- AUDIO RECORDING ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          setAttachments(prev => [...prev, { 
            type: 'audio', 
            data: base64, 
            name: "Voice Note", 
            mime: 'audio/wav' 
          }]);
          toast({ title: "Voice note added" });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Recording failed:', error);
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const deleteGuide = (id: number) => {
    const filtered = savedGuides.filter(x => x.id !== id);
    setSavedGuides(filtered);
    localStorage.setItem(`${storagePrefix}saved_guides`, JSON.stringify(filtered));
  };

  const clearApiKey = () => {
    localStorage.removeItem(`${storagePrefix}api_key`);
    setUserApiKey('');
    setIsKeySaved(false);
    toast({ title: "API key cleared" });
  };

  const clearConversation = () => {
    setMessages([]);
    setAttachments([]);
    toast({ title: "Conversation cleared" });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-background text-foreground overflow-hidden rounded-2xl border border-border">
      {/* APP NAVBAR */}
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
              <p className="text-xs font-bold text-foreground">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guest'}
              </p>
              <p className="text-[10px] text-muted-foreground">Settings & Logs</p>
            </div>
            {user?.user_metadata?.avatar_url ? (
              <img 
                src={user.user_metadata.avatar_url} 
                className="w-8 h-8 rounded-full border border-border" 
                alt="user" 
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground border border-border">
                <User size={16} />
              </div>
            )}
          </Button>
        </div>
      </nav>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-border">
            <div className="p-6 bg-primary text-primary-foreground flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold">Personal Portal</h2>
                <p className="text-xs opacity-80">Synced with {user?.email || 'Local Account'}</p>
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
              {/* Usage Stats */}
              <div className="p-4 bg-muted rounded-xl">
                <p className="text-xs text-muted-foreground">Today's Requests</p>
                <p className="text-2xl font-bold text-foreground">{requestCount}</p>
              </div>

              {/* Saved Guides */}
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
                      <div 
                        key={g.id} 
                        className="flex items-center justify-between p-3 bg-muted rounded-xl border border-border group"
                      >
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

              {/* API Key Configuration */}
              <div className="pt-4 border-t border-border">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">
                  <Settings size={12} className="inline mr-1" />
                  Gemini API Key
                </label>
                <p className="text-xs text-muted-foreground mb-3">
                  Get your free API key from{' '}
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    Google AI Studio
                  </a>
                </p>
                <input 
                  type="password" 
                  value={userApiKey} 
                  onChange={(e) => setUserApiKey(e.target.value)} 
                  className="w-full p-3 bg-muted border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                  placeholder="Enter Gemini API Key" 
                />
                <div className="flex gap-2 mt-3">
                  <Button 
                    onClick={saveKey} 
                    className="flex-1"
                  >
                    {isKeySaved ? 'Update Key' : 'Save Key'}
                  </Button>
                  {isKeySaved && (
                    <Button 
                      variant="destructive"
                      onClick={clearApiKey}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {isKeySaved && (
                  <p className="text-xs text-green-600 mt-2 text-center">✓ API key saved</p>
                )}
              </div>

              {/* Sign Out */}
              <Button 
                variant="ghost"
                onClick={signOut}
                className="w-full text-destructive hover:bg-destructive/10"
              >
                <LogOut size={16} className="mr-2" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT DISPLAY */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-xs mx-auto animate-in fade-in slide-in-from-bottom-4">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mb-4">
              <BookOpen size={32} />
            </div>
            <h3 className="font-bold text-foreground">What are we studying today?</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Upload your lecture notes, record a voice memo, or just ask a question.
            </p>
            {!isKeySaved && (
              <Button 
                variant="outline"
                onClick={() => setShowSettings(true)}
                className="mt-4"
              >
                <Settings size={16} className="mr-2" /> Configure API Key to start
              </Button>
            )}
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
        <div className="max-w-4xl mx-auto">
          {attachments.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto py-1">
              {attachments.map((at, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-2 bg-muted border border-border px-3 py-1 rounded-full shrink-0"
                >
                  <span className="text-[10px] font-bold text-foreground truncate max-w-[100px]">
                    {at.name}
                  </span>
                  <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}>
                    <X size={12}/>
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-end gap-2 bg-muted rounded-[24px] p-2 pr-3 focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <label className="p-2 text-muted-foreground hover:text-primary cursor-pointer">
              <FileUp size={20} />
              <input 
                type="file" 
                className="hidden" 
                onChange={handleFileUpload}
                accept="image/*,.pdf"
              />
            </label>
            
            <button 
              onMouseDown={startRecording} 
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              className={`p-2 rounded-full ${
                isRecording 
                  ? 'text-destructive bg-destructive/10 animate-pulse' 
                  : 'text-muted-foreground hover:text-primary'
              }`}
            >
              {isRecording ? <Square size={20} /> : <Mic size={20} />}
            </button>
            
            <textarea 
              className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm py-2 max-h-32 resize-none text-foreground placeholder:text-muted-foreground"
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
            
            <button 
              onClick={handleAiAction}
              disabled={isLoading || (!input && attachments.length === 0) || !isKeySaved}
              className="p-2 bg-primary text-primary-foreground rounded-full disabled:opacity-30 shadow-md"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlowmateAI;
