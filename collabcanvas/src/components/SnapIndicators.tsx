/**
 * SnapIndicators component
 * Provides visual feedback for snap-to-grid functionality
 */

import { useEffect, useState, memo } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { gridService } from '../services/gridService';

interface SnapIndicatorsProps {
  mousePosition: { x: number; y: number } | null;
  viewport: {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
    scale: number;
  };
}

const SnapIndicatorsComponent = ({ mousePosition, viewport }: SnapIndicatorsProps) => {
  const { gridState, setSnapIndicators } = useCanvasStore();
  const [indicators, setIndicators] = useState<Array<{ x: number; y: number; type: 'horizontal' | 'vertical' | 'corner' }>>([]);

  useEffect(() => {
    if (!gridState.isSnapEnabled || !mousePosition) {
      setIndicators([]);
      setSnapIndicators([]);
      return;
    }

    const snapThreshold = 10; // pixels
    const snapPoints = gridService.findSnapPoints(
      mousePosition.x,
      mousePosition.y,
      gridState.size,
      snapThreshold
    );

    setIndicators(snapPoints.map(point => ({
      x: point.x,
      y: point.y,
      type: point.type,
    })));

    setSnapIndicators(snapPoints);
  }, [mousePosition, gridState.isSnapEnabled, gridState.size, setSnapIndicators]);

  if (!gridState.isSnapEnabled || indicators.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {indicators.map((indicator, index) => (
        <div
          key={`indicator-${index}`}
          className="absolute"
          style={{
            left: indicator.x - viewport.offsetX,
            top: indicator.y - viewport.offsetY,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {indicator.type === 'horizontal' && (
            <div
              className="bg-blue-500 animate-pulse"
              style={{
                width: 20,
                height: 2,
                transform: 'translate(-50%, -50%)',
              }}
            />
          )}
          {indicator.type === 'vertical' && (
            <div
              className="bg-blue-500 animate-pulse"
              style={{
                width: 2,
                height: 20,
                transform: 'translate(-50%, -50%)',
              }}
            />
          )}
          {indicator.type === 'corner' && (
            <div
              className="bg-blue-500 rounded-full animate-pulse"
              style={{
                width: 8,
                height: 8,
                transform: 'translate(-50%, -50%)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

// Memoize to prevent re-renders when snap is disabled
export const SnapIndicators = memo(SnapIndicatorsComponent, (prevProps, nextProps) => {
  // Only re-render if snap is enabled and mousePosition actually changed
  const { gridState } = useCanvasStore.getState();
  if (!gridState.isSnapEnabled) return true; // Don't re-render if snap is disabled
  
  // Compare mousePosition
  if (prevProps.mousePosition?.x !== nextProps.mousePosition?.x ||
      prevProps.mousePosition?.y !== nextProps.mousePosition?.y) {
    return false; // Re-render if mouse position changed
  }
  
  return true; // Don't re-render
});
