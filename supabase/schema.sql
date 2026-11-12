-- ==============================================================================
-- ระบบส่งสื่อการจัดการเรียนรู้ โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)
-- Learning Media Submission System - Supabase SQL Schema (Complete & Bulletproof)
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
-- 3. Initial Seed Data (สร้างข้อมูลครู 9 ท่าน ปีการศึกษา และ 10 เดือน ก่อนผูก Trigger)
-- ==============================================================================

-- 3.1 ครูทั้ง 9 คน ตามที่ระบุในข้อกำหนด
INSERT INTO public.teachers (id, name, category, grade_level, subjects, display_order)
VALUES
  -- กลุ่มที่ 1 ครูระดับปฐมวัย
  ('00000000-0000-0000-0001-000000000001', 'ครูธารารัตน์ สามิภักดิ์', 'early_childhood', 'ระดับปฐมวัย (อ.1 - อ.3)', 'การจัดประสบการณ์การเรียนรู้ระดับปฐมวัย', 1),
  ('00000000-0000-0000-0001-000000000002', 'ครูนภาวรรณ สันดิษฐ์', 'early_childhood', 'ระดับปฐมวัย (อ.1 - อ.3)', 'การจัดประสบการณ์การเรียนรู้ระดับปฐมวัย', 2),
  
  -- กลุ่มที่ 2 ครูระดับประถมศึกษา
  ('00000000-0000-0000-0001-000000000003', 'ครูณิชนันทน์ การบุญ', 'primary', 'ประจำชั้น ป.1', 'สอนทุกวิชาเฉพาะชั้น ป.1', 3),
  ('00000000-0000-0000-0001-000000000004', 'ครูกชกร อรัญวัชน์', 'primary', 'ประจำชั้น ป.2', 'ครูประจำวิชาภาษาไทย', 4),
  ('00000000-0000-0000-0001-000000000005', 'ครูรักชนก โสภักต์', 'primary', 'ประจำชั้น ป.3', 'ครูประจำวิชาคอมพิวเตอร์ (วิทยาการคำนวณ)', 5),
  ('00000000-0000-0000-0001-000000000006', 'ครูมณีมัญช์ ศาสตร์ทรัพย์', 'primary', 'ประจำชั้น ป.4', 'ครูประจำวิชาวิทยาศาสตร์', 6),
  ('00000000-0000-0000-0001-000000000007', 'ครูณัฐวุฒิ คำจันทร์', 'primary', 'ประจำชั้น ป.5', 'ครูประจำวิชาสุขศึกษาและพลศึกษา', 7),
  ('00000000-0000-0000-0001-000000000008', 'ครูชมพูนุท บุญอากาศ', 'primary', 'ประจำชั้น ป.6', 'ครูประจำวิชาภาษาอังกฤษพื้นฐานและภาษาอังกฤษเพิ่มเติม', 8),
  ('00000000-0000-0000-0001-000000000009', 'นางสาวจันทนิภา เขียวละลิ้ม', 'primary', 'ประจำชั้น ป.6', 'ครูประจำวิชาคณิตศาสตร์', 9)
ON CONFLICT (name) DO UPDATE 
SET category = EXCLUDED.category,
    grade_level = EXCLUDED.grade_level,
    subjects = EXCLUDED.subjects,
    display_order = EXCLUDED.display_order;

-- 3.2 ปีการศึกษา (Academic Years)
INSERT INTO public.academic_years (id, year_be, is_current)
VALUES
  ('00000000-0000-0000-0003-000000002567', '2567', false),
  ('00000000-0000-0000-0003-000000002568', '2568', false),
  ('00000000-0000-0000-0003-000000002569', '2569', true)
ON CONFLICT (year_be) DO NOTHING;

-- 3.3 เดือนที่ต้องส่งสื่อ (10 เดือน กำหนดตามภาคเรียน และไม่รวมเดือนตุลาคม)
INSERT INTO public.submission_months (id, month_no, month_name, short_name, semester, display_order)
VALUES
  -- ภาคเรียนที่ 1
  ('00000000-0000-0000-0002-000000000005', 5, 'พฤษภาคม', 'พ.ค.', 1, 1),
  ('00000000-0000-0000-0002-000000000006', 6, 'มิถุนายน', 'มิ.ย.', 1, 2),
  ('00000000-0000-0000-0002-000000000007', 7, 'กรกฎาคม', 'ก.ค.', 1, 3),
  ('00000000-0000-0000-0002-000000000008', 8, 'สิงหาคม', 'ส.ค.', 1, 4),
  ('00000000-0000-0000-0002-000000000009', 9, 'กันยายน', 'ก.ย.', 1, 5),
  -- ภาคเรียนที่ 2 (เว้น ต.ค.)
  ('00000000-0000-0000-0002-000000000011', 11, 'พฤศจิกายน', 'พ.ย.', 2, 6),
  ('00000000-0000-0000-0002-000000000012', 12, 'ธันวาคม', 'ธ.ค.', 2, 7),
  ('00000000-0000-0000-0002-000000000001', 1, 'มกราคม', 'ม.ค.', 2, 8),
  ('00000000-0000-0000-0002-000000000002', 2, 'กุมภาพันธ์', 'ก.พ.', 2, 9),
  ('00000000-0000-0000-0002-000000000003', 3, 'มีนาคม', 'มี.ค.', 2, 10)
