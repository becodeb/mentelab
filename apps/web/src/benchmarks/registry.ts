"use client";

import dynamic from "next/dynamic";
import type { GameComponent } from "./shell/types";

/**
 * Registro de componentes de juego por slug. Carga diferida: el hub no
 * descarga los 8 juegos (doc 09 §4). Para agregar un benchmark nuevo:
 * crear el componente en games/ y agregarlo acá (+ lógica en packages/benchmarks).
 */
export const gameComponents: Record<string, GameComponent> = {
  "reaction-time": dynamic(() =>
    import("./games/ReactionTimeGame").then((m) => m.ReactionTimeGame),
  ) as GameComponent,
  "sequence-memory": dynamic(() =>
    import("./games/SequenceMemoryGame").then((m) => m.SequenceMemoryGame),
  ) as GameComponent,
  "aim-trainer": dynamic(() =>
    import("./games/AimTrainerGame").then((m) => m.AimTrainerGame),
  ) as GameComponent,
  "number-memory": dynamic(() =>
    import("./games/NumberMemoryGame").then((m) => m.NumberMemoryGame),
  ) as GameComponent,
  "verbal-memory": dynamic(() =>
    import("./games/VerbalMemoryGame").then((m) => m.VerbalMemoryGame),
  ) as GameComponent,
  "chimp-test": dynamic(() =>
    import("./games/ChimpTestGame").then((m) => m.ChimpTestGame),
  ) as GameComponent,
  "visual-memory": dynamic(() =>
    import("./games/VisualMemoryGame").then((m) => m.VisualMemoryGame),
  ) as GameComponent,
  "typing-test": dynamic(() =>
    import("./games/TypingTestGame").then((m) => m.TypingTestGame),
  ) as GameComponent,
};
