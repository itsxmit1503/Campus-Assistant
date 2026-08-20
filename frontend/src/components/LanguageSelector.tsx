'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Languages, ChevronDown } from 'lucide-react';
import { useLanguage, SUPPORTED_LANGUAGES, SupportedLanguage } from '../lib/languageContext';

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentOption = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-campus-border text-campus-text hover:bg-campus-surfaceHover transition-colors focus-visible:ring-2 focus-visible:ring-campus-green"
      >
        <Languages className="w-3.5 h-3.5 text-campus-green" />
        <span>{currentOption.nativeLabel}</span>
        <ChevronDown className="w-3 h-3 text-campus-muted" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-48 max-h-72 overflow-y-auto rounded-lg border border-campus-border bg-campus-surface shadow-elevated z-50 py-1">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-campus-muted uppercase tracking-wider border-b border-campus-border">
            Select Language
          </div>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code as SupportedLanguage);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                language === lang.code
                  ? 'bg-campus-greenLight text-campus-green font-semibold dark:bg-campus-greenDark dark:text-emerald-300'
                  : 'text-campus-text hover:bg-campus-surfaceHover'
              }`}
            >
              <span>{lang.nativeLabel}</span>
              <span className="text-[11px] text-campus-muted">{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
