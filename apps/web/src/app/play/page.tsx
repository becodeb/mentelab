"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { serializeCatalog } from "@mentelab/benchmarks";
import { useEnsurePlayer, useMeSummary } from "@/features/player/hooks";
import { useLogout } from "@/features/auth/hooks";
import { formatScore } from "@/lib/utils";
import { ProgressBar, Spinner } from "@/components/ui";
import { Reveal, StaggerIn } from "@/components/motion";
import {
  ChartIcon,
  CheckIcon,
  FlameIcon,
  GameIcon,
  LaurelIcon,
  LogoutIcon,
  MissionIcon,
  Monogram,
  TrophyIcon,
} from "@/components/icons";

const CATEGORY_ACCENT: Record<string, { chip: string; bar: string }> = {
  SPEED: { chip: "bg-amber-100 text-amber-700", bar: "bg-amber-500" },
  MEMORY: { chip: "bg-blue-100 text-blue-600", bar: "bg-blue-500" },
  ATTENTION: { chip: "bg-emerald-100 text-emerald-600", bar: "bg-emerald-500" },
  PRECISION: { chip: "bg-pink-100 text-pink-600", bar: "bg-pink-500" },
  TYPING: { chip: "bg-cyan-100 text-cyan-600", bar: "bg-cyan-500" },
};

