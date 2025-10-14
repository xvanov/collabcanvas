import { useState } from 'react';
import { Toolbar } from '../components/Toolbar';
import Canvas from '../components/Canvas';

/**
 * Board page (main canvas view)
 * Protected route - only accessible to authenticated users
 * Contains the Konva canvas with pan/zoom support
 */
export function Board() {
  const [fps, setFps] = useState<number>(60);
  const [zoom, setZoom] = useState<number>(1);

  return (
    <div className="flex h-screen flex-col">
      <Toolbar fps={fps} zoom={zoom}>
        {/* Additional toolbar controls will be added in future PRs */}
      </Toolbar>
      <div className="flex-1">
        <Canvas onFpsUpdate={setFps} onZoomChange={setZoom} />
      </div>
    </div>
  );
}

