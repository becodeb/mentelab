"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { serializeCatalog } from "@mentelab/benchmarks";
import { FloatingEmoji } from "@/components/motion";

const CATEGORY_TINT: Record<string, string> = {
  SPEED: "bg-amber-100 text-amber-700",
  MEMORY: "bg-blue-100 text-blue-600",
  ATTENTION: "bg-emerald-100 text-emerald-600",
  PRECISION: "bg-pink-100 text-pink-600",
  TYPING: "bg-cyan-100 text-cyan-600",
};
const CATEGORY_LABEL: Record<string, string> = {
  SPEED: "velocidad",
  MEMORY: "memoria",
  ATTENTION: "atención",
  PRECISION: "precisión",
  TYPING: "tipeo",
};

const HERO_WORDS = ["Entrená", "tu", "mente", "jugando."];

/** Landing pública — minimalismo editorial cálido con motion orquestado. */
export default function LandingPage() {
  const catalog = serializeCatalog();
  return (
    <main className="kid-zone min-h-dvh overflow-x-clip bg-cream-50">
      {/* ── Nav mínima ── */}
      <motion.nav
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5"
      >
        <p className="font-display text-xl font-bold tracking-tight">
          Mente<span className="text-brand-600">Lab</span> 🧠
        </p>
        <Link
          href="/teacher/login"
          className="font-display text-sm font-bold text-ink-500 underline-offset-4 transition-colors hover:text-ink-900 hover:underline"
        >
          Soy docente →
        </Link>
      </motion.nav>

      {/* ── Hero ── */}
      <section className="relative mx-auto max-w-6xl px-6 pb-20 pt-10 sm:pt-16">
        {/* Piezas flotantes de fondo */}
        <FloatingEmoji emoji="⚡" className="left-[4%] top-[8%] text-4xl opacity-70" delay={0.9} duration={8} />
        <FloatingEmoji emoji="🧩" className="right-[8%] top-[2%] text-5xl opacity-70" delay={1.1} duration={10} />
        <FloatingEmoji emoji="🎯" className="left-[12%] bottom-[6%] text-4xl opacity-60" delay={1.3} duration={9} />
        <FloatingEmoji emoji="🐵" className="right-[16%] bottom-[16%] text-4xl opacity-60" delay={1.5} duration={7} />

        <h1 className="max-w-4xl text-6xl font-bold leading-[0.98] tracking-tight sm:text-8xl">
          {HERO_WORDS.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 60, rotate: 3 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ delay: 0.12 + i * 0.11, type: "spring", stiffness: 150, damping: 19 }}
              className={`mr-[0.22em] inline-block ${word === "mente" ? "relative text-brand-600" : ""}`}
            >
              {word}
              {word === "mente" && (
                <svg
                  viewBox="0 0 220 22"
                  className="absolute -bottom-2 left-0 w-full"
                  fill="none"
                  aria-hidden
                >
                  <motion.path
                    d="M4 16 C 60 6, 150 4, 216 12"
                    stroke="currentColor"
                    strokeWidth="7"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.75, duration: 0.55, ease: "easeOut" }}
                  />
                </svg>
              )}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-7 max-w-xl text-xl font-medium leading-relaxed text-ink-500"
        >
          Ocho juegos que miden tu velocidad, memoria y precisión.
          <br />
          Tu único rival: <em className="font-bold not-italic text-ink-900">vos mismo, ayer.</em>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.78, duration: 0.6 }}
          className="mt-9 flex flex-wrap items-center gap-4"
        >
          <Link
            href="/play"
            className="group inline-flex items-center gap-3 rounded-full bg-ink-900 px-9 py-4.5 font-display text-xl font-bold text-cream-50 shadow-[0_16px_40px_-12px_rgba(32,27,18,0.5)] transition-all duration-200 hover:-translate-y-1 hover:bg-ink-700 active:scale-95"
          >
            Jugar ahora
            <span className="transition-transform duration-200 group-hover:translate-x-1.5">→</span>
          </Link>
          <Link
            href="/login"
            className="rounded-full border-2 border-ink-900/15 px-7 py-4 font-display text-lg font-bold text-ink-700 transition-all duration-200 hover:-translate-y-1 hover:border-ink-900"
          >
            Tengo código de clase
          </Link>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mt-4 text-sm font-semibold text-ink-300"
        >
          Sin registro — tu progreso queda en este dispositivo.
        </motion.p>
      </section>

      {/* ── Marquee ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="border-y border-ink-900/10 bg-ink-900 py-3.5"
      >
        <div className="flex overflow-hidden">
          <div className="marquee-track flex shrink-0 items-center gap-8 pr-8">
            {[...catalog, ...catalog].map((b, i) => (
              <span
                key={i}
                className="flex items-center gap-3 whitespace-nowrap font-display text-lg font-bold text-cream-50/90"
              >
                {b.icon} {b.name} <span className="text-brand-400">✦</span>
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Juegos ── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl font-bold tracking-tight sm:text-5xl"
        >
          Ocho retos.
          <span className="text-ink-400"> Un cerebro más rápido.</span>
        </motion.h2>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {catalog.map((b, i) => (
            <motion.div
              key={b.slug}
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: (i % 4) * 0.08, type: "spring", stiffness: 160, damping: 20 }}
            >
              <Link
                href={`/play/${b.slug}`}
                className="group block rounded-[1.75rem] border border-ink-900/8 bg-[#fffdf6] p-5 shadow-[0_2px_20px_-8px_rgba(32,27,18,0.12)] transition-all duration-300 hover:-translate-y-2 hover:rotate-[-1deg] hover:shadow-[0_24px_44px_-18px_rgba(32,27,18,0.3)]"
              >
                <span className="block text-5xl transition-transform duration-300 group-hover:scale-125 group-hover:rotate-6">
                  {b.icon}
                </span>
                <p className="mt-3 font-display text-lg font-bold leading-tight">{b.name}</p>
                <span
                  className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${CATEGORY_TINT[b.category] ?? ""}`}
                >
                  {CATEGORY_LABEL[b.category]}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Banda docentes ── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          className="relative overflow-hidden rounded-[2.5rem] bg-ink-900 px-8 py-12 text-cream-50 sm:px-14"
        >
          <FloatingEmoji emoji="📊" className="right-[6%] top-[14%] text-6xl opacity-20" duration={9} />
          <FloatingEmoji emoji="🍎" className="right-[18%] bottom-[12%] text-5xl opacity-20" duration={7} delay={0.4} />
          <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-brand-400">
            Para escuelas
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Datos reales de cómo evolucionan tus alumnos.
          </h2>
          <p className="mt-4 max-w-xl text-lg font-medium text-cream-50/70">
            Rankings por curso, misiones diarias, perfil cognitivo y un panel completo con
            exportación a Excel. Cada click queda registrado para análisis profundos.
          </p>
          <Link
            href="/teacher/login"
            className="group mt-8 inline-flex items-center gap-3 rounded-full bg-cream-50 px-8 py-4 font-display text-lg font-bold text-ink-900 transition-all duration-200 hover:-translate-y-1 active:scale-95"
          >
            Entrar al panel docente
            <span className="transition-transform duration-200 group-hover:translate-x-1.5">→</span>
          </Link>
        </motion.div>
        <p className="mt-10 text-center text-sm font-semibold text-ink-300">
          MenteLab 🧠 — entrenamiento cognitivo para escuelas
        </p>
      </section>
    </main>
  );
}
