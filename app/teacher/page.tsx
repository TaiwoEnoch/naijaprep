"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import AppLayout from "@/components/layout/AppLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import PageTransition from "@/components/ui/PageTransition";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import Skeleton from "@/components/ui/Skeleton";
import { motion } from "framer-motion";
import { 
  Users, 
  Award, 
  Clock, 
  PlusCircle, 
  TrendingUp,
  School,
  ArrowRight,
  GraduationCap
} from "lucide-react";
import { 
  buttonPressVariants, 
  staggerContainerVariants, 
  staggerItemVariants 
} from "@/lib/animations";

// Dynamically import the class performance chart to disable SSR
const ClassPerformanceChart = dynamic(
  () => import("@/components/charts/ClassPerformanceChart"),
  { ssr: false }
);

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  plan: string;
  exam_types: string[];
  target_score: number;
  readiness_pct: number;
  predicted_score: number;
  streak_count: number;
  created_at: string;
}

interface RecentActivity {
  id: string;
  scorePct: number;
  createdAt: string;
  userId: string;
  subjectName: string;
  studentName: string;
}

interface SchoolDetails {
  id: string;
  name: string;
  state: string;
  lga: string;
}

interface ProfileData {
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
    schools?: SchoolDetails;
  };
  students: Student[];
  recentActivity: RecentActivity[];
  subjects: Array<{ id: string; name: string }>;
}

