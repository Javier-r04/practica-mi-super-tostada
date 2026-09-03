"use client";

import { Alert, Button, Card, Spinner } from "@heroui/react";
import { RotateCw, Unlink, WifiOff } from "lucide-react";
import { ApiError } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";

/*
 * El portal se abre desde un teléfono con señal irregular. Un fetch que se cae
 * no es un caso raro: es el caso normal. Hay que distinguir dos cosas que se
 * ven igual en el código y no se parecen en nada para el cliente:
 *
 *   - Enlace muerto (token rotado o revocado): callejón sin salida. Se responde
 *     404 genérico a propósito, sin filtrar si el cliente existe.
 *   - Fallo pasajero (red caída, timeout de 15 s): se reintenta y ya.
 *
 * `api()` solo lanza `ApiError` cuando el servidor contestó. Un corte de red
 * lanza `TypeError` y el timeout un `TimeoutError`; ninguno es `ApiError`, así
 * que tratar solo esa clase deja al cliente frente a una pantalla vacía.
 */
export function esEnlaceInvalido(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.status === 401);
}

function mensajeDe(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Revise su conexión e inténtelo de nuevo.";
}

/** Pantalla completa: el chrome del portal todavía no se pudo montar. */
export function PortalErrorPantalla({
  error,
  onReintentar,
  reintentando = false,
}: {
  error: unknown;
  onReintentar: () => void;
  reintentando?: boolean;
}) {
  const invalido = esEnlaceInvalido(error);

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-[var(--surface-page)] p-6">
      <Card className="w-full max-w-sm p-0">
        {invalido ? (
          <EmptyState
            icon={<Unlink size={22} aria-hidden />}
            title="No encontramos esa página"
            description="El enlace no es válido o ya no está activo. Pida uno nuevo a la fábrica."
          />
        ) : (
          <EmptyState
            icon={<WifiOff size={22} aria-hidden />}
            title="No pudimos cargar su portal"
            description={mensajeDe(error)}
            action={
              <Button
                isPending={reintentando}
                size="lg"
                variant="primary"
                onPress={onReintentar}
              >
                {({ isPending }) => (
                  <>
                    {isPending ? (
                      <Spinner color="current" size="sm" />
                    ) : (
                      <RotateCw size={18} aria-hidden />
                    )}
                    Reintentar
                  </>
                )}
              </Button>
            }
          />
        )}
      </Card>
    </div>
  );
}

/** Aviso dentro de una página que sí tiene chrome. */
export function PortalErrorAviso({
  error,
  titulo,
  onReintentar,
  reintentando = false,
}: {
  error: unknown;
  titulo: string;
  onReintentar?: () => void;
  reintentando?: boolean;
}) {
  return (
    <Alert status="danger">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{titulo}</Alert.Title>
        <Alert.Description>{mensajeDe(error)}</Alert.Description>
        {onReintentar ? (
          <div className="mt-3">
            <Button
              isPending={reintentando}
              size="sm"
              variant="secondary"
              onPress={onReintentar}
            >
              {({ isPending }) => (
                <>
                  {isPending ? (
                    <Spinner color="current" size="sm" />
                  ) : (
                    <RotateCw size={16} aria-hidden />
                  )}
                  Reintentar
                </>
              )}
            </Button>
          </div>
        ) : null}
      </Alert.Content>
    </Alert>
  );
}
