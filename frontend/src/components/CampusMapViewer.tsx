'use client';

import React, { useState } from 'react';
import { MapPin, Navigation, ExternalLink, Building, BookOpen, Home, HeartPulse, Trophy } from 'lucide-react';
import { locationsData } from '../data';
import { CampusLocation } from '../types';

const CATEGORIES = [
  { id: 'all', label: 'All Landmarks' },
  { id: 'administrative', label: 'Administrative', icon: Building },
  { id: 'academic', label: 'Academic Depts', icon: Building },
  { id: 'library', label: 'Central Library', icon: BookOpen },
  { id: 'hostel', label: 'Hostels', icon: Home },
  { id: 'medical', label: 'Health Centre', icon: HeartPulse },
  { id: 'sports', label: 'Sports Complex', icon: Trophy },
];

export default function CampusMapViewer() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState<CampusLocation>(locationsData[0]);

  const filteredLocations = activeCategory === 'all'
    ? locationsData
    : locationsData.filter(l => l.type === activeCategory);

  return (
    <div className="space-y-6">
      
      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              activeCategory === cat.id
                ? 'bg-campus-green text-white border-campus-green shadow-subtle'
                : 'border-campus-border bg-campus-surface text-campus-text hover:bg-campus-surfaceHover'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Interactive Map & Places Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Location selection list */}
        <div className="lg:col-span-1 space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
          {filteredLocations.map(loc => {
            const isSelected = selectedLocation.id === loc.id;
            return (
              <button
                key={loc.id}
                onClick={() => setSelectedLocation(loc)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-campus-green bg-campus-greenLight dark:bg-campus-greenDark shadow-subtle'
                    : 'border-campus-border bg-campus-surface hover:bg-campus-surfaceHover'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${
                    isSelected
                      ? 'bg-campus-green text-white'
                      : 'bg-campus-surfaceAlt text-campus-muted border border-campus-border'
                  }`}>
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-heading font-semibold text-xs text-campus-text truncate">
                      {loc.name}
                    </div>
                    <div className="text-[11px] text-campus-muted truncate mt-0.5">
                      {loc.building}
                    </div>
                    {loc.landmark && (
                      <div className="text-[10px] text-campus-muted truncate mt-0.5">
                        {loc.landmark}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Selected Landmark Detail & Map Preview */}
        <div className="lg:col-span-2 rounded-2xl border border-campus-border bg-campus-surface p-6 flex flex-col justify-between shadow-subtle">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-campus-green bg-campus-greenLight dark:bg-campus-greenDark px-2.5 py-0.5 rounded-full">
                  {selectedLocation.type}
                </span>
                <h3 className="font-heading font-bold text-xl text-campus-text mt-2">
                  {selectedLocation.name}
                </h3>
                <p className="text-xs text-campus-muted mt-1">
                  Building: <strong className="text-campus-text">{selectedLocation.building}</strong>
                  {selectedLocation.floor ? ` • Floor: ${selectedLocation.floor}` : ''}
                </p>
              </div>

              <a
                href={selectedLocation.mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-campus-green text-white text-xs font-semibold hover:bg-campus-greenHover transition-colors shadow-subtle flex-shrink-0"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Get Directions</span>
              </a>
            </div>

            <p className="text-sm text-campus-text leading-relaxed bg-campus-surfaceAlt p-4 rounded-xl border border-campus-border">
              {selectedLocation.description}
            </p>

            {selectedLocation.landmark && (
              <div className="text-xs text-campus-muted">
                <strong>Campus Landmark Hint:</strong> {selectedLocation.landmark}
              </div>
            )}

            {/* Visual coordinates and hill overview */}
            <div className="p-4 rounded-xl border border-campus-border bg-campus-surfaceAlt flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-semibold text-campus-text">Patharia Hills Geographic Coordinates</div>
                <div className="text-campus-muted font-mono text-[11px] mt-0.5">
                  Latitude: {selectedLocation.coordinates.lat}° N, Longitude: {selectedLocation.coordinates.lng}° E
                </div>
              </div>
              <a
                href={selectedLocation.mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-campus-green hover:underline font-semibold"
              >
                <span>Open in Fullscreen Map</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-campus-border text-xs text-campus-muted flex items-center justify-between">
            <span>Dr. Harisingh Gour Vishwavidyalaya Campus (1300+ Acres)</span>
            <span className="text-[11px]">Sagar, MP 470003</span>
          </div>
        </div>
      </div>
    </div>
  );
}
