"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store/useAppStore";
import Skeleton from "@/components/ui/Skeleton";
import { buttonPressVariants } from "@/lib/animations";
import { useSpring, animated } from "react-spring";
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  BookOpen, 
  Target, 
  GraduationCap, 
  ChevronRight,
  TrendingUp
} from "lucide-react";

interface Subject {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const params = useParams();
  const step = (params.step as string) || "exam";

  const supabase = createClient();
  const { user, setUser } = useAppStore();

  // Onboarding local state (to persist across client steps)
  const [selectedExam, setSelectedExam] = useState<string>("JAMB");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [targetScore, setTargetScore] = useState<number>(280);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch subjects from /api/subjects
  useEffect(() => {
    if (step === "subjects") {
      setLoadingSubjects(true);
      fetch("/api/subjects")
        .then(res => {
          if (!res.ok) throw new Error("Failed to load subjects");
          return res.json();
        })
        .then(data => {
          setSubjects(data.data || data); // handle standard wrappers
        })
        .catch(err => {
          console.error(err);
          // Fallback static subjects if offline/failed
          setSubjects([
            { id: "sub-1", name: "Mathematics", code: "MTH", is_active: true },
            { id: "sub-2", name: "English Language", code: "ENG", is_active: true },
            { id: "sub-3", name: "Physics", code: "PHY", is_active: true },
            { id: "sub-4", name: "Chemistry", code: "CHM", is_active: true },
            { id: "sub-5", name: "Biology", code: "BIO", is_active: true },
            { id: "sub-6", name: "Economics", code: "ECN", is_active: true },
            { id: "sub-7", name: "Government", code: "GOV", is_active: true },
            { id: "sub-8", name: "Literature-in-English", code: "LIT", is_active: true },
          ]);
        })
        .finally(() => setLoadingSubjects(false));
    }
  }, [step]);

  // Spring physics for target score label scale and display lag
  const springProps = useSpring({
    val: targetScore,
    config: { tension: 120, friction: 14 }
  });

  const handleSelectExam = (exam: string) => {
    setSelectedExam(exam);
  };

  const handleToggleSubject = (subjectId: string) => {
    if (selectedSubjects.includes(subjectId)) {
      setSelectedSubjects(prev => prev.filter(id => id !== subjectId));
    } else {
      setSelectedSubjects(prev => [...prev, subjectId]);
    }
  };

  const handleNextStep = () => {
    if (step === "exam") {
      router.push("/onboarding/subjects");
    } else if (step === "subjects") {
      if (selectedSubjects.length === 0) {
        setError("Please select at least one subject to continue.");
        return;
      }
      setError(null);
      router.push("/onboarding/target");
    }
  };

  const handlePrevStep = () => {
    if (step === "subjects") {
      router.push("/onboarding/exam");
    } else if (step === "target") {
      router.push("/onboarding/subjects");
    }
  };

