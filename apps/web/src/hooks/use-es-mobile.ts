import { useEffect, useState } from "react";
import { detectarEsMobile } from "@/lib/dispositivo";

/** Hidrata en cliente; el primer render asume desktop (explorador directo). */
export function useEsMobile(): boolean {
  const [esMobile, setEsMobile] = useState(false);

  useEffect(() => {
    const actualizar = () => setEsMobile(detectarEsMobile());
    actualizar();
    window.addEventListener("resize", actualizar);
    return () => window.removeEventListener("resize", actualizar);
  }, []);

  return esMobile;
}
