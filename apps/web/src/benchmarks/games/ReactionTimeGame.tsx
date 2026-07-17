"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactionTimeConfig } from "@mentelab/benchmarks";
import type { GameProps } from "../shell/types";

type Phase = "waiting" | "ready" | "feedback" | "falseStart";

/**
 * Pantalla completa, cero cromo. Accesible para daltonismo: el estímulo
 * cambia color + ícono + texto (doc 04 §7). Cada ronda emite eventos crudos.
 */
export function ReactionTimeGame({ config, emit, now, finish }: GameProps) {
  const cfg = config as ReactionTimeConfig;
  const [phase, setPhase] = useState<Phase>("waiting");
  const [round, setRound] = useState(1);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const shownAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const scheduleStimulus = useCallback(() => {
    setPhase("waiting");
    const delay = cfg.minDelayMs + Math.random() * (cfg.maxDelayMs - cfg.minDelayMs);
    timerRef.current = setTimeout(() => {
      shownAtRef.current = now();
      emit("stimulus_shown", { round });
      setPhase("ready");
    }, delay);
  }, [cfg.minDelayMs, cfg.maxDelayMs, emit, now, round]);

  useEffect(() => {
    scheduleStimulus();
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const handlePress = () => {
    if (phase === "waiting") {
      clearTimeout(timerRef.current);
      emit("false_start", { round });
      setPhase("falseStart");
      setTimeout(() => scheduleStimulus(), 1300);
      return;
    }
    if (phase === "ready") {
      const reactionMs = now() - shownAtRef.current;
      emit("round_click", { round, reactionMs });
      setLastMs(reactionMs);
      setPhase("feedback");
      setTimeout(() => {
        if (round >= cfg.rounds) finish();
        else setRound((r) => r + 1);
      }, 900);
    }
  };

  const bg =
    phase === "ready"
      ? "bg-emerald-500"
      : phase === "falseStart"
        ? "bg-amber-400"
        : phase === "feedback"
          ? "bg-brand-600"
          : "bg-rose-500";

  return (
    <button
      onPointerDown={handlePress}
      className={`flex min-h-dvh w-full select-none flex-col items-center justify-center ${bg} transition-colors duration-75`}
    >
      <p className="text-sm font-black uppercase tracking-widest text-white/70">
        ronda {round}/{cfg.rounds}
      </p>
      {phase === "waiting" && (
        <>
          <p className="text-8xl">✋</p>
          <p className="mt-4 text-3xl font-black text-white">Esperá el verde…</p>
        </>
      )}
      {phase === "ready" && (
        <>
          <p className="text-8xl">👆</p>
          <p className="mt-4 text-5xl font-black text-white">¡AHORA!</p>
        </>
      )}
      {phase === "falseStart" && (
        <>
          <p className="text-8xl">😅</p>
          <p className="mt-4 text-3xl font-black text-white">¡Muy pronto! Esperá el verde.</p>
        </>
      )}
      {phase === "feedback" && lastMs != null && (
        <>
          <p className="text-7xl font-black text-white">{Math.round(lastMs)} ms</p>
          <p className="mt-2 text-xl font-bold text-white/80">
            {lastMs < 300 ? "¡Rapidísimo! ⚡" : lastMs < 450 ? "¡Muy bien! 💪" : "¡Bien! Seguí así 👍"}
          </p>
        </>
      )}
    </button>
  );
}
