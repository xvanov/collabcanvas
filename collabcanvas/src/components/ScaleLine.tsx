/**
 * ScaleLine component for rendering construction scale lines
 * Uses Konva.js for rendering dashed lines with measurements
 */

import { Line, Text, Group } from 'react-konva';
import type { ScaleLine as ScaleLineType } from '../types';
import { formatMeasurement } from '../services/unitConversion';

interface ScaleLineProps {
  scaleLine: ScaleLineType;
}

export function ScaleLine({ scaleLine }: ScaleLineProps) {
  if (!scaleLine.isVisible) return null;

  // Calculate line properties - coordinates are already in canvas space
  const startX = scaleLine.startX;
  const startY = scaleLine.startY;
  const endX = scaleLine.endX;
  const endY = scaleLine.endY;

  // Calculate line length in pixels
  const lineLength = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
  
  // Check if this is a line being created (start and end points are the same)
  const isBeingCreated = lineLength === 0;
  
  // Calculate midpoint for text
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  
  // Calculate angle for text rotation (only if line has length)
  const angle = lineLength > 0 ? Math.atan2(endY - startY, endX - startX) * (180 / Math.PI) : 0;
  
  // Format the measurement text
  const measurementText = scaleLine.realWorldLength > 0 
    ? formatMeasurement(scaleLine.realWorldLength, scaleLine.unit)
    : 'Click to set end point';
  
  // Calculate scale ratio (pixels per unit) - only if we have a real world length
  const scaleRatio = scaleLine.realWorldLength > 0 ? lineLength / scaleLine.realWorldLength : 0;
  
  // Scale line properties - use fixed sizes for performance
  const strokeWidth = 3;
  const fontSize = 14;
  
  return (
    <Group>
      {/* Main scale line - only render if line has length */}
      {!isBeingCreated && (
        <Line
          points={[startX, startY, endX, endY]}
          stroke="#FF6B35"
          strokeWidth={strokeWidth}
          dash={[8, 4]} // Dashed line pattern
          lineCap="round"
          lineJoin="round"
        />
      )}
      
      {/* Start point marker */}
      <Line
        points={[
          startX - 4, startY - 4,
          startX + 4, startY + 4,
          startX - 4, startY + 4,
          startX + 4, startY - 4
        ]}
        stroke="#FF6B35"
        strokeWidth={strokeWidth}
        lineCap="round"
      />
      
      {/* End point marker - only render if line has length */}
      {!isBeingCreated && (
        <Line
          points={[
            endX - 4, endY - 4,
            endX + 4, endY + 4,
            endX - 4, endY + 4,
            endX + 4, endY - 4
          ]}
          stroke="#FF6B35"
          strokeWidth={strokeWidth}
          lineCap="round"
        />
      )}
      
      {/* Measurement text */}
      <Text
        x={midX}
        y={midY - fontSize - 4}
        text={measurementText}
        fontSize={fontSize}
        fontFamily="Arial, sans-serif"
        fill={isBeingCreated ? "#FFA500" : "#FF6B35"} // Orange for "click to set end point"
        align="center"
        rotation={angle}
        offsetX={measurementText.length * fontSize * 0.3}
        offsetY={fontSize / 2}
      />
      
      {/* Scale ratio text (smaller, for reference) - only show if we have a real world length */}
      {scaleLine.realWorldLength > 0 && (
        <Text
          x={midX}
          y={midY + fontSize + 4}
          text={`${scaleRatio.toFixed(2)} px/${scaleLine.unit}`}
          fontSize={fontSize * 0.7}
          fontFamily="Arial, sans-serif"
          fill="#666"
          align="center"
          rotation={angle}
          offsetX={measurementText.length * fontSize * 0.2}
          offsetY={fontSize * 0.35}
        />
      )}
    </Group>
  );
}

/**
 * ScaleLineOverlay component for rendering scale lines on top of canvas
 * This will be used in the Canvas component
 */
interface ScaleLineOverlayProps {
  scaleLine: ScaleLineType | null;
}

export function ScaleLineOverlay({ scaleLine }: ScaleLineOverlayProps) {
  if (!scaleLine) return null;
  
  return (
    <ScaleLine
      scaleLine={scaleLine}
    />
  );
}
