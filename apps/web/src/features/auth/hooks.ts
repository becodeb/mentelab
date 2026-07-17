"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getOrCreateDeviceUuid } from "@/lib/device";
import type { ClassLookupResponse, Principal } from "@mentelab/shared";

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      try {
        return await api.get<{ principal: Principal }>("/v1/auth/me");
      } catch {
        return { principal: null };
      }
    },
    staleTime: 5 * 60_000,
  });
}

export function useClassLookup(classCode: string | null) {
  return useQuery({
    queryKey: ["class", classCode],
    queryFn: () => api.get<ClassLookupResponse>(`/v1/auth/class/${classCode}`),
    enabled: !!classCode,
    retry: false,
  });
}

export function useStudentLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { playerId: string; secret: string }) =>
      api.post<{ principal: Principal }>("/v1/auth/student/login", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["session"] }),
  });
}

export function useStaffLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      api.post<{ principal: Principal }>("/v1/auth/staff/login", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["session"] }),
  });
}

/** Modo Libre: materializa el jugador invitado del dispositivo. */
export function useGuestInit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alias?: string) =>
      api.post<{ principal: Principal }>("/v1/auth/guest/init", {
        deviceUuid: getOrCreateDeviceUuid(),
        ...(alias ? { alias } : {}),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["session"] }),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/v1/auth/logout"),
    onSuccess: () => qc.clear(),
  });
}
