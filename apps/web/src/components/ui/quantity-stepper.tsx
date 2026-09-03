"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const sizes = {
  md: { wrap: "h-11", btn: "size-11" },
  lg: { wrap: "h-[52px]", btn: "size-[52px]" },
};

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  unidad,
  disabled = false,
  size = "md",
  variant = "boxed",
  editableOnClick = true,
  showAddWhenZero = false,
  addLabel = "Agregar",
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unidad?: string;
  disabled?: boolean;
  size?: "md" | "lg";
  /** `plain`: botones sueltos, sin caja. El catálogo del portal lo usa. */
  variant?: "boxed" | "plain";
  /** Al tocar el valor, abre un campo numérico para cantidades grandes. */
  editableOnClick?: boolean;
  /** Si el valor es min/cero, muestra un botón limpio "+ Agregar". */
  showAddWhenZero?: boolean;
  addLabel?: string;
  className?: string;
}) {
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  // Fuera de edición, el borrador es el valor. Se sincroniza al renderizar en
  // vez de en un efecto: un `setState` dentro de `useEffect` encadena renders
  // y aquí el dato no viene de ningún sistema externo.
  const [valorPrevio, setValorPrevio] = useState(value);
  if (valorPrevio !== value) {
    setValorPrevio(value);
    if (!editando) setBorrador(String(value));
  }

  const set = (next: number) => {
    const clamped = Math.min(max, Math.max(min, Math.trunc(next)));
    onChange(clamped);
  };

  /* De uno en uno. Para cantidades grandes se escribe el número en el campo,
     que por eso tiene aspecto de campo y no de etiqueta. */
  const sumar = () => set(value + 1);
  const restar = () => set(value - 1);

  const s = sizes[size];
  const puedeEditar = editableOnClick && !disabled;
  const activo = value > min;
  const btnPlain = cn(
    "grid shrink-0 place-items-center rounded-full text-lg font-semibold",
    "transition-colors duration-control ease-out",
    "focus-visible:outline-none focus-visible:shadow-foco",
    "disabled:cursor-not-allowed disabled:opacity-40",
    s.btn,
  );

  useEffect(() => {
    if (!editando) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editando]);

  const confirmar = () => {
    const limpio = borrador.trim();
    if (limpio === "") {
      set(min);
    } else {
      const parsed = Number.parseInt(limpio, 10);
      if (Number.isNaN(parsed)) {
        setBorrador(String(value));
      } else {
        set(parsed);
      }
    }
    setEditando(false);
  };

  const cancelar = () => {
    setBorrador(String(value));
    setEditando(false);
  };

  const iniciarEdicion = () => {
    if (!puedeEditar) return;
    setBorrador(String(value));
    setEditando(true);
  };

  const valor = editando ? (
    <input
      ref={inputRef}
      type="text"
      size={1}
      maxLength={4}
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={unidad ? `Cantidad en ${unidad}` : "Cantidad"}
      value={borrador}
      onChange={(e) => setBorrador(e.target.value.replace(/\D/g, "").slice(0, 4))}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          confirmar();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancelar();
        }
      }}
      className={
        variant === "plain"
          ? "box-border h-full w-full min-w-0 max-w-full bg-transparent px-0 text-center text-base font-bold tabular-nums text-tinta-900 outline-none focus:outline-none focus:ring-0 sm:text-sm"
          : "mst-quantity-stepper__input"
      }
      style={{ width: "100%", maxWidth: "100%" }}
    />
  ) : puedeEditar ? (
    <button
      type="button"
      aria-label={unidad ? `Editar cantidad en ${unidad}` : "Editar cantidad"}
      onClick={iniciarEdicion}
      className={
        variant === "plain"
          ? "flex h-full w-full cursor-text flex-col items-center justify-center"
          : "mst-quantity-stepper__trigger"
      }
    >
      <span
        className={cn(
          variant === "plain"
            ? "text-[16px] font-bold tabular-nums leading-none"
            : "mst-quantity-stepper__num font-bold",
          activo && "text-marca",
        )}
      >
        {value}
      </span>
      {unidad && variant !== "plain" ? (
        <span className="mst-quantity-stepper__unit">{unidad}</span>
      ) : null}
    </button>
  ) : (
    <div
      className={
        variant === "plain"
          ? "flex h-full w-full flex-col items-center justify-center"
          : "mst-quantity-stepper__trigger cursor-default"
      }
    >
      <span
        className={cn(
          variant === "plain"
            ? "text-[16px] font-bold tabular-nums leading-none text-tinta-900"
            : "mst-quantity-stepper__num font-bold"
        )}
      >
        {value}
      </span>
      {unidad && variant !== "plain" ? (
        <span className="mst-quantity-stepper__unit">{unidad}</span>
      ) : null}
    </div>
  );

  if (showAddWhenZero && value <= min) {
    return (
      <button
        type="button"
        disabled={disabled}
        aria-label={unidad ? `Agregar ${unidad}` : "Agregar"}
        onClick={() => set(min + 1)}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-pill border border-[var(--green-700)] bg-blanco px-3.5 text-xs font-bold text-[var(--green-800)] shadow-xs transition-all duration-control ease-out hover:bg-[var(--green-50)] active:scale-95",
          "focus-visible:outline-none focus-visible:shadow-foco disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-blanco",
          s.wrap,
          className,
        )}
      >
        <Plus size={16} strokeWidth={2.5} aria-hidden />
        <span>{addLabel}</span>
      </button>
    );
  }

  if (variant === "plain") {
    return (
      <div
        data-editing={editando ? "true" : undefined}
        className={cn(
          "inline-flex items-center gap-2",
          s.wrap,
          disabled && "opacity-45",
          className,
        )}
      >
        <button
          type="button"
          aria-label="Restar"
          disabled={disabled || value <= min}
          onClick={restar}
          className={cn(
            btnPlain,
            "bg-tinta-100 text-tinta-800 hover:bg-tinta-200 active:bg-tinta-200",
          )}
        >
          <Minus size={18} strokeWidth={2.6} aria-hidden />
        </button>
        {/* Caja de campo, no número suelto */}
        <div
          className={cn(
            "grid h-full w-[50px] max-w-[50px] min-w-0 shrink-0 place-items-center overflow-hidden rounded-campo border bg-blanco px-0.5 shadow-xs",
            "transition-colors duration-control ease-out",
            editando
              ? "border-[var(--border-focus)] shadow-xs"
              : activo
                ? "border-[var(--green-400)]"
                : "border-[var(--border-default)]",
          )}
        >
          {valor}
        </div>
        <button
          type="button"
          aria-label="Sumar"
          disabled={disabled || value >= max}
          onClick={sumar}
          className={cn(
            btnPlain,
            activo
              ? "bg-[var(--green-800)] text-blanco hover:bg-[var(--green-700)] active:bg-[var(--green-700)] shadow-xs"
              : "bg-tinta-100 text-tinta-800 hover:bg-tinta-200 active:bg-tinta-200",
          )}
        >
          <Plus size={18} strokeWidth={2.6} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div
      data-editing={editando ? "true" : undefined}
      className={cn(
        "mst-quantity-stepper inline-flex overflow-hidden rounded-campo border border-[var(--border-default)] bg-blanco",
        size === "lg" ? "mst-quantity-stepper--lg" : "mst-quantity-stepper--md",
        activo && !editando && "border-[var(--green-300)]",
        s.wrap,
        disabled && "opacity-45",
        "max-w-full",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Restar"
        disabled={disabled || value <= min}
        onClick={restar}
        className={cn(
          "grid shrink-0 place-items-center text-marca disabled:cursor-not-allowed disabled:text-tinta-500",
          "transition-colors duration-control ease-out",
          "hover:bg-[var(--green-50)] active:bg-[var(--green-100)]",
          "disabled:hover:bg-transparent disabled:active:bg-transparent",
          "focus-visible:outline-none focus-visible:shadow-foco",
          s.btn,
        )}
      >
        <Minus size={18} strokeWidth={2.6} aria-hidden />
      </button>

      <div className="mst-quantity-stepper__value">{valor}</div>

      <button
        type="button"
        aria-label="Sumar"
        disabled={disabled || value >= max}
        onClick={sumar}
        className={cn(
          "grid shrink-0 place-items-center text-marca disabled:cursor-not-allowed disabled:text-tinta-500",
          "transition-colors duration-control ease-out",
          "hover:bg-[var(--green-50)] active:bg-[var(--green-100)]",
          "disabled:hover:bg-transparent disabled:active:bg-transparent",
          "focus-visible:outline-none focus-visible:shadow-foco",
          s.btn,
        )}
      >
        <Plus size={18} strokeWidth={2.6} aria-hidden />
      </button>
    </div>
  );
}
