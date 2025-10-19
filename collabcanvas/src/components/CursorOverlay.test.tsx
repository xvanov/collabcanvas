import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CursorOverlay } from './CursorOverlay';
import type { Presence } from '../types';

// Mock Konva components
interface MockCircleProps {
  x: number;
  y: number;
  radius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  listening: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffset: { x: number; y: number };
}

interface MockTextProps {
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  padding: number;
  listening: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffset: { x: number; y: number };
}

vi.mock('react-konva', () => ({
  Circle: ({ x, y, radius, fill, stroke, strokeWidth, listening, shadowColor, shadowBlur, shadowOffset }: MockCircleProps) => (
    <div
      data-testid="cursor-circle"
      data-x={x}
      data-y={y}
      data-radius={radius}
      data-fill={fill}
      data-stroke={stroke}
      data-stroke-width={strokeWidth}
      data-listening={listening}
      data-shadow-color={shadowColor}
      data-shadow-blur={shadowBlur}
      data-shadow-offset={JSON.stringify(shadowOffset)}
    />
  ),
  Text: ({ x, y, text, fontSize, fontFamily, fill, padding, listening, shadowColor, shadowBlur, shadowOffset }: MockTextProps) => (
    <div
      data-testid="cursor-text"
      data-x={x}
      data-y={y}
      data-text={text}
      data-font-size={fontSize}
      data-font-family={fontFamily}
      data-fill={fill}
      data-padding={padding}
      data-listening={listening}
      data-shadow-color={shadowColor}
      data-shadow-blur={shadowBlur}
      data-shadow-offset={JSON.stringify(shadowOffset)}
    />
  ),
}));

describe('CursorOverlay Component', () => {
  const mockUsers: Presence[] = [
    {
      userId: 'user-1',
      name: 'Alice',
      color: '#3B82F6',
      cursor: { x: 100, y: 200 },
      lastSeen: Date.now(),
      isActive: true,
    },
    {
      userId: 'user-2',
      name: 'Bob',
      color: '#EF4444',
      cursor: { x: 300, y: 400 },
      lastSeen: Date.now(),
      isActive: true,
    },
  ];

  it('should render cursors for all users', () => {
    const { getAllByTestId } = render(<CursorOverlay users={mockUsers} />);
    
    const circles = getAllByTestId('cursor-circle');
    const texts = getAllByTestId('cursor-text');
    
    expect(circles).toHaveLength(2);
    expect(texts).toHaveLength(2);
  });

  it('should render cursor with correct properties for first user', () => {
    const { getAllByTestId } = render(<CursorOverlay users={mockUsers} />);
    
    const circles = getAllByTestId('cursor-circle');
    const texts = getAllByTestId('cursor-text');
    
    const firstCircle = circles[0];
    const firstText = texts[0];
    
    // Check circle properties
    expect(firstCircle).toHaveAttribute('data-x', '100');
    expect(firstCircle).toHaveAttribute('data-y', '200');
    expect(firstCircle).toHaveAttribute('data-radius', '6');
    expect(firstCircle).toHaveAttribute('data-fill', '#3B82F6');
    expect(firstCircle).toHaveAttribute('data-stroke', '#FFFFFF');
    expect(firstCircle).toHaveAttribute('data-stroke-width', '2');
    expect(firstCircle).toHaveAttribute('data-listening', 'false');
    
    // Check text properties
    expect(firstText).toHaveAttribute('data-x', '108'); // x + 8
    expect(firstText).toHaveAttribute('data-y', '192'); // y - 8
    expect(firstText).toHaveAttribute('data-text', 'Alice');
    expect(firstText).toHaveAttribute('data-font-size', '12');
    expect(firstText).toHaveAttribute('data-font-family', 'Arial, sans-serif');
    expect(firstText).toHaveAttribute('data-fill', '#333333');
    expect(firstText).toHaveAttribute('data-padding', '4');
    expect(firstText).toHaveAttribute('data-listening', 'false');
  });

  it('should render cursor with correct properties for second user', () => {
    const { getAllByTestId } = render(<CursorOverlay users={mockUsers} />);
    
    const circles = getAllByTestId('cursor-circle');
    const texts = getAllByTestId('cursor-text');
    
    const secondCircle = circles[1];
    const secondText = texts[1];
    
    // Check circle properties
    expect(secondCircle).toHaveAttribute('data-x', '300');
    expect(secondCircle).toHaveAttribute('data-y', '400');
    expect(secondCircle).toHaveAttribute('data-radius', '6');
    expect(secondCircle).toHaveAttribute('data-fill', '#EF4444');
    expect(secondCircle).toHaveAttribute('data-stroke', '#FFFFFF');
    expect(secondCircle).toHaveAttribute('data-stroke-width', '2');
    expect(secondCircle).toHaveAttribute('data-listening', 'false');
    
    // Check text properties
    expect(secondText).toHaveAttribute('data-x', '308'); // x + 8
    expect(secondText).toHaveAttribute('data-y', '392'); // y - 8
    expect(secondText).toHaveAttribute('data-text', 'Bob');
  });

  it('should render nothing when users array is empty', () => {
    const { container } = render(<CursorOverlay users={[]} />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should use user ID as key for React rendering', () => {
    const { getAllByTestId } = render(<CursorOverlay users={mockUsers} />);
    
    const circles = getAllByTestId('cursor-circle');
    
    // Should render both cursors
    expect(circles).toHaveLength(2);
    
    // Each cursor should have unique properties based on user data
    expect(circles[0]).toHaveAttribute('data-fill', '#3B82F6');
    expect(circles[1]).toHaveAttribute('data-fill', '#EF4444');
  });

  it('should handle users with same cursor position', () => {
    const usersAtSamePosition: Presence[] = [
      {
        userId: 'user-1',
        name: 'Alice',
        color: '#3B82F6',
        cursor: { x: 100, y: 200 },
        lastSeen: Date.now(),
        isActive: true,
      },
      {
        userId: 'user-2',
        name: 'Bob',
        color: '#EF4444',
        cursor: { x: 100, y: 200 }, // Same position
        lastSeen: Date.now(),
        isActive: true,
      },
    ];

    const { getAllByTestId } = render(<CursorOverlay users={usersAtSamePosition} />);
    
    const circles = getAllByTestId('cursor-circle');
    const texts = getAllByTestId('cursor-text');
    
    expect(circles).toHaveLength(2);
    expect(texts).toHaveLength(2);
    
    // Both should be at same position but with different colors
    circles.forEach(circle => {
      expect(circle).toHaveAttribute('data-x', '100');
      expect(circle).toHaveAttribute('data-y', '200');
    });
  });
});
