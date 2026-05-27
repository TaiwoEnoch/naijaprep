"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store/useAppStore";
import Skeleton from "@/components/ui/Skeleton";

interface RoleGuardProps {
  children: React.ReactNode;
}

export default function RoleGuard({ children }: RoleGuardProps) {
  const router = useRouter();
  const { user, setUser } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const verifyAccess = async () => {
      // If Zustand user is default or null, fetch actual profile to check session
      if (!user || user.id === "usr_default") {
        try {
          const res = await fetch("/api/user/profile");
          if (!res.ok) {
            // Unauthenticated or profile query failed: redirect
            router.push("/auth/signup");
            return;
          }
          
          const data = await res.json();
          const profile = data?.data?.profile || data?.profile;

          if (profile) {
            // Update Zustand
            setUser({
              id: profile.id,
              name: `${profile.first_name} ${profile.last_name || ""}`.trim(),
              email: profile.phone + "@naijaprep.com",
              role: profile.role,
              examType: profile.exam_types?.[0] || "JAMB",
              streak: profile.streak_count || 0,
              isPremium: profile.plan === "student" || profile.plan === "school"
            });

            if (profile.role === "teacher" || profile.role === "admin") {
              setAuthorized(true);
            } else {
              router.push("/dashboard");
            }
          } else {
            router.push("/auth/signup");
          }
        } catch (err) {
          router.push("/auth/signup");
        } finally {
          setLoading(false);
        }
      } else {
        // Zustand has active user. Check role.
        if (user.role === "teacher" || user.role === "admin") {
          setAuthorized(true);
        } else {
          router.push("/dashboard");
        }
        setLoading(false);
      }
    };

    verifyAccess();
  }, [user, setUser, router]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-8 space-y-6 px-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!authorized) {
    return null; // or small empty state while redirecting
  }

  return <>{children}</>;
}
