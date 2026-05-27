"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store/useAppStore";
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Calendar,
  Trophy,
  User,
  Bell,
  LogOut,
  Flame,
  Sparkles,
  Wifi,
  WifiOff,
  GraduationCap,
  Download
} from "lucide-react";
import { buttonPressVariants } from "@/lib/animations";
import { motion } from "framer-motion";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isOnline, setOnline, setUser } = useAppStore();

  // Monitor network status
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleOnline = () => setOnline(true);
      const handleOffline = () => setOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Initial check
      setOnline(window.navigator.onLine);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, [setOnline]);

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Practice", href: "/practice", icon: BookOpen },
    { name: "Performance", href: "/performance", icon: BarChart3 },
    { name: "Study Plan", href: "/study-plan", icon: Calendar },
    { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
    { name: "Offline Packs", href: "/offline", icon: Download },
    { name: "Plans", href: "/plans", icon: Sparkles, highlight: true },
    { name: "Profile", href: "/profile", icon: User },
  ];

  // Include Teacher Portal link if user is teacher
  if (user?.role === "teacher") {
    navItems.splice(navItems.length - 1, 0, {
      name: "Teacher Portal",
      href: "/teacher",
      icon: GraduationCap,
    });
  }

  const handleLogout = () => {
    setUser(null);
    router.push("/auth/signup");
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-white text-slate-800 md:bg-brand-bg md:text-white font-sans transition-colors duration-300">
      
      {/* 6 floating blurred circles behind all authenticated page content */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 hidden md:block">
        {/* Circle 1: 400px, rgba(29,158,117,0.08), top-left, float 12s infinite */}
        <div className="absolute w-[400px] h-[400px] rounded-full bg-[rgba(29,158,117,0.08)] filter blur-[60px] top-[-100px] left-[-100px] animate-float-1" />
        
        {/* Circle 2: 300px, rgba(83,74,183,0.06), top-right, float 9s infinite reverse */}
        <div className="absolute w-[300px] h-[300px] rounded-full bg-[rgba(83,74,183,0.06)] filter blur-[60px] top-[-50px] right-[-50px] animate-float-2" />
        
        {/* Circle 3: 250px, rgba(29,158,117,0.05), bottom-left, float 15s infinite */}
        <div className="absolute w-[250px] h-[250px] rounded-full bg-[rgba(29,158,117,0.05)] filter blur-[60px] bottom-[-50px] left-[-50px] animate-float-3" />
        
        {/* Circle 4: 350px, rgba(83,74,183,0.05), bottom-right, float 11s infinite reverse */}
        <div className="absolute w-[350px] h-[350px] rounded-full bg-[rgba(83,74,183,0.05)] filter blur-[60px] bottom-[-100px] right-[-100px] animate-float-4" />
        
        {/* Circle 5: 200px, rgba(29,158,117,0.07), center-left, float 8s infinite */}
        <div className="absolute w-[200px] h-[200px] rounded-full bg-[rgba(29,158,117,0.07)] filter blur-[60px] top-[40%] left-[-100px] animate-float-5" />
        
        {/* Circle 6: 280px, rgba(186,117,23,0.04), center-right, float 13s infinite reverse */}
        <div className="absolute w-[280px] h-[280px] rounded-full bg-[rgba(186,117,23,0.04)] filter blur-[60px] top-[40%] right-[-100px] animate-float-6" />
      </div>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-600 text-white text-center py-2 text-sm font-semibold flex items-center justify-center gap-2 animate-pulse shadow-md">
          <WifiOff size={16} />
          <span>You are currently offline. Running in offline mode.</span>
        </div>
      )}

      {/* Desktop Left Sidebar (>= 1024px) */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 border-r border-white/5 bg-[#081e16]/80 backdrop-blur-xl z-30 p-6">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-brand-primary/20">
            N
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-brand-soft">
              NaijaPrep
            </span>
            <div className="text-[10px] text-brand-primary font-medium tracking-widest uppercase">
              Exam Hub
            </div>
          </div>
        </div>

        {/* User Quick Info */}
        {user && (
          <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-purple flex items-center justify-center text-white font-semibold text-sm">
                {user.name.charAt(0)}
              </div>
              <div className="max-w-[100px] overflow-hidden">
                <div className="font-semibold text-sm truncate">{user.name}</div>
                <div className="text-[11px] text-brand-soft/70 capitalize">{user.examType || "JAMB"} candidate</div>
              </div>
            </div>
            
            {/* Streak flame indicator */}
            <div className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg text-xs font-bold">
              <Flame size={14} className="fill-amber-500 animate-pulse" />
              <span>{user.streak}d</span>
            </div>
          </div>
        )}

        {/* Sidebar Nav links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <motion.div
                  variants={buttonPressVariants}
                  whileTap="tap"
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20 font-semibold"
                      : item.highlight
                      ? "bg-brand-purple/20 text-brand-purple hover:bg-brand-purple/30"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-white" : "opacity-80"} />
                  <span>{item.name}</span>
                  {item.highlight && (
                    <span className="ml-auto bg-brand-purple text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      PRO
                    </span>
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom LogOut */}
        <div className="pt-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen relative z-10">
        
        {/* Top Header / Navigation Bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between px-4 md:px-8 bg-white md:bg-brand-bg/60 border-b border-slate-100 md:border-white/5 backdrop-blur-xl">
          {/* Left Welcome (Desktop) or Title (Mobile) */}
          <div className="flex items-center gap-3">
            {/* Logo on mobile/tablet */}
            <div className="flex lg:hidden items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center text-white font-extrabold text-md">
                N
              </div>
              <span className="font-bold text-md md:text-lg text-slate-900 md:text-white">
                NaijaPrep
              </span>
            </div>
            
            <div className="hidden lg:block">
              <h1 className="text-sm font-medium text-slate-400">Welcome back,</h1>
              <p className="text-base font-bold text-white">{user?.name}</p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-4">
            {/* Streak flame (Mobile/Tablet) */}
            {user && (
              <div className="flex lg:hidden items-center gap-1 text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg text-xs font-bold">
                <Flame size={14} className="fill-amber-500" />
                <span>{user.streak}d</span>
              </div>
            )}

            {/* Notification Bell */}
            <Link href="/notifications">
              <button className="p-2 rounded-xl text-slate-500 md:text-slate-400 hover:text-slate-800 md:hover:text-white hover:bg-slate-100 md:hover:bg-white/5 transition-all relative">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-brand-purple rounded-full ring-2 ring-white md:ring-brand-bg" />
              </button>
            </Link>

            {/* User Avatar (Desktop) */}
            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200 md:border-white/10">
              <div className="w-9 h-9 rounded-full bg-brand-primary flex items-center justify-center text-white font-semibold text-sm">
                {user?.name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        {/* Tablet Centering Wrapper: on Tablet screen (768px-1023px) center layout */}
        <main className="flex-1 w-full px-4 md:px-8 py-6 pb-24 md:pb-24 lg:pb-8 mx-auto md:max-w-3xl lg:max-w-none transition-all duration-300">
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile & Tablet Bottom Navigation Bar (< 1024px) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-100 md:bg-[#0a231b]/95 md:border-white/5 flex items-center justify-around z-50 px-2 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.05)] backdrop-blur-md">
        {navItems.filter(item => !item.highlight).slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href} className="flex-1 py-1">
              <div className="flex flex-col items-center justify-center gap-1 cursor-pointer">
                <motion.div
                  variants={buttonPressVariants}
                  whileTap="tap"
                  className={`p-1.5 rounded-xl ${
                    isActive
                      ? "text-brand-primary md:text-brand-soft bg-brand-primary/10 md:bg-white/5"
                      : "text-slate-400 md:text-slate-500 hover:text-slate-700 md:hover:text-white"
                  }`}
                >
                  <Icon size={20} />
                </motion.div>
                <span className={`text-[10px] font-medium tracking-tight ${
                  isActive 
                    ? "text-brand-primary md:text-brand-soft font-semibold" 
                    : "text-slate-400 md:text-slate-500"
                }`}>
                  {item.name}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
