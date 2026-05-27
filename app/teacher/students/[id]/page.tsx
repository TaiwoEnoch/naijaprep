"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import PageTransition from "@/components/ui/PageTransition";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import Skeleton from "@/components/ui/Skeleton";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Flame, 
  Award, 
  Calendar, 
  Phone, 
  Sparkles,
  BookOpen, 
  PlusCircle, 
  TrendingUp,
  AlertTriangle,
  History
} from "lucide-react";
import { buttonPressVariants, staggerContainerVariants, staggerItemVariants } from "@/lib/animations";

interface Subject {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

interface StudentInfo {
  firstName: string;
  lastName: string;
  phone: string;
  plan: string;
  createdAt: string;
}

interface SubjectScore {
  avg_score: number;
  exam_type: string;
  subject_id: string;
}

interface WeakTopic {
  topicId: string | null;
  topicName: string;
  subjectName: string;
  percentage: number;
}

interface RecentSession {
  id: string;
  mode: string;
  exam_type: string;
  score_pct: number;
  time_taken_seconds: number;
  created_at: string;
  status: string;
  subjects: {
    name: string;
  } | null;
}

interface StudentStats {
  predictedScore: number;
  readinessPct: number;
  streakCount: number;
  totalExams: number;
  avgScorePct: number;
  subjectScores: SubjectScore[];
  weakTopics: WeakTopic[];
  recentSessions: RecentSession[];
  studentInfo: StudentInfo | null;
}

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  // Fetch subjects list to map subject names if needed
  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["subjectsList"],
    queryFn: async () => {
      const res = await fetch("/api/subjects");
      if (!res.ok) throw new Error("Failed to load subjects.");
      const json = await res.json();
      return json.data || json;
    }
  });

  // Fetch student stats passing x-student-id header
  const { data: stats, isLoading, error } = useQuery<StudentStats>({
    queryKey: ["studentStats", studentId],
    queryFn: async () => {
      const res = await fetch("/api/user/stats", {
        headers: {
          "x-student-id": studentId
        }
      });
      if (!res.ok) throw new Error("Failed to load student statistics.");
      const json = await res.json();
      return json.data || json;
    },
    enabled: !!studentId
  });

  const getSubjectName = (subId: string) => {
    return subjects?.find(s => s.id === subId)?.name || "Subject";
  };

  const studentInfo = stats?.studentInfo;
  const studentName = studentInfo 
    ? `${studentInfo.firstName} ${studentInfo.lastName || ""}`.trim()
    : "Student";

  // Circular ring calculations matching dashboard
  const radius = 46;
  const circumference = 2 * Math.PI * radius; // 289.026
  const readiness = stats?.readinessPct || 0;
  const strokeOffset = circumference - (readiness / 100) * circumference;

  const getRingColor = (pct: number) => {
    if (pct >= 70) return "#0F6E56"; // Green
    if (pct >= 40) return "#D97706"; // Amber
    return "#DC2626"; // Red
  };

  const ringColor = getRingColor(readiness);

  // Subject progress animations
  const progressVariants = {
    initial: { width: "0%" },
    animate: (pct: number) => ({
      width: `${pct}%`,
      transition: { duration: 0.8, ease: "easeOut" as const }
    })
  };

  // Stagger details
  const itemRowVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <RoleGuard>
      <AppLayout>
        <PageTransition className="space-y-6">
          
          {/* Header Action Back Button */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push("/teacher")}
              className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <span className="text-xs text-slate-400 font-medium">Back to directory</span>
          </div>

          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-28 w-full rounded-2xl" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="h-48 w-full rounded-2xl" />
                <Skeleton className="h-48 md:col-span-2 w-full rounded-2xl" />
              </div>
            </div>
          ) : error || !studentInfo ? (
            <div className="glass-panel p-8 rounded-2xl border border-red-500/20 bg-red-500/5 text-center text-slate-400">
              <AlertTriangle size={32} className="text-red-500 mx-auto mb-3 animate-bounce" />
              <h3 className="font-bold text-white">Failed to load student statistics</h3>
              <p className="text-xs text-slate-500 mt-1">This student might not be registered or active in your school.</p>
              <button 
                onClick={() => router.push("/teacher")}
                className="mt-4 bg-white/5 border border-white/5 text-white py-2 px-4 rounded-xl text-xs font-semibold hover:bg-white/10 transition-all"
              >
                Back to Dashboard
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Student Hero Header Card */}
              <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  {/* Initials Avatar */}
                  <div className="w-14 h-14 rounded-full bg-brand-purple flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand-purple/15 shrink-0">
                    {studentInfo.firstName.charAt(0)}{studentInfo.lastName?.charAt(0) || ""}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{studentName}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <div className="flex items-center gap-1 text-slate-400 text-xs">
                        <Phone size={12} />
                        <span>{studentInfo.phone}</span>
                      </div>
                      <span className="text-slate-600 text-xs hidden sm:inline">&bull;</span>
                      <div className="flex items-center gap-1 text-slate-400 text-xs">
                        <Calendar size={12} />
                        <span>
                          Joined {new Date(studentInfo.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Plan Badge */}
                  <span className={`px-3 py-1 rounded-xl border text-xs font-bold capitalize flex items-center gap-1 ${
                    studentInfo.plan === "school" || studentInfo.plan === "student"
                      ? "bg-brand-purple/10 text-brand-purple border-brand-purple/20 shadow-md shadow-brand-purple/5"
                      : "bg-white/5 border-white/5 text-slate-400"
                  }`}>
                    {(studentInfo.plan === "school" || studentInfo.plan === "student") && <Sparkles size={11} className="fill-brand-purple" />}
                    <span>{studentInfo.plan} plan</span>
                  </span>

                  {/* Active Streak */}
                  {stats.streakCount > 0 && (
                    <div className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-3 py-1 border border-amber-500/20 rounded-xl text-xs font-bold">
                      <Flame size={12} className="fill-amber-500 animate-pulse" />
                      <span>{stats.streakCount}d Streak</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance Overview Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. Readiness ring */}
                <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-between text-center min-h-[220px]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Exam Readiness</h3>
                  
                  <div className="relative w-28 h-28 flex items-center justify-center my-2">
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
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ready</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-normal max-w-[180px]">
                    Aggregate competency score based on completed syllabus checkpoints.
                  </p>
                </div>

                {/* 2. Score Forecast & Stats */}
                <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between items-center text-center min-h-[220px]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Score Forecast</h3>
                  
                  <div className="my-2">
                    <div className="text-5xl font-black text-brand-primary flex items-baseline justify-center">
                      <AnimatedNumber value={stats.predictedScore} />
                      <span className="text-xs font-bold text-slate-400 ml-1">/400</span>
                    </div>
                    <span className="text-[10px] font-bold text-brand-soft uppercase tracking-widest mt-1 block">Predicted score</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 w-full text-left">
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Exams Run</span>
                      <span className="text-sm font-bold text-white">{stats.totalExams}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Average Score</span>
                      <span className="text-sm font-bold text-white">{stats.avgScorePct}%</span>
                    </div>
                  </div>
                </div>

                {/* 3. Subject Competency breakdown */}
                <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between min-h-[220px]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 text-center mb-3">Subject Competency</h3>

                  {stats.subjectScores.length === 0 ? (
                    <div className="text-center text-xs text-slate-500 my-auto">
                      No subject averages recorded yet.
                    </div>
                  ) : (
                    <motion.div 
                      variants={staggerContainerVariants}
                      initial="initial"
                      animate="animate"
                      className="space-y-3 flex-1 justify-center flex flex-col"
                    >
                      {stats.subjectScores.map((score, index) => {
                        const name = getSubjectName(score.subject_id);
                        return (
                          <motion.div key={score.subject_id || index} variants={staggerItemVariants} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-semibold text-white truncate max-w-[120px]">{name}</span>
                              <span className="font-bold text-slate-400">{score.avg_score}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full bg-brand-primary"
                                custom={score.avg_score}
                                variants={progressVariants}
                                initial="initial"
                                animate="animate"
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </div>

              </div>

              {/* Weak Topics & Practice History Split */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Practice History Table */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <History size={16} className="text-brand-primary" />
                    <span>Practice History</span>
                  </h3>

                  {stats.recentSessions.length === 0 ? (
                    <div className="glass-panel p-8 rounded-2xl border border-white/5 text-center text-slate-500 text-xs">
                      No exams completed by this student.
                    </div>
                  ) : (
                    <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 text-[10px] text-slate-400 uppercase font-semibold">
                              <th className="p-4">Subject</th>
                              <th className="p-4">Mode</th>
                              <th className="p-4">Duration</th>
                              <th className="p-4">Date</th>
                              <th className="p-4 text-right">Score</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-xs">
                            {stats.recentSessions.map((session, idx) => {
                              const isGreen = session.score_pct >= 70;
                              const isAmber = session.score_pct >= 50 && session.score_pct < 70;
                              
                              return (
                                <tr key={session.id || idx} className="hover:bg-white/5 transition-colors">
                                  <td className="p-4 font-bold text-white">
                                    {session.subjects?.name || "Syllabus Subject"}
                                  </td>
                                  <td className="p-4 capitalize text-slate-400">{session.mode}</td>
                                  <td className="p-4 text-slate-400">
                                    {Math.round(session.time_taken_seconds / 60)}m
                                  </td>
                                  <td className="p-4 text-slate-400">
                                    {new Date(session.created_at).toLocaleDateString()}
                                  </td>
                                  <td className={`p-4 text-right font-bold ${
                                    isGreen ? "text-emerald-400" : isAmber ? "text-amber-400" : "text-red-400"
                                  }`}>
                                    {session.score_pct}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Weak Topics Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500" />
                    <span>Focus Areas</span>
                  </h3>

                  {stats.weakTopics.length === 0 ? (
                    <div className="glass-panel p-8 rounded-2xl border border-white/5 text-center text-slate-500 text-xs">
                      No weak topics detected. High readiness score!
                    </div>
                  ) : (
                    <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3">
                      <span className="text-[10px] text-slate-500 block leading-relaxed">
                        The topics below have average score rates under 60%. Prioritize practice on these subjects.
                      </span>

                      <motion.div 
                        variants={staggerContainerVariants}
                        initial="initial"
                        animate="animate"
                        className="flex flex-wrap gap-2 pt-2"
                      >
                        {stats.weakTopics.map((topic, index) => {
                          const isHighSeverity = topic.percentage < 40;
                          return (
                            <motion.span
                              key={topic.topicId || index}
                              variants={staggerItemVariants}
                              className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 ${
                                isHighSeverity 
                                  ? "bg-red-500/10 text-red-400 border-red-500/20" 
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isHighSeverity ? "bg-red-500" : "bg-amber-500"}`} />
                              <span>{topic.topicName} ({topic.percentage}%)</span>
                            </motion.span>
                          );
                        })}
                      </motion.div>
                    </div>
                  )}
                </div>

              </div>

              {/* Bottom Quick Assignment CTA */}
              <div className="pt-4 border-t border-white/5 flex justify-end">
                <Link href={`/teacher/assign?student=${studentId}`}>
                  <motion.button
                    variants={buttonPressVariants}
                    whileTap="tap"
                    className="bg-brand-primary text-white font-semibold text-xs py-3 px-6 rounded-xl flex items-center gap-2 hover:bg-brand-primary/95 transition-all shadow-lg shadow-brand-primary/10"
                  >
                    <PlusCircle size={15} />
                    <span>Assign Custom Exam to {studentInfo.firstName}</span>
                  </motion.button>
                </Link>
              </div>

            </div>
          )}

        </PageTransition>
      </AppLayout>
    </RoleGuard>
  );
}
