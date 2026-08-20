'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ChatInterface from '../../components/ChatInterface';

function ChatContent() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get('q') || '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-campus-text">
          Campus Assistant
        </h1>
        <p className="text-xs sm:text-sm text-campus-muted mt-0.5">
          Ask in English, Hindi, Hinglish, or your preferred language.
        </p>
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