/** Hub del jugador: nivel, racha, misiones del día y los 12 retos. */
export default function PlayHubPage() {
  const router = useRouter();
  const { principal, ready, isLoading } = useEnsurePlayer();
  const summary = useMeSummary(ready);
  const logout = useLogout();
  const catalog = serializeCatalog();

  if (isLoading || !ready) return <Spinner label="Preparando tu espacio…" />;
  const s = summary.data;
  const name = principal && principal.kind !== "staff" ? principal.displayName : "";

  return (
    <main className="kid-zone min-h-dvh bg-cream-50 pb-20">
      <StaggerIn className="mx-auto max-w-3xl px-4 pt-8">
        {/* Saludo editorial */}
        <Reveal>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-display text-sm font-bold uppercase tracking-[0.22em] text-brand-600">
                {s?.isGuest ? "Modo libre" : "Tu entrenamiento"}
              </p>
              <h1 className="mt-1 text-5xl font-semibold tracking-tight sm:text-6xl">
                ¡Hola, <em className="text-brand-600">{name}</em>!
              </h1>
              <p className="mt-2 text-lg font-medium text-ink-500">
                Entrená tu mente. Superá tus marcas. Disfrutá el proceso.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <nav className="hidden items-center gap-4 text-sm font-bold text-ink-400 sm:flex">
                <Link href="/me" className="inline-flex items-center gap-1.5 transition-colors hover:text-ink-900">
                  <ChartIcon className="h-4 w-4" /> Mi progreso
                </Link>
                <Link href="/rankings" className="inline-flex items-center gap-1.5 transition-colors hover:text-ink-900">
                  <TrophyIcon className="h-4 w-4" /> Rankings
                </Link>
                <button
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-ink-900"
                  onClick={() => logout.mutate(undefined, { onSuccess: () => router.push("/") })}
                >
                  <LogoutIcon className="h-4 w-4" /> Salir
                </button>
              </nav>
              <Monogram name={name || "?"} seed={s?.playerId} className="h-14 w-14 text-2xl" />
            </div>
          </div>
        </Reveal>

        {/* Nivel + racha */}
        {s && (
          <Reveal className="mt-7">
            <div className="flex items-center gap-5 rounded-[1.75rem] border border-ink-900/8 bg-[#fffdf6] p-5 shadow-[0_2px_20px_-8px_rgba(32,27,18,0.12)]">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
                <LaurelIcon className="absolute inset-0 h-full w-full text-amber-500" />
                <span className="font-display text-2xl font-bold text-ink-900">{s.level}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-xl font-semibold">Nivel {s.level}</p>
                  <p className="text-sm font-bold text-ink-400">
                    {s.xpIntoLevel}/{s.xpForNextLevel} XP
                  </p>
                </div>
                <ProgressBar
                  value={s.xpIntoLevel}
                  max={s.xpForNextLevel}
                  className="mt-2"
                  barClassName="bg-brand-500"
                />
              </div>
              {s.currentStreak > 0 && (
                <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2.5">
                  <motion.span
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <FlameIcon className="h-6 w-6 text-brand-600" />
                  </motion.span>
                  <div className="leading-tight">
                    <p className="font-display text-xl font-bold text-brand-700">{s.currentStreak}</p>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-brand-500">
                      días de racha
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        )}

        {/* Misiones del día */}
        {s && s.missions.length > 0 && (
          <Reveal className="mt-4">
            <div className="rounded-[1.75rem] border border-ink-900/8 bg-[#fffdf6] p-5 shadow-[0_2px_20px_-8px_rgba(32,27,18,0.12)]">
              <div className="flex items-center justify-between">
                <h2 className="inline-flex items-center gap-2 font-display text-xl font-semibold">
                  <MissionIcon className="h-5 w-5 text-brand-600" /> Misiones de hoy
                </h2>
                <p className="hidden text-xs font-bold text-ink-300 sm:block">
                  ¡Volvé mañana por nuevas misiones!
                </p>
              </div>
              <div className="mt-4 space-y-4">
                {s.missions.map((m) => (
                  <div key={m.code} className="flex items-center gap-4">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                        m.completed
                          ? "border-emerald-500 bg-emerald-500 text-cream-50"
                          : "border-ink-900/15 text-transparent"
                      }`}
                    >
                      <CheckIcon className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <p
                        className={`font-semibold ${m.completed ? "text-ink-300 line-through" : "text-ink-700"}`}
                      >
                        {m.title}
                      </p>
                      <ProgressBar
                        value={m.progress}
                        max={m.target}
                        className="mt-1.5 h-2"
                        barClassName={m.completed ? "bg-emerald-500" : "bg-brand-500"}
                      />
                    </div>
                    <span className="font-display text-sm font-bold text-brand-600">
                      +{m.xpReward} XP
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {/* Juegos */}
        <Reveal className="mt-9">
          <h2 className="text-3xl font-semibold tracking-tight">Elegí tu reto</h2>
        </Reveal>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {catalog.map((b, i) => {
            const stats = s?.perBenchmark.find((p) => p.benchmarkSlug === b.slug);
            const accent = CATEGORY_ACCENT[b.category] ?? CATEGORY_ACCENT["MEMORY"]!;
            return (
              <motion.div
                key={b.slug}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.05, type: "spring", stiffness: 170, damping: 20 }}
              >
                <Link
                  href={`/play/${b.slug}`}
                  className="group relative block overflow-hidden rounded-[1.5rem] border border-ink-900/8 bg-[#fffdf6] p-4 pb-5 text-center shadow-[0_2px_20px_-8px_rgba(32,27,18,0.12)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_22px_40px_-16px_rgba(32,27,18,0.28)] active:scale-95"
                >
                  <span
                    className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${accent.chip}`}
                  >
                    <GameIcon slug={b.slug} className="h-8 w-8" />
                  </span>
                  <p className="mt-3 font-display text-lg font-semibold leading-tight">{b.name}</p>
                  <p className="mt-1 text-xs font-semibold text-ink-400">
                    {stats?.bestScore != null
                      ? `Récord: ${formatScore(stats.bestScore, b.unit)}`
                      : "¡Probalo!"}
                  </p>
                  <span
                    className={`absolute inset-x-6 bottom-0 h-1 rounded-t-full ${accent.bar} opacity-70 transition-all duration-300 group-hover:inset-x-3 group-hover:opacity-100`}
                  />
                </Link>
              </motion.div>
            );
          })}
        </div>
        <p className="mt-10 text-center font-display text-sm font-semibold italic text-ink-300">
          Pequeños hábitos, grandes cambios.
        </p>
      </StaggerIn>
    </main>
  );
}
