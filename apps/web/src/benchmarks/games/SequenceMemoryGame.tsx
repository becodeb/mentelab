"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { SequenceMemoryConfig } from "@mentelab/benchmarks";
import type { GameProps } from "../shell/types";
import { sfx } from "@/lib/sfx";

type Phase = "showing" | "input" | "levelDone" | "failed";

/** Cada celda tiene su nota (estilo Simon): ver + oír la secuencia. */
export function SequenceMemoryGame({ config, emit, now, finish }: GameProps) {
  const cfg = config as SequenceMemoryConfig;
  const cells = cfg.gridSize * cfg.gridSize;
  const [level, setLevel] = useState(cfg.startLevel);
  const [sequence, setSequence] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>("showing");
  const [litCell, setLitCell] = useState<number | null>(null);
  const [pressedCell, setPressedCell] = useState<number | null>(null);
  const [inputPos, setInputPos] = useState(0);
  const [shake, setShake] = useState(0);
  const lastClickAtRef = useRef(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const showSequence = useCallback(
    (lvl: number) => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      const seq = Array.from({ length: lvl }, () => Math.floor(Math.random() * cells));
      setSequence(seq);
      setPhase("showing");
      setInputPos(0);
      emit("sequence_shown", { level: lvl, cells: seq });
      seq.forEach((cell, i) => {
        timeoutsRef.current.push(
          setTimeout(() => {
            setLitCell(cell);
            sfx.note(cell);
          }, i * (cfg.showMs + cfg.gapMs) + 350),
        );
        timeoutsRef.current.push(
          setTimeout(() => setLitCell(null), i * (cfg.showMs + cfg.gapMs) + 350 + cfg.showMs),
        );
      });
      timeoutsRef.current.push(
        setTimeout(
          () => {
            setPhase("input");
            lastClickAtRef.current = now();
          },
          seq.length * (cfg.showMs + cfg.gapMs) + 550,
        ),
      );
    },
    [cells, cfg.showMs, cfg.gapMs, emit, now],
  );

  useEffect(() => {
    showSequence(level);
    return () => timeoutsRef.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const handleCell = (cell: number) => {
    if (phase !== "input") return;
    const latencyMs = now() - lastClickAtRef.current;
    lastClickAtRef.current = now();
    const expected = sequence[inputPos];
    const correct = cell === expected;
    emit("cell_click", { level, index: inputPos, cell, correct, latencyMs });

    // Eco visual+sonoro del toque del jugador.
    setPressedCell(cell);
    setTimeout(() => setPressedCell(null), 180);

    if (!correct) {
      sfx.error();
      setShake((s) => s + 1);
      setPhase("failed");
      emit("sequence_fail", { level, position: inputPos + 1 });
      setTimeout(finish, 800);
      return;
    }
    sfx.note(cell);
    if (inputPos + 1 >= sequence.length) {
      sfx.success();
      emit("level_complete", { level });
      setPhase("levelDone");
      setTimeout(() => setLevel((l) => l + 1), 850);
    } else {
      setInputPos(inputPos + 1);
    }
  };

  const statusLine: Record<Phase, string> = {
    showing: "Mirá y escuchá la secuencia…",
    input: `Tu turno — ${inputPos} de ${sequence.length}`,
    levelDone: "¡Perfecto!",
    failed: "Esa no era…",
  };

  return (
    <div className="flex min-h-dvh select-none flex-col items-center justify-center bg-cream-50 p-6">
      <p className="font-display text-sm font-bold uppercase tracking-[0.25em] text-ink-400">
        nivel {level}
      </p>
      <p
        className={`mt-2 h-8 font-display text-2xl font-semibold ${
          phase === "failed" ? "text-rose-600" : phase === "levelDone" ? "text-emerald-600" : "text-ink-700"
        }`}
      >
        {statusLine[phase]}
      </p>
      <motion.div
        key={shake}
        animate={shake > 0 ? { x: [0, -12, 12, -7, 7, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="mt-6 rounded-[2rem] border border-ink-900/10 bg-[#fffdf6] p-4 shadow-[0_10px_40px_-16px_rgba(32,27,18,0.25)]"
      >
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${cfg.gridSize}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cells }, (_, i) => {
            const active = litCell === i || pressedCell === i;
            return (
              <button
                key={i}
                onPointerDown={() => handleCell(i)}
                className={`h-20 w-20 rounded-2xl transition-all duration-100 sm:h-24 sm:w-24 ${
                  active
                    ? "scale-[1.05] bg-blue-500 shadow-[0_8px_22px_-6px_rgba(124,151,216,0.8)]"
                    : "border-2 border-ink-900/10 bg-cream-100 hover:bg-cream-200 active:scale-95"
                }`}
              />
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
