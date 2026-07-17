"use client";

import type { SVGProps, FC } from "react";
import { cn } from "@/lib/utils";

/**
 * Iconografía propia de MenteLab: trazo geométrico consistente (stroke 2,
 * puntas redondeadas), hereda currentColor. Cero emojis de sistema.
 */

type P = SVGProps<SVGSVGElement>;
const base = (props: P) => ({
  viewBox: "0 0 28 28",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

/* ── Marca ── */
export const BrainMark: FC<P> = (p) => (
  <svg {...base(p)}>
    <path d="M14 4.5c-2.6 0-4 1.8-4 3.6-2.3.3-3.8 2-3.8 4.1 0 1.2.5 2.3 1.3 3-.8.8-1.2 1.8-1.2 2.9 0 2.4 2 4.3 4.5 4.3.9 0 1.8-.3 2.5-.8" />
    <path d="M14 4.5c2.6 0 4 1.8 4 3.6 2.3.3 3.8 2 3.8 4.1 0 1.2-.5 2.3-1.3 3 .8.8 1.2 1.8 1.2 2.9 0 2.4-2 4.3-4.5 4.3-.9 0-1.8-.3-2.5-.8" />
    <path d="M14 4.5v18" />
    <path d="M10.5 11c1 .8 2.3 1.2 3.5 1.2s2.5-.4 3.5-1.2" opacity={0.55} />
    <path d="M10 17.5c1.2.9 2.6 1.3 4 1.3s2.8-.4 4-1.3" opacity={0.55} />
  </svg>
);

/* ── Iconos de juego (12) ── */
const ReactionIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <circle cx="14" cy="16" r="9" />
    <path d="M11.5 3.5h5M14 3.5V7" />
    <path d="M15.8 11.5l-3.4 4.6h4l-2.6 4" fill="none" />
  </svg>
);
const SequenceIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="7" height="7" rx="2" />
    <rect x="17" y="4" width="7" height="7" rx="2" opacity={0.45} />
    <rect x="4" y="17" width="7" height="7" rx="2" opacity={0.45} />
    <rect x="17" y="17" width="7" height="7" rx="2" />
    <path d="M11 7.5h6M20.5 11v6" opacity={0.6} />
  </svg>
);
const AimIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <circle cx="14" cy="14" r="9.5" />
    <circle cx="14" cy="14" r="5" opacity={0.55} />
    <circle cx="14" cy="14" r="1.4" fill="currentColor" stroke="none" />
    <path d="M14 1.5v4M14 22.5v4M1.5 14h4M22.5 14h4" opacity={0.6} />
  </svg>
);
const NumberIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <rect x="3.5" y="6" width="21" height="16" rx="3.5" />
    <path d="M9.5 11l2-1.4V18M16 10.5h4l-3 3.2c1.8 0 3.2 1 3.2 2.4 0 1.3-1.2 2.4-3 2.4-.8 0-1.6-.2-2.2-.6" opacity={0.8} />
  </svg>
);
const VerbalIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <path d="M14 6.5C11.8 4.8 8.6 4.3 4 4.5v17c4.6-.2 7.8.3 10 2 2.2-1.7 5.4-2.2 10-2v-17c-4.6-.2-7.8.3-10 2z" />
    <path d="M14 6.5v17" opacity={0.55} />
    <path d="M7.5 10c1.5 0 2.7.2 3.8.6M7.5 14c1.5 0 2.7.2 3.8.6M16.7 10.6c1.1-.4 2.3-.6 3.8-.6M16.7 14.6c1.1-.4 2.3-.6 3.8-.6" opacity={0.55} />
  </svg>
);
const ChimpIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <circle cx="6" cy="12" r="3" opacity={0.55} />
    <circle cx="22" cy="12" r="3" opacity={0.55} />
    <circle cx="14" cy="14" r="8.5" />
    <path d="M10.5 12.5h.01M17.5 12.5h.01" strokeWidth={2.6} />
    <path d="M11 17.5c.9.8 1.9 1.2 3 1.2s2.1-.4 3-1.2" opacity={0.8} />
  </svg>
);
const VisualIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <path d="M2.5 14C5.5 8.6 9.5 6 14 6s8.5 2.6 11.5 8c-3 5.4-7 8-11.5 8S5.5 19.4 2.5 14z" />
    <rect x="10.8" y="10.8" width="6.4" height="6.4" rx="1.6" opacity={0.8} />
  </svg>
);
const TypingIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <rect x="2.5" y="8" width="23" height="13" rx="3" />
    <path d="M6.5 12h.01M10.5 12h.01M14.5 12h.01M18.5 12h.01M22 12h.01M6.5 15.5h.01M22 15.5h.01" strokeWidth={2.4} opacity={0.7} />
    <path d="M9.5 17.5h9" opacity={0.8} />
  </svg>
);
const OddOneIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <circle cx="8" cy="8" r="3.4" opacity={0.45} />
    <circle cx="20" cy="8" r="3.4" opacity={0.45} />
    <circle cx="8" cy="20" r="3.4" opacity={0.45} />
    <path d="M20 15.8l3.6 4.2-3.6 4.2-3.6-4.2z" />
  </svg>
);
const ColorTrapIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <path d="M14 3.5c4 4.8 6.5 8.4 6.5 11.6 0 3.9-2.9 6.9-6.5 6.9s-6.5-3-6.5-6.9c0-3.2 2.5-6.8 6.5-11.6z" />
    <path d="M11 15.5c0 1.7 1.2 3 2.8 3.2" opacity={0.6} />
    <circle cx="14" cy="25" r="1.2" fill="currentColor" stroke="none" opacity={0.6} />
  </svg>
);
const QuickMathIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <path d="M8 5.5v7M4.5 9H12" />
    <path d="M16.5 20h8" opacity={0.7} />
    <path d="M16.5 16h8" opacity={0.7} />
    <path d="M6 17l5 5M11 17l-5 5" opacity={0.7} />
    <path d="M19.5 4l-3.2 6h4.4l-3.2 6" />
  </svg>
);
const PairsIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <rect x="3.5" y="6.5" width="12" height="16" rx="2.5" transform="rotate(-6 9.5 14.5)" opacity={0.5} />
    <rect x="12" y="5.5" width="12" height="16" rx="2.5" transform="rotate(6 18 13.5)" />
    <path d="M18.6 10.8l.9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" fill="currentColor" stroke="none" opacity={0.85} />
  </svg>
);

const RhythmIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <path d="M5 12.5c2.7 1.6 5.8 2.4 9 2.4s6.3-.8 9-2.4" />
    <path d="M5 12.5V19c2.7 1.6 5.8 2.4 9 2.4s6.3-.8 9-2.4v-6.5" />
    <path d="M9 14.5V21M19 14.5V21" opacity={0.6} />
    <path d="M7.5 10.5L17 4M20.5 10L11.5 4.5" opacity={0.8} />
  </svg>
);
const PerfectStopIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <rect x="2.5" y="11" width="23" height="6" rx="3" />
    <path d="M14 8v12" opacity={0.5} />
    <circle cx="9.5" cy="14" r="3.6" fill="currentColor" stroke="none" opacity={0.85} />
  </svg>
);
const PursuitIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <circle cx="17" cy="11" r="5" />
    <circle cx="17" cy="11" r="1.6" fill="currentColor" stroke="none" />
    <path d="M4 24c1.5-4.5 4-8.5 7.5-11.5" opacity={0.6} strokeDasharray="1 3.5" />
  </svg>
);

const NumberHuntIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <rect x="3.5" y="3.5" width="21" height="21" rx="4" />
    <path d="M14 3.5v21M3.5 14h21" opacity={0.35} />
    <circle cx="8.75" cy="8.75" r="2.6" opacity={0.85} />
    <path d="M17 19.5l3 3" strokeWidth={2.4} />
    <circle cx="18.7" cy="17.6" r="3" opacity={0.85} />
  </svg>
);
const SpeedMatchIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <rect x="3.5" y="7" width="9.5" height="14" rx="2.5" opacity={0.5} />
    <rect x="15" y="7" width="9.5" height="14" rx="2.5" />
    <path d="M6.5 12.5l1.6 1.8 2.6-3" opacity={0.7} />
    <path d="M18 12.5l1.6 1.8 2.6-3" />
  </svg>
);
const TrailIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <circle cx="6" cy="21" r="2.8" />
    <circle cx="14" cy="8" r="2.8" opacity={0.75} />
    <circle cx="22" cy="18" r="2.8" opacity={0.5} />
    <path d="M7.6 18.6L12.4 10.4M15.8 10l4.6 5.8" strokeDasharray="1.5 3" />
  </svg>
);
const FlashCountIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <circle cx="8" cy="9" r="2.4" fill="currentColor" stroke="none" />
    <circle cx="19" cy="7.5" r="2.4" fill="currentColor" stroke="none" opacity={0.75} />
    <circle cx="13" cy="15" r="2.4" fill="currentColor" stroke="none" opacity={0.55} />
    <path d="M5 21.5c5.8 2.4 12.2 2.4 18 0" />
    <path d="M20.5 18.5l1.8 3.7 3.7-1" opacity={0} />
  </svg>
);
const TwinShapesIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <path d="M14 3.5v21" strokeDasharray="2 3" opacity={0.5} />
    <path d="M11 8L5 12l3 8 3-2z" />
    <path d="M17 8l6 4-3 8-3-2z" opacity={0.55} />
  </svg>
);

