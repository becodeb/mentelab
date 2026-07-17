"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { RhythmKeeperConfig } from "@mentelab/benchmarks";
import type { GameProps } from "../shell/types";
import { sfx } from "@/lib/sfx";

const START_DELAY_MS = 900;

/** RITMO: metrónomo audible+visual que luego se calla; seguís de memoria. */
export function RhythmKeeperGame({ config, emit, now, finish }: GameProps) {
  const cfg = config as RhythmKeeperConfig;
  const intervalMs = 60_000 / cfg.bpm;
  const totalBeats = cfg.guideBeats + cfg.silentBeats;

  const [currentBeat, setCurrentBeat] = useState(-1);
  const [pulse, setPulse] = useState(0);
  const [tapPulse, setTapPulse] = useState(0);
  const matchedRef = useRef<Set<number>>(new Set());
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finishedRef = useRef(false);

  useEffect(() => {
    for (let i = 0; i < totalBeats; i++) {
      timersRef.current.push(
        setTimeout(() => {
          setCurrentBeat(i);
          emit("beat", { i, guide: i < cfg.guideBeats });
          if (i < cfg.guideBeats) {
            sfx.tick();
            setPulse((p) => p + 1);
          }
        }, START_DELAY_MS + i * intervalMs),
      );
    }
    timersRef.current.push(
      setTimeout(
        () => {
          if (!finishedRef.current) {
            finishedRef.current = true;
            finish();
          }
        },
        START_DELAY_MS + totalBeats * intervalMs + intervalMs * 0.6,
      ),
    );
    return () => timersRef.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = () => {
    if (finishedRef.current) return;
    const t = now();
    setTapPulse((p) => p + 1);
    const idx = Math.round((t - START_DELAY_MS) / intervalMs);
    const beatTime = START_DELAY_MS + idx * intervalMs;
    const offsetMs = Math.round(t - beatTime);
    const matched =
      idx >= 0 &&
      idx < totalBeats &&
      Math.abs(offsetMs) <= intervalMs * 0.45 &&
      !matchedRef.current.has(idx);
    if (matched) matchedRef.current.add(idx);
    emit("rhythm_tap", { ms: Math.round(t), beatIndex: matched ? idx : -1, offsetMs, matched });
  };

  const inSilentPhase = currentBeat >= cfg.guideBeats;

  return (
    <button
      onPointerDown={tap}
      className="fixed inset-0 z-40 flex min-h-dvh w-full select-none flex-col items-center justify-center bg-cream-50"
    >
      <p className="font-display text-sm font-bold uppercase tracking-[0.25em] text-ink-400">
        {currentBeat < 0
          ? "preparate…"
          : inSilentPhase
            ? "¡seguí vos!"
            : "escuchá el pulso"}
      </p>

      {/* Tambor central: late con el metrónomo y con tus toques */}
      <div className="relative mt-10 flex h-56 w-56 items-center justify-center">
        <motion.span
          key={`beat-${pulse}`}
          initial={{ scale: 1, opacity: 0.35 }}
          animate={{ scale: 1.55, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="absolute inset-0 rounded-full bg-brand-400"
        />
        <motion.span
          key={`tap-${tapPulse}`}
          initial={{ scale: 0.92 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 16 }}
          className={`flex h-44 w-44 items-center justify-center rounded-full shadow-[0_16px_40px_-14px_rgba(32,27,18,0.5)] ${
            inSilentPhase ? "bg-ink-900" : "bg-brand-600"
          }`}
        >
          <span className="font-display text-2xl font-bold text-cream-50">
            {inSilentPhase ? "TOCÁ" : "PUM"}
          </span>
        </motion.span>
      </div>

      {/* Progreso de beats */}
      <div className="mt-10 flex gap-1.5">
        {Array.from({ length: totalBeats }, (_, i) => (
          <span
            key={i}
            className={`h-2.5 w-2.5 rounded-full transition-colors ${
              i <= currentBeat
                ? i < cfg.guideBeats
                  ? "bg-brand-500"
                  : "bg-ink-900"
                : "bg-cream-300"
            }`}
          />
        ))}
      </div>
      <p className="mt-3 text-sm font-semibold text-ink-300">
        {cfg.guideBeats} con tambor · {cfg.silentBeats} en silencio
      </p>
    </button>
  );
}
