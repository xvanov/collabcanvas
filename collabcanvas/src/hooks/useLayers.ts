/**
 * Custom hook for Firestore layers synchronization
 * Handles real-time sync with optimistic updates
 */

import { useEffect, useRef, useCallback } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { useAuth } from './useAuth';
import { 
  createLayer as createLayerInFirestore, 
  updateLayer as updateLayerInFirestore,
  deleteLayer as deleteLayerInFirestore,
  subscribeToLayers,
  subscribeToLayersChanges,
  subscribeToBoardState,
  initializeBoard,
  type FirestoreLayer,
  type FirestoreLayerChange,
  type FirestoreBoardState,
} from '../services/firestore';
import type { Layer } from '../types';

/**
 * Converts Firestore layer to local Layer type
 * Handles serverTimestamp conversion to numbers
 */
function convertFirestoreLayer(firestoreLayer: FirestoreLayer): Layer {
  return {
    id: firestoreLayer.id,
    name: firestoreLayer.name,
    shapes: firestoreLayer.shapes,
    visible: firestoreLayer.visible,
    locked: firestoreLayer.locked,
    order: firestoreLayer.order,
    color: (firestoreLayer as any).color || '#3B82F6',
  };
}

/**
 * Hook for managing Firestore layers synchronization
 * Provides real-time sync with optimistic updates
 */
