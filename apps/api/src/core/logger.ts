import pino from "pino";
import { isProd } from "../env";

export const logger = pino({
  level: isProd ? "info" : "debug",
  // Sin PII en logs: los servicios loguean ids, nunca nombres.
  transport: isProd ? undefined : { target: "pino-pretty", options: { colorize: true } },
});
