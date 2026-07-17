/** Contrato entre el GameShell y cada componente de juego. */
export interface GameProps<TConfig = unknown> {
  config: TConfig;
  /** Registra un evento crudo con timestamp automático (performance.now). */
  emit: (type: string, payload?: Record<string, unknown>) => void;
  /** ms de alta resolución desde game_start. */
  now: () => number;
  /** El juego terminó: el shell envía todo al servidor y muestra resultados. */
  finish: () => void;
}

export type GameComponent = React.ComponentType<GameProps>;
