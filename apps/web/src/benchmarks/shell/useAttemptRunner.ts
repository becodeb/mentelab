"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { collectDeviceInfo } from "@/lib/device";
import { queueComplete } from "@/lib/outbox";
import type {
  AttemptEvent,
  CompleteAttemptInput,
  CompleteAttemptResponse,
  StartAttemptResponse,
} from "@mentelab/shared";

export type RunnerPhase = "intro" | "countdown" | "playing" | "submitting" | "results" | "error";

/**
 * Orquesta el ciclo completo de un intento (doc 02 §5):
 * start → juego local (buffer de eventos + foco + FPS) → complete en batch.
 * Si la red falla al enviar, el paquete va al outbox de IndexedDB.
 */
export function useAttemptRunner(benchmarkSlug: string) {
  const [phase, setPhase] = useState<RunnerPhase>("intro");
  const [config, setConfig] = useState<unknown>(null);
  const [result, setResult] = useState<CompleteAttemptResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const attemptIdRef = useRef<string | null>(null);
  const eventsRef = useRef<AttemptEvent[]>([]);
  const seqRef = useRef(0);
  const t0Ref = useRef(0);
  const focusLostRef = useRef(0);
  const pauseRef = useRef(0);
  const inputTypeRef = useRef<"touch" | "mouse" | "keyboard" | "mixed" | "unknown">("unknown");
  const fpsFramesRef = useRef(0);
  const fpsStartRef = useRef(0);
  const rafRef = useRef(0);

  const now = useCallback(() => performance.now() - t0Ref.current, []);

  const emit = useCallback(
    (type: string, payload?: Record<string, unknown>) => {
      eventsRef.current.push({ seq: seqRef.current++, tMs: Math.max(0, now()), type, payload });
    },
    [now],
  );

  /** Marca el tipo de input dominante (dato de calidad). */
  useEffect(() => {
    const onTouch = () => {
      inputTypeRef.current = inputTypeRef.current === "mouse" ? "mixed" : "touch";
    };
    const onMouse = () => {
      inputTypeRef.current = inputTypeRef.current === "touch" ? "mixed" : "mouse";
    };
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("mousedown", onMouse);
    return () => {
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("mousedown", onMouse);
    };
  }, []);

  /** Guardián de foco: registra pérdidas durante el juego (doc 03). */
  useEffect(() => {
    if (phase !== "playing") return;
    const onVisibility = () => {
      if (document.hidden) {
        focusLostRef.current++;
        emit("focus_lost");
      } else {
        emit("focus_gained");
      }
    };
    const onBlur = () => {
      focusLostRef.current++;
      emit("focus_lost");
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, [phase, emit]);

  /** Medidor de FPS con requestAnimationFrame. */
  useEffect(() => {
    if (phase !== "playing") return;
    fpsFramesRef.current = 0;
    fpsStartRef.current = performance.now();
    const tick = () => {
      fpsFramesRef.current++;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  const start = useCallback(async () => {
    try {
      setError(null);
      const res = await api.post<StartAttemptResponse>("/v1/attempts/start", { benchmarkSlug });
      attemptIdRef.current = res.attemptId;
      setConfig(res.config);
      eventsRef.current = [];
      seqRef.current = 0;
      focusLostRef.current = 0;
      pauseRef.current = 0;
      setPhase("countdown");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar la partida");
      setPhase("error");
    }
  }, [benchmarkSlug]);

  const beginPlaying = useCallback(() => {
    t0Ref.current = performance.now();
    emit("game_start");
    setPhase("playing");
  }, [emit]);

  const finish = useCallback(async () => {
    const attemptId = attemptIdRef.current;
    if (!attemptId) return;
    emit("game_end");
    setPhase("submitting");

    const elapsed = performance.now() - fpsStartRef.current;
    const avgFps = elapsed > 500 ? Math.round((fpsFramesRef.current / elapsed) * 1000) : undefined;

    const body: CompleteAttemptInput = {
      events: eventsRef.current,
      device: collectDeviceInfo(inputTypeRef.current),
      avgFps,
      focusLostCount: focusLostRef.current,
      pauseCount: pauseRef.current,
      durationMs: Math.max(1, Math.round(now())),
      appVersion: "0.1.0",
    };
    try {
      const res = await api.post<CompleteAttemptResponse>(
        `/v1/attempts/${attemptId}/complete`,
        body,
      );
      setResult(res);
      setPhase("results");
    } catch (e) {
      // Corte de red: encolar para reintento idempotente (outbox).
      if (e instanceof Error && !("status" in e)) {
        await queueComplete(attemptId, body);
        setError("Sin conexión: tu partida quedó guardada y se enviará sola 📡");
      } else {
        setError(e instanceof Error ? e.message : "Error al guardar la partida");
      }
      setPhase("error");
    }
  }, [emit, now]);

  const reset = useCallback(() => {
    attemptIdRef.current = null;
    setResult(null);
    setConfig(null);
    setError(null);
    setPhase("intro");
  }, []);

  return { phase, config, result, error, start, beginPlaying, finish, reset, emit, now };
}
