"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { serializeCatalog } from "@mentelab/benchmarks";
import { avatarEmoji } from "@mentelab/shared";
import { useEnsurePlayer, useMeSummary } from "@/features/player/hooks";
import { useLogout } from "@/features/auth/hooks";
import { formatScore } from "@/lib/utils";
import { Card, ProgressBar, Spinner } from "@/components/ui";
import { useRouter } from "next/navigation";

const CATEGORY_COLORS: Record<string, string> = {
  SPEED: "from-amber-100 to-amber-50 border-amber-200",
  MEMORY: "from-blue-100 to-blue-50 border-blue-200",
  ATTENTION: "from-emerald-100 to-emerald-50 border-emerald-200",
  PRECISION: "from-pink-100 to-pink-50 border-pink-200",
  TYPING: "from-cyan-100 to-cyan-50 border-cyan-200",
};

/** Hub de juegos: misiones del día, racha, XP y las cards de los 8 benchmarks. */
export default function PlayHubPage() {
  const router = useRouter();
  const { principal, ready, isLoading } = useEnsurePlayer();
  const summary = useMeSummary(ready);
  const logout = useLogout();
  const catalog = serializeCatalog();

  if (isLoading || !ready) return <Spinner label="Preparando tu espacio…" />;
  const s = summary.data;

  return (
    <main className="kid-zone min-h-dvh bg-slate-50 pb-16">
      <div className="mx-auto max-w-3xl px-4 pt-6">
        {/* Header con progreso */}
        <Card className="bg-gradient-to-r from-brand-600 to-brand-500 text-white border-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-5xl">{s ? avatarEmoji(s.avatarId) : "🙂"}</span>
              <div>
                <p className="text-xl font-black">
                  ¡Hola{" "}
                  {principal && principal.kind !== "staff" ? principal.displayName : ""}!
                </p>
                {s && (
                  <p className="text-sm font-bold text-white/80">
                    Nivel {s.level} · {s.totalAttempts} partidas
                    {s.isGuest && " · Modo Libre"}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              {s && s.currentStreak > 0 && (
                <p className="text-2xl font-black">🔥 {s.currentStreak}</p>
              )}
              <div className="flex gap-3 text-sm font-bold text-white/70">
                <Link href="/me" className="underline">
                  Mi progreso
                </Link>
                <Link href="/rankings" className="underline">
                  Rankings
                </Link>
                <button
                  className="underline"
                  onClick={() => logout.mutate(undefined, { onSuccess: () => router.push("/") })}
                >
                  Salir
                </button>
              </div>
            </div>
          </div>
          {s && (
            <div className="mt-3">
              <ProgressBar
                value={s.xpIntoLevel}
                max={s.xpForNextLevel}
                className="bg-white/20"
                barClassName="bg-amber-300"
              />
              <p className="mt-1 text-xs font-bold text-white/70">
                {s.xpIntoLevel}/{s.xpForNextLevel} XP para el nivel {s.level + 1}
              </p>
            </div>
          )}
        </Card>

        {/* Misiones del día */}
        {s && s.missions.length > 0 && (
          <Card className="mt-4">
            <h2 className="font-black text-slate-700">📋 Misiones de hoy</h2>
            <div className="mt-2 space-y-2">
              {s.missions.map((m) => (
                <div key={m.code} className="flex items-center gap-3">
                  <span className="text-2xl">{m.completed ? "✅" : m.emoji}</span>
                  <div className="flex-1">
                    <p
                      className={`text-sm font-bold ${m.completed ? "text-slate-400 line-through" : "text-slate-600"}`}
                    >
                      {m.title}
                    </p>
                    <ProgressBar
                      value={m.progress}
                      max={m.target}
                      className="mt-1 h-2"
                      barClassName={m.completed ? "bg-emerald-400" : "bg-brand-400"}
                    />
                  </div>
                  <span className="text-xs font-black text-brand-500">+{m.xpReward} XP</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Juegos */}
        <h2 className="mt-6 px-1 text-xl font-black text-slate-700">Elegí tu juego</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {catalog.map((b, i) => {
            const stats = s?.perBenchmark.find((p) => p.benchmarkSlug === b.slug);
            return (
              <motion.div
                key={b.slug}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={`/play/${b.slug}`}
                  className={`block rounded-3xl border bg-gradient-to-b p-4 text-center shadow-sm transition-all hover:scale-[1.03] hover:shadow-md active:scale-95 ${CATEGORY_COLORS[b.category] ?? ""}`}
                >
                  <p className="text-5xl">{b.icon}</p>
                  <p className="mt-2 font-black text-slate-700">{b.name}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    {stats?.bestScore != null
                      ? `Récord: ${formatScore(stats.bestScore, b.unit)}`
                      : "¡Probalo!"}
                  </p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
