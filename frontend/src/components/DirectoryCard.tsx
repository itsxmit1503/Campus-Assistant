'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Building2, 
  MapPin, 
  ArrowRight, 
  ExternalLink, 
  ShieldCheck, 
  GraduationCap, 
  FileText 
} from 'lucide-react';
import { Department, AdministrativeOffice, StudentService, CampusLocation } from '../types';

interface DepartmentCardProps {
  type: 'department';
  data: Department;
}

interface OfficeCardProps {
  type: 'office';
  data: AdministrativeOffice;
}

interface ServiceCardProps {
  type: 'service';
  data: StudentService;
}

interface LocationCardProps {
  type: 'location';
  data: CampusLocation;
}

type DirectoryCardProps = DepartmentCardProps | OfficeCardProps | ServiceCardProps | LocationCardProps;

export default function DirectoryCard(props: DirectoryCardProps) {
  if (props.type === 'department') {
    const d = props.data;
    return (
      <div className="rounded-xl border border-campus-border bg-campus-surface p-5 hover:border-campus-green transition-all shadow-subtle flex flex-col justify-between group">
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-[11px] font-semibold text-campus-green bg-campus-greenLight dark:bg-campus-greenDark px-2.5 py-0.5 rounded-full">
              {d.schoolName}
            </span>
            {d.verified && (
              <span className="text-emerald-700 dark:text-emerald-300 text-[11px] flex items-center gap-0.5">
                <ShieldCheck className="w-3 h-3" /> Official
              </span>
            )}
          </div>
          <h3 className="font-heading font-bold text-base text-campus-text group-hover:text-campus-green transition-colors">
            {d.name}
          </h3>
          <p className="text-xs text-campus-muted line-clamp-2 mt-1.5 leading-relaxed">
            {d.description}
          </p>

          <div className="mt-3 pt-3 border-t border-campus-border/60 space-y-1.5 text-xs text-campus-muted">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-campus-muted flex-shrink-0" />
              <span className="truncate">{d.location}</span>
            </div>
            {d.programmes && d.programmes.length > 0 && (
              <div className="flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-campus-muted flex-shrink-0" />
                <span className="truncate">{d.programmes.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-campus-border flex items-center justify-between text-xs">
          <Link
            href={`/department/${d.id}`}
            className="font-medium text-campus-green hover:underline flex items-center gap-1"
          >
            <span>View Details</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
          <a
            href={d.officialSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-campus-muted hover:text-campus-text flex items-center gap-1"
          >
            <span>Portal</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  }

  if (props.type === 'office') {
    const o = props.data;
    return (
      <div className="rounded-xl border border-campus-border bg-campus-surface p-5 hover:border-campus-green transition-all shadow-subtle flex flex-col justify-between group">
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/50">
              {o.category}
            </span>
            {o.verified && (
              <span className="text-emerald-700 dark:text-emerald-300 text-[11px] flex items-center gap-0.5">
                <ShieldCheck className="w-3 h-3" /> Verified Office
              </span>
            )}
          </div>
          <h3 className="font-heading font-bold text-base text-campus-text group-hover:text-campus-green transition-colors">
            {o.name}
          </h3>
          <div className="text-xs text-campus-muted mt-1.5 line-clamp-2">
            Handles: {o.responsibilities.slice(0, 2).join('; ')}
          </div>

          <div className="mt-3 pt-3 border-t border-campus-border/60 space-y-1.5 text-xs text-campus-muted">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-campus-muted flex-shrink-0" />
              <span className="truncate">{o.location}</span>
            </div>
            {o.officeHours && (
              <div className="text-[11px] text-campus-muted">
                Hours: {o.officeHours}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-campus-border flex items-center justify-between text-xs">
          <Link
            href={`/office/${o.id}`}
            className="font-medium text-campus-green hover:underline flex items-center gap-1"
          >
            <span>View Office Process</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
          {o.contact?.helpline && (
            <span className="text-[11px] font-semibold text-campus-text">
              {o.contact.helpline}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (props.type === 'service') {
    const s = props.data;
    return (
      <div className="rounded-xl border border-campus-border bg-campus-surface p-5 hover:border-campus-green transition-all shadow-subtle flex flex-col justify-between group">
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-[11px] font-semibold text-campus-green bg-campus-greenLight dark:bg-campus-greenDark px-2.5 py-0.5 rounded-full">
              {s.category}
            </span>
            <span className="text-[11px] text-campus-muted">
              {s.requiredDocuments.length} docs required
            </span>
          </div>
          <h3 className="font-heading font-bold text-base text-campus-text group-hover:text-campus-green transition-colors">
            {s.name}
          </h3>
          <p className="text-xs text-campus-muted line-clamp-2 mt-1.5 leading-relaxed">
            {s.description}
          </p>

          <div className="mt-3 pt-3 border-t border-campus-border/60 space-y-1.5 text-xs text-campus-muted">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-campus-muted flex-shrink-0" />
              <span className="truncate font-medium text-campus-text">{s.responsibleOfficeName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-campus-muted flex-shrink-0" />
              <span className="truncate">{s.location}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-campus-border flex items-center justify-between text-xs">
          <Link
            href={`/service/${s.id}`}
            className="font-medium text-campus-green hover:underline flex items-center gap-1"
          >
            <span>What to do & Documents</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
          <Link
            href={`/chat?q=${encodeURIComponent(s.name)}`}
            className="text-campus-muted hover:text-campus-green text-[11px]"
          >
            Ask Assistant
          </Link>
        </div>
      </div>
    );
  }

  // Location Card
  const l = props.data;
  return (
    <div className="rounded-xl border border-campus-border bg-campus-surface p-5 hover:border-campus-green transition-all shadow-subtle flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-campus-muted bg-campus-tagBg px-2 py-0.5 rounded">
            {l.type}
          </span>
          <span className="text-[11px] text-campus-muted">
            Patharia Hills
          </span>
        </div>
        <h3 className="font-heading font-bold text-base text-campus-text group-hover:text-campus-green transition-colors">
          {l.name}
        </h3>
        <p className="text-xs text-campus-muted mt-1.5 leading-relaxed">
          {l.description}
        </p>
        {l.landmark && (
          <div className="mt-2 text-xs text-campus-muted flex items-center gap-1">
            <MapPin className="w-3 h-3 text-amber-600 flex-shrink-0" />
            <span>Landmark: {l.landmark}</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-campus-border flex items-center justify-between text-xs">
        <a
          href={l.mapLink}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-campus-green hover:underline flex items-center gap-1"
        >
          <span>Open in Google Maps</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
