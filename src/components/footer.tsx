"use client";

import React, { useEffect, useState } from "react";
import { MapPin, School, Code2 } from "lucide-react";
import { fetchSchoolSettings, DEFAULT_SCHOOL_SETTINGS, SchoolSettings } from "@/lib/school-settings";

export function Footer() {
  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SCHOOL_SETTINGS);

  useEffect(() => {
    fetchSchoolSettings().then(setSettings);
    const handler = (e: Event) => {
      const custom = e as CustomEvent<SchoolSettings>;
      if (custom.detail) setSettings(custom.detail);
    };
    window.addEventListener("school-settings-updated", handler);
    return () => window.removeEventListener("school-settings-updated", handler);
  }, []);

  return (
    <footer className="bg-navy-950 border-t border-navy-900 text-navy-300 py-7 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-3">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="School Logo"
                className="w-10 h-10 rounded-lg object-contain bg-white p-0.5 border border-navy-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-navy-800 flex items-center justify-center text-blue-400">
                <School className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="font-semibold text-white text-sm sm:text-base">
                {settings.schoolName}
              </div>
              <div className="text-xs text-navy-400 flex items-center justify-center md:justify-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>สำนักงานเขตพื้นที่การศึกษาประถมศึกษาจันทบุรี เขต 1</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-navy-400">
            <div>ระบบส่งสื่อการจัดการเรียนรู้ (Learning Media Submission System)</div>
            <div>พัฒนาเพื่อการบริหารจัดการและการประกันคุณภาพการศึกษาภายในสถานศึกษา</div>
          </div>
        </div>

        {/* Credit Line */}
        <div className="pt-4 border-t border-navy-900/80 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-[11px] text-navy-400 text-center">
          <Code2 className="w-3.5 h-3.5 text-blue-400 hidden sm:inline-block" />
          <span>
            พัฒนาโดย ครูเอก · © 2026 Crafted with code &amp; coffee by Kru Aek. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
