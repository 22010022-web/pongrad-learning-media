import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image-compressor";
import { SubmissionMonth } from "@/types/database";

export type SemesterMode = "semester_2" | "semester_1" | "all";

export interface SchoolSettings {
  logoUrl: string | null;
  schoolName: string;
  schoolArea: string;
  affiliation: string;
  directorName: string;
  directorPosition: string;
  defaultSemesterByYear: Record<string, SemesterMode>;
  updatedAt: string;
}

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  logoUrl: null,
  schoolName: "โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)",
  schoolArea: "สพป.จันทบุรี เขต 1",
  affiliation: "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาจันทบุรี เขต 1",
  directorName: "",
  directorPosition: "ผู้อำนวยการโรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)",
  defaultSemesterByYear: {
    "2569": "semester_2",
  },
  updatedAt: new Date().toISOString(),
};

export function getActiveSemesterModeForYear(
  yearBe: string,
  settings: SchoolSettings = DEFAULT_SCHOOL_SETTINGS
): SemesterMode {
  const map = settings?.defaultSemesterByYear || DEFAULT_SCHOOL_SETTINGS.defaultSemesterByYear;
  if (map[yearBe]) return map[yearBe];
  return yearBe === "2569" ? "semester_2" : "all";
}

export function filterMonthsBySemesterMode(
  months: SubmissionMonth[],
  mode: SemesterMode
): SubmissionMonth[] {
  if (mode === "semester_2") {
    return months.filter((m) => m.semester === 2);
  }
  if (mode === "semester_1") {
    return months.filter((m) => m.semester === 1);
  }
  return months;
}

export function getSemesterLabel(mode: SemesterMode, yearBe: string): string {
  if (mode === "semester_2") {
    return `ภาคเรียนที่ 2/${yearBe} (5 เดือน: พ.ย. - มี.ค.)`;
  }
  if (mode === "semester_1") {
    return `ภาคเรียนที่ 1/${yearBe} (5 เดือน: พ.ค. - ก.ย.)`;
  }
  return `ปีการศึกษา ${yearBe} (ทั้งปี 10 เดือน)`;
}

const STORAGE_BUCKET = "submission-images";
const SETTINGS_FILE_PATH = "settings/school_settings.json";
const LOCAL_STORAGE_KEY = "pongrad_school_settings_v1";

export async function fetchSchoolSettings(): Promise<SchoolSettings> {
  // 1. Check localStorage cache first for instant render
  let cached: SchoolSettings | null = null;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        cached = { ...DEFAULT_SCHOOL_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {
      // ignore
    }
  }

  if (!isSupabaseConfigured()) {
    return cached || DEFAULT_SCHOOL_SETTINGS;
  }

  try {
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(SETTINGS_FILE_PATH);

    if (urlData?.publicUrl) {
      const res = await fetch(`${urlData.publicUrl}?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const remoteJson = await res.json();
        const merged: SchoolSettings = {
          ...DEFAULT_SCHOOL_SETTINGS,
          ...remoteJson,
          defaultSemesterByYear: {
            ...DEFAULT_SCHOOL_SETTINGS.defaultSemesterByYear,
            ...(remoteJson.defaultSemesterByYear || {}),
          },
        };
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        }
        return merged;
      }
    }
  } catch {
    // Fallback to cached or default
  }

  return cached || DEFAULT_SCHOOL_SETTINGS;
}

export async function saveSchoolSettings(settings: SchoolSettings): Promise<{ error: Error | null }> {
  const updated: SchoolSettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("school-settings-updated", { detail: updated }));
  }

  if (!isSupabaseConfigured()) {
    return { error: null };
  }

  try {
    // Remove existing config file first so we don't need UPDATE RLS on storage.objects (INSERT + DELETE are allowed)
    await supabase.storage.from(STORAGE_BUCKET).remove([SETTINGS_FILE_PATH]);

    const blob = new Blob([JSON.stringify(updated, null, 2)], {
      type: "application/json",
    });

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(SETTINGS_FILE_PATH, blob, {
        contentType: "application/json",
        upsert: true,
      });

    if (error) {
      console.warn("Could not persist settings to storage:", error.message);
    }
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

export async function uploadSchoolLogo(file: File): Promise<{ url: string | null; error: Error | null }> {
  try {
    const compressed = await compressImage(file, 512, 512, 0.9);

    if (!isSupabaseConfigured()) {
      const localUrl = URL.createObjectURL(compressed);
      return { url: localUrl, error: null };
    }

    const ext = file.name.split(".").pop() || "png";
    const filePath = `settings/school_logo_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, compressed, {
        contentType: compressed.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
    return { url: data.publicUrl, error: null };
  } catch (err: any) {
    return { url: null, error: err };
  }
}
