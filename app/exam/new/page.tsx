"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useExamStore } from "@/lib/store/useExamStore";
import { motion } from "framer-motion";
import { buttonPressVariants } from "@/lib/animations";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";

function ExamNewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectId = searchParams.get("subject") || "";
  const mode = searchParams.get("mode") || "practice";
  const examType = searchParams.get("examType") || "JAMB";

  const { startExam } = useExamStore();
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const startNewSession = async () => {
    if (!subjectId) {
      setError("No subject was specified. Please go back and select a subject.");
      return;
    }

    setError(null);
    setRetrying(true);

    try {
      const response = await fetch("/api/exam/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subjectId,
          examType,
          mode,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to initialize the exam session.");
      }

      const { sessionId, questions, serverStartTime, timeLimitSeconds } = result.data || result;

      // Store details in Zustand exam store
      startExam(sessionId, questions, serverStartTime, timeLimitSeconds);

      // Redirect to /exam/[sessionId]
      router.push(`/exam/${sessionId}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while preparing your exam. Please check your network connection.");
    } finally {
      setRetrying(false);
    }
  };

  useEffect(() => {
    startNewSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, mode, examType]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#081810] text-white flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400 mx-auto shadow-lg">
          <AlertCircle size={32} />
        </div>
        
        <div className="space-y-2 max-w-md">
          <h2 className="text-xl font-bold">Preparation Failed</h2>
          <p className="text-sm text-slate-400 leading-relaxed">{error}</p>
        </div>

        <div className="flex gap-4 w-full max-w-xs">
          <button
            onClick={startNewSession}
            disabled={retrying}
            className="flex-1 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all text-xs disabled:opacity-70"
          >
            <RefreshCw size={14} className={retrying ? "animate-spin" : ""} />
            <span>Retry Connection</span>
          </button>
          
          <Link href="/practice" className="flex-1">
            <button className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold py-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1">
              <ArrowLeft size={14} />
              <span>Practice Center</span>
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#081810] text-white flex flex-col items-center justify-center p-6 space-y-6">
      {/* Brand logo loader */}
      <div className="space-y-4 text-center">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-16 h-16 rounded-3xl bg-brand-primary flex items-center justify-center text-white font-black text-3xl mx-auto shadow-2xl shadow-brand-primary/30"
        >
          N
        </motion.div>
        
        <div className="space-y-1">
          <h3 className="font-bold text-base tracking-wide">Preparing Exam Paper</h3>
          <p className="text-xs text-brand-soft/70">Assembling syllabus questions and timer...</p>
        </div>

        {/* Loading Dots */}
        <div className="flex items-center justify-center gap-1.5 pt-2">
          <span className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

export default function ExamNewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#081810] text-white flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center font-bold text-lg animate-pulse mx-auto">N</div>
          <p className="text-xs text-slate-500">Loading...</p>
        </div>
      </div>
    }>
      <ExamNewContent />
    </Suspense>
  );
}
