import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { useCanvasStore } from '../store/canvasStore';
import { 
  setPresence, 
  updateCursor, 
  removePresence, 
  subscribeToPresence,
  type PresenceData 
} from '../services/rtdb';
import { offlineManager } from '../services/offline';
import { getUserColor } from '../utils/colors';

/**
 * Hook for managing user presence and cursor synchronization via RTDB
 * Handles:
 * - Setting user presence on mount
 * - Updating cursor position (throttled to 60Hz)
 * - Subscribing to other users' presence
 * - Auto-cleanup on unmount
 */
export const usePresence = () => {
  const { user } = useAuth();
  const { users, setUsers } = useCanvasStore();
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isPresenceSetRef = useRef(false);

  // Throttled cursor update function with offline handling
  const throttledUpdateCursor = useCallback(
    (x: number, y: number) => {
      if (!user) return;
      
      updateCursor(user.uid, x, y).catch((error) => {
        console.error('Failed to update cursor:', error);
        
        // Queue for offline sync
        offlineManager.queuePresenceUpdate('updateCursor', user.uid, {
          cursor: { x, y },
        });
        console.log('📝 Queued cursor update for offline sync');
      });
    },
    [user]
  );

  // Set up presence when user is authenticated
  useEffect(() => {
    if (!user || isPresenceSetRef.current) return;

    const setupPresence = async () => {
      try {
        const userColor = getUserColor(user.uid);
        await setPresence(user.uid, user.name, userColor);
        isPresenceSetRef.current = true;
        console.log('Presence set for user:', user.name);
      } catch (error) {
        console.error('Failed to set presence:', error);
        
        // Queue for offline sync
        const userColor = getUserColor(user.uid);
        offlineManager.queuePresenceUpdate('setPresence', user.uid, {
          name: user.name,
          color: userColor,
        });
        console.log('📝 Queued presence setup for offline sync');
      }
    };

    setupPresence();
  }, [user]);

  // Subscribe to presence changes
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToPresence((presenceMap: Record<string, PresenceData>) => {
      // Convert presence map to array and filter out current user
      const otherUsers = Object.values(presenceMap)
        .filter((presence) => presence.userId !== user.uid)
        .map((presence) => ({
          ...presence,
          lastSeen: typeof presence.lastSeen === 'number' ? presence.lastSeen : Date.now(),
        }));

      // Update store with other users' presence
      setUsers(otherUsers);
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user, setUsers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (user && isPresenceSetRef.current) {
        removePresence(user.uid).catch(console.error);
        isPresenceSetRef.current = false;
      }
      
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user]);

  // Update cursor position (throttled)
  const updateCursorPosition = useCallback((x: number, y: number) => {
    throttledUpdateCursor(x, y);
  }, [throttledUpdateCursor]);

  // Get active users count (excluding current user)
  const activeUsersCount = users.size;

  // Get all users (including current user for display purposes)
  const allUsers = Array.from(users.values());

  return {
    // State
    users: allUsers,
    activeUsersCount,
    
    // Actions
    updateCursorPosition,
  };
};
