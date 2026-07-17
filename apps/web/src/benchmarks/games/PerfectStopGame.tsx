"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { PerfectStopConfig } from "@mentelab/benchmarks";
import type { GameProps } from "../shell/types";
import { sfx } from "@/lib/sfx";

type Phase = "running" | "stopped";

/** FRENADA PERFECTA: marcador que barre la pista; frenálo en el centro. */
export function PerfectStopGame({ config, emit, now, finish }: GameProps) {
  const cfg = config as PerfectStopConfig;
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>("running");
  const [markerPct, setMarkerPct] = useState(0);
  const [lastDist, setLastDist] = useState<number | null>(null);
  const rafRef = useRef(0);
  const roundStartRef = useRef(0);
  const posRef = useRef(0);
  const speedRef = useRef(cfg.startSpeed);

  const startRound = useCallback(
    (r: number) => {
      speedRef.current = cfg.startSpeed + (r - 1) * cfg.speedStep;
      roundStartRef.current = now();
      setPhase("running");
      setLastDist(null);
      emit("round_start", { round: r, speed: Math.round(speedRef.current * 100) / 100 });

      const animate = () => {
        const t = (now() - roundStartRef.current) / 1000;
        // Onda triangular 0→100→0 a `speed` recorridos por segundo.
        const cycle = (t * speedRef.current) % 2;
        const pos = cycle <= 1 ? cycle * 100 : (2 - cycle) * 100;
        posRef.current = pos;
        setMarkerPct(pos);
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    },
    [cfg.startSpeed, cfg.speedStep, emit, now],
  );

  useEffect(() => {
    startRound(round);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const stop = () => {
    if (phase !== "running") return;
    cancelAnimationFrame(rafRef.current);
    const distPct = Math.round(Math.abs(posRef.current - 50) * 2 * 10) / 10;
    setLastDist(distPct);
    setPhase("stopped");
    emit("stop", {
      round,
      distPct,
      speed: Math.round(speedRef.current * 100) / 100,
      ms: Math.round(now() - roundStartRef.current),
    });
    if (distPct <= 3) sfx.record();
    else if (distPct <= 15) sfx.success();
    else sfx.error();
    setTimeout(() => {
      if (round >= cfg.rounds) finish();
      else setRound((r) => r + 1);
    }, 1000);
  };

  const verdict =
    lastDist == null
      ? ""
      : lastDist <= 3
        ? "¡PERFECTO!"
        : lastDist <= 10
          ? "¡Casi perfecto!"
          : lastDist <= 25
            ? "Bien"
            : "Uy, lejos…";

  return (
    <button
      onPointerDown={stop}
      className="fixed inset-0 z-40 flex min-h-dvh w-full select-none flex-col items-center justify-center bg-cream-50"
    >
      <p className="font-display text-sm font-bold uppercase tracking-[0.25em] text-ink-400">
        ronda {round} de {cfg.rounds} · velocidad ×{(speedRef.current / cfg.startSpeed).toFixed(1)}
      </p>
      <p
        className={`mt-2 h-10 font-display text-3xl font-bold ${
          lastDist != null && lastDist <= 3
            ? "text-brand-600"
            : lastDist != null && lastDist > 25
              ? "text-rose-600"
              : "text-ink-700"
        }`}
      >
        {phase === "stopped" ? verdict : "Frená en el centro"}
      </p>

      {/* Pista */}
      <div className="relative mt-10 h-16 w-[min(85vw,34rem)] rounded-full border-2 border-ink-900/10 bg-cream-100">
        {/* Zona objetivo */}
        <span className="absolute inset-y-0 left-1/2 w-14 -translate-x-1/2 rounded-xl bg-emerald-200/70" />
        <span className="absolute inset-y-2 left-1/2 w-1.5 -translate-x-1/2 rounded-full bg-emerald-600" />
        {/* Marcador */}
        <motion.span
          className={`absolute top-1/2 h-12 w-12 -translate-y-1/2 rounded-full shadow-[0_8px_20px_-6px_rgba(32,27,18,0.5)] ${
            phase === "stopped" && lastDist != null && lastDist <= 3 ? "bg-brand-500" : "bg-ink-900"
          }`}
          style={{ left: `calc(${markerPct}% - 24px)` }}
          animate={phase === "stopped" ? { scale: [1, 1.25, 1] } : {}}
          transition={{ duration: 0.4 }}
        />
      </div>
      {phase === "stopped" && lastDist != null && (
        <p className="mt-5 font-display text-xl font-semibold text-ink-500">
          a {lastDist}% del centro
        </p>
      )}
      <p className="mt-8 text-sm font-semibold text-ink-300">tocá en cualquier lado para frenar</p>
    </button>
  );
}
