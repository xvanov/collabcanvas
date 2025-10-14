/**
 * Integration tests for Toolbar with Create Rectangle button
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Toolbar } from './Toolbar';
import { useCanvasStore } from '../store/canvasStore';

// Mock the canvas store
vi.mock('../store/canvasStore', () => ({
  useCanvasStore: vi.fn(),
}));

// Mock the usePresence hook
vi.mock('../hooks/usePresence', () => ({
  usePresence: vi.fn(() => ({
    activeUsersCount: 0,
  })),
}));

// Mock the useOffline hook
vi.mock('../hooks/useOffline', () => ({
  useOffline: vi.fn(() => ({
    connectionStatus: 'Online',
    connectionStatusColor: 'text-green-500',
    hasQueuedUpdates: false,
    queuedUpdatesCount: 0,
    retryQueuedUpdates: vi.fn(),
  })),
}));

// Mock AuthButton component
vi.mock('./AuthButton', () => ({
  AuthButton: () => <div>Auth Button</div>,
}));

// Mock FPSCounter component
vi.mock('./FPSCounter', () => ({
  default: ({ fps }: { fps: number }) => <div>FPS: {fps}</div>,
}));

// Mock ZoomIndicator component
vi.mock('./ZoomIndicator', () => ({
  default: ({ scale }: { scale: number }) => <div>Zoom: {scale}x</div>,
}));

describe('Toolbar Component', () => {
  const mockCreateShape = vi.fn();
  const mockCurrentUser = {
    uid: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    photoURL: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useCanvasStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
      const mockState = {
        createShape: mockCreateShape,
        currentUser: mockCurrentUser,
      };
      return selector(mockState);
    });
  });

  it('should render Create Rectangle button', () => {
    render(<Toolbar fps={60} zoom={1} />);
    
    const button = screen.getByText('Create Rectangle');
    expect(button).toBeInTheDocument();
  });

  it('should call createShape when Create Rectangle button is clicked', () => {
    render(<Toolbar fps={60} zoom={1} />);
    
    const button = screen.getByText('Create Rectangle');
    fireEvent.click(button);
    
    expect(mockCreateShape).toHaveBeenCalledTimes(1);
    
    // Verify the shape has correct properties
    const createdShape = mockCreateShape.mock.calls[0][0];
    expect(createdShape.type).toBe('rect');
    expect(createdShape.x).toBe(0);
    expect(createdShape.y).toBe(0);
    expect(createdShape.w).toBe(100);
    expect(createdShape.h).toBe(100);
    expect(createdShape.color).toBe('#3B82F6');
    expect(createdShape.createdBy).toBe('user-123');
    expect(createdShape.updatedBy).toBe('user-123');
  });

  it('should disable Create Rectangle button when no current user', () => {
    (useCanvasStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
      const mockState = {
        createShape: mockCreateShape,
        currentUser: null,
      };
      return selector(mockState);
    });

    render(<Toolbar fps={60} zoom={1} />);
    
    const button = screen.getByText('Create Rectangle');
    expect(button).toBeDisabled();
  });

  it('should not call createShape when button is clicked without current user', () => {
    (useCanvasStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
      const mockState = {
        createShape: mockCreateShape,
        currentUser: null,
      };
      return selector(mockState);
    });

    render(<Toolbar fps={60} zoom={1} />);
    
    const button = screen.getByText('Create Rectangle');
    fireEvent.click(button);
    
    expect(mockCreateShape).not.toHaveBeenCalled();
  });

  it('should display FPS counter when fps prop is provided', () => {
    render(<Toolbar fps={58} zoom={1} />);
    
    expect(screen.getByText('FPS: 58')).toBeInTheDocument();
  });

  it('should display zoom indicator when zoom prop is provided', () => {
    render(<Toolbar fps={60} zoom={1.5} />);
    
    expect(screen.getByText('Zoom: 1.5x')).toBeInTheDocument();
  });

  it('should create shapes with unique IDs', () => {
    render(<Toolbar fps={60} zoom={1} />);
    
    const button = screen.getByText('Create Rectangle');
    
    // Click multiple times
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    
    expect(mockCreateShape).toHaveBeenCalledTimes(3);
    
    // Get all created shape IDs
    const shape1Id = mockCreateShape.mock.calls[0][0].id;
    const shape2Id = mockCreateShape.mock.calls[1][0].id;
    const shape3Id = mockCreateShape.mock.calls[2][0].id;
    
    // Verify IDs are unique
    expect(shape1Id).not.toBe(shape2Id);
    expect(shape2Id).not.toBe(shape3Id);
    expect(shape1Id).not.toBe(shape3Id);
  });
});

