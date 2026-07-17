"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NumberMemoryConfig } from "@mentelab/benchmarks";
import type { GameProps } from "../shell/types";
import { sfx } from "@/lib/sfx";
import { Button, Input, ProgressBar } from "@/components/ui";

type Phase = "showing" | "input" | "reveal";

export function NumberMemoryGame({ config, emit, now, finish }: GameProps) {
  const cfg = config as NumberMemoryConfig;
  const [digits, setDigits] = useState(cfg.startDigits);
  const [shown, setShown] = useState("");
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState<Phase>("showing");
  const [lastCorrect, setLastCorrect] = useState(true);
  const [progress, setProgress] = useState(0);
  const shownAtRef = useRef(0);
  const inputStartRef = useRef(0);

  const showNumber = useCallback(
    (nDigits: number) => {
      let num = String(1 + Math.floor(Math.random() * 9));
      for (let i = 1; i < nDigits; i++) num += Math.floor(Math.random() * 10);
      setShown(num);
      setAnswer("");
      setPhase("showing");
      setProgress(0);
      shownAtRef.current = now();
      emit("number_shown", { level: nDigits, digits: num });
      const showMs = nDigits * cfg.showMsPerDigit;
      const interval = setInterval(() => {
        setProgress(Math.min(100, ((now() - shownAtRef.current) / showMs) * 100));
      }, 50);
      setTimeout(() => {
        clearInterval(interval);
        inputStartRef.current = now();
        setPhase("input");
      }, showMs);
    },
    [cfg.showMsPerDigit, emit, now],
  );

  useEffect(() => {
    showNumber(digits);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  const submit = () => {
    if (phase !== "input" || !answer) return;
    const correct = answer === shown;
    emit("answer_submitted", {
      level: digits,
      shown,
      answer,
      correct,
      memorizeMs: Math.round(inputStartRef.current - shownAtRef.current),
      typeMs: Math.round(now() - inputStartRef.current),
    });
    if (correct) sfx.success();
    else sfx.error();
    setLastCorrect(correct);
    setPhase("reveal");
    setTimeout(() => {
      if (correct) setDigits((d) => d + 1);
      else finish();
    }, 1400);
  };

  return (
    <div className="flex min-h-dvh select-none flex-col items-center justify-center bg-cream-50 p-6">
      <p className="font-display text-sm font-bold uppercase tracking-[0.25em] text-ink-400">
        {digits} dígito{digits > 1 ? "s" : ""}
      </p>
      {phase === "showing" && (
        <>
          <p className="mt-6 font-display text-7xl font-black tracking-[0.25em] text-ink-900">
            {shown}
          </p>
          <ProgressBar value={100 - progress} max={100} className="mt-8 w-64" barClassName="bg-ink-900" />
          <p className="mt-2 font-display text-lg font-semibold text-ink-500">Memorizalo…</p>
        </>
      )}
      {phase === "input" && (
        <div className="mt-6 w-full max-w-xs text-center">
          <p className="text-xl font-black text-slate-700">¿Cuál era el número?</p>
          <Input
            value={answer}
            onChange={(e) => setAnswer(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            inputMode="numeric"
            autoFocus
            className="mt-3 text-center text-3xl font-black tracking-widest"
          />
          <Button size="lg" className="mt-4 w-full" onClick={submit}>
            ¡Listo!
          </Button>
        </div>
      )}
      {phase === "reveal" && (
        <div className="mt-6 text-center">
          <p
            className={`font-display text-5xl font-black ${lastCorrect ? "text-emerald-600" : "text-brand-600"}`}
          >
            {lastCorrect ? "¡Correcto!" : "¡Casi!"}
          </p>
          <p className="mt-3 text-lg font-semibold text-ink-500">
            Era <span className="font-display font-bold tracking-widest text-ink-900">{shown}</span>
            {!lastCorrect && (
              <>
                {" — "}escribiste{" "}
                <span className="font-display font-bold tracking-widest text-rose-600">{answer}</span>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
