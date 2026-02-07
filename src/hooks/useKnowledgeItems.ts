import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import * as offlineDb from '@/lib/offlineDb';

export type KnowledgeItemType = 'text' | 'pdf' | 'image' | 'audio' | 'web_link';

export interface KnowledgeItem {
  id: string;
  user_id: string;
  note_id: string | null;
  item_type: KnowledgeItemType;
  title: string | null;
  content: string | null;
  extracted_text: string | null;
  file_url: string | null;
  original_url: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useKnowledgeItems(noteId?: string) {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadItems = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      // Load from IndexedDB first
      const offlineItems = await offlineDb.getAll<KnowledgeItem>('knowledgeItems', user.id);
      const filtered = noteId 
        ? offlineItems.filter(i => i.note_id === noteId)
        : offlineItems;
      
      if (filtered.length > 0) setItems(filtered);

      // Sync with Supabase if online
      if (navigator.onLine) {
        let query = supabase.from('knowledge_items').select('*').eq('user_id', user.id);
        if (noteId) {
          query = query.eq('note_id', noteId);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data) {
          for (const item of data) {
            await offlineDb.put('knowledgeItems', item);
          }
          setItems(data as KnowledgeItem[]);
        }
      }
    } catch (error) {
      console.error('Error loading knowledge items:', error);
    } finally {
      setLoading(false);
    }
  }, [user, noteId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const addItem = async (item: Omit<KnowledgeItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<KnowledgeItem | null> => {
    if (!user) return null;

    const newItem: KnowledgeItem = {
      ...item,
      id: crypto.randomUUID(),
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setItems(prev => [newItem, ...prev]);
    await offlineDb.put('knowledgeItems', newItem);

    if (navigator.onLine) {
      try {
        const { error } = await supabase.from('knowledge_items').insert(newItem);
        if (error) throw error;
        toast({ title: "Item added", description: item.title || item.item_type });
      } catch (error) {
        await offlineDb.addToSyncQueue('create', 'knowledge_items', newItem.id, newItem);
        toast({ title: "Saved offline", description: "Will sync when online" });
      }
    } else {
      await offlineDb.addToSyncQueue('create', 'knowledge_items', newItem.id, newItem);
    }

    return newItem;
  };

  const uploadFile = async (
    file: File,
    itemType: KnowledgeItemType,
    noteId?: string
  ): Promise<KnowledgeItem | null> => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

    // Create item first with local blob URL for offline support
    const localUrl = URL.createObjectURL(file);
    const item = await addItem({
      note_id: noteId || null,
      item_type: itemType,
      title: file.name,
      content: null,
      extracted_text: null,
      file_url: localUrl,
      original_url: null,
      metadata: { fileName: file.name, fileSize: file.size, mimeType: file.type }
    });

    if (!item) return null;

    // Upload to Supabase Storage if online
    if (navigator.onLine) {
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('knowledge-files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Use signed URL instead of public URL for security
        // Signed URLs expire after 1 hour and require authentication
        const { data: urlData, error: signedUrlError } = await supabase.storage
          .from('knowledge-files')
          .createSignedUrl(fileName, 3600); // 1 hour expiry

        if (signedUrlError) throw signedUrlError;

        // Store the file path, not the signed URL (we'll generate fresh signed URLs on demand)
        const updatedItem = { 
          ...item, 
          file_url: fileName, // Store the path, not the URL
          metadata: { 
            ...item.metadata, 
            storagePath: fileName,
            signedUrl: urlData?.signedUrl // Temporary URL for immediate use
          }
        };
        setItems(prev => prev.map(i => i.id === item.id ? updatedItem : i));
        await offlineDb.put('knowledgeItems', updatedItem);

        await supabase
          .from('knowledge_items')
          .update({ 
            file_url: fileName,
            metadata: updatedItem.metadata
          })
          .eq('id', item.id);

      } catch (error) {
        console.error('Error uploading file:', error);
        // Keep local blob URL for offline use
      }
    }

    return item;
  };

  const deleteItem = async (itemId: string): Promise<void> => {
    if (!user) return;

    setItems(prev => prev.filter(i => i.id !== itemId));
    await offlineDb.remove('knowledgeItems', itemId);

    if (navigator.onLine) {
      try {
        await supabase.from('knowledge_items').delete().eq('id', itemId).eq('user_id', user.id);
      } catch (error) {
        await offlineDb.addToSyncQueue('delete', 'knowledge_items', itemId, {});
      }
    } else {
      await offlineDb.addToSyncQueue('delete', 'knowledge_items', itemId, {});
    }
  };

  // Generate a fresh signed URL for a file (for secure viewing)
  const getSignedUrl = async (storagePath: string): Promise<string | null> => {
    if (!user || !storagePath) return null;
    
    // If it's a blob URL (offline), return as-is
    if (storagePath.startsWith('blob:')) return storagePath;
    
    try {
      const { data, error } = await supabase.storage
        .from('knowledge-files')
        .createSignedUrl(storagePath, 3600); // 1 hour expiry
      
      if (error) throw error;
      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      return null;
    }
  };

  return {
    items,
    loading,
    addItem,
    uploadFile,
    deleteItem,
    getSignedUrl,
    reload: loadItems
  };
}