const GAME_ICONS: Record<string, FC<P>> = {
  "reaction-time": ReactionIcon,
  "sequence-memory": SequenceIcon,
  "aim-trainer": AimIcon,
  "number-memory": NumberIcon,
  "verbal-memory": VerbalIcon,
  "chimp-test": ChimpIcon,
  "visual-memory": VisualIcon,
  "typing-test": TypingIcon,
  "odd-one-out": OddOneIcon,
  "color-trap": ColorTrapIcon,
  "quick-math": QuickMathIcon,
  "memory-pairs": PairsIcon,
  "rhythm-keeper": RhythmIcon,
  "perfect-stop": PerfectStopIcon,
  "pursuit": PursuitIcon,
  "number-hunt": NumberHuntIcon,
  "speed-match": SpeedMatchIcon,
  "trail-path": TrailIcon,
  "flash-count": FlashCountIcon,
  "twin-shapes": TwinShapesIcon,
};

export function GameIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = GAME_ICONS[slug] ?? BrainMark;
  return <Icon className={className} aria-hidden />;
}

/* ── Iconos de UI ── */
export const FlameIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <path d="M14 3.5c1 3.4-.6 5-2.3 6.8C9.8 12.3 8 14.2 8 17.3c0 3.8 2.7 6.5 6 6.5s6-2.7 6-6.5c0-2.2-.8-4-2-5.8-.6 1.3-1.4 2-2.4 2.4.4-3.5-.2-7-1.6-10.4z" />
  </svg>
);
export const TrophyIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <path d="M9 4.5h10v6a5 5 0 01-10 0v-6z" />
    <path d="M9 6.5H5.5v1.8c0 2 1.5 3.6 3.5 3.9M19 6.5h3.5v1.8c0 2-1.5 3.6-3.5 3.9" opacity={0.7} />
    <path d="M14 15.5v4M10 23.5h8M11.5 19.5h5l.8 4h-6.6l.8-4z" />
  </svg>
);
export const ChartIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <path d="M4 4v19h20" />
    <path d="M9 18v-5M14.5 18V9M20 18v-7" opacity={0.8} />
  </svg>
);
export const MissionIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <path d="M9 5h13v12H9z" opacity={0} />
    <path d="M6 3.5v21" />
    <path d="M6 5h13.5l-2.6 4 2.6 4H6" />
  </svg>
);
export const LogoutIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <path d="M12 4.5H6.5v19H12" />
    <path d="M17 9l5 5-5 5M22 14H10" opacity={0.85} />
  </svg>
);
export const HeartIcon: FC<P & { filled?: boolean }> = ({ filled, ...p }) => (
  <svg {...base(p)} fill={filled ? "currentColor" : "none"}>
    <path d="M14 23s-9.5-5.8-9.5-12A5.3 5.3 0 0114 8a5.3 5.3 0 019.5 3c0 6.2-9.5 12-9.5 12z" />
  </svg>
);
export const CheckIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <path d="M5 15l5.5 5.5L23 8" />
  </svg>
);
export const XIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <path d="M7 7l14 14M21 7L7 21" />
  </svg>
);
export const SoundOnIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <path d="M4 11v6h4.5L14 22V6l-5.5 5H4z" />
    <path d="M17.5 10.5a5 5 0 010 7M20.5 8a9 9 0 010 12" opacity={0.7} />
  </svg>
);
export const SoundOffIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <path d="M4 11v6h4.5L14 22V6l-5.5 5H4z" />
    <path d="M18 11l6 6M24 11l-6 6" opacity={0.8} />
  </svg>
);
export const LaurelIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <circle cx="14" cy="13" r="8.5" />
    <path d="M6.8 18.5c-1.8 1.2-2.6 2.6-2.8 4.5 2 .1 3.6-.4 5-1.6" opacity={0.7} />
    <path d="M21.2 18.5c1.8 1.2 2.6 2.6 2.8 4.5-2 .1-3.6-.4-5-1.6" opacity={0.7} />
    <path d="M14 8.5l1.3 2.6 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4z" fill="currentColor" stroke="none" opacity={0.9} />
  </svg>
);

