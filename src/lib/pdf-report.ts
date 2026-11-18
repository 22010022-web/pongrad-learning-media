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

  // In Landscape (A4: 297mm x 210mm), we place Left Column (Details) and Right Column (Photos)
  // Right Column width is ~140mm.
  // We arrange photos nicely into 1, 2, or 3 columns to maximize visibility and fit 1 landscape page:
  let photoGridCols = 2;
  let photoHeightPx = 135;

  if (imgCount === 1) {
    photoGridCols = 1;
    photoHeightPx = 320;
  } else if (imgCount === 2) {
    photoGridCols = 1;
    photoHeightPx = 160;
  } else if (imgCount <= 4) {
    photoGridCols = 2;
    photoHeightPx = 150;
  } else if (imgCount <= 6) {
    photoGridCols = 3;
    photoHeightPx = 145;
  } else if (imgCount <= 8) {
    photoGridCols = 4;
    photoHeightPx = 135;
  } else {
    // 9 - 10 images: 5 columns x 2 rows
    photoGridCols = 5;
    photoHeightPx = 135;
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
    ? `<img src="${settings.logoUrl}" alt="School Logo" style="width: 48px; height: 48px; object-fit: contain; border-radius: 6px;" crossorigin="anonymous" />`
    : `<div style="width: 44px; height: 44px; border-radius: 8px; background: #102a43; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px;">ปร</div>`;

  const directorName =
    settings.directorName?.trim() || DEFAULT_SCHOOL_SETTINGS.directorName;
  const directorPosition =
    settings.directorPosition?.trim() ||
    "ผู้อำนวยการโรงเรียนวัดโป่งแรด(ปคุณวิทยาคาร)";

  const printWindow = window.open("", "_blank", "width=1200,height=850");
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
      size: A4 landscape;
      margin: 6mm 10mm;
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
      font-size: 11.5px;
      line-height: 1.35;
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
    .a4-landscape-page {
      width: 297mm;
      min-height: 210mm;
      max-height: 210mm;
      margin: 14px auto;
      background: white;
      padding: 7mm 10mm;
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }
    @media print {
      body {
        background: white;
      }
      .toolbar {
        display: none !important;
      }
      .a4-landscape-page {
        width: 100%;
        height: 100%;
        min-height: auto;
        max-height: none;
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
      padding-bottom: 6px;
      margin-bottom: 7px;
    }
    .header-text h1 {
      font-size: 15px;
      font-weight: 700;
      color: #102a43;
      line-height: 1.2;
    }
    .header-text p {
      font-size: 11px;
      color: #334e68;
      font-weight: 500;
    }
    .content-layout {
      display: grid;
      grid-template-columns: 1.05fr 1.15fr;
      gap: 10px;
      align-items: stretch;
      flex: 1;
    }
    .left-col {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2px;
    }
    .meta-table td {
      border: 1px solid #cbd5e1;
      padding: 3.5px 7px;
      font-size: 11px;
    }
    .meta-label {
      background: #f1f5f9;
      font-weight: 700;
      color: #102a43;
      width: 22%;
      white-space: nowrap;
    }
    .meta-val {
      color: #0f172a;
    }
    .section-box {
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .section-title {
      background: #102a43;
      color: white;
      font-weight: 700;
      font-size: 11px;
      padding: 3px 8px;
    }
    .section-body {
      padding: 5px 8px;
      font-size: 11px;
      color: #1e293b;
      line-height: 1.35;
      flex: 1;
    }
    .right-col {
      display: flex;
      flex-direction: column;
    }
    .photos-box {
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .photos-grid {
      display: grid;
      grid-template-columns: repeat(${photoGridCols}, 1fr);
      gap: 5px;
      padding: 6px;
      flex: 1;
      align-content: stretch;
    }
    .photo-item {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      overflow: hidden;
      background: #f8fafc;
      height: ${photoHeightPx}px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .photo-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .bottom-section {
      margin-top: 6px;
      padding-top: 4px;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      font-size: 11px;
    }
    .sig-block {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .sig-space {
      height: 12px;
    }
    .sig-grid {
      display: inline-grid;
      grid-template-columns: auto 170px auto;
      column-gap: 4px;
      row-gap: 2px;
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
      font-size: 10.5px;
    }
    .footer-note {
      margin-top: 6px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 4px;
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
      <strong>📄 ตัวอย่างรายงานขนาด A4 แนวนอน (PDF)</strong> — ${escapeHtml(submission.title)}
    </div>
    <div>
      <button class="toolbar-btn" onclick="window.print()">🖨️ พิมพ์ / บันทึกเป็น PDF (A4 แนวนอน)</button>
      <button class="toolbar-btn-close" onclick="window.close()">ปิดหน้าต่าง</button>
    </div>
  </div>

  <div class="a4-landscape-page">
    <div>
      <!-- Header -->
      <div class="header">
        ${logoHtml}
        <div class="header-text">
          <h1>แบบรายงานการผลิตและการใช้สื่อการจัดการเรียนรู้</h1>
          <p>${escapeHtml(settings.schoolName)} • ${escapeHtml(settings.schoolArea)}</p>
          <p>ประจำภาคเรียนที่ ${semesterNo} ปีการศึกษา ${escapeHtml(yearBe)} (ประจำเดือน${escapeHtml(monthName)})</p>
        </div>
      </div>

      <!-- 2 Columns Layout: Details (Left) + Photos (Right) -->
      <div class="content-layout">
        <!-- Left: Metadata & 3 Sections -->
        <div class="left-col">
          <table class="meta-table">
            <tr>
              <td class="meta-label">ชื่อสื่อการเรียนรู้</td>
              <td class="meta-val" colspan="3" style="font-weight: 700; color: #1e40af;">${escapeHtml(submission.title)}</td>
            </tr>
            <tr>
              <td class="meta-label">ครูผู้จัดทำ</td>
              <td class="meta-val" style="width: 32%;">${escapeHtml(teacherName)}</td>
              <td class="meta-label" style="width: 22%;">ระดับชั้นที่ใช้</td>
              <td class="meta-val">${escapeHtml(submission.target_grade)}</td>
            </tr>
            <tr>
              <td class="meta-label">กลุ่มสาระ / วิชา</td>
              <td class="meta-val">${escapeHtml(submission.subject_group)}</td>
              <td class="meta-label">ประเภทสื่อ</td>
              <td class="meta-val">${escapeHtml(mediaTypeDisplay)}</td>
            </tr>
            <tr>
              <td class="meta-label">เดือน / ปีการศึกษา</td>
              <td class="meta-val">เดือน${escapeHtml(monthName)} (${semesterNo}/${escapeHtml(yearBe)})</td>
              <td class="meta-label">วันที่บันทึก</td>
              <td class="meta-val">${escapeHtml(formatDateThai(submission.created_at))}</td>
            </tr>
          </table>

          <div class="section-box" style="flex: 1;">
            <div class="section-title">1. วัตถุประสงค์ของการใช้สื่อการจัดการเรียนรู้</div>
            <div class="section-body">${escapeHtml(submission.objective)}</div>
          </div>

          <div class="section-box" style="flex: 1.1;">
            <div class="section-title">2. รายละเอียด / วิธีการใช้สื่อในการจัดการเรียนการสอน</div>
            <div class="section-body">${escapeHtml(submission.usage_description)}</div>
          </div>

          <div class="section-box" style="flex: 1;">
            <div class="section-title">3. ผลที่เกิดขึ้นกับผู้เรียนหลังการใช้สื่อ</div>
            <div class="section-body">${escapeHtml(submission.student_outcome)}</div>
          </div>
        </div>

        <!-- Right: Photos Box -->
        <div class="right-col">
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
      </div>
    </div>

    <!-- Bottom: Signatures & Footer Note -->
    <div class="bottom-section">
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
