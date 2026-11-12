-- ==============================================================================
-- ระบบส่งสื่อการจัดการเรียนรู้ โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)
-- Learning Media Submission System - Supabase SQL Schema
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Tables

-- 2.1 Table: teachers (รายชื่อครูในระบบ)
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN ('early_childhood', 'primary')),
    grade_level TEXT NOT NULL,
    subjects TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.2 Table: academic_years (ปีการศึกษา)
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year_be TEXT NOT NULL UNIQUE, -- เช่น '2567', '2568', '2569'
    is_current BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.3 Table: submission_months (เดือนที่เปิดรับการส่งสื่อ 10 เดือน ยกเว้นตุลาคม)
CREATE TABLE IF NOT EXISTS public.submission_months (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month_no INTEGER NOT NULL UNIQUE, -- 5, 6, 7, 8, 9, 11, 12, 1, 2, 3
    month_name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    semester INTEGER NOT NULL CHECK (semester IN (1, 2)),
    display_order INTEGER NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.4 Table: profiles (ข้อมูลผู้ใช้งานและสิทธิ์)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher')) DEFAULT 'teacher',
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.5 Table: submissions (ข้อมูลการส่งสื่อ)
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    submission_month_id UUID NOT NULL REFERENCES public.submission_months(id) ON DELETE CASCADE,
    target_grade TEXT NOT NULL,
    subject_group TEXT NOT NULL,
    title TEXT NOT NULL,
    media_type TEXT NOT NULL,
    media_type_other TEXT,
    objective TEXT NOT NULL,
    usage_description TEXT NOT NULL,
    student_outcome TEXT NOT NULL,
    cover_image_url TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.6 Table: submission_images (ข้อมูลภาพถ่ายประกอบสื่อ ไม่เกิน 10 รูป)
CREATE TABLE IF NOT EXISTS public.submission_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT,
    file_size INTEGER,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 3. Functions & Triggers
-- ==============================================================================

-- 3.1 Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.2 Automatically handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_teacher_id UUID;
  v_role TEXT := 'teacher';
  v_full_name TEXT;
BEGIN
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', new.email);
  
  -- Check if metadata specifies admin
  IF (new.raw_user_meta_data->>'role') = 'admin' THEN
    v_role := 'admin';
  END IF;

  -- Check if metadata specifies teacher_id
  IF (new.raw_user_meta_data->>'teacher_id') IS NOT NULL AND (new.raw_user_meta_data->>'teacher_id') != '' THEN
    v_teacher_id := (new.raw_user_meta_data->>'teacher_id')::UUID;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, teacher_id)
  VALUES (new.id, new.email, v_full_name, v_role, v_teacher_id)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 4. Row Level Security (RLS)
-- ==============================================================================

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_images ENABLE ROW LEVEL SECURITY;

-- 4.1 Teachers Policies
DROP POLICY IF EXISTS "Anyone can view teachers" ON public.teachers;
CREATE POLICY "Anyone can view teachers"
  ON public.teachers FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage teachers" ON public.teachers;
CREATE POLICY "Admins can manage teachers"
  ON public.teachers FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 4.2 Academic Years Policies
DROP POLICY IF EXISTS "Anyone can view academic years" ON public.academic_years;
CREATE POLICY "Anyone can view academic years"
  ON public.academic_years FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage academic years" ON public.academic_years;
CREATE POLICY "Admins can manage academic years"
  ON public.academic_years FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 4.3 Submission Months Policies
DROP POLICY IF EXISTS "Anyone can view submission months" ON public.submission_months;
CREATE POLICY "Anyone can view submission months"
  ON public.submission_months FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage submission months" ON public.submission_months;
CREATE POLICY "Admins can manage submission months"
  ON public.submission_months FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 4.4 Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile or admins view all" ON public.profiles;
CREATE POLICY "Users can view their own profile or admins view all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));

-- 4.5 Submissions Policies
DROP POLICY IF EXISTS "Anyone authenticated can view submissions" ON public.submissions;
CREATE POLICY "Anyone authenticated can view submissions"
  ON public.submissions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Teachers can insert their own submissions" ON public.submissions;
