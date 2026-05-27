"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useInView } from "react-intersection-observer";
import { motion, AnimatePresence } from "framer-motion";
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
import { buttonPressVariants, staggerContainerVariants } from "@/lib/animations";

export default function LandingPage() {
  // Modal & Menu states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pulseActive, setPulseActive] = useState(false);

  const { ref: statsRef, inView: statsInView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const { ref: featuresRef, inView: featuresInView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  // Modal open lock & key handlers
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
      // Pulse button starts at 1300ms
      const timer = setTimeout(() => {
        setPulseActive(true);
      }, 1300);
      return () => {
        clearTimeout(timer);
      };
    } else {
      document.body.style.overflow = "";
      setPulseActive(false);
    }
  }, [isModalOpen]);

  // Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close mobile menu on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      setIsMobileMenuOpen(false);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Close mobile menu automatically on window scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsMobileMenuOpen(false);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Generate 20 floating particles once on mount
  const particles = useMemo(() => {
    const p = [];
    for (let i = 0; i < 20; i++) {
      p.push({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: Math.random() * 3 + 2, // 2px to 5px
        opacity: Math.random() * 0.4 + 0.2, // 0.2 to 0.6
        duration: Math.random() * 12 + 8, // 8s to 20s
        delay: Math.random() * 5, // 0s to 5s
        color: i % 2 === 0 ? "#5DCAA5" : "#AFA9EC"
      });
    }
    return p;
  }, []);

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

  const badges = [
    { name: "JAMB UTME", bg: "rgba(29,158,117,0.2)", border: "rgba(29,158,117,0.5)" },
    { name: "WAEC SSCE", bg: "rgba(83,74,183,0.2)", border: "rgba(83,74,183,0.5)" },
    { name: "NECO SSCE", bg: "rgba(186,117,23,0.2)", border: "rgba(186,117,23,0.5)" },
  ];

  // Framer Motion Animation Variants for Modal
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 0.85, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  const modalVariants = {
    hidden: { y: "100%", opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1, 
      transition: { 
        type: "spring" as const, 
        stiffness: 400, 
        damping: 28, 
        delay: 0.15 
      } 
    },
    exit: { y: "100%", opacity: 0, transition: { duration: 0.2 } }
  };

  const headerVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.3 } }
  };

  const stepVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        delay: 0.5 + i * 0.2,
        ease: "easeOut" as const
      }
    })
  };

  const circleVariants = {
    hidden: { scale: 0 },
    visible: (i: number) => ({
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 18,
        delay: 0.6 + i * 0.2
      }
    })
  };

  const socialProofVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.9, ease: "easeOut" as const } }
  };

  const ctaSectionVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        type: "spring" as const, 
        stiffness: 250, 
        damping: 18, 
        delay: 1.1 
      } 
    }
  };

  // Feature Card individual fade-in stagger variants
  const featureItemVariants = {
    initial: { opacity: 0, y: 20 },
    animate: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        delay: i * 0.08,
        ease: "easeOut" as const
      }
    })
  };

  return (
    <div className="min-h-screen relative bg-[#081810] text-white font-sans overflow-x-hidden selection:bg-brand-primary selection:text-white">
      
      {/* CSS Stylesheet Injector */}
      <style>{`
        @keyframes mesh-gradient {
          0% {
            background-image: 
              radial-gradient(circle at 20% 30%, rgba(29,158,117,0.15) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(83,74,183,0.12) 0%, transparent 50%),
              radial-gradient(circle at 50% 80%, rgba(29,158,117,0.10) 0%, transparent 50%),
              radial-gradient(circle at 10% 70%, rgba(186,117,23,0.08) 0%, transparent 50%);
          }
          100% {
            background-image: 
              radial-gradient(circle at 25% 35%, rgba(29,158,117,0.15) 0%, transparent 50%),
              radial-gradient(circle at 75% 25%, rgba(83,74,183,0.12) 0%, transparent 50%),
              radial-gradient(circle at 55% 75%, rgba(29,158,117,0.10) 0%, transparent 50%),
              radial-gradient(circle at 15% 65%, rgba(186,117,23,0.08) 0%, transparent 50%);
          }
        }
        .mesh-gradient-container {
          background-size: 200% 200%;
          animation: mesh-gradient 12s ease infinite alternate;
        }
        @keyframes float-slow {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -40px) scale(1.05); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes float-slow-reverse {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 40px) scale(0.95); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes particle-drift {
          0% {
            transform: translateY(0);
            opacity: 0;
          }
          10% {
            opacity: 0.5;
          }
          90% {
            opacity: 0.5;
          }
          100% {
            transform: translateY(-120px);
            opacity: 0;
          }
        }
        @keyframes button-pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 4px 15px rgba(15, 110, 86, 0.2);
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0 4px 25px rgba(15, 110, 86, 0.4);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 4px 15px rgba(15, 110, 86, 0.2);
          }
        }
        .cta-pulse-button {
          animation: button-pulse 2.4s infinite ease-in-out;
        }
        .stat-card:hover .stat-card-number {
          font-weight: 800;
        }
        .stat-card-number {
          transition: font-weight 250ms ease;
        }
      `}</style>

      {/* BACKGROUND ANIMATION LAYERS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Subtle Tech Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(29,158,117,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(29,158,117,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px'
          }}
        />

        {/* Animated Gradient Mesh */}
        <div className="absolute inset-0 mesh-gradient-container" />

        {/* Floating Orbs — 8 blurred circles */}
        <div className="absolute w-[500px] h-[500px] rounded-full bg-[rgba(29,158,117,0.07)] filter blur-[80px] top-[-100px] left-[-100px]" style={{ animation: "float-slow 20s ease-in-out infinite" }} />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-[rgba(83,74,183,0.06)] filter blur-[80px] top-[10%] right-[-150px]" style={{ animation: "float-slow-reverse 17s ease-in-out infinite" }} />
        <div className="absolute w-[300px] h-[300px] rounded-full bg-[rgba(29,158,117,0.08)] filter blur-[80px] top-[40%] left-[10%]" style={{ animation: "float-slow 13s ease-in-out infinite" }} />
        <div className="absolute w-[350px] h-[350px] rounded-full bg-[rgba(186,117,23,0.05)] filter blur-[80px] bottom-[20%] right-[10%]" style={{ animation: "float-slow-reverse 22s ease-in-out infinite" }} />
        <div className="absolute w-[250px] h-[250px] rounded-full bg-[rgba(83,74,183,0.07)] filter blur-[80px] bottom-[-50px] left-[30%]" style={{ animation: "float-slow 16s ease-in-out infinite" }} />
        <div className="absolute w-[200px] h-[200px] rounded-full bg-[rgba(29,158,117,0.09)] filter blur-[80px] top-[60%] right-[30%]" style={{ animation: "float-slow-reverse 11s ease-in-out infinite" }} />
        <div className="absolute w-[450px] h-[450px] rounded-full bg-[rgba(29,158,117,0.04)] filter blur-[80px] top-[20%] left-[40%]" style={{ animation: "float-slow 25s ease-in-out infinite" }} />
        <div className="absolute w-[180px] h-[180px] rounded-full bg-[rgba(83,74,183,0.08)] filter blur-[80px] bottom-[40%] left-[60%]" style={{ animation: "float-slow-reverse 14s ease-in-out infinite" }} />

        {/* Particles System */}
        {particles.map((p, idx) => (
          <div 
            key={idx}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: p.left,
              top: p.top,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              opacity: p.opacity,
              animation: `particle-drift ${p.duration}s linear ${p.delay}s infinite`
            }}
          />
        ))}
      </div>

      {/* Sticky Responsive Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#081810]/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo Area */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-primary flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-brand-primary/20">
              N
            </div>
            <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-brand-soft">
              NaijaPrep
            </span>
          </div>

          {/* Desktop Nav Links (hidden on Mobile) */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="hover:text-white transition-colors cursor-pointer text-slate-300 font-medium bg-transparent border-none outline-none"
            >
              How it works
            </button>
            <Link href="/plans" className="hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/leaderboard" className="hover:text-white transition-colors">
              Leaderboard
            </Link>
          </nav>

          {/* Desktop Buttons (hidden on Mobile) */}
          <div className="hidden md:flex items-center gap-4">
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

          {/* Mobile Hamburger Toggle (hidden on Desktop) */}
          <div className="flex md:hidden">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsMobileMenuOpen(!isMobileMenuOpen);
              }}
              className="p-2 text-slate-400 hover:text-white focus:outline-none relative w-10 h-10 flex flex-col justify-center items-center gap-1.5"
            >
              <motion.span 
                animate={isMobileMenuOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.2 }}
                className="w-5 h-0.5 bg-white rounded-full block origin-center"
              />
              <motion.span 
                animate={isMobileMenuOpen ? { opacity: 0, scale: 0 } : { opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="w-5 h-0.5 bg-white rounded-full block origin-center"
              />
              <motion.span 
                animate={isMobileMenuOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.2 }}
                className="w-5 h-0.5 bg-white rounded-full block origin-center"
              />
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="md:hidden border-t border-white/5 bg-[#0a1f14]/95 backdrop-blur-lg overflow-hidden absolute top-16 left-0 right-0 z-40"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 pt-4 pb-6 space-y-4 flex flex-col">
                <button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsModalOpen(true);
                  }}
                  className="text-left text-sm font-semibold text-slate-300 hover:text-white py-2 border-b border-white/5 w-full bg-transparent border-none outline-none"
                >
                  How it works
                </button>
                <Link 
                  href="/plans"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-sm font-semibold text-slate-300 hover:text-white py-2 border-b border-white/5"
                >
                  Pricing
                </Link>
                <Link 
                  href="/leaderboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-sm font-semibold text-slate-300 hover:text-white py-2 border-b border-white/5"
                >
                  Leaderboard
                </Link>
                <Link 
                  href="/auth/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-sm font-semibold text-slate-300 hover:text-white py-2 border-b border-white/5"
                >
                  Log in
                </Link>
                
                <Link href="/auth/signup" className="pt-2" onClick={() => setIsMobileMenuOpen(false)}>
                  <motion.button
                    variants={buttonPressVariants}
                    whileTap="tap"
                    className="w-full bg-brand-primary text-white text-sm font-bold py-3 rounded-xl shadow-lg shadow-brand-primary/25 hover:bg-brand-primary/95 transition-all text-center block"
                  >
                    Get started free
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Hero Left Column */}
          <div className="lg:col-span-7 flex flex-col space-y-8">
            {/* Animated Version Badge */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/20 px-3 py-1 rounded-full text-brand-soft text-xs font-semibold w-fit"
            >
              <Sparkles size={12} className="text-brand-primary animate-pulse" />
              <span>Version 3.0 Live — New AI Prep Tool</span>
            </motion.div>

            {/* Glowing Main Headline */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h1 
                className="text-4xl sm:text-6xl font-normal leading-tight tracking-tight text-white"
                style={{ textShadow: "0 0 80px rgba(29,158,117,0.3)" }}
              >
                Study smarter. <br />
                <span className="font-serif italic text-gradient-green">Score higher.</span>
              </h1>
              <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-xl font-normal">
                NaijaPrep helps Nigerian students ace WAEC, NECO, and JAMB exams on their first attempt with personalized schedules, real tests, and smart feedback.
              </p>
            </motion.div>

            {/* CTA buttons */}
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
              
              <motion.button
                variants={buttonPressVariants}
                whileTap="tap"
                onClick={() => setIsModalOpen(true)}
                className="flex-1 sm:flex-none bg-white/5 hover:bg-white/10 text-white font-semibold px-8 py-4 rounded-xl border border-white/10 flex items-center justify-center transition-all cursor-pointer"
              >
                How it works
              </motion.button>
            </motion.div>

            {/* Trust Badges */}
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
            
            {/* Stat Cards 2x2 Grid (Slides up on scroll with 100ms stagger) */}
            <motion.div 
              ref={statsRef} 
              variants={staggerContainerVariants}
              initial="initial"
              animate={statsInView ? "animate" : "initial"}
              className="grid grid-cols-2 gap-4"
            >
              {stats.map((stat, idx) => (
                <motion.div 
                  key={idx} 
                  custom={idx}
                  variants={{
                    initial: { opacity: 0, y: 30 },
                    animate: (i: number) => ({
                      opacity: 1,
                      y: 0,
                      transition: {
                        duration: 0.5,
                        delay: i * 0.1,
                        ease: "easeOut"
                      }
                    })
                  }}
                  whileHover={{
                    y: -6,
                    borderColor: "rgba(29,158,117,0.4)",
                    boxShadow: "0 8px 32px rgba(29,158,117,0.15)",
                    backgroundColor: "rgba(255, 255, 255, 0.08)"
                  }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="stat-card glass-panel p-5 rounded-2xl border border-white/5 glow-primary/5 flex flex-col space-y-1 cursor-pointer"
                >
                  <div className="text-2xl sm:text-3xl font-extrabold text-white flex items-baseline">
                    <span className="stat-card-number font-bold transition-all duration-250">
                      <AnimatedNumber 
                        value={statsInView ? stat.value : 0} 
                        formatter={(v) => Math.floor(v).toString()}
                      />
                    </span>
                    <span className="text-brand-primary">{stat.suffix}</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-300">{stat.label}</div>
                  <div className="text-[10px] text-slate-500">{stat.desc}</div>
                </motion.div>
              ))}
            </motion.div>

            {/* Features Stack (Slides up with 80ms stagger delay) */}
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
                      custom={idx}
                      variants={featureItemVariants}
                      className="group relative overflow-hidden glass-panel p-4 rounded-2xl flex gap-4 items-start border border-white/5 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:bg-[#1d9e75]/5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]"
                    >
                      {/* Left border indicator */}
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#0F6E56] scale-y-0 origin-top group-hover:scale-y-100 transition-transform duration-250" />
                      
                      {/* Icon container */}
                      <div className={`p-2.5 rounded-xl shrink-0 transition-all duration-200 group-hover:rotate-6 group-hover:scale-110 ${feat.color}`}>
                        <Icon size={18} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-white transition-colors duration-200 group-hover:text-[#5DCAA5]">
                            {feat.title}
                          </h4>
                          <ArrowRight size={14} className="text-brand-primary opacity-0 -translate-x-3 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{feat.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>

          </div>

        </div>

        {/* Exam Badges Staggered Scale Entrance on Mount */}
        <div className="mt-20 pt-10 border-t border-white/5 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
            Supported Nigerian Examinations
          </p>
          <motion.div 
            variants={staggerContainerVariants}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-10px" }}
            className="flex flex-wrap items-center justify-center gap-6 sm:gap-12"
          >
            {badges.map((badge, idx) => (
              <motion.div 
                key={idx} 
                custom={idx}
                variants={{
                  initial: { opacity: 0, scale: 0.8 },
                  animate: (i: number) => ({
                    opacity: 1,
                    scale: 1,
                    transition: {
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                      delay: i * 0.1
                    }
                  })
                }}
                whileHover={{
                  scale: 1.05,
                  borderColor: badge.border,
                  backgroundColor: badge.bg,
                  color: "#ffffff"
                }}
                transition={{ type: "spring", stiffness: 350, damping: 20 }}
                className="px-6 py-3 rounded-xl bg-white/5 border border-white/5 font-bold text-sm sm:text-base tracking-wider text-brand-soft shadow-inner cursor-pointer transition-colors"
              >
                {badge.name}
              </motion.div>
            ))}
          </motion.div>
        </div>

      </main>

      {/* HOW IT WORKS WIZARD MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop Overlay */}
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/85 backdrop-blur-sm z-40"
            />

            {/* Modal Container Card */}
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-[560px] max-h-[85vh] bg-[#0a1f14] border border-white/10 rounded-2xl shadow-[0_24px_50px_rgba(0,0,0,0.5)] overflow-y-auto z-50 flex flex-col"
            >
              {/* Top Accent Line */}
              <div className="h-1 w-full bg-gradient-to-r from-[#0F6E56] to-[#534AB7] shrink-0" />

              {/* Top Right Close Trigger */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors z-20"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Inner Modal Content Body */}
              <div className="p-6 sm:p-8 space-y-6 relative overflow-hidden flex-1">
                {/* Radial Glow Layer */}
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(29,158,117,0.1)_0%,transparent_70%)]" />

                {/* Header Section */}
                <motion.div 
                  variants={headerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3 relative z-10"
                >
                  <span className="inline-block px-3 py-1 bg-[#0F6E56]/20 border border-[#0F6E56]/40 text-brand-soft text-[10px] font-extrabold uppercase tracking-widest rounded-full">
                    HOW NAIJAPREP WORKS
                  </span>
                  <h3 className="text-2xl sm:text-3xl text-white font-serif italic leading-tight">
                    From Zero to Top Score in 4 Simple Steps
                  </h3>
                  <p className="text-xs text-slate-400">
                    Join 3 million Nigerian students already preparing smarter
                  </p>
                </motion.div>

                {/* Steps Section */}
                <div className="relative pl-1">
                  {/* Vertical Progress Line */}
                  <div className="absolute left-[19px] top-6 bottom-6 w-[2px] bg-slate-800 pointer-events-none">
                    <motion.div 
                      className="h-full bg-[#0F6E56] origin-top"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.8, delay: 1.3, ease: "easeInOut" }}
                    />
                  </div>

                  {/* Step Cards List */}
                  <div className="space-y-6 relative z-10">
                    {[
                      {
                        title: "Create Your Profile",
                        desc: "Tell us your exam type, subjects, and target score. NaijaPrep builds a personalised study plan around your exact goals and exam date.",
                        stat: "Takes less than 2 minutes to set up"
                      },
                      {
                        title: "Practice With Real Past Questions",
                        desc: "Access thousands of verified WAEC, NECO and JAMB past questions from 2010 to 2024. Our adaptive engine focuses on your weak topics automatically.",
                        stat: "15,000+ questions across 30 subjects"
                      },
                      {
                        title: "Get AI Explanations Instantly",
                        desc: "Every wrong answer is explained step by step in plain English by Claude AI. No more guessing why you got it wrong.",
                        stat: "Powered by Anthropic Claude — used by 10M+ students worldwide"
                      },
                      {
                        title: "Track Progress and Rank Up",
                        desc: "Watch your predicted JAMB score climb in real time. Compete on the national leaderboard and see exactly which topics to focus on next.",
                        stat: "Students improve an average of 47 marks in 30 days"
                      }
                    ].map((stepItem, idx) => (
                      <motion.div
                        key={idx}
                        custom={idx}
                        variants={stepVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex gap-4 items-start group"
                      >
                        {/* Step Number Badge Circle */}
                        <motion.div 
                          custom={idx}
                          variants={circleVariants}
                          className="w-10 h-10 rounded-full bg-[#0a1f14] border border-[#0F6E56]/40 text-brand-soft font-bold text-sm flex items-center justify-center shrink-0 z-10 group-hover:bg-[#0F6E56] group-hover:text-white transition-colors"
                        >
                          {idx + 1}
                        </motion.div>

                        {/* Step Text Card */}
                        <div className="flex-1 bg-white/5 border border-white/5 border-l-2 border-l-transparent hover:border-l-[#0F6E56] p-4 rounded-xl transition-all duration-250 hover:shadow-[0_0_15px_rgba(15,110,86,0.15)] hover:bg-white/[0.08]">
                          <h4 className="text-sm font-bold text-white">{stepItem.title}</h4>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{stepItem.desc}</p>
                          <span className="inline-block text-[10px] font-bold text-brand-primary mt-2">
                            ✓ {stepItem.stat}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Social Proof Stats Bar */}
                <motion.div
                  variants={socialProofVariants}
                  initial="hidden"
                  animate="visible"
                  className="pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10"
                >
                  <div className="flex items-center gap-3">
                    {/* Multi overlapping avatars */}
                    <div className="flex -space-x-2.5">
                      <div className="w-8 h-8 rounded-full border border-[#0a1f14] bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center">A</div>
                      <div className="w-8 h-8 rounded-full border border-[#0a1f14] bg-[#534AB7] text-white text-[10px] font-bold flex items-center justify-center">T</div>
                      <div className="w-8 h-8 rounded-full border border-[#0a1f14] bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center">O</div>
                      <div className="w-8 h-8 rounded-full border border-[#0a1f14] bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">B</div>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">2,847 students joined this week</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex text-amber-500">
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star key={n} size={10} className="fill-amber-500" />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold">4.9/5 rating</span>
                      </div>
                    </div>
                  </div>

                  {/* Pulsing Status Dot */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Currently 143 students studying</span>
                  </div>
                </motion.div>

                {/* CTA & Guarantees section */}
                <motion.div
                  variants={ctaSectionVariants}
                  initial="hidden"
                  animate="visible"
                  className="pt-6 border-t border-white/5 space-y-4 text-center relative z-10"
                >
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-red-400 uppercase tracking-wider">
                      Do Not Start Your Exam Without This
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                      Students who use NaijaPrep for 30 days score an average of 47 marks higher. Your exam is coming — every day without focused practice is a day wasted.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {/* Primary pulse gradient button */}
                    <Link href="/auth/signup" className="block">
                      <button className={`w-full bg-gradient-to-r from-[#0F6E56] to-[#534AB7] text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 group transition-all duration-300 shadow-lg shadow-brand-primary/20 ${pulseActive ? "cta-pulse-button" : ""}`}>
                        <span>Start Free Today — No Credit Card Needed</span>
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" />
                      </button>
                    </Link>

                    {/* Secondary fill-from-left button */}
                    <Link href="/plans" className="block">
                      <button className="relative overflow-hidden w-full border border-[#534AB7]/50 text-white font-bold py-3.5 px-4 rounded-xl group transition-all duration-300">
                        <div className="absolute inset-0 bg-[#534AB7] scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300 z-0" />
                        <span className="relative z-10">See Pro Plan Benefits — From ₦2,500/month</span>
                      </button>
                    </Link>
                  </div>

                  {/* Trust Text */}
                  <span className="text-[10px] text-slate-500 block">
                    🔒 Your data is safe &middot; Cancel anytime &middot; Nigerian company &middot; CAC registered
                  </span>

                  {/* Guarantee Shield Card */}
                  <div className="bg-[#0F6E56]/10 border border-[#0F6E56]/20 p-4 rounded-xl flex items-start gap-3 text-left">
                    <ShieldCheck size={20} className="text-brand-primary shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold text-white">30-Day Results Guarantee</h5>
                      <p className="text-[10px] text-slate-400 leading-normal mt-0.5">
                        If you do not improve your practice scores in 30 days we will refund your subscription. No questions asked.
                      </p>
                    </div>
                  </div>

                </motion.div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
