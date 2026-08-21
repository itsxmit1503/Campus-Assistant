'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, RefreshCw, Sparkles, User, Landmark, Trash2 } from 'lucide-react';
import { ChatMessage, StructuredAnswer } from '../types';
import { sendChatMessage, getChatHistory, clearChatConversation } from '../lib/api';
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
  const [conversationId, setConversationId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Initialize Conversation Session & Load Persisted Messages
  useEffect(() => {
    let savedConvId = '';
    try {
      savedConvId = localStorage.getItem('dhsgsu_chat_conversation_id') || '';
      if (!savedConvId) {
        savedConvId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('dhsgsu_chat_conversation_id', savedConvId);
      }
      setConversationId(savedConvId);

      // Load cached messages from localStorage for instant offline/fast load
      const savedMessagesJson = localStorage.getItem('dhsgsu_cached_messages');
      if (savedMessagesJson) {
        const parsed = JSON.parse(savedMessagesJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }

      // Sync latest history from backend asynchronously
      getChatHistory(savedConvId).then(history => {
        if (history && Array.isArray(history.messages) && history.messages.length > 0) {
          const formatted: ChatMessage[] = history.messages.map(m => ({
            id: m.messageId,
            role: m.role,
            content: m.content,
            structuredData: m.structuredData,
            timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
          setMessages(formatted);
          localStorage.setItem('dhsgsu_cached_messages', JSON.stringify(formatted));
        }
      });
    } catch (e) {
      console.warn('[ChatInterface] Local storage not accessible:', e);
    }
  }, []);

  // 2. Persist messages locally on change
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem('dhsgsu_cached_messages', JSON.stringify(messages));
      }
    } catch (e) {
      console.warn('[ChatInterface] Failed to save messages to local storage:', e);
    }
  }, [messages]);

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

    const clientMsgId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userMessage: ChatMessage = {
      id: clientMsgId,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Build compact bounded conversation history (token-efficient)
      const history = newMessages.slice(-6).map(m => ({
        role: m.role,
        content: m.content
      }));

      const structuredAnswer = await sendChatMessage(
        query,
        conversationId,
        history,
        language,
        clientMsgId
      );

      const assistantMessage: ChatMessage = {
        id: structuredAnswer.messageId || `assistant_${Date.now()}`,
        role: 'assistant',
        content: structuredAnswer.answer,
        structuredData: structuredAnswer,
        timestamp: structuredAnswer.serverTimestamp
          ? new Date(structuredAnswer.serverTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => {
        // Prevent duplicate append if message already exists
        if (prev.some(m => m.id === assistantMessage.id)) return prev;
        return [...prev, assistantMessage];
      });
    } catch (err) {
      console.error('[ChatInterface] Error during chat exchange:', err);
      const errorMessage: ChatMessage = {
        id: `err_${Date.now()}`,
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

  const handleClearConversation = async () => {
    try {
      const oldConvId = conversationId;
      // 1. Clear server context & history
      if (oldConvId) {
        clearChatConversation(oldConvId);
      }
      // 2. Clear local storage
      localStorage.removeItem('dhsgsu_cached_messages');
      const newConvId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('dhsgsu_chat_conversation_id', newConvId);
      setConversationId(newConvId);
      // 3. Clear UI state
      setMessages([]);
    } catch (e) {
      setMessages([]);
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
              <span>Online • Grounded & Verified</span>
            </div>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClearConversation}
            className="text-xs text-campus-muted hover:text-red-500 px-2.5 py-1 rounded border border-campus-border hover:bg-campus-surface transition-colors flex items-center gap-1.5"
            title="Clear conversation history and reset context"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Conversation</span>
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
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(prompt)}
                    className="text-xs text-left px-3 py-2 rounded-lg bg-campus-surface border border-campus-border text-campus-muted hover:text-campus-text hover:border-campus-green transition-all shadow-subtle"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={msg.id || index}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-md bg-campus-green text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  D
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-subtle ${
                  msg.role === 'user'
                    ? 'bg-campus-green text-white rounded-tr-none'
                    : 'bg-campus-surface border border-campus-border text-campus-text rounded-tl-none'
                }`}
              >
                {msg.role === 'user' ? (
                  <div className="text-sm font-medium whitespace-pre-wrap">{msg.content}</div>
                ) : msg.structuredData ? (
                  <StructuredAnswerCard data={msg.structuredData} />
                ) : (
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                )}

                <div
                  className={`text-[10px] mt-2 flex items-center justify-end gap-1 ${
                    msg.role === 'user' ? 'text-emerald-100' : 'text-campus-muted'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-md bg-campus-surface border border-campus-border text-campus-muted flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-md bg-campus-green text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 animate-pulse">
              D
            </div>
            <div className="bg-campus-surface border border-campus-border rounded-2xl rounded-tl-none p-4 shadow-subtle flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-campus-green animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 rounded-full bg-campus-green animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 rounded-full bg-campus-green animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span className="text-xs text-campus-muted ml-1">Verifying official records...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-3 sm:p-4 border-t border-campus-border bg-campus-surfaceAlt">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What do you need help with? (English, Hindi, Hinglish...)"
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-campus-border bg-campus-surface text-sm text-campus-text placeholder-campus-muted focus:outline-none focus:border-campus-green transition-colors"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-xl bg-campus-green text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
