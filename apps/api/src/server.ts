import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { env } from "./env";
import { logger } from "./core/logger";
import { errorHandler } from "./core/errors";
import { authRouter } from "./modules/auth/routes";
import { benchmarksRouter } from "./modules/benchmarks/routes";
import { attemptsRouter } from "./modules/attempts/routes";
import { profileRouter } from "./modules/profile/routes";
import { leaderboardsRouter } from "./modules/leaderboards/routes";
import { rosterRouter } from "./modules/roster/routes";
import { institutionsRouter } from "./modules/institutions/routes";
import { classSessionsRouter } from "./modules/classSessions/routes";
import { analyticsRouter } from "./modules/analytics/routes";
import { exportsRouter } from "./modules/exports/routes";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: "4mb" })); // eventos en batch
app.use(cookieParser());
app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req) => req.url === "/health" },
  }),
);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// API v1 — módulos por dominio (doc 02 §4)
app.use("/v1/auth", authRouter);
app.use("/v1/benchmarks", benchmarksRouter);
app.use("/v1/attempts", attemptsRouter);
app.use("/v1/me", profileRouter);
app.use("/v1/leaderboards", leaderboardsRouter);
app.use("/v1/roster", rosterRouter);
app.use("/v1/institutions", institutionsRouter);
app.use("/v1/class-sessions", classSessionsRouter);
app.use("/v1/analytics", analyticsRouter);
app.use("/v1/exports", exportsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: { code: "not_found", message: "Ruta inexistente" } });
});
app.use(errorHandler);

app.listen(env.API_PORT, () => {
  logger.info(`API MenteLab escuchando en http://localhost:${env.API_PORT}`);
});
