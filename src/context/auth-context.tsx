"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { Profile, Teacher, UserRole } from "@/types/database";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  teacher: Teacher | null;
  isLoading: boolean;
  isAdmin: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    teacherId?: string
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
  const isConfigured = isSupabaseConfigured();

  const fetchProfile = useCallback(async (userId: string) => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*, teacher:teachers(*)")
        .eq("id", userId)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Error fetching profile:", profileError);
      }

      if (profileData) {
        setProfile(profileData as Profile);
        if (profileData.teacher) {
          setTeacher(profileData.teacher as Teacher);
        } else if (profileData.teacher_id) {
          // Fallback fetch teacher if join failed
          const { data: teacherData } = await supabase
            .from("teachers")
            .select("*")
            .eq("id", profileData.teacher_id)
            .single();
          if (teacherData) setTeacher(teacherData as Teacher);
        }
      }
    } catch (err) {
      console.error("Exception fetching profile:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        setTeacher(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured, fetchProfile]);

  const signIn = async (email: string, password: string) => {
    if (!isConfigured) {
      return { error: new Error("ยังไม่ได้กำหนดค่า Supabase API Key ใน .env.local") };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    teacherId?: string
  ) => {
    if (!isConfigured) {
      return { error: new Error("ยังไม่ได้กำหนดค่า Supabase API Key ใน .env.local") };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          teacher_id: teacherId || null,
        },
      },
    });

    if (error) return { error };

    if (data.user) {
      // Direct upsert to profiles table in case trigger has delay
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email: data.user.email,
        full_name: fullName,
        role,
        teacher_id: teacherId || null,
      });
      await fetchProfile(data.user.id);
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
      await fetchProfile(user.id);
    }
  };

  const isAdmin = profile?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        teacher,
        isLoading,
        isAdmin,
        isConfigured,
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
