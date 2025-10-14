import { AuthButton } from './AuthButton';
import FPSCounter from './FPSCounter';
import ZoomIndicator from './ZoomIndicator';

interface ToolbarProps {
  children?: React.ReactNode;
  fps?: number;
  zoom?: number;
}

/**
 * Toolbar component
 * Top navigation bar with user authentication info, FPS counter, zoom level, and additional controls
 */
export function Toolbar({ children, fps, zoom }: ToolbarProps) {
  return (
    <div className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-gray-900">CollabCanvas</h1>
        {children}
      </div>
      <div className="flex items-center gap-6">
        {zoom !== undefined && <ZoomIndicator scale={zoom} />}
        {fps !== undefined && <FPSCounter fps={fps} />}
        <AuthButton />
      </div>
    </div>
  );
}

