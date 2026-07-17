"use client";

import { useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getBenchmark } from "@mentelab/benchmarks";
import type { CompleteAttemptResponse, LeaderboardResponse } from "@mentelab/shared";
import { api } from "@/lib/api";
import { formatScore } from "@/lib/utils";
import { useSession } from "@/features/auth/hooks";
import { Button, ProgressBar } from "@/components/ui";
import { sfx } from "@/lib/sfx";
import {
  ChartIcon,
  CheckIcon,
  FlameIcon,
  MissionIcon,
  Monogram,
  TrophyIcon,
} from "@/components/icons";

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
    const palette = ["#d96c47", "#e8a33d", "#8cb573", "#7c97d8", "#201b12"];
    if (r.personalRecord || r.levelUp) {
      sfx.record();
      confetti({ particleCount: 160, spread: 85, origin: { y: 0.55 }, colors: palette });
      setTimeout(
        () => confetti({ particleCount: 60, spread: 120, origin: { y: 0.4 }, colors: palette }),
        350,
      );
    } else if (Math.random() < 0.12) {
      // Refuerzo variable: micro-celebración sorpresa ocasional (doc 05 §5.7)
      confetti({ particleCount: 40, spread: 55, origin: { y: 0.7 }, colors: palette });
    }
  }, [r.personalRecord, r.levelUp]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-dvh items-center justify-center p-6"
    >
      <div className="w-full max-w-lg">
        {/* Score protagonista */}
        <div className="relative text-center">
          {r.personalRecord && (
            <motion.div
              aria-hidden
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.6, opacity: [0, 0.5, 0] }}
              transition={{ duration: 1.1, ease: "easeOut" }}
              className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-400"
            />
          )}
          <motion.p
            initial={{ scale: 0.3, opacity: 0, rotate: -4 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 13, delay: 0.1 }}
            className="relative font-display text-7xl font-bold tracking-tight text-ink-900"
          >
            {formatScore(result.score, def.unit)}
          </motion.p>
          {r.personalRecord && (
            <motion.p
              initial={{ opacity: 0, y: 12, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.35, type: "spring", stiffness: 200, damping: 12 }}
              className="mt-2 inline-flex items-center gap-2 font-display text-2xl font-bold text-brand-600"
            >
              <TrophyIcon className="h-6 w-6" /> ¡NUEVO RÉCORD PERSONAL!
            </motion.p>
          )}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mt-2 text-lg font-bold text-ink-500"
          >
            {r.encouragement}
          </motion.p>
        </div>

        {/* XP y nivel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, type: "spring", stiffness: 160, damping: 20 }}
          className="mt-7 rounded-[1.75rem] border border-ink-900/8 bg-[#fffdf6] p-5 shadow-[0_2px_20px_-8px_rgba(32,27,18,0.12)]"
        >
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-bold text-ink-900">
              +{r.xpEarned} XP
              {r.levelUp && <span className="ml-2 text-brand-600">¡SUBISTE DE NIVEL! 🎉</span>}
            </p>
            <p className="font-display text-sm font-bold text-ink-400">Nivel {r.level}</p>
          </div>
          <ProgressBar
            value={r.xpIntoLevel}
            max={r.xpForNextLevel}
            className="mt-2.5"
            barClassName="bg-gradient-to-r from-brand-400 to-brand-600"
          />
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {r.xpBreakdown.map((g, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + i * 0.07, type: "spring", stiffness: 260, damping: 16 }}
                className="rounded-full bg-cream-100 px-2.5 py-1 text-xs font-bold text-ink-700"
              >
                {xpReasonLabel(g.reason)} +{g.amount}
              </motion.span>
            ))}
          </div>
          {r.currentStreak > 1 && (
            <p className="mt-3 inline-flex items-center gap-1.5 font-display font-bold text-brand-600">
              <FlameIcon className="h-5 w-5" /> {r.currentStreak} días seguidos
            </p>
          )}
        </motion.div>

        {/* Insignias nuevas */}
        {r.newBadges.map((b, i) => (
          <motion.div
            key={b.code}
            initial={{ opacity: 0, x: -30, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.8 + i * 0.15, type: "spring", stiffness: 200, damping: 15 }}
            className="mt-3 flex items-center gap-3 rounded-[1.5rem] border-2 border-amber-300 bg-amber-50 p-4"
          >
            <motion.span
              className="text-4xl"
              animate={{ rotate: [-8, 10, -8] }}
              transition={{ duration: 1.6, repeat: 2, ease: "easeInOut" }}
            >
              {b.emoji}
            </motion.span>
            <div>
              <p className="font-display font-bold text-amber-700">¡Insignia: {b.name}!</p>
              <p className="text-sm font-semibold text-amber-600">{b.description}</p>
            </div>
          </motion.div>
        ))}

        {/* Misiones */}
        {r.missionsAdvanced.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mt-3 space-y-1.5"
          >
            {r.missionsAdvanced.map((m) => (
              <div
                key={m.code}
                className="flex items-center justify-between rounded-2xl bg-cream-100 px-4 py-2.5"
              >
                <p className="inline-flex items-center gap-2 text-sm font-bold text-ink-700">
                  {m.completed ? (
                    <CheckIcon className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <MissionIcon className="h-4 w-4 text-ink-400" />
                  )}
                  {m.title}
                </p>
                <p className="font-display text-sm font-bold text-ink-500">
                  {m.progress}/{m.target}
                </p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Ranking del curso: podio + tu posición, apenas terminás (competencia sana) */}
        <CourseRankPanel slug={slug} />

        {result.classroomRank != null && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-3 text-center text-sm font-bold text-ink-400"
          >
            ¡Seguí así! Cada partida cuenta.
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95 }}
          className="mt-7 flex justify-center gap-3"
        >
          <Button size="lg" onClick={onPlayAgain}>
            Otra vez
          </Button>
          <Link href="/play">
            <Button size="lg" variant="secondary">
              Juegos
            </Button>
          </Link>
          <Link href="/me" aria-label="Mi progreso">
            <Button size="lg" variant="ghost">
              <ChartIcon className="h-5 w-5" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}

/**
 * Podio del curso apenas termina la partida: top 3 + tu posición.
 * Es EL momento de máxima motivación para picarse sanamente con compañeros.
 */
function CourseRankPanel({ slug }: { slug: string }) {
  const session = useSession();
  const isStudent = session.data?.principal?.kind === "student";
  const board = useQuery({
    queryKey: ["post-game-rank", slug],
    queryFn: () =>
      api.get<LeaderboardResponse>(
        `/v1/leaderboards?scope=classroom&benchmark=${slug}&period=30d&metric=best&around=me&limit=3`,
      ),
    enabled: isStudent,
    staleTime: 0,
  });

  if (!isStudent || !board.data || board.data.entries.length === 0) return null;
  const { entries, myEntry, totalPlayers, unit } = board.data;
  const top = entries.slice(0, 3);
  const meInTop = myEntry && top.some((e) => e.playerId === myEntry.playerId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.05, type: "spring", stiffness: 160, damping: 20 }}
      className="mt-4 rounded-[1.75rem] border border-ink-900/8 bg-[#fffdf6] p-5 shadow-[0_2px_20px_-8px_rgba(32,27,18,0.12)]"
    >
      <div className="flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
          <TrophyIcon className="h-5 w-5 text-amber-600" /> Ranking del curso
        </h3>
        <Link href="/rankings" className="text-xs font-bold text-brand-600 hover:underline">
          ver completo →
        </Link>
      </div>
      <div className="mt-3 space-y-1.5">
        {top.map((e, i) => (
          <motion.div
            key={e.playerId}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.15 + i * 0.1 }}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${
              e.isMe ? "bg-brand-50 ring-2 ring-brand-300" : "bg-cream-100"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${
                e.rank === 1
                  ? "bg-amber-400 text-ink-900"
                  : e.rank === 2
                    ? "bg-cream-300 text-ink-700"
                    : "bg-brand-300 text-ink-900"
              }`}
            >
              {e.rank}º
            </span>
            <Monogram name={e.displayName} seed={e.playerId} className="h-8 w-8 text-sm" />
            <span className="flex-1 truncate text-sm font-bold text-ink-700">
              {e.displayName}
              {e.isMe && " (vos)"}
            </span>
            <span className="font-display text-sm font-bold text-ink-600">
              {formatScore(e.value, unit)}
            </span>
          </motion.div>
        ))}
        {myEntry && !meInTop && (
          <>
            <p className="text-center font-display text-xs font-bold text-ink-300">···</p>
            <div className="flex items-center gap-3 rounded-2xl bg-brand-50 px-3 py-2 ring-2 ring-brand-300">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream-100 font-display text-sm font-bold text-ink-700">
                {myEntry.rank}º
              </span>
              <Monogram name={myEntry.displayName} seed={myEntry.playerId} className="h-8 w-8 text-sm" />
              <span className="flex-1 truncate text-sm font-bold text-ink-700">
                {myEntry.displayName} (vos)
              </span>
              <span className="font-display text-sm font-bold text-ink-600">
                {formatScore(myEntry.value, unit)}
              </span>
            </div>
          </>
        )}
      </div>
      {myEntry && (
        <p className="mt-3 text-center text-xs font-bold text-ink-400">
          Vas {myEntry.rank}º de {totalPlayers} este mes
          {myEntry.rank > 1 && " — ¡una partida más y los alcanzás!"}
        </p>
      )}
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
