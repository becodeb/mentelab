"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { serializeCatalog } from "@mentelab/benchmarks";
import { avatarEmoji } from "@mentelab/shared";
import { useEnsurePlayer, useMeSummary } from "@/features/player/hooks";
import { useLogout } from "@/features/auth/hooks";
import { formatScore } from "@/lib/utils";
import { ProgressBar, Spinner } from "@/components/ui";
import { Reveal, StaggerIn } from "@/components/motion";

const CATEGORY_TINT: Record<string, string> = {
  SPEED: "bg-amber-100",
  MEMORY: "bg-blue-100",
  ATTENTION: "bg-emerald-100",
  PRECISION: "bg-pink-100",
  TYPING: "bg-cyan-100",
};

/** Hub del jugador: saludo, racha, misiones del día y los 8 juegos. */
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
              <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-ink-400">
                {s?.isGuest ? "Modo libre" : "Tu entrenamiento"}
              </p>
              <h1 className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
                ¡Hola, {name}!{" "}
                <motion.span
                  className="inline-block"
                  animate={{ rotate: [0, 16, -8, 12, 0] }}
                  transition={{ delay: 0.8, duration: 1.1, ease: "easeInOut" }}
                >
                  👋
                </motion.span>
              </h1>
            </div>
            <span className="text-6xl">{s ? avatarEmoji(s.avatarId) : "🙂"}</span>
          </div>
        </Reveal>

        {/* Nivel + racha */}
        {s && (
          <Reveal className="mt-6">
            <div className="rounded-[1.75rem] border border-ink-900/8 bg-[#fffdf6] p-5 shadow-[0_2px_20px_-8px_rgba(32,27,18,0.12)]">
              <div className="flex items-center justify-between">
                <p className="font-display text-lg font-bold">
                  Nivel {s.level}
                  <span className="ml-2 text-sm font-semibold text-ink-400">
                    {s.xpIntoLevel}/{s.xpForNextLevel} XP
                  </span>
                </p>
                <div className="flex items-center gap-4">
                  {s.currentStreak > 0 && (
                    <motion.p
                      className="font-display text-lg font-bold text-brand-600"
                      animate={{ scale: [1, 1.12, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      🔥 {s.currentStreak} días
                    </motion.p>
                  )}
                  <nav className="flex gap-3 text-sm font-bold text-ink-400">
                    <Link href="/me" className="transition-colors hover:text-ink-900">
                      Mi progreso
                    </Link>
                    <Link href="/rankings" className="transition-colors hover:text-ink-900">
                      Rankings
                    </Link>
                    <button
                      className="transition-colors hover:text-ink-900"
                      onClick={() =>
                        logout.mutate(undefined, { onSuccess: () => router.push("/") })
                      }
                    >
                      Salir
                    </button>
                  </nav>
                </div>
              </div>
              <ProgressBar
                value={s.xpIntoLevel}
                max={s.xpForNextLevel}
                className="mt-3"
                barClassName="bg-gradient-to-r from-brand-400 to-brand-600"
              />
            </div>
          </Reveal>
        )}

        {/* Misiones del día */}
        {s && s.missions.length > 0 && (
          <Reveal className="mt-4">
            <div className="rounded-[1.75rem] border border-ink-900/8 bg-[#fffdf6] p-5 shadow-[0_2px_20px_-8px_rgba(32,27,18,0.12)]">
              <h2 className="font-display text-lg font-bold">Misiones de hoy 📋</h2>
              <div className="mt-3 space-y-3">
                {s.missions.map((m) => (
                  <div key={m.code} className="flex items-center gap-3">
                    <span className="text-2xl">{m.completed ? "✅" : m.emoji}</span>
                    <div className="flex-1">
                      <p
                        className={`text-sm font-bold ${m.completed ? "text-ink-300 line-through" : "text-ink-700"}`}
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
                    <span className="font-display text-xs font-bold text-brand-600">
                      +{m.xpReward} XP
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {/* Juegos */}
        <Reveal className="mt-8">
          <h2 className="text-2xl font-bold tracking-tight">Elegí tu reto</h2>
        </Reveal>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {catalog.map((b, i) => {
            const stats = s?.perBenchmark.find((p) => p.benchmarkSlug === b.slug);
            return (
              <motion.div
                key={b.slug}
                initial={{ opacity: 0, y: 26, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.25 + i * 0.06, type: "spring", stiffness: 170, damping: 20 }}
              >
                <Link
                  href={`/play/${b.slug}`}
                  className="group block rounded-[1.75rem] border border-ink-900/8 bg-[#fffdf6] p-4 text-center shadow-[0_2px_20px_-8px_rgba(32,27,18,0.12)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_22px_40px_-16px_rgba(32,27,18,0.28)] active:scale-95"
                >
                  <span
                    className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-4xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${CATEGORY_TINT[b.category] ?? "bg-cream-100"}`}
                  >
                    {b.icon}
                  </span>
                  <p className="mt-2.5 font-display font-bold leading-tight">{b.name}</p>
                  <p className="mt-1 text-xs font-semibold text-ink-400">
                    {stats?.bestScore != null
                      ? `Récord: ${formatScore(stats.bestScore, b.unit)}`
                      : "¡Probalo!"}
                  </p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </StaggerIn>
    </main>
  );
}
