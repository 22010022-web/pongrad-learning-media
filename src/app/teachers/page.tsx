"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";
import {
  Teacher,
  TeacherCategory,
  TEACHERS_PRESET,
} from "@/types/database";
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  GraduationCap,
  BookOpen,
  ArrowLeft,
  AlertCircle,
  Check,
  X,
  ShieldCheck,
} from "lucide-react";

export default function TeachersManagementPage() {
  const { user, isAdmin, isConfigured } = useAuth();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Modal for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<TeacherCategory>("primary");
  const [gradeLevel, setGradeLevel] = useState("");
  const [subjects, setSubjects] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState<number>(10);

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, [isConfigured]);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      if (isConfigured) {
        const { data, error } = await supabase
          .from("teachers")
          .select("*")
          .order("display_order", { ascending: true });
        if (data && data.length > 0) {
          setTeachers(data as Teacher[]);
          return;
        }
      }
      setTeachers(
        TEACHERS_PRESET.map((t) => ({
          ...t,
          created_at: new Date().toISOString(),
        }))
      );
    } catch (err) {
      console.error("Error loading teachers:", err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingTeacher(null);
    setName("");
    setCategory("primary");
    setGradeLevel("");
    setSubjects("");
    setIsActive(true);
    setDisplayOrder(teachers.length + 1);
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const openEditModal = (t: Teacher) => {
    setEditingTeacher(t);
    setName(t.name);
    setCategory(t.category);
    setGradeLevel(t.grade_level);
    setSubjects(t.subjects);
    setIsActive(t.is_active);
    setDisplayOrder(t.display_order);
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setSaving(true);

    if (!name.trim()) {
      setFormError("กรุณากรอกชื่อครู");
      setSaving(false);
      return;
    }

    try {
      if (editingTeacher) {
        // Edit existing
        if (isConfigured) {
          const { error } = await supabase
            .from("teachers")
            .update({
              name: name.trim(),
              category,
              grade_level: gradeLevel.trim(),
              subjects: subjects.trim(),
              is_active: isActive,
              display_order: displayOrder,
              updated_at: new Date().toISOString(),
            })
            .eq("id", editingTeacher.id);
          if (error) throw error;
        }
        setTeachers((prev) =>
          prev.map((t) =>
            t.id === editingTeacher.id
              ? {
                  ...t,
                  name: name.trim(),
                  category,
                  grade_level: gradeLevel.trim(),
                  subjects: subjects.trim(),
                  is_active: isActive,
                  display_order: displayOrder,
                }
              : t
          )
        );
      } else {
        // Add new teacher
        const newTeacherPayload = {
          name: name.trim(),
          category,
          grade_level: gradeLevel.trim(),
          subjects: subjects.trim(),
          is_active: isActive,
          display_order: displayOrder,
        };

        if (isConfigured) {
          const { data, error } = await supabase
            .from("teachers")
            .insert(newTeacherPayload)
            .select()
            .single();
          if (error) throw error;
          if (data) setTeachers((prev) => [...prev, data as Teacher]);
        } else {
          setTeachers((prev) => [
            ...prev,
            {
              ...newTeacherPayload,
              id: `teacher-${Date.now()}`,
              created_at: new Date().toISOString(),
            },
          ]);
        }
      }

      setFormSuccess("บันทึกข้อมูลเรียบร้อยแล้ว");
      setTimeout(() => {
        setIsModalOpen(false);
      }, 800);
    } catch (err: any) {
      setFormError(err?.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setSaving(false);
    }
  };

  const toggleTeacherStatus = async (teacher: Teacher) => {
    const updatedStatus = !teacher.is_active;
    try {
      if (isConfigured) {
        await supabase
          .from("teachers")
          .update({ is_active: updatedStatus })
          .eq("id", teacher.id);
      }
      setTeachers((prev) =>
        prev.map((t) => (t.id === teacher.id ? { ...t, is_active: updatedStatus } : t))
      );
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200 mb-2">
            <Users className="w-4 h-4" />
            <span>การจัดการข้อมูลบุคลากร</span>
          </div>
          <h1 className="text-2xl font-bold text-navy-950">
            จัดการรายชื่อครูในระบบ
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร) • เพิ่ม แก้ไข และเปิด/ปิดการใช้งานรายชื่อครูผู้สอน
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>เพิ่มรายชื่อครูใหม่</span>
        </button>
      </div>

      {/* Teachers List by Group */}
      <div className="space-y-6">
        {/* Group 1: Early Childhood */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm">
              <GraduationCap className="w-5 h-5" />
              <span>กลุ่มที่ 1 ครูระดับปฐมวัย</span>
            </div>
            <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full">
              {teachers.filter((t) => t.category === "early_childhood").length} ท่าน
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {teachers
              .filter((t) => t.category === "early_childhood")
              .map((teacher, idx) => (
                <div
                  key={teacher.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-sm shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-navy-950 text-sm sm:text-base flex items-center gap-2">
                        <span>{teacher.name}</span>
                        {!teacher.is_active && (
                          <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-normal">
                            ปิดใช้งาน
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-medium text-amber-800">{teacher.grade_level}</span>
                        <span>•</span>
                        <span>{teacher.subjects}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => toggleTeacherStatus(teacher)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                        teacher.is_active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {teacher.is_active ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>เปิดใช้งาน</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-slate-400" />
                          <span>ปิดใช้งาน</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => openEditModal(teacher)}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="แก้ไขข้อมูล"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Group 2: Primary */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-700 to-navy-900 text-white px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm">
              <BookOpen className="w-5 h-5" />
              <span>กลุ่มที่ 2 ครูระดับประถมศึกษา</span>
            </div>
            <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full">
              {teachers.filter((t) => t.category === "primary").length} ท่าน
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {teachers
              .filter((t) => t.category === "primary")
              .map((teacher, idx) => (
                <div
                  key={teacher.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-navy-950 text-sm sm:text-base flex items-center gap-2">
                        <span>{teacher.name}</span>
                        {!teacher.is_active && (
                          <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-normal">
                            ปิดใช้งาน
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-medium text-blue-800">{teacher.grade_level}</span>
                        <span>•</span>
                        <span>{teacher.subjects}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => toggleTeacherStatus(teacher)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                        teacher.is_active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {teacher.is_active ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>เปิดใช้งาน</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-slate-400" />
                          <span>ปิดใช้งาน</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => openEditModal(teacher)}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="แก้ไขข้อมูล"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-navy-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingTeacher ? "แก้ไขข้อมูลครู" : "เพิ่มรายชื่อครูใหม่"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ - นามสกุล <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น ครูณิชนันทน์ การบุญ"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* Group Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  กลุ่มระดับการศึกษา <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TeacherCategory)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="early_childhood">กลุ่มที่ 1 ครูระดับปฐมวัย</option>
                  <option value="primary">กลุ่มที่ 2 ครูระดับประถมศึกษา</option>
                </select>
              </div>

              {/* Grade Level */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ระดับชั้นที่รับผิดชอบ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  placeholder="เช่น ประจำชั้น ป.1 หรือ ระดับปฐมวัย (อ.1 - อ.3)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Subjects */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  วิชาที่สอน / หน้าที่รับผิดชอบ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={subjects}
                  onChange={(e) => setSubjects(e.target.value)}
                  placeholder="เช่น ครูประจำวิชาภาษาไทย, สอนทุกวิชาเฉพาะชั้น ป.1"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Display Order */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ลำดับการแสดงผล
                </label>
                <input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-60"
                >
                  {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
