"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { MemoryPairsConfig } from "@mentelab/benchmarks";
import type { GameProps } from "../shell/types";
import { sfx } from "@/lib/sfx";
import { BrainMark } from "@/components/icons";

/** Símbolos geométricos SVG por par (sin emojis). */
const SYMBOLS: { color: string; shape: (key: number) => React.ReactNode }[] = [
  { color: "#c65230", shape: (k) => <circle key={k} cx="14" cy="14" r="8" /> },
  { color: "#5f7cc6", shape: (k) => <rect key={k} x="6" y="6" width="16" height="16" rx="3" /> },
  { color: "#719c58", shape: (k) => <path key={k} d="M14 5l9 16H5z" /> },
  { color: "#d99a26", shape: (k) => <path key={k} d="M14 4l2.9 6.2 6.8.8-5 4.6 1.3 6.7-6-3.4-6 3.4 1.3-6.7-5-4.6 6.8-.8z" /> },
  { color: "#bd6684", shape: (k) => <path key={k} d="M14 23s-8.5-5-8.5-10.5A4.7 4.7 0 0114 8.6a4.7 4.7 0 018.5 3.9C22.5 18 14 23 14 23z" /> },
  { color: "#4a9c8f", shape: (k) => <path key={k} d="M14 4a10 10 0 000 20 8 8 0 010-20z" /> },
  { color: "#7d6aa8", shape: (k) => <path key={k} d="M6 18l4-10 4 6 4-8 4 12z" /> },
  { color: "#a86a1e", shape: (k) => <path key={k} d="M14 5l7 5-2.7 8.4h-8.6L7 10z" /> },
  { color: "#cb4429", shape: (k) => <path key={k} d="M8 6h12l-3 8 3 8H8l3-8z" /> },
  { color: "#2a2418", shape: (k) => <path key={k} d="M14 4v20M4 14h20M7 7l14 14M21 7L7 21" strokeWidth={2.4} fill="none" stroke="currentColor" /> },
];

interface CardState {
  id: number;
  symbol: number;
  state: "down" | "up" | "matched";
}

/** PARES: memoria espacial pura. Cada vuelta de carta queda registrada. */
export function MemoryPairsGame({ config, emit, now, finish }: GameProps) {
  const cfg = config as MemoryPairsConfig;
  const [cards, setCards] = useState<CardState[]>([]);
  const [moves, setMoves] = useState(0);
  const openRef = useRef<number[]>([]);
  const lockRef = useRef(false);
  const lastFlipAtRef = useRef(0);
  const movesRef = useRef(0);

  useEffect(() => {
    const symbols = Array.from({ length: cfg.pairs }, (_, i) => i % SYMBOLS.length);
    const deck = [...symbols, ...symbols]
      .map((symbol, id) => ({ symbol, id, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map((c, id) => ({ id, symbol: c.symbol, state: "down" as const }));
    setCards(deck);
    lastFlipAtRef.current = now();
    emit("board_shown", { pairs: cfg.pairs, cards: deck.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flip = (id: number) => {
    if (lockRef.current) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.state !== "down") return;

    const ms = Math.round(now() - lastFlipAtRef.current);
    lastFlipAtRef.current = now();
    sfx.flip();
    emit("card_flip", { idx: id, symbol: card.symbol, ms });

    const nextCards = cards.map((c) => (c.id === id ? { ...c, state: "up" as const } : c));
    setCards(nextCards);
    openRef.current.push(id);

    if (openRef.current.length === 2) {
      const [a, b] = openRef.current;
      openRef.current = [];
      movesRef.current += 1;
      setMoves(movesRef.current);
      const ca = nextCards.find((c) => c.id === a)!;
      const cb = nextCards.find((c) => c.id === b)!;
      const match = ca.symbol === cb.symbol;
      emit("pair_result", { match, moves: movesRef.current });

      if (match) {
        sfx.success();
        const matched = nextCards.map((c) =>
          c.id === a || c.id === b ? { ...c, state: "matched" as const } : c,
        );
        setCards(matched);
        if (matched.every((c) => c.state === "matched")) {
          setTimeout(finish, 500);
        }
      } else {
        lockRef.current = true;
        setTimeout(() => {
          setCards((cur) =>
            cur.map((c) => (c.id === a || c.id === b ? { ...c, state: "down" } : c)),
          );
          lockRef.current = false;
        }, 750);
      }
    }
  };

  const cols = cards.length <= 12 ? 4 : cards.length <= 16 ? 4 : 5;

  return (
    <div className="flex min-h-dvh select-none flex-col items-center justify-center bg-cream-50 p-6">
      <div className="flex items-center gap-8 font-display text-sm font-bold uppercase tracking-[0.25em] text-ink-400">
        <span>{moves} intentos</span>
        <span className="text-ink-700">
          {cards.filter((c) => c.state === "matched").length / 2} / {cfg.pairs} pares
        </span>
      </div>
      <div
        className="mt-6 grid gap-2.5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {cards.map((card) => {
          const sym = SYMBOLS[card.symbol]!;
          const faceUp = card.state !== "down";
          return (
            <button
              key={card.id}
              onPointerDown={() => flip(card.id)}
              className="relative aspect-[3/4] w-[4.2rem] sm:w-20 [perspective:600px]"
              disabled={card.state === "matched"}
            >
              <motion.span
                className="absolute inset-0 [transform-style:preserve-3d]"
                animate={{ rotateY: faceUp ? 180 : 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                {/* Dorso */}
                <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-ink-900 shadow-[0_4px_14px_-4px_rgba(32,27,18,0.45)] [backface-visibility:hidden]">
                  <BrainMark className="h-7 w-7 text-cream-50/40" />
                </span>
                {/* Frente */}
                <span
                  className={`absolute inset-0 flex items-center justify-center rounded-xl border-2 bg-[#fffdf6] [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                    card.state === "matched" ? "border-emerald-300 opacity-80" : "border-ink-900/12"
                  }`}
                >
                  <svg viewBox="0 0 28 28" className="h-9 w-9" fill={sym.color} stroke="none">
                    {sym.shape(0)}
                  </svg>
                </span>
              </motion.span>
            </button>
          );
        })}
      </div>
      <p className="mt-5 text-sm font-semibold text-ink-300">
        Menos intentos = mejor marca
      </p>
    </div>
  );
}
