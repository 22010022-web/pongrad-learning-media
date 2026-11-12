"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { getSupabaseProjectRef } from "@/lib/supabase/client";
import { SUPABASE_SCHEMA_SQL } from "@/lib/supabase/schema-sql";
import { AlertTriangle, Check, Copy, ExternalLink, RefreshCw } from "lucide-react";

export function SetupBanner() {
  const { isConfigured, isSchemaReady, checkSchema } = useAuth();
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);

  const projectRef = getSupabaseProjectRef();
  const sqlEditorUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
    : "https://supabase.com/dashboard";

  if (isConfigured && isSchemaReady) return null;

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback textarea copy
      const el = document.createElement("textarea");
      el.value = SUPABASE_SCHEMA_SQL;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleRecheck = async () => {
    setChecking(true);
    await checkSchema();
    setTimeout(() => setChecking(false), 600);
  };

  return (
    <div className="bg-amber-950 border-b border-amber-500/40 text-amber-100 px-4 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            {!isConfigured ? (
              <>
                <span className="font-bold text-white">ยังไม่ได้เชื่อมต่อ Supabase: </span>
                <span>
                  กรุณากำหนดค่า <code>NEXT_PUBLIC_SUPABASE_URL</code> และ <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
                </span>
              </>
            ) : (
              <>
                <span className="font-bold text-amber-300">
                  ขั้นตอนสุดท้าย! ฐานข้อมูล Supabase ที่ Vercel เชื่อมอยู่ ({projectRef || "Project"}) ยังไม่ได้สร้างตาราง:{" "}
                </span>
                <span className="text-amber-100">
                  กดปุ่ม <strong>&quot;1. คัดลอกโค้ด SQL&quot;</strong> แล้วกดปุ่ม{" "}
                  <strong>&quot;2. เปิด SQL Editor ({projectRef})&quot;</strong> เพื่อวางโค้ดและกด Run ได้ทันที
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={copySql}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-900" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "คัดลอกโค้ด SQL ทั้งหมดแล้ว!" : "1. คัดลอกโค้ด SQL ทั้งหมด"}</span>
          </button>

          <a
            href={sqlEditorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>2. เปิด SQL Editor ({projectRef || "Supabase"})</span>
          </a>

          {isConfigured && (
            <button
              type="button"
              onClick={handleRecheck}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-900/70 hover:bg-amber-800 text-amber-200 rounded-lg text-xs font-medium border border-amber-700 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
              <span>ตรวจสอบอีกครั้ง</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
