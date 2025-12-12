/**
 * Dashboard Page Component
 * Home page displaying all user projects with project management features
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useProjectStore } from '../store/projectStore';
import { ProjectCard } from '../components/project/ProjectCard';
import { ProjectListItem } from '../components/project/ProjectListItem';
import { subscribeToUserProjects } from '../services/projectService';
import type { ProjectStatus } from '../types/project';
import { retryWithBackoff } from '../utils/errorHandler';
import { AuthenticatedLayout } from '../components/layouts/AuthenticatedLayout';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DashboardFilters } from '../components/dashboard/DashboardFilters';
import { EmptyState } from '../components/dashboard/EmptyState';

export function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const projects = useProjectStore((state) => state.projects);
  const loading = useProjectStore((state) => state.loading);
  const error = useProjectStore((state) => state.error);
  const setProjects = useProjectStore((state) => state.setProjects);
  const setUnsubscribe = useProjectStore((state) => state.setUnsubscribe);
  const loadUserProjects = useProjectStore((state) => state.loadUserProjects);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'value'>('newest');
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
  const filteredProjects = projects
    .filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      // Placeholder for "value" sorting
      return 0;
  });

  if (authLoading) {
    return (
      <AuthenticatedLayout>
        <div className="flex min-h-screen items-center justify-center pt-14">
        <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-truecost-cyan border-t-transparent"></div>
            <p className="text-truecost-text-secondary">Loading...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <AuthenticatedLayout>
      <div className="container-spacious max-w-app pt-24 pb-16 md:pt-28">
        <DashboardHeader viewMode={viewMode} onViewModeChange={setViewMode} />

        <DashboardFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        {/* Access Error */}
        {accessError && (
          <div className="glass-panel bg-truecost-danger/10 border-truecost-danger/30 p-4 mb-6">
            <p className="font-body text-body text-truecost-danger">{accessError}</p>
          </div>
        )}

        {/* Error */}
                {error && (
          <div className="glass-panel bg-truecost-danger/10 border-truecost-danger/30 p-4 mb-6">
            <p className="font-body text-body text-truecost-danger">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-truecost-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredProjects.length === 0 && <EmptyState />}

        {/* Projects */}
        {!loading && filteredProjects.length > 0 && (
          <div
            className={
              viewMode === 'cards'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-3'
            }
          >
            {viewMode === 'cards' ? (
              filteredProjects.map((project) => <ProjectCard key={project.id} project={project} />)
            ) : (
              <>
                <div className="hidden md:grid glass-panel p-4 grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 font-heading text-body-meta text-truecost-text-secondary">
                  <div>Name</div>
                  <div>Status</div>
                  <div>Updated</div>
                  <div>Estimate</div>
                  <div className="text-right">Actions</div>
                </div>
            {filteredProjects.map((project) => (
                  <ProjectListItem key={project.id} project={project} />
            ))}
              </>
            )}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}

