"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ReactionTimeConfig } from "@mentelab/benchmarks";
import type { GameProps } from "../shell/types";
import { sfx } from "@/lib/sfx";

type Phase = "waiting" | "ready" | "feedback" | "falseStart";

/**
 * Pantalla completa REAL (fixed inset-0). Accesible para daltonismo:
 * color + forma + texto cambian juntos. Sonido en el estímulo y el toque.
 */
export function ReactionTimeGame({ config, emit, now, finish }: GameProps) {
  const cfg = config as ReactionTimeConfig;
  const [phase, setPhase] = useState<Phase>("waiting");
  const [round, setRound] = useState(1);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  const shownAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const scheduleStimulus = useCallback(() => {
    setPhase("waiting");
    const delay = cfg.minDelayMs + Math.random() * (cfg.maxDelayMs - cfg.minDelayMs);
    timerRef.current = setTimeout(() => {
      shownAtRef.current = now();
      emit("stimulus_shown", { round });
      sfx.go();
      setPhase("ready");
    }, delay);
  }, [cfg.minDelayMs, cfg.maxDelayMs, emit, now, round]);

  useEffect(() => {
    scheduleStimulus();
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const handlePress = (e: React.PointerEvent) => {
    setRipple({ x: e.clientX, y: e.clientY, id: Date.now() });
    if (phase === "waiting") {
      clearTimeout(timerRef.current);
      emit("false_start", { round });
      sfx.error();
      setPhase("falseStart");
      setTimeout(() => scheduleStimulus(), 1300);
      return;
    }
    if (phase === "ready") {
      const reactionMs = now() - shownAtRef.current;
      emit("round_click", { round, reactionMs });
      sfx.success();
      setLastMs(reactionMs);
      setPhase("feedback");
      setTimeout(() => {
        if (round >= cfg.rounds) finish();
        else setRound((r) => r + 1);
      }, 950);
    }
  };

  const theme: Record<Phase, string> = {
    waiting: "bg-ink-900",
    ready: "bg-[#4f7d43]",
    falseStart: "bg-amber-500",
    feedback: "bg-cream-50",
  };

  return (
    <button
      onPointerDown={handlePress}
      className={`fixed inset-0 z-40 flex min-h-dvh w-full select-none flex-col items-center justify-center overflow-hidden transition-colors duration-100 ${theme[phase]}`}
    >
      {/* Onda expansiva en cada toque */}
      <AnimatePresence>
        {ripple && (
          <motion.span
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.35 }}
            animate={{ scale: 22, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            onAnimationComplete={() => setRipple(null)}
            className="pointer-events-none absolute h-10 w-10 rounded-full bg-cream-50"
            style={{ left: ripple.x - 20, top: ripple.y - 20 }}
          />
        )}
      </AnimatePresence>

      <p
        className={`font-display text-sm font-bold uppercase tracking-[0.3em] ${
          phase === "feedback" ? "text-ink-400" : "text-cream-50/60"
        }`}
      >
        ronda {round} de {cfg.rounds}
      </p>

      {phase === "waiting" && (
        <>
          <motion.span
            className="mt-8 block h-24 w-24 rounded-full border-4 border-cream-50/40"
            animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <p className="mt-8 font-display text-4xl font-bold text-cream-50">Esperá…</p>
          <p className="mt-2 text-lg font-semibold text-cream-50/50">
            tocá cuando la pantalla se encienda
          </p>
        </>
      )}

      {phase === "ready" && (
        <motion.div
          initial={{ scale: 0.7 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="mt-6 flex flex-col items-center"
        >
          <span className="block h-24 w-24 rounded-full bg-cream-50" />
          <p className="mt-8 font-display text-7xl font-black text-cream-50">¡AHORA!</p>
        </motion.div>
      )}

      {phase === "falseStart" && (
        <>
          <motion.p
            initial={{ x: 0 }}
            animate={{ x: [-10, 10, -6, 6, 0] }}
            transition={{ duration: 0.4 }}
            className="mt-8 font-display text-5xl font-bold text-ink-900"
          >
            ¡Muy pronto!
          </motion.p>
          <p className="mt-3 text-xl font-semibold text-ink-900/70">
            Esperá a que la pantalla se encienda
          </p>
        </>
      )}

      {phase === "feedback" && lastMs != null && (
        <>
          <motion.p
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 14 }}
            className="mt-4 font-display text-8xl font-black text-ink-900"
          >
            {Math.round(lastMs)}
            <span className="text-4xl font-bold text-ink-400"> ms</span>
          </motion.p>
          <p className="mt-3 font-display text-2xl font-semibold italic text-brand-600">
            {lastMs < 300 ? "¡Relámpago!" : lastMs < 450 ? "¡Muy bien!" : "¡Bien ahí!"}
          </p>
        </>
      )}
    </button>
  );
}
