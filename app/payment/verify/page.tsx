"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store/useAppStore";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { buttonPressVariants } from "@/lib/animations";

function PaymentVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") || "";
  
  const { user, setUser } = useAppStore();
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!reference) {
      setVerifying(false);
      setErrorMsg("Transaction reference code is missing.");
      return;
    }

    const verifyTransaction = async () => {
      try {
        const res = await fetch(`/api/payments/verify?reference=${reference}`);
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Verification failed.");
        }

        if (data.data?.verified === true) {
          setSuccess(true);
          // Update store user object to mark as premium
          if (user) {
            setUser({
              ...user,
              isPremium: true
            });
          }
        } else {
          setErrorMsg("Your payment verification is pending or failed. Please contact support.");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "An error occurred during verification.");
      } finally {
        setVerifying(false);
      }
    };

    verifyTransaction();
  }, [reference, user, setUser]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-[#081810] text-white flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="space-y-4">
          <motion.div
            animate={{ scale: [1, 1.08, 1], rotate: [0, 360] }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-16 h-16 rounded-full border-4 border-brand-primary border-t-transparent flex items-center justify-center mx-auto shadow-xl"
          />
          <div className="space-y-1">
            <h3 className="font-extrabold text-base">Verifying Payment</h3>
            <p className="text-xs text-slate-400">Contacting bank and updating subscription details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#081810] text-white flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="space-y-6 max-w-md w-full glass-panel p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
          {/* Background glow design */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-brand-primary/10 rounded-full filter blur-2xl" />
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto shadow-lg relative z-10"
          >
            <CheckCircle2 size={36} className="stroke-[2.5px]" />
          </motion.div>

          <div className="space-y-2 relative z-10">
            <h3 className="text-xl font-bold text-white">Payment Successful!</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your <span className="text-brand-primary font-black">NaijaPrep Pro</span> subscription is now active! You have unlocked unlimited AI explanations, syllabus study materials, and complete mock tests.
            </p>
          </div>

          <div className="pt-2 relative z-10">
            <Link href="/practice">
              <motion.button
                variants={buttonPressVariants}
                whileTap="tap"
                className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white font-bold py-3.5 rounded-xl text-xs shadow-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Go to Practice Center</span>
                <ArrowRight size={14} />
              </motion.button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#081810] text-white flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="space-y-6 max-w-md w-full glass-panel p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-red-500/10 rounded-full filter blur-2xl" />
        
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto shadow-lg relative z-10"
        >
          <XCircle size={36} className="stroke-[2.5px]" />
        </motion.div>

        <div className="space-y-2 relative z-10">
          <h3 className="text-xl font-bold text-white">Verification Failed</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {errorMsg || "We were unable to verify your payment status. Please try checking out again or contact our support team."}
          </p>
        </div>

        <div className="pt-2 relative z-10 flex gap-3">
          <Link href="/practice" className="flex-1">
            <button className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-3 rounded-xl text-xs transition-colors">
              Cancel
            </button>
          </Link>
          <Link href="/practice" className="flex-1">
            <motion.button
              variants={buttonPressVariants}
              whileTap="tap"
              className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white font-bold py-3 rounded-xl text-xs shadow-lg transition-colors"
            >
              Retry Checkout
            </motion.button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#081810] text-white flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center font-bold text-lg animate-pulse mx-auto">N</div>
          <p className="text-xs text-slate-500">Loading...</p>
        </div>
      </div>
    }>
      <PaymentVerifyContent />
    </Suspense>
  );
}
