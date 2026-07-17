import type { DeviceInfo } from "@mentelab/shared";

/** Información del dispositivo para calidad del dato (doc 03). */
export function collectDeviceInfo(inputType: DeviceInfo["inputType"]): DeviceInfo {
  if (typeof window === "undefined") {
    return { deviceType: "unknown", inputType: "unknown" };
  }
  const ua = navigator.userAgent;
  const isTablet = /iPad|Tablet|Android(?!.*Mobile)/i.test(ua);
  const isMobile = /Mobi|Android.*Mobile|iPhone/i.test(ua);
  return {
    browser: ua.slice(0, 180),
    os: navigator.platform?.slice(0, 90) ?? undefined,
    deviceType: isTablet ? "tablet" : isMobile ? "mobile" : "desktop",
    screenW: window.screen.width,
    screenH: window.screen.height,
    dpr: window.devicePixelRatio,
    inputType,
  };
}

/** localStorage seguro (SSR / modo privado). */
export const storage = {
  get(key: string): string | null {
    try {
      return typeof window === "undefined" ? null : window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(key, value);
    } catch {
      /* modo privado */
    }
  },
  remove(key: string): void {
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(key);
    } catch {
      /* */
    }
  },
};

/** Curso recordado del dispositivo (tablets de aula fijadas al curso). */
export const REMEMBERED_CLASS_KEY = "ml_class_code";
/** UUID anónimo del Modo Libre (doc 03 §5). */
export const DEVICE_UUID_KEY = "ml_device_uuid";

export function getOrCreateDeviceUuid(): string {
  let uuid = storage.get(DEVICE_UUID_KEY);
  if (!uuid) {
    uuid = crypto.randomUUID();
    storage.set(DEVICE_UUID_KEY, uuid);
  }
  return uuid;
}
