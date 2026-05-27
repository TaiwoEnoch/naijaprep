"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import PageTransition from "@/components/ui/PageTransition";
import Skeleton from "@/components/ui/Skeleton";
import { motion } from "framer-motion";
import { 
  CalendarDays, 
  Check, 
  ArrowRight, 
  BookOpen, 
  AlarmClock, 
  Sparkles,
  Award,
  Circle
} from "lucide-react";
import { buttonPressVariants } from "@/lib/animations";

interface SubjectMapping {
  id: string;
  name: string;
  code: string;
}

export default function StudyPlanPage() {
  
  // 1. Fetch user profile from GET /api/user/profile
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("Failed to load user profile.");
      const json = await res.json();
      return json.data || json; // supports standard wrappers
    }
  });

  // 2. Fetch user stats to lookup completed session dates for checklist
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["userStats"],
    queryFn: async () => {
      const res = await fetch("/api/user/stats");
      if (!res.ok) throw new Error("Failed to load user stats.");
      const json = await res.json();
      return json.data || json;
    }
  });

  // 3. Fetch subjects mapping to resolve names
  const { data: allSubjects } = useQuery<SubjectMapping[]>({
    queryKey: ["allSubjectsMapping"],
    queryFn: async () => {
      const res = await fetch("/api/subjects");
      if (!res.ok) throw new Error("Failed to load subjects mapping.");
      const json = await res.json();
      return json.data || json;
    }
  });

  const getSubjectName = (subjectId: string) => {
    if (!allSubjects) return "Loading Subject...";
    const found = allSubjects.find(s => s.id === subjectId);
    return found ? found.name : "Subject";
  };

  const profile = profileData?.profile || profileData;
  const examDate = profile?.exam_date || "2026-06-25"; // default target if empty

  // Calculate days remaining: Math.ceil((new Date(examDate) - Date.now()) / 86400000)
  const getDaysRemaining = () => {
    const diff = new Date(examDate).getTime() - Date.now();
    return Math.ceil(diff / 86400000);
  };

  const daysRemaining = getDaysRemaining();
  
  // Calculate Progress percentage (assuming a typical 90-day study window)
  const totalDaysWindow = 90;
  const progressPercent = Math.max(0, Math.min(100, ((totalDaysWindow - daysRemaining) / totalDaysWindow) * 100));

  // Determine completed days of the week based on recent session dates
  const getCompletedDaysSet = () => {
    const completed = new Set<number>(); // 0=Sun, 1=Mon, etc.
    if (!stats || !stats.recentSessions) return completed;

    const today = new Date();
    // Start of current week (Sunday 00:00)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    stats.recentSessions.forEach((s: any) => {
      if (s.status === "completed") {
        const sDate = new Date(s.created_at);
        if (sDate >= startOfWeek) {
          completed.add(sDate.getDay());
        }
      }
    });

    return completed;
  };

  const completedDays = getCompletedDaysSet();

  // Weekly calendar day labels
  const daysOfWeek = [
    { label: "Sun", index: 0 },
    { label: "Mon", index: 1 },
    { label: "Tue", index: 2 },
    { label: "Wed", index: 3 },
    { label: "Thu", index: 4 },
    { label: "Fri", index: 5 },
    { label: "Sat", index: 6 },
  ];

  // Rotate recommended study subject based on today's weekday index
  const getTodayRecommendation = () => {
    const todayIndex = new Date().getDay();
    const userSubs = stats?.subjectScores || [];
    
    const subjectName = userSubs.length > 0
      ? getSubjectName(userSubs[todayIndex % userSubs.length].subject_id)
      : "Mathematics";
    
    const sessionType = todayIndex % 2 === 0 ? "Quick Practice Run" : "Full Mock Simulation";
    return { subjectName, sessionType };
  };

  const todayRecommendation = getTodayRecommendation();
  const currentDayIndex = new Date().getDay();

  return (
    <AppLayout>
      <PageTransition className="space-y-6">
        
        {/* Header */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Daily Study Plan
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Stay on track. View days left to your exam and get personalized revision tasks.
          </p>
        </div>

        {/* Top Grid: Countdown & Today Recommendation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Countdown Card */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Days to Exam
              </h3>
              <span className="text-[10px] text-brand-soft bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 rounded-full font-bold">
                {profile?.exam_types?.[0] || "JAMB"} Target
              </span>
            </div>

            {profileLoading ? (
              <Skeleton className="h-16 w-32 rounded-xl" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black text-white tracking-tight">
                    {daysRemaining > 0 ? daysRemaining : 0}
                  </span>
                  <span className="text-sm font-semibold text-slate-400">days remaining</span>
                </div>

                {/* Progress bar to exam date */}
                <div className="space-y-1">
                  <div className="relative w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: "0%" }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full bg-brand-primary rounded-full"
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-500 font-semibold pt-1">
                    <span>90d Window Started</span>
                    <span>Exam Date: {new Date(examDate).toLocaleDateString("en-NG", { month: "long", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Today Card: highlighted green */}
          <div className="bg-[#0b291d] border border-brand-primary/20 p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden min-h-[200px]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/10 rounded-full filter blur-xl" />

            <div className="flex justify-between items-start relative z-10">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-soft">
                Today's Recommended Study
              </h3>
              <span className="text-[9px] bg-brand-primary text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                Today
              </span>
            </div>

            {statsLoading ? (
              <div className="space-y-2 py-4">
                <Skeleton className="h-6 w-40 rounded-lg" />
                <Skeleton className="h-4 w-28 rounded-lg" />
              </div>
            ) : (
              <div className="space-y-2 py-4 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-brand-primary/20 text-brand-soft rounded-lg">
                    <BookOpen size={16} />
                  </div>
                  <h4 className="font-extrabold text-lg text-white">
                    {todayRecommendation.subjectName}
                  </h4>
                </div>
                <div className="flex items-center gap-2 text-xs text-brand-soft/80 pl-8">
                  <AlarmClock size={13} />
                  <span>Session: {todayRecommendation.sessionType}</span>
                </div>
              </div>
            )}

            {/* Start today's session button: links to /practice */}
            <Link href="/practice" className="relative z-10">
              <motion.button
                variants={buttonPressVariants}
                whileTap="tap"
                className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/25 transition-all text-xs"
              >
                <span>Start Today's Session</span>
                <ArrowRight size={14} />
              </motion.button>
            </Link>
          </div>

        </div>

        {/* Weekly Schedule Row */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <CalendarDays size={14} className="text-brand-primary" />
              <span>Weekly Completion Checklist</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold">
              Resets every Sunday
            </span>
          </div>

          {/* Weekly schedule: 7 day cards */}
          {statsLoading ? (
            <div className="grid grid-cols-7 gap-2">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {daysOfWeek.map(day => {
                const isCompleted = completedDays.has(day.index);
                const isToday = currentDayIndex === day.index;
                
                return (
                  <div
                    key={day.index}
                    className={`p-3 rounded-xl flex flex-col items-center justify-between h-24 border transition-all ${
                      isToday
                        ? "bg-[#0b291d] border-brand-primary/30 ring-2 ring-brand-primary/10 shadow-md"
                        : isCompleted
                        ? "bg-white/5 border-brand-primary/10"
                        : "bg-white/5 border-white/5"
                    }`}
                  >
                    <span className={`text-[10.5px] font-bold ${
                      isToday ? "text-brand-soft" : "text-slate-400"
                    }`}>
                      {day.label}
                    </span>
                    
                    {/* Checkbox animation container */}
                    <div className="my-1.5 flex items-center justify-center">
                      {isCompleted ? (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-6 h-6 rounded-full bg-brand-primary flex items-center justify-center text-white"
                        >
                          <Check size={12} className="stroke-[3px]" />
                        </motion.div>
                      ) : (
                        <Circle size={18} className="text-white/10 stroke-[1.5px]" />
                      )}
                    </div>

                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none">
                      {isToday ? "Today" : isCompleted ? "Done" : "Empty"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </PageTransition>
    </AppLayout>
  );
}