/** Medallón de nivel: anillo doble con número serif adentro. */
export function LevelMedallion({ level, className }: { level: number; className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full border-2 border-amber-500 bg-amber-50",
        className ?? "h-16 w-16",
      )}
      aria-label={`Nivel ${level}`}
    >
      <span className="absolute inset-1 rounded-full border border-amber-500/40" />
      <span className="font-display text-2xl font-bold text-ink-900">{level}</span>
    </span>
  );
}
export const SparkIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <path d="M14 3l2.2 7L23 12l-6.8 2L14 21l-2.2-7L5 12l6.8-2z" />
  </svg>
);
export const UsersIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <circle cx="10" cy="10" r="4" />
    <path d="M3.5 23c.8-4 3.4-6 6.5-6s5.7 2 6.5 6" />
    <circle cx="20" cy="9" r="3" opacity={0.6} />
    <path d="M19 16.8c2.6.3 4.7 2 5.5 5.2" opacity={0.6} />
  </svg>
);
export const ScreenIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <rect x="3" y="4.5" width="22" height="14" rx="2.5" />
    <path d="M10 23.5h8M14 18.5v5" />
  </svg>
);
export const CompareIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <path d="M14 3.5v21" opacity={0.5} />
    <path d="M8 7.5L3 15a4.5 4.5 0 009 0L8 7.5zM8 7.5h12" />
    <path d="M20 7.5L15 15a4.5 4.5 0 009 0l-4-7.5z" />
  </svg>
);
export const ArrowRightIcon: FC<P> = (p) => (
  <svg {...base(p)}>
    <path d="M5 14h18M16 7l7 7-7 7" />
  </svg>
);

/* ── Monograma: avatar sin emoji (inicial + color determinístico) ── */
const MONO_PALETTES = [
  "bg-blue-100 text-blue-600",
  "bg-emerald-100 text-emerald-600",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-600",
  "bg-cyan-100 text-cyan-600",
  "bg-brand-100 text-brand-700",
];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Monogram({
  name,
  seed,
  className,
}: {
  name: string;
  seed?: string;
  className?: string;
}) {
  const palette = MONO_PALETTES[hashCode(seed ?? name) % MONO_PALETTES.length]!;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center rounded-full font-display font-bold",
        palette,
        className ?? "h-10 w-10 text-lg",
      )}
    >
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}
