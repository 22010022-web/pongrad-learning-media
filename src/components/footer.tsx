import React from "react";
import { GraduationCap, MapPin, School } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-navy-950 border-t border-navy-900 text-navy-300 py-8 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-navy-800 flex items-center justify-center text-blue-400">
            <School className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-white text-sm sm:text-base">
              โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)
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
    </footer>
  );
}
