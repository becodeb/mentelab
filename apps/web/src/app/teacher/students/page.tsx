"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { StudentCredential, StudentRow } from "@mentelab/shared";
import { Monogram } from "@/components/icons";
import { api } from "@/lib/api";
import { relativeDay } from "@/lib/utils";
import { useClassrooms, useStudents } from "@/features/staff/hooks";
import { Button, Card, Input, Spinner, EmptyState } from "@/components/ui";

/** Gestión de alumnos: alta, CSV, mover, editar, desactivar, credenciales. */
export default function StudentsPage() {
  const qc = useQueryClient();
  const classrooms = useClassrooms();
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const effective = classroomId ?? classrooms.data?.classrooms[0]?.id ?? null;
  const students = useStudents(effective);
  const [credentials, setCredentials] = useState<StudentCredential[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["staff", "students"] });
    void qc.invalidateQueries({ queryKey: ["staff", "classrooms"] });
  };

  const currentClassroom = classrooms.data?.classrooms.find((c) => c.id === effective);

  if (classrooms.isLoading) return <Spinner label="Cargando…" />;

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3">
        <select
          value={effective ?? ""}
          onChange={(e) => setClassroomId(e.target.value)}
          className="rounded-xl border-2 border-slate-200 px-3 py-2 font-bold text-slate-600"
        >
          {classrooms.data?.classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label} · código {c.classCode} · {c.studentCount} alumnos
            </option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          <Button size="sm" onClick={() => setShowAdd(true)}>
            + Agregar alumno
          </Button>
          <CsvImport
            classroomId={effective}
            onDone={(creds) => {
              setCredentials(creds);
              invalidate();
            }}
          />
        </div>
      </Card>

      {showAdd && effective && (
        <AddStudentForm
          classroomId={effective}
          onClose={() => setShowAdd(false)}
          onCreated={(cred) => {
            setCredentials([cred]);
            setShowAdd(false);
            invalidate();
          }}
        />
      )}

      {credentials.length > 0 && (
        <CredentialsSheet credentials={credentials} onClose={() => setCredentials([])} />
      )}

      <Card>
        {students.isLoading && <Spinner />}
        {students.data && students.data.students.length === 0 && (
          <EmptyState
            emoji="🧑‍🏫"
            title="Todavía no hay alumnos en este curso"
            hint="Agregalos a mano o importá un CSV"
          />
        )}
        {students.data && students.data.students.length > 0 && (
          <StudentsTable
            students={students.data.students}
            classrooms={classrooms.data?.classrooms ?? []}
            currentClassroomId={effective!}
            onChanged={invalidate}
            onCredential={(c) => setCredentials([c])}
          />
        )}
      </Card>
      {currentClassroom && (
        <p className="text-sm font-semibold text-slate-400">
          Los alumnos entran con el código <b>{currentClassroom.classCode}</b> (o el QR de
          «Sesión de clase») y su PIN.
        </p>
      )}
    </div>
  );
}

