/**
 * Material Dialogue Box Component
 * PR-4: Chat interface for material estimation
 */

import { useState, useRef, useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import type { DialogueMessage, DialogueContext } from '../types/dialogue';
import { processDialogueRequest } from '../services/aiDialogueService';

interface MaterialDialogueBoxProps {
  isVisible: boolean;
  onClose: () => void;
}

export function MaterialDialogueBox({ isVisible, onClose }: MaterialDialogueBoxProps) {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const dialogue = useCanvasStore(state => state.materialDialogue);
  const startDialogue = useCanvasStore(state => state.startMaterialDialogue);
  const updateDialogue = useCanvasStore(state => state.updateMaterialDialogue);
  const addCalculation = useCanvasStore(state => state.addMaterialCalculation);
  const layers = useCanvasStore(state => state.layers);
  const shapes = useCanvasStore(state => state.shapes);
  const scaleLine = useCanvasStore(state => state.canvasScale?.scaleLine);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dialogue?.messageHistory]);

  if (!isVisible) return null;

  const messages = dialogue?.messageHistory || [];

  // Calculate scale factor from scale line
  const scaleFactor = scaleLine
    ? scaleLine.realWorldLength / Math.sqrt(
        Math.pow(scaleLine.endX - scaleLine.startX, 2) +
        Math.pow(scaleLine.endY - scaleLine.startY, 2)
      )
    : 1;

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const messageText = input.trim();
    setInput('');
    setIsProcessing(true);

    try {
      // Start new dialogue or continue existing
      if (!dialogue) {
        startDialogue(messageText);
        // Wait for state update
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        // Add user message to history first
        const userMessage: DialogueMessage = {
          id: `msg-${Date.now()}`,
          type: 'user',
          content: messageText,
          timestamp: Date.now(),
        };
        
        updateDialogue({
          messageHistory: [...dialogue.messageHistory, userMessage],
        });
        
        // Wait for state update
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Get updated dialogue from store
      let currentDialogue = useCanvasStore.getState().materialDialogue;
      if (!currentDialogue) {
        console.error('Failed to create dialogue');
        setIsProcessing(false);
        return;
      }

      // If we're in gathering stage (answering a clarification), parse the answer
      if (currentDialogue.stage === 'gathering' && dialogue) {
        const updates = parseUserResponse(currentDialogue, messageText);
        updateDialogue(updates);
        await new Promise(resolve => setTimeout(resolve, 50));
        currentDialogue = useCanvasStore.getState().materialDialogue!;
      }

      // Process the request
      const response = await processDialogueRequest(
        currentDialogue,
        layers,
        shapes,
        scaleFactor
      );

      // Add AI response to message history
      const aiMessage: DialogueMessage = {
        id: `msg-${Date.now()}`,
        type: response.type === 'estimate' ? 'estimate' : 
              response.type === 'clarification' ? 'clarification' : 'assistant',
        content: response.message,
        timestamp: Date.now(),
        metadata: {
          calculation: response.calculation,
        },
      };

      const updatedHistory = [...currentDialogue.messageHistory, aiMessage];

      // Update dialogue state
      updateDialogue({
        messageHistory: updatedHistory,
        stage: response.type === 'estimate' ? 'complete' : 
               response.type === 'clarification' ? 'gathering' : currentDialogue.stage,
        lastCalculation: response.calculation || currentDialogue.lastCalculation,
      });

      // If we got a calculation, add it to BOM
      if (response.calculation) {
        addCalculation(response.calculation);
      }
    } catch (error) {
      console.error('Error processing dialogue:', error);
      
      const errorMessage: DialogueMessage = {
        id: `msg-${Date.now()}`,
        type: 'system',
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now(),
      };

      if (dialogue) {
        updateDialogue({
          messageHistory: [...dialogue.messageHistory, errorMessage],
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Parse user response to clarification and update request specifications
   */
  const parseUserResponse = (_currentDialogue: DialogueContext, userAnswer: string): Partial<DialogueContext> => {
    const currentDialogue = _currentDialogue;
    const answer = userAnswer.toLowerCase();
    const currentRequest = currentDialogue.currentRequest;
    
    if (!currentRequest) return currentDialogue;

    // Parse framing type responses
    if (answer.includes('lumber') || answer.includes('wood')) {
      const spacing = answer.includes('24') ? 24 : 16;
      return {
        ...currentDialogue,
        currentRequest: {
          ...currentRequest,
          specifications: {
            ...currentRequest.specifications,
            framing: { type: 'lumber' as const, spacing: spacing as 16 | 24 },
          },
        },
        stage: 'calculating' as const,
      };
    }
    
    if (answer.includes('metal') || answer.includes('steel')) {
      const spacing = answer.includes('24') ? 24 : 16;
      return {
        ...currentDialogue,
        currentRequest: {
          ...currentRequest,
          specifications: {
            ...currentRequest.specifications,
            framing: { type: 'metal' as const, spacing: spacing as 16 | 24 },
          },
        },
        stage: 'calculating' as const,
      };
    }

    // Parse floor type responses
    if (answer.includes('epoxy')) {
      return {
        ...currentDialogue,
        currentRequest: {
          ...currentRequest,
          specifications: {
            ...currentRequest.specifications,
            type: 'epoxy' as const,
          },
        },
        stage: 'calculating' as const,
      };
    }

    if (answer.includes('tile')) {
      return {
        ...currentDialogue,
        currentRequest: {
          ...currentRequest,
          specifications: {
            ...currentRequest.specifications,
            type: 'tile' as const,
          },
        },
        stage: 'calculating' as const,
      };
    }

    if (answer.includes('carpet')) {
      return {
        ...currentDialogue,
        currentRequest: {
          ...currentRequest,
          specifications: {
            ...currentRequest.specifications,
            type: 'carpet' as const,
          },
        },
        stage: 'calculating' as const,
      };
    }

    if (answer.includes('hardwood') || answer.includes('wood floor')) {
      return {
        ...currentDialogue,
        currentRequest: {
          ...currentRequest,
          specifications: {
            ...currentRequest.specifications,
            type: 'hardwood' as const,
          },
        },
        stage: 'calculating' as const,
      };
    }

    // If user says "default" or "yes" or "proceed", use defaults
    if (answer.includes('default') || answer.includes('yes') || answer.includes('proceed')) {
      return {
        ...currentDialogue,
        currentRequest: {
          ...currentRequest,
          specifications: {
            ...currentRequest.specifications,
            framing: { type: 'lumber' as const, spacing: 16 as const },
          },
        },
        stage: 'calculating' as const,
      };
    }

    return currentDialogue;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-white rounded-lg shadow-2xl border border-gray-200 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-600 text-white rounded-t-lg">
        <div>
          <h2 className="text-lg font-semibold">Material Estimation</h2>
          <p className="text-xs text-blue-100">Ask about walls, floors, and more</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-white hover:text-blue-100 rounded transition-colors"
          title="Close chat"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="font-medium">Start a conversation</p>
            <p className="text-sm mt-1">Try: "Calculate materials for walls"</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about materials..."
            disabled={isProcessing}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
}

/**
 * Message bubble component
 */
function MessageBubble({
  message,
}: {
  message: DialogueMessage;
}) {
  const isUser = message.type === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-blue-600 text-white'
            : message.type === 'system'
            ? 'bg-red-100 text-red-800 border border-red-200'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        
        {message.metadata?.calculation && (
          <div className="mt-2 pt-2 border-t border-gray-300">
            <p className="text-xs font-semibold mb-1">Materials:</p>
            <ul className="text-xs space-y-0.5">
              {message.metadata.calculation.materials.slice(0, 5).map((mat, idx) => (
                <li key={idx}>
                  {mat.name}: {mat.quantity.toFixed(0)} {mat.unit}
                </li>
              ))}
              {message.metadata.calculation.materials.length > 5 && (
                <li className="italic">+ {message.metadata.calculation.materials.length - 5} more items</li>
              )}
            </ul>
          </div>
        )}

        <p className="text-xs mt-1 opacity-70">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

