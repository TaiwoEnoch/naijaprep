"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store/useAppStore";
import AppLayout from "@/components/layout/AppLayout";
import PageTransition from "@/components/ui/PageTransition";
import Skeleton from "@/components/ui/Skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Zap, HelpCircle, AlertCircle, ShieldCheck } from "lucide-react";
import { buttonPressVariants } from "@/lib/animations";

export default function PlansPage() {
  const router = useRouter();
  const { user } = useAppStore();
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Check if user is logged in (i.e. has a real ID, not usr_default placeholder)
  const isLoggedIn = !!(user && user.id !== "usr_default");

  // Fetch user profile plan details if logged in
  const { data: profileData } = useQuery({
    queryKey: ["userProfilePlan"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || json;
    },
    enabled: isLoggedIn,
  });

  const activePlan = profileData?.profile?.plan || "free";

  const handleChoosePlan = async (plan: "student" | "school") => {
    if (!isLoggedIn) {
      // Redirect to signup if not logged in
      router.push("/auth/signup");
      return;
    }

    setLoadingPlan(plan);
    try {
      const billingCycle = isAnnual ? "annual" : "monthly";
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billingCycle })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to initialize checkout.");
      }

      if (json.data?.authorizationUrl) {
        // Redirect to Paystack
        window.location.href = json.data.authorizationUrl;
      } else {
        throw new Error("Payment gateway checkout URL not found.");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred starting checkout.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const studentPrice = isAnnual ? "21,000" : "2,500";
  const studentPeriod = isAnnual ? "/year" : "/month";

  // Feature lists for plans
  const freeFeatures = [
    "10 Practice questions per day",
    "Basic performance score tracker",
    "Standard WAEC / JAMB syllabus",
    "Web access only"
  ];

  const studentFeatures = [
    "Unlimited daily practice questions",
    "All full-length Mock Exams (2 hours)",
    "AI explanations powered by Claude 3.5",
    "Adaptive questions selection",
    "Streak counting & full analytics",
    "Download packs for offline study"
  ];

  const schoolFeatures = [
    "Everything in Student Pro plan",
    "Teacher portal dashboard access",
    "Assign mock papers to classroom",
    "Student performance tracking analytics",
    "Unified bulk school billing discount",
    "Dedicated premium support line"
  ];

  // Framer Motion Variants
  const cardContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const cardItemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 260, damping: 22 }
    }
  };

  return (
    <AppLayout>
      <PageTransition className="max-w-4xl mx-auto py-6 space-y-8 flex flex-col items-center">
        
        {/* Header Title */}
        <div className="text-center space-y-2 max-w-md">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Flexible Plans for Every Scholar
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Upgrade your preparation to unlock unlimited resources, simulated mock exams, and instant step-by-step AI answers.
          </p>
        </div>

        {/* Monthly/Annual switcher toggle */}
        <div className="flex items-center gap-3">
          <div className="relative w-44 h-10 bg-white/5 border border-white/10 rounded-full p-1 flex items-center justify-between cursor-pointer" onClick={() => setIsAnnual(!isAnnual)}>
            <div className={`flex-1 text-center text-xs font-bold z-10 transition-colors ${!isAnnual ? "text-white" : "text-slate-400"}`}>
              Monthly
            </div>
            <div className={`flex-1 text-center text-xs font-bold z-10 transition-colors ${isAnnual ? "text-white" : "text-slate-400"}`}>
              Annual
            </div>
            
            {/* Sliding spring thumb */}
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 450, damping: 28 }}
              className="absolute top-1 bottom-1 w-[82px] bg-brand-primary rounded-full z-0"
              style={{ left: isAnnual ? "84px" : "4px" }}
            />
          </div>

          {/* Bouncing save badge */}
          <AnimatePresence>
            {isAnnual && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 10 }}
                className="bg-brand-purple text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg shadow-brand-purple/20"
              >
                Save 30%
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Pricing plan card deck */}
        <motion.div 
          variants={cardContainerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full items-stretch pt-4"
        >
          
          {/* Card 1: Free Plan */}
          <motion.div 
            variants={cardItemVariants}
            className={`glass-panel p-6 rounded-3xl border flex flex-col justify-between relative overflow-hidden ${
              activePlan === "free" ? "border-brand-primary/40 bg-brand-primary/5" : "border-white/5"
            }`}
          >
            {activePlan === "free" && (
              <div className="absolute top-3 right-3 bg-brand-primary/20 border border-brand-primary/30 text-brand-soft text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Current
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Free Plan</span>
                <h3 className="text-xl font-extrabold text-white mt-1">Basic Access</h3>
              </div>

              {/* Price */}
              <div className="py-2 flex items-baseline">
                <span className="text-3xl font-black text-white">₦0</span>
                <span className="text-xs text-slate-400 ml-1">/forever</span>
              </div>

              {/* Staggered checkmarks list */}
              <ul className="space-y-2.5 text-xs text-slate-300">
                {freeFeatures.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-slate-500/10 border border-slate-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={10} className="text-slate-400" />
                    </div>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-6">
              <button 
                disabled 
                className="w-full py-3 bg-white/5 border border-white/5 text-slate-500 rounded-xl text-xs font-bold cursor-not-allowed"
              >
                {activePlan === "free" ? "Active Plan" : "Basic Tier"}
              </button>
            </div>
          </motion.div>

          {/* Card 2: Student Pro Plan (Most popular) */}
          <motion.div 
            variants={cardItemVariants}
            style={{ scale: 1.02 }}
            className={`glass-panel p-6 rounded-3xl border flex flex-col justify-between relative overflow-hidden ring-4 ring-brand-primary/10 shadow-2xl shadow-brand-primary/5 ${
              activePlan === "student" ? "border-brand-primary bg-brand-primary/5" : "border-brand-primary/30"
            }`}
          >
            {/* Crown decoration */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              {activePlan === "student" ? (
                <span className="bg-brand-primary text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Current
                </span>
              ) : (
                <span className="bg-brand-primary/20 border border-brand-primary/30 text-brand-soft text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Popular
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-brand-soft font-bold uppercase tracking-widest">Student Pro</span>
                <h3 className="text-xl font-extrabold text-white mt-1">Full Mock Master</h3>
              </div>

              {/* Price toggle animates */}
              <div className="py-2 flex items-baseline">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={studentPrice}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="text-3xl font-black text-white"
                  >
                    ₦{studentPrice}
                  </motion.span>
                </AnimatePresence>
                <span className="text-xs text-slate-400 ml-1">{studentPeriod}</span>
              </div>

              {/* Sequential checkmark drawing */}
              <ul className="space-y-2.5 text-xs text-slate-300">
                {studentFeatures.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-2.5 h-2.5 text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                        <motion.path
                          d="M20 6L9 17L4 12"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.3, delay: idx * 0.05 }}
                        />
                      </svg>
                    </div>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-6">
              {activePlan === "student" ? (
                <button 
                  disabled 
                  className="w-full py-3 bg-brand-primary/20 border border-brand-primary/30 text-brand-soft rounded-xl text-xs font-bold cursor-not-allowed"
                >
                  Active Subscription
                </button>
              ) : (
                <motion.button 
                  onClick={() => handleChoosePlan("student")}
                  disabled={loadingPlan !== null}
                  variants={buttonPressVariants}
                  whileTap="tap"
                  className="w-full py-3 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-primary/10 transition-colors flex items-center justify-center"
                >
                  {loadingPlan === "student" ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Choose Student Pro</span>
                  )}
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* Card 3: School Plan */}
          <motion.div 
            variants={cardItemVariants}
            className={`glass-panel p-6 rounded-3xl border flex flex-col justify-between relative overflow-hidden ${
              activePlan === "school" ? "border-brand-purple bg-brand-purple/5" : "border-white/5"
            }`}
          >
            {activePlan === "school" && (
              <div className="absolute top-3 right-3 bg-brand-purple/20 border border-brand-purple/30 text-brand-soft text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Current
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">School Plan</span>
                <h3 className="text-xl font-extrabold text-white mt-1">Institutions</h3>
              </div>

              {/* Price */}
              <div className="py-2 flex items-baseline">
                <span className="text-3xl font-black text-white">₦25,000</span>
                <span className="text-xs text-slate-400 ml-1">/term</span>
              </div>

              {/* Features list */}
              <ul className="space-y-2.5 text-xs text-slate-300">
                {schoolFeatures.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-2.5 h-2.5 text-brand-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                        <motion.path
                          d="M20 6L9 17L4 12"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.3, delay: idx * 0.05 }}
                        />
                      </svg>
                    </div>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-6">
              {activePlan === "school" ? (
                <button 
                  disabled 
                  className="w-full py-3 bg-brand-purple/20 border border-brand-purple/30 text-brand-soft rounded-xl text-xs font-bold cursor-not-allowed"
                >
                  Active Subscription
                </button>
              ) : (
                <motion.button 
                  onClick={() => handleChoosePlan("school")}
                  disabled={loadingPlan !== null}
                  variants={buttonPressVariants}
                  whileTap="tap"
                  className="w-full py-3 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-purple/10 transition-colors flex items-center justify-center"
                >
                  {loadingPlan === "school" ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Choose School Pro</span>
                  )}
                </motion.button>
              )}
            </div>
          </motion.div>

        </motion.div>

        {/* Security badge note */}
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-4">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>Secured by Paystack. Cancel or adjust billing preferences at any time.</span>
        </div>

      </PageTransition>
    </AppLayout>
  );
}
