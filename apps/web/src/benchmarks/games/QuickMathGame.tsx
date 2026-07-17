"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { QuickMathConfig } from "@mentelab/benchmarks";
import type { GameProps } from "../shell/types";
import { sfx } from "@/lib/sfx";

interface Problem {
  text: string;
  op: string;
  answer: number;
  options: [number, number];
}

function makeProblem(cfg: QuickMathConfig): Problem {
  const rand = (n: number) => 1 + Math.floor(Math.random() * n);
  const ops: string[] = cfg.advancedOps ? ["+", "+", "-", "×"] : ["+"];
  const op = ops[Math.floor(Math.random() * ops.length)]!;
  let a: number, b: number, answer: number;
  if (op === "×") {
    a = rand(9);
    b = rand(9);
    answer = a * b;
  } else if (op === "-") {
    a = rand(cfg.maxOperand);
    b = rand(a); // resultado nunca negativo
    answer = a - b;
  } else {
    a = rand(cfg.maxOperand);
    b = rand(cfg.maxOperand);
    answer = a + b;
  }
  let distractor = answer + (Math.random() < 0.5 ? -1 : 1) * rand(3);
  if (distractor === answer || distractor < 0) distractor = answer + 4;
  const options: [number, number] =
    Math.random() < 0.5 ? [answer, distractor] : [distractor, answer];
  return { text: `${a} ${op} ${b}`, op, answer, options };
}

/** CÁLCULO RELÁMPAGO: cuentas rápidas con dos opciones, contra el reloj. */
export function QuickMathGame({ config, emit, now, finish }: GameProps) {
  const cfg = config as QuickMathConfig;
  const [problem, setProblem] = useState<Problem | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(cfg.durationSec);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const shownAtRef = useRef(0);
  const finishedRef = useRef(false);

  const nextProblem = useCallback(() => {
    const p = makeProblem(cfg);
    setProblem(p);
    shownAtRef.current = now();
    emit("problem_shown", { text: p.text, op: p.op });
  }, [cfg, emit, now]);

  useEffect(() => {
    nextProblem();
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

  const answer = (value: number) => {
    if (!problem || finishedRef.current) return;
    const ms = Math.round(now() - shownAtRef.current);
    const correct = value === problem.answer;
    emit("math_answer", { correct, ms, op: problem.op, value });
    if (correct) {
      sfx.success();
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
    } else {
      sfx.error();
      setStreak(0);
    }
    setFlash(correct ? "ok" : "bad");
    setTimeout(() => setFlash(null), 160);
    nextProblem();
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
        {streak >= 3 && <span className="text-brand-600">racha ×{streak}</span>}
      </div>
      {problem && (
        <motion.p
          key={problem.text + score}
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="mt-10 font-display text-8xl font-black tracking-tight text-ink-900"
        >
          {problem.text}
        </motion.p>
      )}
      <div className="mt-12 grid w-full max-w-md grid-cols-2 gap-4">
        {problem?.options.map((opt, i) => (
          <button
            key={`${opt}-${i}`}
            onPointerDown={() => answer(opt)}
            className="rounded-[1.5rem] border-2 border-ink-900/12 bg-[#fffdf6] py-7 font-display text-5xl font-bold text-ink-900 shadow-[0_8px_24px_-10px_rgba(32,27,18,0.3)] transition-all hover:-translate-y-1 hover:border-ink-900 active:scale-95"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
