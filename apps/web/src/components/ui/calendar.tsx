"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type Locale,
} from "react-day-picker";
import { es } from "react-day-picker/locale";
import {
  useEffect,
  useRef,
  type ComponentProps,
} from "react";
import { cn } from "@/lib/utils";
import { isoCivilDesdeDate } from "@/lib/fecha-ui";

/**
 * Calendario shadcn (DayPicker) con tokens MST.
 * Semana empieza en lunes (locale `es`).
 */
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  locale = es,
  formatters,
  components,
  onDayIso,
  ...props
}: ComponentProps<typeof DayPicker> & {
  locale?: Partial<Locale>;
  /** Clic en un día de calendario YYYY-MM-DD (no depende de onSelect de RDP). */
  onDayIso?: (iso: string) => void;
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={locale}
      captionLayout={captionLayout}
      weekStartsOn={1}
      className={cn(
        "group/calendar bg-transparent p-0 [--cell-size:2.25rem]",
        className,
      )}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code ?? "es", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-full", defaultClassNames.root),
        months: cn("relative flex w-full flex-col gap-2", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-2", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          "inline-flex size-9 items-center justify-center rounded-pill text-tinta-800 hover:bg-tinta-50 aria-disabled:opacity-40",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          "inline-flex size-9 items-center justify-center rounded-pill text-tinta-800 hover:bg-tinta-50 aria-disabled:opacity-40",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "flex h-9 w-full items-center justify-center px-9",
          defaultClassNames.month_caption,
        ),
        caption_label: cn(
          "select-none text-sm font-semibold text-tinta-900",
          defaultClassNames.caption_label,
        ),
        month_grid: cn("w-full", defaultClassNames.month_grid),
        weekdays: "grid w-full grid-cols-7",
        weekday:
          "flex h-8 items-center justify-center select-none text-[11px] font-semibold uppercase tracking-wide text-tinta-500",
        week: "grid w-full grid-cols-7",
        day: "group/day relative aspect-square min-w-0 p-0 text-center select-none",
        range_start: "mst-rdp-range-start",
        range_middle: "mst-rdp-range-middle",
        range_end: "mst-rdp-range-end",
        selected: "mst-rdp-selected",
        today: "mst-rdp-today",
        outside: cn("opacity-45", defaultClassNames.outside),
        disabled: cn("opacity-35", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className: rootClass, rootRef, ...rootProps }) => (
          <div
            data-slot="calendar"
            ref={rootRef}
            className={cn(rootClass)}
            {...rootProps}
          />
        ),
        Chevron: ({ className: chevClass, orientation, ...chevProps }) => {
          const Icon =
            orientation === "left"
              ? ChevronLeft
              : orientation === "right"
                ? ChevronRight
                : ChevronDown;
          return (
            <Icon className={cn("size-[18px]", chevClass)} {...chevProps} />
          );
        },
        DayButton: ({ ...dayProps }) => (
          <CalendarDayButton
            {...dayProps}
            locale={locale}
            onDayIso={onDayIso}
          />
        ),
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  onDayIso,
  ...props
}: ComponentProps<typeof DayButton> & {
  locale?: Partial<Locale>;
  onDayIso?: (iso: string) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const iso = isoCivilDesdeDate(day.date);

  return (
    <button
      ref={ref}
      type="button"
      {...props}
      data-day={day.date.toLocaleDateString(locale?.code ?? "es")}
      data-iso={iso}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
          ? "true"
          : undefined
      }
      data-range-start={modifiers.range_start ? "true" : undefined}
      data-range-end={modifiers.range_end ? "true" : undefined}
      data-range-middle={modifiers.range_middle ? "true" : undefined}
      data-today={modifiers.today ? "true" : undefined}
      aria-selected={modifiers.selected ? true : undefined}
      className={cn(
        "mst-calendar-day relative z-[1] size-full min-w-0",
        "group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:shadow-[var(--shadow-focus)]",
        className,
      )}
      onClick={(e) => {
        if (onDayIso) {
          e.preventDefault();
          e.stopPropagation();
          onDayIso(iso);
          return;
        }
        props.onClick?.(e);
      }}
    />
  );
}

export { CalendarDayButton };
