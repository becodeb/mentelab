"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { REMEMBERED_CLASS_KEY, storage } from "@/lib/device";
import { Spinner } from "@/components/ui";

/** Llegada por QR proyectado: recuerda el curso en el dispositivo y va al login. */
export default function JoinPage({ params }: { params: Promise<{ classCode: string }> }) {
  const { classCode } = use(params);
  const router = useRouter();
  useEffect(() => {
    storage.set(REMEMBERED_CLASS_KEY, classCode.toUpperCase());
    router.replace("/login");
  }, [classCode, router]);
  return <Spinner label="Entrando a tu clase…" />;
}