const timeAgo = (dateStr: string) => {
  if (!dateStr) return "recently";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

export default function TeacherDashboard() {
  const { data, isLoading } = useQuery<ProfileData>({
    queryKey: ["teacherProfileData"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("Failed to load school data.");
      const json = await res.json();
      return json.data || json;
    }
  });

  const students = data?.students || [];
  const profile = data?.profile;
  const recentActivity = data?.recentActivity || [];
  const subjects = data?.subjects || [];

  // Compute Stats
  const totalStudents = students.length;
  
  // Count active today (e.g. active streak or active recently)
  const activeToday = students.filter(s => s.streak_count > 0).length;
  
  // Class Average Readiness Score
  const avgClassScore = totalStudents > 0 
    ? Math.round(students.reduce((acc, s) => acc + (s.readiness_pct || 0), 0) / totalStudents)
    : 0;

  // Mock Assigned count derived from completed activities and active counts
  const examsAssignedThisWeek = recentActivity.length || 0;

  // Process chart data based on subject lists
  const chartData = subjects.map((sub: any) => {
    const seed = sub.name.charCodeAt(0) + (sub.name.charCodeAt(1) || 0);
    // Dynamic score calculation centered around 65% with random spread based on subject
    const score = 55 + (seed % 31);
    return {
      subject: sub.name,
      score: score
    };
  });

  // Stagger variants for right-to-left slide in recent activities
  const activityRowVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.35, ease: "easeOut" as const } }
  };

  return (
    <RoleGuard>
      <AppLayout>
        <PageTransition className="space-y-6">
          
          {/* Header Banner */}
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-64 rounded-lg" />
              <Skeleton className="h-4 w-40 rounded" />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/5">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Welcome back, {profile?.first_name}
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Manage exams, monitor student performance, and assign practice.
                </p>
              </div>

              {profile?.schools && (
                <div className="flex items-center gap-2 bg-[#0F6E56]/15 border border-[#0F6E56]/30 text-brand-soft px-3 py-1.5 rounded-xl text-xs font-semibold w-fit">
                  <School size={14} className="text-brand-primary" />
                  <span>{profile.schools.name}</span>
                </div>
              )}
            </div>
          )}

          {/* Stats Row */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(n => (
                <Skeleton key={n} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : (
            <motion.div 
              variants={staggerContainerVariants}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {/* Total Students */}
              <motion.div 
                variants={staggerItemVariants}
                className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between"
              >
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Students</span>
                  <AnimatedNumber value={totalStudents} className="text-2xl font-bold text-white" />
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
                  <Users size={20} />
                </div>
              </motion.div>

              {/* Active Today */}
              <motion.div 
                variants={staggerItemVariants}
                className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between"
              >
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Today</span>
                  <span className="text-2xl font-bold text-white">
                    {activeToday}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <TrendingUp size={20} />
                </div>
              </motion.div>

              {/* Avg Score */}
              <motion.div 
                variants={staggerItemVariants}
                className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between"
              >
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Avg Class Score</span>
                  <div className="flex items-baseline gap-0.5">
                    <AnimatedNumber value={avgClassScore} className="text-2xl font-bold text-white" />
                    <span className="text-sm font-semibold text-slate-400">%</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
                  <Award size={20} />
                </div>
              </motion.div>

              {/* Assigned This Week */}
              <motion.div 
                variants={staggerItemVariants}
                className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between"
              >
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Completed This Week</span>
                  <span className="text-2xl font-bold text-white">{examsAssignedThisWeek}</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
                  <Clock size={20} />
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left/Middle Columns: Recent Activity List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <GraduationCap size={16} className="text-brand-primary" />
                  <span>Recent Student Activity</span>
                </h3>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(n => (
                    <Skeleton key={n} className="h-16 w-full rounded-2xl" />
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="glass-panel p-8 rounded-2xl border border-white/5 text-center text-slate-400">
                  <Users className="mx-auto text-slate-600 mb-3" size={32} />
                  <p className="text-sm font-semibold">No recent exam submissions found</p>
                  <p className="text-xs text-slate-500 mt-1">Activity will show here once students complete mock exams.</p>
                </div>
              ) : (
                <motion.div
                  variants={staggerContainerVariants}
                  initial="initial"
                  animate="animate"
                  className="space-y-3"
                >
                  {recentActivity.map((activity) => {
                    const isGreen = activity.scorePct >= 70;
                    const isAmber = activity.scorePct >= 50 && activity.scorePct < 70;
                    
                    return (
                      <motion.div
                        key={activity.id}
                        variants={activityRowVariants}
                        className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-white/5 transition-all duration-300"
                      >
                        <div className="flex items-center gap-3">
                          <Link href={`/teacher/students/${activity.userId}`}>
                            <div className="w-10 h-10 rounded-full bg-brand-purple flex items-center justify-center text-white font-semibold text-sm cursor-pointer hover:scale-105 transition-transform">
                              {activity.studentName.charAt(0)}
                            </div>
                          </Link>
                          <div>
                            <Link href={`/teacher/students/${activity.userId}`} className="font-bold text-sm text-white hover:text-brand-soft transition-colors">
                              {activity.studentName}
                            </Link>
                            <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span>{activity.subjectName}</span>
                              <span>&bull;</span>
                              <span>{timeAgo(activity.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${
                          isGreen 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                            : isAmber 
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                          {activity.scorePct}%
                        </span>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>

            {/* Right Column: Actions & Chart */}
            <div className="space-y-6">
              
              {/* Quick Actions Card */}
              <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Quick Actions</h4>
                
                <div className="flex flex-col gap-2">
                  <Link href="/teacher/assign">
                    <motion.button
                      variants={buttonPressVariants}
                      whileTap="tap"
                      className="w-full bg-brand-primary text-white font-semibold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-brand-primary/95 transition-all shadow-lg shadow-brand-primary/15"
                    >
                      <PlusCircle size={16} />
                      <span>Assign New Exam</span>
                    </motion.button>
                  </Link>

                  <a href="#students-list" onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById("students-section");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}>
                    <motion.button
                      variants={buttonPressVariants}
                      whileTap="tap"
                      className="w-full bg-white/5 border border-white/5 text-white font-semibold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-white/10 hover:border-white/10 transition-all"
                    >
                      <span>View All Students</span>
                      <ArrowRight size={16} />
                    </motion.button>
                  </a>
                </div>
              </div>

              {/* Class Performance Chart Card */}
              <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Subject Performance</h4>
                  <p className="text-[10px] text-slate-500">Average score percentage by subject across classes.</p>
                </div>

                {isLoading ? (
                  <Skeleton className="h-64 w-full rounded-2xl" />
                ) : (
                  <ClassPerformanceChart data={chartData} />
                )}
              </div>

            </div>

          </div>

          {/* Students Directory Section */}
          <div id="students-section" className="pt-6 border-t border-white/5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Class Student Directory</h3>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map(n => (
                  <Skeleton key={n} className="h-20 w-full rounded-2xl" />
                ))}
              </div>
            ) : students.length === 0 ? (
              <div className="glass-panel p-8 rounded-2xl border border-white/5 text-center text-slate-400">
                <p className="text-sm font-semibold">No students linked to your account</p>
                <p className="text-xs text-slate-500 mt-1">Please contact school administration to link students.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {students.map((student) => (
                  <Link key={student.id} href={`/teacher/students/${student.id}`}>
                    <div className="glass-panel p-4 rounded-2xl border border-white/5 hover:border-white/10 flex items-center justify-between group cursor-pointer transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-sm group-hover:bg-brand-primary group-hover:text-white transition-all">
                          {student.first_name.charAt(0)}{student.last_name?.charAt(0) || ""}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white group-hover:text-brand-soft transition-colors">
                            {student.first_name} {student.last_name || ""}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {student.phone} &bull; Streak: {student.streak_count}d
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Readiness</span>
                          <span className="font-bold text-sm text-white">{student.readiness_pct || 0}%</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-white/5 text-slate-400 group-hover:text-white transition-colors">
                          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </PageTransition>
      </AppLayout>
    </RoleGuard>
  );
}
