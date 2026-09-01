"use client";

import { useEffect, useRef, useState } from "react";
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
  editableOnClick = true,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unidad?: string;
  disabled?: boolean;
  size?: "md" | "lg";
  /** Al tocar el valor, abre un campo numérico para cantidades grandes. */
  editableOnClick?: boolean;
  className?: string;
}) {
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  const set = (next: number) => {
    const clamped = Math.min(max, Math.max(min, Math.trunc(next)));
    onChange(clamped);
  };

  const s = sizes[size];
  const puedeEditar = editableOnClick && !disabled;
  const activo = value > min;

  useEffect(() => {
    if (!editando) setBorrador(String(value));
  }, [value, editando]);

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
        onClick={() => set(value - 1)}
        className={cn(
          "grid shrink-0 place-items-center text-lg font-semibold text-marca disabled:cursor-not-allowed disabled:text-tinta-500",
          "transition-colors duration-control ease-out",
          "hover:bg-[var(--green-50)] active:bg-[var(--green-100)]",
          "disabled:hover:bg-transparent disabled:active:bg-transparent",
          "focus-visible:outline-none focus-visible:shadow-foco",
          s.btn,
        )}
      >
        −
      </button>

      <div className="mst-quantity-stepper__value">
        {editando ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label={unidad ? `Cantidad en ${unidad}` : "Cantidad"}
            value={borrador}
            onChange={(e) => setBorrador(e.target.value.replace(/\D/g, ""))}
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
            className="mst-quantity-stepper__input"
          />
        ) : puedeEditar ? (
          <button
            type="button"
            aria-label={unidad ? `Editar cantidad en ${unidad}` : "Editar cantidad"}
            onClick={iniciarEdicion}
            className="mst-quantity-stepper__trigger"
          >
            <span
              className={cn(
                "mst-quantity-stepper__num",
                activo && "text-marca",
              )}
            >
              {value}
            </span>
            {unidad ? (
              <span className="mst-quantity-stepper__unit">{unidad}</span>
            ) : null}
          </button>
        ) : (
          <div className="mst-quantity-stepper__trigger cursor-default">
            <span className="mst-quantity-stepper__num">{value}</span>
            {unidad ? (
              <span className="mst-quantity-stepper__unit">{unidad}</span>
            ) : null}
          </div>
        )}
      </div>

      <button
        type="button"
        aria-label="Sumar"
        disabled={disabled || value >= max}
        onClick={() => set(value + 1)}
        className={cn(
          "grid shrink-0 place-items-center text-lg font-semibold text-marca disabled:cursor-not-allowed disabled:text-tinta-500",
          "transition-colors duration-control ease-out",
          "hover:bg-[var(--green-50)] active:bg-[var(--green-100)]",
          "disabled:hover:bg-transparent disabled:active:bg-transparent",
          "focus-visible:outline-none focus-visible:shadow-foco",
          s.btn,
        )}
      >
        +
      </button>
    </div>
  );
}
