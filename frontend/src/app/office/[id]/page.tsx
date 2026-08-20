'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  CheckCircle2, 
  ExternalLink, 
  ArrowLeft, 
  MessageSquare, 
  ShieldCheck,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { officesData, servicesData } from '../../../data';

export default function OfficeDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const office = officesData.find(o => o.id === id || o.id.toLowerCase().includes(id.toLowerCase())) || officesData[0];
  const handledServices = servicesData.filter(s => office.servicesHandled.includes(s.id));

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          href="/explore?tab=administrative"
          className="inline-flex items-center gap-1.5 text-xs text-campus-muted hover:text-campus-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Administrative Directory</span>
        </Link>

        <Link
          href={`/chat?q=${encodeURIComponent(office.name)}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-campus-green text-white text-xs font-semibold hover:bg-campus-greenHover transition-colors shadow-subtle"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Ask About This Office</span>
        </Link>
      </div>

      <div className="rounded-2xl border border-campus-border bg-campus-surface p-6 sm:p-8 space-y-6 shadow-subtle">
        
        <div className="space-y-2 border-b border-campus-border pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-900/50">
              {office.category}
            </span>
            {office.verified && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-3 h-3" />
                Verified DHSGSU Administrative Unit
              </span>
            )}
          </div>

          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-campus-text">
            {office.name}
          </h1>

          {office.hindiName && (
            <p className="text-sm text-campus-muted font-medium">
              {office.hindiName}
            </p>
          )}
        </div>

        {/* Responsibilities */}
        <div className="space-y-2.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-campus-muted">
            Key Responsibilities Handled
          </div>
          <ul className="space-y-1.5 text-xs text-campus-text">
            {office.responsibilities.map((resp, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-campus-green font-bold">•</span>
                <span>{resp}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Common Student Problems */}
        <div className="space-y-2.5 pt-4 border-t border-campus-border">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-campus-muted">
            <HelpCircle className="w-4 h-4 text-campus-green" />
            <span>Common Student Inquiries Solved Here</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {office.commonStudentProblems.map((prob, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-campus-border bg-campus-surfaceAlt text-xs text-campus-text flex items-center justify-between"
              >
                <span>&ldquo;{prob}&rdquo;</span>
                <Link
                  href={`/chat?q=${encodeURIComponent(prob)}`}
                  className="text-campus-green hover:underline text-[11px] font-medium flex items-center gap-0.5 ml-2 flex-shrink-0"
                >
                  <span>Solve</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Location & Timings */}
        <div className="space-y-2.5 pt-4 border-t border-campus-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-campus-border bg-campus-surfaceAlt space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-campus-text">
                <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Office Location</span>
              </div>
              <div className="text-campus-muted">{office.location}</div>
              {office.floor && <div className="text-campus-muted text-[11px]">Floor: {office.floor}</div>}
            </div>

            <div className="p-4 rounded-xl border border-campus-border bg-campus-surfaceAlt space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-campus-text">
                <Clock className="w-3.5 h-3.5 text-campus-green" />
                <span>Working Hours</span>
              </div>
              <div className="text-campus-muted">{office.officeHours || '10:00 AM - 5:30 PM (Mon-Fri)'}</div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        {office.contact && (
          <div className="space-y-2.5 pt-4 border-t border-campus-border">
            <div className="text-xs font-semibold uppercase tracking-wider text-campus-muted">
              Official Helpline & Inquiries
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-campus-muted">
              {office.contact.helpline && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-campus-green" />
                  <span>Helpline: <strong className="text-campus-text">{office.contact.helpline}</strong></span>
                </div>
              )}
              {office.contact.phone && !office.contact.helpline && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-campus-green" />
                  <span>Phone: <strong className="text-campus-text">{office.contact.phone}</strong></span>
                </div>
              )}
              {office.contact.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-campus-green" />
                  <span>Email: <strong className="text-campus-text">{office.contact.email}</strong></span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Official Source link */}
        <div className="pt-4 border-t border-campus-border flex items-center justify-between text-xs text-campus-muted">
          <span>Source: Official DHSGSU Administration</span>
          <a
            href={office.officialSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-campus-green hover:underline font-medium"
          >
            <span>Official Portal Link</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </div>
    </div>
  );
}
