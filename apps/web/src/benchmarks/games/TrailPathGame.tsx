"use client";

import { useEffect, useRef, useState } from "react";
import type { TrailPathConfig } from "@mentelab/benchmarks";
import type { GameProps } from "../shell/types";
import { sfx } from "@/lib/sfx";

interface Node {
  label: string;
  idx: number;
  xPct: number;
  yPct: number;
}

const LETTERS = "ABCDEFGH";

/** UNÍ EL CAMINO (trail making): nodos en orden, con línea que se dibuja. */
export function TrailPathGame({ config, emit, now, finish }: GameProps) {
  const cfg = config as TrailPathConfig;
  const [nodes, setNodes] = useState<Node[]>([]);
  const [nextIdx, setNextIdx] = useState(0);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Etiquetas: 1,2,3… o alternado 1,A,2,B…
    const labels: string[] = [];
    for (let i = 0; i < cfg.nodes; i++) {
      if (cfg.alternating) {
        labels.push(i % 2 === 0 ? String(i / 2 + 1) : LETTERS[(i - 1) / 2]!);
      } else {
        labels.push(String(i + 1));
      }
    }
    // Posiciones sin superposición (mínimo 16% de distancia).
    const placed: Node[] = [];
    for (let i = 0; i < labels.length; i++) {
      let x = 0,
        y = 0,
        tries = 0;
      do {
        x = 10 + Math.random() * 80;
        y = 14 + Math.random() * 72;
        tries++;
      } while (
        tries < 60 &&
        placed.some((p) => Math.hypot(p.xPct - x, p.yPct - y) < 16)
      );
      placed.push({ label: labels[i]!, idx: i, xPct: x, yPct: y });
    }
    setNodes(placed);
    emit("trail_shown", { nodes: labels, alternating: cfg.alternating });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = (node: Node) => {
    const correct = node.idx === nextIdx;
    emit("node_tap", { label: node.label, correct, ms: Math.round(now()) });
    if (correct) {
      sfx.note(node.idx);
      if (node.idx === cfg.nodes - 1) {
        sfx.success();
        setTimeout(finish, 400);
      } else {
        setNextIdx(node.idx + 1);
      }
    } else {
      sfx.error();
      setWrongIdx(node.idx);
      setTimeout(() => setWrongIdx(null), 300);
    }
  };

  const done = nodes.filter((n) => n.idx < nextIdx);

  return (
    <div className="fixed inset-0 z-40 min-h-dvh w-full select-none overflow-hidden bg-cream-50">
      <p className="pointer-events-none absolute left-1/2 top-5 z-10 -translate-x-1/2 font-display text-sm font-bold uppercase tracking-[0.25em] text-ink-400">
        siguiente: <span className="text-ink-900">{nodes[nextIdx]?.label ?? "—"}</span>
      </p>

      {/* Camino ya dibujado */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        {done.slice(0, -0).map((n, i) => {
          const nextNode = nodes.find((m) => m.idx === n.idx + 1);
          if (!nextNode || n.idx + 1 > nextIdx - 1) return null;
          return (
            <line
              key={i}
              x1={`${n.xPct}%`}
              y1={`${n.yPct}%`}
              x2={`${nextNode.xPct}%`}
              y2={`${nextNode.yPct}%`}
              stroke="#c65230"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.5"
            />
          );
        })}
      </svg>

      {nodes.map((n) => {
        const found = n.idx < nextIdx;
        return (
          <button
            key={n.idx}
            onPointerDown={() => tap(n)}
            className={`absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-display text-xl font-bold shadow-[0_6px_16px_-6px_rgba(32,27,18,0.4)] transition-all active:scale-90 ${
              found
                ? "bg-brand-500 text-cream-50"
                : wrongIdx === n.idx
                  ? "bg-rose-500 text-cream-50"
                  : /\d/.test(n.label)
                    ? "border-2 border-ink-900/15 bg-[#fffdf6] text-ink-900"
                    : "border-2 border-blue-300 bg-blue-100 text-blue-600"
            }`}
            style={{ left: `${n.xPct}%`, top: `${n.yPct}%` }}
          >
            {n.label}
          </button>
        );
      })}
    </div>
  );
}
