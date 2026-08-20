'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Send, Mic } from 'lucide-react';

interface QuickSearchPromptProps {
  onSearch?: (query: string) => void;
}

export default function QuickSearchPrompt({ onSearch }: QuickSearchPromptProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    if (onSearch) {
      onSearch(trimmed);
    } else {
      router.push(`/chat?q=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-center shadow-subtle rounded-2xl border border-campus-border bg-campus-surface p-1.5 focus-within:border-campus-green focus-within:ring-2 focus-within:ring-campus-green/20 transition-all">
        <div className="pl-3.5 text-campus-muted">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you need help with? (e.g. Meri scholarship nahi aayi, Hostel kaise milega...)"
          className="w-full px-3 py-3.5 text-sm sm:text-base bg-transparent text-campus-text placeholder-campus-muted focus:outline-none"
        />
        <div className="flex items-center gap-1 pr-1.5">
          <button
            type="button"
            title="Voice input (Ready for upcoming release)"
            onClick={() => alert("Voice input preparation mode: Voice recognition will be enabled in upcoming release.")}
            className="p-2 text-campus-muted hover:text-campus-text hover:bg-campus-surfaceHover rounded-xl transition-colors hidden sm:flex"
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={!query.trim()}
            className="px-4 py-2.5 rounded-xl bg-campus-green text-white font-medium hover:bg-campus-greenHover disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </form>
  );
}
