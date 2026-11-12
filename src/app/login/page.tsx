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
  KeyRound,
  ArrowLeft,
} from "lucide-react";

const PASSWORD_RESET_RPC_SQL = `-- เปิดใช้งานระบบรีเซ็ตรหัสผ่านอัตโนมัติ (รันครั้งเดียวใน Supabase SQL Editor)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.reset_teacher_password(
  p_email TEXT,
  p_teacher_id UUID,
  p_new_password TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF char_length(p_new_password) < 6 THEN
    RAISE EXCEPTION 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
  END IF;

  SELECT u.id INTO v_user_id
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE lower(u.email) = lower(trim(p_email))
    AND (
      p.teacher_id = p_teacher_id
      OR (u.raw_user_meta_data->>'teacher_id') = p_teacher_id::text
    )
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE auth.users
  SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW()
  WHERE id = v_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.reset_teacher_password(TEXT, UUID, TEXT) TO anon, authenticated;`;

export default function LoginPage() {
  const router = useRouter();
  const { user, signIn, signUp, isConfigured, isSchemaReady } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [forgotMethod, setForgotMethod] = useState<"instant" | "email">("instant");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SCHOOL_SETTINGS);

  const [registeredTeacherIds, setRegisteredTeacherIds] = useState<string[]>([]);
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
  const [needsResetRpcSql, setNeedsResetRpcSql] = useState(false);
  const [copiedResetSql, setCopiedResetSql] = useState(false);

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

  // Load teachers for linking & check already registered teachers
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
        }

        // Fetch already registered teacher_ids
        const { data: profiles } = await supabase
          .from("profiles")
          .select("teacher_id")
          .not("teacher_id", "is", null);
        if (profiles) {
          const ids = profiles.map((p) => p.teacher_id).filter(Boolean);
          setRegisteredTeacherIds(ids as string[]);
        }
        return;
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

  const handleCopyResetSql = async () => {
    try {
      await navigator.clipboard.writeText(PASSWORD_RESET_RPC_SQL);
      setCopiedResetSql(true);
      setTimeout(() => setCopiedResetSql(false), 3000);
    } catch {
      const el = document.createElement("textarea");
      el.value = PASSWORD_RESET_RPC_SQL;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedResetSql(true);
      setTimeout(() => setCopiedResetSql(false), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setNeedsResetRpcSql(false);
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
      } else if (mode === "signup") {
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

        // Security check: Ensure this teacher has not been registered yet
        if (isConfigured) {
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id, email")
            .eq("teacher_id", selectedTeacherId)
            .maybeSingle();

          if (existingProfile) {
            setErrorMsg(
              "ชื่อครูท่านนี้มีผู้ลงทะเบียนใช้งานในระบบแล้ว หากเป็นบัญชีของท่านกรุณาใช้เมนู 'ลืมรหัสผ่าน?' เพื่อกู้คืนบัญชี หรือติดต่อผู้ดูแลระบบ"
            );
            setLoading(false);
            return;
          }
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
      } else if (mode === "forgot") {
        if (!email.trim()) {
          setErrorMsg("กรุณากรอกอีเมลที่ใช้ในระบบ");
          setLoading(false);
          return;
        }

        if (forgotMethod === "email") {
          const redirectTo =
            typeof window !== "undefined"
              ? `${window.location.origin}/reset-password`
              : undefined;
          const { error } = await supabase.auth.resetPasswordForEmail(
            email.trim(),
            redirectTo ? { redirectTo } : undefined
          );
          if (error) {
            setErrorMsg(
              "ไม่สามารถส่งลิงก์ทางอีเมลได้ (" +
                error.message +
                ") กรุณาลองใช้วิธี 'ตั้งรหัสผ่านใหม่ทันที' ด้านซ้ายแทนครับ"
            );
          } else {
            setSuccessMsg(
              "ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปยังอีเมลของท่านเรียบร้อยแล้ว กรุณาตรวจสอบในกล่องข้อความ (หรือกล่องจดหมายขยะ)"
            );
          }
        } else {
          // Instant reset by verifying Teacher + Email
          if (!selectedTeacherId) {
            setErrorMsg("กรุณาเลือกชื่อครูในระบบเพื่อยืนยันตัวตน");
            setLoading(false);
            return;
          }
          if (password.length < 6) {
            setErrorMsg("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
            setLoading(false);
            return;
          }
          if (password !== confirmNewPassword) {
            setErrorMsg("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
            setLoading(false);
            return;
          }

          const { data: resetOk, error: rpcError } = await supabase.rpc(
            "reset_teacher_password",
            {
              p_email: email.trim(),
              p_teacher_id: selectedTeacherId,
              p_new_password: password,
            }
          );

          if (rpcError) {
            if (
              rpcError.message?.includes("reset_teacher_password") ||
              rpcError.code === "PGRST202"
            ) {
              // Automatically send reset email as fallback AND show 1-click SQL setup
              const redirectTo =
                typeof window !== "undefined"
                  ? `${window.location.origin}/reset-password`
                  : undefined;
              await supabase.auth.resetPasswordForEmail(
                email.trim(),
                redirectTo ? { redirectTo } : undefined
              );
              setNeedsResetRpcSql(true);
              setErrorMsg(
                "ระบบได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลของท่านแล้ว (หรือหากผู้ดูแลระบบต้องการเปิดโหมดเปลี่ยนรหัสผ่านทันทีโดยไม่ต้องรออีเมล สามารถคัดลอก SQL ด้านล่างไปรันใน Supabase ได้เลย)"
              );
            } else {
              setErrorMsg(rpcError.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
            }
          } else if (resetOk === false) {
            setErrorMsg(
              "ไม่พบข้อมูลบัญชีที่ตรงกับอีเมลและชื่อครูที่เลือก กรุณาตรวจสอบอีเมลและชื่อครูอีกครั้ง"
            );
          } else {
            setSuccessMsg("เปลี่ยนรหัสผ่านใหม่สำเร็จ! กำลังเข้าสู่ระบบอัตโนมัติ...");
            const { error: signInErr } = await signIn(email.trim(), password);
            if (!signInErr) {
              setTimeout(() => router.push("/"), 800);
            } else {
              setMode("signin");
            }
          }
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
        {mode !== "forgot" ? (
          <div className="bg-slate-200/80 p-1 rounded-xl flex">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setErrorMsg("");
                setSuccessMsg("");
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
                setSuccessMsg("");
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
        ) : (
          <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <KeyRound className="w-4 h-4 text-amber-600" />
              <span>ระบบกู้คืน / ตั้งรหัสผ่านใหม่ (ลืมรหัสผ่าน)</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setErrorMsg("");
                setSuccessMsg("");
                setNeedsResetRpcSql(false);
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>กลับหน้าเข้าสู่ระบบ</span>
            </button>
          </div>
        )}

        {/* Form Box */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80">
          {errorMsg && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs sm:text-sm space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                <span>{errorMsg}</span>
              </div>
              {needsResetRpcSql && (
                <div className="flex flex-wrap items-center gap-2 pt-1 pl-7">
                  <button
                    type="button"
                    onClick={handleCopyResetSql}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {copiedResetSql ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {copiedResetSql
                        ? "คัดลอก SQL แล้ว!"
                        : "1. คัดลอก SQL เปิดโหมดเปลี่ยนรหัสผ่านทันที"}
                    </span>
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
              {!needsResetRpcSql && (errorMsg.includes("SQL") || !isSchemaReady) && (
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
            {mode === "forgot" && (
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setForgotMethod("instant");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className={`py-2 px-2 rounded-lg transition-all cursor-pointer ${
                    forgotMethod === "instant"
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-slate-600 hover:text-navy-900"
                  }`}
                >
                  ตั้งรหัสใหม่ทันที (ครูผู้สอน)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForgotMethod("email");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className={`py-2 px-2 rounded-lg transition-all cursor-pointer ${
                    forgotMethod === "email"
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-slate-600 hover:text-navy-900"
                  }`}
                >
                  ส่งลิงก์ไปที่อีเมล
                </button>
              </div>
            )}

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
                        .map((t) => {
                          const isAlreadyRegistered = registeredTeacherIds.includes(t.id);
                          return (
                            <option
                              key={t.id}
                              value={t.id}
                              disabled={isAlreadyRegistered}
                              className={isAlreadyRegistered ? "text-slate-400 bg-slate-100" : ""}
                            >
                              {t.name} ({t.grade_level})
                              {isAlreadyRegistered ? " [ลงทะเบียนแล้ว]" : ""}
                            </option>
                          );
                        })}
                    </optgroup>
                    <optgroup label="กลุ่มที่ 2 ครูระดับประถมศึกษา">
                      {teachersList
                        .filter((t) => t.category === "primary")
                        .map((t) => {
                          const isAlreadyRegistered = registeredTeacherIds.includes(t.id);
                          return (
                            <option
                              key={t.id}
                              value={t.id}
                              disabled={isAlreadyRegistered}
                              className={isAlreadyRegistered ? "text-slate-400 bg-slate-100" : ""}
                            >
                              {t.name} ({t.grade_level}) - {t.subjects}
                              {isAlreadyRegistered ? " [ลงทะเบียนแล้ว]" : ""}
                            </option>
                          );
                        })}
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

            {mode === "forgot" && forgotMethod === "instant" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  1. เลือกชื่อครูในระบบเพื่อยืนยันตัวตน <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                >
                  <option value="">-- เลือกชื่อครูของท่าน --</option>
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
                          {t.name} ({t.grade_level})
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {mode === "forgot" && forgotMethod === "instant"
                  ? "2. อีเมลที่ใช้ลงทะเบียนไว้"
                  : "อีเมล"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="กรอกอีเมลที่ใช้สมัครสมาชิก"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Password */}
            {(mode !== "forgot" || forgotMethod === "instant") && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    {mode === "forgot" ? "3. ตั้งรหัสผ่านใหม่" : "รหัสผ่าน"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setErrorMsg("");
                        setSuccessMsg("");
                        setPassword("");
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      ลืมรหัสผ่าน?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      mode === "forgot"
                        ? "กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                        : "••••••••"
                    }
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">ความยาวอย่างน้อย 6 ตัวอักษร</p>
              </div>
            )}

            {mode === "forgot" && forgotMethod === "instant" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  4. ยืนยันรหัสผ่านใหม่อีกครั้ง <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            )}

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
                  <span>
                    {mode === "signin"
                      ? "เข้าสู่ระบบ"
                      : mode === "signup"
                      ? "ลงทะเบียนและเข้าใช้งานทันที"
                      : forgotMethod === "instant"
                      ? "บันทึกรหัสผ่านใหม่และเข้าสู่ระบบ"
                      : "ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมล"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Info Box */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-500">
            <HelpCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              {mode === "forgot"
                ? "สำหรับครูผู้สอน: สามารถเลือกชื่อครูและอีเมลที่เคยลงทะเบียนไว้เพื่อตั้งรหัสผ่านใหม่ได้ทันที หรือเลือกส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมล"
                : "สำหรับครูผู้สอน: เลือกชื่อของท่านจากรายการ ระบบจะผูกบัญชีเข้ากับตารางติดตามการส่งสื่อ ภาคเรียนที่ 2/2569 ให้อัตโนมัติทันที"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
