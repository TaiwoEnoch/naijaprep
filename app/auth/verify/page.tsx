"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { buttonPressVariants, shakeVariants } from "@/lib/animations";
import { ArrowLeft, KeyRound, AlertCircle, RefreshCw } from "lucide-react";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") || "";

  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [greenBoxes, setGreenBoxes] = useState<number[]>([]);
  const [resendTimer, setResendTimer] = useState(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 60-second countdown timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Redirect if no phone number in query
  useEffect(() => {
    if (!phone) {
      router.push("/auth/signup");
    }
  }, [phone, router]);

  const handleChange = (element: HTMLInputElement, index: number) => {
    const value = element.value;
    if (isNaN(Number(value))) return; // numeric check

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-focus next input box
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-trigger verify if all 6 boxes filled
    if (newOtp.every(val => val !== "")) {
      handleVerification(newOtp.join(""));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      const newOtp = [...otp];
      
      // If current box has value, erase it. Otherwise, go to previous box and erase it
      if (otp[index] !== "") {
        newOtp[index] = "";
        setOtp(newOtp);
      } else if (index > 0) {
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerification = async (enteredOtp: string) => {
    setError(null);
    setShake(false);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          otp: enteredOtp,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Incorrect verification code.");
      }

      // Success transition
      setIsSuccess(true);
      // Sequentially paint boxes green
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          setGreenBoxes(prev => [...prev, i]);
        }, i * 90);
      }

      // Redirect to PIN creation after green sweep finishes
      setTimeout(() => {
        router.push(`/auth/create-pin?phone=${phone}`);
      }, 800);
    } catch (err: any) {
      setError(err.message || "Invalid code. Please try again.");
      setShake(true);
      setOtp(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      if (!response.ok) {
        throw new Error("Failed to resend code.");
      }

      setResendTimer(60);
      setOtp(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || "Failed to resend verification code.");
    } finally {
      setLoading(false);
    }
  };

  // 6 boxes stagger variants
  const containerVariants = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants: any = {
    initial: { opacity: 0, x: 40 },
    animate: {
      opacity: 1,
      x: 0,
      transition: { type: "spring", stiffness: 120, damping: 15 },
    },
  };

  return (
    <div className="min-h-screen bg-[#081810] text-white font-sans flex flex-col justify-between relative overflow-hidden">
      
      {/* 6 floating blurred circles behind all content */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[400px] h-[400px] rounded-full bg-[rgba(29,158,117,0.06)] filter blur-[60px] top-[-100px] left-[-100px] animate-float-1" />
        <div className="absolute w-[300px] h-[300px] rounded-full bg-[rgba(83,74,183,0.04)] filter blur-[60px] top-[-50px] right-[-50px] animate-float-2" />
        <div className="absolute w-[350px] h-[350px] rounded-full bg-[rgba(83,74,183,0.04)] filter blur-[60px] bottom-[-100px] right-[-100px] animate-float-4" />
      </div>

      {/* Header with progress bar */}
      <header className="relative z-10 w-full bg-[#081c15] border-b border-white/5 py-4 px-6">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link href="/auth/signup" className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-soft">
            Step 2 of 3: Phone Verification
          </span>
          <div className="w-5" /> {/* spacer */}
        </div>
        
        <div className="max-w-md mx-auto h-1.5 bg-white/10 rounded-full mt-4 overflow-hidden">
          <motion.div 
            initial={{ width: "33%" }}
            animate={{ width: "66%" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-full bg-brand-primary rounded-full"
          />
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-md w-full mx-auto px-6 py-12 flex flex-col justify-center">
        <div className="space-y-6">
          
          {/* Headline info */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-brand-purple flex items-center justify-center text-white font-extrabold text-2xl mx-auto shadow-lg shadow-brand-purple/20">
              <KeyRound size={22} />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Verify phone number</h2>
            <p className="text-xs text-slate-400">
              We sent a 6-digit OTP code to <span className="text-brand-soft font-semibold">{phone}</span>
            </p>
          </div>

          {/* Form */}
          <div className="space-y-6 bg-white/5 border border-white/5 p-6 rounded-2xl glow-primary/5">
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* OTP Input Grid */}
            <motion.div 
              variants={shakeVariants}
              animate={shake ? "shake" : "default"}
              className="flex flex-col space-y-4"
            >
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">
                Enter 6-Digit Code
              </label>

              {/* 6 OTP input boxes slide in from right with 50ms stagger on mount */}
              <motion.div 
                variants={containerVariants}
                initial="initial"
                animate="animate"
                className="flex items-center justify-between gap-2"
              >
                {otp.map((data, index) => {
                  const isGreen = greenBoxes.includes(index);
                  const isCurrent = otp.findIndex(v => v === "") === index;
                  
                  return (
                    <motion.input
                      key={index}
                      variants={itemVariants}
                      type="tel"
                      maxLength={1}
                      disabled={loading || isSuccess}
                      ref={el => { inputRefs.current[index] = el; }}
                      value={data}
                      onChange={e => handleChange(e.target, index)}
                      onKeyDown={e => handleKeyDown(e, index)}
                      onFocus={e => e.target.select()}
                      className={`w-12 h-14 text-center text-lg font-bold rounded-xl border bg-white/5 transition-all outline-none ${
                        isGreen
                          ? "bg-brand-primary border-brand-primary text-white scale-105"
                          : isCurrent && !loading
                          ? "border-brand-primary ring-2 ring-brand-primary/20 animate-pulse text-white scale-105"
                          : "border-white/10 text-slate-300"
                      }`}
                    />
                  );
                })}
              </motion.div>
            </motion.div>

            {/* Resend Action */}
            <div className="text-center pt-2">
              {resendTimer > 0 ? (
                <span className="text-xs text-slate-400">
                  Resend code in <span className="font-semibold text-brand-soft">{resendTimer}s</span>
                </span>
              ) : (
                <motion.button
                  onClick={handleResend}
                  disabled={loading}
                  variants={buttonPressVariants}
                  whileTap="tap"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-soft hover:text-white transition-colors"
                >
                  <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                  <span>Resend Verification Code</span>
                </motion.button>
              )}
            </div>
          </div>

          {/* Change number */}
          <div className="text-center text-xs text-slate-400">
            Entered wrong phone number?{" "}
            <Link href="/auth/signup" className="text-brand-soft hover:underline font-semibold">
              Edit Number
            </Link>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-6 text-center text-xs text-slate-500 border-t border-white/5 bg-[#081c15]/30">
        &copy; {new Date().getFullYear()} NaijaPrep. All rights reserved.
      </footer>

    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#081810] flex items-center justify-center text-slate-400">
        Loading...
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
