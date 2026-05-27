"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store/useAppStore";
import AppLayout from "@/components/layout/AppLayout";
import PageTransition from "@/components/ui/PageTransition";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import Skeleton from "@/components/ui/Skeleton";
import { motion } from "framer-motion";
import { 
  Bell, 
  Download, 
  Flame, 
  Trophy, 
  BookOpen, 
  ChevronRight, 
  TrendingUp, 
  ArrowRight,
  Sparkles,
  Zap,
  Target
} from "lucide-react";
import { buttonPressVariants, staggerContainerVariants, staggerItemVariants, cardHoverVariants } from "@/lib/animations";

interface StatSubject {
  subject_id: string;
  avg_score: number;
  exam_type: string;
}

interface SubjectMapping {
  id: string;
  name: string;
  code: string;
}

export default function DashboardPage() {
  const { user } = useAppStore();
  const [greeting, setGreeting] = useState("Good day");

  // Determine greeting based on local time
  useEffect(() => {
    const hr = new Date().getHours();
    if (hr < 12) setGreeting("Good morning");
    else if (hr < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // 1. Fetch statistics from /api/user/stats
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["userStats"],
    queryFn: async () => {
      const res = await fetch("/api/user/stats");
      if (!res.ok) throw new Error("Failed to load user stats.");
      const json = await res.json();
      return json.data || json;
    },
    refetchOnMount: true,
  });

  // 2. Fetch subject mappings to resolve subject names
  const { data: allSubjects } = useQuery<SubjectMapping[]>({
    queryKey: ["allSubjectsMapping"],
    queryFn: async () => {
      const res = await fetch("/api/subjects");
      if (!res.ok) throw new Error("Failed to load subjects mapping.");
      const json = await res.json();
      return json.data || json;
    },
  });

  // Resolve subject name helper
  const getSubjectName = (subjectId: string) => {
    if (!allSubjects) return "Loading Subject...";
    const found = allSubjects.find(s => s.id === subjectId);
    return found ? found.name : "Subject";
  };

  const getSubjectCode = (subjectId: string) => {
    if (!allSubjects) return "SUB";
    const found = allSubjects.find(s => s.id === subjectId);
    return found ? found.code : "SUB";
  };

  // Circular ring settings
  const radius = 50;
  const circumference = 2 * Math.PI * radius; // 314.159
  const readiness = stats?.readinessPct || 0;
  const strokeOffset = circumference - (readiness / 100) * circumference;

  // Decide Ring Color
  const getRingColor = (pct: number) => {
    if (pct >= 70) return "#0F6E56"; // Green
    if (pct >= 40) return "#D97706"; // Amber
    return "#DC2626"; // Red
  };

  const ringColor = getRingColor(readiness);

  // If stats error, display simple banner
  const hasError = !!statsError;

  return (
    <AppLayout>
      <PageTransition className="space-y-6">
        
        {/* Header Greeting Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-brand-dark to-brand-primary/40 border border-white/5 p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1 relative z-10">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              {greeting}, <span className="text-gradient-green font-extrabold">{user?.name || "Scholar"}</span>!
            </h2>
            <p className="text-xs text-brand-soft/75 max-w-md leading-normal">
              You are on step to hitting your target of <span className="font-bold text-white">{stats?.predictedScore || 280}</span> on {user?.examType || "JAMB"}. Let's make today count!
            </p>
          </div>
          
          <div className="flex items-center gap-3 relative z-10 shrink-0">
            {/* Download Offline Icon links to /offline */}
            <Link href="/offline">
              <motion.button 
                variants={buttonPressVariants}
                whileTap="tap"
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-brand-soft hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold"
              >
                <Download size={15} />
                <span>Offline Packs</span>
              </motion.button>
            </Link>

            {/* Notification Bell with Mount Swing animation */}
            <Link href="/notifications">
              <motion.button
                variants={buttonPressVariants}
                whileTap="tap"
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-brand-soft hover:text-white transition-all relative"
              >
                <motion.div
                  animate={{ rotate: [0, -16, 16, -12, 12, -6, 6, 0] }}
                  transition={{ duration: 0.9, ease: "easeInOut" }}
                >
                  <Bell size={18} />
                </motion.div>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-purple rounded-full" />
              </motion.button>
            </Link>
          </div>
        </div>

        {/* Dashboard Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Circular Readiness Ring Card */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col items-center text-center justify-between min-h-[220px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Exam Readiness Rating
            </h3>
            
            {statsLoading ? (
              <div className="w-28 h-28 rounded-full border-4 border-white/5 animate-pulse flex items-center justify-center text-xs text-slate-500">
                Evaluating...
              </div>
            ) : (
              <div className="relative w-28 h-28 flex items-center justify-center">
                {/* SVG circular readiness ring */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="46"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <motion.circle
                    cx="56"
                    cy="56"
                    r="46"
                    stroke={ringColor}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: strokeOffset }}
                    transition={{ duration: 1.0, ease: "easeOut" }}
                    strokeLinecap="round"
                  />
                </svg>
                
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-extrabold text-white leading-none">
                    <AnimatedNumber value={readiness} />
                    <span className="text-xs text-slate-400">%</span>
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Ready
                  </span>
                </div>
              </div>
            )}

            <p className="text-[10px] text-slate-400 leading-normal max-w-[180px] mt-1">
              Readiness is based on your correct rates in study papers.
            </p>
          </div>

          {/* Predicted JAMB Score Card */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between items-center text-center min-h-[220px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Predicted Exam Score
            </h3>

            {statsLoading ? (
              <Skeleton className="h-16 w-32 rounded-xl" />
            ) : (
              <div className="flex flex-col items-center space-y-1">
                <div className="text-5xl font-black text-brand-primary flex items-baseline">
                  {/* predicted score: number counts up from 0 to value on mount */}
                  <AnimatedNumber value={stats?.predictedScore || 0} />
                  <span className="text-xs font-semibold text-slate-400 ml-1">/400</span>
                </div>
                <div className="inline-flex items-center gap-1 text-[10px] text-brand-soft bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 rounded-full font-bold">
                  <TrendingUp size={10} />
                  <span>+12 points this week</span>
                </div>
              </div>
            )}

            <p className="text-[10px] text-slate-400 leading-normal max-w-[180px]">
              Keep practicing daily to push this towards your {stats?.predictedScore || 280} target.
            </p>
          </div>

          {/* Streak Card */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between items-center text-center min-h-[220px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Study Streak
            </h3>

            {statsLoading ? (
              <Skeleton className="h-16 w-32 rounded-xl" />
            ) : (
              <div className="flex flex-col items-center space-y-3">
                {/* Flame emoji with continuous scale animation */}
                <motion.div
                  animate={{ scale: [1, 1.14, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                  className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center text-amber-500"
                >
                  <Flame size={26} className="fill-amber-500" />
                </motion.div>
                
                <div className="text-2xl font-extrabold text-white">
                  <AnimatedNumber value={stats?.streakCount || 0} /> Days
                </div>

                {/* Streak dots fill from left */}
                <div className="flex items-center gap-1.5">
                  {[...Array(7)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, backgroundColor: "rgba(255,255,255,0.06)" }}
                      animate={{ 
                        scale: 1, 
                        backgroundColor: i < (stats?.streakCount || 0) ? "#D97706" : "rgba(255,255,255,0.06)" 
                      }}
                      transition={{ delay: i * 0.08, duration: 0.3 }}
                      className="w-2.5 h-2.5 rounded-full"
                    />
                  ))}
                </div>
              </div>
            )}

            <p className="text-[10px] text-slate-400 leading-normal max-w-[180px]">
              Complete at least 1 practice test daily to keep your flame alive.
            </p>
          </div>

        </div>

        {/* Subjects List Header */}
        <div className="pt-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <BookOpen size={16} className="text-brand-primary" />
            <span>My Registered Subjects</span>
          </h3>

          {/* Stagger entrance for subject cards */}
          {statsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(n => (
                <Skeleton key={n} className="h-32 w-full rounded-2xl" />
              ))}
            </div>
          ) : (
            <motion.div 
              variants={staggerContainerVariants}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {stats?.subjectScores?.map((sub: StatSubject, idx: number) => {
                const sName = getSubjectName(sub.subject_id);
                const sCode = getSubjectCode(sub.subject_id);
                return (
                  <motion.div
                    key={idx}
                    variants={staggerItemVariants}
                    whileHover="hover"
                    className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between h-36 relative overflow-hidden group cursor-pointer hover:border-brand-primary/20 transition-all duration-300"
                  >
                    {/* Hover Lift animation logic mapped to classes */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full filter blur-xl translate-x-8 -translate-y-8 group-hover:bg-brand-primary/10 transition-all" />
                    
                    <div className="flex justify-between items-start z-10">
                      <span className="font-extrabold text-[10px] tracking-widest bg-white/10 px-2 py-0.5 rounded text-brand-soft">
                        {sCode}
                      </span>
                      {/* Trend arrow: slides right on hover */}
                      <motion.div 
                        variants={{ hover: { x: 4 } }}
                        className="text-brand-primary bg-brand-primary/10 p-1.5 rounded-lg group-hover:bg-brand-primary group-hover:text-white transition-colors"
                      >
                        <ArrowRight size={14} />
                      </motion.div>
                    </div>

                    <div className="space-y-1 z-10">
                      <h4 className="font-bold text-sm text-white group-hover:text-brand-soft truncate">
                        {sName}
                      </h4>
                      <div className="flex justify-between items-center text-[10.5px] text-slate-400">
                        <span>Avg. Score</span>
                        <span className="font-bold text-white">{sub.avg_score}%</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* Quick Actions Footer Button row */}
        <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row gap-4">
          <Link href="/practice" className="flex-1">
            <motion.button
              variants={buttonPressVariants}
              whileTap="tap"
              className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20 transition-all text-sm"
            >
              <Zap size={16} />
              <span>Quick Practice Session (20 Qs)</span>
            </motion.button>
          </Link>

          <Link href="/practice" className="flex-1">
            <motion.button
              variants={buttonPressVariants}
              whileTap="tap"
              className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl border border-white/10 flex items-center justify-center gap-2 hover:border-brand-primary/30 transition-all text-sm"
            >
              <Target size={16} className="text-brand-purple" />
              <span>Take Full Mock Exam (2 Hours)</span>
            </motion.button>
          </Link>
        </div>

      </PageTransition>
    </AppLayout>
  );
}
