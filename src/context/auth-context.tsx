"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured, isValidUuid } from "@/lib/supabase/client";
import { Profile, Teacher, UserRole, TEACHERS_PRESET } from "@/types/database";

function translateAuthError(message: string): string {
  const msg = (message || "").toLowerCase();
  if (msg.includes("email not confirmed")) {
    return "บัญชีนี้ยังไม่ได้รับการยืนยันอีเมล — กรุณากดปุ่ม 'คัดลอกโค้ด SQL' ด้านบนไป Run ใน Supabase SQL Editor เพื่อปลดล็อกยืนยันอีเมลอัตโนมัติทันที";
  }
  if (msg.includes("invalid login credentials")) {
    return "อีเมลหรือรหัสผ่านไม่ถูกต้อง (หากยังไม่เคยสมัคร กรุณาเลือกแท็บ 'ลงทะเบียนผู้ใช้ใหม่')";
  }
  if (msg.includes("user already registered") || msg.includes("already been registered")) {
    return "อีเมลนี้ได้ลงทะเบียนไว้แล้ว และรหัสผ่านที่กรอกไม่ตรงกับที่เคยตั้งไว้ กรุณาเข้าสู่ระบบด้วยรหัสผ่านเดิม";
  }
  if (msg.includes("rate limit") || msg.includes("over_email_send_rate_limit") || msg.includes("error sending confirmation email")) {
    return "ระบบส่งอีเมลยืนยันของ Supabase เกินโควต้าชั่วคราว — กรุณานำโค้ด SQL ด้านบนไป Run ใน Supabase SQL Editor และปิด Confirm Email ในเมนู Authentication -> Providers -> Email";
  }
  if (msg.includes("database error saving new user")) {
    return "ฐานข้อมูล Supabase ที่เชื่อมต่ออยู่ยังไม่ได้รันสคริปต์ SQL ล่าสุด กรุณากดปุ่ม 'คัดลอกโค้ด SQL' ด้านบนไป Run ใน Supabase SQL Editor";
  }
  if (msg.includes("password should be at least")) {
    return "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร";
  }
  return message || "เกิดข้อผิดพลาดในการดำเนินการ";
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  teacher: Teacher | null;
  isLoading: boolean;
  isAdmin: boolean;
  isConfigured: boolean;
  isSchemaReady: boolean;
  checkSchema: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    teacherId?: string,
    teacherName?: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSchemaReady, setIsSchemaReady] = useState<boolean>(true);
  const isConfigured = isSupabaseConfigured();

  const checkSchema = useCallback(async () => {
    if (!isConfigured) {
      setIsSchemaReady(false);
      return;
    }
    try {
      const { error } = await supabase.from("teachers").select("id").limit(1);
      if (error && (error.code === "42P01" || error.code === "PGRST205" || error.message?.includes("does not exist") || error.message?.includes("schema cache"))) {
        setIsSchemaReady(false);
      } else {
        setIsSchemaReady(true);
      }
    } catch {
      // Ignore network hiccups
    }
  }, [isConfigured]);

  const buildFallbackFromMetadata = useCallback((currentUser: User) => {
    const meta = currentUser.user_metadata || {};
    const role: UserRole = meta.role === "admin" ? "admin" : "teacher";
    const fullName: string = meta.full_name || currentUser.email || "ผู้ใช้งาน";
    const rawTeacherId: string | null = meta.teacher_id || null;
    const teacherName: string | null = meta.teacher_name || null;

    const matchedPreset = TEACHERS_PRESET.find(
      (t) => t.id === rawTeacherId || t.name === teacherName || t.name === fullName
    );

    const resolvedTeacher: Teacher | null = matchedPreset
      ? { ...matchedPreset, created_at: new Date().toISOString() }
      : null;

    const resolvedProfile: Profile = {
      id: currentUser.id,
      email: currentUser.email || null,
      full_name: fullName,
      role,
      teacher_id: resolvedTeacher?.id || (isValidUuid(rawTeacherId) ? rawTeacherId : null),
      created_at: currentUser.created_at || new Date().toISOString(),
      teacher: resolvedTeacher || undefined,
    };

    return { resolvedProfile, resolvedTeacher };
  }, []);

  const fetchProfile = useCallback(
    async (userId: string, currentUser?: User | null) => {
      if (!isConfigured) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*, teacher:teachers(*)")
          .eq("id", userId)
          .maybeSingle();

        if (profileData) {
          const isDirectorEmail =
            profileData.email?.toLowerCase() === "22010022@chan1.go.th" ||
            currentUser?.email?.toLowerCase() === "22010022@chan1.go.th";

          const isKruAekEmail =
            profileData.email?.toLowerCase() === "wadpongradschool@gmail.com" ||
            currentUser?.email?.toLowerCase() === "wadpongradschool@gmail.com";

          if (
            isDirectorEmail &&
            (profileData.role !== "admin" ||
              !profileData.full_name ||
              profileData.full_name.includes("ครูเอก"))
          ) {
            const fixedProfile: Profile = {
              ...(profileData as Profile),
              full_name: "นางสาวอำพร คงเจริญ",
              role: "admin",
              teacher_id: null,
            };
            setProfile(fixedProfile);
            await supabase
              .from("profiles")
              .update({
                full_name: "นางสาวอำพร คงเจริญ",
                role: "admin",
                teacher_id: null,
              })
              .eq("id", userId);
            await supabase.auth.updateUser({
              data: {
                full_name: "นางสาวอำพร คงเจริญ",
                role: "admin",
                admin_type: "director",
              },
            });
          } else if (isKruAekEmail && (profileData.role !== "admin" || profileData.teacher_id !== null)) {
            // Restore Kru Aek stealth backend admin automatically
            const fixedProfile: Profile = {
              ...(profileData as Profile),
              full_name: "ครูเอก (System Admin)",
              role: "admin",
              teacher_id: null,
            };
            setProfile(fixedProfile);
            setTeacher(null);
            await supabase
              .from("profiles")
              .update({
                full_name: "ครูเอก (System Admin)",
                role: "admin",
                teacher_id: null,
              })
              .eq("id", userId);
            await supabase.auth.updateUser({
              data: {
                full_name: "ครูเอก (System Admin)",
                role: "admin",
                admin_type: "kru_aek",
                teacher_id: null,
                teacher_name: null,
              },
            });
          } else {
            setProfile(profileData as Profile);
          }

          if (profileData.teacher && !isDirectorEmail && !isKruAekEmail) {
            setTeacher(profileData.teacher as Teacher);
          } else if (profileData.teacher_id && !isDirectorEmail && !isKruAekEmail) {
            const { data: teacherData } = await supabase
              .from("teachers")
              .select("*")
              .eq("id", profileData.teacher_id)
              .maybeSingle();
            if (teacherData) setTeacher(teacherData as Teacher);
          } else if (isDirectorEmail || isKruAekEmail) {
            setTeacher(null);
          }
          setIsLoading(false);
          return;
        }

        // If profile row doesn't exist yet in DB (or table missing), construct from user_metadata
        const activeUser = currentUser || (await supabase.auth.getUser()).data.user;
        if (activeUser) {
          const { resolvedProfile, resolvedTeacher } = buildFallbackFromMetadata(activeUser);
          setProfile(resolvedProfile);
          setTeacher(resolvedTeacher);

          // If profiles table exists, try to self-heal by inserting the missing profile row
          if (!profileError || profileError.code === "PGRST116") {
            let validTeacherUuid: string | null = null;
            if (resolvedTeacher) {
              const { data: dbTeacher } = await supabase
                .from("teachers")
                .select("id, name, category, grade_level, subjects, is_active, display_order, created_at")
                .eq("name", resolvedTeacher.name)
                .maybeSingle();
              if (dbTeacher) {
                validTeacherUuid = dbTeacher.id;
                setTeacher(dbTeacher as Teacher);
              }
            }
            await supabase.from("profiles").upsert({
              id: activeUser.id,
              email: activeUser.email,
              full_name: resolvedProfile.full_name,
              role: resolvedProfile.role,
              teacher_id: validTeacherUuid,
            });
          }
        }
      } catch (err) {
        console.error("Exception fetching profile:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [isConfigured, buildFallbackFromMetadata]
  );

  useEffect(() => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    checkSchema();

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id, currentUser);
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.id, currentUser);
      } else {
        setProfile(null);
        setTeacher(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured, checkSchema, fetchProfile]);

  const signIn = async (email: string, password: string) => {
    if (!isConfigured) {
      return { error: new Error("ยังไม่ได้กำหนดค่า Supabase API Key ในระบบ") };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      return { error: new Error(translateAuthError(error.message)) };
    }
    if (data.user) {
      await fetchProfile(data.user.id, data.user);
    }
    return { error: null };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    teacherId?: string,
    teacherName?: string
  ) => {
    if (!isConfigured) {
      return { error: new Error("ยังไม่ได้กำหนดค่า Supabase API Key ในระบบ") };
    }

    const cleanEmail = email.trim();
    const cleanFullName = fullName.trim();

    // Resolve teacher UUID and Name safely
    const matchedPreset = TEACHERS_PRESET.find(
      (t) => t.id === teacherId || t.name === teacherName || t.name === cleanFullName
    );
    const resolvedTeacherName =
      role === "teacher" ? teacherName || matchedPreset?.name || cleanFullName : null;
    const safeTeacherUuid =
      role === "teacher" && isValidUuid(teacherId)
        ? teacherId!
        : role === "teacher" && matchedPreset
        ? matchedPreset.id
        : null;

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanFullName,
          role,
          teacher_id: safeTeacherUuid,
          teacher_name: resolvedTeacherName,
        },
      },
    });

    // Case 1: User already registered earlier -> try signing in with the given email & password!
    if (error) {
      const lowerMsg = error.message.toLowerCase();
      if (lowerMsg.includes("already registered") || lowerMsg.includes("already been registered")) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (!signInErr && signInData.user) {
          // Update metadata & profile to match what they just selected
          await supabase.auth.updateUser({
            data: {
              full_name: cleanFullName,
              role,
              teacher_id: safeTeacherUuid,
              teacher_name: resolvedTeacherName,
            },
          });

          let dbTeacherUuid: string | null = safeTeacherUuid;
          if (role === "teacher" && resolvedTeacherName) {
            const { data: dbT } = await supabase
              .from("teachers")
              .select("id")
              .eq("name", resolvedTeacherName)
              .maybeSingle();
            if (dbT?.id) dbTeacherUuid = dbT.id;
          }

          await supabase.from("profiles").upsert({
            id: signInData.user.id,
            email: signInData.user.email,
            full_name: cleanFullName,
            role,
            teacher_id: role === "teacher" ? dbTeacherUuid : null,
          });

          await fetchProfile(signInData.user.id, signInData.user);
          return { error: null };
        }
        return { error: new Error(translateAuthError(signInErr?.message || error.message)) };
      }

      return { error: new Error(translateAuthError(error.message)) };
    }

    // Case 2: SignUp succeeded, check if session was returned or if we should auto sign-in
    let activeUser = data.user;
    let hasSession = Boolean(data.session);

    if (activeUser && !hasSession) {
      // Try immediate signInWithPassword (works when auto_confirm_user SQL trigger is active!)
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (!signInErr && signInData.session) {
        activeUser = signInData.user;
        hasSession = true;
      } else if (signInErr) {
        return { error: new Error(translateAuthError(signInErr.message)) };
      }
    }

    if (activeUser && hasSession) {
      let dbTeacherUuid: string | null = safeTeacherUuid;
      if (role === "teacher" && resolvedTeacherName) {
        const { data: dbT } = await supabase
          .from("teachers")
          .select("id")
          .eq("name", resolvedTeacherName)
          .maybeSingle();
        if (dbT?.id) dbTeacherUuid = dbT.id;
      }

      await supabase.from("profiles").upsert({
        id: activeUser.id,
        email: activeUser.email,
        full_name: cleanFullName,
        role,
        teacher_id: role === "teacher" ? dbTeacherUuid : null,
      });

      await fetchProfile(activeUser.id, activeUser);
    }

    return { error: null };
  };

  const signOut = async () => {
    if (isConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setTeacher(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user);
    }
  };

  const isAdmin =
    profile?.role === "admin" ||
    user?.email?.toLowerCase() === "22010022@chan1.go.th" ||
    user?.email?.toLowerCase() === "wadpongradschool@gmail.com";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        teacher,
        isLoading,
        isAdmin,
        isConfigured,
        isSchemaReady,
        checkSchema,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
