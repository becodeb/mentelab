import { Router } from "express";
import { serializeCatalog } from "@mentelab/benchmarks";

export const benchmarksRouter: ReturnType<typeof Router> = Router();

/** Catálogo del registry: la única fuente de verdad de los juegos disponibles. */
benchmarksRouter.get("/", (_req, res) => {
  res.json({ benchmarks: serializeCatalog() });
});
