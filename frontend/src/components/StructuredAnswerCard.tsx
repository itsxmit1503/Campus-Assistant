'use client';

import React from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  ArrowRight, 
  ExternalLink, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';
import { StructuredAnswer } from '../types';

interface StructuredAnswerCardProps {
  data: StructuredAnswer;
  onSelectTopic?: (topic: string) => void;
}

export default function StructuredAnswerCard({ data, onSelectTopic }: StructuredAnswerCardProps) {
  const {
    answer,
    responsibleUnit,
    location,
    contact,
    requiredDocuments,
    nextSteps,
    sources,
    relatedTopics,
    confidence,
    display = {}
  } = data;

  // Check if any structured details should actually be displayed
  const showUnit = display.responsibleUnit && Boolean(responsibleUnit);
  const showLocation = display.location && Boolean(location);
  const showContact = display.contact && Boolean(contact && (contact.phone || contact.email || contact.helpline));
  const showDocs = display.documents && Boolean(requiredDocuments && requiredDocuments.length > 0);
  const showSteps = display.nextSteps && Boolean(nextSteps && nextSteps.length > 0);
  const showSources = display.sources && Boolean(sources && sources.length > 0);
  const showRelated = display.relatedTopics && Boolean(relatedTopics && relatedTopics.length > 0);

  const hasAnyCard = showUnit || showLocation || showContact || showDocs || showSteps;

  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {/* 1. Main Conversational Answer */}
      <div className="text-campus-text whitespace-pre-line font-normal">
        {answer}
      </div>

      {/* 2. Structured Card Container (Rendered ONLY when relevant to the user request) */}
      {hasAnyCard && (
        <div className="rounded-xl border border-campus-border bg-campus-surface p-4 space-y-3.5 shadow-subtle my-2">
          
          {/* Responsible Office */}
          {showUnit && responsibleUnit && (
            <div className="flex items-start gap-3 pb-3 border-b border-campus-border">
              <div className="w-8 h-8 rounded-lg bg-campus-greenLight dark:bg-campus-greenDark text-campus-green dark:text-emerald-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-campus-muted">
                  Responsible Unit
                </div>
                <div className="font-heading font-semibold text-campus-text text-sm">
                  {responsibleUnit.name}
                </div>
                {responsibleUnit.officeHours && (
                  <div className="text-xs text-campus-muted mt-0.5">
                    Hours: {responsibleUnit.officeHours}
                  </div>
                )}
              </div>
              {confidence === 'verified_official' && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex-shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>
          )}

          {/* Location Card */}
          {showLocation && location && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-campus-muted">
                  Campus Location
                </div>
                <div className="font-medium text-campus-text">
                  {location.name} {location.floor ? `(${location.floor})` : ''}
                </div>
                {location.landmark && (
                  <div className="text-xs text-campus-muted">
                    Landmark: {location.landmark}
                  </div>
                )}
                {location.mapLink && (
                  <a
                    href={location.mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-campus-green hover:underline mt-1"
                  >
                    View on Campus Map <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Contact Details */}
          {showContact && contact && (
            <div className="pt-2 border-t border-campus-border flex flex-wrap items-center gap-4 text-xs text-campus-muted">
              {contact.helpline && (
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-campus-green" />
                  <span>Helpline: <strong className="text-campus-text">{contact.helpline}</strong></span>
                </div>
              )}
              {contact.phone && !contact.helpline && (
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-campus-green" />
                  <span>Phone: <strong className="text-campus-text">{contact.phone}</strong></span>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-campus-green" />
                  <span>Email: <strong className="text-campus-text">{contact.email}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Required Documents Checklist */}
          {showDocs && requiredDocuments && requiredDocuments.length > 0 && (
            <div className="pt-2 border-t border-campus-border">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-campus-text mb-2">
                <FileText className="w-3.5 h-3.5 text-campus-green" />
                <span>What to Bring (Documents)</span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-campus-muted">
                {requiredDocuments.map((doc, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-campus-green font-bold">•</span>
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actionable Next Steps */}
          {showSteps && nextSteps && nextSteps.length > 0 && (
            <div className="pt-2 border-t border-campus-border">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-campus-text mb-2">
                <ArrowRight className="w-3.5 h-3.5 text-campus-green" />
                <span>Next Steps</span>
              </div>
              <ol className="space-y-1.5 text-xs text-campus-muted">
                {nextSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-semibold text-campus-green flex-shrink-0 w-4">
                      {idx + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* 3. Subtle Sources Footer (Rendered ONLY when verified factual sources are relevant) */}
      {showSources && sources && sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-campus-muted">
          <span className="font-semibold uppercase tracking-wider text-[10px]">Source:</span>
          {sources.map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-campus-tagBg hover:text-campus-green hover:underline border border-campus-border"
            >
              <span>{s.title}</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ))}
        </div>
      )}

      {/* 4. Related Topics (Rendered ONLY when exploration or related query requires it) */}
      {showRelated && relatedTopics && relatedTopics.length > 0 && onSelectTopic && (
        <div className="pt-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-campus-muted mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-campus-green" />
            <span>Explore further</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {relatedTopics.slice(0, 3).map((topic, i) => (
              <button
                key={i}
                onClick={() => onSelectTopic(topic)}
                className="text-xs px-2.5 py-1 rounded-full border border-campus-border bg-campus-surface hover:bg-campus-surfaceHover hover:border-campus-green text-campus-text transition-colors"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
