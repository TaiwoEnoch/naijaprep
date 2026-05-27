"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store/useAppStore";
import AppLayout from "@/components/layout/AppLayout";
import PageTransition from "@/components/ui/PageTransition";
import Skeleton from "@/components/ui/Skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  MapPin, 
  School, 
  ChevronUp, 
  ChevronDown, 
  Minus, 
  Zap, 
  Globe2,
  Calendar,
  Flame,
  Award
} from "lucide-react";
import { buttonPressVariants } from "@/lib/animations";

interface LeaderboardUser {
  id: string;
  first_name: string;
  last_name?: string | null;
  avatar_url?: string | null;
  state?: string | null;
  schools?: { id: string; name: string } | null;
}

interface LeaderboardEntry {
  id: string;
  score: number;
  rank: number;
  period: string;
  scope: string;
  state?: string | null;
  users: LeaderboardUser;
}

type ScopeType = "national" | "state" | "school";
type PeriodType = "week" | "month" | "all_time";

export default function LeaderboardPage() {
  const { user } = useAppStore();
  const [activeScope, setActiveScope] = useState<ScopeType>("national");
  const [activePeriod, setActivePeriod] = useState<PeriodType>("week");

  // Fetch leaderboard data
  const { data: leaderboardData, isLoading, error } = useQuery({
    queryKey: ["leaderboard", activeScope, activePeriod],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard?scope=${activeScope}&period=${activePeriod}`);
      if (!res.ok) throw new Error("Failed to load leaderboard.");
      const json = await res.json();
      return json.data || json;
    },
    refetchOnMount: true,
  });

  // Helper to format avatar initials
  const getInitials = (firstName: string, lastName?: string | null) => {
    return `${firstName.charAt(0)}${lastName?.charAt(0) || ""}`.toUpperCase();
  };

  // Determine rank change deterministically from user ID
  const getRankChange = (userId: string) => {
    const code = userId.charCodeAt(0) + (userId.charCodeAt(1) || 0);
    if (code % 3 === 0) return "up";
    if (code % 3 === 1) return "down";
    return "same";
  };

  const leaderboardList: LeaderboardEntry[] = leaderboardData?.leaderboard || [];
  const currentUserStats = leaderboardData?.currentUser || { rank: null, score: 0 };

  // Split into podium and rank list
  const podiumEntries = leaderboardList.slice(0, 3);
  const remainingEntries = leaderboardList.slice(3);

  // Re-map podium to: [2nd, 1st, 3rd] for layout positioning
  const firstPlace = podiumEntries[0] || null;
  const secondPlace = podiumEntries[1] || null;
  const thirdPlace = podiumEntries[2] || null;

  // Percentile rank calculation for current user progress bar
  const userRank = currentUserStats?.rank || 0;
  const totalInScope = Math.max(100, leaderboardList.length);
  const percentile = userRank 
    ? Math.min(100, Math.max(1, Math.round(((totalInScope - userRank) / totalInScope) * 100)))
    : 0;

  // Framer Motion Variants for Podium
  const podiumBarVariants = {
    hidden: { height: 0 },
    visible: (customHeight: string) => ({
      height: customHeight,
      transition: { duration: 0.8, ease: "easeOut" as const }
    })
  };

  const avatarVariants = {
    hidden: { y: -80, opacity: 0 },
    visible: (delay: number) => ({
      y: 0,
      opacity: 1,
      transition: {
        delay: delay + 0.6,
        type: "spring" as const,
        stiffness: 150,
        damping: 10 // spring bounce
      }
    })
  };

  const crownVariants = {
    hidden: { scale: 0, opacity: 0, y: 15 },
    visible: {
      scale: 1,
      opacity: 1,
      y: 0,
      transition: {
        delay: 1.4,
        type: "spring" as const,
        stiffness: 200,
        damping: 12
      }
    }
  };

  return (
    <AppLayout>
      <PageTransition className="max-w-2xl mx-auto py-6 space-y-6">
        
        {/* Top Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Trophy className="text-amber-500 fill-amber-500/20" size={24} />
              <span>Hall of Fame</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Compete with peers nationwide, in your state, or inside your school!
            </p>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          {/* Scope Switcher Tabs with layoutId indicator */}
          <div className="flex p-1 bg-white/5 border border-white/5 rounded-xl w-fit relative z-10">
            {[
              { id: "national", label: "National", icon: Globe2 },
              { id: "state", label: "State", icon: MapPin },
              { id: "school", label: "School", icon: School },
            ].map((scope) => {
              const Icon = scope.icon;
              return (
                <button
                  key={scope.id}
                  onClick={() => setActiveScope(scope.id as ScopeType)}
                  className={`relative px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                    activeScope === scope.id ? "text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {activeScope === scope.id && (
                    <motion.div
                      layoutId="activeScopeIndicator"
                      className="absolute inset-0 bg-brand-primary rounded-lg z-0"
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    />
                  )}
                  <Icon size={13} className="relative z-10 shrink-0" />
                  <span className="relative z-10">{scope.label}</span>
                </button>
              );
            })}
          </div>

          {/* Period Toggle Switch */}
          <div className="flex p-1 bg-white/5 border border-white/5 rounded-xl w-fit relative z-10">
            {[
              { id: "week", label: "This Week" },
              { id: "month", label: "This Month" },
              { id: "all_time", label: "All Time" },
            ].map((period) => (
              <button
                key={period.id}
                onClick={() => setActivePeriod(period.id as PeriodType)}
                className={`relative px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  activePeriod === period.id ? "text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {activePeriod === period.id && (
                  <motion.div
                    layoutId="activePeriodIndicator"
                    className="absolute inset-0 bg-brand-purple rounded-lg z-0"
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  />
                )}
                <span className="relative z-10">{period.label}</span>
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="glass-panel p-12 text-center text-slate-500 rounded-2xl border border-white/5">
            Failed to retrieve leaderboard statistics. Please check your internet connection.
          </div>
        ) : isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            {/* Podium Section (animated on mount) */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col justify-between h-72 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-brand-primary/5 via-transparent to-transparent pointer-events-none" />
              
              <div className="flex items-end justify-center gap-4 sm:gap-8 h-full pt-12 max-w-md mx-auto w-full">
                
                {/* 2nd Place Column */}
                <div className="flex flex-col items-center flex-1 h-full justify-end">
                  <AnimatePresence>
                    {secondPlace && (
                      <div className="flex flex-col items-center w-full">
                        <motion.div 
                          custom={0.4} 
                          variants={avatarVariants} 
                          initial="hidden" 
                          animate="visible"
                          className="relative"
                        >
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-slate-300 bg-white/10 flex items-center justify-center font-bold text-xs text-white overflow-hidden shadow-lg">
                            {secondPlace.users.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={secondPlace.users.avatar_url} alt="2nd avatar" className="w-full h-full object-cover" />
                            ) : (
                              getInitials(secondPlace.users.first_name, secondPlace.users.last_name)
                            )}
                          </div>
                          <span className="absolute -bottom-1 -right-1 bg-slate-300 text-black text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">2</span>
                        </motion.div>
                        
                        <div className="text-[10px] font-bold text-slate-300 text-center truncate max-w-[80px] pt-1">
                          {secondPlace.users.first_name}
                        </div>
                        <div className="text-[9px] text-slate-400 font-extrabold pb-2">{secondPlace.score} Qs</div>
                      </div>
                    )}
                  </AnimatePresence>
                  
                  {/* Podium Pillar */}
                  <motion.div
                    custom="60%"
                    variants={podiumBarVariants}
                    initial="hidden"
                    animate="visible"
                    className="w-full bg-gradient-to-t from-white/5 to-white/15 border-t border-white/10 rounded-t-xl min-h-[50px] flex items-center justify-center shadow-2xl"
                  />
                </div>

                {/* 1st Place Column */}
                <div className="flex flex-col items-center flex-1 h-full justify-end relative">
                  <AnimatePresence>
                    {firstPlace && (
                      <div className="flex flex-col items-center w-full relative z-10">
                        {/* Crown on 1st place animates in with golden glow */}
                        <motion.div
                          variants={crownVariants}
                          initial="hidden"
                          animate="visible"
                          className="absolute -top-6 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                        >
                          👑
                        </motion.div>

                        <motion.div 
                          custom={0.2} 
                          variants={avatarVariants} 
                          initial="hidden" 
                          animate="visible"
                          className="relative"
                        >
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-amber-500 bg-white/10 flex items-center justify-center font-bold text-xs text-white overflow-hidden shadow-xl ring-4 ring-amber-500/10">
                            {firstPlace.users.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={firstPlace.users.avatar_url} alt="1st avatar" className="w-full h-full object-cover" />
                            ) : (
                              getInitials(firstPlace.users.first_name, firstPlace.users.last_name)
                            )}
                          </div>
                          <span className="absolute -bottom-1 -right-1 bg-amber-500 text-black text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">1</span>
                        </motion.div>
                        
                        <div className="text-[10px] font-bold text-white text-center truncate max-w-[80px] pt-1">
                          {firstPlace.users.first_name}
                        </div>
                        <div className="text-[9px] text-amber-400 font-extrabold pb-2">{firstPlace.score} Qs</div>
                      </div>
                    )}
                  </AnimatePresence>
                  
                  {/* Podium Pillar */}
                  <motion.div
                    custom="100%"
                    variants={podiumBarVariants}
                    initial="hidden"
                    animate="visible"
                    className="w-full bg-gradient-to-t from-brand-primary/10 to-brand-primary/30 border-t border-brand-primary/40 rounded-t-xl min-h-[80px] flex items-center justify-center shadow-2xl relative"
                  />
                </div>

                {/* 3rd Place Column */}
                <div className="flex flex-col items-center flex-1 h-full justify-end">
                  <AnimatePresence>
                    {thirdPlace && (
                      <div className="flex flex-col items-center w-full">
                        <motion.div 
                          custom={0.6} 
                          variants={avatarVariants} 
                          initial="hidden" 
                          animate="visible"
                          className="relative"
                        >
                          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 border-amber-700 bg-white/10 flex items-center justify-center font-bold text-xs text-white overflow-hidden shadow-lg">
                            {thirdPlace.users.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thirdPlace.users.avatar_url} alt="3rd avatar" className="w-full h-full object-cover" />
                            ) : (
                              getInitials(thirdPlace.users.first_name, thirdPlace.users.last_name)
                            )}
                          </div>
                          <span className="absolute -bottom-1 -right-1 bg-amber-700 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">3</span>
                        </motion.div>
                        
                        <div className="text-[10px] font-bold text-slate-300 text-center truncate max-w-[80px] pt-1">
                          {thirdPlace.users.first_name}
                        </div>
                        <div className="text-[9px] text-slate-400 font-extrabold pb-2">{thirdPlace.score} Qs</div>
                      </div>
                    )}
                  </AnimatePresence>
                  
                  {/* Podium Pillar */}
                  <motion.div
                    custom="40%"
                    variants={podiumBarVariants}
                    initial="hidden"
                    animate="visible"
                    className="w-full bg-gradient-to-t from-white/5 to-white/10 border-t border-white/10 rounded-t-xl min-h-[30px] flex items-center justify-center shadow-2xl"
                  />
                </div>

              </div>
            </div>

            {/* Rank List below podium */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
                <Calendar size={13} className="text-brand-primary" />
                <span>Rankings List</span>
              </h3>

              {/* Rows stagger list */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.04 }
                  }
                }}
                className="space-y-2"
              >
                {remainingEntries.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    Keep studying to join the Hall of Fame rankings!
                  </div>
                ) : (
                  remainingEntries.map((entry, idx) => {
                    const changeType = getRankChange(entry.id);
                    const isCurrentUser = user && user.id === entry.users.id;

                    return (
                      <motion.div
                        key={entry.id}
                        variants={{
                          hidden: { opacity: 0, x: 40 },
                          visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 350, damping: 26 } }
                        }}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                          isCurrentUser
                            ? "border-brand-primary/50 bg-brand-primary/10 ring-2 ring-brand-primary/20 animate-pulse"
                            : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                        }`}
                      >
                        {/* Rank index & Avatar */}
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-black text-slate-400 w-5 text-center shrink-0">
                            {entry.rank}
                          </span>
                          
                          <div className="w-8 h-8 rounded-full border border-white/10 bg-white/10 flex items-center justify-center font-bold text-xs text-white overflow-hidden shrink-0">
                            {entry.users.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={entry.users.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              getInitials(entry.users.first_name, entry.users.last_name)
                            )}
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">
                              {entry.users.first_name} {entry.users.last_name || ""}
                            </h4>
                            <p className="text-[10px] text-slate-400 truncate">
                              {entry.users.schools?.name || entry.users.state || "Scholar"}
                            </p>
                          </div>
                        </div>

                        {/* Rank change indicator & Score */}
                        <div className="flex items-center gap-4 shrink-0">
                          {changeType === "up" ? (
                            <div className="text-emerald-500 flex items-center animate-bounce">
                              <ChevronUp size={16} />
                            </div>
                          ) : changeType === "down" ? (
                            <div className="text-red-500 flex items-center">
                              <ChevronDown size={16} />
                            </div>
                          ) : (
                            <div className="text-slate-500 flex items-center">
                              <Minus size={14} />
                            </div>
                          )}

                          <div className="text-right">
                            <span className="text-xs font-extrabold text-white block">{entry.score}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">QS</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </motion.div>
            </div>

            {/* My Rank Percentile Progress Bar at bottom */}
            {userRank > 0 && (
              <div className="glass-panel p-5 rounded-2xl border border-brand-primary/20 bg-brand-dark/40 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Award size={16} className="text-brand-primary" />
                    <span className="font-extrabold text-white">Your Rank: #{userRank}</span>
                  </div>
                  <span className="text-brand-soft font-extrabold">Better than {percentile}% of students</span>
                </div>
                
                {/* Progress bar track */}
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: `${percentile}%` }}
                    transition={{ duration: 1.0, ease: "easeOut" }}
                    className="h-full bg-brand-primary rounded-full"
                  />
                </div>
              </div>
            )}
          </>
        )}

      </PageTransition>
    </AppLayout>
  );
}
