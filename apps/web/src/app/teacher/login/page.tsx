"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStaffLogin } from "@/features/auth/hooks";
import { Button, Card, Input } from "@/components/ui";
import { BrainMark } from "@/components/icons";

export default function TeacherLoginPage() {
  const router = useRouter();
  const login = useStaffLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login.mutateAsync({ email, password });
      router.push("/teacher");
    } catch {
      /* error mostrado abajo */
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-100 p-6">
      <Card className="w-full max-w-md">
        <BrainMark className="mx-auto h-12 w-12 text-brand-600" />
        <h1 className="mt-3 text-center text-3xl font-semibold text-slate-800">Panel docente</h1>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <Input
            type="email"
            placeholder="tu@escuela.edu.ar"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
          />
          <Input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {login.isError && (
            <p className="text-sm font-bold text-rose-500">{login.error.message}</p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={login.isPending}>
            {login.isPending ? "Entrando…" : "Entrar"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm font-semibold text-slate-400">
          <Link href="/" className="text-brand-600">
            ← Volver al inicio
          </Link>
        </p>
      </Card>
    </main>
  );
}
