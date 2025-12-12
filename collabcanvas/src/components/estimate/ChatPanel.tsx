import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from './ChatMessage';

interface Message {
  id: string;
  role: 'agent' | 'user';
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  onClarificationComplete?: (complete: boolean) => void;
}

// Clarification questions for the agent to ask
const clarificationQuestions = [
  "Hello! I'll help you create an accurate estimate. Could you tell me more about the materials you prefer for this project?",
  "Great choice! What's your preferred timeline for completing this project?",
  "Are there any specific quality requirements or certifications needed for the materials?",
  "Do you have any existing infrastructure that needs to be integrated or worked around?",
  "Perfect! I have all the information I need to generate an accurate estimate. Click 'Generate Estimate' when you're ready!",
];

/**
 * ChatPanel - Glass chat UI with fixed input bar and clarification agent.
 * The agent asks clarifying questions back-and-forth and signals when complete.
 */
export function ChatPanel({ onClarificationComplete }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'agent',
      content: clarificationQuestions[0],
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate agent response with next clarification question
    setTimeout(() => {
      const nextIndex = questionIndex + 1;
      const isComplete = nextIndex >= clarificationQuestions.length - 1;

      const agentMessage: Message = {
        id: `agent-${Date.now()}`,
        role: 'agent',
        content: clarificationQuestions[Math.min(nextIndex, clarificationQuestions.length - 1)],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMessage]);
      setIsTyping(false);
      setQuestionIndex(nextIndex);

      // Signal clarification complete when all questions are answered
      if (isComplete && onClarificationComplete) {
        onClarificationComplete(true);
      }
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
            timestamp={message.timestamp}
          />
        ))}

        {isTyping && (
          <div className="flex justify-start mb-4">
            <div className="glass-panel p-4 rounded-2xl bg-truecost-cyan/10 border-truecost-cyan/30">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-truecost-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-truecost-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-truecost-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-truecost-glass-border p-4 bg-truecost-bg-primary/80 backdrop-blur-md">
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a question or provide details..."
            className="glass-input flex-1"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="btn-pill-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

