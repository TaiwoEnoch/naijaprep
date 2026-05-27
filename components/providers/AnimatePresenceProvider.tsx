"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import React from "react";

interface AnimatePresenceProviderProps {
  children: React.ReactNode;
}

export default function AnimatePresenceProvider({
  children,
}: AnimatePresenceProviderProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div key={pathname} className="w-full flex-1 flex flex-col">
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
