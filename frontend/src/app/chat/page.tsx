'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ChatInterface from '../../components/ChatInterface';
import { ShieldCheck } from 'lucide-react';

function ChatContent() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get('q') || '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-campus-text">
            Campus Assistant Chat
          </h1>
          <p className="text-xs sm:text-sm text-campus-muted mt-0.5">
            Ask any question in English, Hindi, Hinglish, or your native language.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 text-xs text-campus-green bg-campus-greenLight dark:bg-campus-greenDark px-3 py-1 rounded-full w-fit">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Grounded in Official DHSGSU Data</span>
        </div>
      </div>

      <ChatInterface initialPrompt={initialPrompt} />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-campus-muted">Loading assistant...</div>}>
      <ChatContent />
    </Suspense>
  );
}
