"use client";

import React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store/useAppStore";
import AppLayout from "@/components/layout/AppLayout";
import PageTransition from "@/components/ui/PageTransition";
import Skeleton from "@/components/ui/Skeleton";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, 
  CheckCheck, 
  Clock, 
  MailOpen, 
  Inbox, 
  ArrowLeft,
  ChevronRight
} from "lucide-react";
import { buttonPressVariants } from "@/lib/animations";

interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { user } = useAppStore();
  const supabase = createClient();

  // Fetch notifications
  const { data: notifications, isLoading, error } = useQuery<NotificationItem[]>({
    queryKey: ["userNotificationsList"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to load notifications.");
      const json = await res.json();
      return json.data || json;
    },
    refetchOnMount: true,
  });

  // Mark single notification as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to mark as read.");
      return json.data || json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userNotificationsList"] });
    }
  });

  // Mark all notifications as read using client-side Supabase bulk update
  const handleMarkAllRead = async () => {
    if (!user || !notifications) return;
    const unreadCount = notifications.filter(n => !n.is_read).length;
    if (unreadCount === 0) return;

    try {
      const { error: dbError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["userNotificationsList"] });
    } catch (err) {
      console.error(err);
      alert("Failed to mark notifications as read.");
    }
  };

  // Group notifications into Today, Yesterday, and Earlier
  const groupNotifications = (list: NotificationItem[]) => {
    const today: NotificationItem[] = [];
    const yesterday: NotificationItem[] = [];
    const earlier: NotificationItem[] = [];

    const todayStr = new Date().toDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toDateString();

    list.forEach((item) => {
      const itemDateStr = new Date(item.created_at).toDateString();
      if (itemDateStr === todayStr) {
        today.push(item);
      } else if (itemDateStr === yesterdayStr) {
        yesterday.push(item);
      } else {
        earlier.push(item);
      }
    });

    return { today, yesterday, earlier };
  };

  const notificationList = notifications || [];
  const { today, yesterday, earlier } = groupNotifications(notificationList);
  const unreadNotificationsCount = notificationList.filter(n => !n.is_read).length;

  return (
    <AppLayout>
      <PageTransition className="max-w-2xl mx-auto py-6 space-y-6">
        
        {/* Header toolbar */}
        <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-100 md:border-white/5">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Bell className="text-brand-purple fill-brand-purple/10" size={22} />
              <span>Inbox Notifications</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Stay updated with syllabus additions, leaderboard announcements, and plan updates.
            </p>
          </div>

          {/* Mark all read button */}
          {unreadNotificationsCount > 0 && (
            <motion.button
              onClick={handleMarkAllRead}
              variants={buttonPressVariants}
              whileTap="tap"
              className="px-3 py-1.5 bg-brand-primary/10 border border-brand-primary/20 text-brand-soft text-[10.5px] font-bold rounded-lg flex items-center gap-1 hover:bg-brand-primary hover:text-white transition-colors"
            >
              <CheckCheck size={13} />
              <span>Mark all read</span>
            </motion.button>
          )}
        </div>

        {error ? (
          <div className="glass-panel p-12 text-center text-slate-500 rounded-2xl border border-white/5">
            Failed to retrieve inbox alerts.
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(n => (
              <Skeleton key={n} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : notificationList.length === 0 ? (
          /* Empty State illustration */
          <div className="glass-panel p-16 rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 shadow-inner">
              <Inbox size={32} />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="font-extrabold text-sm text-white">Your inbox is empty</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                When you get alerts about mock performance achievements, weekly streaks, or syllabus updates, they will appear here!
              </p>
            </div>
            <Link href="/practice" className="pt-2">
              <button className="bg-brand-primary hover:bg-brand-primary/95 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-lg transition-colors">
                Start Practicing
              </button>
            </Link>
          </div>
        ) : (
          /* Group list details */
          <div className="space-y-6">
            {[
              { title: "Today", items: today },
              { title: "Yesterday", items: yesterday },
              { title: "Earlier", items: earlier }
            ].map((group) => {
              if (group.items.length === 0) return null;

              return (
                <div key={group.title} className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                    {group.title}
                  </h3>

                  <div className="space-y-2">
                    {group.items.map((item) => {
                      const isUnread = !item.is_read;
                      
                      return (
                        <motion.div
                          key={item.id}
                          layout
                          onClick={() => {
                            if (isUnread) markReadMutation.mutate(item.id);
                          }}
                          className={`p-4 rounded-xl border cursor-pointer flex gap-3.5 transition-all duration-300 ${
                            isUnread
                              ? "bg-emerald-50/50 text-slate-800 border-l-4 border-l-brand-primary border-slate-100 md:bg-brand-primary/10 md:text-white md:border-l-brand-primary md:border-white/5"
                              : "bg-white text-slate-600 border-l border-slate-100 md:bg-white/5 md:text-slate-400 md:border-white/5"
                          }`}
                        >
                          {/* Alert Type icon indicator */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                            isUnread 
                              ? "bg-brand-primary text-white" 
                              : "bg-slate-100 text-slate-400 md:bg-white/5 md:text-slate-500"
                          }`}>
                            <Bell size={14} />
                          </div>

                          <div className="flex-1 space-y-0.5">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className={`text-xs font-bold ${isUnread ? "text-slate-900 md:text-white" : "text-slate-700 md:text-slate-300"}`}>
                                {item.title}
                              </h4>
                              
                              <span className="text-[9px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
                                <Clock size={10} />
                                <span>{new Date(item.created_at).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" })}</span>
                              </span>
                            </div>

                            <p className="text-[11px] leading-relaxed">
                              {item.message}
                            </p>
                          </div>

                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </PageTransition>
    </AppLayout>
  );
}
