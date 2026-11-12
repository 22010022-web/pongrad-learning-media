import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateThai(dateString: string | Date): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";
  
  const thaiMonths = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];
  
  const day = date.getDate();
  const month = thaiMonths[date.getMonth()];
  const yearBE = date.getFullYear() + 543;
  const time = date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  
  return `${day} ${month} ${yearBE} เวลา ${time} น.`;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
