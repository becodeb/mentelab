"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceDot,
} from "recharts";
import { serializeCatalog, getBenchmark } from "@mentelab/benchmarks";
import {
  COGNITIVE_INDICATOR_LABELS,
  avatarEmoji,
  type BenchmarkStats,
} from "@mentelab/shared";
import { api } from "@/lib/api";
import { formatDate, formatMs, formatScore } from "@/lib/utils";
import { useCognitiveProfile, useEnsurePlayer, useMeSummary, useMyBadges } from "@/features/player/hooks";
import { Card, Chip, ProgressBar, Spinner, EmptyState } from "@/components/ui";

/** Perfil del alumno: progreso, perfil cognitivo, evolución e insignias. */
export default function MePage() {
  const { ready, isLoading } = useEnsurePlayer();
  const summary = useMeSummary(ready);
  const cognitive = useCognitiveProfile(ready);
  const badges = useMyBadges(ready);
  const catalog = serializeCatalog();
  const [selectedSlug, setSelectedSlug] = useState("reaction-time");

  const stats = useQuery({
    queryKey: ["stats", selectedSlug],
    queryFn: () => api.get<BenchmarkStats>(`/v1/me/stats/${selectedSlug}`),
    enabled: ready,
  });

  if (isLoading || !ready || !summary.data) return <Spinner label="Cargando tu perfil…" />;
  const s = summary.data;
  const earnedBadges = badges.data?.badges.filter((b) => b.earnedAt) ?? [];

  return (
    <main className="kid-zone min-h-dvh bg-slate-50 pb-16">
      <div className="mx-auto max-w-3xl space-y-4 px-4 pt-6">
        <Card>
          <div className="flex items-center gap-4">
            <span className="text-6xl">{avatarEmoji(s.avatarId)}</span>
            <div className="flex-1">
              <p className="text-2xl font-black text-slate-800">{s.displayName}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                <Chip>⭐ Nivel {s.level}</Chip>
                <Chip className="bg-orange-50 text-orange-600">🔥 {s.currentStreak} días</Chip>
                <Chip className="bg-emerald-50 text-emerald-600">
                  🎮 {s.totalAttempts} partidas
                </Chip>
                <Chip className="bg-cyan-50 text-cyan-600">⏱️ {formatMs(s.totalPlayMs)}</Chip>
              </div>
            </div>
            <Link href="/play" className="font-black text-brand-600">
              Jugar →
            </Link>
          </div>
          <ProgressBar value={s.xpIntoLevel} max={s.xpForNextLevel} className="mt-3" />
        </Card>

        {/* Perfil cognitivo */}
        <Card>
          <h2 className="font-black text-slate-700">🧠 Mi perfil cognitivo</h2>
          {cognitive.data ? (
            <>
              <div className="mt-3 space-y-2.5">
                {cognitive.data.indicators.map((ind) => {
                  const meta = COGNITIVE_INDICATOR_LABELS[ind.indicator];
                  return (
                    <div key={ind.indicator} className="flex items-center gap-3">
                      <span className="w-7 text-xl">{meta.emoji}</span>
                      <span className="w-44 text-sm font-bold text-slate-600">{meta.label}</span>
                      <ProgressBar
                        value={ind.value ?? 0}
                        max={100}
                        className="flex-1"
                        barClassName={
                          ind.value == null
                            ? "bg-slate-200"
                            : ind.value >= 66
                              ? "bg-emerald-400"
                              : ind.value >= 40
                                ? "bg-brand-400"
                                : "bg-amber-400"
                        }
                      />
                      <span className="w-14 text-right text-sm font-black text-slate-500">
                        {ind.value != null ? Math.round(ind.value) : "—"}
                        {ind.trend === "up" && " ↑"}
                        {ind.trend === "down" && " ↓"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs font-semibold text-slate-400">
                {cognitive.data.disclaimer}
              </p>
            </>
          ) : (
            <Spinner />
          )}
        </Card>

        {/* Evolución por benchmark */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-black text-slate-700">📈 Mi evolución</h2>
            <select
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
              className="rounded-xl border-2 border-slate-200 px-3 py-1.5 font-bold text-slate-600"
            >
              {catalog.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.icon} {b.name}
                </option>
              ))}
            </select>
          </div>
          {stats.data && stats.data.history.length > 0 ? (
            <StatsDetail stats={stats.data} slug={selectedSlug} />
          ) : (
            <EmptyState
              emoji="🎮"
              title="Todavía no jugaste este juego"
              hint="¡Jugalo y acá vas a ver tu progreso!"
            />
          )}
        </Card>

        {/* Insignias */}
        <Card>
          <h2 className="font-black text-slate-700">
            🏅 Mis insignias ({earnedBadges.length}/{badges.data?.badges.length ?? 0})
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(badges.data?.badges ?? [])
              .sort((a, b) => (a.earnedAt ? 0 : 1) - (b.earnedAt ? 0 : 1))
              .map((b) => (
                <div
                  key={b.code}
                  className={`rounded-2xl border p-3 ${
                    b.earnedAt
                      ? "border-amber-200 bg-amber-50"
                      : "border-slate-100 bg-slate-50 opacity-50"
                  }`}
                  title={b.description}
                >
                  <p className="text-2xl">{b.earnedAt ? b.emoji : "🔒"}</p>
                  <p className="text-sm font-black text-slate-700">{b.name}</p>
                  <p className="text-xs font-semibold text-slate-400">{b.description}</p>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </main>
  );
}

function StatsDetail({ stats, slug }: { stats: BenchmarkStats; slug: string }) {
  const def = getBenchmark(slug);
  const data = stats.history.map((h) => ({
    ...h,
    label: formatDate(h.at),
  }));
  const record = data.find((d) => d.score === stats.bestScore);
  const improved = stats.improvement30dPct != null && stats.improvement30dPct > 0;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <Chip className="bg-amber-50 text-amber-600">
          🏆 Récord: {formatScore(stats.bestScore, def.unit)}
        </Chip>
        <Chip>Promedio 30d: {formatScore(stats.avg30d, def.unit)}</Chip>
        {stats.currentRank != null && (
          <Chip className="bg-violet-50 text-violet-600">
            {stats.currentRank}º de {stats.totalInRank} en tu curso
          </Chip>
        )}
      </div>
      {improved && (
        <p className="mt-2 font-black text-emerald-500">
          ¡Mejoraste {stats.improvement30dPct}% este mes! 🎉
        </p>
      )}
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              reversed={def.scoreDirection === "lower_better"}
              domain={["auto", "auto"]}
            />
            <Tooltip
              formatter={(v: number) => [formatScore(v, def.unit), "Resultado"]}
              labelFormatter={(l) => `Partida del ${l}`}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#d96c47"
              strokeWidth={3}
              dot={{ r: 3, fill: "#d96c47" }}
            />
            {record && (
              <ReferenceDot
                x={record.label}
                y={record.score}
                r={8}
                fill="#e8a33d"
                stroke="#fffdf6"
                strokeWidth={2}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-xs font-bold text-slate-400">
        ⭐ = tu récord · {stats.totalAttempts} partidas jugadas
      </p>
    </div>
  );
}
