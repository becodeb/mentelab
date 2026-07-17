"use client";

import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { serializeCatalog } from "@mentelab/benchmarks";
import { useCompare } from "@/features/staff/hooks";
import { Card, Spinner, EmptyState } from "@/components/ui";

const DIMENSIONS = [
  { key: "classroom", label: "Cursos" },
  { key: "grade", label: "Grados" },
  { key: "age", label: "Edades" },
  { key: "gender", label: "Género" },
  { key: "benchmark", label: "Benchmarks" },
] as const;

/** Comparaciones (doc CU-D6): cursos, grados, edades, género y benchmarks. */
export default function ComparePage() {
  const catalog = serializeCatalog();
  const [dimension, setDimension] = useState<string>("classroom");
  const [benchmark, setBenchmark] = useState("reaction-time");
  const [period, setPeriod] = useState("30d");
  const compare = useCompare(dimension, dimension === "benchmark" ? null : benchmark, period);

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {DIMENSIONS.map((d) => (
            <button
              key={d.key}
              onClick={() => setDimension(d.key)}
              className={`rounded-full px-3 py-1.5 text-sm font-black transition-colors ${
                dimension === d.key ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        {dimension !== "benchmark" && (
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
        )}
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
      </Card>

      <Card>
        {compare.isLoading && <Spinner label="Comparando…" />}
        {compare.data && compare.data.groups.filter((g) => g.attempts > 0).length === 0 && (
          <EmptyState emoji="📭" title="Sin datos para comparar en este período" />
        )}
        {compare.data && compare.data.groups.some((g) => g.attempts > 0) && (
          <>
            <h2 className="font-black text-slate-700">
              Promedio por grupo ({compare.data.unit})
              {dimension === "benchmark" && " — escala normalizada por edad"}
            </h2>
            <div className="mt-3 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={compare.data.groups.filter((g) => g.mean != null)}
                  margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
                >
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} domain={["auto", "auto"]} />
                  <Tooltip />
                  <Bar dataKey="mean" fill="#6366f1" radius={[6, 6, 0, 0]} name="Promedio" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-black uppercase text-slate-400">
                    <th className="py-2">Grupo</th>
                    <th className="px-3">Promedio</th>
                    <th className="px-3">Mediana</th>
                    <th className="px-3">Partidas</th>
                    <th className="px-3">Alumnos</th>
                  </tr>
                </thead>
                <tbody>
                  {compare.data.groups.map((g) => (
                    <tr key={g.id} className="border-b border-slate-50 font-semibold text-slate-600">
                      <td className="py-2 font-bold">{g.label}</td>
                      <td className="px-3">{g.mean ?? "—"}</td>
                      <td className="px-3">{g.median ?? "—"}</td>
                      <td className="px-3">{g.attempts}</td>
                      <td className="px-3">{g.students}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
