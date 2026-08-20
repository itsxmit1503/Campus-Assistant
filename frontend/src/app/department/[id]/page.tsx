'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  MapPin, 
  GraduationCap, 
  Mail, 
  Phone, 
  ExternalLink, 
  ArrowLeft, 
  MessageSquare, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { departmentsData } from '../../../data';

export default function DepartmentDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const dept = departmentsData.find(d => d.id === id || d.id.toLowerCase().includes(id.toLowerCase())) || departmentsData[0];

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Navigation back */}
      <div className="flex items-center justify-between">
        <Link
          href="/explore?tab=academic"
          className="inline-flex items-center gap-1.5 text-xs text-campus-muted hover:text-campus-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Academic Directory</span>
        </Link>

        <Link
          href={`/chat?q=${encodeURIComponent(dept.name)}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-campus-green text-white text-xs font-semibold hover:bg-campus-greenHover transition-colors shadow-subtle"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Ask About This Department</span>
        </Link>
      </div>

      {/* Main card */}
      <div className="rounded-2xl border border-campus-border bg-campus-surface p-6 sm:p-8 space-y-6 shadow-subtle">
        
        <div className="space-y-2 border-b border-campus-border pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-campus-green bg-campus-greenLight dark:bg-campus-greenDark px-3 py-1 rounded-full">
              {dept.schoolName}
            </span>
            {dept.verified && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-3 h-3" />
                Verified DHSGSU Department
              </span>
            )}
          </div>

          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-campus-text">
            {dept.name}
          </h1>

          <p className="text-sm text-campus-muted leading-relaxed pt-1">
            {dept.description}
          </p>
        </div>

        {/* Programmes Offered */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-campus-muted">
            <GraduationCap className="w-4 h-4 text-campus-green" />
            <span>Academic Programmes Offered</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {dept.programmes.map((prog, idx) => (
              <span
                key={idx}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-campus-border bg-campus-surfaceAlt text-campus-text"
              >
                {prog}
              </span>
            ))}
          </div>
        </div>

        {/* Location & Building */}
        <div className="space-y-2.5 pt-4 border-t border-campus-border">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-campus-muted">
            <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Campus Location</span>
          </div>
          <div className="p-4 rounded-xl border border-campus-border bg-campus-surfaceAlt flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-semibold text-campus-text text-sm">{dept.building}</div>
              <div className="text-campus-muted mt-0.5">{dept.location}</div>
            </div>
            {dept.mapLink && (
              <a
                href={dept.mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-campus-green hover:underline font-semibold flex-shrink-0"
              >
                <span>View on Map</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Contact Info */}
        {dept.contact && (
          <div className="space-y-2.5 pt-4 border-t border-campus-border">
            <div className="text-xs font-semibold uppercase tracking-wider text-campus-muted">
              Official Department Contacts
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-campus-muted">
              {dept.contact.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-campus-green" />
                  <span>Email: <strong className="text-campus-text">{dept.contact.email}</strong></span>
                </div>
              )}
              {dept.contact.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-campus-green" />
                  <span>Phone: <strong className="text-campus-text">{dept.contact.phone}</strong></span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Official Source link */}
        <div className="pt-4 border-t border-campus-border flex items-center justify-between text-xs text-campus-muted">
          <span>Source: Official DHSGSU Website</span>
          <a
            href={dept.officialSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-campus-green hover:underline font-medium"
          >
            <span>Visit Department Webpage</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </div>
    </div>
  );
}
