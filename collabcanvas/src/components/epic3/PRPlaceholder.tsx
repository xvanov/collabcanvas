/**
 * Placeholder component for locked PRs
 */
import React from 'react';

interface Props {
  prInfo: {
    number: number;
    title: string;
    description: string;
    status: string;
  };
}

export const PRPlaceholder: React.FC<Props> = ({ prInfo }) => {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">🔒</div>
      <h3 className="text-2xl font-bold text-gray-800 mb-2">
        PR {prInfo.number} Locked
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {prInfo.description}
      </p>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-lg mx-auto">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div className="text-left">
            <h4 className="font-semibold text-yellow-900 mb-2">
              Coming Soon!
            </h4>
            <p className="text-sm text-yellow-800">
              This PR's test UI will be unlocked once the backend implementation
              is complete. Complete the previous PRs first to unlock this feature.
            </p>
          </div>
        </div>
      </div>
      <div className="mt-8 text-sm text-gray-500">
        <p>Complete previous PRs to unlock this test panel</p>
      </div>
    </div>
  );
};

