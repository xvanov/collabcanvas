/**
 * Project Card Component
 * Displays a single project with status indicator and actions
 */

import { useNavigate } from 'react-router-dom';
import type { Project } from '../../types/project';
import { useProjectStore } from '../../store/projectStore';
import { useAuth } from '../../hooks/useAuth';
import { ShareProjectModal } from './ShareProjectModal';
import { useState } from 'react';
import { formatErrorForDisplay } from '../../utils/errorHandler';
import { canEditProject, canDeleteProject, canShareProject } from '../../utils/projectAccess';

interface ProjectCardProps {
  project: Project;
}

const statusColors: Record<Project['status'], string> = {
  'estimating': 'bg-yellow-100 text-yellow-800',
  'bid-ready': 'bg-blue-100 text-blue-800',
  'bid-lost': 'bg-red-100 text-red-800',
  'executing': 'bg-green-100 text-green-800',
  'completed-profitable': 'bg-emerald-100 text-emerald-800',
  'completed-unprofitable': 'bg-orange-100 text-orange-800',
  'completed-unknown': 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<Project['status'], string> = {
  'estimating': 'Estimating',
  'bid-ready': 'Bid Ready',
  'bid-lost': 'Bid Lost',
  'executing': 'Executing',
  'completed-profitable': 'Completed',
  'completed-unprofitable': 'Completed',
  'completed-unknown': 'Completed',
};

// User-selectable statuses (excludes auto-determined completed variants)
const selectableStatuses: Array<{ value: string; label: string }> = [
  { value: 'estimating', label: 'Estimating' },
  { value: 'bid-ready', label: 'Bid Ready' },
  { value: 'bid-lost', label: 'Bid Lost' },
  { value: 'executing', label: 'Executing' },
  { value: 'completed', label: 'Completed' },
];

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const updateProjectStatusAction = useProjectStore((state) => state.updateProjectStatusAction);
  const deleteProjectAction = useProjectStore((state) => state.deleteProjectAction);
  const loading = useProjectStore((state) => state.loading);
  const [showShareModal, setShowShareModal] = useState(false);

  // Check user permissions
  const canEdit = user ? canEditProject(project, user.uid) : false;
  const canDelete = user ? canDeleteProject(project, user.uid) : false;
  const canShare = user ? canShareProject(project, user.uid) : false;

  const handleProjectClick = () => {
    navigate(`/projects/${project.id}/space`);
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    if (!user || !canEdit) {
      alert('You do not have permission to modify this project.');
      return;
    }
    const newStatus = e.target.value as Project['status'];
    
    // If user selects "completed", the backend will automatically determine the specific variant
    // based on actual costs vs estimates (profitable/unprofitable/unknown)
    try {
      await updateProjectStatusAction(project.id, newStatus, user.uid);
    } catch (error) {
      console.error('Failed to update project status:', error);
      const errorInfo = formatErrorForDisplay(error);
      alert(`${errorInfo.title}: ${errorInfo.message}`);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !canDelete) {
      alert('You do not have permission to delete this project.');
      return;
    }
    if (!confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteProjectAction(project.id, user.uid);
    } catch (error) {
      console.error('Failed to delete project:', error);
      const errorInfo = formatErrorForDisplay(error);
      alert(`${errorInfo.title}: ${errorInfo.message}`);
    }
  };

  return (
    <div
      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
      onClick={handleProjectClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{project.name}</h3>
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{project.description || 'No description'}</p>
        </div>
        <div className="ml-4 flex gap-2">
          {canShare && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowShareModal(true);
              }}
              disabled={loading}
              className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
              title="Share project"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={loading}
              className="text-red-600 hover:text-red-800 disabled:opacity-50"
              title="Delete project"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        {/* Combined status badge + dropdown */}
        <div className="relative inline-block">
          <select
            value={project.status.startsWith('completed') ? 'completed' : project.status}
            onChange={handleStatusChange}
            onClick={(e) => e.stopPropagation()}
            disabled={loading || !canEdit}
            className={`appearance-none px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer disabled:cursor-not-allowed ${statusColors[project.status]} ${
              !canEdit ? 'opacity-60' : 'hover:opacity-80'
            }`}
            style={{
              paddingRight: canEdit ? '1.75rem' : '0.75rem',
            }}
            title={!canEdit ? 'You do not have permission to modify this project' : 'Change project status'}
          >
            {selectableStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          {canEdit && (
            <svg
              className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 pointer-events-none"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>

        {/* Profit/Loss indicator with detailed status badge */}
        <div className="flex items-center gap-2">
          {project.status.startsWith('completed') && (
            <span className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-700">
              {project.status === 'completed-profitable' && '✓ Profitable'}
              {project.status === 'completed-unprofitable' && '⚠ Unprofitable'}
              {project.status === 'completed-unknown' && '? Unknown'}
            </span>
          )}
          {project.profitLoss !== undefined && (
            <span className={`text-sm font-medium ${project.profitLoss >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
              {project.profitLoss >= 0 ? '+' : ''}${project.profitLoss.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        Updated {new Date(project.updatedAt).toLocaleDateString()}
      </div>

      {showShareModal && (
        <ShareProjectModal
          project={project}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

