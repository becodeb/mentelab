"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { serializeCatalog } from "@mentelab/benchmarks";
import { avatarEmoji, type LeaderboardResponse, type Principal } from "@mentelab/shared";
import { api } from "@/lib/api";
import { formatScore } from "@/lib/utils";
import { useEnsurePlayer } from "@/features/player/hooks";
import { Card, Spinner, EmptyState } from "@/components/ui";

const PERIODS = [
  { key: "today", label: "Hoy" },
  { key: "7d", label: "Semana" },
  { key: "30d", label: "30 días" },
  { key: "all", label: "Histórico" },
] as const;

const METRICS = [
  { key: "best", label: "Mejor marca", emoji: "🏆" },
  { key: "count", label: "Más partidas", emoji: "💪" },
  { key: "progress", label: "Más mejoró", emoji: "🚀" },
  { key: "consistency", label: "Más constante", emoji: "📈" },
] as const;

/**
 * Rankings para jugadores: vista "top 3 + tu vecindario" (anti-frustración,
 * doc 05 §5.1) con métricas donde cualquiera puede ganar.
 */
export default function RankingsPage() {
  const { principal, ready, isLoading } = useEnsurePlayer();
  const catalog = serializeCatalog();
  const [benchmark, setBenchmark] = useState("reaction-time");
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["key"]>("30d");
  const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("best");

  const isStudent = principal?.kind === "student";
  const scope = isStudent ? "classroom" : "global";

  const board = useQuery({
    queryKey: ["leaderboard", scope, benchmark, period, metric],
    queryFn: () =>
      api.get<LeaderboardResponse>(
        `/v1/leaderboards?scope=${scope}&benchmark=${benchmark}&period=${period}&metric=${metric}&around=me&limit=10`,
      ),
    enabled: ready,
  });

  if (isLoading || !ready) return <Spinner label="Cargando rankings…" />;

  return (
    <main className="kid-zone min-h-dvh bg-slate-50 pb-16">
      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-800">
            {isStudent ? "🏆 Ranking de tu curso" : "🌍 Ranking mundial (Modo Libre)"}
          </h1>
          <Link href="/play" className="font-black text-brand-600">
            Jugar →
          </Link>
        </div>

        {/* Selectores */}
        <Card>
          <select
            value={benchmark}
            onChange={(e) => setBenchmark(e.target.value)}
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 font-bold text-slate-600"
          >
            {catalog.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.icon} {b.name}
              </option>
            ))}
          </select>
          <div className="mt-3 flex flex-wrap gap-2">
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={`rounded-full px-3 py-1.5 text-sm font-black transition-colors ${
                  metric === m.key ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`rounded-full px-3 py-1 text-sm font-bold transition-colors ${
                  period === p.key ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Tabla */}
        <Card>
          {board.isLoading && <Spinner />}
          {board.data && board.data.entries.length === 0 && (
            <EmptyState
              emoji="🎮"
              title="Todavía no hay resultados acá"
              hint="¡Sé el primero en jugar!"
            />
          )}
          {board.data && board.data.entries.length > 0 && (
            <Leaderboard data={board.data} principal={principal} />
          )}
        </Card>
        {metric === "progress" && (
          <p className="text-center text-sm font-bold text-slate-400">
            🚀 Acá gana el que MÁS MEJORÓ — no hace falta ser el más rápido.
          </p>
        )}
      </div>
    </main>
  );
}

function Leaderboard({
  data,
  principal,
}: {
  data: LeaderboardResponse;
  principal: Principal | null;
}) {
  void principal;
  const medal = (rank: number) => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}º`);
  return (
    <div>
      <div className="space-y-1">
        {data.entries.map((e, i) => {
          const gap = i > 0 && e.rank - data.entries[i - 1]!.rank > 1;
          return (
            <div key={e.playerId}>
              {gap && <p className="py-1 text-center text-slate-300 font-black">···</p>}
              <div
                className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${
                  e.isMe ? "bg-brand-50 ring-2 ring-brand-300" : "bg-slate-50"
                }`}
              >
                <span className="w-9 text-lg font-black text-slate-500">{medal(e.rank)}</span>
                <span className="text-2xl">{avatarEmoji(e.avatarId)}</span>
                <span className="flex-1 truncate font-bold text-slate-700">
                  {e.displayName}
                  {e.isMe && " (vos)"}
                </span>
                <span className="font-black text-slate-600">
                  {formatScore(e.value, data.unit)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {data.myEntry && (
        <p className="mt-3 text-center text-sm font-bold text-slate-500">
          Vas {data.myEntry.rank}º de {data.totalPlayers}. ¡Seguí entrenando! 💪
        </p>
      )}
    </div>
  );
}
