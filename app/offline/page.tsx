"use client";

import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store/useAppStore";
import AppLayout from "@/components/layout/AppLayout";
import PageTransition from "@/components/ui/PageTransition";
import Skeleton from "@/components/ui/Skeleton";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Download, 
  Trash2, 
  Check, 
  ArrowDown, 
  Wifi, 
  WifiOff, 
  HardDrive, 
  RefreshCw, 
  ShieldAlert,
  ArrowDownToLine,
  BookOpen
} from "lucide-react";
import { buttonPressVariants } from "@/lib/animations";

interface PackItem {
  id: string;
  subject_id: string;
  exam_type: string;
  version: number;
  size_bytes: number;
  question_count: number;
  is_active: boolean;
  created_at: string;
  subjects: { name: string };
  downloaded: boolean;
  downloadedAt: string | null;
}

export default function OfflinePacksPage() {
  const queryClient = useQueryClient();
  const { user, isOnline } = useAppStore();
  const supabase = createClient();

  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [downloadingPacks, setDownloadingPacks] = useState<Record<string, boolean>>({});
  const [storagePct, setStoragePct] = useState(0);

  // Fetch all packs
  const { data: packs, isLoading, error } = useQuery<PackItem[]>({
    queryKey: ["offlinePacksList"],
    queryFn: async () => {
      const res = await fetch("/api/packs");
      if (!res.ok) throw new Error("Failed to load packs.");
      const json = await res.json();
      return json.data || json;
    },
    refetchOnMount: true,
  });

  // Calculate storage usage bar: fills from 0 on mount
  useEffect(() => {
    if (!packs) return;
    const downloadedList = packs.filter((p) => p.downloaded || downloadProgress[p.id] === 100);
    const totalSize = downloadedList.reduce((sum, p) => sum + p.size_bytes, 0);
    const maxStorage = 80 * 1024 * 1024; // 80MB allocated limit
    const targetPct = Math.min(100, Math.round((totalSize / maxStorage) * 100));

    const timer = setTimeout(() => {
      setStoragePct(targetPct);
    }, 150);

    return () => clearTimeout(timer);
  }, [packs, downloadProgress]);

  // Handle download pack & store offline in Dexie IndexedDB
  const handleDownloadPack = async (pack: PackItem) => {
    if (!isOnline) {
      alert("You need an active internet connection to download offline packs.");
      return;
    }
    if (downloadingPacks[pack.id]) return;

    setDownloadingPacks((prev) => ({ ...prev, [pack.id]: true }));
    setDownloadProgress((prev) => ({ ...prev, [pack.id]: 0 }));

    // Start progress interval simulation
    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        const cur = prev[pack.id] ?? 0;
        if (cur >= 90) {
          clearInterval(interval);
          return prev;
        }
        return { ...prev, [pack.id]: cur + Math.floor(Math.random() * 10) + 5 };
      });
    }, 120);

    try {
      // 1. Fetch 100 practice questions for this subject & examType
      const questionsUrl = `/api/questions?subjectId=${pack.subject_id}&examType=${pack.exam_type}&count=100`;
      const res = await fetch(questionsUrl);
      const json = await res.json();
      const questions = json.data || json;

      if (!res.ok) {
        throw new Error("Failed to download pack questions from server.");
      }

      // 2. Save questions array to IndexedDB using Dexie
      if (questions && questions.length > 0) {
        const offlineQs = questions.map((q: any) => ({
          id: q.id,
          subjectId: q.subject_id,
          examType: q.exam_type,
          questionText: q.question_text,
          optionA: q.option_a,
          optionB: q.option_b,
          optionC: q.option_c,
          optionD: q.option_d,
          correctOption: q.correct_option,
          explanation: q.explanation || "",
          year: q.year || null,
          imageUrl: q.image_url || null
        }));

        await db.offlineQuestions.bulkPut(offlineQs);
      }

      // 3. Mark pack as downloaded in Dexie
      await db.offlinePacks.put({
        id: pack.id,
        subjectId: pack.subject_id,
        subjectName: pack.subjects.name,
        examType: pack.exam_type,
        questionCount: pack.question_count,
        sizeBytes: pack.size_bytes,
        version: pack.version,
        downloadedAt: Date.now()
      });

      // 4. Save download record to user_pack_downloads to sync
      if (user) {
        await supabase
          .from("user_pack_downloads")
          .insert({ user_id: user.id, pack_id: pack.id });
      }

      // Finish progress animation
      clearInterval(interval);
      setDownloadProgress((prev) => ({ ...prev, [pack.id]: 100 }));
      
      // Invalidate queries to refresh list state
      queryClient.invalidateQueries({ queryKey: ["offlinePacksList"] });
    } catch (err: any) {
      clearInterval(interval);
      alert(err.message || "An error occurred downloading pack.");
      setDownloadProgress((prev) => ({ ...prev, [pack.id]: 0 }));
    } finally {
      setDownloadingPacks((prev) => ({ ...prev, [pack.id]: false }));
    }
  };

  // Handle delete pack and clean IndexedDB Dexie tables
  const handleDeletePack = async (pack: PackItem) => {
    if (!confirm(`Are you sure you want to remove the offline pack for ${pack.subjects.name}?`)) return;

    try {
      // 1. Delete matching questions from Dexie offlineQuestions
      const keysToDelete = await db.offlineQuestions
        .where("subjectId").equals(pack.subject_id)
        .filter(q => q.examType === pack.exam_type)
        .primaryKeys();

      await db.offlineQuestions.bulkDelete(keysToDelete);

      // 2. Delete pack from Dexie offlinePacks
      await db.offlinePacks.delete(pack.id);

      // 3. Delete from Supabase database user downloads
      if (user) {
        await supabase
          .from("user_pack_downloads")
          .delete()
          .eq("user_id", user.id)
          .eq("pack_id", pack.id);
      }

      // Clear local progress tracker
      setDownloadProgress((prev) => {
        const copy = { ...prev };
        delete copy[pack.id];
        return copy;
      });

      queryClient.invalidateQueries({ queryKey: ["offlinePacksList"] });
    } catch (err: any) {
      alert("Failed to delete offline pack.");
    }
  };

  // Convert size bytes to readable MB format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = 1;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Storage usage bar color transitions (green to amber to red)
  const getStorageColor = (pct: number) => {
    if (pct < 35) return "#0F6E56"; // green
    if (pct < 75) return "#D97706"; // amber
    return "#DC2626"; // red
  };

  const barColor = getStorageColor(storagePct);

  return (
    <AppLayout>
      <PageTransition className="max-w-2xl mx-auto py-6 space-y-6">
        
        {/* Offline Mode Banner at top if navigator.onLine is false */}
        {!isOnline && (
          <div className="rounded-xl bg-amber-600/10 border border-amber-600/30 text-amber-500 p-4 flex items-start gap-3 shadow-md backdrop-blur-xl">
            <WifiOff size={18} className="shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-xs">Offline Mode Enabled</h4>
              <p className="text-[10.5px] leading-relaxed text-slate-300">
                You are currently offline. You can practice any of your downloaded subject packs below without internet data!
              </p>
            </div>
          </div>
        )}

        {/* Header Title */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-white">Offline Pack Manager</h2>
            <p className="text-xs text-slate-400">Download syllabus packages to study and take mock exams offline.</p>
          </div>
        </div>

        {/* Disk Quota Bar: fills from 0 on mount, color transitions */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <HardDrive size={14} className="text-brand-primary" />
              <span>Offline Data Usage</span>
            </div>
            <span className="font-extrabold text-white">{storagePct}% of disk quota</span>
          </div>

          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: `${storagePct}%` }}
              transition={{ duration: 1.0, ease: "easeOut" }}
              style={{ backgroundColor: barColor }}
              className="h-full rounded-full"
            />
          </div>

          <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase">
            <span>0 MB</span>
            <span>Allocated: 80 MB limit</span>
          </div>
        </div>

        {/* Stagger list cards */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Available Syllabus Packs
          </h3>

          {error ? (
            <div className="glass-panel p-12 text-center text-slate-500 rounded-2xl border border-white/5">
              Failed to load packs list.
            </div>
          ) : isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <Skeleton key={n} className="h-28 w-full rounded-2xl" />
              ))}
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.08 }
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {packs?.map((pack) => {
                const isDownloading = downloadingPacks[pack.id];
                const pct = downloadProgress[pack.id] ?? 0;
                const isDownloaded = pack.downloaded || pct === 100;
                
                // Mock update check: if version > 1 and pack is downloaded, show update
                const updateAvailable = pack.version > 1 && isDownloaded;

                return (
                  <motion.div
                    key={pack.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
                    }}
                    className={`p-5 rounded-2xl border flex flex-col justify-between h-40 relative overflow-hidden transition-all duration-300 ${
                      isDownloaded
                        ? "border-emerald-500/20 bg-emerald-500/[0.03]"
                        : "border-white/5 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    {/* Bouncing update badge */}
                    {updateAvailable && (
                      <motion.div
                        animate={{ scale: [1, 1.08, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="absolute top-3 right-3 bg-brand-purple text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                      >
                        Update Available
                      </motion.div>
                    )}

                    <div className="space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded text-brand-soft uppercase tracking-wide">
                          {pack.exam_type}
                        </span>
                        <span className="text-[9px] text-slate-500 font-bold">V{pack.version}</span>
                      </div>

                      <h4 className="text-sm font-bold text-white pt-1.5 truncate max-w-[180px]">
                        {pack.subjects.name}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {pack.question_count} Questions • {formatBytes(pack.size_bytes)}
                      </p>
                    </div>

                    {/* Bottom downloads section */}
                    <div className="pt-4 flex justify-between items-center">
                      <AnimatePresence mode="wait">
                        {isDownloaded ? (
                          // Downloaded state UI
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center justify-between w-full"
                          >
                            <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-extrabold">
                              <Check size={14} className="stroke-[3px]" />
                              <span>Downloaded</span>
                            </div>
                            
                            <motion.button
                              onClick={() => handleDeletePack(pack)}
                              variants={buttonPressVariants}
                              whileTap="tap"
                              className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/10"
                              title="Delete pack"
                            >
                              <Trash2 size={13} />
                            </motion.button>
                          </motion.div>
                        ) : isDownloading ? (
                          // Downloading simulation state
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-2 w-full"
                          >
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                              <div className="flex items-center gap-1">
                                <motion.div
                                  animate={{ y: [0, 3, 0] }}
                                  transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                                >
                                  <ArrowDownToLine size={12} className="text-brand-primary" />
                                </motion.div>
                                <span>Downloading...</span>
                              </div>
                              <span>{pct}%</span>
                            </div>

                            {/* Progress bar fill */}
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <div 
                                style={{ width: `${pct}%` }}
                                className="h-full bg-brand-primary transition-all duration-150"
                              />
                            </div>
                          </motion.div>
                        ) : (
                          // Download prompt
                          <motion.button
                            onClick={() => handleDownloadPack(pack)}
                            variants={buttonPressVariants}
                            whileTap="tap"
                            className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-brand-primary/10 transition-colors"
                          >
                            <Download size={13} />
                            <span>Download Pack</span>
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>

                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>

      </PageTransition>
    </AppLayout>
  );
}
