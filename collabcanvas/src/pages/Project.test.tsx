/**
 * Unit tests for Project component - Four-View Navigation
 * Tests routing, navigation, and tab switching functionality
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { Project } from './Project';
import { useAuth } from '../hooks/useAuth';
import { useProjectStore } from '../store/projectStore';
import { getDoc } from 'firebase/firestore';

// Mock dependencies
vi.mock('../hooks/useAuth');
vi.mock('../store/projectStore');
vi.mock('firebase/firestore', () => ({
  getDoc: vi.fn(),
  doc: vi.fn(() => ({ id: 'project-1' })),
  collection: vi.fn(),
  firestore: {},
}));
vi.mock('../services/firebase', () => ({
  firestore: {},
}));
vi.mock('./Board', () => ({
  Board: () => <div data-testid="board">Board Component</div>,
}));

const mockUseAuth = vi.mocked(useAuth);
const mockUseProjectStore = vi.mocked(useProjectStore);
const mockGetDoc = vi.mocked(getDoc);

describe('Project Component - Four-View Navigation', () => {
  const mockUser = {
    uid: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    photoURL: null,
  };

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    description: 'Test description',
    status: 'estimating' as const,
    ownerId: 'user-123',
    collaborators: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: 'user-123',
    updatedBy: 'user-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    });

    const mockState = {
      projects: [mockProject],
      loading: false,
      error: null,
      currentProject: null,
      setProjects: vi.fn(),
      addProject: vi.fn(),
      updateProject: vi.fn(),
      removeProject: vi.fn(),
      setCurrentProject: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
      loadUserProjects: vi.fn().mockResolvedValue(undefined),
      createNewProject: vi.fn().mockResolvedValue(mockProject),
      updateProjectStatusAction: vi.fn().mockResolvedValue(undefined),
      deleteProjectAction: vi.fn().mockResolvedValue(undefined),
      shareProjectAction: vi.fn().mockResolvedValue(undefined),
      unsubscribe: null,
      setUnsubscribe: vi.fn(),
    };

    mockUseProjectStore.mockImplementation((selector?: (state: typeof mockState) => unknown) => {
      if (selector) {
        return selector(mockState);
      }
      return mockState;
    });

    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'project-1',
      data: () => ({
        name: 'Test Project',
        description: 'Test description',
        status: 'estimating',
        ownerId: 'user-123',
        collaborators: [],
        createdAt: { toMillis: () => Date.now() },
        updatedAt: { toMillis: () => Date.now() },
        createdBy: 'user-123',
        updatedBy: 'user-123',
      }),
    } as unknown as ReturnType<typeof getDoc>);
  });

  it('should display four navigation tabs: Scope, Time, Space, Money', async () => {
    render(
      <BrowserRouter>
        <MemoryRouter initialEntries={['/projects/project-1/scope']}>
          <Project />
        </MemoryRouter>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Scope')).toBeInTheDocument();
      expect(screen.getByText('Time')).toBeInTheDocument();
      expect(screen.getByText('Space')).toBeInTheDocument();
      expect(screen.getByText('Money')).toBeInTheDocument();
    });
  });

  it('should highlight active tab based on current route', async () => {
    render(
      <BrowserRouter>
        <MemoryRouter initialEntries={['/projects/project-1/scope']}>
          <Project />
        </MemoryRouter>
      </BrowserRouter>
    );

    await waitFor(() => {
      const scopeTab = screen.getByText('Scope').closest('a');
      expect(scopeTab).toHaveClass('border-b-2', 'border-blue-600', 'text-blue-600');
    });
  });

  it('should render Scope view when navigating to /scope route', async () => {
    render(
      <BrowserRouter>
        <MemoryRouter initialEntries={['/projects/project-1/scope']}>
          <Project />
        </MemoryRouter>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Scope View/i)).toBeInTheDocument();
    });
  });

  it('should render Time view when navigating to /time route', async () => {
    render(
      <BrowserRouter>
        <MemoryRouter initialEntries={['/projects/project-1/time']}>
          <Project />
        </MemoryRouter>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Time View/i)).toBeInTheDocument();
    });
  });

  it('should render Space view (Board) when navigating to /space route', async () => {
    render(
      <BrowserRouter>
        <MemoryRouter initialEntries={['/projects/project-1/space']}>
          <Project />
        </MemoryRouter>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('board')).toBeInTheDocument();
    });
  });

  it('should render Money view when navigating to /money route', async () => {
    render(
      <BrowserRouter>
        <MemoryRouter initialEntries={['/projects/project-1/money']}>
          <Project />
        </MemoryRouter>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Money View/i)).toBeInTheDocument();
    });
  });

  it('should support deep linking to specific views', async () => {
    // Test deep linking to scope view
    const { rerender } = render(
      <BrowserRouter>
        <MemoryRouter initialEntries={['/projects/project-1/scope']}>
          <Project />
        </MemoryRouter>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Scope View/i)).toBeInTheDocument();
    });

    // Test deep linking to money view
    rerender(
      <BrowserRouter>
        <MemoryRouter initialEntries={['/projects/project-1/money']}>
          <Project />
        </MemoryRouter>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Money View/i)).toBeInTheDocument();
    });
  });

  it('should redirect to space view when navigating to project root', async () => {
    render(
      <BrowserRouter>
        <MemoryRouter initialEntries={['/projects/project-1']}>
          <Project />
        </MemoryRouter>
      </BrowserRouter>
    );

    await waitFor(() => {
      // Should redirect to /space view
      expect(window.location.pathname).toContain('/space');
    });
  });
});



