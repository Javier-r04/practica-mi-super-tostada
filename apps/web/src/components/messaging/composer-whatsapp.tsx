"use client";

import {
  Alert,
  Button,
  Description,
  Input,
  Label,
  ListBox,
  Select,
  Spinner,
  TextArea,
  TextField,
} from "@heroui/react";
import { useState } from "react";
import {
  extraerCuerpoPlantilla,
  renderCuerpoPlantilla,
  validarParametrosPlantilla,
  type ConversacionDetalle,
  type PlantillaWaPublica,
} from "@misupertostada/shared";
import { Send, Sparkles } from "lucide-react";
import { MensajePreview } from "@/components/domain/mensaje-preview";

/** Recorta o rellena los parámetros al número de variables de la plantilla. */
function ajustarParams(params: string[], nVars: number): string[] {
  const next = params.slice(0, nVars);
  while (next.length < nVars) next.push("");
  return next;
}

export function ComposerWhatsapp({
  conversacion,
  plantillas,
  puedeEnviar,
  enviando,
  onEnviarTexto,
  onEnviarPlantilla,
}: {
  conversacion: ConversacionDetalle;
  plantillas: PlantillaWaPublica[];
  puedeEnviar: boolean;
  enviando: boolean;
  onEnviarTexto: (cuerpo: string) => void;
  onEnviarPlantilla: (input: {
    plantillaId: string;
    params: string[];
    cuerpoRenderizado: string;
  }) => void;
}) {
  const aprobadas = plantillas.filter((p) => p.status === "APPROVED");
  const [cuerpo, setCuerpo] = useState("");
  const [plantillaId, setPlantillaId] = useState(aprobadas[0]?.id ?? "");
  const [params, setParams] = useState<string[]>([]);

  const seleccionada =
    aprobadas.find((p) => p.id === plantillaId) ?? aprobadas[0];
  const plantillaCuerpo = seleccionada
    ? extraerCuerpoPlantilla(seleccionada.componentes)
    : "";
  // Sin useMemo: son un conteo sobre una cadena corta y un slice de pocos
  // elementos, y las dependencias venían de `aprobadas`, que se recrea en cada
  // render — la memoización no se sostenía y el compilador la descartaba.
  const nVars = contarVariables(plantillaCuerpo);
  const paramsAjustados = ajustarParams(params, nVars);
  const renderizado = renderCuerpoPlantilla(plantillaCuerpo, paramsAjustados);
  const validacion = validarParametrosPlantilla(paramsAjustados);

  if (!puedeEnviar) {
    return (
      <p className="text-sm text-tinta-500">
        Puede leer el hilo. Enviar WhatsApp es de administración.
      </p>
    );
  }

  if (conversacion.ventanaAbierta) {
    return (
      <div className="grid gap-3">
        <TextField value={cuerpo} onChange={setCuerpo}>
          <Label>Mensaje</Label>
          <TextArea rows={3} placeholder="Escriba el mensaje…" />
          <Description>
            Ventana abierta: puede redactar con desglose completo.
          </Description>
        </TextField>

        {cuerpo.trim() ? (
          <MensajePreview tipo="libre" cuerpo={cuerpo} hora="ahora" />
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          {/* Sigue apagado; el rótulo dice por qué en vez de dejarlo mudo. */}
          <Button
            className="w-full sm:w-auto"
            isDisabled
            size="sm"
            variant="ghost"
          >
            <Sparkles size={15} aria-hidden />
            Redactar con IA · pronto
          </Button>
          <Button
            className="w-full sm:w-auto"
            isDisabled={!cuerpo.trim()}
            isPending={enviando}
            size="sm"
            variant="primary"
            onPress={() => onEnviarTexto(cuerpo)}
          >
            {({ isPending }) => (
              <>
                {isPending ? (
                  <Spinner color="current" size="sm" />
                ) : (
                  <Send size={15} aria-hidden />
                )}
                Enviar
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {/* La ventana cerrada es la causa número uno de envíos fallidos: va como
          Alert del sistema, con el código que devuelve Meta. */}
      <Alert status="warning">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Ventana de 24 h cerrada</Alert.Title>
          <Alert.Description>
            Solo plantillas aprobadas. Meta responde 131047 a cualquier texto
            libre.
          </Alert.Description>
        </Alert.Content>
      </Alert>

      {aprobadas.length === 0 ? (
        <p className="text-sm text-tinta-500">
          No hay plantillas aprobadas. Sincronice el registro o use el modo
          desarrollo.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Select
              className="min-w-0 flex-1"
              placeholder="Elija una plantilla"
              selectedKey={seleccionada?.id ?? null}
              onSelectionChange={(key) => {
                if (typeof key !== "string") return;
                setPlantillaId(key);
                setParams([]);
              }}
            >
              <Label>Plantilla aprobada</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox aria-label="Plantillas aprobadas">
                  {aprobadas.map((p) => (
                    <ListBox.Item key={p.id} id={p.id} textValue={p.name}>
                      <div className="flex min-w-0 flex-col">
                        <Label>{p.name}</Label>
                        <Description>{p.category.toLowerCase()}</Description>
                      </div>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <Button
              className="w-full shrink-0 sm:w-auto"
              isDisabled={!seleccionada || !validacion.ok}
              isPending={enviando}
              size="md"
              variant="primary"
              onPress={() => {
                if (!seleccionada || !validacion.ok) return;
                onEnviarPlantilla({
                  plantillaId: seleccionada.id,
                  params: paramsAjustados,
                  cuerpoRenderizado: renderizado,
                });
              }}
            >
              {({ isPending }) => (
                <>
                  {isPending ? (
                    <Spinner color="current" size="sm" />
                  ) : (
                    <Send size={15} aria-hidden />
                  )}
                  Enviar plantilla
                </>
              )}
            </Button>
          </div>

          {nVars > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {paramsAjustados.map((valor, i) => (
                <TextField
                  key={i}
                  value={valor}
                  onChange={(next) => {
                    const copia = [...paramsAjustados];
                    copia[i] = next;
                    setParams(copia);
                  }}
                >
                  <Label>{`Variable {{${i + 1}}}`}</Label>
                  <Input />
                </TextField>
              ))}
            </div>
          ) : null}

          {!validacion.ok && paramsAjustados.some((p) => p.length > 0) ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Revise las variables</Alert.Title>
                <Alert.Description>{validacion.mensaje}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          <MensajePreview
            tipo="plantilla"
            plantilla={seleccionada?.name}
            cuerpo={renderizado || plantillaCuerpo}
            hora="ahora"
          />
        </>
      )}
    </div>
  );
}

function contarVariables(cuerpo: string): number {
  let max = 0;
  for (const m of cuerpo.matchAll(/\{\{(\d+)\}\}/g)) {
    max = Math.max(max, Number(m[1]));
  }
  return max;
}
