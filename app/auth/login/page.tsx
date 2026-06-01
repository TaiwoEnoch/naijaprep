"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store/useAppStore";
import { createClient } from "@/lib/supabase/client";
import { buttonPressVariants, shakeVariants } from "@/lib/animations";
import { ArrowLeft, Phone, KeyRound, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAppStore();
  const supabase = createClient();

  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShake(false);

    // Clean phone input
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("234")) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.startsWith("0")) {
      cleaned = cleaned.slice(1);
    }
    const finalPhone = "0" + cleaned;

    // Validate phone format
    const phoneRegex = /^0[789][01]\d{8}$/;
    if (!phoneRegex.test(finalPhone)) {
      setError("Please enter a valid Nigerian phone number (e.g. 0803 123 4567)");
      setShake(true);
      return;
    }

    // Validate PIN format
    if (!/^\d{4}$/.test(pin)) {
      setError("Please enter a valid 4-digit PIN.");
      setShake(true);
      return;
    }

    setLoading(true);

    try {
      // 1. Call Login API
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: finalPhone, pin }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Incorrect phone number or PIN.");
      }

      // 2. Set Supabase session
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.data.accessToken,
        refresh_token: result.data.session.refresh_token,
      });

      if (sessionError) {
        throw new Error("Session establishment error: " + sessionError.message);
      }

      // 3. Update Zustand store
      const dbUser = result.data.user;
      setUser({
        id: dbUser.id,
        name: `${dbUser.first_name} ${dbUser.last_name || ""}`.trim(),
        email: dbUser.phone + "@naijaprep.com",
        role: dbUser.role,
        examType: dbUser.exam_types?.[0] || "JAMB",
        streak: dbUser.streak_count || 1,
        isPremium: dbUser.plan !== "free",
        plan: dbUser.plan,
      });

      // 4. Suppress upgrade popup if user is student or school
      if (dbUser.plan === "student" || dbUser.plan === "school") {
        localStorage.setItem("naijaprep_upgrade_shown", "true");
      }

      // 5. Redirect to Dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
      setShake(true);
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#081810] text-white font-sans flex flex-col justify-between relative overflow-hidden">
      
      {/* 6 floating blurred circles behind all content */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[400px] h-[400px] rounded-full bg-[rgba(29,158,117,0.06)] filter blur-[60px] top-[-100px] left-[-100px]" />
        <div className="absolute w-[300px] h-[300px] rounded-full bg-[rgba(83,74,183,0.04)] filter blur-[60px] top-[-50px] right-[-50px]" />
        <div className="absolute w-[250px] h-[250px] rounded-full bg-[rgba(29,158,117,0.04)] filter blur-[60px] bottom-[10%] left-[-50px]" />
        <div className="absolute w-[350px] h-[350px] rounded-full bg-[rgba(83,74,183,0.04)] filter blur-[60px] bottom-[-100px] right-[-100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full bg-[#081c15] border-b border-white/5 py-4 px-6">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link href="/" className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-soft">
            Sign In to NaijaPrep
          </span>
          <div className="w-5" />
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-md w-full mx-auto px-6 py-12 flex flex-col justify-center">
        <div className="space-y-6">
          
          {/* Logo & Headline */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-brand-primary flex items-center justify-center text-white font-extrabold text-2xl mx-auto shadow-lg shadow-brand-primary/20">
              N
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
            <p className="text-xs text-slate-400">
              Sign in with your phone number and security PIN.
            </p>
          </div>

          {/* Form */}
          <motion.form 
            onSubmit={handleSubmit} 
            variants={shakeVariants}
            animate={shake ? "shake" : "default"}
            className="space-y-6 bg-white/5 border border-white/5 p-6 rounded-2xl glow-primary/5"
          >
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Phone Input Container */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Phone Number
              </label>
              
              <div className="relative rounded-xl bg-white/5 border border-white/10 focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/20 transition-all duration-300">
                <span className="absolute left-4 top-4 text-slate-400 text-sm font-semibold select-none border-r border-white/10 pr-2">
                  +234
                </span>
                
                <input
                  type="tel"
                  id="phone"
                  required
                  className="peer w-full pl-16 pr-4 pt-6 pb-2 bg-transparent border-0 focus:ring-0 focus:outline-none text-white text-sm"
                  placeholder=" "
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                
                <label
                  htmlFor="phone"
                  className="absolute left-16 top-2 text-slate-500 text-xs transition-all pointer-events-none peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-400 peer-focus:top-2 peer-focus:text-xs peer-focus:text-brand-primary"
                >
                  Phone Number
                </label>
              </div>
            </div>

            {/* PIN Input Container */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Security PIN
              </label>
              
              <div className="relative rounded-xl bg-white/5 border border-white/10 focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/20 transition-all duration-300">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pr-2 pl-0.5">
                  <KeyRound size={16} />
                </span>
                
                <input
                  type="password"
                  id="pin"
                  required
                  maxLength={4}
                  className="peer w-full pl-11 pr-4 pt-6 pb-2 bg-transparent border-0 focus:ring-0 focus:outline-none text-white text-sm tracking-widest font-bold"
                  placeholder=" "
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                />
                
                <label
                  htmlFor="pin"
                  className="absolute left-11 top-2 text-slate-500 text-xs transition-all pointer-events-none peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-400 peer-focus:top-2 peer-focus:text-xs peer-focus:text-brand-primary"
                >
                  4-Digit PIN
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading}
              variants={buttonPressVariants}
              whileTap="tap"
              className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/25 disabled:opacity-75 transition-all text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-1.5 py-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              ) : (
                <span>Log In</span>
              )}
            </motion.button>
          </motion.form>

          {/* Sign Up Link */}
          <div className="text-center text-xs text-slate-400">
            New to NaijaPrep?{" "}
            <Link href="/auth/signup" className="text-brand-soft hover:underline font-semibold">
              Create an Account
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
