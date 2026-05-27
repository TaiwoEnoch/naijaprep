"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import PageTransition from "@/components/ui/PageTransition";
import Skeleton from "@/components/ui/Skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, 
  X, 
  BookOpen, 
  ArrowLeft, 
  HelpCircle,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { buttonPressVariants } from "@/lib/animations";

interface QuestionDetails {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
  year?: number | null;
  image_url?: string | null;
}

interface ExamAnswer {
  question_id: string;
  chosen_option: "A" | "B" | "C" | "D" | null;
  is_correct: boolean | null;
  is_flagged: boolean;
  questions: QuestionDetails;
}

type FilterType = "all" | "correct" | "wrong";

export default function ExamReviewPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // Fetch results to get answers
  const { data: resultsData, isLoading, error } = useQuery({
    queryKey: ["examResults", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/exam/${sessionId}/results`);
      if (!res.ok) throw new Error("Failed to load results for review.");
      const json = await res.json();
      return json.data || json;
    },
  });

  if (error) {
    return (
      <AppLayout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold">Failed to load exam review</h2>
          <p className="text-sm text-slate-400 max-w-sm">
            We couldn't retrieve your answer attempts. Please check your network connection.
          </p>
          <Link href={`/exam/${sessionId}/results`}>
            <button className="bg-brand-primary hover:bg-brand-primary/90 text-white font-bold px-6 py-2.5 rounded-xl text-xs">
              Back to Results
            </button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  if (isLoading || !resultsData) {
    return (
      <AppLayout>
        <div className="space-y-6 max-w-2xl mx-auto py-8">
          <Skeleton className="h-10 w-48 rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-20 rounded-lg" />
          </div>
          {[1, 2, 3].map(n => (
            <Skeleton key={n} className="h-56 w-full rounded-2xl" />
          ))}
        </div>
      </AppLayout>
    );
  }

  const { session, answers } = resultsData as { session: any; answers: ExamAnswer[] };

  // Filter logic
  const filteredAnswers = answers.filter((ans) => {
    if (activeFilter === "correct") return ans.is_correct === true;
    if (activeFilter === "wrong") return ans.is_correct === false || ans.chosen_option === null;
    return true; // "all"
  });

  return (
    <AppLayout>
      <PageTransition className="max-w-2xl mx-auto py-6 space-y-6">
        
        {/* Header navigation back */}
        <div className="flex items-center gap-3">
          <Link href={`/exam/${sessionId}/results`}>
            <motion.button
              variants={buttonPressVariants}
              whileTap="tap"
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
            </motion.button>
          </Link>
          <div>
            <h2 className="text-xl font-bold text-white">Review Answers</h2>
            <p className="text-xs text-slate-400">
              Exam taken on {new Date(session.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}
            </p>
          </div>
        </div>

        {/* Filter Tabs Row */}
        <div className="flex p-1 bg-white/5 border border-white/5 rounded-xl w-fit relative z-10">
          {[
            { id: "all", label: "All Questions" },
            { id: "correct", label: "Correct" },
            { id: "wrong", label: "Incorrect / Skipped" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as FilterType)}
              className={`relative px-4 py-2 text-xs font-semibold rounded-lg capitalize transition-colors ${
                activeFilter === tab.id ? "text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {activeFilter === tab.id && (
                <motion.div
                  layoutId="activeFilterIndicator"
                  className="absolute inset-0 bg-brand-primary rounded-lg z-0"
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Answer Cards List */}
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {filteredAnswers.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-panel p-12 text-center text-slate-500 rounded-2xl border border-white/5"
              >
                No questions found matching this filter.
              </motion.div>
            ) : (
              filteredAnswers.map((item, idx) => {
                const q = item.questions;
                const studentAnswer = item.chosen_option;
                const isCorrect = item.is_correct;
                const correctOption = q.correct_option;

                return (
                  <motion.div
                    key={item.question_id}
                    layout="position"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="glass-panel p-6 rounded-2xl border border-white/5 space-y-5 relative overflow-hidden"
                  >
                    {/* Badge top right */}
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                        Question {answers.indexOf(item) + 1}
                      </span>
                      {studentAnswer === null ? (
                        <span className="text-[10px] font-bold text-slate-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Unanswered
                        </span>
                      ) : isCorrect ? (
                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Correct
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Incorrect
                        </span>
                      )}
                    </div>

                    {/* Question text */}
                    <div className="space-y-2">
                      {q.year && (
                        <span className="text-[9px] uppercase font-bold tracking-widest text-brand-soft">
                          Year {q.year}
                        </span>
                      )}
                      <p className="text-sm font-semibold text-white leading-relaxed">
                        {q.question_text}
                      </p>
                      {q.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={q.image_url} 
                          alt="Question graphic" 
                          className="max-h-48 rounded-xl border border-white/10 mt-2"
                        />
                      )}
                    </div>

                    {/* Options list */}
                    <div className="space-y-2.5">
                      {[
                        { key: "A", text: q.option_a },
                        { key: "B", text: q.option_b },
                        { key: "C", text: q.option_c },
                        { key: "D", text: q.option_d },
                      ].map((opt) => {
                        const isCorrectOpt = opt.key === correctOption;
                        const isStudentWrongOpt = opt.key === studentAnswer && !isCorrect;

                        return (
                          <div
                            key={opt.key}
                            className={`p-3.5 rounded-xl border relative overflow-hidden z-0 flex items-center justify-between transition-all ${
                              isCorrectOpt
                                ? "border-emerald-500/30 text-white font-semibold"
                                : isStudentWrongOpt
                                ? "border-red-500/30 text-white"
                                : "bg-white/5 border-white/5 text-slate-400"
                            }`}
                          >
                            {/* Green sweep fill from left for correct choice */}
                            {isCorrectOpt && (
                              <motion.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                style={{ originX: 0 }}
                                className="absolute inset-0 bg-emerald-600/10 -z-10"
                              />
                            )}

                            {/* Red fill for student wrong choice */}
                            {isStudentWrongOpt && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                                className="absolute inset-0 bg-red-600/10 -z-10"
                              />
                            )}

                            {/* Content */}
                            <div className="flex items-center gap-3 relative z-10">
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold border ${
                                isCorrectOpt 
                                  ? "bg-emerald-600 border-emerald-500 text-white" 
                                  : isStudentWrongOpt
                                  ? "bg-red-600 border-red-500 text-white"
                                  : "bg-white/10 border-white/5 text-slate-400"
                              }`}>
                                {opt.key}
                              </span>
                              <span className="text-xs">{opt.text}</span>
                            </div>

                            {/* Drawing Icons */}
                            {isCorrectOpt && (
                              <div className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center text-white relative z-10 shrink-0">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                                  {/* SVG Checkmark draws in */}
                                  <motion.path
                                    d="M20 6L9 17L4 12"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                  />
                                </svg>
                              </div>
                            )}

                            {isStudentWrongOpt && (
                              <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-white relative z-10 shrink-0">
                                <motion.svg 
                                  initial={{ rotate: -45 }}
                                  animate={{ rotate: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="w-3.5 h-3.5" 
                                  viewBox="0 0 24 24" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  strokeWidth="4"
                                >
                                  {/* SVG X draws in */}
                                  <motion.path
                                    d="M18 6L6 18M6 6l12 12"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                  />
                                </motion.svg>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom action: Explain this answer */}
                    <div className="flex justify-end pt-2 border-t border-white/5">
                      <Link href={`/exam/${sessionId}/explain/${q.id}`}>
                        <motion.button
                          variants={buttonPressVariants}
                          whileTap="tap"
                          className="bg-brand-purple/10 border border-brand-purple/20 text-brand-soft text-[10.5px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-brand-purple hover:text-white transition-all"
                        >
                          <BookOpen size={12} />
                          <span>Explain this answer</span>
                        </motion.button>
                      </Link>
                    </div>

                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

      </PageTransition>
    </AppLayout>
  );
}
