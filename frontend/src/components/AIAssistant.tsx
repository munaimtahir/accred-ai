import { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Loader2,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { Indicator, ChatMessage } from '../types';
import { api } from '../services/api';

interface AIAssistantProps {
  indicators: Indicator[];
}

export default function AIAssistant({ indicators }: AIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your AI compliance assistant. I can help you understand regulations, draft compliance documents, and answer questions about your compliance indicators. How can I assist you today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await api.askAssistant(
        userMessage.content,
        indicators.length > 0 ? indicators : undefined
      );

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const content = errorMsg.includes('Sign in required for AI features')
        ? "Sign in required for AI features. Please sign in to use the AI assistant."
        : "I'm sorry, I encountered an error processing your request. Please try again later.";
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    "How do I create an SOP for equipment maintenance?",
    "What evidence do I need for temperature monitoring compliance?",
    "Explain the requirements for staff training documentation",
    "What are the best practices for laboratory safety logs?",
  ];

  return (
    <div className="animate-fade-in h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Bot className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI Assistant</h1>
            <p className="text-slate-500">Your compliance knowledge partner</p>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Bot size={16} className="text-indigo-600" />
                </div>
                <div className="bg-slate-100 rounded-2xl rounded-tl-none px-4 py-3">
                  <Loader2 className="animate-spin text-slate-400" size={20} />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a compliance question..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar - Suggestions */}
        <div className="w-72 flex-shrink-0 space-y-4">
          {/* Quick Questions */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-indigo-600" />
              <h3 className="font-semibold text-slate-900 text-sm">Suggested Questions</h3>
            </div>
            <div className="space-y-2">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setInputValue(question);
                    inputRef.current?.focus();
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-600 bg-slate-50 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          {/* Context Info */}
          {indicators.length > 0 && (
            <div className="bg-indigo-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={16} className="text-indigo-600" />
                <h3 className="font-semibold text-indigo-900 text-sm">Context Active</h3>
              </div>
              <p className="text-sm text-indigo-700">
                The assistant has access to your {indicators.length} compliance indicators for more accurate responses.
              </p>
            </div>
          )}

          {/* Tips */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="font-semibold text-slate-900 text-sm mb-2">Tips</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>• Ask about specific compliance requirements</li>
              <li>• Request help drafting SOPs or policies</li>
              <li>• Get explanations for complex regulations</li>
              <li>• Ask for compliance best practices</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-indigo-600' : 'bg-indigo-100'
      }`}>
        {isUser ? (
          <User size={16} className="text-white" />
        ) : (
          <Bot size={16} className="text-indigo-600" />
        )}
      </div>
      <div className={`max-w-[75%] ${isUser ? 'text-right' : ''}`}>
        <div className={`rounded-2xl px-4 py-3 ${
          isUser 
            ? 'bg-indigo-600 text-white rounded-tr-none' 
            : 'bg-slate-100 text-slate-700 rounded-tl-none'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
