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
import { perfMetrics, timestampLikeToMillis, registerHarnessApi, isHarnessEnabled } from '../utils/harness';
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

  // Emergency: Disable Firebase RTDB for multi-user scenarios to prevent emulator overload
  const isMultiUserMode = users.size > 1;
  const shouldDisableRTDB = isMultiUserMode && import.meta.env.DEV;
  
  if (shouldDisableRTDB) {
    console.warn('🚫 Multi-user mode detected - disabling Firebase RTDB to prevent emulator overload');
    console.warn('💡 For production testing, use Firebase production instance, not emulator');
    console.warn('🎭 Cursor updates will be local-only (no real-time sync)');
  }

  // Aggressive throttling for cursor updates - start conservative, adapt on failures
  const cursorThrottleIntervalRef = useRef(200); // Start at 5Hz (conservative)
  const consecutiveFailuresRef = useRef(0);
  const lastSuccessTimeRef = useRef(Date.now());
  const connectionHealthRef = useRef<'healthy' | 'degraded' | 'critical'>('healthy');
  
  const publishCursorRef = useRef(
    throttle((x: number, y: number) => {
      const uid = userIdRef.current;
      if (!uid) return;

      // Circuit breaker - stop cursor updates if connection is critical
      if (connectionHealthRef.current === 'critical') {
        console.log('🚫 Circuit breaker: Skipping cursor update (connection critical)');
        return;
      }

      // Emergency: Skip Firebase RTDB in multi-user dev mode
      if (shouldDisableRTDB) {
        console.log('🚫 Skipping Firebase RTDB update (multi-user dev mode)');
        perfMetrics.markEvent('cursorUpdateLocal');
        return;
      }

      const last = lastSentRef.current;
      const dx = last ? Math.abs(x - last.x) : Infinity;
      const dy = last ? Math.abs(y - last.y) : Infinity;
      if (dx < 2 && dy < 2) {
        return; // ignore tiny movements
      }

      lastSentRef.current = { x, y };

      updateCursor(uid, x, y)
        .then(() => {
          // Success - gradually reduce throttle interval
          consecutiveFailuresRef.current = 0;
          lastSuccessTimeRef.current = Date.now();
          
          // Update connection health
          if (connectionHealthRef.current !== 'healthy') {
            connectionHealthRef.current = 'healthy';
            console.log('🟢 Firebase RTDB connection restored');
          }
          
          // Gradually increase frequency on success (but stay conservative)
          cursorThrottleIntervalRef.current = Math.max(100, cursorThrottleIntervalRef.current * 0.9); // Min 10Hz
          perfMetrics.markEvent('cursorUpdateSuccess');
        })
        .catch((error) => {
          console.error('Failed to update cursor:', error);
          
          // Track timeout errors specifically
          if (error.message?.includes('timeout')) {
            perfMetrics.markEvent('cursorUpdateTimeout');
            console.warn('🚨 Cursor update timed out - Firebase RTDB overloaded');
          } else {
            perfMetrics.markEvent('cursorUpdateError');
          }
          
          // Update connection health
          consecutiveFailuresRef.current++;
          if (consecutiveFailuresRef.current >= 5) {
            connectionHealthRef.current = 'critical';
            console.error('🔴 Firebase RTDB connection critical - stopping cursor updates');
            
            // Schedule recovery attempt after 10 seconds
            setTimeout(() => {
              console.log('🔄 Attempting Firebase RTDB recovery...');
              connectionHealthRef.current = 'healthy';
              consecutiveFailuresRef.current = 0;
            }, 10000);
            
            return; // Stop trying to update cursor
          } else if (consecutiveFailuresRef.current >= 3) {
            connectionHealthRef.current = 'degraded';
            console.warn('🟡 Firebase RTDB connection degraded');
          }
          
          // Aggressive throttling on failures
          cursorThrottleIntervalRef.current = Math.min(200 * Math.pow(2, consecutiveFailuresRef.current), 2000); // Max 0.5Hz
          
          if (consecutiveFailuresRef.current > 2) {
            console.warn(`🚨 ${consecutiveFailuresRef.current} consecutive failures - throttling to ${cursorThrottleIntervalRef.current}ms (${1000/cursorThrottleIntervalRef.current}Hz)`);
          }
          
          offlineManager.queuePresenceUpdate('updateCursor', uid, { cursor: { x, y } });
          console.log('📝 Queued cursor update for offline sync');
        });
      perfMetrics.markEvent('cursorUpdateLocal');
    }, 50) // Fixed throttle interval for now
  );

  // Set up presence when user is authenticated
  useEffect(() => {
    if (!user || isPresenceSetRef.current) return;
    
    // Emergency: Skip Firebase RTDB setup in multi-user dev mode
    if (shouldDisableRTDB) {
      console.warn('🚫 Skipping Firebase RTDB presence setup (multi-user dev mode)');
      return;
    }

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
  }, [user, shouldDisableRTDB]);

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
  }, [user, setUsers, shouldDisableRTDB]);

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
    
    // Note: We don't track local cursor updates for latency - only remote ones
    // Local updates have ~0ms latency by definition
  }, []);

  // Get active users count (excluding current user)
  const activeUsersCount = users.size;

  // Get all users (including current user for display purposes)
  const allUsers = Array.from(users.values());

  // Register presence API for performance harness
  useEffect(() => {
    if (!isHarnessEnabled()) return;
    registerHarnessApi('presence', {
      updateCursor: updateCursorPosition,
    });
  }, [updateCursorPosition]);

  return {
    // State
    users: allUsers,
    activeUsersCount,
    
    // Actions
    updateCursorPosition,
  };
};
