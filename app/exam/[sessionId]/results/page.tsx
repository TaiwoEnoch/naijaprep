"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import PageTransition from "@/components/ui/PageTransition";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import Skeleton from "@/components/ui/Skeleton";
import Confetti from "@/components/ui/Confetti";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Share2, 
  RotateCcw, 
  BookOpen, 
  Award,
  ArrowRight
} from "lucide-react";
import { buttonPressVariants } from "@/lib/animations";

interface SubjectMapping {
  id: string;
  name: string;
  code: string;
}

interface StatSubject {
  subject_id: string;
  avg_score: number;
  exam_type: string;
}

export default function ExamResultsPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [animateBg, setAnimateBg] = useState(false);
  const [animateRing, setAnimateRing] = useState(false);
  const [animateScore, setAnimateScore] = useState(false);
  const [animatePct, setAnimatePct] = useState(false);
  const [animateStats, setAnimateStats] = useState(false);
  const [animateBadge, setAnimateBadge] = useState(false);
  const [triggerConfetti, setTriggerConfetti] = useState(false);

  // 1. Fetch exam results
  const { data: resultsData, isLoading: resultsLoading, error: resultsError } = useQuery({
    queryKey: ["examResults", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/exam/${sessionId}/results`);
      if (!res.ok) throw new Error("Failed to load exam results.");
      const json = await res.json();
      return json.data || json;
    },
    refetchOnMount: true,
  });

  // 2. Fetch subject mappings
  const { data: allSubjects } = useQuery<SubjectMapping[]>({
    queryKey: ["allSubjectsMapping"],
    queryFn: async () => {
      const res = await fetch("/api/subjects");
      if (!res.ok) throw new Error("Failed to load subjects mapping.");
      const json = await res.json();
      return json.data || json;
    },
  });

  // 3. Fetch overall user stats (for registered subjects progress bars)
  const { data: overallStats } = useQuery({
    queryKey: ["userStats"],
    queryFn: async () => {
      const res = await fetch("/api/user/stats");
      if (!res.ok) throw new Error("Failed to load user stats.");
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

  // Orchestrated animation sequence on mount
  useEffect(() => {
    if (resultsLoading || resultsError || !resultsData) return;

    const timers = [
      setTimeout(() => setAnimateBg(true), 0),
      setTimeout(() => setAnimateRing(true), 200),
      setTimeout(() => setAnimateScore(true), 400),
      setTimeout(() => setAnimatePct(true), 600),
      setTimeout(() => setAnimateStats(true), 800),
    ];

    const isPB = resultsData.session?.is_personal_best || false;

    if (isPB) {
      timers.push(
        setTimeout(() => setAnimateBadge(true), 1000),
        setTimeout(() => setTriggerConfetti(true), 1200)
      );
    }

    return () => timers.forEach(clearTimeout);
  }, [resultsLoading, resultsError, resultsData]);

  if (resultsError) {
    return (
      <AppLayout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <XCircle size={32} />
          </div>
          <h2 className="text-xl font-bold">Failed to load results</h2>
          <p className="text-sm text-slate-400 max-w-sm">
            We couldn't retrieve the details for this exam session. It might have been deleted or expired.
          </p>
          <Link href="/practice">
            <button className="bg-brand-primary hover:bg-brand-primary/90 text-white font-bold px-6 py-2.5 rounded-xl text-xs">
              Go to Practice Center
            </button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  if (resultsLoading || !resultsData) {
    return (
      <AppLayout>
        <div className="space-y-6 max-w-2xl mx-auto py-8">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </AppLayout>
    );
  }

  const { session, answers } = resultsData;
  const scorePct = session.score_pct ?? 0;
  const correctCount = session.score ?? 0;
  const totalQuestions = session.total_questions ?? 0;
  const wrongCount = Math.max(0, totalQuestions - correctCount);
  const timeTaken = session.time_taken_seconds ?? 0;

  // Format time taken
  const formatTimeTaken = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  // SVG circular properties
  const radius = 64;
  const circumference = 2 * Math.PI * radius; // 402.12
  const strokeOffset = circumference - (scorePct / 100) * circumference;

  const subjectName = getSubjectName(session.subject_id);

  // WhatsApp share parameters
  const shareText = `I just scored ${scorePct}% on my ${session.exam_type} ${subjectName} mock exam on NaijaPrep! naijaprep.com`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  // Subject breakdown progress bar scale
  const fillProgressVariants = {
    hidden: { width: "0%" },
    visible: (score: number) => ({
      width: `${score}%`,
      transition: { duration: 0.8, ease: "easeOut" as const }
    })
  };

  return (
    <AppLayout>
      <PageTransition className="max-w-2xl mx-auto py-6 space-y-6 relative">
        
        {/* Confetti element if PB */}
        {triggerConfetti && <Confetti fire={true} type="burst" />}

        {/* 0ms: green gradient background fades in */}
        <AnimatePresence>
          {animateBg && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 bg-gradient-to-b from-brand-primary/5 via-transparent to-transparent pointer-events-none rounded-3xl -z-10"
            />
          )}
        </AnimatePresence>

        {/* Main Score Overview Card */}
        <div className="glass-panel p-8 rounded-3xl border border-white/5 flex flex-col items-center text-center space-y-6 relative overflow-hidden">
          
          {/* Personal Best Badge (1000ms: golden badge bounces in) */}
          <AnimatePresence>
            {animateBadge && (
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="absolute top-4 right-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-extrabold text-[10px] tracking-wider uppercase px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg shadow-yellow-500/20"
              >
                <Award size={12} />
                <span>Personal Best!</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 bg-white/5 border border-white/10 px-3 py-1 rounded-md">
              {session.exam_type} Mock Exam
            </span>
            <h2 className="text-xl font-bold text-white pt-2">{subjectName} Result</h2>
          </div>

          {/* SVG Score Ring Container */}
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              {/* Base background circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="10"
                fill="transparent"
              />
              {/* Animated Progress Ring (200ms: SVG ring starts drawing) */}
              <motion.circle
                cx="80"
                cy="80"
                r={radius}
                stroke="#0F6E56"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: animateRing ? strokeOffset : circumference }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>

            {/* Inner text values */}
            <div className="absolute flex flex-col items-center space-y-0.5">
              {/* 400ms: score number counts up */}
              {animateScore && (
                <div className="text-4xl font-black text-white leading-none">
                  <AnimatedNumber value={scorePct} delay={0} />
                  {/* 600ms: score percentage fades in */}
                  {animatePct && (
                    <motion.span 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="text-lg font-bold text-brand-soft"
                    >
                      %
                    </motion.span>
                  )}
                </div>
              )}
              
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-1">
                Score
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-300 max-w-sm leading-relaxed">
            {scorePct >= 75 
              ? "Spectacular performance! You're showing strong mastery of this subject. Keep this momentum going!"
              : scorePct >= 50
              ? "Good effort! You have solid baseline understanding but focusing on wrong answers will boost your score."
              : "Keep pushing! Preparation is a process. Go through the answer explanations to master the key topics."}
          </p>
        </div>

        {/* 800ms: stats row fades in with stagger */}
        <AnimatePresence>
          {animateStats && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.15
                  }
                }
              }}
              className="grid grid-cols-3 gap-4"
            >
              {/* Stat Card 1: Time Taken */}
              <motion.div 
                variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
                className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col items-center text-center space-y-1.5"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Clock size={16} />
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Time Taken</span>
                <span className="text-sm font-extrabold text-white">{formatTimeTaken(timeTaken)}</span>
              </motion.div>

              {/* Stat Card 2: Correct answers */}
              <motion.div 
                variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
                className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col items-center text-center space-y-1.5"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 size={16} />
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Correct</span>
                <span className="text-sm font-extrabold text-white">{correctCount} Qs</span>
              </motion.div>

              {/* Stat Card 3: Wrong answers */}
              <motion.div 
                variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
                className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col items-center text-center space-y-1.5"
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <XCircle size={16} />
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Wrong</span>
                <span className="text-sm font-extrabold text-white">{wrongCount} Qs</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subject Breakdown Progress Bars */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <BookOpen size={14} className="text-brand-primary" />
            <span>Subject Averages Comparison</span>
          </h3>

          <div className="space-y-4">
            {overallStats?.subjectScores && overallStats.subjectScores.length > 0 ? (
              overallStats.subjectScores.map((sub: StatSubject, idx: number) => {
                const sName = getSubjectName(sub.subject_id);
                const isCurrentSubject = sub.subject_id === session.subject_id;
                
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className={`truncate max-w-[200px] ${isCurrentSubject ? "text-brand-primary font-bold" : "text-white"}`}>
                        {sName} {isCurrentSubject && "(Current)"}
                      </span>
                      <span className="text-brand-soft font-bold">{sub.avg_score}%</span>
                    </div>
                    
                    {/* Progress bar track */}
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        custom={sub.avg_score}
                        variants={fillProgressVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: idx * 0.2, duration: 0.8, ease: "easeOut" as const }}
                        className={`h-full rounded-full ${isCurrentSubject ? "bg-brand-primary" : "bg-white/20"}`}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-white">
                    <span>{subjectName} (Current)</span>
                    <span>{scorePct}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      custom={scorePct}
                      variants={fillProgressVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: 0.1, duration: 0.8, ease: "easeOut" as const }}
                      className="h-full bg-brand-primary rounded-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Button Section */}
        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          {/* Share on WhatsApp */}
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
            <motion.button
              variants={buttonPressVariants}
              whileTap="tap"
              className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg text-xs"
            >
              <Share2 size={16} />
              <span>Share on WhatsApp</span>
            </motion.button>
          </a>

          {/* Review Answers */}
          <Link href={`/exam/${sessionId}/review`} className="flex-1">
            <motion.button
              variants={buttonPressVariants}
              whileTap="tap"
              className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl border border-white/10 flex items-center justify-center gap-2 hover:border-brand-primary/30 transition-all text-xs"
            >
              <CheckCircle2 size={16} className="text-brand-primary" />
              <span>Review Test Answers</span>
            </motion.button>
          </Link>

          {/* Try Again */}
          <Link href="/practice" className="flex-1">
            <motion.button
              variants={buttonPressVariants}
              whileTap="tap"
              className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg text-xs"
            >
              <RotateCcw size={16} />
              <span>Try Practice Again</span>
            </motion.button>
          </Link>
        </div>

      </PageTransition>
    </AppLayout>
  );
}
