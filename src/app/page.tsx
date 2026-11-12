"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";
import {
  fetchSchoolSettings,
  DEFAULT_SCHOOL_SETTINGS,
  SchoolSettings,
} from "@/lib/school-settings";
import {
  Teacher,
  AcademicYear,
  SubmissionMonth,
  Submission,
  TEACHERS_PRESET,
  SUBMISSION_MONTHS_PRESET,
  ACADEMIC_YEARS_PRESET,
} from "@/types/database";
import { SubmissionDetailModal } from "@/components/submission-detail-modal";
import {
  Users,
  CheckCircle2,
  XCircle,
  FileCheck2,
  TrendingUp,
  Calendar,
  Search,
  PlusCircle,
  Sparkles,
  Layers,
  School,
  ArrowUpRight,
  Settings,
} from "lucide-react";

export default function DashboardPage() {
  const { isConfigured, isAdmin } = useAuth();

  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SCHOOL_SETTINGS);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [months, setMonths] = useState<SubmissionMonth[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Modal inspection
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  const currentMonthNo = new Date().getMonth() + 1;

  useEffect(() => {
    fetchSchoolSettings().then(setSettings);
    const handler = (e: Event) => {
      const custom = e as CustomEvent<SchoolSettings>;
      if (custom.detail) setSettings(custom.detail);
    };
    window.addEventListener("school-settings-updated", handler);
    return () => window.removeEventListener("school-settings-updated", handler);
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        if (isConfigured) {
          const { data: teachersData } = await supabase
            .from("teachers")
            .select("*")
            .eq("is_active", true)
            .order("display_order", { ascending: true });

          const { data: yearsData } = await supabase
            .from("academic_years")
            .select("*")
            .order("year_be", { ascending: false });

          const { data: monthsData } = await supabase
            .from("submission_months")
            .select("*")
            .order("display_order", { ascending: true });

          if (teachersData && teachersData.length > 0) {
            setTeachers(teachersData as Teacher[]);
          } else {
            setTeachers(
              TEACHERS_PRESET.map((t) => ({
                ...t,
                created_at: new Date().toISOString(),
              }))
            );
          }

          if (monthsData && monthsData.length > 0) {
            setMonths(monthsData as SubmissionMonth[]);
          } else {
            setMonths(
              SUBMISSION_MONTHS_PRESET.map((m) => ({
                ...m,
                created_at: new Date().toISOString(),
              }))
            );
          }

          if (yearsData && yearsData.length > 0) {
            setAcademicYears(yearsData as AcademicYear[]);
            const currentYear = yearsData.find((y) => y.is_current) || yearsData[0];
            setSelectedYearId(currentYear.id);
          } else {
            const fallbackYears = ACADEMIC_YEARS_PRESET.map((y) => ({
              ...y,
              created_at: new Date().toISOString(),
            }));
            setAcademicYears(fallbackYears);
            setSelectedYearId(fallbackYears[0].id);
          }

          const { data: subsData } = await supabase
            .from("submissions")
            .select(
              "*, teacher:teachers(*), academic_year:academic_years(*), submission_month:submission_months(*), images:submission_images(*)"
            );

          if (subsData) {
            setSubmissions(subsData as Submission[]);
          }
        } else {
          setTeachers(
            TEACHERS_PRESET.map((t) => ({
              ...t,
              created_at: new Date().toISOString(),
            }))
          );
          setMonths(
            SUBMISSION_MONTHS_PRESET.map((m) => ({
              ...m,
              created_at: new Date().toISOString(),
            }))
          );
          const fallbackYears = ACADEMIC_YEARS_PRESET.map((y) => ({
            ...y,
            created_at: new Date().toISOString(),
          }));
          setAcademicYears(fallbackYears);
          setSelectedYearId(fallbackYears[0].id);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isConfigured]);

  const selectedYearObj = useMemo(
    () => academicYears.find((y) => y.id === selectedYearId) || academicYears[0],
    [academicYears, selectedYearId]
  );

  const activeSemesterMode = useMemo(() => {
    const yearBe = selectedYearObj?.year_be || "2569";
    return (
      settings.defaultSemesterByYear[yearBe] ||
      (yearBe === "2569" ? "semester_2" : "all")
    );
  }, [selectedYearObj, settings]);

  // Active months for the selected year (For 2569 -> Semester 2: Nov, Dec, Jan, Feb, Mar only!)
  const activeMonths = useMemo(() => {
    if (activeSemesterMode === "semester_2") {
      return months.filter((m) => m.semester === 2);
    }
    if (activeSemesterMode === "semester_1") {
      return months.filter((m) => m.semester === 1);
    }
    return months;
  }, [months, activeSemesterMode]);

  const activeMonthObj = useMemo(() => {
    return (
      activeMonths.find((m) => m.month_no === currentMonthNo) ||
      activeMonths[0]
    );
  }, [activeMonths, currentMonthNo]);

  const activeMonthIdsSet = useMemo(
    () => new Set(activeMonths.map((m) => m.id)),
    [activeMonths]
  );
  const activeMonthNosSet = useMemo(
    () => new Set(activeMonths.map((m) => m.month_no)),
    [activeMonths]
  );

  // Submissions for the selected academic year AND active semester months
  const yearSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const matchYear = s.academic_year_id === selectedYearId || !selectedYearId;
      const matchMonth =
        activeMonthIdsSet.has(s.submission_month_id) ||
        (s.submission_month && activeMonthNosSet.has(s.submission_month.month_no));
      return matchYear && matchMonth;
    });
  }, [submissions, selectedYearId, activeMonthIdsSet, activeMonthNosSet]);

  // Submissions map for fast lookup: `${teacher_id}_${month_id}` => Submission[]
  const submissionMatrixMap = useMemo(() => {
    const map = new Map<string, Submission[]>();
    for (const sub of yearSubmissions) {
      const key = `${sub.teacher_id}_${sub.submission_month_id}`;
      const existing = map.get(key) || [];
      existing.push(sub);
      map.set(key, existing);
    }
    return map;
  }, [yearSubmissions]);

  const totalTeachers = teachers.length || 9;
  const totalActiveMonthsCount = activeMonths.length || 5;

  // Teachers who submitted in active month
  const submittedCurrentMonthTeachersCount = useMemo(() => {
    if (!activeMonthObj) return 0;
    const submittedTeacherIds = new Set<string>();
    for (const sub of yearSubmissions) {
      if (
        sub.submission_month_id === activeMonthObj.id ||
        sub.submission_month?.month_no === activeMonthObj.month_no
      ) {
        submittedTeacherIds.add(sub.teacher_id);
      }
    }
    return submittedTeacherIds.size;
  }, [yearSubmissions, activeMonthObj]);

  const pendingCurrentMonthCount = Math.max(
    0,
    totalTeachers - submittedCurrentMonthTeachersCount
  );

  const currentMonthDisplayOrder = activeMonthObj
    ? activeMonthObj.display_order
    : activeMonths[0]?.display_order || 6;

  const activeMonthsUpToNow = useMemo(
    () => activeMonths.filter((m) => m.display_order <= currentMonthDisplayOrder),
    [activeMonths, currentMonthDisplayOrder]
  );

  const totalRequiredToDate =
    totalTeachers * Math.max(1, activeMonthsUpToNow.length);

  const totalCompletedSubmissionsToDate = useMemo(() => {
    let count = 0;
    for (const teacher of teachers) {
      for (const m of activeMonthsUpToNow) {
        const key = `${teacher.id}_${m.id}`;
        if (submissionMatrixMap.has(key)) {
          count += 1;
        }
      }
    }
    return count;
  }, [teachers, activeMonthsUpToNow, submissionMatrixMap]);

  const completionPercentage =
    totalRequiredToDate > 0
      ? Math.min(
          100,
          Math.round((totalCompletedSubmissionsToDate / totalRequiredToDate) * 100)
        )
      : 0;

  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const matchSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subjects.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.grade_level.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat =
        filterCategory === "all" || t.category === filterCategory;
      return matchSearch && matchCat;
    });
  }, [teachers, searchQuery, filterCategory]);

  const semesterLabel =
    activeSemesterMode === "semester_2"
      ? `ภาคเรียนที่ 2/${selectedYearObj?.year_be || "2569"}`
      : activeSemesterMode === "semester_1"
      ? `ภาคเรียนที่ 1/${selectedYearObj?.year_be || "2569"}`
      : `ปีการศึกษา ${selectedYearObj?.year_be || "2569"}`;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-navy-950 via-navy-900 to-blue-900 text-white p-6 sm:p-8 shadow-xl border border-navy-800">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
              <School className="w-3.5 h-3.5" />
              <span>แดชบอร์ดติดตามการส่งสื่อ • {semesterLabel}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              ระบบส่งสื่อการจัดการเรียนรู้
            </h1>
            <p className="text-navy-200 text-sm max-w-2xl">
              {settings.schoolName} • ติดตามผลการส่งผลงานสื่อการสอนของครูทั้ง 9 ท่าน ประจำ{semesterLabel} (รวม {totalActiveMonthsCount} เดือน)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Year Selector */}
            <div className="bg-navy-900/80 border border-navy-700 rounded-xl px-3 py-2 flex items-center gap-2 text-xs">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span className="text-navy-300">ปีการศึกษา:</span>
              <select
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id} className="bg-navy-900 text-white">
                    {y.year_be} {y.is_current ? "(ปัจจุบัน)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {isAdmin && (
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-blue-200 text-xs font-semibold border border-navy-700 transition-colors"
                title="เพิ่มปีการศึกษาใหม่ หรือเปลี่ยนโลโก้โรงเรียน"
              >
                <Settings className="w-4 h-4" />
                <span>เพิ่มปีการศึกษา / ตั้งค่า</span>
              </Link>
            )}

            <Link
              href="/submit"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>ส่งสื่อการสอนใหม่</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">จำนวนครูทั้งหมด</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-navy-950">
              {totalTeachers}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              ปฐมวัย 2 คน • ประถม 7 คน
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">
              ส่งแล้วเดือนนี้ ({activeMonthObj?.short_name})
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {submittedCurrentMonthTeachersCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              จากเป้าหมาย {totalTeachers} ท่าน
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">ยังไม่ส่งเดือนนี้</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-600">
              {pendingCurrentMonthCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">รอการส่งผลงาน</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">สื่อในรอบนี้ทั้งหมด</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-700">
              {yearSubmissions.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              ชิ้นงานสื่อ ({semesterLabel})
            </div>
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-blue-600 to-navy-900 text-white p-5 rounded-2xl shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-200 mb-2">
            <span className="text-xs font-semibold">ความก้าวหน้ารวม</span>
            <TrendingUp className="w-4 h-4 text-blue-300" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold">
              {completionPercentage}%
            </div>
            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <div className="text-[11px] text-blue-200 mt-1">
              {totalCompletedSubmissionsToDate} จาก {totalRequiredToDate} งานเป้าหมาย
            </div>
          </div>
        </div>
      </div>

      {/* Main Section: Tracking Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-navy-950 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <span>
                ตารางติดตามการส่งสื่อการจัดการเรียนรู้ ประจำ{semesterLabel} ({totalActiveMonthsCount} เดือน)
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              คลิกที่สถานะ &quot;ส่งแล้ว&quot; เพื่อดูรายละเอียด ดาวน์โหลดรูปภาพ แก้ไขรูปภาพ หรือพิมพ์รายงาน PDF ขนาด A4 แนวตั้ง
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="ค้นหาชื่อครู หรือวิชา..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-44 sm:w-56"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">ทุกระดับชั้น</option>
              <option value="early_childhood">ปฐมวัย (อ.1 - อ.3)</option>
              <option value="primary">ประถมศึกษา (ป.1 - ป.6)</option>
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-slate-50/80 px-4 py-2 border-b border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">สัญลักษณ์สถานะ:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span>ส่งแล้ว (คลิกดูผลงาน / พิมพ์ PDF A4)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
            <span>ยังไม่ส่ง</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-300 inline-block" />
            <span>ยังไม่ถึงกำหนด</span>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-navy-900 text-white font-semibold">
                <th className="py-3.5 px-4 sticky left-0 bg-navy-900 z-10 min-w-[210px] border-r border-navy-800">
                  รายชื่อครูผู้สอน (9 ท่าน)
                </th>
                {activeMonths.map((m) => (
                  <th
                    key={m.id || m.month_no}
                    className={`py-3 px-3 text-center min-w-[95px] border-r border-navy-800 ${
                      m.month_no === currentMonthNo ? "bg-blue-800 font-bold" : ""
                    }`}
                  >
                    <div>{m.month_name}</div>
                    <div className="text-[10px] text-navy-300 font-normal">
                      เทอม {m.semester}/{selectedYearObj?.year_be || "2569"}
                    </div>
                  </th>
                ))}
                <th className="py-3 px-3 text-center min-w-[90px]">รวมส่ง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeachers.map((teacher) => {
                let teacherTotalSubmitted = 0;

                return (
                  <tr
                    key={teacher.id}
                    className="hover:bg-blue-50/40 transition-colors group"
                  >
                    <td className="py-3 px-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-200">
                      <div className="font-semibold text-navy-950 text-sm">
                        {teacher.name}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <span className="font-medium text-blue-700">
                          {teacher.grade_level}
                        </span>
                        <span>•</span>
                        <span className="truncate max-w-[160px]">
                          {teacher.subjects}
                        </span>
                      </div>
                    </td>

                    {activeMonths.map((m) => {
                      const key = `${teacher.id}_${m.id}`;
                      const teacherMonthSubs = submissionMatrixMap.get(key) || [];
                      const hasSubmitted = teacherMonthSubs.length > 0;
                      if (hasSubmitted) teacherTotalSubmitted += 1;

                      const isPastOrCurrent =
                        m.display_order <= currentMonthDisplayOrder;

                      return (
                        <td
                          key={m.id || m.month_no}
                          className={`py-2.5 px-2 text-center border-r border-slate-100 ${
                            m.month_no === currentMonthNo ? "bg-blue-50/30" : ""
                          }`}
                        >
                          {hasSubmitted ? (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedSubmission(teacherMonthSubs[0])
                              }
                              title={`ส่งแล้ว ${teacherMonthSubs.length} ชิ้น (คลิกเพื่อดูรายละเอียด / ดาวน์โหลดภาพ / พิมพ์ PDF)`}
                              className="w-full py-1.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11px] border border-emerald-200 flex flex-col items-center justify-center gap-0.5 shadow-sm transition-all hover:scale-105 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>ส่งแล้ว</span>
                              {teacherMonthSubs.length > 1 && (
                                <span className="text-[9px] text-emerald-800">
                                  ({teacherMonthSubs.length} ชิ้น)
                                </span>
                              )}
                            </button>
                          ) : isPastOrCurrent ? (
                            <div className="w-full py-1.5 px-2 rounded-lg bg-rose-50 text-rose-600 font-medium text-[11px] border border-rose-200 flex flex-col items-center justify-center gap-0.5">
                              <XCircle className="w-3.5 h-3.5 text-rose-500" />
                              <span>ยังไม่ส่ง</span>
                            </div>
                          ) : (
                            <div className="w-full py-1.5 px-2 text-slate-400 font-normal text-[11px] flex items-center justify-center">
                              <span>-</span>
                            </div>
                          )}
                        </td>
                      );
                    })}

                    <td className="py-2 px-3 text-center font-bold text-navy-900 bg-slate-50/50">
                      <span className="inline-block px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs shadow-xs">
                        {teacherTotalSubmitted} / {totalActiveMonthsCount}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Analytics & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Submission Trend */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-navy-950 text-sm sm:text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>สถิติการส่งสื่อรายเดือน ({semesterLabel})</span>
            </h3>
            <span className="text-xs text-slate-400">เป้าหมายเดือนละ 9 คน</span>
          </div>

          <div className="space-y-3.5 pt-2">
            {activeMonths.map((m) => {
              const submittedTeacherIds = new Set(
                yearSubmissions
                  .filter(
                    (s) =>
                      s.submission_month_id === m.id ||
                      s.submission_month?.month_no === m.month_no
                  )
                  .map((s) => s.teacher_id)
              );
              const count = submittedTeacherIds.size;
              const pct = Math.min(100, Math.round((count / totalTeachers) * 100));

              return (
                <div key={m.id || m.month_no} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      เดือน{m.month_name} ({m.short_name})
                    </span>
                    <span className="text-slate-500 font-medium">
                      {count} / {totalTeachers} คน ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        pct === 100
                          ? "bg-emerald-500"
                          : pct >= 50
                          ? "bg-blue-500"
                          : count > 0
                          ? "bg-amber-500"
                          : "bg-slate-200"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Media Types Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-navy-950 text-sm sm:text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>ประเภทของสื่อการจัดการเรียนรู้</span>
              </h3>
              <Link
                href="/gallery"
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
              >
                <span>ดูคลังสื่อทั้งหมด</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {[
                { title: "สื่อทำมือ", color: "bg-amber-50 text-amber-800 border-amber-200" },
                { title: "สื่อบัตรภาพ / บัตรคำ", color: "bg-blue-50 text-blue-800 border-blue-200" },
                { title: "สื่อเกมการศึกษา", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
                { title: "สื่อเทคโนโลยีดิจิทัล", color: "bg-purple-50 text-purple-800 border-purple-200" },
                { title: "สื่อ PowerPoint", color: "bg-rose-50 text-rose-800 border-rose-200" },
                { title: "สื่อวิดีโอ", color: "bg-indigo-50 text-indigo-800 border-indigo-200" },
                { title: "สื่อประกอบการทดลอง", color: "bg-cyan-50 text-cyan-800 border-cyan-200" },
                { title: "วัสดุธรรมชาติ/เหลือใช้", color: "bg-teal-50 text-teal-800 border-teal-200" },
              ].map((item) => {
                const count = yearSubmissions.filter((s) =>
                  s.media_type.includes(item.title.split("/")[0])
                ).length;
                return (
                  <div
                    key={item.title}
                    className={`p-3 rounded-xl border ${item.color} flex items-center justify-between`}
                  >
                    <span className="text-xs font-semibold">{item.title}</span>
                    <span className="text-sm font-bold">{count} ชิ้น</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>สื่อการสอนทั้งหมดในรอบ {semesterLabel}</span>
            <span className="font-bold text-navy-950">{yearSubmissions.length} รายการ</span>
          </div>
        </div>
      </div>

      {/* Submission Detail & Edit Modal */}
      <SubmissionDetailModal
        submission={selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        onUpdated={(updated) => {
          setSubmissions((prev) =>
            prev.map((s) => (s.id === updated.id ? updated : s))
          );
          setSelectedSubmission(updated);
        }}
      />
    </div>
  );
}
