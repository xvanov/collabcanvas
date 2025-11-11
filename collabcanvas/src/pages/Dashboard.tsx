/**
 * Dashboard Page Component
 * Home page displaying all user projects with project management features
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProjectStore } from '../store/projectStore';
import { ProjectCard } from '../components/project/ProjectCard';
import { subscribeToUserProjects } from '../services/projectService';
import type { ProjectStatus } from '../types/project';
import { formatErrorForDisplay, retryWithBackoff } from '../utils/errorHandler';

export function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const projects = useProjectStore((state) => state.projects);
  const loading = useProjectStore((state) => state.loading);
  const error = useProjectStore((state) => state.error);
  const setProjects = useProjectStore((state) => state.setProjects);
  const setUnsubscribe = useProjectStore((state) => state.setUnsubscribe);
  const createNewProject = useProjectStore((state) => state.createNewProject);
  const loadUserProjects = useProjectStore((state) => state.loadUserProjects);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [accessError, setAccessError] = useState<string | null>(null);

  // Show access denied message from navigation state
  useEffect(() => {
    // Check for error in location state (from navigation)
    const locationState = (window.history.state as { error?: string }) || {};
    if (locationState.error) {
      setAccessError(locationState.error);
    }
  }, []);

  // Load projects and set up real-time subscription
  useEffect(() => {
    if (!user) return;

    // Initial load with retry logic
    retryWithBackoff(() => loadUserProjects(user.uid)).catch((err) => {
      console.error('Failed to load projects:', err);
      // Error is already set in store by loadUserProjects
    });

    // Set up real-time subscription
    const unsubscribe = subscribeToUserProjects(user.uid, (updatedProjects) => {
      setProjects(updatedProjects);
    });

    setUnsubscribe(unsubscribe);

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
      setUnsubscribe(null);
    };
  }, [user, loadUserProjects, setProjects, setUnsubscribe]);

  // Filter projects based on search and status
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !projectName.trim()) return;

    try {
      await retryWithBackoff(() => 
        createNewProject(projectName.trim(), projectDescription.trim(), user.uid)
      );
      setProjectName('');
      setProjectDescription('');
      setShowCreateModal(false);
    } catch (err) {
      console.error('Failed to create project:', err);
      const errorInfo = formatErrorForDisplay(err);
      // Error is already set in store by createNewProject
      // Show user-friendly error message
      if (errorInfo.canRetry) {
        // Could show retry button here
      }
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">My Projects</h1>
            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-3">
                  {user.photoURL && (
                    <img
                      src={user.photoURL}
                      alt={user.name || 'User'}
                      className="h-8 w-8 rounded-full"
                    />
                  )}
                  <span className="text-sm text-gray-700">{user.name || user.email}</span>
                </div>
              )}
              <button
                onClick={async () => {
                  try {
                    await signOut();
                    navigate('/login');
                  } catch (error) {
                    console.error('Failed to sign out:', error);
                  }
                }}
                className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded hover:bg-gray-100 transition-colors"
              >
                Logout
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                New Project
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'all')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="estimating">Estimating</option>
              <option value="bid-ready">Bid Ready</option>
              <option value="bid-lost">Bid Lost</option>
              <option value="executing">Executing</option>
              <option value="completed-profitable">Completed Profitable</option>
              <option value="completed-unprofitable">Completed Unprofitable</option>
              <option value="completed-unknown">Completed - Unknown</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {(error || accessError) && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-red-800 mb-1">Error</h3>
                <p className="text-red-700">{error || accessError}</p>
              </div>
              <div className="flex gap-2">
                {error && (
                  <button
                    onClick={() => {
                      if (user) {
                        retryWithBackoff(() => loadUserProjects(user.uid)).catch(console.error);
                      }
                    }}
                    className="ml-4 px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                  >
                    Retry
                  </button>
                )}
                {accessError && (
                  <button
                    onClick={() => setAccessError(null)}
                    className="ml-4 px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && projects.length === 0 && (
          <div className="text-center py-12">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
            <p className="text-gray-600">Loading projects...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredProjects.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600 mb-4">
              {projects.length === 0
                ? "You don't have any projects yet. Create your first project to get started!"
                : 'No projects match your search criteria.'}
            </p>
            {projects.length === 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Create Project
              </button>
            )}
          </div>
        )}

        {/* Project Grid */}
        {!loading && filteredProjects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Create New Project</h2>
            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name *
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter project name"
                />
              </div>
              <div className="mb-6">
                <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="project-description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter project description (optional)"
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setProjectName('');
                    setProjectDescription('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !projectName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

