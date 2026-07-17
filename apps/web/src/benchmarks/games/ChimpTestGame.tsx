"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChimpTestConfig } from "@mentelab/benchmarks";
import type { GameProps } from "../shell/types";
import { sfx } from "@/lib/sfx";

interface Tile {
  n: number;
  row: number;
  col: number;
}

const ROWS = 5;
const COLS = 8;

export function ChimpTestGame({ config, emit, now, finish }: GameProps) {
  const cfg = config as ChimpTestConfig;
  const [count, setCount] = useState(cfg.startCount);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [nextN, setNextN] = useState(1);
  const [hidden, setHidden] = useState(false);
  const [strikes, setStrikes] = useState(0);
  const boardShownAtRef = useRef(0);
  const lastClickAtRef = useRef(0);
  const finishingRef = useRef(false);

  const newBoard = useCallback(
    (n: number) => {
      const positions = new Set<string>();
      const list: Tile[] = [];
      for (let i = 1; i <= n; i++) {
        let row: number, col: number, key: string;
        do {
          row = Math.floor(Math.random() * ROWS);
          col = Math.floor(Math.random() * COLS);
          key = `${row}:${col}`;
        } while (positions.has(key));
        positions.add(key);
        list.push({ n: i, row, col });
      }
      setTiles(list);
      setNextN(1);
      setHidden(false);
      boardShownAtRef.current = now();
      lastClickAtRef.current = now();
      emit("board_shown", { level: n, positions: list.map((t) => ({ n: t.n, r: t.row, c: t.col })) });
    },
    [emit, now],
  );

  useEffect(() => {
    newBoard(count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const clickTile = (tile: Tile) => {
    if (finishingRef.current) return;
    const latencyMs = Math.round(now() - lastClickAtRef.current);
    lastClickAtRef.current = now();
    const correct = tile.n === nextN;
    emit("tile_click", { level: count, ordinal: tile.n, correct, latencyMs });
    if (!correct) {
      sfx.error();
      emit("strike", { level: count });
      const s = strikes + 1;
      setStrikes(s);
      if (s >= cfg.strikesAllowed) {
        finishingRef.current = true;
        setTimeout(finish, 400);
      } else {
        newBoard(count); // mismo nivel, tablero nuevo
      }
      return;
    }
    if (tile.n === 1) setHidden(true); // el 1 tapa el resto: hay que recordar
    if (tile.n === count) {
      sfx.success();
      emit("board_complete", { count });
      setTimeout(() => setCount((c) => c + 1), 600);
    } else {
      sfx.note(tile.n);
      setNextN(tile.n + 1);
    }
    setTiles((ts) => ts.filter((t) => t.n !== tile.n));
  };

  return (
    <div className="flex min-h-dvh select-none flex-col items-center justify-center bg-cream-50 p-4">
      <div className="flex items-center gap-8 font-display text-sm font-bold uppercase tracking-[0.25em] text-ink-400">
        <span className="text-ink-700">{count} números</span>
        <span className="flex gap-1.5" aria-label={`${cfg.strikesAllowed - strikes} intentos restantes`}>
          {Array.from({ length: cfg.strikesAllowed }, (_, i) => (
            <span
              key={i}
              className={`h-3 w-3 rounded-full ${i < strikes ? "bg-rose-500" : "bg-cream-300"}`}
            />
          ))}
        </span>
      </div>
      <div
        className="mt-6 grid w-full max-w-3xl gap-2"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: ROWS * COLS }, (_, i) => {
          const row = Math.floor(i / COLS);
          const col = i % COLS;
          const tile = tiles.find((t) => t.row === row && t.col === col);
          return tile ? (
            <button
              key={i}
              onPointerDown={() => clickTile(tile)}
              className={`flex aspect-square items-center justify-center rounded-xl font-display text-2xl font-bold transition-transform active:scale-90 ${
                hidden && tile.n !== 1
                  ? "bg-ink-900 shadow-[0_5px_14px_-5px_rgba(32,27,18,0.5)]"
                  : "bg-[#fffdf6] border-2 border-ink-900/15 text-ink-900 shadow-[0_5px_14px_-6px_rgba(32,27,18,0.3)]"
              }`}
            >
              {hidden && tile.n !== 1 ? "" : tile.n}
            </button>
          ) : (
            <div key={i} className="aspect-square" />
          );
        })}
      </div>
      <p className="mt-4 font-display text-lg font-semibold text-ink-500">
        {hidden ? "De memoria: seguí en orden" : "Empezá por el 1"}
      </p>
    </div>
  );
}
