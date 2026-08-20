import { horaEnZona, type ConversacionBandeja } from "@misupertostada/shared";
import { MessageCircle } from "lucide-react";
import { VentanaBadge } from "@/components/domain/ventana-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { RowSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ListaConversaciones({
  items,
  sel,
  loading,
  onSelect,
}: {
  items: ConversacionBandeja[];
  sel: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  if (loading) return <RowSkeleton rows={8} />;
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<MessageCircle size={22} aria-hidden />}
        title="Sin conversaciones"
        description="El hilo se abre con el primer mensaje, de entrada o de salida."
      />
    );
  }
  return (
    <div className="border-t border-[var(--border-subtle)]">
      {items.map((v) => {
        const activo = v.id === sel;
        const hora = v.ultimoAt ? horaEnZona(new Date(v.ultimoAt)) : "";
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onSelect(v.id)}
            className={cn(
              "grid w-full gap-1 border-b border-[var(--border-subtle)] px-4 py-3 text-left",
              "border-l-[3px] transition-[background-color,border-color] duration-control ease-out",
              activo
                ? "border-l-marca bg-[var(--green-50)]"
                : "border-l-transparent hover:bg-tinta-50",
            )}
          >
            <span className="flex items-center gap-1.5">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-tinta-900">
                {v.clienteNombre}
              </span>
              {v.noLeidos > 0 ? (
                <span className="grid size-[18px] place-items-center rounded-full bg-peligro text-[10px] font-bold text-blanco">
                  {v.noLeidos}
                </span>
              ) : null}
              <span className="text-[11px] tabular-nums text-tinta-500">{hora}</span>
            </span>
            <span className="truncate text-xs text-tinta-500">
              {v.ultimoCuerpo ?? "Sin mensajes"}
            </span>
            <VentanaBadge
              abierta={v.ventanaAbierta}
              tipo="whatsapp"
              expiraAt={v.ventanaExpiraAt}
              size="sm"
            />
          </button>
        );
      })}
    </div>
  );
}
