"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { serializeCatalog } from "@mentelab/benchmarks";
import { ArrowRightIcon, BrainMark, GameIcon, SparkIcon } from "@/components/icons";

const CATEGORY_ACCENT: Record<string, { chip: string; bar: string; label: string }> = {
  SPEED: { chip: "bg-amber-100 text-amber-700", bar: "bg-amber-500", label: "velocidad" },
  MEMORY: { chip: "bg-blue-100 text-blue-600", bar: "bg-blue-500", label: "memoria" },
  ATTENTION: { chip: "bg-emerald-100 text-emerald-600", bar: "bg-emerald-500", label: "atención" },
  PRECISION: { chip: "bg-pink-100 text-pink-600", bar: "bg-pink-500", label: "precisión" },
  TYPING: { chip: "bg-cyan-100 text-cyan-600", bar: "bg-cyan-500", label: "tipeo" },
};

const HERO_WORDS = ["Entrená", "tu", "mente", "jugando."];

/** Medallón flotante decorativo con icono de juego (cero emojis). */
function FloatingMedallion({
  slug,
  className,
  delay = 0,
  duration = 8,
}: {
  slug: string;
  className?: string;
  delay?: number;
  duration?: number;
}) {
  return (
    <motion.span
      aria-hidden
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 120, damping: 14 }}
      className={`pointer-events-none absolute select-none ${className ?? ""}`}
    >
      <motion.span
        className="flex h-16 w-16 items-center justify-center rounded-full border border-ink-900/10 bg-[#fffdf6] text-ink-400 shadow-[0_10px_30px_-14px_rgba(32,27,18,0.4)]"
        animate={{ y: [0, -14, 0], rotate: [-4, 5, -4] }}
        transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
      >
        <GameIcon slug={slug} className="h-7 w-7" />
      </motion.span>
    </motion.span>
  );
}

/** Landing pública — clásico cálido editorial, motion orquestado. */
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
        <p className="inline-flex items-center gap-2.5 font-display text-2xl font-semibold tracking-tight">
          <BrainMark className="h-8 w-8 text-brand-600" />
          Mente<span className="text-brand-600 -ml-1.5">Lab</span>
        </p>
        <Link
          href="/teacher/login"
          className="font-display text-sm font-bold text-ink-500 underline-offset-4 transition-colors hover:text-ink-900 hover:underline"
        >
          Soy docente →
        </Link>
      </motion.nav>

      {/* ── Hero ── */}
      <section className="relative mx-auto max-w-6xl px-6 pb-24 pt-12 sm:pt-16">
        <FloatingMedallion slug="reaction-time" className="left-[3%] top-[6%] hidden sm:block" delay={0.9} duration={8} />
        <FloatingMedallion slug="chimp-test" className="right-[6%] top-[2%] hidden sm:block" delay={1.1} duration={10} />
        <FloatingMedallion slug="aim-trainer" className="left-[10%] bottom-[4%] hidden sm:block" delay={1.3} duration={9} />
        <FloatingMedallion slug="memory-pairs" className="right-[14%] bottom-[18%] hidden sm:block" delay={1.5} duration={7} />

        <h1 className="max-w-4xl text-6xl font-semibold leading-[1.02] tracking-tight sm:text-8xl">
          {HERO_WORDS.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 60, rotate: 2 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ delay: 0.12 + i * 0.11, type: "spring", stiffness: 150, damping: 19 }}
              className={`mr-[0.24em] inline-block ${word === "mente" ? "relative italic text-brand-600" : ""}`}
            >
              {word}
              {word === "mente" && (
                <svg viewBox="0 0 220 22" className="absolute -bottom-2 left-0 w-full" fill="none" aria-hidden>
                  <motion.path
                    d="M4 16 C 60 6, 150 4, 216 12"
                    stroke="currentColor"
                    strokeWidth="6"
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
          className="mt-8 max-w-xl text-xl font-medium leading-relaxed text-ink-500"
        >
          Doce juegos que miden tu velocidad, memoria, atención y precisión.
          <br />
          Tu único rival: <em className="font-display font-semibold text-ink-900">vos mismo, ayer.</em>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.78, duration: 0.6 }}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <Link
            href="/play"
            className="group inline-flex items-center gap-3 rounded-full bg-ink-900 px-9 py-4 font-display text-xl font-bold text-cream-50 shadow-[0_16px_40px_-12px_rgba(32,27,18,0.5)] transition-all duration-200 hover:-translate-y-1 hover:bg-ink-700 active:scale-95"
          >
            Jugar ahora
            <ArrowRightIcon className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1.5" />
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
                className="flex items-center gap-3 whitespace-nowrap font-display text-lg font-semibold text-cream-50/90"
              >
                <GameIcon slug={b.slug} className="h-5 w-5 text-cream-50/60" />
                {b.name}
                <SparkIcon className="h-3.5 w-3.5 text-brand-400" />
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
          className="text-4xl font-semibold tracking-tight sm:text-5xl"
        >
          Doce retos. <span className="italic text-ink-400">Un cerebro más rápido.</span>
        </motion.h2>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {catalog.map((b, i) => {
            const accent = CATEGORY_ACCENT[b.category] ?? CATEGORY_ACCENT["MEMORY"]!;
            return (
              <motion.div
                key={b.slug}
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: (i % 4) * 0.08, type: "spring", stiffness: 160, damping: 20 }}
              >
                <Link
                  href={`/play/${b.slug}`}
                  className="group relative block overflow-hidden rounded-[1.5rem] border border-ink-900/8 bg-[#fffdf6] p-5 pb-6 shadow-[0_2px_20px_-8px_rgba(32,27,18,0.12)] transition-all duration-300 hover:-translate-y-2 hover:rotate-[-1deg] hover:shadow-[0_24px_44px_-18px_rgba(32,27,18,0.3)]"
                >
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 ${accent.chip}`}
                  >
                    <GameIcon slug={b.slug} className="h-7 w-7" />
                  </span>
                  <p className="mt-3 font-display text-lg font-semibold leading-tight">{b.name}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-300">
                    {accent.label}
                  </p>
                  <span
                    className={`absolute inset-x-5 bottom-0 h-1 rounded-t-full ${accent.bar} opacity-60 transition-all duration-300 group-hover:inset-x-2 group-hover:opacity-100`}
                  />
                </Link>
              </motion.div>
            );
          })}
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
          <BrainMark className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 text-cream-50/5" />
          <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-brand-400">
            Para escuelas
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
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
            <ArrowRightIcon className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1.5" />
          </Link>
        </motion.div>
        <p className="mt-10 flex items-center justify-center gap-2 text-sm font-semibold text-ink-300">
          <BrainMark className="h-4 w-4" /> MenteLab — entrenamiento cognitivo para escuelas
        </p>
      </section>
    </main>
  );
}
