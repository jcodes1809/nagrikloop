"use client";
import { motion } from "motion/react";
import type { ReactNode } from "react";

// Every page change slides + fades in smoothly.
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, x: 36 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", damping: 30, stiffness: 260 }}>
      {children}
    </motion.div>
  );
}
