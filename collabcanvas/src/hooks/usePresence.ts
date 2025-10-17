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
import { perfMetrics, timestampLikeToMillis } from '../utils/harness';
import { throttle } from '../utils/throttle';
import type { Presence } from '../types';

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
  const userIdRef = useRef<string | null>(null);
  const lastSentRef = useRef<{ x: number; y: number } | null>(null);
  const otherUsersUpdateRef = useRef(
    throttle((users: Presence[]) => {
      setUsers(users);
    }, 100) // Throttle other users' updates to 10Hz
  );

  useEffect(() => {
    userIdRef.current = user?.uid ?? null;
  }, [user]);

  // Throttled cursor publisher with delta filtering (>= 2px) at ~20Hz (50ms)
  const publishCursorRef = useRef(
    throttle((x: number, y: number) => {
      const uid = userIdRef.current;
      if (!uid) return;

      const last = lastSentRef.current;
      const dx = last ? Math.abs(x - last.x) : Infinity;
      const dy = last ? Math.abs(y - last.y) : Infinity;
      if (dx < 2 && dy < 2) {
        return; // ignore tiny movements
      }

      lastSentRef.current = { x, y };

      updateCursor(uid, x, y).catch((error) => {
        console.error('Failed to update cursor:', error);
        offlineManager.queuePresenceUpdate('updateCursor', uid, { cursor: { x, y } });
        console.log('📝 Queued cursor update for offline sync');
      });
      perfMetrics.markEvent('cursorUpdateLocal');
    }, 50)
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
      const otherUsers = Object.values(presenceMap).filter((presence) => presence.userId !== user.uid);

      const normalizedUsers = otherUsers.map((presence) => {
        const lastSeenSource = presence.lastSeen as number | { toMillis?: () => number; seconds?: number; nanoseconds?: number };
        const lastSeenMillis = timestampLikeToMillis(lastSeenSource) ?? Date.now();
        perfMetrics.trackCursorUpdate(presence.userId, lastSeenSource);
        return {
          ...presence,
          lastSeen: lastSeenMillis,
        };
      });

      // Update store with other users' presence (throttled for performance)
      otherUsersUpdateRef.current(normalizedUsers);
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
    publishCursorRef.current(x, y);
  }, []);

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
