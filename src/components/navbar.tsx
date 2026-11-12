"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  fetchSchoolSettings,
  DEFAULT_SCHOOL_SETTINGS,
  SchoolSettings,
} from "@/lib/school-settings";
import {
  BookOpen,
  UploadCloud,
  LayoutGrid,
  History,
  BarChart3,
  Users,
  Settings,
  LogOut,
  LogIn,
  Menu,
  X,
  ShieldCheck,
  GraduationCap,
  Eye,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, teacher, isAdmin, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SCHOOL_SETTINGS);

  useEffect(() => {
    fetchSchoolSettings().then(setSettings);
    const handler = (e: Event) => {
      const custom = e as CustomEvent<SchoolSettings>;
      if (custom.detail) setSettings(custom.detail);
    };
    window.addEventListener("school-settings-updated", handler);
    return () => window.removeEventListener("school-settings-updated", handler);
  }, []);

  const isDirectorAccount =
    user?.email?.toLowerCase() === "22010022@chan1.go.th";

  const isKruAekAdmin =
    isAdmin &&
    !isDirectorAccount &&
    (user?.user_metadata?.admin_type === "kru_aek" ||
      profile?.full_name?.includes("ครูเอก"));

  const displayName = isDirectorAccount
    ? profile?.full_name && !profile.full_name.includes("ครูเอก")
      ? profile.full_name
      : "นางสาวอำพร คงเจริญ"
    : isKruAekAdmin
    ? "ครูเอก (System Admin)"
    : teacher?.name || profile?.full_name || user?.email;

  const navLinks = [
    { href: "/", label: "หน้าหลัก", icon: BookOpen, role: "all" },
    { href: "/submit", label: "ส่งสื่อการสอน", icon: UploadCloud, role: "auth" },
    { href: "/gallery", label: "คลังสื่อทั้งหมด", icon: LayoutGrid, role: "all" },
    { href: "/my-submissions", label: "ประวัติการส่งสื่อ", icon: History, role: "auth" },
    { href: "/reports", label: "รายงาน", icon: BarChart3, role: "admin" },
    { href: "/teachers", label: "จัดการครู", icon: Users, role: "admin" },
    { href: "/settings", label: "ตั้งค่าระบบ", icon: Settings, role: "admin" },
  ];

  const filteredLinks = navLinks.filter((link) => {
    if (link.role === "all") return true;
    if (link.role === "auth") return !!user;
    if (link.role === "admin") return isAdmin;
    return true;
  });

  return (
    <header className="sticky top-0 z-50 bg-navy-900 border-b border-navy-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & School Name */}
          <Link href="/" className="flex items-center space-x-2.5 sm:space-x-3 group min-w-0">
            {settings.logoUrl ? (
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-white p-1 flex items-center justify-center shadow-lg border border-blue-400/30 group-hover:scale-105 transition-transform shrink-0 overflow-hidden">
                <img
                  src={settings.logoUrl}
                  alt="School Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-navy-700 flex items-center justify-center shadow-lg border border-blue-400/30 group-hover:scale-105 transition-transform shrink-0">
                <GraduationCap className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <div className="font-bold text-sm sm:text-lg text-white tracking-wide group-hover:text-blue-300 transition-colors truncate">
                ระบบส่งสื่อการจัดการเรียนรู้
              </div>
              <div className="text-[11px] sm:text-xs text-navy-300 flex items-center gap-1.5 truncate">
                <span className="truncate">{settings.schoolName}</span>
                <span className="hidden md:inline-block w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                <span className="hidden md:inline-block text-[11px] text-blue-300 shrink-0">
                  {settings.schoolArea}
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {filteredLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs xl:text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-navy-100 hover:bg-navy-800 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Auth Action */}
          <div className="hidden lg:flex items-center space-x-3 shrink-0">
            {user ? (
              <div className="flex items-center space-x-2.5 bg-navy-800/90 px-3 py-1.5 rounded-xl border border-navy-700">
                <div className="text-right">
                  <div className="text-xs font-semibold text-white flex items-center justify-end gap-1">
                    {isAdmin && <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />}
                    <span className="max-w-[160px] truncate">{displayName}</span>
                  </div>
                  <div className="text-[10px] text-blue-300">
                    {isKruAekAdmin
                      ? "ผู้ดูแลระบบหลังบ้าน (ไม่เปิดเผยตัวตน)"
                      : isAdmin
                      ? "ผู้อำนวยการ (ผู้ดูแลระบบ)"
                      : teacher?.grade_level || "ครูผู้สอน"}
                  </div>
                </div>
                <button
                  onClick={() => signOut()}
                  title="ออกจากระบบ"
                  className="p-2 rounded-lg bg-navy-700 hover:bg-red-600/80 text-navy-200 hover:text-white transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-navy-800 border border-navy-700 text-[11px] text-navy-200">
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                  <span>โหมดดูอย่างเดียว</span>
                </span>
                <Link
                  href="/login"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium text-sm shadow-md transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  <span>เข้าสู่ระบบ</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-navy-200 hover:text-white hover:bg-navy-800 focus:outline-none"
              aria-label="เปิดเมนู"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-navy-900 border-t border-navy-800 px-4 pt-3 pb-5 space-y-2">
          {filteredLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-navy-100 hover:bg-navy-800"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <div className="pt-3 mt-3 border-t border-navy-800">
            {user ? (
              <div className="flex items-center justify-between px-3 py-2 bg-navy-800 rounded-xl">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {displayName}
                  </div>
                  <div className="text-xs text-blue-300">
                    {isKruAekAdmin
                      ? "ผู้ดูแลระบบหลังบ้าน (ไม่เปิดเผยตัวตน)"
                      : isAdmin
                      ? "ผู้อำนวยการ (ผู้ดูแลระบบ)"
                      : teacher?.grade_level || "ครูผู้สอน"}
                  </div>
                </div>
                <button
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 text-red-300 text-xs font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>ออกจากระบบ</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm"
              >
                <LogIn className="w-4 h-4" />
                <span>เข้าสู่ระบบ (สำหรับครูและผู้บริหาร)</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
