'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Landmark, 
  HelpCircle, 
  MapPin, 
  ArrowRight, 
  Compass, 
  ShieldCheck, 
  GraduationCap, 
  BookOpen, 
  Award, 
  FileCheck,
  HeartPulse
} from 'lucide-react';
import QuickSearchPrompt from '../components/QuickSearchPrompt';
import TopicShortcuts from '../components/TopicShortcuts';
import NotSureWhereToGoWizard from '../components/NotSureWhereToGoWizard';
import { universityData, departmentsData, officesData, servicesData } from '../data';

export default function HomePage() {
  return (
    <div className="space-y-12 pb-8 animate-in fade-in duration-200">
      
      {/* Hero Section */}
      <section className="text-center max-w-2xl mx-auto pt-4 sm:pt-8 space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-campus-greenLight dark:bg-campus-greenDark text-campus-green dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Official DHSGSU Digital Guide • Sagar, MP</span>
        </div>

        <h1 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-campus-text tracking-tight">
          Campus Assistant
        </h1>

        <p className="text-sm sm:text-base text-campus-muted max-w-lg mx-auto leading-relaxed">
          Find your way around DHSGSU. Ask in English, Hindi, or Hinglish to discover offices, procedures, locations, and documents.
        </p>

        {/* Primary Prompt / Search Bar */}
        <div className="pt-2">
          <QuickSearchPrompt />
        </div>

        {/* Popular Topic Shortcuts */}
        <div className="pt-2">
          <TopicShortcuts
            onSelectTopic={(prompt) => {
              window.location.href = `/chat?q=${encodeURIComponent(prompt)}`;
            }}
          />
        </div>
      </section>

      {/* Problem-to-Place Wizard: "Not Sure Where To Go?" */}
      <section id="where-to-go">
        <NotSureWhereToGoWizard />
      </section>

      {/* Campus Discovery Overview */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-campus-border pb-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-campus-green">
              Explore Campus
            </div>
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-campus-text mt-0.5">
              University Services & Academic Units
            </h2>
          </div>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1 text-xs font-semibold text-campus-green hover:underline"
          >
            <span>View All in Explore Directory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Academic Departments */}
          <Link
            href="/explore?tab=academic"
            className="p-5 rounded-2xl border border-campus-border bg-campus-surface hover:border-campus-green transition-all group flex flex-col justify-between shadow-subtle"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-campus-greenLight dark:bg-campus-greenDark text-campus-green flex items-center justify-center mb-3">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-base text-campus-text group-hover:text-campus-green transition-colors">
                Academic Schools & Depts
              </h3>
              <p className="text-xs text-campus-muted mt-1.5 leading-relaxed">
                Computer Science (MCA), Physics, Law, Management (MBA), Chemistry and more.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-campus-border text-xs text-campus-green font-medium flex items-center gap-1">
              <span>{departmentsData.length} Departments</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          {/* Card 2: Administrative Offices */}
          <Link
            href="/explore?tab=administrative"
            className="p-5 rounded-2xl border border-campus-border bg-campus-surface hover:border-campus-green transition-all group flex flex-col justify-between shadow-subtle"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center mb-3">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-base text-campus-text group-hover:text-campus-green transition-colors">
                Administrative Offices
              </h3>
              <p className="text-xs text-campus-muted mt-1.5 leading-relaxed">
                Examination Cell, DSW, Registrar, Finance Branch, Proctorial Board.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-campus-border text-xs text-campus-green font-medium flex items-center gap-1">
              <span>{officesData.length} Key Offices</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          {/* Card 3: Student Support Services */}
          <Link
            href="/explore?tab=services"
            className="p-5 rounded-2xl border border-campus-border bg-campus-surface hover:border-campus-green transition-all group flex flex-col justify-between shadow-subtle"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 flex items-center justify-center mb-3">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-base text-campus-text group-hover:text-campus-green transition-colors">
                Student Services
              </h3>
              <p className="text-xs text-campus-muted mt-1.5 leading-relaxed">
                Scholarships, Marksheet correction, Bonafide certificates, Grievance.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-campus-border text-xs text-campus-green font-medium flex items-center gap-1">
              <span>{servicesData.length} Services</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          {/* Card 4: Campus Map & Places */}
          <Link
            href="/map"
            className="p-5 rounded-2xl border border-campus-border bg-campus-surface hover:border-campus-green transition-all group flex flex-col justify-between shadow-subtle"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-3">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-base text-campus-text group-hover:text-campus-green transition-colors">
                Campus Map & Places
              </h3>
              <p className="text-xs text-campus-muted mt-1.5 leading-relaxed">
                Central Library, Pariksha Bhawan, Hostels, Health Centre, Stadium.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-campus-border text-xs text-campus-green font-medium flex items-center gap-1">
              <span>View Map & Directions</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        </div>
      </section>

      {/* University Identity Snippet */}
      <section className="rounded-2xl border border-campus-border bg-campus-surfaceAlt p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="font-heading font-bold text-lg text-campus-text">
            {universityData.name} ({universityData.shortName})
          </div>
          <p className="text-xs text-campus-muted">
            {universityData.tagline} • Estd. {universityData.establishedYear} by {universityData.founder}
          </p>
          <p className="text-xs text-campus-muted">
            Campus: {universityData.campusArea}, {universityData.location.address}, {universityData.location.city} ({universityData.location.pincode})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="px-4 py-2.5 rounded-xl bg-campus-green text-white text-xs font-semibold hover:bg-campus-greenHover transition-colors shadow-subtle"
          >
            Start Conversation
          </Link>
          <a
            href={universityData.officialWebsite}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl border border-campus-border bg-campus-surface text-campus-text text-xs font-semibold hover:bg-campus-surfaceHover transition-colors"
          >
            Official Website
          </a>
        </div>
      </section>

    </div>
  );
}