  const handleComplete = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        throw new Error("No active session. Please sign in again.");
      }

      // 1. Save preferences using PUT request to /api/user/profile
      const profileRes = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          examTypes: [selectedExam],
          targetScore: targetScore,
        }),
      });

      if (!profileRes.ok) {
        const errResult = await profileRes.json();
        throw new Error(errResult.error || "Failed to update profile statistics.");
      }

      // 2. Save user subjects mapping into user_subjects table in Supabase
      // First, clear previous options
      await supabase
        .from("user_subjects")
        .delete()
        .eq("user_id", session.user.id);

      // Next, insert newly selected ones
      if (selectedSubjects.length > 0) {
        const inserts = selectedSubjects.map(subId => ({
          user_id: session.user.id,
          subject_id: subId,
          exam_type: selectedExam,
        }));
        
        const { error: dbError } = await supabase
          .from("user_subjects")
          .insert(inserts);

        if (dbError) throw dbError;
      }

      // 3. Update Zustand Store user session values
      if (user) {
        setUser({
          ...user,
          examType: selectedExam as any,
        });
      }

      // 4. Redirect to Dashboard
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save settings. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Step variables
  const stepPercentage = step === "exam" ? "33%" : step === "subjects" ? "66%" : "100%";

  return (
    <div className="min-h-screen bg-[#081810] text-white font-sans flex flex-col justify-between relative overflow-hidden">
      
      {/* 6 floating blurred circles behind all content */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[400px] h-[400px] rounded-full bg-[rgba(29,158,117,0.06)] filter blur-[60px] top-[-100px] left-[-100px] animate-float-1" />
        <div className="absolute w-[300px] h-[300px] rounded-full bg-[rgba(83,74,183,0.04)] filter blur-[60px] top-[-50px] right-[-50px] animate-float-2" />
        <div className="absolute w-[350px] h-[350px] rounded-full bg-[rgba(83,74,183,0.04)] filter blur-[60px] bottom-[-100px] right-[-100px] animate-float-4" />
      </div>

      {/* Header progress bar wrapper */}
      <header className="relative z-10 w-full bg-[#081c15] border-b border-white/5 py-4 px-6">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button 
            onClick={handlePrevStep}
            disabled={step === "exam"}
            className="text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-soft">
            Onboarding: Step {step === "exam" ? "1" : step === "subjects" ? "2" : "3"} of 3
          </span>

          <div className="w-5" />
        </div>
        
        {/* Progress bar smooth animate */}
        <div className="max-w-xl mx-auto h-1.5 bg-white/10 rounded-full mt-4 overflow-hidden">
          <motion.div 
            initial={{ width: "0%" }}
            animate={{ width: stepPercentage }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-full bg-brand-primary rounded-full"
          />
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-xl w-full mx-auto px-6 py-10 flex flex-col justify-center">
        
        {/* AnimatePresence wrappers to slide left out and slide in from right */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="space-y-8"
          >
            
            {/* Header Titles */}
            <div className="text-center space-y-2">
              {step === "exam" && (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary flex items-center justify-center text-white font-extrabold mx-auto shadow-md">
                    <GraduationCap size={24} />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">Choose your Target Exam</h2>
                  <p className="text-xs text-slate-400">
                    We will customize your mock tests and planners to fit this exam's syllabus.
                  </p>
                </>
              )}

              {step === "subjects" && (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-brand-purple flex items-center justify-center text-white font-extrabold mx-auto shadow-md">
                    <BookOpen size={24} />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">Select your Subjects</h2>
                  <p className="text-xs text-slate-400">
                    Pick the subjects you will write in your upcoming exam (min 1).
                  </p>
                </>
              )}

              {step === "target" && (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white font-extrabold mx-auto shadow-md">
                    <Target size={24} />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">Set your Target Score</h2>
                  <p className="text-xs text-slate-400">
                    Set a benchmark. We will adapt your learning tasks to help you reach this goal.
                  </p>
                </>
              )}
            </div>

            {/* Error messaging */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs text-center">
                {error}
              </div>
            )}

            {/* STEP 1: EXAM SELECT */}
            {step === "exam" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: "JAMB", title: "JAMB UTME", desc: "Unified Tertiary Matriculation Exam" },
                  { id: "WAEC", title: "WAEC SSCE", desc: "Senior School Certificate Exam" },
                  { id: "NECO", title: "NECO SSCE", desc: "National Examinations Council Exam" },
                ].map(item => {
                  const isSelected = selectedExam === item.id;
                  return (
                    <motion.div
                      key={item.id}
                      onClick={() => handleSelectExam(item.id)}
                      whileTap={{ scale: 0.97 }}
                      className={`glass-panel p-5 rounded-2xl border cursor-pointer flex flex-col justify-between h-40 transition-all ${
                        isSelected 
                          ? "border-brand-primary ring-2 ring-brand-primary/20 scale-105"
                          : "border-white/5 hover:border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-extrabold tracking-wider text-xs bg-white/10 px-2.5 py-1 rounded-md text-brand-soft">
                          {item.id}
                        </span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-brand-primary flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm">{item.title}</h4>
                        <p className="text-[10px] text-slate-400 leading-normal">{item.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* STEP 2: SUBJECTS SELECT */}
            {step === "subjects" && (
              <div className="space-y-4">
                {loadingSubjects ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <Skeleton key={n} className="h-12 w-full rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                    {subjects.map(sub => {
                      const isSelected = selectedSubjects.includes(sub.id);
                      return (
                        <motion.button
                          key={sub.id}
                          type="button"
                          onClick={() => handleToggleSubject(sub.id)}
                          whileTap={{ scale: 0.96 }}
                          className={`p-3 rounded-xl border flex items-center justify-between text-left text-xs font-semibold transition-all ${
                            isSelected
                              ? "bg-brand-primary border-brand-primary text-white shadow-md shadow-brand-primary/20"
                              : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                          }`}
                        >
                          <span className="truncate pr-2">{sub.name}</span>
                          
                          {/* Checked Chip animation scale */}
                          <AnimatePresence>
                            {isSelected && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0"
                              >
                                <Check size={10} className="text-white" />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: SCORE TARGET SLIDER */}
            {step === "target" && (
              <div className="glass-panel p-8 rounded-2xl border border-white/5 space-y-8 flex flex-col items-center">
                <div className="text-center">
                  {/* Springy scale interpolated score target text */}
                  <animated.div className="text-6xl font-extrabold tracking-tight text-brand-primary">
                    {springProps.val.to(v => Math.round(v))}
                  </animated.div>
                  <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-bold">
                    Target Score out of 400
                  </p>
                </div>

                <div className="w-full space-y-2">
                  <input
                    type="range"
                    min={180}
                    max={400}
                    step={5}
                    value={targetScore}
                    onChange={e => setTargetScore(Number(e.target.value))}
                    className="w-full h-2 bg-white/10 accent-brand-primary rounded-lg appearance-none cursor-pointer focus:outline-none"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                    <span>180 (Pass)</span>
                    <span>290 (Merit)</span>
                    <span>400 (Perfect)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-brand-primary/10 border border-brand-primary/20 p-4 rounded-xl text-xs text-brand-soft leading-normal">
                  <TrendingUp size={22} className="shrink-0" />
                  <span>Aiming for {targetScore} places you in the top 10% of candidates. We will tailor your revision plan accordingly.</span>
                </div>
              </div>
            )}

            {/* Step navigation triggers */}
            <div className="pt-4 flex gap-4">
              {step !== "exam" && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl border border-white/10 transition-colors text-sm"
                >
                  Back
                </button>
              )}
              
              {step !== "target" ? (
                <motion.button
                  type="button"
                  onClick={handleNextStep}
                  variants={buttonPressVariants}
                  whileTap="tap"
                  className="flex-1 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-brand-primary/20 text-sm transition-all"
                >
                  <span>Continue</span>
                  <ChevronRight size={16} />
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  disabled={submitting}
                  onClick={handleComplete}
                  variants={buttonPressVariants}
                  whileTap="tap"
                  className="flex-1 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-brand-primary/20 disabled:opacity-75 text-sm transition-all"
                >
                  {submitting ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Complete Setup</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </motion.button>
              )}
            </div>

          </motion.div>
        </AnimatePresence>

      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-6 text-center text-xs text-slate-500 border-t border-white/5 bg-[#081c15]/30">
        &copy; {new Date().getFullYear()} NaijaPrep. All rights reserved.
      </footer>

    </div>
  );
}
