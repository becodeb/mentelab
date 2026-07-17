"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { SpeedMatchConfig } from "@mentelab/benchmarks";
import type { GameProps } from "../shell/types";
import { sfx } from "@/lib/sfx";

/** Símbolos geométricos SVG grandes y bien distinguibles. */
const SYMBOLS: { color: string; el: React.ReactNode }[] = [
  { color: "#c65230", el: <circle cx="40" cy="40" r="26" /> },
  { color: "#5f7cc6", el: <rect x="15" y="15" width="50" height="50" rx="9" /> },
  { color: "#719c58", el: <path d="M40 12l30 52H10z" /> },
  { color: "#d99a26", el: <path d="M40 10l8.5 18 19.5 2.5-14.3 13.4 3.7 19.4L40 54l-17.4 9.3 3.7-19.4L12 30.5 31.5 28z" /> },
  { color: "#bd6684", el: <path d="M40 66S16 52 16 36.5A13.4 13.4 0 0140 27a13.4 13.4 0 0124 9.5C64 52 40 66 40 66z" /> },
  { color: "#4a9c8f", el: <path d="M40 12a28 28 0 000 56 22 22 0 010-56z" /> },
  { color: "#7d6aa8", el: <path d="M14 52l10-28 12 18 12-24 12 34z" /> },
  { color: "#2a2418", el: <path d="M22 14h36l-9 26 9 26H22l9-26z" /> },
];

type Phase = "first" | "playing";

/** ¿IGUAL AL ANTERIOR? (speed match 1-back). */
export function SpeedMatchGame({ config, emit, now, finish }: GameProps) {
  const cfg = config as SpeedMatchConfig;
  const [current, setCurrent] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("first");
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(cfg.durationSec);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const prevRef = useRef<number | null>(null);
  const shownAtRef = useRef(0);
  const finishedRef = useRef(false);

  const nextSymbol = useCallback(
    (prev: number | null) => {
      // 45% de probabilidad de repetir el anterior (mantiene la duda viva).
      let s: number;
      if (prev !== null && Math.random() < 0.45) {
        s = prev;
      } else {
        do {
          s = Math.floor(Math.random() * cfg.symbolCount);
        } while (s === prev && cfg.symbolCount > 1 && Math.random() < 0.5);
      }
      setCurrent(s);
      shownAtRef.current = now();
      emit("symbol_shown", { symbol: s });
      return s;
    },
    [cfg.symbolCount, emit, now],
  );

  useEffect(() => {
    nextSymbol(null);
    const interval = setInterval(() => {
      const left = cfg.durationSec - Math.floor(now() / 1000);
      setSecondsLeft(Math.max(0, left));
      if (left <= 0 && !finishedRef.current) {
        finishedRef.current = true;
        finish();
      }
    }, 250);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answer = (saysSame: boolean) => {
    if (current === null || finishedRef.current) return;
    if (phase === "first") {
      // La primera figura no tiene anterior: arranca el juego real.
      prevRef.current = current;
      setPhase("playing");
      nextSymbol(current);
      return;
    }
    const wasSame = current === prevRef.current;
    const correct = saysSame === wasSame;
    emit("match_answer", {
      correct,
      wasSame,
      ms: Math.round(now() - shownAtRef.current),
    });
    if (correct) {
      sfx.success();
      setScore((s) => s + 1);
    } else {
      sfx.error();
    }
    setFlash(correct ? "ok" : "bad");
    setTimeout(() => setFlash(null), 160);
    prevRef.current = current;
    nextSymbol(current);
  };

  const sym = current !== null ? SYMBOLS[current % SYMBOLS.length]! : null;

  return (
    <div
      className={`flex min-h-dvh select-none flex-col items-center justify-center p-6 transition-colors duration-150 ${
        flash === "ok" ? "bg-emerald-50" : flash === "bad" ? "bg-rose-50" : "bg-cream-50"
      }`}
    >
      <div className="flex items-center gap-8 font-display text-sm font-bold uppercase tracking-[0.25em] text-ink-400">
        <span>{secondsLeft}s</span>
        <span className="text-ink-700">{score} aciertos</span>
      </div>
      <p className="mt-3 font-display text-xl font-semibold text-ink-500">
        {phase === "first" ? "Memorizá la primera figura…" : "¿Es igual a la anterior?"}
      </p>

      <motion.div
        key={`${current}-${score}-${secondsLeft}`}
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 20 }}
        className="mt-8 flex h-44 w-44 items-center justify-center rounded-[2rem] border border-ink-900/10 bg-[#fffdf6] shadow-[0_12px_36px_-14px_rgba(32,27,18,0.35)]"
      >
        {sym && (
          <svg viewBox="0 0 80 80" className="h-28 w-28" fill={sym.color} stroke="none">
            {sym.el}
          </svg>
        )}
      </motion.div>

      <div className="mt-10 grid w-full max-w-md grid-cols-2 gap-4">
        <button
          onPointerDown={() => answer(true)}
          className="rounded-[1.5rem] bg-emerald-500 py-6 font-display text-2xl font-bold text-cream-50 shadow-[0_10px_28px_-10px_rgba(140,181,115,0.8)] transition-all hover:-translate-y-1 active:scale-95"
        >
          {phase === "first" ? "¡Lista!" : "SÍ, igual"}
        </button>
        <button
          onPointerDown={() => answer(false)}
          disabled={phase === "first"}
          className="rounded-[1.5rem] border-2 border-ink-900/15 bg-[#fffdf6] py-6 font-display text-2xl font-bold text-ink-900 transition-all hover:-translate-y-1 hover:border-ink-900 active:scale-95 disabled:opacity-30"
        >
          NO, distinta
        </button>
      </div>
    </div>
  );
}
