import {
  ref,
  set,
  update,
  onValue,
  onDisconnect,
  remove,
  serverTimestamp,
} from 'firebase/database';
import type { Unsubscribe, DataSnapshot } from 'firebase/database';
import { rtdb } from './firebase';

/**
 * Presence data structure for RTDB
 */
export interface PresenceData {
  userId: string;
  name: string;
  color: string;
  cursor: {
    x: number;
    y: number;
  };
  lastSeen: object | number; // serverTimestamp or timestamp
  isActive: boolean;
  currentView?: 'scope' | 'time' | 'space' | 'money';
}

/**
 * Lock data structure for RTDB
 */
export interface LockData {
  userId: string;
  userName: string;
  lockedAt: object | number; // serverTimestamp or timestamp
}

/**
 * Set user presence in RTDB
 * Automatically cleans up on disconnect
 */
export const setPresence = async (
  userId: string,
  name: string,
  color: string
): Promise<void> => {
  const presenceRef = ref(rtdb, `presence/${userId}`);
  
  const presenceData: PresenceData = {
    userId,
    name,
    color,
    cursor: { x: 0, y: 0 },
    lastSeen: serverTimestamp(),
    isActive: true,
  };

  await set(presenceRef, presenceData);
  
  // Auto-cleanup on disconnect
  onDisconnect(presenceRef).remove();
};

/**
 * Update user's current view
 */
export const updateCurrentView = async (
  userId: string,
  currentView: 'scope' | 'time' | 'space' | 'money'
): Promise<void> => {
  const presenceRef = ref(rtdb, `presence/${userId}`);
  
  await update(presenceRef, {
    currentView,
    'lastSeen': serverTimestamp(),
  });
};

/**
 * Update user cursor position (optimized single write with timeout)
 */
export const updateCursor = async (
  userId: string,
  x: number,
  y: number
): Promise<void> => {
  const presenceRef = ref(rtdb, `presence/${userId}`);
  
  // Add timeout protection to prevent hangs - reduced to 2 seconds for faster failure
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Cursor update timeout after 2 seconds')), 2000);
  });
  
  const updatePromise = update(presenceRef, {
    'cursor/x': x,
    'cursor/y': y,
    'lastSeen': serverTimestamp(),
  });
  
  // Race between update and timeout
  await Promise.race([updatePromise, timeoutPromise]);
};

/**
 * Remove user presence
 */
export const removePresence = async (userId: string): Promise<void> => {
  const presenceRef = ref(rtdb, `presence/${userId}`);
  await remove(presenceRef);
};

/**
 * Subscribe to all presence data
 */
export const subscribeToPresence = (
  callback: (presenceMap: Record<string, PresenceData>) => void
): Unsubscribe => {
  const presenceRef = ref(rtdb, 'presence');
  
  return onValue(presenceRef, (snapshot: DataSnapshot) => {
    const data = snapshot.val() || {};
    callback(data);
  });
};

/**
 * Acquire lock on a shape
 * Returns true if lock was acquired, false if already locked
 */
export const acquireLock = async (
  shapeId: string,
  userId: string,
  userName: string
): Promise<boolean> => {
  const lockRef = ref(rtdb, `locks/${shapeId}`);
  
  const lockData: LockData = {
    userId,
    userName,
    lockedAt: serverTimestamp(),
  };

  try {
    // Use set() to overwrite any existing lock
    // This allows the same user to re-acquire their own lock
    await set(lockRef, lockData);
    
    // Auto-cleanup on disconnect
    onDisconnect(lockRef).remove();
    
    return true;
  } catch (error) {
    console.error('Failed to acquire lock:', error);
    return false;
  }
};

/**
 * Release lock on a shape
 */
export const releaseLock = async (shapeId: string): Promise<void> => {
  const lockRef = ref(rtdb, `locks/${shapeId}`);
  await remove(lockRef);
};

/**
 * Subscribe to all locks
 */
export const subscribeToLocks = (
  callback: (locksMap: Record<string, LockData>) => void
): Unsubscribe => {
  const locksRef = ref(rtdb, 'locks');
  
  return onValue(locksRef, (snapshot: DataSnapshot) => {
    const data = snapshot.val() || {};
    callback(data);
  });
};

/**
 * Subscribe to a specific lock
 */
export const subscribeToLock = (
  shapeId: string,
  callback: (lock: LockData | null) => void
): Unsubscribe => {
  const lockRef = ref(rtdb, `locks/${shapeId}`);
  
  return onValue(lockRef, (snapshot: DataSnapshot) => {
    const data = snapshot.val();
    callback(data);
  });
};

