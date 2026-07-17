"use client";

import { useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { getBenchmark } from "@mentelab/benchmarks";
import type { CompleteAttemptResponse } from "@mentelab/shared";
import { formatScore } from "@/lib/utils";
import { Button, Card, ProgressBar } from "@/components/ui";

/**
 * Pantalla de resultados (doc 04 §2): SIEMPRE abre con lo positivo personal
 * (frase de aliento, récord, XP); la posición viene al final y en positivo.
 */
export function ResultsScreen({
  slug,
  result,
  onPlayAgain,
}: {
  slug: string;
  result: CompleteAttemptResponse;
  onPlayAgain: () => void;
}) {
  const def = getBenchmark(slug);
  const r = result.rewards;

  useEffect(() => {
    if (r.personalRecord || r.levelUp) {
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
    } else if (Math.random() < 0.12) {
      // Refuerzo variable: micro-celebración sorpresa ocasional (doc 05 §5.7)
      confetti({ particleCount: 40, spread: 55, origin: { y: 0.7 } });
    }
  }, [r.personalRecord, r.levelUp]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-dvh items-center justify-center p-6"
    >
      <Card className="w-full max-w-lg text-center">
        <motion.p
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="text-5xl font-black text-brand-700"
        >
          {formatScore(result.score, def.unit)}
        </motion.p>
        {r.personalRecord && (
          <p className="mt-1 text-xl font-black text-amber-500">🏆 ¡NUEVO RÉCORD PERSONAL!</p>
        )}
        <p className="mt-2 text-lg font-bold text-slate-600">{r.encouragement}</p>

        {/* XP y nivel */}
        <div className="mt-5 rounded-2xl bg-brand-50 p-4 text-left">
          <div className="flex items-center justify-between">
            <p className="font-black text-brand-700">
              +{r.xpEarned} XP {r.levelUp && "· ¡SUBISTE DE NIVEL! 🎉"}
            </p>
            <p className="text-sm font-bold text-brand-500">Nivel {r.level}</p>
          </div>
          <ProgressBar value={r.xpIntoLevel} max={r.xpForNextLevel} className="mt-2" />
          <div className="mt-2 flex flex-wrap gap-1">
            {r.xpBreakdown.map((g, i) => (
              <span key={i} className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-brand-600">
                {xpReasonLabel(g.reason)} +{g.amount}
              </span>
            ))}
          </div>
        </div>

        {/* Racha */}
        {r.currentStreak > 1 && (
          <p className="mt-3 font-black text-orange-500">🔥 {r.currentStreak} días seguidos</p>
        )}

        {/* Insignias nuevas */}
        {r.newBadges.length > 0 && (
          <div className="mt-4 space-y-2">
            {r.newBadges.map((b) => (
              <motion.div
                key={b.code}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-3 rounded-2xl border-2 border-amber-200 bg-amber-50 p-3 text-left"
              >
                <span className="text-3xl">{b.emoji}</span>
                <div>
                  <p className="font-black text-amber-700">¡Insignia: {b.name}!</p>
                  <p className="text-sm font-semibold text-amber-600">{b.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Misiones */}
        {r.missionsAdvanced.length > 0 && (
          <div className="mt-4 space-y-1 text-left">
            {r.missionsAdvanced.map((m) => (
              <div key={m.code} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-sm font-bold text-slate-600">
                  {m.completed ? "✅" : "📋"} {m.title}
                </p>
                <p className="text-sm font-black text-slate-500">
                  {m.progress}/{m.target}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Posición (al final, en positivo, solo si está habilitada) */}
        {result.classroomRank != null && (
          <p className="mt-4 text-sm font-bold text-slate-400">
            Vas {result.classroomRank}º en tu curso este mes. ¡Seguí así!
          </p>
        )}

        <div className="mt-6 flex justify-center gap-3">
          <Button size="lg" onClick={onPlayAgain}>
            🔁 Otra vez
          </Button>
          <Link href="/play">
            <Button size="lg" variant="secondary">
              🏠 Juegos
            </Button>
          </Link>
          <Link href="/me">
            <Button size="lg" variant="ghost">
              📊
            </Button>
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}

function xpReasonLabel(reason: string): string {
  if (reason === "attempt") return "Partida";
  if (reason === "first_of_day") return "Primera del día";
  if (reason === "variety") return "Variedad";
  if (reason === "beat_own_avg") return "Mejor que tu promedio";
  if (reason === "personal_record") return "Récord";
  if (reason.startsWith("streak_")) return `Racha ${reason.split("_")[1]}`;
  if (reason.startsWith("mission:")) return "Misión";
  if (reason.startsWith("badge:")) return "Insignia";
  return reason;
}
