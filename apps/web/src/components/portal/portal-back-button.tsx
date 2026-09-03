"use client";

import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { ChevronLeft } from "lucide-react";

/**
 * Mismo control que en reparto: pastilla gris, área de pulgar, chevron.
 *
 * Con `href` navega; con `onPress` decide quien llama (el catálogo vuelve por
 * el historial para no perder el scroll de la lista).
 */
export function PortalBackButton({
  href,
  label,
  onPress,
}: {
  href?: string;
  label: string;
  onPress?: () => void;
}) {
  const router = useRouter();
  return (
    <Button
      className="self-start"
      size="lg"
      variant="tertiary"
      onPress={() => {
        if (onPress) onPress();
        else if (href) router.push(href);
      }}
    >
      <ChevronLeft size={18} aria-hidden />
      {label}
    </Button>
  );
}
