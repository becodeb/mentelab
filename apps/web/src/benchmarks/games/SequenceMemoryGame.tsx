"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SequenceMemoryConfig } from "@mentelab/benchmarks";
import type { GameProps } from "../shell/types";

type Phase = "showing" | "input" | "levelDone";

export function SequenceMemoryGame({ config, emit, now, finish }: GameProps) {
  const cfg = config as SequenceMemoryConfig;
  const cells = cfg.gridSize * cfg.gridSize;
  const [level, setLevel] = useState(cfg.startLevel);
  const [sequence, setSequence] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>("showing");
  const [litCell, setLitCell] = useState<number | null>(null);
  const [inputPos, setInputPos] = useState(0);
  const lastClickAtRef = useRef(0);

  /** Genera y muestra la secuencia del nivel actual. */
  const showSequence = useCallback(
    (lvl: number) => {
      const seq = Array.from({ length: lvl }, () => Math.floor(Math.random() * cells));
      setSequence(seq);
      setPhase("showing");
      setInputPos(0);
      emit("sequence_shown", { level: lvl, cells: seq });
      seq.forEach((cell, i) => {
        setTimeout(() => setLitCell(cell), i * (cfg.showMs + cfg.gapMs));
        setTimeout(() => setLitCell(null), i * (cfg.showMs + cfg.gapMs) + cfg.showMs);
      });
      setTimeout(
        () => {
          setPhase("input");
          lastClickAtRef.current = now();
        },
        seq.length * (cfg.showMs + cfg.gapMs) + 200,
      );
    },
    [cells, cfg.showMs, cfg.gapMs, emit, now],
  );

  useEffect(() => {
    showSequence(level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const handleCell = (cell: number) => {
    if (phase !== "input") return;
    const latencyMs = now() - lastClickAtRef.current;
    lastClickAtRef.current = now();
    const expected = sequence[inputPos];
    const correct = cell === expected;
    emit("cell_click", { level, index: inputPos, cell, correct, latencyMs });
    if (!correct) {
      emit("sequence_fail", { level, position: inputPos + 1 });
      setTimeout(finish, 500);
      return;
    }
    if (inputPos + 1 >= sequence.length) {
      emit("level_complete", { level });
      setPhase("levelDone");
      setTimeout(() => setLevel((l) => l + 1), 800);
    } else {
      setInputPos(inputPos + 1);
    }
  };

  return (
    <div className="flex min-h-dvh select-none flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-cream-50 p-6">
      <p className="text-sm font-black uppercase tracking-widest text-blue-300">nivel {level}</p>
      <p className="mt-1 h-7 text-lg font-black text-blue-600">
        {phase === "showing" && "👀 Mirá con atención…"}
        {phase === "input" && "✋ ¡Tu turno! Repetí el orden"}
        {phase === "levelDone" && "🎉 ¡Perfecto!"}
      </p>
      <div
        className="mt-6 grid gap-3"
        style={{ gridTemplateColumns: `repeat(${cfg.gridSize}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: cells }, (_, i) => (
          <button
            key={i}
            onPointerDown={() => handleCell(i)}
            className={`h-20 w-20 rounded-2xl transition-all duration-150 sm:h-24 sm:w-24 ${
              litCell === i
                ? "scale-105 bg-blue-500 shadow-lg shadow-blue-500/50"
                : "bg-blue-100 hover:bg-blue-200 active:scale-95"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
