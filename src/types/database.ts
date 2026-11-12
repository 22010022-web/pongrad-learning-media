export type UserRole = 'admin' | 'teacher';

export type TeacherCategory = 'early_childhood' | 'primary';

export interface Teacher {
  id: string;
  name: string;
  category: TeacherCategory;
  grade_level: string;
  subjects: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at?: string;
}

export interface AcademicYear {
  id: string;
  year_be: string; // e.g. "2569"
  is_current: boolean;
  created_at: string;
}

export interface SubmissionMonth {
  id: string;
  month_no: number; // 5, 6, 7, 8, 9, 11, 12, 1, 2, 3
  month_name: string; // e.g. "พฤษภาคม"
  short_name: string; // e.g. "พ.ค."
  semester: 1 | 2;
  display_order: number;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string;
  role: UserRole;
  teacher_id: string | null;
  created_at: string;
  updated_at?: string;
  teacher?: Teacher;
}

export interface Submission {
  id: string;
  teacher_id: string;
  academic_year_id: string;
  submission_month_id: string;
  target_grade: string;
  subject_group: string;
  title: string;
  media_type: string;
  media_type_other?: string | null;
  objective: string;
  usage_description: string;
  student_outcome: string;
  cover_image_url?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  teacher?: Teacher;
  academic_year?: AcademicYear;
  submission_month?: SubmissionMonth;
  images?: SubmissionImage[];
}

export interface SubmissionImage {
  id: string;
  submission_id: string;
  image_url: string;
  file_path: string;
  file_name?: string | null;
  file_size?: number | null;
  display_order: number;
  created_at: string;
}

export const MEDIA_TYPES = [
  'สื่อทำมือ',
  'สื่อบัตรภาพ / บัตรคำ',
  'สื่อเกมการศึกษา',
  'สื่อเทคโนโลยีดิจิทัล',
  'สื่อ PowerPoint',
  'สื่อวิดีโอ',
  'สื่อประกอบการทดลอง',
  'สื่อจากวัสดุธรรมชาติ / วัสดุเหลือใช้',
  'อื่น ๆ',
] as const;

export const GRADE_LEVELS = [
  'อนุบาล 1',
  'อนุบาล 2',
  'อนุบาล 3',
  'ประถมศึกษาปีที่ 1 (ป.1)',
  'ประถมศึกษาปีที่ 2 (ป.2)',
  'ประถมศึกษาปีที่ 3 (ป.3)',
  'ประถมศึกษาปีที่ 4 (ป.4)',
  'ประถมศึกษาปีที่ 5 (ป.5)',
  'ประถมศึกษาปีที่ 6 (ป.6)',
] as const;

// เดือน 10 เดือนตามข้อกำหนด (ไม่รวมตุลาคม)
export const SUBMISSION_MONTHS_PRESET: Omit<SubmissionMonth, 'id' | 'created_at'>[] = [
  { month_no: 5, month_name: 'พฤษภาคม', short_name: 'พ.ค.', semester: 1, display_order: 1 },
  { month_no: 6, month_name: 'มิถุนายน', short_name: 'มิ.ย.', semester: 1, display_order: 2 },
  { month_no: 7, month_name: 'กรกฎาคม', short_name: 'ก.ค.', semester: 1, display_order: 3 },
  { month_no: 8, month_name: 'สิงหาคม', short_name: 'ส.ค.', semester: 1, display_order: 4 },
  { month_no: 9, month_name: 'กันยายน', short_name: 'ก.ย.', semester: 1, display_order: 5 },
  { month_no: 11, month_name: 'พฤศจิกายน', short_name: 'พ.ย.', semester: 2, display_order: 6 },
  { month_no: 12, month_name: 'ธันวาคม', short_name: 'ธ.ค.', semester: 2, display_order: 7 },
  { month_no: 1, month_name: 'มกราคม', short_name: 'ม.ค.', semester: 2, display_order: 8 },
  { month_no: 2, month_name: 'กุมภาพันธ์', short_name: 'ก.พ.', semester: 2, display_order: 9 },
  { month_no: 3, month_name: 'มีนาคม', short_name: 'มี.ค.', semester: 2, display_order: 10 },
];

export const TEACHERS_PRESET: Omit<Teacher, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'ครูธารารัตน์ สามิภักดิ์',
    category: 'early_childhood',
    grade_level: 'ระดับปฐมวัย (อ.1 - อ.3)',
    subjects: 'การจัดประสบการณ์การเรียนรู้ระดับปฐมวัย',
    is_active: true,
    display_order: 1,
  },
  {
    name: 'ครูนภาวรรณ สันดิษฐ์',
    category: 'early_childhood',
    grade_level: 'ระดับปฐมวัย (อ.1 - อ.3)',
    subjects: 'การจัดประสบการณ์การเรียนรู้ระดับปฐมวัย',
    is_active: true,
    display_order: 2,
  },
  {
    name: 'ครูณิชนันทน์ การบุญ',
    category: 'primary',
    grade_level: 'ประจำชั้น ป.1',
    subjects: 'สอนทุกวิชาเฉพาะชั้น ป.1',
    is_active: true,
    display_order: 3,
  },
  {
    name: 'ครูกชกร อรัญวัชน์',
    category: 'primary',
    grade_level: 'ประจำชั้น ป.2',
    subjects: 'ครูประจำวิชาภาษาไทย',
    is_active: true,
    display_order: 4,
  },
  {
    name: 'ครูรักชนก โสภักต์',
    category: 'primary',
    grade_level: 'ประจำชั้น ป.3',
    subjects: 'ครูประจำวิชาคอมพิวเตอร์ (วิทยาการคำนวณ)',
    is_active: true,
    display_order: 5,
  },
  {
    name: 'ครูมณีมัญช์ ศาสตร์ทรัพย์',
    category: 'primary',
    grade_level: 'ประจำชั้น ป.4',
    subjects: 'ครูประจำวิชาวิทยาศาสตร์',
    is_active: true,
    display_order: 6,
  },
  {
    name: 'ครูณัฐวุฒิ คำจันทร์',
    category: 'primary',
    grade_level: 'ประจำชั้น ป.5',
    subjects: 'ครูประจำวิชาสุขศึกษาและพลศึกษา',
    is_active: true,
    display_order: 7,
  },
  {
    name: 'ครูชมพูนุท บุญอากาศ',
    category: 'primary',
    grade_level: 'ประจำชั้น ป.6',
    subjects: 'ครูประจำวิชาภาษาอังกฤษพื้นฐานและภาษาอังกฤษเพิ่มเติม',
    is_active: true,
    display_order: 8,
  },
  {
    name: 'นางสาวจันทนิภา เขียวละลิ้ม',
    category: 'primary',
    grade_level: 'ประจำชั้น ป.6',
    subjects: 'ครูประจำวิชาคณิตศาสตร์',
    is_active: true,
    display_order: 9,
  },
];
