"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Monogram } from "@/components/icons";
import { api } from "@/lib/api";
import { useClassrooms } from "@/features/staff/hooks";
import { Button, Card, Spinner } from "@/components/ui";

interface SessionInfo {
  code: string;
  qrPayload: string;
  expiresAt: string;
}
interface LiveInfo {
  startedAt: string;
  totalAttempts: number;
  players: { displayName: string; avatarId: string; attempts: number; lastAt: string }[];
}

/** Sesión de clase: QR gigante proyectable + actividad en vivo (doc 04 §6). */
export default function ClassSessionPage() {
  const classrooms = useClassrooms();
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const effective = classroomId ?? classrooms.data?.classrooms[0]?.id ?? null;

  const start = useMutation({
    mutationFn: () => api.post<SessionInfo>("/v1/class-sessions", { classroomId: effective }),
    onSuccess: setSession,
  });

  const live = useQuery({
    queryKey: ["live", session?.code],
    queryFn: () => api.get<LiveInfo>(`/v1/class-sessions/${session!.code}/live`),
    enabled: !!session,
    refetchInterval: 10_000, // polling en vivo
  });

  if (classrooms.isLoading) return <Spinner />;

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3">
        <select
          value={effective ?? ""}
          onChange={(e) => {
            setClassroomId(e.target.value);
            setSession(null);
          }}
          className="rounded-xl border-2 border-slate-200 px-3 py-2 font-bold text-slate-600"
        >
          {classrooms.data?.classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <Button onClick={() => start.mutate()} disabled={!effective || start.isPending}>
          ▶ Iniciar sesión de clase
        </Button>
      </Card>

      {session && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* QR proyectable */}
          <Card className="text-center">
            <h2 className="text-xl font-black text-slate-700">Escaneá para entrar 📱</h2>
            <div className="mx-auto mt-4 w-fit rounded-3xl bg-[#fffdf6] p-6 shadow-inner ring-4 ring-brand-100">
              <QRCodeSVG value={session.qrPayload} size={280} />
            </div>
            <p className="mt-4 text-sm font-bold text-slate-400">o escribí el código:</p>
            <p className="text-6xl font-black tracking-widest text-brand-700">{session.code}</p>
          </Card>

          {/* Actividad en vivo */}
          <Card>
            <h2 className="font-black text-slate-700">
              🔴 En vivo — {live.data?.totalAttempts ?? 0} partidas completadas
            </h2>
            <div className="mt-3 space-y-2">
              {(live.data?.players ?? []).map((p) => (
                <div
                  key={p.displayName}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2"
                >
                  <Monogram name={p.displayName} className="h-8 w-8 text-sm" />
                  <span className="flex-1 font-bold text-slate-700">{p.displayName}</span>
                  <span className="text-sm font-black text-brand-600">{p.attempts} partidas</span>
                </div>
              ))}
              {live.data && live.data.players.length === 0 && (
                <p className="py-6 text-center font-bold text-slate-400">
                  Esperando a que entren los alumnos…
                </p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
