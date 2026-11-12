"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { Teacher, TEACHERS_PRESET } from "@/types/database";
import {
  GraduationCap,
  Lock,
  Mail,
  User as UserIcon,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, signIn, signUp, isConfigured } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"teacher" | "admin">("teacher");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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
      // Fallback preset
      setTeachersList(
        TEACHERS_PRESET.map((t, idx) => ({
          ...t,
          id: `preset-${idx + 1}`,
          created_at: new Date().toISOString(),
        }))
      );
    }
    loadTeachers();
  }, [isConfigured]);

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
          setTimeout(() => router.push("/"), 800);
        }
      } else {
        // Sign up
        if (!fullName.trim()) {
          setErrorMsg("กรุณากรอกชื่อ-นามสกุล");
          setLoading(false);
          return;
        }
        if (role === "teacher" && !selectedTeacherId) {
          setErrorMsg("กรุณาเลือกชื่อครูในระบบที่ตรงกับตัวท่าน");
          setLoading(false);
          return;
        }

        const teacherId = role === "teacher" ? selectedTeacherId : undefined;
        const { error } = await signUp(email, password, fullName, role, teacherId);

        if (error) {
          setErrorMsg(error.message || "เกิดข้อผิดพลาดในการลงทะเบียน");
        } else {
          setSuccessMsg("ลงทะเบียนสำเร็จ! เข้าสู่ระบบเรียบร้อยแล้ว");
          setTimeout(() => router.push("/"), 1200);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-navy-900/5 to-slate-100">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-navy-900 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mb-4 border border-blue-400/30">
            <GraduationCap className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-bold text-navy-950 tracking-tight">
            ระบบส่งสื่อการจัดการเรียนรู้
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="bg-slate-200/80 p-1 rounded-xl flex">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setErrorMsg("");
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
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
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
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
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <span>{errorMsg}</span>
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
                {/* Full name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    ชื่อ - นามสกุล <span className="text-red-500">*</span>
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

                {/* Role select */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    ประเภทผู้ใช้งาน <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole("teacher")}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        role === "teacher"
                          ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>ครูผู้สอน</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("admin")}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        role === "admin"
                          ? "bg-navy-900 border-navy-900 text-white shadow-sm"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span>ผู้ดูแลระบบ (ผอ.)</span>
                    </button>
                  </div>
                </div>

                {/* Link to Teacher in database */}
                {role === "teacher" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      เลือกชื่อครูในระบบ <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={selectedTeacherId}
                      onChange={(e) => {
                        setSelectedTeacherId(e.target.value);
                        const matched = teachersList.find((t) => t.id === e.target.value);
                        if (matched && !fullName) {
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
                )}
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
              className="w-full mt-2 py-3 px-4 bg-navy-900 hover:bg-navy-800 active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-lg shadow-navy-900/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === "signin" ? "เข้าสู่ระบบ" : "ลงทะเบียนและเข้าใช้งาน"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Info Box */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-500">
            <HelpCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              สำหรับครูผู้สอน: กรุณาเลือกลงทะเบียนและผูกชื่อครูของตนเอง เพื่อให้ระบบสามารถบันทึกและแสดงประวัติการส่งสื่อได้อย่างถูกต้อง
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
