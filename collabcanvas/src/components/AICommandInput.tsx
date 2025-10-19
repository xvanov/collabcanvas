import React, { useState, useRef, useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import type { AICommandHistory } from '../types';

interface AICommandInputProps {
  isVisible: boolean;
  onClose: () => void;
}

export const AICommandInput: React.FC<AICommandInputProps> = ({ isVisible, onClose }) => {
  const [commandText, setCommandText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const processAICommand = useCanvasStore(state => state.processAICommand);
  const commandHistory = useCanvasStore(state => state.aiCommandHistory);
  const clearHistory = useCanvasStore(state => state.clearAIHistory);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [commandHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandText.trim() || isProcessing) return;

    const userCommand = commandText.trim();
    setCommandText('');
    setIsProcessing(true);
    
    try {
      await processAICommand(userCommand);
    } catch (error) {
      console.error('Failed to process AI command:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 w-96 h-[500px] bg-white rounded-lg shadow-2xl border border-gray-200 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-purple-600 text-white rounded-t-lg">
        <div>
          <h2 className="text-lg font-semibold">AI Canvas Assistant</h2>
          <p className="text-xs text-purple-100">Create, modify, and organize shapes</p>
        </div>
        <div className="flex items-center gap-2">
          {commandHistory.length > 0 && (
            <button
              onClick={() => clearHistory()}
              className="p-1 text-white hover:text-purple-100 rounded transition-colors"
              title="Clear history"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-white hover:text-purple-100 rounded transition-colors"
            title="Close chat"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {commandHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="font-medium">Start a conversation</p>
            <p className="text-sm mt-2">Try these commands:</p>
            <ul className="text-sm mt-2 space-y-1">
              <li>"create a red circle"</li>
              <li>"create 3 blue rectangles"</li>
              <li>"align selected shapes left"</li>
              <li>"delete all circles"</li>
            </ul>
          </div>
        ) : (
          commandHistory.map((entry) => (
            <CommandHistoryItem key={entry.commandId} entry={entry} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={commandText}
            onChange={(e) => setCommandText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me to create shapes..."
            disabled={isProcessing}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 text-sm"
          />
          <button
            onClick={handleSubmit}
            disabled={!commandText.trim() || isProcessing}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Command history item display
 */
function CommandHistoryItem({ entry }: { entry: AICommandHistory }) {
  const result = entry.result;
  const isSuccess = result.success;

  return (
    <div className="space-y-2">
      {/* User Command */}
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-lg px-4 py-2 bg-purple-600 text-white">
          <p className="text-sm">{entry.command}</p>
          <p className="text-xs mt-1 opacity-70">
            {new Date(entry.timestamp).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* AI Response */}
      <div className="flex justify-start">
        <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isSuccess ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'
        }`}>
          <p className="text-sm font-medium mb-1">
            {isSuccess ? '✓ Success' : '✗ Failed'}
          </p>
          <p className="text-sm">{result.message}</p>
          
          {result.createdShapeIds && result.createdShapeIds.length > 0 && (
            <p className="text-xs mt-2 opacity-70">
              Created {result.createdShapeIds.length} shape{result.createdShapeIds.length > 1 ? 's' : ''}
            </p>
          )}
          
          {result.modifiedShapeIds && result.modifiedShapeIds.length > 0 && (
            <p className="text-xs mt-2 opacity-70">
              Modified {result.modifiedShapeIds.length} shape{result.modifiedShapeIds.length > 1 ? 's' : ''}
            </p>
          )}
          
          {result.deletedShapeIds && result.deletedShapeIds.length > 0 && (
            <p className="text-xs mt-2 opacity-70">
              Deleted {result.deletedShapeIds.length} shape{result.deletedShapeIds.length > 1 ? 's' : ''}
            </p>
          )}
          
          {result.error && (
            <p className="text-xs mt-2 font-mono bg-red-200 p-2 rounded">
              {result.error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}