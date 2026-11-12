"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image-compressor";
import {
  fetchSchoolSettings,
  DEFAULT_SCHOOL_SETTINGS,
  SchoolSettings,
} from "@/lib/school-settings";
import {
  generateAiMediaContent,
  getSuggestedTitles,
} from "@/lib/ai-media-helper";
import {
  Teacher,
  AcademicYear,
  SubmissionMonth,
  MEDIA_TYPES,
  GRADE_LEVELS,
  TEACHERS_PRESET,
  SUBMISSION_MONTHS_PRESET,
  ACADEMIC_YEARS_PRESET,
} from "@/types/database";
import {
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  BookOpen,
  Target,
  FileText,
  Award,
  Sparkles,
  ArrowLeft,
  Wand2,
  RefreshCw,
  Lock,
  LogIn,
} from "lucide-react";
import Link from "next/link";

interface SelectedImage {
  file: File;
  previewUrl: string;
  name: string;
  size: number;
}

export default function SubmitPage() {
  const router = useRouter();
  const { user, profile, teacher, isConfigured } = useAuth();

  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SCHOOL_SETTINGS);

  // Form State
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [academicYearId, setAcademicYearId] = useState<string>("");
  const [submissionMonthId, setSubmissionMonthId] = useState<string>("");
  const [targetGrade, setTargetGrade] = useState<string>("");
  const [subjectGroup, setSubjectGroup] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [mediaType, setMediaType] = useState<string>(MEDIA_TYPES[0]);
  const [mediaTypeOther, setMediaTypeOther] = useState<string>("");
  const [objective, setObjective] = useState<string>("");
  const [usageDescription, setUsageDescription] = useState<string>("");
  const [studentOutcome, setStudentOutcome] = useState<string>("");

  // AI State
  const [aiVariant, setAiVariant] = useState<number>(0);
  const [aiNotice, setAiNotice] = useState<string>("");

  // Images state (max 10)
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);

  // Dropdown options
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [months, setMonths] = useState<SubmissionMonth[]>([]);

  // Status
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Load dropdown lists & settings
  useEffect(() => {
    fetchSchoolSettings().then(setSettings);

    async function loadInitialData() {
      const presetTeachers = TEACHERS_PRESET.map((t) => ({
        ...t,
        created_at: new Date().toISOString(),
      }));
      const presetYears = ACADEMIC_YEARS_PRESET.map((y) => ({
        ...y,
        created_at: new Date().toISOString(),
      }));
      const presetMonths = SUBMISSION_MONTHS_PRESET.map((m) => ({
        ...m,
        created_at: new Date().toISOString(),
      }));

      if (isConfigured) {
        // Fetch teachers
        const { data: tData } = await supabase
          .from("teachers")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true });
        setTeachersList(tData && tData.length > 0 ? (tData as Teacher[]) : presetTeachers);

        // Fetch academic years
        const { data: yData } = await supabase
          .from("academic_years")
          .select("*")
          .order("year_be", { ascending: false });
        const finalYears = yData && yData.length > 0 ? (yData as AcademicYear[]) : presetYears;
        setAcademicYears(finalYears);
        const currentY = finalYears.find((y) => y.is_current) || finalYears[0];
        setAcademicYearId(currentY.id);

        // Fetch submission months
        const { data: mData } = await supabase
          .from("submission_months")
          .select("*")
          .order("display_order", { ascending: true });
        const finalMonths = mData && mData.length > 0 ? (mData as SubmissionMonth[]) : presetMonths;
        setMonths(finalMonths);
      } else {
        setTeachersList(presetTeachers);
        setAcademicYears(presetYears);
        setAcademicYearId(presetYears[0].id);
        setMonths(presetMonths);
      }
    }

    loadInitialData();
  }, [isConfigured]);

  // Filter active months based on selected year's semester configuration
  // For 2569, default is semester_2 (Nov, Dec, Jan, Feb, Mar only - Semester 1 is hidden!)
  const selectedYearObj = useMemo(
    () => academicYears.find((y) => y.id === academicYearId) || academicYears[0],
    [academicYears, academicYearId]
  );

  const activeSemesterMode = useMemo(() => {
    const yearBe = selectedYearObj?.year_be || "2569";
    return (
      settings.defaultSemesterByYear[yearBe] ||
      (yearBe === "2569" ? "semester_2" : "all")
    );
  }, [selectedYearObj, settings]);

  const availableMonths = useMemo(() => {
    if (activeSemesterMode === "semester_2") {
      return months.filter((m) => m.semester === 2);
    }
    if (activeSemesterMode === "semester_1") {
      return months.filter((m) => m.semester === 1);
    }
    return months;
  }, [months, activeSemesterMode]);

  // Ensure selected submissionMonthId is valid within availableMonths
  useEffect(() => {
    if (availableMonths.length === 0) return;
    const exists = availableMonths.some((m) => m.id === submissionMonthId);
    if (!exists) {
      const curMonthNo = new Date().getMonth() + 1;
      const defaultM =
        availableMonths.find((m) => m.month_no === curMonthNo) || availableMonths[0];
      setSubmissionMonthId(defaultM.id);
    }
  }, [availableMonths, submissionMonthId]);

  // Set default teacher from user profile if available
  useEffect(() => {
    if (teacher?.id) {
      setSelectedTeacherId(teacher.id);
      if (teacher.grade_level && !targetGrade) {
        setTargetGrade(teacher.grade_level);
      }
      if (teacher.subjects && !subjectGroup) {
        setSubjectGroup(teacher.subjects);
      }
    } else if (profile?.teacher_id) {
      setSelectedTeacherId(profile.teacher_id);
    }
  }, [teacher, profile, targetGrade, subjectGroup]);

  // Suggested titles based on subject & grade
  const suggestedTitles = useMemo(
    () => getSuggestedTitles(subjectGroup, targetGrade, mediaType),
    [subjectGroup, targetGrade, mediaType]
  );

  // Existing submissions of this teacher in the selected month (duplicate check)
  const [existingInMonth, setExistingInMonth] = useState<{ id: string; title: string }[]>([]);
  useEffect(() => {
    if (!isConfigured || !selectedTeacherId || !submissionMonthId || !academicYearId) {
      setExistingInMonth([]);
      return;
    }
    let cancelled = false;
    supabase
      .from("submissions")
      .select("id, title")
      .eq("teacher_id", selectedTeacherId)
      .eq("submission_month_id", submissionMonthId)
      .eq("academic_year_id", academicYearId)
      .then(({ data }) => {
        if (!cancelled) setExistingInMonth((data as { id: string; title: string }[]) || []);
      });
    return () => {
      cancelled = true;
    };
  }, [isConfigured, selectedTeacherId, submissionMonthId, academicYearId]);

  const normalizeTitle = (t: string) => t.trim().replace(/\s+/g, " ").toLowerCase();
  const duplicateTitle = existingInMonth.find(
    (s) => title.trim() && normalizeTitle(s.title) === normalizeTitle(title)
  );
  const selectedMonthName =
    availableMonths.find((m) => m.id === submissionMonthId)?.month_name || "";

  // AI Handler: Fill all 3 fields (and title if empty)
  const handleAiFillAll = () => {
    const res = generateAiMediaContent({
      title,
      targetGrade,
      subjectGroup,
      mediaType,
      mediaTypeOther,
      variantIndex: aiVariant,
    });
    if (!title.trim() && res.suggestedTitle) {
      setTitle(res.suggestedTitle);
    }
    setObjective(res.objective);
    setUsageDescription(res.usageDescription);
    setStudentOutcome(res.studentOutcome);
    setAiVariant((v) => v + 1);
    setAiNotice("✨ AI ช่วยคิดข้อความให้ครบทั้ง 3 หัวข้อเรียบร้อยแล้ว! (กดซ้ำเพื่อเปลี่ยนสำนวนใหม่ หรือแก้ไขเพิ่มเติมได้ตามต้องการ)");
    setTimeout(() => setAiNotice(""), 5000);
  };

  // AI Handler: Fill single field
  const handleAiFillSingle = (field: "objective" | "usage" | "outcome") => {
    const res = generateAiMediaContent({
      title,
      targetGrade,
      subjectGroup,
      mediaType,
      mediaTypeOther,
      variantIndex: aiVariant,
    });
    if (field === "objective") setObjective(res.objective);
    if (field === "usage") setUsageDescription(res.usageDescription);
    if (field === "outcome") setStudentOutcome(res.studentOutcome);
    setAiVariant((v) => v + 1);
  };

  // Handle image files selection
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMsg("");

    const totalAllowed = 10;
    const currentCount = selectedImages.length;
    const newFilesCount = files.length;

    if (currentCount + newFilesCount > totalAllowed) {
      setErrorMsg(
        `สามารถแนบภาพถ่ายได้สูงสุดไม่เกิน 10 รูปต่อรายการ (ท่านเลือกไว้แล้ว ${currentCount} รูป)`
      );
      return;
    }

    const processedImages: SelectedImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
      if (!validTypes.includes(file.type)) {
        setErrorMsg("รองรับเฉพาะไฟล์ภาพนามสกุล JPG, JPEG, PNG และ WEBP เท่านั้น");
        continue;
      }

      const compressed = await compressImage(file, 1600, 1600, 0.82);
      const previewUrl = URL.createObjectURL(compressed);

      processedImages.push({
        file: compressed,
        previewUrl,
        name: compressed.name,
        size: compressed.size,
      });
    }

    setSelectedImages((prev) => [...prev, ...processedImages]);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!selectedTeacherId) {
      setErrorMsg("กรุณาเลือกชื่อครูผู้ส่งผลงาน");
      return;
    }
    if (!academicYearId) {
      setErrorMsg("กรุณาเลือกปีการศึกษา");
      return;
    }
    if (!submissionMonthId) {
      setErrorMsg("กรุณาเลือกเดือนที่ส่งสื่อ");
      return;
    }
    if (!title.trim()) {
      setErrorMsg("กรุณากรอกชื่อสื่อการจัดการเรียนรู้");
      return;
    }
    if (duplicateTitle) {
      setErrorMsg(
        `ท่านเคยส่งสื่อชื่อ "${duplicateTitle.title}" ในเดือน${selectedMonthName}แล้ว — หากต้องการปรับปรุง กรุณาไปที่เมนู "ประวัติการส่งสื่อ" แล้วกด "แก้ไขสื่อ/รูปภาพ" แทนการส่งซ้ำ`
      );
      return;
    }
    if (selectedImages.length === 0) {
      setErrorMsg("กรุณาแนบภาพถ่ายขณะนำสื่อไปใช้ในการจัดการเรียนการสอนอย่างน้อย 1 รูป");
      return;
    }

    setLoading(true);
    setUploadProgress("กำลังเตรียมบันทึกข้อมูล...");

    try {
      if (!isConfigured) {
        setUploadProgress("บันทึกข้อมูลเรียบร้อย");
        setSuccessMsg("บันทึกข้อมูลผลงานสื่อเรียบร้อยแล้ว!");
        setTimeout(() => router.push("/"), 1500);
        return;
      }

      // 1. Upload images to Supabase Storage
      setUploadProgress(`กำลังอัปโหลดรูปภาพ (0/${selectedImages.length})...`);
      const uploadedImageData: { url: string; path: string; name: string; size: number }[] = [];

      for (let i = 0; i < selectedImages.length; i++) {
        const item = selectedImages[i];
        setUploadProgress(`กำลังอัปโหลดรูปภาพ (${i + 1}/${selectedImages.length})...`);

        const fileExt = item.file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `submissions/${selectedTeacherId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("submission-images")
          .upload(filePath, item.file, {
            contentType: item.file.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`ไม่สามารถอัปโหลดภาพที่ ${i + 1} ได้: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from("submission-images")
          .getPublicUrl(filePath);

        uploadedImageData.push({
          url: publicUrlData.publicUrl,
          path: filePath,
          name: item.name,
          size: item.size,
        });
      }

      // 2. Insert into `submissions` table
      setUploadProgress("กำลังบันทึกข้อมูลสื่อการจัดการเรียนรู้...");
      const coverUrl = uploadedImageData.length > 0 ? uploadedImageData[0].url : null;

      const { data: submissionData, error: subError } = await supabase
        .from("submissions")
        .insert({
          teacher_id: selectedTeacherId,
          academic_year_id: academicYearId,
          submission_month_id: submissionMonthId,
          target_grade: targetGrade,
          subject_group: subjectGroup,
          title: title.trim(),
          media_type: mediaType,
          media_type_other: mediaType === "อื่น ๆ" ? mediaTypeOther : null,
          objective: objective.trim(),
          usage_description: usageDescription.trim(),
          student_outcome: studentOutcome.trim(),
          cover_image_url: coverUrl,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (subError) {
        throw new Error(`เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${subError.message}`);
      }

      // 3. Insert images into `submission_images` table
      if (uploadedImageData.length > 0 && submissionData) {
        setUploadProgress("กำลังเชื่อมโยงคลังภาพถ่าย...");
        const imageRows = uploadedImageData.map((img, idx) => ({
          submission_id: submissionData.id,
          image_url: img.url,
          file_path: img.path,
          file_name: img.name,
          file_size: img.size,
          display_order: idx + 1,
        }));

        await supabase.from("submission_images").insert(imageRows);
      }

      setSuccessMsg("ส่งผลงานสื่อการจัดการเรียนรู้สำเร็จเรียบร้อยแล้ว!");
      setTimeout(() => {
        router.push("/gallery");
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.message || "เกิดข้อผิดพลาดในการส่งข้อมูล");
    } finally {
      setLoading(false);
      setUploadProgress("");
    }
  };

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-160px)] flex items-center justify-center py-12 px-4 bg-slate-50">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md w-full space-y-4 shadow-md">
          <div className="w-14 h-14 rounded-2xl bg-navy-900 text-amber-400 flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-navy-950">
            กรุณาเข้าสู่ระบบก่อนส่งสื่อการสอน
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            ระบบส่งสื่อการจัดการเรียนรู้สงวนสิทธิ์เฉพาะครูและบุคลากรของ{" "}
            <strong>{settings.schoolName}</strong> เท่านั้นเพื่อความปลอดภัยของข้อมูล
          </p>
          <div className="pt-2 space-y-2.5">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>เข้าสู่ระบบเพื่อส่งสื่อการสอน</span>
            </Link>
            <Link
              href="/gallery"
              className="inline-block w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              กลับไปดูคลังสื่อทั้งหมด (โหมดผู้เยี่ยมชม)
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-navy-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับหน้าหลัก</span>
        </Link>
        <span className="text-xs text-slate-400">{settings.schoolName}</span>
      </div>

      {/* Title Card */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
          <UploadCloud className="w-4 h-4" />
          <span>
            แบบฟอร์มส่งผลงาน •{" "}
            {activeSemesterMode === "semester_2"
              ? `ภาคเรียนที่ 2/${selectedYearObj?.year_be || "2569"}`
              : activeSemesterMode === "semester_1"
              ? `ภาคเรียนที่ 1/${selectedYearObj?.year_be || "2569"}`
              : `ปีการศึกษา ${selectedYearObj?.year_be || "2569"}`}
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-navy-950">
          ส่งสื่อการจัดการเรียนรู้
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          กรอกข้อมูลสื่อหรือกดปุ่ม <strong>&quot;✨ AI ช่วยคิดข้อความอัตโนมัติ&quot;</strong> เพื่อลดภาระงานเอกสาร พร้อมแนบภาพถ่ายการใช้สื่อในชั้นเรียน (ไม่เกิน 10 รูป)
        </p>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          <div>
            <div className="font-semibold">{successMsg}</div>
            <div className="text-xs text-emerald-700 mt-0.5">
              ระบบกำลังนำท่านไปยังคลังผลงานสื่อ...
            </div>
          </div>
        </div>
      )}

      {/* Duplicate / already-submitted warning */}
      {existingInMonth.length > 0 && !successMsg && (
        <div
          className={`p-4 rounded-xl text-sm flex items-start gap-3 border ${
            duplicateTitle
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          <AlertCircle
            className={`w-5 h-5 shrink-0 mt-0.5 ${duplicateTitle ? "text-red-500" : "text-amber-500"}`}
          />
          <div className="space-y-1">
            <div className="font-semibold">
              {duplicateTitle
                ? `ชื่อสื่อนี้ซ้ำกับที่ส่งไว้แล้วในเดือน${selectedMonthName} — ระบบจะไม่อนุญาตให้ส่งซ้ำ`
                : `เดือน${selectedMonthName} ท่านส่งสื่อไปแล้ว ${existingInMonth.length} ชิ้น (ส่งครบเกณฑ์แล้ว)`}
            </div>
            <ul className="text-xs list-disc pl-4">
              {existingInMonth.map((s) => (
                <li key={s.id}>{s.title}</li>
              ))}
            </ul>
            <div className="text-xs">
              หากต้องการส่งเพิ่มเป็นชิ้นใหม่ สามารถส่งต่อได้ตามปกติ หรือหากต้องการแก้ไข/ลบชิ้นเดิม ไปที่{" "}
              <Link href="/my-submissions" className="font-bold underline">
                ประวัติการส่งสื่อ
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Teacher & Academic Period */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-navy-950 flex items-center gap-2 border-b border-slate-100 pb-3">
            <GraduationCap className="w-4 h-4 text-blue-600" />
            <span>1. ข้อมูลผู้ส่งและรอบการส่งสื่อ</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Teacher Select */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ชื่อครูผู้ส่ง <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedTeacherId}
                onChange={(e) => {
                  setSelectedTeacherId(e.target.value);
                  const matched = teachersList.find((t) => t.id === e.target.value);
                  if (matched) {
                    setTargetGrade(matched.grade_level);
                    setSubjectGroup(matched.subjects);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="">-- เลือกชื่อครู --</option>
                <optgroup label="ครูระดับปฐมวัย">
                  {teachersList
                    .filter((t) => t.category === "early_childhood")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="ครูระดับประถมศึกษา">
                  {teachersList
                    .filter((t) => t.category === "primary")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            {/* Academic Year */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ปีการศึกษา <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    ปีการศึกษา {y.year_be} {y.is_current ? "(ปัจจุบัน)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Select (Filtered to Semester 2 for 2569!) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                เดือนที่ส่งสื่อ{" "}
                <span className="text-blue-600 font-normal">
                  (
                  {activeSemesterMode === "semester_2"
                    ? `เทอม 2/${selectedYearObj?.year_be || "2569"}`
                    : activeSemesterMode === "semester_1"
                    ? `เทอม 1/${selectedYearObj?.year_be || "2569"}`
                    : "10 เดือน"}
                  )
                </span>{" "}
                <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={submissionMonthId}
                onChange={(e) => setSubmissionMonthId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {availableMonths.map((m) => (
                  <option key={m.id || m.month_no} value={m.id}>
                    {m.month_name} ({m.short_name}) — ภาคเรียนที่ {m.semester}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Media Details + Free AI Helper */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-navy-950 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>2. รายละเอียดสื่อการจัดการเรียนรู้</span>
            </h2>
            <span className="text-[11px] text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-full font-semibold inline-flex items-center gap-1 self-start sm:self-auto">
              <Sparkles className="w-3 h-3" />
              <span>มีระบบ AI ช่วยคิดคำให้ฟรี ลดภาระงานครู</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target Grade */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ระดับชั้นที่นำสื่อไปใช้ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                list="grade-suggestions"
                value={targetGrade}
                onChange={(e) => setTargetGrade(e.target.value)}
                placeholder="เช่น อนุบาล 2, ป.1, ป.6"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="grade-suggestions">
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>

            {/* Subject Group */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                กลุ่มสาระการเรียนรู้ / รายวิชา <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={subjectGroup}
                onChange={(e) => setSubjectGroup(e.target.value)}
                placeholder="เช่น ภาษาไทย, วิทยาศาสตร์, คณิตศาสตร์"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Media Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ประเภทของสื่อ <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MEDIA_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Other Media Type Specification */}
            {mediaType === "อื่น ๆ" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ระบุประเภทสื่ออื่น ๆ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={mediaTypeOther}
                  onChange={(e) => setMediaTypeOther(e.target.value)}
                  placeholder="ระบุประเภทสื่อเพิ่มเติม"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Media Title */}
            <div className="sm:col-span-2 space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                ชื่อสื่อการจัดการเรียนรู้ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="พิมพ์ชื่อสื่อ หรือคลิกเลือกแนวทางชื่อสื่อด้านล่าง..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Quick Suggested Title Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] text-slate-500 font-medium">
                  💡 แนะนำชื่อสื่อตามวิชา:
                </span>
                {suggestedTitles.map((st, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTitle(st)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer"
                  >
                    + {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Magic AI Banner Button */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-50 via-blue-50 to-indigo-50 border border-violet-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs sm:text-sm font-bold text-navy-950 flex items-center gap-1.5">
                <Wand2 className="w-4 h-4 text-violet-600" />
                <span>ผู้ช่วย AI อัจฉริยะ (ลดภาระงานเอกสารของครู)</span>
              </div>
              <p className="text-xs text-slate-600">
                เพียงใส่ชื่อสื่อด้านบน แล้วกดปุ่มนี้ ระบบจะช่วยร่าง <strong>วัตถุประสงค์, วิธีการใช้สื่อ และผลที่เกิดกับผู้เรียน</strong> ให้กระชับตรงตามสื่อทันที!
              </p>
            </div>
            <button
              type="button"
              onClick={handleAiFillAll}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-violet-500/20 transition-all hover:scale-[1.02] cursor-pointer shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>✨ AI ช่วยคิดคำทั้ง 3 ข้ออัตโนมัติ</span>
            </button>
          </div>

          {aiNotice && (
            <div className="p-3 bg-violet-50 border border-violet-200 text-violet-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-600 shrink-0" />
              <span>{aiNotice}</span>
            </div>
          )}

          {/* Objective */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-blue-600" />
                <span>วัตถุประสงค์ของการใช้สื่อ</span>
                <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => handleAiFillSingle("objective")}
                className="text-[11px] font-semibold text-violet-700 hover:text-violet-900 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>AI ช่วยคิด/ปรับสำนวนข้อนี้</span>
              </button>
            </div>
            <textarea
              required
              rows={2}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="กดปุ่ม '✨ AI ช่วยคิดคำ' ด้านบน หรือพิมพ์วัตถุประสงค์..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
            />
          </div>

          {/* Usage description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>รายละเอียด / วิธีการใช้สื่อโดยย่อ</span>
                <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => handleAiFillSingle("usage")}
                className="text-[11px] font-semibold text-violet-700 hover:text-violet-900 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>AI ช่วยคิด/ปรับสำนวนข้อนี้</span>
              </button>
            </div>
            <textarea
              required
              rows={3}
              value={usageDescription}
              onChange={(e) => setUsageDescription(e.target.value)}
              placeholder="กดปุ่ม '✨ AI ช่วยคิดคำ' ด้านบน หรือพิมพ์วิธีการใช้สื่อ..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
            />
          </div>

          {/* Student outcome */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span>ผลที่เกิดขึ้นกับผู้เรียน</span>
                <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => handleAiFillSingle("outcome")}
                className="text-[11px] font-semibold text-violet-700 hover:text-violet-900 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>AI ช่วยคิด/ปรับสำนวนข้อนี้</span>
              </button>
            </div>
            <textarea
              required
              rows={2}
              value={studentOutcome}
              onChange={(e) => setStudentOutcome(e.target.value)}
              placeholder="กดปุ่ม '✨ AI ช่วยคิดคำ' ด้านบน หรือพิมพ์ผลที่เกิดกับผู้เรียน..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
            />
          </div>
        </div>

        {/* Section 3: Image Attachments (Up to 10 photos) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-navy-950 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-600" />
              <span>3. แนบภาพถ่ายขณะนำสื่อไปใช้ในห้องเรียน</span>
              <span className="text-red-500">*</span>
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              {selectedImages.length} / 10 รูป
            </span>
          </div>

          <p className="text-xs text-slate-500">
            แนบภาพถ่ายขณะนำสื่อไปใช้จริงในห้องเรียน (รองรับ JPG, PNG, WEBP สูงสุด 10 รูป ระบบจะบีบอัดภาพให้อัตโนมัติ และสามารถเข้ามาแก้ไข/เพิ่มรูปภาพภายหลังได้)
          </p>

          {/* Upload Dropzone */}
          {selectedImages.length < 10 && (
            <label className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/30 hover:bg-blue-50/60 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-navy-950">
                คลิกเพื่อเลือกภาพถ่าย หรือลากไฟล์มาวางที่นี่
              </span>
              <span className="text-xs text-slate-500 mt-1">
                สามารถเลือกพร้อมกันได้หลายรูป (สูงสุด 10 รูป)
              </span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          )}

          {/* Previews Grid */}
          {selectedImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
              {selectedImages.map((img, idx) => (
                <div
                  key={idx}
                  className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100"
                >
                  <img
                    src={img.previewUrl}
                    alt={`preview-${idx}`}
                    className="w-full h-full object-cover"
                  />
                  {idx === 0 && (
                    <div className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                      ภาพปก
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1.5 right-1.5 bg-red-600/90 hover:bg-red-700 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
                    title="ลบรูปนี้"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Action */}
        <div className="pt-2">
          {uploadProgress && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-xl flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>{uploadProgress}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 bg-navy-900 hover:bg-navy-800 active:scale-[0.99] text-white font-bold text-sm sm:text-base rounded-2xl shadow-xl shadow-navy-950/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>กำลังบันทึกและอัปโหลด...</span>
              </div>
            ) : (
              <>
                <UploadCloud className="w-5 h-5" />
                <span>บันทึกและส่งผลงานสื่อการจัดการเรียนรู้</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
