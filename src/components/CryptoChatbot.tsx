import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Loader2, Minus, Maximize2, Bot, User, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { sendChatMessage, ChatMessage } from '../services/aiService';
import Markdown from 'react-markdown';

interface CryptoChatbotProps {
  selectedSymbol: string;
  marketData?: {
    price: number;
    percent: number;
  };
}

export default function CryptoChatbot({ selectedSymbol, marketData }: CryptoChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hello! I'm your CoinsBot AI assistant. I'm currently tracking **${selectedSymbol}**. How can I help you analyze the market today?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSymbol = useRef(selectedSymbol);

  // Sync with symbol change
  useEffect(() => {
    if (selectedSymbol !== lastSymbol.current) {
      lastSymbol.current = selectedSymbol;
      
      const syncPulse = async () => {
        const syncMessage: ChatMessage = { 
          role: 'assistant', 
          content: `🔄 **Neural Link Switched:** Now analyzing **${selectedSymbol}**. Current price is ₱${marketData?.price?.toLocaleString() || '---'}. Give me a moment to recalibrate...`
        };
        setMessages(prev => [...prev, syncMessage]);
        
        // Auto-generate a "Quick Pulse" analysis when changing coins
        setIsLoading(true);
        try {
          const quickPulsePrompt: ChatMessage = { 
            role: 'user', 
            content: `Give me a 2-sentence expert quick pulse analysis on ${selectedSymbol} based on current price data.` 
          };
          const response = await sendChatMessage([...messages, quickPulsePrompt], selectedSymbol, marketData);
          setMessages(prev => [...prev, response]);
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoading(false);
        }
      };

      if (isOpen) {
        syncPulse();
      }
    }
  }, [selectedSymbol, isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const chatHistory = messages.concat(userMessage);
      const response = await sendChatMessage(chatHistory, selectedSymbol, marketData);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-[calc(100vw-32px)] sm:w-[380px] h-[60vh] sm:h-[520px] bg-brand-surface border border-brand-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-brand-border bg-brand-bg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-blue/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-brand-blue" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-brand-text">CoinsBot AI</h3>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
                    <span className="text-[10px] text-gray-400 capitalize">Analyzing {selectedSymbol}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-gray-400"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
            >
              {messages.map((msg, i) => (
                <div 
                  key={i}
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-2xl text-sm leading-relaxed",
                    msg.role === 'user' 
                      ? "bg-brand-blue text-white rounded-tr-none" 
                      : "bg-brand-bg border border-brand-border text-brand-text rounded-tl-none"
                  )}>
                    {msg.role === 'assistant' ? (
                      <div className="markdown-body prose prose-invert prose-sm max-w-none">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 px-1">
                    {msg.role === 'user' ? 'You' : 'CoinsBot'}
                  </span>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-gray-400 text-xs italic">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Thinking...
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-brand-border bg-brand-bg">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ask about market trends..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-sm text-brand-text placeholder:text-gray-500 focus:outline-none focus:border-brand-blue transition-colors pr-10"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-brand-blue hover:bg-brand-blue/10 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-gray-500 mt-2 text-center">
                Powered by Llama 3 • Professional Crypto Analysis
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300",
          isOpen 
            ? "bg-brand-surface border border-brand-border text-brand-text rotate-90" 
            : "bg-brand-blue text-white"
        )}
      >
        {isOpen ? <Minus className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-brand-green border-2 border-brand-bg"></span>
          </span>
        )}
      </motion.button>
    </div>
  );
}
