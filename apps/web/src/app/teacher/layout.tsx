"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, useLogout } from "@/features/auth/hooks";
import { Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/teacher", label: "📊 Dashboard" },
  { href: "/teacher/students", label: "👧 Alumnos" },
  { href: "/teacher/compare", label: "⚖️ Comparar" },
  { href: "/teacher/session", label: "📺 Sesión de clase" },
];

/** Layout sobrio del staff (distinto de la zona alumno, doc 09 §1). */
export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const logout = useLogout();

  if (pathname === "/teacher/login") return <>{children}</>;
  if (session.isLoading) return <Spinner label="Verificando sesión…" />;
  const principal = session.data?.principal;
  if (!principal || principal.kind !== "staff") {
    router.replace("/teacher/login");
    return <Spinner />;
  }

  return (
    <div className="min-h-dvh bg-slate-100">
      <header className="border-b border-slate-200 bg-[#fffdf6]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/teacher" className="text-lg font-black text-brand-700">
              🧠 MenteLab <span className="text-slate-400 text-sm font-bold">docente</span>
            </Link>
            <nav className="hidden gap-1 sm:flex">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-sm font-bold text-slate-500 hover:bg-slate-100",
                    pathname === item.href && "bg-brand-50 text-brand-700",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
            <span>{principal.name}</span>
            <button
              className="text-slate-400 underline"
              onClick={() => logout.mutate(undefined, { onSuccess: () => router.push("/") })}
            >
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
