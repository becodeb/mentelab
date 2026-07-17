"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PICTURE_KEYS, type ClassRosterEntry } from "@mentelab/shared";
import { useClassLookup, useStudentLogin } from "@/features/auth/hooks";
import { REMEMBERED_CLASS_KEY, storage } from "@/lib/device";
import { Button, Card, Input, Spinner } from "@/components/ui";
import { BrainMark, Monogram } from "@/components/icons";

/**
 * Login alumno en capas (doc 04 §1):
 * código de clase (recordado por dispositivo) → grilla de nombres → clave simple.
 */
export default function StudentLoginPage() {
  const router = useRouter();
  const [classCode, setClassCode] = useState<string | null>(
    () => storage.get(REMEMBERED_CLASS_KEY),
  );
  const [codeInput, setCodeInput] = useState("");
  const [selected, setSelected] = useState<ClassRosterEntry | null>(null);

  const lookup = useClassLookup(classCode);
  const login = useStudentLogin();

  const submitCode = () => {
    const code = codeInput.toUpperCase().trim();
    if (code.length >= 3) {
      storage.set(REMEMBERED_CLASS_KEY, code);
      setClassCode(code);
    }
  };

  const handleLogin = async (secret: string) => {
    if (!selected) return;
    try {
      await login.mutateAsync({ playerId: selected.playerId, secret });
      router.push("/play");
    } catch {
      /* el error se muestra abajo */
    }
  };

  // ── Paso 1: código de clase ────────────────────────────────────────
  if (!classCode || (lookup.isError && !lookup.isFetching)) {
    return (
      <main className="kid-zone flex min-h-dvh items-center justify-center bg-gradient-to-b from-brand-50 to-cream-50 p-6">
        <Card className="w-full max-w-md text-center">
          <BrainMark className="mx-auto h-14 w-14 text-brand-600" />
          <h1 className="mt-3 text-3xl font-semibold text-slate-800">¿Cuál es tu clase?</h1>
          <p className="mt-1 text-slate-500 font-semibold">
            Escaneá el QR que muestra tu docente, o escribí el código:
          </p>
          {lookup.isError && classCode && (
            <p className="mt-2 rounded-xl bg-amber-50 p-2 text-sm font-bold text-amber-700">
              No encontramos la clase «{classCode}». Fijate bien el código 🙂
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <Input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitCode()}
              placeholder="SOL-42"
              className="text-center text-2xl font-black tracking-widest uppercase"
              autoFocus
            />
            <Button size="lg" onClick={submitCode}>
              Ir
            </Button>
          </div>
          <button
            className="mt-6 text-sm font-bold text-slate-400 hover:text-brand-600"
            onClick={() => router.push("/play")}
          >
            Jugar sin cuenta (Modo Libre) →
          </button>
        </Card>
      </main>
    );
  }

  if (lookup.isLoading) return <Spinner label="Buscando tu clase…" />;
  const data = lookup.data;
  if (!data) return null;

  // ── Paso 3: clave simple ───────────────────────────────────────────
  if (selected) {
    return (
      <main className="kid-zone flex min-h-dvh items-center justify-center bg-gradient-to-b from-brand-50 to-cream-50 p-6">
        <Card className="w-full max-w-md text-center">
          <Monogram
            name={selected.displayName}
            seed={selected.playerId}
            className="mx-auto h-20 w-20 text-4xl"
          />
          <h1 className="mt-3 text-3xl font-semibold text-slate-800">
            ¡Hola {selected.displayName}!
          </h1>
          {selected.secretType === "PIN4" ? (
            <PinPad
              onSubmit={handleLogin}
              loading={login.isPending}
              error={login.isError ? login.error.message : null}
            />
          ) : (
            <PictureKey
              onSubmit={handleLogin}
              loading={login.isPending}
              error={login.isError ? login.error.message : null}
            />
          )}
          <button
            className="mt-4 text-sm font-bold text-slate-400"
            onClick={() => {
              setSelected(null);
              login.reset();
            }}
          >
            ← no soy yo
          </button>
        </Card>
      </main>
    );
  }

  // ── Paso 2: grilla de nombres ──────────────────────────────────────
  return (
    <main className="kid-zone min-h-dvh bg-gradient-to-b from-brand-50 to-cream-50 p-6">
      <div className="mx-auto max-w-2xl">
        <header className="text-center">
          <p className="font-black text-brand-600">
            {data.label} — {data.institutionName}
          </p>
          <h1 className="text-3xl font-black text-slate-800">¿Quién sos?</h1>
        </header>
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {data.students.map((s, i) => (
            <motion.button
              key={s.playerId}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelected(s)}
              className="rounded-3xl border-2 border-slate-100 bg-[#fffdf6] p-4 text-center shadow-sm transition-all hover:border-brand-400 hover:shadow-md active:scale-95"
            >
              <Monogram name={s.displayName} seed={s.playerId} className="h-12 w-12 text-xl" />
              <p className="mt-2 truncate text-sm font-black text-slate-700">{s.displayName}</p>
            </motion.button>
          ))}
        </div>
        <div className="mt-8 text-center">
          <button
            className="text-sm font-bold text-slate-400 hover:text-brand-600"
            onClick={() => {
              storage.remove(REMEMBERED_CLASS_KEY);
              setClassCode(null);
              setCodeInput("");
            }}
          >
            No soy de este curso
          </button>
        </div>
      </div>
    </main>
  );
}

