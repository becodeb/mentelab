import type { CompleteAttemptInput } from "@mentelab/shared";
import { api } from "./api";

/**
 * Outbox pattern (doc 02 §5): si el envío del intento falla por red
 * (WiFi escolar inestable), el paquete queda en IndexedDB y se reintenta.
 * El attemptId hace la operación idempotente: reintentos no duplican.
 */
const DB_NAME = "mentelab-outbox";
const STORE = "pending";

interface PendingComplete {
  attemptId: string;
  body: CompleteAttemptInput;
  queuedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "attemptId" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueComplete(attemptId: string, body: CompleteAttemptInput): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ attemptId, body, queuedAt: Date.now() } satisfies PendingComplete);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* sin IndexedDB: el intento quedó IN_PROGRESS en el server, se pierde el detalle */
  }
}

async function removeFromQueue(attemptId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(attemptId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

/** Reintenta todos los envíos pendientes. Llamar al cargar el hub. */
export async function flushOutbox(): Promise<number> {
  if (typeof indexedDB === "undefined") return 0;
  let sent = 0;
  try {
    const db = await openDb();
    const items = await new Promise<PendingComplete[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result as PendingComplete[]);
      req.onerror = () => reject(req.error);
    });
    for (const item of items) {
      try {
        await api.post(`/v1/attempts/${item.attemptId}/complete`, item.body);
        await removeFromQueue(item.attemptId);
        sent++;
      } catch (e) {
        // 404/409: el intento ya no existe o ya se procesó → descartar.
        if (e instanceof Error && "status" in e && (e as { status: number }).status < 500) {
          await removeFromQueue(item.attemptId);
        }
        // Errores de red: se reintenta la próxima vez.
      }
    }
  } catch {
    /* IndexedDB no disponible */
  }
  return sent;
}
