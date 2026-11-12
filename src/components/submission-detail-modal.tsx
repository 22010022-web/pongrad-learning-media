"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Submission } from "@/types/database";
import { formatDateThai } from "@/lib/utils";
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
} from "lucide-react";

interface Props {
  submission: Submission | null;
  onClose: () => void;
}

export function SubmissionDetailModal({ submission, onClose }: Props) {
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!submission) return null;

  const images = submission.images && submission.images.length > 0
    ? submission.images
    : submission.cover_image_url
    ? [{ id: "cover", submission_id: submission.id, image_url: submission.cover_image_url, file_path: "", display_order: 0, created_at: "" }]
    : [];

  const currentImage = images[selectedImageIdx] || images[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-8 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-navy-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg line-clamp-1">
                {submission.title}
              </h3>
              <p className="text-xs text-navy-200 flex items-center gap-2">
                <span>{submission.teacher?.name || "ครูผู้ส่ง"}</span>
                <span>•</span>
                <span>{submission.submission_month?.month_name} ({submission.academic_year?.year_be ? `ปีการศึกษา ${submission.academic_year.year_be}` : ""})</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-navy-300 hover:text-white hover:bg-navy-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Main Info Badges */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              {submission.target_grade}
            </span>
            <span className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 font-medium border border-indigo-200 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              {submission.subject_group}
            </span>
            <span className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 font-medium border border-amber-200 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              {submission.media_type === "อื่น ๆ" && submission.media_type_other
                ? `อื่น ๆ: ${submission.media_type_other}`
                : submission.media_type}
            </span>
            <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              ส่งเมื่อ: {formatDateThai(submission.created_at)}
            </span>
          </div>

          {/* Image Gallery Showcase */}
          {images.length > 0 && (
            <div className="bg-slate-900 rounded-2xl overflow-hidden p-2 sm:p-4 text-white">
              {/* Main Preview */}
              <div className="relative w-full h-64 sm:h-96 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center">
                <img
                  src={currentImage?.image_url}
                  alt={submission.title}
                  className="w-full h-full object-contain cursor-pointer"
                  onClick={() => setLightboxOpen(true)}
                />
                <button
                  onClick={() => setLightboxOpen(true)}
                  className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg text-xs flex items-center gap-1.5 backdrop-blur-md transition-all"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">ดูภาพขนาดเต็ม</span>
                </button>

                {images.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setSelectedImageIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1))
                      }
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 p-2 rounded-full text-white backdrop-blur-sm"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() =>
                        setSelectedImageIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0))
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 p-2 rounded-full text-white backdrop-blur-sm"
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
                      key={img.id || idx}
                      onClick={() => setSelectedImageIdx(idx)}
                      className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
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
                {submission.objective}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm mb-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>รายละเอียด / วิธีการใช้สื่อ</span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                {submission.usage_description}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm mb-2">
                <Award className="w-4 h-4 text-amber-600" />
                <span>ผลที่เกิดขึ้นกับผู้เรียน</span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                {submission.student_outcome}
              </p>
            </div>
          </div>

          {/* Teacher Info Card */}
          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-slate-900 text-sm">
                  {submission.teacher?.name}
                </div>
                <div>{submission.teacher?.grade_level} • {submission.teacher?.subjects}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium rounded-xl transition-colors"
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
