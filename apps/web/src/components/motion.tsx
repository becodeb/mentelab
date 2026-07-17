"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

/** Coreografía compartida: entradas suaves con resorte, en cascada. */

// Solo transform+opacity: GPU-friendly, cero lag en tablets escolares.
export const springUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 190, damping: 22 },
  },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

/** Contenedor que revela a sus hijos <Reveal/> en cascada al montar. */
export function StaggerIn({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  );
}

/** Igual, pero dispara cuando entra al viewport (scroll reveal). */
export function StaggerInView({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={springUp} className={className}>
      {children}
    </motion.div>
  );
}

/** Emoji flotante decorativo (fondo del hero / pantallas vacías). */
export function FloatingEmoji({
  emoji,
  className,
  delay = 0,
  duration = 7,
}: {
  emoji: string;
  className?: string;
  delay?: number;
  duration?: number;
}) {
  return (
    <motion.span
      aria-hidden
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 120, damping: 14 }}
      className={`pointer-events-none absolute select-none ${className ?? ""}`}
    >
      <motion.span
        className="block"
        animate={{ y: [0, -16, 0], rotate: [-5, 6, -5] }}
        transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
      >
        {emoji}
      </motion.span>
    </motion.span>
  );
}
