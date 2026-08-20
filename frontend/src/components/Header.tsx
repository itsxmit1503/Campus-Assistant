'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, MessageSquare, MapPin, HelpCircle, Menu, X, Landmark } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/explore', label: 'Explore', icon: Compass },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/where-to-go', label: 'Not Sure Where To Go?', icon: HelpCircle },
  { href: '/map', label: 'Campus Map', icon: MapPin },
];

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-campus-border bg-campus-surface/95 backdrop-blur-sm transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-campus-green text-white flex items-center justify-center font-heading font-bold text-sm shadow-subtle group-hover:bg-campus-greenHover transition-colors">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <span className="font-heading font-bold text-base tracking-tight text-campus-text block leading-none">
                DHSGSU
              </span>
              <span className="text-[11px] font-medium text-campus-muted tracking-wide block uppercase mt-0.5">
                Campus Assistant
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-campus-greenLight text-campus-green font-semibold dark:bg-campus-greenDark dark:text-emerald-300'
                      : 'text-campus-muted hover:text-campus-text hover:bg-campus-surfaceHover'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg border border-campus-border text-campus-text hover:bg-campus-surfaceHover transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-campus-border flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-campus-greenLight text-campus-green font-semibold dark:bg-campus-greenDark dark:text-emerald-300'
                      : 'text-campus-muted hover:text-campus-text hover:bg-campus-surfaceHover'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
