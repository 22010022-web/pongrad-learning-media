"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  BookOpen,
  UploadCloud,
  LayoutGrid,
  History,
  BarChart3,
  Users,
  LogOut,
  LogIn,
  Menu,
  X,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, teacher, isAdmin, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "หน้าหลัก", icon: BookOpen, role: "all" },
    { href: "/submit", label: "ส่งสื่อการจัดการเรียนรู้", icon: UploadCloud, role: "all" },
    { href: "/gallery", label: "ผลงานสื่อทั้งหมด", icon: LayoutGrid, role: "all" },
    { href: "/my-submissions", label: "ประวัติการส่งสื่อ", icon: History, role: "auth" },
    { href: "/reports", label: "รายงานการส่งสื่อ", icon: BarChart3, role: "admin" },
    { href: "/teachers", label: "จัดการรายชื่อครู", icon: Users, role: "admin" },
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
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-navy-700 flex items-center justify-center shadow-lg border border-blue-400/30 group-hover:scale-105 transition-transform shrink-0">
              <GraduationCap className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm sm:text-lg text-white tracking-wide group-hover:text-blue-300 transition-colors truncate">
                ระบบส่งสื่อการจัดการเรียนรู้
              </div>
              <div className="text-[11px] sm:text-xs text-navy-300 flex items-center gap-1.5 truncate">
                <span className="truncate">โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)</span>
                <span className="hidden md:inline-block w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                <span className="hidden md:inline-block text-[11px] text-blue-300 shrink-0">สพป.จันทบุรี เขต 1</span>
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
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-navy-100 hover:bg-navy-800 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Section (Desktop) */}
          <div className="hidden lg:flex items-center space-x-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-semibold text-white flex items-center justify-end gap-1.5">
                    {isAdmin && <ShieldCheck className="w-4 h-4 text-amber-400" />}
                    <span>{profile?.full_name || teacher?.name || user.email}</span>
                  </div>
                  <div className="text-xs text-navy-300">
                    {isAdmin ? (
                      <span className="text-amber-300 font-medium">ผู้ดูแลระบบ (ผอ.)</span>
                    ) : (
                      <span>{teacher?.grade_level || "ครูผู้สอน"}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => signOut()}
                  title="ออกจากระบบ"
                  className="p-2 text-navy-300 hover:text-red-300 hover:bg-navy-800 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>เข้าสู่ระบบ</span>
              </Link>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="lg:hidden flex items-center gap-2 shrink-0 ml-2">
            {user ? (
              <button
                onClick={() => signOut()}
                title="ออกจากระบบ"
                className="p-2 text-navy-300 hover:text-red-300 rounded-lg"
              >
                <LogOut className="w-5 h-5" />
              </button>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md whitespace-nowrap"
              >
                เข้าสู่ระบบ
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-navy-200 hover:text-white hover:bg-navy-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-navy-800 bg-navy-950 px-4 pt-3 pb-5 space-y-1">
          {user && (
            <div className="px-3 py-2 mb-2 bg-navy-900 rounded-lg border border-navy-800">
              <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                {isAdmin && <ShieldCheck className="w-4 h-4 text-amber-400" />}
                <span>{profile?.full_name || teacher?.name || user.email}</span>
              </div>
              <div className="text-xs text-navy-300">
                {isAdmin ? "ผู้ดูแลระบบ (ผู้อำนวยการ)" : teacher?.grade_level || "ครูผู้สอน"}
              </div>
            </div>
          )}

          {filteredLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-navy-200 hover:bg-navy-900 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
