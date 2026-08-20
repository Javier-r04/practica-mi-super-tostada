"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { loginRequestSchema } from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Wordmark } from "@/components/brand/wordmark";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm({ defaultValues: { username: "", password: "" } });

  return (
    <main className="grid min-h-[100dvh] bg-[var(--surface-page)] lg:grid-cols-[minmax(0,22rem)_1fr]">
      <section className="hidden flex-col justify-between border-r border-[var(--border-subtle)] bg-blanco px-8 py-10 lg:flex">
        <Wordmark />
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-marca">
            Panel interno
          </p>
          <p className="mt-2 max-w-[16ch] text-2xl font-semibold text-wrap text-tinta-900">
            El pedido de esta noche, sin transcribir dos veces.
          </p>
          <p className="mt-3 max-w-[36ch] text-sm leading-relaxed text-pretty text-tinta-500">
            Cada persona entra con su cuenta. La cobranza se rastrea por quien
            registró el cobro, no por un rol compartido.
          </p>
        </div>
        <p className="text-xs text-tinta-500">Quetzaltenango · America/Guatemala</p>
      </section>

      <section className="grid place-items-center p-4 sm:p-8">
        <form
          className="w-full max-w-[400px] rounded-tarjeta border border-[var(--border-subtle)] bg-blanco p-6 shadow-tarjeta sm:p-8"
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            const parsed = loginRequestSchema.safeParse(values);
            if (!parsed.success) {
              setError("Revise usuario y contraseña");
              return;
            }
            setError(null);
            try {
              await api("/auth/login", {
                method: "POST",
                body: JSON.stringify(parsed.data),
              });
              router.replace("/hoy");
            } catch (err) {
              setError(
                err instanceof ApiError ? err.message : "No se pudo entrar",
              );
            }
          })}
        >
          <div className="mb-6 lg:hidden">
            <Wordmark />
          </div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-marca lg:hidden">
            Panel interno
          </p>
          <h1 className="mt-1 text-xl font-semibold text-tinta-900">
            Entrar al panel
          </h1>
          <p className="mt-1 mb-6 text-sm text-pretty text-tinta-500">
            Usuario y contraseña de su cuenta. Nunca se comparte el acceso por
            rol.
          </p>
          <div className="grid gap-4">
            <Input
              id="username"
              label="Usuario"
              autoComplete="username"
              required
              {...form.register("username")}
            />
            <Input
              id="password"
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              required
              {...form.register("password")}
            />
            {error && (
              <p id="login-error" className="text-sm text-peligro" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              variant="accent"
              className="mt-1 w-full"
              loading={form.formState.isSubmitting}
            >
              Entrar al panel
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
