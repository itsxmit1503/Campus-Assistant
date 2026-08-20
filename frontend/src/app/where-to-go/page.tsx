'use client';

import React from 'react';
import NotSureWhereToGoWizard from '../../components/NotSureWhereToGoWizard';
import Link from 'next/link';
import { MessageSquare, ArrowLeft } from 'lucide-react';

export default function WhereToGoPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-campus-muted hover:text-campus-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>

        <Link
          href="/chat"
          className="inline-flex items-center gap-1 text-xs font-semibold text-campus-green hover:underline"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Prefer free-form Chat?</span>
        </Link>
      </div>

      <NotSureWhereToGoWizard />
    </div>
  );
}
