"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store/useAppStore";
import { createClient } from "@/lib/supabase/client";
import { buttonPressVariants, shakeVariants } from "@/lib/animations";
import { ArrowLeft, UserCircle2, AlertCircle, Check, Delete } from "lucide-react";

function CreatePinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") || "";

  const { setUser } = useAppStore();
  const supabase = createClient();

  const [firstName, setFirstName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [isWave, setIsWave] = useState(false);

  // Auto redirect if phone is missing
  useEffect(() => {
    if (!phone) {
      router.push("/auth/signup");
    }
  }, [phone, router]);

  // Dots sequential wave animation when fully filled
  useEffect(() => {
    if (pin.length === 4) {
      setIsWave(true);
      const timer = setTimeout(() => setIsWave(false), 600);
      return () => clearTimeout(timer);
    }
  }, [pin]);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (!firstName.trim()) {
      setError("Please enter your first name first.");
      setShake(true);
      return;
    }
    if (pin.length !== 4) {
      setError("Please enter a 4-digit PIN.");
      setShake(true);
      return;
    }

    setLoading(true);
    setError(null);
    setShake(false);

    try {
      // 1. Call Register API
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          firstName: firstName.trim(),
          pin,
        }),
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok) {
        throw new Error(registerData.error || "Failed to create account.");
      }

      // 2. Immediately call Login API to sign in the user
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          pin,
        }),
      });

      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        throw new Error("Account created but failed to establish session. Please sign in.");
      }

      const loginSession = loginData?.data?.session || loginData?.session;
      const accessToken = loginData?.data?.accessToken || loginData?.accessToken;
      const loginUser = loginData?.data?.user || loginData?.user;

      // 3. Set Supabase session in the browser to store authorization cookies
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken || "",
        refresh_token: loginSession?.refresh_token || "",
      });

      if (sessionError) {
        throw new Error("Session establishment error: " + sessionError.message);
      }

      // 4. Update Zustand state
      setUser({
        id: loginUser?.id || "",
        name: loginUser?.first_name || "",
        email: (loginUser?.phone || "") + "@naijaprep.com",
        role: loginUser?.role || "student",
        examType: undefined, // to onboarding select
        streak: loginUser?.streak_count || 1,
        isPremium: loginUser?.plan !== "free",
      });

      // 5. Redirect to onboarding step exam
      router.push("/onboarding/exam");
    } catch (err: any) {
      setError(err.message || "An error occurred during registration.");
      setShake(true);
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  // Dot bounce variants
  const dotVariants: any = {
    empty: { scale: 1, backgroundColor: "rgba(255, 255, 255, 0.1)" },
    filled: {
      scale: [1, 1.3, 1],
      backgroundColor: "#0F6E56",
      transition: { type: "tween", duration: 0.3, ease: "easeInOut" },
    },
    wave: (i: number) => ({
      y: [0, -12, 0],
      backgroundColor: "#534AB7",
      transition: {
        duration: 0.5,
        delay: i * 0.08,
        ease: "easeInOut",
      },
    }),
  };

  // Pad Button subcomponent with spring and coordinate-based ripple trigger
  const PinButton = ({ val, onClick, className }: { val: React.ReactNode; onClick: () => void; className?: string }) => {
    const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

    const handlePress = (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setRipples(prev => [...prev, { id: Date.now(), x, y }]);
      onClick();
    };

    return (
      <motion.button
        type="button"
        onMouseDown={handlePress}
        whileTap={{ scale: 0.9, transition: { type: "spring", stiffness: 450, damping: 15 } }}
        className={`relative overflow-hidden w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center font-bold text-lg hover:bg-white/10 active:bg-brand-primary/10 transition-colors ${className}`}
      >
        {ripples.map(r => (
          <span
            key={r.id}
            onAnimationEnd={() => setRipples(prev => prev.filter(x => x.id !== r.id))}
            className="absolute bg-brand-primary/20 w-4 h-4 rounded-full pointer-events-none animate-ripple"
            style={{ left: r.x - 8, top: r.y - 8 }}
          />
        ))}
        <span className="relative z-10 select-none">{val}</span>
      </motion.button>
    );
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
          <Link href={`/auth/verify?phone=${phone}`} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-soft">
            Step 3 of 3: Security PIN
          </span>
          <div className="w-5" />
        </div>
        
        <div className="max-w-md mx-auto h-1.5 bg-white/10 rounded-full mt-4 overflow-hidden">
          <motion.div 
            initial={{ width: "66%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-full bg-brand-primary rounded-full"
          />
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-md w-full mx-auto px-6 py-6 flex flex-col justify-center">
        <div className="space-y-6">
          
          {/* Logo Headline */}
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-2xl bg-brand-primary flex items-center justify-center text-white font-extrabold text-2xl mx-auto shadow-lg shadow-brand-primary/20">
              N
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Security PIN & Name</h2>
            <p className="text-xs text-slate-400">
              Set your name and a 4-digit PIN for quick logins.
            </p>
          </div>

          {/* Form wrapper */}
          <div className="bg-white/5 border border-white/5 p-6 rounded-2xl glow-primary/5 space-y-6">
            
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Name Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                First Name
              </label>
              <div className="relative rounded-xl bg-white/5 border border-white/10 focus-within:border-brand-primary transition-all">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <UserCircle2 size={18} />
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Taiwo"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full bg-transparent border-0 py-3 pl-11 pr-4 focus:ring-0 focus:outline-none text-white text-sm"
                />
              </div>
            </div>

            {/* PIN Code Dots display */}
            <motion.div 
              variants={shakeVariants}
              animate={shake ? "shake" : "default"}
              className="flex flex-col items-center space-y-3"
            >
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Create 4-Digit PIN
              </label>
              
              {/* 4 PIN dot indicators fill with spring bounce and wave effect */}
              <div className="flex items-center gap-5 justify-center py-2">
                {[0, 1, 2, 3].map(i => (
                  <motion.div
                    key={i}
                    custom={i}
                    animate={isWave ? "wave" : (pin.length > i ? "filled" : "empty")}
                    variants={dotVariants}
                    className="w-4 h-4 rounded-full border border-white/10"
                  />
                ))}
              </div>
            </motion.div>

            {/* Number Pad Grid */}
            <div className="flex flex-col items-center space-y-4">
              <div className="grid grid-cols-3 gap-x-8 gap-y-3 justify-items-center">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(num => (
                  <PinButton key={num} val={num} onClick={() => handleKeyPress(num)} />
                ))}
                
                {/* Row 4: Backspace, 0, Confirm */}
                <PinButton 
                  val={<Delete size={18} className="text-red-400" />} 
                  onClick={handleBackspace} 
                  className="bg-red-500/5 hover:bg-red-500/10 border-red-500/10" 
                />
                <PinButton val="0" onClick={() => handleKeyPress("0")} />
                <PinButton 
                  val={loading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check size={18} className="text-brand-primary" />
                  )} 
                  onClick={handleSubmit} 
                  className="bg-brand-primary/10 hover:bg-brand-primary/20 border-brand-primary/20" 
                />
              </div>
            </div>

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

export default function CreatePinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#081810] flex items-center justify-center text-slate-400">
        Loading...
      </div>
    }>
      <CreatePinContent />
    </Suspense>
  );
}
