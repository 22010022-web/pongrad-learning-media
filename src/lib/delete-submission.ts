import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * Delete a submission completely:
 * 1. Remove image files from Supabase Storage (free up space)
 * 2. Remove rows in submission_images
 * 3. Remove the submission row itself
 */
export async function deleteSubmissionCompletely(
  submissionId: string
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) return { error: null };

  try {
    // 1. Collect storage file paths of this submission
    const { data: imgRows } = await supabase
      .from("submission_images")
      .select("file_path")
      .eq("submission_id", submissionId);

    const paths = (imgRows || [])
      .map((r: { file_path: string | null }) => r.file_path)
      .filter((p): p is string => Boolean(p));

    if (paths.length > 0) {
      // Ignore storage errors so DB cleanup still happens
      await supabase.storage.from("submission-images").remove(paths);
    }

    // 2. Delete image rows (in case FK has no cascade)
    await supabase.from("submission_images").delete().eq("submission_id", submissionId);

    // 3. Delete submission row
    const { error } = await supabase.from("submissions").delete().eq("id", submissionId);
    if (error) throw new Error(error.message);

    return { error: null };
  } catch (err: any) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}
