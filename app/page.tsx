"use client";

import React from "react";
import Link from "next/link";
import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  BrainCircuit, 
  BarChart4, 
  Timer, 
  CalendarDays,
  ShieldCheck,
  Star
} from "lucide-react";
import { buttonPressVariants, staggerContainerVariants, staggerItemVariants } from "@/lib/animations";

export default function LandingPage() {
  const { ref: statsRef, inView: statsInView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const { ref: featuresRef, inView: featuresInView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const stats = [
    { value: 3, label: "Active Students", suffix: "M+", desc: "Preparing daily" },
    { value: 40, label: "Past Papers Coverage", suffix: "yrs+", desc: "WAEC, NECO & JAMB" },
    { value: 15, label: "Practice Questions", suffix: "k+", desc: "With expert reviews" },
    { value: 94, label: "Success Rate", suffix: "%", desc: "Improved performance" },
  ];

  const features = [
    {
      title: "Real Exam Simulations",
      desc: "Practice in actual WAEC, NECO, and JAMB environments with official timing constraints.",
      icon: Timer,
      color: "text-brand-primary bg-brand-primary/10",
    },
    {
      title: "AI-Powered Explanations",
      desc: "Get instant, comprehensive, step-by-step guidance for every question.",
      icon: BrainCircuit,
      color: "text-brand-purple bg-brand-purple/10",
    },
    {
      title: "Adaptive Study Plans",
      desc: "Tailor your prep strategy to your specific target score and remaining study days.",
      icon: CalendarDays,
      color: "text-amber-500 bg-amber-500/10",
    },
    {
      title: "Granular Skill Analytics",
      desc: "Track subject readiness with visual topic heatmaps and history reports.",
      icon: BarChart4,
      color: "text-emerald-500 bg-emerald-500/10",
    },
  ];

  return (
    <div className="min-h-screen relative bg-[#081810] text-white font-sans overflow-x-hidden selection:bg-brand-primary selection:text-white">
      
      {/* 6 floating blurred circles behind all content */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[400px] h-[400px] rounded-full bg-[rgba(29,158,117,0.08)] filter blur-[60px] top-[-100px] left-[-100px] animate-float-1" />
        <div className="absolute w-[300px] h-[300px] rounded-full bg-[rgba(83,74,183,0.06)] filter blur-[60px] top-[-50px] right-[-50px] animate-float-2" />
        <div className="absolute w-[250px] h-[250px] rounded-full bg-[rgba(29,158,117,0.05)] filter blur-[60px] bottom-[10%] left-[-50px] animate-float-3" />
        <div className="absolute w-[350px] h-[350px] rounded-full bg-[rgba(83,74,183,0.05)] filter blur-[60px] bottom-[-100px] right-[-100px] animate-float-4" />
        <div className="absolute w-[200px] h-[200px] rounded-full bg-[rgba(29,158,117,0.07)] filter blur-[60px] top-[40%] left-[-100px] animate-float-5" />
        <div className="absolute w-[280px] h-[280px] rounded-full bg-[rgba(186,117,23,0.04)] filter blur-[60px] top-[40%] right-[-100px] animate-float-6" />
      </div>

      {/* Sticky Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#081810]/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-primary flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-brand-primary/20">
              N
            </div>
            <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-brand-soft">
              NaijaPrep
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/signup">
              <motion.button 
                variants={buttonPressVariants}
                whileTap="tap"
                className="text-sm font-medium text-slate-300 hover:text-white px-4 py-2 transition-colors"
              >
                Log in
              </motion.button>
            </Link>
            <Link href="/auth/signup">
              <motion.button
                variants={buttonPressVariants}
                whileTap="tap"
                className="bg-brand-primary text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg shadow-brand-primary/25 hover:bg-brand-primary/95 transition-all"
              >
                Get started free
              </motion.button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Hero Left Column (Info/CTA) */}
          <div className="lg:col-span-7 flex flex-col space-y-8">
            {/* Animated Badge */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/20 px-3 py-1 rounded-full text-brand-soft text-xs font-semibold w-fit"
            >
              <Sparkles size={12} className="text-brand-primary animate-pulse" />
              <span>Version 3.0 Live — New AI Prep Tool</span>
            </motion.div>

            {/* Main Headline */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h1 className="text-4xl sm:text-6xl font-normal leading-tight tracking-tight text-white">
                Study smarter. <br />
                <span className="font-serif italic text-gradient-green">Score higher.</span>
              </h1>
              <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-xl font-normal">
                NaijaPrep helps Nigerian students ace WAEC, NECO, and JAMB exams on their first attempt with personalized schedules, real tests, and smart feedback.
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
            >
              <Link href="/auth/signup" className="flex-1 sm:flex-none">
                <motion.button
                  variants={buttonPressVariants}
                  whileTap="tap"
                  className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white font-bold px-8 py-4 rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-brand-primary/20 group transition-all"
                >
                  <span>Start Free Exam Prep</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>
              <Link href="#features" className="flex-1 sm:flex-none">
                <motion.button
                  variants={buttonPressVariants}
                  whileTap="tap"
                  className="w-full bg-white/5 hover:bg-white/10 text-white font-semibold px-8 py-4 rounded-xl border border-white/10 flex items-center justify-center transition-all"
                >
                  How it works
                </motion.button>
              </Link>
            </motion.div>

            {/* Trust Badges / Social Proof */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="pt-4 border-t border-white/5 flex flex-wrap gap-x-8 gap-y-4 text-xs text-slate-400"
            >
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-brand-primary" />
                <span>Officially Aligned Syllabus</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star size={16} className="text-amber-500 fill-amber-500" />
                <span>4.8/5 Student Rating</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-brand-purple" />
                <span>100% Free Trial</span>
              </div>
            </motion.div>
          </div>

          {/* Hero Right Column (Stats Grid + Features Stack) */}
          <div className="lg:col-span-5 flex flex-col space-y-12">
            
            {/* Stat Cards 2x2 Grid */}
            <div ref={statsRef} className="grid grid-cols-2 gap-4">
              {stats.map((stat, idx) => (
                <div 
                  key={idx} 
                  className="glass-panel p-5 rounded-2xl border border-white/5 glow-primary/5 flex flex-col space-y-1"
                >
                  <div className="text-2xl sm:text-3xl font-extrabold text-white flex items-baseline">
                    <AnimatedNumber 
                      value={statsInView ? stat.value : 0} 
                      formatter={(v) => Math.floor(v).toString()}
                    />
                    <span className="text-brand-primary">{stat.suffix}</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-300">{stat.label}</div>
                  <div className="text-[10px] text-slate-500">{stat.desc}</div>
                </div>
              ))}
            </div>

            {/* Features Stack */}
            <div ref={featuresRef} className="space-y-4">
              <h3 id="features" className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Why students use NaijaPrep
              </h3>
              
              <motion.div 
                variants={staggerContainerVariants}
                initial="initial"
                animate={featuresInView ? "animate" : "initial"}
                className="space-y-4"
              >
                {features.map((feat, idx) => {
                  const Icon = feat.icon;
                  return (
                    <motion.div 
                      key={idx}
                      variants={staggerItemVariants}
                      className="glass-panel p-4 rounded-2xl flex gap-4 items-start border border-white/5 hover:border-brand-primary/20 transition-all duration-300"
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 ${feat.color}`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">{feat.title}</h4>
                        <p className="text-xs text-slate-400 mt-1">{feat.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>

          </div>

        </div>

        {/* Exams / Badge Row at the Bottom */}
        <div className="mt-20 pt-10 border-t border-white/5 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
            Supported Nigerian Examinations
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12">
            {["JAMB UTME", "WAEC SSCE", "NECO SSCE"].map((exam, i) => (
              <div 
                key={i} 
                className="px-6 py-3 rounded-xl bg-white/5 border border-white/5 font-bold text-sm sm:text-base tracking-wider text-brand-soft shadow-inner hover:bg-white/10 transition-colors"
              >
                {exam}
              </div>
            ))}
          </div>
        </div>

      </main>

    </div>
  );
}
