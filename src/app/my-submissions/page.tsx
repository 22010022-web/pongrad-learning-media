"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import {
  Submission,
  SubmissionMonth,
  AcademicYear,
  SUBMISSION_MONTHS_PRESET,
  ACADEMIC_YEARS_PRESET,
} from "@/types/database";
import { SubmissionDetailModal } from "@/components/submission-detail-modal";
import { formatDateThai } from "@/lib/utils";
import {
  fetchSchoolSettings,
  getActiveSemesterModeForYear,
  filterMonthsBySemesterMode,
  getSemesterLabel,
  SchoolSettings,
  DEFAULT_SCHOOL_SETTINGS,
} from "@/lib/school-settings";
import { exportSubmissionA4Pdf } from "@/lib/pdf-report";
import { deleteSubmissionCompletely } from "@/lib/delete-submission";
import {
  History,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Trash2,
  Eye,
  Calendar,
  BookOpen,
  LogIn,
  FileText,
  Pencil,
} from "lucide-react";

export default function MySubmissionsPage() {
  const { user, profile, teacher, isConfigured } = useAuth();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [allMonths, setAllMonths] = useState<SubmissionMonth[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(DEFAULT_SCHOOL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [openInEditMode, setOpenInEditMode] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  const teacherId = teacher?.id || profile?.teacher_id;

  useEffect(() => {
    async function loadData() {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const presetMonths = SUBMISSION_MONTHS_PRESET.map((m) => ({
        ...m,
        created_at: "",
      }));
      const presetYears = ACADEMIC_YEARS_PRESET.map((y) => ({
        ...y,
        created_at: "",
      }));

      try {
        const settings = await fetchSchoolSettings();
        setSchoolSettings(settings);

        if (isConfigured) {
          // Fetch academic years
          const { data: yData } = await supabase
            .from("academic_years")
            .select("*")
            .order("year_be", { ascending: false });
          const finalYears =
            yData && yData.length > 0 ? (yData as AcademicYear[]) : presetYears;
          setAcademicYears(finalYears);
          const currentY = finalYears.find((y) => y.is_current) || finalYears[0];
          if (currentY) setSelectedYearId(currentY.id);

          // Fetch months
          const { data: mData } = await supabase
            .from("submission_months")
            .select("*")
            .order("display_order", { ascending: true });
          setAllMonths(
            mData && mData.length > 0 ? (mData as SubmissionMonth[]) : presetMonths
          );

          // Fetch teacher submissions
          let query = supabase
            .from("submissions")
            .select(
              "*, teacher:teachers(*), academic_year:academic_years(*), submission_month:submission_months(*), images:submission_images(*)"
            )
            .order("created_at", { ascending: false });

          if (teacherId) {
            query = query.eq("teacher_id", teacherId);
          } else {
            query = query.eq("created_by", user.id);
          }

          const { data: sData } = await query;
          if (sData) setSubmissions(sData as Submission[]);
        } else {
          setAllMonths(presetMonths);
          setAcademicYears(presetYears);
          setSelectedYearId(presetYears[0].id);
        }
      } catch (err) {
        console.error("Error loading my submissions:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, teacherId, isConfigured]);

  const activeYearObj =
    academicYears.find((y) => y.id === selectedYearId) || academicYears[0];
  const activeYearBe = activeYearObj?.year_be || "2569";
  const activeSemesterMode = getActiveSemesterModeForYear(activeYearBe, schoolSettings);

  const months = useMemo(
    () => filterMonthsBySemesterMode(allMonths, activeSemesterMode),
    [allMonths, activeSemesterMode]
  );

  const yearSubmissions = useMemo(() => {
    if (!selectedYearId) return submissions;
    return submissions.filter((s) => s.academic_year_id === selectedYearId);
  }, [submissions, selectedYearId]);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    setActionMsg("");
    try {
      if (isConfigured) {
        const { error } = await deleteSubmissionCompletely(id);
        if (error) throw error;
      }
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      setActionMsg("ลบรายการผลงานสื่อเรียบร้อยแล้ว");
      setDeleteConfirmId(null);
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการลบข้อมูล: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdatedSubmission = (updated: Submission) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
    );
    setSelectedSubmission((prev) =>
      prev && prev.id === updated.id ? { ...prev, ...updated } : prev
    );
  };

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-160px)] flex items-center justify-center py-12 px-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md w-full space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-navy-950">กรุณาเข้าสู่ระบบก่อน</h2>
          <p className="text-xs text-slate-500">
            ท่านจำเป็นต้องเข้าสู่ระบบเพื่อดูประวัติการส่งสื่อการจัดการเรียนรู้ของตนเอง
          </p>
          <Link
            href="/login"
            className="inline-block w-full py-2.5 px-4 bg-navy-900 text-white rounded-xl text-sm font-semibold hover:bg-navy-800 transition-colors"
          >
            ไปที่หน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    );
  }

  const totalMonthsCount = months.length || 5;
  const completedMonthsCount = months.filter((m) =>
    yearSubmissions.some(
      (s) =>
        s.submission_month_id === m.id || s.submission_month?.month_no === m.month_no
    )
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200 mb-2">
            <History className="w-4 h-4" />
            <span>ประวัติผลงานส่วนตัว</span>
          </div>
          <h1 className="text-2xl font-bold text-navy-950">
            ประวัติการส่งสื่อการจัดการเรียนรู้
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ครูผู้สอน:{" "}
            <strong>{teacher?.name || profile?.full_name || user.email}</strong>{" "}
            {teacher?.grade_level ? `• ${teacher.grade_level}` : ""}{" "}
            {teacher?.subjects ? `(${teacher.subjects})` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {academicYears.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs flex items-center gap-1.5 font-semibold text-slate-700 shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>ปีการศึกษา:</span>
              <select
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="bg-transparent font-bold text-navy-900 focus:outline-none cursor-pointer"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.year_be}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Link
            href="/submit"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>ส่งสื่อการสอนเพิ่ม</span>
          </Link>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Semester Month Status Checklist */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-navy-950">
              สถานะการส่งสื่อ {getSemesterLabel(activeSemesterMode, activeYearBe)}
            </h2>
            <p className="text-xs text-slate-500">
              เป้าหมายอย่างน้อยเดือนละ 1 ชิ้น รวม {totalMonthsCount} เดือน
            </p>
          </div>
          <div className="text-right">
            <span className="text-lg font-extrabold text-blue-700">
              {completedMonthsCount} / {totalMonthsCount}
            </span>
            <span className="text-xs text-slate-500 block">เดือนที่ส่งแล้ว</span>
          </div>
        </div>

        {/* Month Checklist Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2">
          {months.map((m) => {
            const hasSub = yearSubmissions.some(
              (s) =>
                s.submission_month_id === m.id ||
                s.submission_month?.month_no === m.month_no
            );

            return (
              <div
                key={m.id || m.month_no}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  hasSub
                    ? "bg-emerald-50/70 border-emerald-300 text-emerald-900"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <div>
                  <div className="font-semibold text-xs">{m.month_name}</div>
                  <div className="text-[10px] text-slate-400">
                    ภาคเรียนที่ {m.semester}/{activeYearBe}
                  </div>
                </div>
                {hasSub ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-300 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-navy-950">
          รายการผลงานที่ส่งแล้ว ({yearSubmissions.length} รายการ)
        </h2>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            กำลังโหลดรายการ...
          </div>
        ) : yearSubmissions.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="font-bold text-navy-950 text-sm">ยังไม่มีผลงานที่ส่ง</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              เริ่มต้นส่งผลงานสื่อการจัดการเรียนรู้ชิ้นแรกของคุณเพื่อบันทึกประวัติและเป็นหลักฐานการดำเนินงาน
            </p>
            <Link
              href="/submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-navy-900 text-white rounded-xl text-xs font-semibold"
            >
              <PlusCircle className="w-4 h-4" />
              <span>ส่งสื่อการจัดการเรียนรู้</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {yearSubmissions.map((sub) => {
              const cover = sub.cover_image_url || sub.images?.[0]?.image_url;

              return (
                <div
                  key={sub.id}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Thumbnail */}
                    <div
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 cursor-pointer"
                      onClick={() => {
                        setOpenInEditMode(false);
                        setSelectedSubmission(sub);
                      }}
                    >
                      {cover ? (
                        <img
                          src={cover}
                          alt={sub.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                          ไม่มีภาพ
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {sub.submission_month?.month_name || "ประจำเดือน"}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600">{sub.target_grade}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600">{sub.subject_group}</span>
                      </div>

                      <h3
                        onClick={() => {
                          setOpenInEditMode(false);
                          setSelectedSubmission(sub);
                        }}
                        className="font-bold text-navy-950 text-sm sm:text-base cursor-pointer hover:text-blue-700 transition-colors"
                      >
                        {sub.title}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-1 max-w-xl">
                        {sub.objective}
                      </p>

                      <div className="text-[11px] text-slate-400 pt-1">
                        ส่งเมื่อ: {formatDateThai(sub.created_at)} • รูปภาพแนบ:{" "}
                        {sub.images?.length || (sub.cover_image_url ? 1 : 0)} / 10 รูป
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 self-end lg:self-center shrink-0">
                    {/* PDF A4 Report */}
                    <button
                      onClick={() => exportSubmissionA4Pdf(sub)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="ส่งออกรายงาน PDF ขนาด A4 แนวตั้ง"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>รายงาน PDF (A4)</span>
                    </button>

                    {/* Edit submission & images */}
                    <button
                      onClick={() => {
                        setOpenInEditMode(true);
                        setSelectedSubmission(sub);
                      }}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="แก้ไขข้อมูลสื่อ เพิ่มหรือลบรูปภาพ (สูงสุด 10 รูป)"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>แก้ไขสื่อ/รูปภาพ</span>
                    </button>

                    {/* View detail & download images */}
                    <button
                      onClick={() => {
                        setOpenInEditMode(false);
                        setSelectedSubmission(sub);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>ดูรายละเอียด / โหลดภาพ</span>
                    </button>

                    {deleteConfirmId === sub.id ? (
                      <div className="flex items-center gap-1.5 bg-red-50 p-1 rounded-lg border border-red-200">
                        <span className="text-[11px] text-red-700 font-semibold px-1">
                          ยืนยันลบ?
                        </span>
                        <button
                          disabled={deleting}
                          onClick={() => handleDelete(sub.id)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold"
                        >
                          ลบ
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px]"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(sub.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="ลบผลงานนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail & Edit Modal */}
      <SubmissionDetailModal
        submission={selectedSubmission}
        initialEditMode={openInEditMode}
        onClose={() => {
          setSelectedSubmission(null);
          setOpenInEditMode(false);
        }}
        onUpdated={handleUpdatedSubmission}
        onDeleted={(id) => {
          setSubmissions((prev) => prev.filter((s) => s.id !== id));
          setActionMsg("ลบรายการผลงานสื่อเรียบร้อยแล้ว");
        }}
      />
    </div>
  );
}
