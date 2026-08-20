'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  GraduationCap, 
  Building2, 
  Award, 
  MapPin, 
  Search, 
  FileText 
} from 'lucide-react';
import DirectoryCard from '../../components/DirectoryCard';
import { departmentsData, officesData, servicesData, locationsData, schoolsData } from '../../data';

const TABS = [
  { id: 'academic', label: 'Academic Departments', icon: GraduationCap, count: departmentsData.length },
  { id: 'administrative', label: 'Administrative Offices', icon: Building2, count: officesData.length },
  { id: 'services', label: 'Student Services', icon: Award, count: servicesData.length },
  { id: 'campus', label: 'Campus Places & Facilities', icon: MapPin, count: locationsData.length },
];

function ExploreContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'academic';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  const q = searchQuery.toLowerCase().trim();

  const filteredDepts = departmentsData.filter(d =>
    d.name.toLowerCase().includes(q) ||
    d.description.toLowerCase().includes(q) ||
    d.schoolName.toLowerCase().includes(q) ||
    d.programmes.some(p => p.toLowerCase().includes(q))
  );

  const filteredOffices = officesData.filter(o =>
    o.name.toLowerCase().includes(q) ||
    o.category.toLowerCase().includes(q) ||
    o.responsibilities.some(r => r.toLowerCase().includes(q)) ||
    o.commonStudentProblems.some(p => p.toLowerCase().includes(q))
  );

  const filteredServices = servicesData.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.category.toLowerCase().includes(q) ||
    s.description.toLowerCase().includes(q) ||
    s.commonProblems.some(p => p.toLowerCase().includes(q))
  );

  const filteredLocations = locationsData.filter(l =>
    l.name.toLowerCase().includes(q) ||
    l.building.toLowerCase().includes(q) ||
    l.description.toLowerCase().includes(q) ||
    (l.landmark && l.landmark.toLowerCase().includes(q))
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-campus-green mb-1">
          Campus Directory
        </div>
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-campus-text">
          Explore DHSGSU
        </h1>
        <p className="text-xs sm:text-sm text-campus-muted mt-1 max-w-xl">
          Discover all academic departments, administrative offices, student welfare services, and campus landmarks.
        </p>
      </div>

      {/* Search Bar & Tab Navigation */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-campus-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search departments, services, offices, or facilities..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-campus-border bg-campus-surface text-campus-text text-sm focus:outline-none focus:border-campus-green focus:ring-1 focus:ring-campus-green transition-all shadow-subtle"
          />
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-campus-border pb-3">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all ${
                  isActive
                    ? 'bg-campus-green text-white border-campus-green shadow-subtle'
                    : 'border-campus-border bg-campus-surface text-campus-text hover:bg-campus-surfaceHover'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-campus-tagBg text-campus-muted'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Directory Content */}
      <div>
        {activeTab === 'academic' && (
          <div className="space-y-6">
            <div className="text-xs text-campus-muted">
              Showing {filteredDepts.length} Academic Departments across {schoolsData.length} Schools
            </div>
            {filteredDepts.length === 0 ? (
              <div className="p-8 text-center text-xs text-campus-muted">No academic departments match your search.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDepts.map(d => (
                  <DirectoryCard key={d.id} type="department" data={d} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'administrative' && (
          <div className="space-y-6">
            <div className="text-xs text-campus-muted">
              Showing {filteredOffices.length} Administrative Offices
            </div>
            {filteredOffices.length === 0 ? (
              <div className="p-8 text-center text-xs text-campus-muted">No administrative offices match your search.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOffices.map(o => (
                  <DirectoryCard key={o.id} type="office" data={o} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="text-xs text-campus-muted">
              Showing {filteredServices.length} Student Support Services
            </div>
            {filteredServices.length === 0 ? (
              <div className="p-8 text-center text-xs text-campus-muted">No student services match your search.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredServices.map(s => (
                  <DirectoryCard key={s.id} type="service" data={s} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'campus' && (
          <div className="space-y-6">
            <div className="text-xs text-campus-muted">
              Showing {filteredLocations.length} Campus Places & Landmarks on Patharia Hills
            </div>
            {filteredLocations.length === 0 ? (
              <div className="p-8 text-center text-xs text-campus-muted">No campus locations match your search.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLocations.map(l => (
                  <DirectoryCard key={l.id} type="location" data={l} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-campus-muted">Loading explore directory...</div>}>
      <ExploreContent />
    </Suspense>
  );
}
