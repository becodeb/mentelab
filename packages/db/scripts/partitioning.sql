-- ═══════════════════════════════════════════════════════════════════
-- MenteLab — Particionado de attempts / attempt_events para PRODUCCIÓN
-- (doc 03 §2). Ejecutar UNA VEZ al desplegar a escala, en mantenimiento.
--
-- En desarrollo las tablas son planas (Prisma las gestiona). Este script
-- las convierte a particionadas por RANGE mensual sobre startedAt.
-- Los agregados y Redis son derivados: no requieren cambios.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- 1. attempts particionada ------------------------------------------------
ALTER TABLE attempts RENAME TO attempts_old;

CREATE TABLE attempts (LIKE attempts_old INCLUDING DEFAULTS INCLUDING CONSTRAINTS)
  PARTITION BY RANGE ("startedAt");

-- La PK de una tabla particionada debe incluir la clave de partición.
ALTER TABLE attempts ADD PRIMARY KEY (id, "startedAt");

CREATE INDEX attempts_player_bench_idx
  ON attempts ("playerId", "benchmarkSlug", "startedAt" DESC);
CREATE INDEX attempts_inst_bench_idx
  ON attempts ("institutionId", "benchmarkSlug", "startedAt" DESC)
  WHERE status = 'COMPLETED';
CREATE INDEX attempts_class_bench_idx
  ON attempts ("classroomId", "benchmarkSlug", "startedAt" DESC)
  WHERE status = 'COMPLETED';
CREATE INDEX attempts_scope_bench_idx
  ON attempts (scope, "benchmarkSlug", "startedAt" DESC);
CREATE INDEX attempts_started_brin ON attempts USING brin ("startedAt");

-- 2. attempt_events particionada ------------------------------------------
-- Se agrega startedAt (copiada del intento) como clave de partición.
ALTER TABLE attempt_events RENAME TO attempt_events_old;

CREATE TABLE attempt_events (
  "attemptId" uuid NOT NULL,
  seq integer NOT NULL,
  "tMs" double precision NOT NULL,
  type text NOT NULL,
  payload jsonb,
  "startedAt" timestamptz NOT NULL,
  PRIMARY KEY ("attemptId", seq, "startedAt")
) PARTITION BY RANGE ("startedAt");

CREATE INDEX attempt_events_brin ON attempt_events USING brin ("startedAt");

-- 3. Función para crear particiones mensuales ------------------------------
CREATE OR REPLACE FUNCTION create_monthly_partitions(from_month date, months int)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  m date;
  part_start date;
  part_end date;
  suffix text;
BEGIN
  FOR i IN 0..months-1 LOOP
    m := date_trunc('month', from_month) + (i || ' months')::interval;
    part_start := m;
    part_end := m + interval '1 month';
    suffix := to_char(m, 'YYYY_MM');
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS attempts_%s PARTITION OF attempts FOR VALUES FROM (%L) TO (%L)',
      suffix, part_start, part_end);
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS attempt_events_%s PARTITION OF attempt_events FOR VALUES FROM (%L) TO (%L)',
      suffix, part_start, part_end);
  END LOOP;
END $$;

-- Particiones: 12 meses hacia atrás y 12 hacia adelante.
SELECT create_monthly_partitions((now() - interval '12 months')::date, 25);

-- 4. Migrar datos existentes ------------------------------------------------
INSERT INTO attempts SELECT * FROM attempts_old;

INSERT INTO attempt_events ("attemptId", seq, "tMs", type, payload, "startedAt")
SELECT e."attemptId", e.seq, e."tMs", e.type, e.payload, a."startedAt"
FROM attempt_events_old e
JOIN attempts_old a ON a.id = e."attemptId";

DROP TABLE attempt_events_old;
DROP TABLE attempts_old;

COMMIT;

-- 5. Mantenimiento: programar mensualmente (pg_cron o job externo):
--    SELECT create_monthly_partitions(now()::date, 3);
-- Archivado de un mes viejo:
--    ALTER TABLE attempts DETACH PARTITION attempts_2025_01;
--    (exportar a Parquet y DROP, o mover a almacenamiento frío)