CREATE POLICY "Teachers can insert their own submissions"
  ON public.submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by OR
    public.is_admin(auth.uid()) OR
    teacher_id IN (SELECT teacher_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Teachers can update their own submissions or admins can update any" ON public.submissions;
CREATE POLICY "Teachers can update their own submissions or admins can update any"
  ON public.submissions FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    public.is_admin(auth.uid()) OR
    teacher_id IN (SELECT teacher_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid() OR
    public.is_admin(auth.uid()) OR
    teacher_id IN (SELECT teacher_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Teachers can delete their own submissions or admins can delete any" ON public.submissions;
CREATE POLICY "Teachers can delete their own submissions or admins can delete any"
  ON public.submissions FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    public.is_admin(auth.uid()) OR
    teacher_id IN (SELECT teacher_id FROM public.profiles WHERE id = auth.uid())
  );

-- 4.6 Submission Images Policies
DROP POLICY IF EXISTS "Anyone authenticated can view submission images" ON public.submission_images;
CREATE POLICY "Anyone authenticated can view submission images"
  ON public.submission_images FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert images to their submissions" ON public.submission_images;
CREATE POLICY "Users can insert images to their submissions"
  ON public.submission_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = submission_id
      AND (s.created_by = auth.uid() OR public.is_admin(auth.uid()) OR s.teacher_id IN (SELECT teacher_id FROM public.profiles WHERE id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can delete images of their submissions" ON public.submission_images;
CREATE POLICY "Users can delete images of their submissions"
  ON public.submission_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = submission_id
      AND (s.created_by = auth.uid() OR public.is_admin(auth.uid()) OR s.teacher_id IN (SELECT teacher_id FROM public.profiles WHERE id = auth.uid()))
    )
  );

-- ==============================================================================
-- 5. Storage Bucket & Policies
-- ==============================================================================
-- สร้าง Bucket 'submission-images' ใน Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('submission-images', 'submission-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies for 'submission-images'
DROP POLICY IF EXISTS "Public Read for Submission Images" ON storage.objects;
CREATE POLICY "Public Read for Submission Images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'submission-images');

DROP POLICY IF EXISTS "Authenticated users can upload submission images" ON storage.objects;
CREATE POLICY "Authenticated users can upload submission images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'submission-images');

DROP POLICY IF EXISTS "Authenticated users can update/delete their submission images" ON storage.objects;
CREATE POLICY "Authenticated users can update/delete their submission images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'submission-images');

-- ==============================================================================
-- 6. Initial Seed Data (ข้อมูลเริ่มต้น)
-- ==============================================================================

-- 6.1 ครูทั้ง 9 คน ตามที่ระบุในข้อกำหนด
INSERT INTO public.teachers (name, category, grade_level, subjects, display_order)
VALUES
  -- กลุ่มที่ 1 ครูระดับปฐมวัย
  ('ครูธารารัตน์ สามิภักดิ์', 'early_childhood', 'ระดับปฐมวัย (อ.1 - อ.3)', 'การจัดประสบการณ์การเรียนรู้ระดับปฐมวัย', 1),
  ('ครูนภาวรรณ สันดิษฐ์', 'early_childhood', 'ระดับปฐมวัย (อ.1 - อ.3)', 'การจัดประสบการณ์การเรียนรู้ระดับปฐมวัย', 2),
  
  -- กลุ่มที่ 2 ครูระดับประถมศึกษา
  ('ครูณิชนันทน์ การบุญ', 'primary', 'ประจำชั้น ป.1', 'สอนทุกวิชาเฉพาะชั้น ป.1', 3),
  ('ครูกชกร อรัญวัชน์', 'primary', 'ประจำชั้น ป.2', 'ครูประจำวิชาภาษาไทย', 4),
  ('ครูรักชนก โสภักต์', 'primary', 'ประจำชั้น ป.3', 'ครูประจำวิชาคอมพิวเตอร์ (วิทยาการคำนวณ)', 5),
  ('ครูมณีมัญช์ ศาสตร์ทรัพย์', 'primary', 'ประจำชั้น ป.4', 'ครูประจำวิชาวิทยาศาสตร์', 6),
  ('ครูณัฐวุฒิ คำจันทร์', 'primary', 'ประจำชั้น ป.5', 'ครูประจำวิชาสุขศึกษาและพลศึกษา', 7),
  ('ครูชมพูนุท บุญอากาศ', 'primary', 'ประจำชั้น ป.6', 'ครูประจำวิชาภาษาอังกฤษพื้นฐานและภาษาอังกฤษเพิ่มเติม', 8),
  ('นางสาวจันทนิภา เขียวละลิ้ม', 'primary', 'ประจำชั้น ป.6', 'ครูประจำวิชาคณิตศาสตร์', 9)
ON CONFLICT (name) DO UPDATE 
SET category = EXCLUDED.category,
    grade_level = EXCLUDED.grade_level,
    subjects = EXCLUDED.subjects,
    display_order = EXCLUDED.display_order;

-- 6.2 ปีการศึกษา (Academic Years)
INSERT INTO public.academic_years (year_be, is_current)
VALUES
  ('2567', false),
  ('2568', false),
  ('2569', true)
ON CONFLICT (year_be) DO NOTHING;

-- 6.3 เดือนที่ต้องส่งสื่อ (10 เดือน กำหนดตามภาคเรียน และไม่รวมเดือนตุลาคม)
INSERT INTO public.submission_months (month_no, month_name, short_name, semester, display_order)
VALUES
  -- ภาคเรียนที่ 1
  (5, 'พฤษภาคม', 'พ.ค.', 1, 1),
  (6, 'มิถุนายน', 'มิ.ย.', 1, 2),
  (7, 'กรกฎาคม', 'ก.ค.', 1, 3),
  (8, 'สิงหาคม', 'ส.ค.', 1, 4),
  (9, 'กันยายน', 'ก.ย.', 1, 5),
  -- ภาคเรียนที่ 2 (เว้น ต.ค.)
  (11, 'พฤศจิกายน', 'พ.ย.', 2, 6),
  (12, 'ธันวาคม', 'ธ.ค.', 2, 7),
  (1, 'มกราคม', 'ม.ค.', 2, 8),
  (2, 'กุมภาพันธ์', 'ก.พ.', 2, 9),
  (3, 'มีนาคม', 'มี.ค.', 2, 10)
ON CONFLICT (month_no) DO UPDATE 
SET month_name = EXCLUDED.month_name,
    short_name = EXCLUDED.short_name,
    semester = EXCLUDED.semester,
    display_order = EXCLUDED.display_order;
