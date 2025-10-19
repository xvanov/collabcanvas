import React from 'react';

interface AIClarificationDialogProps {
  clarification: {
    question: string;
    options: Array<{
      label: string;
      value: string;
      shapeIds?: string[];
    }>;
  };
  onSelect: (option: { label: string; value: string; shapeIds?: string[] }) => void;
  onCancel: () => void;
}

export const AIClarificationDialog: React.FC<AIClarificationDialogProps> = ({
  clarification,
  onSelect,
  onCancel
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Clarification Needed</h2>
        
        <p className="text-gray-700 mb-4">{clarification.question}</p>
        
        <div className="space-y-2">
          {clarification.options.map((option, index) => (
            <button
              key={index}
              onClick={() => onSelect(option)}
              className="w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {option.label}
            </button>
          ))}
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};