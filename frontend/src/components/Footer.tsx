'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-campus-border bg-campus-surface/60 mt-12 py-8 transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-xs text-campus-muted">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-heading font-semibold text-campus-text">
              Dr. Harisingh Gour Vishwavidyalaya, Sagar
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-campus-green border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="w-3 h-3" />
              Verified Official Data
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <a
              href="https://dhsgsu.edu.in/index.php/en/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-campus-green transition-colors"
            >
              Official Website <ExternalLink className="w-3 h-3" />
            </a>
            <Link href="/explore" className="hover:text-campus-green transition-colors">
              Explore Campus
            </Link>
            <Link href="/where-to-go" className="hover:text-campus-green transition-colors">
              Problem Solver
            </Link>
            <Link href="/map" className="hover:text-campus-green transition-colors">
              Campus Map
            </Link>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-campus-border flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <p>
            An official student-first navigation system. Central University (NAAC &apos;A&apos; Grade).
          </p>
          <p className="text-campus-muted">
            Patharia Hills, Sagar (M.P.) 470003
          </p>
        </div>
      </div>
    </footer>
  );
}
