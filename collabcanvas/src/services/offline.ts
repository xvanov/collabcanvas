/**
 * Offline handling service for CollabCanvas
 * Manages queued updates, resync, and connection state
 */

import { 
  enableFirestoreNetwork, 
  disableFirestoreNetwork, 
  enableRTDBNetwork, 
  disableRTDBNetwork 
} from './firebase';
import { 
  createShape as createShapeInFirestore, 
  updateShapePosition as updateShapePositionInFirestore,
  deleteShape as deleteShapeInFirestore
} from './firestore';
import { 
  acquireLock, 
  releaseLock, 
  setPresence, 
  updateCursor
} from './rtdb';
import type { ShapeType } from '../types';

/**
 * Queued update types
 */
export interface QueuedCreateShape {
  type: 'createShape';
  projectId: string;
  shapeId: string;
  shapeType: ShapeType;
  x: number;
  y: number;
  userId: string;
  layerId?: string;
  timestamp: number;
}

export interface QueuedUpdatePosition {
  type: 'updatePosition';
  projectId: string;
  shapeId: string;
  x: number;
  y: number;
  userId: string;
  timestamp: number;
}

export interface QueuedDeleteShape {
  type: 'deleteShape';
  projectId: string;
  shapeId: string;
  userId: string;
  timestamp: number;
}

export interface QueuedLockOperation {
  type: 'acquireLock' | 'releaseLock';
  shapeId: string;
  userId: string;
  userName?: string;
  timestamp: number;
}

export interface QueuedPresenceUpdate {
  type: 'setPresence' | 'updateCursor';
  userId: string;
  name?: string;
  color?: string;
  cursor?: { x: number; y: number };
  timestamp: number;
}

export type QueuedUpdate = 
  | QueuedCreateShape 
  | QueuedUpdatePosition 
  | QueuedDeleteShape
  | QueuedLockOperation 
  | QueuedPresenceUpdate;

/**
 * Connection state
 */
export interface ConnectionState {
  isOnline: boolean;
  isFirestoreOnline: boolean;
  isRTDBOnline: boolean;
  lastOnlineTime: number | null;
}

/**
 * Offline manager class
 */
class OfflineManager {
  private queuedUpdates: QueuedUpdate[] = [];
  private isProcessingQueue = false;
  private connectionState: ConnectionState = {
    isOnline: navigator.onLine,
    isFirestoreOnline: true,
    isRTDBOnline: true,
    lastOnlineTime: null,
  };
  private listeners: Set<(state: ConnectionState) => void> = new Set();
  private retryTimeout: number | null = null;
  // private maxRetries = 3; // Reserved for future use
  private retryDelay = 1000; // Start with 1 second

  constructor() {
    this.setupNetworkListeners();
  }

