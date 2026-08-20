'use client';

import React, { useState } from 'react';
import { 
  HelpCircle, 
  ArrowRight, 
  RotateCcw, 
  Building2, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  ExternalLink,
  CreditCard,
  GraduationCap,
  FileCheck,
  Home,
  HeartPulse,
  Award,
  BookOpen,
  Users
} from 'lucide-react';
import { servicesData, officesData, locationsData } from '../data';
import { StudentService, AdministrativeOffice, CampusLocation } from '../types';

interface TriageCategory {
  id: string;
  name: string;
  hindiName: string;
  icon: React.ElementType;
  description: string;
  subIssues: {
    id: string;
    label: string;
    hindiLabel: string;
    serviceId: string;
    officeId: string;
    locationId: string;
  }[];
}

const TRIAGE_CATEGORIES: TriageCategory[] = [
  {
    id: 'scholarships',
    name: 'Scholarships & Grants',
    hindiName: 'छात्रवृत्ति एवं अनुदान',
    icon: Award,
    description: 'MP Taas, NSP, payment pending, renewal form verification',
    subIssues: [
      {
        id: 'sch-1',
        label: 'My scholarship payment has not arrived / status pending',
        hindiLabel: 'मेरी छात्रवृत्ति का पैसा नहीं आया / स्टेटस पेंडिंग है',
        serviceId: 'service-scholarship-support',
        officeId: 'office-scholarship-cell',
        locationId: 'loc-admin-block'
      },
      {
        id: 'sch-2',
        label: 'Need institutional endorsement / physical form submission',
        hindiLabel: 'संस्थान स्तर पर सत्यापन / फॉर्म जमा करना है',
        serviceId: 'service-scholarship-support',
        officeId: 'office-scholarship-cell',
        locationId: 'loc-admin-block'
      }
    ]
  },
  {
    id: 'documents',
    name: 'Marksheet & Certificates',
    hindiName: 'अंकसूची एवं प्रमाण पत्र',
    icon: FileCheck,
    description: 'Marksheet correction, duplicate marksheet, bonafide, migration',
    subIssues: [
      {
        id: 'doc-1',
        label: 'Spelling or marks correction in semester marksheet',
        hindiLabel: 'मार्कशीट में नाम या अंक में सुधार करवाना है',
        serviceId: 'service-marksheet-correction',
        officeId: 'office-exam-cell',
        locationId: 'loc-pariksha-bhawan'
      },
      {
        id: 'doc-2',
        label: 'Need Bonafide Certificate (for bank loan / railway concession)',
        hindiLabel: 'बोनाफाइड प्रमाण पत्र चाहिए (लोन या रेलवे पास हेतु)',
        serviceId: 'service-bonafide-cert',
        officeId: 'office-registrar-academic',
        locationId: 'loc-admin-block'
      },
      {
        id: 'doc-3',
        label: 'Lost marksheet / applying for duplicate marksheet',
        hindiLabel: 'मार्कशीट खो गई है, डुप्लीकेट मार्कशीट चाहिए',
        serviceId: 'service-marksheet-correction',
        officeId: 'office-exam-cell',
        locationId: 'loc-pariksha-bhawan'
      }
    ]
  },
  {
    id: 'exams',
    name: 'Examinations & Forms',
    hindiName: 'परीक्षा एवं परीक्षा फॉर्म',
    icon: GraduationCap,
    description: 'Exam form submission, admit card glitches, ATKT back-paper',
    subIssues: [
      {
        id: 'ex-1',
        label: 'Exam form submission error or fee deducted but unpaid',
        hindiLabel: 'परीक्षा फॉर्म सबमिट नहीं हो रहा या फीस पेंडिंग है',
        serviceId: 'service-exam-form-issue',
        officeId: 'office-exam-cell',
        locationId: 'loc-pariksha-bhawan'
      },
      {
        id: 'ex-2',
        label: 'Cannot download Admit Card / subject mismatch',
        hindiLabel: 'एडमिट कार्ड डाउनलोड नहीं हो रहा / विषय गलत है',
        serviceId: 'service-exam-form-issue',
        officeId: 'office-exam-cell',
        locationId: 'loc-pariksha-bhawan'
      }
    ]
  },
  {
    id: 'hostel',
    name: 'Hostel & Accommodation',
    hindiName: 'छात्रावास एवं आवास',
    icon: Home,
    description: 'Hostel allotment, merit list, room keys, mess admission',
    subIssues: [
      {
        id: 'hos-1',
        label: 'How to apply for hostel room allotment post-admission',
        hindiLabel: 'एडमिशन के बाद हॉस्टल रूम कैसे मिलेगा',
        serviceId: 'service-hostel-allotment',
        officeId: 'office-hostel-chief-warden',
        locationId: 'loc-tagore-hostel'
      },
      {
        id: 'hos-2',
        label: 'Hostel fee receipt verification & room handover',
        hindiLabel: 'हॉस्टल फीस रसीद जमा करना और रूम आवंटन',
        serviceId: 'service-hostel-allotment',
        officeId: 'office-hostel-chief-warden',
        locationId: 'loc-tagore-hostel'
      }
    ]
  },
  {
    id: 'fees',
    name: 'Fees & Accounts',
    hindiName: 'फीस एवं भुगतान',
    icon: CreditCard,
    description: 'Double transaction refund, fee portal update, challans',
    subIssues: [
      {
        id: 'fee-1',
        label: 'Money deducted from bank but admission/exam portal shows unpaid',
        hindiLabel: 'खाते से पैसे कट गए पर पोर्टल पर unpaid दिख रहा है',
        serviceId: 'service-fee-reconciliation',
        officeId: 'office-finance-branch',
        locationId: 'loc-admin-block'
      }
    ]
  },
  {
    id: 'health',
    name: 'Health & Medical Aid',
    hindiName: 'स्वास्थ्य एवं चिकित्सा',
    icon: HeartPulse,
    description: 'Doctor consultation, free medicines, emergency ambulance',
    subIssues: [
      {
        id: 'med-1',
        label: 'Campus medical facility / doctor consultation / medicines',
        hindiLabel: 'कैंपस में डॉक्टर परामर्श / दवाएं / स्वास्थ्य केंद्र',
        serviceId: 'service-medical-assistance',
        officeId: 'office-health-centre',
        locationId: 'loc-health-centre'
      }
    ]
  },
  {
    id: 'library',
    name: 'Central Library',
    hindiName: 'केंद्रीय पुस्तकालय',
    icon: BookOpen,
    description: 'Library card, timings, e-resources, book borrowing',
    subIssues: [
      {
        id: 'lib-1',
        label: 'How to make a Central Library card & access books',
        hindiLabel: 'लाइब्रेरी कार्ड कैसे बनेगा और किताबें कैसे मिलेंगी',
        serviceId: 'service-library-access',
        officeId: 'office-registrar-academic',
        locationId: 'loc-central-library'
      }
    ]
  },
  {
    id: 'safety',
    name: 'Safety, Anti-Ragging & Grievance',
    hindiName: 'सुरक्षा, एंटी-रैगिंग एवं शिकायत',
    icon: Users,
    description: 'Zero tolerance anti-ragging helpline, student grievance',
    subIssues: [
      {
        id: 'safe-1',
        label: 'Anti-Ragging assistance / Campus security / Proctorial cell',
        hindiLabel: 'एंटी-रैगिंग सहायता / सुरक्षा / प्रॉक्टर कार्यालय',
        serviceId: 'service-anti-ragging',
        officeId: 'office-anti-ragging-proctor',
        locationId: 'loc-admin-block'
      },
      {
        id: 'safe-2',
        label: 'Official Student Grievance Redressal Mechanism',
        hindiLabel: 'छात्र शिकायत निवारण समिति में आवेदन',
        serviceId: 'service-student-grievance',
        officeId: 'office-dsw',
        locationId: 'loc-dsw-building'
      }
    ]
  }
];

