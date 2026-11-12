# คู่มือการติดตั้งและ Deploy ระบบส่งสื่อการจัดการเรียนรู้
**โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)**

---

## ส่วนที่ 1: การตั้งค่า Supabase (Database, Auth และ Storage)

1. สมัครใช้งานหรือเข้าสู่ระบบที่ [Supabase](https://supabase.com) (ฟรี Free Tier)
2. กด **New Project**
   - ตั้งชื่อโปรเจกต์ เช่น `pongrad-learning-media`
   - ตั้งรหัสผ่าน Database Password
   - เลือก Region ใกล้ประเทศไทย เช่น **Singapore (Southeast Asia)**
3. **การรัน SQL เพื่อสร้างตารางและข้อมูลครู:**
   - ในแถบเมนูด้านซ้าย เลือก **SQL Editor**
   - กด **New query**
   - เปิดไฟล์ `supabase/schema.sql` ในโปรเจกต์นี้ คัดลอกโค้ดทั้งหมดแล้วนำไปวางในช่อง SQL Query
   - กดปุ่ม **Run**
   - ระบบจะสร้างตาราง `teachers`, `academic_years`, `submission_months`, `profiles`, `submissions`, `submission_images` พร้อมทั้งนโยบายความปลอดภัย RLS, Storage Bucket `submission-images` และบันทึกรายชื่อครูทั้ง 9 ท่านให้อัตโนมัติทันที
4. **คัดลอกค่าเชื่อมต่อ API Keys:**
   - ไปที่เมนู **Project Settings** (รูปเฟือง) -> **API**
   - คัดลอกค่า 2 ค่า:
     - **Project URL** (เช่น `https://xyzcompany.supabase.co`)
     - **anon / public key** (รหัสยาวๆ)

---

## ส่วนที่ 2: การทดสอบในเครื่องคอมพิวเตอร์ (Local Testing)

1. สร้างไฟล์ `.env.local` ในโฟลเดอร์โปรเจกต์
```env
NEXT_PUBLIC_SUPABASE_URL=ใส่ Project URL ที่ได้จาก Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=ใส่ anon public key ที่ได้จาก Supabase
```
2. รันคำสั่งเปิดระบบ:
```bash
npm run dev
```
3. เข้าใช้งานผ่านบราวเซอร์ที่: `http://localhost:3000`

---

## ส่วนที่ 3: การ Deploy ขึ้นใช้งานจริงบน Vercel (ฟรี)

1. นำโค้ดขึ้น **GitHub** ของท่าน:
```bash
git init
git add .
git commit -m "feat: ระบบส่งสื่อการจัดการเรียนรู้ รร.วัดโป่งแรด"
git branch -M main
git remote add origin <URL ของ GitHub Repository ของท่าน>
git push -u origin main
```
2. ไปที่ [Vercel](https://vercel.com) แล้วเข้าสู่ระบบด้วย GitHub
3. กด **Add New...** -> **Project**
4. เลือก Repository ของท่าน แล้วกด **Import**
5. ในส่วน **Environment Variables** ให้เพิ่ม 2 ค่า:
   - `NEXT_PUBLIC_SUPABASE_URL` : (URL ของ Supabase)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` : (anon key ของ Supabase)
6. กดปุ่ม **Deploy**
7. รอประมาณ 1-2 นาที เมื่อสำเร็จ Vercel จะให้โดเมน URL เว็บไซต์พร้อมใช้งานจริงทันที (เช่น `https://pongrad-media.vercel.app`)

---

## ส่วนที่ 4: การเข้าใช้งานครั้งแรก (First Admin Setup)

1. เปิดเว็บไซต์ที่ได้
2. ไปที่หน้า **เข้าสู่ระบบ** -> เลือกแท็บ **ลงทะเบียนผู้ใช้ใหม่**
3. สำหรับผู้อำนวยการ/ผู้ดูแลระบบ:
   - เลือกประเภทผู้ใช้งาน: **ผู้ดูแลระบบ (ผอ.)**
   - กรอกชื่อ-นามสกุล, อีเมล และรหัสผ่าน
   - กดลงทะเบียน จะได้รับสิทธิ์ Admin ในการดูรายงานทั้งหมดและจัดการรายชื่อครู
4. สำหรับครูผู้สอน:
   - เลือกประเภทผู้ใช้งาน: **ครูผู้สอน**
   - เลือกชื่อครูในระบบที่ตรงกับตนเอง (จากรายชื่อ 9 ท่าน)
   - กรอกอีเมลและรหัสผ่าน
   - เมื่อล็อกอินแล้ว ข้อมูลจะผูกกับครูท่านนั้นทันที สามารถเริ่มส่งผลงานและภาพถ่ายได้ทันที
