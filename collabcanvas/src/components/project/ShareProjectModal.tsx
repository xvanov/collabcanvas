/**
 * Share Project Modal Component
 * Allows project owners to share projects with other users
 */

import { useState } from 'react';
import type { Project, CollaboratorRole } from '../../types/project';
import { useProjectStore } from '../../store/projectStore';
import { useAuth } from '../../hooks/useAuth';
import { lookupUserByEmail } from '../../services/userService';

interface ShareProjectModalProps {
  project: Project;
  onClose: () => void;
}

export function ShareProjectModal({ project, onClose }: ShareProjectModalProps) {
  const { user } = useAuth();
  const shareProjectAction = useProjectStore((state) => state.shareProjectAction);
  const loading = useProjectStore((state) => state.loading);
  
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CollaboratorRole>('viewer');
  const [error, setError] = useState<string | null>(null);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !email.trim()) return;

    setError(null);

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    // Check if trying to share with self
    if (email.trim().toLowerCase() === user.email?.toLowerCase()) {
      setError('You cannot share a project with yourself');
      return;
    }

    try {
      // Lookup user by email
      const userId = await lookupUserByEmail(email.trim());
      
      if (!userId) {
        setError('User not found. Please verify the email address.');
        return;
      }
      
      await shareProjectAction(project.id, userId, role, user.uid);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share project';
      setError(errorMessage);
    }
  };

  const isOwner = user?.uid === project.ownerId;

  if (!isOwner) {
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={(e) => {
          e.stopPropagation();
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div 
          className="bg-white rounded-lg p-6 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-2xl font-bold mb-4">Share Project</h2>
          <p className="text-gray-600 mb-4">Only project owners can share projects.</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-lg p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4">Share Project</h2>
        <p className="text-gray-600 mb-4">Invite collaborators to view or edit this project.</p>

        <form onSubmit={handleShare}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="user@example.com"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              Role *
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as CollaboratorRole)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="viewer">Viewer - Can view but cannot modify</option>
              <option value="editor">Editor - Can view and modify</option>
            </select>
            <p className="mt-2 text-sm text-gray-500">
              {role === 'viewer'
                ? 'Viewers can see the project but cannot make changes.'
                : 'Editors can view and modify the project.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sharing...' : 'Share Project'}
            </button>
          </div>
        </form>

        {project.collaborators.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Current Collaborators</h3>
            <div className="space-y-2">
              {project.collaborators.map((collab) => (
                <div key={collab.userId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{collab.userId}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    collab.role === 'editor' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {collab.role === 'editor' ? 'Editor' : 'Viewer'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

