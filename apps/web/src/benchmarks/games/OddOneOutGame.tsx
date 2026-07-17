"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { OddOneOutConfig } from "@mentelab/benchmarks";
import type { GameProps } from "../shell/types";
import { sfx } from "@/lib/sfx";

const BASE_HUES = [24, 210, 130, 340, 45, 265]; // terracota, azul, verde, rosa, miel, violeta

interface Round {
  n: number; // lado de la grilla
  deviant: number; // índice del intruso
  hue: number;
  deltaPct: number;
}

/** EL INTRUSO: una casilla difiere sutilmente en tono. Cada ronda es más sutil. */
export function OddOneOutGame({ config, emit, now, finish }: GameProps) {
  const cfg = config as OddOneOutConfig;
  const [roundNum, setRoundNum] = useState(1);
  const [round, setRound] = useState<Round | null>(null);
  const [shake, setShake] = useState(0);
  const shownAtRef = useRef(0);

  const newRound = useCallback(
    (r: number) => {
      const n = Math.min(3 + Math.floor((r - 1) / 3), 6);
      const deltaPct = Math.max(7, cfg.startDeltaPct * Math.pow(0.88, r - 1));
      const round: Round = {
        n,
        deviant: Math.floor(Math.random() * n * n),
        hue: BASE_HUES[(r - 1) % BASE_HUES.length]!,
        deltaPct,
      };
      setRound(round);
      shownAtRef.current = now();
      emit("round_shown", { round: r, cells: n * n, deltaPct: Math.round(deltaPct * 10) / 10 });
    },
    [cfg.startDeltaPct, emit, now],
  );

  useEffect(() => {
    newRound(roundNum);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundNum]);

  const pick = (i: number) => {
    if (!round) return;
    const ms = Math.round(now() - shownAtRef.current);
    const correct = i === round.deviant;
    emit("cell_pick", {
      round: roundNum,
      correct,
      ms,
      deltaPct: Math.round(round.deltaPct * 10) / 10,
    });
    if (correct) {
      sfx.success();
      if (roundNum >= cfg.rounds) {
        setTimeout(finish, 350);
      } else {
        setRoundNum((r) => r + 1);
      }
    } else {
      sfx.error();
      setShake((s) => s + 1);
    }
  };

  if (!round) return null;
  const baseL = 62;
  const deviantL = baseL + round.deltaPct * 0.45;

  return (
    <div className="flex min-h-dvh select-none flex-col items-center justify-center bg-cream-50 p-6">
      <p className="font-display text-sm font-bold uppercase tracking-[0.25em] text-ink-400">
        ronda {roundNum} de {cfg.rounds}
      </p>
      <p className="mt-2 font-display text-2xl font-semibold text-ink-700">
        Una es distinta. ¿Cuál?
      </p>
      <motion.div
        key={`${roundNum}-${shake}`}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={shake > 0 ? { opacity: 1, scale: 1, x: [0, -10, 10, -6, 6, 0] } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="mt-6 rounded-[2rem] border border-ink-900/10 bg-[#fffdf6] p-4 shadow-[0_10px_40px_-16px_rgba(32,27,18,0.25)]"
      >
        <div
          className="grid gap-2.5"
          style={{ gridTemplateColumns: `repeat(${round.n}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: round.n * round.n }, (_, i) => (
            <button
              key={i}
              onPointerDown={() => pick(i)}
              className="aspect-square rounded-2xl transition-transform active:scale-90"
              style={{
                width: round.n <= 4 ? 72 : round.n === 5 ? 60 : 50,
                backgroundColor: `hsl(${round.hue} 55% ${i === round.deviant ? deviantL : baseL}%)`,
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
