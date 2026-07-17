"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WORD_POOL, type VerbalMemoryConfig } from "@mentelab/benchmarks";
import type { GameProps } from "../shell/types";
import { sfx } from "@/lib/sfx";
import { HeartIcon } from "@/components/icons";

export function VerbalMemoryGame({ config, emit, now, finish }: GameProps) {
  const cfg = config as VerbalMemoryConfig;
  const [word, setWord] = useState("");
  const [lives, setLives] = useState(cfg.lives);
  const [score, setScore] = useState(0);
  const seenRef = useRef<Set<string>>(new Set());
  const isSeenRef = useRef(false);
  const shownAtRef = useRef(0);
  const finishingRef = useRef(false);

  const nextWord = useCallback(() => {
    const seen = seenRef.current;
    const useSeen = seen.size > 2 && Math.random() < cfg.seenProbability;
    let w: string;
    if (useSeen) {
      const arr = [...seen];
      w = arr[Math.floor(Math.random() * arr.length)]!;
    } else {
      const fresh = WORD_POOL.filter((x) => !seen.has(x));
      w = fresh.length
        ? fresh[Math.floor(Math.random() * fresh.length)]!
        : [...seen][Math.floor(Math.random() * seen.size)]!;
    }
    isSeenRef.current = seen.has(w);
    setWord(w);
    shownAtRef.current = now();
    emit("word_shown", { word: w, seen: seen.has(w) });
  }, [cfg.seenProbability, emit, now]);

  useEffect(() => {
    nextWord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answer = (action: "seen" | "new") => {
    if (finishingRef.current) return;
    const correct = (action === "seen") === isSeenRef.current;
    emit("word_answer", {
      word,
      action,
      correct,
      latencyMs: Math.round(now() - shownAtRef.current),
    });
    seenRef.current.add(word);
    if (correct) {
      sfx.success();
      setScore((s) => s + 1);
      nextWord();
    } else {
      sfx.error();
      emit("life_lost", { livesLeft: lives - 1 });
      if (lives - 1 <= 0) {
        finishingRef.current = true;
        setTimeout(finish, 400);
      } else {
        setLives(lives - 1);
        nextWord();
      }
    }
  };

  return (
    <div className="flex min-h-dvh select-none flex-col items-center justify-center bg-cream-50 p-6">
      <div className="flex items-center gap-8 font-display text-sm font-bold uppercase tracking-[0.25em] text-ink-400">
        <span className="text-ink-700">{score} aciertos</span>
        <span className="flex gap-1.5">
          {Array.from({ length: cfg.lives }, (_, i) => (
            <HeartIcon
              key={i}
              filled={i < lives}
              className={`h-5 w-5 ${i < lives ? "text-rose-500" : "text-cream-300"}`}
            />
          ))}
        </span>
      </div>
      <p className="mt-12 font-display text-7xl font-black tracking-tight text-ink-900">{word}</p>
      <div className="mt-14 grid w-full max-w-md grid-cols-2 gap-4">
        <button
          onPointerDown={() => answer("seen")}
          className="rounded-[1.5rem] bg-ink-900 py-6 font-display text-2xl font-bold text-cream-50 shadow-[0_10px_28px_-10px_rgba(32,27,18,0.55)] transition-all hover:-translate-y-1 active:scale-95"
        >
          La vi
        </button>
        <button
          onPointerDown={() => answer("new")}
          className="rounded-[1.5rem] border-2 border-ink-900/15 bg-[#fffdf6] py-6 font-display text-2xl font-bold text-ink-900 transition-all hover:-translate-y-1 hover:border-ink-900 active:scale-95"
        >
          Es nueva
        </button>
      </div>
    </div>
  );
}
