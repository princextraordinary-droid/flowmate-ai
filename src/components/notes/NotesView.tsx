import React, { useState } from 'react';
import { 
  FolderPlus, 
  FilePlus, 
  Folder, 
  FileText, 
  ChevronRight, 
  Loader2,
  Trash2,
  Save,
  Wand2
} from 'lucide-react';
import { useNotes, Note, Folder as FolderType } from '@/hooks/useNotes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const NotesView: React.FC = () => {
  const { notes, folders, loading, createFolder, createNote, updateNote, deleteNote, deleteFolder } = useNotes();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showNewNoteDialog, setShowNewNoteDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [showAiContent, setShowAiContent] = useState(false);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim());
    setNewFolderName('');
    setShowNewFolderDialog(false);
  };

  const handleCreateNote = async () => {
    if (!newNoteTitle.trim()) return;
    const note = await createNote(newNoteTitle.trim(), selectedFolderId || undefined);
    if (note) {
      setSelectedNote(note);
      setNoteContent('');
    }
    setNewNoteTitle('');
    setShowNewNoteDialog(false);
  };

  const handleSaveNote = async () => {
    if (!selectedNote) return;
    await updateNote(selectedNote.id, { content: noteContent });
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setNoteContent(note.content || '');
    setShowAiContent(false);
  };

  const filteredNotes = selectedFolderId
    ? notes.filter(n => n.folder_id === selectedFolderId)
    : notes.filter(n => !n.folder_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="pb-28 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Notes</h2>
          <p className="text-xs text-muted-foreground font-medium tracking-tight">
            Organize your thoughts
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <FolderPlus size={14} />
                <span className="hidden sm:inline">Folder</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Folder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Input
                  placeholder="Folder name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
                <Button onClick={handleCreateFolder} className="w-full">
                  Create Folder
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showNewNoteDialog} onOpenChange={setShowNewNoteDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <FilePlus size={14} />
                <span className="hidden sm:inline">Note</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Note</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Input
                  placeholder="Note title..."
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateNote()}
                />
                <Button onClick={handleCreateNote} className="w-full">
                  Create Note
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sidebar - Folders & Notes list */}
        <div className="space-y-3">
          {/* All Notes */}
          <button
            onClick={() => { setSelectedFolderId(null); setSelectedNote(null); }}
            className={`w-full flex items-center gap-2 p-3 rounded-lg transition ${
              !selectedFolderId && !selectedNote
                ? 'bg-primary/10 text-primary'
                : 'bg-card hover:bg-secondary/50'
            }`}
          >
            <FileText size={16} />
            <span className="text-sm font-medium">All Notes</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {notes.filter(n => !n.folder_id).length}
            </span>
          </button>

          {/* Folders */}
          {folders.map(folder => (
            <div key={folder.id} className="group">
              <button
                onClick={() => { setSelectedFolderId(folder.id); setSelectedNote(null); }}
                className={`w-full flex items-center gap-2 p-3 rounded-lg transition ${
                  selectedFolderId === folder.id
                    ? 'bg-primary/10 text-primary'
                    : 'bg-card hover:bg-secondary/50'
                }`}
              >
                <Folder size={16} />
                <span className="text-sm font-medium truncate">{folder.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {notes.filter(n => n.folder_id === folder.id).length}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition"
                >
                  <Trash2 size={12} />
                </button>
              </button>
            </div>
          ))}

          {/* Notes in selected folder */}
          <div className="border-t pt-3 space-y-1">
            {filteredNotes.map(note => (
              <button
                key={note.id}
                onClick={() => handleSelectNote(note)}
                className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition group ${
                  selectedNote?.id === note.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-secondary/50'
                }`}
              >
                <ChevronRight size={14} className={`transition ${selectedNote?.id === note.id ? 'rotate-90' : ''}`} />
                <span className="text-sm truncate flex-1">{note.title}</span>
                {note.ai_generated_content && (
                  <Wand2 size={12} className="text-purple-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main content - Note editor */}
        <div className="md:col-span-2">
          {selectedNote ? (
            <div className="bg-card rounded-xl border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">{selectedNote.title}</h3>
                <div className="flex gap-2">
                  {selectedNote.ai_generated_content && (
                    <Button
                      variant={showAiContent ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowAiContent(!showAiContent)}
                      className="gap-1"
                    >
                      <Wand2 size={14} />
                      AI Output
                    </Button>
                  )}
                  <Button size="sm" onClick={handleSaveNote} className="gap-1">
                    <Save size={14} />
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { deleteNote(selectedNote.id); setSelectedNote(null); }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              {showAiContent && selectedNote.ai_generated_content ? (
                <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-900">
                  <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-2">
                    AI Generated Content
                  </p>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {selectedNote.ai_generated_content}
                  </div>
                </div>
              ) : (
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Start writing..."
                  className="w-full h-64 bg-secondary/30 rounded-lg p-4 resize-none outline-none focus:ring-2 focus:ring-primary/20"
                />
              )}
            </div>
          ) : (
            <div className="bg-card rounded-xl border p-8 flex flex-col items-center justify-center text-center h-64">
              <FileText size={48} className="text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Select a note or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotesView;
