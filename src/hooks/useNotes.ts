import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import * as offlineDb from '@/lib/offlineDb';

export interface Note {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  content: string | null;
  ai_generated_content: string | null;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (!user) {
      setNotes([]);
      setFolders([]);
      setLoading(false);
      return;
    }

    try {
      // Load from IndexedDB first
      const [offlineNotes, offlineFolders] = await Promise.all([
        offlineDb.getAll<Note>('notes', user.id),
        offlineDb.getAll<Folder>('folders', user.id)
      ]);

      if (offlineNotes.length > 0) setNotes(offlineNotes);
      if (offlineFolders.length > 0) setFolders(offlineFolders);

      // Sync with Supabase if online
      if (navigator.onLine) {
        const [notesRes, foldersRes] = await Promise.all([
          supabase.from('notes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
          supabase.from('folders').select('*').eq('user_id', user.id).order('name', { ascending: true })
        ]);

        if (notesRes.data) {
          for (const note of notesRes.data) {
            await offlineDb.put('notes', note);
          }
          setNotes(notesRes.data);
        }

        if (foldersRes.data) {
          for (const folder of foldersRes.data) {
            await offlineDb.put('folders', folder);
          }
          setFolders(foldersRes.data);
        }
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createFolder = async (name: string, parentId?: string): Promise<Folder | null> => {
    if (!user) return null;

    const folder: Folder = {
      id: crypto.randomUUID(),
      user_id: user.id,
      name,
      parent_id: parentId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setFolders(prev => [...prev, folder]);
    await offlineDb.put('folders', folder);

    if (navigator.onLine) {
      try {
        const { error } = await supabase.from('folders').insert(folder);
        if (error) throw error;
        toast({ title: "Folder created", description: name });
      } catch (error) {
        await offlineDb.addToSyncQueue('create', 'folders', folder.id, folder);
        toast({ title: "Saved offline", description: "Folder will sync when online" });
      }
    } else {
      await offlineDb.addToSyncQueue('create', 'folders', folder.id, folder);
    }

    return folder;
  };

  const createNote = async (title: string, folderId?: string): Promise<Note | null> => {
    if (!user) return null;

    const note: Note = {
      id: crypto.randomUUID(),
      user_id: user.id,
      folder_id: folderId || null,
      title,
      content: null,
      ai_generated_content: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setNotes(prev => [note, ...prev]);
    await offlineDb.put('notes', note);

    if (navigator.onLine) {
      try {
        const { error } = await supabase.from('notes').insert(note);
        if (error) throw error;
        toast({ title: "Note created", description: title });
      } catch (error) {
        await offlineDb.addToSyncQueue('create', 'notes', note.id, note);
        toast({ title: "Saved offline", description: "Note will sync when online" });
      }
    } else {
      await offlineDb.addToSyncQueue('create', 'notes', note.id, note);
    }

    return note;
  };

  const updateNote = async (noteId: string, updates: Partial<Note>): Promise<void> => {
    if (!user) return;

    const updatedNote = notes.find(n => n.id === noteId);
    if (!updatedNote) return;

    const newNote = { ...updatedNote, ...updates, updated_at: new Date().toISOString() };
    
    setNotes(prev => prev.map(n => n.id === noteId ? newNote : n));
    await offlineDb.put('notes', newNote);

    if (navigator.onLine) {
      try {
        const { error } = await supabase
          .from('notes')
          .update({
            title: newNote.title,
            content: newNote.content,
            ai_generated_content: newNote.ai_generated_content,
            folder_id: newNote.folder_id
          })
          .eq('id', noteId)
          .eq('user_id', user.id);

        if (error) throw error;
      } catch (error) {
        await offlineDb.addToSyncQueue('update', 'notes', noteId, newNote);
      }
    } else {
      await offlineDb.addToSyncQueue('update', 'notes', noteId, newNote);
    }
  };

  const deleteNote = async (noteId: string): Promise<void> => {
    if (!user) return;

    setNotes(prev => prev.filter(n => n.id !== noteId));
    await offlineDb.remove('notes', noteId);

    if (navigator.onLine) {
      try {
        await supabase.from('notes').delete().eq('id', noteId).eq('user_id', user.id);
        toast({ title: "Note deleted" });
      } catch (error) {
        await offlineDb.addToSyncQueue('delete', 'notes', noteId, {});
      }
    } else {
      await offlineDb.addToSyncQueue('delete', 'notes', noteId, {});
    }
  };

  const deleteFolder = async (folderId: string): Promise<void> => {
    if (!user) return;

    // Move notes to root
    const folderNotes = notes.filter(n => n.folder_id === folderId);
    for (const note of folderNotes) {
      await updateNote(note.id, { folder_id: null });
    }

    setFolders(prev => prev.filter(f => f.id !== folderId));
    await offlineDb.remove('folders', folderId);

    if (navigator.onLine) {
      try {
        await supabase.from('folders').delete().eq('id', folderId).eq('user_id', user.id);
        toast({ title: "Folder deleted" });
      } catch (error) {
        await offlineDb.addToSyncQueue('delete', 'folders', folderId, {});
      }
    } else {
      await offlineDb.addToSyncQueue('delete', 'folders', folderId, {});
    }
  };

  return {
    notes,
    folders,
    loading,
    createFolder,
    createNote,
    updateNote,
    deleteNote,
    deleteFolder,
    reload: loadData
  };
}
