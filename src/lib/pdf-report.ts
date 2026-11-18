import { Submission } from "@/types/database";
import { SchoolSettings, fetchSchoolSettings, DEFAULT_SCHOOL_SETTINGS } from "@/lib/school-settings";
import { formatDateThai } from "@/lib/utils";

function escapeHtml(str?: string | null): string {
  if (!str) return "-";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br/>");
}

export async function exportSubmissionA4Pdf(
  submission: Submission,
  customSettings?: SchoolSettings
) {
  const settings = customSettings || (await fetchSchoolSettings());

  const images =
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

  const imgCount = images.length;

  // สำหรับ A4 แนวตั้ง: กำหนด Grid และสัดส่วนภาพทุกภาพเป็น "แนวนอน (Landscape 4:3 หรือ 16:10)" สวยงาม คมชัด ไม่โดนบีบเป็นแนวตั้ง
  let gridCols = 2;
  let photoAspectRatio = "4 / 3";
  let maxPhotoWidth = "100%";

  if (imgCount === 1) {
    gridCols = 1;
    photoAspectRatio = "16 / 10";
    maxPhotoWidth = "460px";
  } else if (imgCount === 2) {
    gridCols = 2;
    photoAspectRatio = "16 / 10";
  } else if (imgCount <= 4) {
    gridCols = 2;
    photoAspectRatio = "4 / 3";
  } else if (imgCount <= 6) {
    gridCols = 3;
    photoAspectRatio = "4 / 3";
  } else if (imgCount <= 8) {
    gridCols = 4;
    photoAspectRatio = "4 / 3";
  } else {
    // 9 - 10 รูป: จัด 5 คอลัมน์ x 2 แถว สัดส่วนแนวนอน 4:3 เรียงสมมาตรสวยงามพอดีเต็มหน้า A4 แนวตั้ง 1 หน้าจบ
    gridCols = 5;
    photoAspectRatio = "4 / 3";
  }

  const teacherName = submission.teacher?.name || "ครูผู้สอน";
  const yearBe = submission.academic_year?.year_be || "2569";
  const monthName = submission.submission_month?.month_name || "-";
  const semesterNo = submission.submission_month?.semester || 2;
  const mediaTypeDisplay =
    submission.media_type === "อื่น ๆ" && submission.media_type_other
      ? `อื่น ๆ (${submission.media_type_other})`
      : submission.media_type;

  const logoHtml = settings.logoUrl
    ? `<img src="${settings.logoUrl}" alt="School Logo" style="width: 56px; height: 56px; object-fit: contain; border-radius: 8px;" crossorigin="anonymous" />`
    : `<div style="width: 52px; height: 52px; border-radius: 10px; background: #102a43; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px;">ปร</div>`;

  const directorName =
    settings.directorName?.trim() || DEFAULT_SCHOOL_SETTINGS.directorName;
  const directorPosition =
    settings.directorPosition?.trim() ||
    "ผู้อำนวยการโรงเรียนวัดโป่งแรด(ปคุณวิทยาคาร)";

  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) {
    alert("กรุณาอนุญาตการเปิดหน้าต่าง Pop-up เพื่อพิมพ์หรือบันทึกไฟล์ PDF");
    return;
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <title>รายงานสื่อการจัดการเรียนรู้_${escapeHtml(submission.title)}_${escapeHtml(teacherName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Sarabun', sans-serif;
      color: #0f172a;
      background: #e2e8f0;
      font-size: 12px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #102a43;
      color: white;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }
    .toolbar-btn {
      background: #2563eb;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-family: 'Sarabun', sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .toolbar-btn:hover {
      background: #1d4ed8;
    }
    .toolbar-btn-close {
      background: #334e68;
      color: white;
      border: none;
      padding: 8px 14px;
      border-radius: 8px;
      font-family: 'Sarabun', sans-serif;
      font-size: 13px;
      cursor: pointer;
      margin-left: 8px;
    }
    .a4-page {
      width: 210mm;
      min-height: 296mm;
      margin: 16px auto;
      background: white;
      padding: 10mm 12mm;
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    @media print {
      body {
        background: white;
      }
      .toolbar {
        display: none !important;
      }
      .a4-page {
        width: 100%;
        min-height: auto;
        margin: 0;
        padding: 0;
        box-shadow: none;
      }
    }
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 2px solid #102a43;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .header-text h1 {
      font-size: 15.5px;
      font-weight: 700;
      color: #102a43;
      line-height: 1.25;
    }
    .header-text p {
      font-size: 11.5px;
      color: #334e68;
      font-weight: 500;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    .meta-table td {
      border: 1px solid #cbd5e1;
      padding: 4px 8px;
      font-size: 11.5px;
    }
    .meta-label {
      background: #f1f5f9;
      font-weight: 700;
      color: #102a43;
      width: 18%;
      white-space: nowrap;
    }
    .meta-val {
      width: 32%;
      color: #0f172a;
    }
    .section-box {
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      margin-bottom: 7px;
      overflow: hidden;
    }
    .section-title {
      background: #102a43;
      color: white;
      font-weight: 700;
      font-size: 11.5px;
      padding: 4px 9px;
    }
    .section-body {
      padding: 6px 9px;
      font-size: 11.5px;
      color: #1e293b;
      min-height: 32px;
      line-height: 1.4;
    }
    .photos-box {
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      margin-bottom: 8px;
      overflow: hidden;
    }
    .photos-grid {
      display: grid;
      grid-template-columns: repeat(${gridCols}, 1fr);
      gap: 6px;
      padding: 7px;
    }
    .photo-item {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      overflow: hidden;
      background: #f8fafc;
      width: 100%;
      max-width: ${maxPhotoWidth};
      margin: 0 auto;
      aspect-ratio: ${photoAspectRatio};
      display: flex;
      align-items: center;
      justify-content: center;
    }
    /* แสดงภาพทุกภาพในสัดส่วนแนวนอน (Landscape) คมชัด ไม่โดนบีบเป็นแนวตั้ง */
    .photo-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      image-orientation: from-image;
      display: block;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 10px;
      padding-top: 6px;
      font-size: 11.5px;
    }
    .sig-block {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .sig-space {
      height: 20px;
    }
    .sig-grid {
      display: inline-grid;
      grid-template-columns: auto 175px auto;
      column-gap: 4px;
      row-gap: 3px;
      align-items: baseline;
    }
    .sig-prefix {
      text-align: right;
      white-space: nowrap;
    }
    .sig-dots {
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      letter-spacing: 0.5px;
    }
    .sig-suffix {
      text-align: left;
      white-space: nowrap;
    }
    .sig-center-cell {
      grid-column: 2;
      text-align: center;
      white-space: nowrap;
    }
    .sig-pos {
      color: #334155;
      font-size: 11px;
    }
    .footer-note {
      margin-top: 14px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9.5px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div>
      <strong>📄 ตัวอย่างรายงานขนาด A4 แนวตั้ง (PDF)</strong> — ${escapeHtml(submission.title)}
    </div>
    <div>
      <button class="toolbar-btn" onclick="window.print()">🖨️ พิมพ์ / บันทึกเป็น PDF (A4 แนวตั้ง)</button>
      <button class="toolbar-btn-close" onclick="window.close()">ปิดหน้าต่าง</button>
    </div>
  </div>

  <div class="a4-page">
    <div>
      <div class="header">
        ${logoHtml}
        <div class="header-text">
          <h1>แบบรายงานการผลิตและการใช้สื่อการจัดการเรียนรู้</h1>
          <p>${escapeHtml(settings.schoolName)} • ${escapeHtml(settings.schoolArea)}</p>
          <p>ประจำภาคเรียนที่ ${semesterNo} ปีการศึกษา ${escapeHtml(yearBe)} (ประจำเดือน${escapeHtml(monthName)})</p>
        </div>
      </div>

      <table class="meta-table">
        <tr>
          <td class="meta-label">ชื่อสื่อการเรียนรู้</td>
          <td class="meta-val" colspan="3" style="font-weight: 700; font-size: 12.5px; color: #1e40af;">${escapeHtml(submission.title)}</td>
        </tr>
        <tr>
          <td class="meta-label">ชื่อครูผู้จัดทำ</td>
          <td class="meta-val">${escapeHtml(teacherName)}</td>
          <td class="meta-label">ระดับชั้นที่ใช้สื่อ</td>
          <td class="meta-val">${escapeHtml(submission.target_grade)}</td>
        </tr>
        <tr>
          <td class="meta-label">กลุ่มสาระ / รายวิชา</td>
          <td class="meta-val">${escapeHtml(submission.subject_group)}</td>
          <td class="meta-label">ประเภทของสื่อ</td>
          <td class="meta-val">${escapeHtml(mediaTypeDisplay)}</td>
        </tr>
        <tr>
          <td class="meta-label">เดือน / ปีการศึกษา</td>
          <td class="meta-val">เดือน${escapeHtml(monthName)} (เทอม ${semesterNo}/${escapeHtml(yearBe)})</td>
          <td class="meta-label">วันที่บันทึกข้อมูล</td>
          <td class="meta-val">${escapeHtml(formatDateThai(submission.created_at))}</td>
        </tr>
      </table>

      <div class="section-box">
        <div class="section-title">1. วัตถุประสงค์ของการใช้สื่อการจัดการเรียนรู้</div>
        <div class="section-body">${escapeHtml(submission.objective)}</div>
      </div>

      <div class="section-box">
        <div class="section-title">2. รายละเอียด / วิธีการใช้สื่อในการจัดการเรียนการสอน</div>
        <div class="section-body">${escapeHtml(submission.usage_description)}</div>
      </div>

      <div class="section-box">
        <div class="section-title">3. ผลที่เกิดขึ้นกับผู้เรียนหลังการใช้สื่อ</div>
        <div class="section-body">${escapeHtml(submission.student_outcome)}</div>
      </div>

      <div class="photos-box">
        <div class="section-title">4. ประมวลภาพถ่ายขณะนำสื่อไปใช้ในการจัดการเรียนการสอน (${imgCount} ภาพ)</div>
        <div class="photos-grid">
          ${images
            .slice(0, 10)
            .map(
              (img, idx) => `
            <div class="photo-item">
              <img src="${img.image_url}" alt="ภาพที่ ${idx + 1}" />
            </div>`
            )
            .join("")}
        </div>
      </div>
    </div>

    <div>
      <div class="signatures">
        <div class="sig-block">
          <div class="sig-space"></div>
          <div class="sig-grid">
            <span class="sig-prefix">ลงชื่อ</span>
            <span class="sig-dots">..................................................</span>
            <span class="sig-suffix">ผู้จัดทำ/ผู้รายงาน</span>
            <div class="sig-center-cell">(${escapeHtml(teacherName)})</div>
            <div class="sig-center-cell sig-pos">ตำแหน่ง ครู ${escapeHtml(submission.teacher?.grade_level || "")}</div>
          </div>
        </div>
        <div class="sig-block">
          <div class="sig-space"></div>
          <div class="sig-grid">
            <span class="sig-prefix">ลงชื่อ</span>
            <span class="sig-dots">..................................................</span>
            <span class="sig-suffix">ผู้รับรองข้อมูล</span>
            <div class="sig-center-cell">(${escapeHtml(directorName)})</div>
            <div class="sig-center-cell sig-pos">${escapeHtml(directorPosition)}</div>
          </div>
        </div>
      </div>

      <div class="footer-note">
        <span>ระบบส่งสื่อการจัดการเรียนรู้ โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)</span>
        <span>พัฒนาโดย ครูเอก · © 2026 Crafted with code & coffee by Kru Aek</span>
      </div>
    </div>
  </div>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
