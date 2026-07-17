"use client";

import { useEffect, useRef, useState } from "react";
import type { PursuitConfig } from "@mentelab/benchmarks";
import type { GameProps } from "../shell/types";
import { sfx } from "@/lib/sfx";

const SAMPLE_MS = 150;

/** PERSECUCIÓN: objetivo en movimiento continuo; mantené el puntero encima. */
export function PursuitGame({ config, emit, now, finish }: GameProps) {
  const cfg = config as PursuitConfig;
  const areaRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const onTargetRef = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState(cfg.durationSec);
  const [onTarget, setOnTarget] = useState(false);
  const [onPct, setOnPct] = useState(0);
  const finishedRef = useRef(false);
  const statsRef = useRef({ on: 0, total: 0 });

  // Movimiento del objetivo (curva de Lissajous suave) + muestreo.
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    let raf = 0;

    const animate = () => {
      const rect = el.getBoundingClientRect();
      const t = now() / 1000;
      const w = rect.width;
      const h = rect.height;
      const margin = cfg.targetRadiusPx + 24;
      const ax = (w - margin * 2) / 2;
      const ay = (h - margin * 2) / 2;
      const cx = w / 2;
      const cy = h / 2;
      const s = cfg.speed / 10;
      const x = cx + ax * Math.sin(2 * Math.PI * s * t * 0.9);
      const y = cy + ay * Math.sin(2 * Math.PI * s * t * 0.63 + 1.2);
      targetRef.current = { x, y };
      const dot = el.querySelector<HTMLElement>("[data-target]");
      if (dot) dot.style.transform = `translate(${x - cfg.targetRadiusPx}px, ${y - cfg.targetRadiusPx}px)`;
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    const sampler = setInterval(() => {
      if (finishedRef.current) return;
      const p = pointerRef.current;
      const tg = targetRef.current;
      const dist = p ? Math.round(Math.hypot(p.x - tg.x, p.y - tg.y)) : 9999;
      // Hitbox 35% más generosa que el círculo visible (game feel para chicos).
      const on = dist <= cfg.targetRadiusPx * 1.35;
      statsRef.current.total++;
      if (on) statsRef.current.on++;
      if (on !== onTargetRef.current) {
        onTargetRef.current = on;
        setOnTarget(on);
        if (on) sfx.tap();
      }
      setOnPct(Math.round((statsRef.current.on / statsRef.current.total) * 100));
      emit("track_sample", { t: Math.round(now()), dist: Math.min(dist, 2000), on });
    }, SAMPLE_MS);

    const timer = setInterval(() => {
      const left = cfg.durationSec - Math.floor(now() / 1000);
      setSecondsLeft(Math.max(0, left));
      if (left <= 0 && !finishedRef.current) {
        finishedRef.current = true;
        finish();
      }
    }, 250);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(sampler);
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trackPointer = (e: React.PointerEvent) => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return;
    pointerRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  return (
    <div
      ref={areaRef}
      onPointerMove={trackPointer}
      onPointerDown={trackPointer}
      className="fixed inset-0 z-40 min-h-dvh w-full touch-none select-none overflow-hidden bg-cream-50"
    >
      <div className="pointer-events-none absolute left-1/2 top-5 z-10 flex -translate-x-1/2 items-center gap-6 font-display text-sm font-bold uppercase tracking-[0.25em] text-ink-400">
        <span>{secondsLeft}s</span>
        <span className={onTarget ? "text-emerald-600" : "text-ink-700"}>{onPct}% encima</span>
      </div>
      <span
        data-target
        className={`absolute left-0 top-0 rounded-full transition-colors duration-150 ${
          onTarget
            ? "bg-emerald-500 shadow-[0_0_0_10px_rgba(140,181,115,0.25)]"
            : "bg-brand-600 shadow-[0_10px_28px_-8px_rgba(198,82,48,0.7)]"
        }`}
        style={{ width: cfg.targetRadiusPx * 2, height: cfg.targetRadiusPx * 2 }}
      />
      <p className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-sm font-semibold text-ink-300">
        seguilo con el dedo o el mouse, sin soltar
      </p>
    </div>
  );
}
