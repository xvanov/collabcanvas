/**
 * Scope service for Firebase Firestore operations
 * Handles CRUD operations for scope documents
 */

import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { firestore } from './firebase';
import { createLayer } from './firestore';
import type { Scope, ScopeItem, ScopeDocument } from '../types/scope';

/**
 * Convert Firestore document to Scope
 */
function firestoreDocToScope(data: ScopeDocument): Scope {
  let uploadedAt: number;
  const uploadedAtValue = data.uploadedAt;
  
  if (uploadedAtValue && typeof uploadedAtValue === 'object' && 'toMillis' in uploadedAtValue) {
    // Firestore Timestamp
    uploadedAt = (uploadedAtValue as { toMillis: () => number }).toMillis();
  } else if (typeof uploadedAtValue === 'number') {
    uploadedAt = uploadedAtValue;
  } else {
    uploadedAt = Date.now();
  }
  
  return {
    items: data.items || [],
    uploadedAt,
    uploadedBy: data.uploadedBy || '',
  };
}

/**
 * Upload scope items to Firestore and create layers for each scope item
 */
export async function uploadScope(
  projectId: string,
  items: ScopeItem[],
  userId: string
): Promise<void> {
  try {
    const scopeRef = doc(firestore, 'projects', projectId, 'scope', 'data');
    
    const scopeData = {
      items,
      uploadedAt: serverTimestamp(),
      uploadedBy: userId,
    };
    
    await setDoc(scopeRef, scopeData, { merge: true });
    
    // Create layers for each scope item
    // Generate layer IDs from scope names (sanitized)
    const createLayersPromises = items.map(async (item, index) => {
      // Create a sanitized layer ID from scope name
      const layerId = `scope-${item.scope.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')}`;
      const layerName = item.scope;
      
      try {
        await createLayer(layerId, layerName, userId, index);
        console.log(`[SCOPE] Created layer: ${layerName} (${layerId})`);
      } catch (error) {
        // Layer might already exist, which is fine
        console.log(`[SCOPE] Layer ${layerName} may already exist, skipping creation`);
      }
    });
    
    // Create all layers in parallel
    await Promise.allSettled(createLayersPromises);
    console.log(`[SCOPE] Created ${items.length} layers for scope items`);
  } catch (error) {
    console.error('Error uploading scope:', error);
    throw error;
  }
}

/**
 * Get scope from Firestore
 */
export async function getScope(projectId: string): Promise<Scope | null> {
  try {
    const scopeRef = doc(firestore, 'projects', projectId, 'scope', 'data');
    const scopeDoc = await getDoc(scopeRef);
    
    if (!scopeDoc.exists()) {
      return null;
    }
    
    const data = scopeDoc.data() as ScopeDocument;
    return firestoreDocToScope(data);
  } catch (error) {
    console.error('Error getting scope:', error);
    throw error;
  }
}

/**
 * Update scope items in Firestore
 */
export async function updateScope(
  projectId: string,
  items: ScopeItem[],
  userId: string
): Promise<void> {
  try {
    const scopeRef = doc(firestore, 'projects', projectId, 'scope', 'data');
    
    const updateData = {
      items,
      uploadedAt: serverTimestamp(),
      updatedBy: userId,
    };
    
    await updateDoc(scopeRef, updateData);
  } catch (error) {
    console.error('Error updating scope:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time scope updates
 */
export function subscribeToScope(
  projectId: string,
  callback: (scope: Scope | null) => void
): Unsubscribe {
  const scopeRef = doc(firestore, 'projects', projectId, 'scope', 'data');
  
  const unsubscribe = onSnapshot(
    scopeRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as ScopeDocument;
        callback(firestoreDocToScope(data));
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Error in scope subscription:', error);
      callback(null);
    }
  );
  
  return unsubscribe;
}

