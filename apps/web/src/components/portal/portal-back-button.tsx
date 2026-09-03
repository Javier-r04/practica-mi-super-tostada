"use client";

import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { ChevronLeft } from "lucide-react";

/** Mismo control que en reparto: pastilla gris, área de pulgar, chevron. */
export function PortalBackButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const router = useRouter();
  return (
    <Button
      className="self-start"
      size="lg"
      variant="tertiary"
      onPress={() => router.push(href)}
    >
      <ChevronLeft size={18} aria-hidden />
      {label}
    </Button>
  );
}