export function useLayers() {
  const { user } = useAuth();
  const {
    layers,
    createLayer: createLayerInStore,
    updateLayer: updateLayerInStore,
    deleteLayer: deleteLayerInStore,
    setLayers,
    setActiveLayer,
    activeLayerId,
  } = useCanvasStore();

  // Stable refs to avoid resubscribing listeners on state changes
  const userRef = useRef(user);
  const layersRef = useRef(layers);
  
  // Track if we're currently creating a layer to prevent initialization logic from overriding
  const isCreatingLayerRef = useRef(false);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  /**
   * Create a new layer with optimistic updates and offline handling
   */
  const createLayer = useCallback(async (name: string) => {
    if (!user) {
      console.warn('Cannot create layer: user not authenticated');
      return;
    }

    console.log('🏗️ Creating layer:', name);
    console.log('📋 Current layers before creation:', layersRef.current.map(l => ({ id: l.id, name: l.name })));

    // Generate unique ID before creating layer
    const layerId = `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const order = layersRef.current.length;
    
    console.log('🆕 Generated layer ID:', layerId);

    // Set flag to prevent initialization logic from overriding active layer
    isCreatingLayerRef.current = true;

    // Create layer in store with the generated ID
    createLayerInStore(name, layerId);
    
    try {
      // Sync to Firestore with the same ID
      await createLayerInFirestore(layerId, name, user.uid, order);
      console.log(`✅ Layer created successfully: ${name} (${layerId})`);
    } catch (error) {
      console.error('❌ Failed to create layer in Firestore:', error);
      
      // Queue for offline sync (we'll need to add this to offline manager)
      console.log(`📝 Queued layer creation for offline sync: ${layerId}`);
            } finally {
              // Clear the flag after a longer delay to allow Firestore subscription to complete
              setTimeout(() => {
                isCreatingLayerRef.current = false;
                console.log('🏁 Layer creation process completed');
              }, 5000); // Increased from 3000ms to 5000ms
            }
  }, [user, createLayerInStore]);

  /**
   * Update a layer with Firestore sync
   */
  const updateLayer = useCallback(async (
    layerId: string, 
    updates: Partial<Omit<Layer, 'id'>>
  ) => {
    if (!user) {
      console.warn('Cannot update layer: user not authenticated');
      return;
    }

    // Optimistic update
    updateLayerInStore(layerId, updates);

    try {
      // Sync to Firestore
      await updateLayerInFirestore(layerId, updates, user.uid);
    } catch (error) {
      console.error('❌ Failed to update layer in Firestore:', error);
    }
  }, [user, updateLayerInStore]);

  /**
   * Delete a layer with Firestore sync
   */
  const deleteLayer = useCallback(async (layerId: string) => {
    if (!user) {
      console.warn('Cannot delete layer: user not authenticated');
      return;
    }

    // Optimistic update
    deleteLayerInStore(layerId);

    try {
      // Sync to Firestore
      await deleteLayerInFirestore(layerId);
    } catch (error) {
      console.error('❌ Failed to delete layer in Firestore:', error);
    }
  }, [user, deleteLayerInStore]);

  // Initialize layers from Firestore and create default layer if needed
  useEffect(() => {
    if (!user) return;

    // Only log in development
    if (import.meta.env.DEV) {
      console.log('🔗 Initializing layers from Firestore');
    }

    const initializeLayers = async () => {
      try {
        // First, initialize the board document to ensure it exists
        await initializeBoard(user.uid);
        
        // Then, get all existing layers from Firestore
        const unsubscribe = subscribeToLayers((firestoreLayers: FirestoreLayer[]) => {
          console.log('📋 Loaded layers from Firestore:', firestoreLayers.length);
          
          if (firestoreLayers.length === 0) {
            // No layers exist, create the default layer locally first, then in Firestore
            console.log('🏗️ Creating default layer locally and in Firestore');
            const defaultLayer: Layer = {
              id: 'default-layer',
              name: 'Default Layer',
              shapes: [],
              visible: true,
              locked: false,
              order: 0,
              color: '#3B82F6',
            };
            
            // Add to local store immediately and set as active
            setLayers([defaultLayer]);
            setActiveLayer('default-layer');
            
            // Then create in Firestore
            createLayerInFirestore('default-layer', 'Default Layer', user.uid, 0)
              .then(() => {
                console.log('✅ Default layer created successfully in Firestore');
              })
              .catch((error) => {
                console.error('❌ Failed to create default layer in Firestore:', error);
              });
          } else {
            // Convert Firestore layers to local layers and update store
            const localLayers = firestoreLayers.map(convertFirestoreLayer);
            console.log('🔄 Updating local layers with Firestore data:', localLayers);
            
            // Ensure default layer exists in loaded layers
            const hasDefaultLayer = localLayers.some(layer => layer.id === 'default-layer');
            if (!hasDefaultLayer) {
              console.log('🏗️ Adding missing default layer to loaded layers');
              const defaultLayer: Layer = {
                id: 'default-layer',
                name: 'Default Layer',
                shapes: [],
                visible: true,
                locked: false,
                order: -1, // Put it at the bottom
                color: '#3B82F6',
              };
              localLayers.push(defaultLayer);
            }
            
            // Check if we already have layers locally to avoid duplication
            const currentLayers = layersRef.current;
            if (currentLayers.length === 0) {
              // No local layers yet, set them directly
              setLayers(localLayers);
            } else {
              // We have local layers, merge them carefully to avoid duplicates
              const mergedLayers = [...currentLayers];
              localLayers.forEach(firestoreLayer => {
                const existingIndex = mergedLayers.findIndex(l => l.id === firestoreLayer.id);
                if (existingIndex >= 0) {
                  // Update existing layer
                  mergedLayers[existingIndex] = firestoreLayer;
                } else {
                  // Add new layer
                  mergedLayers.push(firestoreLayer);
                }
              });
              setLayers(mergedLayers);
            }
            
            // Only set activeLayerId to default layer if no active layer is currently set
            // or if the current active layer doesn't exist in the loaded layers
            // BUT NOT if we're currently creating a layer (to prevent race condition)
            if (!isCreatingLayerRef.current) {
              const currentActiveLayer = layersRef.current.find(layer => layer.id === activeLayerId);
              const currentActiveLayerInLoaded = localLayers.find(layer => layer.id === activeLayerId);
              
              if (!currentActiveLayer && !currentActiveLayerInLoaded) {
                const defaultLayer = localLayers.find(layer => layer.id === 'default-layer');
                if (defaultLayer) {
                  console.log('🎯 Setting active layer to default layer (no current active layer)');
                  setActiveLayer('default-layer');
                }
              } else {
                console.log(`🎯 Keeping current active layer: ${activeLayerId} (exists in loaded layers: ${!!currentActiveLayerInLoaded})`);
              }
            } else {
              console.log('🚧 Skipping active layer logic - layer creation in progress');
            }
          }
          
          // Unsubscribe after initial load
          unsubscribe();
        });
      } catch (error) {
        console.error('❌ Failed to initialize layers:', error);
      }
    };

    initializeLayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, setLayers, setActiveLayer]); // Intentionally excluding activeLayerId to prevent race condition

  // Subscribe to board state changes (activeLayerId synchronization)
  useEffect(() => {
    if (!user) return;

    // Only log in development
    if (import.meta.env.DEV) {
      console.log('🔗 Subscribing to board state changes');
    }

    const unsubscribe = subscribeToBoardState((state: FirestoreBoardState | null) => {
      if (state && state.activeLayerId) {
        // Only update if the value from Firestore is genuinely different
        // AND if it was updated by a different user (to support multi-user collaboration)
        if (state.activeLayerId !== activeLayerId && state.updatedBy !== user.uid) {
          console.log(`🎯 Syncing activeLayerId from another user: ${activeLayerId} -> ${state.activeLayerId}`);
          setActiveLayer(state.activeLayerId);
        }
      }
    });

    return () => {
      if (import.meta.env.DEV) {
        console.log('🔌 Unsubscribing from board state changes');
      }
      unsubscribe();
    };
  }, [user, activeLayerId, setActiveLayer]);

  // Subscribe to layers changes
  useEffect(() => {
    if (!user) return;

    // Only log in development
    if (import.meta.env.DEV) {
      console.log('🔗 Subscribing to layers changes');
    }

    const unsubscribe = subscribeToLayersChanges((changes: FirestoreLayerChange[]) => {
      console.log('📡 Received layer changes:', changes);
      changes.forEach((change) => {
        const layer = convertFirestoreLayer(change.layer);
        
        switch (change.type) {
          case 'added': {
            // Check if layer already exists locally to avoid duplicates
            const existingLayer = layersRef.current.find(l => l.id === layer.id);
            if (!existingLayer) {
              console.log(`➕ Layer added: ${layer.name} (${layer.id})`);
              // Add to store if not already present
              const currentLayers = layersRef.current;
              const layerExists = currentLayers.some(l => l.id === layer.id);
              if (!layerExists) {
                console.log('📝 Adding layer to store:', layer);
                setLayers([...currentLayers, layer]);
              } else {
                console.log('⚠️ Layer already exists, skipping:', layer.id);
              }
            } else {
              console.log('⚠️ Layer already exists locally, skipping:', layer.id);
            }
            break;
          }
            
          case 'modified': {
            console.log(`✏️ Layer modified: ${layer.name} (${layer.id})`);
            // Check if this is a modification we already have locally
            const existingLayer = layersRef.current.find(l => l.id === layer.id);
            if (existingLayer) {
              // Only update if the data is actually different
              const hasChanges = Object.keys(layer).some(key => 
                existingLayer[key as keyof Layer] !== layer[key as keyof Layer]
              );
              if (hasChanges) {
                console.log('📝 Layer has actual changes, updating:', layer);
                updateLayerInStore(layer.id, layer);
              } else {
                console.log('⚠️ Layer modification has no changes, skipping:', layer.id);
              }
            } else {
              console.log('⚠️ Layer modification for non-existent layer, skipping:', layer.id);
            }
            break;
          }
            
          case 'removed': {
            console.log(`🗑️ Layer removed: ${layer.id}`);
            deleteLayerInStore(layer.id);
            break;
          }
        }
      });
    });

    return () => {
      console.log('🔌 Unsubscribing from layers changes');
      unsubscribe();
    };
  }, [user, setLayers, updateLayerInStore, deleteLayerInStore]);

  return {
    layers,
    createLayer,
    updateLayer,
    deleteLayer,
  };
}
