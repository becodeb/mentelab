"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { NumberHuntConfig } from "@mentelab/benchmarks";
import type { GameProps } from "../shell/types";
import { sfx } from "@/lib/sfx";

/** BUSCA NÚMEROS (Schulte): tocá 1→N en orden, contrarreloj. */
export function NumberHuntGame({ config, emit, now, finish }: GameProps) {
  const cfg = config as NumberHuntConfig;
  const total = cfg.gridSide * cfg.gridSide;
  const [numbers, setNumbers] = useState<number[]>([]);
  const [next, setNext] = useState(1);
  const [wrongFlash, setWrongFlash] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const shuffled = Array.from({ length: total }, (_, i) => i + 1).sort(
      () => Math.random() - 0.5,
    );
    setNumbers(shuffled);
    emit("board_shown", { gridSide: cfg.gridSide, layout: shuffled });
    const timer = setInterval(() => setElapsed(Math.floor(now() / 1000)), 300);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = (n: number) => {
    const correct = n === next;
    emit("number_tap", { n, correct, ms: Math.round(now()) });
    if (correct) {
      sfx.note(n);
      if (n === total) {
        sfx.success();
        setTimeout(finish, 350);
      } else {
        setNext(n + 1);
      }
    } else {
      sfx.error();
      setWrongFlash(n);
      setTimeout(() => setWrongFlash(null), 300);
    }
  };

  return (
    <div className="flex min-h-dvh select-none flex-col items-center justify-center bg-cream-50 p-6">
      <div className="flex items-center gap-8 font-display text-sm font-bold uppercase tracking-[0.25em] text-ink-400">
        <span>{elapsed}s</span>
        <span className="text-ink-700">buscá el {next}</span>
      </div>
      <div
        className="mt-6 grid gap-2.5 rounded-[2rem] border border-ink-900/10 bg-[#fffdf6] p-4 shadow-[0_10px_40px_-16px_rgba(32,27,18,0.25)]"
        style={{ gridTemplateColumns: `repeat(${cfg.gridSide}, minmax(0, 1fr))` }}
      >
        {numbers.map((n) => {
          const found = n < next;
          return (
            <motion.button
              key={n}
              onPointerDown={() => tap(n)}
              animate={wrongFlash === n ? { x: [0, -8, 8, -5, 5, 0] } : {}}
              transition={{ duration: 0.3 }}
              disabled={found}
              className={`flex aspect-square w-16 items-center justify-center rounded-2xl font-display text-2xl font-bold transition-all sm:w-[4.5rem] ${
                found
                  ? "bg-emerald-100 text-emerald-600"
                  : wrongFlash === n
                    ? "bg-rose-100 text-rose-600"
                    : "border-2 border-ink-900/10 bg-cream-100 text-ink-900 hover:bg-cream-200 active:scale-95"
              }`}
            >
              {n}
            </motion.button>
          );
        })}
      </div>
      <p className="mt-4 text-sm font-semibold text-ink-300">en orden: 1, 2, 3… ¡a toda velocidad!</p>
    </div>
  );
}