function StudentsTable({
  students,
  classrooms,
  currentClassroomId,
  onChanged,
  onCredential,
}: {
  students: StudentRow[];
  classrooms: { id: string; label: string }[];
  currentClassroomId: string;
  onChanged: () => void;
  onCredential: (c: StudentCredential) => void;
}) {
  const update = useMutation({
    mutationFn: ({ playerId, body }: { playerId: string; body: object }) =>
      api.patch(`/v1/roster/students/${playerId}`, body),
    onSuccess: onChanged,
  });
  const move = useMutation({
    mutationFn: ({ playerId, toClassroomId }: { playerId: string; toClassroomId: string }) =>
      api.post(`/v1/roster/students/${playerId}/move`, { toClassroomId }),
    onSuccess: onChanged,
  });
  const reset = useMutation({
    mutationFn: (playerId: string) =>
      api.post<{ credential: StudentCredential }>(`/v1/roster/students/${playerId}/reset-secret`),
    onSuccess: (data) => onCredential(data.credential),
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-black uppercase tracking-wide text-slate-400">
            <th className="py-2 pr-3">Alumno</th>
            <th className="px-3">Partidas</th>
            <th className="px-3">Racha</th>
            <th className="px-3">Mejora 30d</th>
            <th className="px-3">Última vez</th>
            <th className="px-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr
              key={s.playerId}
              className={`border-b border-slate-50 ${!s.active ? "opacity-40" : ""}`}
            >
              <td className="py-2 pr-3 font-bold text-slate-700">
                <Monogram
                  name={s.firstName}
                  seed={s.playerId}
                  className="mr-2 h-7 w-7 text-sm align-middle"
                />
                {s.lastName}, {s.firstName}
                {!s.active && " (inactivo)"}
              </td>
              <td className="px-3 font-semibold text-slate-500">{s.totalAttempts}</td>
              <td className="px-3 font-semibold text-slate-500">
                {s.currentStreak > 0 ? `🔥 ${s.currentStreak}` : "—"}
              </td>
              <td className="px-3 font-black">
                {s.improvement30dPct != null ? (
                  <span className={s.improvement30dPct >= 0 ? "text-emerald-600" : "text-amber-600"}>
                    {s.improvement30dPct > 0 ? "↗ +" : ""}
                    {s.improvement30dPct}%
                  </span>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
              <td className="px-3 font-semibold text-slate-500">{relativeDay(s.lastPlayedAt)}</td>
              <td className="px-3">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <button
                    className="text-brand-600 underline"
                    onClick={() => reset.mutate(s.playerId)}
                  >
                    reset PIN
                  </button>
                  <select
                    className="rounded-lg border border-slate-200 px-1 py-0.5"
                    value=""
                    onChange={(e) =>
                      e.target.value &&
                      move.mutate({ playerId: s.playerId, toClassroomId: e.target.value })
                    }
                  >
                    <option value="">mover a…</option>
                    {classrooms
                      .filter((c) => c.id !== currentClassroomId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                  </select>
                  <button
                    className="text-slate-400 underline"
                    onClick={() =>
                      update.mutate({ playerId: s.playerId, body: { active: !s.active } })
                    }
                  >
                    {s.active ? "desactivar" : "reactivar"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AddStudentForm({
  classroomId,
  onClose,
  onCreated,
}: {
  classroomId: string;
  onClose: () => void;
  onCreated: (c: StudentCredential) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const create = useMutation({
    mutationFn: () =>
      api.post<{ credential: StudentCredential }>("/v1/roster/students", {
        classroomId,
        firstName,
        lastName,
        ...(birthYear ? { birthYear: Number(birthYear) } : {}),
        secretType: "PIN4",
      }),
    onSuccess: (d) => onCreated(d.credential),
  });
  return (
    <Card>
      <h3 className="font-black text-slate-700">Nuevo alumno</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <Input
          placeholder="Nombre"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="max-w-48 text-base"
        />
        <Input
          placeholder="Apellido"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="max-w-48 text-base"
        />
        <Input
          placeholder="Año de nacimiento (opcional)"
          value={birthYear}
          onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, ""))}
          className="max-w-56 text-base"
        />
        <Button onClick={() => create.mutate()} disabled={!firstName || !lastName || create.isPending}>
          Crear
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </div>
      {create.isError && (
        <p className="mt-2 text-sm font-bold text-rose-500">{create.error.message}</p>
      )}
    </Card>
  );
}

/** Importación CSV: parseo client-side con preview de validación (doc 04 §4). */
function CsvImport({
  classroomId,
  onDone,
}: {
  classroomId: string | null;
  onDone: (creds: StudentCredential[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ firstName: string; lastName: string; birthYear?: number }[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const importStudents = useMutation({
    mutationFn: (rows: NonNullable<typeof preview>) =>
      api.post<{ credentials: StudentCredential[] }>("/v1/roster/students/import", {
        classroomId,
        rows,
      }),
    onSuccess: (d) => {
      setPreview(null);
      onDone(d.credentials);
    },
  });

  const parse = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const rows: NonNullable<typeof preview> = [];
    const errs: string[] = [];
    const startIdx = /nombre/i.test(lines[0] ?? "") ? 1 : 0; // saltar encabezado
    for (let i = startIdx; i < lines.length; i++) {
      const [firstName, lastName, year] = lines[i]!.split(/[;,]/).map((s) => s.trim());
      if (!firstName || !lastName) {
        errs.push(`Fila ${i + 1}: faltan nombre o apellido → "${lines[i]}"`);
        continue;
      }
      const birthYear = year && /^\d{4}$/.test(year) ? Number(year) : undefined;
      rows.push({ firstName, lastName, ...(birthYear ? { birthYear } : {}) });
    }
    setPreview(rows);
    setErrors(errs);
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && parse(e.target.files[0])}
      />
      <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
        ⬆ Importar CSV
      </Button>
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <Card className="max-h-[80vh] w-full max-w-lg overflow-y-auto">
            <h3 className="font-black text-slate-700">
              Confirmar importación ({preview.length} alumnos)
            </h3>
            <p className="text-xs font-semibold text-slate-400">
              Formato esperado: nombre, apellido, año_nacimiento (opcional). Separador: coma o
              punto y coma.
            </p>
            {errors.length > 0 && (
              <div className="mt-2 rounded-xl bg-amber-50 p-2 text-xs font-bold text-amber-700">
                {errors.map((e, i) => (
                  <p key={i}>⚠ {e}</p>
                ))}
              </div>
            )}
            <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-sm font-semibold text-slate-600">
              {preview.map((r, i) => (
                <li key={i}>
                  {r.lastName}, {r.firstName} {r.birthYear ? `(${r.birthYear})` : ""}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => importStudents.mutate(preview)}
                disabled={preview.length === 0 || importStudents.isPending}
              >
                {importStudents.isPending ? "Importando…" : `Importar ${preview.length}`}
              </Button>
              <Button variant="ghost" onClick={() => setPreview(null)}>
                Cancelar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

/** Tarjetas de credenciales imprimibles para repartir (doc 04 §4). */
function CredentialsSheet({
  credentials,
  onClose,
}: {
  credentials: StudentCredential[];
  onClose: () => void;
}) {
  return (
    <Card className="border-2 border-brand-200">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-slate-700">
          🔑 Credenciales generadas — se muestran UNA sola vez
        </h3>
        <div className="flex gap-2 print:hidden">
          <Button size="sm" onClick={() => window.print()}>
            🖨 Imprimir
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {credentials.map((c) => (
          <div key={c.playerId} className="rounded-2xl border-2 border-dashed border-slate-300 p-3 text-center">
            <p className="font-black text-slate-700">{c.displayName}</p>
            <p className="text-xs font-bold text-slate-400">Clase: {c.classCode}</p>
            <p className="mt-1 text-2xl font-black tracking-widest text-brand-700">
              {c.secretPlain}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