export default function NotSureWhereToGoWizard() {
  const [selectedCat, setSelectedCat] = useState<TriageCategory | null>(null);
  const [selectedSubIssue, setSelectedSubIssue] = useState<TriageCategory['subIssues'][0] | null>(null);

  const resetWizard = () => {
    setSelectedCat(null);
    setSelectedSubIssue(null);
  };

  const resolvedService: StudentService | undefined = selectedSubIssue
    ? servicesData.find(s => s.id === selectedSubIssue.serviceId)
    : undefined;

  const resolvedOffice: AdministrativeOffice | undefined = selectedSubIssue
    ? officesData.find(o => o.id === selectedSubIssue.officeId)
    : undefined;

  const resolvedLocation: CampusLocation | undefined = selectedSubIssue
    ? locationsData.find(l => l.id === selectedSubIssue.locationId)
    : undefined;

  return (
    <div className="rounded-2xl border border-campus-border bg-campus-surface p-6 sm:p-8 shadow-subtle">
      
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-campus-green bg-campus-greenLight dark:bg-campus-greenDark px-2.5 py-1 rounded-full mb-2">
            <HelpCircle className="w-3.5 h-3.5" />
            Problem-to-Place Navigator
          </div>
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-campus-text">
            Not sure where to go?
          </h2>
          <p className="text-xs sm:text-sm text-campus-muted mt-1">
            Tell us what&apos;s wrong and we&apos;ll help you find the exact verified office, location, and documents you need.
          </p>
        </div>

        {(selectedCat || selectedSubIssue) && (
          <button
            onClick={resetWizard}
            className="flex items-center gap-1 text-xs text-campus-muted hover:text-campus-text px-3 py-1.5 rounded-lg border border-campus-border hover:bg-campus-surfaceHover transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Start Over
          </button>
        )}
      </div>

      {/* Step 1: Category Selection */}
      {!selectedCat && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-campus-muted mb-3">
            Step 1: Select the area of your problem
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {TRIAGE_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCat(cat)}
                  className="text-left p-4 rounded-xl border border-campus-border bg-campus-surfaceAlt hover:bg-campus-surface hover:border-campus-green text-campus-text transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-9 h-9 rounded-lg bg-campus-surface group-hover:bg-campus-greenLight dark:group-hover:bg-campus-greenDark text-campus-green flex items-center justify-center mb-3 border border-campus-border transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="font-heading font-semibold text-sm text-campus-text">
                      {cat.name}
                    </div>
                    <div className="text-[11px] text-campus-muted mt-0.5">
                      {cat.hindiName}
                    </div>
                  </div>
                  <div className="text-[11px] text-campus-muted mt-3 pt-2 border-t border-campus-border/60 flex items-center justify-between">
                    <span className="truncate">{cat.subIssues.length} issues</span>
                    <ArrowRight className="w-3 h-3 text-campus-muted group-hover:text-campus-green group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Specific Sub-issue Selection */}
      {selectedCat && !selectedSubIssue && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-campus-muted">
            <span>Category:</span>
            <span className="font-semibold text-campus-text px-2 py-0.5 rounded bg-campus-tagBg">
              {selectedCat.name}
            </span>
          </div>

          <div className="text-xs font-semibold uppercase tracking-wider text-campus-muted">
            Step 2: Which specific issue describes what you need?
          </div>

          <div className="space-y-2.5">
            {selectedCat.subIssues.map((issue) => (
              <button
                key={issue.id}
                onClick={() => setSelectedSubIssue(issue)}
                className="w-full text-left p-4 rounded-xl border border-campus-border bg-campus-surfaceAlt hover:bg-campus-surface hover:border-campus-green text-campus-text transition-all group flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-sm text-campus-text group-hover:text-campus-green transition-colors">
                    {issue.label}
                  </div>
                  <div className="text-xs text-campus-muted mt-0.5">
                    {issue.hindiLabel}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-campus-muted group-hover:text-campus-green group-hover:translate-x-1 transition-transform flex-shrink-0 ml-4" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Actionable Resolution Card */}
      {selectedSubIssue && resolvedService && (
        <div className="rounded-xl border-2 border-campus-green/30 bg-campus-surface p-5 space-y-5 animate-in fade-in duration-200">
          
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-campus-border">
            <div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-campus-green">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Resolution Identified
              </span>
              <h3 className="font-heading font-bold text-lg text-campus-text mt-0.5">
                {resolvedService.name}
              </h3>
              <p className="text-xs text-campus-muted mt-0.5">
                {resolvedService.description}
              </p>
            </div>
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              Verified DHSGSU Unit
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Responsible Office */}
            {resolvedOffice && (
              <div className="p-3.5 rounded-lg bg-campus-surfaceAlt border border-campus-border space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-campus-text">
                  <Building2 className="w-3.5 h-3.5 text-campus-green" />
                  <span>Responsible Office</span>
                </div>
                <div className="text-xs font-medium text-campus-text">
                  {resolvedOffice.name}
                </div>
                <div className="text-[11px] text-campus-muted">
                  Hours: {resolvedOffice.officeHours || '10:00 AM - 5:30 PM (Working Days)'}
                </div>
                {resolvedOffice.contact?.helpline && (
                  <div className="text-[11px] text-campus-muted">
                    Helpline: <strong className="text-campus-text">{resolvedOffice.contact.helpline}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Campus Location */}
            {resolvedLocation && (
              <div className="p-3.5 rounded-lg bg-campus-surfaceAlt border border-campus-border space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-campus-text">
                  <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Where To Go</span>
                </div>
                <div className="text-xs font-medium text-campus-text">
                  {resolvedLocation.name}
                </div>
                <div className="text-[11px] text-campus-muted">
                  {resolvedLocation.landmark || resolvedLocation.building}
                </div>
                {resolvedLocation.mapLink && (
                  <a
                    href={resolvedLocation.mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-campus-green hover:underline mt-1"
                  >
                    View on Campus Map <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Required Documents */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-campus-text">
              <FileText className="w-3.5 h-3.5 text-campus-green" />
              <span>Documents to Bring</span>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-campus-muted">
              {resolvedService.requiredDocuments.map((doc, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-campus-green font-bold">•</span>
                  <span>{doc}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Next Steps Process */}
          <div className="space-y-2 pt-2 border-t border-campus-border">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-campus-text">
              <ArrowRight className="w-3.5 h-3.5 text-campus-green" />
              <span>Step-by-Step Action Plan</span>
            </div>
            <ol className="space-y-1 text-xs text-campus-muted">
              {resolvedService.process.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="font-semibold text-campus-green w-4">{idx + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Official Website Source */}
          <div className="pt-2 border-t border-campus-border flex items-center justify-between text-xs text-campus-muted">
            <span>Source: DHSGSU Official Information</span>
            <a
              href={resolvedService.officialSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-campus-green hover:underline font-medium"
            >
              Visit Official Page <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
