"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TRAP_COLORS, type ColorTrapConfig } from "@mentelab/benchmarks";
import type { GameProps } from "../shell/types";
import { sfx } from "@/lib/sfx";

interface Prompt {
  word: (typeof TRAP_COLORS)[number];
  ink: (typeof TRAP_COLORS)[number];
}

/** TRAMPA DE COLOR (Stroop): tocá el color de la TINTA, no lo que dice. */
export function ColorTrapGame({ config, emit, now, finish }: GameProps) {
  const cfg = config as ColorTrapConfig;
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(cfg.durationSec);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const shownAtRef = useRef(0);
  const finishedRef = useRef(false);

  const nextPrompt = useCallback(() => {
    const word = TRAP_COLORS[Math.floor(Math.random() * TRAP_COLORS.length)]!;
    let ink = word;
    if (Math.random() < cfg.incongruentProbability) {
      const others = TRAP_COLORS.filter((c) => c.key !== word.key);
      ink = others[Math.floor(Math.random() * others.length)]!;
    }
    setPrompt({ word, ink });
    shownAtRef.current = now();
    emit("prompt_shown", { word: word.key, ink: ink.key });
  }, [cfg.incongruentProbability, emit, now]);

  useEffect(() => {
    nextPrompt();
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

  const answer = (key: string) => {
    if (!prompt || finishedRef.current) return;
    const ms = Math.round(now() - shownAtRef.current);
    const correct = key === prompt.ink.key;
    emit("color_answer", {
      correct,
      ms,
      congruent: prompt.word.key === prompt.ink.key,
      picked: key,
    });
    if (correct) {
      sfx.success();
      setScore((s) => s + 1);
    } else {
      sfx.error();
    }
    setFlash(correct ? "ok" : "bad");
    setTimeout(() => setFlash(null), 180);
    nextPrompt();
  };

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
      <p className="mt-4 font-display text-xl font-semibold text-ink-500">
        ¿De qué color es la <em className="not-italic underline decoration-2 underline-offset-4">tinta</em>?
      </p>
      {prompt && (
        <motion.p
          key={`${prompt.word.key}-${prompt.ink.key}-${score}`}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 350, damping: 20 }}
          className="mt-8 font-display text-7xl font-black tracking-tight sm:text-8xl"
          style={{ color: prompt.ink.hex }}
        >
          {prompt.word.label}
        </motion.p>
      )}
      <div className="mt-12 grid w-full max-w-md grid-cols-2 gap-3">
        {TRAP_COLORS.map((c) => (
          <button
            key={c.key}
            onPointerDown={() => answer(c.key)}
            className="rounded-2xl py-5 font-display text-lg font-bold text-cream-50 shadow-[0_8px_20px_-8px_rgba(32,27,18,0.4)] transition-transform hover:-translate-y-0.5 active:scale-95"
            style={{ backgroundColor: c.hex }}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
