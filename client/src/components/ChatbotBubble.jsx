import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Loader2, Compass, HelpCircle, AlertTriangle } from 'lucide-react';

export default function ChatbotBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! 🚴 Welcome to City Cycling! How can we help you get riding today?\n\nPlease choose from the options below:\n1️⃣ About the process (Location, Timings, Pricing, Deposit, Delivery)\n2️⃣ Other (Real-time availability, bookings, cancellation, rules, trails, maintenance help)'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState('');
  const messagesEndRef = useRef(null);

  // Generate or retrieve persistent thread_id for conversation state
  useEffect(() => {
    let savedThreadId = sessionStorage.getItem('ai_thread_id');
    if (!savedThreadId) {
      savedThreadId = `thread-${Math.random().toString(36).substring(2, 11)}`;
      sessionStorage.setItem('ai_thread_id', savedThreadId);
    }
    setThreadId(savedThreadId);
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const messageText = textToSend || input;
    if (!messageText.trim()) return;

    // Add user message
    const userMessage = { role: 'user', content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          thread_id: threadId,
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      
      // Add assistant response
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response || "I didn't catch that, could you please repeat?" }
      ]);
    } catch (err) {
      console.error('Chatbot request error:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "I'm having trouble connecting to my brain right now. 🧠 Connection refused. Please try again or ping us on WhatsApp!" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (text) => {
    handleSend(text);
  };

  const getMenuOptions = (content) => {
    if (!content) return [];
    const lines = content.split('\n');
    const options = [];
    const optionRegex = /^(\d+(?:\.\d+)?)(?:️⃣|\.|:)?\s+(.+)$/;
    for (const line of lines) {
      const match = line.trim().match(optionRegex);
      if (match) {
        const num = match[1];
        const label = match[2].trim();
        if (label.length < 100) {
          options.push({ num, label });
        }
      }
    }
    return options;
  };

  const renderMessageContent = (content) => {
    if (!content) return null;
    const lines = content.split('\n');
    const mdRegex = /(\*\*.*?\*\*|\*.*?\*)/g;
    const optionRegex = /^(\d+(?:\.\d+)?)(?:️⃣|\.|:)?\s+(.+)$/;

    const parseLineMarkup = (text) => {
      const tokens = text.split(mdRegex);
      return tokens.map((token, idx) => {
        if (token.startsWith('**') && token.endsWith('**')) {
          return <strong key={idx} className="font-semibold text-gray-900">{token.slice(2, -2)}</strong>;
        } else if (token.startsWith('*') && token.endsWith('*')) {
          return <em key={idx} className="italic text-gray-800">{token.slice(1, -1)}</em>;
        }
        return token;
      });
    };

    return lines.map((line, lineIdx) => {
      const trimmed = line.trim();

      // Skip rendering the numbered menu options inside the chat text
      if (optionRegex.test(trimmed)) {
        return null;
      }

      // Skip rendering empty lines
      if (!trimmed) {
        return <div key={lineIdx} className="h-2" />;
      }

      // Check for headers (e.g. "### Title" or "📋 **About the process**:")
      if (trimmed.startsWith('###')) {
        return (
          <h4 key={lineIdx} className="text-sm font-bold text-gray-900 mt-3 mb-1">
            {parseLineMarkup(trimmed.replace(/^###\s*/, ''))}
          </h4>
        );
      }

      // Check for bullet lists (e.g. "* Bullet text")
      const bulletMatch = line.match(/^(\s*)([*+-])\s+(.+)$/);
      if (bulletMatch) {
        const indent = bulletMatch[1].length;
        const textContent = bulletMatch[3];
        const paddingLeft = indent > 0 ? `${indent * 6}px` : '2px';

        return (
          <div key={lineIdx} className="flex items-start my-0.5 text-xs leading-relaxed" style={{ paddingLeft }}>
            <span className="text-blue-500 mr-2 select-none font-black">•</span>
            <span className="flex-1 text-gray-700">{parseLineMarkup(textContent)}</span>
          </div>
        );
      }

      // Regular text line
      return (
        <div key={lineIdx} className="text-xs leading-relaxed text-gray-700 my-0.5">
          {parseLineMarkup(line)}
        </div>
      );
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 transform hover:scale-105 active:scale-95 group"
          aria-label="Open Chat with Us"
        >
          <MessageSquare className="w-6 h-6 transition-transform group-hover:rotate-6" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        </button>
      )}

      {/* Chat Window Container */}
      {isOpen && (
        <div className="w-[360px] h-[500px] bg-white/95 backdrop-blur-md border border-gray-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-4 flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <span className="text-xl">🚴</span>
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Chat with Us</h3>
                <span className="text-[10px] text-emerald-300 font-medium flex items-center">
                  <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full mr-1 animate-pulse"></span>
                  Online & Active
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                  }`}
                  style={msg.role === 'user' ? { whiteSpace: 'pre-wrap' } : {}}
                >
                  {msg.role === 'user' ? msg.content : renderMessageContent(msg.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="text-xs text-gray-500 font-medium">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Dynamic / Fallback Quick Actions */}
          {!loading && (() => {
            const lastMessage = messages[messages.length - 1];
            if (!lastMessage || lastMessage.role !== 'assistant') return null;

            const dynamicOptions = getMenuOptions(lastMessage.content);
            const isNotRoot = messages.length > 1;
            const hasDynamic = dynamicOptions.length > 0;

            if (hasDynamic || isNotRoot) {
              return (
                <div className="px-4 py-2 border-t border-gray-100 bg-white flex flex-col space-y-1.5 max-h-[140px] overflow-y-auto">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-0.5">
                    {hasDynamic ? "Select an Option" : "Navigation"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {dynamicOptions.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickAction(opt.num)}
                        className="flex items-center space-x-1 text-left text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border border-blue-200/60 rounded-xl px-3 py-1.5 transition-all font-medium"
                      >
                        <span>{opt.label}</span>
                      </button>
                    ))}
                    {isNotRoot && (
                      <>
                        <button
                          onClick={() => handleQuickAction('process')}
                          className="flex items-center space-x-1 text-left text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-800 border border-gray-200 rounded-xl px-3 py-1.5 transition-all font-medium"
                        >
                          <span>↩️ Process Menu</span>
                        </button>
                        <button
                          onClick={() => handleQuickAction('back')}
                          className="flex items-center space-x-1 text-left text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-800 border border-gray-200 rounded-xl px-3 py-1.5 transition-all font-medium"
                        >
                          <span>↩️ Main Menu</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            }

            if (messages.length === 1) {
              return (
                <div className="px-4 py-2 border-t border-gray-100 bg-white flex flex-col space-y-1.5">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-0.5">Quick Actions</p>
                  <button
                    onClick={() => handleQuickAction('Check cycle rates and availability')}
                    className="flex items-center space-x-2 text-left text-xs bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 border border-gray-100 rounded-xl px-3 py-2 transition-all"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Check cycle rates and availability</span>
                  </button>
                  <button
                    onClick={() => handleQuickAction('What is the Hessarghatta loop distance?')}
                    className="flex items-center space-x-2 text-left text-xs bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 border border-gray-100 rounded-xl px-3 py-2 transition-all"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>What is the Hessarghatta loop distance?</span>
                  </button>
                  <button
                    onClick={() => handleQuickAction('My tire punctured on the way to Nandi Hills!')}
                    className="flex items-center space-x-2 text-left text-xs bg-gray-50 hover:bg-red-50 text-gray-700 hover:text-red-700 border border-gray-100 rounded-xl px-3 py-2 transition-all"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Emergency: Tire punctured on Nandi Hills</span>
                  </button>
                </div>
              );
            }
            return null;
          })()}

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-gray-100 bg-white flex items-center space-x-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none transition-all duration-300 transform active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
