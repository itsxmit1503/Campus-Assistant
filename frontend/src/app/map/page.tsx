'use client';

import React from 'react';
import CampusMapViewer from '../../components/CampusMapViewer';
import { MapPin, ShieldCheck } from 'lucide-react';

export default function MapPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-campus-green mb-1">
            Physical Campus Guide
          </div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-campus-text">
            DHSGSU Campus Map & Places
          </h1>
          <p className="text-xs sm:text-sm text-campus-muted mt-0.5 max-w-xl">
            Explore major buildings, administrative offices, central library, hostels, and student facilities across the 1300-acre Patharia Hills campus.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 text-xs text-campus-green bg-campus-greenLight dark:bg-campus-greenDark px-3 py-1 rounded-full w-fit">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Patharia Hills, Sagar (MP)</span>
        </div>
      </div>

      <CampusMapViewer />
    </div>
  );
}
