"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import PageTransition from "@/components/ui/PageTransition";
import Skeleton from "@/components/ui/Skeleton";
import { motion } from "framer-motion";
import { 
  Zap, 
  Timer, 
  BookOpen, 
  GraduationCap, 
  Calculator, 
  Languages, 
  Atom, 
  FlaskConical, 
  Dna, 
  TrendingUp, 
  Landmark, 
  Scroll,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { buttonPressVariants, staggerContainerVariants, staggerItemVariants } from "@/lib/animations";

interface Subject {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

export default function PracticePage() {
  const router = useRouter();
  
  // Tabs: JAMB / WAEC filter tabs at top with sliding indicator using layoutId
  const [activeExamTab, setActiveExamTab] = useState<"JAMB" | "WAEC">("JAMB");
  
  // Two mode buttons: Quick 20 Qs (practice) and Full mock 2h (mock)
  const [activeMode, setActiveMode] = useState<"practice" | "mock">("practice");

  // Fetch subjects from GET /api/subjects
  const { data: subjects, isLoading, error } = useQuery<Subject[]>({
    queryKey: ["subjectsList"],
    queryFn: async () => {
      const res = await fetch("/api/subjects");
      if (!res.ok) throw new Error("Failed to load subjects.");
      const json = await res.json();
      return json.data || json;
    }
  });

  // Resolve custom icons based on subject name
  const getSubjectIcon = (name: string) => {
    const lowercase = name.toLowerCase();
    if (lowercase.includes("math")) return Calculator;
    if (lowercase.includes("english") || lowercase.includes("lang")) return Languages;
    if (lowercase.includes("physic")) return Atom;
    if (lowercase.includes("chem")) return FlaskConical;
    if (lowercase.includes("biol")) return Dna;
    if (lowercase.includes("econ")) return TrendingUp;
    if (lowercase.includes("gov") || lowercase.includes("civic")) return Landmark;
    if (lowercase.includes("hist") || lowercase.includes("lit")) return Scroll;
    return BookOpen;
  };

  // Mocked question count per subject to display high-fidelity detail
  const getQuestionCount = (code: string) => {
    const seed = code.charCodeAt(0) + (code.charCodeAt(1) || 0);
    return 1000 + (seed % 10) * 150;
  };

  const handleStartExam = (subjectId: string) => {
    // Navigate to /exam/new?subject=[id]&mode=[mode]&examType=[type]
    router.push(`/exam/new?subject=${subjectId}&mode=${activeMode}&examType=${activeExamTab}`);
  };

  return (
    <AppLayout>
      <PageTransition className="space-y-6">
        
        {/* Top Controls: Tabs & Modes */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-4 border-b border-white/5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Practice Center
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select your exam type, study mode, and choose a subject to begin.
            </p>
          </div>

          {/* JAMB / WAEC sliding tabs */}
          <div className="flex gap-2 p-1.5 bg-white/5 border border-white/5 rounded-2xl w-fit relative z-10">
            {(["JAMB", "WAEC"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveExamTab(tab)}
                className={`relative px-5 py-2.5 text-xs font-semibold rounded-xl transition-colors ${
                  activeExamTab === tab ? "text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {activeExamTab === tab && (
                  <motion.div
                    layoutId="activeExamTabIndicator"
                    className="absolute inset-0 bg-brand-primary rounded-xl z-0"
                    transition={{ type: "spring", stiffness: 380, damping: 26 }}
                  />
                )}
                <span className="relative z-10">{tab} UTME/SSCE</span>
              </button>
            ))}
          </div>
        </div>

        {/* Two study mode selection panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Quick Practice Mode Panel */}
          <div 
            onClick={() => setActiveMode("practice")}
            className={`glass-panel p-5 rounded-2xl border cursor-pointer flex items-start gap-4 transition-all duration-300 ${
              activeMode === "practice"
                ? "border-brand-primary ring-2 ring-brand-primary/20 scale-[1.01] glow-primary/5"
                : "border-white/5 hover:border-white/10 hover:bg-white/5"
            }`}
          >
            <div className={`p-3 rounded-xl ${activeMode === "practice" ? "bg-brand-primary text-white" : "bg-white/5 text-slate-400"}`}>
              <Zap size={22} className={activeMode === "practice" ? "animate-pulse" : ""} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-white">Quick Practice</h4>
                <span className="text-[9px] bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-2 py-0.5 rounded-full font-extrabold uppercase">
                  20 Qs
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Untimed practice run. Great for quick reviews, focus learning, and instant step-by-step explanations.
              </p>
            </div>
          </div>

          {/* Full Mock Exam Panel */}
          <div 
            onClick={() => setActiveMode("mock")}
            className={`glass-panel p-5 rounded-2xl border cursor-pointer flex items-start gap-4 transition-all duration-300 ${
              activeMode === "mock"
                ? "border-brand-purple ring-2 ring-brand-purple/20 scale-[1.01] glow-purple/5"
                : "border-white/5 hover:border-white/10 hover:bg-white/5"
            }`}
          >
            <div className={`p-3 rounded-xl ${activeMode === "mock" ? "bg-brand-purple text-white" : "bg-white/5 text-slate-400"}`}>
              <Timer size={22} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-white">Full Mock Simulator</h4>
                <span className="text-[9px] bg-brand-purple/10 text-brand-purple border border-brand-purple/20 px-2 py-0.5 rounded-full font-extrabold uppercase">
                  2 Hours
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Simulates real-world exam environments. Strict timers, randomized papers, and full dashboard analytics.
              </p>
            </div>
          </div>
        </div>

        {/* Subjects Card List with Stagger entrance */}
        <div className="pt-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <GraduationCap size={16} className="text-brand-primary" />
            <span>Select a Subject to Begin</span>
          </h3>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(n => (
                <Skeleton key={n} className="h-28 w-full rounded-2xl" />
              ))}
            </div>
          ) : (
            <motion.div 
              variants={staggerContainerVariants}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {subjects?.map((sub, idx) => {
                const SubjectIcon = getSubjectIcon(sub.name);
                const qCount = getQuestionCount(sub.code);
                
                return (
                  <motion.div
                    key={sub.id}
                    variants={staggerItemVariants}
                    onClick={() => handleStartExam(sub.id)}
                    whileHover={{ 
                      y: -3, 
                      borderColor: activeMode === "practice" ? "rgba(15, 110, 86, 0.25)" : "rgba(83, 74, 183, 0.25)",
                      boxShadow: "0 12px 30px rgba(0,0,0,0.15)"
                    }}
                    className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between cursor-pointer group transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className={`p-3 rounded-xl bg-white/5 text-slate-400 group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-colors`}>
                        <SubjectIcon size={20} />
                      </div>
                      
                      {/* Details */}
                      <div>
                        <h4 className="font-bold text-sm text-white group-hover:text-brand-soft transition-colors">
                          {sub.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {qCount} Questions Available &bull; {activeExamTab} syllabus
                        </p>
                      </div>
                    </div>

                    {/* Actions indicators */}
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] bg-white/5 text-slate-400 border border-white/5 px-2.5 py-1 rounded-lg font-bold">
                        Avg: 70%
                      </span>
                      
                      <div className="p-2 rounded-xl bg-white/5 text-slate-400 group-hover:text-white transition-all">
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>

      </PageTransition>
    </AppLayout>
  );
}
