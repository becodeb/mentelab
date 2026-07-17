"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { benchmarkRegistry } from "@mentelab/benchmarks";
import { gameComponents } from "@/benchmarks/registry";
import { GameShell } from "@/benchmarks/shell/GameShell";
import { useEnsurePlayer } from "@/features/player/hooks";
import { Spinner } from "@/components/ui";

export default function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { ready, isLoading } = useEnsurePlayer();

  if (!benchmarkRegistry.has(slug)) notFound();
  const Game = gameComponents[slug];
  if (!Game) notFound();

  if (!ready && isLoading) return <Spinner label="Preparando…" />;
  return <GameShell slug={slug} Game={Game} />;
}
