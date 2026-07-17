"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { getBenchmark } from "@mentelab/benchmarks";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatScore } from "@/lib/utils";
import { Button, Card, Spinner } from "@/components/ui";
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
    <div className="kid-zone min-h-dvh bg-slate-50">
      <AnimatePresence mode="wait">
        {runner.phase === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex min-h-dvh items-center justify-center p-6"
          >
            <Card className="w-full max-w-lg text-center">
              <p className="text-7xl">{def.icon}</p>
              <h1 className="mt-2 text-3xl font-black text-slate-800">{def.name}</h1>
              <ul className="mx-auto mt-4 max-w-md space-y-2 text-left">
                {def.instructions.map((line, i) => (
                  <li key={i} className="flex gap-2 text-lg font-semibold text-slate-600">
                    <span className="text-brand-500 font-black">{i + 1}.</span>
                    {line}
                  </li>
                ))}
              </ul>
              <Button size="xl" className="mt-6 w-full" onClick={runner.start}>
                ¡JUGAR!
              </Button>
              {stats.data?.bestScore != null && (
                <p className="mt-3 font-bold text-slate-400">
                  Tu récord: {formatScore(stats.data.bestScore, def.unit)} 🏆
                </p>
              )}
              <Link href="/play" className="mt-4 inline-block text-sm font-bold text-slate-400">
                ← volver a los juegos
              </Link>
            </Card>
          </motion.div>
        )}

        {runner.phase === "countdown" && (
          <Countdown key="countdown" onDone={runner.beginPlaying} />
        )}

        {runner.phase === "playing" && runner.config != null && (
          <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Game
              config={runner.config}
              emit={runner.emit}
              now={runner.now}
              finish={runner.finish}
            />
          </motion.div>
        )}

        {runner.phase === "submitting" && <Spinner key="submitting" label="Guardando tu partida…" />}

        {runner.phase === "results" && runner.result && (
          <ResultsScreen
            key="results"
            slug={slug}
            result={runner.result}
            onPlayAgain={runner.reset}
          />
        )}

        {runner.phase === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex min-h-dvh items-center justify-center p-6"
          >
            <Card className="w-full max-w-md text-center">
              <p className="text-5xl">📡</p>
              <p className="mt-3 text-lg font-bold text-slate-600">{runner.error}</p>
              <div className="mt-4 flex justify-center gap-3">
                <Button onClick={runner.reset}>Volver a intentar</Button>
                <Link href="/play">
                  <Button variant="secondary">Ir al inicio</Button>
                </Link>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Countdown 3-2-1 con animación (todo juego arranca igual → dato comparable). */
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
      className="flex min-h-dvh items-center justify-center"
    >
      <motion.p
        key={n}
        initial={{ scale: 2.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-9xl font-black text-brand-600"
      >
        {n === 0 ? "¡YA!" : n}
      </motion.p>
    </motion.div>
  );
}
