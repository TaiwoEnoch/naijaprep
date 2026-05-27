"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import PageTransition from "@/components/ui/PageTransition";
import Skeleton from "@/components/ui/Skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, 
  Sparkles, 
  Send, 
  BookOpen, 
  ArrowLeft, 
  Check, 
  X,
  MessageSquare,
  AlertTriangle,
  HelpCircle
} from "lucide-react";
import { buttonPressVariants } from "@/lib/animations";

interface SubjectMapping {
  id: string;
  name: string;
}

interface QuestionDetails {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
  subjects?: { name: string } | null;
}

interface ExplanationStep {
  num: string;
  content: string;
}

interface ChatMessage {
  sender: "student" | "ai";
  text: string;
}

export default function ExplanationPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const questionId = params.questionId as string;

  const [visibleStepCount, setVisibleStepCount] = useState(0);
  const [paying, setPaying] = useState(false);

  // Chat states
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // 1. Fetch AI Explanation
  const { data: explanationData, isLoading, error, status } = useQuery({
    queryKey: ["aiExplanation", questionId],
    queryFn: async () => {
      const res = await fetch(`/api/explanations/${questionId}`);
      if (!res.ok) {
        // Return custom error containing status to inspect plan access block (403)
        const json = await res.json();
        return { errorStatus: res.status, message: json.error || "Failed to load explanation." };
      }
      const json = await res.json();
      return json.data || json;
    },
    retry: false, // Don't retry automatically on 403 plan blocker
  });

  // 2. Fetch results (to know student answer context and details)
  const { data: resultsData } = useQuery({
    queryKey: ["examResults", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/exam/${sessionId}/results`);
      if (!res.ok) throw new Error("Failed to load session details.");
      const json = await res.json();
      return json.data || json;
    },
  });

  const studentAttempt = resultsData?.answers?.find((a: any) => a.question_id === questionId);
  const qDetails = studentAttempt?.questions as QuestionDetails || null;
  const studentChoice = studentAttempt?.chosen_option || null;
  const correctChoice = qDetails?.correct_option || null;

  // Split explanation into steps
  const parseExplanation = (text: string): { mainSteps: ExplanationStep[]; tipStep: ExplanationStep | null } => {
    if (!text) return { mainSteps: [], tipStep: null };
    
    // Split by sections starting with double newlines or numbered headers
    const parts = text.split(/(?:###\s+)?(\d+\.\s+)/g).filter(Boolean);
    const steps: ExplanationStep[] = [];
    let currentNum = "";
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (/^\d+\.$/.test(part) || /^\d+\.\s*$/.test(part)) {
        currentNum = part;
      } else {
        steps.push({
          num: currentNum || `${steps.length + 1}.`,
          content: part
        });
        currentNum = "";
      }
    }
    
    if (steps.length === 0) {
      // Fallback: split by double newlines
      const paras = text.split(/\n\n+/).map((para, idx) => ({
        num: `${idx + 1}.`,
        content: para.trim()
      }));
      
      const tip = paras.find(p => p.content.toLowerCase().includes("tip"));
      const main = paras.filter(p => p !== tip);
      return { mainSteps: main, tipStep: tip || null };
    }

    const tipStep = steps.find(s => s.content.toLowerCase().includes("tip") || s.num.startsWith("3"));
    const mainSteps = steps.filter(s => s !== tipStep);
    return { mainSteps, tipStep: tipStep || null };
  };

  const explanationRawText = explanationData?.explanation || "";
  const { mainSteps, tipStep } = parseExplanation(explanationRawText);

  // Trigger step-by-step reveal timer
  useEffect(() => {
    if (mainSteps.length === 0) return;
    setVisibleStepCount(0);
    
    const interval = setInterval(() => {
      setVisibleStepCount((prev) => {
        if (prev < mainSteps.length) {
          return prev + 1;
        } else {
          clearInterval(interval);
          return prev;
        }
      });
    }, 400);

    return () => clearInterval(interval);
  }, [mainSteps.length]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiTyping]);

  // Payment Initializer for free plan upgrade prompts (403 fallback)
  const handleUpgradePlan = async () => {
    setPaying(true);
    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "student",
          billingCycle: "monthly",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to initialize payment session.");
      }

      if (json.data?.authorizationUrl) {
        window.location.href = json.data.authorizationUrl;
      } else {
        throw new Error("Unable to contact payment gateway.");
      }
    } catch (err: any) {
      alert(err.message || "Something went wrong. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  // Follow-up chat submission
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isAiTyping) return;

    const studentMsg = inputValue.trim();
    setInputValue("");

    // Add student message
    setMessages((prev) => [...prev, { sender: "student", text: studentMsg }]);
    setIsAiTyping(true);

    // AI responder logic after 1.5s delay
    setTimeout(() => {
      let aiResponse = "";
      const lower = studentMsg.toLowerCase();
      const subjectName = qDetails?.subjects?.name || "this subject";

      if (lower.includes("why") || lower.includes("explain")) {
        aiResponse = `That makes sense! The core concept in ${subjectName} relates to identifying the correct relationship rule. When examiners test this topic, they look for whether you recognize these exact parameters. Let me know if you want me to break down any other option!`;
      } else if (lower.includes("formula") || lower.includes("math") || lower.includes("calculate")) {
        aiResponse = `For calculations in this area, you want to double check your negative signs. In JAMB/WAEC, standard multipliers are often used, so remember to align the terms carefully before evaluating.`;
      } else {
        aiResponse = `Good question! In ${subjectName}, this concept forms a key foundation. Remember that in exams, questions usually present distractors that sound similar, but you can always isolate the correct one by checking the rules we discussed in step 1.`;
      }

      setMessages((prev) => [...prev, { sender: "ai", text: aiResponse }]);
      setIsAiTyping(false);
    }, 1500);
  };

  // Check if query error status is 403 or errorStatus check
  const isProBlock = (explanationData as any)?.errorStatus === 403;

  if (isProBlock) {
    return (
      <AppLayout>
        <div className="min-h-[70vh] flex items-center justify-center p-6">
          <div className="glass-panel p-8 rounded-3xl border border-white/5 text-center max-w-md w-full space-y-6 shadow-2xl relative overflow-hidden">
            {/* Background design glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-brand-purple/10 rounded-full filter blur-2xl" />
            
            <div className="w-16 h-16 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple mx-auto shadow-lg relative z-10">
              <Zap size={32} className="fill-brand-purple animate-pulse" />
            </div>

            <div className="space-y-2 relative z-10">
              <h3 className="text-xl font-bold text-white">Unlock AI Explanations</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Step-by-step Claude explanation breakdown is a <span className="text-brand-purple font-extrabold">NaijaPrep Pro</span> feature. Upgrade now to get unlimited explanations, personalized follow-ups, and syllabus tips!
              </p>
            </div>

            {/* Teaser stats */}
            <div className="grid grid-cols-2 gap-3 py-2 text-left relative z-10">
              <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                <span className="block text-brand-primary font-black text-sm">Unlimited</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">AI Explanations</span>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                <span className="block text-brand-purple font-black text-sm">Claude 3.5</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">AI Tutor</span>
              </div>
            </div>

            <div className="space-y-3 pt-2 relative z-10">
              <button
                onClick={handleUpgradePlan}
                disabled={paying}
                className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white font-bold py-3.5 rounded-xl text-xs shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-75"
              >
                {paying ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap size={14} className="fill-white" />
                    <span>Upgrade to Pro (₦2,500/mo)</span>
                  </>
                )}
              </button>
              
              <Link href={`/exam/${sessionId}/review`} className="block text-slate-500 hover:text-slate-400 text-xs font-semibold">
                Go back to Review answers
              </Link>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageTransition className="max-w-2xl mx-auto py-6 space-y-6">
        
        {/* Header navigation */}
        <div className="flex items-center gap-3">
          <Link href={`/exam/${sessionId}/review`}>
            <motion.button
              variants={buttonPressVariants}
              whileTap="tap"
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
            </motion.button>
          </Link>
          <div>
            <h2 className="text-xl font-bold text-white">Explanation Overview</h2>
            <p className="text-xs text-slate-400">Master the core concepts behind the exam answer</p>
          </div>
        </div>

        {/* Purple banner: AI Explanation / Claude */}
        <div className="rounded-2xl bg-gradient-to-r from-[#534AB7] to-[#534AB7]/40 border border-brand-purple/20 p-5 relative overflow-hidden flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg">
            <Sparkles size={24} className="fill-white" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white">AI Explanation Tutor</h3>
            <p className="text-[11px] text-brand-soft/80">Step-by-step solution breakdown powered by Claude</p>
          </div>
        </div>

        {/* Question and answer recap card */}
        {qDetails && (
          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
            <p className="text-xs font-semibold text-slate-200 leading-relaxed">
              {qDetails.question_text}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              {/* Correct answer card */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400 font-semibold">
                <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px]">
                  {correctChoice}
                </span>
                <span className="truncate">Correct Option</span>
                <Check size={16} className="ml-auto shrink-0" />
              </div>

              {/* Student answer card */}
              <div className={`p-3 rounded-xl flex items-center gap-3 ${
                studentChoice === correctChoice
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold"
                  : studentChoice === null
                  ? "bg-white/5 border border-white/10 text-slate-400"
                  : "bg-red-500/10 border border-red-500/20 text-red-400 font-semibold"
              }`}>
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] ${
                  studentChoice === correctChoice
                    ? "bg-emerald-500 text-white"
                    : studentChoice === null
                    ? "bg-white/15 text-slate-400"
                    : "bg-red-500 text-white"
                }`}>
                  {studentChoice || "—"}
                </span>
                <span className="truncate">{studentChoice === null ? "Skipped" : "Your Answer"}</span>
                {studentChoice === correctChoice ? (
                  <Check size={16} className="ml-auto shrink-0" />
                ) : studentChoice === null ? (
                  <HelpCircle size={16} className="ml-auto shrink-0" />
                ) : (
                  <X size={16} className="ml-auto shrink-0" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step-by-step reveal steps list */}
        <div className="space-y-4 pt-2">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          ) : (
            <>
              {mainSteps.map((step, idx) => {
                const isVisible = idx < visibleStepCount;
                
                return (
                  <AnimatePresence key={idx}>
                    {isVisible && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex gap-4 items-start"
                      >
                        {/* Step number: scale from 0 to 1 with spring */}
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 15 }}
                          className="w-8 h-8 rounded-full bg-brand-primary/20 border border-brand-primary/40 text-brand-soft flex items-center justify-center font-bold text-xs shrink-0"
                        >
                          {step.num.replace(".", "")}
                        </motion.div>

                        {/* Content: slide in left + height animation */}
                        <motion.div
                          initial={{ opacity: 0, x: -20, height: 0 }}
                          animate={{ opacity: 1, x: 0, height: "auto" }}
                          transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
                          className="glass-panel p-4 rounded-2xl border border-white/5 flex-1 overflow-hidden"
                        >
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                            {step.content}
                          </p>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                );
              })}

              {/* Tip Box at end: bounces in with spring */}
              <AnimatePresence>
                {visibleStepCount === mainSteps.length && tipStep && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 220, damping: 14 }}
                    className="p-5 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 text-brand-soft flex gap-3.5 items-start"
                  >
                    <div className="w-8 h-8 rounded-lg bg-brand-purple/20 border border-brand-purple/30 flex items-center justify-center text-brand-soft shrink-0">
                      <Sparkles size={16} className="fill-brand-soft" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">Exam Strategy Tip</h4>
                      <p className="text-[11px] leading-relaxed text-slate-300">
                        {tipStep.content.replace(/^(###\s+\d+\.\s+)?(Exam Tip:?\s*)?/i, "")}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Follow up chat section */}
        {visibleStepCount === mainSteps.length && (
          <div className="pt-6 border-t border-white/5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MessageSquare size={14} className="text-brand-purple" />
              <span>Ask a Follow-up Question</span>
            </h3>

            {/* Chat message list area */}
            <div className="glass-panel p-4 rounded-2xl border border-white/5 max-h-[300px] overflow-y-auto space-y-3 flex flex-col">
              {messages.length === 0 && (
                <div className="text-center text-[11px] text-slate-500 py-6">
                  Need more clarification? Ask Claude details about this question below.
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: msg.sender === "student" ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs ${
                    msg.sender === "student"
                      ? "bg-brand-primary text-white self-end rounded-tr-none"
                      : "bg-white/5 border border-white/10 text-slate-300 self-start rounded-tl-none"
                  }`}
                >
                  {msg.text}
                </motion.div>
              ))}

              {/* AI typing indicator */}
              {isAiTyping && (
                <div className="self-start rounded-2xl rounded-tl-none bg-white/5 border border-white/10 px-4 py-2.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* Message input bar */}
            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                type="text"
                placeholder="Ask Claude a follow-up e.g. Why is Option B wrong?"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isAiTyping}
                className="flex-1 bg-white/5 border border-white/10 hover:border-white/20 focus:border-brand-primary/50 text-white rounded-xl px-4 py-3 text-xs placeholder-slate-500 outline-none focus:ring-1 focus:ring-brand-primary/20 transition-all disabled:opacity-50"
              />
              <motion.button
                type="submit"
                variants={buttonPressVariants}
                whileTap="tap"
                disabled={!inputValue.trim() || isAiTyping}
                className="p-3 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl shadow-lg flex items-center justify-center shrink-0 disabled:opacity-50 transition-colors"
              >
                <Send size={16} />
              </motion.button>
            </form>
          </div>
        )}

      </PageTransition>
    </AppLayout>
  );
}
