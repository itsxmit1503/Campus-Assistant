'use client';

import React from 'react';
import { 
  GraduationCap, 
  Home, 
  FileText, 
  Award, 
  BookOpen, 
  Building2, 
  FileCheck, 
  HeartPulse 
} from 'lucide-react';

interface TopicShortcutsProps {
  onSelectTopic: (prompt: string) => void;
}

const TOPICS = [
  { label: 'Admissions', prompt: "I'm new here, what should I do after admission?", icon: GraduationCap },
  { label: 'Hostel', prompt: 'Hostel kaise milega aur form kahan jama karein?', icon: Home },
  { label: 'Examinations', prompt: 'Exam form submit nahi ho raha ya fee pending hai', icon: FileText },
  { label: 'Scholarships', prompt: 'Meri scholarship nahi aayi, kya karu?', icon: Award },
  { label: 'Library', prompt: 'Library kaha hai and library card kaise banega?', icon: BookOpen },
  { label: 'Departments', prompt: 'MCA department kaha hai aur HOD contact kya hai?', icon: Building2 },
  { label: 'Certificates', prompt: 'Marksheet mein correction karwana hai ya bonafide certificate chahiye', icon: FileCheck },
  { label: 'Medical', prompt: 'University mein medical facility hai kya?', icon: HeartPulse },
];

export default function TopicShortcuts({ onSelectTopic }: TopicShortcutsProps) {
  return (
    <div className="w-full">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-campus-muted mb-2 px-0.5">
        Popular Topics & Services
      </div>
      <div className="flex flex-wrap gap-2">
        {TOPICS.map((topic) => {
          const Icon = topic.icon;
          return (
            <button
              key={topic.label}
              onClick={() => onSelectTopic(topic.prompt)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-campus-border bg-campus-surface hover:bg-campus-surfaceHover hover:border-campus-green text-campus-text transition-all group shadow-subtle"
            >
              <Icon className="w-3.5 h-3.5 text-campus-muted group-hover:text-campus-green transition-colors" />
              <span>{topic.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
