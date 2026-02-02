import React, { useRef } from 'react';
import { Image as ImageIcon, FileUp, Link2, X, FileText, Mic, Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KnowledgeItem, KnowledgeItemType } from '@/hooks/useKnowledgeItems';
import VoiceRecorder from './VoiceRecorder';

interface AttachmentButtonsProps {
  onAddItem: (item: Omit<KnowledgeItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<KnowledgeItem | null>;
  onUploadFile: (file: File, type: KnowledgeItemType) => Promise<KnowledgeItem | null>;
  noteId?: string;
  disabled?: boolean;
}

const AttachmentButtons: React.FC<AttachmentButtonsProps> = ({
  onAddItem,
  onUploadFile,
  noteId,
  disabled
}) => {
  const [showUrlInput, setShowUrlInput] = React.useState(false);
  const [showRecorder, setShowRecorder] = React.useState(false);
  const [urlValue, setUrlValue] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    await onUploadFile(file, 'image');
    e.target.value = '';
  };

  const handlePdfSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      return;
    }

    await onUploadFile(file, 'pdf');
    e.target.value = '';
  };

  const handleUrlSubmit = async () => {
    if (!urlValue.trim()) return;

    setIsProcessing(true);
    try {
      // Validate URL
      const url = new URL(urlValue.trim().startsWith('http') ? urlValue.trim() : `https://${urlValue.trim()}`);
      
      await onAddItem({
        note_id: noteId || null,
        item_type: 'web_link',
        title: url.hostname,
        content: null,
        extracted_text: null,
        file_url: null,
        original_url: url.href,
        metadata: { hostname: url.hostname, pathname: url.pathname }
      });

      setUrlValue('');
      setShowUrlInput(false);
    } catch (error) {
      console.error('Invalid URL:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecordingComplete = async (blob: Blob, duration: number) => {
    // Create a file from the blob
    const file = new File([blob], `recording-${Date.now()}.webm`, { type: blob.type });
    await onUploadFile(file, 'audio');
    setShowRecorder(false);
  };

  return (
    <div className="space-y-3">
      {/* Main buttons */}
      <div className="flex flex-wrap gap-2">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleImageSelect}
          className="hidden"
        />
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          onChange={handlePdfSelect}
          className="hidden"
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => imageInputRef.current?.click()}
          disabled={disabled}
          className="flex items-center gap-2"
        >
          <ImageIcon size={14} />
          Add Image
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => pdfInputRef.current?.click()}
          disabled={disabled}
          className="flex items-center gap-2"
        >
          <FileText size={14} />
          Add PDF
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUrlInput(!showUrlInput)}
          disabled={disabled}
          className="flex items-center gap-2"
        >
          <Globe size={14} />
          Add Link
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRecorder(!showRecorder)}
          disabled={disabled}
          className="flex items-center gap-2"
        >
          <Mic size={14} />
          Voice Note
        </Button>
      </div>

      {/* URL Input */}
      {showUrlInput && (
        <div className="flex gap-2 items-center bg-secondary/30 p-2 rounded-lg">
          <Globe size={16} className="text-muted-foreground flex-shrink-0" />
          <Input
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder="Enter URL..."
            className="flex-1 h-8 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
          />
          <Button
            size="sm"
            onClick={handleUrlSubmit}
            disabled={!urlValue.trim() || isProcessing}
            className="h-8"
          >
            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setShowUrlInput(false); setUrlValue(''); }}
            className="h-8 w-8"
          >
            <X size={14} />
          </Button>
        </div>
      )}

      {/* Voice Recorder */}
      {showRecorder && (
        <div className="bg-secondary/30 p-3 rounded-lg">
          <VoiceRecorder
            onRecordingComplete={handleRecordingComplete}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
};

export default AttachmentButtons;
