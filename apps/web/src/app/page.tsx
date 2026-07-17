import Link from "next/link";
import { serializeCatalog } from "@mentelab/benchmarks";

/** Landing pública: Modo Libre sin fricción + accesos docente/alumno. */
export default function LandingPage() {
  const catalog = serializeCatalog();
  return (
    <main className="kid-zone min-h-dvh bg-gradient-to-b from-brand-50 via-white to-white">
      <div className="mx-auto max-w-4xl px-6 py-14 text-center">
        <p className="text-7xl">🧠</p>
        <h1 className="mt-4 text-5xl font-black text-brand-800">MenteLab</h1>
        <p className="mx-auto mt-3 max-w-xl text-xl text-slate-500 font-semibold">
          Entrená tu mente jugando. Medí tu velocidad, memoria y precisión — y superate a vos
          mismo cada día.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/play"
            className="rounded-3xl bg-brand-600 px-10 py-5 text-2xl font-black text-white shadow-lg shadow-brand-600/30 transition-transform hover:scale-105 active:scale-95"
          >
            🎮 JUGAR AHORA
          </Link>
          <Link
            href="/login"
            className="rounded-3xl border-2 border-brand-200 bg-white px-8 py-5 text-xl font-bold text-brand-700 transition-colors hover:border-brand-400"
          >
            Tengo código de clase →
          </Link>
        </div>
        <p className="mt-3 text-sm text-slate-400 font-semibold">
          Sin registro: tu progreso queda guardado en este dispositivo.
        </p>

        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {catalog.map((b) => (
            <div
              key={b.slug}
              className="rounded-3xl border border-slate-100 bg-white p-4 text-center shadow-sm"
            >
              <p className="text-4xl">{b.icon}</p>
              <p className="mt-2 font-bold text-slate-700">{b.name}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-3xl bg-slate-50 p-6 text-left">
          <h2 className="text-lg font-black text-slate-700">¿Sos docente? 🍎</h2>
          <p className="mt-1 text-slate-500 font-semibold">
            MenteLab permite a tu escuela medir la evolución cognitiva de los alumnos con datos
            reales: rankings por curso, misiones diarias, perfil cognitivo y panel completo con
            exportación.
          </p>
          <Link href="/teacher/login" className="mt-3 inline-block font-black text-brand-600">
            Entrar al panel docente →
          </Link>
        </div>
      </div>
    </main>
  );
}
