"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { serializeCatalog } from "@mentelab/benchmarks";
import type { LeaderboardResponse, Principal } from "@mentelab/shared";
import { api } from "@/lib/api";
import { formatScore } from "@/lib/utils";
import { useEnsurePlayer } from "@/features/player/hooks";
import { Card, Spinner, EmptyState } from "@/components/ui";
import { Monogram } from "@/components/icons";

const PERIODS = [
  { key: "today", label: "Hoy" },
  { key: "7d", label: "Semana" },
  { key: "30d", label: "30 días" },
  { key: "all", label: "Histórico" },
] as const;

const METRICS = [
  { key: "best", label: "Mejor marca" },
  { key: "count", label: "Más partidas" },
  { key: "progress", label: "Más mejoró" },
  { key: "consistency", label: "Más constante" },
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
          <h1 className="text-3xl font-semibold text-slate-800">
            {isStudent ? "Ranking de tu curso" : "Ranking mundial"}
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
                {m.label}
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
              emoji="✦"
              title="Todavía no hay resultados acá"
              hint="¡Sé el primero en jugar!"
            />
          )}
          {board.data && board.data.entries.length > 0 && (
            <Leaderboard data={board.data} principal={principal} />
          )}
        </Card>
        {metric === "progress" && (
          <p className="text-center font-display text-sm font-semibold italic text-slate-400">
            Acá gana el que más mejoró — no hace falta ser el más rápido.
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
  const medalClass = (rank: number) =>
    rank === 1
      ? "bg-amber-400 text-ink-900"
      : rank === 2
        ? "bg-cream-300 text-ink-700"
        : rank === 3
          ? "bg-brand-300 text-ink-900"
          : "bg-cream-100 text-slate-500";
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
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${medalClass(e.rank)}`}
                >
                  {e.rank}º
                </span>
                <Monogram name={e.displayName} seed={e.playerId} className="h-9 w-9 text-base" />
                <span className="flex-1 truncate font-bold text-slate-700">
                  {e.displayName}
                  {e.isMe && " (vos)"}
                </span>
                <span className="font-display font-bold text-slate-600">
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
