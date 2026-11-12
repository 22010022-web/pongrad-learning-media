"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";
import { AcademicYear, ACADEMIC_YEARS_PRESET } from "@/types/database";
import {
  SchoolSettings,
  DEFAULT_SCHOOL_SETTINGS,
  SemesterMode,
  fetchSchoolSettings,
  saveSchoolSettings,
  uploadSchoolLogo,
} from "@/lib/school-settings";
import {
  Settings,
  UploadCloud,
  Calendar,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  ShieldCheck,
  Save,
  Trash2,
  ArrowLeft,
  Star,
} from "lucide-react";

export default function SettingsPage() {
  const { user, isAdmin, isConfigured, refreshProfile } = useAuth();

  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SCHOOL_SETTINGS);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [newYearBe, setNewYearBe] = useState("");
  const [newYearSemesterMode, setNewYearSemesterMode] = useState<SemesterMode>("all");

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [addingYear, setAddingYear] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchSchoolSettings().then(setSettings);
    loadYears();
  }, [isConfigured]);

  const loadYears = async () => {
    const presetYears = ACADEMIC_YEARS_PRESET.map((y) => ({
      ...y,
      created_at: new Date().toISOString(),
    }));

    if (isConfigured) {
      const { data } = await supabase
        .from("academic_years")
        .select("*")
        .order("year_be", { ascending: false });
      if (data && data.length > 0) {
        setAcademicYears(data as AcademicYear[]);
        return;
      }
    }
    setAcademicYears(presetYears);
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg("");
    setSuccessMsg("");
    setUploadingLogo(true);

    try {
      const { url, error } = await uploadSchoolLogo(file);
      if (error || !url) {
        throw error || new Error("อัปโหลดโลโก้ไม่สำเร็จ");
      }
      const nextSettings: SchoolSettings = {
        ...settings,
        logoUrl: url,
      };
      setSettings(nextSettings);
      await saveSchoolSettings(nextSettings);
      setSuccessMsg("อัปโหลดและเปลี่ยนโลโก้โรงเรียนเรียบร้อยแล้ว!");
    } catch (err: any) {
      setErrorMsg(err?.message || "เกิดข้อผิดพลาดในการอัปโหลดโลโก้");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const handleResetLogo = async () => {
    const nextSettings: SchoolSettings = {
      ...settings,
      logoUrl: null,
    };
    setSettings(nextSettings);
    await saveSchoolSettings(nextSettings);
    setSuccessMsg("รีเซ็ตโลโก้โรงเรียนกลับเป็นค่าเริ่มต้นแล้ว");
  };

  const handleSaveGeneralSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { error } = await saveSchoolSettings(settings);
      if (error) throw error;
      setSuccessMsg("บันทึกการตั้งค่าระบบและรอบภาคเรียนเรียบร้อยแล้ว!");
    } catch (err: any) {
      setErrorMsg(err?.message || "ไม่สามารถบันทึกการตั้งค่าได้");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSemesterModeChange = async (yearBe: string, mode: SemesterMode) => {
    const nextSettings: SchoolSettings = {
      ...settings,
      defaultSemesterByYear: {
        ...settings.defaultSemesterByYear,
        [yearBe]: mode,
      },
    };
    setSettings(nextSettings);
    await saveSchoolSettings(nextSettings);
    setSuccessMsg(`ตั้งค่ารอบการส่งสื่อของปีการศึกษา ${yearBe} เรียบร้อยแล้ว`);
  };

  const handleAddYear = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanYear = newYearBe.trim();
    if (!cleanYear || !/^\d{4}$/.test(cleanYear)) {
      setErrorMsg("กรุณาระบุปีการศึกษาเป็นตัวเลข พ.ศ. 4 หลัก เช่น 2570");
      return;
    }

    if (academicYears.some((y) => y.year_be === cleanYear)) {
      setErrorMsg(`มีปีการศึกษา ${cleanYear} อยู่ในระบบแล้ว`);
      return;
    }

    setAddingYear(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      let createdYear: AcademicYear = {
        id: `00000000-0000-0000-0003-00000000${cleanYear}`,
        year_be: cleanYear,
        is_current: false,
        created_at: new Date().toISOString(),
      };

      if (isConfigured) {
        const { data, error } = await supabase
          .from("academic_years")
          .insert({
            year_be: cleanYear,
            is_current: false,
          })
          .select()
          .single();
        if (error) throw error;
        if (data) createdYear = data as AcademicYear;
      }

      setAcademicYears((prev) =>
        [createdYear, ...prev].sort((a, b) => b.year_be.localeCompare(a.year_be))
      );

      // Save semester mode for this new year
      const nextSettings: SchoolSettings = {
        ...settings,
        defaultSemesterByYear: {
          ...settings.defaultSemesterByYear,
          [cleanYear]: newYearSemesterMode,
        },
      };
      setSettings(nextSettings);
      await saveSchoolSettings(nextSettings);

      setNewYearBe("");
      setSuccessMsg(`เพิ่มปีการศึกษา ${cleanYear} สำเร็จเรียบร้อยแล้ว!`);
    } catch (err: any) {
      setErrorMsg(err?.message || "ไม่สามารถเพิ่มปีการศึกษาได้");
    } finally {
      setAddingYear(false);
    }
  };

  const handleSetCurrentYear = async (targetYear: AcademicYear) => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      if (isConfigured) {
        await supabase
          .from("academic_years")
          .update({ is_current: false })
          .neq("id", targetYear.id);
        await supabase
          .from("academic_years")
          .update({ is_current: true })
          .eq("id", targetYear.id);
      }

      setAcademicYears((prev) =>
        prev.map((y) => ({
          ...y,
          is_current: y.id === targetYear.id,
        }))
      );
      setSuccessMsg(`ตั้งค่าปีการศึกษา ${targetYear.year_be} เป็นปีการศึกษาปัจจุบันแล้ว!`);
    } catch (err: any) {
      setErrorMsg(err?.message || "เกิดข้อผิดพลาดในการเปลี่ยนปีการศึกษาปัจจุบัน");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      {/* Top Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-navy-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับหน้าหลัก</span>
        </Link>
        <span className="text-xs text-slate-400">
          จัดการระบบหลังบ้าน (ผู้ดูแลระบบ: ผอ. / ครูเอก)
        </span>
      </div>

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200 mb-2">
            <Settings className="w-4 h-4" />
            <span>ตั้งค่าระบบสถานศึกษา</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy-950">
            ตั้งค่าโลโก้โรงเรียน ปีการศึกษา และรอบการส่งสื่อ
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            เปลี่ยนตราประจำโรงเรียน ตั้งค่าผู้บริหาร และกำหนดปีการศึกษา/ภาคเรียนที่เปิดรับสื่อ
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs sm:text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Section 1: School Logo & School Info */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <h2 className="text-base font-bold text-navy-950 border-b border-slate-100 pb-3 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-blue-600" />
          <span>1. โลโก้โรงเรียนและข้อมูลสำหรับพิมพ์รายงาน PDF (A4)</span>
        </h2>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Logo Preview */}
          <div className="w-28 h-28 rounded-2xl border-2 border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="School Logo"
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <div className="flex flex-col items-center text-slate-400">
                <GraduationCap className="w-10 h-10 text-blue-600 mb-1" />
                <span className="text-[10px]">โลโก้เริ่มต้น</span>
              </div>
            )}
          </div>

          <div className="space-y-3 text-center sm:text-left">
            <div>
              <h3 className="text-sm font-bold text-navy-950">
                อัปโหลดโลโก้โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                โลโก้นี้จะแสดงบนแถบเมนูด้านบน หน้าเข้าสู่ระบบ และหัวกระดาษรายงาน PDF ขนาด A4 แนวตั้ง
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-colors">
                <UploadCloud className="w-4 h-4" />
                <span>{uploadingLogo ? "กำลังอัปโหลด..." : "เลือกรูปโลโก้โรงเรียนใหม่"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handleLogoFileChange}
                  disabled={uploadingLogo}
                  className="hidden"
                />
              </label>

              {settings.logoUrl && (
                <button
                  type="button"
                  onClick={handleResetLogo}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ใช้ไอคอนมาตรฐาน</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveGeneralSettings} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อสถานศึกษา
            </label>
            <input
              type="text"
              value={settings.schoolName}
              onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อ-นามสกุล ผู้อำนวยการโรงเรียน (สำหรับช่องลงนามในรายงาน PDF)
            </label>
            <input
              type="text"
              value={settings.directorName}
              onChange={(e) => setSettings({ ...settings, directorName: e.target.value })}
              placeholder="เว้นว่างไว้หากต้องการให้แสดงเส้นประ (........................................)"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? "กำลังบันทึก..." : "บันทึกข้อมูลสถานศึกษา"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Section 2: Academic Years & Semester Control */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-navy-950 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>2. จัดการปีการศึกษา และกำหนดภาคเรียนที่เปิดรับสื่อ</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            สำหรับปีการศึกษา 2569 ระบบตั้งค่าให้แสดงเฉพาะ <strong>ภาคเรียนที่ 2/2569 (5 เดือน: พ.ย. – มี.ค.)</strong> และท่านสามารถเพิ่มปีการศึกษาใหม่ (เช่น 2570, 2571) สำหรับปีต่อๆ ไปได้จากที่นี่
          </p>
        </div>

        {/* Add New Year Form */}
        <form
          onSubmit={handleAddYear}
          className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
        >
          <div className="flex-1">
            <label className="block text-xs font-bold text-navy-950 mb-1">
              เพิ่มปีการศึกษาใหม่ (พ.ศ.)
            </label>
            <input
              type="text"
              maxLength={4}
              value={newYearBe}
              onChange={(e) => setNewYearBe(e.target.value)}
              placeholder="เช่น 2570 หรือ 2571"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold"
            />
          </div>

          <div className="sm:w-64">
            <label className="block text-xs font-bold text-navy-950 mb-1">
              รอบภาคเรียนที่เปิดรับ
            </label>
            <select
              value={newYearSemesterMode}
              onChange={(e) => setNewYearSemesterMode(e.target.value as SemesterMode)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium"
            >
              <option value="all">ทั้งปีการศึกษา (เทอม 1 + เทอม 2 = 10 เดือน)</option>
              <option value="semester_2">เฉพาะภาคเรียนที่ 2 (พ.ย. – มี.ค. = 5 เดือน)</option>
              <option value="semester_1">เฉพาะภาคเรียนที่ 1 (พ.ค. – ก.ย. = 5 เดือน)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={addingYear}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{addingYear ? "กำลังเพิ่ม..." : "+ เพิ่มปีการศึกษา"}</span>
          </button>
        </form>

        {/* Years List */}
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {academicYears.map((y) => {
            const mode: SemesterMode =
              settings.defaultSemesterByYear[y.year_be] ||
              (y.year_be === "2569" ? "semester_2" : "all");

            return (
              <div
                key={y.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl font-extrabold text-xs flex items-center justify-center ${
                      y.is_current
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {y.year_be}
                  </div>
                  <div>
                    <div className="font-bold text-navy-950 text-sm flex items-center gap-2">
                      <span>ปีการศึกษา {y.year_be}</span>
                      {y.is_current && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                          ปีการศึกษาปัจจุบัน
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {mode === "semester_2"
                        ? "เปิดรับเฉพาะ ภาคเรียนที่ 2 (พ.ย., ธ.ค., ม.ค., ก.พ., มี.ค. รวม 5 เดือน)"
                        : mode === "semester_1"
                        ? "เปิดรับเฉพาะ ภาคเรียนที่ 1 (พ.ค., มิ.ย., ก.ค., ส.ค., ก.ย. รวม 5 เดือน)"
                        : "เปิดรับทั้งปีการศึกษา (เทอม 1 + เทอม 2 รวม 10 เดือน)"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={mode}
                    onChange={(e) =>
                      handleSemesterModeChange(y.year_be, e.target.value as SemesterMode)
                    }
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-navy-900"
                  >
                    <option value="semester_2">เฉพาะเทอม 2 (5 เดือน: พ.ย.–มี.ค.)</option>
                    <option value="semester_1">เฉพาะเทอม 1 (5 เดือน: พ.ค.–ก.ย.)</option>
                    <option value="all">ทั้งปีการศึกษา (10 เดือน)</option>
                  </select>

                  {!y.is_current && (
                    <button
                      type="button"
                      onClick={() => handleSetCurrentYear(y)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200 cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5" />
                      <span>ตั้งเป็นปีปัจจุบัน</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
