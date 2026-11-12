"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";
import {
  Teacher,
  AcademicYear,
  SubmissionMonth,
  Submission,
  TEACHERS_PRESET,
  SUBMISSION_MONTHS_PRESET,
  ACADEMIC_YEARS_PRESET,
} from "@/types/database";
import { formatDateThai } from "@/lib/utils";
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  School,
  Users,
  Award,
  ArrowLeft,
  ShieldAlert,
} from "lucide-react";

export default function ReportsPage() {
  const { user, isAdmin, isConfigured } = useAuth();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [months, setMonths] = useState<SubmissionMonth[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Month filter for individual month deep dive
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("all");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const presetTeachers = TEACHERS_PRESET.map((t) => ({ ...t, created_at: "" }));
      const presetMonths = SUBMISSION_MONTHS_PRESET.map((m) => ({ ...m, created_at: "" }));
      const presetYears = ACADEMIC_YEARS_PRESET.map((y) => ({ ...y, created_at: "" }));

      try {
        if (isConfigured) {
          const { data: tData } = await supabase
            .from("teachers")
            .select("*")
            .eq("is_active", true)
            .order("display_order", { ascending: true });
          setTeachers(tData && tData.length > 0 ? (tData as Teacher[]) : presetTeachers);

          const { data: yData } = await supabase
            .from("academic_years")
            .select("*")
            .order("year_be", { ascending: false });
          const finalYears = yData && yData.length > 0 ? (yData as AcademicYear[]) : presetYears;
          setAcademicYears(finalYears);
          const currentY = finalYears.find((y) => y.is_current) || finalYears[0];
          setSelectedYearId(currentY.id);

          const { data: mData } = await supabase
            .from("submission_months")
            .select("*")
            .order("display_order", { ascending: true });
          setMonths(mData && mData.length > 0 ? (mData as SubmissionMonth[]) : presetMonths);

          const { data: sData } = await supabase
            .from("submissions")
            .select(
              "*, teacher:teachers(*), academic_year:academic_years(*), submission_month:submission_months(*)"
            );
          if (sData) setSubmissions(sData as Submission[]);
        } else {
          setTeachers(presetTeachers);
          setMonths(presetMonths);
          setAcademicYears(presetYears);
          setSelectedYearId(presetYears[0].id);
        }
      } catch (err) {
        console.error("Error loading report data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isConfigured]);

  const activeYearObj = academicYears.find((y) => y.id === selectedYearId) || academicYears[0];

  // Filter submissions by year
  const yearSubmissions = useMemo(() => {
    return submissions.filter((s) => s.academic_year_id === selectedYearId || !selectedYearId);
  }, [submissions, selectedYearId]);

  // Submission matrix map: `${teacher_id}_${month_id}` => Submission[]
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

  // Export to Excel handler
  const handleExportExcel = () => {
    const yearBe = activeYearObj?.year_be || "2569";

    // 1. Sheet 1: Matrix tracking
    const matrixData = teachers.map((teacher, idx) => {
      const row: Record<string, any> = {
        "ลำดับ": idx + 1,
        "ชื่อ-นามสกุล": teacher.name,
        "ระดับชั้น": teacher.grade_level,
        "วิชาที่สอน": teacher.subjects,
      };

      let submittedCount = 0;
      months.forEach((m) => {
        const key = `${teacher.id}_${m.id}`;
        const hasSub = (submissionMatrixMap.get(key) || []).length > 0;
        row[m.month_name] = hasSub ? "ส่งแล้ว" : "ยังไม่ส่ง";
        if (hasSub) submittedCount += 1;
      });

      row["รวมส่ง (เดือน)"] = submittedCount;
      row["สถานะร้อยละ (%)"] = Math.round((submittedCount / (months.length || 10)) * 100);
      return row;
    });

    // 2. Sheet 2: All Submissions List
    const submissionsDetailData = yearSubmissions.map((sub, idx) => ({
      "ลำดับ": idx + 1,
      "ชื่อครูผู้ส่ง": sub.teacher?.name || "-",
      "ระดับชั้น": sub.target_grade,
      "รายวิชา": sub.subject_group,
      "ชื่อสื่อการจัดการเรียนรู้": sub.title,
      "ประเภทสื่อ": sub.media_type,
      "เดือนที่ส่ง": sub.submission_month?.month_name || "-",
      "ปีการศึกษา": sub.academic_year?.year_be || yearBe,
      "วัตถุประสงค์": sub.objective,
      "วิธีการใช้สื่อ": sub.usage_description,
      "ผลลัพธ์ผู้เรียน": sub.student_outcome,
      "วันที่ส่งข้อมูล": formatDateThai(sub.created_at),
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();
    const wsMatrix = XLSX.utils.json_to_sheet(matrixData);
    const wsDetail = XLSX.utils.json_to_sheet(submissionsDetailData);

    XLSX.utils.book_append_sheet(wb, wsMatrix, "สรุปการส่งสื่อ 10 เดือน");
    XLSX.utils.book_append_sheet(wb, wsDetail, "รายการสื่อทั้งหมด");

    // Save file
    XLSX.writeFile(wb, `รายงานการส่งสื่อการจัดการเรียนรู้_รร.วัดโป่งแรด_ปีการศึกษา_${yearBe}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Top Controls */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200 mb-2">
            <BarChart3 className="w-4 h-4" />
            <span>รายงานสำหรับผู้บริหาร</span>
          </div>
          <h1 className="text-2xl font-bold text-navy-950">
            รายงานการส่งสื่อการจัดการเรียนรู้
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร) • สำนักงานเขตพื้นที่การศึกษาประถมศึกษาจันทบุรี เขต 1
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year selector */}
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

          {/* Export to Excel */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ดาวน์โหลด Excel</span>
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์รายงาน</span>
          </button>
        </div>
      </div>

      {/* Official Header for Print */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-none space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-lg sm:text-xl font-bold text-navy-950">
            แบบรายงานสรุปการส่งสื่อการจัดการเรียนรู้ของครูผู้สอน
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร) ประจำปีการศึกษา {activeYearObj?.year_be || "2569"}
          </p>
          <p className="text-xs text-slate-400">
            เกณฑ์การติดตาม: ครูทุกคนส่งผลงานสื่ออย่างน้อยเดือนละ 1 ชิ้น รวม 10 เดือน (เว้นช่วงปิดภาคเรียนเดือนตุลาคม)
          </p>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto pt-4">
          <table className="w-full text-left text-xs border border-slate-200 border-collapse">
            <thead>
              <tr className="bg-navy-900 text-white font-semibold">
                <th className="py-2.5 px-3 border border-navy-800 text-center w-12">ที่</th>
                <th className="py-2.5 px-3 border border-navy-800 min-w-[170px]">ชื่อ - สกุล</th>
                <th className="py-2.5 px-3 border border-navy-800 min-w-[130px]">ระดับชั้น / หน้าที่</th>
                {months.map((m) => (
                  <th
                    key={m.id || m.month_no}
                    className="py-2 px-1 text-center border border-navy-800 min-w-[55px]"
                  >
                    <div>{m.short_name}</div>
                  </th>
                ))}
                <th className="py-2.5 px-2 text-center border border-navy-800 min-w-[65px]">รวมส่ง</th>
                <th className="py-2.5 px-2 text-center border border-navy-800 min-w-[65px]">ร้อยละ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {teachers.map((teacher, idx) => {
                let submittedCount = 0;

                return (
                  <tr key={teacher.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-2 text-center border border-slate-200 font-medium text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 border border-slate-200 font-semibold text-navy-950">
                      {teacher.name}
                    </td>
                    <td className="py-2.5 px-3 border border-slate-200 text-slate-600">
                      <div>{teacher.grade_level}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{teacher.subjects}</div>
                    </td>
                    {months.map((m) => {
                      const key = `${teacher.id}_${m.id}`;
                      const hasSub = (submissionMatrixMap.get(key) || []).length > 0;
                      if (hasSub) submittedCount += 1;

                      return (
                        <td
                          key={m.id || m.month_no}
                          className="py-2 px-1 text-center border border-slate-200"
                        >
                          {hasSub ? (
                            <span className="inline-block text-emerald-700 font-bold text-[11px]">
                              ✓
                            </span>
                          ) : (
                            <span className="inline-block text-rose-500 font-medium text-[11px]">
                              -
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-2 text-center border border-slate-200 font-bold text-navy-950">
                      {submittedCount} / {months.length || 10}
                    </td>
                    <td className="py-2.5 px-2 text-center border border-slate-200 font-bold text-blue-700">
                      {Math.round((submittedCount / (months.length || 10)) * 100)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Signature Line for Director (for Official Print) */}
        <div className="pt-12 grid grid-cols-2 text-center text-xs text-slate-700">
          <div>
            <p className="mb-10">ลงชื่อ........................................................ ผู้รายงาน</p>
            <p>(........................................................)</p>
            <p className="text-[11px] text-slate-500">ครูผู้รับผิดชอบงานสื่อการเรียนการสอน</p>
          </div>
          <div>
            <p className="mb-10">ลงชื่อ........................................................ ผู้รับรอง</p>
            <p>(........................................................)</p>
            <p className="text-[11px] text-slate-500">ผู้อำนวยการโรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