ON CONFLICT (month_no) DO UPDATE 
SET month_name = EXCLUDED.month_name,
    short_name = EXCLUDED.short_name,
    semester = EXCLUDED.semester,
    display_order = EXCLUDED.display_order;

-- ==============================================================================
-- 4. Functions & Triggers (ระบบสมัครสมาชิกอัตโนมัติ & ยืนยันอีเมลทันที)
-- ==============================================================================

-- 4.1 ฟังก์ชันตรวจสอบสิทธิ์ Admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$;

-- 4.2 Trigger ยืนยันอีเมลอัตโนมัติเมื่อสมัครสมาชิก (ไม่ต้องรอกดลิงก์ในอีเมล)
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := timezone('utc'::text, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_user();

-- ยืนยันอีเมลให้กับผู้ใช้ที่อาจสมัครค้างไว้ก่อนหน้านี้ทั้งหมด
UPDATE auth.users
SET email_confirmed_at = timezone('utc'::text, now())
WHERE email_confirmed_at IS NULL;

-- 4.3 Trigger สร้าง Profile อัตโนมัติอย่างปลอดภัย (ไม่มีวันพังแม้ข้อมูลไม่ครบ)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_id UUID := NULL;
  v_teacher_raw TEXT;
  v_teacher_name TEXT;
  v_role TEXT := 'teacher';
  v_full_name TEXT;
BEGIN
  v_full_name := COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''), new.email, 'ผู้ใช้งาน');
  
  IF (new.raw_user_meta_data->>'role') = 'admin' THEN
    v_role := 'admin';
  END IF;

  v_teacher_raw := TRIM(COALESCE(new.raw_user_meta_data->>'teacher_id', ''));
  v_teacher_name := TRIM(COALESCE(new.raw_user_meta_data->>'teacher_name', ''));

  -- 1) ตรวจสอบว่า teacher_id เป็น UUID ที่ถูกต้องและมีอยู่ในตาราง teachers จริงหรือไม่
  IF v_teacher_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT id INTO v_teacher_id FROM public.teachers WHERE id = v_teacher_raw::UUID LIMIT 1;
  END IF;

  -- 2) หากยังไม่ได้ UUID (เช่น ส่งมาเป็น preset-1 หรือชื่อครู) ให้ค้นหาจากชื่อครูโดยตรง
  IF v_teacher_id IS NULL AND v_teacher_name != '' THEN
    SELECT id INTO v_teacher_id FROM public.teachers WHERE name = v_teacher_name LIMIT 1;
  END IF;
  IF v_teacher_id IS NULL AND v_full_name != '' THEN
    SELECT id INTO v_teacher_id FROM public.teachers WHERE name = v_full_name LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, teacher_id)
  VALUES (new.id, new.email, v_full_name, v_role, v_teacher_id)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      teacher_id = COALESCE(EXCLUDED.teacher_id, public.profiles.teacher_id),
      updated_at = timezone('utc'::text, now());

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- ป้องกันไม่ให้เกิด Database error saving new user เด็ดขาด
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ซิงค์ข้อมูล Profile ย้อนหลังให้บัญชีที่เคยสมัครไว้แล้วแต่ยังไม่มีใน public.profiles
INSERT INTO public.profiles (id, email, full_name, role, teacher_id)
SELECT 
  u.id,
  u.email,
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''), u.email, 'ผู้ใช้งาน'),
  CASE WHEN (u.raw_user_meta_data->>'role') = 'admin' THEN 'admin' ELSE 'teacher' END,
  t.id
FROM auth.users u
LEFT JOIN public.teachers t ON t.name = COALESCE(u.raw_user_meta_data->>'teacher_name', u.raw_user_meta_data->>'full_name')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 5. Row Level Security (RLS)
-- ==============================================================================

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_images ENABLE ROW LEVEL SECURITY;

-- 5.1 Teachers Policies
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

-- 5.2 Academic Years Policies
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

-- 5.3 Submission Months Policies
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

-- 5.4 Profiles Policies
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

-- 5.5 Submissions Policies
DROP POLICY IF EXISTS "Anyone can view submissions" ON public.submissions;
DROP POLICY IF EXISTS "Anyone authenticated can view submissions" ON public.submissions;
CREATE POLICY "Anyone can view submissions"
  ON public.submissions FOR SELECT
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

-- 5.6 Submission Images Policies
DROP POLICY IF EXISTS "Anyone can view submission images" ON public.submission_images;
DROP POLICY IF EXISTS "Anyone authenticated can view submission images" ON public.submission_images;
CREATE POLICY "Anyone can view submission images"
  ON public.submission_images FOR SELECT
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
-- 6. Storage Bucket & Policies
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
