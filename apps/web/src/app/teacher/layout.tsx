"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, useLogout } from "@/features/auth/hooks";
import { Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";
import { BrainMark, ChartIcon, CompareIcon, ScreenIcon, UsersIcon } from "@/components/icons";

const NAV = [
  { href: "/teacher", label: "Dashboard", Icon: ChartIcon },
  { href: "/teacher/students", label: "Alumnos", Icon: UsersIcon },
  { href: "/teacher/compare", label: "Comparar", Icon: CompareIcon },
  { href: "/teacher/session", label: "Sesión de clase", Icon: ScreenIcon },
];

/** Layout sobrio del staff (distinto de la zona alumno, doc 09 §1). */
export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const logout = useLogout();

  const isLoginPage = pathname === "/teacher/login";
  const principal = session.data?.principal;
  const needsLogin = !session.isLoading && (!principal || principal.kind !== "staff");

  // Redirigir en efecto, nunca durante el render (regla de React).
  useEffect(() => {
    if (!isLoginPage && needsLogin) router.replace("/teacher/login");
  }, [isLoginPage, needsLogin, router]);

  if (isLoginPage) return <>{children}</>;
  if (session.isLoading) return <Spinner label="Verificando sesión…" />;
  if (needsLogin || !principal || principal.kind !== "staff") return <Spinner />;

  return (
    <div className="min-h-dvh bg-slate-100">
      <header className="border-b border-slate-200 bg-[#fffdf6]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/teacher"
              className="inline-flex items-center gap-2 font-display text-lg font-bold text-slate-800"
            >
              <BrainMark className="h-6 w-6 text-brand-600" />
              MenteLab <span className="text-sm font-semibold text-slate-400">docente</span>
            </Link>
            <nav className="hidden gap-1 sm:flex">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-500 hover:bg-slate-100",
                    pathname === item.href && "bg-brand-50 text-brand-700",
                  )}
                >
                  <item.Icon className="h-4 w-4" />
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