/** Teclado PIN grande para táctil. */
function PinPad({
  onSubmit,
  loading,
  error,
}: {
  onSubmit: (secret: string) => void;
  loading: boolean;
  error: string | null;
}) {
  const [pin, setPin] = useState("");
  const press = (d: string) => {
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) {
      onSubmit(next);
      setTimeout(() => setPin(""), 600);
    }
  };
  return (
    <div className="mt-4">
      <p className="font-bold text-slate-500">Tu PIN secreto:</p>
      <div className="mx-auto mt-2 flex w-40 justify-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex h-12 w-9 items-center justify-center rounded-xl border-2 border-slate-200 text-2xl font-black"
          >
            {pin[i] ? "●" : ""}
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-sm font-bold text-rose-500">{error}</p>}
      <div className="mx-auto mt-4 grid w-56 grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k, i) =>
          k === "" ? (
            <div key={i} />
          ) : (
            <button
              key={i}
              disabled={loading}
              onClick={() => (k === "⌫" ? setPin(pin.slice(0, -1)) : press(k))}
              className="rounded-2xl bg-slate-100 py-3 text-2xl font-black text-slate-700 transition-colors hover:bg-brand-100 active:scale-95"
            >
              {k}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

/** Clave visual: secuencia de 3 imágenes (primaria baja). */
function PictureKey({
  onSubmit,
  loading,
  error,
}: {
  onSubmit: (secret: string) => void;
  loading: boolean;
  error: string | null;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const pick = (id: string) => {
    const next = [...picked, id].slice(0, 3);
    setPicked(next);
    if (next.length === 3) {
      onSubmit(next.join(","));
      setTimeout(() => setPicked([]), 600);
    }
  };
  return (
    <div className="mt-4">
      <p className="font-bold text-slate-500">Tocá tus 3 dibujos secretos, en orden:</p>
      <div className="mx-auto mt-2 flex justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-200 text-2xl"
          >
            {picked[i] ? (PICTURE_KEYS[picked[i]!] ?? "•") : ""}
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-sm font-bold text-rose-500">{error}</p>}
      <div className="mx-auto mt-4 grid w-60 grid-cols-3 gap-2">
        {Object.entries(PICTURE_KEYS).map(([id, emoji]) => (
          <button
            key={id}
            disabled={loading}
            onClick={() => pick(id)}
            className="rounded-2xl bg-slate-100 py-3 text-3xl transition-colors hover:bg-brand-100 active:scale-95"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
