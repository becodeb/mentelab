"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { flushOutbox } from "@/lib/outbox";
import { useGuestInit, useSession } from "@/features/auth/hooks";
import type { CognitiveProfile, MeSummary, PlayerBadge } from "@mentelab/shared";

/**
 * Garantiza que haya un jugador en sesión: si no hay nadie logueado,
 * materializa el invitado del dispositivo (Modo Libre sin fricción).
 */
export function useEnsurePlayer() {
  const session = useSession();
  const guestInit = useGuestInit();
  const triedRef = useRef(false);

  useEffect(() => {
    if (session.data && !session.data.principal && !triedRef.current) {
      triedRef.current = true;
      guestInit.mutate(undefined);
    }
  }, [session.data, guestInit]);

  const principal = session.data?.principal ?? null;
  return {
    principal,
    ready: !!principal,
    isLoading: session.isLoading || guestInit.isPending,
  };
}

export function useMeSummary(enabled = true) {
  const qc = useQueryClient();
  const flushedRef = useRef(false);
  // Al cargar el hub, reintenta envíos pendientes del outbox (doc 02 §5).
  useEffect(() => {
    if (!flushedRef.current && enabled) {
      flushedRef.current = true;
      void flushOutbox().then((sent) => {
        if (sent > 0) void qc.invalidateQueries();
      });
    }
  }, [enabled, qc]);

  return useQuery({
    queryKey: ["me", "summary"],
    queryFn: () => api.get<MeSummary>("/v1/me/summary"),
    enabled,
  });
}

export function useCognitiveProfile(enabled = true) {
  return useQuery({
    queryKey: ["me", "cognitive"],
    queryFn: () => api.get<CognitiveProfile>("/v1/me/cognitive-profile"),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useMyBadges(enabled = true) {
  return useQuery({
    queryKey: ["me", "badges"],
    queryFn: () => api.get<{ badges: PlayerBadge[] }>("/v1/me/badges"),
    enabled,
  });
}
