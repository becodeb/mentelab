"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AimTrainerConfig } from "@mentelab/benchmarks";
import type { GameProps } from "../shell/types";
import { sfx } from "@/lib/sfx";

interface Target {
  i: number;
  xPct: number;
  yPct: number;
}

export function AimTrainerGame({ config, emit, now, finish }: GameProps) {
  const cfg = config as AimTrainerConfig;
  const [target, setTarget] = useState<Target | null>(null);
  const [hits, setHits] = useState(0);
  const shownAtRef = useRef(0);
  const areaRef = useRef<HTMLDivElement>(null);

  const spawn = useCallback(
    (i: number) => {
      // Margen para que el target entre completo en pantalla.
      const t: Target = {
        i,
        xPct: 8 + Math.random() * 84,
        yPct: 12 + Math.random() * 76,
      };
      setTarget(t);
      shownAtRef.current = now();
      emit("target_shown", { i, x: Math.round(t.xPct), y: Math.round(t.yPct) });
    },
    [emit, now],
  );

  useEffect(() => {
    spawn(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHit = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!target) return;
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const distPx = Math.round(Math.hypot(e.clientX - cx, e.clientY - cy));
    emit("target_hit", { i: target.i, ms: now() - shownAtRef.current, distPx });
    sfx.note(target.i);
    const done = target.i >= cfg.targets;
    setHits(target.i);
    setTarget(null);
    if (done) {
      setTimeout(finish, 300);
    } else {
      setTimeout(() => spawn(target.i + 1), 120);
    }
  };

  const handleMiss = () => {
    if (target) {
      sfx.error();
      emit("target_miss", { i: target.i });
    }
  };

  return (
    <div
      ref={areaRef}
      onPointerDown={handleMiss}
      className="relative min-h-dvh w-full select-none overflow-hidden bg-cream-50"
    >
      <p className="pointer-events-none absolute left-1/2 top-5 -translate-x-1/2 font-display text-sm font-bold uppercase tracking-[0.25em] text-ink-400">
        {hits} de {cfg.targets} blancos
      </p>
      {target && (
        <button
          onPointerDown={handleHit}
          aria-label="blanco"
          className="absolute flex items-center justify-center rounded-full bg-brand-600 shadow-[0_10px_28px_-8px_rgba(198,82,48,0.7)] transition-transform active:scale-90"
          style={{
            left: `${target.xPct}%`,
            top: `${target.yPct}%`,
            width: cfg.targetSizePx,
            height: cfg.targetSizePx,
            transform: "translate(-50%, -50%)",
          }}
        >
          <span
            className="rounded-full border-4 border-cream-50/70"
            style={{ width: cfg.targetSizePx * 0.62, height: cfg.targetSizePx * 0.62 }}
          />
          <span
            className="absolute rounded-full bg-cream-50"
            style={{ width: cfg.targetSizePx * 0.22, height: cfg.targetSizePx * 0.22 }}
          />
        </button>
      )}
    </div>
  );
}
