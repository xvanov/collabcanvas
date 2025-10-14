import { Toolbar } from '../components/Toolbar';

/**
 * Board page (main canvas view)
 * Protected route - only accessible to authenticated users
 * Will contain the Konva canvas in future PRs
 */
export function Board() {
  return (
    <div className="flex h-screen flex-col">
      <Toolbar>
        {/* Additional toolbar controls will be added in future PRs */}
      </Toolbar>
      <div className="flex flex-1 items-center justify-center bg-gray-100">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-700">
            Canvas Coming Soon
          </h2>
          <p className="text-gray-600">
            Canvas renderer will be added in PR #3
          </p>
        </div>
      </div>
    </div>
  );
}

