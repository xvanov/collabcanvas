/**
 * Unit tests for Scope Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadScope, getScope, updateScope, subscribeToScope } from '../services/scopeService';
import { doc, setDoc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { firestore } from '../services/firebase';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(() => ({})),
}));

vi.mock('../services/firebase', () => ({
  firestore: {},
}));

const mockDoc = vi.mocked(doc);
const mockSetDoc = vi.mocked(setDoc);
const mockGetDoc = vi.mocked(getDoc);
const mockUpdateDoc = vi.mocked(updateDoc);
const mockOnSnapshot = vi.mocked(onSnapshot);

describe('Scope Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadScope', () => {
    it('should upload scope items to Firestore', async () => {
      const projectId = 'project-1';
      const items = [
        { scope: 'demo', description: 'Demolition work' },
        { scope: 'roof', description: 'Roof replacement' },
      ];
      const userId = 'user-123';

      const mockRef = { id: 'data' };
      mockDoc.mockReturnValue(mockRef as any);
      mockSetDoc.mockResolvedValue(undefined);

      await uploadScope(projectId, items, userId);

      expect(mockDoc).toHaveBeenCalledWith(firestore, 'projects', projectId, 'scope', 'data');
      expect(mockSetDoc).toHaveBeenCalledWith(
        mockRef,
        expect.objectContaining({
          items,
          uploadedBy: userId,
        }),
        { merge: true }
      );
    });

    it('should handle upload errors', async () => {
      const projectId = 'project-1';
      const items = [{ scope: 'demo', description: 'Demolition work' }];
      const userId = 'user-123';

      const mockRef = { id: 'data' };
      mockDoc.mockReturnValue(mockRef as any);
      mockSetDoc.mockRejectedValue(new Error('Upload failed'));

      await expect(uploadScope(projectId, items, userId)).rejects.toThrow('Upload failed');
    });
  });

  describe('getScope', () => {
    it('should get scope from Firestore', async () => {
      const projectId = 'project-1';
      const mockData = {
        items: [
          { scope: 'demo', description: 'Demolition work' },
        ],
        uploadedAt: { toMillis: () => Date.now() },
        uploadedBy: 'user-123',
      };

      const mockRef = { id: 'data' };
      mockDoc.mockReturnValue(mockRef as any);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockData,
      } as any);

      const result = await getScope(projectId);

      expect(mockDoc).toHaveBeenCalledWith(firestore, 'projects', projectId, 'scope', 'data');
      expect(result).toBeTruthy();
      expect(result?.items).toEqual(mockData.items);
    });

    it('should return null if scope does not exist', async () => {
      const projectId = 'project-1';

      const mockRef = { id: 'data' };
      mockDoc.mockReturnValue(mockRef as any);
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as any);

      const result = await getScope(projectId);

      expect(result).toBeNull();
    });

    it('should handle get errors', async () => {
      const projectId = 'project-1';

      const mockRef = { id: 'data' };
      mockDoc.mockReturnValue(mockRef as any);
      mockGetDoc.mockRejectedValue(new Error('Get failed'));

      await expect(getScope(projectId)).rejects.toThrow('Get failed');
    });
  });

  describe('updateScope', () => {
    it('should update scope items in Firestore', async () => {
      const projectId = 'project-1';
      const items = [
        { scope: 'demo', description: 'Updated demolition work' },
      ];
      const userId = 'user-123';

      const mockRef = { id: 'data' };
      mockDoc.mockReturnValue(mockRef as any);
      mockUpdateDoc.mockResolvedValue(undefined);

      await updateScope(projectId, items, userId);

      expect(mockDoc).toHaveBeenCalledWith(firestore, 'projects', projectId, 'scope', 'data');
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        mockRef,
        expect.objectContaining({
          items,
          updatedBy: userId,
        })
      );
    });

    it('should handle update errors', async () => {
      const projectId = 'project-1';
      const items = [{ scope: 'demo', description: 'Demolition work' }];
      const userId = 'user-123';

      const mockRef = { id: 'data' };
      mockDoc.mockReturnValue(mockRef as any);
      mockUpdateDoc.mockRejectedValue(new Error('Update failed'));

      await expect(updateScope(projectId, items, userId)).rejects.toThrow('Update failed');
    });
  });

  describe('subscribeToScope', () => {
    it('should subscribe to scope changes', () => {
      const projectId = 'project-1';
      const callback = vi.fn();

      const mockRef = { id: 'data' };
      mockDoc.mockReturnValue(mockRef as any);
      mockOnSnapshot.mockReturnValue(() => {});

      const unsubscribe = subscribeToScope(projectId, callback);

      expect(mockDoc).toHaveBeenCalledWith(firestore, 'projects', projectId, 'scope', 'data');
      expect(mockOnSnapshot).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should call callback when scope exists', () => {
      const projectId = 'project-1';
      const callback = vi.fn();
      const mockData = {
        items: [{ scope: 'demo', description: 'Demolition work' }],
        uploadedAt: { toMillis: () => Date.now() },
        uploadedBy: 'user-123',
      };

      const mockRef = { id: 'data' };
      mockDoc.mockReturnValue(mockRef as any);
      
      let snapshotCallback: ((snapshot: any) => void) | null = null;
      mockOnSnapshot.mockImplementation((ref, onNext, onError) => {
        snapshotCallback = onNext;
        return () => {};
      });

      subscribeToScope(projectId, callback);

      // Simulate snapshot with data
      if (snapshotCallback) {
        snapshotCallback({
          exists: () => true,
          data: () => mockData,
        });
      }

      expect(callback).toHaveBeenCalled();
    });

    it('should call callback with null when scope does not exist', () => {
      const projectId = 'project-1';
      const callback = vi.fn();

      const mockRef = { id: 'data' };
      mockDoc.mockReturnValue(mockRef as any);
      
      let snapshotCallback: ((snapshot: any) => void) | null = null;
      mockOnSnapshot.mockImplementation((ref, onNext, onError) => {
        snapshotCallback = onNext;
        return () => {};
      });

      subscribeToScope(projectId, callback);

      // Simulate snapshot without data
      if (snapshotCallback) {
        snapshotCallback({
          exists: () => false,
        });
      }

      expect(callback).toHaveBeenCalledWith(null);
    });
  });
});



