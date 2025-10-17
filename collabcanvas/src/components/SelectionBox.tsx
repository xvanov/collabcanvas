/**
 * SelectionBox component for drag selection on the canvas
 * Renders a semi-transparent rectangle overlay during drag selection
 */

import { Rect } from 'react-konva';
import type { SelectionBox as SelectionBoxType } from '../types';

interface SelectionBoxProps {
  selectionBox: SelectionBoxType;
}

/**
 * Selection box overlay for drag selection
 */
export function SelectionBox({ selectionBox }: SelectionBoxProps) {
  return (
    <Rect
      x={selectionBox.x}
      y={selectionBox.y}
      width={selectionBox.width}
      height={selectionBox.height}
      fill="rgba(59, 130, 246, 0.1)"
      stroke="#3B82F6"
      strokeWidth={1}
      dash={[5, 5]}
      listening={false}
    />
  );
}
