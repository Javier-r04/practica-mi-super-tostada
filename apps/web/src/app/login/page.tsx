"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { loginRequestSchema } from "@misupertostada/shared";
import { toastError, toastFromError } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Wordmark } from "@/components/brand/wordmark";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type LoginValues = { username: string; password: string };

const control =
  "h-campo w-full rounded-campo border border-[var(--border-default)] bg-blanco pl-10 pr-3 text-sm text-tinta-800 shadow-[var(--shadow-inset-field)] transition-[border-color,box-shadow] duration-control ease-out placeholder:text-tinta-500 focus:border-[var(--border-focus)] focus:shadow-foco focus:outline-none";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<LoginValues>({
    defaultValues: { username: "", password: "" },
  });

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[var(--surface-paper)] px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-[22rem] overflow-hidden rounded-tarjeta border border-[var(--border-subtle)] bg-blanco shadow-[var(--shadow-lg)] sm:max-w-[24rem]">
        <header className="flex items-center justify-center overflow-hidden bg-marca px-2 pt-4 pb-2 sm:px-3 sm:pt-5 sm:pb-3">
          <Wordmark
            onBrand
            className="mx-auto h-[11.5rem] w-auto max-w-none object-center sm:h-[13.5rem]"
          />
        </header>

        <form
          className="px-6 pt-7 pb-8 text-center sm:px-8 sm:pt-8 sm:pb-9"
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            const parsed = loginRequestSchema.safeParse(values);
            if (!parsed.success) {
              toastError("Revise usuario y contraseña");
              return;
            }
            try {
              await api("/auth/login", {
                method: "POST",
                body: JSON.stringify(parsed.data),
              });
              router.replace("/hoy");
            } catch (err) {
              toastFromError(err, "No se pudo entrar");
            }
          })}
        >
          <h1 className="mb-6 text-xl font-semibold text-tinta-900">
            Iniciar sesión
          </h1>

          <div className="grid gap-4 text-left">
            <Field label="Usuario" htmlFor="username">
              <div className="relative">
                <User
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-tinta-500"
                  strokeWidth={1.75}
                />
                <input
                  id="username"
                  autoComplete="username"
                  autoFocus
                  required
                  placeholder="Ingresa tu usuario"
                  className={control}
                  {...form.register("username")}
                />
              </div>
            </Field>

            <Field label="Contraseña" htmlFor="password">
              <div className="relative">
                <Lock
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-tinta-500"
                  strokeWidth={1.75}
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="Ingresa tu contraseña"
                  className={cn(control, "pr-11")}
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-2.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-campo text-tinta-500 transition-colors hover:text-tinta-800 focus-visible:outline-none focus-visible:shadow-foco"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="size-[18px]" strokeWidth={1.75} />
                  ) : (
                    <Eye className="size-[18px]" strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </Field>

            <Button
              type="submit"
              variant="primary"
              className="mt-2 w-full"
              loading={form.formState.isSubmitting}
            >
              Ingresar
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
