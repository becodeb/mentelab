"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { TwinShapesConfig } from "@mentelab/benchmarks";
import type { GameProps } from "../shell/types";
import { sfx } from "@/lib/sfx";

/** Figuras asimétricas (para que el espejo se note al rotarlas). */
const SHAPES: { color: string; path: string }[] = [
  { color: "#c65230", path: "M20 10L55 20L45 40L60 55L25 65L20 45L10 30Z" },
  { color: "#5f7cc6", path: "M15 15h30l15 15-10 10 10 15-25 10-20-15 8-15z" },
  { color: "#719c58", path: "M40 8l20 18-8 8 12 14-30 22-14-26 12-8z" },
  { color: "#d99a26", path: "M12 40l22-30 8 14 18-6-6 22 14 10-28 12z" },
  { color: "#bd6684", path: "M18 12l34 6-4 16 16 10-22 8 4 18-26-10 6-18-14-8z" },
  { color: "#4a9c8f", path: "M40 6l14 20-10 6 18 12-22 6 8 20-24-14 6-14-18-4z" },
];

interface Option {
  rotation: number;
  mirrored: boolean;
}
type Phase = "playing" | "reveal";

/** GEMELOS GIRADOS: rotación mental — una opción es la figura, el resto espejos. */
export function TwinShapesGame({ config, emit, now, finish }: GameProps) {
  const cfg = config as TwinShapesConfig;
  const [round, setRound] = useState(1);
  const [shapeIdx, setShapeIdx] = useState(0);
  const [optionsList, setOptionsList] = useState<Option[]>([]);
  const [phase, setPhase] = useState<Phase>("playing");
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const shownAtRef = useRef(0);

  const newRound = useCallback(() => {
    const idx = Math.floor(Math.random() * SHAPES.length);
    setShapeIdx(idx);
    const opts: Option[] = [{ rotation: 45 + Math.floor(Math.random() * 5) * 60, mirrored: false }];
    while (opts.length < cfg.options) {
      opts.push({ rotation: 30 + Math.floor(Math.random() * 6) * 55, mirrored: true });
    }
    opts.sort(() => Math.random() - 0.5);
    setOptionsList(opts);
    setPicked(null);
    setPhase("playing");
    shownAtRef.current = now();
    emit("shapes_shown", { round, shape: idx, options: opts.length });
  }, [cfg.options, emit, now, round]);

  useEffect(() => {
    newRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const answer = (i: number) => {
    if (phase !== "playing") return;
    const correct = !optionsList[i]!.mirrored;
    emit("twin_answer", { round, correct, ms: Math.round(now() - shownAtRef.current) });
    if (correct) {
      sfx.success();
      setScore((s) => s + 1);
    } else {
      sfx.error();
    }
    setPicked(i);
    setPhase("reveal");
    setTimeout(() => {
      if (round >= cfg.rounds) finish();
      else setRound((r) => r + 1);
    }, 900);
  };

  const shape = SHAPES[shapeIdx]!;

  return (
    <div className="flex min-h-dvh select-none flex-col items-center justify-center bg-cream-50 p-6">
      <div className="flex items-center gap-8 font-display text-sm font-bold uppercase tracking-[0.25em] text-ink-400">
        <span>
          ronda {round} de {cfg.rounds}
        </span>
        <span className="text-ink-700">{score} aciertos</span>
      </div>
      <p className="mt-3 font-display text-xl font-semibold text-ink-500">
        ¿Cuál es la misma figura, girada?
      </p>

      {/* Modelo */}
      <motion.div
        key={`model-${round}`}
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mt-6 flex h-36 w-36 items-center justify-center rounded-[1.75rem] border-2 border-ink-900 bg-[#fffdf6] shadow-[0_12px_36px_-14px_rgba(32,27,18,0.4)]"
      >
        <svg viewBox="0 0 80 80" className="h-24 w-24" fill={shape.color} stroke="none">
          <path d={shape.path} />
        </svg>
      </motion.div>

      <div className="mt-8 flex gap-4">
        {optionsList.map((opt, i) => {
          const revealCorrect = phase === "reveal" && !opt.mirrored;
          const revealWrong = phase === "reveal" && picked === i && opt.mirrored;
          return (
            <button
              key={`${round}-${i}`}
              onPointerDown={() => answer(i)}
              className={`flex h-28 w-28 items-center justify-center rounded-[1.5rem] border-2 transition-all hover:-translate-y-1 active:scale-95 ${
                revealCorrect
                  ? "border-emerald-500 bg-emerald-50"
                  : revealWrong
                    ? "border-rose-500 bg-rose-50"
                    : "border-ink-900/12 bg-[#fffdf6] shadow-[0_8px_24px_-10px_rgba(32,27,18,0.3)]"
              }`}
            >
              <svg
                viewBox="0 0 80 80"
                className="h-20 w-20"
                fill={shape.color}
                stroke="none"
                style={{
                  transform: `rotate(${opt.rotation}deg) scaleX(${opt.mirrored ? -1 : 1})`,
                }}
              >
                <path d={shape.path} />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
