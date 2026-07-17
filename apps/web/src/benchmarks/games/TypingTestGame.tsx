"use client";

import { useEffect, useRef, useState } from "react";
import { TYPING_TEXTS, type TypingTestConfig } from "@mentelab/benchmarks";
import type { GameProps } from "../shell/types";

export function TypingTestGame({ config, emit, now, finish }: GameProps) {
  const cfg = config as TypingTestConfig;
  const text = TYPING_TEXTS[cfg.textBand][cfg.textIndex % TYPING_TEXTS[cfg.textBand].length]!;
  const [typed, setTyped] = useState<{ char: string; correct: boolean }[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(cfg.durationSec);
  const inputRef = useRef<HTMLInputElement>(null);
  const keyIndexRef = useRef(0);
  const finishedRef = useRef(false);

  // Timer del juego.
  useEffect(() => {
    const interval = setInterval(() => {
      const left = cfg.durationSec - Math.floor(now() / 1000);
      setSecondsLeft(Math.max(0, left));
      if (left <= 0 && !finishedRef.current) {
        finishedRef.current = true;
        emit("typing_done", { reason: "time" });
        finish();
      }
    }, 250);
    return () => clearInterval(interval);
  }, [cfg.durationSec, emit, finish, now]);

  // Mantener el foco en el input invisible (teclado táctil incluido).
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (finishedRef.current) return;
    if (e.key === "Backspace") {
      emit("keystroke", { i: keyIndexRef.current++, kind: "backspace" });
      setTyped((t) => t.slice(0, -1));
      e.preventDefault();
      return;
    }
    if (e.key.length !== 1) return;
    e.preventDefault();
    const pos = typed.length;
    const expected = text[pos];
    if (expected === undefined) return;
    const correct = e.key === expected;
    emit("keystroke", { i: keyIndexRef.current++, kind: "char", correct });
    const next = [...typed, { char: e.key, correct }];
    setTyped(next);
    if (next.length >= text.length && !finishedRef.current) {
      finishedRef.current = true;
      emit("typing_done", { reason: "completed" });
      finish();
    }
  };

  return (
    <div
      className="flex min-h-dvh select-none flex-col items-center justify-center bg-gradient-to-b from-cyan-50 to-white p-6"
      onClick={() => inputRef.current?.focus()}
    >
      <p className="text-4xl font-black text-cyan-600">{secondsLeft}s</p>
      <div className="mt-6 max-w-2xl rounded-3xl bg-white p-6 text-2xl leading-relaxed shadow-sm">
        {text.split("").map((ch, i) => {
          const t = typed[i];
          const isCursor = i === typed.length;
          return (
            <span
              key={i}
              className={
                t
                  ? t.correct
                    ? "text-emerald-600"
                    : "bg-amber-200 text-amber-800 rounded"
                  : isCursor
                    ? "border-b-4 border-cyan-500 text-slate-400"
                    : "text-slate-400"
              }
            >
              {ch}
            </span>
          );
        })}
      </div>
      <input
        ref={inputRef}
        onKeyDown={handleKey}
        className="absolute h-0 w-0 opacity-0"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        aria-label="área de tipeo"
      />
      <p className="mt-4 text-sm font-bold text-cyan-300">Tocá el texto si el teclado se cierra</p>
    </div>
  );
}
