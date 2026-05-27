"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useExamStore } from "@/lib/store/useExamStore";
import { db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import { buttonPressVariants, shakeVariants } from "@/lib/animations";
import { 
  Timer, 
  Flag, 
  Grid, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Wifi, 
  WifiOff, 
  ShieldAlert
} from "lucide-react";

export default function ActiveExamPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const {
    questions,
    serverStartTime,
    timeLimitSeconds,
    currentQuestionIndex,
    answers,
    flagged,
    integrityFlags,
    setAnswer,
    toggleFlag,
    incrementIntegrityFlags,
    setCurrentQuestionIndex,
    clearExam,
  } = useExamStore();

  const [timeLeft, setTimeLeft] = useState(timeLimitSeconds);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Offline banner states
  const [online, setOnline] = useState(true);
  const [showStatusBanner, setShowStatusBanner] = useState(false);
  const [bannerType, setBannerType] = useState<"online" | "offline">("online");

  // Sync initial timer state
  useEffect(() => {
    if (!serverStartTime || timeLimitSeconds === 0) {
      // In case Zustand store is wiped by reload, attempt database recovery
      fetch(`/api/exam/${sessionId}/results`)
        .then(res => res.json())
        .then(data => {
          const s = data.data?.session || data.session;
          if (s) {
            // Re-inflate Zustand exam store dynamically
            const answersObj: Record<string, string> = {};
            const flaggedObj: Record<string, boolean> = {};
            
            const rawAnswers = data.data?.answers || data.answers || [];
            rawAnswers.forEach((ans: any) => {
              if (ans.chosen_option) answersObj[ans.question_id] = ans.chosen_option;
              if (ans.is_flagged) flaggedObj[ans.question_id] = ans.is_flagged;
            });
            
            // Map questions
            const qList = rawAnswers.map((ans: any) => ({
              id: ans.questions.id,
              question_text: ans.questions.question_text,
              option_a: ans.questions.option_a,
              option_b: ans.questions.option_b,
              option_c: ans.questions.option_c,
              option_d: ans.questions.option_d,
            }));

            useExamStore.setState({
              sessionId: s.id,
              questions: qList,
              serverStartTime: s.server_start_time,
              timeLimitSeconds: s.time_limit_seconds,
              answers: answersObj,
              flagged: flaggedObj,
            });
          }
        })
        .catch(() => {
          // If totally invalid, redirect
          router.push("/practice");
        });
      return;
    }
  }, [sessionId, serverStartTime, timeLimitSeconds, router]);

  // Timer interval updates (derived from serverStartTime)
  useEffect(() => {
    if (!serverStartTime || timeLimitSeconds === 0) return;

    const updateTimer = () => {
      const elapsed = (Date.now() - new Date(serverStartTime).getTime()) / 1000;
      const remaining = Math.max(0, timeLimitSeconds - elapsed);
      setTimeLeft(Math.floor(remaining));

      if (remaining <= 0) {
        clearInterval(timerInterval);
        handleAutoSubmit();
      }
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverStartTime, timeLimitSeconds]);

  // Network monitor for banner
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleOnline = () => {
        setOnline(true);
        setBannerType("online");
        setShowStatusBanner(true);
        const timer = setTimeout(() => setShowStatusBanner(false), 2500);
        return () => clearTimeout(timer);
      };
      
      const handleOffline = () => {
        setOnline(false);
        setBannerType("offline");
        setShowStatusBanner(true);
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      setOnline(window.navigator.onLine);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  // Tab switch detection: increment integrity flags in Zustand
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        incrementIntegrityFlags();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [incrementIntegrityFlags]);

  // Auto-submit triggers when tab switches reach 4
  useEffect(() => {
    if (integrityFlags >= 4) {
      handleAutoSubmit("Integrity violation limit reached (switching screens is prohibited). Exam submitted automatically.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrityFlags]);

  const handleAutoSubmit = async (reason = "Exam session time limit expired. Finalizing answers...") => {
    alert(reason);
    await executeSubmission();
  };

  const executeSubmission = async () => {
    setSubmitting(true);
    try {
      // Finalize answers by calling POST /api/exam/submit
      const response = await fetch("/api/exam/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          answers,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to submit exam.");
      }

      // Clean local answers from IndexedDB to conserve storage
      await db.offlineAnswers.where("sessionId").equals(sessionId).delete();

      // Clear Zustand exam cache
      clearExam();

      // Redirect to Results
      router.push(`/exam/${sessionId}/results`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to submit exam. Please try again. Your answers remain cached locally.");
      setSubmitting(false);
    }
  };

  const handleAnswerSelect = async (optionChar: "A" | "B" | "C" | "D") => {
    if (questions.length === 0) return;
    const currentQ = questions[currentQuestionIndex];
    const isCurrentlyFlagged = flagged[currentQ.id] || false;

    // Step 1: Update Zustand immediately for instant UI
    setAnswer(currentQ.id, optionChar);

    // Step 2: Save to IndexedDB using Dexie
    try {
      await db.offlineAnswers.put({
        sessionId,
        questionId: currentQ.id,
        chosenOption: optionChar,
        isFlagged: isCurrentlyFlagged,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error("Failed to write answer locally to IndexedDB:", err);
    }

    // Step 3: Call POST /api/exam/answer in background — do not await in UI thread
    fetch("/api/exam/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        questionId: currentQ.id,
        chosenOption: optionChar,
        isFlagged: isCurrentlyFlagged,
      }),
    }).catch(err => {
      console.warn("Background sync of answer failed (saved offline locally):", err);
    });
  };

  const handleToggleFlag = async () => {
    if (questions.length === 0) return;
    const currentQ = questions[currentQuestionIndex];
    const newFlaggedState = !flagged[currentQ.id];

    // Toggle Zustand
    toggleFlag(currentQ.id);

    // Update in IndexedDB
    try {
      const existing = await db.offlineAnswers.where({ sessionId, questionId: currentQ.id }).first();
      if (existing?.id) {
        await db.offlineAnswers.update(existing.id, { isFlagged: newFlaggedState });
      }
    } catch (err) {
      console.error("Failed to toggle flag state locally:", err);
    }

    // Update API in background
    const chosenOption = answers[currentQ.id];
    if (chosenOption) {
      fetch("/api/exam/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: currentQ.id,
          chosenOption,
          isFlagged: newFlaggedState,
        }),
      }).catch(() => {});
    }
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#081810] text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-brand-primary animate-spin flex items-center justify-center font-bold text-lg mx-auto">N</div>
          <p className="text-xs text-slate-500">Initializing Exam Session...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const selectedOption = answers[currentQuestion.id] || "";
  const isQuestionFlagged = flagged[currentQuestion.id] || false;

  // Formatting remaining time: MM:SS or HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    if (hours > 0) return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
    return `${pad(mins)}:${pad(secs)}`;
  };

  // Timer alerts configuration
  const isUnder5Min = timeLeft < 300;
  const isUnder1Min = timeLeft < 60;

  // Progress Bar percentage calculation
  const totalAnsweredCount = Object.keys(answers).length;
  const examProgressPercent = (totalAnsweredCount / questions.length) * 100;
  const unansweredCount = questions.length - totalAnsweredCount;

  return (
    <div className={`min-h-screen text-white font-sans flex flex-col justify-between relative overflow-hidden select-none ${
      isUnder1Min ? "bg-red-950/20 animate-pulse duration-[800ms]" : "bg-[#081810]"
    }`}>
      
      {/* 6 floating blurred circles behind content */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[400px] h-[400px] rounded-full bg-[rgba(29,158,117,0.04)] filter blur-[60px] top-[-100px] left-[-100px] animate-float-1" />
        <div className="absolute w-[350px] h-[350px] rounded-full bg-[rgba(83,74,183,0.03)] filter blur-[60px] bottom-[-100px] right-[-100px] animate-float-4" />
      </div>

      {/* Dynamic Offline/Online banner */}
      <AnimatePresence>
        {showStatusBanner && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className={`fixed top-0 left-0 right-0 z-50 text-center py-2 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md ${
              bannerType === "online" ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
            }`}
          >
            {bannerType === "online" ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{bannerType === "online" ? "Back online. Syncing results..." : "You are offline. Caching answers locally."}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Integrity Flags Toast Warning banner */}
      {integrityFlags > 0 && integrityFlags < 4 && (
        <div className="fixed top-3 right-3 z-50 max-w-sm bg-amber-500/10 border border-amber-500/30 text-amber-500 p-4 rounded-xl flex items-start gap-3 shadow-2xl backdrop-blur-xl animate-[shake_0.4s_ease-in-out]">
          <ShieldAlert size={20} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-xs">Integrity Warning ({integrityFlags}/3)</h4>
            <p className="text-[10.5px] leading-relaxed text-slate-300">
              Exam security rules prohibit leaving this window. Switching screens again will result in automatic submission.
            </p>
          </div>
        </div>
      )}

      {/* Header section */}
      <header className="relative z-10 w-full bg-[#081c15] border-b border-white/5 py-3.5 px-6 flex items-center justify-between">
        
        {/* Timer Pill Left */}
        <div className="flex items-center gap-2">
          <div className={`px-4 py-2 rounded-xl flex items-center gap-2 border font-extrabold text-sm ${
            isUnder1Min 
              ? "bg-red-500/10 border-red-500/30 text-red-500 animate-ping duration-[700ms]"
              : isUnder5Min
              ? "bg-amber-500/10 border-amber-500/30 text-amber-500 animate-pulse"
              : "bg-white/5 border-white/10 text-white"
          }`}>
            <Timer size={16} />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Counter Center */}
        <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Question {currentQuestionIndex + 1} of {questions.length}
        </div>

        {/* Actions Right */}
        <div className="flex items-center gap-3">
          {/* Flag Toggle Button with Amber Spring bounce */}
          <motion.button
            onClick={handleToggleFlag}
            animate={isQuestionFlagged ? "flagged" : "unflagged"}
            variants={{
              unflagged: { scale: 1, color: "rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.05)" },
              flagged: { scale: 1.15, color: "#D97706", backgroundColor: "rgba(217,119,6,0.15)" }
            }}
            transition={{ type: "spring", stiffness: 350, damping: 12 }}
            className="p-2.5 rounded-xl border border-white/10 flex items-center justify-center"
          >
            <Flag size={18} className={isQuestionFlagged ? "fill-amber-500" : ""} />
          </motion.button>

          {/* Grid Navigator Panel Trigger */}
          <button
            onClick={() => setIsNavigatorOpen(true)}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <Grid size={18} />
          </button>
        </div>
      </header>

      {/* Progress track */}
      <div className="relative w-full h-1 bg-white/5 z-10">
        <motion.div
          animate={{ width: `${examProgressPercent}%` }}
          transition={{ duration: 0.3 }}
          className="h-full bg-brand-primary"
        />
      </div>

      {/* Main Question Body Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-2xl w-full mx-auto px-6 py-8">
        
        {/* Slide transitions between questions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="w-full space-y-8"
          >
            
            {/* Question Text */}
            <div className="space-y-4">
              {currentQuestion.year && (
                <span className="text-[10px] uppercase font-bold tracking-widest bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-md text-brand-soft">
                  Year {currentQuestion.year}
                </span>
              )}
              
              <h2 className="text-lg font-semibold leading-relaxed text-white">
                {currentQuestion.question_text}
              </h2>

              {currentQuestion.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={currentQuestion.image_url} 
                  alt="Question graphic" 
                  className="max-h-64 rounded-xl border border-white/10 mx-auto" 
                />
              )}
            </div>

            {/* Options list */}
            <div className="space-y-3">
              {[
                { key: "A", label: currentQuestion.option_a },
                { key: "B", label: currentQuestion.option_b },
                { key: "C", label: currentQuestion.option_c },
                { key: "D", label: currentQuestion.option_d },
              ].map(opt => {
                const isSelected = selectedOption === opt.key;
                const isAnySelected = selectedOption !== "";
                const opacity = isAnySelected && !isSelected ? 0.7 : 1.0;
                
                return (
                  <motion.div
                    key={opt.key}
                    onClick={() => handleAnswerSelect(opt.key as any)}
                    whileTap={{ scale: 0.98 }}
                    animate={{ 
                      scale: isSelected ? 1.01 : 1.0, 
                      opacity: opacity
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                      isSelected
                        ? "border-brand-primary bg-brand-primary/10 ring-2 ring-brand-primary/20 text-white font-semibold"
                        : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold border transition-colors ${
                        isSelected 
                          ? "bg-brand-primary border-brand-primary text-white" 
                          : "bg-white/10 border-white/5 text-slate-400"
                      }`}>
                        {opt.key}
                      </span>
                      <span className="text-sm">{opt.label}</span>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-brand-primary flex items-center justify-center text-white">
                        <Check size={12} className="stroke-[3px]" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

          </motion.div>
        </AnimatePresence>

      </main>

      {/* Bottom exam control triggers */}
      <footer className="relative z-10 w-full py-4 px-6 border-t border-white/5 bg-[#081c15]/40 flex items-center justify-between">
        
        <button
          onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
          disabled={currentQuestionIndex === 0}
          className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1.5"
        >
          <ChevronLeft size={16} />
          <span>Previous</span>
        </button>

        <button
          onClick={() => setIsSubmitModalOpen(true)}
          className="bg-brand-purple hover:bg-brand-purple/95 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-lg transition-colors"
        >
          Submit Exam
        </button>

        <button
          onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
          disabled={currentQuestionIndex === questions.length - 1}
          className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1.5"
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>
      </footer>

      {/* Grid Navigator Slide-Up panel */}
      <AnimatePresence>
        {isNavigatorOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNavigatorOpen(false)}
              className="fixed inset-0 bg-black z-40"
            />
            
            {/* Slide-Up Grid Panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto bg-[#08221b]/95 border-t border-white/10 rounded-t-3xl p-6 z-50 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <Grid size={16} className="text-brand-primary" />
                  <span>Exam Navigation</span>
                </h3>
                <button 
                  onClick={() => setIsNavigatorOpen(false)}
                  className="text-xs font-semibold text-brand-soft bg-brand-primary/10 border border-brand-primary/20 px-3 py-1 rounded-lg"
                >
                  Close
                </button>
              </div>

              {/* Grid indices */}
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                {questions.map((q, i) => {
                  const hasAns = !!answers[q.id];
                  const isFlag = !!flagged[q.id];
                  const isCur = currentQuestionIndex === i;

                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentQuestionIndex(i);
                        setIsNavigatorOpen(false);
                      }}
                      className={`h-11 rounded-xl text-xs font-bold flex flex-col items-center justify-center border transition-all ${
                        isCur
                          ? "border-brand-primary bg-brand-primary text-white scale-105"
                          : isFlag
                          ? "border-amber-500 bg-amber-500/10 text-amber-500"
                          : hasAns
                          ? "border-brand-primary/20 bg-brand-primary/10 text-brand-soft"
                          : "border-white/5 bg-white/5 text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      <span>{i + 1}</span>
                      {isFlag && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-0.5 animate-pulse" />}
                    </button>
                  );
                })}
              </div>

              {/* Legends keys */}
              <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 mt-6 border-t border-white/5 pt-4">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-brand-primary/10 border border-brand-primary/20" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500/10 border border-amber-500" />
                  <span>Flagged</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-white/5 border border-white/5" />
                  <span>Unanswered</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirmation Submit modal with spring */}
      <AnimatePresence>
        {isSubmitModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSubmitModalOpen(false)}
              className="fixed inset-0 bg-black z-40"
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 24 }}
              className="fixed inset-0 m-auto max-w-sm h-fit bg-[#08221b] border border-white/10 rounded-2xl p-6 z-50 shadow-2xl flex flex-col items-center text-center space-y-6"
            >
              <div className="w-12 h-12 rounded-full bg-brand-purple/10 border border-brand-purple/35 flex items-center justify-center text-brand-purple shadow-inner">
                <AlertTriangle size={24} className="animate-bounce" />
              </div>

              <div className="space-y-2">
                <h3 className="font-extrabold text-base">Submit Mock Exam?</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Are you sure you want to end this exam? You have left <span className="font-extrabold text-white">{unansweredCount}</span> questions unanswered.
                </p>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl border border-white/10 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeSubmission}
                  disabled={submitting}
                  className="flex-1 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold py-3 rounded-xl text-xs shadow-lg transition-all disabled:opacity-75"
                >
                  {submitting ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  ) : (
                    <span>Submit & Finish</span>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
