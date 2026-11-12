"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { AlertTriangle, Database, Check, Copy } from "lucide-react";

export function SetupBanner() {
  const { isConfigured } = useAuth();
  const [copied, setCopied] = useState(false);

  if (isConfigured) return null;

  const copyPath = () => {
    navigator.clipboard.writeText("supabase/schema.sql");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-200 px-4 py-3 sm:py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">ต้องการการตั้งค่า Supabase: </span>
            <span>
              ยังไม่ได้ระบุ <code>NEXT_PUBLIC_SUPABASE_URL</code> และ <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> ในไฟล์ <code>.env.local</code>
            </span>
            <div className="text-xs text-amber-300 mt-1">
              โปรดนำสคริปต์ SQL จาก <strong>supabase/schema.sql</strong> ไป Run ใน Supabase SQL Editor เพื่อสร้างตารางและข้อมูลครูทั้ง 9 คน
            </div>
          </div>
        </div>

        <button
          onClick={copyPath}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-lg text-xs font-medium border border-amber-500/30 transition-colors shrink-0"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "คัดลอกพาธแล้ว" : "คัดลอกพาธ schema.sql"}</span>
        </button>
      </div>
    </div>
  );
}
