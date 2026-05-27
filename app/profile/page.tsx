"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store/useAppStore";
import AppLayout from "@/components/layout/AppLayout";
import PageTransition from "@/components/ui/PageTransition";
import Skeleton from "@/components/ui/Skeleton";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User as UserIcon, 
  CheckCircle2, 
  Camera, 
  Calendar, 
  Award, 
  MapPin, 
  Flame, 
  BookOpen, 
  LogOut, 
  Save, 
  ShieldAlert,
  Loader2
} from "lucide-react";
import { buttonPressVariants } from "@/lib/animations";

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, setUser } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const supabase = createClient();

  // Local form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [state, setState] = useState("");
  const [examDate, setExamDate] = useState("");
  const [targetScore, setTargetScore] = useState(280);
  const [examTypes, setExamTypes] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Status states
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [totalSessions, setTotalSessions] = useState(0);

  // Fetch profile
  const { data: profileData, isLoading, error } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("Failed to load profile.");
      const json = await res.json();
      return json.data || json;
    },
    refetchOnMount: true,
  });

  // Fetch total completed sessions count directly from supabase
  useEffect(() => {
    if (!profileData?.profile?.id) return;
    const fetchSessionCount = async () => {
      const { count } = await supabase
        .from("exam_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profileData.profile.id)
        .eq("status", "completed");
      setTotalSessions(count || 0);
    };
    fetchSessionCount();
  }, [profileData, supabase]);

  // Sync profile data to local state on load
  useEffect(() => {
    if (profileData?.profile) {
      const p = profileData.profile;
      setFirstName(p.first_name || "");
      setLastName(p.last_name || "");
      setState(p.state || "");
      setExamDate(p.exam_date || "");
      setTargetScore(p.target_score || 280);
      setExamTypes(p.exam_types || []);
      setAvatarUrl(p.avatar_url || null);
    }
  }, [profileData]);

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: any) => {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update profile.");
      return json.data || json;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      // Update global store context
      if (user && data.profile) {
        setUser({
          ...user,
          name: `${data.profile.first_name} ${data.profile.last_name || ""}`.trim(),
          examType: data.profile.exam_types?.[0] as any || user.examType
        });
      }
      setToastMessage("Settings updated successfully!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    },
    onError: (err: any) => {
      alert(err.message || "An error occurred updating your profile.");
    }
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      firstName,
      lastName: lastName || null,
      state: state || null,
      examDate: examDate || null,
      targetScore: Number(targetScore),
      examTypes,
    });
  };

  // Avatar change handler
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profileData?.profile?.id) return;

    setUpdatingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${profileData.profile.id}-${Math.random()}.${fileExt}`;

      // 1. Upload to Supabase bucket
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      let finalUrl = "";
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
        finalUrl = publicUrl;
      } else {
        // Fallback to base64 encoding if Supabase upload fails
        finalUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      // 2. Save avatar url to users table directly
      const { error: dbError } = await supabase
        .from("users")
        .update({ avatar_url: finalUrl })
        .eq("id", profileData.profile.id);

      if (dbError) throw dbError;

      setAvatarUrl(finalUrl);
      setToastMessage("Avatar updated successfully!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err: any) {
      console.error(err);
      alert("Failed to upload avatar image.");
    } finally {
      setUpdatingAvatar(false);
    }
  };

  // Sign out logic
  const handleSignOut = async () => {
    if (!confirm("Are you sure you want to sign out?")) return;
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/");
    } catch (err) {
      setUser(null);
      router.push("/");
    }
  };

  const handleToggleExamType = (type: string) => {
    setExamTypes((prev) => {
      if (prev.includes(type)) {
        return prev.filter((t) => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  // Resolve initials helper
  const getInitials = () => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "S";
  };

  if (error) {
    return (
      <AppLayout>
        <div className="glass-panel p-12 text-center text-slate-500 rounded-2xl border border-white/5">
          Failed to load profile details. Verify your connection.
        </div>
      </AppLayout>
    );
  }

  if (isLoading || !profileData) {
    return (
      <AppLayout>
        <div className="space-y-6 max-w-2xl mx-auto py-8">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32 rounded" />
              <Skeleton className="h-3.5 w-24 rounded" />
            </div>
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </AppLayout>
    );
  }

  const p = profileData.profile;

  return (
    <AppLayout>
      <PageTransition className="max-w-2xl mx-auto py-6 space-y-6 relative">
        
        {/* Success toast: green toast slides in from top, auto-dismisses after 3s */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ y: -60, opacity: 0, x: "-50%" }}
              animate={{ y: 20, opacity: 1, x: "-50%" }}
              exit={{ y: -60, opacity: 0, x: "-50%" }}
              className="fixed top-0 left-1/2 z-50 bg-emerald-600 border border-emerald-500 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold whitespace-nowrap"
            >
              <CheckCircle2 size={16} />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile title */}
        <div>
          <h2 className="text-xl font-bold text-white">Profile Settings</h2>
          <p className="text-xs text-slate-400">Manage your credentials, preferences, and check study streak progress.</p>
        </div>

        {/* Avatar Settings & Upload Card */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            
            {/* Avatar circle */}
            <div className="w-20 h-20 rounded-full bg-brand-primary flex items-center justify-center font-black text-2xl text-white overflow-hidden border-2 border-white/10 shadow-lg relative">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="User avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{getInitials()}</span>
              )}

              {/* Uploading loading overlay */}
              {updatingAvatar && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="animate-spin text-white" size={20} />
                </div>
              )}
            </div>

            {/* Hover Camera icon overlay */}
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200">
              <Camera size={20} />
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="text-center sm:text-left space-y-1">
            <h3 className="font-extrabold text-sm text-white">
              {firstName} {lastName}
            </h3>
            <p className="text-xs text-slate-400">
              {p.phone} • Plan: <span className="text-brand-primary font-bold capitalize">{p.plan}</span>
            </p>
            <p className="text-[10px] text-slate-500">Tap avatar circle to upload a custom profile picture.</p>
          </div>
        </div>

        {/* Stats row card */}
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col items-center text-center space-y-1">
            <Flame className="text-amber-500 fill-amber-500/10" size={18} />
            <span className="text-[9px] font-bold text-slate-400 uppercase">Active Streak</span>
            <span className="text-sm font-black text-white">{p.streak_count || 0} days</span>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col items-center text-center space-y-1">
            <Award className="text-brand-purple" size={18} />
            <span className="text-[9px] font-bold text-slate-400 uppercase">Longest Streak</span>
            <span className="text-sm font-black text-white">{p.longest_streak || 0} days</span>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col items-center text-center space-y-1">
            <BookOpen className="text-brand-primary" size={18} />
            <span className="text-[9px] font-bold text-slate-400 uppercase">Completed Tests</span>
            <span className="text-sm font-black text-white">{totalSessions} sessions</span>
          </div>
        </div>

        {/* Form settings */}
        <form onSubmit={handleSaveProfile} className="glass-panel p-6 rounded-2xl border border-white/5 space-y-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/5 pb-2">
            Edit Credentials
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* First Name */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/5 hover:border-white/10 focus:border-brand-primary/50 text-white rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-brand-primary/20 transition-all"
              />
            </div>

            {/* Last Name */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-white/5 border border-white/5 hover:border-white/10 focus:border-brand-primary/50 text-white rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-brand-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* State */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold">Location (State)</label>
              <input
                type="text"
                placeholder="e.g. Lagos"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-white/5 border border-white/5 hover:border-white/10 focus:border-brand-primary/50 text-white rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-brand-primary/20 transition-all"
              />
            </div>

            {/* Target Score */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold">Target Score (0-400)</label>
              <input
                type="number"
                min="0"
                max="400"
                value={targetScore}
                onChange={(e) => setTargetScore(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/5 hover:border-white/10 focus:border-brand-primary/50 text-white rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-brand-primary/20 transition-all"
              />
            </div>

            {/* Exam Date */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                <Calendar size={12} />
                <span>Exam Date</span>
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full bg-white/5 border border-white/5 hover:border-white/10 focus:border-brand-primary/50 text-white rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-brand-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Exam types chips */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-semibold block">Target Exams</label>
            <div className="flex gap-2">
              {["JAMB", "WAEC", "NECO"].map((type) => {
                const isActive = examTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleToggleExamType(type)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      isActive
                        ? "bg-brand-primary/10 border-brand-primary text-brand-soft"
                        : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2 flex justify-end">
            <motion.button
              type="submit"
              disabled={updateProfileMutation.isPending}
              variants={buttonPressVariants}
              whileTap="tap"
              className="bg-brand-primary hover:bg-brand-primary/95 text-white font-bold py-3 px-6 rounded-xl text-xs shadow-lg flex items-center gap-2 transition-colors disabled:opacity-75"
            >
              {updateProfileMutation.isPending ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Save size={14} />
              )}
              <span>Save Changes</span>
            </motion.button>
          </div>
        </form>

        {/* Danger zone */}
        <div className="glass-panel p-6 rounded-2xl border border-red-500/10 bg-red-950/5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
            <ShieldAlert size={14} />
            <span>Danger Zone</span>
          </h3>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Logging out clears your browser auth cache. Ensure your PIN is remembered before signing out.
          </p>

          <div className="pt-1">
            <motion.button
              onClick={handleSignOut}
              variants={buttonPressVariants}
              whileTap="tap"
              className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold py-3 px-5 rounded-xl text-xs flex items-center gap-2 transition-colors"
            >
              <LogOut size={14} />
              <span>Sign Out of Account</span>
            </motion.button>
          </div>
        </div>

      </PageTransition>
    </AppLayout>
  );
}
