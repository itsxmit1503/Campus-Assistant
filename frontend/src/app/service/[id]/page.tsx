'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  MapPin, 
  FileText, 
  ArrowRight, 
  ExternalLink, 
  ArrowLeft, 
  MessageSquare, 
  ShieldCheck,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { servicesData, officesData } from '../../../data';

export default function ServiceDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const service = servicesData.find(s => s.id === id || s.id.toLowerCase().includes(id.toLowerCase())) || servicesData[0];
  const responsibleOffice = officesData.find(o => o.id === service.responsibleOfficeId);
  const relatedServices = servicesData.filter(s => service.relatedServices?.includes(s.id));

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Navigation back */}
      <div className="flex items-center justify-between">
        <Link
          href="/explore?tab=services"
          className="inline-flex items-center gap-1.5 text-xs text-campus-muted hover:text-campus-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Services Directory</span>
        </Link>

        <Link
          href={`/chat?q=${encodeURIComponent(service.name)}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-campus-green text-white text-xs font-semibold hover:bg-campus-greenHover transition-colors shadow-subtle"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Ask Assistant About This</span>
        </Link>
      </div>

      <div className="rounded-2xl border border-campus-border bg-campus-surface p-6 sm:p-8 space-y-6 shadow-subtle">
        
        <div className="space-y-2 border-b border-campus-border pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-campus-green bg-campus-greenLight dark:bg-campus-greenDark px-3 py-1 rounded-full">
              {service.category}
            </span>
            {service.verified && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-3 h-3" />
                Verified DHSGSU Service
              </span>
            )}
          </div>

          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-campus-text">
            {service.name}
          </h1>

          <p className="text-sm text-campus-muted leading-relaxed pt-1">
            {service.description}
          </p>
        </div>

        {/* Responsible Office & Campus Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-campus-border bg-campus-surfaceAlt space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-campus-text">
              <Building2 className="w-3.5 h-3.5 text-campus-green" />
              <span>Responsible Office</span>
            </div>
            <div className="font-medium text-campus-text">{service.responsibleOfficeName}</div>
            {responsibleOffice && (
              <Link
                href={`/office/${responsibleOffice.id}`}
                className="text-campus-green hover:underline inline-flex items-center gap-0.5 text-[11px] font-semibold mt-1"
              >
                <span>View Office Hours & Details</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          <div className="p-4 rounded-xl border border-campus-border bg-campus-surfaceAlt space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-campus-text">
              <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Where To Go</span>
            </div>
            <div className="font-medium text-campus-text">{service.location}</div>
            <div className="text-campus-muted text-[11px]">Patharia Hills Campus, Sagar</div>
          </div>
        </div>

        {/* When should you use this (Common Problems) */}
        <div className="space-y-2.5 pt-4 border-t border-campus-border">
          <div className="text-xs font-semibold uppercase tracking-wider text-campus-muted">
            When To Use This Service (Common Problems)
          </div>
          <div className="grid grid-cols-1 gap-2">
            {service.commonProblems.map((prob, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-campus-border bg-campus-surfaceAlt text-xs text-campus-text flex items-center justify-between"
              >
                <span>&ldquo;{prob}&rdquo;</span>
                <Link
                  href={`/chat?q=${encodeURIComponent(prob)}`}
                  className="text-campus-green hover:underline text-[11px] font-semibold ml-2 flex-shrink-0"
                >
                  Ask
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Required Documents */}
        <div className="space-y-2.5 pt-4 border-t border-campus-border">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-campus-muted">
            <FileText className="w-4 h-4 text-campus-green" />
            <span>Documents / Information You Need</span>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-campus-text">
            {service.requiredDocuments.map((doc, idx) => (
              <li key={idx} className="flex items-start gap-1.5 p-2 rounded-lg bg-campus-surfaceAlt border border-campus-border">
                <span className="text-campus-green font-bold">•</span>
                <span>{doc}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Step-by-Step Process */}
        <div className="space-y-2.5 pt-4 border-t border-campus-border">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-campus-muted">
            <CheckCircle2 className="w-4 h-4 text-campus-green" />
            <span>Actionable Step-by-Step Procedure</span>
          </div>
          <ol className="space-y-2 text-xs text-campus-muted">
            {service.process.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="font-semibold text-campus-green w-5 h-5 rounded-full bg-campus-greenLight dark:bg-campus-greenDark flex items-center justify-center flex-shrink-0 text-[11px]">
                  {idx + 1}
                </span>
                <span className="pt-0.5 text-campus-text">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Related Services */}
        {relatedServices.length > 0 && (
          <div className="space-y-2.5 pt-4 border-t border-campus-border">
            <div className="text-xs font-semibold uppercase tracking-wider text-campus-muted flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-campus-green" />
              <span>Related Services You May Also Need</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {relatedServices.map(rel => (
                <Link
                  key={rel.id}
                  href={`/service/${rel.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg border border-campus-border bg-campus-surfaceAlt hover:border-campus-green text-campus-text transition-colors"
                >
                  {rel.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Official Source */}
        <div className="pt-4 border-t border-campus-border flex items-center justify-between text-xs text-campus-muted">
          <span>Source: Official DHSGSU Portal</span>
          <a
            href={service.officialSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-campus-green hover:underline font-medium"
          >
            <span>Visit Official Service Page</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </div>
    </div>
  );
}
