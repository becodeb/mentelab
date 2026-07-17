"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WORD_POOL, type VerbalMemoryConfig } from "@mentelab/benchmarks";
import type { GameProps } from "../shell/types";
import { Button } from "@/components/ui";

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
      setScore((s) => s + 1);
      nextWord();
    } else {
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
    <div className="flex min-h-dvh select-none flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="flex gap-6 text-sm font-black uppercase tracking-widest text-blue-300">
        <span>✅ {score}</span>
        <span>{"❤️".repeat(Math.max(0, lives))}</span>
      </div>
      <p className="mt-10 text-5xl font-black text-slate-800">{word}</p>
      <div className="mt-12 flex gap-4">
        <Button size="xl" variant="success" onClick={() => answer("seen")}>
          👁️ LA VI
        </Button>
        <Button size="xl" onClick={() => answer("new")}>
          ✨ NUEVA
        </Button>
      </div>
    </div>
  );
}
