/**
 * Tests for LockOverlay component
 * Tests username display on locked shapes
 */

import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { LockOverlay } from '../components/LockOverlay';
import type { Lock } from '../types';

// Mock Konva components completely
vi.mock('react-konva', () => ({
  Text: ({ text, x, y, listening, ...props }: { text: string; x: number; y: number; listening: boolean; [key: string]: unknown }) => (
    <div 
      data-testid="lock-text" 
      data-text={text} 
      data-x={x} 
      data-y={y} 
      data-listening={listening}
      {...props} 
    />
  ),
}));

describe('LockOverlay', () => {
  const mockLock: Lock = {
    userId: 'user1',
    userName: 'Test User',
    lockedAt: Date.now(),
  };

  const defaultProps = {
    shapeId: 'shape1',
    lock: mockLock,
    x: 100,
    y: 100,
    width: 100,
    height: 100,
  };

  it('should render lock text with username', () => {
    const { getByTestId } = render(<LockOverlay {...defaultProps} />);

    const lockText = getByTestId('lock-text');
    expect(lockText).toHaveAttribute('data-text', '🔒 Test User');
  });

  it('should position text above the shape', () => {
    const { getByTestId } = render(<LockOverlay {...defaultProps} />);

    const lockText = getByTestId('lock-text');
    expect(lockText).toHaveAttribute('data-x', '100');
    expect(lockText).toHaveAttribute('data-y', '75'); // y - 25
  });

  it('should handle different usernames', () => {
    const customLock: Lock = {
      userId: 'user2',
      userName: 'Another User',
      lockedAt: Date.now(),
    };

    const { getByTestId } = render(<LockOverlay {...defaultProps} lock={customLock} />);

    const lockText = getByTestId('lock-text');
    expect(lockText).toHaveAttribute('data-text', '🔒 Another User');
  });

  it('should handle different shape positions', () => {
    const { getByTestId } = render(<LockOverlay {...defaultProps} x={200} y={300} />);

    const lockText = getByTestId('lock-text');
    expect(lockText).toHaveAttribute('data-x', '200');
    expect(lockText).toHaveAttribute('data-y', '275'); // 300 - 25
  });

  it('should not interfere with shape interactions', () => {
    const { getByTestId } = render(<LockOverlay {...defaultProps} />);

    const lockText = getByTestId('lock-text');
    expect(lockText).toHaveAttribute('data-listening', 'false');
  });
});