  /**
   * Set up network state listeners
   */
  private setupNetworkListeners() {
    // Browser online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 Browser came online');
      this.handleReconnection();
    });

    window.addEventListener('offline', () => {
      console.log('🌐 Browser went offline');
      this.updateConnectionState({ isOnline: false });
    });

    // Firestore connection state
    // Note: Firestore doesn't have direct connection state listeners
    // We'll infer state from successful/failed operations
  }

  /**
   * Handle reconnection when coming back online
   */
  private async handleReconnection() {
    console.log('🔄 Handling reconnection...');
    
    try {
      // Enable Firebase networks
      await enableFirestoreNetwork();
      await enableRTDBNetwork();
      
      this.updateConnectionState({ 
        isOnline: true, 
        isFirestoreOnline: true, 
        isRTDBOnline: true,
        lastOnlineTime: Date.now()
      });

      // Process queued updates
      await this.processQueuedUpdates();
      
      console.log('✅ Reconnection successful');
    } catch (error) {
      console.error('❌ Reconnection failed:', error);
      this.scheduleRetry();
    }
  }

  /**
   * Update connection state and notify listeners
   */
  private updateConnectionState(updates: Partial<ConnectionState>) {
    this.connectionState = { ...this.connectionState, ...updates };
    this.listeners.forEach(listener => listener(this.connectionState));
  }

  /**
   * Add listener for connection state changes
   */
  public addConnectionListener(listener: (state: ConnectionState) => void): () => void {
    this.listeners.add(listener);
    // Call immediately with current state
    listener(this.connectionState);
    
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Queue a shape creation for later sync
   */
  public queueCreateShape(projectId: string, shapeId: string, shapeType: ShapeType, x: number, y: number, userId: string, layerId?: string): void {
    const update: QueuedCreateShape = {
      type: 'createShape',
      projectId,
      shapeId,
      shapeType,
      x,
      y,
      userId,
      layerId,
      timestamp: Date.now(),
    };
    
    this.queuedUpdates.push(update);
    console.log(`📝 Queued shape creation: ${shapeId}`);
  }

  /**
   * Queue a position update for later sync
   */
  public queueUpdatePosition(projectId: string, shapeId: string, x: number, y: number, userId: string, clientTimestamp?: number): void {
    // Remove any existing position updates for this shape to avoid duplicates
    this.queuedUpdates = this.queuedUpdates.filter(
      update => !(update.type === 'updatePosition' && update.shapeId === shapeId && update.projectId === projectId)
    );

    const update: QueuedUpdatePosition = {
      type: 'updatePosition',
      projectId,
      shapeId,
      x,
      y,
      userId,
      timestamp: clientTimestamp ?? Date.now(),
    };
    
    this.queuedUpdates.push(update);
    console.log(`📝 Queued position update: ${shapeId}`);
  }

  /**
   * Queue a shape deletion for later sync
   */
  public queueDeleteShape(projectId: string, shapeId: string, userId: string): void {
    const update: QueuedDeleteShape = {
      type: 'deleteShape',
      projectId,
      shapeId,
      userId,
      timestamp: Date.now(),
    };
    
    this.queuedUpdates.push(update);
    console.log(`📝 Queued shape deletion: ${shapeId}`);
  }

  /**
   * Queue a lock operation for later sync
   */
  public queueLockOperation(
    type: 'acquireLock' | 'releaseLock',
    shapeId: string,
    userId: string,
    userName?: string
  ): void {
    const update: QueuedLockOperation = {
      type,
      shapeId,
      userId,
      userName,
      timestamp: Date.now(),
    };
    
    this.queuedUpdates.push(update);
    console.log(`📝 Queued lock operation: ${type} for ${shapeId}`);
  }

  /**
   * Queue a presence update for later sync
   */
  public queuePresenceUpdate(
    type: 'setPresence' | 'updateCursor',
    userId: string,
    data: {
      name?: string;
      color?: string;
      cursor?: { x: number; y: number };
    }
  ): void {
    const update: QueuedPresenceUpdate = {
      type,
      userId,
      ...data,
      timestamp: Date.now(),
    };
    
    this.queuedUpdates.push(update);
    console.log(`📝 Queued presence update: ${type} for ${userId}`);
  }

  /**
   * Process all queued updates
   */
  private async processQueuedUpdates(): Promise<void> {
    if (this.isProcessingQueue || this.queuedUpdates.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    console.log(`🔄 Processing ${this.queuedUpdates.length} queued updates...`);

    const updates = [...this.queuedUpdates];
    this.queuedUpdates = [];

    let successCount = 0;
    let failureCount = 0;

    for (const update of updates) {
      try {
        await this.processSingleUpdate(update);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to process update:`, update, error);
        failureCount++;
        
        // Re-queue failed updates for retry
        this.queuedUpdates.push(update);
      }
    }

    console.log(`✅ Processed ${successCount} updates successfully, ${failureCount} failed`);

    this.isProcessingQueue = false;

    // If there are still failed updates, schedule a retry
    if (this.queuedUpdates.length > 0) {
      this.scheduleRetry();
    }
  }

  /**
   * Process a single queued update
   */
  private async processSingleUpdate(update: QueuedUpdate): Promise<void> {
    switch (update.type) {
      case 'createShape':
        await createShapeInFirestore(update.projectId, update.shapeId, update.shapeType, update.x, update.y, update.userId, update.layerId);
        break;
        
      case 'updatePosition':
        await updateShapePositionInFirestore(update.projectId, update.shapeId, update.x, update.y, update.userId, update.timestamp);
        break;
        
      case 'deleteShape':
        await deleteShapeInFirestore(update.projectId, update.shapeId);
        break;
        
      case 'acquireLock':
        if (!update.userName) {
          throw new Error('userName required for acquireLock');
        }
        await acquireLock(update.shapeId, update.userId, update.userName);
        break;
        
      case 'releaseLock':
        await releaseLock(update.shapeId);
        break;
        
      case 'setPresence':
        if (!update.name || !update.color) {
          throw new Error('name and color required for setPresence');
        }
        await setPresence(update.userId, update.name, update.color);
        break;
        
      case 'updateCursor':
        if (!update.cursor) {
          throw new Error('cursor required for updateCursor');
        }
        await updateCursor(update.userId, update.cursor.x, update.cursor.y);
        break;
        
      default:
        throw new Error(`Unknown update type: ${(update as QueuedUpdate).type}`);
    }
  }

  /**
   * Schedule a retry for failed updates
   */
  private scheduleRetry(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    this.retryTimeout = window.setTimeout(() => {
      console.log('🔄 Retrying queued updates...');
      this.processQueuedUpdates();
    }, this.retryDelay);

    // Exponential backoff for retries
    this.retryDelay = Math.min(this.retryDelay * 2, 30000); // Max 30 seconds
  }

  /**
   * Clear all queued updates (useful for testing or manual cleanup)
   */
  public clearQueuedUpdates(): void {
    this.queuedUpdates = [];
    console.log('🧹 Cleared all queued updates');
  }

  /**
   * Get count of queued updates
   */
  public getQueuedUpdatesCount(): number {
    return this.queuedUpdates.length;
  }

  /**
   * Get queued updates (for debugging)
   */
  public getQueuedUpdates(): QueuedUpdate[] {
    return [...this.queuedUpdates];
  }

  /**
   * Simulate offline mode for testing
   */
  public async simulateOffline(): Promise<void> {
    console.log('🧪 Simulating offline mode...');
    await disableFirestoreNetwork();
    await disableRTDBNetwork();
    this.updateConnectionState({ 
      isOnline: false, 
      isFirestoreOnline: false, 
      isRTDBOnline: false 
    });
  }

  /**
   * Simulate online mode for testing
   */
  public async simulateOnline(): Promise<void> {
    console.log('🧪 Simulating online mode...');
    await this.handleReconnection();
  }
}

// Export singleton instance
export const offlineManager = new OfflineManager();
