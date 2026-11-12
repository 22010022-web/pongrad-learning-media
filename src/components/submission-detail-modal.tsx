"use client";

import React, { useState, useEffect } from "react";
import { Submission, SubmissionImage, MEDIA_TYPES, GRADE_LEVELS } from "@/types/database";
import { formatDateThai } from "@/lib/utils";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image-compressor";
import { generateAiMediaContent } from "@/lib/ai-media-helper";
import { exportSubmissionA4Pdf } from "@/lib/pdf-report";
import { useAuth } from "@/context/auth-context";
import {
  X,
  Calendar,
  GraduationCap,
  BookOpen,
  Tag,
  Target,
  FileText,
  Award,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  User,
  Download,
  Edit3,
  Trash2,
  UploadCloud,
  Sparkles,
  Printer,
  CheckCircle2,
  AlertCircle,
  Save,
} from "lucide-react";

interface Props {
  submission: Submission | null;
  onClose: () => void;
  onUpdated?: (updated: Submission) => void;
  initialEditMode?: boolean;
}

interface NewImagePreview {
  file: File;
  previewUrl: string;
  name: string;
  size: number;
}

export function SubmissionDetailModal({
  submission,
  onClose,
  onUpdated,
  initialEditMode = false,
}: Props) {
  const { user, profile, teacher, isAdmin } = useAuth();

  const [localSubmission, setLocalSubmission] = useState<Submission | null>(submission);
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Edit Mode States
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [editTitle, setEditTitle] = useState("");
  const [editGrade, setEditGrade] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editMediaType, setEditMediaType] = useState("");
  const [editMediaTypeOther, setEditMediaTypeOther] = useState("");
  const [editObjective, setEditObjective] = useState("");
  const [editUsage, setEditUsage] = useState("");
  const [editOutcome, setEditOutcome] = useState("");
  const [keptImages, setKeptImages] = useState<SubmissionImage[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<NewImagePreview[]>([]);
  const [aiVariant, setAiVariant] = useState(0);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setLocalSubmission(submission);
    setSelectedImageIdx(0);
    setIsEditing(initialEditMode);
    setSaveMsg("");
    setErrorMsg("");

    if (submission) {
      setEditTitle(submission.title || "");
      setEditGrade(submission.target_grade || "");
      setEditSubject(submission.subject_group || "");
      setEditMediaType(submission.media_type || MEDIA_TYPES[0]);
      setEditMediaTypeOther(submission.media_type_other || "");
      setEditObjective(submission.objective || "");
      setEditUsage(submission.usage_description || "");
      setEditOutcome(submission.student_outcome || "");

      const imgs: SubmissionImage[] =
        submission.images && submission.images.length > 0
          ? [...submission.images].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
          : submission.cover_image_url
          ? [
              {
                id: "cover",
                submission_id: submission.id,
                image_url: submission.cover_image_url,
                file_path: "",
                display_order: 1,
                created_at: "",
              },
            ]
          : [];
      setKeptImages(imgs);
      setRemovedImageIds([]);
      setNewImages([]);
    }
  }, [submission, initialEditMode]);

  if (!localSubmission) return null;

  const images: SubmissionImage[] =
    localSubmission.images && localSubmission.images.length > 0
      ? [...localSubmission.images].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      : localSubmission.cover_image_url
      ? [
          {
            id: "cover",
            submission_id: localSubmission.id,
            image_url: localSubmission.cover_image_url,
            file_path: "",
            display_order: 1,
            created_at: "",
          },
        ]
      : [];

  const currentImage = images[selectedImageIdx] || images[0];

  // Check if current user can edit this submission (Owner, Teacher match, or Admin)
  const canEdit =
    Boolean(user) &&
    (isAdmin ||
      localSubmission.created_by === user?.id ||
      localSubmission.teacher_id === teacher?.id ||
      localSubmission.teacher_id === profile?.teacher_id);

  // Download single image
  const downloadSingleImage = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeTitle = (localSubmission.title || "media").replace(/[^a-zA-Z0-9ก-๙_-]/g, "_");
      link.href = blobUrl;
      link.download = `${safeTitle}_ภาพที่_${index + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch {
      window.open(imageUrl, "_blank");
    }
  };

  // Download all images in this submission
  const handleDownloadAllImages = async () => {
    if (images.length === 0) return;
    setDownloadingAll(true);
    try {
      for (let i = 0; i < images.length; i++) {
        await downloadSingleImage(images[i].image_url, i);
        await new Promise((r) => setTimeout(r, 350));
      }
    } finally {
      setDownloadingAll(false);
    }
  };

  // Edit mode: Remove existing image
  const handleRemoveExistingImage = (imgId: string) => {
    setKeptImages((prev) => prev.filter((img) => img.id !== imgId));
    if (imgId !== "cover") {
      setRemovedImageIds((prev) => [...prev, imgId]);
    }
  };

  // Edit mode: Add new images (enforce max 10 total)
  const handleAddNewImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setErrorMsg("");

    const totalCurrent = keptImages.length + newImages.length;
    if (totalCurrent + files.length > 10) {
      setErrorMsg(
        `สามารถเก็บรูปภาพได้สูงสุดไม่เกิน 10 รูปต่อสื่อ (ปัจจุบันมีอยู่แล้ว ${totalCurrent} รูป)`
      );
      e.target.value = "";
      return;
    }

    const processed: NewImagePreview[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
      if (!validTypes.includes(file.type)) {
        setErrorMsg("รองรับเฉพาะไฟล์ภาพ JPG, JPEG, PNG และ WEBP เท่านั้น");
        continue;
      }
      const compressed = await compressImage(file, 1600, 1600, 0.82);
      processed.push({
        file: compressed,
        previewUrl: URL.createObjectURL(compressed),
        name: compressed.name,
        size: compressed.size,
      });
    }

    setNewImages((prev) => [...prev, ...processed]);
    e.target.value = "";
  };

  const handleRemoveNewImage = (idx: number) => {
    setNewImages((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[idx].previewUrl);
      copy.splice(idx, 1);
      return copy;
    });
  };

  // AI Fill in Edit mode
  const handleAiFillEdit = () => {
    const res = generateAiMediaContent({
      title: editTitle,
      targetGrade: editGrade,
      subjectGroup: editSubject,
      mediaType: editMediaType,
      mediaTypeOther: editMediaTypeOther,
      variantIndex: aiVariant,
    });
    if (!editTitle.trim() && res.suggestedTitle) {
      setEditTitle(res.suggestedTitle);
    }
    setEditObjective(res.objective);
    setEditUsage(res.usageDescription);
    setEditOutcome(res.studentOutcome);
    setAiVariant((v) => v + 1);
  };

  // Save edited submission & images
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSaveMsg("");

    const totalFinalImages = keptImages.length + newImages.length;
    if (totalFinalImages === 0) {
      setErrorMsg("ต้องมีภาพถ่ายประกอบสื่ออย่างน้อย 1 รูป (สูงสุดไม่เกิน 10 รูป)");
      return;
    }
    if (totalFinalImages > 10) {
      setErrorMsg("จำนวนภาพถ่ายรวมต้องไม่เกิน 10 รูปต่อสื่อ");
      return;
    }

    setSaving(true);
    try {
      const finalImagesList: SubmissionImage[] = [...keptImages];

      if (isSupabaseConfigured()) {
        // 1. Delete removed images from DB
        if (removedImageIds.length > 0) {
          await supabase
            .from("submission_images")
            .delete()
            .in("id", removedImageIds);
        }

        // 2. Upload new images to Storage & insert into DB
        for (let i = 0; i < newImages.length; i++) {
          const item = newImages[i];
          const ext = item.file.name.split(".").pop() || "jpg";
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
          const filePath = `submissions/${localSubmission.teacher_id}/${fileName}`;

          const { error: upErr } = await supabase.storage
            .from("submission-images")
            .upload(filePath, item.file, {
              contentType: item.file.type,
              upsert: false,
            });
          if (upErr) throw new Error(`อัปโหลดรูปภาพใหม่ไม่สำเร็จ: ${upErr.message}`);

          const { data: pubData } = supabase.storage
            .from("submission-images")
            .getPublicUrl(filePath);

          const { data: insertedImg, error: insErr } = await supabase
            .from("submission_images")
            .insert({
              submission_id: localSubmission.id,
              image_url: pubData.publicUrl,
              file_path: filePath,
              file_name: item.name,
              file_size: item.size,
              display_order: keptImages.length + i + 1,
            })
            .select()
            .single();

          if (!insErr && insertedImg) {
            finalImagesList.push(insertedImg as SubmissionImage);
          } else {
            finalImagesList.push({
              id: `temp-${Date.now()}-${i}`,
              submission_id: localSubmission.id,
              image_url: pubData.publicUrl,
              file_path: filePath,
              file_name: item.name,
              file_size: item.size,
              display_order: keptImages.length + i + 1,
              created_at: new Date().toISOString(),
            });
          }
        }

        const newCoverUrl = finalImagesList[0]?.image_url || null;

        // 3. Update submissions row
        const { error: updateSubErr } = await supabase
          .from("submissions")
          .update({
            title: editTitle.trim(),
            target_grade: editGrade.trim(),
            subject_group: editSubject.trim(),
            media_type: editMediaType,
            media_type_other: editMediaType === "อื่น ๆ" ? editMediaTypeOther : null,
            objective: editObjective.trim(),
            usage_description: editUsage.trim(),
            student_outcome: editOutcome.trim(),
            cover_image_url: newCoverUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", localSubmission.id);

        if (updateSubErr) throw new Error(updateSubErr.message);
      }

      const updatedObj: Submission = {
        ...localSubmission,
        title: editTitle.trim(),
        target_grade: editGrade.trim(),
        subject_group: editSubject.trim(),
        media_type: editMediaType,
        media_type_other: editMediaType === "อื่น ๆ" ? editMediaTypeOther : null,
        objective: editObjective.trim(),
        usage_description: editUsage.trim(),
        student_outcome: editOutcome.trim(),
        cover_image_url: finalImagesList[0]?.image_url || null,
        images: finalImagesList,
        updated_at: new Date().toISOString(),
      };

      setLocalSubmission(updatedObj);
      setKeptImages(finalImagesList);
      setNewImages([]);
      setRemovedImageIds([]);
      setIsEditing(false);
      setSaveMsg("บันทึกการแก้ไขข้อมูลและรูปภาพเรียบร้อยแล้ว!");
      if (onUpdated) onUpdated(updatedObj);
    } catch (err: any) {
      setErrorMsg(err?.message || "เกิดข้อผิดพลาดในการบันทึกการแก้ไข");
    } finally {
      setSaving(false);
    }
  };

  const totalEditImages = keptImages.length + newImages.length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-4 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-navy-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-lg truncate">
                {localSubmission.title}
              </h3>
              <p className="text-xs text-navy-200 truncate">
                {localSubmission.teacher?.name || "ครูผู้ส่ง"} • เดือน
                {localSubmission.submission_month?.month_name} (เทอม{" "}
                {localSubmission.submission_month?.semester || 2}/
                {localSubmission.academic_year?.year_be || "2569"})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Button: Export A4 Portrait PDF */}
            <button
              type="button"
              onClick={() => exportSubmissionA4Pdf(localSubmission)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              title="พิมพ์หรือบันทึกเป็นไฟล์ PDF ขนาด A4 แนวตั้ง"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">รายงาน PDF (A4)</span>
              <span className="sm:hidden">PDF</span>
            </button>

            {/* Button: Toggle Edit Mode */}
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(!isEditing);
                  setErrorMsg("");
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  isEditing
                    ? "bg-amber-500 text-slate-950"
                    : "bg-blue-600 hover:bg-blue-500 text-white"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? "ดูตัวอย่าง" : "แก้ไขสื่อ/รูปภาพ"}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-navy-300 hover:text-white hover:bg-navy-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {saveMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isEditing ? (
            /* ================= EDIT MODE ================= */
            <form onSubmit={handleSaveEdit} className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-blue-50/80 border border-blue-200 p-3.5 rounded-xl">
                <div>
                  <h4 className="text-sm font-bold text-navy-950">
                    โหมดแก้ไขข้อมูลสื่อและจัดการรูปภาพ (สูงสุด 10 รูป)
                  </h4>
                  <p className="text-xs text-slate-600">
                    สามารถลบภาพเดิม เพิ่มภาพใหม่ หรือให้ AI ช่วยปรับข้อความให้กระชับได้ทันที
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAiFillEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>✨ AI ช่วยปรับข้อความอัตโนมัติ</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อสื่อการจัดการเรียนรู้ *
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ระดับชั้นที่นำสื่อไปใช้ *
                  </label>
                  <input
                    type="text"
                    required
                    list="edit-grade-list"
                    value={editGrade}
                    onChange={(e) => setEditGrade(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm"
                  />
                  <datalist id="edit-grade-list">
                    {GRADE_LEVELS.map((g) => (
                      <option key={g} value={g} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    กลุ่มสาระการเรียนรู้ / รายวิชา *
                  </label>
                  <input
                    type="text"
                    required
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ประเภทของสื่อ *
                  </label>
                  <select
                    value={editMediaType}
                    onChange={(e) => setEditMediaType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm"
                  >
                    {MEDIA_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {editMediaType === "อื่น ๆ" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ระบุประเภทสื่ออื่น ๆ *
                    </label>
                    <input
                      type="text"
                      required
                      value={editMediaTypeOther}
                      onChange={(e) => setEditMediaTypeOther(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    วัตถุประสงค์ของการใช้สื่อ *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={editObjective}
                    onChange={(e) => setEditObjective(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    รายละเอียด / วิธีการใช้สื่อโดยย่อ *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={editUsage}
                    onChange={(e) => setEditUsage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ผลที่เกิดขึ้นกับผู้เรียน *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={editOutcome}
                    onChange={(e) => setEditOutcome(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Image Manager in Edit Mode */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-navy-950">
                    จัดการรูปภาพในสื่อนี้ (สูงสุดไม่เกิน 10 รูป)
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      totalEditImages >= 10
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    รวม {totalEditImages} / 10 รูป
                  </span>
                </div>

                {/* Grid of Kept + New Images */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {keptImages.map((img, idx) => (
                    <div
                      key={img.id || idx}
                      className="relative group aspect-square rounded-xl overflow-hidden border border-slate-300 bg-white"
                    >
                      <img
                        src={img.image_url}
                        alt={`kept-${idx}`}
                        className="w-full h-full object-cover"
                      />
                      {idx === 0 && (
                        <span className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                          ภาพปก
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingImage(img.id)}
                        className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg shadow-md cursor-pointer"
                        title="ลบรูปนี้ออกจากสื่อ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {newImages.map((img, idx) => (
                    <div
                      key={`new-${idx}`}
                      className="relative group aspect-square rounded-xl overflow-hidden border-2 border-emerald-400 bg-white"
                    >
                      <img
                        src={img.previewUrl}
                        alt={`new-${idx}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        ภาพใหม่
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveNewImage(idx)}
                        className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg shadow-md cursor-pointer"
                        title="ยกเลิกรูปใหม่นี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add More Button if < 10 */}
                  {totalEditImages < 10 && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-blue-400 hover:border-blue-600 bg-blue-50/40 hover:bg-blue-50 flex flex-col items-center justify-center cursor-pointer transition-colors p-2 text-center">
                      <UploadCloud className="w-6 h-6 text-blue-600 mb-1" />
                      <span className="text-[11px] font-bold text-blue-800">
                        + เพิ่มรูปภาพ
                      </span>
                      <span className="text-[10px] text-slate-500">
                        (เพิ่มได้อีก {10 - totalEditImages} รูป)
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        onChange={handleAddNewImages}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md disabled:opacity-60 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "กำลังบันทึกการแก้ไข..." : "บันทึกการแก้ไขทั้งหมด"}</span>
                </button>
              </div>
            </form>
          ) : (
            /* ================= VIEW MODE ================= */
            <>
              {/* Main Info Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" />
                    {localSubmission.target_grade}
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 font-medium border border-indigo-200 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    {localSubmission.subject_group}
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 font-medium border border-amber-200 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    {localSubmission.media_type === "อื่น ๆ" && localSubmission.media_type_other
                      ? `อื่น ๆ: ${localSubmission.media_type_other}`
                      : localSubmission.media_type}
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    ส่งเมื่อ: {formatDateThai(localSubmission.created_at)}
                  </span>
                </div>

                {/* Download All Images Button (Authenticated users only) */}
                {images.length > 0 && (
                  user ? (
                    <button
                      type="button"
                      disabled={downloadingAll}
                      onClick={handleDownloadAllImages}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>
                        {downloadingAll
                          ? "กำลังดาวน์โหลดภาพ..."
                          : `ดาวน์โหลดภาพทั้งหมด (${images.length} รูป)`}
                      </span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 font-medium text-xs border border-slate-200">
                      <span>🔒 โหมดดูอย่างเดียว (พิมพ์ PDF A4 ได้)</span>
                    </span>
                  )
                )}
              </div>

              {/* Image Gallery Showcase */}
              {images.length > 0 && (
                <div className="bg-slate-900 rounded-2xl overflow-hidden p-2 sm:p-4 text-white">
                  <div className="relative w-full h-64 sm:h-96 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center">
                    <img
                      src={currentImage?.image_url}
                      alt={localSubmission.title}
                      className="w-full h-full object-contain cursor-pointer"
                      onClick={() => setLightboxOpen(true)}
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      {user && (
                        <button
                          type="button"
                          onClick={() =>
                            currentImage &&
                            downloadSingleImage(currentImage.image_url, selectedImageIdx)
                          }
                          className="bg-black/65 hover:bg-black/85 text-white px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>ดาวน์โหลดรูปนี้</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setLightboxOpen(true)}
                        className="bg-black/65 hover:bg-black/85 text-white px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">ดูภาพเต็ม</span>
                      </button>
                    </div>

                    {images.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedImageIdx((prev) =>
                              prev > 0 ? prev - 1 : images.length - 1
                            )
                          }
                          className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 p-2 rounded-full text-white backdrop-blur-sm cursor-pointer"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedImageIdx((prev) =>
                              prev < images.length - 1 ? prev + 1 : 0
                            )
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 p-2 rounded-full text-white backdrop-blur-sm cursor-pointer"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Thumbnails row */}
                  {images.length > 1 && (
                    <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
                      {images.map((img, idx) => (
                        <button
                          type="button"
                          key={img.id || idx}
                          onClick={() => setSelectedImageIdx(idx)}
                          className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                            idx === selectedImageIdx
                              ? "border-blue-400 scale-105"
                              : "border-transparent opacity-60 hover:opacity-100"
                          }`}
                        >
                          <img
                            src={img.image_url}
                            alt={`thumb-${idx}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Description Sections */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm mb-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <span>วัตถุประสงค์ของการใช้สื่อ</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                    {localSubmission.objective}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm mb-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>รายละเอียด / วิธีการใช้สื่อ</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                    {localSubmission.usage_description}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm mb-2">
                    <Award className="w-4 h-4 text-amber-600" />
                    <span>ผลที่เกิดขึ้นกับผู้เรียน</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                    {localSubmission.student_outcome}
                  </p>
                </div>
              </div>

              {/* Teacher Info Card */}
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">
                      {localSubmission.teacher?.name}
                    </div>
                    <div>
                      {localSubmission.teacher?.grade_level} •{" "}
                      {localSubmission.teacher?.subjects}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => exportSubmissionA4Pdf(localSubmission)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-blue-300" />
                  <span>ส่งออกใบงานรายงานสื่อขนาด A4 แนวตั้ง (PDF)</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            คลังภาพถ่าย: {images.length} / 10 รูป
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs sm:text-sm font-medium rounded-xl transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && currentImage && (
        <div
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxOpen(false)}
        >
          <img
            src={currentImage.image_url}
            alt="full-view"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
