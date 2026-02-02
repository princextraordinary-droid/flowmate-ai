import { supabase } from '@/integrations/supabase/client';
import * as offlineDb from './offlineDb';

let syncInProgress = false;

type TableName = 'tasks' | 'daily_syncs' | 'notes' | 'folders' | 'knowledge_items';

export const processSyncQueue = async (): Promise<void> => {
  if (syncInProgress || !navigator.onLine) return;
  
  syncInProgress = true;

  try {
    const pendingOps = await offlineDb.getPendingSyncOps();
    
    for (const op of pendingOps) {
      try {
        switch (op.operation) {
          case 'create':
            await handleCreate(op.table_name as TableName, op.data);
            break;
          case 'update':
            await handleUpdate(op.table_name as TableName, op.record_id, op.data);
            break;
          case 'delete':
            await handleDelete(op.table_name as TableName, op.record_id);
            break;
        }
        
        await offlineDb.markSynced(op.id);
      } catch (error) {
        console.error(`Sync failed for operation ${op.id}:`, error);
        // Don't mark as synced, will retry on next sync
      }
    }

    // Clean up old synced items
    await offlineDb.clearOldSyncedItems();
  } finally {
    syncInProgress = false;
  }
};

const handleCreate = async (tableName: TableName, data: any): Promise<void> => {
  const { error } = await supabase.from(tableName).insert(data);
  if (error) {
    // Check if it's a duplicate - might already be synced
    if (error.code === '23505') {
      // Duplicate key, already exists
      return;
    }
    throw error;
  }
};

const handleUpdate = async (tableName: TableName, recordId: string, data: any): Promise<void> => {
  const { user_id, id, created_at, ...updateData } = data;
  const { error } = await supabase
    .from(tableName)
    .update(updateData)
    .eq('id', recordId);
  
  if (error) throw error;
};

const handleDelete = async (tableName: TableName, recordId: string): Promise<void> => {
  const { error } = await supabase.from(tableName).delete().eq('id', recordId);
  if (error && error.code !== 'PGRST116') {
    // PGRST116 = row not found, which is fine for delete
    throw error;
  }
};

// Set up online/offline listeners
export const initSyncManager = (): (() => void) => {
  const handleOnline = () => {
    console.log('Back online, processing sync queue...');
    processSyncQueue();
  };

  window.addEventListener('online', handleOnline);

  // Initial sync if online
  if (navigator.onLine) {
    processSyncQueue();
  }

  return () => {
    window.removeEventListener('online', handleOnline);
  };
};
