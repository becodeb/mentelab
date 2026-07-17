import { prisma } from "@mentelab/db";
import { benchmarkRegistry, mean } from "@mentelab/benchmarks";
import { CognitiveIndicator, type CognitiveProfile } from "@mentelab/shared";

export const COGNITIVE_DISCLAIMER =
  "Indicadores lúdico-educativos calculados a partir del juego. No constituyen evaluación psicométrica ni diagnóstico.";

/** Fin de la semana actual (domingo), como fecha UTC para @db.Date. */
function currentWeekEnd(now: Date): Date {
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + ((7 - dow) % 7));
  return d;
}

/**
 * Perfil cognitivo (doc 05 §4): cada indicador se alimenta de varios
 * benchmarks vía la matriz `contributions`, sobre scoreNormalized (0-100
 * ajustado por edad) de los últimos 30 días con decaimiento exponencial.
 * Los indicadores de proceso (consistencia/mejora/constancia) no dependen
 * del nivel absoluto: cualquier jugador puede tener 90+.
 */
export async function computeCognitiveProfile(
  playerId: string,
  now = new Date(),
): Promise<CognitiveProfile> {
  const since = new Date(now.getTime() - 30 * 86_400_000);
  const attempts = await prisma.attempt.findMany({
    where: {
      playerId,
      status: "COMPLETED",
      startedAt: { gte: since },
      scoreNormalized: { not: null },
    },
    select: { benchmarkSlug: true, scoreNormalized: true, startedAt: true },
    orderBy: { startedAt: "asc" },
    take: 1000,
  });
  const stats = await prisma.playerBenchmarkStats.findMany({ where: { playerId } });
  const progress = await prisma.playerProgress.findUnique({ where: { playerId } });

  // Promedio con decaimiento exponencial (半vida ~10 días) por benchmark.
  const byBenchmark = new Map<string, { num: number; den: number; n: number }>();
  for (const a of attempts) {
    const ageDays = (now.getTime() - a.startedAt.getTime()) / 86_400_000;
    const w = Math.exp(-ageDays / 14);
    const cur = byBenchmark.get(a.benchmarkSlug) ?? { num: 0, den: 0, n: 0 };
    cur.num += a.scoreNormalized! * w;
    cur.den += w;
    cur.n += 1;
    byBenchmark.set(a.benchmarkSlug, cur);
  }

  const values = new Map<CognitiveIndicator, { value: number; sampleSize: number }>();

  // Indicadores alimentados por benchmarks (matriz de contribuciones).
  for (const indicator of CognitiveIndicator.options) {
    if (["consistency", "improvement", "training_constancy"].includes(indicator)) continue;
    let num = 0;
    let den = 0;
    let n = 0;
    for (const def of benchmarkRegistry.values()) {
      const w = def.contributions[indicator];
      if (!w) continue;
      const agg = byBenchmark.get(def.slug);
      if (!agg || agg.den === 0) continue;
      num += (agg.num / agg.den) * w;
      den += w;
      n += agg.n;
    }
    if (den > 0) values.set(indicator, { value: Math.round((num / den) * 10) / 10, sampleSize: n });
  }

  // 📈 Consistencia: promedio de consistency30d entre benchmarks jugados.
  const consistencies = stats.map((s) => s.consistency30d).filter((c): c is number => c != null);
  if (consistencies.length) {
    values.set("consistency", {
      value: Math.round(mean(consistencies) * 1000) / 10,
      sampleSize: consistencies.length,
    });
  }

  // 🚀 Capacidad de mejora: improvement30dPct medio → 50 = sin cambio.
  const improvements = stats.map((s) => s.improvement30dPct).filter((i): i is number => i != null);
  if (improvements.length) {
    const raw = 50 + mean(improvements) * 2.5;
    values.set("improvement", {
      value: Math.round(Math.max(0, Math.min(100, raw)) * 10) / 10,
      sampleSize: improvements.length,
    });
  }

  // 🔥 Constancia: días activos en 30 (20 días = 100) + racha.
  if (attempts.length || progress) {
    const activeDays = new Set(attempts.map((a) => a.startedAt.toISOString().slice(0, 10))).size;
    const streakBonus = Math.min(10, (progress?.currentStreak ?? 0));
    const raw = Math.min(100, (activeDays / 20) * 90 + streakBonus);
    values.set("training_constancy", {
      value: Math.round(raw * 10) / 10,
      sampleSize: activeDays,
    });
  }

  // Persistencia semanal (serie temporal) + lectura del histórico.
  const weekEnd = currentWeekEnd(now);
  for (const [indicator, v] of values) {
    await prisma.cognitiveScore.upsert({
      where: { playerId_indicator_windowEnd: { playerId, indicator, windowEnd: weekEnd } },
      create: { playerId, indicator, value: v.value, sampleSize: v.sampleSize, windowEnd: weekEnd },
      update: { value: v.value, sampleSize: v.sampleSize },
    });
  }
  const history = await prisma.cognitiveScore.findMany({
    where: { playerId },
    orderBy: { windowEnd: "asc" },
    take: 200,
  });
  const historyByIndicator = new Map<string, { weekEnd: string; value: number }[]>();
  for (const h of history) {
    const arr = historyByIndicator.get(h.indicator) ?? [];
    arr.push({ weekEnd: h.windowEnd.toISOString().slice(0, 10), value: h.value });
    historyByIndicator.set(h.indicator, arr);
  }

  return {
    indicators: CognitiveIndicator.options.map((indicator) => {
      const cur = values.get(indicator);
      const hist = historyByIndicator.get(indicator) ?? [];
      const prev = hist.length >= 2 ? hist[hist.length - 2] : null;
      let trend: "up" | "down" | "flat" | null = null;
      if (cur && prev) {
        const d = cur.value - prev.value;
        trend = d > 2 ? "up" : d < -2 ? "down" : "flat";
      }
      return {
        indicator,
        value: cur?.value ?? null,
        trend,
        sampleSize: cur?.sampleSize ?? 0,
        history: hist,
      };
    }),
    disclaimer: COGNITIVE_DISCLAIMER,
  };
}
