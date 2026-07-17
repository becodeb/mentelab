"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  AnalyticsOverview,
  CompareResponse,
  DistributionResponse,
  EvolutionResponse,
  HeatmapResponse,
  StudentRow,
} from "@mentelab/shared";

export interface ClassroomSummary {
  id: string;
  label: string;
  gradeId: string;
  gradeLevel: number;
  typicalAge: number;
  schoolYear: string;
  classCode: string;
  studentCount: number;
}

export function useClassrooms(enabled = true) {
  return useQuery({
    queryKey: ["staff", "classrooms"],
    queryFn: () => api.get<{ classrooms: ClassroomSummary[] }>("/v1/roster/classrooms"),
    enabled,
  });
}

export function useStudents(classroomId: string | null, benchmark?: string) {
  return useQuery({
    queryKey: ["staff", "students", classroomId, benchmark],
    queryFn: () =>
      api.get<{ students: StudentRow[] }>(
        `/v1/roster/classrooms/${classroomId}/students${benchmark ? `?benchmark=${benchmark}` : ""}`,
      ),
    enabled: !!classroomId,
  });
}

export function buildFilterQuery(f: {
  classroomId?: string | null;
  benchmark?: string | null;
  period?: string;
  cleanOnly?: boolean;
}): string {
  const params = new URLSearchParams();
  if (f.classroomId) params.set("classroomId", f.classroomId);
  if (f.benchmark) params.set("benchmark", f.benchmark);
  if (f.period) params.set("period", f.period);
  if (f.cleanOnly) params.set("cleanOnly", "true");
  return params.toString();
}

export function useOverview(qs: string, enabled = true) {
  return useQuery({
    queryKey: ["staff", "overview", qs],
    queryFn: () => api.get<AnalyticsOverview>(`/v1/analytics/overview?${qs}`),
    enabled,
  });
}

export function useDistribution(qs: string, enabled = true) {
  return useQuery({
    queryKey: ["staff", "distribution", qs],
    queryFn: () => api.get<DistributionResponse>(`/v1/analytics/distribution?${qs}`),
    enabled,
  });
}

export function useEvolution(qs: string, enabled = true) {
  return useQuery({
    queryKey: ["staff", "evolution", qs],
    queryFn: () => api.get<EvolutionResponse>(`/v1/analytics/evolution?${qs}`),
    enabled,
  });
}

export function useHeatmap(qs: string, enabled = true) {
  return useQuery({
    queryKey: ["staff", "heatmap", qs],
    queryFn: () => api.get<HeatmapResponse>(`/v1/analytics/heatmap?${qs}`),
    enabled,
  });
}

export function useCompare(dimension: string, benchmark: string | null, period: string) {
  const params = new URLSearchParams({ dimension, period });
  if (benchmark) params.set("benchmark", benchmark);
  return useQuery({
    queryKey: ["staff", "compare", dimension, benchmark, period],
    queryFn: () => api.get<CompareResponse>(`/v1/analytics/compare?${params}`),
    enabled: !!benchmark || dimension === "benchmark",
  });
}
