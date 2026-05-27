"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import AppLayout from "@/components/layout/AppLayout";
import PageTransition from "@/components/ui/PageTransition";
import Skeleton from "@/components/ui/Skeleton";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  BarChart3, 
  Activity, 
  BookOpen,
  Award,
  AlertTriangle,
  Calendar
} from "lucide-react";
import { buttonPressVariants, staggerContainerVariants, staggerItemVariants } from "@/lib/animations";

// Dynamically import ScoreTrendChart (disabled SSR to prevent canvas hydration mismatch)
const ScoreTrendChart = dynamic(
  () => import("@/components/charts/ScoreTrendChart"),
  { ssr: false }
);

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

interface WeakTopic {
  topicId: string;
  topicName: string;
  subjectName: string;
  percentage: number;
}

export default function PerformancePage() {
  // Period filter: This week / This month toggle
  const [activePeriod, setActivePeriod] = useState<"week" | "month">("month");

  // Fetch statistics from /api/user/stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["userStats"],
    queryFn: async () => {
      const res = await fetch("/api/user/stats");
      if (!res.ok) throw new Error("Failed to load user stats.");
      const json = await res.json();
      return json.data || json;
    }
  });

  // Fetch subject mappings
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
    if (!allSubjects) return "Loading...";
    const found = allSubjects.find(s => s.id === subjectId);
    return found ? found.name : "Subject";
  };

  // Process chart data based on activePeriod filter
  const getChartData = () => {
    if (!stats || !stats.recentSessions || stats.recentSessions.length === 0) {
      // Fallback fallback chart data points
      return [
        { date: "May 10", score: 55 },
        { date: "May 15", score: 62 },
        { date: "May 20", score: 70 },
        { date: "May 25", score: 75 },
      ];
    }

    const maxItems = activePeriod === "week" ? 3 : 6;
    return [...stats.recentSessions]
      .slice(0, maxItems)
      .reverse()
      .map((s: any) => ({
        date: new Date(s.created_at).toLocaleDateString("en-NG", { month: "short", day: "numeric" }),
        score: s.score_pct || 0,
        subject: s.subjects?.name || "Mock",
      }));
  };

  const chartData = getChartData();

  // Progress Bar scale filling animations
  const fillProgressVariants: any = {
    hidden: { width: "0%" },
    visible: (score: number) => ({
      width: `${score}%`,
      transition: { duration: 0.8, ease: "easeOut" as const }
    })
  };

  return (
    <AppLayout>
      <PageTransition className="space-y-6">
        
        {/* Top Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Performance Analytics
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Visualize your learning curve, progress scores, and focus areas.
            </p>
          </div>

          {/* Period Filter Toggle */}
          <div className="flex gap-1.5 p-1 bg-white/5 border border-white/5 rounded-xl w-fit relative z-10">
            {(["week", "month"] as const).map(p => (
              <button
                key={p}
                onClick={() => setActivePeriod(p)}
                className={`relative px-4 py-2 text-xs font-semibold rounded-lg capitalize transition-colors ${
                  activePeriod === p ? "text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {activePeriod === p && (
                  <motion.div
                    layoutId="activePeriodIndicator"
                    className="absolute inset-0 bg-brand-primary rounded-lg z-0"
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  />
                )}
                <span className="relative z-10">This {p}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Charts & Highlights Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recharts Trend Line Chart */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Activity size={14} className="text-brand-primary" />
                <span>Score Improvement Trend</span>
              </h3>
              <span className="text-[10px] text-brand-soft bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 rounded-full font-bold">
                Mock Exams
              </span>
            </div>

            {statsLoading ? (
              <div className="h-64 w-full flex items-center justify-center">
                <Skeleton className="h-full w-full rounded-xl animate-pulse" />
              </div>
            ) : (
              <div className="pt-4">
                <ScoreTrendChart data={chartData} />
              </div>
            )}
          </div>

          {/* Quick Stats Summary */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between min-h-[220px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Exam Highlights
            </h3>

            {statsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {/* Total Exams taken */}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-lg">
                    <Award size={18} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Total Exams Mocked</div>
                    <div className="text-lg font-bold text-white">{stats?.totalExams || 0} sessions</div>
                  </div>
                </div>

                {/* Average Score */}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-purple/10 text-brand-purple rounded-lg">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Average Score Rate</div>
                    <div className="text-lg font-bold text-white">{stats?.avgScorePct || 0}% correct</div>
                  </div>
                </div>
              </div>
            )}

            <p className="text-[9.5px] text-slate-500 leading-normal border-t border-white/5 pt-3">
              Aim to complete at least 2 full mock exams monthly to maintain reliable predictions.
            </p>
          </div>

        </div>

        {/* Bottom Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Subject Progress Bars */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <BookOpen size={14} className="text-brand-primary" />
              <span>Subject Progress Summary</span>
            </h3>

            {statsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(n => (
                  <Skeleton key={n} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                {stats?.subjectScores?.map((sub: StatSubject, idx: number) => {
                  const sName = getSubjectName(sub.subject_id);
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-white truncate max-w-[200px]">{sName}</span>
                        <span className="text-brand-soft font-bold">{sub.avg_score}%</span>
                      </div>
                      
                      {/* Progress bar track */}
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        {/* fills from 0 to actual score with 200ms stagger */}
                        <motion.div
                          custom={sub.avg_score}
                          variants={fillProgressVariants}
                          initial="hidden"
                          animate="visible"
                          transition={{ delay: idx * 0.2, duration: 0.8, ease: "easeOut" as const }}
                          className="h-full bg-brand-primary rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Weak Topics Chips */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-brand-purple" />
              <span>Focus Required (Weak Topics)</span>
            </h3>

            {statsLoading ? (
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4].map(n => (
                  <Skeleton key={n} className="h-8 w-24 rounded-lg" />
                ))}
              </div>
            ) : !stats?.weakTopics || stats.weakTopics.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                🎉 Excellent! No weak topics detected (scores under 60%).
              </div>
            ) : (
              // Weak topics chips: slide in with stagger, color coded
              <motion.div 
                variants={staggerContainerVariants}
                initial="initial"
                animate="animate"
                className="flex flex-wrap gap-2.5 max-h-[220px] overflow-y-auto pr-1"
              >
                {stats.weakTopics.map((topic: WeakTopic, idx: number) => {
                  const isRed = topic.percentage < 40;
                  
                  return (
                    <motion.div
                      key={idx}
                      variants={staggerItemVariants}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex flex-col gap-0.5 ${
                        isRed
                          ? "bg-red-500/10 text-red-400 border-red-500/10"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/10"
                      }`}
                    >
                      <span className="font-bold text-white text-[11px] truncate max-w-[200px]">
                        {topic.topicName}
                      </span>
                      <div className="flex justify-between items-center text-[9px] opacity-80 gap-6">
                        <span>{topic.subjectName}</span>
                        <span className="font-bold">{topic.percentage}% Correct</span>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>

        </div>

      </PageTransition>
    </AppLayout>
  );
}
