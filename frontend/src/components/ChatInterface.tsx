'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, RefreshCw, Sparkles, User, Landmark } from 'lucide-react';
import { ChatMessage, StructuredAnswer } from '../types';
import { sendChatMessage } from '../lib/api';
import { useLanguage } from '../lib/languageContext';
import StructuredAnswerCard from './StructuredAnswerCard';

interface ChatInterfaceProps {
  initialPrompt?: string;
  className?: string;
}

const SUGGESTED_PROMPTS = [
  'Meri scholarship nahi aayi, kya karu?',
  'Marksheet mein correction karwana hai.',
  'MCA department kaha hai?',
  'Library kaha hai and Sunday ko khuli rehti hai kya?',
  'Hostel kaise milega aur form kahan jama karein?',
  "I'm new here, what should I do after admission?",
  'University mein medical facility hai kya?'
];

export default function ChatInterface({ initialPrompt = '', className = '' }: ChatInterfaceProps) {
  const { language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialPrompt);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim() !== '') {
      handleSend(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Build conversation history for context
      const history = newMessages.slice(-6).map(m => ({
        role: m.role,
        content: m.content
      }));

      const structuredAnswer = await sendChatMessage(query, history, language);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: structuredAnswer.answer,
        structuredData: structuredAnswer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('[ChatInterface] Error during chat exchange:', err);
      const errorMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: "I couldn't reach the campus assistant right now. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`flex flex-col h-[650px] max-h-[85vh] rounded-2xl border border-campus-border bg-campus-surface shadow-subtle overflow-hidden ${className}`}>
      
      {/* Chat header */}
      <div className="px-5 py-3.5 border-b border-campus-border bg-campus-surfaceAlt flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-campus-green text-white flex items-center justify-center font-bold text-xs">
            <Landmark className="w-4 h-4" />
          </div>
          <div>
            <div className="font-heading font-semibold text-xs text-campus-text">
              DHSGSU Campus Assistant
            </div>
            <div className="text-[11px] text-campus-muted flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Online • Problem-to-Place Guide</span>
            </div>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-xs text-campus-muted hover:text-campus-text px-2.5 py-1 rounded border border-campus-border hover:bg-campus-surface transition-colors"
          >
            Clear Conversation
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center max-w-lg mx-auto py-8">
            <div className="w-12 h-12 rounded-xl bg-campus-greenLight dark:bg-campus-greenDark text-campus-green dark:text-emerald-300 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-lg text-campus-text mb-1">
              How can I help you around campus?
            </h3>
            <p className="text-xs text-campus-muted mb-6 leading-relaxed">
              Ask any question in English, Hindi, Hinglish, or your preferred language. You don&apos;t need to know the office name—just tell us what problem you need to solve.
            </p>

            <div className="w-full space-y-2 text-left">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-campus-muted mb-2 px-1">
                Suggested Questions
              </div>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(prompt)}
                    className="text-left text-xs p-3 rounded-lg border border-campus-border bg-campus-surface hover:bg-campus-surfaceHover hover:border-campus-green text-campus-text transition-all flex items-center justify-between group"
                  >
                    <span>&ldquo;{prompt}&rdquo;</span>
                    <span className="text-campus-muted group-hover:text-campus-green opacity-0 group-hover:opacity-100 transition-opacity">
                      →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-campus-green text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">
                  D
                </div>
              )}

              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-campus-green text-white rounded-br-none shadow-subtle'
                    : 'bg-campus-surfaceAlt border border-campus-border rounded-bl-none text-campus-text'
                }`}
              >
                {msg.role === 'user' ? (
                  <div className="whitespace-pre-line font-medium">{msg.content}</div>
                ) : msg.structuredData ? (
                  <StructuredAnswerCard
                    data={msg.structuredData}
                    onSelectTopic={(topic) => handleSend(topic)}
                  />
                ) : (
                  <div className="whitespace-pre-line">{msg.content}</div>
                )}

                {msg.error && (
                  <div className="mt-3 pt-2 border-t border-red-200 dark:border-red-900/50 flex items-center gap-2">
                    <button
                      onClick={() => handleSend(messages[messages.length - 2]?.content || '')}
                      className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry request
                    </button>
                  </div>
                )}

                <div
                  className={`text-[10px] mt-2 text-right ${
                    msg.role === 'user' ? 'text-emerald-100' : 'text-campus-muted'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-campus-tagBg text-campus-text flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-medium border border-campus-border">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-campus-green text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
              D
            </div>
            <div className="rounded-xl px-4 py-3 bg-campus-surfaceAlt border border-campus-border rounded-bl-none text-xs text-campus-muted flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-campus-green animate-ping"></span>
              <span>Checking university information...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="p-3 sm:p-4 border-t border-campus-border bg-campus-surface">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What do you need help with? (English, Hindi, Hinglish...)"
              disabled={loading}
              className="w-full pl-4 pr-10 py-3 text-sm rounded-xl border border-campus-border bg-campus-surface text-campus-text placeholder-campus-muted focus:outline-none focus:border-campus-green focus:ring-1 focus:ring-campus-green transition-all"
            />
            <button
              type="button"
              title="Voice input (Ready for upcoming release)"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-campus-muted hover:text-campus-text transition-colors"
              onClick={() => alert("Voice input preparation mode: Voice recognition will be enabled in upcoming release.")}
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          <button
            type="submit"
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className="px-4 py-3 rounded-xl bg-campus-green text-white hover:bg-campus-greenHover disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center font-medium shadow-subtle"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
