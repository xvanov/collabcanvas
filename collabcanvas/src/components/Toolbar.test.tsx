import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Toolbar } from './Toolbar';
import { useCanvasStore } from '../store/canvasStore';
import { usePresence } from '../hooks/usePresence';
import { useOffline } from '../hooks/useOffline';

// Mock the hooks
vi.mock('../store/canvasStore');
vi.mock('../hooks/usePresence');
vi.mock('../hooks/useOffline');
vi.mock('../hooks/useShapes', () => ({
  useShapes: () => ({
    deleteShapes: vi.fn(),
    createShape: vi.fn(),
    updateShape: vi.fn(),
  }),
}));
vi.mock('./UnifiedAIChat', () => ({
  UnifiedAIChat: () => null, // Mock UnifiedAIChat to avoid Router dependency
}));

const mockUseCanvasStore = vi.mocked(useCanvasStore);
const mockUsePresence = vi.mocked(usePresence);
const mockUseOffline = vi.mocked(useOffline);

describe('Toolbar', () => {
  const mockCreateShape = vi.fn();
  const mockCurrentUser = {
    uid: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    photoURL: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockState = {
      createShape: mockCreateShape,
      currentUser: mockCurrentUser,
      selectedShapeIds: [],
      shapes: new Map(),
      undo: vi.fn(),
      redo: vi.fn(),
      canUndo: vi.fn(() => false),
      canRedo: vi.fn(() => false),
      deleteSelectedShapes: vi.fn(),
      duplicateSelectedShapes: vi.fn(),
      clearSelection: vi.fn(),
      selectShapes: vi.fn(),
      activeLayerId: 'default-layer',
      gridState: {
        isVisible: false,
        isSnapEnabled: false,
        size: 20,
        color: '#E5E7EB',
        opacity: 0.5,
      },
      toggleGrid: vi.fn(),
      canvasScale: {
        backgroundImage: null,
        scaleLine: null,
        isScaleMode: false,
        isImageUploadMode: false,
      },
    };
    
    mockUseCanvasStore.mockImplementation((selector?: (state: unknown) => unknown) => {
      if (selector) {
        return selector(mockState);
      }
      // If no selector provided, return the mock state directly
      return mockState;
    });
    
    // Add getState method to the mock
    (mockUseCanvasStore as unknown as { getState: () => typeof mockState }).getState = vi.fn(() => mockState);
    
    mockUsePresence.mockReturnValue({
      activeUsersCount: 1,
      activeUsers: [],
    });
    
    mockUseOffline.mockReturnValue({
      connectionStatus: 'connected',
      connectionStatusColor: 'text-green-600',
      hasQueuedUpdates: false,
      queuedUpdatesCount: 0,
    });
  });

  it('should render Create Rectangle button', () => {
    render(
      <MemoryRouter>
        <Toolbar fps={60} zoom={1} />
      </MemoryRouter>
    );
    
    // Click the Shapes dropdown to open it
    const shapesDropdown = screen.getByRole('button', { name: /components/i });
    fireEvent.click(shapesDropdown);
    
    const button = screen.getByRole('button', { name: /rectangle/i });
    expect(button).toBeInTheDocument();
  });

  it('should render Create Circle button', () => {
    render(
      <MemoryRouter>
        <Toolbar fps={60} zoom={1} />
      </MemoryRouter>
    );
    
    // Click the Shapes dropdown to open it
    const shapesDropdown = screen.getByRole('button', { name: /components/i });
    fireEvent.click(shapesDropdown);
    
    const button = screen.getByRole('button', { name: /circle/i });
    expect(button).toBeInTheDocument();
  });

  it('should render Create Text button', () => {
    render(
      <MemoryRouter>
        <Toolbar fps={60} zoom={1} />
      </MemoryRouter>
    );
    
    // Click the Shapes dropdown to open it
    const shapesDropdown = screen.getByRole('button', { name: /components/i });
    fireEvent.click(shapesDropdown);
    
    const button = screen.getByRole('button', { name: /text/i });
    expect(button).toBeInTheDocument();
  });

  it('should render Create Line button', () => {
    render(
      <MemoryRouter>
        <Toolbar fps={60} zoom={1} />
      </MemoryRouter>
    );
    
    // Click the Shapes dropdown to open it
    const shapesDropdown = screen.getByRole('button', { name: /components/i });
    fireEvent.click(shapesDropdown);
    
    const button = screen.getByRole('button', { name: /^Create Line$/i });
    expect(button).toBeInTheDocument();
  });

  it('should render Undo button', () => {
    render(
      <MemoryRouter>
        <Toolbar fps={60} zoom={1} />
      </MemoryRouter>
    );
    
    // Click the Edit dropdown to open it
    const editDropdown = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editDropdown);
    
    const button = screen.getByRole('button', { name: /undo/i });
    expect(button).toBeInTheDocument();
  });

  it('should render Redo button', () => {
    render(
      <MemoryRouter>
        <Toolbar fps={60} zoom={1} />
      </MemoryRouter>
    );
    
    // Click the Edit dropdown to open it
    const editDropdown = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editDropdown);
    
    const button = screen.getByRole('button', { name: /redo/i });
    expect(button).toBeInTheDocument();
  });

  it('should render Export button', () => {
    render(
      <MemoryRouter>
        <Toolbar fps={60} zoom={1} />
      </MemoryRouter>
    );
    
    // Click the Tools dropdown to open it
    const toolsDropdown = screen.getByRole('button', { name: /tools/i });
    fireEvent.click(toolsDropdown);
    
    const button = screen.getByRole('button', { name: /export/i });
    expect(button).toBeInTheDocument();
  });

  it('should render Layers button', () => {
    render(
      <MemoryRouter>
        <Toolbar fps={60} zoom={1} />
      </MemoryRouter>
    );
    
    // Click the Advanced dropdown to open it
    const advancedDropdown = screen.getByRole('button', { name: /advanced/i });
    fireEvent.click(advancedDropdown);
    
    const button = screen.getByRole('button', { name: /layers/i });
    expect(button).toBeInTheDocument();
  });

  it('should render Align button', () => {
    render(
      <MemoryRouter>
        <Toolbar fps={60} zoom={1} />
      </MemoryRouter>
    );
    
    // Click the Advanced dropdown to open it
    const advancedDropdown = screen.getByRole('button', { name: /advanced/i });
    fireEvent.click(advancedDropdown);
    
    const button = screen.getByRole('button', { name: /align/i });
    expect(button).toBeInTheDocument();
  });

  it('should render Grid button', () => {
    render(
      <MemoryRouter>
        <Toolbar fps={60} zoom={1} />
      </MemoryRouter>
    );
    
    // Click the Advanced dropdown to open it
    const advancedDropdown = screen.getByRole('button', { name: /advanced/i });
    fireEvent.click(advancedDropdown);
    
    const button = screen.getByRole('button', { name: /grid/i });
    expect(button).toBeInTheDocument();
  });

  it('should call onCreateShape when shape button is clicked', () => {
    const mockOnCreateShape = vi.fn();
    render(
      <MemoryRouter>
        <Toolbar fps={60} zoom={1} onCreateShape={mockOnCreateShape} />
      </MemoryRouter>
    );
    
    // Click the Shapes dropdown to open it
    const shapesDropdown = screen.getByRole('button', { name: /components/i });
    fireEvent.click(shapesDropdown);
    
    const button = screen.getByRole('button', { name: /rectangle/i });
    fireEvent.click(button);
    
    expect(mockOnCreateShape).toHaveBeenCalledWith('rect');
  });

  it('should call createShape when no onCreateShape prop is provided', () => {
    render(
      <MemoryRouter>
        <Toolbar fps={60} zoom={1} />
      </MemoryRouter>
    );
    
    // Click the Shapes dropdown to open it
    const shapesDropdown = screen.getByRole('button', { name: /components/i });
    fireEvent.click(shapesDropdown);
    
    const button = screen.getByRole('button', { name: /rectangle/i });
    fireEvent.click(button);
    
    expect(mockCreateShape).toHaveBeenCalled();
  });

  it('should display FPS counter', () => {
    render(
      <MemoryRouter>
        <Toolbar fps={60} zoom={1} />
      </MemoryRouter>
    );
    
    expect(screen.getByText('60')).toBeInTheDocument();
  });

  it('should display zoom level', () => {
    render(
      <MemoryRouter>
        <Toolbar fps={60} zoom={1.5} />
      </MemoryRouter>
    );
    
    expect(screen.getByText('150%')).toBeInTheDocument();
  });

  it('should display user information when logged in', () => {
    render(
      <MemoryRouter>
        <Toolbar fps={60} zoom={1} />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should disable shape creation buttons when not logged in', () => {
    const mockState = {
      createShape: mockCreateShape,
      currentUser: null,
      selectedShapeIds: [],
      shapes: new Map(),
      undo: vi.fn(),
      redo: vi.fn(),
      canUndo: vi.fn(() => false),
      canRedo: vi.fn(() => false),
      deleteSelectedShapes: vi.fn(),
      duplicateSelectedShapes: vi.fn(),
      clearSelection: vi.fn(),
      selectShapes: vi.fn(),
      activeLayerId: 'default-layer',
      gridState: {
        isVisible: false,
        isSnapEnabled: false,
        size: 20,
        color: '#E5E7EB',
        opacity: 0.5,
      },
      toggleGrid: vi.fn(),
      canvasScale: {
        backgroundImage: null,
        scaleLine: null,
        isScaleMode: false,
        isImageUploadMode: false,
      },
    };
    
    mockUseCanvasStore.mockImplementation((selector?: (state: unknown) => unknown) => {
      if (selector) {
        return selector(mockState);
      }
      // If no selector provided, return the mock state directly
      return mockState;
    });
    
    render(
      <MemoryRouter>
        <Toolbar fps={60} zoom={1} />
      </MemoryRouter>
    );
    
    // Click the Shapes dropdown to open it
    const shapesDropdown = screen.getByRole('button', { name: /components/i });
    fireEvent.click(shapesDropdown);
    
    const button = screen.getByRole('button', { name: /rectangle/i });
    expect(button).toBeDisabled();
  });

  it('should call toggleGrid when grid button is clicked', () => {
    const mockToggleGrid = vi.fn();
    const mockState = {
      createShape: mockCreateShape,
      currentUser: mockCurrentUser,
      selectedShapeIds: [],
      shapes: new Map(),
      undo: vi.fn(),
      redo: vi.fn(),
      canUndo: vi.fn(() => false),
      canRedo: vi.fn(() => false),
      deleteSelectedShapes: vi.fn(),
      duplicateSelectedShapes: vi.fn(),
      clearSelection: vi.fn(),
      selectShapes: vi.fn(),
      activeLayerId: 'default-layer',
      gridState: {
        isVisible: false,
        isSnapEnabled: false,
        size: 20,
        color: '#E5E7EB',
        opacity: 0.5,
      },
      toggleGrid: mockToggleGrid,
    };
    
    mockUseCanvasStore.mockImplementation((selector?: (state: unknown) => unknown) => {
      if (selector) {
        return selector(mockState);
      }
      // If no selector provided, return the mock state directly
      return mockState;
    });
    
    render(
      <MemoryRouter>
        <Toolbar fps={60} zoom={1} />
      </MemoryRouter>
    );
    
    // Click the Advanced dropdown to open it
    const advancedDropdown = screen.getByRole('button', { name: /advanced/i });
    fireEvent.click(advancedDropdown);
    
    const button = screen.getByRole('button', { name: /grid/i });
    fireEvent.click(button);
    
    expect(mockToggleGrid).toHaveBeenCalled();
  });

  it('should render children when provided', () => {
    render(
      <MemoryRouter>
        <Toolbar fps={60} zoom={1}>
          <div data-testid="custom-child">Custom Content</div>
        </Toolbar>
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('custom-child')).toBeInTheDocument();
  });
});