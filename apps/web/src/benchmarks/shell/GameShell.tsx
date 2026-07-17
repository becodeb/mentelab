"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { getBenchmark } from "@mentelab/benchmarks";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatScore } from "@/lib/utils";
import { Button, Spinner } from "@/components/ui";
import type { BenchmarkStats } from "@mentelab/shared";
import { useAttemptRunner } from "./useAttemptRunner";
import { ResultsScreen } from "./ResultsScreen";
import type { GameComponent } from "./types";

/**
 * Shell común de todos los juegos (doc 02 §3): instrucciones → countdown →
 * juego a pantalla completa (cero cromo) → resultados con recompensas.
 */
export function GameShell({ slug, Game }: { slug: string; Game: GameComponent }) {
  const def = getBenchmark(slug);
  const runner = useAttemptRunner(slug);

  const stats = useQuery({
    queryKey: ["stats", slug],
    queryFn: () => api.get<BenchmarkStats>(`/v1/me/stats/${slug}`),
    enabled: runner.phase === "intro" || runner.phase === "results",
  });

  return (
    <div className="kid-zone min-h-dvh bg-cream-50">
      <AnimatePresence mode="wait">
        {runner.phase === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="flex min-h-dvh items-center justify-center p-6"
          >
            <div className="w-full max-w-lg">
              <motion.p
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
                className="text-center text-8xl"
              >
                {def.icon}
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 160, damping: 20 }}
                className="mt-4 text-center text-5xl font-bold tracking-tight"
              >
                {def.name}
              </motion.h1>
              <div className="mt-7 space-y-3">
                {def.instructions.map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.12, type: "spring", stiffness: 170, damping: 22 }}
                    className="flex items-center gap-3 rounded-2xl border border-ink-900/8 bg-[#fffdf6] px-4 py-3 shadow-[0_2px_14px_-8px_rgba(32,27,18,0.15)]"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-900 font-display text-sm font-bold text-cream-50">
                      {i + 1}
                    </span>
                    <p className="text-lg font-semibold text-ink-700">{line}</p>
                  </motion.div>
                ))}
              </div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                className="mt-8 text-center"
              >
                <Button size="xl" className="w-full" onClick={runner.start}>
                  ¡Jugar! →
                </Button>
                {stats.data?.bestScore != null && (
                  <p className="mt-3 font-display font-bold text-ink-400">
                    Tu récord: {formatScore(stats.data.bestScore, def.unit)} 🏆
                  </p>
                )}
                <Link
                  href="/play"
                  className="mt-3 inline-block text-sm font-bold text-ink-300 transition-colors hover:text-ink-700"
                >
                  ← volver a los juegos
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}

        {runner.phase === "countdown" && <Countdown key="countdown" onDone={runner.beginPlaying} />}

        {runner.phase === "playing" && runner.config != null && (
          <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Game config={runner.config} emit={runner.emit} now={runner.now} finish={runner.finish} />
          </motion.div>
        )}

        {runner.phase === "submitting" && <Spinner key="submitting" label="Guardando tu partida…" />}

        {runner.phase === "results" && runner.result && (
          <ResultsScreen key="results" slug={slug} result={runner.result} onPlayAgain={runner.reset} />
        )}

        {runner.phase === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex min-h-dvh items-center justify-center p-6"
          >
            <div className="w-full max-w-md rounded-[1.75rem] border border-ink-900/8 bg-[#fffdf6] p-8 text-center shadow-[0_2px_20px_-8px_rgba(32,27,18,0.12)]">
              <p className="text-5xl">📡</p>
              <p className="mt-3 text-lg font-bold text-ink-700">{runner.error}</p>
              <div className="mt-5 flex justify-center gap-3">
                <Button onClick={runner.reset}>Volver a intentar</Button>
                <Link href="/play">
                  <Button variant="secondary">Ir al inicio</Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Countdown 3-2-1: número gigante + anillo que se dibuja (mismo ritual siempre). */
function Countdown({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (n === 0) {
      onDone();
      return;
    }
    const t = setTimeout(() => setN(n - 1), 700);
    return () => clearTimeout(t);
  }, [n, onDone]);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-dvh items-center justify-center bg-ink-900"
    >
      <div className="relative flex h-56 w-56 items-center justify-center">
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
          <motion.circle
            key={n}
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="#d96c47"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.65, ease: "linear" }}
          />
        </svg>
        <motion.p
          key={n}
          initial={{ scale: 2.4, opacity: 0, filter: "blur(8px)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className="font-display text-8xl font-bold text-cream-50"
        >
          {n === 0 ? "¡YA!" : n}
        </motion.p>
      </div>
    </motion.div>
  );
}
