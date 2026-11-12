"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { supabase, getSupabaseProjectRef } from "@/lib/supabase/client";
import { SUPABASE_SCHEMA_SQL } from "@/lib/supabase/schema-sql";
import {
  fetchSchoolSettings,
  DEFAULT_SCHOOL_SETTINGS,
  SchoolSettings,
} from "@/lib/school-settings";
import { Teacher, TEACHERS_PRESET } from "@/types/database";
import {
  GraduationCap,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, signIn, signUp, isConfigured, isSchemaReady } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SCHOOL_SETTINGS);

  const [teachersList, setTeachersList] = useState<Teacher[]>(
    TEACHERS_PRESET.map((t) => ({
      ...t,
      created_at: new Date().toISOString(),
    }))
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [copiedSql, setCopiedSql] = useState(false);

  const projectRef = getSupabaseProjectRef();
  const sqlEditorUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
    : "https://supabase.com/dashboard";

  useEffect(() => {
    fetchSchoolSettings().then(setSettings);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  // Load teachers for linking
  useEffect(() => {
    async function loadTeachers() {
      if (isConfigured) {
        const { data } = await supabase
          .from("teachers")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true });
        if (data && data.length > 0) {
          setTeachersList(data as Teacher[]);
          return;
        }
      }
      setTeachersList(
        TEACHERS_PRESET.map((t) => ({
          ...t,
          created_at: new Date().toISOString(),
        }))
      );
    }
    loadTeachers();
  }, [isConfigured, isSchemaReady]);

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    } catch {
      const el = document.createElement("textarea");
      el.value = SUPABASE_SCHEMA_SQL;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) {
          setErrorMsg(error.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        } else {
          setSuccessMsg("เข้าสู่ระบบสำเร็จ กำลังพาไปยังหน้าหลัก...");
          setTimeout(() => router.push("/"), 600);
        }
      } else {
        // Sign up (Teacher only)
        const effectiveName = fullName.trim();

        if (!effectiveName) {
          setErrorMsg("กรุณากรอกชื่อ-นามสกุล");
          setLoading(false);
          return;
        }
        if (!selectedTeacherId) {
          setErrorMsg("กรุณาเลือกชื่อครูในระบบที่ตรงกับตัวท่าน");
          setLoading(false);
          return;
        }

        const matchedTeacher = teachersList.find((t) => t.id === selectedTeacherId);

        const { error } = await signUp(
          email,
          password,
          effectiveName,
          "teacher",
          selectedTeacherId,
          matchedTeacher?.name
        );

        if (error) {
          setErrorMsg(error.message || "เกิดข้อผิดพลาดในการลงทะเบียน");
        } else {
          setSuccessMsg("ลงทะเบียนและเข้าสู่ระบบสำเร็จเรียบร้อยแล้ว!");
          setTimeout(() => router.push("/"), 800);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-navy-900/5 to-slate-100">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          {settings.logoUrl ? (
            <div className="mx-auto w-20 h-20 rounded-2xl bg-white p-2 flex items-center justify-center shadow-xl border border-slate-200 mb-4 overflow-hidden">
              <img
                src={settings.logoUrl}
                alt="School Logo"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-navy-900 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mb-4 border border-blue-400/30">
              <GraduationCap className="w-9 h-9" />
            </div>
          )}
          <h2 className="text-2xl font-bold text-navy-950 tracking-tight">
            ระบบส่งสื่อการจัดการเรียนรู้
          </h2>
          <p className="text-sm text-slate-600 mt-1">{settings.schoolName}</p>
        </div>

        {/* Tab Toggle */}
        <div className="bg-slate-200/80 p-1 rounded-xl flex">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setErrorMsg("");
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              mode === "signin"
                ? "bg-white text-navy-900 shadow-sm"
                : "text-slate-600 hover:text-navy-900"
            }`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setErrorMsg("");
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              mode === "signup"
                ? "bg-white text-navy-900 shadow-sm"
                : "text-slate-600 hover:text-navy-900"
            }`}
          >
            ลงทะเบียนผู้ใช้ใหม่
          </button>
        </div>

        {/* Form Box */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80">
          {errorMsg && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs sm:text-sm space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                <span>{errorMsg}</span>
              </div>
              {(errorMsg.includes("SQL") || !isSchemaReady) && (
                <div className="flex flex-wrap items-center gap-2 pt-1 pl-7">
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? "คัดลอก SQL แล้ว!" : "1. คัดลอกโค้ด SQL"}</span>
                  </button>
                  <a
                    href={sqlEditorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-navy-900 hover:bg-navy-800 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>2. เปิด SQL Editor ({projectRef || "Supabase"})</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                {/* Account Type: Teacher only */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    ประเภทผู้ใช้งาน
                  </label>
                  <div className="p-3 rounded-xl border border-blue-500 bg-blue-50 text-blue-700 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm">
                    <GraduationCap className="w-4 h-4" />
                    <span>ครูผู้สอน</span>
                  </div>
                </div>

                {/* Link to Teacher in database */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    เลือกชื่อครูในระบบ <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedTeacherId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedTeacherId(newId);
                      const matched = teachersList.find((t) => t.id === newId);
                      const isPreviousTeacherName = teachersList.some(
                        (t) => t.name === fullName.trim()
                      );
                      if (matched && (!fullName.trim() || isPreviousTeacherName)) {
                        setFullName(matched.name);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  >
                    <option value="">-- กรุณาเลือกชื่อครู --</option>
                    <optgroup label="กลุ่มที่ 1 ครูระดับปฐมวัย">
                      {teachersList
                        .filter((t) => t.category === "early_childhood")
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.grade_level})
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="กลุ่มที่ 2 ครูระดับประถมศึกษา">
                      {teachersList
                        .filter((t) => t.category === "primary")
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.grade_level}) - {t.subjects}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>

                {/* Full name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    ชื่อผู้ใช้งาน / ชื่อ-นามสกุล <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="เช่น ครูณิชนันทน์ การบุญ"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                อีเมล <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@pongrad.ac.th หรืออีเมลส่วนตัว"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                รหัสผ่าน <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">ความยาวอย่างน้อย 6 ตัวอักษร</p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-navy-900 hover:bg-navy-800 active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-lg shadow-navy-900/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === "signin" ? "เข้าสู่ระบบ" : "ลงทะเบียนและเข้าใช้งานทันที"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Info Box */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-500">
            <HelpCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              สำหรับครูผู้สอน: เลือกชื่อของท่านจากรายการ ระบบจะผูกบัญชีเข้ากับตารางติดตามการส่งสื่อ ภาคเรียนที่ 2/2569 ให้อัตโนมัติทันที
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
