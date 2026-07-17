"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { serializeCatalog } from "@mentelab/benchmarks";
import { apiBase } from "@/lib/api";
import { formatMs } from "@/lib/utils";
import {
  buildFilterQuery,
  useClassrooms,
  useDistribution,
  useEvolution,
  useHeatmap,
  useOverview,
} from "@/features/staff/hooks";
import { Button, Card, Spinner, EmptyState } from "@/components/ui";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Dashboard docente: filtros → tarjetas + distribución + evolución + heatmap. */
export default function TeacherDashboard() {
  const catalog = serializeCatalog();
  const classrooms = useClassrooms();
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [benchmark, setBenchmark] = useState("reaction-time");
  const [period, setPeriod] = useState("30d");
  const [cleanOnly, setCleanOnly] = useState(false);

  const effectiveClassroom = classroomId ?? classrooms.data?.classrooms[0]?.id ?? null;
  const qs = useMemo(
    () => buildFilterQuery({ classroomId: effectiveClassroom, benchmark, period, cleanOnly }),
    [effectiveClassroom, benchmark, period, cleanOnly],
  );

  const overview = useOverview(qs, !!effectiveClassroom);
  const distribution = useDistribution(qs, !!effectiveClassroom);
  const evolution = useEvolution(qs, !!effectiveClassroom);
  const heatmap = useHeatmap(qs, !!effectiveClassroom);

  if (classrooms.isLoading) return <Spinner label="Cargando cursos…" />;

  const def = catalog.find((b) => b.slug === benchmark);
  const o = overview.data;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card className="flex flex-wrap items-center gap-3">
        <select
          value={effectiveClassroom ?? ""}
          onChange={(e) => setClassroomId(e.target.value)}
          className="rounded-xl border-2 border-slate-200 px-3 py-2 font-bold text-slate-600"
        >
          {classrooms.data?.classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label} ({c.schoolYear})
            </option>
          ))}
        </select>
        <select
          value={benchmark}
          onChange={(e) => setBenchmark(e.target.value)}
          className="rounded-xl border-2 border-slate-200 px-3 py-2 font-bold text-slate-600"
        >
          {catalog.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.icon} {b.name}
            </option>
          ))}
        </select>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-xl border-2 border-slate-200 px-3 py-2 font-bold text-slate-600"
        >
          <option value="7d">Últimos 7 días</option>
          <option value="30d">Últimos 30 días</option>
          <option value="90d">Últimos 90 días</option>
          <option value="year">Este año</option>
          <option value="all">Histórico</option>
        </select>
        <label className="flex items-center gap-2 text-sm font-bold text-slate-500">
          <input
            type="checkbox"
            checked={cleanOnly}
            onChange={(e) => setCleanOnly(e.target.checked)}
            className="h-4 w-4"
          />
          Solo intentos sin distracciones
        </label>
        <div className="ml-auto flex gap-2">
          <a href={`${apiBase}/v1/exports/attempts.csv?${qs}`}>
            <Button variant="secondary" size="sm">
              ⬇ CSV
            </Button>
          </a>
          <a href={`${apiBase}/v1/exports/attempts.xlsx?${qs}`}>
            <Button variant="secondary" size="sm">
              ⬇ Excel
            </Button>
          </a>
        </div>
      </Card>

      {/* Tarjetas resumen */}
      {o && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <StatCard label="Alumnos" value={String(o.studentCount)} />
          <StatCard label="Activos (7 días)" value={String(o.activeLast7d)} />
          <StatCard label="Partidas" value={String(o.attemptsInPeriod)} />
          <StatCard label="Tiempo jugado" value={formatMs(o.totalPlayMs)} />
          <StatCard
            label="Mejora media"
            value={o.avgImprovementPct != null ? `${o.avgImprovementPct > 0 ? "+" : ""}${o.avgImprovementPct}%` : "—"}
            accent={o.avgImprovementPct != null && o.avgImprovementPct > 0 ? "text-emerald-600" : ""}
          />
          <StatCard
            label="Sin jugar 14+ días"
            value={String(o.studentsAtRisk)}
            accent={o.studentsAtRisk > 0 ? "text-amber-600" : "text-emerald-600"}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Distribución */}
        <Card>
          <h2 className="font-black text-slate-700">Distribución ({def?.unit})</h2>
          {distribution.data && distribution.data.bins.length > 0 ? (
            <>
              <div className="mt-2 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={distribution.data.bins.map((b) => ({
                      range: `${Math.round(b.from)}`,
                      count: b.count,
                    }))}
                    margin={{ top: 8, right: 8, bottom: 0, left: -24 }}
                  >
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} allowDecimals={false} />
                    <Tooltip formatter={(v: number) => [v, "Partidas"]} />
                    <Bar dataKey="count" fill="#d96c47" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {distribution.data.boxplot && (
                <p className="mt-2 text-xs font-bold text-slate-400">
                  mín {distribution.data.boxplot.min} · p25 {distribution.data.boxplot.p25} ·
                  mediana {distribution.data.boxplot.median} · p75 {distribution.data.boxplot.p75} ·
                  máx {distribution.data.boxplot.max} · n={distribution.data.sampleSize}
                </p>
              )}
            </>
          ) : (
            <EmptyState emoji="📭" title="Sin datos en este período" />
          )}
        </Card>

        {/* Evolución */}
        <Card>
          <h2 className="font-black text-slate-700">Evolución semanal (media y p25–p75)</h2>
          {evolution.data && evolution.data.series.length > 0 ? (
            <div className="mt-2 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={evolution.data.series}
                  margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
                >
                  <XAxis dataKey="weekStart" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    reversed={def?.scoreDirection === "lower_better"}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip />
                  <Area dataKey="p75" stroke="none" fill="#f7ddc9" fillOpacity={0.6} />
                  <Area dataKey="p25" stroke="none" fill="#fffdf6" fillOpacity={1} />
                  <Area
                    dataKey="mean"
                    stroke="#c65230"
                    strokeWidth={3}
                    fill="none"
                    type="monotone"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState emoji="📭" title="Sin datos en este período" />
          )}
        </Card>
      </div>

      {/* Heatmap de actividad */}
      <Card>
        <h2 className="font-black text-slate-700">Actividad por día y hora</h2>
        {heatmap.data && heatmap.data.cells.length > 0 ? (
          <HeatmapGrid cells={heatmap.data.cells} />
        ) : (
          <EmptyState emoji="📭" title="Sin actividad registrada" />
        )}
      </Card>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-black text-slate-700 ${accent ?? ""}`}>{value}</p>
    </Card>
  );
}

function HeatmapGrid({ cells }: { cells: { dow: number; hour: number; count: number }[] }) {
  const map = new Map(cells.map((c) => [`${c.dow}:${c.hour}`, c.count]));
  const max = Math.max(1, ...cells.map((c) => c.count));
  const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 7:00–21:00
  return (
    <div className="mt-3 overflow-x-auto">
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `48px repeat(${hours.length}, 1fr)` }}>
        <div />
        {hours.map((h) => (
          <p key={h} className="text-center text-[10px] font-bold text-slate-400">
            {h}h
          </p>
        ))}
        {DAYS.map((day, dow) => (
          <div key={day} className="contents">
            <p className="pr-2 text-right text-xs font-bold text-slate-400">{day}</p>
            {hours.map((h) => {
              const count = map.get(`${dow}:${h}`) ?? 0;
              const intensity = count / max;
              return (
                <div
                  key={h}
                  title={`${day} ${h}:00 — ${count} partidas`}
                  className="aspect-square min-w-5 rounded"
                  style={{
                    backgroundColor:
                      count === 0 ? "#f3ecdc" : `rgba(217, 108, 71, ${0.25 + intensity * 0.75})`,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
