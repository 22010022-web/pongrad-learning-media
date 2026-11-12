"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";
import {
  Submission,
  Teacher,
  SubmissionMonth,
  AcademicYear,
  MEDIA_TYPES,
  GRADE_LEVELS,
} from "@/types/database";
import { SubmissionDetailModal } from "@/components/submission-detail-modal";
import { formatDateThai } from "@/lib/utils";
import {
  LayoutGrid,
  Search,
  Filter,
  Eye,
  Images,
  GraduationCap,
  BookOpen,
  Calendar,
  Tag,
  PlusCircle,
  Sparkles,
  School,
  X,
} from "lucide-react";

export default function GalleryPage() {
  const { isConfigured } = useAuth();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [months, setMonths] = useState<SubmissionMonth[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("all");
  const [selectedMonthId, setSelectedMonthId] = useState("all");
  const [selectedMediaType, setSelectedMediaType] = useState("all");
  const [selectedGrade, setSelectedGrade] = useState("all");

  // Detail Modal
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        if (isConfigured) {
          // Submissions with joins
          const { data: subData } = await supabase
            .from("submissions")
            .select(
              "*, teacher:teachers(*), academic_year:academic_years(*), submission_month:submission_months(*), images:submission_images(*)"
            )
            .order("created_at", { ascending: false });

          if (subData) setSubmissions(subData as Submission[]);

          // Teachers
          const { data: tData } = await supabase
            .from("teachers")
            .select("*")
            .eq("is_active", true)
            .order("display_order", { ascending: true });
          if (tData) setTeachers(tData as Teacher[]);

          // Months
          const { data: mData } = await supabase
            .from("submission_months")
            .select("*")
            .order("display_order", { ascending: true });
          if (mData) setMonths(mData as SubmissionMonth[]);

          // Academic Years
          const { data: yData } = await supabase
            .from("academic_years")
            .select("*")
            .order("year_be", { ascending: false });
          if (yData) setAcademicYears(yData as AcademicYear[]);
        }
      } catch (err) {
        console.error("Error loading gallery data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isConfigured]);

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const matchSearch =
        searchQuery === "" ||
        sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.teacher?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.subject_group.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.objective.toLowerCase().includes(searchQuery.toLowerCase());

      const matchTeacher =
        selectedTeacherId === "all" || sub.teacher_id === selectedTeacherId;

      const matchMonth =
        selectedMonthId === "all" || sub.submission_month_id === selectedMonthId;

      const matchType =
        selectedMediaType === "all" || sub.media_type === selectedMediaType;

      const matchGrade =
        selectedGrade === "all" || sub.target_grade.includes(selectedGrade);

      return matchSearch && matchTeacher && matchMonth && matchType && matchGrade;
    });
  }, [
    submissions,
    searchQuery,
    selectedTeacherId,
    selectedMonthId,
    selectedMediaType,
    selectedGrade,
  ]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedTeacherId("all");
    setSelectedMonthId("all");
    setSelectedMediaType("all");
    setSelectedGrade("all");
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200 mb-2">
            <LayoutGrid className="w-4 h-4" />
            <span>คลังสื่อการเรียนรู้</span>
          </div>
          <h1 className="text-2xl font-bold text-navy-950">
            ผลงานสื่อการจัดการเรียนรู้ทั้งหมด
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร) • ผลงานและภาพถ่ายการจัดการเรียนการสอนของครูทุกระดับชั้น
          </p>
        </div>

        <Link
          href="/submit"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md transition-all self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>ส่งสื่อการสอนใหม่</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="ค้นหาตามชื่อสื่อ, ชื่อครูผู้สอน, กลุ่มสาระ, หรือคำสำคัญ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          {/* Teacher Filter */}
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">ครูผู้สอนทุกคน (9 คน)</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Month Filter */}
          <select
            value={selectedMonthId}
            onChange={(e) => setSelectedMonthId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">ทุกเดือนที่ส่ง (10 เดือน)</option>
            {months.map((m) => (
              <option key={m.id || m.month_no} value={m.id}>
                {m.month_name} ({m.short_name})
              </option>
            ))}
          </select>

          {/* Media Type Filter */}
          <select
            value={selectedMediaType}
            onChange={(e) => setSelectedMediaType(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">ทุกประเภทของสื่อ</option>
            {MEDIA_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Grade Filter */}
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">ทุกระดับชั้น</option>
            <option value="อนุบาล">ระดับปฐมวัย (อ.1 - อ.3)</option>
            <option value="ป.1">ชั้นประถมศึกษาปีที่ 1 (ป.1)</option>
            <option value="ป.2">ชั้นประถมศึกษาปีที่ 2 (ป.2)</option>
            <option value="ป.3">ชั้นประถมศึกษาปีที่ 3 (ป.3)</option>
            <option value="ป.4">ชั้นประถมศึกษาปีที่ 4 (ป.4)</option>
            <option value="ป.5">ชั้นประถมศึกษาปีที่ 5 (ป.5)</option>
            <option value="ป.6">ชั้นประถมศึกษาปีที่ 6 (ป.6)</option>
          </select>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            พบผลงานทั้งหมด <strong>{filteredSubmissions.length}</strong> รายการ
          </span>
          {(searchQuery ||
            selectedTeacherId !== "all" ||
            selectedMonthId !== "all" ||
            selectedMediaType !== "all" ||
            selectedGrade !== "all") && (
            <button
              onClick={resetFilters}
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
      </div>

      {/* Gallery Cards Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">กำลังโหลดคลังสื่อ...</p>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <LayoutGrid className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-navy-950 text-base">
              ไม่พบผลงานสื่อที่ตรงกับเงื่อนไข
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              ลองปรับการค้นหาหรือตัวกรอง หรือคลิก &quot;ส่งสื่อการสอนใหม่&quot; เพื่อเพิ่มผลงานแรกเข้าสู่ระบบ
            </p>
          </div>
          <Link
            href="/submit"
            className="inline-flex items-center gap-2 px-4 py-2 bg-navy-900 text-white rounded-xl text-xs font-semibold hover:bg-navy-800"
          >
            <PlusCircle className="w-4 h-4" />
            <span>ส่งสื่อการจัดการเรียนรู้</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubmissions.map((sub) => {
            const imageCount = sub.images?.length || (sub.cover_image_url ? 1 : 0);
            const coverUrl = sub.cover_image_url || sub.images?.[0]?.image_url;

            return (
              <div
                key={sub.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col group"
              >
                {/* Cover Image & Badges */}
                <div
                  className="relative h-48 sm:h-52 bg-slate-900 overflow-hidden cursor-pointer"
                  onClick={() => setActiveSubmission(sub)}
                >
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={sub.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-100">
                      <Images className="w-10 h-10 mb-1 text-slate-400" />
                      <span className="text-xs">ไม่มีภาพหน้าปก</span>
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

                  {/* Month & Year Badge */}
                  <div className="absolute top-3 left-3 bg-navy-900/85 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-white/20">
                    {sub.submission_month?.month_name || "ประจำเดือน"}
                  </div>

                  {/* Image count pill */}
                  {imageCount > 0 && (
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Images className="w-3.5 h-3.5" />
                      <span>{imageCount} รูป</span>
                    </div>
                  )}

                  {/* Media Type pill */}
                  <div className="absolute bottom-3 left-3">
                    <span className="inline-block bg-blue-600 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow-sm">
                      {sub.media_type}
                    </span>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    {/* Grade & Subject */}
                    <div className="flex items-center gap-2 text-xs text-blue-800 font-medium">
                      <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {sub.target_grade}
                      </span>
                      <span>•</span>
                      <span className="truncate">{sub.subject_group}</span>
                    </div>

                    {/* Title */}
                    <h3
                      onClick={() => setActiveSubmission(sub)}
                      className="font-bold text-navy-950 text-base line-clamp-2 hover:text-blue-700 cursor-pointer transition-colors leading-snug"
                    >
                      {sub.title}
                    </h3>

                    {/* Objective Excerpt */}
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {sub.objective}
                    </p>
                  </div>

                  {/* Footer & Teacher Info */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {sub.teacher?.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatDateThai(sub.created_at)}
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveSubmission(sub)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold text-xs transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>ดูรายละเอียด</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <SubmissionDetailModal
        submission={activeSubmission}
        onClose={() => setActiveSubmission(null)}
      />
    </div>
  );
}
