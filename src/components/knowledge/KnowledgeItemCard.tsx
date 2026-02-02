import React from 'react';
import { FileText, Image as ImageIcon, Globe, Mic, X, ExternalLink, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KnowledgeItem } from '@/hooks/useKnowledgeItems';

interface KnowledgeItemCardProps {
  item: KnowledgeItem;
  onDelete: (id: string) => void;
  onSelect?: (item: KnowledgeItem) => void;
  isSelected?: boolean;
}

const KnowledgeItemCard: React.FC<KnowledgeItemCardProps> = ({
  item,
  onDelete,
  onSelect,
  isSelected
}) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const getIcon = () => {
    switch (item.item_type) {
      case 'pdf':
        return <FileText size={16} className="text-red-500" />;
      case 'image':
        return <ImageIcon size={16} className="text-blue-500" />;
      case 'web_link':
        return <Globe size={16} className="text-green-500" />;
      case 'audio':
        return <Mic size={16} className="text-purple-500" />;
      default:
        return <FileText size={16} className="text-muted-foreground" />;
    }
  };

  const handlePlayAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleClick = () => {
    if (onSelect) {
      onSelect(item);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        group relative flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer
        ${isSelected 
          ? 'bg-primary/10 border-primary shadow-sm' 
          : 'bg-card border-border/50 hover:border-primary/30 hover:shadow-sm'
        }
      `}
    >
      {/* Icon */}
      <div className={`
        flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
        ${isSelected ? 'bg-primary/20' : 'bg-secondary'}
      `}>
        {getIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {item.title || item.item_type}
        </p>
        {item.original_url && (
          <p className="text-xs text-muted-foreground truncate">
            {new URL(item.original_url).hostname}
          </p>
        )}
        {item.metadata?.duration && (
          <p className="text-xs text-muted-foreground">
            Duration: {Math.floor(item.metadata.duration / 60)}:{(item.metadata.duration % 60).toString().padStart(2, '0')}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {item.item_type === 'audio' && item.file_url && (
          <>
            <audio
              ref={audioRef}
              src={item.file_url}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePlayAudio}
              className="h-7 w-7"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </Button>
          </>
        )}
        
        {item.original_url && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              window.open(item.original_url!, '_blank');
            }}
            className="h-7 w-7"
          >
            <ExternalLink size={14} />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
        >
          <X size={14} />
        </Button>
      </div>

      {/* Image preview */}
      {item.item_type === 'image' && item.file_url && (
        <img
          src={item.file_url}
          alt={item.title || 'Image'}
          className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-10"
        />
      )}
    </div>
  );
};

export default KnowledgeItemCard;
