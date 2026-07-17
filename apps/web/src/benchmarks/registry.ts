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
  "odd-one-out": dynamic(() =>
    import("./games/OddOneOutGame").then((m) => m.OddOneOutGame),
  ) as GameComponent,
  "color-trap": dynamic(() =>
    import("./games/ColorTrapGame").then((m) => m.ColorTrapGame),
  ) as GameComponent,
  "quick-math": dynamic(() =>
    import("./games/QuickMathGame").then((m) => m.QuickMathGame),
  ) as GameComponent,
  "memory-pairs": dynamic(() =>
    import("./games/MemoryPairsGame").then((m) => m.MemoryPairsGame),
  ) as GameComponent,
  "rhythm-keeper": dynamic(() =>
    import("./games/RhythmKeeperGame").then((m) => m.RhythmKeeperGame),
  ) as GameComponent,
  "perfect-stop": dynamic(() =>
    import("./games/PerfectStopGame").then((m) => m.PerfectStopGame),
  ) as GameComponent,
  "pursuit": dynamic(() =>
    import("./games/PursuitGame").then((m) => m.PursuitGame),
  ) as GameComponent,
  "number-hunt": dynamic(() =>
    import("./games/NumberHuntGame").then((m) => m.NumberHuntGame),
  ) as GameComponent,
  "speed-match": dynamic(() =>
    import("./games/SpeedMatchGame").then((m) => m.SpeedMatchGame),
  ) as GameComponent,
  "trail-path": dynamic(() =>
    import("./games/TrailPathGame").then((m) => m.TrailPathGame),
  ) as GameComponent,
  "flash-count": dynamic(() =>
    import("./games/FlashCountGame").then((m) => m.FlashCountGame),
  ) as GameComponent,
  "twin-shapes": dynamic(() =>
    import("./games/TwinShapesGame").then((m) => m.TwinShapesGame),
  ) as GameComponent,
};
