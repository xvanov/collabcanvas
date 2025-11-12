import { Cursor } from './Cursor';
import type { Presence } from '../types';
import { memo } from 'react';

interface CursorOverlayProps {
  users: Presence[];
}

/**
 * CursorOverlay component for rendering other users' cursors
 * Shows cursors for all active users except the current user
 * Memoized to prevent unnecessary re-renders
 */
export const CursorOverlay = memo(function CursorOverlay({ users }: CursorOverlayProps) {
  return (
    <>
      {users
        .filter((user) => user.cursor) // Filter out users without cursor data
        .map((user) => (
          <Cursor
            key={user.userId}
            x={user.cursor!.x}
            y={user.cursor!.y}
            color={user.color}
            name={user.name}
            isCurrentUser={false}
          />
        ))}
    </>
  );
});
