"use client";

import { useEffect, useState } from "react";
import { MENSAJE_SIN_SENAL } from "@misupertostada/shared";

export function useOnline(): boolean {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function avisoSinSenal(online: boolean): string | undefined {
  return online ? undefined : MENSAJE_SIN_SENAL;
}
