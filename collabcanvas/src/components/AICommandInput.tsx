import React, { useState } from 'react';
import { useCanvasStore } from '../store/canvasStore';

interface AICommandInputProps {
  isVisible: boolean;
  onClose: () => void;
}

export const AICommandInput: React.FC<AICommandInputProps> = ({ isVisible, onClose }) => {
  const [commandText, setCommandText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const processAICommand = useCanvasStore(state => state.processAICommand);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandText.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      await processAICommand(commandText);
      setCommandText('');
      onClose();
    } catch (error) {
      console.error('Failed to process AI command:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
        <h2 className="text-xl font-bold mb-4">AI Assistant</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="command" className="block text-sm font-medium text-gray-700 mb-2">
              What would you like to create?
            </label>
            <input
              id="command"
              type="text"
              value={commandText}
              onChange={(e) => setCommandText(e.target.value)}
              placeholder="Try: create a circle"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isProcessing}
            />
          </div>
          
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!commandText.trim() || isProcessing}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
        
        <div className="mt-4 text-sm text-gray-600">
          <p>Try commands like:</p>
          <ul className="list-disc list-inside mt-1">
            <li>"create a circle"</li>
          </ul>
        </div>
      </div>
    </div>
  );
};